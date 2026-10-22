// Loads every page in Turkish and reports text that looks like untranslated
// English. Run with: npm run test:tr
//
// Two things are flagged: text that equals an English dictionary key (t() was
// not applied or the value was not looked up) and text containing common
// English function words. Names, e-mails and numbers are not flagged.

import { configure, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { AuthProvider } from "../../context/AuthContext";
import { ToastProvider } from "../../context/ToastContext";
import tr from "../../i18n/tr";
import { getLanguage } from "../../i18n";
import { collectDemoStrings } from "../fixtures/demoData";
import { signInAs } from "../renderApp";

configure({ asyncUtilTimeout: 8000 });

const PAGES = {
  patient: [
    "/patient/dashboard",
    "/patient/appointments",
    "/patient/appointments/book",
    "/patient/appointments/15/reschedule",
    "/patient/medical-records",
    "/patient/feedback",
    "/patient/messages",
    "/patient/profile",
  ],
  doctor: [
    "/doctor/dashboard",
    "/doctor/appointments",
    "/doctor/availability",
    "/doctor/patients",
    "/doctor/patients/1",
    "/doctor/patients/1/diagnosis",
    "/doctor/patients/1/prescription",
    "/doctor/patients/1/status",
    "/doctor/messages",
  ],
  admin: [
    "/admin/dashboard",
    "/admin/users",
    "/admin/applications",
    "/admin/feedback",
    "/admin/reports",
    "/admin/activity",
  ],
};

const PUBLIC_PAGES = ["/login", "/login/patient", "/register", "/forgot-password", "/reset-password?token=abc", "/unauthorized", "/nowhere"];

const ENGLISH_WORDS =
  /\b(the|and|for|you|your|with|this|will|from|have|are|please|select|enter|view|add|edit|has|was|been|appointment|appointments|patient|patients|doctor|doctors|medical|record|records|message|messages|search|submit|cancel|save|delete|loading|welcome)\b/i;

const englishKeys = new Set(Object.keys(tr));

// Free text in the demo data (feedback, notes, messages...) is user content, so
// it is allowed to be English. Words that are also UI vocabulary are not.
const demoContent = collectDemoStrings();

const visibleTexts = () => {
  const found = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const tag = node.parentElement?.tagName;

    if (tag === "SCRIPT" || tag === "STYLE") continue;

    const text = node.textContent.replace(/\s+/g, " ").trim();

    if (text) found.push(text);
  }

  document.querySelectorAll("[placeholder], [aria-label], [title], [alt]").forEach((element) => {
    ["placeholder", "aria-label", "title", "alt"].forEach((attribute) => {
      const value = element.getAttribute(attribute);

      if (value) found.push(value.trim());
    });
  });

  return found;
};

const looksEnglish = (text) => {
  if (!/[A-Za-z]{3,}/.test(text)) return false;
  if (/@|https?:|\.com\b|\.test\b/.test(text)) return false;
  if (demoContent.has(text) && !englishKeys.has(text)) return false;

  return englishKeys.has(text) || ENGLISH_WORDS.test(text);
};

const scan = async (path, role) => {
  if (role) signInAs(role === "doctor" ? "doctor" : role);

  window.history.pushState({}, "", path);

  const { unmount } = render(
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  );

  await screen.findAllByRole("heading");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const flagged = [...new Set(visibleTexts().filter(looksEnglish))];

  unmount();

  return flagged;
};

describe("Turkish translation coverage", () => {
  it("runs in Turkish", () => {
    expect(getLanguage()).toBe("tr");
  });

  describe.each(Object.entries(PAGES))("%s portal", (role, paths) => {
    it.each(paths)("%s has no untranslated text", async (path) => {
      const flagged = await scan(path, role);
      expect(flagged, `${path}: ${flagged.join(" | ")}`).toEqual([]);
    });
  });

  it.each(PUBLIC_PAGES)("%s has no untranslated text", async (path) => {
    const flagged = await scan(path);
    expect(flagged, `${path}: ${flagged.join(" | ")}`).toEqual([]);
  });
});
