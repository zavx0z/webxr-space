# Векторная заливка

`VECTOR-FILL`: [авторский договор и evidence](../renderer/html/vector-fill.md).
Backend получает готовые CSS-цвет, winding rule, sampled geometry и clips.
`src/path-fill.ts` разбивает контур горизонтальными полосами по вершинам и
пересечениям рёбер, затем выдаёт неперекрывающиеся треугольники. Поэтому
прозрачность не накапливается на самопересечениях или внутренних диагоналях.

Неизменяемая geometry и fill-rule служат ключами WeakMap кэша. Новый цвет,
opacity, transform или projection не запускают tessellation. GPU использует
обычный MeshBasicMaterial и существующий triangle-list pipeline, общие clips,
матрицы и lifecycle. Нет дополнительного Canvas, texture rasterization или
engine capability. Stroke остаётся в прежнем instanced/scalar pipeline.

Backend удерживает Mesh, BufferGeometry и material по semantic node + key.
Изменение контура/правила обновляет position/index attributes; смена цвета
меняет только material. Удаление paint освобождает geometry через существующий
invalidateGeometry, а dispose освобождает оставшиеся ресурсы. Пустая область
(например, два одинаковых оборота с evenodd) имеет невидимый retained mesh и
не отправляет пустые vertex buffers на GPU.

Лимит tessellation — 1 048 576 вершин на контур; превышение выдаёт RangeError
при подготовке до изменения retained сцены. Parser сохраняет прежние ограничения:
65 536 символов, 2 048 токенов, 256 кубических участков, координаты до 16 777 216
по модулю. Заливка не улучшает прежнюю аппроксимацию Q/C (шесть шагов).

`tests/vector-fill.test.ts` проверяет triangles/interior, color/geometry/rule
updates, transform/clip/opacity, stroke combination, hidden и resource release.
Native результат проверяется в Storybook `@renderer/html/vector/fill/geometry`.

## Native GPU evidence — 2026-09-10

Через Storybook MCP выполнены nonlive build, exact open/inspect/capture,
затем live apply. Применённая revision `2036312fd7b6f2dc83792193`, owner
`@renderer/html`, route `vector/fill/geometry`. Diagnostics и consoleErrors пусты.
Preview capture `capture_-wEQu4uP3QALn1wvr5ST6OMr`, 2304×2048,
SHA-256 `58b1898c5ac2a536a8be2aade77cc3c99bd6a621f5838cc5614d068c58649307`.

В самом GPU-изображении видны сплошной красный triangle, зелёная вогнутая
заливка с белой обводкой, синяя Q-кривая, жёлтая рамка с незакрашенным
отверстием, масштабированная и обрезанная оранжевая заливка, пустая внутри
белая обводка и полупрозрачная пурпурная C-кривая. Скрытого контура нет.
Это визуальная проверка generic capability, не сравнение с дизайном Codex
и не benchmark. Capture принадлежит хранилищу Storybook; его доступность
зависит от retention этого сервера.
