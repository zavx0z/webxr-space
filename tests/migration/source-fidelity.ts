export type PublicSymbolDisposition = Readonly<{
  decisionMarker: string
  kind: "internalized" | "retired"
  ownerPackages: readonly string[]
  requirementIds: readonly string[]
  sourceId: string
  symbols: readonly string[]
}>

export type PublicSymbolComparison = Readonly<{
  expectedSourceCount: number
  sourceId: string
  targetIds: readonly string[]
}>

export const publicModuleEntrypoints = Object.freeze({
  "old-engine": "projects/engine/packages/core/src/index.ts",
  "new-engine": "engine/src/index.ts",
  "new-webgpu-for-engine": "webgpu/src/index.ts",
  "old-dom": "../renderer/packages/dom/src/index.ts",
  "new-dom": "dom/src/index.ts",
  "old-template": "../template/index.ts",
  "new-template": "template/index.ts",
  "old-react": "../renderer/packages/react/src/index.ts",
  "new-component": "component/src/index.ts",
  "old-renderer": "../renderer/packages/core/src/index.ts",
  "new-renderer": "renderer/src/index.ts",
  "old-renderer-webgpu": "../renderer/packages/webgpu/src/index.ts",
  "new-webgpu": "webgpu/src/index.ts",
  "old-renderer-browser": "../renderer/packages/browser/src/index.ts",
  "new-browser": "browser/src/index.ts",
  "new-space": "space/src/index.ts",
  "old-nodes-core": "projects/node/packages/core/index.ts",
  "new-nodetree": "nodetree/index.ts",
  "old-nodes-layout": "projects/node/packages/layout/src/index.ts",
  "new-layout": "layout/src/index.ts",
  "old-nodes-worker": "projects/node/packages/worker/index.ts",
  "new-layout-worker": "layout/worker/index.ts",
  "old-nodes-ui": "projects/node/packages/ui/index.ts",
  "new-nodes": "nodes/index.ts",
} as const)

export const publicSymbolComparisons: readonly PublicSymbolComparison[] = Object.freeze([
  {expectedSourceCount: 114, sourceId: "old-engine", targetIds: ["new-engine", "new-webgpu-for-engine"]},
  {expectedSourceCount: 116, sourceId: "old-dom", targetIds: ["new-dom"]},
  {expectedSourceCount: 20, sourceId: "old-template", targetIds: ["new-template"]},
  {expectedSourceCount: 57, sourceId: "old-react", targetIds: ["new-component"]},
  {expectedSourceCount: 58, sourceId: "old-renderer", targetIds: ["new-renderer"]},
  {expectedSourceCount: 9, sourceId: "old-renderer-webgpu", targetIds: ["new-webgpu"]},
  {
    expectedSourceCount: 36,
    sourceId: "old-renderer-browser",
    targetIds: ["new-browser", "new-space"],
  },
  {expectedSourceCount: 85, sourceId: "old-nodes-core", targetIds: ["new-nodetree"]},
  {expectedSourceCount: 45, sourceId: "old-nodes-layout", targetIds: ["new-layout"]},
  {expectedSourceCount: 2, sourceId: "old-nodes-worker", targetIds: ["new-layout-worker"]},
  {expectedSourceCount: 95, sourceId: "old-nodes-ui", targetIds: ["new-nodes"]},
])

const oldBrowserInternalizedSymbols = Object.freeze([
  "BrowserLinkedAuthorStyleSheetErrorHandler",
  "BrowserLinkedAuthorStyleSheetHost",
  "BrowserLinkedAuthorStyleSheetSource",
  "CreateBrowserLinkedAuthorStyleSheetHostOptions",
  "CreateDocumentCanvasRuntimeOptions",
  "CreateDocumentNativeInputHostOptions",
  "CreateDocumentOverlayRuntimeOptions",
  "CreateDocumentPlaneRuntimeOptions",
  "CreateDocumentSpaceRuntimeOptions",
  "DocumentCanvasFrameSubscriber",
  "DocumentCanvasRuntime",
  "DocumentNativeInputHost",
  "DocumentNativeInputTarget",
  "DocumentOverlayRuntime",
  "DocumentOverlayRuntimeFrameSubscriber",
  "DocumentPlaneRuntime",
  "DocumentPlaneRuntimeFrameSubscriber",
  "DocumentSpaceOverlayRegistration",
  "DocumentSpacePlaneRegistration",
  "DocumentSpacePlaneTransform",
  "DocumentSpacePlaneUpdate",
  "DocumentSpaceQuaternion",
  "DocumentSpaceRuntime",
  "DocumentSpaceVector3",
  "DocumentSpaceViewPointSnapshot",
  "DocumentSpaceWorldRegistration",
  "DocumentSpaceWorldResize",
  "DocumentSpaceWorldRuntime",
  "DocumentSpaceWorldUpdate",
  "DocumentSpaceWorldViewport",
  "createBrowserLinkedAuthorStyleSheetHost",
  "createDocumentCanvasRuntime",
  "createDocumentNativeInputHost",
  "createDocumentOverlayRuntime",
  "createDocumentPlaneRuntime",
  "createDocumentSpaceRuntime",
])

export const publicSymbolDispositions: readonly PublicSymbolDisposition[] = Object.freeze([
  Object.freeze({
    decisionMarker: "LayoutProps",
    kind: "retired" as const,
    ownerPackages: Object.freeze(["@zavx0z/dom", "@zavx0z/renderer"]),
    requirementIds: Object.freeze(["DOM-004", "REN-001", "REN-002"]),
    sourceId: "old-engine",
    symbols: Object.freeze(["ComputedLayout", "LayoutProps"]),
  }),
  Object.freeze({
    decisionMarker: "ViewPointControls",
    kind: "internalized" as const,
    ownerPackages: Object.freeze(["@zavx0z/browser"]),
    requirementIds: Object.freeze(["ENG-004", "BRW-002", "BRW-010", "BRW-011", "EXP-004"]),
    sourceId: "old-engine",
    symbols: Object.freeze(["ViewPointControls"]),
  }),
  Object.freeze({
    decisionMarker: "renderer-browser",
    kind: "internalized" as const,
    ownerPackages: Object.freeze(["@zavx0z/browser"]),
    requirementIds: Object.freeze([
      "BRW-002",
      "BRW-003",
      "BRW-004",
      "BRW-005",
      "EXP-001",
      "EXP-002",
      "EXP-003",
      "EXP-004",
    ]),
    sourceId: "old-renderer-browser",
    symbols: oldBrowserInternalizedSymbols,
  }),
])

export const requirementEvidenceFiles = Object.freeze({
  "BRW-002": "browser/tests/contract.test.ts",
  "BRW-003": "browser/tests/contract.test.ts",
  "BRW-004": "browser/tests/experience.test.ts",
  "BRW-005": "browser/tests/experience.test.ts",
  "BRW-010": "browser/tests/touch-camera-gesture.test.ts",
  "BRW-011": "browser/tests/touch-camera-gesture.test.ts",
  "DOM-004": "dom/tests/contract.test.ts",
  "ENG-004": "engine/tests/contract.test.ts",
  "EXP-001": "tests/experience/contract.test.ts",
  "EXP-002": "tests/experience/contract.test.ts",
  "EXP-003": "tests/experience/contract.test.ts",
  "EXP-004": "tests/experience/contract.test.ts",
  "LAYOUT-STATIC-001": "layout/tests/package-boundary.test.ts",
  "REN-001": "renderer/tests/contract.test.ts",
  "REN-002": "renderer/tests/contract.test.ts",
} as const)

export type RequirementId = keyof typeof requirementEvidenceFiles
