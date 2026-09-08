import type {JsxSourceElement} from "../jsx-runtime.ts"

export function RestChildren({...props}: Readonly<{
  children: JsxSourceElement
}>) {
  return <section>{props.children}</section>
}
