import {expect, test} from "bun:test"
import {Object3D} from "@zavx0z/engine"
import {Renderer} from "../src/renderer/index.ts"
import {
  RenderBundleCache,
  type RenderBundleLayout,
  type RenderCommandEncoder,
} from "../src/renderer/render-bundle-cache.ts"

type Command = readonly [string, ...unknown[]]
type FakeBundle = GPURenderBundle & {commands: Command[]}

function commandEncoder(commands: Command[]): RenderCommandEncoder {
  return {
    setPipeline: pipeline => commands.push(["pipeline", pipeline]),
    setBindGroup: (index, group, offsets = []) => commands.push(["bind", index, group, [...offsets]]),
    setVertexBuffer: (slot, buffer, offset = 0, size) => commands.push(["vertex", slot, buffer, offset, size]),
    setIndexBuffer: (buffer, format, offset = 0, size) => commands.push(["index", buffer, format, offset, size]),
    draw: (count, instances = 1, first = 0, firstInstance = 0) => commands.push(["draw", count, instances, first, firstInstance]),
    drawIndexed: (count, instances = 1, first = 0, base = 0, firstInstance = 0) =>
      commands.push(["indexed", count, instances, first, base, firstInstance]),
  }
}

function gpu() {
  const bundles: FakeBundle[] = []
  const descriptors: GPURenderBundleEncoderDescriptor[] = []
  const direct: Command[] = []
  const executions: FakeBundle[] = []
  const passEvents: Command[] = []
  const device = {
    queue: {writeBuffer() {}},
    createRenderBundleEncoder(descriptor: GPURenderBundleEncoderDescriptor) {
      descriptors.push(descriptor)
      const commands: Command[] = []
      return {
        ...commandEncoder(commands),
        finish() {
          const bundle = {commands} as FakeBundle
          bundles.push(bundle)
          return bundle
        },
      }
    },
  } as unknown as GPUDevice
  const pass = {
    ...commandEncoder(direct),
    executeBundles(values: FakeBundle[]) {
      executions.push(...values)
      passEvents.push(["execute", ...values])
    },
    setViewport: (...args: number[]) => passEvents.push(["viewport", ...args]),
    setScissorRect: (...args: number[]) => passEvents.push(["scissor", ...args]),
    setStencilReference: (value: number) => passEvents.push(["stencil", value]),
    end: () => passEvents.push(["end"]),
  } as unknown as GPURenderPassEncoder
  return {device, pass, bundles, descriptors, direct, executions, passEvents}
}

const layout: RenderBundleLayout = {
  colorFormat: "bgra8unorm",
  depthStencilFormat: "depth24plus-stencil8",
  sampleCount: 4,
}

function inputs() {
  return {
    pipeline: {} as GPURenderPipeline,
    group: {} as GPUBindGroup,
    vertex: {contents: 10} as unknown as GPUBuffer,
    index: {} as GPUBuffer,
    groupIndex: 1,
    offsets: [256, 16384],
    vertexSlot: 0,
    vertexOffset: 4,
    vertexSize: 128 as number | undefined,
    indexFormat: "uint16" as GPUIndexFormat,
    indexOffset: 2,
    indexSize: 96 as number | undefined,
    count: 12,
    instances: 2,
    first: 3,
    base: -2,
    firstInstance: 4,
  }
}

function record(input: ReturnType<typeof inputs>, encoder: RenderCommandEncoder): void {
  encoder.setPipeline(input.pipeline)
  encoder.setBindGroup(input.groupIndex, input.group, input.offsets)
  encoder.setVertexBuffer(input.vertexSlot, input.vertex, input.vertexOffset, input.vertexSize)
  encoder.setIndexBuffer(input.index, input.indexFormat, input.indexOffset, input.indexSize)
  encoder.draw(input.count, input.instances, input.first, input.firstInstance)
  encoder.drawIndexed(input.count, input.instances, input.first, input.base, input.firstInstance)
}

test("1274 stable draws encode directly once then promote once while every frame synchronizes resources and executes all draws", () => {
  const fake = gpu()
  const cache = new RenderBundleCache()
  const input = inputs()
  let synchronizations = 0
  const paint = (encoder: RenderCommandEncoder) => {
    synchronizations += 1
    encoder.setPipeline(input.pipeline)
    for (let index = 0; index < 1274; index += 1) {
      encoder.setBindGroup(1, input.group, [index * 256, index * 16384])
      encoder.setVertexBuffer(0, input.vertex)
      encoder.setIndexBuffer(input.index, "uint16")
      encoder.drawIndexed(12)
    }
  }
  for (let frame = 0; frame < 10; frame += 1) {
    // GPU resource contents change independently of the encoded commands.
    Object.assign(input.vertex, {contents: frame})
    cache.execute(fake.device, layout, fake.pass, paint)
  }
  expect(synchronizations).toBe(10)
  expect(fake.bundles).toHaveLength(1)
  expect(fake.bundles[0]!.commands).toHaveLength(1 + 1274 * 4)
  expect(fake.executions).toHaveLength(9)
  expect(fake.executions.every(bundle => bundle === fake.bundles[0])).toBe(true)
  expect([...fake.direct, ...fake.executions.flatMap(bundle => bundle.commands)]
    .filter(command => command[0] === "indexed")).toHaveLength(12740)
  expect([...fake.direct, ...fake.bundles.flatMap(bundle => bundle.commands)]
    .filter(command => command[0] === "indexed")).toHaveLength(2548)
  expect(fake.bundles[0]!.commands.find(command => command[0] === "vertex")![2]).toBe(input.vertex)
  expect((input.vertex as unknown as {contents: number}).contents).toBe(9)
  expect(fake.direct).toHaveLength(1 + 1274 * 4)
})

const mutations: [string, (input: ReturnType<typeof inputs>) => void][] = [
  ["pipeline identity", input => { input.pipeline = {} as GPURenderPipeline }],
  ["bind group identity including external texture replacement", input => { input.group = {} as GPUBindGroup }],
  ["bind group index", input => { input.groupIndex += 1 }],
  ["dynamic offset value", input => { input.offsets[0]! += 256 }],
  ["dynamic offset count", input => { input.offsets.pop() }],
  ["vertex buffer identity", input => { input.vertex = {} as GPUBuffer }],
  ["vertex slot", input => { input.vertexSlot += 1 }],
  ["vertex offset", input => { input.vertexOffset += 4 }],
  ["vertex size", input => { input.vertexSize = 64 }],
  ["vertex size omitted", input => { input.vertexSize = undefined }],
  ["index buffer identity", input => { input.index = {} as GPUBuffer }],
  ["index format", input => { input.indexFormat = "uint32" }],
  ["index offset", input => { input.indexOffset += 2 }],
  ["index size", input => { input.indexSize = 64 }],
  ["index size omitted", input => { input.indexSize = undefined }],
  ["draw count", input => { input.count += 1 }],
  ["instance count", input => { input.instances += 1 }],
  ["first vertex/index", input => { input.first += 1 }],
  ["base vertex", input => { input.base -= 1 }],
  ["first instance", input => { input.firstInstance += 1 }],
]

for (const [name, mutate] of mutations) {
  test(`rebuilds on ${name} and reuses only the resulting exact commands`, () => {
    const fake = gpu()
    const cache = new RenderBundleCache()
    const input = inputs()
    const paint = (encoder: RenderCommandEncoder) => record(input, encoder)
    cache.execute(fake.device, layout, fake.pass, paint)
    cache.execute(fake.device, layout, fake.pass, paint)
    mutate(input)
    cache.execute(fake.device, layout, fake.pass, paint)
    cache.execute(fake.device, layout, fake.pass, paint)
    cache.execute(fake.device, layout, fake.pass, paint)
    const expected: Command[] = []
    paint(commandEncoder(expected))
    expect(fake.bundles).toHaveLength(2)
    expect(fake.executions[1]).toBe(fake.executions[2])
    expect(fake.bundles[1]!.commands).toEqual(expected)
    expect(fake.executions[0]).not.toBe(fake.executions[1])
  })
}

test("offsets are snapshots even when the caller reuses and mutates one array during recording", () => {
  const fake = gpu()
  const cache = new RenderBundleCache()
  const group = {} as GPUBindGroup
  const offsets = [256, 16384]
  const paint = (encoder: RenderCommandEncoder) => {
    offsets[0] = 256
    encoder.setBindGroup(1, group, offsets)
    encoder.draw(3)
    offsets[0] = 512
    encoder.setBindGroup(1, group, offsets)
    encoder.draw(6)
    offsets[0] = 9999
  }
  cache.execute(fake.device, layout, fake.pass, paint)
  cache.execute(fake.device, layout, fake.pass, paint)
  expect(fake.bundles).toHaveLength(1)
  expect(fake.bundles[0]!.commands.filter(command => command[0] === "bind").map(command => command[3]))
    .toEqual([[256, 16384], [512, 16384]])
})

test("order changes, removal, empty output and insertion cannot replay old draws", () => {
  const fake = gpu()
  const cache = new RenderBundleCache()
  for (const draws of [[3, 6], [6, 3], [6], [], [9]]) {
    const paint = (encoder: RenderCommandEncoder) => {
      for (const count of draws) encoder.draw(count)
    }
    const before = fake.direct.length
    cache.execute(fake.device, layout, fake.pass, paint)
    expect(fake.direct.slice(before).map(command => command[1])).toEqual(draws)
    cache.execute(fake.device, layout, fake.pass, paint)
    expect(fake.executions.at(-1)!.commands.map(command => command[1])).toEqual(draws)
  }
  expect(fake.bundles).toHaveLength(5)
})

test("color, depth/stencil and sample layout changes recreate compatible bundle encoders", () => {
  const fake = gpu()
  const cache = new RenderBundleCache()
  const variants: RenderBundleLayout[] = [layout,
    {...layout, colorFormat: "rgba8unorm"},
    {...layout, depthStencilFormat: "depth32float-stencil8"},
    {...layout, sampleCount: 1},
  ]
  for (const variant of variants) {
    cache.execute(fake.device, variant, fake.pass, encoder => encoder.draw(3))
    cache.execute(fake.device, variant, fake.pass, encoder => encoder.draw(3))
  }
  expect(fake.descriptors).toEqual(variants.map(variant => ({
    colorFormats: [variant.colorFormat],
    depthStencilFormat: variant.depthStencilFormat,
    sampleCount: variant.sampleCount,
    depthReadOnly: false,
    stencilReadOnly: false,
  })))
})

test("device replacement and explicit release cannot reuse bundles owned by the previous device", () => {
  const first = gpu()
  const second = gpu()
  const cache = new RenderBundleCache()
  const paint = (encoder: RenderCommandEncoder) => encoder.draw(3)
  cache.execute(first.device, layout, first.pass, paint)
  cache.execute(first.device, layout, first.pass, paint)
  cache.execute(second.device, layout, second.pass, paint)
  cache.execute(second.device, layout, second.pass, paint)
  cache.clear()
  cache.execute(second.device, layout, second.pass, paint)
  cache.execute(second.device, layout, second.pass, paint)
  expect(first.bundles).toHaveLength(1)
  expect(second.bundles).toHaveLength(2)
  expect(second.executions).toEqual(second.bundles)
})

test("a throw after mutating the tape discards stale commands and permits a correct retry", () => {
  const fake = gpu()
  const cache = new RenderBundleCache()
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
  expect(() => cache.execute(fake.device, layout, fake.pass, encoder => {
    encoder.draw(6)
    throw new Error("resource synchronization failed")
  })).toThrow("resource synchronization failed")
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(6))
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(6))
  expect(fake.bundles).toHaveLength(2)
  expect(fake.executions).toHaveLength(2)
  expect(fake.executions[1]!.commands).toEqual([["draw", 6, 1, 0, 0]])
})

test("bundle encoder failure resets the tape before a later retry", () => {
  const fake = gpu()
  const cache = new RenderBundleCache()
  const create = fake.device.createRenderBundleEncoder.bind(fake.device)
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
  fake.device.createRenderBundleEncoder = () => { throw new Error("device failure") }
  expect(() => cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))).toThrow("device failure")
  fake.device.createRenderBundleEncoder = create
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
  expect(fake.bundles).toHaveLength(1)
  expect(fake.executions[0]!.commands).toEqual([["draw", 3, 1, 0, 0]])
})

test("hard tape limit replays only the current prefix then directly encodes the rest in order", () => {
  const fake = gpu()
  const cache = new RenderBundleCache(10)
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(99))
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(99))
  fake.direct.length = 0
  const pipeline = {} as GPURenderPipeline
  const paint = (encoder: RenderCommandEncoder) => {
    encoder.setPipeline(pipeline)
    encoder.draw(3)
    encoder.drawIndexed(6, 2, 1, -3, 4)
    encoder.draw(9)
  }
  cache.execute(fake.device, layout, fake.pass, paint)
  const expected: Command[] = []
  paint(commandEncoder(expected))
  expect(fake.direct).toEqual(expected)
  expect(fake.bundles).toHaveLength(1)
  expect(fake.executions).toHaveLength(1)
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(99))
  cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(99))
  expect(fake.bundles).toHaveLength(2)
})

test("production layer integration resets stencil on the pass and preserves background/glass/UI order across reuse", () => {
  const fake = gpu()
  const renderer = new Renderer() as unknown as {
    device: GPUDevice
    canvas: {width: number; height: number}
    presentationFormat: GPUTextureFormat
    backgroundPipeline: GPURenderPipeline
    renderBundleCaches: Map<Object3D, RenderBundleCache>
    renderObjectList(encoder: RenderCommandEncoder, items: {count: number}[], indices: unknown, ui?: boolean): void
    renderPreparedLayer(encoder: GPUCommandEncoder, view: GPUTextureView, prepared: unknown, indices: Map<unknown, unknown>, clear: boolean): void
  }
  renderer.device = fake.device
  renderer.canvas = {width: 320, height: 180}
  renderer.presentationFormat = layout.colorFormat
  renderer.backgroundPipeline = {} as GPURenderPipeline
  let synchronizations = 0
  renderer.renderObjectList = (encoder, items, _indices, ui) => {
    synchronizations += 1
    for (const item of items) encoder.draw(item.count, ui ? 2 : 1)
  }
  const prepared = {
    root: new Object3D(),
    layer: {background: [0, 0, 0, 0], regularObjects: [{count: 6}], glassObjects: [{count: 9}], uiObjects: [{count: 12}]},
    resources: {globalBindGroup: {}, backgroundBindGroup: {}, backgroundUniformBuffer: {}},
    viewport: {x: 4, y: 5, width: 100, height: 80},
    paintBackground: true,
  }
  const command = {beginRenderPass: () => fake.pass} as unknown as GPUCommandEncoder
  const paint = () => renderer.renderPreparedLayer(command, {} as GPUTextureView, prepared, new Map(), true)
  paint()
  paint()
  expect(fake.bundles).toHaveLength(1)
  expect(synchronizations).toBe(6)
  expect(fake.bundles[0]!.commands.filter(value => value[0] === "draw").map(value => value.slice(1, 3)))
    .toEqual([[3, 1], [6, 1], [9, 1], [12, 2]])
  expect(fake.passEvents.map(event => event[0])).toEqual([
    "viewport", "scissor", "stencil", "end",
    "viewport", "scissor", "stencil", "execute", "end",
  ])
  expect(fake.passEvents.filter(event => event[0] === "stencil")).toEqual([["stencil", 0], ["stencil", 0]])
  expect(fake.descriptors[0]!.sampleCount).toBe(4)

  for (let index = 0; index < 40; index += 1) {
    prepared.root = new Object3D()
    paint()
  }
  expect(renderer.renderBundleCaches.size).toBe(32)
  expect(fake.direct.length).toBeGreaterThan(0)
})

test("production composition pruning releases removed/empty layers and keeps live or background-only layers", () => {
  const fake = gpu()
  const renderer = new Renderer() as unknown as {
    renderBundleCaches: Map<Object3D, RenderBundleCache>
    pruneRenderBundleCaches(layers: unknown[]): void
  }
  const removed = new Object3D()
  const empty = new Object3D()
  const live = new Object3D()
  const background = new Object3D()
  const caches = [removed, empty, live, background].map(root => {
    const cache = new RenderBundleCache()
    cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
    cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
    renderer.renderBundleCaches.set(root, cache)
    return cache
  })
  const emptyLayer = {regularObjects: [], glassObjects: [], uiObjects: []}
  renderer.pruneRenderBundleCaches([
    {root: empty, paintBackground: false, layer: emptyLayer},
    {root: live, paintBackground: false, layer: {...emptyLayer, regularObjects: [{}]}},
    {root: background, paintBackground: true, layer: emptyLayer},
  ])
  expect([...renderer.renderBundleCaches.keys()]).toEqual([live, background])
  // Even a held external reference cannot retain/reuse the released bundle.
  for (const cache of caches) {
    cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
    cache.execute(fake.device, layout, fake.pass, encoder => encoder.draw(3))
  }
  expect(fake.bundles).toHaveLength(6)
  expect(fake.executions[6]).toBe(fake.executions[2])
  expect(fake.executions[7]).toBe(fake.executions[2])
  expect(fake.executions[8]).toBe(fake.executions[3])
  expect(fake.executions[9]).toBe(fake.executions[3])
})

test("a continuously changing layer creates zero bundles and promotes only after its commands settle", () => {
  const fake = gpu()
  const cache = new RenderBundleCache()
  const input = inputs()
  for (let frame = 0; frame < 1500; frame += 1) {
    input.offsets[0] = frame * 256
    input.firstInstance = frame % 9
    const expected: Command[] = []
    record(input, commandEncoder(expected))
    const before = fake.direct.length
    cache.execute(fake.device, layout, fake.pass, encoder => record(input, encoder))
    expect(fake.direct.slice(before)).toEqual(expected)
  }
  expect(fake.bundles).toHaveLength(0)
  expect(fake.executions).toHaveLength(0)
  cache.execute(fake.device, layout, fake.pass, encoder => record(input, encoder))
  cache.execute(fake.device, layout, fake.pass, encoder => record(input, encoder))
  expect(fake.bundles).toHaveLength(1)
  expect(fake.executions).toHaveLength(2)
  input.count += 1
  cache.execute(fake.device, layout, fake.pass, encoder => record(input, encoder))
  expect(fake.bundles).toHaveLength(1)
  expect(fake.executions).toHaveLength(2)
  cache.execute(fake.device, layout, fake.pass, encoder => record(input, encoder))
  expect(fake.bundles).toHaveLength(2)
})
