import {afterAll, describe, expect, expectTypeOf, test} from "bun:test"
import {mkdtemp, readFile, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {dirname, join, resolve} from "node:path"
import {fileURLToPath} from "node:url"
import {createHash} from "node:crypto"
import {analyzeTypeDoc, type AnalyzeTypeDocInput, type AnalyzeTypeDocOutput} from "../parser/index.ts"
import type {AnalyzeTypeDocInput as InputContract} from "../parser/contract/input.ts"
import type {AnalyzeTypeDocOutput as OutputContract} from "../parser/contract/output.ts"
import {readComment} from "../parser/src/comments.ts"

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const directories: string[] = []

async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "webxr-typedoc-"))
  directories.push(root)
  await writeFile(join(root, "tsconfig.json"), JSON.stringify({
    compilerOptions: {strict: true, noEmit: true, module: "preserve", moduleResolution: "bundler", target: "esnext", types: [], allowImportingTsExtensions: true},
    include: ["*.ts"],
  }))
  await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(root, name), content)))
  return root
}

afterAll(async () => {
  await Promise.all(directories.splice(0).map(path => rm(path, {recursive: true, force: true})))
})

describe("структурированный разбор TypeScript 7", () => {
  test("контракты владеют объявлениями, реализация и представление импортируют канонические типы", async () => {
    const files = await Promise.all([
      "typedoc/parser/contract/input.ts",
      "typedoc/parser/contract/output.ts",
      "typedoc/parser/index.ts",
      "typedoc/typedoc/contract/input.ts",
      "typedoc/typedoc/index.tsx",
      "typedoc/shared/types/model.ts",
    ].map(path => readFile(join(repository, path), "utf8")))
    const [input, output, parser, viewInput, view, model] = files as [string, string, string, string, string, string]
    expect(input).toMatch(/^export interface AnalyzeTypeDocInput \{/mu)
    expect(input).toContain("readonly root: string")
    expect(input).toContain("readonly path: string")
    expect(output).toMatch(/^export interface AnalyzeTypeDocOutput \{/mu)
    for (const contract of [input, output, viewInput]) {
      expect(contract).not.toContain("@packageDocumentation")
      expect(contract.match(/^export\b/gmu)).toHaveLength(1)
      expect(contract).not.toMatch(/from ["'][^"']*(?:src\/|shared\/(?!types\/))/mu)
      expect(contract).not.toMatch(/^export\s+(?:type\s+)?(?:\*|\{)/mu)
    }
    expect(parser).toContain('from "./contract/input.ts"')
    expect(parser).toContain('from "./contract/output.ts"')
    expect(parser).not.toContain("shared/model")
    expect(parser.match(/^export type .+$/gmu)).toEqual([
      'export type {AnalyzeTypeDocInput} from "./contract/input.ts"',
      'export type {AnalyzeTypeDocOutput} from "./contract/output.ts"',
    ])
    expect(view.match(/^export type .+$/gmu)).toEqual(['export type {TypeDocProps} from "./contract/input.ts"'])
    expectTypeOf<AnalyzeTypeDocInput>().toEqualTypeOf<InputContract>()
    expectTypeOf<AnalyzeTypeDocOutput>().toEqualTypeOf<OutputContract>()
    expect(viewInput).toMatch(/^export interface TypeDocProps \{/mu)
    expect(viewInput).toContain('import type {TypeDocDocument} from "../../shared/types/model.ts"')
    expect(viewInput).toContain('readonly document: TypeDocDocument')
    expect(viewInput.match(/^export\b/gmu)).toHaveLength(1)
    expect(viewInput).toContain("readonly title?")
    expect(viewInput).toContain("readonly style?")
    expect(output).toContain('import type {TypeDocDocument, TypeDocSource} from "../../shared/types/model.ts"')
    expect(output).toContain("readonly document: TypeDocDocument")
    expect(output).toContain("readonly sources: readonly TypeDocSource[]")
    for (const name of ["TypeDocComment", "TypeDocMember", "TypeDocDeclaration", "TypeDocDocument", "TypeDocSource"]) {
      expect(model).toMatch(new RegExp(`^export interface ${name} \\{`, "mu"))
      expect(output).not.toMatch(new RegExp(`^(?:export )?(?:type|interface) ${name}\\b`, "mu"))
    }
    expect(model).not.toMatch(/^import\b/mu)
    expect(view).toContain('from "./contract/input.ts"')
    expect(await Bun.file(join(repository, "typedoc/shared/model.ts")).exists()).toBe(false)
    expect(await Bun.file(join(repository, "typedoc/shared/types.ts")).exists()).toBe(false)
  })

  test("собственный входной interface соответствует одному объектному аргументу", async () => {
    expectTypeOf<Parameters<typeof analyzeTypeDoc>>().toEqualTypeOf<[AnalyzeTypeDocInput]>()
    expect(analyzeTypeDoc.length).toBe(1)
    const input: AnalyzeTypeDocInput = {root: repository, path: "typedoc/parser/contract/input.ts"}
    const analysis = await analyzeTypeDoc(input)
    const declaration = analysis.document.declarations[0]!
    expect(declaration.name).toBe("AnalyzeTypeDocInput")
    expect(declaration.kind).toBe("interface")
    expect(declaration.signature).toContain("readonly root: string")
    expect(declaration.signature).toContain("readonly path: string")
    expect(declaration.members.map(({name, type, optional}) => ({name, type, optional}))).toEqual([
      {name: "root", type: "string", optional: false},
      {name: "path", type: "string", optional: false},
    ])
    expect(declaration.members[0]!.description).toContain("текущего рабочего каталога")
    expect(declaration.members[1]!.description).toContain("Относительный путь разрешается от root")
    expect(declaration.comment.examples[0]).toContain("analyzeTypeDoc({")
    expect(JSON.parse(JSON.stringify(analysis))).toEqual(analysis)
  }, 20000)

  test("единственный выходной interface описывает данные после await, функция возвращает Promise", async () => {
    expectTypeOf<ReturnType<typeof analyzeTypeDoc>>().toEqualTypeOf<Promise<AnalyzeTypeDocOutput>>()
    expectTypeOf<Awaited<ReturnType<typeof analyzeTypeDoc>>>().toEqualTypeOf<AnalyzeTypeDocOutput>()
    const pending: Promise<AnalyzeTypeDocOutput> = analyzeTypeDoc({root: repository, path: "typedoc/parser/contract/output.ts"})
    expect(pending).toBeInstanceOf(Promise)
    const analysis = await pending
    const declaration = analysis.document.declarations.find(item => item.name === "AnalyzeTypeDocOutput")!
    expect(analysis.document.declarations.map(item => item.name)).toEqual(["AnalyzeTypeDocOutput"])
    expect(declaration.kind).toBe("interface")
    expect(declaration.signature).toContain("export interface AnalyzeTypeDocOutput")
    expect(declaration.members.map(member => member.name)).toEqual(["document", "sources"])
    expect(declaration.members[0]!.description).toContain("Структурированная документация")
    expect(declaration.members[1]!.description).toContain("SHA-256")
    expect(declaration.comment.summary).toContain("Данные после `await analyzeTypeDoc({root, path})`")
    expect(declaration.comment.summary).toContain("Promise отклоняется с Error")
    expect(declaration.comment.examples[0]).toContain("analysis.sources")
    expect(analysis.sources.some(source => source.path === join(repository, "typedoc/parser/contract/output.ts"))).toBe(true)
    expect(analysis.sources.some(source => source.path === join(repository, "typedoc/shared/types/model.ts"))).toBe(true)
    expect(Object.keys(analysis).sort()).toEqual(["document", "sources"])
  }, 20000)

  test("tuple сохраняет readonly, имена, optional и rest без методов массива", async () => {
    const root = await fixture({"input.ts": `/**
@property first - Первый аргумент.
@property [second=fallback] - Второй аргумент.
@property rest - Остальные аргументы.
*/
export type Input<T> = readonly [first: T, second?: number, ...rest: boolean[]]
export type Concrete = Input<string>
export type Unnamed = [string, number?]
export type Empty = []`})
    const {document} = await analyzeTypeDoc({root, path: "input.ts"})
    expect(document.declarations[0]!.signature).toContain("readonly [first: T, second?: number, ...rest: boolean[]]")
    expect(document.declarations[0]!.members).toEqual([
      {name: "first", type: "T", optional: false, description: "Первый аргумент."},
      {name: "second", type: "number | undefined", optional: true, description: "Второй аргумент.", defaultValue: "fallback"},
      {name: "rest", type: "boolean[]", optional: false, description: "Остальные аргументы."},
    ])
    expect(document.declarations[1]!.members[0]).toMatchObject({name: "first", type: "string"})
    expect(document.declarations[2]!.members.map(({name, optional}) => ({name, optional}))).toEqual([{name: "0", optional: false}, {name: "1", optional: true}])
    expect(document.declarations[3]!.members).toEqual([])
  })

  test("стандартный Promise не раскрывает методы, пользовательский Promise сохраняет поля", async () => {
    const root = await fixture({
      "local.ts": "interface Promise<T> { payload: T; then: string }\nexport type LocalPromise = Promise<string>",
      "input.ts": `export type AsyncValue = Promise<{value: string}>
export type Thenable = PromiseLike<number>
export type {LocalPromise} from "./local.ts"`,
    })
    const {document} = await analyzeTypeDoc({root, path: "input.ts"})
    expect(document.declarations[0]!.signature).toContain("Promise<{value: string}>")
    expect(document.declarations[0]!.members).toEqual([])
    expect(document.declarations[1]!.members).toEqual([])
    expect(document.declarations[2]!.members.map(member => member.name)).toEqual(["payload", "then"])
  })

  test("реальный DiagramNodeProps: readonly, optional, callback, @property и пример", async () => {
    const result = await analyzeTypeDoc({root: repository, path: "nodes/node/diagram/contract/input.ts"})
    expect(result.document.name).toBe("input.ts")
    expect(result.document.declarations).toHaveLength(1)
    const declaration = result.document.declarations[0]!
    expect(declaration.name).toBe("DiagramNodeProps")
    expect(declaration.kind).toBe("interface")
    expect(declaration.signature).toContain("interface DiagramNodeProps")
    expect(declaration.signature).toContain("readonly id: string")
    expect(declaration.members).toHaveLength(11)
    expect(declaration.comment.summary).toStartWith("Данные отображения диаграммной ноды.")
    expect(declaration.comment.examples[0]).toContain('id: "example"')
    const members = new Map(declaration.members.map(member => [member.name, member]))
    expect(members.get("id")).toMatchObject({type: "string", optional: false})
    expect(members.get("shape")).toMatchObject({type: "NodeShape | undefined", optional: true, defaultValue: "rectangle"})
    expect(members.get("rect")!.type).toContain("width: number")
    expect(members.get("onActivate")!.type).toContain("(event: Event) => void")
    expect(members.get("intrinsic")!.defaultValue).toBe("false")
    expect(members.get("rect")!.description).toContain("rect.height не используется")
    expect(result.sources.some(source => source.path === join(repository, "nodes/node/shared/contracts.ts"))).toBe(true)
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
    for (const source of result.sources) {
      expect(source.digest).toBe(createHash("sha256").update(await readFile(source.path)).digest("hex"))
    }
  }, 20000)

  test("импорты, реэкспорт, наследование, Partial и локальные комментарии полей", async () => {
    const root = await fixture({
      "base.ts": `/** База.\n@property [mode=auto] - Режим из шапки.\n*/
export interface Base<T> {
  /** Идентификатор поля. */
  id: T
  mode?: "auto" | "manual"
}
export type Shape = "circle" | "rectangle"
export interface EmptyBase {}`,
      "bridge.ts": 'export type {Base, Shape, EmptyBase} from "./base.ts"',
      "input.ts": `import type {Base, Shape, EmptyBase} from "./bridge.ts"
/** Контракт.\n@property [shape=circle] - Форма.\n*/
export interface Input extends Base<string>, EmptyBase {
  shape?: Shape
  /** Обработчик изменения. */
  onChange: (value: Shape) => void
}
/** Частичный контракт. */
export type Patch = Readonly<Partial<Input>>
interface Local { value: number }
export type {Local as PublicLocal}
export type {Shape as PublicShape} from "./bridge.ts"`,
      "unrelated.ts": "export interface Unrelated { ignored: true }",
    })
    const result = await analyzeTypeDoc({root, path: "input.ts"})
    expect(result.document.declarations.map(item => item.name)).toEqual(["Input", "Patch", "PublicLocal", "PublicShape"])
    const input = result.document.declarations[0]!
    expect(input.members.find(member => member.name === "id")).toMatchObject({type: "string", optional: false, description: "Идентификатор поля."})
    expect(input.members.find(member => member.name === "mode")).toMatchObject({optional: true, description: "Режим из шапки.", defaultValue: "auto"})
    expect(input.members.find(member => member.name === "shape")).toMatchObject({description: "Форма.", defaultValue: "circle"})
    expect(input.members.find(member => member.name === "onChange")!.description).toBe("Обработчик изменения.")
    expect(result.document.declarations[1]!.members.every(member => member.optional)).toBe(true)
    expect(result.document.declarations[1]!.members.find(member => member.name === "shape")!.defaultValue).toBe("circle")
    expect(result.document.declarations[3]!.members).toEqual([])
    expect(result.sources.map(source => source.path).filter(path => path.startsWith(root))).toEqual([join(root, "base.ts"), join(root, "bridge.ts"), join(root, "input.ts")])
  })

  test("скалярные alias не раскрывают встроенные методы", async () => {
    const root = await fixture({"input.ts": `export type Text = string
export type Count = number
export type Flag = boolean
export type Literal = "a" | "b"
export type Callback = (value: string) => number
export type BrandedText = string & {readonly brand: "id"}
export type RecordUnion = {value: string} | {value: number}`})
    const {document} = await analyzeTypeDoc({root, path: "input.ts"})
    expect(document.declarations.slice(0, 6).every(declaration => declaration.members.length === 0)).toBe(true)
    expect(document.declarations[6]!.members).toEqual([{name: "value", type: "string | number", optional: false, description: ""}])
  })

  test("не исполняет исходник и импортированный модуль", async () => {
    const root = await fixture({
      "dependency.ts": 'throw new Error("Импортированный модуль исполнен")\nexport interface Base { value: number }',
      "input.ts": 'import "./dependency.ts"\nimport type {Base} from "./dependency.ts"\nthrow new Error("Исходник исполнен")\nexport interface Input extends Base {}',
    })
    expect((await analyzeTypeDoc({root, path: "input.ts"})).document.declarations[0]!.members[0]!.type).toBe("number")
  })

  test("отклоняет отсутствующий, пустой, синтаксически и семантически сломанный источник", async () => {
    const root = await fixture({"empty.ts": "", "malformed.ts": "export type Broken = { value:", "unknown.ts": "export type Broken = Missing"})
    for (const [name, message] of [
      ["absent.ts", "исходник не найден"],
      ["empty.ts", "нет экспортируемого type/interface"],
      ["malformed.ts", "неверный TypeScript"],
      ["unknown.ts", "ошибки типов"],
    ] as const) {
      const error = await analyzeTypeDoc({root, path: name}).then(() => undefined, error => error)
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain(message)
    }
  })


  test("отслеживает пустую базу и тип ссылки, но не соседние исходники", async () => {
    const root = await fixture({
      "base.ts": "export interface Base {}",
      "shape.ts": 'export type Shape = "circle" | "rectangle"',
      "input.ts": 'import type {Base} from "./base.ts"\nimport type {Shape} from "./shape.ts"\nexport interface Input extends Base { shape: Shape }',
      "unrelated.ts": "export type Unrelated = string",
    })
    const before = await analyzeTypeDoc({root, path: "input.ts"})
    expect(before.sources.map(source => source.path)).toEqual([join(root, "base.ts"), join(root, "input.ts"), join(root, "shape.ts")])
    await writeFile(join(root, "base.ts"), "export interface Base { id: string }")
    const after = await analyzeTypeDoc({root, path: "input.ts"})
    expect(after.sources.find(source => source.path.endsWith("/base.ts"))!.digest).not.toBe(before.sources.find(source => source.path.endsWith("/base.ts"))!.digest)
    expect(after.document.declarations[0]!.members.map(member => member.name)).toEqual(["shape", "id"])
  })

  test("отклоняет сломанный импортированный контракт", async () => {
    const root = await fixture({
      "base.ts": "export type Base = Missing",
      "input.ts": 'import type {Base} from "./base.ts"\nexport interface Input { value: Base }',
    })
    const error = await analyzeTypeDoc({root, path: "input.ts"}).then(() => undefined, error => error)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain("base.ts")
    expect(error.message).toContain("ошибки типов")
  })

  test("digest и результат обновляются при изменении импортированного типа", async () => {
    const root = await fixture({"dependency.ts": "export interface Base { value: number }", "input.ts": 'import type {Base} from "./dependency.ts"\nexport interface Input extends Base {}'})
    const before = await analyzeTypeDoc({root, path: "input.ts"})
    await writeFile(join(root, "dependency.ts"), "export interface Base { value: string }")
    const after = await analyzeTypeDoc({root, path: "input.ts"})
    const digest = (result: typeof before, name: string) => result.sources.find(source => source.path === join(root, name))!.digest
    expect(digest(after, "dependency.ts")).not.toBe(digest(before, "dependency.ts"))
    expect(digest(after, "input.ts")).toBe(digest(before, "input.ts"))
    expect(after.document.declarations[0]!.members[0]!.type).toBe("string")
  })
})

test("комментарии изолируют примеры, теги и разные длины fences", () => {
  const first = readComment([`/**
 * Обзор.
 * @example
 * ~~~~ts
 * @property fake - Это текст примера.
 * ~~~
 * ~~~~
 * @property {string} [title=hello world] - Заголовок.
 * Продолжение.
 * @example Второй пример.
 */`, "/** Дополнительный обзор. */"])
  expect(first.comment.summary).toBe("Обзор.\nДополнительный обзор.")
  expect(first.comment.examples).toEqual(["~~~~ts\n@property fake - Это текст примера.\n~~~\n~~~~", "Второй пример."])
  expect(first.properties.get("title")).toEqual({description: "Заголовок.\nПродолжение.", defaultValue: "hello world"})
  expect(first.properties.has("fake")).toBe(false)
  const second = readComment(["/** Другой обзор.\n@example Независимый пример. */"])
  expect(second.comment.examples).toEqual(["Независимый пример."])
  expect(first.comment.examples).toHaveLength(2)
})
