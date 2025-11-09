import { Atom } from "@metafor/atom"
import { threadLog } from "@metafor/inspect/web/logger"
import { meta } from "./nodes/nodes.js"
import { load } from "@metafor/virtual"
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
const destroyVirtual = await load({ src: "./node_modules/@metafor/virtual/dist/worker.js", debug: true })

class MetaXR extends HTMLElement {
  /** @type {Atom|null} */
  builder = null

  constructor() {
    super()
  }

  initializeAtom() {
    debugLog("🎭 Initializing Atom system")
    const src = this.getAttribute("src")
    this.builder = Atom.fromSchema({ meta, core: { child: [{ tag: "meta-for", type: "meta", string: { src } }] } })
    debugLog("✅ Atom system initialized")
  }

  async connectedCallback() {
    const log = this.hasAttribute("log")
    log && (await threadLog())
    this.initializeAtom()
  }
  disconnectedCallback() {
    destroyVirtual()
  }
}

if (!customElements.get("meta-for")) customElements.define("meta-for", MetaXR)
