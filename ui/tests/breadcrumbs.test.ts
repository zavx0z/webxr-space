import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument} from "@zavx0z/dom"
import {createDocumentInteractionState, createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {chevronRightIcon, homeIcon} from "../themes/icons.ts"

const root = resolve(import.meta.dir, "../..")
const uiRoot = resolve(root, "ui")

Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [uiRoot],
}))

const {Breadcrumbs} = await import("../navigation/breadcrumbs.tsx")

test("иконка, разделители и подписи выровнены по центру одной строки", () => {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const component = createRoot(container)
  component.render(Breadcrumbs as any, {
    items: [{id: "home", label: "Главная", iconSrc: homeIcon}, {id: "project", label: "WebXR"}, {id: "package", label: "Пространство"}],
    onNavigate() {},
  })
  const interactionState = createDocumentInteractionState(document)
  const renderer = createDocumentRenderer({document, root: container, viewport: {width: 320, height: 24}, interactionState})
  const frame = renderer.flush()
  const center = (selector: string) => {
    const node = container.querySelector(selector)!
    const box = frame.boxByNode.get(node)!
    expect(box).toBeDefined()
    return box.y + box.height / 2
  }
  const iconCenter = center('[data-breadcrumb-id="home"] button img')
  expect(center('[data-breadcrumb-id="project"] button span')).toBeCloseTo(iconCenter)
  expect(center('[data-breadcrumb-id="package"] button span')).toBeCloseTo(iconCenter)
  expect(center('[data-breadcrumb-id="project"] img')).toBeCloseTo(iconCenter)
  const opacity = () => renderer.flush().displayList.find(item => item.kind === "image" && item.src === homeIcon)?.opacity
  const home = container.querySelector('[data-breadcrumb-id="home"] button') as import("@zavx0z/dom").HTMLButtonElement
  expect(opacity()).toBe(0.5)
  interactionState.setHoveredElement(home)
  expect(opacity()).toBe(1)
  interactionState.setHoveredElement(null)
  expect(opacity()).toBe(0.5)
  home.focus()
  expect(opacity()).toBe(1)
  home.blur()
  expect(opacity()).toBe(0.5)
  renderer.dispose()
  component.unmount()
})

test("иконка корня сохраняет имя, подсказку и переход без видимой текстовой подписи", () => {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const component = createRoot(container)
  const visited: string[] = []
  component.render(Breadcrumbs as any, {
    items: [{id: "home", label: "Главная", iconSrc: homeIcon}, {id: "package", label: "Пакет"}],
    onNavigate: (item: {id: string}) => { visited.push(item.id) },
  })
  const button = container.querySelector('[data-breadcrumb-id="home"] button') as import("@zavx0z/dom").HTMLButtonElement
  expect(button.textContent).toBe("")
  expect(button.getAttribute("aria-label")).toBe("Главная")
  expect(button.title).toBe("Главная")
  expect(button.querySelector("img")?.getAttribute("src")).toBe(homeIcon)
  button.click()
  expect(visited).toEqual(["home"])
  component.unmount()
})

test("[UI-BREADCRUMBS-001] путь является ordered navigation с текущим последним сегментом", () => {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const component = createRoot(container)
  const items = Object.freeze([
    Object.freeze({id: "package", label: "@webxr/nodes"}),
    Object.freeze({id: "layout", label: "Раскладка"}),
    Object.freeze({id: "adaptive", label: "Адаптивная"}),
  ])

  component.render(Breadcrumbs as any, {items, onNavigate() {}})

  const navigation = container.querySelector('nav[aria-label="Путь"]')
  expect(navigation).not.toBeNull()
  expect(navigation?.querySelectorAll("ol")).toHaveLength(1)
  expect(navigation?.querySelectorAll("li")).toHaveLength(3)
  expect(navigation?.querySelectorAll("button")).toHaveLength(3)
  const separators = [...navigation?.querySelectorAll("img") ?? []].filter(image => image.getAttribute("src") === chevronRightIcon)
  expect(separators).toHaveLength(3)
  expect(separators[0]?.hasAttribute("hidden")).toBe(true)
  expect(separators.slice(1).every(separator => !separator.hasAttribute("hidden"))).toBe(true)
  expect(navigation?.textContent).not.toContain("›")
  expect(navigation?.querySelector('[aria-current="page"]')?.textContent).toBe("Адаптивная")

  component.unmount()
  expect(container.childNodes).toHaveLength(0)
})

test("[UI-BREADCRUMBS-002] пустой, повторяющийся или безымянный путь отклоняется", () => {
  const document = createDocument()
  const container = document.createElement("div")
  const component = createRoot(container)

  expect(() => component.render(Breadcrumbs as any, {items: []})).toThrow("non-empty array")
  expect(() => component.render(Breadcrumbs as any, {
    items: [{id: "same", label: "A"}, {id: "same", label: "B"}],
  })).toThrow("must be unique")
  expect(() => component.render(Breadcrumbs as any, {
    items: [{id: "empty", label: ""}],
  })).toThrow("label must be non-empty")
})
