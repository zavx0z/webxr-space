# Fixed и top-layer placement

`position: fixed` остаётся настоящим CSS-состоянием, не алиасом `absolute`.
Он исключается из обычного Flex/блочного потока, а inset и процентные размеры
разрешаются относительно fixed containing block.

По умолчанию containing block — viewport той же проекции. Fixed-содержимое
не двигается при прокрутке семантических предков, не увеличивает их scroll
extent и не наследует их overflow clips. Оно остаётся ограниченным viewport
проекции: Display не рисует такой интерфейс в чужой области ввода.

Ближайший предок с CSS transform задаёт другой fixed containing block — свой
padding box. Это соответствует примеру CSS Transforms, где transformed
container + fixed child эквивалентны positioned container + absolute child,
в том числе при прокрутке контейнера. Промежуточный scrollport между этим
containing block и fixed descendant не сдвигает и не обрезает последнего.
[CSS Positioned Layout](https://www.w3.org/TR/css-position-3/#fixed-pos),
[CSS Transforms](https://www.w3.org/TR/css-transforms-1/#transform-rendering).

Собственная прокрутка внутри fixed-контейнера продолжает работать. Во время
layout общие scroll-boundaries исключают только те записи boxes/paint/hits,
которые не принадлежат текущей прокрутке. Оптимизированная проекция прокрутки
сохраняется для остальных scrollport; containing block с fixed descendants
пересчитывается обычным путём, чтобы не сдвинуть viewport-attached записи.

Top-layer popover использует authored left/right/top/bottom в своём viewport.
Без явных insets сохраняется существующее размещение по source либо в центре.
Paint, инспекторские boxes и hit testing получают одни итоговые координаты.
Никаких имён Menu, Clipboard или CodeEditor в этом механизме нет.

Регрессии: `tests/fixed-position.test.ts`, `tests/popover-selection-hit.test.ts`.
