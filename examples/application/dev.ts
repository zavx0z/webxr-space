import {resolve} from "node:path"
import {buildApplication} from "./build.ts"

const outdir = await buildApplication()
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const path = new URL(request.url).pathname
    const name = path === "/" ? "index.html" : path.slice(1)
    if (!["index.html", "main.js", "inter-regular.ttf"].includes(name)) return new Response(null, {status: 404})
    return new Response(Bun.file(resolve(outdir, name)))
  },
})
console.log(`WebXR application: ${server.url}`)
