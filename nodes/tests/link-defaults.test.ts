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
const {createComponentStory} = await import("../.storybook/stories/compiled/component-stories.tsx")
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

test("[LINK-STORIES] реальные типы, приоритет цвета и оба вида стрелок в авторских вариантах", () => {
  for (const variant of ["orthogonal", "cubic", "states", "disabled", "live-store", "arrows", "filled-arrows", "mixed-markers", "types", "color"]) {
    const h = host()
    const {story} = createComponentStory(h.document, `components/link/${variant}`)
    h.owner.append(story.element)
    try {
      const links = [...h.owner.querySelectorAll("[data-link-id]")]
      const arrows = [...h.owner.querySelectorAll("[data-link-arrow]")]
      const frame = h.renderer.flush()
      const colorFor = (element: typeof links[number]) => {
        const paint = frame.displayList.find(item => item.node === element && item.kind === "path")
        if (!paint || paint.kind !== "path") {
          const ancestors = []
          for (let node: Element | null = element; node; node = node.parentElement) ancestors.push({tag: node.localName, hidden: node.getAttribute("hidden"), box: frame.boxByNode.has(node) ? (({x, y, width, height}) => ({x, y, width, height}))(frame.boxByNode.get(node)!) : null})
          throw new Error(`Нет пути: ${variant}/${element.getAttribute("data-link-id")}; d=${element.getAttribute("d")}; style=${element.getAttribute("style")}; ${JSON.stringify(ancestors)}`)
        }
        return paint.stroke
      }
      if (variant === "types") {
        expect(links).toHaveLength(SOCKET_KINDS.length + 1)
        expect(links[0]!.getAttribute("data-socket-kind")).toBeNull()
        expect(colorFor(links[0]!)).toBe("#9e9e9e")
        for (const kind of SOCKET_KINDS) expect(colorFor(links.find(link => link.getAttribute("data-socket-kind") === kind)!)).toBe(socketPreset(kind).color)
      } else if (variant === "color") {
        expect(links).toHaveLength(2)
        expect(colorFor(links[0]!)).toBe("#26a69a")
        expect(links[0]!.getAttribute("data-socket-kind")).toBeNull()
        expect(colorFor(links[1]!)).toBe("#ef8b32")
        expect(links[1]!.getAttribute("data-socket-kind")).toBe("custom")
      } else {
        for (const link of links) {
          expect(link.getAttribute("data-socket-kind")).toBeNull()
          expect(colorFor(link)).toBe("#9e9e9e")
        }
      }
      if (variant === "arrows" || variant === "filled-arrows" || variant === "mixed-markers") {
        expect(links).toHaveLength(variant === "mixed-markers" ? 2 : 3)
        expect(arrows).toHaveLength(4)
        expect(arrows.map(arrow => arrow.getAttribute("data-link-arrow"))).toEqual(["start", "end", "start", "end"])
        for (const arrow of arrows) expect(frame.displayList.some(item => item.node === arrow && item.key === (arrow.getAttribute("data-marker-variant") === "filled" ? "path-fill" : "path"))).toBe(true)
      } else expect(arrows).toHaveLength(0)
      if (variant === "states") expect(links[0]!.getAttribute("aria-selected")).toBe("true")
      if (variant === "disabled") expect(links[0]!.getAttribute("aria-disabled")).toBe("true")
      if (variant === "live-store") {
        const before = links[0]!
        h.owner.querySelector("button")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
        expect(h.owner.querySelector("[data-link-id]")).toBe(before)
        expect(before.getAttribute("aria-selected")).toBe("true")
        expect(h.owner.querySelector('[aria-label="Состояние Link"]')!.textContent).toContain("path")
      }
      if (variant !== "types") expect(story.source.typescript).not.toContain('kind: "float"')
    } finally {
      story.dispose()
      h.dispose()
    }
  }
})
