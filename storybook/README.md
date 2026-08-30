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
WebGPU canvas, Space и ViewPoint принадлежат external Experience. Story-owned
adapter добавляет и удаляет только один `Object3D` root в выданном
`context.space`, а compiled semantic anchor публикуется атомарным runtime/3
`present` вместе с source provenance.
