# Подключение приложения

Публичный запуск следует React-shaped контракту createRoot/render/unmount.
Полный пример: [examples/application](../examples/application/README.md).

```tsx
import {createRoot} from "@zavx0z/browser"
import {App} from "./app.tsx"

const root = createRoot(canvas)
root.render(<App />)
```

Повторный render обновляет существующее дерево и сохраняет состояние по template/key.
render(null) очищает содержимое; после unmount нужен новый createRoot.
Template compiler компилирует JSX в ComponentValue. Component монтирует App
в body одного semantic Document. App объявляет единственные Space и ViewPoint.

В компоненте свободное имя `document` привязано Template к тому же semantic
Document; window.document и код подключения страницы остаются native.

App может вернуть Fragment со stylesheet links и единственным Space:

```tsx
function App() {
  return (
    <>
      <link
        rel="stylesheet"
        href="/themes/dark.css"
      />
      <Space frameloop="demand">
        <ViewPoint />
        <HUD>
          <Toolbar />
        </HUD>
      </Space>
    </>
  )
}
```

Явные links задают все author stylesheets. Только без них Browser загружает
`./theme.css`, предоставленный сборкой приложения. Подробности: [тема](theme.md).
Default font читается из `<meta name="engine-default-font">` native страницы.
CSS выбирает family/weight/style; готовые дополнительные font faces принадлежат
специальному API внешнего окружения `@zavx0z/browser/integration`.

createRoot резервирует native страницу/Canvas. render возвращает void и запускает
подготовку ресурсов; `onUncaughtError` получает ошибки запуска. Unmount отменяет
подготовку и освобождает ресурсы. Если GPU уже инициализируется, Canvas остаётся
занят до завершения cleanup этой операции; старый запуск не может повредить новый.
Для тестов и внешних инструментов `inspectRoot(root).whenReady()` из
`@zavx0z/browser/diagnostics` ожидает кадр последнего render и возвращает
диагностику существующего приложения. Обычному App ожидание не требуется.

Координаты сцены — мм в правой системе Z-up. Размеры CSS и viewport — CSS px;
Физические размеры `<display>` задаются атрибутами `width` и `height` в мм,
CSS `width` и `height` задают разрешение в пикселях. Плотность `dpi` вычисляется
по обеим осям. Пространственные преобразования задаются CSS.
Browser вычисляет масштаб проекции по [контракту Display](../dom/display/README.md).
Фиксированные соседние компоненты не требуют key; динамические списки требуют
стабильных ключей для перестановки без потери состояния.

`presentation.input` принимает координаты клиента browser window. Его pointer
и wheel операции проходят тот же выбор получателя, что native события Canvas.
Для диагностики `getProjection(owner).readFrame()` читает существующий кадр,
а `.projectPoint({x, y})` переводит logical point Display/HUD в client coordinates.
Эти операции не отправляют события напрямую в выбранную проекцию.

Semantic `setPointerCapture` имеет приоритет над ранее начатым default-жестом
выделения. Browser сохраняет native capture Canvas и проекцию, а Renderer
передаёт события захватившему Element того же Document. Перед каждым шагом
автоскролла общий frame loop проверяет актуальное владение выделением: capture,
установленный из `useFrame`, прекращает автоскролл уже в этом кадре без ожидания
следующего pointermove. Отпускание, отмена, удаление проекции и unmount очищают
состояние; прежний жест не восстанавливается после release capture.

Presentation — диагностика существующего приложения. Root предоставляет render/unmount. В semantic-дереве нет отдельного
Root-компонента или второго Space. Правила владельцев заданы в
[PROJECT.md](../PROJECT.md).

`<display>` и `<HUD>` работают без `id`: регистрация, ввод и `getProjection(element)`
используют сам Element. Атрибут `id` можно задать для своих CSS-селекторов или
поиска. Его изменение сохраняет Renderer, подписки и захват указателя.
Mesh, Group, Geometry, Material, Asset и Animation также удерживаются по Element;
авторские имена не становятся внутренними ключами сцены.

`useSpace(state => state.size)` получает размер Canvas в CSS px уже при первом
выполнении компонента. Селектор сравнивается через Object.is; изменения других
данных не выполняют компонент повторно. Размер публикуется до расчёта кадра.

`useFrame((state, delta) => …)` вызывается перед общим кадром; delta задаётся
в секундах. Подписка снимается при размонтировании. Режим задаётся prop Space.frameloop. В режиме demand кадры
запрашиваются по изменениям или через `state.invalidate()`; always используется
для непрерывной анимации. Все проекции обслуживает один планировщик.

Ошибка кадра останавливает автоматические повторные попытки и сообщает причину
один раз: поток данных и `invalidate()` не создают бесконечный цикл ошибок.
Осознанный новый pointer-down или изменение размера viewport разрешают новую
попытку. Начальная ошибка запуска передаётся в onUncaughtError и отклоняет diagnostic whenReady, а не
скрытым фоновым перезапуском.

`ViewPoint.controls` декларативно разрешает жесты в свободной области сцены.
Камеру можно получить через `ref={camera}`, где `camera` создан обычным `useRef`.
`camera.current.saveState()` сохраняет обзор, `dollyTo(600, {x: 0, y: 0, z: 900})`
приближает к заданной цели на 600 мм, `reset()` возвращает сохранённый обзор.
Команды мгновенные; все они работают с тем же semantic Element. Browser сам
запрашивает кадр после изменения Document. Положение не нужно переносить в
состояние компонента или читать из Document во время render: прежние spatial
props сохраняют результат жестов и команд. Изменённые props применяются как новые
значения. Это правило распространяется и на другие пространственные Elements.
Ось вверх всегда Z, горизонт не переворачивается, наклон orbit ограничен у полюсов.
Параметров up и переключения системы координат нет. Импорт glTF меняет только
саму модель: её внутренний корень переводит Y-up/метры в Z-up/миллиметры.

Специальный `browser/integration` принимает заимствованные native links для
внешних инструментов. Они остаются у создавшего их окружения после unmount.
