/**
Справочник типов внутри существующего HTML-like/WebGPU Experience.

Декларации и поля остаются структурированной моделью. Markdown используется
только для авторских описаний и примеров; разбор TypeScript принадлежит parser.

@packageDocumentation
*/
import {useLayoutEffect, useRef} from "@zavx0z/component"
import type {TypeDocProps} from "./contract/input.ts"
import {Declaration} from "./src/declaration.tsx"
import {createTypeDocNavigation} from "./src/navigation.ts"
import {EmptyDocument} from "./src/text-content.tsx"

export type {TypeDocProps} from "./contract/input.ts"

/**
Отображает [справочник экспортируемых типов](../README.md) из готовой модели
в одном article текущего Document. За структуру справочника отвечает {@link TypeDoc},
а за текстовое оформление описаний — Markdown; сигнатуры обслуживает CodeEditor.

Новый document сохраняет корневой Element и keyed-разделы с теми же именами.
Высоту и основную прокрутку задаёт родитель. Длинный код получает локальную
горизонтальную прокрутку CodeEditor; обычные описания переносятся по ширине.

@param props - Модель документа, заголовок и финальный CSS override согласно {@link TypeDocProps}.

@example
```tsx
<TypeDoc
  document={analysis.document}
  title="Входной контракт"
/>
```

@remarks
[Проверки представления](../tests/view.test.ts) связывают optional/default,
обновление и перестановку keyed-элементов, resize и локальную прокрутку кода.
Подсветка проверяется по semantic token runs и цветам display list;
такие проверки не заменяют визуальный просмотр Experience.
*/
export function TypeDoc(props: TypeDocProps) {
  const navigation = useRef(createTypeDocNavigation())
  useLayoutEffect(() => {
    props.onReady?.(navigation.current.handle)
    return () => props.onReady?.(null)
  }, [props.onReady])
  useLayoutEffect(() => () => navigation.current.dispose(), [])
  return <article
    data-typedoc=""
    aria-label={props.title ?? props.document.name}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      width: 100%;
      min-width: 0;
      padding: 20px;
      gap: 24px;
      color: var(--widget-regular-content);
      font-size: 13px;
      line-height: 1.5;
      white-space: normal;
      overflow-wrap: anywhere;

      & [data-typedoc-heading="1"] {
        margin: 0;
        min-width: 0;
        max-width: 100%;
        overflow-x: auto;
        font-size: 26px;
        font-weight: 700;
        line-height: 1.25;
      }

      & [data-typedoc-label] {
        margin: 0;
        font-size: 11px;
      }

      ${props.style}
    `}
  >
    <header>
      <p data-typedoc-label="">Контракт</p>
      <h1 data-typedoc-heading="1">{props.title ?? props.document.name}</h1>
    </header>
    {props.document.declarations.length === 0 ? <EmptyDocument /> : null}
    {props.document.declarations.map(declaration => <Declaration
      key={declaration.name}
      declaration={declaration}
      onTarget={navigation.current.register}
    />)}
  </article>
}
