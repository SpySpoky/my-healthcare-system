import { translateServerMessage } from "../i18n/serverMessages";
import { API_URL } from "./config";

const TOKEN_KEY = "healthcare_token";
const USER_KEY = "healthcare_user";

export const UNAUTHORIZED_EVENT = "healthcare:unauthorized";
export const SYNC_ERROR_EVENT = "healthcare:sync-error";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let memoryToken = null;

const readStorage = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const getToken = () =>
  memoryToken ||
  readStorage(localStorage, TOKEN_KEY) ||
  readStorage(sessionStorage, TOKEN_KEY);

// "Remember me" keeps the token in localStorage, otherwise it lives
// in sessionStorage and ends with the browser session.
export const setToken = (token, { remember = true } = {}) => {
  clearToken();
  memoryToken = token;

  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // The token still works for this page load.
  }
};

export const clearToken = () => {
  memoryToken = null;

  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clear.
  }
};

// Role of the signed-in user, read from the stored session.
export const getSessionRole = () => {
  try {
    const stored = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);

    return stored ? JSON.parse(stored).role : null;
  } catch {
    return null;
  }
};

const request = async (method, path, body) => {
  const token = getToken();
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, translateServerMessage("Cannot reach the server. Check your connection and try again."));
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    // An expired or revoked session ends the sign-in (but a wrong
    // password on the login form is just an error message).
    if (response.status === 401 && token && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(response.status, translateServerMessage(data?.error || "The request failed. Please try again."));
  }

  return data;
};

// Sends a form with files attached (multipart/form-data). The browser
// sets the Content-Type itself, including the boundary.
const sendForm = async (path, form) => {
  const token = getToken();
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      body: form,
    });
  } catch {
    throw new ApiError(0, translateServerMessage("Cannot reach the server. Check your connection and try again."));
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, translateServerMessage(data?.error || "The request failed. Please try again."));
  }

  return data;
};

// Downloads a file the signed-in user is allowed to see. The token
// goes in the header, never in the URL, so it cannot leak through
// browser history or server logs.
const download = async (path) => {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
  });

  if (!response.ok) {
    throw new ApiError(response.status, translateServerMessage("This document could not be downloaded."));
  }

  return response.blob();
};

export const api = {
  get: (path) => request("GET", path),
  post: (path, body = {}) => request("POST", path, body),
  put: (path, body = {}) => request("PUT", path, body),
  patch: (path, body = {}) => request("PATCH", path, body),
  delete: (path) => request("DELETE", path),
  postForm: (path, form) => sendForm(path, form),
  download,
};
