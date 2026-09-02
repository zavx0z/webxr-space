import type {JsxSourceElement} from "../../jsx-runtime.ts"
import {Stack} from "./component-children.tsx"

export function ArbitraryArrayChildren(
  props: Readonly<{items: readonly JsxSourceElement[]}>,
) {
  return <Stack>{props.items}</Stack>
}
