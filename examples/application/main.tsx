import {attach} from "@zavx0z/browser"
import {App} from "./app.tsx"

const canvas = document.querySelector("canvas")
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Application canvas is missing")

const application = await attach({canvas, app: <App />})
document.documentElement.dataset.application = "ready"
window.addEventListener("pagehide", () => application.unmount(), {once: true})
