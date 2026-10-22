// Documents each patient uploads on their Profile page (metadata
// only; the file itself is not stored). New patients start with none.

import { STORAGE_KEYS, loadStored, saveStored } from "./storage";

const loadAllDocuments = () => loadStored(STORAGE_KEYS.documents, () => ({}));

export const loadPatientDocuments = (patientId) =>
  loadAllDocuments()[patientId] || [];

export const savePatientDocuments = (patientId, documents) =>
  saveStored(STORAGE_KEYS.documents, {
    ...loadAllDocuments(),
    [patientId]: documents,
  });
