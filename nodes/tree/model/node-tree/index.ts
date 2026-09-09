/**
Живой граф с устойчивой identity узлов и Parameter Store.

Снимки отделены от изменяемых Stores; topology revision и адресные уведомления
позволяют потребителям принимать согласованные изменения и очищать подписки.

@packageDocumentation
*/

export * from "./src/index.ts"
