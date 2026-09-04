import {expect, test} from "bun:test"
import {createDocument, type Element} from "../../dom/src/index.ts"
import {createDocumentRenderer, type RenderFrame} from "../src/index.ts"

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

const createScrollFrame = (
  containerStyle: string,
  childStyle: string,
  hostStyle = "width: 300px; height: 200px",
) => {
  const document = createDocument()
  const host = document.createElement("div")
  const container = document.createElement("div")
  const child = document.createElement("div")
  host.setAttribute("style", hostStyle)
  container.setAttribute("style", containerStyle)
  child.setAttribute("style", childStyle)
  container.appendChild(child)
  host.appendChild(container)
  document.appendChild(host)
  const renderer = createDocumentRenderer({
    document,
    root: host,
    viewport: {width: 300, height: 200},
  })
  return {container, frame: renderer.flush(), renderer}
}

const scrollbarKeys = (
  frame: RenderFrame,
  container: Element,
) => frame.displayList
  .filter(item => item.node === container && item.key.startsWith("ua:scrollbar-"))
  .map(item => item.key)

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

test("[REN-006] точное дробное заполнение не создаёт ложную прокрутку", () => {
  const {container, frame, renderer} = createScrollFrame(
    "box-sizing: border-box; width: 100.1px; height: 100.1px; padding: 2px; border: 1px solid #fff; overflow: auto",
    "box-sizing: border-box; width: 100%; height: 100%",
    "box-sizing: border-box; width: 300px; height: 200px; padding-top: 0.1px; padding-left: 0.1px",
  )
  const metrics = frame.scrolls.get(container)

  expect(metrics).toBeDefined()
  expect(metrics?.scrollWidth).toBe(metrics?.clientWidth)
  expect(metrics?.scrollHeight).toBe(metrics?.clientHeight)
  expect(metrics?.maxScrollLeft).toBe(0)
  expect(metrics?.maxScrollTop).toBe(0)
  expect(metrics?.scrollLeft).toBe(0)
  expect(metrics?.scrollTop).toBe(0)
  expect(scrollbarKeys(frame, container)).toEqual([])

  renderer.dispose()
})

test("[REN-007] настоящее малое переполнение сохраняет прокрутку", () => {
  const {container, frame, renderer} = createScrollFrame(
    "width: 100px; height: 50px; overflow: auto",
    "width: 100.001px; height: 50px",
  )
  const metrics = frame.scrolls.get(container)

  expect(metrics).toBeDefined()
  expect(metrics?.scrollWidth).toBeCloseTo(100.001, 9)
  expect(metrics?.maxScrollLeft).toBeGreaterThan(0)
  expect(metrics?.maxScrollLeft).toBeCloseTo(0.001, 9)
  expect(scrollbarKeys(frame, container)).toEqual([
    "ua:scrollbar-x-track",
    "ua:scrollbar-x-thumb",
  ])

  renderer.dispose()
})
