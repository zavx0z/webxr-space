import { line, quantum, tree } from "./worker-virtual.config.js"
import { Actor } from "@metafor/actor"
import { threadLog } from "@metafor/inspect/web/logger"
import { meta } from "./nodes/nodes.js"

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

  // Система дебаунсинга для запросов путей частиц
  /** @type {boolean} */ pathsRequestPending = false
  /** @type {ReturnType<typeof setTimeout>|null} */ pathsDebounceTimer = null
  /** @type {number} */ pathsDebounceDelay = 100 // мс

  constructor() {
    super()
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    this.handleResize = this.handleResize.bind(this)
  }

  initializeActor() {
    debugLog("🎭 Initializing Actor system")
    const src = this.getAttribute("src")
    this.builder = Actor.fromSchema({ meta, core: { child: [{ tag: "meta-for", type: "meta", string: { src } }] } })
    debugLog("✅ Actor system initialized")
  }

  async connectedCallback() {
    const log = this.hasAttribute("log")
    log && (await threadLog())

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
      } else if (event.data.type === "request-paths") {
        debugLog("📥 Worker requested paths")
        this.requestPathsDebounced()
      }
    }

    document.addEventListener("visibilitychange", this.handleVisibilityChange)
    window.addEventListener("resize", this.handleResize)

    const mode = this.getAttribute("mode")
    this.worker.postMessage(
      {
        type: "init",
        canvas: offscreenCanvas,
        width: window.innerWidth,
        height: window.innerHeight,
        config: mode === "tree" ? tree : mode === "line" ? line : mode === "quantum" ? quantum : {},
      },
      [offscreenCanvas]
    )
  }

  /**
   * Запрос путей частиц с дебаунсингом
   * Отправляет запрос в worker только после завершения всех активных запросов
   */
  requestPathsDebounced() {
    // Устанавливаем флаг, что запрос активен
    this.pathsRequestPending = true
    // Очищаем предыдущий таймер
    if (this.pathsDebounceTimer) {
      clearTimeout(this.pathsDebounceTimer)
    }
    // Устанавливаем новый таймер
    this.pathsDebounceTimer = setTimeout(() => {
      this.sendPathsToWorker()
      this.pathsRequestPending = false
      this.pathsDebounceTimer = null
    }, this.pathsDebounceDelay)
  }

  /**
   * Отправка путей частиц в worker
   */
  sendPathsToWorker() {
    if (!this.builder) return
    // Получаем пути всех активных частиц из builder
    const activePaths = Actor.all
    // Если нет активных частиц, не отправляем пустой массив
    if (!activePaths || activePaths.length === 0) {
      debugLog("📤 No active particles, skipping paths update")
      return
    }
    debugLog("📤 Sending paths to worker:", activePaths)
    // Отправляем обновленные пути в worker
    this.worker?.postMessage({ type: "update-paths", paths: activePaths })
  }

  /**
   * Обработчик изменения видимости таба
   */
  handleVisibilityChange() {
    const visible = !document.hidden
    debugLog(`👁️ Tab visibility changed: ${visible ? "visible" : "hidden"}`)
    this.worker?.postMessage({ type: "visibility-change", visible })
  }

  /**
   * Обработчик изменения размера окна
   */
  handleResize() {
    const width = window.innerWidth
    const height = window.innerHeight
    debugLog(`📏 Window resized: ${width}x${height}`)
    this.worker?.postMessage({ type: "resize", width, height })
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

if (!customElements.get("meta-for")) customElements.define("meta-for", MetaXR)
