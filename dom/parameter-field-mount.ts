import {BooleanField} from "@ui/components/fields/boolean-field"
import {CollectionField} from "@ui/components/fields/collection-field"
import {ColorField} from "@ui/components/fields/color-field"
import {EnumField} from "@ui/components/fields/enum-field"
import {IntegerField} from "@ui/components/fields/integer-field"
import {MatrixField} from "@ui/components/fields/matrix-field"
import {NumberField} from "@ui/components/fields/number-field"
import {PathField} from "@ui/components/fields/path-field"
import {ReadonlyField} from "@ui/components/fields/readonly-field"
import {ReferenceField} from "@ui/components/fields/reference-field"
import {RotationField} from "@ui/components/fields/rotation-field"
import {TextField} from "@ui/components/fields/text-field"
import {VectorField} from "@ui/components/fields/vector-field"
import {
  HTMLDivElement,
  type Document,
  type HTMLElement,
} from "@zavx0z/dom"
import {createRoot, type ComponentRoot} from "@zavx0z/react"
import type {ParameterDefinition} from "./parameter.ts"

type MountedParameterFieldRoot = Readonly<{
  element: HTMLDivElement
  root: ComponentRoot
}>

const rootsByDocument = new WeakMap<Document, Set<MountedParameterFieldRoot>>()

export type ParameterFieldMount = Readonly<{
  element: HTMLDivElement
  update(definition: ParameterDefinition): void
  dispose(): void
}>

/** Mounts one concrete compiled UI Field into a Node-owned Parameter position. */
export function mountParameterField(document: Document, initial: ParameterDefinition): ParameterFieldMount {
  const staging = document.createDocumentFragment()
  const root = createRoot(staging)
  const kind = initial.kind
  let disposed = false

  try {
    renderParameterField(root, initial)
  } catch (error) {
    root.unmount()
    throw error
  }
  const element = staging.childNodes.find((node) => node.nodeType === 1)
  if (!(element instanceof HTMLDivElement)) {
    root.unmount()
    throw new Error(`Compiled ${kind} Field mounted no div owner`)
  }
  const roots = rootsByDocument.get(document) ?? new Set<MountedParameterFieldRoot>()
  if (!rootsByDocument.has(document)) rootsByDocument.set(document, roots)
  const record = Object.freeze({element, root})
  roots.add(record)

  const update = (definition: ParameterDefinition): void => {
    if (disposed) throw new Error("Parameter Field mount is disposed")
    if (definition.kind !== kind) {
      throw new Error(`Parameter Field kind cannot change: ${kind} -> ${definition.kind}`)
    }
    renderParameterField(root, definition)
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

/** Projects concrete compiled Field roots contained by one Node-owned story subtree. */
export function mountedParameterFieldStyleSheetRoot(element: HTMLElement): Readonly<{
  readStyleSheets(): unknown
}> {
  const document = element.ownerDocument
  if (document === null) throw new Error("Parameter Field stylesheet boundary has no owner Document")
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

function renderParameterField(root: ComponentRoot, definition: ParameterDefinition): void {
  const props = directFieldProps(definition)
  switch (definition.kind) {
    case "text":
      root.render(TextField as any, props)
      break
    case "number":
      root.render(NumberField as any, props)
      break
    case "integer":
      root.render(IntegerField as any, props)
      break
    case "boolean":
      root.render(BooleanField as any, props)
      break
    case "enum":
      root.render(EnumField as any, props)
      break
    case "color":
      root.render(ColorField as any, props)
      break
    case "vector":
      root.render(VectorField as any, props)
      break
    case "rotation":
      root.render(RotationField as any, props)
      break
    case "matrix":
      root.render(MatrixField as any, props)
      break
    case "reference":
      root.render(ReferenceField as any, props)
      break
    case "collection":
      root.render(CollectionField as any, props)
      break
    case "path":
      root.render(PathField as any, props)
      break
    case "readonly":
      root.render(ReadonlyField as any, props)
      break
  }
}

function directFieldProps(definition: ParameterDefinition): Readonly<Record<string, unknown>> {
  const props = {...definition} as Record<string, unknown>
  delete props.kind
  delete props.sockets
  delete props.connected
  delete props.hidden
  delete props.style
  return props
}
