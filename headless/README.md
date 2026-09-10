# Headless

Пакет находится в корневом каталоге `headless` проекта WebXR и обслуживает
компоненты разных пакетов.

`@immersive/headless` монтирует компоненты пакетов проекта через настоящий
Template compiler, Component, DOM, HTML Renderer и нативный WebGPU/Dawn.
`render` возвращает живой внешний элемент компонента, `screenshot` — PNG
по его актуальному border-box без внешних полей.

PNG кодирует нативный `Bun.Image`. Его API не принимает сырые RGBA-пиксели,
поэтому `imageFromRgba` из `@immersive/headless/image` передаёт их в несжатом
BMP V5 с альфа-каналом. Этот путь проверен на macOS; чтение BMP в Bun зависит
от системного декодера. Для сравнения пикселей `capture(element)` возвращает
`{width, height, rgba, png}` одного кадра, без повторного декодирования PNG.

`createHeadless()` подключает компилятор. После этого `runtime` динамически
импортирует компонент и возвращает JSX; тест передаёт результат в `render`.

```tsx
/** @jsxImportSource @immersive/headless */
import {afterAll, expect, test} from "bun:test"
import {createHeadless} from "@immersive/headless"

const headless = createHeadless({width: 320, height: 180})
afterAll(() => headless.dispose())

test("показывает переданный текст", async () => {
  const runtime = async () => {
    const {Typography} = await import("@zavx0z/ui/typography")
    return (
      <Typography
        text="Пример"
      />
    )
  }
  const element = await headless.render(await runtime())

  expect(element.textContent).toBe("Пример")
  await Bun.write("results/typography.png", await headless.screenshot(element))
})
```

Загрузчик компилирует production-TSX в пределах выбранного `projectRoot`.
Сессия компиляции закрывается после обработки каждого модуля.
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
вызова. Проверки render/capture выполняют GPU в процессе Bun test, поэтому
нативный сбой драйвера способен завершить этот процесс. Низкоуровневые проверки
пакета запускают FFI в отдельных дочерних процессах.

В `bun-webgpu@0.1.7` не реализован `getCompilationInfo`. Адаптер получает
настоящие ошибки через validation scopes Dawn; предупреждения и точные позиции
этот путь не предоставляет. Отдельный тест проверяет корректный и неверный WGSL.

Проверки: `bun run check`. Нативный тест сохраняет PNG в
`results/bun-webgpu/triangle.png`.

[Проверки render/capture](tests/capture.test.ts) используют только локальные
[article и span](fixtures/elements.tsx), без DiagramNode, Typography и общей UI-темы.
Они проверяют обрезку по смещённому элементу, округление дробных границ наружу,
сохранение DOM identity при обновлении текста и изменение пикселей внутри снимка
при неизменных краях. Снимки с текстом, без текста, разница и снимок дробных
границ сохраняются в `results/capture`. Проверки конкретных props и вариантов
прикладных компонентов остаются у соответствующих пакетов.
