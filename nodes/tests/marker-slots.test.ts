import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {LinkProps, LinkRoute} from "@webxr/nodes/link"

const rootPath = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: rootPath, persistent: true, sourceRoots: [resolve(rootPath, "nodes"), resolve(rootPath, "ui")]}))
const {Link, projectLinkMarkers} = await import("@webxr/nodes/link")
const {Arrow} = await import("@webxr/nodes/markers/arrow")
const {FilledMarker} = await import("./marker-slots.fixture.tsx")

const route = (y: number): LinkRoute => ({kind: "orthogonal", points: [{x: 20, y}, {x: 180, y}]})

test("[MARKER-SLOTS] смешанные компоненты, исходные концы и identity при изменении маршрута", () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const root = createRoot(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 400, height: 200}})
  const render = (extra: Partial<LinkProps>) => root.render(Link as unknown as CompiledTemplate<LinkProps>, {id: "edge", title: "Связь", route: route(20), ...extra})
  try {
    render({startMarker: Arrow, endMarker: FilledMarker})
    const link = owner.querySelector("[data-link-id]")!
    const start = owner.querySelector('[data-link-arrow="start"]')!
    const end = owner.querySelector('[data-link-arrow="end"]')!
    expect(start.getAttribute("d")).toBe("M 29 16 L 20 20 L 29 24")
    expect(end.getAttribute("d")).toBe("M 180 20 L 170 26 L 170 14 L 180 20")
    expect(renderer.flush().displayList.some(item => item.node === end && item.key === "path-fill")).toBe(true)
    render({route: route(60), startMarker: Arrow, endMarker: FilledMarker})
    expect(owner.querySelector("[data-link-id]")).toBe(link)
    expect(owner.querySelector('[data-link-arrow="start"]')).toBe(start)
    expect(owner.querySelector('[data-link-arrow="end"]')).toBe(end)
    expect(end.getAttribute("d")).toBe("M 180 60 L 170 66 L 170 54 L 180 60")
    render({startMarker: null, startArrow: true, endArrow: true})
    expect(owner.querySelector('[data-link-arrow="start"]')).toBeNull()
    expect(owner.querySelector('[data-link-arrow="end"]')!.getAttribute("data-marker-variant")).toBe("open")
    render({markers: [], startMarker: Arrow, endMarker: FilledMarker})
    expect(owner.querySelectorAll("[data-link-arrow]")).toHaveLength(0)
    const exact = projectLinkMarkers(route(20), {end: {length: 13, width: 9, offset: 3}})
    render({markers: exact, endMarker: Arrow})
    const advanced = owner.querySelector('[data-link-arrow="end"]')!
    expect(advanced.getAttribute("d")).toBe(exact[0]!.d)
    expect(renderer.flush().displayList.some(item => item.node === advanced && item.key === "path-fill")).toBe(true)
    render({})
    expect(owner.querySelectorAll("[data-link-arrow]")).toHaveLength(0)
  } finally {
    root.unmount()
    renderer.dispose()
    owner.remove()
  }
})

test("[ARROW-STORIES] собственные open/filled варианты рисуют обычный и увеличенный Arrow", async () => {
  const {createArrowStory} = await import("../.storybook/stories/compiled/arrow-stories.tsx")
  for (const variant of ["open", "filled"] as const) {
    const document = createDocument()
    const {story} = createArrowStory(document, `markers/arrow/${variant}`)
    document.append(story.element)
    const renderer = createDocumentRenderer({document, root: story.element, viewport: {width: 600, height: 300}})
    try {
      const arrows = [...document.querySelectorAll('[data-marker-kind="arrow"]')]
      expect(arrows).toHaveLength(2)
      for (const arrow of arrows) {
        expect(arrow.getAttribute("data-marker-variant")).toBe(variant)
        expect(renderer.flush().displayList.some(item => item.node === arrow && item.key === (variant === "filled" ? "path-fill" : "path"))).toBe(true)
      }
    } finally {
      story.dispose()
      renderer.dispose()
    }
  }
})
