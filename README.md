# `@zavx0z/template`

Компилятор HTML-шаблонов в адресные операции над `@zavx0z/dom`.

Основной runtime-путь создаёт настоящие `Node`, `Element`, `HTMLElement` и
`Text`. Повторное обновление меняет только связанные текст, атрибут или
обработчик и сохраняет идентичность остальных DOM-объектов. Пакет ничего не
знает об Engine, layout, paint, WebGPU или UI-компонентах.

## Установка

```bash
bun add @zavx0z/template
```

## Direct DOM

```typescript
import {createDocument} from "@zavx0z/dom"
import {compile, html} from "@zavx0z/template"

const document = createDocument()
const root = document.createElement("div")
document.appendChild(root)

const counter = compile((state: {count: number; increment: () => void}) => html`
  <button title="Increase counter" onclick=${state.increment}>
    Count: ${state.count}
  </button>
`)

const instance = counter.mount(root, {count: 0, increment: () => {}})
const button = root.children[0]

instance.update({count: 1, increment: () => {}})
// button === root.children[0]
```

`instance.rootNodes` возвращает только authored root nodes. Внутренние
`Comment`-границы остаются приватной частью адресации. `@zavx0z/dom` подключён
как peer dependency и не встраивается в browser bundle, поэтому приложение и
Template работают в одном DOM realm.

`onclick=${handler}` подключается через стандартные
`addEventListener`/`removeEventListener`. `title`, `class`, `disabled`, `style`
и остальные атрибуты записываются через стандартный DOM API. Вложенные
`html`-шаблоны обновляются на месте, а массивы пока сопоставляются по позиции.
Динамические строки не парсятся повторно: в содержимом они становятся `Text`,
а в атрибутах передаются напрямую в `setAttribute`.

Границы первого среза и проверяемые требования находятся в
[`requirements.md`](./requirements.md).

## Статический syntax parser

Отдельный `parse()` API статически читает callback с `html\`...\`` и возвращает
типизированное syntax tree, не выполняя переданную функцию. Этот путь остаётся
для DSL-потребителей и не участвует в DOM runtime.

```typescript
import {parse} from "@zavx0z/template"

const nodes = parse(({html, value}) => html`
  <article>
    <h1>${value.title}</h1>
    ${value.items.map((item) => html`<p>${item.label}</p>`)}
  </article>
`)
```

`parse()` возвращает syntax `Node[]`. Public TSDoc в исходниках описывает точную форму
узлов, paths, expressions и ошибки parser.

## JSX/TSX

JSX и tagged `html` принадлежат одному репозиторию и одному DOM mutation
boundary. JSX source проходит через build-time `@zavx0z/template/compiler` и
понижает статическую структуру в `@zavx0z/template/compiled`: один mount
статических DOM nodes и числовые binding slots. Tagged `html` пока использует
собственный `TemplateProgram`/dynamic-part runtime; общего внутреннего IR между
двумя frontends ещё нет.

Владелец границы разделён намеренно: Template содержит source compiler и
`CompiledTemplate` ABI, а `@zavx0z/react` содержит только component scheduler,
hooks и `createRoot`. Название runtime-пакета описывает привычную форму API, но
не означает зависимость от React.

```tsx
import {createRoot, useState} from "@zavx0z/react"

function Counter({initial}: Readonly<{initial: number}>) {
  const [count, setCount] = useState(initial)
  return <button onClick={() => setCount(value => value + 1)}>{count}</button>
}

createRoot(container).render(<Counter initial={0} />)
```

Компонентный `children` остаётся compile-time syntax, а не runtime JSX value.
Автор типизирует принимающий prop структурным source-маркером и рендерит его
напрямую как `props.children`:

```tsx
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"

function Child({label}: Readonly<{label: string}>) {
  return <span>{label}</span>
}

function Pane(props: Readonly<{children: JsxSourceElement}>) {
  return <section>{props.children}</section>
}

function Application() {
  return <Pane><Child label="Output" /></Pane>
}
```

Compiler превращает authored child в `@zavx0z/react` `ComponentValue`, а
`props.children` — в один прямой retained `bindChild` range. Nullable
`JsxSourceElement | null` использует `bindConditional`; primitive
string/number/boolean/nullish content использует существующий `bindText`;
`readonly JsxSourceElement[]` использует `bindKeyed`, но только когда caller
доказуемо создаётся compiler-ом из keyed JSX `.map()` или нескольких explicit
component children с non-null keys. Raw arrays не становятся runtime children.

Compiler cache на children-heavy source проверяется командой
`bun run bench:jsx:children`. Runtime focused test отдельно делает 1,000
updates одного child graph и подтверждает неизменные mount/node identities.

Authoring TypeScript должен сохранять JSX до Template compiler:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@zavx0z/template"
  }
}
```

Intrinsic JSX типизируется стандартными глобальными DOM-интерфейсами. Компонент
не импортирует author-facing `Event`, `HTMLElement` или специализированный
element type из `@zavx0z/dom`: tag задаёт точный `currentTarget` события и
callback ref.

```tsx
function SearchField() {
  return <input
    onInput={event => {
      const input: HTMLInputElement = event.currentTarget
      const nativeEvent: InputEvent = event
      void input
      void nativeEvent
    }}
    ref={input => {
      const exact: HTMLInputElement | null = input
      void exact
    }}
  />
}
```

Это стандартный authoring contract, а не утверждение, что весь DOM уже
реализован. `compileFile()` возвращает тот же transformed code вместе с
нейтральными source-located `capabilityUsages`. Platform tooling может собрать
детерминированный interchange через `createCapabilityUsageManifest()` и
`serializeCapabilityUsageManifest()`; Template не читает platform matrix и не
назначает usage статус, owner или conformance.

Manifest v2 различает mount-time content attribute, addressed content-attribute
binding и dedicated DOM property transport. Статические JSX literals и CSS
declaration values сохраняются как facts; bounded CSS attribute selectors
экспортируются отдельно от pseudo. Поэтому downstream resolver может отличить
`<input type="checkbox">` от generic `<input>` без повторного парсинга TSX/CSS.

Для Bun build используется `createTemplateJsxBunPlugin()` из
`@zavx0z/template/bun`. Это тонкий adapter только для JSX-bearing расширений
(`.tsx`, `.jsx` и их `m`/`c` variants); обычные `.ts`/`.js` modules он не
перехватывает. Compiler session и TypeScript остаются в compiler process, а
production output импортирует только `@zavx0z/template/compiled` и
`@zavx0z/react`. React, Fiber, virtual DOM и runtime JSX descriptors
отсутствуют.

Тот же adapter можно подключить как test/dev preload. Для runtime
`Bun.plugin(...)` обязателен persistent session:

```typescript
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

Bun.plugin(createTemplateJsxBunPlugin({
  persistent: true,
  sourceRoots: ["./src", "./test"],
}))
```

`sourceRoots` — точная owner-граница, а не рекурсивное разрешение компилировать
все зависимости внутри project directory. Adapter выбирает наиболее
специфичный root и не перехватывает вложенный `node_modules`; физический
hard-link mirror допустим только при совпадении inode и относительной public
source identity. Явно переданный package root, который сам расположен под
`node_modules`, остаётся обычным owner root.

Профиль намеренно ограничен синхронными function declarations с одним финальным
JSX return. Component children поддерживают один governed component,
component-or-null, primitive text и compiler-owned keyed components;
принимающий component в первом профиле использует exact `props.children`.
Fragments, intrinsic elements через component boundary, explicit `children=`
attribute, destructured receiver, arrow/default/async components, spreads,
unkeyed и arbitrary array children завершают компиляцию точной ошибкой.
Compiler пока не создаёт edit-aware source map обратно к authored TSX
(`sourceMaps: false` в профиле). Caller может включить Bun `sourcemap`; такая
карта относится к сгенерированному `onLoad` source и не считается точным
authored-TSX mapping.

`@zavx0z/template/jsx-runtime` нужен TypeScript для JSX namespace и намеренно
падает, если JSX дошёл до runtime нескомпилированным. Скрытого fallback пути
нет. Его public authored-JSX marker, как и public compiled ABI, структурный:
два корректно установленных экземпляра пакета совместимы в TypeScript, а
runtime guards используют внутренние `Symbol.for(...)` brands.

## Compiled TSX styles

Внутренние owner styles объявляются прямо на intrinsic element. Отдельный
author-facing `defineStyles`, class name или экспорт CSS не требуется:

```tsx
function Button(props: Readonly<{selected?: boolean; style?: CssStyle}>) {
  return <button style={css`
    display: flex;
    height: 22px;
    &[aria-pressed="true"] { background: rgb(71 114 179); }
    &:hover { background: rgb(101 101 101); }
    &:active { background: rgb(71 114 179); }
    ${props.style}
  `}>Output</button>
}
```

`css` — typed global compiler intrinsic из exact `jsxImportSource`; импорт и
runtime global assignment не создаются. JavaScript style objects, camelCase,
author arrays и raw strings rejected. Compiler выносит module-stable declarations и supported selectors в scoped
`CompiledStyleSheet` metadata. Unconditional marker устанавливается во время
static mount, условный static fragment получает обычный addressed boolean
binding. Props/state-dependent base declarations и caller `style` остаются
inline binding и поэтому сохраняют более высокий cascade priority.

Первый профиль поддерживает `:active`, `:checked`, `:disabled`, `:focus`,
`:focus-within`, `:hover` и `:indeterminate`. Dynamic pseudo leaves, style
spreads, computed keys и nested/unknown pseudos завершают compilation точной
ошибкой. Это не скрытый runtime CSS-in-JS scanner: metadata строится compiler-ом,
а downstream Document/runtime регистрирует готовые `{id, cssText}` rules.

### Scoped CSS tagged templates

Тот же style pipeline принимает scoped tagged template без runtime import:

```tsx
function Button(props: Readonly<{
  hoverColor: string
  style?: CssStyle
  width: number
}>) {
  return <button style={css`
    display: flex;
    --hover-color: ${props.hoverColor};
    width: ${props.width}px;
    &:hover { background: var(--hover-color); }
    ${props.style}
  `}>Output</button>
}
```

`css` tag не является `String.raw`: он сохраняет cooked `TemplateStringsArray`
и ordered primitive values, а static shape использует тот же identity cache,
marker encoding и segment parser, что и `html``. Compiler связывает exact
checker-branded global `css` symbol с конкретным intrinsic target и понижает rules в существующие
`CompiledStyleSheet`, marker и `bindStyle` operations.

Базовые declarations имеют одну каноническую форму: они пишутся прямо на
верхнем уровне `css``. Избыточный base wrapper `& { ... }` является compiler
error с migration diagnostic, предлагающим удалить wrapper. `&` используется
только там, где действительно задаётся scoped selector.

Первый selector profile намеренно мал: static `&[attr]`,
`&[attr="value"]`, repeated attributes и optional suffix `&:active`, `&:checked`,
`&:disabled`, `&:focus`, `&:focus-within`, `&:hover`, `&:indeterminate`.
Интерполяции разрешены только внутри declaration value. Instance-dependent
values допустимы только в прямых base declarations; внутри pseudo они остаются
compiler error.
Selectors, property names, whole declarations/rules, at-rules, globals,
descendants/combinators и nested rules не могут быть dynamic и пока не входят в
профиль.

Static owner template можно вынести в private same-module immutable const только
для реального reuse как минимум в двух разных compiled `style` sites. Private
const с нулём или одним site является compiler error: неиспользуемый const
удаляется, а одноразовый `css`` встраивается прямо в owning `style`. Module CSS
const должен быть единственной declaration в своём `const` statement и не может
иметь ссылок вне compiled style sites, иначе compile-time intrinsic не удалось
бы гарантированно стереть. Такой const нельзя экспортировать: global `css`
является compile-time intrinsic, а
cross-module target ownership намеренно не поддерживается. Общая public theme
публикуется настоящим `.css` export. Допущенный private reusable const всё равно
остаётся scoped, не становится global theme
sheet и удаляется из production bundle, когда после lowering больше не нужен.
Component `style` prop принимает один base-only `css`` fragment и отклоняет
attribute/pseudo selectors; caller fragment остаётся последним.

Source-oriented tools могут явно передать compiler-у `styleSourceRootIds`.
Тогда, и только тогда, compiled sheet сохраняет public module id, component
name и обычный нормализованный CSS всех static object/`css`` fragments в
authored order без tag/backticks/TypeScript interpolation
для root-scoped documentation projection. Dynamic base declarations видны как
inline style в HTML source. Обычная production сборка не эмитит эти source
bytes; runtime cascade всегда исполняет тот же compiled `id + cssText`.

Production compiler собирает все static fragments одного Component в один
ordered execution sheet, сохраняя отдельный `data-z-*` marker каждого fragment.
В bundle CSS может находиться в product-neutral compact transport; перед
публикацией `CompiledStyleSheet` он синхронно восстанавливается в обычный exact
CSS. Dictionary содержит только generic CSS syntax и не знает UI/theme tokens.
Canonical и physical-mirror roots могут передать одинаковый public root id:
оба проецируются в один package/module identity без искусственного suffix.

Обычное имя tag повышает шанс существующей CSS-in-JS language injection в IDE,
но TypeScript не проверяет CSS grammar и пакет не обещает editor plugin,
highlighting или completion. Legacy `parse()`/`attribute/style.ts` здесь не
участвуют: они остаются отдельным source-analysis DSL.

Если pseudo должен использовать per-instance значение, автор явно называет CSS
custom property; compiler не придумывает переменную:

```tsx
<button style={css`
  --hover-color: ${props.hoverColor};
  &:hover {
    background: var(--hover-color);
    color: var(--hover-text, rgb(255 255 255));
  }
`} />
```

`--hover-color` остаётся в addressed inline `bindStyle`, а static pseudo rule и
fallback text переносятся в `CompiledStyleSheet` без изменений. Прямой
`props.hoverColor` внутри `:hover` по-прежнему является compiler error.
Template не вычисляет `var()`; cascade, inheritance, substitution и fallback
принадлежат Renderer CSS semantics.

Одинаковый fragment на другом intrinsic target или в другой authored позиции
сохраняет отдельный marker: небольшое увеличение bundle здесь намеренно
сохраняет CSS precedence, а Document всё равно регистрирует metadata один раз
на template, не на каждый instance.

## Nested Style

Этот раздел относится только к legacy source-analysis `parse()` и не является
authoring API governed TSX compiler. В этом parser `style` принимает
JavaScript-like object literal. Parser рекурсивно сохраняет
CSS-свойства, quoted selectors и at-rules, но не проверяет их словарь и не
придаёт им runtime-семантику:

```typescript
const nodes = parse(({html, fields}) => html`
  <button
    style=${{
      display: "flex",
      width: "100%",
      "&:hover": {
        color: fields.hoverColor,
        "& .icon": {
          transform: `translateX(${fields.offset}px)`,
        },
      },
    }}>
    Save
  </button>
`)
```

Статические leaves остаются строками. Простой dynamic path становится
`{data: path}`, а ternary или template expression — `{data, expr}`. Вложенные
объекты имеют ту же рекурсивную форму. Callback и expressions при этом не
исполняются.

## Граница статического parser

- Parser не создаёт DOM и не рендерит результат.
- Callback и expressions не исполняются.
- Parser не содержит allowlist CSS-свойств, selectors или at-rules.
- Синтаксис остаётся намеренно меньше полного XML/HTML стандарта.
- Доменная семантика и runtime validation не входят в пакет.

Toolchain: Bun `1.4.0`, TypeScript `7.0.2`.

## Лицензия

MIT © zavx0z
