import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, HTMLElement, readDocumentScrollIntoViewRequests} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentInteractionController, createDocumentRenderer} from "@renderer/html"
import type {TreeProps, TreeHandle} from "../widgets/tree.tsx"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))

const {Tree} = await import("../widgets/tree.tsx")
const template = Tree as unknown as CompiledTemplate<TreeProps>

function mount(items: TreeProps["items"], expandedKeys: readonly string[]) {
  const document = createDocument()
  const container = document.createElement("div")
  container.setAttribute("style", "display:flex;flex-direction:column;width:320px;height:360px")
  document.append(container)
  const component = createRoot(container)
  const selections: string[][] = []
  const ready: {handle: TreeHandle | null} = {handle: null}
  let props: TreeProps = {
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
  const renderer = createDocumentRenderer({document, root: container, viewport: {width: 320, height: 360}})
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
