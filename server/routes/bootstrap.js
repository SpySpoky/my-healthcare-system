import { Router } from "express";
import { requireAuth } from "../auth.js";
import {
  loadActivity,
  loadApplications,
  loadAppointments,
  loadAvailability,
  loadBusySlots,
  loadClinicalRecords,
  loadDepartments,
  loadDoctors,
  loadDocuments,
  loadFeedback,
  loadPatients,
  loadReportStats,
  loadUsers,
} from "../data.js";
import { route } from "../util.js";

const router = Router();

// Everything the signed-in user's portal needs, scoped to their role.
// The front end keeps it in memory and reads it synchronously.
router.get(
  "/",
  requireAuth,
  route(async (req, res) => {
    const { id, role } = req.user;
    const shared = {
      doctors: await loadDoctors(),
      departments: await loadDepartments(),
      availability: await loadAvailability(),
    };

    if (role === "patient") {
      const [patients, appointments, busy, clinicalRecords, feedback, documents] = await Promise.all([
        loadPatients({ onlyId: id }),
        loadAppointments({ patientId: id }),
        loadBusySlots(id),
        loadClinicalRecords({ patientId: id }),
        loadFeedback({ patientId: id }),
        loadDocuments({ patientId: id }),
      ]);

      return res.json({
        ...shared,
        patients,
        appointments: [...appointments, ...busy],
        clinicalRecords,
        feedback,
        documents,
        users: [],
        applications: [],
        activity: [],
      });
    }

    if (role === "admin") {
      const [users, patients, appointments, feedback, applications, activity, documents, reports] =
        await Promise.all([
          loadUsers(),
          loadPatients(),
          loadAppointments(),
          loadFeedback(),
          loadApplications(),
          loadActivity(),
          loadDocuments(),
          loadReportStats(),
        ]);

      // Administrators manage accounts; clinical details stay with the care team.
      return res.json({
        ...shared,
        users,
        patients,
        appointments,
        feedback,
        applications,
        activity,
        documents,
        reports,
        clinicalRecords: {},
      });
    }

    // Doctors and medical staff.
    const [patients, appointments, clinicalRecords, feedback, activity] = await Promise.all([
      loadPatients(),
      loadAppointments(role === "doctor" ? { doctorUserId: id } : {}),
      loadClinicalRecords(),
      role === "doctor" ? loadFeedback({ doctorUserId: id }) : [],
      loadActivity({ userId: id, limit: 50 }),
    ]);

    return res.json({
      ...shared,
      patients,
      appointments,
      clinicalRecords,
      feedback,
      activity,
      documents: {},
      users: [],
      applications: [],
    });
  })
);

export default router;
