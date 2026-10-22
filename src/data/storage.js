// localStorage helpers for the mock data layer.
//
// Every store is seeded from the demo dataset on first use and
// then persisted, so actions in one portal (a patient booking, a
// doctor's diagnosis, an admin reply) show up in the others.
//
// Bump DEMO_DATA_VERSION whenever the shape of the demo data
// changes: stored data from older versions is discarded and the
// clean demo dataset is loaded again.

import { USE_API } from "../api/config";
import { cacheClear, cacheGet, cacheSet } from "../api/cache";
import { persistChange } from "../api/persist";

export const DEMO_DATA_VERSION = "2";

const VERSION_KEY = "healthcare_demo_data_version";

export const STORAGE_KEYS = {
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

// Keys used by earlier builds that are no longer read.
const LEGACY_KEYS = ["healthcare_mock_appointments"];

const safeStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// With the backend there is no demo data to reset; the cache is
// simply emptied and reloaded from the server on the next sign-in.
const MAP_KEYS = [
  STORAGE_KEYS.clinicalRecords,
  STORAGE_KEYS.availability,
  STORAGE_KEYS.documents,
];

const emptyValue = (key) => (MAP_KEYS.includes(key) ? {} : []);

export const resetDemoData = () => {
  if (USE_API) {
    cacheClear();
    return;
  }

  const storage = safeStorage();

  if (!storage) {
    return;
  }

  [...Object.values(STORAGE_KEYS), ...LEGACY_KEYS].forEach((key) =>
    storage.removeItem(key)
  );
  storage.setItem(VERSION_KEY, DEMO_DATA_VERSION);
};

const ensureCurrentVersion = () => {
  const storage = safeStorage();

  if (storage && storage.getItem(VERSION_KEY) !== DEMO_DATA_VERSION) {
    resetDemoData();
  }
};

// Reads a store, seeding it with `createDefault()` the first time.
export const loadStored = (key, createDefault) => {
  if (USE_API) {
    return cacheGet(key) ?? emptyValue(key);
  }

  ensureCurrentVersion();

  const storage = safeStorage();

  try {
    const stored = storage?.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Corrupt data: fall back to the defaults below.
  }

  const value = createDefault();
  saveStored(key, value);

  return value;
};

export const saveStored = (key, value) => {
  if (USE_API) {
    const previous = cacheGet(key) ?? emptyValue(key);

    cacheSet(key, value);
    persistChange(key, previous, value);

    return;
  }

  try {
    safeStorage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or unavailable (private mode); the
    // change still applies for the current page.
  }
};
