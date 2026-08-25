# Storybook `@engine/core`

Здесь лежат development-only stories, которыми владеет `@engine/core`.
Production-пакет их не экспортирует и не включает в свой TypeScript project.

Приватное приложение `@engine/storybook` собирает этот каталог через
`@zavx0z/storybook/stories`. Метаданные загружаются сразу, а каждый scene-модуль
— отдельным dynamic import только для точного detail route:

- `space/coordinate-system/z-up`
- `instanced-mesh/geometry/boxes`
- `holographic-material/geometry/torus`
- `thin-film-material/geometry/sphere`
- `text/presentation-clip/stencil`

Overview может показать первый принадлежащий ему detail только после успешного
поиска самого overview в route tree. Неизвестный путь не выбирает fallback story.
