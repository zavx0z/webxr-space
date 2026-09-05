import {expect, test} from "bun:test"
import {createDocument} from "../../dom/src/index.ts"
import {createDocumentRenderer} from "../src/index.ts"

test("font family, weight and style reach both measurement and display fragments", () => {
  const document = createDocument()
  const paragraph = document.createElement("p")
  paragraph.setAttribute("style", "display:block;width:200px;font-size:10px;font-family:monospace")
  const strong = document.createElement("strong")
  const emphasis = document.createElement("em")
  emphasis.textContent = "value"
  strong.append(emphasis)
  paragraph.append(strong)
  document.append(paragraph)
  const measured: unknown[] = []
  const renderer = createDocumentRenderer({
    document, root: paragraph, viewport: {width: 200, height: 200},
    textMeasurer: {
      measureTextAdvance(value, _size, _spacing, font) { measured.push(font); return value.length * 6 },
    },
  })
  try {
    const frame = renderer.flush()
    expect(measured).toContainEqual(expect.objectContaining({fontFamily: "monospace", fontWeight: 700, fontStyle: "italic"}))
    expect(frame.displayList.find(item => item.kind === "text")).toMatchObject({fontFamily: "monospace", fontWeight: 700, fontStyle: "italic"})
  } finally { renderer.dispose() }
})

test("natural image dimensions preserve aspect ratio under an authored width and max-width", () => {
  const document = createDocument()
  const container = document.createElement("div")
  container.setAttribute("style", "display:block;width:200px")
  const image = document.createElement("img")
  image.src = "picture.gif"
  image.width = 444
  image.setAttribute("style", "max-width:100%;object-fit:contain")
  container.append(image)
  document.append(container)
  let loaded = false
  const renderer = createDocumentRenderer({
    document, root: container, viewport: {width: 200, height: 400},
    imageMeasurer: {measureImage: () => loaded ? {width: 640, height: 360} : null},
  })
  try {
    renderer.flush()
    loaded = true
    renderer.invalidate(image)
    const frame = renderer.flush()
    expect(frame.boxByNode.get(image)).toMatchObject({width: 200, height: 112.5})
    expect(frame.displayList.find(item => item.kind === "image")).toMatchObject({width: 200, height: 112.5, src: "picture.gif"})
  } finally { renderer.dispose() }
})
