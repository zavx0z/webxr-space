/**
Анализирует несколько TypeScript-документов одной API session и одним snapshot.
Ошибки документов изолированы в строках результата; исходные модули не исполняются.

@packageDocumentation
*/
import {API} from "typescript/unstable/async"
import {resolve} from "node:path"
import {stat} from "node:fs/promises"
import {analyzeTypeDocProject} from "../shared/parser/analyze-project.ts"
import {attestTypeScriptConfigurations} from "../shared/parser/configuration-attestation.ts"
import {usingBatchSession} from "./src/session.ts"
import type {AnalyzeTypeDocsInput} from "./contract/input.ts"
import type {AnalyzeTypeDocsOutput} from "./contract/output.ts"
import type {AnalyzeTypeDocsResult} from "./types/result.ts"

export type {AnalyzeTypeDocsInput} from "./contract/input.ts"
export type {AnalyzeTypeDocsOutput} from "./contract/output.ts"

/**
Извлекает документы нескольких файлов через одну TypeScript API session.

Все пути открываются одним snapshot. Затем каждый документ анализируется независимо:
локальная ошибка записывается в result, а следующие пути продолжают использовать session.

@param input - Project root, непустой ordered набор путей и optional отмена.

@returns Результаты после закрытия session, включая локальные ошибки отдельных путей.

@throws При пустом/повторном пути, отмене либо невозможности создать общий snapshot.

@example
```ts
const batch = await analyzeTypeDocs({
  root: projectRoot,
  paths: ["contract/input.ts", "contract/output.ts"],
})
```
*/
export async function analyzeTypeDocs(input: AnalyzeTypeDocsInput): Promise<AnalyzeTypeDocsOutput> {
  const root = resolve(input.root)
  if (!Array.isArray(input.paths) || input.paths.length === 0) throw new Error("TypeDoc batch: paths должен быть непустым массивом")
  const paths = input.paths.map(path => resolve(root, path))
  if (new Set(paths).size !== paths.length) throw new Error("TypeDoc batch: paths не должен содержать повторные пути")
  input.signal?.throwIfAborted()
  const missing = new Set<string>()
  for (const path of paths) {
    if (!(await stat(path).catch(() => undefined))?.isFile()) missing.add(path)
  }
  input.signal?.throwIfAborted()
  const existing = paths.filter(path => !missing.has(path))
  if (existing.length === 0) return {results: paths.map(path => ({ok: false, path, error: `TypeDoc batch: исходник не найден: ${path}`}))}
  const configurations = await attestTypeScriptConfigurations(existing)
  return usingBatchSession(
    () => new API({cwd: root}),
    async api => {
      const snapshot = await api.updateSnapshot({openFiles: existing})
      const results: AnalyzeTypeDocsResult[] = []
      for (const path of paths) {
        input.signal?.throwIfAborted()
        if (missing.has(path)) {
          results.push({ok: false, path, error: `TypeDoc batch: исходник не найден: ${path}`})
          continue
        }
        try {
          const project = await snapshot.getDefaultProjectForFile(path)
          if (!project) throw new Error(`TypeDoc: исходник не найден: ${path}`)
          results.push({ok: true, path, analysis: await analyzeTypeDocProject(project, path, configurations.sources)})
        } catch (error) {
          if (input.signal?.aborted) throw input.signal.reason
          results.push({ok: false, path, error: error instanceof Error ? error.message : String(error)})
        }
      }
      await configurations.verify()
      return {results}
    },
  )
}
