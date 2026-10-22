// Direct messages. Patients can write to doctors and medical staff;
// doctors and medical staff can write to patients and to each other.
// Administrators do not use messaging.

import { Router } from "express";
import { requireAuth, requireRole } from "../auth.js";
import { query, queryOne } from "../db.js";
import { badRequest, forbidden, intId, isoTimestamp, notFound, route, text } from "../util.js";

const router = Router();

router.use(requireAuth, requireRole("patient", "doctor", "medical_staff"));

const ROLE_SQL = `CASE WHEN u.user_type = 'staff' AND s.staff_type = 'doctor' THEN 'doctor'
  WHEN u.user_type = 'staff' THEN 'medical_staff' ELSE u.user_type END`;

// People the signed-in user may write to.
const loadContacts = (user) =>
  query(
    `SELECT u.user_id AS id, u.full_name AS name, ${ROLE_SQL} AS role, dep.dept_name AS department
     FROM users u
     LEFT JOIN staff s ON s.user_id = u.user_id
     LEFT JOIN department dep ON dep.dept_id = s.dept_id
     WHERE u.status = 'Active' AND u.user_id <> ?
       AND ${user.role === "patient" ? "u.user_type = 'staff'" : "u.user_type IN ('patient', 'staff')"}
     ORDER BY role, u.full_name`,
    [user.id]
  );

const toMessage = (row, userId) => {
  const outgoing = row.sender_id === userId;

  return {
    id: row.message_id,
    direction: outgoing ? "out" : "in",
    otherId: outgoing ? row.recipient_id : row.sender_id,
    otherName: outgoing ? row.recipient_name : row.sender_name,
    otherRole: outgoing ? row.recipient_role : row.sender_role,
    subject: row.subject,
    body: row.body,
    sentAt: isoTimestamp(row.sent_at),
    read: outgoing ? true : Boolean(row.read_at),
  };
};

const messageSelect = `SELECT m.message_id, m.sender_id, m.recipient_id, m.subject, m.body, m.sent_at, m.read_at,
       su.full_name AS sender_name, ru.full_name AS recipient_name,
       CASE WHEN su.user_type = 'staff' THEN IF(ss.staff_type = 'doctor', 'doctor', 'medical_staff') ELSE su.user_type END AS sender_role,
       CASE WHEN ru.user_type = 'staff' THEN IF(rs.staff_type = 'doctor', 'doctor', 'medical_staff') ELSE ru.user_type END AS recipient_role
FROM message m
JOIN users su ON su.user_id = m.sender_id
JOIN users ru ON ru.user_id = m.recipient_id
LEFT JOIN staff ss ON ss.user_id = m.sender_id
LEFT JOIN staff rs ON rs.user_id = m.recipient_id`;

router.get(
  "/contacts",
  route(async (req, res) => {
    res.json({ contacts: await loadContacts(req.user) });
  })
);

router.get(
  "/unread-count",
  route(async (req, res) => {
    const row = await queryOne(
      "SELECT COUNT(*) AS count FROM message WHERE recipient_id = ? AND read_at IS NULL AND deleted_by_recipient = 0",
      [req.user.id]
    );

    res.json({ count: Number(row.count) });
  })
);

router.get(
  "/",
  route(async (req, res) => {
    const rows = await query(
      `${messageSelect}
       WHERE (m.recipient_id = ? AND m.deleted_by_recipient = 0)
          OR (m.sender_id = ? AND m.deleted_by_sender = 0)
       ORDER BY m.sent_at DESC, m.message_id DESC LIMIT 300`,
      [req.user.id, req.user.id]
    );

    res.json({ messages: rows.map((row) => toMessage(row, req.user.id)) });
  })
);

router.post(
  "/",
  route(async (req, res) => {
    const recipientId = intId(req.body?.recipientId, "Recipient");
    const subject = text(req.body?.subject, { field: "Subject", required: true, max: 150 });
    const body = text(req.body?.body, { field: "Message", required: true, max: 4000 });

    const allowed = (await loadContacts(req.user)).some((contact) => contact.id === recipientId);

    if (!allowed) throw badRequest("You cannot send a message to this person.");

    const { insertId } = await query(
      "INSERT INTO message (sender_id, recipient_id, subject, body) VALUES (?, ?, ?, ?)",
      [req.user.id, recipientId, subject, body]
    );
    const [row] = await query(`${messageSelect} WHERE m.message_id = ?`, [insertId]);

    res.status(201).json({ message: toMessage(row, req.user.id) });
  })
);

const ownMessage = async (id, userId) => {
  const message = await queryOne("SELECT sender_id, recipient_id FROM message WHERE message_id = ?", [id]);

  if (!message) throw notFound("Message not found.");
  if (message.sender_id !== userId && message.recipient_id !== userId) throw forbidden();

  return message;
};

router.patch(
  "/:id/read",
  route(async (req, res) => {
    const id = intId(req.params.id, "Message");
    const message = await ownMessage(id, req.user.id);

    if (message.recipient_id === req.user.id) {
      await query("UPDATE message SET read_at = UTC_TIMESTAMP() WHERE message_id = ? AND read_at IS NULL", [id]);
    }

    res.json({ ok: true });
  })
);

router.delete(
  "/:id",
  route(async (req, res) => {
    const id = intId(req.params.id, "Message");
    const message = await ownMessage(id, req.user.id);
    const column = message.sender_id === req.user.id ? "deleted_by_sender" : "deleted_by_recipient";

    await query(`UPDATE message SET ${column} = 1 WHERE message_id = ?`, [id]);
    res.status(204).end();
  })
);

export default router;
