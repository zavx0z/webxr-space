/**
Worker transport и исполнение фиксированной политики.

requestId и generation различают ожидающие запросы, cancelBefore удаляет старые
поколения, dispose завершает lifecycle. Другие алгоритмы сохраняют точные
публичные client/executor subpaths и собственные реализации рядом с алгоритмами.

@packageDocumentation
*/

export * from "./src/index.ts"
