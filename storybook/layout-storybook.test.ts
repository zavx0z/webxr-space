import {describe, expect, test} from "bun:test"
import {join} from "node:path"
import {fileURLToPath} from "node:url"
import {createDocument} from "@zavx0z/dom"
import {layoutAdaptiveWithDiagnostics} from "@nodes/layout/adaptive"
import {
  layoutCoffmanGraham,
  type CoffmanGrahamLayoutGraph,
} from "@nodes/layout/coffman-graham"
import {layoutFixed} from "@nodes/layout/fixed"
import {layoutTopDown} from "@nodes/layout/top-down"
import {getFixtureFamily, STORYBOOK_FIXTURES} from "./layout-fixtures.ts"
import {
  LAYOUT_DOM_ROUTES,
  createLayoutDomStory,
} from "./dom/layout-dom-story.ts"
import {renderLayoutSvg} from "./render-layout-svg.ts"
import {TOP_DOWN_REFERENCE_GRAPH} from "./top-down-fixture.ts"
import {
  TOP_DOWN_DENSE_GRAPH,
} from "./top-down-dense-fixture.ts"

const storybookRoot = fileURLToPath(new URL(".", import.meta.url))
const layoutRoot = fileURLToPath(new URL("../", import.meta.url))
const COFFMAN_GRAHAM_STORY_GRAPH = {
  ...TOP_DOWN_DENSE_GRAPH,
  layoutOptions: {...TOP_DOWN_DENSE_GRAPH.layoutOptions, maxNodesPerLayer: 4},
} satisfies CoffmanGrahamLayoutGraph

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
  test("supplies exact lazy Layout stories to the one root Workbench", async () => {
    const catalog = await Bun.file(join(layoutRoot, ".storybook/catalog.json")).json() as {
      categories: readonly Readonly<{
        route: string
        subjects: readonly Readonly<{
          route: string
          variants: readonly Readonly<{module: Readonly<{path: string; export: string}>}>[]
        }>[]
      }>[]
    }
    const domStory = await Bun.file(join(storybookRoot, "dom/layout-dom-story.ts")).text()
    const domController = await Bun.file(join(layoutRoot, "dom/layout-presentation.ts")).text()
    const runtime = await Bun.file(join(layoutRoot, ".storybook/runtime.ts")).text()

    expect(catalog.categories[0]?.route).toBe("layout")
    expect(catalog.categories[0]?.subjects.map(({route}) => route)).toEqual([
      "layout/fixed",
      "layout/adaptive",
      "layout/dagre-layered",
      "layout/coffman-graham",
    ])
    expect(new Set(catalog.categories[0]?.subjects.flatMap(({variants}) =>
      variants.map(({module}) => `${module.path}#${module.export}`))))
      .toEqual(new Set(["../storybook/dom/layout-dom-story.ts#createLayoutDomStory"]))
    expect(domStory).toContain('import("./providers/fixed.ts")')
    expect(domStory).toContain('import("./providers/adaptive.ts")')
    expect(domStory).toContain('import("./providers/dagre-layered.ts")')
    expect(domStory).toContain('import("./providers/coffman-graham.ts")')
    expect(domController).toContain('from "@zavx0z/dom"')
    expect(domController).not.toMatch(/@layout\/core|@ui\/elements|@ui\/components/)
    expect(runtime).toContain("createNodesExternalRuntime")
    expect(runtime).not.toContain("@zavx0z/storybook")
  })

  test("publishes every overview and exact package-policy-scenario route", () => {
    expect(LAYOUT_DOM_ROUTES).toEqual([
      "layout",
      "layout/fixed",
      "layout/fixed/baseline",
      "layout/fixed/baseline/right",
      "layout/fixed/baseline/down",
      "layout/adaptive",
      "layout/adaptive/shared",
      "layout/adaptive/shared/right",
      "layout/adaptive/shared/down",
      "layout/adaptive/compound",
      "layout/adaptive/compound/right",
      "layout/adaptive/compound/down",
      "layout/dagre-layered",
      "layout/dagre-layered/default",
      "layout/dagre-layered/default/default",
      "layout/coffman-graham",
      "layout/coffman-graham/default",
      "layout/coffman-graham/default/default",
    ])
    const details = LAYOUT_DOM_ROUTES.filter((route) => route.split("/").length === 4)
    expect(details).toEqual([
      "layout/fixed/baseline/right",
      "layout/fixed/baseline/down",
      "layout/adaptive/shared/right",
      "layout/adaptive/shared/down",
      "layout/adaptive/compound/right",
      "layout/adaptive/compound/down",
      "layout/dagre-layered/default/default",
      "layout/coffman-graham/default/default",
    ])
    expect(JSON.stringify(LAYOUT_DOM_ROUTES)).not.toMatch(/Blender Area|Dense DAG/)
  })

  test("lazy DOM providers import only their exact production policy", async () => {
    const eager = await Bun.file(join(storybookRoot, "dom/layout-dom-story.ts")).text()
    const fixed = await Bun.file(join(storybookRoot, "dom/providers/fixed.ts")).text()
    const adaptive = await Bun.file(join(storybookRoot, "dom/providers/adaptive.ts")).text()
    const dagreLayered = await Bun.file(join(storybookRoot, "dom/providers/dagre-layered.ts")).text()
    const coffmanGraham = await Bun.file(join(storybookRoot, "dom/providers/coffman-graham.ts")).text()

    expect(eager).not.toMatch(/from "@nodes\/layout\/(?:fixed|adaptive|top-down|coffman-graham)"/)
    expect(fixed).toContain('from "@nodes/layout/fixed"')
    expect(fixed).not.toContain("@nodes/layout/adaptive")
    expect(fixed).not.toContain("@nodes/layout/top-down")
    expect(fixed).not.toContain("@nodes/layout/coffman-graham")
    expect(adaptive).toContain('from "@nodes/layout/adaptive"')
    expect(adaptive).not.toContain("@nodes/layout/fixed")
    expect(adaptive).not.toContain("@nodes/layout/top-down")
    expect(adaptive).not.toContain("@nodes/layout/coffman-graham")
    expect(dagreLayered).toContain('from "@nodes/layout/top-down"')
    expect(dagreLayered).not.toContain("@nodes/layout/fixed")
    expect(dagreLayered).not.toContain("@nodes/layout/adaptive")
    expect(dagreLayered).not.toContain("@nodes/layout/coffman-graham")
    expect(coffmanGraham).toContain('from "@nodes/layout/coffman-graham"')
    expect(coffmanGraham).not.toContain("@nodes/layout/fixed")
    expect(coffmanGraham).not.toContain("@nodes/layout/adaptive")
    expect(coffmanGraham).not.toContain("@nodes/layout/top-down")

    for (const route of LAYOUT_DOM_ROUTES.filter((value) => value.split("/").length === 4)) {
      const story = await createLayoutDomStory(createDocument(), route)
      const source = story.source()
      expect(source.html).toContain('class="layout-dom"')
      expect(Object.keys(source).sort()).toEqual(["html", "typescript"])
      expect(story.componentRoot.readStyleSheets()).toEqual({revision: 0, styleSheets: []})
      expect(source.typescript)
        .toMatch(/ = layout(?:Fixed|AdaptiveWithDiagnostics|TopDown|CoffmanGraham)\(/u)
      expect(story.props.showRoutes).toBeTrue()
      expect(story.props.showPorts).toBeTrue()
      story.dispose()
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

  test("freezes the Dagre Layered reference topology without manual ranks or routes", () => {
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
    expect(hash(result)).toBe("d3ca08dfed6c51c934128e15069f24c2b8c437cb13b11a01cdb6877d3ad804e3")
  })

  test("runs the large graph through the width-bounded Coffman–Graham policy", () => {
    const result = layoutCoffmanGraham(COFFMAN_GRAHAM_STORY_GRAPH)
    const layers = Map.groupBy(result.nodes, (node) => node.y + node.height / 2)
    const sourceEndpoints = new Set(result.edges.map(({curves}) => JSON.stringify(curves[0]!.startPoint)))
    const targetEndpoints = new Set(result.edges.map(({curves}) => JSON.stringify(curves.at(-1)!.endPoint)))

    expect(result.nodes).toHaveLength(54)
    expect(result.edges).toHaveLength(85)
    expect(TOP_DOWN_DENSE_GRAPH.ports).toHaveLength(170)
    expect(JSON.stringify(TOP_DOWN_DENSE_GRAPH.edges)).not.toContain("constraint")
    expect(sourceEndpoints.size).toBe(result.edges.length)
    expect(targetEndpoints.size).toBe(result.edges.length)
    expect(result.edges.every(({curves}) => curves.length > 0)).toBeTrue()
    expect(Math.max(...[...layers.values()].map((nodes) => nodes.length))).toBeLessThanOrEqual(4)
    expect(result.edges.every(({curves}) => curves.every((curve) =>
      curve.startPoint.y < curve.endPoint.y))).toBeTrue()
    expect(result.bounds).toEqual({x: 0, y: 0, width: 3372, height: 3681.9360215})
    expect(result.crossings).toHaveLength(192)
    expect(hash(result)).toBe("3af3d3c4e0087f45b6761db78980a1c91b5f10c020cdae56c67df6f133fe634b")
  })

  test("keeps Storybook outside production exports and splits policy implementations", async () => {
    const packageJson = await Bun.file(join(layoutRoot, "package.json")).json() as {
      exports?: Record<string, unknown>
    }
    expect(Object.keys(packageJson.exports ?? {})).not.toContain("./storybook")
    const build = await Bun.build({
      entrypoints: [join(storybookRoot, "dom/layout-dom-story.ts")],
      target: "browser",
      format: "esm",
      minify: true,
      splitting: true,
    })
    expect(build.success, build.logs.map(({message}) => message).join("\n")).toBeTrue()
    const sources = await Promise.all(build.outputs.map((output) => output.text()))
    expect(sources.some((source) => source.includes("TOP_DOWN_CYCLE_DETECTED"))).toBeTrue()
    expect(sources.some((source) => source.includes("COFFMAN_GRAHAM_CYCLE_DETECTED"))).toBeTrue()
    expect(sources.some((source) => source.includes("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT"))).toBeTrue()
    for (const source of sources) {
      if (source.includes("TOP_DOWN_CYCLE_DETECTED")) {
        expect(source).not.toContain("COFFMAN_GRAHAM_CYCLE_DETECTED")
        expect(source).not.toContain("NO_LEGAL_LAYOUT")
        expect(source).not.toContain("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
        expect(source).not.toContain("Port has conflicting edge roles")
      }
      if (source.includes("COFFMAN_GRAHAM_CYCLE_DETECTED")) {
        expect(source).not.toContain("TOP_DOWN_CYCLE_DETECTED")
        expect(source).not.toContain("NO_LEGAL_LAYOUT")
        expect(source).not.toContain("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
        expect(source).not.toContain("Port has conflicting edge roles")
      }
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
