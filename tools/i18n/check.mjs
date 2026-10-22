// Lists the strings passed to t("...") in src/ and compares them with the
// Turkish dictionary (src/i18n/tr.js).
//
//   node tools/i18n/check.mjs            summary; exit code 1 if translations are missing
//   node tools/i18n/check.mjs --list     print every missing English string
//   node tools/i18n/check.mjs --json     write tools/i18n/missing.json ({ english: "" })

import { parse } from "@babel/parser";
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const files = globSync("{src,server}/**/*.{js,jsx}")
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => !file.includes("/test/") && (!file.startsWith("src/i18n/") || ["src/i18n/serverMessages.js", "src/i18n/activity.js"].includes(file)));

const used = new Map(); // english -> first location

const visit = (node, file) => {
  if (!node || typeof node.type !== "string") return;

  if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "t") {
    const [first] = node.arguments;

    if (first?.type === "StringLiteral" && !used.has(first.value)) used.set(first.value, `${file}:${node.loc.start.line}`);
    if (first?.type === "TemplateLiteral" && first.expressions.length === 0) {
      const value = first.quasis[0].value.cooked;

      if (!used.has(value)) used.set(value, `${file}:${node.loc.start.line}`);
    }
  }

  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "extra") continue;

    const child = node[key];

    if (Array.isArray(child)) child.forEach((item) => visit(item, file));
    else if (child && typeof child.type === "string") visit(child, file);
  }
};

for (const file of files) {
  try {
    visit(parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] }).program, file);
  } catch {
    // Not parseable here: skip.
  }
}

// Fixed messages from the API are plain strings, so they are added explicitly.
const { KNOWN_SERVER_MESSAGES } = await import(`${pathToFileURL(resolve("src/i18n/serverMessages.js")).href}`).catch(() => ({ KNOWN_SERVER_MESSAGES: [] }));

KNOWN_SERVER_MESSAGES.forEach((message) => used.set(message, "src/i18n/serverMessages.js"));

const { default: tr } = await import(`${pathToFileURL(resolve("src/i18n/tr.js")).href}?${Date.now()}`);

// Server messages are translated too (see server/messages.js); they are
// listed in src/i18n/serverMessages.js, which is merged into tr.js.
const missing = [...used.keys()].filter((key) => !(key in tr));
const unused = Object.keys(tr).filter((key) => !used.has(key));

// {placeholders} must match between English and Turkish.
const placeholderMismatch = Object.entries(tr).filter(([english, turkish]) => {
  const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(",");

  return names(english) !== names(turkish);
});

console.log(`${used.size} strings in code, ${Object.keys(tr).length} translated`);
// Entries not found in a t("...") call are usually still used: statuses, weekdays, departments and
// field names reach t() through a variable (t(status)), which this scan cannot see.
console.log(`${missing.length} missing, ${unused.length} not in t("...") (most are translated through variables), ${placeholderMismatch.length} placeholder mismatches`);

if (process.argv.includes("--list")) missing.forEach((key) => console.log(`${used.get(key)}\t${key}`));
if (process.argv.includes("--unused")) unused.forEach((key) => console.log(`not in t("..."): ${key}`));
placeholderMismatch.forEach(([english]) => console.log(`placeholder mismatch: ${english}`));

if (process.argv.includes("--json")) {
  writeFileSync("tools/i18n/missing.json", `${JSON.stringify(Object.fromEntries(missing.map((key) => [key, ""])), null, 2)}\n`);
}

process.exitCode = missing.length || placeholderMismatch.length ? 1 : 0;
