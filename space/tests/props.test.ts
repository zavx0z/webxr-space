import {afterAll, beforeAll, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createRoot} from "@zavx0z/component"
import {createDocument} from "@zavx0z/dom"
import {Object3D, Quaternion, Vector3} from "@zavx0z/engine"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createSpaceElementFactories, type XRObjectElement, type XRViewPointElement} from "../src/index.ts"
import type {GroupProps} from "../abstractions/group.tsx"

let directory = ""
const templates = new Map<string, CompiledTemplate<any>>()
const entries = [
  ["abstractions/asset", "Asset"], ["abstractions/group", "Group"],
  ["abstractions/text", "Text"], ["shapes/mesh", "Mesh"],
  ["shapes/line", "Line"], ["shapes/line-segments", "LineSegments"],
  ["staging/light", "Light"], ["gizmos/grid", "Grid"],
  ["cameras/view-point", "ViewPoint"],
] as const

beforeAll(async () => {
  const space = resolve(import.meta.dir, "..")
  directory = await mkdtemp(join(import.meta.dir, ".props-"))
  const result = await Bun.build({
    entrypoints: entries.map(([path]) => join(space, `${path}.tsx`)),
    outdir: directory,
    target: "bun",
    external: ["@zavx0z/component", "@zavx0z/dom", "@zavx0z/engine", "@zavx0z/template/compiled"],
    plugins: [createTemplateJsxBunPlugin({cwd: resolve(space, ".."), sourceRoots: [space]})],
  })
  if (!result.success) throw new AggregateError(result.logs, "Space props compilation failed")
  for (const output of result.outputs.filter(output => output.kind === "entry-point")) {
    const module = await import(pathToFileURL(output.path).href)
    for (const [, name] of entries) if (module[name]) templates.set(name, module[name])
  }
}, 30_000)

afterAll(async () => {
  if (directory) await rm(directory, {recursive: true, force: true})
})

const factory = () => new Object3D()

test("every spatial object uses the same position, Blender XYZ degrees, quaternion and scale contract", () => {
  for (const [, name] of entries.filter(([, name]) => name !== "ViewPoint")) {
    const document = createDocument({elementFactories: createSpaceElementFactories()})
    const root = createRoot(document)
    const ref = {current: null as XRObjectElement | null}
    const props = {factory, ref, position: {x: 100, y: -200, z: 300}, rotation: {x: 90, y: 90, z: 0}, scale: {x: 2, y: 3, z: -1}}
    root.render(templates.get(name)!, props)
    const element = ref.current!
    expect([element.x, element.y, element.z]).toEqual([100, -200, 300])
    expect([element.scaleX, element.scaleY, element.scaleZ]).toEqual([2, 3, -1])
    const q = new Quaternion(element.quaternionX, element.quaternionY, element.quaternionZ, element.quaternionW)
    // X then Y: local +Y becomes +X. Reversing the Euler order gives +Z.
    const direction = new Vector3(0, 1, 0).applyQuaternion(q)
    expect(direction.x).toBeCloseTo(1)
    expect(direction.y).toBeCloseTo(0)
    expect(direction.z).toBeCloseTo(0)
    element.x = 999
    root.render(templates.get(name)!, {...props, position: {...props.position}, rotation: {...props.rotation}, scale: {...props.scale}})
    expect(ref.current).toBe(element)
    expect(element.x).toBe(999)
    root.render(templates.get(name)!, {factory, ref, quaternion: {x: 2, y: 0, z: 0, w: 2}})
    expect(element.quaternionX).toBeCloseTo(Math.SQRT1_2)
    expect(element.quaternionW).toBeCloseTo(Math.SQRT1_2)
    expect([element.x, element.scaleX, element.scaleY, element.scaleZ]).toEqual([0, 1, 1, 1])
    root.render(templates.get(name)!, {factory, ref})
    expect([element.quaternionX, element.quaternionY, element.quaternionZ, element.quaternionW]).toEqual([0, 0, 0, 1])
    root.unmount()
    expect(ref.current).toBeNull()
  }
})

test("camera target is a whole vector; fresh equal props preserve dolly state and ref identity", () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const root = createRoot(document)
  const ref = {current: null as XRViewPointElement | null}
  const props = {position: {x: 0, y: -1600, z: 900}, target: {x: 0, y: 0, z: 900}, ref}
  root.render(templates.get("ViewPoint")!, props)
  const camera = ref.current!
  camera.saveState()
  camera.dollyTo(600)
  root.render(templates.get("ViewPoint")!, {...props, position: {...props.position}, target: {...props.target}})
  expect(ref.current).toBe(camera)
  expect(camera.y).toBe(-600)
  camera.reset()
  expect(camera.y).toBe(-1600)
  root.render(templates.get("ViewPoint")!, {...props, target: {x: 100, y: 200, z: 300}})
  expect([camera.targetX, camera.targetY, camera.targetZ]).toEqual([100, 200, 300])
  root.unmount()
})

test("invalid transforms leave the mounted spatial object unchanged", () => {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const root = createRoot(document)
  const ref = {current: null as XRObjectElement | null}
  const props = {factory, ref, position: {x: 100, y: 200, z: 300}}
  root.render(templates.get("Group")!, props)
  const element = ref.current!
  for (const invalid of [
    {position: {x: NaN, y: 0, z: 0}},
    {rotation: {x: Infinity, y: 0, z: 0}},
    {scale: {x: 0, y: 1, z: 1}},
    {quaternion: {x: 0, y: 0, z: 0, w: 0}},
    {rotation: {x: 0, y: 0, z: 0}, quaternion: {x: 0, y: 0, z: 0, w: 1}},
  ]) {
    expect(() => root.render(templates.get("Group")!, {...props, ...invalid})).toThrow()
    expect(ref.current).toBe(element)
    expect([element.x, element.y, element.z]).toEqual([100, 200, 300])
  }
  root.unmount()
})

// Compile-time guards: the public author API has no scalar transform or projection aliases.
const acceptsGroup = (_props: GroupProps) => {}
if (false) {
  // @ts-expect-error A position is one complete vector.
  acceptsGroup({x: 1})
  // @ts-expect-error Orientation has exactly one author representation.
  acceptsGroup({rotation: {x: 0, y: 0, z: 0}, quaternion: {x: 0, y: 0, z: 0, w: 1}})
}
