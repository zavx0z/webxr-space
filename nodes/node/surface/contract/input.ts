import type {NodeChildren, NodePreviewImage} from "../../shared/contracts.ts"

/**
Вход {@link @nodes/node/surface#ContentSurface | ContentSurface} для области содержимого ноды.
Размеры задаёт родитель; содержимое за границами области обрезается.

@property [children] - Авторский JSX той же semantic Document. При ненулевом значении
имеет приоритет над image, включая пустой массив элементов.

@property [image] - Предпросмотр, показываемый только при null или undefined в children.
Отсутствие обоих значений оставляет пустую область.

@property label - Доступное имя области и запасное описание изображения, если его alt не задан.

@example
```tsx
<ContentSurface
  label="Предпросмотр"
  image={{src: "/preview.png", width: 640, height: 480}}
/>
```
*/
export interface ContentSurfaceProps {
  readonly children?: NodeChildren
  readonly image?: NodePreviewImage | undefined
  readonly label: string
}
