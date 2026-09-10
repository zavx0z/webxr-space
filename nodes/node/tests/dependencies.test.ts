import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {API} from "typescript/unstable/async"
import type {Node} from "typescript/unstable/ast"
import {isFunctionDeclaration, isJsxOpeningElement, isJsxSelfClosingElement, isIdentifier} from "typescript/unstable/ast/is"
import {createDocument, MouseEvent, type Element} from "@zavx0z/dom"
import {createDocumentRenderer} from "@renderer/html"
import "./compiler.ts"
import {dependencyComponents, dependencyGraph} from "../.storybook/stories/dependencies-data.ts"

const root = resolve(import.meta.dir, "../../..")
const {createDependencyStory} = await import("../.storybook/stories/dependencies.tsx")
const theme = await Bun.file(resolve(root, "ui/themes/theme.css")).text()

test("[NODE-DEPENDENCIES-SOURCE] every depicted relationship comes from JSX in the named production component", async () => {
  const known = new Set(dependencyComponents.map(component => component.id))
  const api = new API({cwd: root})
  try {
    const snapshot = await api.updateSnapshot({openFiles: dependencyComponents.map(component => resolve(root, component.source))})
    for (const component of dependencyComponents) {
      const file = resolve(root, component.source)
      const project = await snapshot.getDefaultProjectForFile(file)
      const source = await project!.program.getSourceFile(file)
      const declaration = source!.statements.find(statement => isFunctionDeclaration(statement) && statement.name?.text === component.id)
      expect(declaration, component.id).toBeDefined()
      const used = new Set<string>()
      const visit = (node: Node) => {
        if ((isJsxOpeningElement(node) || isJsxSelfClosingElement(node)) && isIdentifier(node.tagName) && known.has(node.tagName.text)) {
          used.add(node.tagName.text)
        }
        node.forEachChild(visit)
      }
      visit(declaration!)
      expect([...used].sort(), component.id).toEqual([...component.uses].sort())
    }
  } finally {
    await api.close()
  }
})

test("[NODE-DEPENDENCIES-VIEW] diagrams show real nodes and links, select existing components and release the same Document", async () => {
  for (const scope of ["nodes", "parameter"] as const) {
    const document = createDocument()
    const {story} = createDependencyStory(document, scope)
    const owner = story.element as Element
    document.append(owner)
    const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 1100, height: 1200}, styleSheets: [theme]})
    try {
      const graph = dependencyGraph(scope)
      const nodes = [...owner.querySelectorAll("article[data-node-id]")]
      const links = [...owner.querySelectorAll("[data-link-id]")]
      expect(nodes).toHaveLength(graph.components.length)
      expect(links).toHaveLength(graph.relations.length)
      expect(owner.querySelectorAll("[data-socket-id]")).toHaveLength(0)
      expect(owner.querySelectorAll("input")).toHaveLength(0)
      expect(owner.querySelectorAll("[data-layout-pending=\"true\"]")).toHaveLength(0)
      const frame = renderer.flush()
      for (const node of nodes) {
        expect(node.getAttribute("data-node-kind")).toBe("diagram")
        const bounds = frame.boxByNode.get(node)!
        expect(bounds.width).toBe(210)
        expect(bounds.height).toBe(62)
      }
      const selectedId = scope === "nodes" ? "ParameterNode" : "NumberParameter"
      const node = owner.querySelector(`article[data-node-id="${selectedId}"]`)!
      node.dispatchEvent(new MouseEvent("click", {bubbles: true}))
      await Promise.resolve()
      expect(node.getAttribute("aria-selected")).toBe("true")
      expect(owner.querySelector('[aria-label="О выбранном компоненте"]')!.textContent).toContain(selectedId)
      expect([...owner.querySelectorAll("article[data-node-id]")]).toEqual(nodes)
      expect([...owner.querySelectorAll("[data-link-id]")]).toEqual(links)
      expect(renderer.flush().boxByNode.get(owner)!.width).toBe(1100)
    } finally {
      renderer.dispose()
      story.dispose()
    }
    expect(document.childNodes).toHaveLength(0)
  }
})
