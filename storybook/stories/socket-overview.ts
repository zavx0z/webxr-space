import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {flexColumn, flexRow} from "@layout/core/flex"
import type {UiSurfaceRect} from "@layout/core/runtime"
import type {UiSurface} from "@layout/core/surface"
import {
  SOCKET_KINDS,
  socketPreset,
  socketRenderer,
  type SocketKind,
  type SocketView,
} from "@nodes/ui/node"
import {defineStorybookStoryModule, type StorybookStoryModule} from "@zavx0z/storybook/stories"
import {
  NODE_SOCKET_DIRECTION_LABELS,
  NODE_SOCKET_DIRECTIONS,
  type NodeSocketDirection,
  type NodeSocketKind,
} from "../socket-catalog.ts"
import {socketOverviewStorySource} from "../story-source.ts"

type SocketOverviewEntry = Readonly<{
  kind: SocketKind
  direction: NodeSocketDirection
  label: string
}>

export function createSocketOverviewStory(kind: NodeSocketKind | null = null): StorybookStoryModule {
  if (kind !== null && !SOCKET_KINDS.includes(kind)) throw new Error(`Unknown Socket overview kind: ${kind}`)
  const entries = socketOverviewEntries(kind)
  return defineStorybookStoryModule({
    defaultArgs: {},
    controls: [],
    render(surface, _args, frame) {
      renderSocketOverview(surface, frame, entries, kind)
    },
    source() {
      const typescript = kind === null ? allSocketTypesSource() : socketDirectionsSource(kind)
      return socketOverviewStorySource(kind, typescript)
    },
  })
}

export function socketOverviewEntries(kind: NodeSocketKind | null = null): readonly SocketOverviewEntry[] {
  if (kind === null) return SOCKET_KINDS.map((socketKind) => ({
    kind: socketKind,
    direction: "input",
    label: socketPreset(socketKind).label,
  }))
  return NODE_SOCKET_DIRECTIONS.map((direction) => ({
    kind,
    direction,
    label: NODE_SOCKET_DIRECTION_LABELS[direction],
  }))
}

function renderSocketOverview(
  surface: UiSurface,
  frame: UiSurfaceRect,
  entries: readonly SocketOverviewEntry[],
  kind: NodeSocketKind | null,
): void {
  const columns = kind === null
    ? frame.w < 620 ? 2 : frame.w < 980 ? 3 : 5
    : frame.w < 720 ? 1 : 3
  const rows = chunk(entries, columns)
  const summaryH = 30
  const gridY = frame.y + summaryH
  const gridH = Math.max(0, frame.h - summaryH)
  Typography(surface, frame.x, frame.y, frame.w, 22, {
    children: kind === null
      ? `${SOCKET_KINDS.length} public Socket types`
      : `${socketPreset(kind).label}: вход, выход и двунаправленный`,
    variant: "caption",
    color: "muted",
  })
  flexColumn({
    x: frame.x,
    y: gridY,
    w: frame.w,
    h: gridH,
    gap: 8,
    items: rows.map((row) => ({
      height: "1fr" as const,
      draw: (rowX: number, rowY: number, rowW: number, rowH: number) => flexRow({
        x: rowX,
        y: rowY,
        w: rowW,
        h: rowH,
        gap: 8,
        items: Array.from({length: columns}, (_, column) => {
          const entry = row[column]
          if (entry === undefined) return {width: "1fr" as const, height: rowH, draw: () => {}}
          return {
            width: "1fr" as const,
            height: rowH,
            draw: (x: number, y: number, w: number, h: number) => drawSocketCell(surface, entry, x, y, w, h),
          }
        }),
      }),
    })),
  })
}

function drawSocketCell(
  surface: UiSurface,
  entry: SocketOverviewEntry,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  Pane(surface, x, y, w, h, {variant: "outlined", style: {borderRadius: 10}})
  const socket: SocketView = {
    id: `overview-${entry.kind}-${entry.direction}`,
    label: entry.label,
    direction: entry.direction,
    socketType: entry.kind,
  }
  const socketSize = Math.min(24, Math.max(14, h * 0.22))
  const socketX = x + 16 + socketSize / 2
  const socketY = y + h / 2
  socketRenderer.render({
    host: surface,
    entry: {
      socket,
      side: entry.direction === "output" ? "right" : "left",
      center: {x: socketX, y: socketY},
    },
    selected: false,
    nodeId: "socket-overview",
  })
  Typography(surface, x + 28 + socketSize, y + (h - 22) / 2, Math.max(0, w - 44 - socketSize), 22, {
    children: entry.label,
    variant: "caption",
  })
}

function allSocketTypesSource(): string {
  return [
    "import {SOCKET_KINDS, socketPreset, socketRenderer} from \"@nodes/ui/node\"",
    "",
    "for (const kind of SOCKET_KINDS) {",
    "  const preset = socketPreset(kind)",
    "  socketRenderer.render({",
    "    host: surface,",
    "    entry: {",
    "      socket: {id: `overview-${kind}`, label: preset.label, direction: \"input\", socketType: kind},",
    "      side: \"left\",",
    "      center: positionFor(kind),",
    "    },",
    "    selected: false,",
    "    nodeId: \"socket-overview\",",
    "  })",
    "}",
  ].join("\n")
}

function socketDirectionsSource(kind: NodeSocketKind): string {
  return [
    "import {socketPreset, socketRenderer} from \"@nodes/ui/node\"",
    "",
    `const kind = ${JSON.stringify(kind)} as const`,
    "const preset = socketPreset(kind)",
    "for (const direction of [\"input\", \"output\", \"bidirectional\"] as const) {",
    "  socketRenderer.render({",
    "    host: surface,",
    "    entry: {",
    "      socket: {id: `${kind}-${direction}`, label: preset.label, direction, socketType: kind},",
    "      side: direction === \"output\" ? \"right\" : \"left\",",
    "      center: positionFor(direction),",
    "    },",
    "    selected: false,",
    "    nodeId: \"socket-overview\",",
    "  })",
    "}",
  ].join("\n")
}

function chunk<T>(values: readonly T[], size: number): readonly (readonly T[])[] {
  const rows: T[][] = []
  for (let index = 0; index < values.length; index += size) rows.push(values.slice(index, index + size))
  return rows
}
