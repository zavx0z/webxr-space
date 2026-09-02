import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {copyFile, mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {resolve} from "node:path"
import {
  bindChild,
  bindProperty,
  bindText,
  defineCompiledTemplate,
  isCompiledTemplate,
  isHostBinding,
  writeBinding,
  type CompiledTemplate,
  type HostBinding
} from "./compiled.ts"
import type {JsxSourceElement} from "./jsx-runtime.ts"

describe("compiled template ABI", () => {
  test("owns static host nodes and numeric addressed bindings", () => {
    const template = defineCompiledTemplate<{label: string; title: string}>({
      bindingCount: 2,
      displayName: "Button",
      mount(document) {
        const button = document.createElement("button")
        const text = document.createTextNode("")
        button.appendChild(text)
        return {
          nodes: [button],
          bindings: [bindText(text), bindProperty(button, "title")]
        }
      },
      render(props, values) {
        writeBinding(values, 0, props.label)
        writeBinding(values, 1, props.title)
      }
    })
    const document = createDocument()
    const mounted = template.mount(document)
    const values = Array.from({length: template.bindingCount})
    template.render({label: "Output", title: "Open output"}, values)

    expect(isCompiledTemplate(template)).toBe(true)
    expect(mounted.bindings.every(isHostBinding)).toBe(true)
    expect(values).toEqual(["Output", "Open output"])
  })

  test("validates ranges and binding addresses before output mutation", () => {
    const document = createDocument()
    const anchor = document.createComment("anchor")
    expect(() => bindChild(anchor, anchor)).toThrow("distinct anchors")
    expect(() => writeBinding([], 0, "bad")).toThrow("outside")
    expect(() => defineCompiledTemplate({
      bindingCount: -1,
      mount: () => ({nodes: [], bindings: []}),
      render() {}
    })).toThrow("non-negative")
  })

  test("cross-recognizes ABI values from distinct module instances", async () => {
    const nonce = Date.now()
    const first = await import(`./compiled.ts?first=${nonce}`)
    const second = await import(`./compiled.ts?second=${nonce}`)
    const document = createDocument()
    const text = document.createTextNode("")
    const binding = first.bindText(text)
    const template = first.defineCompiledTemplate({
      bindingCount: 1,
      mount: () => ({nodes: [text], bindings: [binding]}),
      render: (_props: unknown, values: unknown[]) => first.writeBinding(values, 0, "ok")
    })

    expect(second.isHostBinding(binding)).toBe(true)
    expect(second.isCompiledTemplate(template)).toBe(true)
    expect(template.mount(document).nodes[0]).toBe(text)
    expect(text.ownerDocument).toBe(document)
  })

  test("keeps public ABI types structural while runtime guards require the global brand", () => {
    const document = createDocument()
    const text = document.createTextNode("")
    const foreignBinding: HostBinding = {kind: "text", target: text}
    const foreignTemplate: CompiledTemplate<Record<string, never>> = {
      bindingCount: 1,
      displayName: "ForeignCopy",
      styleSheets: [],
      mount: () => ({bindings: [foreignBinding], nodes: [text]}),
      render: () => {}
    }

    expect(isHostBinding(foreignBinding)).toBe(false)
    expect(isCompiledTemplate(foreignTemplate)).toBe(false)
    expect(foreignTemplate.mount(document).bindings[0]).toBe(foreignBinding)
  })

  test("keeps the authored JSX marker structural across package resolutions", () => {
    const foreignJsxValue = {
      "@zavx0z/template/jsx-source-element": true as const
    }
    const localJsxValue: JsxSourceElement = foreignJsxValue

    expect(localJsxValue["@zavx0z/template/jsx-source-element"]).toBe(true)
  })

  test("typechecks ABI values across two physical package copies", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "template-abi-copies-"))
    const first = resolve(temporaryRoot, "copy-a")
    const second = resolve(temporaryRoot, "copy-b")
    await mkdir(first, {recursive: true})
    await mkdir(second, {recursive: true})
    await mkdir(resolve(temporaryRoot, "node_modules/@zavx0z"), {recursive: true})
    await Promise.all([
      copyFile(resolve(import.meta.dir, "compiled.ts"), resolve(first, "compiled.ts")),
      copyFile(resolve(import.meta.dir, "compiled.ts"), resolve(second, "compiled.ts")),
      copyFile(resolve(import.meta.dir, "style-codec.ts"), resolve(first, "style-codec.ts")),
      copyFile(resolve(import.meta.dir, "style-codec.ts"), resolve(second, "style-codec.ts")),
      copyFile(resolve(import.meta.dir, "css.ts"), resolve(first, "css.ts")),
      copyFile(resolve(import.meta.dir, "css.ts"), resolve(second, "css.ts")),
      copyFile(resolve(import.meta.dir, "css-shape.ts"), resolve(first, "css-shape.ts")),
      copyFile(resolve(import.meta.dir, "css-shape.ts"), resolve(second, "css-shape.ts")),
      copyFile(resolve(import.meta.dir, "tagged-template.ts"), resolve(first, "tagged-template.ts")),
      copyFile(resolve(import.meta.dir, "tagged-template.ts"), resolve(second, "tagged-template.ts")),
      copyFile(resolve(import.meta.dir, "jsx-runtime.ts"), resolve(first, "jsx-runtime.ts")),
      copyFile(resolve(import.meta.dir, "jsx-runtime.ts"), resolve(second, "jsx-runtime.ts")),
      copyFile(resolve(import.meta.dir, "jsx-dom.ts"), resolve(first, "jsx-dom.ts")),
      copyFile(resolve(import.meta.dir, "jsx-dom.ts"), resolve(second, "jsx-dom.ts")),
      copyFile(resolve(import.meta.dir, "jsx-events.ts"), resolve(first, "jsx-events.ts")),
      copyFile(resolve(import.meta.dir, "jsx-events.ts"), resolve(second, "jsx-events.ts")),
      symlink(
        resolve(import.meta.dir, "node_modules/@zavx0z/dom"),
        resolve(temporaryRoot, "node_modules/@zavx0z/dom"),
      ),
    ])
    await writeFile(resolve(temporaryRoot, "proof.ts"), [
      'import type {CompiledTemplate as ATemplate, HostBinding as ABinding} from "./copy-a/compiled.ts"',
      'import type {CompiledTemplate as BTemplate, HostBinding as BBinding} from "./copy-b/compiled.ts"',
      'import type {JsxSourceElement as AJsx} from "./copy-a/jsx-runtime.ts"',
      'import type {JsxSourceElement as BJsx} from "./copy-b/jsx-runtime.ts"',
      "declare const aTemplate: ATemplate<{value: number}>",
      "declare const aBinding: ABinding",
      "declare const aJsx: AJsx",
      "const bTemplate: BTemplate<{value: number}> = aTemplate",
      "const bBinding: BBinding = aBinding",
      "const bJsx: BJsx = aJsx",
      "void bTemplate",
      "void bBinding",
      "void bJsx",
      "",
    ].join("\n"))
    await writeFile(resolve(temporaryRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        allowImportingTsExtensions: true,
        module: "Preserve",
        moduleResolution: "bundler",
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: "ESNext",
      },
      files: ["proof.ts"],
    }))
    try {
      const child = Bun.spawn([
        resolve(import.meta.dir, "node_modules/.bin/tsc"),
        "--project",
        resolve(temporaryRoot, "tsconfig.json"),
        "--pretty",
        "false",
      ], {stderr: "pipe", stdout: "pipe"})
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
    } finally {
      await rm(temporaryRoot, {force: true, recursive: true})
    }
  }, 30_000)
})
