import {describe, expect, test} from "bun:test"
import {createNodeTree, createNodeTreeExternalStore} from "@nodes/core"
import * as root from "@nodes/ui"
import {Frame} from "@nodes/ui/frame"
import {Link} from "@nodes/ui/link"
import {Node} from "@nodes/ui/node"
import {NodeEditor} from "@nodes/ui/node-editor"
import {NodeTree} from "@nodes/ui/node-tree"
import {
  CheckboxParameter,
  CollectionParameter,
  ColorParameter,
  CycleParameter,
  MatrixParameter,
  NumberParameter,
  OptionGroupParameter,
  OutputParameter,
  Parameter,
  PathParameter,
  ReferenceParameter,
  SelectParameter,
  SliderParameter,
  SwitchParameter,
  TextParameter,
  VectorParameter,
} from "@nodes/ui/parameter"
import {Socket} from "@nodes/ui/socket"
import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"

describe("@nodes/ui final component contract", () => {
  test("publishes only semantic component owners and bounded Link/Socket helpers", () => {
    expect(Object.keys(root).sort()).toEqual([
      "CheckboxParameter",
      "CollectionParameter",
      "ColorParameter",
      "CycleParameter",
      "Frame",
      "Link",
      "MatrixParameter",
      "Node",
      "NodeEditor",
      "NodeTree",
      "NumberParameter",
      "OptionGroupParameter",
      "OutputParameter",
      "Parameter",
      "PathParameter",
      "ReferenceParameter",
      "SOCKET_KINDS",
      "SOCKET_PRESETS",
      "SOCKET_SHAPES",
      "SelectParameter",
      "SliderParameter",
      "Socket",
      "SwitchParameter",
      "TextParameter",
      "VectorParameter",
      "createCubicLinkRoute",
      "projectLinkRoute",
      "socketPreset",
    ])
    expect(root).not.toHaveProperty("NodeSystem")
    expect(root).not.toHaveProperty("NodeCard")
    expect(root).not.toHaveProperty("ParameterRow")
    expect(root).not.toHaveProperty("SocketPort")
    expect(root).not.toHaveProperty("NodeConnection")
    expect(root).not.toHaveProperty("createNode")
    expect(root).not.toHaveProperty("createGraphCanvas")
  })

  test("resolves every exact public component subpath and one same-Document root", () => {
    for (const component of [
      Frame,
      Link,
      Node,
      NodeEditor,
      NodeTree,
      Parameter,
      Socket,
      TextParameter,
      NumberParameter,
      SliderParameter,
      CheckboxParameter,
      SwitchParameter,
      SelectParameter,
      CycleParameter,
      OptionGroupParameter,
      ColorParameter,
      VectorParameter,
      MatrixParameter,
      PathParameter,
      ReferenceParameter,
      CollectionParameter,
      OutputParameter,
    ]) expect(component).toBeDefined()

    const tree = createNodeTree({nodes: [], links: []})
    const document = createDocument()
    const host = document.createElement("main")
    const componentRoot = createRoot(host)
    componentRoot.render(<NodeTree store={createNodeTreeExternalStore(tree)} />)
    expect(host.querySelector('[data-node-tree]')?.ownerDocument).toBe(document)
    expect(host.querySelectorAll('[data-node-tree]')).toHaveLength(1)
    componentRoot.unmount()
    tree.dispose()
  })

  test("contains no imperative factories, nested roots or public CSS transports", async () => {
    const files = [
      "frame.tsx",
      "link.tsx",
      "node.tsx",
      "node-editor.tsx",
      "node-tree.tsx",
      "parameter.tsx",
      "socket.tsx",
    ]
    const source = (await Promise.all(files.map(file =>
      Bun.file(new URL(`./${file}`, import.meta.url)).text()))).join("\n")
    expect(source).not.toContain("document.createElement")
    expect(source).not.toContain("createRoot(")
    expect(source).not.toContain("update(props")
    expect(source).not.toContain("dispose():")
    expect(source).not.toContain("NodeCard")
    expect(source).not.toContain("ParameterRow")
    expect(source).not.toContain("SocketPort")
    expect(source).not.toContain("NodeConnection")
    expect(source).not.toContain("LooseSocket")
    expect(source).not.toContain("defineStyles")
    expect(source).not.toContain("className")
    expect(source).not.toContain("sx=")
    expect(source).toContain("style={css`")
  })
})
