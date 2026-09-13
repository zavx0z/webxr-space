# Headless

Пакет находится в корневом каталоге `headless` проекта WebXR и обслуживает
компоненты разных пакетов.

`@immersive/headless` монтирует компоненты пакетов проекта через настоящий
Template compiler, Component, DOM, HTML Renderer и нативный WebGPU/Dawn.
`render` возвращает живой внешний элемент компонента, `screenshot` — PNG
по его актуальному border-box без внешних полей. По умолчанию `screenshot`
возвращает `Buffer`; второй аргумент `"image"` возвращает `Bun.Image` того же снимка.

PNG кодирует нативный `Bun.Image`. Его API не принимает сырые RGBA-пиксели,
поэтому внутренний `imageFromRgba` передаёт их в несжатом
BMP V5 с альфа-каналом. Этот путь проверен на macOS; чтение BMP в Bun зависит
от системного декодера. Для сравнения пикселей `capture(element)` возвращает
`{width, height, rgba, png}` одного кадра, без повторного декодирования PNG.

Для статических импортов и JSX test host подключает package-owned preload до
загрузки тестовых модулей:

```sh
bun test --preload @immersive/headless/preload
```

Preload регистрирует Template compiler от Git-корня текущего рабочего каталога.
`createHeadless()` повторяет регистрацию идемпотентно и создаёт живой host.

```tsx
import {afterAll, expect, test} from "bun:test"
import {createHeadless} from "@immersive/headless"
import {Typography} from "@zavx0z/ui/typography"

const headless = createHeadless({width: 320, height: 180})
afterAll(() => headless.dispose())

test("показывает переданный текст", async () => {
  const element = await headless.render(
    <Typography
      text="Пример"
    />,
  )

  expect(element.textContent).toBe("Пример")
  await Bun.write("results/typography.png", await headless.screenshot(element))
})
```

Загрузчик компилирует production TSX через Template в пределах Git-корня test host.
JSX в spec/test автоматически преобразуется в Headless transport без файловой
pragma и создаёт инертный `ComponentValue`; Document, Canvas, Renderer и
DOM-элемент появляются только после `createHeadless()` и `render()`.
Сессия Template compiler закрывается после обработки каждого production-модуля.
Также поддерживается `headless.render(Component, props)` для компонента,
скомпилированного до его импорта.

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

Проверки: `bun run check`. Скрипт сам подключает preload. Нативный тест сохраняет PNG в
`results/bun-webgpu/triangle.png`.

[Проверки render/capture](tests/capture.test.ts) используют только локальные
[article и span](fixtures/elements.tsx), без DiagramNode, Typography и общей UI-темы.
Они проверяют обрезку по смещённому элементу, округление дробных границ наружу,
сохранение DOM identity при обновлении текста и изменение пикселей внутри снимка
при неизменных краях. Снимки с текстом, без текста, разница и снимок дробных
границ сохраняются в `results/capture`. Проверки конкретных props и вариантов
прикладных компонентов остаются у соответствующих пакетов.
