import type {
  ExternalStore,
  NodeJsonValue,
  NodeTreeNodeSnapshot,
  ParameterReference,
  ParameterSnapshot,
  Socket,
} from "@nodes/tree"
import type {ParameterInput} from "@nodes/parameters/shared"
import type {CallbackRef} from "@zavx0z/template/jsx-runtime"
import type {
  NodeAction,
  NodeChildren,
  NodePreviewImage,
  NodeRect,
} from "../../shared/contracts.ts"

/**
Входные данные составной ноды с независимыми областями содержимого и параметров.

Авторское `children` имеет приоритет над `image`. Изменение `contentVisible`
скрывает квадратную область без размонтирования, а `collapsed` независимо
управляет полями параметров.

@property id - Стабильный идентификатор ноды и адрес её сокетов.

@property label - Видимая подпись и доступное имя ноды.

@property [children] - Авторское содержимое квадратной области.

@property [image] - Изображение, используемое при отсутствии `children`.

@property [contentVisible=true] - Управляет видимостью области содержимого.

@property [collapsed=false] - Независимо скрывает поля параметров.

@property [onContentVisibleChange] - Передаёт владельцу запрос изменения видимости.

@property [onParameterChange] - Передаёт владельцу подтверждённое изменение параметра.

@example
```tsx
<ContentNode
  id="preview"
  label="Предпросмотр"
  contentVisible={true}
>
  <video src="preview.mp4" />
</ContentNode>
```
*/
export interface ContentNodeProps {
  readonly id: string
  readonly frameId?: string | undefined
  readonly label: string
  readonly rect?: NodeRect | undefined
  readonly intrinsic?: boolean | undefined
  readonly elementRef?: CallbackRef<HTMLElement> | undefined
  readonly title?: string | undefined
  readonly category?: string | undefined
  readonly headerColor?: string | undefined
  readonly selected?: boolean | undefined
  readonly hidden?: boolean | undefined
  readonly collapsed?: boolean | undefined
  readonly actions?: readonly NodeAction[] | undefined
  readonly parameters?: NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>["parameters"] | undefined
  readonly sockets?: readonly Socket[] | undefined
  readonly parameterStore?: ((parameterId: string) => ExternalStore<ParameterSnapshot>) | undefined
  readonly connectedSocketKeys?: ReadonlySet<string> | undefined
  readonly resolvedSocketSides?: ReadonlyMap<string, "left" | "right"> | undefined
  readonly children?: NodeChildren
  readonly image?: NodePreviewImage | undefined
  readonly contentVisible?: boolean | undefined
  readonly style?: CssStyle | undefined
  readonly onActivate?: ((event: Event) => void) | undefined
  readonly onCollapseChange?: ((collapsed: boolean, event: Event) => void) | undefined
  readonly onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  readonly onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  readonly onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
  readonly onContentVisibleChange?: ((visible: boolean, event: Event) => void) | undefined
}
