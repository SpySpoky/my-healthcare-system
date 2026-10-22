// Loads everything the signed-in user may see from the server into the
// in-memory cache (see cache.js), so the pages can keep reading it
// synchronously.

import { cacheClear, cacheSet, markHydrated } from "./cache";
import { api } from "./client";
import { setRecoveryHandler } from "./persist";
import { APPOINTMENT_STATUS_STATS, DEPARTMENT_STATS, MONTHLY_STATS } from "../data/adminData";
import { setDepartments, setDoctors } from "../data/doctorsData";
import { STORAGE_KEYS } from "../data/storage";

// These lists are exported constants that many pages import, so they
// are replaced in place instead of being reassigned.
const replaceContents = (target, items) => target.splice(0, target.length, ...items);

export const hydrate = async () => {
  const data = await api.get("/bootstrap");

  // Doctors and departments come from the database.
  setDoctors(data.doctors);
  setDepartments(data.departments);

  cacheSet(STORAGE_KEYS.patients, data.patients);
  cacheSet(STORAGE_KEYS.appointments, data.appointments);
  cacheSet(STORAGE_KEYS.clinicalRecords, data.clinicalRecords);
  cacheSet(STORAGE_KEYS.availability, data.availability);
  cacheSet(STORAGE_KEYS.users, data.users);
  cacheSet(STORAGE_KEYS.applications, data.applications);
  cacheSet(STORAGE_KEYS.feedback, data.feedback);
  cacheSet(STORAGE_KEYS.activity, data.activity);
  cacheSet(STORAGE_KEYS.documents, data.documents);

  if (data.reports) {
    replaceContents(MONTHLY_STATS, data.reports.monthly);
    replaceContents(APPOINTMENT_STATUS_STATS, data.reports.appointmentStatus);
    replaceContents(DEPARTMENT_STATS, data.reports.departments);
  }

  markHydrated(true);
};

// Forget everything when the user signs out.
export const clearData = () => {
  cacheClear();
  setDoctors([]);
  setDepartments([]);
};

// After a failed change the cache is rebuilt from the server.
setRecoveryHandler(hydrate);
