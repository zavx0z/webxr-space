import {expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "../compiled.ts"
import {JsxCompilerSession} from "../compiler/index.ts"

test("нативно типизированный document захватывает Document компонента и сохраняется после await", async () => {
  const directory = await mkdtemp(join(import.meta.dir, ".document-global-"))
  const compiler = new JsxCompilerSession({cwd: resolve(import.meta.dir, "../.."), sourceRoots: [import.meta.dir]})
  const nativeDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document")
  const documents = [createDocument(), createDocument()]
  const roots = documents.map(document => createRoot(document))
  let release = () => {}
  const wait = new Promise<void>(resolve => { release = resolve })
  try {
    const result = await compiler.compileFile(join(import.meta.dir, "document-global.fixture.tsx"))
    expect(result.code.match(/const document = __zComp\d+Document\(\)/g)).toHaveLength(2)
    expect(result.code).toContain("const document = props.document")
    expect(result.code).toContain("function readNativeDocument() {\n  return document\n}")
    const path = join(directory, "document-global.ts")
    await Bun.write(path, result.code)
    const module = await import(pathToFileURL(path).href) as {
      DocumentConsumer: CompiledTemplate<{
        wait: Promise<void>
        mounted(value: unknown): void
        clicked(value: unknown): void
      }>
      LocalDocument: CompiledTemplate<{document: {title: string}}>
      DocumentParameter: CompiledTemplate<{title: string}>
    }
    const mounted: unknown[] = []
    const clicked: unknown[] = []
    roots[0]!.render(module.DocumentConsumer, {wait, mounted: value => { mounted.push(value) }, clicked: value => { clicked.push(value) }})
    documents[0]!.documentElement!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    roots[1]!.render(module.DocumentConsumer, {wait, mounted: value => { mounted.push(value) }, clicked: value => { clicked.push(value) }})
    documents[1]!.documentElement!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    release()
    await wait
    await Promise.resolve()
    expect(mounted).toEqual(documents)
    expect(clicked).toEqual(documents)
    for (const document of documents) {
      expect(document.querySelector("span")?.ownerDocument).toBe(document)
      expect(document.documentElement?.textContent).toBe("9После ожидания")
    }
    roots[0]!.render(module.LocalDocument, {document: {title: "Локальный параметр"}})
    expect(documents[0]!.documentElement?.textContent).toBe("Локальный параметр")
    roots[1]!.render(module.DocumentParameter, {title: "Аргумент функции"})
    expect(documents[1]!.documentElement?.textContent).toBe("Аргумент функции")
    expect(Object.getOwnPropertyDescriptor(globalThis, "document")).toEqual(nativeDescriptor)
  } finally {
    release()
    for (const root of roots) root.unmount()
    try { await compiler.close() } finally { await rm(directory, {recursive: true, force: true}) }
  }
}, 30_000)
