import {CodeEditor} from "@ui/components/code-editor"
import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {
  defineStorybookStoryModule,
  type StorybookStoryArgs,
  type StorybookStoryModule,
} from "@zavx0z/storybook/stories"
import type {UiSurfaceRect} from "@layout/core/runtime"
import type {UiSurface} from "@layout/core/surface"

type WorkerStoryGeneration = "1" | "2" | "7"

type WorkerStoryArgs = StorybookStoryArgs & Readonly<{
  generation: WorkerStoryGeneration
}>

type WorkerStoryRequest<Graph> = Readonly<{
  type: "layout"
  requestId: number
  generation: number
  graph: Graph
}>

type WorkerStoryResponse = Readonly<{
  type: string
  requestId: number
  generation: number
}>

type WorkerProtocolStoryOptions<
  Request extends WorkerStoryRequest<unknown>,
  Response extends WorkerStoryResponse,
> = Readonly<{
  id: string
  label: string
  executorImport: string
  executorName: string
  createRequest(generation: number): Request
  execute(request: Request): Response
}>

const GENERATIONS: readonly WorkerStoryGeneration[] = Object.freeze(["1", "2", "7"])

export function defineWorkerProtocolStory<
  Request extends WorkerStoryRequest<unknown>,
  Response extends WorkerStoryResponse,
>(options: WorkerProtocolStoryOptions<Request, Response>): StorybookStoryModule {
  return defineStorybookStoryModule<WorkerStoryArgs>({
    defaultArgs: {generation: "1"},
    controls: [{
      key: "generation",
      label: "Generation",
      group: "Запрос",
      kind: "select",
      options: GENERATIONS.map((generation) => ({value: generation, label: generation})),
    }],
    render(surface, args, frame) {
      const request = options.createRequest(workerStoryGeneration(args.generation))
      const response = options.execute(request)
      drawWorkerProtocolPreview(surface, frame, options, request, response)
    },
    source(args) {
      const request = options.createRequest(workerStoryGeneration(args.generation))
      const typescript = [
        `import {${options.executorName}} from ${JSON.stringify(options.executorImport)}`,
        "",
        `const request = ${JSON.stringify(request, null, 2)}`,
        `const response = ${options.executorName}(request)`,
      ].join("\n")
      return Object.freeze({
        html: `<worker-protocol class="worker-protocol" data-policy="${options.id}">
  <output class="worker-protocol__status"></output>
  <section class="worker-protocol__messages">
    <pre><code data-message="request"></code></pre>
    <pre><code data-message="response"></code></pre>
  </section>
</worker-protocol>`,
        css: `.worker-protocol {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 18px;
  padding: 68px 24px 24px;
}

.worker-protocol__status {
  flex: 0 0 48px;
}

.worker-protocol__messages {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  overflow: auto;
}`,
        typescript,
      })
    },
  })
}

function drawWorkerProtocolPreview<
  Request extends WorkerStoryRequest<unknown>,
  Response extends WorkerStoryResponse,
>(
  surface: UiSurface,
  frame: UiSurfaceRect,
  options: WorkerProtocolStoryOptions<Request, Response>,
  request: Request,
  response: Response,
): void {
  const inset = Math.min(28, Math.max(14, frame.w * 0.025))
  const contentX = frame.x + inset
  const contentW = Math.max(220, frame.w - inset * 2)
  const statusY = frame.y + Math.min(96, Math.max(68, frame.h * 0.16))
  const statusH = 48
  Pane(surface, contentX, statusY, contentW, statusH, {
    appearance: "box",
    style: {padding: 12},
  })
  Typography(surface, contentX + 14, statusY + 12, contentW - 28, 24, {
    children: `${options.label} · ${response.type} · request ${request.requestId} · generation ${request.generation}`,
    variant: "subtitle",
    color: response.type === "layout-result" ? "green" : "red",
  })

  const editorsY = statusY + statusH + 18
  const editorsH = Math.max(120, frame.y + frame.h - editorsY - inset)
  if (contentW >= 720) {
    const editorW = (contentW - 16) / 2
    drawJsonPreview(surface, options.id, "request", "Request", request, contentX, editorsY, editorW, editorsH)
    drawJsonPreview(
      surface,
      options.id,
      "response",
      "Result",
      response,
      contentX + editorW + 16,
      editorsY,
      editorW,
      editorsH,
    )
    return
  }

  const editorH = Math.max(90, (editorsH - 16) / 2)
  drawJsonPreview(surface, options.id, "request", "Request", request, contentX, editorsY, contentW, editorH)
  drawJsonPreview(
    surface,
    options.id,
    "response",
    "Result",
    response,
    contentX,
    editorsY + editorH + 16,
    contentW,
    editorH,
  )
}

function drawJsonPreview(
  surface: UiSurface,
  storyId: string,
  valueId: "request" | "response",
  label: string,
  value: unknown,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  Typography(surface, x + 2, y, w - 4, 20, {children: label, variant: "title"})
  CodeEditor(surface, x, y + 22, w, Math.max(68, h - 22), {
    key: `worker-${storyId}-${valueId}`,
    value: JSON.stringify(value, null, 2),
    readOnly: true,
    languageId: "json",
    path: `${storyId}-${valueId}.json`,
    showLineNumbers: false,
    fontPx: 11,
    linePx: 15,
  })
}

function workerStoryGeneration(value: WorkerStoryGeneration): number {
  return Number(value)
}
