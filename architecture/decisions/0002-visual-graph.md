# 0002. Единый визуальный граф

- Статус: принято
- Дата: 2026-09-02
- Источник: `codex://threads/01a05e95-a6b2-7c40-a566-6c6991fe958a`

## Решение

Один расширенный semantic `Document` является единственным каноническим
визуальным графом. `Space` является сценой этого Document.

В том же Document находятся `ViewPoint`, `Mesh`, `Geometry`, `Material`,
`Display`, `HUD`, универсальные UI-компоненты и нодовые компоненты. Engine,
Object3D и WebGPU хранят только производные retained-проекции semantic nodes.

`Display` и `HUD` являются равноправными целями проекции одного Document и
Space. Перенос одного semantic subtree между ними сохраняет identity, состояние
компонентов, listeners, focus и retained resources.

## Следствия

- один Experience владеет одним Document, Canvas, Renderer, Space, ViewPoint,
  вводом и циклом кадров;
- пространственные элементы имеют типизированные отношения вместо строкового
  `attach`;
- Component authoring должен быть сравним по удобству с R3F, но без Fiber,
  VDOM, второго публичного scene graph и reflective catalog;
- CSS layout остаётся в Renderer, а Engine не становится источником semantic
  identity.

## Отклонено

- отдельный `World` поверх `Space`;
- второй canonical Engine или Three-подобный graph;
- отдельные Document/Canvas для Display, HUD или компонента;
- различный допустимый состав содержимого Display и HUD;
- consumer-local Renderer, parser, event system или ручная раскладка как обход
  отсутствующей возможности платформы.
