/**
Входные данные нативного host для рендера компонентов без окна браузера.

Окружение не содержит знания о конкретном компоненте. Размеры относятся к
физическим пикселям native Canvas, а ресурсы загружаются до первого кадра.

@property [projectRoot] - Корень исходников доступных пакетов; по умолчанию Git-корень Headless.

@property [width=1024] - Положительная целая ширина рабочей области в физических пикселях.

@property [height=768] - Положительная целая высота рабочей области в физических пикселях.

@property [fontSource] - TTF-файл для измерения и рисования текста.

@property [styleSheetSources] - Упорядоченные файлы общих CSS-таблиц.

@example
```ts
const input: HeadlessOptions = {width: 640, height: 480}
```
*/
export interface HeadlessOptions {
  readonly projectRoot?: string | undefined
  readonly width?: number | undefined
  readonly height?: number | undefined
  readonly fontSource?: string | URL | undefined
  readonly styleSheetSources?: readonly (string | URL)[] | undefined
}
