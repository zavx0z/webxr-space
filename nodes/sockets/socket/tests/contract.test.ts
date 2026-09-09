import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type Element} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {SOCKET_KINDS, SOCKET_SHAPES} from "@nodes/sockets/presets"
import {runtime} from "../../.storybook/runtime.ts"

const root = resolve(import.meta.dir, "../../../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [resolve(root, "nodes/sockets")],
}))
const {createSocketStory} = await import("../../.storybook/stories/compiled/socket-stories.tsx")

test("[SOCKETS-COMPOSITION] all presets, directions, forms and states mount one production Socket and retain activation identity", async () => {
  for (const kind of SOCKET_KINDS) for (const variant of ["input", "output", "bidirectional", "shapes", "states", "presentation"]) {
    const route = `sockets/${kind}/${variant}`
    const document = createDocument({elementFactories: createSpaceElementFactories()})
    const space = document.createElement("space")
    const display = document.createElement("display")
    document.append(space)
    space.append(document.createElement("viewpoint"), display)
    const controller = new AbortController()
    const diagnostics: unknown[] = []
    const session = runtime.create({
      document,
      signal: controller.signal,
      present(value) { display.append(value.node) },
      reportDiagnostic(value) { diagnostics.push(value) },
    })
    try {
      await session.mount({
        route,
        story: {route, create: (document: Parameters<typeof createSocketStory>[0]) => createSocketStory(document, route)},
        signal: controller.signal,
      })
      const owner = display.firstElementChild as Element
      const sockets = owner.querySelectorAll("[data-socket-id]")
      expect(sockets.length).toBeGreaterThan(0)
      for (const socket of sockets) expect(socket.getAttribute("data-socket-kind")).toBe(kind)
      if (variant === "shapes") {
        expect([...sockets].map(socket => socket.getAttribute("data-socket-shape"))).toEqual([...SOCKET_SHAPES])
      } else if (variant === "states") {
        expect(owner.querySelector('[data-socket-id="disabled"]')?.hasAttribute("disabled")).toBe(true)
        expect(owner.querySelector('[data-socket-id="connected"]')?.getAttribute("data-connected")).toBe("true")
      } else if (variant === "presentation") {
        expect([...sockets].map(socket => socket.getAttribute("data-presentation"))).toEqual(["endpoint", "row"])
      } else {
        const socket = sockets[0]!
        expect(socket.getAttribute("data-socket-direction")).toBe(variant)
        socket.dispatchEvent(new MouseEvent("click", {bubbles: true}))
        await Promise.resolve()
        expect(owner.querySelector('[aria-label="Активации сокета"]')?.textContent).toBe("Активаций: 1")
        expect(owner.querySelector("[data-socket-id]")).toBe(socket)
        expect(socket.getAttribute("aria-pressed")).toBe("true")
      }
      expect(diagnostics).toEqual([])
      expect(document.querySelectorAll("display")).toHaveLength(1)
      expect(document.querySelectorAll("canvas")).toHaveLength(0)
    } finally {
      session.dispose()
      controller.abort()
      expect(display.childNodes).toHaveLength(0)
    }
  }
}, 30_000)
