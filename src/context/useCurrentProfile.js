import { getDoctorByEmail } from "../data/doctorsData";
import { getPatientByEmail } from "../data/patientsData";
import { useAuth } from "./useAuth";

// The signed-in patient's id (patient portal pages).
export function useCurrentPatientId() {
  const { user } = useAuth();

  return user?.patientId ?? getPatientByEmail(user?.email)?.id ?? null;
}

// The signed-in doctor's id. Medical staff have no doctor id and
// see the whole clinic's appointments instead.
export function useCurrentDoctorId() {
  const { user } = useAuth();

  return user?.doctorId ?? getDoctorByEmail(user?.email)?.id ?? null;
}
