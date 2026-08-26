import type {
  StorybookStoryIndexItem,
  StorybookStoryModule,
  StorybookStoryRegistry,
} from "@zavx0z/storybook/stories"
import {defineStorybookStoryModule} from "@zavx0z/storybook/stories"
import {StatusChip} from "@ui/components/badge"
import {IconButton} from "@ui/components/button"
import {
  ListDivider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from "@ui/components/list"
import {PaneTitle, Paper} from "@ui/components/pane"
import {control} from "@ui/elements/control"
import {uiIcons} from "@ui/elements/icons"
import {li, ol} from "@ui/elements/list"
import {h1, h2, h3, h4, h5, h6, hr, p} from "@ui/elements/text"
import {ELEMENT_STORIES} from "../projects/ui/packages/elements/storybook/stories.ts"
import {COMPONENT_STORIES} from "../projects/ui/packages/components/storybook/stories.ts"
import type {UiComponentGraph, UiComponentGraphNode} from "../scripts/ui-component-graph.ts"

export type UiGraphStoryMatchKind = "api-name"

export type UiGraphStoryMatch = Readonly<{
  route: string
  kind: UiGraphStoryMatchKind
  index: StorybookStoryIndexItem
  load(): Promise<StorybookStoryModule>
}>

export type UiGraphDirectMatch = Readonly<{
  route: string
  kind: "direct-render"
}>

export type UiGraphPreviewMatch = UiGraphStoryMatch | UiGraphDirectMatch

export type UiGraphStoryPreview = Readonly<{
  match: UiGraphPreviewMatch | null
  module: StorybookStoryModule | null
  error: string | null
}>

type RegistryOwner = Readonly<{
  layer: UiComponentGraphNode["layer"]
  registry: StorybookStoryRegistry
}>

const REGISTRIES = Object.freeze([
  {layer: "element", registry: ELEMENT_STORIES},
  {layer: "component", registry: COMPONENT_STORIES},
] as const satisfies readonly RegistryOwner[])

const DIRECT_MODULES: ReadonlyMap<string, StorybookStoryModule> = new Map([
  ["@ui/components/badge#StatusChip", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      const width = Math.min(150, frame.w - 24)
      StatusChip(surface, frame.x + (frame.w - width) / 2, frame.y + (frame.h - 28) / 2, width, 28, {
        label: "Runtime ready",
        indicator: true,
        tone: "live",
      })
    },
    source: () => 'import {StatusChip} from "@ui/components/badge"\n\nStatusChip(surface, x, y, 150, 28, {label: "Runtime ready", indicator: true, tone: "live"})',
  })],
  ["@ui/components/button#IconButton", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      const size = Math.min(40, frame.w - 24, frame.h - 24)
      IconButton(surface, frame.x + (frame.w - size) / 2, frame.y + (frame.h - size) / 2, size, size, {
        label: "Apply",
        iconSrc: uiIcons.apply,
      })
    },
    source: () => 'import {IconButton} from "@ui/components/button"\nimport {uiIcons} from "@ui/elements/icons"\n\nIconButton(surface, x, y, 40, 40, {label: "Apply", iconSrc: uiIcons.apply})',
  })],
  ["@ui/components/list#ListDivider", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      ListDivider(surface, frame.x + 16, frame.y + frame.h / 2, frame.w - 32, {middle: true})
    },
    source: () => 'import {ListDivider} from "@ui/components/list"\n\nListDivider(surface, x, y, width, {middle: true})',
  })],
  ["@ui/components/list#ListItem", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      ListItem(surface, frame.x + 12, frame.y + (frame.h - 58) / 2, frame.w - 24, 58, {
        primary: "List item",
        secondary: "Secondary text",
        icon: "1",
      })
    },
    source: () => 'import {ListItem} from "@ui/components/list"\n\nListItem(surface, x, y, width, 58, {primary: "List item", secondary: "Secondary text", icon: "1"})',
  })],
  ["@ui/components/list#ListItemButton", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      ListItemButton(surface, frame.x + 12, frame.y + (frame.h - 52) / 2, frame.w - 24, 52, {
        primary: "Clickable item",
        onClick() {},
      })
    },
    source: () => 'import {ListItemButton} from "@ui/components/list"\n\nListItemButton(surface, x, y, width, 52, {primary: "Clickable item", onClick() {}})',
  })],
  ["@ui/components/list#ListItemIcon", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      ListItemIcon(surface, frame.x + (frame.w - 44) / 2, frame.y + (frame.h - 44) / 2, 44, 44, {
        children: "A",
      })
    },
    source: () => 'import {ListItemIcon} from "@ui/components/list"\n\nListItemIcon(surface, x, y, 44, 44, {children: "A"})',
  })],
  ["@ui/components/list#ListItemText", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      ListItemText(surface, frame.x + 16, frame.y + (frame.h - 58) / 2, frame.w - 32, 58, {
        primary: "Primary text",
        secondary: "Secondary text",
      })
    },
    source: () => 'import {ListItemText} from "@ui/components/list"\n\nListItemText(surface, x, y, width, 58, {primary: "Primary text", secondary: "Secondary text"})',
  })],
  ["@ui/components/list#ListSubheader", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      ListSubheader(surface, frame.x + 12, frame.y + (frame.h - 34) / 2, frame.w - 24, 34, {
        children: "Subheader",
      })
    },
    source: () => 'import {ListSubheader} from "@ui/components/list"\n\nListSubheader(surface, x, y, width, 34, {children: "Subheader"})',
  })],
  ["@ui/components/pane#PaneTitle", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      PaneTitle(surface, frame.x + 12, frame.y + 12, frame.w - 24, frame.h - 24, "Pane title")
    },
    source: () => 'import {PaneTitle} from "@ui/components/pane"\n\nPaneTitle(surface, x, y, width, height, "Pane title")',
  })],
  ["@ui/components/pane#Paper", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      Paper(surface, frame.x + 12, frame.y + 12, frame.w - 24, frame.h - 24, {
        variant: "filled",
        children: "Paper",
      })
    },
    source: () => 'import {Paper} from "@ui/components/pane"\n\nPaper(surface, x, y, width, height, {variant: "filled", children: "Paper"})',
  })],
  ["@ui/elements/control#control", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      const height = Math.min(28, frame.h - 20)
      control(surface, frame.x + 12, frame.y + (frame.h - height) / 2, frame.w - 24, height, {
        children: "Dense control",
      })
    },
    source: () => 'import {control} from "@ui/elements/control"\n\ncontrol(surface, x, y, width, 28, {children: "Dense control"})',
  })],
  ...([h1, h2, h3, h4, h5, h6, p] as const).map((render, index) => {
    const name = ["h1", "h2", "h3", "h4", "h5", "h6", "p"][index]!
    return [`@ui/elements/text#${name}`, defineStorybookStoryModule({
      defaultArgs: {},
      render(surface, _args, frame) {
        render(surface, frame.x + 12, frame.y + 12, frame.w - 24, frame.h - 24, {
          children: name === "p" ? "Обычный абзац UI" : `Заголовок ${name.toUpperCase()}`,
        })
      },
      source: () => `import {${name}} from "@ui/elements/text"\n\n${name}(surface, x, y, width, height, {children: "${name}"})`,
    })] as const
  }),
  ["@ui/elements/text#hr", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      hr(surface, frame.x + 14, frame.y + frame.h / 2, frame.w - 28)
    },
    source: () => 'import {hr} from "@ui/elements/text"\n\nhr(surface, x, y, width)',
  })],
  ["@ui/elements/list#ol", defineStorybookStoryModule({
    defaultArgs: {},
    render(surface, _args, frame) {
      ol(surface, frame.x + 12, frame.y + 12, frame.w - 24, frame.h - 24, {
        children(context) {
          li(surface, context.itemX, context.itemY, context.itemWidth, context.itemHeight, {
            children: "1. Ordered item",
          })
        },
      })
    },
    source: () => 'import {li, ol} from "@ui/elements/list"\n\nol(surface, x, y, width, height, {children(ctx) { li(surface, ctx.itemX, ctx.itemY, ctx.itemWidth, ctx.itemHeight, {children: "1. Ordered item"}) }})',
  })],
])

export function matchUiGraphStory(node: UiComponentGraphNode): UiGraphStoryMatch | null {
  const candidates = REGISTRIES.flatMap((owner) => owner.registry.index.map((index, order) => ({
    owner,
    index,
    order,
    score: (owner.layer === node.layer ? 500 : 0) +
      (index.route === owner.registry.representative ? 1_000 : 0),
  }))).filter(({index}) => exactApiMatch(node, index))
  candidates.sort((left, right) => right.score - left.score || left.order - right.order)
  const selected = candidates[0]
  if (selected === undefined) return null
  return Object.freeze({
    route: selected.index.route,
    kind: "api-name",
    index: selected.index,
    load: () => selected.owner.registry.load(selected.index.route),
  })
}

export async function loadUiGraphStories(
  graph: UiComponentGraph,
): Promise<ReadonlyMap<string, UiGraphStoryPreview>> {
  const entries: Array<readonly [string, UiGraphStoryPreview]> = await Promise.all(graph.nodes.map(async (node) => {
    const match = matchUiGraphStory(node)
    if (match === null) {
      const module = DIRECT_MODULES.get(node.id) ?? null
      const directMatch: UiGraphDirectMatch | null = module === null
        ? null
        : Object.freeze({route: `direct:${node.id}`, kind: "direct-render"})
      return [node.id, Object.freeze({match: directMatch, module, error: null})] as const
    }
    try {
      const module = await match.load()
      return [node.id, Object.freeze({match, module, error: null})] as const
    } catch (error) {
      return [node.id, Object.freeze({match, module: null, error: errorText(error)})] as const
    }
  }))
  return new Map<string, UiGraphStoryPreview>(entries)
}

function exactApiMatch(node: UiComponentGraphNode, story: StorybookStoryIndexItem): boolean {
  return story.apiName === node.exportName || story.apiName.split(/[\s/]+/).includes(node.exportName)
}

function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error)
}
