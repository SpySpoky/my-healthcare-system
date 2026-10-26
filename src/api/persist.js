// Sends changes made through saveStored() to the server.
//
// The pages still update the in-memory cache instantly (so the UI
// feels immediate) and call saveStored() with the new collection.
// This module compares it with the previous value, works out which
// items were added, changed or removed, and calls the matching REST
// endpoint. Requests run one after another so a change to a new item
// always follows the request that created it. If the server rejects
// something, the user is told and the cache is reloaded from the server.

import { cacheGet, cacheSet } from "./cache";
import { SYNC_ERROR_EVENT, api, getSessionRole } from "./client";

// Cache keys (same strings as STORAGE_KEYS in data/storage.js).
const KEYS = {
  patients: "healthcare_patients",
  appointments: "healthcare_appointments",
  clinicalRecords: "healthcare_clinical_records",
  availability: "healthcare_availability",
  users: "healthcare_admin_users",
  applications: "healthcare_admin_applications",
  feedback: "healthcare_admin_feedback",
  activity: "healthcare_admin_activity",
  documents: "healthcare_patient_documents",
};

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const list = (value) => (Array.isArray(value) ? value : []);
const pick = (source, keys) =>
  Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));

const changedFields = (before, after) =>
  Object.fromEntries(Object.keys(after).filter((key) => !sameJson(before[key], after[key])).map((key) => [key, after[key]]));

const diffList = (prev, next) => {
  const before = new Map(list(prev).map((item) => [String(item.id), item]));
  const after = new Map(list(next).map((item) => [String(item.id), item]));

  return {
    added: [...after.values()].filter((item) => !before.has(String(item.id))),
    removed: [...before.values()].filter((item) => !after.has(String(item.id))),
    changed: [...after.values()]
      .filter((item) => before.has(String(item.id)) && !sameJson(before.get(String(item.id)), item))
      .map((item) => ({ item, changes: changedFields(before.get(String(item.id)), item) })),
  };
};

/* ---------- task queue ---------- */

// Items created in this session get a temporary id on the client; once
// the server answers, later requests use the real id.
const idMap = new Map();
const realId = (key, id) => idMap.get(`${key}:${id}`) ?? id;

let queue = Promise.resolve();
let recover = async () => {};

// hydrate.js registers the function that reloads everything from the server.
export const setRecoveryHandler = (handler) => {
  recover = handler;
};

const enqueue = (task) => {
  queue = queue.then(task).catch(async (error) => {
    window.dispatchEvent(new CustomEvent(SYNC_ERROR_EVENT, { detail: { message: error.message } }));

    try {
      await recover();
    } catch {
      // The next successful request will bring the cache back in line.
    }
  });
};

// Resolves when every queued change has reached the server.
export const flushChanges = () => queue;

// Reloads server data after a change that affects other collections
// (e.g. approving an application creates a user and a doctor).
export const refreshAfterQueue = () => enqueue(() => recover());

// The password for a new account is needed by the request that creates
// it, but must never be stored with the rest of the user. The Add User
// form leaves it here and the request below takes it straight out again.
const newPasswords = new Map();

export const setNewUserPassword = (tempId, password) => newPasswords.set(String(tempId), password);

const takeNewUserPassword = (tempId) => {
  const password = newPasswords.get(String(tempId));

  newPasswords.delete(String(tempId));

  return password;
};

// Swaps a temporary id for the server's id, keeping later local edits.
const adoptId = (key, tempId, id) => {
  idMap.set(`${key}:${tempId}`, id);
  cacheSet(
    key,
    list(cacheGet(key)).map((item) => (String(item.id) === String(tempId) ? { ...item, id } : item))
  );
};

/* ---------- per-collection handlers ---------- */

const PATIENT_FIELDS = [
  "name", "email", "phone", "gender", "dateOfBirth", "bloodType", "allergies",
  "address", "emergencyContactName", "emergencyContactPhone",
];

const handlers = {
  [KEYS.patients]: (prev, next) => {
    // Account status is managed through the user, never through the patient record.
    diffList(prev, next).changed.forEach(({ item, changes }) => {
      const body = pick(changes, PATIENT_FIELDS);

      if (Object.keys(body).length) {
        enqueue(() => api.patch(`/patients/${item.id}`, body));
      }
    });
  },

  [KEYS.users]: (prev, next) => {
    if (getSessionRole() !== "admin") return;

    const { added, changed, removed } = diffList(prev, next);

    added.forEach((item) =>
      enqueue(async () => {
        const password = takeNewUserPassword(item.id);
        const { user } = await api.post("/users", {
          ...pick(item, ["name", "email", "phone", "role", "department"]),
          password,
        });

        adoptId(KEYS.users, item.id, user.id);
        // A new doctor or patient also belongs in the other collections.
        await recover();
      })
    );

    changed.forEach(({ item, changes }) => {
      const body = pick(changes, ["name", "email", "phone", "role", "department", "status"]);

      if (Object.keys(body).length) {
        enqueue(() => api.patch(`/users/${realId(KEYS.users, item.id)}`, body));
      }
    });

    removed.forEach((item) =>
      enqueue(async () => {
        await api.delete(`/users/${realId(KEYS.users, item.id)}`);
        await recover();
      })
    );
  },

  [KEYS.appointments]: (prev, next) => {
    const { added, changed } = diffList(prev, next);

    added
      .filter((item) => !item.busy)
      .forEach((item) =>
        enqueue(async () => {
          const { appointment } = await api.post("/appointments", {
            patientId: item.patientId,
            doctorId: item.doctorId,
            date: item.date,
            time: item.time,
            reason: item.reason,
            symptoms: item.symptoms,
          });

          adoptId(KEYS.appointments, item.id, appointment.id);
        })
      );

    changed.forEach(({ item, changes }) => {
      const body = pick(changes, ["status", "date", "time", "reason", "symptoms"]);

      if (Object.keys(body).length) {
        enqueue(() => api.patch(`/appointments/${realId(KEYS.appointments, item.id)}`, body));
      }
    });
  },

  [KEYS.feedback]: (prev, next) => {
    const { added, changed, removed } = diffList(prev, next);
    const role = getSessionRole();

    added.forEach((item) =>
      enqueue(async () => {
        const { feedback } = await api.post("/feedback", pick(item, ["type", "subject", "message", "rating"]));

        adoptId(KEYS.feedback, item.id, feedback.id);
      })
    );

    changed.forEach(({ item, changes }) => {
      const body =
        role === "patient"
          ? pick(item, ["type", "subject", "message", "rating"])
          : pick(changes, ["status", "priority", "response"]);

      if (Object.keys(body).length) {
        enqueue(() => api.patch(`/feedback/${realId(KEYS.feedback, item.id)}`, body));
      }
    });

    removed.forEach((item) => enqueue(() => api.delete(`/feedback/${realId(KEYS.feedback, item.id)}`)));
  },

  [KEYS.applications]: (prev, next) => {
    if (getSessionRole() !== "admin") return;

    diffList(prev, next).changed.forEach(({ item, changes }) => {
      if (changes.status && changes.status !== "Pending") {
        enqueue(async () => {
          await api.patch(`/applications/${item.id}`, { status: item.status, reviewNote: item.reviewNote });
          // Approval creates a user (and a doctor), so reload the rest.
          await recover();
        });
      }
    });
  },

  [KEYS.activity]: (prev, next) => {
    // Newest entries come first; send them oldest first.
    diffList(prev, next).added
      .reverse()
      .forEach((item) =>
        enqueue(() => api.post("/activity", pick(item, ["action", "module", "status"])))
      );
  },

  [KEYS.availability]: (prev, next) => {
    Object.keys(next || {}).forEach((slug) => {
      if (!sameJson(prev?.[slug], next[slug])) {
        enqueue(() => api.put(`/doctors/${slug}/availability`, { slots: next[slug] }));
      }
    });
  },

  [KEYS.clinicalRecords]: (prev, next) => {
    const role = getSessionRole();

    if (!["doctor", "medical_staff"].includes(role)) return;

    const saveRecord = (patientId, record) =>
      cacheSet(KEYS.clinicalRecords, { ...cacheGet(KEYS.clinicalRecords), [patientId]: record });

    // Nurses and other medical staff record vital signs; the rest of
    // the record is written by doctors only.
    Object.keys(next || {}).forEach((patientId) => {
      const reading = next[patientId].vitals;

      if (reading && !sameJson(prev?.[patientId]?.vitals, reading)) {
        enqueue(async () => {
          const { record } = await api.post(`/patients/${patientId}/record/vitals`, {
            ...pick(reading, ["heartRate", "bloodPressure", "temperature", "oxygen", "weight"]),
            date: reading.recordedAt,
          });

          saveRecord(patientId, record);
        });
      }
    });

    if (role !== "doctor") return;

    const sections = {
      diagnoses: ["date", "diagnosis", "notes", "status"],
      prescriptions: ["date", "medication", "dosage", "frequency", "duration", "instructions"],
      notes: ["date", "note"],
      medicalHistory: ["date", "title", "description"],
    };

    Object.keys(next || {}).forEach((patientId) => {
      Object.entries(sections).forEach(([section, fields]) => {
        diffList(prev?.[patientId]?.[section], next[patientId][section])
          .added.reverse()
          .forEach((entry) =>
            enqueue(async () => {
              const { record } = await api.post(`/patients/${patientId}/record/${section}`, pick(entry, fields));

              saveRecord(patientId, record);
            })
          );
      });
    });
  },
};

// Called by saveStored() after the cache was updated.
export const persistChange = (key, prev, next) => {
  handlers[key]?.(prev, next);
};
