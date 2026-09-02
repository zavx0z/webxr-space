import {
  Parameter,
  createNodeTree,
  createNodeTreeExternalStore,
  type NodeJsonValue,
} from "@nodes/core"
import {NodeTreeEditor} from "@nodes/editor"
import type {LayoutResult} from "@nodes/layout/types"
import {NodeEditor} from "@nodes/ui/node-editor"
import {
  type Document,
  type Element,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import {createRoot, useRef, useState} from "@zavx0z/react"
import type {NodesExternalStorySource} from "../../../.storybook/runtime.ts"

type StoryParameter = Parameter<NodeJsonValue, NodeJsonValue>

export function createEditorNodeTreeStory(document: Document, route: string) {
  if (route !== "editor/node-tree/live") throw new Error(`Unknown Editor story route: ${route}`)
  const tree = createStoryTree()
  const editor = new NodeTreeEditor(tree)
  const store = createNodeTreeExternalStore(tree)
  const host = document.createElement("section")
  const componentRoot = createRoot(host)
  componentRoot.render(<EditorStoryView
    tree={tree}
    editor={editor}
    store={store}
  />)
  let disposed = false
  return Object.freeze({
    element: host,
    componentRoot,
    get props() { return tree.getSnapshot() },
    source(): NodesExternalStorySource {
      return Object.freeze({
        html: serialize(host),
        typescript: [
          'import {NodeTreeEditor} from "@nodes/editor"',
          'import {NodeEditor} from "@nodes/ui/node-editor"',
          'import {createRoot} from "@zavx0z/react"',
          "",
          "const editor = new NodeTreeEditor(tree)",
          "createRoot(container).render(<NodeEditor store={store} layout={layoutResult} />)",
        ].join("\n"),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      componentRoot.unmount()
      editor.dispose()
      tree.dispose()
    },
  })
}

function EditorStoryView(props: Readonly<{
  tree: ReturnType<typeof createStoryTree>
  editor: NodeTreeEditor
  store: ReturnType<typeof createNodeTreeExternalStore<StoryParameter, NodeJsonValue, NodeJsonValue, NodeJsonValue, NodeJsonValue>>
}>) {
  const [revision, setRevision] = useState(props.tree.revision)
  const nextId = useRef(1)
  const addNode = () => {
    const index = nextId.current++
    props.editor.addNode({
      expectedRevision: props.tree.revision,
      node: Object.freeze({
        id: `added-${index}`,
        metadata: Object.freeze({label: `New Node ${index}`, x: 330 + index * 32, y: 84 + index * 24, width: 220, height: 100}),
        parameters: Object.freeze([Object.freeze({
          id: "value",
          value: index,
          presentation: Object.freeze({label: "Value"}),
          valueType: Object.freeze({id: "float", version: 1}),
        })]),
      }),
    })
    setRevision(props.tree.revision)
  }
  const input = (change: Readonly<{nodeId: string; parameterId: string; value: NodeJsonValue}>) => {
    props.editor.setParameterValue({
      expectedRevision: props.tree.revision,
      nodeId: change.nodeId,
      parameterId: change.parameterId,
      value: change.value,
    })
    setRevision(props.tree.revision)
  }
  return <section
    data-editor-story=""
    data-revision={revision}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 760px;
      height: 520px;
      gap: 6px;
      overflow: hidden;
    `}
  >
    <nav
      aria-label="NodeTreeEditor actions"
      style={css`
        display: flex;
        width: 100%;
        height: 28px;
        gap: 4px;
      `}
    >
      <button
        type="button"
        data-action="add-node"
        onClick={addNode}
        style={css`
          box-sizing: border-box;
          height: 24px;
          padding: 2px 8px;
          border: 1px solid #4a4a4a;
          border-radius: 3px;
          background: #303030;
          color: #d8d8d8;
          font-size: 10px;
        `}
      >
        Добавить ноду
      </button>
    </nav>
    <NodeEditor
      store={props.store}
      layout={editorStoryLayout}
      width={760}
      height={486}
      onParameterInput={input}
      onParameterChange={input}
    />
  </section>
}

const editorStoryLayout: LayoutResult = Object.freeze({
  direction: "RIGHT",
  bounds: Object.freeze({x: 54, y: 58, width: 4_000, height: 2_800}),
  nodes: Object.freeze([
    Object.freeze({id: "source", x: 54, y: 58, width: 220, height: 120}),
    ...Array.from({length: 100}, (_, offset) => {
      const index = offset + 1
      return Object.freeze({
        id: `added-${index}`,
        x: 330 + index * 32,
        y: 84 + index * 24,
        width: 220,
        height: 100,
      })
    }),
  ]),
  ports: Object.freeze([]),
  edges: Object.freeze([]),
})

function createStoryTree() {
  return createNodeTree<StoryParameter, NodeJsonValue, NodeJsonValue, NodeJsonValue, NodeJsonValue>({
    nodes: Object.freeze([Object.freeze({
      id: "source",
      metadata: Object.freeze({label: "Source", x: 54, y: 58, width: 220, height: 120}),
      parameters: Object.freeze([new Parameter<NodeJsonValue, NodeJsonValue>(
        "gain",
        1,
        Object.freeze({label: "Gain"}),
        Object.freeze({id: "float", version: 1}),
      )]),
    })]),
    links: Object.freeze([]),
  })
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escape(element.getAttribute(name) ?? "")}"`).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escape((node as Text).data)}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attrs}>\n${body}\n${indent}</${element.localName}>`
}

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
