import {expect, setDefaultTimeout, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, InputEvent, MouseEvent, type Element, type HTMLInputElement} from "@zavx0z/dom"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {runtime} from "../.storybook/runtime.ts"
import {PARAMETER_EXAMPLES, parameterFixture} from "../parameters/.storybook/stories/fixtures/parameters.ts"
import type {OwnerStoryDescriptor} from "../.storybook/stories/story-types.ts"

const root = resolve(import.meta.dir, "../..")
const packageRoot = resolve(root, "nodes")
setDefaultTimeout(60_000)
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: [packageRoot, resolve(root, "ui")]}))

type Variant = Readonly<{
  route: string
  module: Readonly<{path: string; export: string}>
  resources: Readonly<{fixture: string; tests: readonly string[]}>
}>
type Category = Readonly<{id: string; subjects: readonly Readonly<{id: string; apiName: string; variants: readonly Variant[]}>[]}>
const catalogs = await Promise.all(["", "parameters", "sockets"].map(owner => Bun.file(resolve(packageRoot, owner, ".storybook/catalog.json")).json()))
const catalog = {categories: catalogs.flatMap(value => value.categories)} as {categories: readonly Category[]}

test("[NODES-CATALOG-001] every public Socket kind and Parameter mechanism is discoverable with owner evidence", async () => {
  const {SOCKET_KINDS} = await import("@nodes/sockets/presets")
  expect(category("sockets").subjects.map(subject => subject.id)).toEqual([...SOCKET_KINDS])
  expect(category("parameters").subjects.map(subject => subject.id)).toEqual(Object.keys(PARAMETER_EXAMPLES))
  expect(category("components").subjects.map(subject => subject.apiName)).toEqual(["Frame", "Link", "GraphView", "GraphEditor", "Arrow"])
  const routes = new Set<string>()
  for (const item of catalog.categories) for (const subject of item.subjects) for (const variant of subject.variants) {
    expect(routes.has(variant.route)).toBe(false)
    routes.add(variant.route)
    if (item.id === "layout") continue
    const exports = await import(resolve(packageRoot, variant.route.startsWith("parameters/") ? "parameters" : variant.route.startsWith("sockets/") ? "sockets" : "", ".storybook", variant.module.path)) as Record<string, OwnerStoryDescriptor>
    expect(exports[variant.module.export]?.route).toBe(variant.route)
    for (const resource of [variant.resources.fixture, ...variant.resources.tests]) {
      expect(await Bun.file(resolve(packageRoot, variant.route.startsWith("parameters/") ? "parameters" : variant.route.startsWith("sockets/") ? "sockets" : "", ".storybook", resource)).exists()).toBe(true)
    }
  }
})

test("[NODES-CATALOG-002] all Socket kinds, directions, shapes and states mount actual production endpoints", async () => {
  for (const subject of category("sockets").subjects) for (const variant of subject.variants) {
    const mounted = await mount(variant)
    try {
      const sockets = mounted.owner.querySelectorAll("[data-socket-id]")
      expect(sockets.length).toBeGreaterThan(0)
      for (const socket of sockets) expect(socket.getAttribute("data-socket-kind")).toBe(subject.id)
      if (variant.route.endsWith("/shapes")) expect(new Set([...sockets].map(socket => socket.getAttribute("data-socket-shape"))).size).toBe(8)
      if (variant.route.endsWith("/states")) expect([...sockets].some(socket => socket.getAttribute("disabled") !== null)).toBe(true)
    } finally { mounted.dispose() }
  }
})

test("[NODES-CATALOG-003] all Parameter variants use their production mechanism and the real Store", async () => {
  const {resolveProjectedParameterPresentation} = await import("@nodes/parameters/shared")
  for (const [mechanism] of Object.entries(PARAMETER_EXAMPLES)) {
    const kind = mechanism as keyof typeof PARAMETER_EXAMPLES
    const value = parameterFixture(kind, "field")
    expect(resolveProjectedParameterPresentation(value.snapshot()).kind).toBe(kind)
  }
  for (const subject of category("parameters").subjects) for (const variant of subject.variants) {
    const mounted = await mount(variant)
    try {
      expect(mounted.owner.getAttribute("data-parameter-mechanism")).toBe(subject.id)
      expect(mounted.owner.querySelector('[aria-label="Значение Parameter"]')).not.toBeNull()
      expect(mounted.owner.querySelector('[data-parameter-id="value"]')).not.toBeNull()
      if (variant.route.endsWith("/both") || variant.route.endsWith("/projected")) {
        expect(mounted.owner.querySelectorAll("[data-socket-id]")).toHaveLength(2)
      }
    } finally { mounted.dispose() }
  }
})

test("[NODES-CATALOG-004] text input and Socket activation retain existing semantic controls", async () => {
  const parameter = await mount(find("parameters/text/field"))
  try {
    const input = parameter.owner.querySelector("input") as HTMLInputElement
    expect(input).not.toBeNull()
    input.value = "Изменено"
    input.dispatchEvent(new InputEvent("input", {bubbles: true, data: "Изменено", inputType: "insertText"}))
    await Promise.resolve()
    expect(parameter.owner.querySelector('[aria-label="Значение Parameter"]')?.textContent).toBe('"Изменено"')
    expect(parameter.owner.querySelector('[aria-label="Версия Parameter"]')?.textContent).toBe("revision: 1")
    expect(parameter.owner.querySelector("input")).toBe(input)
  } finally { parameter.dispose() }
  const socket = await mount(find("sockets/boolean/input"))
  try {
    const button = socket.owner.querySelector("[data-socket-id]")!
    button.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await Promise.resolve()
    expect(socket.owner.querySelector('[aria-label="Активации сокета"]')?.textContent).toBe("Активаций: 1")
    expect(socket.owner.querySelector("[data-socket-id]")).toBe(button)
  } finally { socket.dispose() }
})

test("[NODES-CATALOG-005] Node, Frame, Link, NodeTree and GraphEditor variants mount production owners", async () => {
  const selectors: Record<string, string> = {arrow: "[data-marker-kind]", node: "article[data-node-id]", frame: "[data-frame-id]", link: "[data-link-id]", "node-tree": "[data-graph-view]", "node-editor": "[data-graph-editor]"}
  for (const subject of category("components").subjects) for (const variant of subject.variants) {
    const mounted = await mount(variant)
    try {
      expect(mounted.owner.querySelector(selectors[subject.id]!)).not.toBeNull()
      expect(mounted.document.querySelectorAll("space")).toHaveLength(1)
      expect(mounted.document.querySelectorAll("display")).toHaveLength(1)
      expect(mounted.document.querySelectorAll("canvas")).toHaveLength(0)
    } finally { mounted.dispose() }
  }
})

test("[NODES-CATALOG-006] graph controls update Store and topology without replacing surviving Nodes", async () => {
  const mounted = await mount(find("components/node-tree/topology"))
  try {
    const source = mounted.owner.querySelector('article[data-node-id="source"]')
    const buttons = [...mounted.owner.querySelectorAll("button")]
    buttons.find(button => button.textContent === "Изменить значение Store")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await Promise.resolve()
    expect(mounted.owner.querySelector('[aria-label="Состояние графа"]')?.textContent).toContain("value: 3.5")
    buttons.find(button => button.textContent === "Добавить ноду")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await Promise.resolve()
    expect(mounted.owner.querySelector('[aria-label="Состояние графа"]')?.textContent).toContain("Нод: 3")
    expect(mounted.owner.querySelector('article[data-node-id="source"]')).toBe(source)
  } finally { mounted.dispose() }
})

function category(id: string): Category {
  const result = catalog.categories.find(category => category.id === id)
  if (result === undefined) throw new Error(`Missing category ${id}`)
  return result
}

function find(route: string): Variant {
  const result = catalog.categories.flatMap(category => category.subjects.flatMap(subject => subject.variants)).find(variant => variant.route === route)
  if (result === undefined) throw new Error(`Missing route ${route}`)
  return result
}

async function mount(variant: Variant) {
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
  const module = await import(resolve(packageRoot, variant.route.startsWith("parameters/") ? "parameters" : variant.route.startsWith("sockets/") ? "sockets" : "", ".storybook", variant.module.path)) as Record<string, OwnerStoryDescriptor>
  try {
    await session.mount({route: variant.route, story: module[variant.module.export], signal: controller.signal})
    expect(diagnostics).toEqual([])
    const owner = display.firstElementChild as Element | null
    if (owner === null) throw new Error(`Missing owner: ${variant.route}`)
    expect(owner.ownerDocument).toBe(document)
    return {
      document,
      owner,
      dispose() {
        session.dispose()
        controller.abort()
        expect(display.childNodes).toHaveLength(0)
      },
    }
  } catch (error) {
    session.dispose()
    controller.abort()
    throw new Error(`Story ${variant.route} failed`, {cause: error})
  }
}
