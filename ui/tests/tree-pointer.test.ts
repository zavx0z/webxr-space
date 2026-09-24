import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, HTMLElement, KeyboardEvent, readDocumentScrollIntoViewRequests} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentInteractionController, createDocumentRenderer} from "@renderer/html"
import type {TreeProps, TreeHandle} from "../widgets/tree.tsx"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))

const {Tree} = await import("../widgets/tree.tsx")
const template = Tree as unknown as CompiledTemplate<TreeProps>

function mount(
  items: TreeProps["items"],
  expandedKeys: readonly string[],
  options: Pick<TreeProps, "windowing" | "selectionFollowsFocus"> = {},
  height = 360,
) {
  const document = createDocument()
  const container = document.createElement("div")
  container.setAttribute("style", `display:flex;flex-direction:column;width:320px;height:${height}px`)
  document.append(container)
  const component = createRoot(container)
  const selections: string[][] = []
  const ready: {handle: TreeHandle | null} = {handle: null}
  let props: TreeProps = {
    ...options,
    title: "Контракт",
    items,
    expandedKeys,
    selectedKeys: [],
    onReady(handle) { ready.handle = handle },
    onSelectionChange(keys) {
      selections.push([...keys])
      props = {...props, selectedKeys: keys}
      render()
    },
  }
  const render = () => component.render(template, props)
  render()
  const renderer = createDocumentRenderer({document, root: container, viewport: {width: 320, height}})
  const interaction = createDocumentInteractionController({document})
  return {
    container,
    selections,
    document,
    ready,
    clickTreeItemCenter(id: string, row = false) {
      const item = container.querySelector(`[data-tree-id="${id}"]`)
      if (!(item instanceof HTMLElement)) throw new Error(`Не найден Tree item: ${id}`)
      const target = row ? item.querySelector("[data-tree-row]")! : item
      const frame = renderer.flush()
      const bounds = frame.hits.get(target) ?? frame.boxByNode.get(target)
      if (bounds === undefined) throw new Error(`Нет bounds Tree item: ${id}`)
      const point = {clientX: bounds.x + bounds.width / 2, clientY: bounds.y + bounds.height / 2, pointerId: 1, pointerType: "mouse" as const, button: 0}
      interaction.pointerDown(frame, {...point, buttons: 1})
      interaction.pointerUp(renderer.flush(), {...point, buttons: 0})
    },
    dispose() {
      interaction.dispose()
      renderer.dispose()
      component.unmount()
    },
  }
}

test("центр bounds leaf treeitem выбирает leaf через production pointer", () => {
  const fixture = mount([{id: "description", label: "Описание", children: []}], [])
  try {
    fixture.clickTreeItemCenter("description")
    expect(fixture.selections).toEqual([["description"]])
  } finally {
    fixture.dispose()
  }
})

test("раскрытая ветвь включает дочерние строки в bounds, собственная строка выбирает ветвь", () => {
  const fixture = mount([{
    id: "diagram",
    label: "Node diagram contract",
    children: [{id: "title", label: "title"}, {id: "style", label: "style"}],
  }], ["diagram"])
  try {
    fixture.clickTreeItemCenter("diagram")
    expect(fixture.selections).toEqual([["title"]])
    fixture.clickTreeItemCenter("diagram", true)
    expect(fixture.selections.at(-1)).toEqual(["diagram"])
  } finally {
    fixture.dispose()
  }
})


test("reveal раскрытой ветви прокручивает только её строку, не все вложенные строки", () => {
  const fixture = mount([{
    id: "comment",
    label: "comment",
    children: Array.from({length: 40}, (_, index) => ({id: `field-${index}`, label: `field ${index}`})),
  }], ["comment"])
  try {
    expect(fixture.ready.handle?.reveal("comment")).toBe(true)
    const request = readDocumentScrollIntoViewRequests(fixture.document).at(-1)
    const branch = fixture.container.querySelector('[data-tree-id="comment"]')!
    expect(request?.target === branch.querySelector("[data-tree-row]")).toBe(true)
  } finally { fixture.dispose() }
})

test("клик по видимой строке за пределами 20 строк не прокручивает дерево", () => {
  const fixture = mount(Array.from({length: 100}, (_, index) => ({id: `item-${index}`, label: `Item ${index}`})), [], {
    selectionFollowsFocus: false,
    windowing: {size: 80, rowHeight: 24, viewRows: 20},
  }, 960)
  try {
    const tree = fixture.container.querySelector('[role="tree"]') as HTMLElement
    fixture.clickTreeItemCenter("item-30", true)
    expect(fixture.selections).toEqual([["item-30"]])
    expect(tree.scrollTop).toBe(0)
    expect(tree.getAttribute("data-tree-window-start")).toBe("0")
    const selected = fixture.document.activeElement as HTMLElement
    expect(selected.getAttribute("data-tree-id")).toBe("item-30")
    selected.dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, cancelable: true, key: "End"}))
    expect(tree.scrollTop).toBeGreaterThan(0)
    expect((fixture.document.activeElement as HTMLElement).getAttribute("data-tree-id")).toBe("item-99")
  } finally { fixture.dispose() }
})
