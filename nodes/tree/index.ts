/**
Живая модель нодовой системы без графических зависимостей.

`model` хранит topology, Parameter Store и договор проекций; `persistence`
сохраняет развёрнутый документ и применяет JSON Patch. Общая foundation-механика
связывает существующие публичные операции, не материализуя будущие NodeType.

@packageDocumentation
*/
export * from "./model/parameter/src/index.ts"
export * from "./model/node-tree/src/index.ts"
export * from "./model/projection/src/index.ts"
export * from "./persistence/json-patch/src/index.ts"
export * from "./persistence/serialization/src/index.ts"
export * from "./shared/foundation.ts"
