// web/console.js
var config = {
  active: true,
  collapseAll: true,
  // meta: ["core-builder", "node-log"],
  meta: [],
  index: null,
  patch: ["add", "remove", "replace", "move", "copy", "test"],
  path: ["/", "/context", "/state"],
  width: {
    meta: 22,
    op: 8,
    path: 15
  },
  detail: {
    core: false
  }
};
var isLog = (message, path) => Boolean(config.active && message.patch.path === path && config.path.includes(path) && (!config.meta.length || config.meta.includes(message.meta)) && (config.index === null || message.actor.index === config.index));
function log(message, core) {
  const { meta, actor, patch } = message;
  const metaStr = String(meta).padEnd(config.width.meta, " ");
  const index = String(actor).padEnd(4, " ");
  const op = centerText(String(patch.op), config.width.op);
  const path = String(patch.path).padEnd(config.width.path, " ");
  const value = formattedObj(patch.value);
  const isError = Object.hasOwn(patch.value, "error");
  switch (true) {
    case isLog(message, "/"):
      ;
      (() => {
        const msg = [
          `%c${metaStr}${index}%c | %c${op}%c | %c${path}`,
          "color: #3498db; font-weight: bold",
          "",
          "color: #e74c3c",
          "",
          "color: #2ecc71"
        ];
        config.collapseAll ? console.groupCollapsed(...msg) : console.group(...msg);
        if (typeof patch.value === "object" && patch.value !== null) {
          console.log(value);
          config.detail.core && logCore(core);
        } else
          console.log(patch.value);
        console.groupEnd();
      })();
      break;
    case isLog(message, "/context"):
      ;
      (() => {
        const msg = [
          `%c${metaStr}${index}%c | %c${op}%c | %c${path}`,
          `color: #3498db; font-weight: bold; ${isError ? "background: #7d4545" : ""}`,
          "",
          "color: #e74c3c",
          "",
          "color: #2ecc71"
        ];
        if (isError)
          console.group(...msg);
        else if (config.collapseAll)
          console.groupCollapsed(...msg);
        else
          console.group(...msg);
        try {
          if (typeof patch.value === "object" && patch.value !== null) {
            console.log(value);
            config.detail.core && logCore(core);
          } else
            console.log(patch.value);
        } finally {
          console.groupEnd();
        }
      })();
      break;
    case isLog(message, "/state"):
      ;
      (() => {
        const stateValue = Array.isArray(patch.value) ? JSON.stringify(patch.value, null, 2) : typeof patch.value === "object" && patch.value !== null ? JSON.stringify(patch.value, null, 2) : patch.value;
        const msg = [
          `%c${metaStr}${index}%c | %c${op}%c | %c${path}%c %c${stateValue}`,
          "color: #3498db; font-weight: bold",
          "",
          "color: #e74c3c",
          "",
          "color: #2ecc71",
          "",
          "color: lightskyblue; font-weight: bold"
        ];
        config.collapseAll ? console.groupCollapsed(...msg) : console.group(...msg);
        try {
          config.detail.core && logCore(core);
        } finally {
          console.groupEnd();
        }
      })();
      break;
  }
}
var centerText = (text, width) => {
  const padLeft = Math.floor((width - text.length) / 2);
  return text.padStart(padLeft + text.length, " ").padEnd(width, " ");
};
var formattedObj = (value) => JSON.stringify(value, null, 2).split(`
`).map((line, i, lines) => {
  if (i === 0 || i === lines.length - 1) {
    return line;
  }
  return `${line}`;
}).join(`
`);
var logCore = (core) => {
  console.log("snapshot debug: ", { ...core });
  console.log("current  debug: ", core);
};
export {
  log
};
