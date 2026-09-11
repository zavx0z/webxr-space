import type {AnalyzeTypeDocOutput} from "../../parser/contract/output.ts"

/** Успешный результат одного пути без объектов TypeScript compiler. */
export interface AnalyzeTypeDocsSuccess {
  readonly ok: true
  readonly path: string
  readonly analysis: AnalyzeTypeDocOutput
}

/** Локальная ошибка одного пути, не отменяющая анализ соседних документов. */
export interface AnalyzeTypeDocsFailure {
  readonly ok: false
  readonly path: string
  readonly error: string
}

/** Результат одного пути в общей TypeScript API session. */
export type AnalyzeTypeDocsResult = AnalyzeTypeDocsSuccess | AnalyzeTypeDocsFailure
