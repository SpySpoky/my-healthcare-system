import { execFileSync } from "node:child_process";

// Rebuilds the test database (schema + demo data) once before the API tests.
export default function setup() {
  execFileSync(process.execPath, ["server/scripts/setup-db.js"], {
    env: { ...process.env, DB_NAME: "healthcare_test" },
    stdio: "inherit",
  });
}
