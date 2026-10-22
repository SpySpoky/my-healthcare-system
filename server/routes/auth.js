import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { OAuth2Client } from "google-auth-library";
import { logActivity } from "../activity.js";
import { ROLE_SQL, requireAuth, signToken } from "../auth.js";
import { config } from "../config.js";
import { query, queryOne, withTransaction } from "../db.js";
import {
  EMAIL_PATTERN,
  HttpError,
  badRequest,
  conflict,
  oneOf,
  optionalDate,
  passwordProblem,
  route,
  text,
  userRef,
} from "../util.js";

const router = Router();

// Compared against when the email is unknown, so timing does not reveal
// which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

const ROLE_LABELS = {
  patient: "Patient",
  doctor: "Doctor",
  medical_staff: "Medical Staff",
  admin: "Administrator",
};

// The signed-in user as the front end stores it.
const toSessionUser = (row) => ({
  id: userRef(row.user_id),
  name: row.full_name,
  email: row.email,
  role: row.role,
  ...(row.role === "patient" && { patientId: row.user_id }),
  ...(row.role === "doctor" && { doctorId: row.slug || null }),
});

const findAccount = (where, params) =>
  queryOne(
    `SELECT u.user_id, u.full_name, u.email, u.password, u.status, ${ROLE_SQL} AS role, d.slug
     FROM users u
     LEFT JOIN staff s ON s.user_id = u.user_id
     LEFT JOIN doctor d ON d.user_id = u.user_id
     WHERE ${where}`,
    params
  );

// Checks the account type and status, records the sign-in and answers
// with the session token.
const completeLogin = async (req, res, account, role, method) => {
  if (role && account.role !== role) {
    const label = ROLE_LABELS[role] || role;

    throw new HttpError(
      401,
      `This account is not registered as ${role === "admin" ? "an" : "a"} ${label}. Select the correct account type and try again.`
    );
  }

  if (account.status !== "Active") {
    throw new HttpError(403, `This account is ${account.status.toLowerCase()}. Please contact the administrator.`);
  }

  await query("UPDATE users SET last_login = UTC_TIMESTAMP() WHERE user_id = ?", [account.user_id]);
  await logActivity({
    userId: account.user_id,
    name: account.full_name,
    role: account.role,
    action: method ? `Logged in with ${method}` : "Logged in",
    module: "Authentication",
    ip: req.ip,
  });

  res.json({ token: signToken(account), user: toSessionUser(account) });
};

const failedLogin = async (req, email) => {
  await logActivity({
    name: "Unknown",
    action: `Failed login attempt for ${email}`.slice(0, 200),
    module: "Authentication",
    status: "Failed",
    ip: req.ip,
  });

  return new HttpError(401, "Incorrect email or password.");
};

// Checks the Cloudflare Turnstile token sent by the login form.
const verifyCaptcha = async (token, ip) => {
  if (!config.turnstileSecret) return;

  let passed;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret: config.turnstileSecret, response: String(token || ""), remoteip: ip || "" }),
    });

    passed = Boolean((await response.json()).success);
  } catch {
    throw new HttpError(503, "The security check is unavailable. Please try again.");
  }

  if (!passed) throw new HttpError(400, "Please complete the security check.");
};

router.post(
  "/login",
  loginLimiter,
  route(async (req, res) => {
    await verifyCaptcha(req.body.captchaToken, req.ip);

    const email = text(req.body.email, { field: "Email", required: true }).toLowerCase();
    const password = String(req.body.password || "");

    const account = await findAccount("u.email = ?", [email]);
    const passwordMatches = await bcrypt.compare(password, account?.password || DUMMY_HASH);

    if (!account || !passwordMatches) throw await failedLogin(req, email);

    await completeLogin(req, res, account, req.body.role);
  })
);

// "Continue with Google": the ID token is verified with Google, and
// only an existing account with the same (verified) email can sign in.
const googleClient = config.googleClientId ? new OAuth2Client(config.googleClientId) : null;

router.post(
  "/google",
  loginLimiter,
  route(async (req, res) => {
    if (!googleClient) throw new HttpError(501, "Google sign-in is not configured on the server.");

    let payload;

    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: String(req.body.credential || ""),
        audience: config.googleClientId,
      });

      payload = ticket.getPayload();
    } catch {
      throw new HttpError(401, "Google sign-in failed. Please try again.");
    }

    if (!payload?.email || !payload.email_verified) {
      throw new HttpError(401, "Your Google email address is not verified.");
    }

    const account = await findAccount("u.email = ?", [payload.email.toLowerCase()]);

    if (!account) {
      throw new HttpError(401, "No account exists for this Google email. Create an account first.");
    }

    await completeLogin(req, res, account, req.body.role, "Google");
  })
);

router.post(
  "/register",
  loginLimiter,
  route(async (req, res) => {
    const body = req.body || {};
    const name = text(body.fullName ?? body.name, { field: "Full name", required: true, max: 100 });
    const email = text(body.email, { field: "Email", required: true }).toLowerCase();
    const phone = text(body.phone, { field: "Phone", max: 30 });
    const gender = text(body.gender, { field: "Gender", max: 10 });
    const dateOfBirth = optionalDate(body.dateOfBirth, "Date of birth");
    const problem = passwordProblem(body.password);

    if (name.length < 3) throw badRequest("Name must be at least 3 characters.");
    if (!EMAIL_PATTERN.test(email)) throw badRequest("Enter a valid email address.");
    if (problem) throw badRequest(problem);

    if (dateOfBirth && dateOfBirth > new Date().toISOString().slice(0, 10)) {
      throw badRequest("Date of birth cannot be in the future.");
    }

    const normalisedGender = gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : null;

    if (normalisedGender) oneOf(normalisedGender, ["Male", "Female", "Other"], "Gender");

    const hash = await bcrypt.hash(body.password, 10);

    const userId = await withTransaction(async (tx) => {
      if ((await tx.query("SELECT 1 FROM users WHERE email = ?", [email])).length) {
        throw conflict("An account with this email already exists. Try signing in instead.");
      }

      const { insertId } = await tx.query(
        `INSERT INTO users (full_name, email, password, phone, date_of_birth, user_type)
         VALUES (?, ?, ?, ?, ?, 'patient')`,
        [name, email, hash, phone, dateOfBirth]
      );
      await tx.query("INSERT INTO patient (user_id, gender) VALUES (?, ?)", [insertId, normalisedGender]);

      return insertId;
    });

    await logActivity({
      userId,
      name,
      role: "patient",
      action: "Registered a new patient account",
      module: "Users",
      ip: req.ip,
    });

    res.status(201).json({ user: { id: userRef(userId), name, email, role: "patient", patientId: userId } });
  })
);

router.get(
  "/me",
  requireAuth,
  route(async (req, res) => {
    const account = await findAccount("u.user_id = ?", [req.user.id]);

    res.json({ user: toSessionUser(account) });
  })
);

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

// There is no mail server yet, so outside production the reset token
// is returned in the response and the reset page can use it directly.
router.post(
  "/forgot-password",
  loginLimiter,
  route(async (req, res) => {
    const email = text(req.body.email, { field: "Email", required: true }).toLowerCase();
    const account = await findAccount("u.email = ? AND u.status = 'Active'", [email]);
    const response = { message: "If an account exists for this email, a reset link has been sent." };

    if (account) {
      const token = randomBytes(32).toString("hex");

      await query("DELETE FROM password_reset WHERE user_id = ?", [account.user_id]);
      await query(
        "INSERT INTO password_reset (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))",
        [account.user_id, hashToken(token)]
      );
      await logActivity({
        userId: account.user_id,
        name: account.full_name,
        role: account.role,
        action: "Password reset requested",
        module: "Authentication",
        status: "Warning",
        ip: req.ip,
      });

      if (!config.isProduction) response.devResetToken = token;
    }

    res.json(response);
  })
);

router.post(
  "/reset-password",
  loginLimiter,
  route(async (req, res) => {
    const token = String(req.body.token || "");
    const problem = passwordProblem(req.body.password);

    if (problem) throw badRequest(problem);

    const reset = await queryOne(
      `SELECT reset_id, user_id FROM password_reset
       WHERE token_hash = ? AND used = 0 AND expires_at > UTC_TIMESTAMP()`,
      [hashToken(token)]
    );

    if (!reset) throw badRequest("This reset link is invalid or has expired.");

    const hash = await bcrypt.hash(req.body.password, 10);

    await withTransaction(async (tx) => {
      await tx.query("UPDATE users SET password = ? WHERE user_id = ?", [hash, reset.user_id]);
      await tx.query("UPDATE password_reset SET used = 1 WHERE reset_id = ?", [reset.reset_id]);
    });

    res.json({ message: "Your password has been updated." });
  })
);

export default router;
