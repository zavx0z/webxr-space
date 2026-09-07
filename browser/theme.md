# Тема по умолчанию

`attach({canvas, app})` автоматически подключает текущую тему UI.
Потребителю не нужны `#ui-theme-stylesheet`, строка CSS, theme provider или
дублирующий путь `/ui/theme.css` на собственном сервере.

Владелец палитры — единственный публичный `@zavx0z/ui/themes/theme.css`.
Browser импортирует его как asset сборки, не как исполняемый UI runtime и
не как CSS-текст для вставки. Native link создаётся, ожидается и освобождается
обычным author stylesheet lifecycle Root. Математический Engine и WebGPU
не получают DOM-зависимостей.

Если тот же default уже объявлен входным stylesheet link с canonical id,
Root переиспользует его. Явный `theme` заменяет default slot, дополнительные
author stylesheets идут после него. В текущем Interpreter пользовательские
темы и overrides не задаются: используются defaults компонентного UI.

Проверки `tests/default-theme.test.ts`: default без page link, reuse,
замена default slot и byte-equal CSS asset в реальной браузерной Bun-сборке.
