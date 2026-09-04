import {expect, test} from "bun:test"
import {createDocument} from "../../dom/src/index.ts"
import {createDocumentRenderer} from "../src/index.ts"

const root = `${import.meta.dir}/..`

const createOverflowFrame = () => {
  const document = createDocument()
  const rootElement = document.createElement("div")
  const child = document.createElement("div")
  rootElement.setAttribute(
    "style",
    "width: 100px; height: 50px; overflow: auto; background: #ff0000",
  )
  child.setAttribute("style", "width: 200px; height: 100px")
  rootElement.appendChild(child)
  document.appendChild(rootElement)
  const renderer = createDocumentRenderer({
    document,
    root: rootElement,
    viewport: {width: 300, height: 200},
  })
  return {child, document, frame: renderer.flush(), renderer, rootElement}
}

test("[REN-001] Renderer рассчитывает CSS и итоговые размеры элементов на CPU", () => {
  const {frame, renderer, rootElement} = createOverflowFrame()
  expect(frame.boxByNode.get(rootElement)).toMatchObject({width: 100, height: 50})
  renderer.dispose()
})

test("[REN-002] Renderer рассчитывает раскладку и прокрутку на CPU", () => {
  const {frame, renderer, rootElement} = createOverflowFrame()
  expect(frame.scrolls.get(rootElement)).toMatchObject({
    clientWidth: 100,
    clientHeight: 50,
    scrollWidth: 200,
    scrollHeight: 100,
    maxScrollLeft: 100,
    maxScrollTop: 50,
  })
  renderer.dispose()
})

test("[REN-003] Renderer формирует список рисования и области попадания", () => {
  const {frame, renderer, rootElement} = createOverflowFrame()
  expect(frame.displayList.some(item => item.node === rootElement && item.kind === "rect")).toBe(true)
  expect(frame.hits.has(rootElement)).toBe(true)
  renderer.dispose()
})

test("[REN-004] Renderer не владеет GPU-ресурсами и не выполняет отрисовку на видеокарте", async () => {
  const files = await Array.fromAsync(new Bun.Glob("src/**/*.ts").scan({cwd: root}))
  const source = (await Promise.all(files.map(file => Bun.file(`${root}/${file}`).text()))).join("\n")
  expect(source).not.toMatch(/\bGPU(?:Device|Buffer|Texture|RenderPipeline|CanvasContext)\b/u)
  expect(source).not.toContain("navigator.gpu")
  expect(files.some(file => file.endsWith(".wgsl"))).toBe(false)
})

test("[REN-005] указатель Select является векторным Path, а не текстовым глифом", () => {
  const document = createDocument()
  const select = document.createElement("select")
  const option = document.createElement("option")
  option.value = "output"
  option.textContent = "Output"
  option.selected = true
  select.setAttribute("style", "width: 180px; height: 22px")
  select.append(option)
  document.append(select)
  const renderer = createDocumentRenderer({
    document,
    root: select,
    viewport: {width: 300, height: 100},
  })

  const frame = renderer.flush()
  const indicator = frame.displayList.find(item =>
    item.node === select && item.key === "disclosure-indicator")
  expect(indicator?.kind).toBe("path")
  expect(frame.displayList.some(item =>
    item.node === select && item.key === "disclosure-indicator" && item.kind === "text"))
    .toBe(false)

  renderer.dispose()
})
