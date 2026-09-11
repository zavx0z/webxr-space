import type {AnalyzeTypeDocsResult} from "../types/result.ts"

/**
Результаты {@link @webxr/typedoc/batch#analyzeTypeDocs | analyzeTypeDocs}
после закрытия общей TypeScript API session.

Ошибка конкретного исходника представлена своей строкой и не удаляет успешные
результаты соседних путей, включая отсутствующий файл. Ошибка общей конфигурации,
создания snapshot/session или отмена отклоняет весь Promise.

@property results - Строки в порядке `paths`; каждый путь имеет один success либо failure.
*/
export interface AnalyzeTypeDocsOutput {
  readonly results: readonly AnalyzeTypeDocsResult[]
}
