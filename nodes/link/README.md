# Связь

Без `kind` и `color` Link — обычная серая связь `#9e9e9e`, без маркеров.
Отсутствующий тип не превращается в `custom`: `data-socket-kind` отсутствует.
Явный `kind` использует Socket preset; явный `color` имеет приоритет над ним.
Толщина по умолчанию2.2px, selected3.4px и disabled opacity.45 сохранены.

`startMarker` и `endMarker` принимают компоненты независимо. Например,
`endMarker={Arrow}` создаёт обычную открытую стрелку; filled Arrow задаётся
небольшим компонентом, передающим `variant="filled"`. Нет slot component и
legacy настройки — нет маркера. [Контекст и пример](../markers/README.md).
Тип сокета `kind` не является типом маркера. Новых режимов штриховки или маршрута
нет: geometry по-прежнему приходит в route от Layout/приложения.

Совместимость однозначна:
- slots — основной API; явный null отключает этот конец;
- прежние startArrow/endArrow поддержаны как deprecated fallback только когда
  соответствующий slot равен undefined; true выбирает обычный Arrow;
- advanced markers — явная готовая заполненная geometry, приоритетнее slots и
  boolean props; пустой массив отключает оба конца. Старые consumers не ломаются.

Mermaid использует slots и один адаптер конкретных размеров Arrow: его отличающиеся
reference length/width/offset сохраняются. Ручной подготовки markers geometry
в production Markdown больше нет. Insets и stroke gaps остаются у его route adapter.
Store обновляет существующие Link/Marker Elements, не создавая вторую модель.

В физическом разделе Link сохранены geometry/state/store варианты, добавлены
открытые и заполненные стрелки start/end/both, смешанные slot components,
палитра всех явных типов рядом с нетипизированным default и приоритет color.
Arrow имеет собственные реальные истории двух вариантов под markers/arrow.
