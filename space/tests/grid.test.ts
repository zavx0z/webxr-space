import {afterAll, beforeAll, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createRoot} from "@zavx0z/component"
import {createDocument} from "@zavx0z/dom"
import type {GridHelper} from "@zavx0z/engine"
import {createSpaceElementFactories, XRLineSegmentsElement} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {GridProps} from "../gizmos/grid.tsx"

let directory = ""
let grid: CompiledTemplate<GridProps>

beforeAll(async () => {
  const space = resolve(import.meta.dir, "..")
  directory = await mkdtemp(join(import.meta.dir, ".grid-"))
  const result = await Bun.build({
    entrypoints: [join(space, "gizmos/grid.tsx")],
    outdir: directory,
    target: "bun",
    external: ["@zavx0z/component", "@zavx0z/dom", "@zavx0z/engine", "@zavx0z/template/compiled"],
    plugins: [createTemplateJsxBunPlugin({cwd: resolve(space, ".."), sourceRoots: [space]})],
  })
  if (!result.success) throw new AggregateError(result.logs, "Grid compilation failed")
  const entry = result.outputs.find(output => output.kind === "entry-point")!
  grid = (await import(pathToFileURL(entry.path).href)).Grid
}, 30_000)

afterAll(async () => {
  if (directory) await rm(directory, {recursive: true, force: true})
})

test("Grid создаёт одну сетку XY в мм и сохраняет фабрику при render и перемещении", () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const root = createRoot(document)
  const ref = {current: null as XRLineSegmentsElement | null}
  root.render(grid, {size: 2400, divisions: 24, ref})
  const element = ref.current!
  expect(element).toBeInstanceOf(XRLineSegmentsElement)
  expect(element.ownerDocument).toBe(document)
  const factory = element.factory as () => GridHelper
  const projection = factory()
  const positions = projection.geometry.attributes.position!.array
  expect(positions.length).toBe(25 * 4 * 3)
  for (let index = 2; index < positions.length; index += 3) expect(positions[index]).toBe(0)
  expect(Math.min(...positions)).toBe(-1200)
  expect(Math.max(...positions)).toBe(1200)
  for (let index = 0; index < 10; index++) root.render(grid, {size: 2400, divisions: 24, position: {x: index, y: 0, z: 0}, ref})
  expect(ref.current).toBe(element)
  expect(element.factory).toBe(factory)
  expect(element.x).toBe(9)
  root.render(grid, {size: 4800, divisions: 24, ref})
  expect(element.factory).not.toBe(factory)
  expect(ref.current).toBe(element)
  const resized = (element.factory as () => GridHelper)()
  expect(Math.max(...resized.geometry.attributes.position!.array)).toBe(2400)
  root.unmount()
  expect(ref.current).toBeNull()
})

test("Grid отклоняет недопустимые параметры без замены прежнего элемента", () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const root = createRoot(document)
  root.render(grid, {size: 2400, divisions: 24})
  const element = document.querySelector("xr-line-segments") as XRLineSegmentsElement
  const factory = element.factory
  for (const props of [{size: 0}, {size: Infinity}, {divisions: 0}, {divisions: 1.5}, {colorGrid: -1}]) {
    expect(() => root.render(grid, props)).toThrow(RangeError)
    expect(document.querySelector("xr-line-segments")).toBe(element)
    expect(element.factory).toBe(factory)
  }
  root.unmount()
})
