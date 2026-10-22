import { useState } from "react";
import { Link } from "react-router-dom";
import AuthField, { AuthFieldError } from "../../components/auth/AuthField";
import {
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "../../components/auth/AuthIcons";
import AuthStatusMessage from "../../components/auth/AuthStatusMessage";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";
import { USE_API } from "../../api/config";
import { api } from "../../api/client";
import {
  ADMIN_STORAGE_KEYS,
  formatTodayShort,
  getNextUserId,
  loadUsers,
  logActivity,
  saveStored,
} from "../../data/adminData";
import { addPatient } from "../../data/patientsData";
import {
  PASSWORD_HINT,
  validateRegistration,
} from "../../utils/validation/authValidation";
import { getTodayDate } from "../../utils/date";
import BrandLogo from "../../components/common/BrandLogo";

import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { t } from "../../i18n";
const MOCK_DELAY = 900;

// Demo accounts that already exist on the login page.
const RESERVED_EMAILS = [
  "patient@test.com",
  "doctor@test.com",
  "staff@test.com",
  "admin@test.com",
];

const INITIAL_FORM = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};


function Register() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [submitError, setSubmitError] = useState("");

  const isLoading = status === "loading";
  const todayDate = getTodayDate();

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: "" }));
    }

    if (status === "error") {
      setStatus("idle");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationErrors = validateRegistration(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("loading");

    if (USE_API) {
      api
        .post("/auth/register", {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          gender: form.gender,
          dateOfBirth: form.dateOfBirth,
          password: form.password,
        })
        .then(() => setStatus("success"))
        .catch((error) => {
          setSubmitError(error.message);
          setErrors(error.status === 409 ? { email: t("This email is already registered.") } : {});
          setStatus("error");
        });

      return;
    }

    setTimeout(() => {
      const email = form.email.trim().toLowerCase();
      const users = loadUsers();

      if (
        RESERVED_EMAILS.includes(email) ||
        users.some((user) => user.email.toLowerCase() === email)
      ) {
        setSubmitError(
          t("An account with this email already exists. Try signing in instead.")
        );
        setErrors({ email: t("This email is already registered.") });
        setStatus("error");
        return;
      }

      // The new patient appears in the admin user list.
      saveStored(ADMIN_STORAGE_KEYS.users, [
        ...users,
        {
          id: getNextUserId(users),
          name: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: "patient",
          department: "—",
          status: "Active",
          joined: formatTodayShort(),
          lastLogin: "Never",
        },
      ]);

      // ...and gets a patient record for appointments and records.
      addPatient({
        name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        gender: form.gender.charAt(0).toUpperCase() + form.gender.slice(1),
        dateOfBirth: form.dateOfBirth,
      });

      logActivity(
        { name: form.fullName.trim(), role: "patient" },
        "Registered a new patient account",
        "Users"
      );

      setStatus("success");
    }, MOCK_DELAY);
  };
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
      <div className="absolute right-4 top-4 z-20"><LanguageSwitcher tone="dark" /></div>

      {/* Background Decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-300/10 blur-3xl" />

        <div className="absolute left-[12%] top-[25%] h-2 w-2 rounded-full bg-white/50 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />

        <div className="absolute right-[14%] top-[18%] h-3 w-3 rounded-full bg-white/40 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />

        <div className="absolute bottom-[18%] left-[20%] h-2 w-2 rounded-full bg-cyan-200/50 shadow-[0_0_20px_rgba(165,243,252,0.8)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl lg:grid-cols-2">
          {/* Left Branding Section */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-blue-700/80 via-indigo-700/80 to-violet-800/80 p-10 text-white lg:flex xl:p-14">
            <div>
              {/* Brand */}
              <div className="mb-10 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-md">
                  <BrandLogo className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-lg font-bold tracking-tight">{t("Healthcare Management System")}</p>

                  <p className="text-sm text-blue-100">{t("Centralized Healthcare Platform")}</p>
                </div>
              </div>

              {/* Main Message */}
              <div className="max-w-lg">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{t("Join Our Platform")}</p>

                <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">{t("Your healthcare,")}<span className="block text-cyan-200">{t("all in one place.")}</span>
                </h1>

                <p className="mt-6 max-w-md text-base leading-7 text-blue-100">{t("Create your patient account and manage your healthcare information through one centralized platform.")}</p>
              </div>

              {/* Benefits */}
              <div className="mt-10 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>📅</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Manage Appointments")}</p>

                    <p className="text-xs text-blue-100">{t("Keep track of your healthcare appointments.")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>📋</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Access Medical Records")}</p>

                    <p className="text-xs text-blue-100">{t("Keep your healthcare information organized.")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>🔒</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Secure Platform")}</p>

                    <p className="text-xs text-blue-100">{t("Your account is protected by secure authentication.")}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-xs text-blue-200">{t("Centralized Healthcare Management System")}</p>
          </div>

          {/* Registration Section */}
          <div className="bg-white/95 p-6 sm:p-10 xl:p-12">
            <div className="mx-auto w-full max-w-xl">
              {/* Mobile Brand */}
              <div className="mb-7 flex items-center gap-3 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <BrandLogo className="h-7 w-7" />
                </div>

                <div>
                  <p className="font-bold text-slate-900">{t("Healthcare Management System")}</p>

                  <p className="text-xs text-slate-500">{t("Centralized Healthcare Platform")}</p>
                </div>
              </div>

              {/* Header */}
              <div className="mb-7">
                <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-600" />{t("Patient Registration")}</div>

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("Create your account")}</h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">{t("Register to access the healthcare management system.")}</p>
              </div>

              {status === "error" && (
                <AuthStatusMessage variant="error" title={t("Registration failed")}>
                  {submitError}
                </AuthStatusMessage>
              )}

              {status === "success" ? (
                <div>
                  <AuthStatusMessage title={t("Account created")}>{t("Your patient account for")} <strong>{form.email.trim()}</strong> {t("has been created. You can now sign in.")}</AuthStatusMessage>

                  <Link
                    to="/login/patient"
                    className="block w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
                  >{t("Go to Sign In")}</Link>
                </div>
              ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <AuthField
                  id="fullName"
                  name="fullName"
                  label={t("Full Name")}
                  icon={<UserIcon />}
                  placeholder={t("Enter your full name")}
                  autoComplete="name"
                  value={form.fullName}
                  onChange={handleChange}
                  disabled={isLoading}
                  error={errors.fullName}
                />

                <AuthField
                  id="registerEmail"
                  name="email"
                  type="email"
                  label={t("Email Address")}
                  icon={<MailIcon />}
                  placeholder={t("Enter your email")}
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  error={errors.email}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AuthField
                    id="phone"
                    name="phone"
                    type="tel"
                    label={t("Phone Number")}
                    icon={<PhoneIcon />}
                    placeholder="+90 555 123 4567"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.phone}
                  />

                  <AuthField
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    label={t("Date of Birth")}
                    max={todayDate}
                    value={form.dateOfBirth}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.dateOfBirth}
                  />
                </div>

                <AuthField
                  as="select"
                  id="gender"
                  name="gender"
                  label={t("Gender")}
                  value={form.gender}
                  onChange={handleChange}
                  disabled={isLoading}
                  error={errors.gender}
                >
                  <option value="" disabled>{t("Select your gender")}</option>
                  <option value="male">{t("Male")}</option>
                  <option value="female">{t("Female")}</option>
                  <option value="other">{t("Other")}</option>
                </AuthField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AuthField
                    id="registerPassword"
                    name="password"
                    type="password"
                    label={t("Password")}
                    icon={<LockIcon />}
                    placeholder={t("Create a password")}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.password}
                    hint={PASSWORD_HINT}
                  />

                  <AuthField
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    label={t("Confirm Password")}
                    icon={<LockIcon />}
                    placeholder={t("Confirm password")}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.confirmPassword}
                  />
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-blue-100 hover:bg-blue-50/50">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={form.acceptTerms}
                      onChange={handleChange}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.acceptTerms)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-200"
                    />

                    <span className="text-xs leading-5 text-slate-600">{t("I agree to the healthcare system's terms and conditions.")}</span>
                  </label>

                  <AuthFieldError message={errors.acceptTerms} />
                </div>

                <AuthSubmitButton
                  isLoading={isLoading}
                  loadingText={t("Creating account...")}
                >{t("Create Account")}</AuthSubmitButton>
              </form>
              )}

              {/* Footer */}
              <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">{t("Already have an account?")} <Link
                    to="/login/patient"
                    className="font-bold text-blue-600 transition-colors hover:text-indigo-600"
                  >{t("Sign in")}</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;