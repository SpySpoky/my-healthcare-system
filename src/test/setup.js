import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { installDemoData } from "./fixtures/demoData";

// The app ships no demo data (it comes from the database); the tests
// run on this demo dataset instead.
installDemoData();

// Pages simulate network delays (400–900 ms), so async queries wait longer.
configure({ asyncUtilTimeout: 4000 });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, "", "/");
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});
