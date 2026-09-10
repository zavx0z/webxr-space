# Headless

`@immersive/headless` монтирует компоненты пакетов проекта через настоящий
Template compiler, Component, DOM, HTML Renderer и нативный WebGPU/Dawn.
`render` возвращает живой внешний элемент компонента, `screenshot` — PNG
по его актуальному border-box без внешних полей.

Для обычных импортов компонентов подключите компилятор до загрузки spec через
`bunfig.toml` рабочего каталога тестов:

```toml
[test]
preload = ["@immersive/headless/preload"]
```

```tsx
/** @jsxImportSource @immersive/headless */
import {afterAll, expect, test} from "bun:test"
import {createHeadless} from "@immersive/headless"
import {Typography} from "@zavx0z/ui/typography"

const headless = createHeadless({width: 320, height: 180})
afterAll(() => headless.dispose())

test("показывает переданный текст", async () => {
  const element = await headless.render(
    <Typography
      text="Пример"
    />
  )

  expect(element.textContent).toBe("Пример")
  await Bun.write("results/typography.png", await headless.screenshot(element))
})
```

Preload компилирует production-TSX до выполнения статических импортов и не
создаёт GPU-устройство. Общая TypeScript-сессия закрывается после тестов.
В этом репозитории он подключён для запуска из корня и из пакета `@nodes/node`.
Для разового запуска из корня доступен флаг
`bun test --preload ./nodes/headless/preload.ts`.
Без preload остаётся возможность импортировать компоненты динамически после
`createHeadless()`: его загрузчик использует выбранный `projectRoot`.
JSX в spec только упаковывает компонент и props; авторский CSS остаётся
в production-TSX и обрабатывается Template.
Также поддерживается `headless.render(Component, props)`.

Один host сохраняет Document, компонентный root, Canvas, Renderer, Space
и ViewPoint до `dispose`. Повторный render того же template/key обновляет props
с сохранением элемента. Снимок можно запросить и для потомка возвращённого
элемента. Компонент должен иметь один внешний Element, а снимаемая область —
полностью помещаться в настроенный viewport. Native DOM, сетевой загрузчик,
CDP, браузерный ввод, декодирование изображений и полноценная поддержка
пространственных приложений в этот host не входят.

По умолчанию используются публичная тема UI и шрифт Inter из Engine.
`styleSheetSources`, `fontSource`, `projectRoot`, `width` и `height` настраиваются
без привязки к конкретному компоненту или пакету.

GPU-операции host сериализуются, WebGPU globals восстанавливаются после каждого
вызова. Основной компонентный spec выполняет GPU в процессе Bun test, поэтому
нативный сбой драйвера способен завершить этот процесс. Низкоуровневые проверки
пакета запускают FFI в отдельных дочерних процессах.

В `bun-webgpu@0.1.7` не реализован `getCompilationInfo`. Адаптер получает
настоящие ошибки через validation scopes Dawn; предупреждения и точные позиции
этот путь не предоставляет. Отдельный тест проверяет корректный и неверный WGSL.

Проверки: `bun run check`. Нативный тест сохраняет PNG в
`results/bun-webgpu/triangle.png`; компонентные spec сохраняют изображения
у своего пакета.
