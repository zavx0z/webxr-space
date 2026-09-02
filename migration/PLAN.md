# План миграции visual monorepo

План исполняет решения из [`architecture/decisions`](../architecture/decisions/README.md).
Порядок нельзя расширять или переставлять без нового решения.

## Состояние на начало плана

- R1–R5 компонентного Node rewrite приняты.
- Истории 14 прежних пакетов уже импортированы без squash отдельными
  merge-коммитами.
- `main` содержит незавершённое перемещение из `packages/*` в отклонённые
  вложенные каталоги-семейства.
- Workspace wiring, Storybook declarations и owner ledger изменены, но общий
  срез ещё не завершён и не проверен.
- Исходные checkout сохранены на точных локальных коммитах.
- Push не разрешён.

## М0. Разбор незавершённого состояния

- [x] Разделить committed imports, staged renames, unstaged wiring и untracked
  Storybook files.
- [x] Подтвердить, что каждый imported tree соответствует точному split commit.
- [x] Найти необъяснённые изменения содержимого поверх перемещения.
- [x] Сопоставить каждый текущий путь с решением 0003.

Результат: [`CURRENT-STATE.md`](./CURRENT-STATE.md).

## М1. Физическое размещение

- [ ] Разместить самостоятельные пакеты непосредственно в корне.
- [ ] Перенести DOM inspector в `tools/debug/` без изменения содержимого.
- [ ] Не менять package names, public exports и поведение в этом срезе.
- [ ] Проверить отсутствие потерянных и добавленных production files.
- [ ] Зафиксировать отдельный коммит размещения.

## М2. Простые имена

- [ ] Переименовывать по одному owner вместе со всеми прямыми consumers.
- [ ] Не создавать compatibility aliases.
- [ ] После каждого переименования проверять exports, imports и package checks.
- [ ] Перевести все production packages в scope `@zavx0z`.

## М3. Объединение прежних границ

- [ ] Объединить NodeTree model и headless editor в `graph/`.
- [ ] Объединить layout algorithms и worker execution в `layout/`.
- [ ] Перевести Node Components в `nodes/`.
- [ ] Удалять прежний package manifest только после учёта всех exports и
  consumers.

## М4. Общая проверка переноса

- [ ] Проверить dependency graph и отсутствие production cycles.
- [ ] Проверить единственного writable owner.
- [ ] Выполнить проверки всех пакетов и корня.
- [ ] Проверить точные Storybook routes и отсутствие diagnostics/console errors.
- [ ] Повторить Node functional, visual и dense-performance acceptance.
- [ ] Зафиксировать когерентный checkpoint без push.

## М5. Новая пространственная архитектура

Этот этап не входит в механический перенос.

- [ ] Принять public contract `@zavx0z/space`.
- [ ] Реализовать semantic `Space`, `ViewPoint`, `Mesh`, `Geometry`, `Material`,
  `Display` и `HUD` в одном Document.
- [ ] Доказать same-Document перенос Component subtree без remount.
- [ ] Перевести потребителей только после conformance и визуальной приёмки.
