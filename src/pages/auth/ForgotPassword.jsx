import { useState } from "react";
import { Link } from "react-router-dom";
import AuthField from "../../components/auth/AuthField";
import { MailIcon } from "../../components/auth/AuthIcons";
import AuthStatusMessage from "../../components/auth/AuthStatusMessage";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";
import BrandLogo from "../../components/common/BrandLogo";
import { USE_API } from "../../api/config";
import { api } from "../../api/client";
import { validateEmail } from "../../utils/validation/authValidation";

import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { t } from "../../i18n";
const MOCK_DELAY = 900;

// Demo token so the reset page can be reached without a real email.
const DEMO_RESET_TOKEN = "demo-reset-token";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("idle");
  const [devToken, setDevToken] = useState("");

  const isLoading = status === "loading";

  const handleChange = (event) => {
    setEmail(event.target.value);
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const emailError = validateEmail(email);
    setError(emailError);

    if (emailError) {
      return;
    }

    setStatus("loading");

    if (USE_API) {
      api
        .post("/auth/forgot-password", { email: email.trim() })
        .then((result) => {
          // Only development servers return the token (there is no mail server yet).
          setDevToken(result.devResetToken || "");
          setStatus("success");
        })
        .catch((reason) => {
          setError(reason.message);
          setStatus("idle");
        });

      return;
    }

    // For privacy the response is the same whether or not the
    // email belongs to an account.
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
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{t("Account Recovery")}</p>

                <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">{t("Get back to your")}<span className="block text-cyan-200">{t("healthcare account.")}</span>
                </h1>

                <p className="mt-6 max-w-md text-base leading-7 text-blue-100">{t("Forgot your password? Enter the email associated with your account and we'll help you get back in.")}</p>
              </div>

              {/* Recovery Steps */}
              <div className="mt-10 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>📧</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Enter your email")}</p>

                    <p className="text-xs text-blue-100">{t("Provide the email connected to your account.")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>🔗</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Receive a reset link")}</p>

                    <p className="text-xs text-blue-100">{t("Follow the instructions sent to your email.")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>🔒</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Secure your account")}</p>

                    <p className="text-xs text-blue-100">{t("Create a new password and continue securely.")}</p>
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

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("Forgot Password?")}</h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">{t("Enter your email address and we'll help you reset your password.")}</p>
              </div>

              {status === "success" ? (
                <div>
                  <AuthStatusMessage title={t("Check your email")}>{t("If an account exists for")} <strong>{email.trim()}</strong>{t(", a password reset link has been sent. The link expires in 30 minutes.")}</AuthStatusMessage>

                  <div className="space-y-3">
                    {(!USE_API || devToken) && (
                      <Link
                        to={`/reset-password?token=${USE_API ? devToken : DEMO_RESET_TOKEN}`}
                        className="block w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:-translate-y-0.5"
                      >{t("Open Reset Link (demo)")}</Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="w-full rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
                    >{t("Use a different email")}</button>
                  </div>
                </div>
              ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <AuthField
                  id="forgotEmail"
                  name="email"
                  type="email"
                  label={t("Email Address")}
                  icon={<MailIcon />}
                  placeholder={t("Enter your email")}
                  autoComplete="email"
                  value={email}
                  onChange={handleChange}
                  disabled={isLoading}
                  error={error}
                />

                <AuthSubmitButton
                  isLoading={isLoading}
                  loadingText={t("Sending reset link...")}
                >{t("Send Reset Link")}</AuthSubmitButton>
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

              {/* Security Notice */}
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 3 5 6v5c0 4.5 2.9 8.5 7 10 4.1-1.5 7-5.5 7-10V6l-7-3Z"
                    />

                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m9.5 12 1.7 1.7 3.5-3.5"
                    />
                  </svg>
                </div>

                <p className="text-xs leading-5 text-slate-600">{t("Your account security is important to us. Never share your password or password-reset information with anyone.")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;