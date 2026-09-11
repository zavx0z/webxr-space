/**
Вход {@link @webxr/markdown#Markdown | Markdown} для Document вызывающего приложения.
Изменение source или baseUrl обновляет разбор с сохранением корневого article.

@property source - Исходный CommonMark с таблицами и безопасным подмножеством HTML.
Пустая строка очищает содержимое article; нестроковое значение вызывает TypeError.

@property [wrap=true] - Перенос обычного текста по доступной ширине.
Блоки кода сохраняют собственную прокрутку. Значение, отличное от boolean
или undefined, вызывает TypeError.

@property [baseUrl] - База для относительных ссылок и изображений.
Принимает абсолютный URL или путь от корня сайта; query и fragment сохраняются.

@property [title] - Значение стандартного атрибута title корневого article.

@property [style] - Стили корневого article, применяемые после стилей компонента.
Позволяют задать размеры области просмотра и переопределить её оформление.

@example
```tsx
<Markdown
  source={"# Документ"}
  baseUrl="https://example.com/docs/"
  wrap={true}
/>
```
*/
export interface MarkdownProps {
  readonly source: string
  readonly wrap?: boolean | undefined
  readonly baseUrl?: string | undefined
  readonly title?: string | undefined
  readonly style?: CssStyle | undefined
}
