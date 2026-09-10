/**
Входной контракт DiagramNode. Описывает данные и обработчики, которые передаёт
вызывающая сторона; разметка компонента находится в соседнем index.tsx.

@packageDocumentation
*/
import type {NodeRect, NodeShape} from "../../shared/contracts.ts"
import type {CallbackRef} from "@zavx0z/template/jsx-runtime"

/**
Данные отображения диаграммной ноды. Компонент показывает описание внутри Pane,
а выбор состояния и обработка действий остаются у вызывающей стороны.

@property id - Идентификатор ноды, передаваемый во внешний article как data-node-id.
Не заменяет JSX key, который задаёт вызывающая сторона при монтировании списка.

@property description - Отображаемый текст и доступное имя внешнего элемента.
Пустая строка допустима; текст заполняет внутренний Pane без отдельных полей параметров.

@property [rect] - Положение и размеры в CSS-пикселях относительно содержащего блока.
Без rect начало находится в (0, 0), а размеры определяются содержимым.
При форме circle высота берётся из rect.width, значение rect.height не используется.

@property [intrinsic=false] - Включает естественное измерение содержимого вместо заданной ширины.
Для круга измеренную ширину затем передают через rect, чтобы получить квадратный внешний бокс.

@property [elementRef] - Ссылка на внешний article для измерения и наблюдения за компонентом.
Жизненным циклом ссылки управляет общий component runtime.

@property [shape=rectangle] - Выбирает прямоугольник, овал или круг.
Овал и круг используют скругление 50%; круг также имеет увеличенные горизонтальные отступы.

@property [selected=false] - Управляет aria-selected внешнего элемента и активным видом Pane.
Компонент не меняет это значение самостоятельно при нажатии.

@property [hidden=false] - Скрывает внешний article через display: none, сохраняя элемент.

@property [title] - Подсказка внутреннего Pane; не заменяет видимое описание.

@property [style] - Финальный CSS override внешнего article.
Оформление Pane и текста настраивается наследуемыми CSS-переменными --diagram-node-*.

@property [onActivate] - Получает событие click внешнего article.
Вызывающая сторона решает, как изменить выбор или состояние графа.

@example
```ts
const input: DiagramNodeProps = {
  id: "example",
  description: "Описание узла",
  shape: "rectangle",
  rect: {x: 40, y: 20, width: 240, height: 100},
}
```
*/
export type DiagramNodeProps = Readonly<{
  id: string
  description: string
  rect?: NodeRect | undefined
  intrinsic?: boolean | undefined
  elementRef?: CallbackRef<HTMLElement> | undefined
  shape?: NodeShape | undefined
  selected?: boolean | undefined
  hidden?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
}>
