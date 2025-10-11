import { log } from "./everywhere-everything/web/i.js"
new BroadcastChannel("actor-force").onmessage = (event) => {
  const { data } = event
  if (Object.hasOwn(data, "meta")) {
    const { meta, actor, path } = data
    for (const patch of data.patches) {
      log({ meta, patch, timestamp: data.timestamp, actor, path })
    }
  } else {
    console.log(data)
  }
}
self.postMessage({ type: "worker-ready" })
