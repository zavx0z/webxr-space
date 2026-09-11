import type {NodePreviewImage} from "../../shared/contracts.ts"

/**
Вход {@link @nodes/node/image#ContentImage | ContentImage} для предпросмотра изображения.
Компонент занимает область родителя и вписывает изображение с сохранением пропорций.

@property image - Источник, исходные размеры в пикселях и необязательное alt-описание.
Значения передаются стандартному img; компонент не загружает ресурс отдельным механизмом.

@property label - Запасное alt-описание, если image.alt равно undefined.
Явная пустая строка image.alt сохраняется.

@example
```tsx
<ContentImage
  image={{src: "/preview.png", width: 640, height: 480}}
  label="Результат обработки"
/>
```
*/
export interface ContentImageProps {
  readonly image: NodePreviewImage
  readonly label: string
}
