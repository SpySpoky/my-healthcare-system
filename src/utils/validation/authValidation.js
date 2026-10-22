import { t } from "../../i18n";
// Shared client-side validation rules for the authentication forms.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9 ]{10,16}$/;

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT = t("At least {PASSWORD_MIN_LENGTH} characters, including a letter and a number.", { PASSWORD_MIN_LENGTH });

export const validateEmail = (value) => {
  if (!value.trim()) {
    return t("Email address is required.");
  }

  if (!EMAIL_PATTERN.test(value.trim())) {
    return t("Please enter a valid email address.");
  }

  return "";
};

export const validateNewPassword = (value) => {
  if (!value) {
    return t("Password is required.");
  }

  if (value.length < PASSWORD_MIN_LENGTH) {
    return t("Password must be at least {PASSWORD_MIN_LENGTH} characters.", { PASSWORD_MIN_LENGTH });
  }

  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return t("Password must include at least one letter and one number.");
  }

  return "";
};

export const validatePasswordConfirmation = (password, confirmation) => {
  if (!confirmation) {
    return t("Please confirm your password.");
  }

  if (password !== confirmation) {
    return t("Passwords do not match.");
  }

  return "";
};

const getAge = (dateValue) => {
  const birthDate = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age;
};

export const validateRegistration = (form) => {
  const errors = {};
  const name = form.fullName.trim();

  if (!name) {
    errors.fullName = t("Full name is required.");
  } else if (name.length < 3) {
    errors.fullName = t("Full name must be at least 3 characters.");
  } else if (!/^[\p{L}\s.'-]+$/u.test(name)) {
    errors.fullName = t("Full name can only contain letters, spaces, apostrophes and hyphens.");
  }

  const emailError = validateEmail(form.email);
  if (emailError) {
    errors.email = emailError;
  }

  if (!form.phone.trim()) {
    errors.phone = t("Phone number is required.");
  } else if (!PHONE_PATTERN.test(form.phone.trim())) {
    errors.phone = t("Enter a valid phone number (10–16 digits).");
  }

  if (!form.dateOfBirth) {
    errors.dateOfBirth = t("Date of birth is required.");
  } else {
    const age = getAge(form.dateOfBirth);

    if (Number.isNaN(age) || age < 0) {
      errors.dateOfBirth = t("Date of birth cannot be in the future.");
    } else if (age > 120) {
      errors.dateOfBirth = t("Please enter a valid date of birth.");
    }
  }

  if (!form.gender) {
    errors.gender = t("Please select your gender.");
  }

  const passwordError = validateNewPassword(form.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const confirmError = validatePasswordConfirmation(
    form.password,
    form.confirmPassword
  );
  if (confirmError) {
    errors.confirmPassword = confirmError;
  }

  if (!form.acceptTerms) {
    errors.acceptTerms = t("You must accept the terms and conditions.");
  }

  return errors;
};
