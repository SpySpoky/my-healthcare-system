import { t } from "../../i18n";
import {
  ALLOWED_FEEDBACK_TYPES,
  MAX_MESSAGE_LENGTH,
  MAX_RATING,
  MAX_SUBJECT_LENGTH,
  MIN_MESSAGE_LENGTH,
  MIN_RATING,
  MIN_SUBJECT_LENGTH,
  textContentProblem,
} from "./feedbackRules";

// The rules themselves live in feedbackRules.js, shared with the API.

/*
 * Validate text content.
 */
const validateTextContent = (value, fieldName) => {
  const problem = textContentProblem(value);

  return problem ? { [fieldName]: t(problem) } : {};
};

/*
 * Main feedback form validation.
 */
export const validateFeedbackForm = (form) => {
  const errors = {};

  const subject =
    typeof form.subject === "string"
      ? form.subject.trim()
      : "";

  const message =
    typeof form.message === "string"
      ? form.message.trim()
      : "";


  /*
   * Feedback Type
   */

  if (!form.type) {
    errors.type =
      t("Please select a feedback type.");
  } else if (
    !ALLOWED_FEEDBACK_TYPES.includes(form.type)
  ) {
    errors.type =
      t("Please select a valid feedback type.");
  }


  /*
   * Subject
   */

  if (!subject) {
    errors.subject =
      t("Subject is required.");
  } else if (
    subject.length < MIN_SUBJECT_LENGTH
  ) {
    errors.subject =
      t("Subject must be at least {MIN_SUBJECT_LENGTH} characters.", { MIN_SUBJECT_LENGTH });
  } else if (
    subject.length > MAX_SUBJECT_LENGTH
  ) {
    errors.subject =
      t("Subject must not exceed {MAX_SUBJECT_LENGTH} characters.", { MAX_SUBJECT_LENGTH });
  }

  if (!errors.subject) {
    Object.assign(
      errors,
      validateTextContent(
        subject,
        "subject"
      )
    );
  }


  /*
   * Message
   */

  if (!message) {
    errors.message =
      t("Message is required.");
  } else if (
    message.length < MIN_MESSAGE_LENGTH
  ) {
    errors.message =
      t("Message must be at least {MIN_MESSAGE_LENGTH} characters.", { MIN_MESSAGE_LENGTH });
  } else if (
    message.length > MAX_MESSAGE_LENGTH
  ) {
    errors.message =
      t("Message must not exceed {MAX_MESSAGE_LENGTH} characters.", { MAX_MESSAGE_LENGTH });
  }

  if (!errors.message) {
    Object.assign(
      errors,
      validateTextContent(
        message,
        "message"
      )
    );
  }


  /*
   * Rating
   */

  const ratingNumber =
    Number(form.rating);

  if (
    !form.rating ||
    !Number.isInteger(ratingNumber) ||
    ratingNumber < MIN_RATING ||
    ratingNumber > MAX_RATING
  ) {
    errors.rating =
      t("Rating must be between {MIN_RATING} and {MAX_RATING}.", { MIN_RATING, MAX_RATING });
  }


  return errors;
};


export {
  containsLink,
  containsHtml,
  containsCode,
  containsInvalidCharacters,
  containsBlockedWord,
  normalizeTextForModeration,
  BLOCKED_WORDS,
} from "./feedbackRules";
