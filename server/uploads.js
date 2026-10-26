// Uploaded files (staff application documents and patient profile
// documents). Files are held in memory only long enough to be written
// to the database, so no copy is left on the server's disk; keeping
// them in MySQL means every copy of the desktop app sees the same
// documents through the shared server.

import multer from "multer";
import { badRequest } from "./util.js";

export const DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const upload = (limits) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCUMENT_BYTES, fields: 20, ...limits },
    fileFilter: (_req, file, callback) =>
      DOCUMENT_TYPES.includes(file.mimetype)
        ? callback(null, true)
        : callback(badRequest("Documents must be PDF, JPG or PNG files.")),
  });

// multer reports its own limits through an error code.
const withLimitErrors = (middleware, maxFiles) => (req, res, next) =>
  middleware(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return next(badRequest("Each document must be 10 MB or smaller."));
    }

    if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
      return next(badRequest(`Attach at most ${maxFiles} document${maxFiles === 1 ? "" : "s"}.`));
    }

    return next(error);
  });

// Several files under one field name, as the staff application form sends them.
export const receiveDocuments = (field, maxFiles) =>
  withLimitErrors(upload({ files: maxFiles }).array(field, maxFiles), maxFiles);

// A single file, as the patient profile sends one at a time.
export const receiveDocument = (field) =>
  withLimitErrors(upload({ files: 1 }).single(field), 1);

// Describes a stored document for the app (never its contents).
export const toStoredDocument = (row) => ({
  id: row.document_id ?? row.document_no,
  name: row.file_name,
  type: row.mime_type,
  size: row.byte_size,
  stored: Boolean(row.has_file),
});
