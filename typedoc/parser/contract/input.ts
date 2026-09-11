/**
Рабочий контекст и исходник для {@link @webxr/typedoc/parser#analyzeTypeDoc | analyzeTypeDoc}.

@property root - Рабочий каталог проекта для разрешения исходника и конфигурации TypeScript.
Относительный root разрешается от текущего рабочего каталога процесса.

@property path - Путь к TypeScript-файлу, чьи экспортированные type/interface нужно описать.
Относительный путь разрешается от root; абсолютный используется непосредственно.
Импорты разрешает TypeScript, код исходника и его модулей не исполняется.

@example
```ts
const result = await analyzeTypeDoc({
  root: projectRoot,
  path: "nodes/node/diagram/contract/input.ts",
})
```
*/
export interface AnalyzeTypeDocInput {
  readonly root: string
  readonly path: string
}
