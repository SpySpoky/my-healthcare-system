// W106 – Login and registration UI validation.

import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { authenticate } from "../data/authData";
import { loadUsers } from "../data/adminData";
import { getPatientByEmail } from "../data/patientsData";
import { STORAGE_KEYS } from "../data/storage";
import { currentPath, renderApp } from "./renderApp";

const errorFor = (input) =>
  document.getElementById(input.getAttribute("aria-describedby"))?.textContent;

describe("W106 login – step 1: account type", () => {
  it("shows only the four account types and Create an account", async () => {
    renderApp("/login");

    const nav = await screen.findByRole("navigation", {
      name: /choose account type/i,
    });
    const links = within(nav).getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/login/patient",
      "/login/doctor",
      "/login/medical-staff",
      "/login/admin",
    ]);
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create an account/i })
    ).toHaveAttribute("href", "/register");
  });

  it("choosing a role changes the URL and shows email, password and forgot password", async () => {
    const { user } = renderApp("/login");

    await user.click(await screen.findByRole("link", { name: /^doctor/i }));

    expect(currentPath()).toBe("/login/doctor");
    expect(
      await screen.findByRole("heading", { name: /sign in as doctor/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot password/i })
    ).toHaveAttribute("href", "/forgot-password");

    await user.click(screen.getByRole("link", { name: /change account type/i }));
    expect(currentPath()).toBe("/login");
  });

  it("an unknown role in the URL returns to the role choice", async () => {
    renderApp("/login/nurse");

    await screen.findByRole("navigation", { name: /choose account type/i });
    expect(currentPath()).toBe("/login");
  });
});

describe("W106 login – step 2: credentials", () => {
  it("validates required fields, email format and password length", async () => {
    const { user } = renderApp("/login/patient");
    const email = await screen.findByLabelText(/email address/i);
    const password = screen.getByLabelText(/^password$/i);

    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(errorFor(email)).toMatch(/email address is required/i);
    expect(errorFor(password)).toMatch(/password is required/i);

    await user.type(email, "not-an-email");
    await user.type(password, "123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    expect(errorFor(email)).toMatch(/valid email/i);
    expect(errorFor(password)).toMatch(/at least 8 characters/i);
  });

  it("rejects an account of a different type", async () => {
    const { user } = renderApp("/login/doctor");

    await user.type(await screen.findByLabelText(/email address/i), "patient@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret12");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /not registered as a doctor/i
    );
    expect(currentPath()).toBe("/login/doctor");
  });

  it("rejects unknown and suspended accounts", async () => {
    expect(authenticate({ role: "patient", email: "nobody@test.com" }).error).toMatch(
      /incorrect email or password/i
    );

    // Daniel Jackson's account is suspended in the demo dataset.
    const suspended = loadUsers().find((account) => account.status === "Suspended");
    expect(
      authenticate({ role: "patient", email: suspended.email }).error
    ).toMatch(/suspended/i);
  });

  it("signs in each demo account to its own portal", async () => {
    const { user } = renderApp("/login/medical-staff");

    await user.type(await screen.findByLabelText(/email address/i), "staff@test.com");
    await user.type(screen.getByLabelText(/^password$/i), "secret12");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(currentPath()).toBe("/doctor/dashboard"));
    expect(
      JSON.parse(localStorage.getItem("healthcare_user")).name
    ).toBe("Nurse Laura Kim");
  });

  it("'Remember me' off keeps the session only for the browser session", async () => {
    const { user } = renderApp("/login/admin");

    // The demo button fills in both the email and the password.
    await user.click(await screen.findByRole("button", { name: /use this account/i }));
    await user.click(screen.getByRole("checkbox", { name: /remember me/i }));
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(currentPath()).toBe("/admin/dashboard"));
    expect(localStorage.getItem("healthcare_user")).toBeNull();
    expect(sessionStorage.getItem("healthcare_user")).toMatch(/admin@test.com/);
  });
});

describe("W106 registration", () => {
  const fill = async (user, values) => {
    for (const [label, value] of Object.entries(values)) {
      const field = screen.getByLabelText(label);

      if (field.tagName === "SELECT") {
        await user.selectOptions(field, value);
      } else {
        await user.clear(field);
        await user.type(field, value);
      }
    }
  };

  it("shows an error for every empty field", async () => {
    const { user } = renderApp("/register");

    await user.click(await screen.findByRole("button", { name: /create account/i }));

    for (const label of [/full name/i, /email address/i, /phone number/i, /date of birth/i, /gender/i, /^password$/i, /confirm password/i]) {
      expect(errorFor(screen.getByLabelText(label))).toBeTruthy();
    }
    expect(screen.getByText(/must accept the terms/i)).toBeInTheDocument();
  });

  it("validates date of birth, password strength and matching passwords", async () => {
    const { user } = renderApp("/register");
    await screen.findByLabelText(/full name/i);

    await fill(user, {
      "Full Name": "Jane Doe",
      "Email Address": "jane@example.com",
      "Phone Number": "+90 555 111 2222",
      "Date of Birth": "2099-01-01",
      Gender: "female",
      Password: "abcdefgh",
      "Confirm Password": "abcdefgx",
    });
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(errorFor(screen.getByLabelText(/date of birth/i))).toMatch(/future/i);
    expect(errorFor(screen.getByLabelText(/^password$/i))).toMatch(/letter and one number/i);
    expect(errorFor(screen.getByLabelText(/confirm password/i))).toMatch(/do not match/i);
  });

  it("rejects an email that is already registered", async () => {
    const { user } = renderApp("/register");
    await screen.findByLabelText(/full name/i);

    await fill(user, {
      "Full Name": "John Copy",
      "Email Address": "patient@test.com",
      "Phone Number": "+90 555 111 2222",
      "Date of Birth": "1990-05-05",
      Gender: "male",
      Password: "secure123",
      "Confirm Password": "secure123",
    });
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/already exists/i);
  });

  it("creates the account and patient record, which can then sign in", async () => {
    const { user } = renderApp("/register");
    await screen.findByLabelText(/full name/i);

    await fill(user, {
      "Full Name": "Jane Doe",
      "Email Address": "jane.doe@example.com",
      "Phone Number": "+90 555 111 2222",
      "Date of Birth": "1995-05-05",
      Gender: "female",
      Password: "secure123",
      "Confirm Password": "secure123",
    });
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/account created/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /go to sign in/i })
    ).toHaveAttribute("href", "/login/patient");

    expect(getPatientByEmail("jane.doe@example.com")).toMatchObject({
      name: "Jane Doe",
      gender: "Female",
    });
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEYS.users)).some(
        (account) => account.email === "jane.doe@example.com"
      )
    ).toBe(true);
    expect(
      authenticate({ role: "patient", email: "jane.doe@example.com" }).user
    ).toMatchObject({ name: "Jane Doe", patientId: expect.any(Number) });
  });
});

describe("W106 password recovery", () => {
  it("forgot password validates the email and confirms the request", async () => {
    const { user } = renderApp("/forgot-password");
    const email = await screen.findByLabelText(/email address/i);

    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(errorFor(email)).toMatch(/required/i);

    await user.type(email, "patient@test.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it("reset password requires a token and matching strong passwords", async () => {
    renderApp("/reset-password");
    expect(await screen.findByText(/invalid or missing reset link/i)).toBeInTheDocument();
  });

  it("reset password succeeds with a valid token", async () => {
    const { user } = renderApp("/reset-password?token=demo");
    const password = await screen.findByLabelText(/^new password$/i);
    const confirm = screen.getByLabelText(/confirm new password/i);

    await user.type(password, "newpass1");
    await user.type(confirm, "newpass2");
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    expect(errorFor(confirm)).toMatch(/do not match/i);

    await user.clear(confirm);
    await user.type(confirm, "newpass1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });
});
