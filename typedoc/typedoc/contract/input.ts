import type {TypeDocDocument} from "../../shared/types/model.ts"
import type {TypeDocNavigationHandle} from "../types/navigation.ts"

/**
Вход {@link @webxr/typedoc#TypeDoc | TypeDoc} с готовым справочником без объектов компилятора.

@property document - Готовый {@link TypeDocDocument}, заимствуемый без изменения.
Обновление сохраняет корневой Element; имена деклараций и полей служат ключами.

@property [title] - Видимый заголовок вместо `document.name`.

@property [style] - Финальный CSS override корневого article.
Высоту и прокрутку обычно задаёт родительская область Experience.

@property [onReady] - Получает handle для перехода к декларации или её полю.
При удалении TypeDoc получает `null`; handle не хранит координаты и ищет цель
в текущем Document. Через handle также можно определить видимую секцию
переданной области прокрутки.
*/
export interface TypeDocProps {
  readonly document: TypeDocDocument
  readonly title?: string | undefined
  readonly style?: CssStyle | undefined
  readonly onReady?: ((handle: TypeDocNavigationHandle | null) => void) | undefined
}
