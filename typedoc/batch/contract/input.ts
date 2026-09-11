/**
Набор исходников одного project root для {@link @webxr/typedoc/batch#analyzeTypeDocs | analyzeTypeDocs}.

@property root - Рабочий каталог, в котором TypeScript разрешает проекты и импорты.

@property paths - Непустой набор уникальных TypeScript-файлов.
Относительные пути разрешаются от root; порядок определяет порядок результатов.

@property [signal] - Отмена между отдельными документами batch.
До отклонения Promise функция закрывает общую TypeScript API session.
*/
export interface AnalyzeTypeDocsInput {
  readonly root: string
  readonly paths: readonly string[]
  readonly signal?: AbortSignal
}
