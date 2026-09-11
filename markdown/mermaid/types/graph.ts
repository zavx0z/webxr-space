import type {NodeShape} from "@nodes/node/contracts"

/**
Нормализованная модель flowchart между Mermaid parser, раскладкой и {@link @webxr/nodes/view#GraphView | GraphView}.
Parser замораживает граф, массивы и записи; геометрия добавляется отдельным планом.

@property direction - Направление потока; исходное TD нормализуется в TB.
LR/RL выбирают горизонтальную раскладку, TB/BT — вертикальную; RL и BT отражают план.

@property nodes - Узлы в порядке базы Mermaid, без вычисленных координат.
`id` сохраняет идентификатор Mermaid и связывает измерения с рёбрами;
`label` содержит текст без HTML, с переносами из br и fallback на id;
`shape` использует {@link NodeShape}: rectangle, circle или oval после проверки parser.

@property edges - Связи в порядке базы Mermaid с ключами вида `edge-0`.
`from` и `to` ссылаются на id узлов; `startArrow` и `endArrow` определяют
наконечники и отступ маршрута. Подписи и неподдержанные стили parser отклоняет.
*/
export interface MermaidGraph {
  readonly direction: "LR" | "RL" | "TB" | "BT"
  readonly nodes: readonly Readonly<{
    id: string
    label: string
    shape: NodeShape
  }>[]
  readonly edges: readonly Readonly<{
    id: string
    from: string
    to: string
    startArrow: boolean
    endArrow: boolean
  }>[]
}
