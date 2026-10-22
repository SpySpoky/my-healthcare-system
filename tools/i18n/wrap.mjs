// One-off codemod: wraps the user-visible English text in src/ with t("...")
// so it can be translated (see src/i18n). Run from the project root:
//
//   node tools/i18n/wrap.mjs --dry     report only
//   node tools/i18n/wrap.mjs           rewrite the files
//
// It edits by source position, so formatting is preserved, and it only
// touches text it is sure is shown to the user. Anything ambiguous is
// listed in tools/i18n/manual.txt for a person to handle.

import { parse } from "@babel/parser";
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative } from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = process.cwd();

const FILES = globSync("src/**/*.{js,jsx}")
  .map((file) => file.replaceAll("\\", "/"))
  .filter(
    (file) =>
      !file.startsWith("src/test/") &&
      !file.startsWith("src/i18n/") &&
      !file.startsWith("src/api/") &&
      !/\/main\.jsx$/.test(file)
  );

// JSX attributes whose string value is shown to the user.
const ATTRS = new Set([
  "title", "label", "placeholder", "alt", "aria-label", "description", "eyebrow", "hint",
  "message", "subtitle", "confirmText", "cancelText", "loadingText", "errorTitle",
  "errorMessage", "emptyText", "heading", "text", "summary", "legend", "helperText",
  "successMessage", "tooltip", "actionLabel", "emptyTitle", "emptyMessage",
]);

// Object properties whose string value is shown to the user.
const PROPS = new Set([
  "title", "label", "description", "message", "subtitle", "hint", "placeholder", "text",
  "eyebrow", "heading", "summary", "caption", "tooltip", "confirmText", "cancelText",
  "emptyTitle", "emptyMessage", "normalLabel", "ariaLabel",
]);

// Member names / identifiers that hold display text when shown as {x.status}.
const DYNAMIC_MEMBERS = new Set(["status", "department", "type", "priority", "gender", "day", "label", "specialty", "title", "user", "time"]);
const DYNAMIC_IDENTS = new Set(["label", "title", "description", "hint", "eyebrow", "message", "text", "heading", "subtitle", "status"]);

const DEFAULT_PROPS = new Set(["placeholder", "label", "title", "description", "hint", "children", "message", "confirmText", "cancelText", "text", "loadingText", "emptyTitle", "emptyMessage", "eyebrow"]);

const SINK_CALL = /^(showToast|set\w*(Error|Errors|Message|Alert|Notice)\w*)$/;
const ERROR_OBJECT = /errors?$/i;

const hasLetters = (value) => /[A-Za-z]/.test(value);

const looksTranslatable = (value, { allowPunctuation = false, allowSingleWord = false } = {}) => {
  if (!hasLetters(value)) return false;
  if ((!allowPunctuation && /^[/#.@]/.test(value)) || /^https?:/.test(value)) return false;
  // single lowercase technical words ("success", "button") are values, not text
  if (!allowSingleWord && !/\s/.test(value) && !/[A-Z]/.test(value) && /^[\x20-\x7e]+$/.test(value)) return false;

  return true;
};

const isSimpleExpression = (node) => {
  if (!node) return false;
  if (node.type === "Identifier") return true;
  if (node.type === "NumericLiteral") return false;
  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    return !node.computed && isSimpleExpression(node.object);
  }

  return false;
};

const lastName = (node) => {
  if (node.type === "Identifier") return node.name;

  return node.property.name;
};

// JSX collapses whitespace in text; this reproduces what is actually rendered.
const renderedJsxText = (value) => {
  const lines = value.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;

  lines.forEach((line, index) => {
    if (/[^ \t]/.test(line)) lastNonEmpty = index;
  });

  let result = "";

  lines.forEach((line, index) => {
    let trimmed = line.replace(/\t/g, " ");

    if (index !== 0) trimmed = trimmed.replace(/^ +/, "");
    if (index !== lines.length - 1) trimmed = trimmed.replace(/ +$/, "");

    if (trimmed) {
      if (index !== lastNonEmpty) trimmed += " ";
      result += trimmed;
    }
  });

  return result;
};

const stats = { files: 0, edits: 0 };
const manual = [];
const ruleCounts = {};

for (const file of FILES) {
  const source = readFileSync(file, "utf8");
  let ast;

  try {
    ast = parse(source, { sourceType: "module", plugins: ["jsx"] });
  } catch (error) {
    manual.push(`${file}: could not parse (${error.message})`);
    continue;
  }

  const edits = [];
  const lineOf = (node) => node.loc.start.line;
  const text = (node) => source.slice(node.start, node.end);
  const isValidationFile = file.startsWith("src/utils/validation/");
  const isUiFile = file.startsWith("src/pages/") || file.startsWith("src/components/");

  // Refuse files that already use `t` as a name.
  if (/\bconst t\b|\blet t\b|\(t\)|\bt,|, t\b|\bfunction t\b/.test(source) && !/from "\.\.?\/.*i18n"/.test(source)) {
    if (/\b(const|let|var) t\b|[(,]\s*t\s*[,)=]/.test(source)) {
      manual.push(`${file}: already has an identifier named "t"; wrap by hand`);
      continue;
    }
  }

  const addEdit = (node, replacement, rule) => {
    if (edits.some((edit) => node.start < edit.end && node.end > edit.start)) return;
    edits.push({ start: node.start, end: node.end, text: replacement });
    ruleCounts[rule] = (ruleCounts[rule] ?? 0) + 1;
  };

  // t("...") code for a string or template literal; null when it should not be wrapped.
  const literalCall = (node) => {
    if (node.type === "StringLiteral") {
      return looksTranslatable(node.value) ? `t(${JSON.stringify(node.value)})` : null;
    }

    if (node.type === "TemplateLiteral") {
      const params = [];
      const used = new Map();
      let key = "";

      for (let index = 0; index < node.quasis.length; index += 1) {
        key += node.quasis[index].value.cooked;

        if (index < node.expressions.length) {
          const expression = node.expressions[index];

          if (!isSimpleExpression(expression)) {
            manual.push(`${file}:${lineOf(node)}: template with a complex expression: ${text(node).slice(0, 90)}`);
            return null;
          }

          const code = text(expression);
          let name = lastName(expression);

          if (used.has(code)) {
            name = used.get(code);
          } else {
            let unique = name;
            let counter = 2;

            while ([...used.values()].includes(unique)) unique = `${name}${counter++}`;
            used.set(code, unique);
            params.push(unique === code ? unique : `${unique}: ${code}`);
            name = unique;
          }

          key += `{${name}}`;
        }
      }

      if (!looksTranslatable(key.replace(/\{\w+\}/g, ""))) return null;

      return params.length ? `t(${JSON.stringify(key)}, { ${params.join(", ")} })` : `t(${JSON.stringify(key)})`;
    }

    return null;
  };

  // Wraps string leaves reachable through ?: and ||/&&/??.
  const wrapLeaves = (node, rule) => {
    if (!node) return;

    if (node.type === "StringLiteral" || node.type === "TemplateLiteral") {
      const call = literalCall(node);

      if (call) addEdit(node, call, rule);
    } else if (node.type === "ConditionalExpression") {
      wrapLeaves(node.consequent, rule);
      wrapLeaves(node.alternate, rule);
    } else if (node.type === "LogicalExpression") {
      wrapLeaves(node.right, rule);
    } else if (node.type === "ParenthesizedExpression") {
      wrapLeaves(node.expression, rule);
    }
  };

  // Strings returned from functions: only sentences and phrases (not class names or enum values).
  const looksSentence = (value) =>
    /^[A-Z]/.test(value) && /s/.test(value) && !/(^|s)(bg|text|border|ring|from|to|via|rounded|shadow|flex|grid)-/.test(value) && !/-d/.test(value);

  const wrapSentences = (node) => {
    if (!node) return;

    if (node.type === "StringLiteral") {
      if (looksSentence(node.value)) {
        const call = literalCall(node);

        if (call) addEdit(node, call, "return-sentence");
      }
    } else if (node.type === "ConditionalExpression") {
      wrapSentences(node.consequent);
      wrapSentences(node.alternate);
    }
  };

  const wrapDynamic = (container, expression) => {
    addEdit(container, `{t(${text(expression)})}`, "dynamic-display");
  };

  // Groups JSX text and simple {expressions} into sentences.
  const processChildren = (element, context) => {
    const tokens = element.children.map((child) => {
      if (child.type === "JSXText") return { kind: "text", child, value: renderedJsxText(child.value) };

      if (child.type === "JSXExpressionContainer") {
        const expression = child.expression;

        if (expression.type === "StringLiteral") return { kind: "text", child, value: expression.value };
        if (isSimpleExpression(expression)) return { kind: "expr", child, expression };
      }

      return { kind: "other", child };
    });

    let index = 0;

    while (index < tokens.length) {
      if (tokens[index].kind === "other") {
        // {cond ? "A" : "B"} and {x || "fallback"} in the page text.
        const { child } = tokens[index];

        if (
          child.type === "JSXExpressionContainer" &&
          ["ConditionalExpression", "LogicalExpression"].includes(child.expression.type)
        ) {
          wrapLeaves(child.expression, "jsx-conditional");
        }

        index += 1;
        continue;
      }

      let end = index;

      while (end + 1 < tokens.length && tokens[end + 1].kind !== "other") end += 1;

      const run = tokens.slice(index, end + 1);
      const hasText = run.some((token) => token.kind === "text" && hasLetters(token.value));

      if (hasText) {
        const used = new Map();
        const params = [];
        let key = "";

        for (const token of run) {
          if (token.kind === "text") {
            key += token.value;
          } else {
            const code = text(token.expression);
            let name = lastName(token.expression);

            if (used.has(code)) {
              name = used.get(code);
            } else {
              let unique = name;
              let counter = 2;

              while ([...used.values()].includes(unique)) unique = `${name}${counter++}`;
              used.set(code, unique);

              const dynamic = DYNAMIC_MEMBERS.has(lastName(token.expression)) && token.expression.type !== "Identifier";
              const value = dynamic ? `t(${code})` : code;

              params.push(unique === value ? unique : `${unique}: ${value}`);
              name = unique;
            }

            key += `{${name}}`;
          }
        }

        const lead = /^ /.test(key) ? " " : "";
        const trail = / $/.test(key) && key.trim() !== "" ? " " : "";
        const trimmed = key.trim().replace(/ {2,}/g, " ");

        if (looksTranslatable(trimmed.replace(/\{\w+\}/g, ""), { allowPunctuation: true, allowSingleWord: true })) {
          const call = params.length ? `t(${JSON.stringify(trimmed)}, { ${params.join(", ")} })` : `t(${JSON.stringify(trimmed)})`;
          const first = run[0].child;
          const last = run[run.length - 1].child;

          if (!edits.some((edit) => first.start < edit.end && last.end > edit.start)) {
            edits.push({ start: first.start, end: last.end, text: `${lead}{${call}}${trail}` });
            ruleCounts["jsx-text"] = (ruleCounts["jsx-text"] ?? 0) + 1;
          }
        }
      } else {
        // No sentence here: a lone {x.status} / {label} is display text.
        for (const token of run) {
          if (token.kind !== "expr") continue;

          const { expression } = token;
          const dynamicMember = expression.type !== "Identifier" && DYNAMIC_MEMBERS.has(lastName(expression));
          const dynamicIdent =
            expression.type === "Identifier" && (DYNAMIC_IDENTS.has(expression.name) || context.mapParams.has(expression.name));

          if (dynamicMember || dynamicIdent) wrapDynamic(token.child, expression);
        }
      }

      index = end + 1;
    }
  };

  const walk = (node, context) => {
    if (!node || typeof node.type !== "string") return;

    switch (node.type) {
      case "ImportDeclaration":
      case "ExportAllDeclaration":
        return;

      case "JSXElement":
      case "JSXFragment":
        processChildren(node, context);
        break;

      case "JSXAttribute": {
        const name = node.name.type === "JSXIdentifier" ? node.name.name : null;

        if (name && ATTRS.has(name) && node.value) {
          if (node.value.type === "StringLiteral") {
            const call = literalCall(node.value);

            if (call) addEdit(node.value, `{${call}}`, "jsx-attribute");
          } else if (node.value.type === "JSXExpressionContainer") {
            wrapLeaves(node.value.expression, "jsx-attribute");
          }
        }

        break;
      }

      case "CallExpression": {
        const callee = node.callee;

        if (callee.type === "Identifier" && SINK_CALL.test(callee.name) && node.arguments[0]) {
          if (/Errors$/.test(callee.name) && node.arguments[0].type === "ObjectExpression") {
            node.arguments[0].properties.forEach((property) => {
              if (property.type === "ObjectProperty") wrapLeaves(property.value, "error-object");
            });
          } else {
            wrapLeaves(node.arguments[0], "message-call");
          }
        }

        // {x} inside .map callbacks is display text.
        if (callee.type === "MemberExpression" && callee.property.name === "map" && node.arguments[0]) {
          const callback = node.arguments[0];

          if (
            (callback.type === "ArrowFunctionExpression" || callback.type === "FunctionExpression") &&
            callback.params[0]?.type === "Identifier"
          ) {
            const inner = { ...context, mapParams: new Set([...context.mapParams, callback.params[0].name]) };

            walk(callee.object, context);
            walk(callback, inner);
            node.arguments.slice(1).forEach((argument) => walk(argument, context));

            return;
          }
        }

        break;
      }

      case "AssignmentExpression":
        if (
          node.left.type === "MemberExpression" &&
          node.left.object.type === "Identifier" &&
          ERROR_OBJECT.test(node.left.object.name)
        ) {
          wrapLeaves(node.right, "error-assignment");
        }

        break;

      case "ObjectProperty": {
        const key = node.key.type === "Identifier" ? node.key.name : node.key.type === "StringLiteral" ? node.key.value : null;

        if (!node.computed && key && PROPS.has(key)) wrapLeaves(node.value, "object-property");

        break;
      }

      case "ReturnStatement":
        if (isValidationFile) wrapLeaves(node.argument, "validation");
        else if (isUiFile) wrapSentences(node.argument, "return-sentence");

        break;

      case "AssignmentPattern":
        if (
          isUiFile &&
          node.left.type === "Identifier" &&
          DEFAULT_PROPS.has(node.left.name) &&
          node.right.type === "StringLiteral"
        ) {
          const call = literalCall(node.right);

          if (call) addEdit(node.right, call, "default-param");
        }

        break;

      case "VariableDeclarator":
        if (isValidationFile && node.id.type === "Identifier" && /HINT|MESSAGE|ERROR/.test(node.id.name)) {
          wrapLeaves(node.init, "validation");
        }

        break;

      default:
        break;
    }

    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;

      const child = node[key];

      if (Array.isArray(child)) child.forEach((item) => walk(item, context));
      else if (child && typeof child.type === "string") walk(child, context);
    }
  };

  walk(ast.program, { mapParams: new Set() });

  if (edits.length === 0) continue;

  // Apply from the end so positions stay valid.
  let output = source;

  [...edits].sort((a, b) => b.start - a.start).forEach((edit) => {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  });

  const importPath = relative(dirname(file), "src/i18n").replaceAll("\\", "/");
  const importLine = `import { t } from "${importPath.startsWith(".") ? importPath : `./${importPath}`}";\n`;
  const importMatches = [...output.matchAll(/^import[\s\S]*?;\s*$/gm)];
  const alreadyImportsT = /^import \{[^}]*\bt\b[^}]*\} from "[./]*i18n(\/index)?(\.js)?";/m.test(output);

  if (alreadyImportsT) {
    // The file already imports t from the i18n module.
  } else if (importMatches.length) {
    const last = importMatches[importMatches.length - 1];
    const position = last.index + last[0].length;

    output = `${output.slice(0, position)}\n${importLine.trimEnd()}${output.slice(position)}`;
  } else {
    output = importLine + output;
  }

  stats.files += 1;
  stats.edits += edits.length;

  if (!DRY) writeFileSync(file, output);
}

console.log(`${DRY ? "[dry run] " : ""}${stats.edits} wraps in ${stats.files} files`);
console.log(ruleCounts);
writeFileSync("tools/i18n/manual.txt", `${manual.join("\n")}\n`);
console.log(`${manual.length} items need a manual look: tools/i18n/manual.txt`);
void ROOT;
