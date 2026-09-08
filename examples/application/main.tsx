import {createRoot} from "@zavx0z/browser"
import {App} from "./app.tsx"

const canvas = document.querySelector("canvas")
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Application canvas is missing")

const application = createRoot(canvas)
application.render(<App />)
window.addEventListener("pagehide", () => application.unmount(), {once: true})
