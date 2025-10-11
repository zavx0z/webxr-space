import { logMsg } from "./everywhere-everything/web/i.js"
new BroadcastChannel("actor-force").onmessage = (event) => logMsg(event.data)
self.postMessage({ type: "worker-ready" })
