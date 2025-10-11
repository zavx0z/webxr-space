// node_modules/@zavx0z/context/dist/index.js
function createPrimitiveType(type) {
  return {
    optional(defaultOrOptions, maybeOptions) {
      const hasDefault = defaultOrOptions !== undefined && typeof defaultOrOptions !== "object";
      const options = (hasDefault ? maybeOptions : defaultOrOptions) || {};
      const base = { type };
      if (hasDefault)
        base.default = defaultOrOptions;
      if (options.label !== undefined)
        base.label = options.label;
      return base;
    },
    required(defaultValue, options = {}) {
      const base = { type, required: true, default: defaultValue };
      if (options.label !== undefined)
        base.label = options.label;
      if (options.id === true)
        base.id = true;
      return base;
    },
    type
  };
}
var createArrayType = {
  optional(defaultOrOptions, maybeOptions) {
    const isDefaultArray = Array.isArray(defaultOrOptions);
    const options = (isDefaultArray ? maybeOptions : defaultOrOptions) || {};
    const base = { type: "array" };
    if (isDefaultArray)
      base.default = defaultOrOptions;
    if (options.label !== undefined)
      base.label = options.label;
    if (typeof options.data === "string" && options.data.length > 0)
      base.data = options.data;
    return base;
  },
  required(defaultValue, options = {}) {
    const base = { type: "array", required: true, default: defaultValue };
    if (options.label !== undefined)
      base.label = options.label;
    if (typeof options.data === "string" && options.data.length > 0)
      base.data = options.data;
    return base;
  }
};
var createEnumType = (...values) => ({
  optional(defaultOrOptions, maybeOptions) {
    const hasDefault = defaultOrOptions !== undefined && typeof defaultOrOptions !== "object";
    const options = (hasDefault ? maybeOptions : defaultOrOptions) || {};
    const base = { type: "enum", values };
    if (hasDefault)
      base.default = defaultOrOptions;
    if (options.label !== undefined)
      base.label = options.label;
    return base;
  },
  required(defaultValue, options = {}) {
    const base = { type: "enum", required: true, default: defaultValue, values };
    if (options.label !== undefined)
      base.label = options.label;
    if (options.id === true)
      base.id = true;
    return base;
  }
});
var types = {
  string: createPrimitiveType("string"),
  number: createPrimitiveType("number"),
  boolean: createPrimitiveType("boolean"),
  array: createArrayType,
  enum: Object.assign((...values) => {
    const enumBase = createEnumType(...values);
    return Object.assign((defaultValue, options) => enumBase.optional(defaultValue, options), enumBase, { type: "enum" });
  }, { type: "enum" })
};
function contextSchema(schema) {
  const raw = schema(types);
  const out = {};
  for (const k in raw) {
    const def = raw[k];
    if (!def)
      continue;
    if (def.required && def.default === undefined) {
      throw new Error(`Обязательное поле ${k} должно иметь значение по умолчанию`);
    }
    const core = { type: def.type, ...def.required && { required: true } };
    if ("default" in def && def.default !== undefined)
      core.default = def.default;
    if ("label" in def && def.label !== undefined)
      core.label = def.label;
    if ("values" in def && Array.isArray(def.values) && def.values.length > 0)
      core.values = def.values;
    if ("id" in def && def.id === true)
      core.id = true;
    if ("data" in def && typeof def.data === "string" && def.data.length > 0)
      core.data = def.data;
    out[k] = core;
  }
  return out;
}
var ToDo;
((ToDo2) => {
  ToDo2["editSchema"] = "Редактирование схемы контекста";
  ToDo2["description"] = "Описание поля (для отображения в UI)";
})(ToDo ||= {});

// node_modules/@zavx0z/template/dist/index.js
function formatExpression(expr) {
  return expr.replace(/\s+/g, " ").trim();
}
function matchBalancedBraces(s, startAfterBraceIndex) {
  let depth = 1;
  for (let i = startAfterBraceIndex;i < s.length; i++) {
    const ch = s[i];
    if (ch === "{")
      depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0)
        return i + 1;
    }
  }
  return -1;
}
function matchDoubleBraces(s, startIndex) {
  let depth = 1;
  for (let i = startIndex + 2;i < s.length; i++) {
    const ch = s[i];
    if (ch === "{")
      depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0)
        return i + 1;
    }
  }
  return -1;
}
function isFullyDynamicToken(token) {
  const v = token.trim();
  if (!(v.startsWith("${") && v.endsWith("}")))
    return false;
  const end = matchBalancedBraces(v, 2);
  return end === v.length;
}
function classifyValue(token) {
  if (isFullyDynamicToken(token))
    return "dynamic";
  if (token.includes("${"))
    return "mixed";
  return "static";
}
function normalizeValueForOutput(token) {
  return formatExpression(token);
}
function isEmptyAttributeValue(value) {
  if (value === null)
    return false;
  if (value.includes("${"))
    return false;
  const normalized = normalizeValueForOutput(value);
  return normalized === "" || normalized.trim() === "";
}
function splitTopLevel(raw, sep) {
  const out = [];
  let buf = "";
  let inSingle = false;
  let inDouble = false;
  const push = () => {
    const t = buf.trim();
    if (t)
      out.push(t);
    buf = "";
  };
  for (let i = 0;i < raw.length; i++) {
    const ch = raw[i];
    if (!inSingle && !inDouble && ch === "$" && raw[i + 1] === "{") {
      const end = matchBalancedBraces(raw, i + 2);
      if (end === -1) {
        buf += ch;
        continue;
      } else {
        buf += raw.slice(i, end);
        i = end - 1;
        continue;
      }
    }
    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      buf += ch;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      buf += ch;
      continue;
    }
    if (!inSingle && !inDouble && ch === sep) {
      push();
      continue;
    }
    buf += ch;
  }
  push();
  return out;
}
function splitBySpace(raw) {
  const out = [];
  let buf = "";
  let inSingle = false;
  let inDouble = false;
  const push = () => {
    const t = buf.trim();
    if (t)
      out.push(t);
    buf = "";
  };
  for (let i = 0;i < raw.length; i++) {
    const ch = raw[i];
    if (inSingle || inDouble) {
      buf += ch;
      if (inSingle && ch === "'")
        inSingle = false;
      else if (inDouble && ch === '"')
        inDouble = false;
      continue;
    }
    if (ch === "$" && raw[i + 1] === "{") {
      const end = matchBalancedBraces(raw, i + 2);
      if (end === -1) {
        buf += raw.slice(i);
        break;
      } else {
        buf += raw.slice(i, end);
        i = end - 1;
        continue;
      }
    }
    if (ch === "'") {
      inSingle = true;
      buf += ch;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      buf += ch;
      continue;
    }
    if (ch && /\s/.test(ch)) {
      push();
      while (i + 1 < raw.length && /\s/.test(raw[i + 1] || ""))
        i++;
      continue;
    }
    buf += ch;
  }
  push();
  return out;
}
var splitByComma = (raw) => splitTopLevel(raw, ",");
var splitBySemicolon = (raw) => splitTopLevel(raw, ";");
function getBuiltinResolved(name) {
  const lower = name.toLowerCase();
  if (lower.startsWith("aria-") && lower !== "aria-hidden")
    return { fn: splitBySpace, delim: " " };
  return BUILTIN_LIST_SPLITTERS[lower] || null;
}
function handleInterpolation(inside, cursor) {
  if (inside[cursor] === "$" && inside[cursor + 1] === "{") {
    if (inside[cursor + 2] === "{") {
      const end = matchDoubleBraces(inside, cursor);
      if (end === -1) {
        return { value: inside.slice(cursor), nextIndex: inside.length };
      } else {
        return { value: inside.slice(cursor, end), nextIndex: end };
      }
    } else {
      const end = matchBalancedBraces(inside, cursor + 2);
      if (end === -1) {
        return { value: inside.slice(cursor), nextIndex: inside.length };
      } else {
        return { value: inside.slice(cursor, end), nextIndex: end };
      }
    }
  }
  return { value: "", nextIndex: cursor };
}
function readAttributeValue(inside, i) {
  let value = null;
  let hasQuotes = false;
  if (inside[i] === "=") {
    i++;
    hasQuotes = inside[i] === '"' || inside[i] === "'";
    const r = readAttributeRawValue(inside, i);
    value = r.value;
    i = r.nextIndex;
  }
  return { value, nextIndex: i, hasQuotes };
}
function readAttributeRawValue(inside, cursor) {
  const len = inside.length;
  while (cursor < len && /\s/.test(inside[cursor] ?? ""))
    cursor++;
  if (cursor >= len)
    return { value: "", nextIndex: cursor };
  const first = inside[cursor];
  if (first === '"' || first === "'") {
    const quote = first;
    cursor++;
    let v2 = "";
    while (cursor < len) {
      const c = inside[cursor];
      if (c === "$" && inside[cursor + 1] === "{") {
        const result = handleInterpolation(inside, cursor);
        v2 += result.value;
        cursor = result.nextIndex;
        continue;
      }
      if (c === quote) {
        cursor++;
        break;
      }
      v2 += c;
      cursor++;
    }
    return { value: v2, nextIndex: cursor };
  }
  let v = "";
  while (cursor < len) {
    const c = inside[cursor];
    if (c === ">" || c && /\s/.test(c))
      break;
    if (c === "$" && inside[cursor + 1] === "{") {
      const result = handleInterpolation(inside, cursor);
      v += result.value;
      cursor = result.nextIndex;
      continue;
    }
    v += c;
    cursor++;
  }
  return { value: v, nextIndex: cursor };
}
var BUILTIN_LIST_SPLITTERS = {
  class: { fn: splitBySpace, delim: " " },
  rel: { fn: splitBySpace, delim: " " },
  headers: { fn: splitBySpace, delim: " " },
  itemref: { fn: splitBySpace, delim: " " },
  ping: { fn: splitBySpace, delim: " " },
  sandbox: { fn: splitBySpace, delim: " " },
  sizes: { fn: splitBySpace, delim: " " },
  "accept-charset": { fn: splitBySpace, delim: " " },
  accept: { fn: splitByComma, delim: "," },
  allow: { fn: splitBySemicolon, delim: ";" },
  srcset: {
    fn: (raw) => splitByComma(raw).map((s) => s.trim()).filter(Boolean),
    delim: ","
  },
  coords: {
    fn: (raw) => splitTopLevel(raw, ",").map((s) => s.trim()).filter(Boolean),
    delim: ","
  }
};
var parseAttributes = (inside) => {
  const len = inside.length;
  let i = 0;
  const result = {};
  const ensure = {
    event: () => result.event ??= {},
    array: () => result.array ??= {},
    string: () => result.string ??= {},
    boolean: () => result.boolean ??= {},
    style: () => result.style ??= "",
    context: () => result.context ??= "",
    core: () => result.core ??= ""
  };
  while (i < len) {
    while (i < len && /\s/.test(inside[i] || ""))
      i++;
    if (i >= len)
      break;
    if (inside[i] === "$" && inside[i + 1] === "{") {
      const braceStart = i;
      const braceEnd = matchBalancedBraces(inside, i + 2);
      if (braceEnd === -1)
        break;
      const braceContent = inside.slice(braceStart + 2, braceEnd - 1);
      const ternaryMatch = braceContent.match(/^(.+?)\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']$/);
      if (ternaryMatch) {
        const [, condition, trueAttr, falseAttr] = ternaryMatch;
        if (condition && trueAttr && falseAttr) {
          ensure.boolean()[trueAttr] = {
            type: "dynamic",
            value: condition.trim()
          };
          ensure.boolean()[falseAttr] = {
            type: "dynamic",
            value: `!(${condition.trim()})`
          };
        }
        i = braceEnd;
        continue;
      }
      const parts = braceContent.split("&&").map((s) => s.trim());
      if (parts.length >= 2) {
        const attributeName = parts[parts.length - 1]?.replace(/['"]/g, "");
        if (attributeName) {
          const condition = parts.slice(0, -1).join(" && ");
          ensure.boolean()[attributeName] = {
            type: "dynamic",
            value: condition || ""
          };
        }
      }
      i = braceEnd;
      continue;
    }
    const nameStart = i;
    while (i < len) {
      const ch = inside[i];
      if (!ch || /\s/.test(ch) || ch === "=")
        break;
      i++;
    }
    const name = inside.slice(nameStart, i);
    if (!name)
      break;
    if (name === "/") {
      continue;
    }
    if (name.startsWith("on")) {
      while (i < len && /\s/.test(inside[i] || ""))
        i++;
      const { value: value2, nextIndex: nextIndex2 } = readAttributeValue(inside, i);
      i = nextIndex2;
      ensure.event()[name] = value2 ? formatExpression(value2.slice(2, -1)) : "";
      continue;
    }
    if (name === "style") {
      while (i < len && /\s/.test(inside[i] || ""))
        i++;
      const { value: value2, nextIndex: nextIndex2 } = readAttributeValue(inside, i);
      i = nextIndex2;
      if (value2 && value2.startsWith("${{")) {
        const styleContent = value2.slice(3, -2).trim();
        if (styleContent) {
          result.style = `{ ${formatExpression(styleContent)} }`;
        } else {
          result.style = "{}";
        }
      }
      continue;
    }
    if (name === "context" || name === "core") {
      while (i < len && /\s/.test(inside[i] || ""))
        i++;
      const { value: value2, nextIndex: nextIndex2 } = readAttributeValue(inside, i);
      i = nextIndex2;
      const objectValue = value2 ? value2.startsWith("${{") ? value2.slice(3, -2).trim() ? `{ ${formatExpression(value2.slice(3, -2))} }` : "{}" : formatExpression(value2.slice(2, -1)) : "{}";
      if (objectValue === "{}") {
        continue;
      }
      if (name === "context") {
        result.context = objectValue;
      } else {
        result.core = objectValue;
      }
      continue;
    }
    while (i < len && /\s/.test(inside[i] || ""))
      i++;
    const { value, nextIndex, hasQuotes } = readAttributeValue(inside, i);
    i = nextIndex;
    const isClass = name === "class";
    const resolved = isClass ? null : getBuiltinResolved(name);
    if (isClass || resolved) {
      if (isEmptyAttributeValue(value)) {
        continue;
      }
      const tokens = isClass ? splitBySpace(value ?? "") : resolved.fn(value ?? "");
      if (tokens.length === 1) {
        ensure.string()[name] = {
          type: classifyValue(value ?? ""),
          value: normalizeValueForOutput(value ?? "")
        };
        continue;
      }
      ensure.array()[name] = tokens.map((tok) => ({
        type: classifyValue(tok),
        value: normalizeValueForOutput(tok)
      }));
      continue;
    }
    if (!hasQuotes && !name.startsWith("on") && (value === null || value === "true" || value === "false" || value && isFullyDynamicToken(value) && !value.includes("?") && !value.includes(":") || value && isFullyDynamicToken(value) && value.includes("?") && value.includes(":") && (value.includes("true") || value.includes("false")))) {
      if (value && isFullyDynamicToken(value)) {
        ensure.boolean()[name] = {
          type: "dynamic",
          value: normalizeValueForOutput(value).replace(/^\${/, "").replace(/}$/, "")
        };
      } else {
        ensure.boolean()[name] = { type: "static", value: value === "true" || value === null };
      }
      continue;
    }
    if (!isEmptyAttributeValue(value)) {
      ensure.string()[name] = {
        type: classifyValue(value ?? ""),
        value: normalizeValueForOutput(value ?? "")
      };
    }
  }
  return result;
};
var formatAttributeText = (text) => text.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
var createNodeDataLogical = (node, context = { pathStack: [], level: 0 }) => {
  const condData = parseCondition(node.text, context);
  const isSimpleCondition = !Array.isArray(condData.path) || condData.path.length <= 1;
  const processedData = condData.path;
  const hasOperatorsOrMethods = condData.metadata?.expression && /[%+\-*/&&||===!===!=<>().]/.test(condData.metadata.expression);
  const needsExpression = !isSimpleCondition || hasOperatorsOrMethods;
  return {
    type: "log",
    data: processedData || (isSimpleCondition ? "" : []),
    ...needsExpression && condData.metadata?.expression ? { expr: condData.metadata.expression } : {},
    child: node.child ? node.child.map((child) => createNode(child, context)) : []
  };
};
var findLogicalOperators = (expr) => {
  const results = [];
  let i = 0;
  while (i < expr.length) {
    const dollarIndex = expr.indexOf("${", i);
    if (dollarIndex === -1)
      break;
    const andIndex = expr.indexOf("&&", dollarIndex + 2);
    if (andIndex === -1) {
      i = dollarIndex + 2;
      continue;
    }
    const htmlIndex = expr.indexOf("html`", andIndex + 2);
    const ternaryIndex = expr.indexOf("?", andIndex + 2);
    if (ternaryIndex !== -1 && (htmlIndex === -1 || ternaryIndex < htmlIndex)) {
      i = andIndex + 2;
      continue;
    }
    if (htmlIndex === -1) {
      i = andIndex + 2;
      continue;
    }
    const fullCondition = expr.slice(dollarIndex + 2, htmlIndex).trim();
    const condition = fullCondition.replace(/\s*&&\s*$/, "").trim();
    if (condition && /[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*/.test(condition)) {
      results.push([dollarIndex + 2, { kind: "log-open", expr: condition }]);
    }
    i = htmlIndex + 5;
  }
  return results;
};
var SAFE_STRING_METHODS = new Set([
  "toUpperCase",
  "toLowerCase",
  "toLocaleUpperCase",
  "toLocaleLowerCase",
  "trim",
  "trimStart",
  "trimEnd",
  "slice",
  "substring",
  "includes",
  "startsWith",
  "endsWith",
  "indexOf",
  "lastIndexOf",
  "charAt",
  "charCodeAt",
  "codePointAt",
  "repeat",
  "padStart",
  "padEnd",
  "replace",
  "replaceAll",
  "normalize",
  "split"
]);
var isSafeStringMethod = (name) => !!name && SAFE_STRING_METHODS.has(name);
var logUnsupported = (method, expr) => {
  console.error(`[template] Unsupported string method "${method}" in expression: ${expr}`);
};
var parseText = (text, context = { pathStack: [], level: 0 }) => {
  if (!text.includes("${")) {
    return { type: "text", value: text };
  }
  const hasConditionalOperators = /\?.*:/.test(text);
  const hasLogicalOperators = /(&&|\|\|)/.test(text);
  const hasMathematicalOperators = /[+\-*/%]/.test(text);
  const hasMethodCalls = /\.\w+\s*\(/.test(text);
  if ((hasConditionalOperators || hasLogicalOperators || hasMathematicalOperators) && !hasMethodCalls) {
    const templateResult = parseTemplateLiteral(text, context);
    if (templateResult?.data) {
      return { type: "text", data: templateResult.data, ...templateResult.expr && { expr: templateResult.expr } };
    }
  }
  const parts = splitText(text);
  const dynamicParts = parts.filter((part) => part.type === "dynamic").map((part) => {
    const varMatch = part.text.match(/\$\{([^}]+)\}/);
    const variable = varMatch?.[1] || "";
    if (variable.startsWith('"') || variable.startsWith("'") || variable.includes('"') || variable.includes("'")) {
      return null;
    }
    const { base, methodName, callSuffix } = extractBaseAndCall(variable);
    const path = resolveDataPath(base, context);
    return { path, text: part.text, methodName, callSuffix };
  }).filter((p) => p !== null);
  const firstDynamicPart = dynamicParts[0];
  const mainPath = firstDynamicPart ? firstDynamicPart.path : "";
  if (dynamicParts.length === 0 && parts.some((p) => p.type === "dynamic")) {
    const staticText = parts.filter((p) => p.type === "dynamic").map((p) => {
      const v = p.text.match(/\$\{([^}]+)\}/)?.[1] || "";
      if (v.startsWith('"') && v.endsWith('"'))
        return v.slice(1, -1);
      if (v.startsWith("'") && v.endsWith("'"))
        return v.slice(1, -1);
      return "";
    }).join("");
    if (staticText)
      return { type: "text", value: staticText };
  }
  if (parts.length === 1 && parts[0].type === "dynamic") {
    const variable = parts[0].text.match(/\$\{([^}]+)\}/)?.[1] || "";
    let methodName = dynamicParts[0].methodName;
    let call = dynamicParts[0].callSuffix ?? "()";
    if (methodName && !isSafeStringMethod(methodName)) {
      logUnsupported(methodName, parts[0].text);
      methodName = undefined;
      call = "";
    }
    if (methodName) {
      return {
        type: "text",
        data: dynamicParts[0].path,
        expr: createUnifiedExpression(`\${${ARGUMENTS_PREFIX}[0].${methodName}${call}}`, [])
      };
    }
    if (variable.includes("(")) {
      const baseVariable = extractBaseVariable(variable);
      const pathDots = resolveDataPath(baseVariable, context).replace(/^\//, "").replace(/\//g, ".");
      const expr = variable.replace(new RegExp(`\\b${pathDots.replace(/\./g, "\\.")}\\b`, "g"), `\${${ARGUMENTS_PREFIX}[0]}`);
      return { type: "text", data: dynamicParts[0].path, expr: createUnifiedExpression(expr, []) };
    }
    return { type: "text", data: mainPath };
  }
  if (dynamicParts.length > 1) {
    const exprRaw = parts.map((p) => {
      if (p.type === "static")
        return p.text;
      const index = dynamicParts.findIndex((dp) => dp.text === p.text);
      let m = dynamicParts[index]?.methodName;
      let call = dynamicParts[index]?.callSuffix ?? "()";
      if (m && !isSafeStringMethod(m)) {
        logUnsupported(m, dynamicParts[index].text);
        m = undefined;
        call = "";
      }
      return m ? `\${${ARGUMENTS_PREFIX}[${index}].${m}${call}}` : `\${${ARGUMENTS_PREFIX}[${index}]}`;
    }).join("");
    const isSimpleExpr = exprRaw === `\${${ARGUMENTS_PREFIX}[0]}` || exprRaw === `\${${ARGUMENTS_PREFIX}[0]}\${${ARGUMENTS_PREFIX}[1]}` || exprRaw === `\${${ARGUMENTS_PREFIX}[0]}-\${${ARGUMENTS_PREFIX}[1]}`;
    const hasAnyMethods = dynamicParts.some((dp) => !!dp.methodName && isSafeStringMethod(dp.methodName));
    if (isSimpleExpr && !hasAnyMethods) {
      return { type: "text", data: dynamicParts.map((p) => p.path) };
    }
    return { type: "text", data: dynamicParts.map((p) => p.path), expr: createUnifiedExpression(exprRaw, []) };
  }
  const hasStaticText = parts.some((p) => p.type === "static" && p.text.trim() !== "");
  if (hasStaticText) {
    let methodName = dynamicParts[0]?.methodName;
    let call = dynamicParts[0]?.callSuffix ?? "()";
    if (methodName && !isSafeStringMethod(methodName)) {
      logUnsupported(methodName, dynamicParts[0].text);
      methodName = undefined;
      call = "";
    }
    const exprRaw = parts.map((p) => {
      if (p.type === "static")
        return p.text;
      return methodName ? `\${${ARGUMENTS_PREFIX}[0].${methodName}${call}}` : `\${${ARGUMENTS_PREFIX}[0]}`;
    }).join("");
    return { type: "text", data: mainPath, expr: createUnifiedExpression(exprRaw, []) };
  }
  return { type: "text", data: mainPath };
};
var splitText = (text) => {
  const parts = [];
  let currentIndex = 0;
  const varMatches = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "$" && text[i + 1] === "{") {
      let braceCount = 1;
      let j = i + 2;
      while (j < text.length && braceCount > 0) {
        if (text[j] === "$" && text[j + 1] === "{") {
          braceCount++;
          j += 2;
        } else if (text[j] === "}") {
          braceCount--;
          j++;
        } else {
          j++;
        }
      }
      if (braceCount === 0) {
        const varMatch = text.slice(i, j);
        varMatches.push(varMatch);
        i = j;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  for (const varMatch of varMatches) {
    const varIndex = text.indexOf(varMatch, currentIndex);
    if (varIndex > currentIndex)
      parts.push({ type: "static", text: text.slice(currentIndex, varIndex) });
    parts.push({ type: "dynamic", text: varMatch });
    currentIndex = varIndex + varMatch.length;
  }
  if (currentIndex < text.length)
    parts.push({ type: "static", text: text.slice(currentIndex) });
  return parts;
};
var findText = (chunk) => {
  let start = 0;
  if (!chunk || /^\s+$/.test(chunk))
    return;
  const trimmed = chunk.trim();
  if (isPureGlue(trimmed))
    return;
  const visible = cutBeforeNextHtml(chunk);
  if (!visible || /^\s+$/.test(visible))
    return;
  let processed = "";
  let i = 0;
  let usedEndLocal = 0;
  while (i < visible.length) {
    const ch = visible[i];
    if (ch === "$" && visible[i + 1] === "{") {
      const exprStart = i;
      i += 2;
      let b = 1;
      while (i < visible.length && b > 0) {
        if (visible[i] === "{")
          b++;
        else if (visible[i] === "}")
          b--;
        i++;
      }
      if (b === 0) {
        processed += visible.slice(exprStart, i);
        usedEndLocal = i;
        continue;
      } else {
        break;
      }
    }
    processed += ch;
    i++;
    usedEndLocal = i;
  }
  const collapsed = processed.replace(/\s+/g, " ");
  if (collapsed === " ")
    return;
  const final = /^\s*\n[\s\S]*\n\s*$/.test(chunk) ? collapsed.trim() : collapsed;
  if (final.length > 0)
    return { text: final, start, end: start + usedEndLocal - 1, name: "", kind: "text" };
};
var extractBaseVariable = (variable) => {
  const stringLiterals = [];
  let protectedVariable = variable.replace(/`[^`]*`/g, (m) => {
    stringLiterals.push(m);
    return `__STRING_${stringLiterals.length - 1}__`;
  }).replace(/"[^"]*"/g, (m) => {
    stringLiterals.push(m);
    return `__STRING_${stringLiterals.length - 1}__`;
  }).replace(/'[^']*'/g, (m) => {
    stringLiterals.push(m);
    return `__STRING_${stringLiterals.length - 1}__`;
  });
  if (protectedVariable.includes("(")) {
    const beforeMethod = protectedVariable.split(/\.\w+\(/).shift()?.trim();
    if (beforeMethod && VALID_VARIABLE_PATTERN.test(beforeMethod))
      return beforeMethod;
  }
  const variableMatches = protectedVariable.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g) || [];
  const variablesWithDots = variableMatches.filter((v) => v.includes(".") && !v.startsWith("__STRING_"));
  if (variablesWithDots.length > 0)
    return variablesWithDots[0];
  return variable;
};
var extractBaseAndCall = (variable) => {
  const shielded = variable.replace(/`[^`]*`/g, "__S__").replace(/"[^"]*"/g, "__S__").replace(/'[^']*'/g, "__S__");
  const m = shielded.match(/\.([A-Za-z_$][\w$]*)\s*\(([^()]*)\)\s*$/);
  if (m) {
    const methodName = m[1];
    const args = m[2] ?? "";
    const callSuffix = `(${args})`;
    const base = extractBaseVariable(variable.replace(m[0], ""));
    return { base, methodName, callSuffix };
  }
  return { base: extractBaseVariable(variable) };
};
var isPureGlue = (trimmed) => !!trimmed && (trimmed === "`" || trimmed.startsWith("`") || /^`}\)?\s*;?\s*$/.test(trimmed) || /^`\)\}\s*,?\s*$/.test(trimmed));
var MAP_PATTERN = /(\w+(?:\.\w+)*)\.map\(([^)]*)\)/;
var parseMap = (mapText, context = { pathStack: [], level: 0 }) => {
  const mapMatch = mapText.match(MAP_PATTERN);
  if (!mapMatch) {
    return { path: "" };
  }
  const dataPath = mapMatch[1] || "";
  const paramsText = mapMatch[2] || "";
  const { params, isDestructured } = extractMapParams(paramsText.replace(/^\(|\)$/g, ""));
  let targetPath;
  if (dataPath.includes(".") && context.mapParams && context.mapParams.length > 0) {
    const parts = dataPath.split(".");
    const relativePath = parts[parts.length - 1] || "";
    targetPath = `[item]/${relativePath}`;
  } else if (!dataPath.includes(".") && (context.currentPath?.includes("[item]") || context.mapParams && context.mapParams.length > 0)) {
    targetPath = `[item]/${dataPath}`;
  } else {
    targetPath = `/${dataPath.replace(/\./g, "/")}`;
  }
  const createNewParseContext = (path, params2, isDestructured2, context2) => {
    const newParseMapContext = {
      path,
      params: params2,
      isDestructured: isDestructured2,
      level: context2.level + 1
    };
    return {
      ...context2,
      currentPath: path,
      pathStack: [...context2.pathStack, path],
      mapParams: params2,
      level: context2.level + 1,
      mapContextStack: [...context2.mapContextStack || [], newParseMapContext]
    };
  };
  const newContext = createNewParseContext(targetPath, params, isDestructured, context);
  return {
    path: targetPath,
    context: newContext,
    metadata: { params }
  };
};
var createNodeDataMap = (node, context = { pathStack: [], level: 0 }) => {
  const mapData = parseMap(node.text, context);
  return {
    type: "map",
    data: Array.isArray(mapData.path) ? mapData.path[0] || "" : mapData.path,
    child: node.child ? node.child.map((child) => createNode(child, mapData.context || context)) : []
  };
};
var findMapOpen = (expr) => {
  const mapOpenRegex = /\$\{([a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*\.map\([^)]*\))/g;
  let match;
  while ((match = mapOpenRegex.exec(expr)) !== null) {
    return [match.index, { kind: "map-open", sig: match[1] }];
  }
};
var findMapClose = (expr) => {
  const mapCloseRegex = /`?\)\}/g;
  let closeMatch;
  while ((closeMatch = mapCloseRegex.exec(expr)) !== null) {
    return [closeMatch.index, { kind: "map-close" }];
  }
};
var extractMapParams = (paramsText) => {
  const cleanParams = paramsText.replace(/\s+/g, "").trim();
  if (!cleanParams)
    return { params: [], isDestructured: false };
  const destructureMatch = cleanParams.match(/\{([^}]+)\}/);
  const isDestructured = !!destructureMatch;
  const params = destructureMatch?.[1] ? destructureMatch[1].split(",").map((p) => p.trim()) : cleanParams.split(",").map((p) => p.trim());
  return { params, isDestructured };
};
var processArrayAttributes = (arrayAttrs, context) => {
  const result = {};
  for (const [key, values] of Object.entries(arrayAttrs)) {
    result[key] = values.map((item) => {
      if (item.type === "static")
        return item.value;
      else if (item.type === "dynamic" || item.type === "mixed") {
        const processed = processTemplateLiteralAttribute(item.value, context);
        if (processed)
          return processed;
        else {
          const variableMatches = item.value.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)/g) || [];
          if (variableMatches.length > 0) {
            const paths = variableMatches.map((variable) => resolveDataPath(variable, context));
            let expr = item.value;
            variableMatches.forEach((variable, index) => {
              expr = expr.replace(new RegExp(`\\b${variable.replace(/\./g, "\\.")}\\b`, "g"), `${ARGUMENTS_PREFIX}[${index}]`);
            });
            return { data: paths.length === 1 ? paths[0] || "" : paths, expr: `\${${expr}}` };
          } else {
            return item.value;
          }
        }
      } else
        return item.value;
    });
  }
  return result;
};
var processEventAttributes = (eventAttrs, context) => {
  const result = {};
  for (const [key, value] of Object.entries(eventAttrs)) {
    const eventResult = parseEventExpression(value, context);
    const processed = processSingleEventAttribute(value, eventResult);
    if (processed) {
      result[key] = processed;
    }
  }
  if (Object.keys(result).length === 0) {
    return {};
  }
  return result;
};
var parseEventExpression = (eventValue, context = { pathStack: [], level: 0 }) => {
  const hasConditionalOperators = CONDITIONAL_OPERATORS_PATTERN.test(eventValue) && !eventValue.includes("=>");
  if (hasConditionalOperators) {
    return null;
  }
  const hasTemplateLiteral = eventValue.includes("${");
  if (hasTemplateLiteral) {
    return null;
  }
  if (eventValue.includes("update(")) {
    const objectMatch = eventValue.match(UPDATE_OBJECT_PATTERN);
    if (objectMatch) {
      const objectContent = objectMatch[1] || "";
      const keyMatches = objectContent.match(OBJECT_KEY_PATTERN) || [];
      const keys = keyMatches.map((match) => match.replace(/\s*:$/, "").trim());
      if (keys.length > 0) {
        const variableMatches2 = objectContent.match(VARIABLE_WITH_DOTS_PATTERN) || [];
        const uniqueVariables2 = [...new Set(variableMatches2)].filter((variable) => {
          return variable.length > 1 && !variable.startsWith('"') && !variable.startsWith("'") && !variable.includes('"') && !variable.includes("'") && variable !== "true" && variable !== "false";
        });
        let result = {
          upd: keys.length === 1 ? keys[0] || "" : keys
        };
        if (uniqueVariables2.length > 0) {
          const paths2 = uniqueVariables2.map((variable) => resolveDataPath(variable, context)).filter((path) => path && path.length > 0);
          if (paths2.length > 0) {
            result.data = paths2.length === 1 ? paths2[0] : paths2;
          }
        }
        let expr2 = eventValue;
        if (uniqueVariables2.length > 0) {
          uniqueVariables2.forEach((variable, index) => {
            expr2 = expr2.replace(new RegExp(`\\b${variable.replace(/\./g, "\\.")}\\b`, "g"), `${ARGUMENTS_PREFIX}[${index}]`);
          });
        }
        result.expr = expr2.replace(TEMPLATE_WRAPPER_PATTERN, "").replace(WHITESPACE_PATTERN, " ").trim();
        return result;
      }
    }
  }
  const variableMatches = eventValue.match(VARIABLE_WITH_DOTS_PATTERN) || [];
  if (variableMatches.length === 0) {
    return null;
  }
  const hasArrowFunction = eventValue.includes("=>");
  const uniqueVariables = [...new Set(variableMatches)].filter((variable) => {
    return variable.length > 1 && !variable.startsWith('"') && !variable.startsWith("'") && !variable.includes('"') && !variable.includes("'");
  });
  if (uniqueVariables.length === 0) {
    return null;
  }
  const paths = uniqueVariables.map((variable) => resolveDataPath(variable, context));
  let expr = eventValue;
  uniqueVariables.forEach((variable, index) => {
    expr = expr.replace(new RegExp(`\\b${variable.replace(/\./g, "\\.")}\\b`, "g"), `${ARGUMENTS_PREFIX}[${index}]`);
  });
  if (!expr.includes("${")) {
    expr = expr.replace(/^\$\{/, "").replace(/\}$/, "");
  }
  expr = expr.replace(WHITESPACE_PATTERN, " ").trim();
  if (!hasArrowFunction && uniqueVariables.length === 1 && expr === `${ARGUMENTS_PREFIX}[0]`) {
    return { data: paths[0] || "" };
  }
  return { data: paths.length === 1 ? paths[0] || "" : paths, expr };
};
var processSingleEventAttribute = (value, eventResult) => {
  if (eventResult) {
    if (eventResult.upd) {
      const eventObj = {
        expr: eventResult.expr || "",
        upd: eventResult.upd
      };
      if (eventResult.data) {
        eventObj.data = eventResult.data;
      }
      return eventObj;
    } else if (eventResult.data) {
      if (eventResult.expr && typeof eventResult.expr === "string") {
        return {
          data: eventResult.data,
          expr: eventResult.expr
        };
      } else {
        return {
          data: Array.isArray(eventResult.data) ? eventResult.data[0] || "" : eventResult.data
        };
      }
    }
  }
  if (value && value.trim() !== "") {
    return {
      data: value
    };
  }
  return null;
};
var processBooleanAttributeWithVariables = (booleanValue, context) => {
  const variableMatches = booleanValue.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)/g) || [];
  if (variableMatches.length === 0) {
    return null;
  }
  const paths = variableMatches.map((variable) => resolveDataPath(variable, context));
  let expr = booleanValue;
  variableMatches.forEach((variable, index) => {
    expr = expr.replace(new RegExp(`\\b${variable.replace(/\./g, "\\.")}\\b`, "g"), `${ARGUMENTS_PREFIX}[${index}]`);
  });
  if (paths.length === 1) {
    const hasNegation = booleanValue.includes("!(") || booleanValue.includes("!");
    const hasComplexOperations = /[%+\-*/===!===!=<>().]/.test(booleanValue);
    const isSimpleVariable = /^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/.test(booleanValue.trim());
    if ((hasNegation || hasComplexOperations) && !isSimpleVariable) {
      let finalExpr = expr;
      if (hasNegation && expr.includes("!(") && expr.includes(")")) {
        finalExpr = expr.replace(/^!\(/, "!").replace(/\)$/, "");
      }
      return {
        data: paths[0] || "",
        expr: finalExpr
      };
    } else {
      return {
        data: paths[0] || ""
      };
    }
  } else {
    return {
      data: paths,
      expr
    };
  }
};
var processBooleanAttributes = (booleanAttrs, context) => {
  const result = {};
  for (const [key, attr] of Object.entries(booleanAttrs)) {
    if (attr.type === "static") {
      result[key] = Boolean(attr.value);
    } else if (attr.type === "dynamic" || attr.type === "mixed") {
      const booleanValue = String(attr.value);
      const processed = processBooleanAttributeWithVariables(booleanValue, context);
      if (processed) {
        result[key] = processed;
      } else {
        result[key] = false;
      }
    }
  }
  return result;
};
var processStringAttributes = (stringAttrs, context) => {
  const result = {};
  for (const [key, attr] of Object.entries(stringAttrs)) {
    if (attr.type === "static") {
      result[key] = attr.value;
    } else if (attr.type === "dynamic" || attr.type === "mixed") {
      const processed = processTemplateLiteralAttribute(attr.value, context);
      result[key] = processed || attr.value;
    }
  }
  return result;
};
var processStyleAttributes = (str, ctx = { pathStack: [], level: 0 }) => {
  const cleanValue = str.replace(/^\{?\s*|\s*\}?$/g, "");
  if (!cleanValue) {
    return null;
  }
  const styleObj = {};
  const pairs = cleanValue.split(",");
  for (const pair of pairs) {
    const [key, value] = pair.split(":").map((s) => s.trim());
    if (key && value) {
      const cleanValue2 = value.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
      const hasVariables = /[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*/.test(cleanValue2);
      if (hasVariables) {
        const variableMatches = value.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g) || [];
        const uniqueVariables = [...new Set(variableMatches)];
        if (uniqueVariables.length > 0) {
          const paths = uniqueVariables.map((variable) => resolveDataPath(variable, ctx) || variable);
          styleObj[key] = { data: paths.length === 1 ? paths[0] || "" : paths };
        } else {
          styleObj[key] = value;
        }
      } else {
        styleObj[key] = value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
      }
    }
  }
  return Object.keys(styleObj).length > 0 ? styleObj : null;
};
var createNodeDataElement = (node, context = { pathStack: [], level: 0 }) => ({
  tag: node.tag,
  type: "el",
  ...node.child && { child: node.child.map((child) => createNode(child, context)) },
  ...processBasicAttributes(node, context)
});
var VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var TAG_LOOKAHEAD = /(?=<\/?[A-Za-z][A-Za-z0-9:-]*[^>]*>|<\/?meta-[^>]*>|<\/?meta-\$\{[^}]*\}[^>]*>)/gi;
var isValidTagName = (name) => /^[A-Za-z][A-Za-z0-9:-]*$/.test(name) && !name.includes("*") || name.startsWith("meta-");
var shouldIgnoreAt = (input, i) => input[i + 1] === "!" || input[i + 1] === "?";
var extractHtmlElements = (input) => {
  const store = new Field;
  let lastIndex = 0;
  TAG_LOOKAHEAD.lastIndex = 0;
  let m;
  while ((m = TAG_LOOKAHEAD.exec(input)) !== null) {
    const localIndex = m.index;
    if (shouldIgnoreAt(input, localIndex)) {
      TAG_LOOKAHEAD.lastIndex = localIndex + 1;
      continue;
    }
    if (input.trim())
      parseTextAndOperators(input.slice(lastIndex, localIndex), store);
    const tagStart = localIndex;
    let tagEnd = -1;
    let i = localIndex + 1;
    while (i < input.length) {
      const ch = input[i];
      if (ch === ">") {
        tagEnd = i + 1;
        break;
      }
      if (ch === `"` || ch === `'`) {
        const quote = ch;
        i++;
        while (i < input.length && input[i] !== quote) {
          if (input[i] === "\\") {
            i += 2;
            continue;
          }
          if (input[i] === "$" && input[i + 1] === "{") {
            i += 2;
            let b = 1;
            while (i < input.length && b > 0) {
              if (input[i] === "{")
                b++;
              else if (input[i] === "}")
                b--;
              i++;
            }
            continue;
          }
          i++;
        }
        if (i < input.length)
          i++;
        continue;
      }
      if (ch === "$" && input[i + 1] === "{") {
        i += 2;
        let b = 1;
        while (i < input.length && b > 0) {
          if (input[i] === "{")
            b++;
          else if (input[i] === "}")
            b--;
          i++;
        }
        continue;
      }
      i++;
    }
    if (tagEnd === -1) {
      TAG_LOOKAHEAD.lastIndex = localIndex + 1;
      continue;
    }
    const full = input.slice(tagStart, tagEnd);
    let name = "";
    let valid = false;
    let type = "el";
    const tagNameMatch = full.match(/^<\/?([A-Za-z][A-Za-z0-9:-]*)(?:\s|>|\/)/i);
    if (tagNameMatch) {
      name = (tagNameMatch[1] || "").toLowerCase();
      valid = isValidTagName(tagNameMatch[1] || "");
      if (name.startsWith("meta-")) {
        type = "meta";
      }
    }
    if (!valid) {
      const metaMatch = full.match(/^<\/?(meta-\$\{[^}]+\})/i);
      if (metaMatch) {
        name = metaMatch[1] || "";
        valid = true;
        type = "meta";
      }
    }
    if (!valid) {
      TAG_LOOKAHEAD.lastIndex = localIndex + 1;
      continue;
    }
    if (full.startsWith("</")) {
      store.close(name);
    } else if (full.endsWith("/>")) {
      const text = formatAttributeText(full.replace(`<${name}`, "").replace(/\/>$/, ""));
      store.self({ tag: name, type, ...text ? parseAttributes(text) : {} });
    } else if (VOID_TAGS.has(name) && !name.startsWith("meta-")) {
      const text = formatAttributeText(full.replace(`<${name}`, "").replace(/\/>$/, ""));
      store.self({ tag: name, type, ...text ? parseAttributes(text) : {} });
    } else {
      const text = formatAttributeText(full.replace(`<${name}`, "").replace(/>$/, ""));
      store.open({ tag: name, type, ...text ? parseAttributes(text) : {} });
    }
    TAG_LOOKAHEAD.lastIndex = tagEnd;
    lastIndex = tagEnd;
  }
  if (store.child.length)
    return store.child;
  if (input.trim())
    parseTextAndOperators(input.slice(lastIndex), store);
  return store.child;
};
var parseTextAndOperators = (input, store) => {
  const map = new Map;
  const text = findText(input);
  text && map.set(text.start, { text: text.text, kind: "text" });
  const isNotInText = (index) => text ? index < text.start || index > text.end : true;
  const conds = findAllConditions(input);
  for (const cond of conds)
    isNotInText(cond[0]) && map.set(...cond);
  const tokenCondElse = findCondElse(input);
  tokenCondElse && isNotInText(tokenCondElse[0]) && map.set(...tokenCondElse);
  const tokenCondClose = findCondClose(input);
  tokenCondClose && isNotInText(tokenCondClose[0]) && map.set(...tokenCondClose);
  const logicals = findLogicalOperators(input);
  for (const logical of logicals)
    isNotInText(logical[0]) && map.set(...logical);
  const tokenMapOpen = findMapOpen(input);
  tokenMapOpen && isNotInText(tokenMapOpen[0]) && map.set(...tokenMapOpen);
  const tokenMapClose = findMapClose(input);
  tokenMapClose && isNotInText(tokenMapClose[0]) && map.set(...tokenMapClose);
  const tokens = Array.from(map.entries()).sort(([a], [b]) => a - b).map(([, token]) => token);
  for (const token of tokens) {
    switch (token.kind) {
      case "text":
        store.text(token.text);
        break;
      case "cond-open":
        store.if(token.expr);
        break;
      case "cond-else":
        store.else();
        break;
      case "cond-close":
        break;
      case "log-open":
        store.logical(token.expr);
        break;
      case "map-open":
        store.map(token.sig);
        break;
      case "map-close":
        store.close("map");
        break;
    }
  }
};
var cutBeforeNextHtml = (s) => {
  const idx = s.indexOf("html`");
  return idx >= 0 ? s.slice(0, idx) : s;
};

class Cursor {
  child = [];
  constructor(child) {
    this.child = child;
  }
  path = [];
  parts = [];
  get element() {
    let el = this;
    for (const path of this.path) {
      const { child } = el;
      el = child[path];
    }
    return el;
  }
  get part() {
    return this.parts[this.parts.length - 1];
  }
  back() {
    this.path.pop();
    return this.parts.pop();
  }
  push(name) {
    this.parts.push(name);
    this.path.push(this.element.child.length - 1);
  }
}

class Field {
  child = [];
  cursor;
  constructor() {
    this.child = [];
    this.cursor = new Cursor(this.child);
  }
  text(value) {
    const curEl = this.cursor.element;
    !Object.hasOwn(curEl, "child") && (curEl.child = []);
    curEl.child.push({ type: "text", text: value });
    return;
  }
  if(value) {
    const curEl = this.cursor.element;
    !Object.hasOwn(curEl, "child") && (curEl.child = []);
    curEl.child.push({ type: "cond", text: value, child: [] });
    this.cursor.push("if");
    return;
  }
  else() {
    const curEl = this.cursor.element;
    !Object.hasOwn(curEl, "child") && (curEl.child = []);
    if (this.cursor.part === "if") {
      this.cursor.parts.pop();
      this.cursor.parts.push("else");
    }
    return;
  }
  logical(value) {
    const curEl = this.cursor.element;
    !Object.hasOwn(curEl, "child") && (curEl.child = []);
    curEl.child.push({ type: "log", text: value, child: [] });
    this.cursor.push("log");
    return;
  }
  map(value) {
    const curEl = this.cursor.element;
    !Object.hasOwn(curEl, "child") && (curEl.child = []);
    curEl.child.push({ type: "map", text: value, child: [] });
    this.cursor.push("map");
    return;
  }
  self(part) {
    const curEl = this.cursor.element;
    !Object.hasOwn(curEl, "child") && (curEl.child = []);
    curEl.child.push(part);
    if (this.cursor.part === "log") {
      this.cursor.back();
    }
    return;
  }
  open(part) {
    const curEl = this.cursor.element;
    !Object.hasOwn(curEl, "child") && (curEl.child = []);
    curEl.child.push(part);
    this.cursor.push(part.tag);
    if (this.cursor.part === "log") {
      this.cursor.back();
    }
    return;
  }
  #recursiveCloseMultipleElse() {
    if (this.cursor.part === "else") {
      this.cursor.back();
      this.#recursiveCloseMultipleElse();
    }
  }
  close(tagName) {
    if (this.cursor.part === "else") {
      this.#recursiveCloseMultipleElse();
      const deleted = this.cursor.back();
      if (deleted !== tagName) {
        throw new Error(`Expected ${tagName} but got ${deleted}`);
      }
      return;
    } else if (this.cursor.part === "log") {
      this.cursor.back();
      const deleted = this.cursor.back();
      if (deleted !== tagName) {
        throw new Error(`Expected ${tagName} but got ${deleted}`);
      }
      return;
    } else {
      const deleted = this.cursor.back();
      if (deleted !== tagName) {
        throw new Error(`Expected ${tagName} but got ${deleted}`);
      }
      if (this.cursor.part === "else") {
        this.cursor.back();
      }
      if (this.cursor.part === "log") {
        this.cursor.back();
      }
      return;
    }
  }
}
var VARIABLE_WITH_DOTS_PATTERN = /([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)/g;
var VALID_VARIABLE_PATTERN = /^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/;
var UPDATE_OBJECT_PATTERN = /update\(\s*\{([^}]+)\}\s*\)/;
var OBJECT_KEY_PATTERN = /([a-zA-Z_$][\w$]*)\s*:/g;
var CONDITIONAL_OPERATORS_PATTERN = /\?.*:/;
var WHITESPACE_PATTERN = /\s+/g;
var TEMPLATE_WRAPPER_PATTERN = /^\$\{|\}$/g;
var ARGUMENTS_PREFIX = "_";
var findVariableInMapStack = (variable, context) => {
  if (!context.mapContextStack?.length)
    return null;
  const variableParts = variable.split(".");
  const variableName = variableParts[0] || "";
  for (let i = context.mapContextStack.length - 1;i >= 0; i--) {
    const mapContext = context.mapContextStack[i];
    if (!mapContext?.params.includes(variableName))
      continue;
    const levelsUp = context.mapContextStack.length - 1 - i;
    const prefix = "../".repeat(levelsUp);
    const paramIndex = mapContext.params.indexOf(variableName);
    if (mapContext.isDestructured) {
      const hasProperty = variableParts.length > 1;
      return hasProperty ? `${prefix}[item]/${variableParts.join("/")}` : `${prefix}[item]/${variableParts[0]}`;
    }
    return paramIndex === 0 ? buildItemPath(prefix, variableParts, false) : `${prefix}[index]`;
  }
  return null;
};
var buildItemPath = (prefix, variableParts, isDestructured) => {
  const hasProperty = variableParts.length > 1;
  if (isDestructured) {
    return hasProperty ? `${prefix}[item]/${variableParts.slice(1).join("/")}` : `${prefix}[item]/${variableParts[0]}`;
  }
  return hasProperty ? `${prefix}[item]/${variableParts.slice(1).join("/")}` : `${prefix}[item]`;
};
var processSemanticAttributes = (str, ctx = { pathStack: [], level: 0 }) => {
  const variableMatches = str.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)+)/g) || [];
  if (variableMatches.length === 0) {
    return null;
  }
  const uniqueVariables = [...new Set(variableMatches)];
  const paths = uniqueVariables.map((variable) => resolveDataPath(variable, ctx) || variable);
  let expr = str;
  const { protectedExpr, stringLiterals } = protectStringLiterals(expr);
  uniqueVariables.forEach((variable, index) => {
    const variableRegex = new RegExp(`(?<!\\w)${variable.replace(/\./g, "\\.")}(?!\\w)`, "g");
    expr = expr.replace(variableRegex, `${ARGUMENTS_PREFIX}[${index}]`);
  });
  expr = restoreStringLiterals(expr, stringLiterals);
  expr = expr.replace(WHITESPACE_PATTERN, " ").trim();
  return {
    data: paths.length === 1 ? paths[0] || "" : paths,
    expr
  };
};
var resolveDataPath = (variable, context) => {
  const mapStackPath = findVariableInMapStack(variable, context);
  if (mapStackPath !== null) {
    return mapStackPath;
  }
  if (context.mapParams && context.mapParams.length > 0) {
    const variableParts = variable.split(".");
    const mapParamVariable = variableParts[0] || "";
    if (context.mapParams.includes(mapParamVariable)) {
      const paramIndex = context.mapParams.indexOf(mapParamVariable);
      if (paramIndex === 0) {
        if (variableParts.length > 1) {
          const propertyPath = variableParts.slice(1).join("/");
          return `[item]/${propertyPath}`;
        } else {
          return "[item]";
        }
      } else {
        return "[index]";
      }
    } else if (variableParts[0] && context.mapParams.includes(variableParts[0])) {
      const paramIndex = context.mapParams.indexOf(variableParts[0]);
      if (paramIndex === 0) {
        if (variableParts.length > 1) {
          const propertyPath = variableParts.slice(1).join("/");
          return `[item]/${propertyPath}`;
        } else {
          return "[item]";
        }
      } else {
        return "[index]";
      }
    } else if (context.mapParams.includes(variable)) {
      const paramIndex = context.mapParams.indexOf(variable);
      if (paramIndex === 0) {
        return `[item]/${variable}`;
      } else {
        return "[index]";
      }
    } else {
      if (variable.startsWith("core.")) {
        return `/${variable.replace(/\./g, "/")}`;
      }
      if (context.currentPath && context.currentPath.includes("[item]")) {
        if (context.pathStack && context.pathStack.length > 1) {
          const mapLevels = context.pathStack.filter((path) => path.includes("[item]")).length;
          const levelsUp = mapLevels - 1;
          const prefix = "../".repeat(levelsUp);
          const propertyPath = variableParts.length > 1 ? variableParts.slice(1).join("/") : variable;
          return `${prefix}[item]/${propertyPath}`;
        } else {
          return `[item]/${variable.replace(/\./g, "/")}`;
        }
      } else {
        return `[item]/${variable.replace(/\./g, "/")}`;
      }
    }
  } else if (context.currentPath && !context.currentPath.includes("[item]")) {
    return `${context.currentPath}/${variable.replace(/\./g, "/")}`;
  } else {
    return `/${variable.replace(/\./g, "/")}`;
  }
};
var createUnifiedExpression = (value, variables) => {
  let expr = value;
  const { stringLiterals } = protectStringLiterals(expr);
  variables.forEach((variable, index) => {
    const exactRegex = new RegExp(`\\$\\{${variable.replace(/\./g, "\\.")}\\}`, "g");
    expr = expr.replace(exactRegex, `\${${ARGUMENTS_PREFIX}[${index}]}`);
    const insideRegex = new RegExp(`\\$\\{([^}]*?)\\b${variable.replace(/\./g, "\\.")}\\b([^}]*?)\\}`, "g");
    expr = expr.replace(insideRegex, (match, before, after) => {
      if (before.trim() === "" && after.trim() === "") {
        return match;
      }
      return `\${${before}${ARGUMENTS_PREFIX}[${index}]${after}}`;
    });
  });
  expr = expr.replace(WHITESPACE_PATTERN, " ").trim();
  expr = restoreStringLiterals(expr, stringLiterals);
  return expr;
};
var processTemplateLiteralAttribute = (value, context) => {
  const templateResult = parseTemplateLiteral(value, context);
  if (templateResult) {
    if (templateResult.expr === `\${${ARGUMENTS_PREFIX}[0]}` && !Array.isArray(templateResult.data))
      return { data: templateResult.data };
    return { data: templateResult.data, expr: templateResult.expr };
  }
  return null;
};
var processBasicAttributes = (node, context) => {
  const result = {};
  if (node.string) {
    result.string = processStringAttributes(node.string, context);
  }
  if (node.event) {
    const eventAttrs = processEventAttributes(node.event, context);
    if (Object.keys(eventAttrs).length > 0) {
      result.event = eventAttrs;
    }
  }
  if (node.array) {
    result.array = processArrayAttributes(node.array, context);
  }
  if (node.boolean) {
    result.boolean = processBooleanAttributes(node.boolean, context);
  }
  if (node.style) {
    const styleResult = processStyleAttributes(node.style, context);
    if (styleResult) {
      result.style = styleResult;
    }
  }
  return result;
};
var parseCondition = (condText, context = { pathStack: [], level: 0 }) => {
  const cleanCondText = cleanConditionText(condText);
  const stringLiterals = [];
  let protectedText = cleanCondText.replace(/"[^"]*"/g, (match) => {
    stringLiterals.push(match);
    return `__STRING_${stringLiterals.length - 1}__`;
  }).replace(/'[^']*'/g, (match) => {
    stringLiterals.push(match);
    return `__STRING_${stringLiterals.length - 1}__`;
  });
  const allMatches = protectedText.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g) || [];
  const pathMatches = allMatches.filter((match) => !match.startsWith("__STRING_"));
  if (pathMatches.length === 0)
    return { path: "" };
  const expression = extractConditionExpression(cleanCondText, pathMatches);
  const paths = pathMatches.length === 1 ? resolveDataPath(pathMatches[0] || "", context) : pathMatches.map((variable) => resolveDataPath(variable, context));
  return { path: paths, metadata: { expression } };
};
var cleanConditionText = (condText) => {
  let cleanText = condText.replace(/html`[^`]*`/g, "");
  if (cleanText.includes("Index")) {
    const indexMatches = cleanText.match(/([a-zA-Z_$][\w$]*\s*[=!<>]+\s*[0-9]+)/g) || [];
    return indexMatches.length > 0 ? indexMatches.join(" && ") : cleanText;
  }
  return cleanText.includes("?") ? cleanText.split("?")[0]?.trim() || cleanText : cleanText;
};
var extractConditionExpression = (condText, pathMatches) => {
  if (condText.includes("Index")) {
    const indexMatches = condText.match(/([a-zA-Z_$][\w$]*\s*[=!<>]+\s*[0-9]+)/g) || [];
    if (indexMatches.length > 0) {
      let logicalExpression = indexMatches.join(" && ");
      const pathMatches2 = logicalExpression.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g) || [];
      pathMatches2.forEach((path, index) => {
        logicalExpression = logicalExpression.replace(new RegExp(`\\b${path.replace(/\./g, "\\.")}\\b`, "g"), `${ARGUMENTS_PREFIX}[${index}]`);
      });
      return logicalExpression.replace(/\s+/g, " ").trim();
    }
  }
  const variables = pathMatches || condText.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g) || [];
  const hasComplexOperations = /[%+\-*/===!===!=<>().]/.test(condText);
  const hasLogicalOperators = /[&&||]/.test(condText);
  if (variables.length === 1 && !hasComplexOperations && !hasLogicalOperators) {
    return `${ARGUMENTS_PREFIX}[0]`;
  }
  if (variables.length === 1 && hasComplexOperations && !hasLogicalOperators) {
    let expression2 = condText;
    expression2 = expression2.replace(new RegExp(`\\b${variables[0].replace(/\./g, "\\.")}\\b`, "g"), `${ARGUMENTS_PREFIX}[0]`);
    return expression2;
  }
  const sortedVariables = [...variables].sort((a, b) => b.length - a.length);
  let expression = condText;
  sortedVariables.forEach((path) => {
    const index = variables.indexOf(path);
    expression = expression.replace(new RegExp(`\\b${path.replace(/\./g, "\\.")}\\b`, "g"), `${ARGUMENTS_PREFIX}[${index}]`);
  });
  return expression.replace(/\s+/g, " ").trim();
};
var parseTemplateLiteral = (value, context = { pathStack: [], level: 0 }) => {
  if (!value.includes("${"))
    return null;
  const variables = [];
  const extractVariables = (str) => {
    const allVariableMatches = str.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g) || [];
    allVariableMatches.forEach((variable) => {
      if (variable.length > 1 && variable.includes(".") && variable !== "true" && variable !== "false" && variable !== "null" && variable !== "undefined" && !variables.includes(variable)) {
        const variableIndex = str.indexOf(variable);
        const afterVariable = str.slice(variableIndex + variable.length);
        const isMethodCall = afterVariable.match(/^\s*\(/);
        if (!isMethodCall) {
          variables.push(variable);
        }
      }
    });
    const stringLiterals2 = [];
    let protectedStr = str.replace(/"[^"]*"/g, (match) => {
      stringLiterals2.push(match);
      return `__STRING_${stringLiterals2.length - 1}__`;
    }).replace(/'[^']*'/g, (match) => {
      stringLiterals2.push(match);
      return `__STRING_${stringLiterals2.length - 1}__`;
    }).replace(/`[^`]*`/g, (match) => {
      stringLiterals2.push(match);
      return `__STRING_${stringLiterals2.length - 1}__`;
    });
    const extractFromTemplate = (content) => {
      const variableMatches = content.match(/([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/g) || [];
      variableMatches.forEach((variable) => {
        if (variable.length > 1 && !variable.startsWith("__STRING_") && !variable.startsWith("STRING") && variable !== "true" && variable !== "false" && variable !== "null" && variable !== "undefined" && !variables.includes(variable)) {
          variables.push(variable);
        }
      });
      const nestedMatches = content.match(/\$\{([^}]+)\}/g) || [];
      nestedMatches.forEach((nestedMatch) => {
        const nestedContent = nestedMatch.slice(2, -1);
        extractFromTemplate(nestedContent);
      });
    };
    if (protectedStr.includes("${")) {
      const templateMatches = protectedStr.match(/\$\{([^}]+)\}/g) || [];
      templateMatches.forEach((match) => {
        const content = match.slice(2, -1);
        extractFromTemplate(content);
      });
    }
  };
  extractVariables(value);
  if (variables.length === 0) {
    return null;
  }
  const paths = variables.map((variable) => resolveDataPath(variable, context));
  let expr = value;
  const { stringLiterals } = protectStringLiterals(expr);
  variables.forEach((variable, index) => {
    const variableRegex = new RegExp(`\\b${variable.replace(/\./g, "\\.")}\\b`, "g");
    expr = expr.replace(variableRegex, `${ARGUMENTS_PREFIX}[${index}]`);
  });
  expr = restoreStringLiterals(expr, stringLiterals);
  expr = expr.replace(WHITESPACE_PATTERN, " ").trim();
  return {
    data: paths.length === 1 ? paths[0] || "" : paths,
    expr
  };
};
var protectStringLiterals = (expr) => {
  const stringLiterals = [];
  const protectedExpr = expr.replace(/"[^"]*"/g, (match) => {
    stringLiterals.push(match);
    return `__STRING_${stringLiterals.length - 1}__`;
  }).replace(/'[^']*'/g, (match) => {
    stringLiterals.push(match);
    return `__STRING_${stringLiterals.length - 1}__`;
  });
  return { protectedExpr, stringLiterals };
};
var restoreStringLiterals = (expr, stringLiterals) => {
  let result = expr;
  stringLiterals.forEach((literal, index) => {
    result = result.replace(`__STRING_${index}__`, literal);
  });
  return result;
};
var createNodeDataCondition = (node, context = { pathStack: [], level: 0 }) => {
  const condData = parseCondition(node.text, context);
  const isSimpleCondition = !Array.isArray(condData.path) || condData.path.length === 1;
  const processedData = condData.path;
  const hasOperatorsOrMethods = condData.metadata?.expression && /[%+\-*/&&||===!===!=<>().]/.test(condData.metadata.expression);
  const needsExpression = !isSimpleCondition || hasOperatorsOrMethods;
  return {
    type: "cond",
    data: isSimpleCondition ? Array.isArray(processedData) ? processedData[0] || "" : processedData || "" : processedData || [],
    ...needsExpression && condData.metadata?.expression ? { expr: condData.metadata.expression } : {},
    child: [createNode(node.child[0], context), createNode(node.child[1], context)]
  };
};
var findCondElse = (expr) => {
  const condElseRegex = /:\s*/g;
  let match;
  while ((match = condElseRegex.exec(expr)) !== null) {
    return [match.index, { kind: "cond-else" }];
  }
};
var findAllConditions = (expr) => {
  const results = [];
  let i = 0;
  while (i < expr.length) {
    const d = expr.indexOf("${", i);
    const a = expr.indexOf("=>", i);
    if (d === -1 && a === -1)
      break;
    const useDollar = d !== -1 && (a === -1 || d < a);
    const start = useDollar ? d : a;
    let j = start + 2;
    while (j < expr.length && /\s/.test(expr[j]))
      j++;
    const q = expr.indexOf("?", j);
    if (q === -1) {
      i = j + 1;
      continue;
    }
    const between = expr.slice(j, q);
    if (!useDollar) {
      const bt = between.indexOf("`");
      if (bt !== -1) {
        i = j + bt + 1;
        continue;
      }
    }
    if (useDollar) {
      const m = between.indexOf(".map(");
      if (m !== -1) {
        i = j + m + 1;
        continue;
      }
      const bt = between.indexOf("`");
      if (bt !== -1) {
        i = j + bt + 1;
        continue;
      }
    }
    results.push([j, { kind: "cond-open", expr: between.trim() }]);
    i = q + 1;
  }
  i = 0;
  while (i < expr.length) {
    const questionMark = expr.indexOf("?", i);
    const colon = expr.indexOf(":", i);
    if (questionMark === -1 && colon === -1)
      break;
    const useQuestion = questionMark !== -1 && (colon === -1 || questionMark < colon);
    const pos = useQuestion ? questionMark : colon;
    const nextQuestion = expr.indexOf("?", pos + 1);
    const nextColon = expr.indexOf(":", pos + 1);
    if (nextQuestion === -1 && nextColon === -1)
      break;
    const useNextQuestion = nextQuestion !== -1 && (nextColon === -1 || nextQuestion < nextColon);
    const nextPos = useNextQuestion ? nextQuestion : nextColon;
    const condition = expr.slice(pos + 1, nextPos).trim();
    if (condition && !condition.includes("html`")) {
      results.push([pos + 1, { kind: "cond-open", expr: condition }]);
    }
    i = pos + 1;
  }
  return results;
};
var findCondClose = (expr) => {
  const condCloseRegex = /[^\)]}(?!\s*\)\s*=>)/g;
  let match;
  while ((match = condCloseRegex.exec(expr)) !== null) {
    return [match.index, { kind: "cond-close" }];
  }
};
var createNodeDataMeta = (node, context = { pathStack: [], level: 0 }) => {
  const processed = processTemplateLiteralAttribute(node.tag, context);
  let result = {
    tag: processed || node.tag,
    type: "meta",
    ...processBasicAttributes(node, context),
    ...node.child && { child: node.child.map((child) => createNode(child, context)) }
  };
  if ("core" in node && node.core) {
    result.core = processSemanticAttributes(node.core, context) || node.core;
  }
  if ("context" in node && node.context) {
    result.context = processSemanticAttributes(node.context, context) || node.context;
  }
  return result;
};
var createNode = (node, context) => {
  switch (node.type) {
    case "map":
      return createNodeDataMap(node, context);
    case "cond":
      return createNodeDataCondition(node, context);
    case "log":
      return createNodeDataLogical(node, context);
    case "text":
      return parseText(node.text, context);
    case "el":
      return createNodeDataElement(node, context);
    case "meta":
      return createNodeDataMeta(node, context);
    default:
      return node;
  }
};
var parse = (template) => {
  const mainHtml = extractMainHtmlBlock(template);
  const hierarchy = extractHtmlElements(mainHtml);
  const context = { pathStack: [], level: 0 };
  return hierarchy.map((node) => createNode(node, context));
};
var extractMainHtmlBlock = (template) => {
  const src = Function.prototype.toString.call(template);
  const firstIndex = src.indexOf("html`");
  if (firstIndex === -1)
    throw new Error("функция template не содержит html`");
  const lastBacktick = src.lastIndexOf("`");
  if (lastBacktick === -1 || lastBacktick <= firstIndex)
    throw new Error("template function does not contain html`");
  const htmlContent = src.slice(firstIndex + 5, lastBacktick);
  return htmlContent.replace(/!0/g, "true").replace(/!1/g, "false");
};

// schema/states.ts
function validateNoUnconditionalCycles(states) {
  const graph = {};
  for (const [from, transitions] of Object.entries(states)) {
    graph[from] = [];
    for (const [to, cond] of Object.entries(transitions || {})) {
      if (cond == null || typeof cond === "object" && Object.keys(cond).length === 0) {
        graph[from].push(to);
      }
    }
  }
  function hasCycle(node, visited2, stack) {
    if (!visited2.has(node)) {
      visited2.add(node);
      stack.add(node);
      for (const neighbor of graph[node] || []) {
        if (!visited2.has(neighbor) && hasCycle(neighbor, visited2, stack)) {
          return true;
        } else if (stack.has(neighbor)) {
          return true;
        }
      }
    }
    stack.delete(node);
    return false;
  }
  const visited = new Set;
  for (const node of Object.keys(graph)) {
    if (hasCycle(node, visited, new Set)) {
      throw new Error(`В конфигурации состояний обнаружен цикл безусловных переходов (например, "${node}"). Добавьте условия для выхода из цикла.`);
    }
  }
}

// schema/reactions.ts
var reactionsSchema = (builder) => {
  const reactions = {};
  const states = {};
  let reactionAutoId = 0;
  const chainResult = builder((config) => ({
    filter: (filterFn) => ({
      equal: (update) => {
        const { read, write } = extractFields(update);
        const label = config?.label || "";
        const desc = config?.desc;
        const id = `${label}_${reactionAutoId++}`;
        reactions[id] = {
          label,
          ...desc && { desc },
          cond: filterFn.toString(),
          read,
          write,
          src: update.toString()
        };
        return {
          label,
          update,
          filter: () => true,
          ...desc && { desc },
          registerStates: (list) => {
            for (const state of list) {
              const key = state;
              if (!states[key])
                states[key] = [];
              states[key].push(id);
            }
          }
        };
      }
    })
  }));
  for (const [list, reaction] of chainResult)
    reaction.registerStates(list);
  if (Object.keys(reactions).length === 0)
    return null;
  return { reactions, states };
};
function extractFields(update) {
  const updateStr = update.toString();
  const read = [];
  const write = [];
  const contextMatches = updateStr.match(/context\.(\w+)/g);
  if (contextMatches) {
    for (const match of contextMatches) {
      const field = match.replace("context.", "");
      if (!read.includes(field)) {
        read.push(field);
      }
    }
  }
  const updateMatches = updateStr.match(/update\(\s*\{\s*(\w+):/g);
  if (updateMatches) {
    for (const match of updateMatches) {
      const fieldMatch = match.match(/update\(\s*\{\s*(\w+):/);
      if (fieldMatch && fieldMatch[1]) {
        const field = fieldMatch[1];
        if (!write.includes(field)) {
          write.push(field);
        }
      }
    }
  }
  for (const writeField of write) {
    if (!read.includes(writeField)) {
      read.push(writeField);
    }
  }
  return { read, write };
}

// schema/process.ts
var pattern = {
  dot: /context\.(\w+)/g,
  destructParams: /context:\s*{([^}]+)}/g,
  destructBody: /(?:const|let|var)\s*{([^}]+)}\s*=\s*context(?:\s*,\s*{([^}]+)}\s*=\s*context)*/g,
  update: /update\(\s*{([^}]+)}\s*\)/g
};
function parseFunction(fn, allowWrite = true) {
  const code = fn.toString();
  const read = new Set;
  const write = new Set;
  let match;
  while ((match = pattern.dot.exec(code)) !== null) {
    if (match && typeof match[1] === "string" && match[1].length > 0) {
      read.add(match[1]);
    }
  }
  while ((match = pattern.destructParams.exec(code)) !== null) {
    const s = typeof match[1] === "string" ? match[1] : "";
    if (s.length > 0) {
      s.split(",").map((p) => p?.trim()).filter(Boolean).forEach((p) => read.add(p));
    }
  }
  for (const match2 of code.matchAll(pattern.destructBody)) {
    if (match2 && Array.isArray(match2)) {
      const m1 = typeof match2[1] === "string" ? match2[1] : undefined;
      const m2 = typeof match2[2] === "string" ? match2[2] : undefined;
      const propsArr = [m1, m2].filter((v) => typeof v === "string" && v.length > 0);
      const props = propsArr.length > 0 ? propsArr.join(",") : "";
      if (props.length > 0) {
        props.split(",").map((p) => p?.trim()?.split(":")[0]?.trim() ?? "").filter(Boolean).forEach((p) => read.add(p));
      }
    }
  }
  while ((match = pattern.update.exec(code)) !== null) {
    const s = typeof match[1] === "string" ? match[1] : "";
    if (s.length > 0) {
      s.split(",").map((p) => p?.split(":")[0]?.trim() ?? "").filter(Boolean).forEach((p) => write.add(p));
    }
  }
  return { read: Array.from(read), write: allowWrite ? Array.from(write) : [] };
}
function parseProcess(process) {
  const result = {};
  if (process.label)
    result.label = process.label;
  if (process.desc)
    result.desc = process.desc;
  const parsed = parseFunction(process.action, false);
  result.action = {
    src: process.action.toString(),
    ...parsed.read.length > 0 ? { read: parsed.read } : {}
  };
  if (process.success) {
    const parsed2 = parseFunction(process.success, true);
    result.success = {
      src: process.success.toString(),
      ...parsed2.read.length > 0 ? { read: parsed2.read } : {},
      ...parsed2.write.length > 0 ? { write: parsed2.write } : {}
    };
  }
  if (process.error) {
    const parsed2 = parseFunction(process.error);
    result.error = {
      src: process.error.toString(),
      ...parsed2.read.length > 0 ? { read: parsed2.read } : {},
      ...parsed2.write.length > 0 ? { write: parsed2.write } : {}
    };
  }
  return result;
}
var processesSchema = (processes) => {
  const chains = processes((config) => {
    const chain = {
      label: config?.label,
      desc: config?.desc,
      _successHandler: undefined,
      _errorHandler: undefined,
      action: (fn) => {
        chain.action = fn;
        return chain;
      },
      success: (handler) => {
        chain._successHandler = handler;
        return chain;
      },
      error: (handler) => {
        chain._errorHandler = handler;
        return chain;
      },
      getResult: () => {
        const result2 = {
          action: chain.action
        };
        if (chain._successHandler)
          result2.success = chain._successHandler;
        if (chain._errorHandler)
          result2.error = chain._errorHandler;
        if (chain.label)
          result2.label = chain.label;
        if (chain.desc)
          result2.desc = chain.desc;
        return result2;
      }
    };
    return chain;
  });
  const result = {};
  for (const key in chains) {
    if (chains[key]) {
      result[key] = parseProcess(chains[key].getResult());
    }
  }
  if (Object.keys(result).length === 0)
    return null;
  return result;
};

// schema/style.ts
function serializeStyle(fn) {
  const fnString = fn.toString();
  const match = fnString.match(/css`([\s\S]*)`/);
  if (!match) {
    console.warn("Не удалось найти CSS template literal в функции");
    return "";
  }
  const rawCss = match[1];
  const withoutComments = rawCss.replace(/\/\*[\s\S]*?\*\//g, "");
  const collapsedWhitespace = withoutComments.replace(/\s+/g, " ");
  const tightPunct = collapsedWhitespace.replace(/\s*([:;,{()} ,])\s*/g, (m, p1) => p1 === " " ? " " : p1).replace(/\s*\/\s*/g, "/");
  return tightPunct.trim();
}

// metafor.ts
globalThis.MetaFor = function(name, config) {
  const desc = config?.desc;
  const dev = config?.dev ?? globalThis.DEV ?? false;
  return {
    context(schema) {
      const context = contextSchema(schema);
      return {
        states(states) {
          validateNoUnconditionalCycles(states);
          return {
            core(core) {
              return {
                processes(process = () => ({})) {
                  const processes = processesSchema(process);
                  return {
                    reactions(reaction = () => []) {
                      const reactions = reactionsSchema(reaction);
                      return {
                        view(view) {
                          const schema2 = { name, states, context, core: core || {} };
                          if (desc)
                            schema2.desc = desc;
                          if (view && "style" in view)
                            schema2.style = serializeStyle(view.style);
                          if (view && "render" in view)
                            schema2.render = parse(view.render);
                          if (processes)
                            schema2.processes = processes;
                          if (reactions)
                            schema2.reactions = reactions;
                          return schema2;
                        }
                      };
                    }
                  };
                }
              };
            }
          };
        }
      };
    }
  };
};
