import index from "./index.html"

Bun.serve({
  hostname: "0.0.0.0",
  routes: {
    "/": index,
    "/index.html": index,
  },
  async fetch(req) {
    const url = new URL(req.url)
    const pathname = decodeURIComponent(url.pathname)

    const file = Bun.file("." + pathname)
    if (await file.exists()) {
      return new Response(file)
    }

    return new Response("Not Found", { status: 404 })
  },
  development: {
    hmr: true,
    console: true,
  },
})

console.log("Bun server started on http://localhost:3000")
