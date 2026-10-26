import { lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import RootRedirect from "./RootRedirect";
import RoutePage from "./RoutePage";

import { t } from "../i18n";
// =====================================================
// PATIENT
// =====================================================

const PatientDashboard = lazy(() => import("../pages/patient/Dashboard"));
const PatientAppointments = lazy(() => import("../pages/patient/Appointments"));
const PatientMedicalRecords = lazy(() => import("../pages/patient/MedicalRecords"));
const PatientFeedback = lazy(() => import("../pages/patient/Feedback"));
const Messages = lazy(() => import("../pages/Messages"));
const PatientProfile = lazy(() => import("../pages/patient/Profile"));
const BookAppointment = lazy(() => import("../pages/patient/BookAppointment"));
const RescheduleAppointment = lazy(() => import("../pages/patient/RescheduleAppointment"));

// =====================================================
// DOCTOR
// =====================================================

const DoctorDashboard = lazy(() => import("../pages/doctor/Dashboard"));
const DoctorAppointments = lazy(() => import("../pages/doctor/Appointments"));
const DoctorAvailability = lazy(() => import("../pages/doctor/Availability"));
const DoctorPatients = lazy(() => import("../pages/doctor/Patients"));
const PatientRecord = lazy(() => import("../pages/doctor/PatientRecord"));

// =====================================================
// ADMIN
// =====================================================

const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const AdminUsers = lazy(() => import("../pages/admin/Users"));
const AdminApplications = lazy(() => import("../pages/admin/Applications"));
const AdminFeedback = lazy(() => import("../pages/admin/Feedback"));
const AdminReports = lazy(() => import("../pages/admin/Reports"));
const AdminActivity = lazy(() => import("../pages/admin/Activity"));

// =====================================================
// AUTHENTICATION
// =====================================================

const Login = lazy(() => import("../pages/auth/Login"));
const Register = lazy(() => import("../pages/auth/Register"));
const StaffApplication = lazy(() => import("../pages/auth/StaffApplication"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));

// =====================================================
// SYSTEM
// =====================================================

const Unauthorized = lazy(() => import("../pages/Unauthorized"));
const NotFound = lazy(() => import("../pages/NotFound"));

// Pages are loaded on demand (code splitting); RoutePage shows a
// loading state while a page's code downloads.

// Each entry: path, browser-tab title, page element, and
// `pageKey` for pages that share one mounted instance
// (the patient record and its diagnosis/prescription/status
// views). Every page here loads data, so it is wrapped in a
// loading/error boundary by RoutePage.

const patientRoutes = [
  { path: "/patient/dashboard", title: t("Dashboard"), element: <PatientDashboard /> },
  { path: "/patient/appointments", title: t("Appointments"), element: <PatientAppointments /> },
  { path: "/patient/appointments/book", title: t("Book Appointment"), element: <BookAppointment /> },
  { path: "/patient/appointments/:id/reschedule", title: t("Reschedule Appointment"), element: <RescheduleAppointment /> },
  { path: "/patient/medical-records", title: t("Medical Records"), element: <PatientMedicalRecords /> },
  { path: "/patient/feedback", title: t("Feedback"), element: <PatientFeedback /> },
  { path: "/patient/messages", title: t("Messages"), element: <Messages /> },
  { path: "/patient/profile", title: t("My Profile"), element: <PatientProfile /> },
];

const doctorRoutes = [
  { path: "/doctor/dashboard", title: t("Doctor Dashboard"), element: <DoctorDashboard /> },
  { path: "/doctor/appointments", title: t("Appointments"), element: <DoctorAppointments /> },
  { path: "/doctor/availability", title: t("Availability"), element: <DoctorAvailability /> },
  { path: "/doctor/patients", title: t("Patients"), element: <DoctorPatients /> },
  { path: "/doctor/messages", title: t("Messages"), element: <Messages /> },
  { path: "/doctor/patients/:id", title: t("Patient Record"), pageKey: "patient-record", element: <PatientRecord /> },
  { path: "/doctor/patients/:id/diagnosis", title: t("Add Diagnosis"), pageKey: "patient-record", element: <PatientRecord view="diagnosis" /> },
  { path: "/doctor/patients/:id/prescription", title: t("Prescription"), pageKey: "patient-record", element: <PatientRecord view="prescription" /> },
  { path: "/doctor/patients/:id/status", title: t("Patient Status"), pageKey: "patient-record", element: <PatientRecord view="status" /> },
];

const adminRoutes = [
  { path: "/admin/dashboard", title: t("Admin Dashboard"), element: <AdminDashboard /> },
  { path: "/admin/users", title: t("User Management"), element: <AdminUsers /> },
  { path: "/admin/applications", title: t("Application Approval"), element: <AdminApplications /> },
  { path: "/admin/feedback", title: t("Feedback Management"), element: <AdminFeedback /> },
  { path: "/admin/reports", title: t("Reports"), element: <AdminReports /> },
  { path: "/admin/activity", title: t("Activity Monitoring"), element: <AdminActivity /> },
];

const portals = [
  { role: "patient", allowedRoles: ["patient"], routes: patientRoutes },
  { role: "doctor", allowedRoles: ["doctor", "medical_staff"], routes: doctorRoutes },
  { role: "admin", allowedRoles: ["admin"], routes: adminRoutes },
];

const publicRoutes = [
  { path: "/login", title: t("Sign In"), element: <Login /> },
  { path: "/login/:role", title: t("Sign In"), element: <Login /> },
  { path: "/register", title: t("Create Account"), element: <Register /> },
  { path: "/apply", title: t("Staff Application"), element: <StaffApplication /> },
  { path: "/forgot-password", title: t("Forgot Password"), element: <ForgotPassword /> },
  { path: "/reset-password", title: t("Reset Password"), element: <ResetPassword /> },
  { path: "/unauthorized", title: t("Access Denied"), element: <Unauthorized /> },
];

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC PAGES */}

        {publicRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RoutePage title={route.title} loadsData={false}>
                {route.element}
              </RoutePage>
            }
          />
        ))}

        {/* PROTECTED PORTALS */}

        <Route element={<ProtectedRoute />}>
          {portals.map((portal) => (
            <Route
              key={portal.role}
              element={<RoleRoute allowedRoles={portal.allowedRoles} />}
            >
              <Route element={<DashboardLayout role={portal.role} />}>
                {/* /patient, /doctor and /admin open the dashboard */}
                <Route
                  path={`/${portal.role}`}
                  element={<Navigate to={`/${portal.role}/dashboard`} replace />}
                />

                {portal.routes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={
                      <RoutePage
                        key={route.pageKey || route.path}
                        title={route.title}
                      >
                        {route.element}
                      </RoutePage>
                    }
                  />
                ))}
              </Route>
            </Route>
          ))}
        </Route>

        {/* DEFAULT ROUTE */}

        <Route path="/" element={<RootRedirect />} />

        {/* 404 FALLBACK */}

        <Route
          path="*"
          element={
            <RoutePage title={t("Page Not Found")} loadsData={false}>
              <NotFound />
            </RoutePage>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
