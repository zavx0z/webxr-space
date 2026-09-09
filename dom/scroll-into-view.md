# scrollIntoView

`Element.scrollIntoView()` — общий метод DOM; его наследуют HTMLElement,
строки редактора, сообщения терминала и остальные компоненты. Метод возвращает
`void`, не знает размеров текста и не вызывает Renderer самостоятельно.

Поддерживаются:

- `block` и `inline`: `start`, `center`, `end`, `nearest`;
- `behavior: "auto"` и немедленный `"instant"`;
- boolean-форма: `true` соответствует `block: "start"`, `false` — `"end"`;
- значения по умолчанию: `block: "start"`, `inline: "nearest"`.

`smooth` явно отклоняется как неподдерживаемый; отдельной анимации или таймера
метод не создаёт. Логические block/inline относятся к существующему профилю
Renderer: вертикальный блочный поток и горизонтальная inline-ось. Новые
writing-mode, scroll-margin и scroll-padding этим срезом не объявляются.

DOM сохраняет типизированное намерение через `scroll-into-view` transport.
Поздний вызов для той же цели заменяет предыдущий необработанный запрос.
Запрос можно сделать до монтирования: существующий Browser frame обработает
его после подключения цели и появления layout. Запрос уже подключённой цели
отменяется при её удалении; disposal проекции очищает принадлежащие ей запросы.

Поэтому изменение `scrollTop` не обязано быть синхронным с вызовом метода:
в данном semantic Document выполнение происходит в существующем кадре Browser.
Прямое чтение после метода до кадра возвращает предыдущее состояние.

Renderer выполняет `fulfillScrollIntoViewRequests(renderer)` после подготовки
layout и до GPU-проекции. Он проходит реальные scroll-ancestor изнутри наружу,
учитывает border box, transforms и максимальные scroll offsets. Каждый внешний
scrollport получает уже обновлённую геометрию после внутренней прокрутки.
Fixed-position границы исключают предков, которые физически не двигают цель.

`nearest` для уже видимой цели не меняет scroll state и не создаёт новый layout.
Обрабатывается только исходный снимок очереди, поэтому обратные вызовы,
создавшие новые запросы, не запускают рекурсивный цикл в том же кадре.

Порядок и nearest-выравнивание опираются на
[CSSOM View](https://drafts.csswg.org/cssom-view/#determine-the-scroll-into-view-position).
Проверки находятся в `dom/tests/scroll-into-view.test.ts`,
`renderer/html/tests/scroll-into-view.test.ts` и `browser/tests/scroll-into-view.test.ts`.
