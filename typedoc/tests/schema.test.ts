import {afterAll, describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {analyzeTypeDoc} from "../parser"

describe("JSON Schema из TypeScript и TSDoc", async () => {
  const root = await mkdtemp(join(tmpdir(), "typedoc-schema-"))
  afterAll(() => rm(root, {recursive: true, force: true}))
  await Bun.write(join(root, "tsconfig.json"), JSON.stringify({compilerOptions: {strict: true, noEmit: true, types: [], target: "esnext"}, include: ["*.ts"]}))
  await Bun.write(join(root, "item.ts"), '/** Элемент списка.\n@property name - Название элемента.\n*/\nexport interface Item { name: string }')
  await Bun.write(join(root, "input.ts"), `import type {Item} from "./item"
/** Чтение сценария.
@property path - Путь к файлу сценария.
@property [mode] - Режим чтения.
@property items - Элементы входа.
*/
export interface Input {
  readonly path: string
  mode?: "source" | "result"
  items: readonly Item[]
  result: {ok: true, value: number} | {ok: false, reason: string}
  mapping: Record<string, number>
  next?: Input
  pair: readonly [name: string, count?: number]
  parts: [head: string, ...tail: number[]]
  callback?: (value: string) => void
}`)
  const analysis = await analyzeTypeDoc({root, path: "input.ts"})
  const schema = analysis.document.declarations[0]!.schema!

  test("описания и обязательность берутся из декларации", () => {
    expect(schema).toMatchObject({type: "object", description: "Чтение сценария.", properties: {
      path: {type: "string", description: "Путь к файлу сценария."},
      mode: {type: "string", enum: expect.arrayContaining(["source", "result"]), description: "Режим чтения."},
    }})
    expect(schema.required).toEqual(["path", "items", "result", "mapping", "pair", "parts"])
  })
  test("массивы сохраняют импортированный тип и его описание", () => {
    expect(schema.properties?.items).toMatchObject({type: "array", description: "Элементы входа.", items: {
      type: "object", properties: {name: {type: "string", description: "Название элемента."}}, required: ["name"],
    }})
    expect(analysis.sources.some(source => source.path === join(root, "item.ts"))).toBeTrue()
  })
  test("варианты сохраняют связанные обязательные поля", () => {
    expect(schema.properties?.result?.anyOf).toMatchObject([
      {type: "object", properties: {ok: {const: true}, value: {type: "number"}}, required: ["ok", "value"]},
      {type: "object", properties: {ok: {const: false}, reason: {type: "string"}}, required: ["ok", "reason"]},
    ])
  })
  test("словари, рекурсия и кортежи используют стандартные ключи JSON Schema", () => {
    expect(schema.properties?.mapping).toMatchObject({type: "object", additionalProperties: {type: "number"}})
    expect(schema.properties?.next).toEqual({$ref: "#"})
    expect(schema.properties?.pair).toEqual({type: "array", prefixItems: [{type: "string"}, {type: "number"}], minItems: 1, maxItems: 2, items: false})
    expect(schema.properties?.parts).toEqual({type: "array", prefixItems: [{type: "string"}], minItems: 1, items: {type: "number"}})
  })
  test("callback не выдаётся за допустимые JSON-данные", () => {
    expect(schema.properties?.callback).toMatchObject({not: {}, description: expect.stringContaining("не представим в JSON")})
  })
})
