import {describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join} from "node:path"
import {pathToFileURL} from "node:url"
import {
  HTMLButtonElement,
  HTMLSpanElement,
  Text,
  createDocument,
} from "@zavx0z/dom"
import {JsxCompilerSession} from "@zavx0z/template/compiler"
import {
  bindEvent,
  bindProperty,
  bindText,
  defineCompiledTemplate,
  isCompiledTemplate,
  writeBinding,
} from "@zavx0z/template/compiled"

type InteractiveTemplateProps = Readonly<{
  disabled: boolean
  label: string
  onClick: () => void
  title: string
}>

function interactiveTemplate() {
  return defineCompiledTemplate<InteractiveTemplateProps>({
    bindingCount: 4,
    displayName: "InteractiveTemplateContract",
    mount(document) {
      const button = document.createElement("button")
      const label = document.createElement("span")
      const text = document.createTextNode("")
      button.setAttribute("data-role", "action")
      label.appendChild(text)
      button.appendChild(label)
      return {
        bindings: [
          bindProperty(button, "title"),
          bindProperty(button, "disabled"),
          bindText(text),
          bindEvent(button, "click"),
        ],
        nodes: [button],
      }
    },
    render(props, values) {
      writeBinding(values, 0, props.title)
      writeBinding(values, 1, props.disabled)
      writeBinding(values, 2, props.label)
      writeBinding(values, 3, props.onClick)
    },
  })
}

describe("Compiled Template contract", () => {
  test("[TPL-001] Компилятор TSX создаёт публичный формат готового шаблона", async () => {
    const sourceRoot = await mkdtemp(join(import.meta.dir, ".compiler-contract-"))
    const sourcePath = join(sourceRoot, "greeting.tsx")
    const outputPath = join(sourceRoot, "greeting.compiled.ts")
    await Bun.write(join(sourceRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        exactOptionalPropertyTypes: true,
        jsx: "preserve",
        jsxImportSource: "@zavx0z/template",
        lib: ["ESNext", "DOM"],
        module: "Preserve",
        moduleResolution: "bundler",
        noEmit: true,
        strict: true,
        target: "ESNext",
      },
      files: ["greeting.tsx"],
    }))
    await Bun.write(sourcePath, [
      "export function Greeting(props: {label: string}) {",
      "  return <button title={props.label}>{props.label}</button>",
      "}",
      "",
    ].join("\n"))

    const compiler = new JsxCompilerSession({cwd: sourceRoot, sourceRoots: [sourceRoot]})
    try {
      const result = await compiler.compileFile(sourcePath)
      await Bun.write(outputPath, result.code)
      const compiledModule = await import(pathToFileURL(outputPath).href) as Record<string, unknown>

      expect(
        result.code.includes("<button"),
        "TPL-001: compiler output не должен содержать runtime JSX",
      ).toBe(false)
      expect(
        result.code.includes('from "@zavx0z/template/compiled"'),
        "TPL-001: compiler output должен использовать public compiled ABI",
      ).toBe(true)
      expect(
        isCompiledTemplate(compiledModule.Greeting),
        "TPL-001: экспорт скомпилированного компонента должен быть CompiledTemplate",
      ).toBe(true)
    } finally {
      await compiler.close()
      await rm(sourceRoot, {force: true, recursive: true})
    }
  }, 30_000)

  test("[TPL-002] Готовый шаблон сохраняет типы элементов, атрибуты, children и обработчики событий", () => {
    const document = createDocument()
    const template = interactiveTemplate()
    const mounted = template.mount(document)
    const handler = () => undefined
    const values = new Array<unknown>(template.bindingCount)
    template.render({disabled: true, label: "Запуск", onClick: handler, title: "Run"}, values)

    const button = mounted.nodes[0]
    const label = button?.firstChild
    const text = label?.firstChild
    expect(button, "TPL-002: static button type должен сохраниться в mount").toBeInstanceOf(HTMLButtonElement)
    expect(label, "TPL-002: authored child span должен сохранить exact type").toBeInstanceOf(HTMLSpanElement)
    expect(text, "TPL-002: text child должен сохранить exact Text identity").toBeInstanceOf(Text)
    expect(
      (button as HTMLButtonElement).getAttribute("data-role"),
      "TPL-002: static attribute должен сохраниться в готовом шаблоне",
    ).toBe("action")
    expect(
      mounted.bindings.map(binding => binding.kind),
      "TPL-002: готовый шаблон должен сохранить адресованные binding kinds",
    ).toEqual(["property", "property", "text", "event"])
    expect(
      mounted.bindings[0],
      "TPL-002: title binding должен указывать на exact button и property",
    ).toMatchObject({kind: "property", name: "title", target: button})
    expect(
      mounted.bindings[3],
      "TPL-002: event binding должен сохранить exact target и event type",
    ).toMatchObject({capture: false, kind: "event", target: button, type: "click"})
    expect(
      values,
      "TPL-002: render должен сохранить props в точных numeric slots",
    ).toEqual(["Run", true, "Запуск", handler])
  })

  test("[TPL-003] Формат готового шаблона не владеет Document, состоянием компонентов и их lifecycle", () => {
    const template = interactiveTemplate()
    const firstDocument = createDocument()
    const secondDocument = createDocument()
    const firstMount = template.mount(firstDocument)
    const secondMount = template.mount(secondDocument)

    expect(
      firstMount.nodes[0]?.ownerDocument,
      "TPL-003: первый mount должен использовать переданный Document",
    ).toBe(firstDocument)
    expect(
      secondMount.nodes[0]?.ownerDocument,
      "TPL-003: повторный mount должен использовать другой переданный Document",
    ).toBe(secondDocument)
    expect(
      firstMount.nodes[0] === secondMount.nodes[0],
      "TPL-003: формат не должен хранить один Document-owned Node между mounts",
    ).toBe(false)
    expect(
      Object.keys(template).sort(),
      "TPL-003: public CompiledTemplate не должен содержать state/update/unmount owner",
    ).toEqual(["bindingCount", "displayName", "mount", "render", "styleSheets"])
    expect(
      Object.isFrozen(template),
      "TPL-003: готовый шаблон должен быть immutable transport",
    ).toBe(true)
  })
})
