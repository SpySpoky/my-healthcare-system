import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import AuthField from "../../components/auth/AuthField";
import { LockIcon, MailIcon } from "../../components/auth/AuthIcons";
import AuthStatusMessage from "../../components/auth/AuthStatusMessage";
import AuthSubmitButton from "../../components/auth/AuthSubmitButton";
import MedicalBackdrop from "../../components/auth/MedicalBackdrop";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import TurnstileWidget from "../../components/auth/TurnstileWidget";
import RoleSelector from "../../components/auth/RoleSelector";
import { USE_API } from "../../api/config";
import { api, clearToken, setToken } from "../../api/client";
import { hydrate } from "../../api/hydrate";
import { useAuth } from "../../context/useAuth";
import {
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  LOGIN_ROLES,
  authenticate,
  getLoginRoleBySlug,
} from "../../data/authData";
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
} from "../../utils/validation/authValidation";
import BrandLogo from "../../components/common/BrandLogo";

import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { t } from "../../i18n";
const MOCK_DELAY = 800;

const emailPlaceholders = {
  patient: "you@example.com",
  doctor: "doctor@hospital.com",
  medical_staff: "staff@hospital.com",
  admin: "admin@hospital.com",
};

// Two-step sign in:
//   /login        -> choose an account type (or create an account)
//   /login/:role  -> email, password and forgot password for that type
function Login() {
  const navigate = useNavigate();
  const { role: roleSlug } = useParams();
  const { user: signedInUser, login, getDashboardPath } = useAuth();

  const selectedRole = roleSlug ? getLoginRoleBySlug(roleSlug) : null;

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: true,
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [loginError, setLoginError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  // Already signed in (e.g. after pressing Back): go to the dashboard.
  // The success state is excluded so the "Login successful" message
  // can show before the redirect.
  if (signedInUser && status !== "success") {
    return <Navigate to={getDashboardPath(signedInUser.role)} replace />;
  }

  // Unknown role in the URL: back to the role choice.
  if (roleSlug && !selectedRole) {
    return <Navigate to="/login" replace />;
  }

  const isLoading = status === "loading" || status === "success";

  const updateField = (name, value) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));

    if (status === "error") {
      setStatus("idle");
    }
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    updateField(name, type === "checkbox" ? checked : value);
  };

  const useDemoAccount = () => {
    updateField("email", DEMO_ACCOUNTS[selectedRole.value].email);
    updateField("password", DEMO_PASSWORD);
  };

  const validateForm = () => {
    const newErrors = {};
    const emailError = validateEmail(formData.email);

    if (emailError) {
      newErrors.email = emailError;
    }

    if (!formData.password) {
      newErrors.password = t("Password is required.");
    } else if (formData.password.length < PASSWORD_MIN_LENGTH) {
      newErrors.password = t("Password must be at least {PASSWORD_MIN_LENGTH} characters.", { PASSWORD_MIN_LENGTH });
    }

    return newErrors;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!captchaToken) {
      setLoginError(t("Please complete the security check."));
      setStatus("error");
      return;
    }

    signIn(formData.email);
  };

  const showError = (message) => {
    setLoginError(message);
    setStatus("error");
  };

  const finishSignIn = (user, options = {}) => {
    login(user, { remember: formData.remember, ...options });
    setStatus("success");

    setTimeout(() => {
      navigate(getDashboardPath(user.role), { replace: true });
    }, 500);
  };

  // Backend sign-in: verify the password on the server, then load the
  // user's data before showing the portal.
  const signInWithServer = async (path, body) => {
    setStatus("loading");

    try {
      const { token, user } = await api.post(path, { ...body, role: selectedRole.value });

      setToken(token, { remember: formData.remember });

      try {
        await hydrate();
      } catch (error) {
        clearToken();
        throw error;
      }

      finishSignIn(user);
    } catch (error) {
      setLoginError(error.message);
      setStatus("error");
    }
  };

  const signIn = (email) => {
    if (USE_API) {
      signInWithServer("/auth/login", { email, password: formData.password, captchaToken });
      return;
    }

    setStatus("loading");

    setTimeout(() => {
      const { user, error } = authenticate({
        role: selectedRole.value,
        email,
      });

      if (error) {
        setLoginError(error);
        setStatus("error");
        return;
      }

      finishSignIn(user);
    }, MOCK_DELAY);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700">
      <div className="absolute right-4 top-4 z-20"><LanguageSwitcher tone="dark" /></div>

      {/* Background hospital video (drop a clip at public/videos/hospital.mp4) */}
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
        src="/videos/hospital.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      <MedicalBackdrop />

      {/* Background Decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-300/10 blur-3xl" />

        <div className="absolute left-[10%] top-[20%] h-2 w-2 rounded-full bg-white/50 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />

        <div className="absolute right-[15%] top-[30%] h-3 w-3 rounded-full bg-white/40 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />

        <div className="absolute bottom-[20%] left-[18%] h-2 w-2 rounded-full bg-cyan-200/50 shadow-[0_0_20px_rgba(165,243,252,0.8)]" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-3 py-4 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl lg:grid-cols-2">
          {/* Left Branding Section */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700/80 via-indigo-700/80 to-violet-800/80 p-10 text-white lg:flex xl:p-14">
            <div>
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-md">
                  <BrandLogo className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-lg font-bold tracking-tight">{t("Healthcare Management System")}</p>

                  <p className="text-sm text-blue-100">{t("Centralized Healthcare Platform")}</p>
                </div>
              </div>

              <div className="max-w-lg">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-200">{t("Welcome Back")}</p>

                <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">{t("Healthcare management,")}<span className="block text-cyan-200">{t("simplified.")}</span>
                </h1>

                <p className="mt-6 max-w-md text-base leading-7 text-blue-100">{t("Access appointments, medical records, healthcare information, and more from one centralized platform.")}</p>
              </div>
            </div>

            <div className="mt-12">
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-md">
                  <div className="mb-2 text-2xl">🏥</div>
                  <p className="text-xs font-medium text-blue-100">{t("Centralized")}</p>
                </div>

                <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-md">
                  <div className="mb-2 text-2xl">🔒</div>
                  <p className="text-xs font-medium text-blue-100">{t("Secure")}</p>
                </div>

                <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-md">
                  <div className="mb-2 text-2xl">⚡</div>
                  <p className="text-xs font-medium text-blue-100">{t("Efficient")}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Section */}
          <div className="bg-white/95 px-5 py-7 sm:p-10 xl:p-14">
            <div className="mx-auto w-full max-w-md">
              {/* Mobile Brand */}
              <div className="mb-6 flex items-center gap-3 sm:mb-8 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <BrandLogo className="h-7 w-7" />
                </div>

                <div>
                  <p className="font-bold text-slate-900">{t("Healthcare Management System")}</p>

                  <p className="text-xs text-slate-500">{t("Centralized Healthcare Platform")}</p>
                </div>
              </div>

              {!selectedRole ? (
                <>
                  {/* Step 1: choose account type */}
                  <div className="mb-6 sm:mb-8">
                    <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-blue-600" />{t("Secure Login")}</div>

                    <h2 className="text-2xl font-extrabold sm:text-3xl tracking-tight text-slate-900">{t("Welcome back")}</h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">{t("Choose how you want to sign in.")}</p>
                  </div>

                  <RoleSelector roles={LOGIN_ROLES} />

                  <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                    <p className="mb-3 text-sm text-slate-500">{t("New to the healthcare system?")}</p>

                    <Link
                      to="/register"
                      className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-blue-600 px-6 py-3.5 text-sm font-bold text-blue-700 transition-all hover:-translate-y-0.5 hover:bg-blue-50"
                    >{t("Create an account")}</Link>

                    {/* Doctors and medical staff apply for approval instead. */}
                    <p className="mt-4 text-sm text-slate-500">{t("Doctor or medical staff?")} <Link
                        to="/apply"
                        className="font-bold text-teal-600 transition-colors hover:text-cyan-600"
                      >{t("Apply for an account")}</Link>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2: credentials for the chosen account type */}
                  <Link
                    to="/login"
                    className="mb-6 inline-flex items-center gap-2 rounded-xl px-2 py-1 -ml-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >{t("← Change account type")}</Link>

                  <div className="mb-6 sm:mb-8">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                      <span aria-hidden="true">{selectedRole.icon}</span>{t("{label} Login", { label: t(selectedRole.label) })}</div>

                    <h2 className="text-2xl font-extrabold sm:text-3xl tracking-tight text-slate-900">{t("Sign in as {label}", { label: t(selectedRole.label) })}</h2>

                    <p className="mt-2 text-sm leading-6 text-slate-500">{t("Enter your email and password to continue.")}</p>
                  </div>

                  {status === "success" && (
                    <AuthStatusMessage title={t("Login successful")}>{t("Redirecting to your dashboard...")}</AuthStatusMessage>
                  )}

                  {status === "error" && (
                    <AuthStatusMessage variant="error" title={t("Login failed")}>
                      {loginError}
                    </AuthStatusMessage>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <AuthField
                      id="loginEmail"
                      name="email"
                      type="email"
                      label={t("Email Address")}
                      icon={<MailIcon />}
                      placeholder={emailPlaceholders[selectedRole.value]}
                      autoComplete="email"
                      autoFocus
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isLoading}
                      error={errors.email}
                    />

                    <AuthField
                      id="loginPassword"
                      name="password"
                      type="password"
                      label={t("Password")}
                      icon={<LockIcon />}
                      placeholder={t("Enter your password")}
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={isLoading}
                      error={errors.password}
                    />

                    <div className="flex items-center justify-between gap-4">
                      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          name="remember"
                          checked={formData.remember}
                          onChange={handleChange}
                          disabled={isLoading}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600 focus:ring-2 focus:ring-blue-200"
                        />

                        <span>{t("Remember me")}</span>
                      </label>

                      <Link
                        to="/forgot-password"
                        className="text-sm font-semibold text-blue-600 transition-colors hover:text-indigo-600"
                      >{t("Forgot Password?")}</Link>
                    </div>

                    <TurnstileWidget onVerify={setCaptchaToken} />

                    <AuthSubmitButton
                      isLoading={isLoading}
                      loadingText={t("Signing in...")}
                    >{t("Sign In")}</AuthSubmitButton>
                  </form>

                  <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />{t("or")}<span className="h-px flex-1 bg-slate-200" />
                  </div>

                  <GoogleSignInButton
                    disabled={isLoading}
                    onEmail={signIn}
                    onCredential={
                      USE_API
                        ? (credential) => signInWithServer("/auth/google", { credential })
                        : undefined
                    }
                    onError={showError}
                  />

                  {selectedRole.value === "patient" && (
                    <p className="mt-6 text-center text-sm text-slate-500">{t("New patient?")} <Link
                        to="/register"
                        className="font-bold text-blue-600 transition-colors hover:text-indigo-600"
                      >{t("Create an account")}</Link>
                    </p>
                  )}

                  {/* Demo account for this role */}
                  <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{t("Demo Account")}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {DEMO_ACCOUNTS[selectedRole.value].email} {t("· password: {password}", { password: DEMO_PASSWORD })}</p>
                    </div>

                    <button
                      type="button"
                      onClick={useDemoAccount}
                      disabled={isLoading}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-100 transition-colors hover:bg-blue-100 disabled:opacity-60"
                    >{t("Use this account")}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Remount per role so the form and messages reset when the
// user switches account type.
function LoginPage() {
  const { role } = useParams();

  return <Login key={role || "choose-role"} />;
}

export default LoginPage;
