# Storybook `@engine/core`

Здесь лежат development-only stories, которыми владеет `@engine/core`.
Production-пакет их не экспортирует и не включает в свой TypeScript project.

`packages/core/.storybook/catalog.json` связывает эти owner modules обычными
JSON module/export references. Функций loader и импортов Storybook здесь нет;
external Storybook генерирует отдельный lazy import для точного detail route:

- `space/coordinate-system/z-up`
- `instanced-mesh/geometry/boxes`
- `holographic-material/geometry/torus`
- `thin-film-material/geometry/sphere`
- `text/presentation-clip/stencil`

Каждый overview остаётся отдельным состоянием shared Workbench и не загружает
скрытый первый detail. Неизвестный путь не выбирает fallback story. Native
WebGPU canvas и camera принадлежат structural adapter в соседней `.storybook/`.
