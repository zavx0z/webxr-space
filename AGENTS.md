# Авторский контракт WebXR

Обязательные правила авторских DOM-типов находятся в
[PROJECT.md](PROJECT.md), раздел «Авторство и подключение приложения».

Авторский JSX/TSX использует глобальные типы `lib.dom` и централизованные
platform-owned расширения. Не импортировать DOM implementation types для
обычных props/refs/events; не соединять их с браузерными типами через
`as unknown`/`as any`. Публичные geometry helpers, доменные типы и корректные
объявления custom tags этим запретом не ограничиваются. Runtime/internal/test
границы платформы сохраняют собственные implementation types.
