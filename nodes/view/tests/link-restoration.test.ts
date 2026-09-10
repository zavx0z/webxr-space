import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument} from "@zavx0z/dom"
import {flushDocumentLayoutObservers} from "@zavx0z/dom/geometry"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer, type RenderFrame} from "@renderer/html"
import {InstancedStrokedPath, TrueTypeFont} from "@zavx0z/engine"
import {RendererWebGpuBackend} from "../../../webgpu/src/webgpu-backend.ts"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {GraphViewProps, GraphLayoutComputer} from "@webxr/nodes/view"

const workspace = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: ["nodes", "ui"].map(path => resolve(workspace, path))}))
const {createCubicLinkRoute} = await import("@webxr/nodes/link")
const {GraphView} = await import("@webxr/nodes/view")
const {graphInput} = await import("./measured.fixture.tsx")
const font = new TrueTypeFont(await Bun.file(resolve(workspace, "engine/static/fonts/inter-regular.ttf")).arrayBuffer())

/** Сравниваем смысл записей, не физические slots, которые вправе переиспользоваться. */
function pathRecords(backend: RendererWebGpuBackend) {
  return backend.root.children.filter((node): node is InstancedStrokedPath => node instanceof InstancedStrokedPath).map(run => {
    run.layer.validatePackedRecords()
    const segments = []
    for (let index = run.firstInstance; index < run.firstInstance + run.count; index += 1) {
      const bytes = run.layer.segments.readRecord(run.layer.segments.handleAt(index))
      const words = new Uint32Array(bytes.buffer, bytes.byteOffset, 8)
      const floats = new Float32Array(bytes.buffer, bytes.byteOffset, 8)
      const style = run.layer.styles.handleForSlot(words[4]!)!
      expect(style.generation).toBe(words[5]!)
      segments.push({points: Array.from(floats.slice(0, 4)), style: Array.from(run.layer.styles.readRecord(style))})
    }
    return {segments, position: run.position.toArray(), scale: run.scale.toArray(), visible: run.visible}
  })
}

function paths(frame: RenderFrame) {
  return frame.displayList.filter(item => item.kind === "path").map(item => ({
    key: item.key, id: item.node.getAttribute("data-link-id"), geometry: item.geometry,
    transform: item.presentationOwner === null || item.presentationOwner === undefined ? item.transform : frame.presentationTransforms?.get(item.presentationOwner),
  }))
}

test("[GRAPH-LINK-RESTORATION] measured links возвращаются после pan out/back без zoom и совпадают с fresh Renderer/backend", () => {
  const document = createDocument()
  const owner = document.createElement("div")
  owner.setAttribute("style", "width:500px;height:300px")
  document.append(owner)
  const component = createRoot(owner)
  const options = {document, root: owner, viewport: {width: 500, height: 300}, textMeasurer: {measureTextAdvance: (text: string) => text.length * 6}}
  const renderer = createDocumentRenderer(options)
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  let computations = 0
  const layout: GraphLayoutComputer = nodes => {
    computations += 1
    return {bounds: {x: 0, y: 0, width: 8000, height: 500},
      nodes: nodes.map((node, index) => ({...node, x: index * 500, y: 10})),
      links: Array.from({length: 20}, (_, index) => ({id: `edge-${index}`, title: `Связь ${index}`,
        route: createCubicLinkRoute([{startPoint: {x: index * 400, y: 150}, controlPoints: [{x: index * 400 + 100, y: 100}, {x: index * 400 + 200, y: 200}], endPoint: {x: index * 400 + 300, y: 150}}]),
      })),
    }
  }
  const props: GraphViewProps = {input: graphInput(), layout, width: 500, height: 300, controls: false, navigation: "pan-zoom", overscan: 0}
  const render = (x: number) => {
    component.render(GraphView as unknown as CompiledTemplate<GraphViewProps>, {...props, transform: {x, y: 0, scale: .41}})
    for (let pass = 0; pass < 15; pass += 1) {
      component.flush()
      renderer.flush()
      if (!flushDocumentLayoutObservers(document)) break
    }
    const frame = renderer.flush()
    if (x === -10000) expect(paths(frame)).toHaveLength(0)
    backend.applyFrame(frame)
    const freshRenderer = createDocumentRenderer({...options, registerGeometry: false})
    const freshBackend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
    try {
      const fresh = freshRenderer.flush()
      expect(paths(frame).map(path => path.id), `pan x=${x}: retained paths`).toEqual(paths(fresh).map(path => path.id))
      expect(paths(frame)).toEqual(paths(fresh))
      freshBackend.applyFrame(fresh)
      expect(pathRecords(backend)).toEqual(pathRecords(freshBackend))
    } finally {
      freshBackend.dispose()
      freshRenderer.dispose()
    }
    return frame
  }
  try {
    const initial = render(0)
    const links = [...owner.querySelectorAll("[data-link-id]")]
    const count = computations
    expect(links).toHaveLength(20)
    const initialPaths = paths(initial)
    expect(initialPaths).toHaveLength(4)
    expect(links.filter(link => link.hasAttribute("hidden"))).toHaveLength(16)
    for (const x of [-1000, -2000, -10000, -2000, -1000, 0, -10000, 0]) render(x)
    const restored = render(0)
    expect(paths(restored)).toEqual(initialPaths)
    expect(computations).toBe(count)
    const restoredLinks = [...owner.querySelectorAll("[data-link-id]")]
    expect(restoredLinks).toHaveLength(links.length)
    for (const [index, link] of restoredLinks.entries()) expect(link).toBe(links[index]!)
    for (const path of restored.displayList.filter(item => item.kind === "path")) expect(path.node.hasAttribute("hidden")).toBe(false)
  } finally {
    backend.dispose()
    renderer.dispose()
    component.unmount()
  }
}, 30000)
