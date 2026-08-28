import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createDocument, type Event, type HTMLButtonElement} from "@zavx0z/dom"
import {
  createDocumentInteractionState,
  createDocumentRenderer,
  type RectDisplayItem
} from "@zavx0z/renderer"
import {createRoot, type ComponentRoot} from "@zavx0z/react"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {Button as runtimeButton} from "./button.tsx"

const packageRoot = resolve(import.meta.dir)
let outputDirectory = ""
let compiled: CompiledButtonModule

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(packageRoot, ".button-test-"))
  const result = await Bun.build({
    entrypoints: [join(packageRoot, "button.tsx")],
    outdir: outputDirectory,
    target: "bun",
    format: "esm",
    external: [
      "@zavx0z/dom",
      "@zavx0z/react",
      "@zavx0z/template/compiled"
    ],
    plugins: [createTemplateJsxBunPlugin({sourceRoots: [packageRoot]})]
  })
  if (!result.success) throw new Error("Button component did not compile")
  const output = result.outputs.find(artifact => artifact.kind === "entry-point")
  if (!output) throw new Error("Button component build emitted no entry point")
  compiled = await import(`${pathToFileURL(output.path).href}?button=${Date.now()}`) as CompiledButtonModule
})

afterAll(async () => {
  if (outputDirectory) await rm(outputDirectory, {recursive: true, force: true})
})

describe("compiled production Button", () => {
  test("loads the public TSX owner through the repository test compiler", () => {
    expect(isCompiledTemplate(runtimeButton)).toBe(true)
  })

  test("retains exact semantic parts and applies one caller style last", () => {
    const mounted = mount()
    let clicks = 0
    mounted.root.render(compiled.Button, {
      label: "Output",
      startIcon: "data:image/svg+xml,start",
      title: "Output",
      onClick: (_event: Event) => { clicks += 1 }
    })
    const button = mounted.host.querySelector("button") as HTMLButtonElement
    const images = [...button.querySelectorAll("img")]
    const label = button.querySelector("span")!
    const labelText = label.firstChild

    expect(button.className).toBe("")
    expect(button.title).toBe("Output")
    expect(button.textContent).toBe("Output")
    expect(images).toHaveLength(2)
    expect(images[0]!.getAttribute("src")).toContain("start")
    expect(images[1]!.getAttribute("style")).toContain("display: none")
    button.click()
    expect(clicks).toBe(1)

    mounted.root.render(compiled.Button, {
      label: "Render",
      endIcon: "data:image/svg+xml,end",
      selected: true,
      style: {width: 96, background: "#123456"}
    })
    expect(mounted.host.querySelector("button")).toBe(button)
    expect(button.querySelector("span")).toBe(label)
    expect(label.firstChild).toBe(labelText)
    expect(button.querySelectorAll("img")[0]).toBe(images[0])
    expect(button.querySelectorAll("img")[1]).toBe(images[1])
    expect(button.getAttribute("style")).toBe("width: 96px; background: #123456")
    expect(button.getAttribute("aria-pressed")).toBe("true")
    mounted.root.unmount()
  })

  test("composes IconButton from Button without a second visual implementation", () => {
    const mounted = mount()
    mounted.root.render(compiled.IconButton, {
      label: "Output",
      iconSrc: "data:image/svg+xml,icon"
    })
    const button = mounted.host.querySelector("button") as HTMLButtonElement
    expect(button.title).toBe("Output")
    expect(button.querySelector("img")?.getAttribute("src")).toContain("icon")
    expect(button.querySelector("span")?.getAttribute("style")).toContain("display: none")
    expect(mounted.root.stats().mounts).toBe(2)
    mounted.root.unmount()
  })

  test("compiles the exact public button import for an application consumer", async () => {
    const consumerDirectory = await mkdtemp(join(packageRoot, ".button-consumer-test-"))
    try {
      const result = await Bun.build({
        entrypoints: [join(packageRoot, "button-consumer-fixture.tsx")],
        outdir: consumerDirectory,
        target: "bun",
        format: "esm",
        external: [
          "@zavx0z/dom",
          "@zavx0z/react",
          "@zavx0z/template/compiled"
        ],
        plugins: [createTemplateJsxBunPlugin({sourceRoots: [packageRoot]})]
      })
      expect(result.success).toBe(true)
      const output = result.outputs.find(artifact => artifact.kind === "entry-point")
      if (!output) throw new Error("Button consumer emitted no entry point")
      const application = await import(
        `${pathToFileURL(output.path).href}?consumer=${Date.now()}`
      ) as Readonly<{
        host: import("@zavx0z/dom").HTMLElement
        root: ComponentRoot
      }>
      const button = application.host.querySelector("button") as HTMLButtonElement
      expect(button.textContent).toBe("Output")
      expect(button.querySelector("img")?.getAttribute("src")).toContain("svg")
      expect(button.className).toBe("")
      application.root.unmount()
    } finally {
      await rm(consumerDirectory, {recursive: true, force: true})
    }
  })

  test("resolves native hover/active and exact 22px medium geometry", () => {
    const mounted = mount()
    mounted.root.render(compiled.Button, {label: "Output"})
    const button = mounted.host.querySelector("button") as HTMLButtonElement
    const interactionState = createDocumentInteractionState(mounted.document)
    const renderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 160, height: 80},
      interactionState,
      styleSheets: [compiled.buttonCss]
    })
    const initial = renderer.flush()
    expect(initial.boxByNode.get(button)?.height).toBe(22)
    expect(initial.boxByNode.get(button)?.width).toBe(92)
    expect(background(initial, button).color).toBe("rgb(84 84 84)")
    interactionState.setHoveredElement(button)
    expect(background(renderer.flush(), button).color).toBe("rgb(101 101 101)")
    interactionState.setActiveElement(button)
    expect(background(renderer.flush(), button).color).toBe("rgb(71 114 179)")
    renderer.dispose()
    mounted.root.unmount()
  })
})

function mount(): Readonly<{
  document: ReturnType<typeof createDocument>
  host: import("@zavx0z/dom").HTMLElement
  root: ComponentRoot
}> {
  const document = createDocument()
  const host = document.createElement("main")
  document.appendChild(host)
  return {document, host, root: createRoot(host)}
}

function background(
  frame: import("@zavx0z/renderer").RenderFrame,
  button: HTMLButtonElement
): RectDisplayItem {
  const item = frame.displayList.find((candidate): candidate is RectDisplayItem =>
    candidate.kind === "rect" && candidate.node === button && candidate.key === "background"
  )
  if (!item) throw new Error("Button background is missing")
  return item
}

type CompiledButtonModule = Readonly<{
  Button: any
  IconButton: any
  buttonCss: string
}>
