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
  "@webxr/renderer": "renderer",
  "@renderer/html": "renderer/html",
  "@webxr/markdown": "markdown",
  "@zavx0z/webgpu": "webgpu",
  "@zavx0z/browser": "browser",
  "@zavx0z/space": "space",
  "@zavx0z/ui": "ui",
  "@webxr/nodes": "nodes",
  "@nodes/node": "nodes/node",
  "@nodes/tree": "nodes/tree",
  "@nodes/layout": "nodes/layout",
  "@nodes/parameters": "nodes/parameters",
  "@nodes/sockets": "nodes/sockets",
  "@zavx0z/devtools": "devtools",
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
  ...sameSubpaths("@zavx0z/renderer", "@renderer/html", [
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
  ...sameSubpaths("@nodes/core", "@nodes/tree", [
    ".",
    "./json-patch",
    "./parameter",
    "./node-tree",
    "./projection-types",
  ]),
  ...sameSubpaths("@nodes/layout", "@nodes/layout", [
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
    "@nodes/layout",
    ["LAYOUT-STATIC-001"],
  ),
  moved("@nodes/worker", ".", "@nodes/layout", "./worker"),
  moved("@nodes/worker", "./types", "@nodes/layout", "./worker/types"),
  moved("@nodes/worker", "./transport", "@nodes/layout", "./worker/transport"),
  moved("@nodes/worker", "./fixed/client", "@nodes/layout", "./worker/fixed/client"),
  moved("@nodes/worker", "./fixed/executor", "@nodes/layout", "./worker/fixed/executor"),
  moved("@nodes/worker", "./adaptive/client", "@nodes/layout", "./worker/adaptive/client"),
  moved("@nodes/worker", "./adaptive/executor", "@nodes/layout", "./worker/adaptive/executor"),
  moved("@nodes/worker", "./top-down/client", "@nodes/layout", "./worker/top-down/client"),
  moved("@nodes/worker", "./top-down/executor", "@nodes/layout", "./worker/top-down/executor"),
  moved(
    "@nodes/worker",
    "./coffman-graham/client",
    "@nodes/layout",
    "./worker/coffman-graham/client",
  ),
  moved(
    "@nodes/worker",
    "./coffman-graham/executor",
    "@nodes/layout",
    "./worker/coffman-graham/executor",
  ),
  retired(
    "@nodes/worker",
    "./worker-protocol.css",
    "dev-only оформление прежнего Worker-каталога не является production API нового Layout",
    "worker-protocol.css",
    "@nodes/layout",
    ["LAYOUT-STATIC-001"],
  ),
  Object.freeze({
    kind: "moved" as const,
    sourcePackage: "@nodes/ui" as const,
    sourceSubpath: ".",
    targets: Object.freeze([
      ...["./frame", "./link", "./editor", "./view", "./view/tree"]
        .map(subpath => target("@webxr/nodes", subpath)),
      ...[
        "./text", "./number", "./slider", "./checkbox", "./switch", "./select",
        "./cycle", "./option-group", "./color", "./vector", "./matrix", "./path",
        "./reference", "./collection", "./output", "./shared",
      ].map(subpath => target("@nodes/parameters", subpath)),
      target("@nodes/node", "./parameter"),
      target("@nodes/node", "./content"),
      target("@nodes/node", "./diagram"),
      target("@nodes/sockets", "./socket"),
      target("@nodes/sockets", "./presets"),
    ]),
  }),
  moved("@nodes/ui", "./node", "@nodes/node", "./parameter"),
  ...sameSubpaths("@nodes/ui", "@webxr/nodes", [
    "./frame",
    "./link",
  ]),
  moved("@nodes/ui", "./node-editor", "@webxr/nodes", "./editor"),
  moved("@nodes/ui", "./node-tree", "@webxr/nodes", "./view"),
  moved("@nodes/ui", "./parameter", "@nodes/parameters", "./shared"),
  moved("@nodes/ui", "./socket", "@nodes/sockets", "./socket"),
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
  moved("@zavx0z/dom-devtools", ".", "@zavx0z/devtools", "."),
])
