import type {UiSurfaceRect} from "@layout/core/runtime"
import type {UiSurface} from "@layout/core/surface"
import {Button} from "@ui/components/button"
import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {
  defineStorybookStoryModule,
  type StorybookStoryModule,
  type StorybookStorySource,
} from "@zavx0z/storybook/stories"
import {createCoreRuntimeScenario, type CoreRuntimeScenario} from "./core-runtime-scenario.ts"

const PANEL_GAP = 10
const PAGE_PADDING = 22
const STORY_HEADER_HEIGHT = 72
const TOOLBAR_HEIGHT = 32
const STATUS_HEIGHT = 24

/** Creates one isolated live Core story for a lazy repository Storybook load. */
export function createCoreRuntimeStory(): StorybookStoryModule {
  const scenario = createCoreRuntimeScenario()

  return defineStorybookStoryModule({
    defaultArgs: {},
    controls: [],
    render(surface, _args, frame) {
      drawCoreRuntimeStory(surface, scenario, frame)
    },
    source: coreRuntimeSource,
  })
}

function drawCoreRuntimeStory(
  surface: UiSurface,
  scenario: CoreRuntimeScenario,
  frame: UiSurfaceRect,
): void {
  const contentX = frame.x + PAGE_PADDING
  const contentW = Math.max(1, frame.w - PAGE_PADDING * 2)
  const toolbarY = frame.y + STORY_HEADER_HEIGHT
  const buttonGap = 8
  const buttonW = Math.max(104, Math.min(150, (contentW - buttonGap * 2) / 3))

  Button(surface, contentX, toolbarY, buttonW, TOOLBAR_HEIGHT, {
    children: "Gain + 1",
    onClick: () => requestOnChange(surface, () => {
      const gain = scenario.tree.parameter("source", "gain")
      return scenario.setGain(Number(gain.value) + 1)
    }),
  })
  Button(surface, contentX + buttonW + buttonGap, toolbarY, buttonW, TOOLBAR_HEIGHT, {
    children: "Добавить Parameter",
    onClick: () => requestOnChange(surface, scenario.addParameter),
  })
  Button(surface, contentX + (buttonW + buttonGap) * 2, toolbarY, buttonW, TOOLBAR_HEIGHT, {
    children: "Удалить Parameter",
    onClick: () => requestOnChange(surface, scenario.removeParameter),
  })

  const statusY = toolbarY + TOOLBAR_HEIGHT + 8
  Typography(surface, contentX, statusY, contentW, STATUS_HEIGHT, {
    children: coreRuntimeStatus(scenario),
    color: "green",
    variant: "caption",
  })

  const panelsY = statusY + STATUS_HEIGHT + 6
  const panelsH = Math.max(84, frame.y + frame.h - panelsY - PAGE_PADDING)
  const panels = [
    {key: "core-snapshot", title: "snapshot()", value: scenario.snapshot()},
    {key: "core-document", title: "document()", value: scenario.document()},
    {key: "core-events", title: "События", value: scenario.changes},
  ] as const

  if (contentW >= 720) {
    const panelW = (contentW - PANEL_GAP * 2) / 3
    panels.forEach((panel, index) => drawDataPanel(
      surface,
      contentX + index * (panelW + PANEL_GAP),
      panelsY,
      panelW,
      panelsH,
      panel,
    ))
    return
  }

  const panelH = Math.max(72, (panelsH - PANEL_GAP * 2) / 3)
  panels.forEach((panel, index) => drawDataPanel(
    surface,
    contentX,
    panelsY + index * (panelH + PANEL_GAP),
    contentW,
    panelH,
    panel,
  ))
}

function drawDataPanel(
  surface: UiSurface,
  x: number,
  y: number,
  w: number,
  h: number,
  panel: Readonly<{key: string; title: string; value: unknown}>,
): void {
  const source = JSON.stringify(panel.value, null, 2)
  const content = `${panel.title}\n\n${source}`
  const contentHeight = Math.max(h, content.split("\n").length * 15 + 28)
  Pane(surface, x, y, w, h, {
    key: panel.key,
    appearance: "panel",
    children: content,
    scrollContentHeight: contentHeight,
    style: {
      color: "text",
      fontSize: 10,
      lineHeight: 1.45,
      overflowY: "auto",
      padding: 14,
    },
  })
}

function requestOnChange(surface: UiSurface, change: () => boolean): void {
  if (change()) surface.requestRender()
}

function coreRuntimeStatus(scenario: CoreRuntimeScenario): string {
  const parameterCount = scenario.tree.nodes[0]?.parameters?.length ?? 0
  return `revision ${scenario.tree.revision} · topology ${scenario.tree.topologyRevision} · Parameters ${parameterCount}`
}

function coreRuntimeSource(): StorybookStorySource {
  const typescript = [
    'import {NodeTree, type NodeTreeChange} from "@nodes/core/node-tree"',
    'import {Parameter, type NodeJsonValue} from "@nodes/core/parameter"',
    "",
    'type RuntimeParameter = Parameter<NodeJsonValue, Readonly<{label: string}>>',
    "",
    'const gain = parameter("gain", "Gain", 1)',
    'const value = parameter("value", "Value", 0.5)',
    "const tree = new NodeTree<RuntimeParameter>({",
    "  nodes: [{",
    '    id: "source",',
    "    parameters: [gain, value],",
    '    sockets: [{id: "value-out", direction: "output", parameterId: "value"}],',
    '    metadata: {title: "Source"},',
    "  }],",
    "})",
    "",
    "const changes: NodeTreeChange[] = []",
    "tree.subscribe((change) => { changes.push(change) })",
    "",
    "export function incrementGain() {",
    "  gain.set(Number(gain.value) + 1)",
    "}",
    "",
    "export function addParameter() {",
    '  if (tree.nodes[0]?.parameters?.some(({id}) => id === "extra")) return false',
    "  const definition = tree.definition()",
    '  const extra = parameter("extra", "Extra", 0)',
    "  return tree.reconcile({",
    "    expectedRevision: tree.revision,",
    "    definition: {",
    "      ...definition,",
    "      nodes: definition.nodes.map((node) => node.id === \"source\"",
    "        ? {...node, parameters: [...(node.parameters ?? []), extra]}",
    "        : node),",
    "    },",
    "  }).changed",
    "}",
    "",
    "export function removeParameter() {",
    '  if (!tree.nodes[0]?.parameters?.some(({id}) => id === "extra")) return false',
    "  const definition = tree.definition()",
    "  return tree.reconcile({",
    "    expectedRevision: tree.revision,",
    "    definition: {",
    "      ...definition,",
    "      nodes: definition.nodes.map((node) => node.id === \"source\"",
    '        ? {...node, parameters: (node.parameters ?? []).filter(({id}) => id !== "extra")}',
    "        : node),",
    "    },",
    "  }).changed",
    "}",
    "",
    "export function inspectCore() {",
    "  return {snapshot: tree.snapshot(), document: tree.document(), changes}",
    "}",
    "",
    "function parameter(id: string, label: string, value: number): RuntimeParameter {",
    "  return new Parameter<NodeJsonValue, Readonly<{label: string}>>(id, value, {label})",
    "}",
  ].join("\n")
  return Object.freeze({
    html: `<node-tree-runtime class="core-runtime">
  <nav class="core-runtime__toolbar" aria-label="NodeTree actions"></nav>
  <output class="core-runtime__status"></output>
  <section class="core-runtime__panels"></section>
</node-tree-runtime>`,
    css: `.core-runtime {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  gap: 8px;
  padding: 72px 22px 22px;
}

.core-runtime__toolbar {
  display: flex;
  flex: 0 0 32px;
  gap: 8px;
}

.core-runtime__status {
  flex: 0 0 24px;
}

.core-runtime__panels {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  overflow: auto;
}`,
    typescript,
  })
}
