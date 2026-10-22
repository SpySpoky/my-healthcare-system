// Direct messages between patients and the care team.
//
// With the backend these call /api/messages. Without it (tests, or
// VITE_USE_API=false) a small store in localStorage plays the same
// part, keyed by e-mail address instead of user id.

import { USE_API } from "../api/config";
import { api } from "../api/client";
import { fromDemo } from "./demoRegistry";
import { DOCTORS } from "./doctorsData";
import { loadPatients } from "./patientsData";

export const MESSAGES_CHANGED_EVENT = "healthcare:messages-changed";

// Tells the sidebar badge and dashboard card to recount.
export const notifyMessagesChanged = () => window.dispatchEvent(new Event(MESSAGES_CHANGED_EVENT));

/* ---------- local store (no backend) ---------- */

const STORE_KEY = "healthcare_messages";

const readStore = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY));

    if (Array.isArray(stored)) return stored;
  } catch {
    // Missing or corrupt: start from the registered demo messages (if any).
  }

  const seeded = fromDemo("messages", () => []);
  writeStore(seeded);

  return seeded;
};

const writeStore = (messages) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(messages));
  } catch {
    // Storage full or unavailable; changes last for this page only.
  }
};

const localView = (user) =>
  readStore()
    .filter((m) => (m.to === user.email && !m.delTo) || (m.from === user.email && !m.delFrom))
    .map((m) => {
      const outgoing = m.from === user.email;

      return {
        id: m.id,
        direction: outgoing ? "out" : "in",
        otherId: outgoing ? m.to : m.from,
        otherName: outgoing ? m.toName : m.fromName,
        otherRole: outgoing ? m.toRole : m.fromRole,
        subject: m.subject,
        body: m.body,
        sentAt: m.sentAt,
        read: outgoing ? true : Boolean(m.readAt),
      };
    })
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt) || b.id - a.id);

const localContacts = (user) => {
  const doctors = DOCTORS.filter((d) => d.email !== user.email).map((d) => ({
    id: d.email, name: d.name, role: "doctor", department: d.department,
  }));

  if (user.role === "patient") return doctors;

  const patients = loadPatients().map((p) => ({ id: p.email, name: p.name, role: "patient", department: null }));

  return [...doctors, ...patients];
};

/* ---------- public functions ---------- */

// People the user may write to: [{ id, name, role, department }].
export const getContacts = async (user) =>
  USE_API ? (await api.get("/messages/contacts")).contacts : localContacts(user);

// Inbox and sent messages, newest first.
export const getMessages = async (user) =>
  USE_API ? (await api.get("/messages")).messages : localView(user);

export const sendMessage = async (user, { recipientId, subject, body }) => {
  if (USE_API) {
    return (await api.post("/messages", { recipientId, subject, body })).message;
  }

  const contact = localContacts(user).find((c) => c.id === recipientId);

  if (!contact) throw new Error("You cannot send a message to this person.");

  const store = readStore();
  const message = {
    id: Math.max(0, ...store.map((m) => m.id)) + 1,
    from: user.email, fromName: user.name, fromRole: user.role,
    to: contact.id, toName: contact.name, toRole: contact.role,
    subject, body, sentAt: new Date().toISOString(), readAt: null,
  };

  writeStore([...store, message]);

  return localView(user).find((m) => m.id === message.id);
};

export const markMessageRead = async (user, id) => {
  if (USE_API) {
    await api.patch(`/messages/${id}/read`);
    return;
  }

  writeStore(
    readStore().map((m) => (m.id === id && m.to === user.email && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m))
  );
};

export const deleteMessage = async (user, id) => {
  if (USE_API) {
    await api.delete(`/messages/${id}`);
    return;
  }

  writeStore(
    readStore().map((m) => {
      if (m.id !== id) return m;

      return m.from === user.email ? { ...m, delFrom: true } : { ...m, delTo: true };
    })
  );
};

export const getUnreadCount = async (user) =>
  USE_API
    ? (await api.get("/messages/unread-count")).count
    : localView(user).filter((m) => m.direction === "in" && !m.read).length;
