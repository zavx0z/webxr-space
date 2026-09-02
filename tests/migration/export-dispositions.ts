export const legacyPackageManifestPaths = Object.freeze({
  "@engine/core": "projects/engine/packages/core/package.json",
  "@zavx0z/dom": "../renderer/packages/dom/package.json",
  "@zavx0z/template": "../template/package.json",
  "@zavx0z/react": "../renderer/packages/react/package.json",
  "@zavx0z/renderer": "../renderer/packages/core/package.json",
  "@zavx0z/renderer-webgpu": "../renderer/packages/webgpu/package.json",
  "@zavx0z/renderer-browser": "../renderer/packages/browser/package.json",
  "@ui/components": "projects/ui/packages/components/package.json",
  "@nodes/core": "projects/node/packages/core/package.json",
  "@nodes/layout": "projects/node/packages/layout/package.json",
  "@nodes/worker": "projects/node/packages/worker/package.json",
  "@nodes/ui": "projects/node/packages/ui/package.json",
  "@nodes/editor": "projects/node/packages/editor/package.json",
  "@zavx0z/dom-devtools": "../renderer/packages/devtools/package.json",
} as const)

export type LegacyPackageName = keyof typeof legacyPackageManifestPaths

export const finalPackageDirectories = Object.freeze({
  "@zavx0z/engine": "engine",
  "@zavx0z/dom": "dom",
  "@zavx0z/template": "template",
  "@zavx0z/component": "component",
  "@zavx0z/renderer": "renderer",
  "@zavx0z/webgpu": "webgpu",
  "@zavx0z/browser": "browser",
  "@zavx0z/space": "space",
  "@zavx0z/ui": "ui",
  "@zavx0z/nodetree": "nodetree",
  "@zavx0z/layout": "layout",
  "@zavx0z/nodes": "nodes",
} as const)

export type FinalPackageName = keyof typeof finalPackageDirectories

export type FinalExportTarget = Readonly<{
  packageName: FinalPackageName
  subpath: string
}>

export type ExportDisposition = Readonly<{
  decisionMarker?: string
  kind: "deferred" | "moved" | "retired"
  ownerPackages?: readonly FinalPackageName[]
  reason?: string
  requirementIds?: readonly string[]
  sourcePackage: LegacyPackageName
  sourceSubpath: string
  targets: readonly FinalExportTarget[]
}>

const target = (
  packageName: FinalPackageName,
  subpath: string,
): FinalExportTarget => Object.freeze({packageName, subpath})

const sameSubpaths = (
  sourcePackage: LegacyPackageName,
  targetPackage: FinalPackageName,
  subpaths: readonly string[],
): readonly ExportDisposition[] => subpaths.map(sourceSubpath => Object.freeze({
  kind: "moved" as const,
  sourcePackage,
  sourceSubpath,
  targets: Object.freeze([target(targetPackage, sourceSubpath)]),
}))

const moved = (
  sourcePackage: LegacyPackageName,
  sourceSubpath: string,
  targetPackage: FinalPackageName,
  targetSubpath: string,
): ExportDisposition => Object.freeze({
  kind: "moved",
  sourcePackage,
  sourceSubpath,
  targets: Object.freeze([target(targetPackage, targetSubpath)]),
})

const retired = (
  sourcePackage: LegacyPackageName,
  sourceSubpath: string,
  reason: string,
  decisionMarker: string,
  ownerPackage: FinalPackageName,
  requirementIds: readonly string[],
): ExportDisposition => Object.freeze({
  decisionMarker,
  kind: "retired",
  ownerPackages: Object.freeze([ownerPackage]),
  reason,
  requirementIds: Object.freeze([...requirementIds]),
  sourcePackage,
  sourceSubpath,
  targets: Object.freeze([]),
})

const deferred = (
  sourcePackage: LegacyPackageName,
  sourceSubpath: string,
  reason: string,
  decisionMarker: string,
): ExportDisposition => Object.freeze({
  decisionMarker,
  kind: "deferred",
  reason,
  sourcePackage,
  sourceSubpath,
  targets: Object.freeze([]),
})

export const exportDispositions: readonly ExportDisposition[] = Object.freeze([
  ...sameSubpaths("@engine/core", "@zavx0z/engine", [
    ".",
    "./default-font",
    "./fonts/inter-regular.ttf",
    "./fonts/jetbrains-mono-bold.ttf",
  ]),
  ...sameSubpaths("@zavx0z/dom", "@zavx0z/dom", [
    ".",
    "./event",
    "./toggle-event",
    "./ui-event",
    "./focus-event",
    "./input-event",
    "./keyboard-event",
    "./composition-event",
    "./mouse-event",
    "./wheel-event",
    "./pointer-event",
    "./event-target",
    "./mutation",
    "./state-change",
    "./popover-state",
    "./node",
    "./document",
    "./document-fragment",
    "./character-data",
    "./text",
    "./comment",
    "./element",
    "./html-element",
    "./html/div-element",
    "./html/field-set-element",
    "./html/heading-element",
    "./html/span-element",
    "./html/button-element",
    "./html/input-element",
    "./html/image-element",
    "./html/label-element",
    "./html/li-element",
    "./html/legend-element",
    "./html/meter-element",
    "./html/option-element",
    "./html/paragraph-element",
    "./html/progress-element",
    "./html/select-element",
    "./html/table-cell-element",
    "./html/table-element",
    "./html/table-row-element",
    "./html/table-section-element",
    "./html/text-area-element",
    "./html/u-list-element",
    "./html/vector-path-element",
  ]),
  ...sameSubpaths("@zavx0z/template", "@zavx0z/template", [
    ".",
    "./compiled",
    "./compiler",
    "./bun",
    "./jsx-runtime",
    "./jsx-dev-runtime",
  ]),
  ...sameSubpaths("@zavx0z/react", "@zavx0z/component", [
    ".",
    "./compatibility",
    "./compatibility.json",
  ]),
  ...sameSubpaths("@zavx0z/renderer", "@zavx0z/renderer", [
    ".",
    "./frame-changes",
  ]),
  ...sameSubpaths("@zavx0z/renderer-webgpu", "@zavx0z/webgpu", ["."]),
  ...sameSubpaths("@zavx0z/renderer-browser", "@zavx0z/browser", ["."]),
  moved("@ui/components", "./button", "@zavx0z/ui", "./buttons/button"),
  moved("@ui/components", "./pane", "@zavx0z/ui", "./surfaces/pane"),
  moved("@ui/components", "./panel", "@zavx0z/ui", "./surfaces/panel"),
  ...sameSubpaths("@ui/components", "@zavx0z/ui", [
    "./badge",
    "./typography",
    "./fields/checkbox-field",
    "./fields/collection-field",
    "./fields/color-field",
    "./fields/color-picker-field",
    "./fields/cycle-field",
    "./fields/field-group",
    "./fields/matrix-field",
    "./fields/number-field",
    "./fields/path-field",
    "./fields/reference-field",
    "./fields/select-field",
    "./fields/slider-field",
    "./fields/switch-field",
    "./fields/text-field",
    "./fields/vector-field",
    "./divider",
  ]),
  moved(
    "@ui/components",
    "./fields/option-group-field",
    "@zavx0z/ui",
    "./buttons/toggle-button-group",
  ),
  moved("@ui/components", "./list", "@zavx0z/ui", "./views/list"),
  moved("@ui/components", "./table", "@zavx0z/ui", "./views/table"),
  moved("@ui/components", "./status-bar", "@zavx0z/ui", "./feedback/status-bar"),
  moved("@ui/components", "./notification", "@zavx0z/ui", "./feedback/notification"),
  moved("@ui/components", "./code-editor", "@zavx0z/ui", "./views/code-editor"),
  moved("@ui/components", "./inspector", "@zavx0z/ui", "./widgets/inspector"),
  Object.freeze({
    kind: "moved" as const,
    sourcePackage: "@ui/components" as const,
    sourceSubpath: "./hud",
    targets: Object.freeze([
      target("@zavx0z/ui", "./surfaces/window"),
      target("@zavx0z/ui", "./surfaces/frame"),
      target("@zavx0z/ui", "./views/timeline"),
    ]),
  }),
  moved("@ui/components", "./icons", "@zavx0z/ui", "./themes/icons"),
  moved("@ui/components", "./syntax-theme", "@zavx0z/ui", "./themes/syntax-theme"),
  moved("@ui/components", "./theme.css", "@zavx0z/ui", "./themes/theme.css"),
  ...sameSubpaths("@nodes/core", "@zavx0z/nodetree", [
    ".",
    "./json-patch",
    "./parameter",
    "./node-tree",
    "./projection-types",
  ]),
  ...sameSubpaths("@nodes/layout", "@zavx0z/layout", [
    ".",
    "./fixed",
    "./adaptive",
    "./top-down",
    "./coffman-graham",
    "./types",
  ]),
  retired(
    "@nodes/layout",
    "./layout-presentation.css",
    "dev-only оформление прежнего каталога не является production API нового Layout",
    "layout-presentation.css",
    "@zavx0z/layout",
    ["LAYOUT-STATIC-001"],
  ),
  moved("@nodes/worker", ".", "@zavx0z/layout", "./worker"),
  moved("@nodes/worker", "./types", "@zavx0z/layout", "./worker/types"),
  moved("@nodes/worker", "./transport", "@zavx0z/layout", "./worker/transport"),
  moved("@nodes/worker", "./fixed/client", "@zavx0z/layout", "./worker/fixed/client"),
  moved("@nodes/worker", "./fixed/executor", "@zavx0z/layout", "./worker/fixed/executor"),
  moved("@nodes/worker", "./adaptive/client", "@zavx0z/layout", "./worker/adaptive/client"),
  moved("@nodes/worker", "./adaptive/executor", "@zavx0z/layout", "./worker/adaptive/executor"),
  moved("@nodes/worker", "./top-down/client", "@zavx0z/layout", "./worker/top-down/client"),
  moved("@nodes/worker", "./top-down/executor", "@zavx0z/layout", "./worker/top-down/executor"),
  moved(
    "@nodes/worker",
    "./coffman-graham/client",
    "@zavx0z/layout",
    "./worker/coffman-graham/client",
  ),
  moved(
    "@nodes/worker",
    "./coffman-graham/executor",
    "@zavx0z/layout",
    "./worker/coffman-graham/executor",
  ),
  retired(
    "@nodes/worker",
    "./worker-protocol.css",
    "dev-only оформление прежнего Worker-каталога не является production API нового Layout",
    "worker-protocol.css",
    "@zavx0z/layout",
    ["LAYOUT-STATIC-001"],
  ),
  ...sameSubpaths("@nodes/ui", "@zavx0z/nodes", [
    ".",
    "./frame",
    "./link",
    "./node",
    "./node-editor",
    "./node-tree",
    "./parameter",
    "./socket",
  ]),
  deferred(
    "@nodes/editor",
    ".",
    "Node editor остаётся в исходном репозитории до подтверждённого production consumer",
    "@nodes/editor",
  ),
  deferred(
    "@nodes/editor",
    "./node-tree-editor",
    "Node editor остаётся в исходном репозитории до подтверждённого production consumer",
    "@nodes/editor",
  ),
  deferred(
    "@zavx0z/dom-devtools",
    ".",
    "DOM inspector остаётся в исходном репозитории до подтверждённого production consumer",
    "DOM inspector",
  ),
])
