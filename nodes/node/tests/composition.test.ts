import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type Element, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@renderer/html"
import "./compiler.ts"

const root = resolve(import.meta.dir, "../../..")
const {createNodeFixture} = await import("./composition.fixture.tsx")
const {planProjectedNodeGeometry} = await import("@nodes/node/geometry")
const theme = await Bun.file(resolve(root, "ui/themes/theme.css")).text()

function mount(route: string, looseSockets = false) {
  const document = createDocument()
  const fixture = createNodeFixture(document, route, looseSockets)
  const owner = fixture.element as Element
  document.append(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 900, height: 1000}, styleSheets: [theme]})
  return {document, owner, renderer, dispose() {
    renderer.dispose()
    fixture.dispose()
    expect(document.childNodes).toHaveLength(0)
  }}
}

function click(owner: Element, name: string) {
  const button = [...owner.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === name || button.textContent === name)
  if (button === undefined) throw new Error(`Missing action: ${name}`)
  button.dispatchEvent(new MouseEvent("click", {bubbles: true}))
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}

test("[NODE-COMPOSITION-001] content and parameters toggle independently with one node and retained fields, sockets and content", async () => {
  const mounted = mount("components/node/preview")
  const node = mounted.owner.querySelector('[data-node-id="example"]')!
  const input = node.querySelector("input") as HTMLInputElement
  const sockets = [...node.querySelectorAll("[data-socket-id]")]
  const content = node.querySelector('[aria-label="Произвольное содержимое"]')!
  try {
    expect(mounted.owner.querySelectorAll("article[data-node-id]")).toHaveLength(1)
    expect(sockets).toHaveLength(2)
    click(content, "Счётчик содержимого: 0")
    await settle()
    click(node, "Свернуть Нода с содержимым")
    await settle()
    expect(node.getAttribute("data-content-visible")).toBe("true")
    expect(node.getAttribute("data-parameters-collapsed")).toBe("true")
    let frame = mounted.renderer.flush()
    expect(frame.boxByNode.has(input)).toBe(false)
    for (const socket of sockets) expect(frame.boxByNode.has(socket)).toBe(true)
    expect(frame.boxByNode.has(content)).toBe(true)

    click(node, "Скрыть содержимое")
    await settle()
    expect(node.getAttribute("data-parameters-collapsed")).toBe("true")
    expect(node.getAttribute("data-content-visible")).toBe("false")
    frame = mounted.renderer.flush()
    expect(frame.boxByNode.has(content)).toBe(false)
    for (const socket of sockets) expect(frame.boxByNode.has(socket)).toBe(true)

    click(node, "Развернуть Нода с содержимым")
    await settle()
    expect(node.getAttribute("data-content-visible")).toBe("false")
    expect(mounted.renderer.flush().boxByNode.has(input)).toBe(true)
    click(node, "Показать содержимое")
    await settle()
    expect(node.querySelector("input")).toBe(input)
    expect([...node.querySelectorAll("[data-socket-id]")]).toEqual(sockets)
    expect(node.querySelector('[aria-label="Произвольное содержимое"]')).toBe(content)
    expect(content.textContent).toContain("Счётчик содержимого: 1")
    expect(mounted.owner.querySelectorAll("article[data-node-id]")).toHaveLength(1)
  } finally { mounted.dispose() }
})

test("[NODE-COMPOSITION-002] square content and visible socket geometry agree with the numeric plan in all four states", async () => {
  const mounted = mount("components/node/preview")
  try {
    for (const [collapsed, visible] of [[false, true], [true, true], [true, false], [false, false]] as const) {
      const node = mounted.owner.querySelector('[data-node-id="example"]')!
      if ((node.getAttribute("data-parameters-collapsed") === "true") !== collapsed) {
        click(node, collapsed ? "Свернуть Нода с содержимым" : "Развернуть Нода с содержимым")
        await settle()
      }
      if ((node.getAttribute("data-content-visible") === "true") !== visible) {
        click(node, visible ? "Показать содержимое" : "Скрыть содержимое")
        await settle()
      }
      const frame = mounted.renderer.flush()
      const bounds = frame.boxByNode.get(node)!
      const plan = planProjectedNodeGeometry({id: "example", parameters: [{id: "value", value: 2.5, revision: 0, presentation: {label: "Число"}}], sockets: [
        {id: "in", direction: "input", parameterId: "value", side: "left"},
        {id: "out", direction: "output", parameterId: "value", side: "right"},
      ]}, 240, undefined, undefined, {collapsed, contentVisible: visible})
      expect(bounds.height).toBeCloseTo(plan.height)
      const area = node.querySelector("[data-node-content]")!
      if (visible) {
        const square = frame.boxByNode.get(area)!
        expect(square.width).toBeCloseTo(240)
        expect(square.height).toBeCloseTo(240)
      } else expect(frame.boxByNode.has(area)).toBe(false)
      for (const socket of node.querySelectorAll("[data-socket-id]")) {
        const glyph = socket.querySelector("[data-socket-glyph]")!
        const box = frame.boxByNode.get(glyph)!
        const expected = plan.sockets.find(port => port.id === `example/${socket.getAttribute("data-socket-id")}`)!
        expect(box.y + box.height / 2 - bounds.y).toBeCloseTo(expected.y)
        expect(box.x + box.width / 2 - bounds.x).toBeCloseTo(socket.getAttribute("data-socket-side") === "left" ? 0 : plan.width)
      }
    }
    click(mounted.owner, "Изменить ширину")
    await settle()
    click(mounted.owner, "Показать содержимое")
    await settle()
    const area = mounted.owner.querySelector("[data-node-content]")!
    const bounds = mounted.renderer.flush().boxByNode.get(area)!
    expect(bounds.width).toBeCloseTo(320)
    expect(bounds.height).toBeCloseTo(320)
  } finally { mounted.dispose() }
})

test("[NODE-COMPOSITION-003] diagrams reuse Pane and descriptions without parameter controls or socket buttons", () => {
  for (const shape of ["rectangle", "oval", "circle"]) {
    const mounted = mount(`diagram/${shape}`)
    try {
      const node = mounted.owner.querySelector('[data-node-id="example"]')!
      expect(node.getAttribute("data-node-kind")).toBe("diagram")
      expect(node.getAttribute("data-node-shape")).toBe(shape)
      for (const selector of ["input", "button", "[data-socket-id]"]) expect(node.querySelectorAll(selector)).toHaveLength(0)
      expect(node.textContent).toBe("Описание занимает всю ноду")
      const box = mounted.renderer.flush().boxByNode.get(node)!
      expect(box.width).toBe(240)
      expect(box.height).toBe(shape === "circle" ? 240 : 100)
    } finally { mounted.dispose() }
  }
})

test("[NODE-COMPOSITION-004] loose and parameter sockets retain their elements and match compact layout ports", async () => {
  const mounted = mount("components/node/basic", true)
  const node = mounted.owner.querySelector('[data-node-id="example"]')!
  const sockets = [...node.querySelectorAll("[data-socket-id]")]
  try {
    expect(sockets).toHaveLength(4)
    click(node, "Свернуть Нода с параметрами")
    await settle()
    const frame = mounted.renderer.flush()
    const bounds = frame.boxByNode.get(node)!
    const plan = planProjectedNodeGeometry({id: "example", parameters: [{id: "value", value: 2.5, revision: 0, presentation: null}], sockets: [
      {id: "in", direction: "input", parameterId: "value", side: "left"},
      {id: "out", direction: "output", parameterId: "value", side: "right"},
      {id: "loose-out", direction: "output", side: "right"},
      {id: "loose-in", direction: "input", side: "left"},
    ]}, 240, undefined, undefined, {collapsed: true})
    expect(bounds.height).toBeCloseTo(plan.height)
    for (const socket of sockets) {
      const glyph = socket.querySelector("[data-socket-glyph]")!
      const box = frame.boxByNode.get(glyph)!
      const expected = plan.sockets.find(port => port.id === `example/${socket.getAttribute("data-socket-id")}`)!
      expect(box.y + box.height / 2 - bounds.y).toBeCloseTo(expected.y)
      expect(box.x + box.width / 2 - bounds.x).toBeCloseTo(socket.getAttribute("data-socket-side") === "left" ? 0 : plan.width)
    }
    click(node, "Развернуть Нода с параметрами")
    await settle()
    expect([...node.querySelectorAll("[data-socket-id]")]).toEqual(sockets)
  } finally {
    mounted.dispose()
  }
})
