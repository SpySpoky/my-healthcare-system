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
import BrandLogo from "../../components/common/BrandLogo";
import LanguageSwitcher from "../../components/common/LanguageSwitcher";
import { USE_API } from "../../api/config";
import { api } from "../../api/client";
import {
  ADMIN_STORAGE_KEYS,
  getNextApplicationId,
  loadApplications,
  saveStored,
} from "../../data/adminData";
import { ALL_DEPARTMENTS } from "../../data/doctorsData";
import {
  DOCUMENT_TYPES,
  MAX_DOCUMENTS,
  PASSWORD_HINT,
  validateStaffApplication,
} from "../../utils/validation/authValidation";
import { getTodayDate } from "../../utils/date";
import { t } from "../../i18n";

const MOCK_DELAY = 900;

const INITIAL_FORM = {
  fullName: "",
  email: "",
  phone: "",
  role: "",
  department: "",
  licenseNumber: "",
  experience: "",
  qualification: "",
  documents: [],
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

const fileSize = (bytes) => {
  const mb = bytes / (1024 * 1024);

  return mb >= 0.1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

function StaffApplication() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [submitError, setSubmitError] = useState("");

  const isLoading = status === "loading";

  const handleChange = (event) => {
    const { name, value, type, checked, files } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : type === "file" ? [...files] : value,
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

    const validationErrors = validateStaffApplication(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setStatus("loading");

    const application = {
      name: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      department: form.department.trim(),
      licenseNumber: form.licenseNumber.trim(),
      experience: Number(form.experience),
      qualification: form.qualification.trim(),
    };

    if (USE_API) {
      // The documents travel with the form, so it is sent as multipart.
      const payload = new FormData();

      Object.entries({ ...application, password: form.password }).forEach(([key, value]) =>
        payload.append(key, value)
      );
      form.documents.forEach((file) => payload.append("documents", file));

      api
        .postForm("/applications", payload)
        .then(() => setStatus("success"))
        .catch((error) => {
          setSubmitError(error.message);
          setErrors(error.status === 409 ? { email: t("This email is already registered.") } : {});
          setStatus("error");
        });

      return;
    }

    setTimeout(() => {
      const applications = loadApplications();
      const email = application.email.toLowerCase();

      if (applications.some((item) => item.email.toLowerCase() === email && item.status === "Pending")) {
        setSubmitError(t("An application for this email is already waiting for review."));
        setErrors({ email: t("This email already has an application under review.") });
        setStatus("error");
        return;
      }

      // The application appears on the administrator's approval page.
      // Without the backend there is nowhere to keep the file itself,
      // so only its description is stored.
      saveStored(ADMIN_STORAGE_KEYS.applications, [
        {
          id: getNextApplicationId(applications),
          ...application,
          documents: form.documents.map((file, index) => ({
            id: index + 1,
            name: file.name,
            type: file.type,
            size: file.size,
            stored: false,
          })),
          submittedAt: getTodayDate(),
          status: "Pending",
        },
        ...applications,
      ]);

      setStatus("success");
    }, MOCK_DELAY);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-800">
      <div className="absolute right-4 top-4 z-20"><LanguageSwitcher tone="dark" /></div>

      {/* Background Decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[500px] w-[500px] rounded-full bg-cyan-300/10 blur-3xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl lg:grid-cols-2">
          {/* Left Branding Section */}
          <div className="hidden flex-col justify-between bg-gradient-to-br from-teal-700/80 via-cyan-700/80 to-blue-800/80 p-10 text-white lg:flex xl:p-14">
            <div>
              <div className="mb-10 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/20 backdrop-blur-md">
                  <BrandLogo className="h-8 w-8" />
                </div>

                <div>
                  <p className="text-lg font-bold tracking-tight">{t("Healthcare Management System")}</p>

                  <p className="text-sm text-cyan-100">{t("Centralized Healthcare Platform")}</p>
                </div>
              </div>

              <div className="max-w-lg">
                <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">{t("Join Our Clinical Team")}</p>

                <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">{t("Apply to practise")}<span className="block text-cyan-200">{t("with our clinic.")}</span>
                </h1>

                <p className="mt-6 max-w-md text-base leading-7 text-cyan-100">{t("Doctors and medical staff do not register directly. Send your credentials here and an administrator will review them.")}</p>
              </div>

              <div className="mt-10 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>📄</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Submit your credentials")}</p>

                    <p className="text-xs text-cyan-100">{t("Licence, qualifications and supporting documents.")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <span>🛡️</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold">{t("Administrator review")}</p>

                    <p className="text-xs text-cyan-100">{t("Your account is created once the application is approved.")}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-xs text-cyan-200">{t("Centralized Healthcare Management System")}</p>
          </div>

          {/* Application Section */}
          <div className="bg-white/95 p-6 sm:p-10 xl:p-12">
            <div className="mx-auto w-full max-w-xl">
              {/* Mobile Brand */}
              <div className="mb-7 flex items-center gap-3 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-lg shadow-cyan-500/25">
                  <BrandLogo className="h-7 w-7" />
                </div>

                <div>
                  <p className="font-bold text-slate-900">{t("Healthcare Management System")}</p>

                  <p className="text-xs text-slate-500">{t("Centralized Healthcare Platform")}</p>
                </div>
              </div>

              {/* Header */}
              <div className="mb-7">
                <div className="mb-3 inline-flex items-center rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700">
                  <span className="mr-2 h-1.5 w-1.5 rounded-full bg-teal-600" />{t("Staff Application")}</div>

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("Apply for a staff account")}</h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">{t("An administrator reviews every application before an account is created.")}</p>
              </div>

              {status === "error" && (
                <AuthStatusMessage variant="error" title={t("Application failed")}>
                  {submitError}
                </AuthStatusMessage>
              )}

              {status === "success" ? (
                <div>
                  <AuthStatusMessage title={t("Application submitted")}>{t("Your application for")} <strong>{form.email.trim()}</strong> {t("is now waiting for review. You will be able to sign in once an administrator approves it.")}</AuthStatusMessage>

                  <Link
                    to="/login"
                    className="block w-full rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:-translate-y-0.5"
                  >{t("Back to Sign In")}</Link>
                </div>
              ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <AuthField
                  id="applicantName"
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AuthField
                    id="applicantEmail"
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

                  <AuthField
                    id="applicantPhone"
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
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AuthField
                    as="select"
                    id="applicantRole"
                    name="role"
                    label={t("Position")}
                    value={form.role}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.role}
                  >
                    <option value="" disabled>{t("Select a position")}</option>
                    <option value="doctor">{t("Doctor")}</option>
                    <option value="medical_staff">{t("Medical Staff")}</option>
                  </AuthField>

                  <AuthField
                    id="applicantDepartment"
                    name="department"
                    label={t("Department")}
                    placeholder={t("Choose or type a department")}
                    list="application-departments"
                    value={form.department}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.department}
                  />

                  {/* Departments from the database; a new name creates one. */}
                  <datalist id="application-departments">
                    {ALL_DEPARTMENTS.map((department) => (
                      <option key={department} value={department} />
                    ))}
                  </datalist>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AuthField
                    id="applicantLicense"
                    name="licenseNumber"
                    label={t("License Number")}
                    placeholder="MD-TR-000000"
                    value={form.licenseNumber}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.licenseNumber}
                  />

                  <AuthField
                    id="applicantExperience"
                    name="experience"
                    type="number"
                    min="0"
                    max="70"
                    label={t("Years of Experience")}
                    placeholder="5"
                    value={form.experience}
                    onChange={handleChange}
                    disabled={isLoading}
                    error={errors.experience}
                  />
                </div>

                <AuthField
                  id="applicantQualification"
                  name="qualification"
                  label={t("Qualification")}
                  placeholder={t("MD, Pediatrics Residency — Ankara University")}
                  value={form.qualification}
                  onChange={handleChange}
                  disabled={isLoading}
                  error={errors.qualification}
                />

                <div>
                  <label
                    htmlFor="applicantDocuments"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >{t("Supporting Documents")}</label>

                  <input
                    id="applicantDocuments"
                    name="documents"
                    type="file"
                    multiple
                    accept={DOCUMENT_TYPES.join(",")}
                    onChange={handleChange}
                    disabled={isLoading}
                    aria-invalid={Boolean(errors.documents)}
                    aria-describedby={
                      errors.documents ? "applicantDocuments-error" : "applicantDocuments-hint"
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition-all duration-200 file:mr-4 file:rounded-xl file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-teal-700 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  {form.documents.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {form.documents.map((file) => (
                        <li
                          key={file.name}
                          className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700"
                        >
                          📄 {file.name}
                          <span className="font-normal text-teal-600">{fileSize(file.size)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {errors.documents ? (
                    <AuthFieldError id="applicantDocuments-error" message={errors.documents} />
                  ) : (
                    <p id="applicantDocuments-hint" className="mt-2 text-xs text-slate-500">{t("Your licence, CV and any other proof. PDF, JPG or PNG, up to {count} files of 10 MB each.", { count: MAX_DOCUMENTS })}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AuthField
                    id="applicantPassword"
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
                    id="applicantConfirmPassword"
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
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-colors hover:border-teal-100 hover:bg-teal-50/50">
                    <input
                      type="checkbox"
                      name="acceptTerms"
                      checked={form.acceptTerms}
                      onChange={handleChange}
                      disabled={isLoading}
                      aria-invalid={Boolean(errors.acceptTerms)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 accent-teal-600 focus:ring-2 focus:ring-teal-200"
                    />

                    <span className="text-xs leading-5 text-slate-600">{t("I confirm that the credentials above are mine and may be verified.")}</span>
                  </label>

                  <AuthFieldError message={errors.acceptTerms} />
                </div>

                <AuthSubmitButton
                  isLoading={isLoading}
                  loadingText={t("Submitting application...")}
                >{t("Submit Application")}</AuthSubmitButton>
              </form>
              )}

              {/* Footer */}
              <div className="mt-7 border-t border-slate-100 pt-6 text-center">
                <p className="text-sm text-slate-500">{t("Already have an account?")} <Link
                    to="/login"
                    className="font-bold text-teal-600 transition-colors hover:text-cyan-600"
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

export default StaffApplication;
