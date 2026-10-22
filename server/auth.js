import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { queryOne } from "./db.js";
import { HttpError, forbidden, route } from "./util.js";

// SQL that turns users/staff rows into the app's role names.
export const ROLE_SQL = `CASE
  WHEN u.user_type = 'staff' AND s.staff_type = 'doctor' THEN 'doctor'
  WHEN u.user_type = 'staff' THEN 'medical_staff'
  ELSE u.user_type
END`;

export const signToken = (user) =>
  jwt.sign({ sub: user.user_id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

// Reads the bearer token and loads the account, so a suspended or
// deleted user loses access immediately instead of at token expiry.
export const requireAuth = route(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new HttpError(401, "Please sign in.");

  let payload;

  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }

  const account = await queryOne(
    `SELECT u.user_id, u.full_name, u.email, u.status, ${ROLE_SQL} AS role
     FROM users u LEFT JOIN staff s ON s.user_id = u.user_id
     WHERE u.user_id = ?`,
    [payload.sub]
  );

  if (!account || account.status !== "Active") {
    throw new HttpError(401, "This account is not active.");
  }

  req.user = {
    id: account.user_id,
    name: account.full_name,
    email: account.email,
    role: account.role,
  };
  next();
});

export const requireRole =
  (...roles) =>
  (req, _res, next) =>
    roles.includes(req.user?.role) ? next() : next(forbidden());
