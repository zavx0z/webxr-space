import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {Text, TrueTypeFont} from "@zavx0z/engine"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentInteractionController, createDocumentRenderer, hitTestProjection, readCanonicalRenderFrameChanges} from "@zavx0z/renderer"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"
import type {CodeEditorProps} from "@zavx0z/ui/views/code-editor"

// A CPU-only diagnostic using the actual compiled production component.
const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const {CodeEditor} = await import("@zavx0z/ui/views/code-editor")
const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
const theme = await Bun.file(new URL("../../ui/themes/theme.css", import.meta.url)).text()
const source = Array.from({length: 420}, (_, index) =>
  `        <span data-z-ycf0xbqihmrwdwse="" data-major="true" class="source-row-${index}">HTML source ${index}</span>`,
).join("\n")

for (const tooltip of [false, true]) {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:560px;height:240px;overflow:hidden;border-radius:12px")
  document.append(root)
  const panel = document.createElement("div")
  panel.setAttribute("style", "width:540px;height:220px;overflow:hidden;border-radius:8px")
  root.append(panel)
  const component = createRoot(panel)
  component.render(CodeEditor as unknown as CompiledTemplate<CodeEditorProps>, {
    value: source, languageId: "html", title: tooltip ? "HTML source" : undefined, readOnly: true,
  })
  const editor = panel.querySelector("section") as HTMLElement
  editor.setAttribute("style", `${editor.getAttribute("style") ?? ""};height:180px`)
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  const renderer = createDocumentRenderer({document, root, viewport: {width: 560, height: 240}, styleSheets: [theme], textMeasurer: backend.textMeasurer!})
  const interaction = createDocumentInteractionController({document, hitTest: hitTestProjection, tooltipDelayMs: 0})
  try {
    let base = renderer.flush()
    if (tooltip) interaction.pointerMove(base, {clientX: 200, clientY: 90, timeStamp: 0})
    let presentation = interaction.composeFrame(base, 10)
    backend.applyFrame(presentation)
    console.log(JSON.stringify({phase: "initial", tooltip, boxes: base.boxes.length, items: base.displayList.length,
      text: base.displayList.filter(item => item.kind === "text").length,
      clips: Math.max(...base.displayList.map(item => item.clips.length)),
      scroll: {maxLeft: base.scrolls.get(editor)?.maxScrollLeft, maxTop: base.scrolls.get(editor)?.maxScrollTop},
      editorBox: {width: base.boxByNode.get(editor)?.width, height: base.boxByNode.get(editor)?.height},
    }))
    for (const [left, top] of [[0, 16], [0, 32], [0, 16], [16, 16], [32, 16], [16, 16], [0, 0]] as const) {
      const start = performance.now()
      const wheel = interaction.wheel(base, {clientX: 200, clientY: 90, deltaX: left - editor.scrollLeft, deltaY: top - editor.scrollTop})
      base = renderer.flush()
      const flushed = performance.now()
      presentation = interaction.composeFrame(base, 20)
      const composed = performance.now()
      backend.applyFrame(presentation)
      const done = performance.now()
      const changes = readCanonicalRenderFrameChanges(base)
      const composedChanges = readCanonicalRenderFrameChanges(presentation)
      console.log(JSON.stringify({phase: "scroll", tooltip, left: editor.scrollLeft, top: editor.scrollTop, wheelHandled: wheel !== null,
        baseScroll: changes?.scroll !== undefined, composedScroll: composedChanges?.scroll !== undefined,
        activeTooltip: interaction.tooltip?.text ?? null, overlayItems: presentation.displayList.length - base.displayList.length,
        clipDepth: changes?.scroll?.clipDepth, changed: changes?.indexes.length,
        rectPrepared: backend.diagnostics.rectPreparedItems, textPrepared: backend.diagnostics.textPreparedItems,
        reused: backend.diagnostics.rectPlanReused,
        visibleText: backend.root.children.filter(node => node instanceof Text && node.visible).length,
        milliseconds: {inputAndFlush: flushed - start, compose: composed - flushed, backend: done - composed},
      }))
    }
  } finally {
    interaction.dispose()
    renderer.dispose()
    component.unmount()
    backend.dispose()
  }
}

// Runtime compiler sessions intentionally persist; this diagnostic owns their process.
process.exit(0)
