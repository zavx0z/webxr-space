import {
  Field,
  type FieldDefinition,
} from "@ui/components/field"
import {
  HTMLDivElement,
  type Document,
} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"

export type FieldMount = Readonly<{
  element: HTMLDivElement
  update(definition: FieldDefinition): void
  dispose(): void
}>

/** Mounts the one compiled UI Field into a Node-owned semantic position. */
export function mountField(document: Document, initial: FieldDefinition): FieldMount {
  const staging = document.createDocumentFragment()
  const root = createRoot(staging)
  let disposed = false

  try {
    root.render(Field as any, {definition: initial})
  } catch (error) {
    root.unmount()
    throw error
  }
  const element = staging.childNodes.find((node) => node.nodeType === 1)
  if (!(element instanceof HTMLDivElement)) {
    root.unmount()
    throw new Error("Compiled Field mounted no div owner")
  }

  const update = (definition: FieldDefinition): void => {
    if (disposed) throw new Error("Field mount is disposed")
    root.render(Field as any, {definition})
  }

  return Object.freeze({
    element,
    update,
    dispose() {
      if (disposed) return
      disposed = true
      root.unmount()
    },
  })
}
