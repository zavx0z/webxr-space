/** The draw commands shared by a render pass and a render bundle. */
export interface RenderCommandEncoder {
  setPipeline(pipeline: GPURenderPipeline): void
  setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets?: readonly number[]): void
  setVertexBuffer(slot: number, buffer: GPUBuffer, offset?: number, size?: number): void
  setIndexBuffer(buffer: GPUBuffer, format: GPUIndexFormat, offset?: number, size?: number): void
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void
  drawIndexed(indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number): void
}

export type RenderBundleLayout = Readonly<{
  colorFormat: GPUTextureFormat
  depthStencilFormat: GPUTextureFormat
  sampleCount: number
}>

type Token = number | string | GPUBuffer | GPUBindGroup | GPURenderPipeline | undefined

const PIPELINE = 0
const BIND_GROUP = 1
const VERTEX_BUFFER = 2
const INDEX_BUFFER = 3
const DRAW = 4
const DRAW_INDEXED = 5
const MAX_RETAINED_TOKENS = 131072

/**
 * Retains one exact command sequence, never the pixels or resource contents.
 *
 * The caller still synchronizes resources and records every live draw. Numeric
 * arguments are copied into a reusable tape; GPU objects compare by identity.
 * A changed sequence is encoded directly. Only a second consecutive identical
 * sequence is promoted to a bundle, so moving layers do not allocate throwaway
 * bundles. Buffer content writes keep a stable sequence reusable. A hard tape
 * limit switches to direct encoding without losing the recorded prefix.
 */
export class RenderBundleCache implements RenderCommandEncoder {
  private readonly tokens: Token[] = []
  private cursor = 0
  private changed = false
  private recorded = false
  private bundle: GPURenderBundle | null = null
  private device: GPUDevice | null = null
  private layout: RenderBundleLayout | null = null
  private pass: GPURenderPassEncoder | null = null
  private direct: GPURenderPassEncoder | null = null

  constructor(private readonly maxTokens = MAX_RETAINED_TOKENS) {}

  execute(
    device: GPUDevice,
    layout: RenderBundleLayout,
    pass: GPURenderPassEncoder,
    record: (encoder: RenderCommandEncoder) => void,
  ): void {
    if (this.pass !== null) throw new Error("Render bundle recording is already active")
    if (
      this.device !== device
      || this.layout?.colorFormat !== layout.colorFormat
      || this.layout.depthStencilFormat !== layout.depthStencilFormat
      || this.layout.sampleCount !== layout.sampleCount
    ) {
      this.clear()
      this.device = device
      this.layout = {...layout}
    }
    this.cursor = 0
    this.changed = false
    this.pass = pass
    this.direct = null
    try {
      record(this)
      if (this.direct !== null) return
      if (this.tokens.length !== this.cursor) this.changed = true
      this.tokens.length = this.cursor
      if (!this.recorded || this.changed) {
        this.bundle = null
        this.recorded = true
        this.replay(pass, this.cursor)
        return
      }
      if (this.bundle === null) {
        const encoder = device.createRenderBundleEncoder({
          colorFormats: [layout.colorFormat],
          depthStencilFormat: layout.depthStencilFormat,
          sampleCount: layout.sampleCount,
          depthReadOnly: false,
          stencilReadOnly: false,
        })
        this.replay(encoder, this.cursor)
        this.bundle = encoder.finish()
      }
      pass.executeBundles([this.bundle])
    } catch (error) {
      // A failed recording may already have changed the tape. It must never
      // compare equal to the previously finished bundle on a later retry.
      this.clear()
      throw error
    } finally {
      this.pass = null
      this.direct = null
    }
  }

  clear(): void {
    this.tokens.length = 0
    this.recorded = false
    this.bundle = null
    this.device = null
    this.layout = null
  }

  setPipeline(pipeline: GPURenderPipeline): void {
    if (!this.reserve(2)) return this.direct!.setPipeline(pipeline)
    this.write(PIPELINE)
    this.write(pipeline)
  }

  setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets: readonly number[] = []): void {
    if (!this.reserve(4 + dynamicOffsets.length)) {
      return this.direct!.setBindGroup(index, bindGroup, dynamicOffsets)
    }
    this.write(BIND_GROUP)
    this.write(index)
    this.write(bindGroup)
    this.write(dynamicOffsets.length)
    for (const offset of dynamicOffsets) this.write(offset)
  }

  setVertexBuffer(slot: number, buffer: GPUBuffer, offset = 0, size?: number): void {
    if (!this.reserve(5)) return this.direct!.setVertexBuffer(slot, buffer, offset, size)
    this.write(VERTEX_BUFFER)
    this.write(slot)
    this.write(buffer)
    this.write(offset)
    this.write(size)
  }

  setIndexBuffer(buffer: GPUBuffer, format: GPUIndexFormat, offset = 0, size?: number): void {
    if (!this.reserve(5)) return this.direct!.setIndexBuffer(buffer, format, offset, size)
    this.write(INDEX_BUFFER)
    this.write(buffer)
    this.write(format)
    this.write(offset)
    this.write(size)
  }

  draw(vertexCount: number, instanceCount = 1, firstVertex = 0, firstInstance = 0): void {
    if (!this.reserve(5)) return this.direct!.draw(vertexCount, instanceCount, firstVertex, firstInstance)
    this.write(DRAW)
    this.write(vertexCount)
    this.write(instanceCount)
    this.write(firstVertex)
    this.write(firstInstance)
  }

  drawIndexed(indexCount: number, instanceCount = 1, firstIndex = 0, baseVertex = 0, firstInstance = 0): void {
    if (!this.reserve(6)) return this.direct!.drawIndexed(indexCount, instanceCount, firstIndex, baseVertex, firstInstance)
    this.write(DRAW_INDEXED)
    this.write(indexCount)
    this.write(instanceCount)
    this.write(firstIndex)
    this.write(baseVertex)
    this.write(firstInstance)
  }

  private reserve(count: number): boolean {
    if (this.direct !== null) return false
    if (this.cursor + count <= this.maxTokens) return true
    this.direct = this.pass!
    this.replay(this.direct, this.cursor)
    this.clear()
    return false
  }

  private write(value: Token): void {
    if (!Object.is(this.tokens[this.cursor], value)) this.changed = true
    this.tokens[this.cursor++] = value
  }

  private replay(encoder: RenderCommandEncoder, length: number): void {
    const tokens = this.tokens
    let cursor = 0
    while (cursor < length) {
      switch (tokens[cursor++]) {
        case PIPELINE:
          encoder.setPipeline(tokens[cursor++] as GPURenderPipeline)
          break
        case BIND_GROUP: {
          const index = tokens[cursor++] as number
          const bindGroup = tokens[cursor++] as GPUBindGroup
          const count = tokens[cursor++] as number
          const offsets = tokens.slice(cursor, cursor + count) as number[]
          cursor += count
          encoder.setBindGroup(index, bindGroup, offsets)
          break
        }
        case VERTEX_BUFFER:
          encoder.setVertexBuffer(
            tokens[cursor++] as number,
            tokens[cursor++] as GPUBuffer,
            tokens[cursor++] as number,
            tokens[cursor++] as number | undefined,
          )
          break
        case INDEX_BUFFER:
          encoder.setIndexBuffer(
            tokens[cursor++] as GPUBuffer,
            tokens[cursor++] as GPUIndexFormat,
            tokens[cursor++] as number,
            tokens[cursor++] as number | undefined,
          )
          break
        case DRAW:
          encoder.draw(
            tokens[cursor++] as number,
            tokens[cursor++] as number,
            tokens[cursor++] as number,
            tokens[cursor++] as number,
          )
          break
        case DRAW_INDEXED:
          encoder.drawIndexed(
            tokens[cursor++] as number,
            tokens[cursor++] as number,
            tokens[cursor++] as number,
            tokens[cursor++] as number,
            tokens[cursor++] as number,
          )
          break
        default:
          throw new Error("Invalid retained render command")
      }
    }
  }
}
