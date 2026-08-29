import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {
  createDocument,
  readDocumentCompiledStyleSheets,
  type Event,
  type HTMLButtonElement
} from "@zavx0z/dom"
import {
  createDocumentInteractionState,
  createDocumentRenderer,
  type RectDisplayItem
} from "@zavx0z/renderer"
import {createRoot, type ComponentRoot} from "@zavx0z/react"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {isCompiledTemplate, type CompiledTemplate} from "@zavx0z/template/compiled"
import {Button as runtimeButton, type ButtonProps} from "./button.tsx"
import {
  ButtonDedupFixture,
  type ButtonDedupFixtureProps
} from "./button-dedup-fixture.tsx"

const packageRoot = resolve(import.meta.dir)
let outputDirectory = ""
let compiled: CompiledButtonModule
const buttonTemplate = runtimeButton as unknown as CompiledTemplate<ButtonProps>
const dedupTemplate = ButtonDedupFixture as unknown as CompiledTemplate<ButtonDedupFixtureProps>

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
    if (!isCompiledTemplate(runtimeButton)) throw new Error("Button did not compile")
    expect(buttonTemplate.styleSheets.length).toBeGreaterThan(0)
    expect(buttonTemplate.styleSheets.map(styleSheet => styleSheet.cssText).join("\n"))
      .toContain(":hover")
  })

  test("authors Button rules only through component-local intrinsic styles", async () => {
    const source = await Bun.file(join(packageRoot, "button.tsx")).text()
    expect(source).not.toContain("defineStyles")
    expect(source).not.toContain("buttonStyles")
    expect(source).toContain("style={[")
    expect(source).toContain('\":hover\"')
    expect(source).toContain("props.style")
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
    expect(images[1]!.getAttribute("style")).toBeNull()
    const initialRenderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 180, height: 80}
    })
    const initialFrame = initialRenderer.flush()
    expect(initialFrame.boxByNode.has(images[0]!)).toBeTrue()
    expect(initialFrame.boxByNode.has(images[1]!)).toBeFalse()
    initialRenderer.dispose()
    button.click()
    expect(clicks).toBe(1)

    mounted.root.render(compiled.Button, {
      label: "Render",
      endIcon: "data:image/svg+xml,end",
      selected: true,
      style: {width: 96, background: "#123456", color: "#abcdef", fontSize: 17}
    })
    expect(mounted.host.querySelector("button")).toBe(button)
    expect(button.querySelector("span")).toBe(label)
    expect(label.firstChild).toBe(labelText)
    expect(button.querySelectorAll("img")[0]).toBe(images[0])
    expect(button.querySelectorAll("img")[1]).toBe(images[1])
    expect(button.getAttribute("style")).toBe(
      "width: 96px; background: #123456; color: #abcdef; font-size: 17px"
    )
    expect(button.getAttribute("aria-pressed")).toBe("true")
    const renderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 180, height: 80}
    })
    const frame = renderer.flush()
    const inheritedLabel = frame.displayList.find(item =>
      item.kind === "text" && item.text === "Render"
    )
    expect(inheritedLabel).toMatchObject({color: "#abcdef", fontSize: 17})
    expect(background(frame, button).color).toBe("#123456")
    renderer.dispose()
    mounted.root.unmount()
  })

  test("composes IconButton from Button without a second visual implementation", () => {
    const mounted = mount()
    mounted.root.render(compiled.IconButton, {
      label: "Output",
      iconSrc: "data:image/svg+xml,icon"
    })
    const button = mounted.host.querySelector("button") as HTMLButtonElement
    const label = button.querySelector("span")!
    expect(button.title).toBe("Output")
    expect(button.querySelector("img")?.getAttribute("src")).toContain("icon")
    const renderer = createDocumentRenderer({
      document: mounted.document,
      root: mounted.host,
      viewport: {width: 80, height: 40}
    })
    expect(renderer.flush().boxByNode.has(label)).toBeFalse()
    expect(mounted.root.stats().mounts).toBe(2)
    renderer.dispose()
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
      interactionState
    })
    const adopted = readDocumentCompiledStyleSheets(mounted.document)
    expect(adopted.styleSheets).toEqual(buttonTemplate.styleSheets)
    expect(adopted.styleSheets.map(styleSheet => styleSheet.cssText).join("\n"))
      .toContain(":hover")
    const initial = renderer.flush()
    expect(initial.boxByNode.get(button)?.height).toBe(22)
    expect(initial.boxByNode.get(button)?.width).toBe(92)
    expect(background(initial, button).color).toBe("rgb(84 84 84)")
    interactionState.setHoveredElement(button)
    expect(background(renderer.flush(), button).color).toBe("rgb(101 101 101)")
    interactionState.setActiveElement(button)
    expect(background(renderer.flush(), button).color).toBe("rgb(71 114 179)")
    interactionState.setActiveElement(null)
    interactionState.setHoveredElement(null)
    button.focus()
    expect(background(renderer.flush(), button)).toMatchObject({
      border: {
        colors: {
          top: "rgb(113 168 255)",
          right: "rgb(113 168 255)",
          bottom: "rgb(113 168 255)",
          left: "rgb(113 168 255)"
        }
      }
    })
    renderer.dispose()
    mounted.root.unmount()
  })

  test("invalidates an existing renderer when Button adopts its compiled stylesheet", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 160, height: 80}
    })
    const empty = renderer.flush()
    const root = createRoot(host)

    root.render(compiled.Button, {label: "Output"})
    const button = host.querySelector("button") as HTMLButtonElement
    const styled = renderer.flush()
    expect(styled.revision).toBe(empty.revision + 1)
    expect(styled.boxByNode.get(button)).toMatchObject({width: 92, height: 22})
    expect(background(styled, button).color).toBe("rgb(84 84 84)")
    expect(readDocumentCompiledStyleSheets(document).styleSheets).toEqual(buttonTemplate.styleSheets)

    root.unmount()
    renderer.dispose()
  })

  test("deduplicates one compiled Button stylesheet across 1000 instances", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const ids = Array.from({length: 1_000}, (_value, index) => `button-${index}`)

    root.render(dedupTemplate, {ids})
    expect(host.querySelectorAll("button")).toHaveLength(1_000)
    const first = readDocumentCompiledStyleSheets(document)
    expect(first.styleSheets).toEqual(buttonTemplate.styleSheets)
    expect(new Set(first.styleSheets.map(styleSheet => styleSheet.id)).size)
      .toBe(buttonTemplate.styleSheets.length)

    root.render(dedupTemplate, {ids})
    expect(readDocumentCompiledStyleSheets(document)).toBe(first)
    root.unmount()
    expect(readDocumentCompiledStyleSheets(document).styleSheets).toEqual([])
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
}>
