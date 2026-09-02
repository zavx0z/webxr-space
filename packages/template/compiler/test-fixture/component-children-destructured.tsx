import type {JsxSourceElement} from "../../jsx-runtime.ts"

export function DestructuredChildren(
  {children}: Readonly<{children: JsxSourceElement}>,
) {
  return <div>{children}</div>
}
