import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {layoutAdaptiveWithDiagnostics} from "@nodes/layout/adaptive"
import {layoutFixed} from "@nodes/layout/fixed"
import {layoutTopDown} from "@nodes/layout/top-down"
import {getFixtureFamily, STORYBOOK_FIXTURES} from "./layout-fixtures.ts"
import {
  LAYOUT_STORIES,
  layoutCatalogItems,
  layoutSectionItems,
  layoutStoryRoute,
  layoutVariantItems,
} from "./layout-stories.ts"
import {renderLayoutSvg} from "./render-layout-svg.ts"
import {TOP_DOWN_REFERENCE_GRAPH} from "./top-down-fixture.ts"
import {
  TOP_DOWN_DENSE_GRAPH,
} from "./top-down-dense-fixture.ts"

const storybookRoot = fileURLToPath(new URL(".", import.meta.url))
const layoutRoot = fileURLToPath(new URL("../", import.meta.url))
const repositoryStorybookRoot = fileURLToPath(new URL("../../storybook/", import.meta.url))

const FIXED_BASELINES = {
  "fixed-baseline-right": {
    direction: "RIGHT",
    bounds: {x: 0, y: 0, width: 632, height: 446},
    resultHash: "78d036df9a386533218936d0f2366e32f233f28a4f28d892d17bf1bb0fb4c844",
    svgHash: "06b613ed5423c5bab9d6a6463defa79c80e19946a171b34e8775e0baec4151da",
  },
  "fixed-baseline-down": {
    direction: "DOWN",
    bounds: {x: 0, y: 0, width: 396, height: 830},
    resultHash: "bb8fd47580182a40198e6aff388dcf7d26b28651ed9d592fa825efc02b4929c1",
    svgHash: "3a1dff856c72c057e2e3ac04bd201a79f2fae1d4ffeefe6532fc74c2a5b702e9",
  },
} as const

const ADAPTIVE_BASELINES = {
  "adaptive-shared-right": {
    direction: "RIGHT",
    side: "EAST",
    bounds: {x: 0, y: 0, width: 540, height: 330},
    resultHash: "908e21c560fc58850a831e4b865123d650e4d1b6c72917476d23ed033aee115a",
    svgHash: "c4af6391484d48b68ba95bee35c9559717d8f7a70cd53303b85a956cc7011c04",
  },
  "adaptive-shared-down": {
    direction: "DOWN",
    side: "WEST",
    bounds: {x: 0, y: 0, width: 280, height: 400},
    resultHash: "5c50a710cb8f79b6c42cc79b9eb7ea219798e1700f2606952bc97f8a4899af3d",
    svgHash: "6c0bd1792ce1e9c27d8eb0ae784e6df45760e9dbba6b2cde232f137fc068027e",
  },
  "adaptive-compound-right": {
    direction: "RIGHT",
    side: "EAST",
    bounds: {x: 0, y: 0, width: 604, height: 424},
    resultHash: "9732f683af8925702f04db46a49a674acc87b6a5cf0a828011c2c5720d4448a0",
    svgHash: "96bcb1808d5a2ef805fb77a7e733940c8e3ea25fece16bca205bb2266ccb46e8",
  },
  "adaptive-compound-down": {
    direction: "DOWN",
    side: "WEST",
    bounds: {x: 0, y: 0, width: 316, height: 588},
    resultHash: "8cd59ef4c9c367c7ad5c1cca22f8a8dc629d59b6de8a4d31b9c564a045331264",
    svgHash: "519dc81fe9187c49d0f369637a51839666c746dd81d696261f065b08453f1075",
  },
} as const

describe("standard package-owned Layout Storybook", () => {
  test("uses the shared retained Workbench and exact UI owners", async () => {
    const entry = await Bun.file(join(storybookRoot, "layout.stories.ts")).text()
    const preview = await Bun.file(join(storybookRoot, "layout-preview-surface.ts")).text()
    const renderer = await Bun.file(join(storybookRoot, "render-layout-preview.ts")).text()
    const registry = await Bun.file(join(repositoryStorybookRoot, "server/page-registry.ts")).text()

    expect(entry).toContain('UiRuntime} from "@layout/core/runtime"')
    expect(entry).toContain('from "@zavx0z/storybook/workbench"')
    expect(entry).toContain("StorybookBackdropSurface")
    expect(entry).toContain("StorybookNavigationSurface")
    expect(entry).toContain("StorybookDockSurface")
    expect(entry).toContain("StorybookStoryPanelSurface")
    expect(entry).toContain("planStorybookShell")
    expect(preview).toContain("drawStorybookPreviewChrome")
    expect(renderer).toContain('Pane} from "@ui/components/pane"')
    expect(renderer).toContain('Typography} from "@ui/components/typography"')
    expect(renderer).toContain('div} from "@ui/elements/div"')
    expect(renderer).not.toContain("drawnCurves")
    expect(renderer).not.toContain("arrowTips")
    expect(renderer).not.toContain("separateSemanticEdge")
    expect(renderer).toContain("sampleCurveChain")
    expect(registry).toContain('body: {kind: "canvas", canvasId: "nodes-storybook-canvas"}')
    expect(registry).toContain('entrypoint: join(packagesRoot, "layout/storybook/layout.stories.ts")')
    expect(await Bun.file(join(storybookRoot, "layout-storybook-body.html")).exists()).toBeFalse()
    expect(await Bun.file(join(storybookRoot, "layout-detail.ts")).exists()).toBeFalse()
  })

  test("publishes the standard package-policy-scenario-variant hierarchy", () => {
    expect(LAYOUT_STORIES.index.map(({route}) => route)).toEqual([
      "fixed/baseline/right",
      "fixed/baseline/down",
      "adaptive/shared/right",
      "adaptive/shared/down",
      "adaptive/compound/right",
      "adaptive/compound/down",
      "top-down/blender-area/default",
      "top-down/dense/default",
    ])
    expect(LAYOUT_STORIES.representative).toBe("fixed/baseline/right")
    expect(layoutStoryRoute("")).toBe("fixed/baseline/right")
    expect(layoutStoryRoute("top-down")).toBe("top-down/blender-area/default")
    expect(layoutCatalogItems(new Set()).map(({route}) => route)).toEqual(["fixed", "adaptive", "top-down"])
    expect(layoutSectionItems("adaptive/shared/right").map(({route}) => route))
      .toEqual(["adaptive/shared", "adaptive/compound"])
    expect(layoutVariantItems("fixed/baseline/right").map(({route}) => route))
      .toEqual(["fixed/baseline/right", "fixed/baseline/down"])
  })

  test("lazy story modules import only their exact production policy", async () => {
    const eager = await Bun.file(join(storybookRoot, "layout-stories.ts")).text()
    const fixed = await Bun.file(join(storybookRoot, "stories/fixed.ts")).text()
    const adaptive = await Bun.file(join(storybookRoot, "stories/adaptive.ts")).text()
    const topDown = await Bun.file(join(storybookRoot, "stories/top-down.ts")).text()

    expect(eager).not.toMatch(/from "@nodes\/layout\/(?:fixed|adaptive|top-down)"/)
    expect(fixed).toContain('from "@nodes/layout/fixed"')
    expect(fixed).not.toContain("@nodes/layout/adaptive")
    expect(fixed).not.toContain("@nodes/layout/top-down")
    expect(adaptive).toContain('from "@nodes/layout/adaptive"')
    expect(adaptive).not.toContain("@nodes/layout/fixed")
    expect(adaptive).not.toContain("@nodes/layout/top-down")
    expect(topDown).toContain('from "@nodes/layout/top-down"')
    expect(topDown).not.toContain("@nodes/layout/fixed")
    expect(topDown).not.toContain("@nodes/layout/adaptive")

    for (const route of LAYOUT_STORIES.index.map(({route}) => route)) {
      const module = await LAYOUT_STORIES.load(route)
      expect(module.source(module.defaultArgs)).toContain("const result = layout")
      expect(module.controls.map(({key}) => key)).toEqual(["routes", "ports"])
    }
  })

  test("preserves every frozen fixed/adaptive geometry and SVG baseline", () => {
    for (const fixture of getFixtureFamily("fixed-baseline")) {
      const baseline = FIXED_BASELINES[fixture.id as keyof typeof FIXED_BASELINES]
      const result = layoutFixed(fixture.graph)
      const title = `Фиксированная · ${formatDirection(result.direction)}`
      const svg = renderLayoutSvg(fixture.graph, result, title)
      expect(result.direction).toBe(baseline.direction)
      expect(result.bounds).toEqual(baseline.bounds)
      expect(hash(result)).toBe(baseline.resultHash)
      expect(hash(svg)).toBe(baseline.svgHash)
    }
    for (const fixture of STORYBOOK_FIXTURES.filter(({policyId}) => policyId === "adaptive")) {
      const baseline = ADAPTIVE_BASELINES[fixture.id as keyof typeof ADAPTIVE_BASELINES]
      const {result, diagnostics} = layoutAdaptiveWithDiagnostics(fixture.graph)
      const title = `Адаптивная · ${formatDirection(result.direction)}`
      const svg = renderLayoutSvg(fixture.graph, result, title)
      expect(result.direction).toBe(baseline.direction)
      expect(result.bounds).toEqual(baseline.bounds)
      expect(result.ports.find(({id}) => id === "source/shared")?.side).toBe(baseline.side)
      expect(diagnostics.attemptedCandidates).toBeLessThanOrEqual(diagnostics.candidateBudget)
      expect(hash(result)).toBe(baseline.resultHash)
      expect(hash(svg)).toBe(baseline.svgHash)
    }
  })

  test("freezes the new reference topology without manual ranks or routes", () => {
    const result = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)
    expect(TOP_DOWN_REFERENCE_GRAPH).not.toHaveProperty("viewport")
    for (const node of TOP_DOWN_REFERENCE_GRAPH.nodes) {
      expect(node).not.toHaveProperty("x")
      expect(node).not.toHaveProperty("y")
      expect(node).not.toHaveProperty("rank")
    }
    expect(JSON.stringify(TOP_DOWN_REFERENCE_GRAPH.edges)).not.toMatch(/"(?:bendPoints|constraint|lane|rank|type)"/)
    expect(result.direction).toBe("DOWN")
    expect(result.nodes).toHaveLength(19)
    expect(result.edges).toHaveLength(20)
    expect(result.bounds).toEqual({x: 0, y: 0, width: 1296, height: 1148})
    expect(hash(result)).toBe("b4fe857a3449b14f8739b0f7a642fe3b56bfc37544636d8ef21c3e8541eee1c7")
  })

  test("runs the dense DAG through the same single semantic edge type", () => {
    const result = layoutTopDown(TOP_DOWN_DENSE_GRAPH)
    const sourceEndpoints = new Set(result.edges.map(({curves}) => JSON.stringify(curves[0]!.startPoint)))
    const targetEndpoints = new Set(result.edges.map(({curves}) => JSON.stringify(curves.at(-1)!.endPoint)))

    expect(result.nodes).toHaveLength(54)
    expect(result.edges).toHaveLength(85)
    expect(TOP_DOWN_DENSE_GRAPH.ports).toHaveLength(170)
    expect(JSON.stringify(TOP_DOWN_DENSE_GRAPH.edges)).not.toContain("constraint")
    expect(sourceEndpoints.size).toBe(result.edges.length)
    expect(targetEndpoints.size).toBe(result.edges.length)
    expect(result.edges.every(({curves}) => curves.length > 0)).toBeTrue()
    expect(result.bounds).toEqual({x: 0, y: 0, width: 5273.5, height: 924})
    expect(hash(result)).toBe("2da8a883fb0137f86b723a5454f761c91f860f44c2a5d860b4f50939f680c3b3")
  })

  test("keeps Storybook outside production exports and splits policy implementations", async () => {
    const packageJson = await Bun.file(join(layoutRoot, "package.json")).json() as {
      exports?: Record<string, unknown>
    }
    expect(Object.keys(packageJson.exports ?? {})).not.toContain("./storybook")
    const build = await Bun.build({
      entrypoints: [join(storybookRoot, "layout.stories.ts")],
      target: "browser",
      format: "esm",
      minify: true,
      splitting: true,
    })
    expect(build.success, build.logs.map(({message}) => message).join("\n")).toBeTrue()
    const sources = await Promise.all(build.outputs.map((output) => output.text()))
    expect(sources.some((source) => source.includes("TOP_DOWN_CYCLE_DETECTED"))).toBeTrue()
    expect(sources.some((source) => source.includes("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT"))).toBeTrue()
    for (const source of sources) {
      if (!source.includes("TOP_DOWN_CYCLE_DETECTED")) continue
      expect(source).not.toContain("NO_LEGAL_LAYOUT")
      expect(source).not.toContain("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
      expect(source).not.toContain("Port has conflicting edge roles")
    }
  })
})

function formatDirection(direction: "RIGHT" | "DOWN"): string {
  return direction === "RIGHT" ? "Горизонтальная (RIGHT)" : "Вертикальная (DOWN)"
}

function hash(value: unknown): string {
  const bytes = typeof value === "string" ? value : JSON.stringify(value)
  return new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
}
