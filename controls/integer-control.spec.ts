import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {
  createDocumentInteractionController,
  createDocumentRenderer
} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {IntegerControl} from "./integer-control.tsx"

describe("compiled production IntegerControl", () => {
  test("keeps one fractional integer accumulator across pointer segmentation", () => {
    const run = (segments: number): number[] => {
      const document = createDocument()
      const host = document.createElement("main")
      document.appendChild(host)
      const root = createRoot(host)
      const values: number[] = []
      root.render(IntegerControl as any, {
        value: 3,
        min: 0,
        max: 100,
        softMin: 0,
        softMax: 100,
        step: 1,
        onInput: (value: number) => values.push(value)
      })
      const input = host.querySelector("input")!
      const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 60}})
      const frame = renderer.flush()
      const box = frame.boxByNode.get(input)!
      const interaction = createDocumentInteractionController({document})
      const startX = box.x + box.width / 2
      const clientY = box.y + box.height / 2
      interaction.pointerDown(frame, {clientX: startX, clientY, pointerId: 7})
      for (let index = 1; index <= segments; index++) {
        interaction.pointerMove(frame, {
          clientX: startX + 100 * index / segments,
          clientY,
          pointerId: 7,
          shiftKey: true
        } as any)
      }
      interaction.pointerUp(frame, {clientX: startX + 100, clientY, pointerId: 7, shiftKey: true} as any)
      interaction.dispose()
      renderer.dispose()
      root.unmount()
      return values
    }
    expect(run(2).at(-1)).toBe(run(20).at(-1))
    expect(run(2).at(-1)).toBeGreaterThan(3)
  })

  test("composes NumberControl and rounds every proposal", () => {
    expect(isCompiledTemplate(IntegerControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: number[] = []
    root.render(IntegerControl as any, {
      value: 4.6,
      step: 1,
      onInput: (value: number) => proposed.push(value)
    })
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.valueAsNumber).toBe(5)
    input.valueAsNumber = 6.7
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposed).toEqual([7])
    expect(root.stats().mounts).toBe(2)
    root.unmount()
  })
})
