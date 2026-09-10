import type {MarkerComponent, MarkerContext} from "../contracts.ts"
import {renderMarker, type MarkerChildren} from "../render.ts"

/** Сохраняет компонент маркера через публичный children transport без DOM-контейнера. */
export function MarkerSlot(props: Readonly<{marker: MarkerComponent; context: MarkerContext}>) {
  const content = renderMarker(props.marker, props.context)
  return <MarkerContent>{content}</MarkerContent>
}

function MarkerContent(props: Readonly<{children: MarkerChildren}>) {
  return <>{props.children}</>
}
