import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type Element} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {LinkProps} from "@webxr/nodes/link"
import type {LinkDefinition} from "@webxr/nodes/link/types"
import {SOCKET_KINDS, socketPreset} from "@nodes/sockets/presets"

const root = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: [resolve(root, "nodes"), resolve(root, "ui")]}))
const {Link} = await import("@webxr/nodes/link")
const route: LinkDefinition["route"] = {kind: "orthogonal", points: [{x: 20, y: 20}, {x: 180, y: 20}]}

function host() {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 1000, height: 1000}})
  return {document, owner, component, renderer, dispose() {
    component.unmount()
    renderer.dispose()
    owner.remove()
  }}
}

test("[LINK-DEFAULT] нейтральный цвет без kind, явный тип и color имеют определённый приоритет", () => {
  const h = host()
  try {
    const cases: readonly Readonly<{props: Partial<LinkProps>; color: string; kind?: string}>[] = [
      {props: {}, color: "#9e9e9e"},
      ...SOCKET_KINDS.map(kind => ({props: {kind}, kind, color: socketPreset(kind).color})),
      {props: {color: "#123456"}, color: "#123456"},
      {props: {kind: "custom", color: "#123456"}, kind: "custom", color: "#123456"},
      {props: {}, color: "#9e9e9e"},
    ]
    let first: Element | undefined
    for (const entry of cases) {
      h.component.render(Link as unknown as CompiledTemplate<LinkProps>, {id: "link", title: "Связь", route, ...entry.props})
      const element = h.owner.querySelector('[data-link-id="link"]')!
      first ??= element
      expect(element).toBe(first)
      expect(element.getAttribute("data-socket-kind")).toBe(entry.kind ?? null)
      const paint = h.renderer.flush().displayList.find(item => item.node === element && item.kind === "path")
      if (!paint || paint.kind !== "path") throw new Error("Нет настоящего stroke")
      expect(paint.stroke).toBe(entry.color)
      expect(paint.strokeWidth).toBe(2.2)
      expect(h.owner.querySelectorAll("[data-link-arrow]")).toHaveLength(0)
    }
  } finally { h.dispose() }
})
