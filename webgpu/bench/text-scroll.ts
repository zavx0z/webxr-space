import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {Text, TrueTypeFont} from "@zavx0z/engine"
import {createDocumentInteractionController, createDocumentInteractionState, createDocumentRenderer, hitTestProjection} from "@renderer/html"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"
import {collectSpaceObjects, type RenderItem} from "../src/renderer/utils/render-list.ts"

// CPU-only equal-work benchmark. No browser, device, GPU submission or source tokenization.
const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
const sampleCount = 30
const warmup = 5
const summarize = (values: number[]) => {
  const sorted = [...values].sort((left, right) => left - right)
  return {median: +sorted[Math.floor(sorted.length / 2)]!.toFixed(2), p95: +sorted[Math.ceil(sorted.length * 0.95) - 1]!.toFixed(2)}
}

async function run(name: string, rows: number, target: "small" | "large", tooltip = false, logicalRows = rows) {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "display:flex;flex-direction:column;width:720px;height:440px;gap:12px")
  document.append(root)
  const add = (parent: HTMLElement, tag: string, style: string, text?: string): HTMLElement => {
    const element = document.createElement(tag) as HTMLElement
    element.setAttribute("style", style)
    if (text !== undefined) element.textContent = text
    parent.append(element)
    return element
  }
  const editor = (count: number, total: number, small = false) => {
    const section = add(root, "section", "box-sizing:border-box;display:flex;flex-direction:row;width:700px;height:180px;min-height:180px;overflow:auto;border:1px solid #323438;border-radius:4px;background:#191a1c;font-size:12px;font-family:monospace;line-height:16px")
    const gutter = add(section, "ul", "display:flex;flex-direction:column;min-width:42px;flex-shrink:0;padding:8px;margin:0")
    const pre = add(section, "pre", "display:block;min-width:0;flex-grow:1;margin:0;padding:8px 10px;overflow:visible")
    const code = add(pre, "code", "display:flex;flex-direction:column;min-width:100%")
    for (let index = 0; index < count; index++) {
      add(gutter, "li", "display:block;height:16px;min-height:16px;text-align:right;color:#828894", String(index + 1))
      const row = add(code, "span", "display:flex;flex-direction:row;width:100%;min-width:0;height:16px;min-height:16px;white-space:nowrap")
      const words = small
        ? Array.from({length: 5}, () => ["border", "-radius", ": ", "6px; ", "background", ": #1d1d1d; "]).flat()
        : ["<span ", "data-z-ycf0xbqihmrwdwse", "=", "\"\"", " class=\"row\"", ">"]
      words.forEach((word, offset) => add(row, "span", "display:block;flex-shrink:0;white-space:pre;color:" +
        ["#bcbec4", "#dcb866", "#bcbec4", "#6aab73", "#bcbec4", "#bcbec4"][offset % 6], word))
    }
    if (total > count) {
      add(gutter, "li", `display:block;height:${(total - count) * 16}px`)
      add(code, "span", `display:block;height:${(total - count) * 16}px`)
    }
    return section
  }
  if (rows > 0) editor(rows, logicalRows)
  const small = editor(2, 2, true)
  if (tooltip) small.title = "Small code editor"
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  let measured = 0
  const interactionState = createDocumentInteractionState(document)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 720, height: 440}, interactionState,
    textMeasurer: {measureTextAdvance(...args) {
      measured++
      return backend.textMeasurer!.measureTextAdvance(...args)
    }},
  })
  const interaction = createDocumentInteractionController({document, interactionState, hitTest: hitTestProjection, tooltipDelayMs: 500})
  const point = {clientX: 300, clientY: target === "large" || rows === 0 ? 90 : 290}
  const timings = Array.from({length: 6}, () => [] as number[])
  let reused = 0
  let measurements = 0
  try {
    let base = renderer.flush()
    interaction.pointerMove(base, {...point, timeStamp: 0})
    base = renderer.flush()
    backend.applyFrame(interaction.composeFrame(base, 1000))
    for (let index = 0; index < sampleCount + warmup; index++) {
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      const before = measured
      const start = performance.now()
      interaction.wheel(base, {...point,
        deltaY: target === "large" ? (index % 2 ? 32 : -32) : 0,
        deltaX: target === "small" ? (index % 2 ? 24 : -24) : 0,
      })
      const input = performance.now()
      base = renderer.flush()
      const layout = performance.now()
      const frame = interaction.composeFrame(base, 1100 + index * 16)
      const compose = performance.now()
      backend.applyFrame(frame)
      const paint = performance.now()
      backend.root.updateWorldMatrix(true)
      const items: RenderItem[] = []
      collectSpaceObjects(backend.root, items, [])
      const end = performance.now()
      if (index < warmup) continue
      const sample = [input - start, layout - input, compose - layout, paint - compose, end - paint, end - start]
      sample.forEach((value, index) => timings[index]!.push(value))
      measurements += measured - before
      if (backend.diagnostics.rectPlanReused) reused++
    }
    let textObjects = 0
    let visibleTextObjects = 0
    backend.root.traverse(node => {
      if (!(node instanceof Text)) return
      textObjects++
      if (node.visible) visibleTextObjects++
    })
    console.log(JSON.stringify({name, bun: Bun.version, samples: sampleCount, rows, logicalRows,
      milliseconds: Object.fromEntries(["input", "layout", "compose", "backend", "scene", "total"].map((name, index) => [name, summarize(timings[index]!)])),
      measurements, reused, textObjects, visibleTextObjects, boxes: base.boxes.length, hits: base.hits.size,
    }))
  } finally {
    interaction.dispose()
    renderer.dispose()
    backend.dispose()
  }
}

for (const [name, rows, target, tooltip, logicalRows] of [
  ["small-only", 0, "small", false, 0],
  ["small-next-to-1000", 1000, "small", false, 1000],
  ["small-next-to-1000-tooltip", 1000, "small", true, 1000],
  ["scroll-1000", 1000, "large", false, 1000],
  ["bounded-32-of-1000-control", 32, "large", false, 1000],
] as const) await run(name, rows, target, tooltip, logicalRows)
