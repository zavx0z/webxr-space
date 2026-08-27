# Требования `@ui/components`

`@ui/components` владеет reusable semantic DOM compositions и их обычным
CSS. Пакет не является renderer layer и не создаёт Engine, WebGPU, Layout,
Surface или отдельный Elements runtime.

## Public boundary

Пакет публикует ровно шесть exact subpaths:

- `@ui/components/field`
- `@ui/components/inspector`
- `@ui/components/code-editor`
- `@ui/components/hud`
- `@ui/components/icons`
- `@ui/components/syntax-theme`

Root barrel, `./dom/*`, story exports, compatibility aliases и re-exports
отсутствуют. Каждый public subpath указывает прямо на единственного physical
owner.

## DOM ownership

Component factory получает exact `@zavx0z/dom` `Document`, создаёт один
stable standard element subtree и возвращает typed refs/controller. Update
изменяет attributes, live control properties, Text и keyed children без
замены persistent identities. Dispose снимает только owned listeners/state и
не удаляет consumer-owned root.

Platform inheritance остаётся в `@zavx0z/dom`:
`EventTarget → Node → Element → HTMLElement` и специализированные
`HTML*Element`. Components не создаёт параллельные element classes.

## Styling and layout

Один flat CSS document владеет flow, Flex, dimensions, spacing, overflow,
states и advisory presentation. Component не вычисляет sibling coordinates,
display lists, hit geometry или GPU resources. Public styling использует
standard classes/attributes; `sx`, Surface style tables и target-specific
drawing callbacks запрещены.

## Controls and events

Input, textarea, select, button, progress, meter и image используют standard
DOM properties and events. Controlled component публикует proposed value через
listener/callback, но не создаёт второй value store и не фабрикует browser
events. `title`, ARIA и boolean attributes принадлежат соответствующему
`HTMLElement`.

## Exact owners

- `field` владеет discriminated Field composition и keyed complex values.
- `inspector` владеет toolbar, category rail, sections и native search;
  основной contract id — `UI-DOM-INSPECTOR-001`, а search ref имеет exact
  `HTMLInputElement`.
- `code-editor` владеет semantic source view, line/token tree и read-only
  highlighter projection.
- `hud` владеет Window, Frame и Timeline compositions; отдельного
  `@ui/hud` package нет.
- `icons` владеет immutable image URLs.
- `syntax-theme` владеет source-backed scope color resolver.

Detailed controller and Storybook laws remain executable beside their
implementations under `dom/requirements.md` and focused tests.

## Dependency boundary

Production dependencies are only exact semantic owners required by the six
subpaths: `@zavx0z/dom` and `@zavx0z/highlighter`. Imports of
`@engine/core`, `@layout/core`, `@ui/elements`, `@ui/hud`,
`@zavx0z/renderer`, Storybook or product packages are forbidden.

## Acceptance

1. Manifest exports exactly the six subpaths above and every target exists.
2. Production typecheck succeeds from `tsconfig.production.json`.
3. Focused controller tests prove stable identity, controlled state, standard
   event propagation, validation-before-mutation and disposal.
4. `@ui/storybook` renders the same production DOM/CSS owners through the
   document renderer with exact route readiness, console 0 and non-black
   canvas evidence.
5. Repository and bundle scans contain no retained Surface/Layout/Elements/HUD
   implementation or compatibility path.
