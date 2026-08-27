export type UiDomLeafMetadata = Readonly<{
  route: string
  title: string
  apiName: string
  primary: Readonly<{id: string; label: string; route: string}>
  secondary: Readonly<{id: string; label: string; route: string}>
  variant: Readonly<{id: string; label: string}>
}>

const nodeEditor = {id: "node-editor", label: "Редактор нод", route: "ui/node-editor"} as const

export const NODE_EDITOR_DOM_LEAVES: readonly UiDomLeafMetadata[] = Object.freeze([
  nodeEditorLeaf("scene", "Развёрнутая нода", "default", "Обычная", "Редактор нод · Развёрнутая · Обычная"),
  nodeEditorLeaf("scene", "Развёрнутая нода", "selected", "Выбранная", "Редактор нод · Развёрнутая · Выбранная"),
  nodeEditorLeaf("scene", "Развёрнутая нода", "rotation-linked", "Rotation linked", "Редактор нод · Shifted Rotation Link"),
  nodeEditorLeaf("scene", "Развёрнутая нода", "translation-unlinked", "Translation unlinked", "Редактор нод · Translation без связи"),
  nodeEditorLeaf("scene", "Развёрнутая нода", "output-only", "Output-only", "Редактор нод · Rotation output-only"),
  nodeEditorLeaf("scene", "Развёрнутая нода", "mixed-sides", "Left + right", "Редактор нод · Matrix mixed sockets"),
  nodeEditorLeaf("scene", "Развёрнутая нода", "color-unlinked", "Color unlinked", "Редактор нод · ColorInput без связи"),
  nodeEditorLeaf("scene", "Развёрнутая нода", "inventory", "Path + Collection", "Редактор нод · Полный Field inventory"),
  nodeEditorLeaf("preview", "Node Preview", "closed", "Preview closed", "Редактор нод · Preview toggle closed"),
  nodeEditorLeaf("preview", "Node Preview", "open", "Preview open", "Редактор нод · Preview image open"),
  nodeEditorLeaf("preview", "Node Preview", "global-hidden", "Global Previews off", "Редактор нод · Preview globally hidden"),
  nodeEditorLeaf("preview", "Node Preview", "alternate", "Buffer updated", "Редактор нод · Preview alternate buffer"),
  nodeEditorLeaf("preview", "Node Preview", "missing", "Missing buffer", "Редактор нод · Preview buffer missing"),
  nodeEditorLeaf("preview", "Node Preview", "zero", "Zero-size buffer", "Редактор нод · Preview buffer zero size"),
  nodeEditorLeaf("preview", "Node Preview", "multiple", "Multiple previews", "Редактор нод · Multiple preview panels"),
  nodeEditorLeaf("preview", "Node Preview", "non-previewable", "Non-previewable", "Редактор нод · No preview capability"),
  nodeEditorLeaf("collapsed", "Свернутая нода", "default", "Обычная", "Редактор нод · Свернутая · Обычная"),
  nodeEditorLeaf("collapsed", "Свернутая нода", "selected", "Выбранная", "Редактор нод · Свернутая · Выбранная"),
  nodeEditorLeaf("popup", "Раскрытые controls", "select-open", "Select раскрыт", "Редактор нод · Select раскрыт"),
])

export const UI_AUXILIARY_DOM_LEAVES: readonly UiDomLeafMetadata[] = Object.freeze([
  Object.freeze({
    route: "ui/frame/nested/default",
    title: "Frame · Вложенность",
    apiName: "FrameView",
    primary: {id: "frame", label: "Frame", route: "ui/frame"},
    secondary: {id: "nested", label: "Вложенный Frame", route: "ui/frame/nested"},
    variant: {id: "default", label: "Выбран"},
  }),
  Object.freeze({
    route: "ui/link/orthogonal/selected",
    title: "Link · Ортогональный",
    apiName: "LinkView",
    primary: {id: "link", label: "Link", route: "ui/link"},
    secondary: {id: "orthogonal", label: "Ортогональный Link", route: "ui/link/orthogonal"},
    variant: {id: "selected", label: "Выбран"},
  }),
  Object.freeze({
    route: "ui/comparison/reference/default",
    title: "Сравнение с эталоном",
    apiName: "NodeEditor",
    primary: {id: "comparison", label: "Сравнение", route: "ui/comparison"},
    secondary: {id: "reference", label: "Принятый эталон", route: "ui/comparison/reference"},
    variant: {id: "default", label: "Референс"},
  }),
])

export const REMAINING_DOM_ROUTES = Object.freeze([
  "",
  "ui",
  "ui/node-editor",
  "ui/node-editor/scene",
  "ui/node-editor/scene/rotation-linked",
  "ui/node-editor/scene/translation-unlinked",
  "ui/node-editor/scene/output-only",
  "ui/node-editor/scene/mixed-sides",
  "ui/node-editor/scene/color-unlinked",
  "ui/node-editor/scene/inventory",
  "ui/node-editor/preview",
  "ui/node-editor/preview/closed",
  "ui/node-editor/preview/open",
  "ui/node-editor/preview/global-hidden",
  "ui/node-editor/preview/alternate",
  "ui/node-editor/preview/missing",
  "ui/node-editor/preview/zero",
  "ui/node-editor/preview/multiple",
  "ui/node-editor/preview/non-previewable",
  "ui/node-editor/collapsed",
  "ui/node-editor/collapsed/default",
  "ui/node-editor/collapsed/selected",
  "ui/node-editor/popup",
  "ui/node-editor/popup/select-open",
  "ui/frame",
  "ui/frame/nested",
  "ui/frame/nested/default",
  "ui/link",
  "ui/link/orthogonal",
  "ui/comparison",
  "ui/comparison/reference",
  "ui/comparison/reference/default",
] as const)

export type RemainingDomRoute = typeof REMAINING_DOM_ROUTES[number]

function nodeEditorLeaf(
  sectionId: string,
  sectionLabel: string,
  variantId: string,
  variantLabel: string,
  title: string,
): UiDomLeafMetadata {
  return Object.freeze({
    route: `ui/node-editor/${sectionId}/${variantId}`,
    title,
    apiName: "NodeEditor",
    primary: nodeEditor,
    secondary: {id: sectionId, label: sectionLabel, route: `ui/node-editor/${sectionId}`},
    variant: {id: variantId, label: variantLabel},
  })
}
