import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import { authenticate } from "../data/authData";

export const DEMO_USERS = {
  patient: "patient@test.com",
  doctor: "doctor@test.com",
  medical_staff: "staff@test.com",
  admin: "admin@test.com",
};

// Signs in a demo account the same way the login page does.
export const signInAs = (role) => {
  const { user, error } = authenticate({ role, email: DEMO_USERS[role] });

  if (error) {
    throw new Error(error);
  }

  localStorage.setItem("healthcare_user", JSON.stringify(user));

  return user;
};

// Renders the whole application at `path`, optionally signed in.
export const renderApp = (path = "/", { role } = {}) => {
  if (role) {
    signInAs(role);
  }

  window.history.pushState({}, "", path);

  const user = userEvent.setup();
  const utils = render(
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  );

  return { user, ...utils };
};

// Waits for a page's main heading (pages load after a short mock delay).
export const findPageHeading = (name) =>
  screen.findByRole("heading", { level: 1, name });

export const currentPath = () => window.location.pathname;
