# 0003. Состав и размещение пакетов

- Статус: принято
- Дата: 2026-09-02
- Источник: `codex://threads/01a05e95-a6b2-7c40-a566-6c6991fe958a`

## Принцип

Самостоятельный пакет находится непосредственно в корне monorepo. Если часть
не имеет самостоятельного public contract, release и lifecycle, она является
внутренним каталогом owning package, а не ещё одним workspace package.

Физический корневой каталог совпадает с простым basename пакета. Используется
единый scope `@zavx0z`; составные имена с дефисом не создаются.

## Целевые производственные пакеты

| Каталог | Пакет | Владелец |
| --- | --- | --- |
| `engine/` | `@zavx0z/engine` | retained scene objects и GPU resources |
| `dom/` | `@zavx0z/dom` | semantic Document, nodes и events |
| `template/` | `@zavx0z/template` | compiler, JSX lowering и compiled ABI |
| `component/` | `@zavx0z/component` | component state, hooks, context и lifecycle |
| `renderer/` | `@zavx0z/renderer` | CSS, layout, display list и hit projection |
| `webgpu/` | `@zavx0z/webgpu` | Renderer-to-Engine WebGPU projection |
| `browser/` | `@zavx0z/browser` | один browser Experience, Canvas, input и frame lifecycle |
| `space/` | `@zavx0z/space` | spatial semantic elements и Components |
| `layout/` | `@zavx0z/layout` | чистые graph/space placement algorithms и worker execution |
| `ui/` | `@zavx0z/ui` | target-neutral UI Components |
| `graph/` | `@zavx0z/graph` | NodeTree model и headless editing |
| `nodes/` | `@zavx0z/nodes` | визуальные Node Components |

Средства диагностики не входят в обязательный производственный контур. Текущий
DOM inspector сохраняется в `tools/debug/` до появления реального потребителя и
отдельного решения о public package.

## Сопоставление прежних пакетов

| Прежние пакеты | Целевой пакет |
| --- | --- |
| `@engine/core` | `@zavx0z/engine` |
| `@zavx0z/dom` | `@zavx0z/dom` |
| `@zavx0z/template` | `@zavx0z/template` |
| `@zavx0z/react` | `@zavx0z/component` |
| `@zavx0z/renderer` | `@zavx0z/renderer` |
| `@zavx0z/renderer-webgpu` | `@zavx0z/webgpu` |
| `@zavx0z/renderer-browser` | `@zavx0z/browser` |
| `@ui/components` | `@zavx0z/ui` |
| `@nodes/core`, `@nodes/editor` | `@zavx0z/graph` |
| `@nodes/layout`, `@nodes/worker` | `@zavx0z/layout` |
| `@nodes/ui` | `@zavx0z/nodes` |
| `@zavx0z/dom-devtools` | `tools/debug/`, public status не принят |

## Отклонено

- общий каталог `packages/`;
- каталоги-семейства `renderer/{core,browser,webgpu}` и
  `node/{core,editor,layout,ui,worker}`;
- package names с `-`;
- `core` как публичное имя без самостоятельной предметной роли;
- `presentation` и `presentation-layout` как преждевременно созданные пакеты.
