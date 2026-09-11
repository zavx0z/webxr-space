import {Markdown} from "@webxr/markdown"

/**
Показывает авторское описание или пример через общий {@link Markdown} в текущем Document.
Наследует типографику TypeDoc и оставляет прокрутку внешнему контейнеру.

@param props - Поле source содержит Markdown описания либо примера; рендер выполняет {@link Markdown}.
*/
export function Description(props: Readonly<{source: string}>) {
  return <Markdown
    source={props.source}
    style={css`
      overflow: visible;
      font-size: inherit;
      line-height: inherit;
    `}
  />
}


/**
Выводит текстовое состояние справочника, если переданная модель не содержит деклараций.
*/
export function EmptyDocument() {
  return <p>В этом документе нет деклараций типов.</p>
}
