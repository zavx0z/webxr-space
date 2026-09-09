import {expect} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type Element} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {runtime} from "../../.storybook/runtime.ts"
import {PARAMETER_EXAMPLES, parameterFixture, type ParameterMechanism} from "../../.storybook/stories/fixtures/parameters.ts"

const root = resolve(import.meta.dir, "../../../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [resolve(root, "nodes/parameters"), resolve(root, "nodes/sockets"), resolve(root, "ui")],
}))
const {createParameterStory} = await import("../../.storybook/stories/compiled/parameter-stories.tsx")
const {resolveProjectedParameterPresentation} = await import("@nodes/parameters/shared")

export async function mountParameterStory(mechanism: ParameterMechanism, variant: string) {
  const route = `parameters/${mechanism}/${variant}`
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
      story: {route, create: (document: Parameters<typeof createParameterStory>[0]) => createParameterStory(document, route)},
      signal: controller.signal,
    })
    expect(diagnostics).toEqual([])
    const owner = display.firstElementChild as Element | null
    if (owner === null) throw new Error(`Missing Parameter story: ${route}`)
    expect(owner.ownerDocument).toBe(document)
    return {
      owner,
      document,
      dispose() {
        session.dispose()
        controller.abort()
        expect(display.childNodes).toHaveLength(0)
      },
    }
  } catch (error) {
    session.dispose()
    controller.abort()
    throw error
  }
}

export async function verifyParameterMechanism(mechanism: ParameterMechanism) {
  expect(resolveProjectedParameterPresentation(parameterFixture(mechanism, "field").snapshot()).kind).toBe(mechanism)
  const variants = ["field", "input", "output", "both", "connected", "disabled", "projected"]
  if (mechanism !== "output") variants.push("readonly")
  if (["vector", "matrix", "collection"].includes(mechanism)) variants.push("geometry")
  for (const variant of variants) {
    const mounted = await mountParameterStory(mechanism, variant)
    try {
      const row = mounted.owner.querySelector('[data-parameter-id="value"]')!
      expect(row).not.toBeNull()
      expect(row.getAttribute("data-field-kind")).toBe(mechanism)
      expect(mounted.owner.querySelector('[aria-label="Значение Parameter"]')?.textContent)
        .toBe(JSON.stringify(PARAMETER_EXAMPLES[mechanism].value))
      const expectedSockets = ["both", "projected"].includes(variant) ? 2
        : ["input", "output", "connected"].includes(variant) ? 1 : 0
      const sockets = row.querySelectorAll("[data-socket-id]")
      expect(sockets).toHaveLength(expectedSockets)
      expect(row.querySelector("[data-parameter-field]")?.hasAttribute("hidden")).toBe(variant === "connected")
      if (variant === "geometry") {
        expect(mounted.owner.querySelectorAll("[data-parameter-id]")).toHaveLength(mechanism === "collection" ? 2 : 3)
      }
      if (sockets.length > 0) {
        const socket = sockets[0]!
        const socketId = socket.getAttribute("data-socket-id")!
        socket.dispatchEvent(new MouseEvent("click", {bubbles: true}))
        await Promise.resolve()
        expect(mounted.owner.querySelector('[aria-label="Последнее действие"]')?.textContent).toBe(`Сокет: ${socketId}`)
        expect(mounted.owner.querySelector('[data-parameter-id="value"]')).toBe(row)
        expect(row.querySelector(`[data-socket-id="${socketId}"]`)).toBe(socket)
      }
      expect(mounted.document.querySelectorAll("space")).toHaveLength(1)
      expect(mounted.document.querySelectorAll("display")).toHaveLength(1)
      expect(mounted.document.querySelectorAll("canvas")).toHaveLength(0)
    } finally {
      mounted.dispose()
    }
  }
}
