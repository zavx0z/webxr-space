import { line, tree } from "./worker-virtual.config.js"
import { Actor } from "./everywhere-everything/actor.js"
import { threadLog } from "./everywhere-everything/web/log.js"
import { meta } from "./nodes/node.js"

// Флаг для включения/отключения отладочных логов
// Установите в true для включения логов: const DEBUG = true
const DEBUG = false

/**
 * Условное логирование - выводит лог только если DEBUG = true
 * @param {...any} args - Аргументы для console.log
 */
function debugLog(...args) {
  if (DEBUG) console.log(...args)
}

class MetaXR extends HTMLElement {
  /** @type {Worker|null} */
  worker = null
  /** @type {Actor|null} */
  builder = null

  constructor() {
    super()
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.handleResize = this.handleResize.bind(this)
  }

  async connectedCallback() {
    const mode = this.getAttribute("mode")
    console.log(mode)
    await threadLog()
    const canvas = /**@type {HTMLCanvasElement} */ (document.createElement("canvas"))
    canvas.className = "virtual"
    canvas.style.pointerEvents = "none"
    canvas.style.position = "fixed"
    canvas.style.top = "0"
    canvas.style.left = "0"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.zIndex = "1"
    this.append(canvas)
    const offscreenCanvas = canvas.transferControlToOffscreen()
    this.worker = new Worker("./worker-virtual.js", { type: "module" })
    this.worker.onerror = (error) => {
      console.error("Worker error:", error)
      console.error("Error details:", error.message, error.filename, error.lineno)
    }
    this.worker.onmessage = (event) => {
      if (event.data.type === "worker-ready") {
        debugLog("✅ Worker ready, initializing Actor")
        this.initializeActor()
      }
    }

    document.addEventListener("visibilitychange", this.handleVisibilityChange)
    window.addEventListener("resize", this.handleResize)
    this.worker.postMessage(
      {
        type: "init",
        canvas: offscreenCanvas,
        width: window.innerWidth,
        height: window.innerHeight,
        config: mode === "develop" ? tree : mode === "line" ? line : {},
      },
      [offscreenCanvas]
    )
  }

  initializeActor() {
    debugLog("🎭 Initializing Actor system")
    this.builder = Actor.fromSchema({
      meta,
      id: "root-builder",
      context: { path: "1" },
      core: {
        node: {
          tag: "meta-for",
          type: "meta",
          string: {
            src: "/meta/canvas.js",
          },
        },
      },
    })
    debugLog("✅ Actor system initialized")
  }

  /**
   * Обработчик изменения видимости таба
   */
  handleVisibilityChange() {
    const visible = !document.hidden
    debugLog(`👁️ Tab visibility changed: ${visible ? "visible" : "hidden"}`)
    this.worker?.postMessage({
      type: "visibility-change",
      visible,
    })
  }

  /**
   * Обработчик изменения размера окна
   */
  handleResize() {
    const width = window.innerWidth
    const height = window.innerHeight
    debugLog(`📏 Window resized: ${width}x${height}`)
    this.worker?.postMessage({
      type: "resize",
      width,
      height,
    })
  }

  disconnectedCallback() {
    debugLog("🔌 Disconnecting MetaXR component")
    // Отписываемся от событий
    document.removeEventListener("visibilitychange", this.handleVisibilityChange)
    window.removeEventListener("resize", this.handleResize)

    if (this.worker) {
      debugLog("💥 Terminating worker")
      this.worker.postMessage({ type: "destroy" })
      this.worker.terminate()
      this.worker = null
    }
  }
}

if (!customElements.get("everywhere-everything")) customElements.define("everywhere-everything", MetaXR)
