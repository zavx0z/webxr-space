# Требования @ui/components

> **[Built for MetaFor](https://github.com/zavx0z/metafor)** as reusable visual WebGPU components.

`@ui/components` владеет универсальными WebGPU-controls поверх `@ui/elements`.
Они не знают о Node, Socket, Link, Card, Hamiltonian или layout.

Public Component является составной UI-единицей поверх HTML-подобных Elements.
`IconButton` собирается из `button` + icon content, `ControlGroup` — из
`div`/`input`/Flex/separators, а Field inputs — из этих Components. Составной
control нельзя опустить в Elements только ради повторного использования.

## Retained parent boundary

1. Components остаются function-based композициями Elements и не создают
   собственные классы component, `Object3D` parents либо параллельный scene
   graph. Consumer создаёт один устойчивый retained parent для самостоятельно
   изменяемого component subtree и materialize-ит вызов Component внутри него;
   все visual children, hit, wheel и clip автоматически stage-ятся под exact
   parent действующей transaction.
2. Content, available size, style и controlled interaction делают dirty только
   consumer-owned parent этого Component. Consumer повторяет его local FlexBox
   plan и атомарную materialization; соседние parents не перестраиваются.
   Keyboard/caret TextField и programmatic/smooth List/Table scroll используют
   тот же keyed render path Elements, а не отдельный Component-механизм.
3. Pure transform общего или component parent меняет только inherited
   `matrixWorld`: local plan/materialization counters, children и geometry
   identities сохраняются. Regular и compact Field, вложенные TextField,
   Checkbox и Switcher наследуют один и тот же parent transform без локального
   scale floor.
4. Component, вызванный напрямую на standalone immediate Surface, остаётся
   flat и может перестраиваться вместе с Surface. Это допустимый fallback для
   subtree без независимого transform и dirty lifecycle; missing либо
   неоднозначный render key не выбирает случайный retained owner.

## Composition boundary

1. Каждый Component исполняет
   [`UI-COMPOSITION-001..004`](../../ARCHITECTURE.md#ui-composition-law) и
   получает механику slot/Flex/retained/clip только из
   [контракта `@layout/core`](https://github.com/zavx0z/layout/blob/main/packages/core/requirements.md).
2. Два и более semantic child slots одного Component планируются одним
   `flexRow`, `flexColumn`, `flexRowCss` либо `flexColumnCss`. Component не
   вычисляет offsets siblings и не восстанавливает геометрию parent frame.
3. Visual primitives внутри одного выданного slot могут вычислять glyph,
   caret, selection, border и icon geometry. Это исключение не распространяется
   на gutter, header, toolbar, content region либо другие semantic siblings.
4. Focused structural test доказывает Flex composition и consumer-owned retained
   parent каждого нового composite Component; pixel-only test этот gate не
   заменяет.

## Dev storybook boundary

1. Components package page `/components/` является desktop consumer общего Workbench
   `@ui/storybook`. Package-owned typed stories владеют metadata, concrete
   component/section/variant stories, lazy exact production imports, preview,
   raw HTML/CSS, exact TypeScript, controls и events; package не копирует общий shell. Mount `/components/` и
   каждый route prefix открывают overview непосредственных детей и оканчиваются
   `/`, а полный detail pathname — нет. Overview сохраняет полный five-panel
   Workbench и использует первый detail descendant для preview/source вместо
   отдельной generic catalog Surface.
2. Consumer preview владеет одним устойчивым retained root. Каждый независимо
   изменяемый controlled Field материализуется под устойчивым parent с ключом
   его `id`; изменение одного value не перестраивает shell или соседние Fields.
3. Одноразовые Button и Pane fragments могут оставаться flat внутри exact
   preview parent: у них нет отдельного transform или recurring local dirty
   lifecycle. Справа одновременно видны raw HTML, raw CSS, exact TypeScript и
   три независимых Copy actions; controls меняют те же args, events остаются
   observable output. Dock показывает variants; статический Info не
   заменяет editors.
4. Catalog, controls и editor/event labels пишутся по-русски; API identifiers, exact public subpaths,
   pathname routes и копируемый TypeScript не переводятся. Все действующие
   Components и universal Field kinds представлены явно; отсутствующий
   production export показывается честным status, а не ложным import.
5. Новый public Components leaf не считается полностью принятым без concrete
   package-owned story и manifest-completeness checkpoint. Если production и
   storybook принадлежат разным active tasks, production result явно создаёт
   зависимый storybook slice, а следующий public leaf не сдвигает acceptance
   snapshot до его story/result. Lazy implementation остаётся вне initial entry.

## Inspector

1. Exact `@ui/components/inspector` владеет нейтральной editor-панелью:
   outer editor region, vertical category rail, toolbar с controlled search,
   optional context row и scrollable controlled disclosure sections. Component
   не знает Storybook, HTML, CSS, TypeScript, Blender либо product vocabulary.
2. `categories`, `selectedCategoryId`, `query` и `section.expanded` являются
   controlled consumer state. Category может объявить exact `sectionIds`;
   выбранная category фильтрует принадлежащие ей sections, а query дополнительно
   фильтрует их labels. Category/section/action callbacks не создают второго
   state owner.
3. Rail/content, toolbar/actions и section header/content планируются nested
   `flexRow`/`flexColumn`. Section content получает единственный authoritative
   rect callback, а вся колонка scroll-ится через Elements `div`; ручной sibling
   cursor не является альтернативным layout. Все внутренние visual/input owners
   вызываются только внутри `Pane.children`, поэтому outer radius/clip/retained
   parent действительно ограничивает весь subtree.
4. Blender-compatible default geometry принадлежит exact Component styles:
   outer editor radius `6`, section radius `4`, logical rail/toolbar/category/
   section-header `30/30/28/26`, centered search width до `115` и thin rules.
   Top toolbar проходит над всей шириной, rail начинается только под ней.
   Caller flat `style` применяется последним к outer region.
   Storybook использует Inspector как consumer и передаёт собственные categories,
   sections, editors, controls и events без копирования его chrome.

## Read-only CodeEditor

1. `CodeEditor` является function-based production Component для отображения
   многострочного кода внутри consumer-owned retained parent. Он не создаёт
   `UiSurface`, runtime, renderer, canvas, header либо HUD frame.
2. Первый public contract честно поддерживает только `readOnly: true`.
   Component владеет line-number gutter, tokenized text, single pointer
   selection и независимым horizontal/vertical scroll, но не публикует caret,
   text mutation, paste/cut, undo/redo, wrap либо debugger/Git vocabulary.
3. `tokens` имеют приоритет над language resolution. Иначе язык выбирается
   через exact `@zavx0z/highlighter` по `languageId`, затем `path`, с plaintext
   fallback. Используются только `Token`, `Tokens` и `Tokenize`; editor aliases
   запрещены.
4. Syntax presentation использует действующую Islands Dark theme. Явный
   `Token.fg` сильнее category fallback, а `Token.bg` сохраняет color swatch.
   Blender 5.2 `.space_text` задаёт background, darker line-number gutter,
   line-number text, selection и cursor roles; syntax palette остаётся Islands
   Dark по отдельному owner decision. Gutter примыкает к editor frame без
   общего content padding; inset принадлежит только строкам кода. Source-backed
   editor outline визуально отделяет `.space_text.back` от preview background.
   Radius и shaped descendant clip принадлежат parent `Pane`/`div` по
   `LAYOUT-CLIP-001`; CodeEditor не воспроизводит углы parent вручную.
5. Pointer selection является локальным view state точного `key`. `Cmd/Ctrl+C`
   копирует только непустое выделение через один Elements-owned keyed read-only
   text participant; soft keyboard и mutating input target не создаются.
6. Shared Storybook source panel использует три production `CodeEditor` с HTML,
   CSS и TypeScript languages, сохраняет отдельные title/copy/scroll/selection
   owners каждого документа, controls и events owners. Scroll либо selection
   одного editor rematerialize-ит только его owner.
7. Gutter и text region являются двумя semantic sibling slots одного
   `flexRow`: gutter получает fixed width, text region — grow remainder и
   собственный content inset. Ручные `codeStartX`/`codeClipX` sibling offsets
   запрещены; focused structural test доказывает Flex plan.

## Универсальные поля

1. `Field` является discriminated union с устойчивым `id`, `label`, optional
   description/disabled state и точным value contract.
2. Полный набор содержит `text`, `number`, `integer`, `boolean`, `enum`, `color`,
   `vector`, `rotation`, `matrix`, `reference`, `collection`, `path` и
   `readonly` fields. Slider является presentation mode number field, а не
   отдельным типом значения.
3. `NumberInput`/number Field является canonical FLOAT contract. Public
   `IntegerInput`/integer Field является canonical INT contract: integer
   normalization, default step `1`, hard/soft bounds и optional in-control
   label. Оба используют один shared numeric gesture/normalization engine;
   `numberKind:"integer"` остаётся compatibility adapter и не создаёт вторую
   pointer state machine. `VectorField` использует 2–4 подписанных numeric axes;
   Rotation использует тот же control с отдельным semantic kind.
4. `ColorField` хранит нормализованный RGBA, `EnumField` — stable option value,
   `ReferenceField` — opaque consumer ID и display label. Компонент не загружает
   resource и не знает его domain. `EnumInput` единолично владеет optional
   selected/per-option icons и общей alignment column смешанного списка,
   передавая Field label как popup header через generic Select content hooks.
   `ColorInput` использует source-backed HSV cursor: current RGB fill, black/
   white value-derived contrast outlines и black outer/gray value inner narrow-
   slider indicator с white outline. Value strip остаётся achromatic
   white-to-black независимо от текущих hue/saturation.
   Только compact popup получает общий Blender menu shadow; expanded inline
   presentation не рисует popup shadow.
5. Field renderer вызывается одинаково на обычной Surface и внутри Node
   renderer. Node package может выбирать field по socket type, но не копирует
   field implementation.
6. Controlled callbacks передают новое immutable value. Read-only и disabled
   состояния не регистрируют mutating hit target.
7. Числовая нормализация, enum selection, color conversion, vector dimensions
   и field measurement являются pure helpers с отдельными tests.
8. Вся внутренняя композиция Field и его controls выполняется только через
   существующие `@ui/elements` `flexRow`/`flexColumn`. Ручные cursor/column/row
   offsets для размещения дочерних UI-компонентов запрещены.
9. Field имеет один semantic contract и два presentation density: regular для
   обычной панели и intrinsic compact для плотных embedded surfaces. Compact
   не принимает scene/canvas scale: внешний retained parent одинаково
   преобразует Field и соседние visual children. Compact не является
   Node-specific renderer и доступен любому consumer.
10. Inline Slider является общим layout `SliderControl`, а не локальной
    имитацией внутри Node. Vector/rotation/matrix compact rows также планируются
    nested Flex.
11. Semantic `label` Field остаётся обязательным независимо от presentation.
    Compact presentation может явно скрыть visual label и отдать control всю
    строку; это универсальная возможность Field, а не специальная Node-имитация.
12. Regular и compact используют одну Blender-compatible control silhouette и
    shared Elements shape metrics. Regular может добавить semantic label или
    доступное пространство, но не превращает rectangular control в pill, не
    увеличивает radius пропорционально height и не меняет stacked multi-axis
    composition на несопоставимый horizontal editor.
13. Standalone Component, Field и тот же control внутри Node Parameter обязаны
    визуально совпадать по visible height/radius/border/gap/icon/text rhythm при
    одинаковом available size. Node compact implementation не является
    отдельной удачной темой, которой может расходиться Components storybook.
14. `ControlGroup` получает только generic appearance `text | number | pointer`
    и единолично владеет base, outline и separators группы. Components mapping:
    Vector/Matrix используют number, Path — text, Reference — pointer, который
    внутри Components разрешается в regular class. Blender class names не
    входят в Field/Node public API.
14. `NumberInput` единолично переводит generic pointer gestures Elements в
    numeric value: side click применяет step, center release/Ctrl открывает
    text с end-caret и select-all, horizontal scrub использует soft range, step
    и precision, Shift уменьшает factor в десять раз, Escape/right возвращают
    исходное значение.
    Hard `min/max` остаются единственным value clamp; `softMin/softMax` влияют
    только на pointer mapping, нормализуются внутри hard bounds, а при отсутствии
    выводятся из finite hard bound либо adaptive range текущего value. Vector и
    Matrix получают тот же закон только через public `NumberInput`.
15. `NumberInput` всегда передаёт обязательный public `value` в explicit
    controlled Elements buffer: inactive owner update немедленно меняет
    visible numeric text, active text edit сохраняет локальный buffer до
    commit/cancel. IntegerInput, Vector, Rotation, Matrix, Field и Node не
    копируют эту синхронизацию и не подставляют fake `onChange`. Value-only и
    labeled presentations одинаково наследуют Elements-owned left/right handle
    insets; Component не рисует arrows и не добавляет локальный Vector/Matrix
    padding, а value/caret никогда не занимают icon zones.

## Целевой состав control library

Принятая UI-010 расширяет первый набор без параллельной Node-реализации:

1. `Field` остаётся единым semantic facade с устойчивым value contract, а
   конкретные input, slider, select, color picker/ramp, curve editor,
   reference picker и collection editor становятся самостоятельными public
   Components. Монолитный renderer не является владельцем всех interactions.
2. Один и тот же public control используется standalone, внутри Field и внутри
   Node Parameter. `@nodes/ui` не копирует control, не меняет его value contract
   и не вводит Node-specific вариант.
   Node integration является обязательным consumer gate каждого control,
   нужного действующей Node UI, а не отложенной демонстрацией после всей library.
3. Blender задаёт проверяемое поведение, состав, форму, группировку, состояния,
   пропорции, base palette и material states controls в обеих density. Project
   font выбирается composition root из Engine-owned default либо custom source;
   Component его не загружает. Semantic type/status colors получают явное
   Blender-role mapping. Boolean и прочие controls не сохраняют прежнее
   отличие без отдельного нового owner decision.
4. Размеры, padding, row rhythm и положение частей сверяются по точному Blender
   5.2 reference при сопоставимом масштабе, а не подбираются по fixture.
5. Context search, external picker actions и изменение collection передаются
   immutable callbacks владельцу данных. Перестройка Socket и Node topology
   остаётся ответственностью Node consumer, а не универсального Component.
6. Public input stories показывают production control в сопоставимом с Blender
   масштабе. Oversized centered preview и pill geometry не могут считаться
   visual acceptance только потому, что callbacks и type contract проходят.
7. Blender FLOAT mapping использует public `NumberInput`, INT mapping — exact
   `@ui/components/integer-input`. Field и Node consumer выбирают их semantic
   kind, не копируют rendering. Новый IntegerInput leaf проходит package-owned
   story, manifest completeness, exact delivery/root build и Node INT gate до
   acceptance.
8. Каждый public Component принимает единый flat `style`, наследует CSS-like
   defaults непосредственных Elements/Components, затем задаёт или
   переопределяет styles своего уровня и последним применяет caller `style`.
   `sx` запрещён; удобные typed implementation props допустимы и не образуют
   consumer DSL. Pane panel сохраняет
   разные material roles: `editorBorder` является base border региона, а
   inactive/active editor outline рисуется отдельным transparent overlay;
   Blender-compatible `borderRadius` задаётся в style текущего Pane level и
   может быть явно переопределён caller style. ControlGroup владеет одним outer
   widget emboss; его Button/Input cells не создают собственные emboss islands.

## CSS-like style contract

1. Consumer presentation выражается HTML/CSS template DSL. `NestedStyle`
   адресует внутренний exact owner через `& .part`, а visual state — через
   `&:state`; например `& .control` может содержать собственные `&:hover`,
   `&:active` и `&:disabled`.
2. `@zavx0z/template` парсит syntax, `@zavx0z/renderer` разрешает data и
   cascade, а WebXR backend один раз компилирует результат в flat typed
   root/part/state tables. Component render не разбирает selector strings, не
   обходит NestedStyle и не merge-ит CSS objects на каждом frame.
3. Внутренний function-based Component API может использовать эффективные
   typed props, numeric rect и готовые branches. Stateful Component выбирает
   branch прямым индексом. Storybook показывает три отдельные raw literal
   документа без tagged-template wrapper: native semantic HTML, полную
   inherited/default/override CSS-chain с exact owner comments и всеми state
   branches, а также exact internal TypeScript. Preview-only framing не
   считается стилем документируемого Component.

## Источник терминов

Blender используется как проверенная терминологическая и UX-основа, но код и
assets не копируются. Reference:

* <https://docs.blender.org/manual/en/latest/interface/controls/nodes/parts.html>
* <https://docs.blender.org/api/current/bpy.types.NodeSocketStandard.html>
* <https://docs.blender.org/manual/en/latest/interface/controls/buttons/fields.html>
