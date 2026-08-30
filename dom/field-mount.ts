import {
  Field,
  type FieldDefinition,
} from "@ui/components/field"
import {
  HTMLDivElement,
  type Document,
  type HTMLElement,
} from "@zavx0z/dom"
import {createRoot, type ComponentRoot} from "@zavx0z/react"

type MountedFieldRoot = Readonly<{
  element: HTMLDivElement
  root: ComponentRoot
}>

const rootsByDocument = new WeakMap<Document, Set<MountedFieldRoot>>()

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
  const roots = rootsByDocument.get(document) ?? new Set<MountedFieldRoot>()
  if (!rootsByDocument.has(document)) rootsByDocument.set(document, roots)
  const record = Object.freeze({element, root})
  roots.add(record)

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
      roots.delete(record)
      if (roots.size === 0) rootsByDocument.delete(document)
      root.unmount()
    },
  })
}

/** Projects exact compiled Field roots contained by one Node-owned story subtree. */
export function mountedFieldStyleSheetRoot(element: HTMLElement): Readonly<{
  readStyleSheets(): unknown
}> {
  const document = element.ownerDocument
  if (document === null) throw new Error("Field stylesheet boundary has no owner Document")
  return Object.freeze({
    readStyleSheets() {
      let revision = 0
      const styleSheets: unknown[] = []
      for (const record of rootsByDocument.get(document) ?? []) {
        if (record.element !== element && !element.contains(record.element)) continue
        const snapshot = record.root.readStyleSheets()
        revision = Math.max(revision, snapshot.revision)
        styleSheets.push(...snapshot.styleSheets)
      }
      return Object.freeze({
        revision,
        styleSheets: Object.freeze(styleSheets),
      })
    },
  })
}
