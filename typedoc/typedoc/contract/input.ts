import type {TypeDocDocument} from "../../shared/types/model.ts"

/**
Вход {@link @webxr/typedoc#TypeDoc | TypeDoc} с готовым справочником без объектов компилятора.

@property document - Готовый {@link TypeDocDocument}, заимствуемый без изменения.
Обновление сохраняет корневой Element; имена деклараций и полей служат ключами.

@property [title] - Видимый заголовок вместо `document.name`.

@property [style] - Финальный CSS override корневого article.
Высоту и прокрутку обычно задаёт родительская область Experience.
*/
export interface TypeDocProps {
  readonly document: TypeDocDocument
  readonly title?: string | undefined
  readonly style?: CssStyle | undefined
}
