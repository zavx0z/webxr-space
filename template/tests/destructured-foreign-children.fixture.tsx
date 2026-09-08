import type {JsxSourceElement} from "../jsx-runtime.ts"

export function ForeignChildren({content: children}: Readonly<{
  content: JsxSourceElement
}>) {
  return <section>{children}</section>
}
