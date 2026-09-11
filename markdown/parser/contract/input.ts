/**
Вход {@link @webxr/markdown/parser#parseMarkdown | parseMarkdown} для CommonMark
с таблицами и инертной HTML-проекцией.

@property source - Исходный текст; нестроковое значение приводит к TypeError.
HTML разбирается без исполнения и проецируется в разрешённые блоки и фрагменты.

@property [baseUrl] - База для разрешения относительных href/src: абсолютный URL или путь сайта.
Без неё относительные адреса сохраняются. Разрешаются только http/https;
недопустимая ссылка теряет оболочку, недопустимое изображение пропускается.

@example
```ts
const input: ParseMarkdownOptions = {source: "# Заголовок", baseUrl: "/docs/"}
```
*/
export interface ParseMarkdownOptions {
  readonly source: string
  readonly baseUrl?: string
}
