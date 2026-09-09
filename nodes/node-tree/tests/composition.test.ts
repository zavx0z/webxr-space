import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type Element} from "@zavx0z/dom"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: [resolve(root, "nodes"), resolve(root, "ui")]}))
const {mountMixedNodes} = await import("./composition.fixture.tsx")
const theme = await Bun.file(resolve(root, "ui/themes/theme.css")).text()

function click(owner: Element, label: string) {
  const button = [...owner.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === label || button.textContent === label)
  if (button === undefined) throw new Error(`Missing action: ${label}`)
  button.dispatchEvent(new MouseEvent("click", {bubbles: true}))
}

test("[NODES-COMPOSITION-GRAPH] mixed concrete nodes reflow content and sockets through the supplied layout without replacing the graph", async () => {
  const document = createDocument()
  const mounted = mountMixedNodes(document)
  document.append(mounted.owner)
  const renderer = createDocumentRenderer({document, root: mounted.owner, viewport: {width: 900, height: 700}, styleSheets: [theme]})
  try {
    const source = mounted.owner.querySelector('article[data-node-id="source"]')!
    const target = mounted.owner.querySelector('article[data-node-id="target"]')!
    const socket = source.querySelector('[data-socket-id="out"]')!
    const content = source.querySelector('[aria-label="Произвольное содержимое"]')!
    const link = mounted.owner.querySelector('[data-link-id="connection"]')!
    const initialPath = link.getAttribute("d")
    const store = mounted.tree.parameter("source", "amount")
    expect(mounted.owner.querySelectorAll("article[data-node-id]")).toHaveLength(2)
    expect(source.getAttribute("data-node-kind")).toBe("content")
    expect(target.getAttribute("data-node-kind")).toBe("diagram")
    expect(target.querySelectorAll("[data-socket-id]")).toHaveLength(0)
    click(content, "Счётчик содержимого: 0")
    await Promise.resolve()
    click(source, "Свернуть Источник")
    await Promise.resolve()
    expect(source.getAttribute("data-content-visible")).toBe("true")
    expect(source.querySelector('[data-socket-id="out"]')).toBe(socket)
    expect(renderer.flush().boxByNode.has(socket)).toBe(true)
    click(source, "Скрыть содержимое")
    await Promise.resolve()
    expect(source.getAttribute("data-parameters-collapsed")).toBe("true")
    expect(link.getAttribute("d")).not.toBe(initialPath)
    expect(mounted.owner.querySelector('[data-link-id="connection"]')).toBe(link)
    expect(mounted.owner.querySelector('article[data-node-id="source"]')).toBe(source)
    expect(mounted.owner.querySelector('article[data-node-id="target"]')).toBe(target)
    expect(mounted.tree.parameter("source", "amount")).toBe(store)
    expect(mounted.tree.links).toHaveLength(1)
    click(source, "Показать содержимое")
    await Promise.resolve()
    expect(content.textContent).toContain("Счётчик содержимого: 1")
    expect(source.querySelector('[aria-label="Произвольное содержимое"]')).toBe(content)
    expect(mounted.owner.querySelectorAll('[data-layout-pending="true"]')).toHaveLength(0)
  } finally {
    renderer.dispose()
    mounted.dispose()
  }
})


test("[NODES-CUSTOM-VIEW] an application supplies a compiled node without changing graph rendering or model ownership", () => {
  const document = createDocument()
  const mounted = mountMixedNodes(document, true)
  document.append(mounted.owner)
  try {
    const target = mounted.owner.querySelector('article[data-node-id="target"]')!
    expect(target.textContent).toBe("Компонент приложения: target")
    expect(mounted.owner.querySelectorAll("article[data-node-id]")).toHaveLength(2)
    expect(mounted.tree.nodes).toHaveLength(2)
    expect(mounted.tree.links).toHaveLength(1)
  } finally { mounted.dispose() }
})
