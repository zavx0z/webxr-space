import type {TypeDocDocument, TypeDocSource} from "../../shared/types/model.ts"

/**
Данные после выполнения {@link @webxr/typedoc/parser#analyzeTypeDoc | analyzeTypeDoc}.
Результат сериализуется в JSON и не содержит объектов компилятора.

Функция возвращает Promise этого результата. При отсутствии файла,
экспортируемых type/interface или при ошибках TypeScript Promise отклоняется с Error.
Сессия API закрывается до завершения Promise, включая завершение с ошибкой;
исходники и импортированные модули не исполняются.

@property document - Справочник {@link TypeDocDocument} для передачи визуальному компоненту.
Сигнатуры и типы сохранены как TypeScript, Markdown используется внутри описаний и примеров.

@property sources - Снимки {@link TypeDocSource} прочитанных источников для сверки актуальности.
Потребитель сверяет снимки перед публикацией результата и при изменениях зависимостей.

@example
```ts
const analysis = await analyzeTypeDoc({root: projectRoot, path: "contract/input.ts"})
const document = analysis.document
const sources = analysis.sources
```
*/
export interface AnalyzeTypeDocOutput {
  readonly document: TypeDocDocument
  readonly sources: readonly TypeDocSource[]
}
