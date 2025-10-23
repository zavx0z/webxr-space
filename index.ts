import { readFileSync } from "fs"
import { networkInterfaces } from "os"
import path from "path"

// Получаем IP адреса локальной сети
function getLocalIPs(): string[] {
  const interfaces = networkInterfaces()
  const ips: string[] = []

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue

    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        ips.push(alias.address)
      }
    }
  }

  return ips
}

const localIPs = getLocalIPs()
const port = 3000

// Читаем SSL сертификаты
const key = readFileSync("./ssl/key.pem")
const cert = readFileSync("./ssl/cert.pem")

Bun.serve({
  hostname: "0.0.0.0",
  port,
  tls: {
    key,
    cert,
  },
  routes: {
    "/": Bun.file("./index.html"),
  },
  async fetch(req) {
    const url = new URL(req.url)
    const pathname = decodeURIComponent(url.pathname)
    switch (pathname) {
      case "/node_modules/@metafor/inspect/dist/web/debugger.js":
        debugger
        return new Response(Bun.file(path.join(__dirname, "../zavx0z/metafor/infra/inspect/dist/web/debugger.js")), {
          headers: {
            "Content-Type": "application/javascript",
          },
        })
      case "/node_modules/@metafor/meta/dist/metafor.min.js":
        return new Response(Bun.file(path.join(__dirname, "../zavx0z/metafor/meta/dist/metafor.js")), {
          headers: {
            "Content-Type": "application/javascript",
          },
        })
      case "/node_modules/@metafor/atom/dist/atom.min.js":
        return new Response(Bun.file(path.join(__dirname, "../zavx0z/metafor/atom/dist/atom.js")), {
          headers: {
            "Content-Type": "application/javascript",
          },
        })
      case "/zavx0z/metafor/node_modules/@zavx0z/context/dist/index.js":
        return new Response(
          Bun.file(path.join(__dirname, "../zavx0z/metafor/node_modules/@zavx0z/context/dist/index.d.ts")),
          {
            headers: {
              "Content-Type": "application/javascript",
            },
          }
        )
    }
    const file = Bun.file("." + pathname)
    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "Content-Type": "application/javascript",
        },
      })
    } else {
      console.log("Not found:", pathname)
    }

    return new Response("Not Found", { status: 404 })
  },
})

console.log(`🚀 HTTPS Server started:`)
console.log(`   Local: https://localhost:${port}`)
console.log(`   Network: https://${localIPs[0] || "0.0.0.0"}:${port}`)
console.log(`   HMR enabled: ✅`)
console.log(`   WebXR ready: ✅`)
console.log(`\n📱 Для доступа с VR гарнитуры используйте:`)
localIPs.forEach((ip) => {
  console.log(`   https://${ip}:${port}`)
})
console.log(`\n⚠️  При первом подключении браузер покажет предупреждение о сертификате.`)
console.log(`   Нажмите "Дополнительно" → "Перейти на сайт (небезопасно)"`)
