# Изменение viewport

`DocumentRenderer.resize({width, height})` меняет размеры области раскладки
существующего Renderer. Метод валидирует размеры, инвалидирует layout корня
и оставляет вычисление нового кадра следующему `flush()` или `render()`.
Повторная передача тех же размеров не создаёт новую ревизию.

Renderer, semantic Document и узлы сохраняют identity. Ревизии кадров продолжают
возрастать, а viewport ранее выданного кадра остаётся неизменным. Это позволяет
передавать кадры тому же retained WebGPU backend после resize.

Browser использует этот метод для Display, HUD и Canvas. Изменение размеров
не пересоздаёт CPU Renderer и не сбрасывает его счётчик кадров. Геометрия
проекции обновляется через существующий plane/overlay API.

Проверки: `renderer/tests/resize.test.ts` и
`browser/tests/projection-input.test.ts`. Они покрывают последовательные resize
после нескольких кадров, процентные размеры, scroll extents, неизменность
старого кадра, невалидные размеры и сохранение Renderer в Display/HUD.
