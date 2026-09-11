/**
Исходник {@link @webxr/markdown/mermaid#Mermaid | Mermaid} для общего
{@link @webxr/nodes/view#GraphView | GraphView}.

@property source - Mermaid-код без Markdown-ограждения.
Изменение запускает асинхронный разбор; диаграмма показывается после измерения
нод и готовности раскладки. Ошибка разбора отображается рядом с исходным кодом.

@example
```ts
const input: MermaidInput = {source: "flowchart LR\nA --> B"}
```
*/
export interface MermaidInput {
  readonly source: string
}
