// Feedback rules shared by the form (feedbackValidation.js) and the API
// (server/routes/admin.js), so both accept exactly the same text.
// No imports: this file runs in the browser and in Node.

export const ALLOWED_FEEDBACK_TYPES = [
  "Feedback",
  "Complaint",
  "Suggestion",
];

export const MIN_SUBJECT_LENGTH = 3;
export const MAX_SUBJECT_LENGTH = 100;

export const MIN_MESSAGE_LENGTH = 10;
export const MAX_MESSAGE_LENGTH = 1000;

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/*
 * Project-controlled profanity list.
 *
 * This is intentionally kept in a separate file so the list
 * can be expanded or replaced later without changing
 * Feedback.jsx.
 */
export const BLOCKED_WORDS = [
  "fuck",
  "fucker",
  "fucking",
  "shit",
  "bullshit",
  "bitch",
  "bastard",
  "damn",
  "crap",
  "asshole",
  "idiot",
  "stupid",
  // Turkish (written without special letters, see normalizeTextForModeration)
  "orospu",
  "siktir",
  "pezevenk",
  "serefsiz",
  "gerizekali",
  "aptal",
  "salak",
  "ibne",
  "yarrak",
];

/*
 * Normalize text before moderation checks.
 *
 * This helps detect simple obfuscation such as:
 *
 * f-u-c-k
 * f u c k
 * f@ck
 * sh1t
 */
export const normalizeTextForModeration = (value = "") => {
  return value
    .toLowerCase()
    .normalize("NFKC")
    // Turkish letters become plain ones so "ŞEREFSİZ" matches "serefsiz".
    .replace(/[ıİ]/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/\|/g, "i")
    .replace(/[^a-z0-9]/g, "");
};


/*
 * Detect common URL/link formats.
 *
 * Examples:
 *
 * https://example.com
 * http://example.com
 * www.example.com
 * example.com
 */
export const containsLink = (value = "") => {
  const urlPattern =
    /(?:https?:\/\/|www\.)[^\s]+/i;

  const domainPattern =
    /\b[a-z0-9-]+\.(?:com|net|org|io|co|tr|uk|de|ru|edu|gov)(?:[/?#][^\s]*)?\b/i;

  return (
    urlPattern.test(value) ||
    domainPattern.test(value)
  );
};


/*
 * Detect HTML tags.
 */
export const containsHtml = (value = "") => {
  return /<[^>]*>/i.test(value);
};


/*
 * Detect common JavaScript/code patterns.
 */
export const containsCode = (value = "") => {
  const codePatterns = [
    /<script\b/i,
    /<\/script>/i,
    /javascript\s*:/i,
    /\bon\w+\s*=/i,
    /\beval\s*\(/i,
    /\balert\s*\(/i,
    /\bdocument\s*\./i,
    /\bwindow\s*\./i,
    /\bconsole\s*\./i,
  ];

  return codePatterns.some((pattern) =>
    pattern.test(value)
  );
};


/*
 * Detect control characters that should not appear
 * in normal feedback.
 */
export const containsInvalidControlCharacters = (
  value = ""
) => {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);

    return (
      code <= 0x08 ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f
    );
  });
};


/*
 * Detect characters commonly associated with
 * HTML/code injection.
 *
 * Normal letters, numbers, spaces and punctuation
 * remain allowed.
 */
export const containsInvalidCharacters = (
  value = ""
) => {
  return /[<>`{}[\]\\]/.test(value);
};


/*
 * Check the profanity list after normalization.
 */
export const containsBlockedWord = (value = "") => {
  const normalizedText =
    normalizeTextForModeration(value);

  return BLOCKED_WORDS.some((word) => {
    const normalizedWord =
      normalizeTextForModeration(word);

    return normalizedText.includes(
      normalizedWord
    );
  });
};


/*
 * The first problem with a piece of text, as an English
 * message (translated by the caller), or null when it is fine.
 */
export const textContentProblem = (value = "") => {
  if (containsLink(value)) return "Links and URLs are not allowed.";
  if (containsHtml(value)) return "HTML tags are not allowed.";
  if (containsCode(value)) return "Code or scripts are not allowed.";
  if (containsInvalidControlCharacters(value)) return "Invalid characters are not allowed.";
  if (containsInvalidCharacters(value)) return "Invalid characters are not allowed.";
  if (containsBlockedWord(value)) return "Please remove inappropriate language.";

  return null;
};
