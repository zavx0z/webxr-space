# Стили приложения

Авторский App объявляет `<link rel="stylesheet" href="/themes/dark.css" />`
во Fragment рядом со Space. Эти декларации принадлежат одному semantic Document
и задают полную последовательность author stylesheets для всех его проекций.

Browser создаёт по настоящему native link для каждой декларации, ждёт загрузку
CSSOM и регистрирует его в общем author stylesheet registry. Смена href,
перестановка и удаление деклараций обновляют те же ресурсы без remount приложения.
При unmount Browser снимает наблюдение, отменяет ожидания и удаляет созданные links.

Если явных stylesheet links нет, используется отдельный `./theme.css` приложения.
Его исходник выбирает сборка; стандартная тема принадлежит `ui/themes/theme.css`.
При появлении явного link default удаляется; при удалении последнего возвращается.
Browser не импортирует CSS в JavaScript и не копирует палитру.

Загруженный stylesheet должен иметь доступный origin-clean CSSOM. Текущий host
принимает обычные style rules; @import, @font-face, conditional rules и nesting
ещё не поддерживаются этим CSSOM transport и отклоняются явно. Выбор существующего
шрифта через CSS поддерживается; дополнительные загруженные font faces могут
предоставляться внешним окружением через browser/integration.

Проверки lifecycle и порядка: `tests/application-stylesheets.test.ts`.
Проверка отделения CSS от JavaScript: `tests/default-theme.test.ts`.
