import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { useCurrentPatientId } from "../../context/useCurrentProfile";
import { useToast } from "../../context/useToast";
import {
  ADMIN_STORAGE_KEYS,
  loadUsers,
  logActivity,
  saveStored,
} from "../../data/adminData";
import { getPatientById, updatePatient } from "../../data/patientsData";
import {
  loadPatientDocuments,
  savePatientDocuments,
} from "../../data/documentsData";

import { getLocale, t } from "../../i18n";
const EMPTY_PROFILE = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

// Patient record -> editable profile fields.
const toProfileForm = (patient) => {
  if (!patient) {
    return EMPTY_PROFILE;
  }

  const [firstName, ...rest] = patient.name.split(" ");

  return {
    firstName,
    lastName: rest.join(" "),
    email: patient.email,
    phone: patient.phone,
    dateOfBirth: patient.dateOfBirth,
    gender: patient.gender,
    address: patient.address || "",
    emergencyContactName: patient.emergencyContactName || "",
    emergencyContactPhone: patient.emergencyContactPhone || "",
  };
};

function Profile() {
  const [isEditing, setIsEditing] = useState(false);

  const showToast = useToast();
  const { user, updateUser } = useAuth();
  const patientId = useCurrentPatientId();

  const [profile, setProfile] = useState(() =>
    toProfileForm(getPatientById(patientId))
  );

  const [formData, setFormData] = useState(profile);

  const [errors, setErrors] = useState({});

  const [documents, setDocuments] = useState(() =>
    loadPatientDocuments(patientId)
  );

  useEffect(() => {
    savePatientDocuments(patientId, documents);
  }, [patientId, documents]);

  const [documentType, setDocumentType] =
    useState("Passport");

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [documentError, setDocumentError] =
    useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const validateProfile = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName =
        t("First name is required.");
    } else if (
      formData.firstName.trim().length < 2
    ) {
      newErrors.firstName =
        t("First name must contain at least 2 characters.");
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName =
        t("Last name is required.");
    } else if (
      formData.lastName.trim().length < 2
    ) {
      newErrors.lastName =
        t("Last name must contain at least 2 characters.");
    }

    if (!formData.email.trim()) {
      newErrors.email =
        t("Email address is required.");
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email
      )
    ) {
      newErrors.email =
        t("Please enter a valid email address.");
    }

    if (!formData.phone.trim()) {
      newErrors.phone =
        t("Phone number is required.");
    } else if (
      !/^[+]?[\d\s()-]{7,20}$/.test(
        formData.phone.trim()
      )
    ) {
      newErrors.phone =
        t("Please enter a valid phone number.");
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth =
        t("Date of birth is required.");
    }

    if (!formData.gender) {
      newErrors.gender =
        t("Gender is required.");
    }

    if (!formData.address.trim()) {
      newErrors.address =
        t("Address is required.");
    }

    if (
      !formData.emergencyContactName.trim()
    ) {
      newErrors.emergencyContactName =
        t("Emergency contact name is required.");
    }

    if (
      !formData.emergencyContactPhone.trim()
    ) {
      newErrors.emergencyContactPhone =
        t("Emergency contact phone is required.");
    } else if (
      !/^[+]?[\d\s()-]{7,20}$/.test(
        formData.emergencyContactPhone.trim()
      )
    ) {
      newErrors.emergencyContactPhone =
        t("Please enter a valid phone number.");
    }

    return newErrors;
  };

  const handleEdit = () => {
    setFormData(profile);
    setErrors({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData(profile);
    setErrors({});
    setIsEditing(false);
  };

  const handleSave = (event) => {
    event.preventDefault();

    const validationErrors =
      validateProfile();

    setErrors(validationErrors);

    if (
      Object.keys(validationErrors).length > 0
    ) {
      return;
    }

    const email = formData.email.trim();
    const users = loadUsers();

    if (
      users.some(
        (account) =>
          account.email.toLowerCase() === email.toLowerCase() &&
          account.email.toLowerCase() !== profile.email.toLowerCase()
      )
    ) {
      setErrors({ email: t("Another account already uses this email.") });
      return;
    }

    const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
    const phone = formData.phone.trim();

    updatePatient(patientId, {
      name,
      email,
      phone,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      address: formData.address.trim(),
      emergencyContactName: formData.emergencyContactName.trim(),
      emergencyContactPhone: formData.emergencyContactPhone.trim(),
    });

    // Keep the login account and admin user list in step.
    saveStored(
      ADMIN_STORAGE_KEYS.users,
      users.map((account) =>
        account.email.toLowerCase() === profile.email.toLowerCase()
          ? { ...account, name, email, phone }
          : account
      )
    );
    updateUser({ name, email });
    logActivity({ ...user, name }, "Updated profile information", "Users");

    setProfile(toProfileForm(getPatientById(patientId)));
    setIsEditing(false);
    setErrors({});
    showToast(t("Profile updated successfully."));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    setDocumentError("");
    setSelectedFile(null);

    if (!file) {
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    const allowedExtensions = [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
    ];

    const maxSize = 10 * 1024 * 1024;

    const fileName = file.name.toLowerCase();

    const hasValidExtension =
      allowedExtensions.some((extension) =>
        fileName.endsWith(extension)
      );

    if (
      !allowedTypes.includes(file.type) ||
      !hasValidExtension
    ) {
      setDocumentError(
        t("Invalid file type. Please select a PDF, JPG, JPEG, or PNG file.")
      );

      event.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      setDocumentError(
        t("File size must be 10 MB or smaller.")
      );

      event.target.value = "";
      return;
    }

    if (file.size === 0) {
      setDocumentError(
        t("The selected file is empty. Please choose another file.")
      );

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const handleDocumentUpload = () => {
    setDocumentError("");

    if (!documentType) {
      setDocumentError(
        t("Please select a document type.")
      );
      return;
    }

    if (!selectedFile) {
      setDocumentError(
        t("Please choose a file to upload.")
      );
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];

    const maxSize = 10 * 1024 * 1024;

    if (
      !allowedTypes.includes(selectedFile.type)
    ) {
      setDocumentError(
        t("Invalid file type. Please select a PDF, JPG, JPEG, or PNG file.")
      );
      return;
    }

    if (selectedFile.size > maxSize) {
      setDocumentError(
        t("File size must be 10 MB or smaller.")
      );
      return;
    }

    const duplicateDocument =
      documents.some(
        (document) =>
          document.fileName.toLowerCase() ===
          selectedFile.name.toLowerCase()
      );

    if (duplicateDocument) {
      setDocumentError(
        t("A document with this file name has already been uploaded.")
      );
      return;
    }

    const newDocument = {
      id: Date.now(),
      type: documentType,
      name: selectedFile.name,
      fileName: selectedFile.name,
      uploadedAt:
        new Date().toLocaleDateString(
          getLocale(),
          {
            year: "numeric",
            month: "long",
            day: "numeric",
          }
        ),
      size: `${(
        selectedFile.size /
        (1024 * 1024)
      ).toFixed(2)} MB`,
    };

    setDocuments((current) => [
      newDocument,
      ...current,
    ]);

    setSelectedFile(null);

    const fileInput =
      document.getElementById(
        "documentFile"
      );

    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleDocumentDelete = (
    documentId
  ) => {
    setDocuments((current) =>
      current.filter(
        (document) =>
          document.id !== documentId
      )
    );
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">

      {/* Page Header */}

      <div className="flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-cyan-600 via-teal-500 to-emerald-500 p-6 text-white shadow-xl shadow-cyan-500/10 sm:flex-row sm:items-center sm:justify-between sm:p-8">

        <div>
          <div className="flex items-center gap-4">

            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-black text-white shadow-lg backdrop-blur-sm">
              {`${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "?"}
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{t("My Profile")}</h1>

              <p className="mt-1 text-sm text-cyan-50 sm:text-base">{t("View and manage your personal information.")}</p>
            </div>

          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            className="
              inline-flex
              min-h-11
              items-center
              justify-center
              rounded-xl
              bg-white
              px-6
              py-3
              text-sm
              font-bold
              text-cyan-700
              shadow-lg
              transition-all
              duration-200
              hover:-translate-y-0.5
              hover:bg-cyan-50
              hover:shadow-xl
              focus:outline-none
              focus:ring-4
              focus:ring-white/30
            "
            onClick={handleEdit}
          >{t("Edit Profile")}</button>
        )}

      </div>


      <form
        onSubmit={handleSave}
        noValidate
        className="space-y-6"
      >

        {/* Personal Information */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-emerald-50 px-5 py-5 sm:px-6">

            <h2 className="text-xl font-bold text-slate-900">{t("Personal Information")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Your basic personal information.")}</p>

          </div>


          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">

            {/* First Name */}

            <div>
              <label
                htmlFor="firstName"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("First Name")}</label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.firstName
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.firstName && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.firstName}
                </p>
              )}
            </div>


            {/* Last Name */}

            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Last Name")}</label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.lastName
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.lastName && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.lastName}
                </p>
              )}
            </div>


            {/* Date of Birth */}

            <div>
              <label
                htmlFor="dateOfBirth"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Date of Birth")}</label>

              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.dateOfBirth
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.dateOfBirth && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.dateOfBirth}
                </p>
              )}
            </div>


            {/* Gender */}

            <div>
              <label
                htmlFor="gender"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Gender")}</label>

              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.gender
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              >
                <option value="">{t("Select gender")}</option>

                <option value="Male">{t("Male")}</option>

                <option value="Female">{t("Female")}</option>

                <option value="Other">{t("Other")}</option>
              </select>

              {errors.gender && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {t(errors.gender)}
                </p>
              )}
            </div>

          </div>

        </section>


        {/* Contact Information */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-emerald-50 px-5 py-5 sm:px-6">

            <h2 className="text-xl font-bold text-slate-900">{t("Contact Information")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Your contact details and address.")}</p>

          </div>


          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">

            {/* Email */}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Email Address")}</label>

              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.email
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.email && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.email}
                </p>
              )}
            </div>


            {/* Phone */}

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Phone Number")}</label>

              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.phone
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.phone && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.phone}
                </p>
              )}
            </div>


            {/* Address */}

            <div className="sm:col-span-2">

              <label
                htmlFor="address"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Address")}</label>

              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={!isEditing}
                rows={3}
                className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.address
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.address && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.address}
                </p>
              )}

            </div>

          </div>

        </section>


        {/* Emergency Contact */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-r from-rose-50 to-orange-50 px-5 py-5 sm:px-6">

            <h2 className="text-xl font-bold text-slate-900">{t("Emergency Contact")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Contact information for emergencies.")}</p>

          </div>


          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 sm:p-6">

            {/* Contact Name */}

            <div>
              <label
                htmlFor="emergencyContactName"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Contact Name")}</label>

              <input
                id="emergencyContactName"
                name="emergencyContactName"
                type="text"
                value={
                  formData.emergencyContactName
                }
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.emergencyContactName
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.emergencyContactName && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.emergencyContactName}
                </p>
              )}
            </div>


            {/* Contact Phone */}

            <div>
              <label
                htmlFor="emergencyContactPhone"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >{t("Contact Phone")}</label>

              <input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                type="tel"
                value={
                  formData.emergencyContactPhone
                }
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ${
                  errors.emergencyContactPhone
                    ? "border-red-400 ring-4 ring-red-500/10"
                    : "border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                } ${
                  !isEditing
                    ? "cursor-not-allowed bg-slate-50 text-slate-500"
                    : ""
                }`}
              />

              {errors.emergencyContactPhone && (
                <p className="mt-2 text-sm font-medium text-red-600">
                  {errors.emergencyContactPhone}
                </p>
              )}
            </div>

          </div>

        </section>


        {/* Documents & Medical Files */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-emerald-50 px-5 py-5 sm:px-6">

            <h2 className="text-xl font-bold text-slate-900">{t("Documents & Medical Files")}</h2>

            <p className="mt-1 text-sm text-slate-500">{t("Upload and manage your personal and medical documents.")}</p>

          </div>


          {/* Upload Area */}

          <div className="border-b border-slate-100 p-5 sm:p-6">

            <div className="rounded-2xl border-2 border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50/70 to-emerald-50/70 p-5 sm:p-6">

              <div className="mb-5">

                <h3 className="text-lg font-bold text-slate-900">{t("Upload New Document")}</h3>

                <p className="mt-1 text-sm text-slate-500">{t("Accepted formats: PDF, JPG, JPEG, PNG. Maximum size: 10 MB.")}</p>

              </div>


              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* Document Type */}

                <div>
                  <label
                    htmlFor="documentType"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >{t("Document Type")}</label>

                  <select
                    id="documentType"
                    value={documentType}
                    onChange={(event) => {
                      setDocumentType(
                        event.target.value
                      );
                      setDocumentError("");
                    }}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10"
                  >
                    <option value="Passport">{t("Passport")}</option>

                    <option value="National ID">{t("National ID")}</option>

                    <option value="Medical Record">{t("Medical Record")}</option>

                    <option value="Prescription">{t("Prescription")}</option>

                    <option value="Lab Result">{t("Lab Result")}</option>

                    <option value="Insurance">{t("Insurance")}</option>

                    <option value="Vaccination Record">{t("Vaccination Record")}</option>

                    <option value="Other">{t("Other")}</option>
                  </select>
                </div>


                {/* File */}

                <div>
                  <label
                    htmlFor="documentFile"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >{t("Select File")}</label>

                  <input
                    id="documentFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="
                      block
                      w-full
                      cursor-pointer
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      text-sm
                      text-slate-600
                      shadow-sm
                      file:mr-4
                      file:border-0
                      file:bg-cyan-50
                      file:px-4
                      file:py-3
                      file:text-sm
                      file:font-bold
                      file:text-cyan-700
                      hover:border-cyan-300
                    "
                  />
                </div>

              </div>


              {/* Selected File */}

              {selectedFile && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-lg">
                    📄
                  </div>

                  <div className="min-w-0">

                    <strong className="block text-sm font-bold text-emerald-900">{t("Selected File")}</strong>

                    <span className="block truncate text-sm text-emerald-700">
                      {selectedFile.name}
                    </span>

                  </div>

                </div>
              )}


              {/* Error */}

              {documentError && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {documentError}
                </div>
              )}


              {/* Upload Button */}

              <div className="mt-5 flex justify-end">

                <button
                  type="button"
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-r
                    from-cyan-500
                    to-emerald-500
                    px-6
                    py-3
                    text-sm
                    font-bold
                    text-white
                    shadow-md
                    shadow-cyan-500/20
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:from-cyan-600
                    hover:to-emerald-600
                    hover:shadow-lg
                    hover:shadow-cyan-500/25
                    focus:outline-none
                    focus:ring-4
                    focus:ring-cyan-500/20
                  "
                  onClick={handleDocumentUpload}
                >{t("Upload Document")}</button>

              </div>

            </div>

          </div>


          {/* Uploaded Documents */}

          <div className="p-5 sm:p-6">

            <div className="mb-5">

              <h3 className="text-lg font-bold text-slate-900">{t("My Documents")}</h3>

              <p className="mt-1 text-sm text-slate-500">{t("Documents currently associated with your profile.")}</p>

            </div>


            {documents.length === 0 ? (

              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">

                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                  📁
                </div>

                <p className="text-sm font-medium text-slate-500">{t("No documents have been uploaded yet.")}</p>

              </div>

            ) : (

              <div className="space-y-3">

                {documents.map((document) => (

                  <div
                    key={document.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-cyan-200 hover:shadow-md sm:flex-row sm:items-center"
                  >

                    {/* Icon */}

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-emerald-100 text-xl">
                      📄
                    </div>


                    {/* Information */}

                    <div className="min-w-0 flex-1">

                      <strong className="block truncate text-sm font-bold text-slate-900">
                        {document.name}
                      </strong>

                      <span className="mt-1 block text-xs font-semibold text-cyan-700">
                        {t(document.type)}
                      </span>

                      <small className="mt-1 block text-xs text-slate-500">{t("Uploaded: {uploadedAt} • {size}", { uploadedAt: document.uploadedAt, size: document.size })}</small>

                    </div>


                    {/* Delete */}

                    <button
                      type="button"
                      className="
                        inline-flex
                        min-h-10
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-red-200
                        bg-red-50
                        px-4
                        py-2
                        text-sm
                        font-bold
                        text-red-600
                        transition-all
                        duration-200
                        hover:-translate-y-0.5
                        hover:border-red-300
                        hover:bg-red-100
                        hover:shadow-sm
                        focus:outline-none
                        focus:ring-4
                        focus:ring-red-500/10
                        sm:shrink-0
                      "
                      onClick={() =>
                        handleDocumentDelete(
                          document.id
                        )
                      }
                    >{t("Delete")}</button>

                  </div>

                ))}

              </div>

            )}

          </div>

        </section>


        {/* Edit Actions */}

        {isEditing && (

          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:justify-end">

            <button
              type="button"
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                rounded-xl
                border
                border-slate-200
                bg-white
                px-6
                py-3
                text-sm
                font-bold
                text-slate-700
                shadow-sm
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:border-cyan-200
                hover:bg-cyan-50
                hover:text-cyan-700
                hover:shadow-md
                focus:outline-none
                focus:ring-4
                focus:ring-cyan-500/20
              "
              onClick={handleCancel}
            >{t("Cancel")}</button>

            <button
              type="submit"
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-r
                from-cyan-500
                to-emerald-500
                px-6
                py-3
                text-sm
                font-bold
                text-white
                shadow-md
                shadow-cyan-500/20
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:from-cyan-600
                hover:to-emerald-600
                hover:shadow-lg
                focus:outline-none
                focus:ring-4
                focus:ring-cyan-500/20
              "
            >{t("Save Changes")}</button>

          </div>

        )}

      </form>

    </div>
  );
}

export default Profile;