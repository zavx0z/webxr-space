import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentRenderer, createDocumentInteractionController, createDocumentInteractionState} from "../src/index.ts"

function fixture(styleSheets: readonly string[]) {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:200px;height:100px;overflow:auto")
  const spans = Array.from({length: 20}, (_, index) => {
    const paragraph = document.createElement("p")
    paragraph.className = "row"
    paragraph.setAttribute("style", "display:block;width:200px;height:40px;margin:0;line-height:20px")
    const span = document.createElement("span")
    span.textContent = `Paragraph ${index}`
    paragraph.append(span)
    root.append(paragraph)
    return span
  })
  document.append(root)
  const interactionState = createDocumentInteractionState(document)
  let measurements = 0
  const renderer = createDocumentRenderer({document, root, viewport: {width:200,height:100}, styleSheets, interactionState,
    textMeasurer: {measureTextAdvance(text) {
      measurements++
      return text.length * 6
    }},
  })
  const interaction = createDocumentInteractionController({document, interactionState})
  return {document, root, spans, renderer, interaction, interactionState,
    measurements: () => measurements,
    resetMeasurements() { measurements = 0 },
    dispose() {
      interaction.dispose()
      renderer.dispose()
    },
  }
}

test("stationary-pointer hover during scrolling retains layout without matching pointer CSS", () => {
  const f = fixture([".unrelated:hover { font-size: 30px } .unrelated :hover { line-height: 40px } button:active { padding: 20px }"])
  let entered = 0
  let left = 0
  f.spans[0]!.addEventListener("pointerleave", () => { left++ })
  f.spans[1]!.addEventListener("pointerenter", () => { entered++ })
  try {
    let frame = f.renderer.flush()
    f.interaction.pointerMove(frame, {clientX:40,clientY:15})
    frame = f.interaction.composeFrame(f.renderer.flush())
    expect(f.interactionState.isHovered(f.spans[0]!)).toBe(true)
    f.resetMeasurements()
    f.interaction.wheel(frame, {clientX:40,clientY:15,deltaY:40})
    const scrolled = f.renderer.flush()
    f.interaction.composeFrame(scrolled)
    expect(f.renderer.flush() === scrolled).toBe(true)
    expect(f.measurements()).toBe(0)
    expect(f.interactionState.isHovered(f.spans[0]!)).toBe(false)
    expect(f.interactionState.isHovered(f.spans[1]!)).toBe(true)
    expect({entered,left}).toEqual({entered:1,left:1})
  } finally { f.dispose() }
})

test("matching ancestor hover and active selectors still update descendants", () => {
  const f = fixture([".row:hover span { font-size: 22px } .row:active span { color: #ff0000 }"])
  try {
    f.interaction.pointerMove(f.renderer.flush(), {clientX:40,clientY:15})
    let frame = f.renderer.flush()
    const text = (index: number) => {
      const item = frame.displayList.find(item => item.kind === "text" && item.node === f.spans[index]!.firstChild)
      return item?.kind === "text" ? {fontSize:item.fontSize,color:item.color} : null
    }
    expect(text(0)).toMatchObject({fontSize:22})
    f.interaction.wheel(frame, {clientX:40,clientY:15,deltaY:40})
    f.interaction.composeFrame(f.renderer.flush())
    frame = f.renderer.flush()
    expect(text(0)).toMatchObject({fontSize:16})
    expect(text(1)).toMatchObject({fontSize:22})
    f.interactionState.setActiveElement(f.spans[1]!)
    frame = f.renderer.flush()
    expect(text(1)).toMatchObject({color:"#ff0000"})
    f.interactionState.setActiveElement(null)
    frame = f.renderer.flush()
    expect(text(1)?.color !== "#ff0000").toBe(true)
  } finally { f.dispose() }
})
