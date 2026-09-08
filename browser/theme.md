# Тема по умолчанию

`attach({canvas, app})` автоматически подключает `./theme.css` относительно
страницы приложения. Сборка приложения предоставляет этот отдельный CSS-файл.
Browser не импортирует тему UI и не выбирает её исходник.

Владелец палитры — единственный публичный `@zavx0z/ui/themes/theme.css`.
Сборка приложения может выбрать этот публичный CSS без локальной копии или
CSS-обёртки. Native link создаётся, ожидается и освобождается
обычным author stylesheet lifecycle Root. Математический Engine и WebGPU
не получают DOM-зависимостей.

Явный `theme` задаёт другой URL либо готовую пару `{id, link}` и заменяет
default slot. Дополнительные author stylesheets передаются через `stylesheets`.
Browser создаёт собственный default link перед заимствованными stylesheets;
порядок полностью заимствованных links остаётся порядком native Document.

Проверки `tests/default-theme.test.ts`: default без page link, замена default
slot и отсутствие CSS/UI-зависимости в browser JavaScript-сборке.
