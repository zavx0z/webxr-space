// web/log.ts
function createLoggerModule(userConfig = {}) {
  const defaultConfig = {
    active: true,
    collapseAll: true,
    meta: [],
    index: null,
    patch: ["add", "remove", "replace", "move", "copy", "test"],
    path: ["/", "/context", "/state"],
    width: {
      meta: 22,
      op: 10,
      path: 15
    },
    detail: {
      core: false
    }
  };
  const config = {
    ...defaultConfig,
    ...userConfig,
    width: {
      ...defaultConfig.width,
      ...userConfig.width
    },
    detail: {
      ...defaultConfig.detail,
      ...userConfig.detail
    }
  };
  const getOpColor = (op, path) => {
    if (path === "/state") {
      switch (op) {
        case "test":
          return "#1c8447";
        case "replace":
          return "#27ae60";
      }
    }
    switch (op) {
      case "add":
        return "#ecf0f1";
      case "remove":
        return "#e74c3c";
      case "replace":
        return "#3c3c3c";
      case "move":
        return "#9b59b6";
      case "copy":
        return "#3498db";
      case "test":
        return "#95a5a6";
      default:
        return "#34495e";
    }
  };
  const formattedObj = (value) => JSON.stringify(value, null, 2).split(`
`).map((line, i, lines) => {
    if (i === 0 || i === lines.length - 1) {
      return line;
    }
    return `${line}`;
  }).join(`
`);
  const logCore = (core) => {
    console.log("snapshot debug: ", { ...core });
    console.log("current  debug: ", core);
  };
  const isLog = (message, path) => Boolean(config.active && message.patch.path === path && config.path.includes(path) && (!config.meta.length || config.meta.includes(message.meta)) && (config.index === null || message.actor === String(config.index)));
  const log = (message, core = {}) => {
    const { meta, actor, path: actorPath, patch } = message;
    const metaStr = String(meta).padEnd(config.width.meta, " ");
    const actorStr = String(actor).padEnd(40, " ");
    const pathStr = String(actorPath).padEnd(8, " ");
    const op = String(patch.op).padEnd(config.width.op, " ");
    const path = String(patch.path).padEnd(config.width.path, " ");
    const value = patch.value ? formattedObj(patch.value) : "";
    const isError = patch.value ? Object.hasOwn(patch.value, "error") : "";
    switch (true) {
      case isLog(message, "/"):
        ;
        (() => {
          const msg = [
            `%c${metaStr}%c${actorStr}%c${pathStr}%c  |  %c${op}%c  |  %c${path}`,
            "color: #3498db; font-weight: bold",
            "color: #9b59b6; font-weight: bold",
            "color: #f39c12; font-weight: bold",
            "",
            `color: ${getOpColor(patch.op, patch.path)}; font-weight: bold`,
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
            `%c${metaStr}%c${actorStr}%c${pathStr}%c  |  %c${op}%c  |  %c${path}`,
            `color: #3498db; font-weight: bold; ${isError ? "background: #7d4545" : ""}`,
            "color: #9b59b6; font-weight: bold",
            "color: #f39c12; font-weight: bold",
            "",
            `color: ${getOpColor(patch.op, patch.path)}; font-weight: bold`,
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
            `%c${metaStr}%c${actorStr}%c${pathStr}%c  |  %c${op}%c  |  %c${path}%c  %c${stateValue}`,
            "color: #3498db; font-weight: bold",
            "color: #9b59b6; font-weight: bold",
            "color: #f39c12; font-weight: bold",
            "",
            `color: ${getOpColor(patch.op, patch.path)}; font-weight: bold`,
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
  };
  const logMsg = (data, core = {}) => {
    if (Object.hasOwn(data, "meta")) {
      const { meta, actor, path, patches, timestamp } = data;
      for (const patch of patches) {
        log({ meta, patch, timestamp, actor, path }, core);
      }
    } else {
      console.log(data);
    }
  };
  return { log, logMsg };
}
var loggerModule = createLoggerModule();
var log = loggerModule.log;
var logMsg = loggerModule.logMsg;
async function threadLog(config = {}) {
  return new Promise((resolve, reject) => {
    const moduleCode = createLoggerModule.toString();
    const workerCode = `
      //# sourceURL=log
      // Встраиваем весь модуль логирования с конфигурацией
      const loggerModule = (${moduleCode})(${JSON.stringify(config)})
      const { log, logMsg } = loggerModule
      
      // Создаем BroadcastChannel для получения сообщений от акторов
      new BroadcastChannel("actor-force").onmessage = (event) => {
        logMsg(event.data);
      };
      
      // Уведомляем основной поток о готовности
      self.postMessage({ type: "worker-ready" });
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl, { type: "module" });
    worker.onmessage = (event) => {
      if (event.data.type === "worker-ready") {
        URL.revokeObjectURL(workerUrl);
        resolve(worker);
      }
    };
    worker.onerror = (error) => {
      URL.revokeObjectURL(workerUrl);
      reject(error);
    };
    setTimeout(() => {
      URL.revokeObjectURL(workerUrl);
      reject(new Error("Worker initialization timeout"));
    }, 5000);
  });
}
export {
  threadLog,
  logMsg,
  log
};
