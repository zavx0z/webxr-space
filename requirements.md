# Требования `@ui/components`

`@ui/components` владеет reusable semantic DOM compositions и их обычным
CSS. Пакет не является renderer layer и не создаёт Engine, WebGPU, Layout,
Surface или отдельный Elements runtime.

## `UI-DOM-VISUAL-001` — сохранённый Blender 5.2 contour

Переход с retained Surface API на стандартный DOM меняет authoring и runtime
boundary, но не является редизайном. Blender 5.2 LTS остаётся обязательным
reference для состава, формы, плотности, группировки, palette/material states и
interaction всех visible Components. Production CSS сохраняет compact
rectangular low-radius controls, плотные rows/groups, тонкие borders/separators
и различимые idle/hover/active/selected/disabled states. Oversized pills,
rounded cards и увеличенные пустые интервалы запрещены без отдельного
scope-specific owner decision и reference evidence.

Один и тот же production owner используется standalone, внутри `Field` и у
consumer-композиций. DOM migration не разрешает заменять production component
частным Storybook sample, упрощать состав либо расходиться по visible
height/radius/border/gap/icon/text rhythm. Проверка нового или изменённого
visible slice включает equal-scale comparison с точным 5.2 reference;
typecheck, unit tests и non-black canvas не являются visual acceptance.

Reference является provenance, а не public vocabulary: package names,
TypeScript identifiers, CSS classes и user-facing labels остаются нейтральными.

## `UI-DOM-THEME-001` — source-backed theme и material states

`@ui/components/theme` владеет immutable `UiTheme`, `WidgetClass`,
`WidgetState`, `Rgba8`, `rgba8ToColor` и pure `resolveWidgetColors`. Theme
разделяет raw roles для regular/text/number/number-slider/option/toggle/tool/
toolbar-item/tab/menu/menu-back/menu-item/box/list-item/scroll и material roles
для widget emboss, menu shadow, editor border/outline, checker и status bar.
Widget class нельзя схлопывать в один generic background/hover law.

Resolver детерминированно применяет class-specific hover, pressed, selected,
active-default и disabled transitions. Production CSS получает цвета из этого
owner и сохраняет один logical-pixel widget emboss у standalone filled control;
joined `ControlGroup` владеет одним outer contour и не создаёт emboss islands
на middle cells. Exact visual owner хранит собственный radius: совпадающие
числа не образуют глобальный radius token.

Document renderer исполняет native pseudo-state cascade. Production Components
используют `:hover`, `:active`, `:focus`, `:focus-within`, `:disabled`,
`:checked` и `:indeterminate` напрямую и не поддерживают параллельный
`data-ui-state` bridge.

## Public boundary

Пакет публикует ровно 29 exact production subpaths:

- `@ui/components/button`
- `@ui/components/field`
- `@ui/components/pane`
- `@ui/components/checkbox`
- `@ui/components/badge`
- `@ui/components/typography`
- `@ui/components/text-field`
- `@ui/components/control-group`
- `@ui/components/number-input`
- `@ui/components/integer-input`
- `@ui/components/color-input`
- `@ui/components/vector-input`
- `@ui/components/matrix-input`
- `@ui/components/reference-input`
- `@ui/components/enum-input`
- `@ui/components/collection-input`
- `@ui/components/path-input`
- `@ui/components/switcher`
- `@ui/components/progress-checkbox`
- `@ui/components/slider-control`
- `@ui/components/divider`
- `@ui/components/list`
- `@ui/components/table`
- `@ui/components/inspector`
- `@ui/components/code-editor`
- `@ui/components/hud`
- `@ui/components/icons`
- `@ui/components/syntax-theme`
- `@ui/components/theme`

Root barrel, `./dom/*`, story exports и compatibility subpath aliases
отсутствуют. Каждый public subpath указывает прямо на единственный natural
physical `*.tsx` owner. Параллельных `.ts` controller implementations,
`*-component.tsx` aliases и `createX` re-exports нет.

Общий minified browser proof всех финальных owners должен содержать ноль
`.ui-*`, `data-ui-state` и legacy factory code и оставаться ниже
120 kB / 30 kB gzip при external DOM, highlighter, React-shaped runtime и
Template ABI.

## DOM ownership

Component — обычная TSX-функция, которую `@zavx0z/template` понижает в
static DOM mount и addressed bindings, а `@zavx0z/react` планирует без Fiber и
virtual DOM. Stable standard element subtree сохраняет persistent identities;
Text, properties, styles and keyed children изменяются адресно. Это
единственная production authoring model пакета.

Platform inheritance остаётся в `@zavx0z/dom`:
`EventTarget → Node → Element → HTMLElement` и специализированные
`HTML*Element`. Components не создаёт параллельные element classes.

## Styling and layout

Один flat CSS document владеет flow, Flex, dimensions, spacing, overflow,
states и advisory presentation. Component не вычисляет sibling coordinates,
display lists, hit geometry или GPU resources. Public Components expose one
`style`, never `sx` or `className`: owner defaults are deterministic
`defineStyles` tokens and the caller declaration is applied last. Authored JSX
contains no BEM/state classes. Native `:hover`, `:active`, `:focus`,
`:focus-within`, `:disabled`, `:checked` and `:indeterminate` are resolved by
the document renderer instead of a `data-ui-state` bridge.

## Controls and events

Input, textarea, select, button, progress, meter и image используют standard
DOM properties and events. Controlled component публикует proposed value через
listener/callback, но не создаёт второй value store и не фабрикует browser
events. `title`, ARIA и boolean attributes принадлежат соответствующему
`HTMLElement`.

Повторный render того же compiled Component сохраняет persistent element, Text
и keyed child identities. Native `input`/`change`/`click`/pointer/focus events
остаются standard bubbling events; property update не фабрикует event.
Controlled callback сообщает proposed value owner-у, а live editing state
остаётся в standard DOM property до следующего explicit owner render.

## Exact owners

- `button`, `pane`, `badge`, `typography` и `divider` владеют neutral
  foundation compositions и Blender-compatible CSS states.
- `text-field`, `checkbox`, `switcher`, `number-input`, `integer-input`,
  `slider-control` и `progress-checkbox` владеют standard live control
  properties и interaction semantics.
- `control-group`, `vector-input` и `matrix-input` владеют keyed joined cells с
  одним outer contour.
- `enum-input`, `reference-input`, `collection-input`, `path-input` и
  `color-input` остаются самостоятельными production controls; `Field` только
  композирует их semantic contracts и не становится их единственным API.
- `list` и `table` владеют semantic keyed collections и сохраняют descendant
  identities при reorder.
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

Detailed component and Storybook laws остаются executable в natural owner
tests и private `@ui/storybook` tests.

## `UI-COMPILED-BUTTON-001` — first final component owner

`@ui/components/button` exports ordinary TSX `Button(props)` and
`IconButton(props)`. Template lowers them into `@zavx0z/template/compiled` and
`@zavx0z/react` owns scheduling and composition. `IconButton` returns
`Button`; it contains no second visual implementation. The stable Button
subtree is `button > img + span + img`, so start/end/icon-only modes preserve
semantic identities across updates and use exact SVG image sources.

The production contour keeps the historical regression metrics `18/22/28px`
for small/medium/large, 3px content gap, 14px icon slot, 11px default text,
thin border and low radius until equal-scale Blender 5.2 evidence authorizes a
change. Owner CSS is class-free and native-pseudo based; caller `style` is the
only public visual override.

`Button` и `IconButton` являются единственными production owners этого
контракта; imperative controller alias отсутствует.

## `UI-COMPILED-TEXT-FIELD-001` — controlled native text owner

`@ui/components/text-field` exports TSX `TextField(props)` over one exact
`HTMLInputElement`. Its `value` is a live controlled property; `input` and
`change` callbacks read the proposed value from the standard Event target and
never fabricate another event or buffer. Updates preserve the input identity.
Owner geometry is the compact 160×22 regression contour with 11px text, thin
border and low radius. `readOnly` is a conditional owner token, interaction
uses native pseudos, and caller `style` remains the only public override.

The production Storybook TextField route composes `TextField` inside a small
hook component using `useState`. Its HTML source does not fabricate a `value`
content attribute for live state; executable TypeScript carries the current
value instead.

## `UI-COMPILED-NUMBER-INPUT-001` — joined numeric interaction owner

`@ui/components/number-input` exports controlled TSX `NumberInput(props)` as
one 120×22 joined contour. It composes the already-owned `IconButton` twice
around one standard Number input; middle cells create no independent emboss
islands. Exact Button/input identities survive controlled updates.

Side buttons propose one `step`. Horizontal pointer scrubbing uses the current
controlled value as its immutable gesture baseline, Shift applies 0.1
precision, Ctrl snaps to `step`, hard/soft bounds clamp proposals, and Escape
proposes the focus baseline. Native `input`/`change` remain standard bubbling
events. The component stores only transient gesture/edit refs and never owns a
second value Store. The Storybook route wraps this exact owner with `useState`.

`IntegerInput` is not a second numeric implementation: its TSX component
returns `NumberInput`, supplies integer step/value semantics and rounds every
proposal before forwarding it. The composed component identities remain
visible in runtime evidence.

## `UI-COMPILED-COMPOSITION-001` — nested owners, not copied markup

Final compound controls reuse final components as compiled component calls.
`ControlGroup` owns keyed cells and composes one `TextField` per cell;
`VectorInput` returns `ControlGroup`; `MatrixInput` owns keyed rows of keyed
`ControlGroup` cells. `ProgressCheckbox` returns `Checkbox`. `PathInput`
composes `TextField` and `IconButton`; `ReferenceInput` composes `Button` and
two `IconButton` actions. `ColorInput` composes `Button`, `TextField` and
`SliderControl`. `CollectionInput` composes `List` and `Button` actions.

These are runtime-visible component boundaries with independent hook slots and
stable semantic element identities, not source-only helpers or copied DOM.
Keyed reorder preserves both the parent component instance and every retained
nested component/element. Joined owners suppress nested contour shadows and
radii through owner tokens while keeping exactly one caller-facing `style`.

## `UI-COMPILED-COLLECTIONS-001` — keyed List and Table

`List` compiles each item as a keyed `ListRow`. `Table` independently keys
columns, rows and the cells within every row. Reordering either axis performs
minimal retained placements and never calls `replaceChildren()` for the final
path. Selection and disabled state are semantic ARIA plus owner tokens; hover
is a native pseudo. `CollectionInput` consumes the same `List` owner rather
than maintaining a second list implementation and preserves the historical
1–8 visible-row height table.

## `UI-COMPILED-FIELD-001` — one discriminated component graph

`Field({definition, style})` owns one stable semantic Field row and dispatches
all supported definitions to the exact final owners: text, numeric input,
slider, integer, checkbox, switch, enum, color, vector, rotation, matrix,
reference, collection, path and readonly. It does not own parallel control
markup or a second value store. Controlled proposals flow directly to the
callback on the current definition. Changing a value preserves the active
owner; changing the discriminant replaces only that conditional control range
while preserving the Field row and label relation.

The definition is semantic data and therefore exposes no class or style
escape hatch. `style` belongs only to the `Field` component itself. The
control area uses `role="group"` plus `aria-labelledby` so composite owners
retain a standard accessible label without inventing a non-DOM event model.

## `UI-COMPILED-CODE-EDITOR-001` — keyed semantic source projection

`CodeEditor` is a read-only compiled TSX leaf over one
`section > ul + pre > code` tree. Line numbers, source lines and token spans are
independently keyed, so an addressed source update retains every line/token
whose semantic key survives. Token colors are inline authored declarations;
all structural geometry is class-free owner CSS. The source-backed highlighter
and caller-supplied `Tokens` share one pure `buildCodeEditorViewModel` module,
used by the natural component and its Storybook adapter—tokenization is not
duplicated between runtime and documentation.

The public contract remains `readOnly: true`. It exposes no clipboard,
selection Store, editor mutation protocol, className or `sx`; those would be
separate standard DOM capabilities rather than hidden component state.

## `UI-COMPILED-INSPECTOR-001` — authored section composition

`Inspector` owns the exact toolbar, search, category rail, context and content
regions. `InspectorSections` receives a compiler-owned keyed children
collection; each `InspectorSection` receives one direct authored component
child. A product can therefore place the actual compiled `Field`, node panel or
other owner in a section without passing raw DOM Nodes or constructing a
parallel section tree. `InspectorTextSection` is only the primitive-text
composition of the same `InspectorSection`, not a second section owner.

Category and section reorder preserve their nested component identities.
Selection/query/expanded state remains controlled in the caller, standard
input/click events carry proposals, and `isInspectorSectionVisible` is a pure
projection used by the container. Search composes `TextField`; category and
section headers compose `Button`. Geometry remains the compact 30px rail,
115×22 search and 26px section header contour.

## `UI-COMPILED-HUD-001` — Window, Frame and Timeline compositions

`HudWindow` and `HudFrame` accept direct authored component children for their
bodies. They compile keyed action/handle Buttons and retain the body subtree
while minimized, reordered or reconfigured. `Timeline` independently keys
tracks and the markers within each track and composes the common Button owner
for its transport. Window active state, Frame edge and Timeline selection are
owner style tokens; interaction is reported through controlled callbacks.

All three retain their historical 320×160, 300×140 and 640×140 minimum
contours, 28px headers and low-radius materials. `HudWindow`, `HudFrame` and
`Timeline` являются их единственными production implementations.

## `UI-COMPILED-FOUNDATIONS-001` — neutral visual primitives

`Pane`, `Badge`, `Typography` and `Divider` are ordinary class-free TSX
functions compiled by `@zavx0z/template` and scheduled by `@zavx0z/react`.
Each exports one `style`; deterministic owner tokens are applied first and the
caller declaration last. Their production contours preserve the existing
reference metrics: Pane has 8px padding, a thin 4px-radius contour and its
filled/outlined/transparent/active materials; Badge has the 20px minimum
height, 2×6px padding, 3px radius and five tones; Typography preserves the
11/12/13/15px caption/body/subtitle/title rhythm; Divider remains a 1px rule
with full-width, 96% inset and 90% middle variants.

`Pane` accepts authored component children through the compiler-owned direct
`props.children` slot. A child is a retained component value, nullable child
range or keyed component collection—not a virtual element tree. The explicit
primitive `content` binding remains for text-only call sites; supplying both is
an error. No imperative compatibility controller exists beside the TSX owner.

## `UI-COMPILED-RESOURCE-INPUTS-001` — joined resource controls

`PathInput` and `ReferenceInput` are controlled class-free TSX compositions
with one public `style` applied after owner defaults. `PathInput` composes the
exact production `TextField` and folder `IconButton`; `ReferenceInput` composes
one value `Button` with picker and clear `IconButton` actions. Their standard
input/change/click events report proposed owner intent and never create a
second value Store or fabricate browser events. Missing actions stay mounted
and hidden so later updates preserve their Button and image identities.

Each composition owns one joined outer contour. Nested TextField/Button cells
have zero radius and no shadow, so no emboss islands appear between them;
native `:hover`, `:active`, `:focus` and `:disabled` behavior continues through
the already-owned controls and resource-specific cell tokens.
The exact regression geometry remains 320×28 regular / 220×24 compact for
PathInput and 260×28 regular / 190×24 compact for ReferenceInput, with 26px
regular and 22px compact inner cells.

`PathInputProps` and `ReferenceInputProps` expose `style`, never `className`;
imperative compatibility adapters are absent.

## Dependency boundary

Production dependencies are only exact semantic owners required by the
subpaths: `@zavx0z/dom`, `@zavx0z/react`, `@zavx0z/template` and
`@zavx0z/highlighter`. Imports of
`@engine/core`, `@layout/core`, `@ui/elements`, `@ui/hud`,
`@zavx0z/renderer`, Storybook or product packages are forbidden.

## Acceptance

1. Manifest exports exactly the 29 subpaths above and every target exists.
2. Production typecheck succeeds from `tsconfig.production.json`.
3. Focused component tests prove stable identity, controlled state, standard
   event propagation, validation-before-mutation and disposal.
4. `@ui/storybook` renders the same production DOM/CSS owners through the
   document renderer with exact route readiness, console 0 and non-black
   canvas evidence.
5. Repository and bundle scans contain no retained Surface/Layout/Elements/HUD
   implementation or compatibility path.
6. Theme resolver, compact geometry and every public control state have focused
   tests; current Blender 5.2 visual evidence remains candidate until explicit
   owner acceptance.
