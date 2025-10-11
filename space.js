import { Actor } from "./everywhere-everything/actor.js"
import { meta } from "./nodes/node.js"

class MetaXR extends HTMLElement {
  constructor() {
    super()
    this.worker = null
  }

  connectedCallback() {
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
    this.worker.onerror = (error) => console.error("Worker error:", error)
    this.worker.onmessage = (event) => {
      if (event.data.type === "worker-ready") this.initializeActor()
    }
    this.worker.postMessage(
      {
        type: "init",
        canvas: offscreenCanvas,
        width: window.innerWidth,
        height: window.innerHeight,
      },
      [offscreenCanvas]
    )
  }

  initializeActor() {
    this.builder = Actor.fromSchema({
      meta,
      id: "root-builder",
      context: { path: "1" },
      core: {
        fields: Actor.fields,
        node: {
          tag: "meta-for",
          type: "meta",
          string: {
            src: "/meta/canvas.js",
          },
        },
      },
    })
  }

  disconnectedCallback() {
    if (this.worker) {
      this.worker.postMessage({ type: "destroy" })
      this.worker.terminate()
      this.worker = null
    }
  }
}

if (!customElements.get("everywhere-everything")) customElements.define("everywhere-everything", MetaXR)
