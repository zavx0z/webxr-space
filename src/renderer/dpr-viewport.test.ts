import {describe, expect, test} from "bun:test"
import {Renderer} from "./index"

describe("Renderer backing viewport", () => {
  test("uses the complete DPR-scaled backing store for every render pass", () => {
    const renderer = new Renderer()
    const canvas = {width: 300, height: 150}
    ;(renderer as unknown as {canvas: typeof canvas}).canvas = canvas
    renderer.setPixelRatio(2)
    renderer.setSize(1_280, 720)
    const viewports: number[][] = []
    const scissors: number[][] = []
    const pass = {
      setViewport(...values: number[]) { viewports.push(values) },
      setScissorRect(...values: number[]) { scissors.push(values) },
    } as unknown as GPURenderPassEncoder

    ;(renderer as unknown as {configurePassViewport(owner: GPURenderPassEncoder): void})
      .configurePassViewport(pass)

    expect(canvas).toEqual({width: 2_560, height: 1_440})
    expect(viewports).toEqual([[0, 0, 2_560, 1_440, 0, 1]])
    expect(scissors).toEqual([[0, 0, 2_560, 1_440]])
  })

  test("keeps a minimum valid viewport for a temporarily collapsed canvas", () => {
    const renderer = new Renderer()
    ;(renderer as unknown as {canvas: {width: number; height: number}}).canvas = {
      width: 0,
      height: 0,
    }
    const viewports: number[][] = []
    const scissors: number[][] = []
    const pass = {
      setViewport(...values: number[]) { viewports.push(values) },
      setScissorRect(...values: number[]) { scissors.push(values) },
    } as unknown as GPURenderPassEncoder

    ;(renderer as unknown as {configurePassViewport(owner: GPURenderPassEncoder): void})
      .configurePassViewport(pass)

    expect(viewports).toEqual([[0, 0, 1, 1, 0, 1]])
    expect(scissors).toEqual([[0, 0, 1, 1]])
  })
})
