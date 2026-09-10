# Defaults DiagramNode

DiagramNode владеет общим видом диаграммной ноды: rectangle radius10px,
fill rgba(54,54,54,.96), border1px white/.156 и белый текст. Обычный padding15/11px
плюс border даёт label+32/+24; круг использует horizontal padding31px и square
после измерения. Oval/circle сохраняют border-radius50%. Текст —16px/20px с тем же
ранее использовавшимся system font stack. Новые шрифты и registry не добавлялись.

Это defaults DiagramNode, не всех Pane/ContentNode/ParameterNode или глобальной UI.
`--diagram-node-*` CSS overrides сохранены. MermaidNode только передаёт данные;
Mermaid сохраняет aliases осмысленных `--mermaid-*` overrides без копии defaults,
фон собственной сцены, parsing/layout и reference-specific параметры маркера.
Обычный dependency viewer использует тот же DiagramNode без отдельного оформления.
