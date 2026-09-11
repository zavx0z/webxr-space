import {afterEach, expect, test} from "bun:test"
import {mkdtemp, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {analyzeTypeDocs} from "../batch/index.ts"

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, {recursive: true, force: true})))
})

test("batch изолирует ошибку пути и учитывает config в source closure", async () => {
  const root = await mkdtemp(join(tmpdir(), "typedoc-batch-"))
  roots.push(root)
  const config = join(root, "tsconfig.json")
  const baseConfig = join(root, "tsconfig.base.json")
  const valid = join(root, "valid.ts")
  const invalid = join(root, "invalid.ts")
  const missing = join(root, "missing.ts")
  await writeFile(baseConfig, JSON.stringify({compilerOptions: {strict: true, noEmit: true}}))
  await writeFile(config, JSON.stringify({extends: "./tsconfig.base.json", include: ["*.ts"]}))
  await writeFile(valid, "export interface Valid {value: string}\n")
  await writeFile(invalid, "export interface Invalid {value: MissingType}\n")

  const output = await analyzeTypeDocs({root, paths: [valid, invalid, missing]})
  expect(output.results.map(result => ({path: result.path, ok: result.ok}))).toEqual([
    {path: valid, ok: true},
    {path: invalid, ok: false},
    {path: missing, ok: false},
  ])
  const success = output.results[0]!
  expect(success.ok && success.analysis.document.declarations[0]?.name).toBe("Valid")
  expect(success.ok && success.analysis.sources.some(source => source.path === config)).toBeTrue()
  expect(success.ok && success.analysis.sources.some(source => source.path === baseConfig)).toBeTrue()
  expect(output.results[1]).toMatchObject({ok: false, error: expect.stringContaining("ошибки типов")})
  expect(output.results[2]).toMatchObject({ok: false, error: expect.stringContaining("исходник не найден")})
  expect((await analyzeTypeDocs({root, paths: [missing]})).results).toHaveLength(1)
})
