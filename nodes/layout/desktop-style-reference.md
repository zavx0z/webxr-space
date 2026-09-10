# Оформление reference Desktop 8378

Разрешённое read-only чтение установленного `/Applications/ChatGPT.app` подтвердило
`com.openai.codex`, версию **26.903.61454**, build **8378**. Все восемь имён и SHA-256
из исходного desktop-snapshot совпали с app.asar. Целевой reference не заменялся
текущей другой версией. App, подпись и архив не изменялись, приложение не запускалось
и не перезапускалось. Пользовательские preferences/history и native Codex UI не читались.

Полные извлечённые JS/CSS остались в ignored research area
`node_modules/nodes-transition/codex-style-reference-20260910`.
В репозитории сохранены только факты/хеши/assumptions:
[desktop-style-defaults.json](tests/references/desktop-style-defaults.json).
Проприетарные bundle и font binaries в Git не добавлены.

## Восстановленные значения

| Значение | Статический источник | Результат |
|---|---|---|
| Font stack | app-initial CSS: --font-sans → --vscode-font-family → --font-sans-default; JS KY.fonts.ui=null | `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| UI font override | app-initial JS yBo/zY, fonts.ui/uiFace | Может переопределить stack; runtime values не проверялись |
| Font size диаграммы | Mermaid base theme из того же bundle |16px; общий UI default14px не заменяет его |
| Radius base | app-initial CSS, --radius-md-base | .5rem |
| Radius scale | --corner-radius-scale=1; @supports corner-shape:superellipse(1.5) →1.25 |8px либо10px при root16px |
| Surface | JS KY.dark.surface |#181818 |
| Ink/contrast | JS KY.dark.ink/contrast |#ffffff /60 |
| Node fill | uCa: mix(surface,ink,.08+.6×.08), Math.round, alpha .96 |rgba(54,54,54,.96) |
| Opaque alternative | uCa.elevatedPrimaryOpaque + native opaque override |rgb(54,54,54); этот runtime режим не читался |
| Border | uCa.borderHeavy: alpha .12+.6×.06 |rgba(255,255,255,.156) |
| Text | Default/blue effective chat theme меняет accent, lCa=false → ink |#ffffff; bare seed без chat bridge может дать #dfdfdf |
| Conversation line | local-conversation-thread-b5c1b90153e1.js:350720 |70% --color-text, то есть rgba(255,255,255,.7) в выбранном default |

Важное отличие: CSS `.electron-dark` содержит fallback-палитру, но исполняемый
JS generator `tCa → eCa → rCa/uCa → sCa` переопределяет её. Для default учтены
именно его результаты, а не один найденный CSS literal. Scope conversation
дополнительно переопределяет description opacity на70%; вне conversation
генератор даёт .498. Формулы и character offsets указаны в JSON.

В `Codex Framework.framework/Resources/Info.plist` записана версия152.0.7977.83.
CSS corner shaping поставляется в стандартном Chromium с139:
[официальное объявление Chrome](https://developer.chrome.com/blog/new-in-chrome-139).
Для сопоставимого профиля выбрана штатная поддерживаемая ветвь: .5rem×1.25=10px.
Это вывод о default при стандартной поддержке CSS/root16px, не вызов CSS.supports
в работающем Codex и не утверждение о пользовательском runtime override.
SVG Mermaid получает обычные rx/ry10; superellipse всей UI в Nodes не переносится.

## Реализованный scope

Только Mermaid задаёт default dark palette/background, radius10 и запрос
восстановленного system font stack. DiagramNode использует общие CSS overrides;
без них другие consumers сохраняют прежние UI defaults. Числовой TopDown,
платформа и общая UI theme не менялись. Все стили — настоящий авторский CSS.

Для явно выбранного оформления доступны inherited author variables:
`--mermaid-background`, `--mermaid-node-radius`, `--mermaid-node-fill`,
`--mermaid-node-border`, `--mermaid-node-color`, `--mermaid-link-color`,
`--mermaid-font-family`, `--mermaid-line-height`. Они меняют тот же Document
через обычный stylesheet/cascade; локального parser или font shim нет.

## Точная оставшаяся граница

System font stack не указывает конкретный font file/version. В app assets есть
OpenAI Sans Regular/Medium WOFF2 и служебные fonts, но они не являются default
`--font-sans`: default fonts.ui=null. Перенос OpenAI Sans вместо system face был бы
подменой. Ни один app font не копировался в публичные assets.

Текущий публичный Storybook registry (`storybook/runtime/font-faces.ts`) содержит
Inter для sans-serif и JetBrains Mono для monospace. При запросе system stack
наш renderer доходит до имеющегося sans-serif fallback. Точного системного face
в этом registry нет. Разрешение читать app не распространяется на системные
font resources и не устанавливает право распространять их.

Нужен контрольный runtime font family/face/version и разрешённый font source;
для исторического изображения полезен SVG-export с label bounds, viewBox и
resolved radius/theme. SVG со stack сам по себе ещё не устанавливает конкретный
системный font file. Native runtime overrides и screenshot DPR/scale также не
следуют из статических defaults. Не заявлены pixel-perfect или идентичность
каждого glyph. Дополнительная platform font capability не предполагалась и не
реализовывалась без конкретного файла/воспроизведения.

## Проверка

Normal Markdown check:25pass +typecheck. Related Node composition/GraphView
measured:8pass. Regression проверяет padding32/24, radius10 и RGBA рамки.
MCP candidate и active: `8c2860f0a14491925d3b9fc2`; check(live:true)/wait(active) PASS.
На видимой focused странице frame9 с7nodes/7paths/7fills был прочитан до capture,
после source click frame8. Геометрия совпала с прежними измерениями; радиусы всех
семи Pane равны10, рамка rgba255/255/255/.156, diagnostics/console пусты.

Correct preview capture: `storybook://captures/capture_sclo10DkN-SM1_lM66nehsh-`,
SHA-256 `369cc78f11a1e40f102feb31e871e7393f04479a571d2308a7a615ac064d765c`.
Наблюдение сохранено в [desktop-style-live.json](tests/references/desktop-style-live.json).
Внешнюю рамку/toolbar Storybook можно исключить при нормализации сравнения;
она не является геометрией диаграммы. Default radius/palette теперь восстановлены,
а точный font/runtime-input остаётся необходимым для буквального pixel equality.
