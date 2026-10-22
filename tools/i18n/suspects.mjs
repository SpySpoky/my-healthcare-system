// Lists string literals in the UI code that look like English text but are not
// passed to t(). Review the output by hand: many are fine (CSS classes, values,
// log text, comparisons).
//
//   node tools/i18n/suspects.mjs

import { parse } from "@babel/parser";
import { globSync, readFileSync } from "node:fs";

const files = globSync("src/{pages,components,context,data,hooks,routes,utils,api}/**/*.{js,jsx}")
  .map((file) => file.replaceAll("\\", "/"))
  .filter((file) => !file.includes("/test/"));

const SENTENCE = /^[A-Z][A-Za-z'’-]*(\s+[A-Za-z0-9'’,.:;()&/#-]+)+[.!?…]?$|^[A-Z][a-z]+[.!?]$/;
const CLASSY = /(^|\s)(bg|text|border|ring|from|to|via|rounded|shadow|flex|grid|px|py|mt|mb|ml|mr|w|h|min|max|gap|space|items|justify|font|transition|hover|focus|disabled|animate|absolute|relative|fixed|sticky|inline|block|hidden|overflow|truncate|leading|tracking|uppercase|backdrop|blur|opacity|cursor|pointer|select|outline|z)-?/;

const found = [];

const walk = (node, file, ancestors) => {
  if (!node || typeof node.type !== "string") return;

  const parent = ancestors[ancestors.length - 1];
  const insideT = ancestors.some((a) => a.type === "CallExpression" && a.callee.type === "Identifier" && a.callee.name === "t");
  const isKey = parent && ["ObjectProperty", "ObjectMethod"].includes(parent.type) && parent.key === node && !parent.computed;
  const isImport = ancestors.some((a) => a.type === "ImportDeclaration" || a.type === "ExportNamedDeclaration");
  const isJsxClass = parent?.type === "JSXAttribute" && ["className", "key", "type", "id", "name", "href", "to", "role", "d", "viewBox", "fill", "stroke"].includes(parent.name?.name);
  const isLogOrCompare =
    ancestors.some((a) => a.type === "CallExpression" && a.callee.type === "Identifier" && ["logActivity", "logAdminActivity"].includes(a.callee.name)) ||
    ["BinaryExpression", "SwitchCase"].includes(parent?.type);

  if (!insideT && !isKey && !isImport && !isJsxClass && !isLogOrCompare) {
    let text = null;

    if (node.type === "StringLiteral") text = node.value;
    if (node.type === "TemplateLiteral") text = node.quasis.map((quasi) => quasi.value.cooked).join("{}");
    if (node.type === "JSXText") text = node.value.replace(/\s+/g, " ").trim();

    if (text && SENTENCE.test(text) && !CLASSY.test(text) && !/^[A-Z][a-z]+$/.test(text)) {
      found.push(`${file}:${node.loc.start.line}\t${text.slice(0, 110)}`);
    }
  }

  ancestors.push(node);

  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "extra") continue;

    const child = node[key];

    if (Array.isArray(child)) child.forEach((item) => walk(item, file, ancestors));
    else if (child && typeof child.type === "string") walk(child, file, ancestors);
  }

  ancestors.pop();
};

for (const file of files) {
  try {
    walk(parse(readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx"] }).program, file, []);
  } catch {
    // Not parseable here.
  }
}

console.log(found.join("\n"));
console.log(`\n${found.length} suspects`);
