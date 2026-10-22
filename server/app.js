import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { pool } from "./db.js";
import { HttpError, route } from "./util.js";
import appointmentsRouter from "./routes/appointments.js";
import authRouter from "./routes/auth.js";
import bootstrapRouter from "./routes/bootstrap.js";
import messagesRouter from "./routes/messages.js";
import { doctorsRouter, recordsRouter } from "./routes/clinical.js";
import { patientsRouter, usersRouter } from "./routes/people.js";
import {
  activityRouter,
  applicationsRouter,
  documentsRouter,
  feedbackRouter,
} from "./routes/admin.js";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  // Behind a proxy the real client address is needed for the audit log.
  if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) =>
        !origin || config.corsOrigins.includes(origin)
          ? callback(null, true)
          : callback(new HttpError(403, "Origin not allowed.")),
    })
  );
  app.use(express.json({ limit: "100kb" }));

  app.get(
    "/api/health",
    route(async (_req, res) => {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    })
  );

  app.use("/api/auth", authRouter);
  app.use("/api/bootstrap", bootstrapRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/patients", patientsRouter, recordsRouter, documentsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/doctors", doctorsRouter);
  app.use("/api/feedback", feedbackRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/activity", activityRouter);
  app.use("/api/messages", messagesRouter);

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found.")));

  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message, details: error.details });
    }

    if (error.type === "entity.parse.failed") {
      return res.status(400).json({ error: "The request body is not valid JSON." });
    }

    if (error.type === "entity.too.large") {
      return res.status(413).json({ error: "The request is too large." });
    }

    console.error(error);
    res.status(500).json({ error: "Something went wrong on the server." });
  });

  return app;
};
