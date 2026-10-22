import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthField from "../../components/auth/AuthField";
import { LockIcon } from "../../components/auth/AuthIcons";
import AuthStatusMessage from "../../components/auth/AuthStatusMessage";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";
import BrandLogo from "../../components/common/BrandLogo";
import { USE_API } from "../../api/config";
import { api } from "../../api/client";
import {
  PASSWORD_MIN_LENGTH,
  validateNewPassword,
  validatePasswordConfirmation,
} from "../../utils/validation/authValidation";

import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { t } from "../../i18n";
const MOCK_DELAY = 900;

const getRequirements = (password) => [
  {
    label: t("At least {PASSWORD_MIN_LENGTH} characters", { PASSWORD_MIN_LENGTH }),
    met: password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    label: t("Contains a letter"),
    met: /[A-Za-z]/.test(password),
  },
  {
    label: t("Contains a number"),
    met: /[0-9]/.test(password),
  },
];

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const isLoading = status === "loading";
  const requirements = getRequirements(form.password);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));

    if (errors[name]) {
      setErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationErrors = {};
    const passwordError = validateNewPassword(form.password);
    const confirmError = validatePasswordConfirmation(
      form.password,
      form.confirmPassword
    );

    if (passwordError) {
      validationErrors.password = passwordError;
    }

    if (confirmError) {
      validationErrors.confirmPassword = confirmError;
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("loading");

    if (USE_API) {
      api
        .post("/auth/reset-password", { token, password: form.password })
        .then(() => setStatus("success"))
        .catch((reason) => {
          setErrors({ password: reason.message });
          setStatus("idle");
        });

      return;
    }

    setTimeout(() => setStatus("success"), MOCK_DELAY);
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
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl lg:grid-cols-2">
          {/* Left Information Panel */}
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

              {/* Message */}
              <div className="max-w-lg">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{t("Secure Account Recovery")}</p>

                <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">{t("Create a new")}<span className="block text-cyan-200">{t("secure password.")}</span>
                </h1>

                <p className="mt-6 max-w-md text-base leading-7 text-blue-100">{t("Choose a strong new password to protect your healthcare account and keep your information secure.")}</p>
              </div>

              {/* Security Features */}
              <div className="mt-10 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>🔐</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Strong Password")}</p>

                    <p className="text-xs text-blue-100">{t("Choose a password that is difficult to guess.")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>🛡️</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Protect Your Account")}</p>

                    <p className="text-xs text-blue-100">{t("Keep your healthcare information protected.")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>✓</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Confirm Your Password")}</p>

                    <p className="text-xs text-blue-100">{t("Make sure both password fields match.")}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-xs text-blue-200">{t("Centralized Healthcare Management System")}</p>
          </div>

          {/* Form Panel */}
          <div className="flex items-center bg-white/95 p-6 sm:p-10 xl:p-14">
            <div className="mx-auto w-full max-w-md">
              {/* Mobile Brand */}
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <BrandLogo className="h-7 w-7" />
                </div>

                <div>
                  <p className="font-bold text-slate-900">{t("Healthcare Management System")}</p>

                  <p className="text-xs text-slate-500">{t("Centralized Healthcare Platform")}</p>
                </div>
              </div>

              {/* Header */}
              <div className="mb-8">
                <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-600" />{t("Password Recovery")}</div>

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("Reset Password")}</h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">{t("Create a new password for your healthcare account.")}</p>
              </div>

              {!token ? (
                <div>
                  <AuthStatusMessage variant="error" title={t("Invalid or missing reset link")}>{t("This password reset link is incomplete or has expired. Please request a new one.")}</AuthStatusMessage>

                  <Link
                    to="/forgot-password"
                    className="block w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
                  >{t("Request a New Link")}</Link>
                </div>
              ) : status === "success" ? (
                <div>
                  <AuthStatusMessage title={t("Password updated")}>{t("Your password has been reset. You can now sign in with your new password.")}</AuthStatusMessage>

                  <Link
                    to="/login"
                    className="block w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
                  >{t("Go to Sign In")}</Link>
                </div>
              ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <AuthField
                  id="newPassword"
                  name="password"
                  type="password"
                  label={t("New Password")}
                  icon={<LockIcon />}
                  placeholder={t("Enter your new password")}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  error={errors.password}
                />

                <AuthField
                  id="confirmNewPassword"
                  name="confirmPassword"
                  type="password"
                  label={t("Confirm New Password")}
                  icon={<LockIcon />}
                  placeholder={t("Confirm your new password")}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  error={errors.confirmPassword}
                />

                {/* Live password requirements */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-700">{t("Password Requirements")}</p>

                  <ul className="space-y-1.5 text-xs">
                    {requirements.map((requirement) => (
                      <li
                        key={requirement.label}
                        className={`flex items-center gap-2 ${
                          requirement.met ? "text-emerald-700" : "text-slate-500"
                        }`}
                      >
                        <span aria-hidden="true">
                          {requirement.met ? "✓" : "○"}
                        </span>
                        {t(requirement.label)}
                        <span className="sr-only">
                          {requirement.met ? "(met)" : t("(not met)")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <AuthSubmitButton
                  isLoading={isLoading}
                  loadingText={t("Resetting password...")}
                >{t("Reset Password")}</AuthSubmitButton>
              </form>
              )}

              {/* Footer */}
              <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">{t("Remember your password?")} <Link
                    to="/login"
                    className="font-bold text-blue-600 transition-colors hover:text-indigo-600"
                  >{t("Back to Login")}</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;