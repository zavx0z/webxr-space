# TopDown: порты и контуры

`layoutTopDown` сохраняет прежний портовый вход `TopDownLayoutGraph`. Его
сортировка, NORTH/SOUTH endpoints и результат не изменены: семь снимков до
доработки сравниваются целиком, включая порядок и все control points.

Новый `TopDownContourGraph` выбирается явно через `attachment: "contour"`:

```ts
layoutTopDown({
  attachment: "contour",
  nodes: [
    {id: "a", width: 140, height: 44, shape: "rectangle"},
    {id: "b", width: 90, height: 90, shape: "circle"},
  ],
  edges: [{id: "ab", sourceNodeId: "a", targetNodeId: "b", endInset: 4}],
})
```

Размеры поступают от вызывающего кода, без DOM/CSS/Renderer. Порядок nodes/edges
значим; никаких сортировки edge IDs, reverse insertion и port constraints у
контурной диаграммы нет. Rank/position остаются у Dagre3.1.1. Совместимый старый
flat order адаптирован из dagre-d3-es7.0.14 без новых зависимостей; авторство и MIT
сохранены в algorithms/top-down/src/LICENSE.dagre-order.md. Compound поведение
не заявлено: публичный договор принимает только плоский DAG, но полностью
сохраняет служебные dummy nodes длинных рёбер. Циклы отклоняются typed witness.

`shape`: rectangle (по умолчанию), ellipse или circle. Круг требует width=height.
Связь пересекает контур лучом из центра к ближайшей внутренней Dagre guide point.
Для contour результата ports пуст: пересечения не выдаются за Socket anchors.
Edge содержит исходные `guidePoints`, независимые `attachment.start/end` до inset
и cubic `curves` после inset/скругления. Весь input/result сериализуется Worker.
Сохранены лимиты128нод/512связей; ограничение256точных портов относится к портовой ветви.

Inset неотрицателен и должен помещаться в конечный guide segment; некорректный
inset отклоняется. Rounded trim=min(5/sin(angle/2),len1/2,len2/2). Сохраняются
горизонтальные guide segments, quadratic преобразуется в cubic математически
точно. Числа результата округляются до1e−7, differential tolerance1e−6.
Spacing50/50/20 и padding8 являются defaults с явными override options.

## Evidence и граница утверждения

`tests/references/dagre-7.0.14.json` — независимый upstream numeric oracle,
созданный generator из фиксированного npm dagre-d3-es7.0.14; содержит source hashes.
Это не запуск Desktop и не размеры из снимка. Synthetic случаи: исходные7нод
с двумя наборами размеров, разные высоты/дроби, ромб, длинное ребро, disconnected,
parallel edges, степень12, numeric IDs и иной порядок edges. Проверяются x/y/w/h,
raw routes, bounds, pure input, детерминизм и direct/Worker equality.
`ports-before.json` — результаты прежнего solver из исследовательского snapshot.
`generate.ts` запускается только вручную; обычные tests эталоны не переписывают.

Reference Desktop:26.903.61454/build8378, Mermaid11.16.0. Сохранённое исследование
нашло ещё shape/marker/render stages и Desktop postprocess. Поэтому числовая
совместимость с upstream не называется pixel-perfect совпадением с Desktop.
Полного исполняемого Desktop dataset и exact fonts/screenshot metrics нет.

## Интеграция

Mermaid TD/TB/BT использует измеренные GraphView dimensions и contour-вход,
spacing50/rankSpacing50/padding8. LR/RL сохраняют Fixed. Не меняются Component
identity, Document/Canvas/Space, observer lifecycle и модель @nodes/tree.
DiagramNode поддерживает CSS custom properties для padding и typography;
Mermaid задаёт собственные значения, а остальные consumers сохраняют defaults.
Фон и цвета берутся из публичной темы приложения, не из зеркала Desktop tokens.
В круглом Mermaid node padding учитывает reference ширину label+64; measured
bbox проходит как ellipse до стабилизации square, затем это та же окружность.
Sans font request не доказывает наличие точного Desktop font; это отдельный
интеграционный рубеж. Stadium parser пока отображает как oval: parity этой формы
не заявлена, в опорном графе все фигуры rectangle.

Link получает generic числовой marker geometry, цвет и толщину. Без markers
прежние открытые стрелки сохраняются. Для заполненной стрелки используется
обычный vector-path с CSS fill; platform owner реализует общую capability.
Начальные/конечные gaps линии применяются после скругления, отдельно от marker
tips: интегрирование длины с допуском1e−8 и de Casteljau сохраняют исходную кривую.
Проверка на параболе использует аналитическую длину. Короткая линия, в которую
не помещаются gaps, сохраняется. Это числовой эквивалент clipping по длине, не
зависимость от SVG getTotalLength или второго renderer.

Mermaid применяет reference point inset4 до скругления; neo+Desktop дают gaps4
без стрелки и8 со стрелкой после него. Marker viewport/refX преобразованы в
triangle points с сохранённым logical scale. Эти значения принадлежат Mermaid
presentation adapter, а не всем пользователям TopDown. Цвет/шрифт и растровые
отличия требуют отдельной визуальной проверки при одинаковом окружении.
