/**
Локальная проекция базы flowchart для {@link @webxr/markdown/mermaid#Mermaid | Mermaid}.
Используется внутри последовательной очереди разбора; не задаёт полную API-модель Mermaid.

@property getVertices - Даёт узлы базы до [нормализации модели](../src/parser.ts).
Адаптер читает `id`, подпись `text` и необязательную форму `type`;
неподдерживаемую форму отклоняет, пустую подпись заменяет идентификатором.

@property getEdges - Даёт исходные связи до проверки поддержанного подмножества.
`start`/`end` связывают узлы, `type` задаёт наконечники; непустой `text`
и `stroke`, отличный от normal, приводят к ошибке адаптера.

@property getDirection - Возвращает исходное направление; адаптер заменяет TD на TB.
После нормализации разрешены LR, RL, TB и BT.

@property getSubGraphs - Позволяет обнаружить неподдержанные вложенные графы.
Адаптер проверяет только длину результата и отклоняет непустой список.
*/
export interface FlowDatabase {
  readonly getVertices: () => Map<string, Readonly<{
    id: string
    text: string
    type?: string
  }>>
  readonly getEdges: () => readonly Readonly<{
    start: string
    end: string
    type: string
    text?: string
    stroke?: string
  }>[]
  readonly getDirection: () => string
  readonly getSubGraphs: () => readonly unknown[]
}
