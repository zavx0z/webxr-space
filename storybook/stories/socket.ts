import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {
  SOCKET_SHAPES,
  socketPreset,
  socketRenderer,
  type SocketView,
  type SocketViewShape,
} from "@nodes/ui/node"
import {
  defineStorybookStoryModule,
  type StorybookStoryArgs,
  type StorybookStoryModule,
} from "@zavx0z/storybook/stories"
import type {NodeSocketDirection, NodeSocketKind} from "../socket-catalog.ts"
import {socketStorySource} from "../story-source.ts"

type SocketStoryArgs = StorybookStoryArgs & Readonly<{
  kind: NodeSocketKind
  direction: NodeSocketDirection
  shape: SocketViewShape
  selected: boolean
}>

const SHAPE_LABELS: Readonly<Record<SocketViewShape, string>> = Object.freeze({
  circle: "Круг",
  square: "Квадрат",
  diamond: "Ромб",
  "circle-dot": "Круг с точкой",
  "square-dot": "Квадрат с точкой",
  "diamond-dot": "Ромб с точкой",
  line: "Линия",
  "volume-grid": "Объёмная сетка",
})

export function createSocketStory(options: Readonly<{
  kind: NodeSocketKind
  direction: NodeSocketDirection
}>): StorybookStoryModule {
  const preset = socketPreset(options.kind)
  return defineStorybookStoryModule<SocketStoryArgs>({
    defaultArgs: {
      kind: options.kind,
      direction: options.direction,
      shape: preset.shape,
      selected: false,
    },
    controls: [
      {
        key: "shape",
        label: "Форма",
        group: "Внешний вид",
        kind: "select",
        options: SOCKET_SHAPES.map((shape) => ({value: shape, label: SHAPE_LABELS[shape]})),
      },
      {
        key: "selected",
        label: "Выбран",
        group: "Состояние",
        kind: "boolean",
      },
    ],
    render(surface, args, frame) {
      const cardW = Math.min(520, Math.max(280, frame.w * 0.58))
      const cardH = Math.min(260, Math.max(190, frame.h * 0.36))
      const cardX = frame.x + (frame.w - cardW) / 2
      const cardY = frame.y + (frame.h - cardH) / 2 + 24
      Pane(surface, cardX, cardY, cardW, cardH, {variant: "outlined", style: {borderRadius: 18}})
      Typography(surface, cardX + 28, cardY + 24, cardW - 56, 32, {
        children: preset.label,
        variant: "title",
        style: {textAlign: "center"},
      })
      Typography(surface, cardX + 28, cardY + 62, cardW - 56, 24, {
        children: `${args.kind} · ${args.direction} · ${args.shape}`,
        variant: "caption",
        color: "muted",
        style: {textAlign: "center"},
      })
      const socket: SocketView = {
        id: `story-${args.kind}-${args.direction}`,
        label: preset.label,
        direction: args.direction,
        socketType: args.kind,
        shape: args.shape,
      }
      socketRenderer.render({
        host: surface,
        entry: {
          socket,
          side: args.direction === "output" ? "right" : "left",
          center: {x: cardX + cardW / 2, y: cardY + cardH * 0.58},
        },
        selected: args.selected,
        nodeId: "socket-story",
      })
      Typography(surface, cardX + 28, cardY + cardH * 0.68, cardW - 56, 24, {
        children: args.selected ? "Выбранное состояние" : "Обычное состояние",
        variant: "caption",
        color: args.selected ? "cyan" : "text",
        style: {textAlign: "center"},
      })
    },
    source(args) {
      const side = args.direction === "output" ? "right" : "left"
      const typescript = [
        "import {",
        "  socketRenderer,",
        "  type SocketView,",
        '} from "@nodes/ui/node"',
        "",
        "const socket: SocketView = {",
        `  id: ${JSON.stringify(`story-${args.kind}-${args.direction}`)},`,
        `  label: ${JSON.stringify(preset.label)},`,
        `  direction: ${JSON.stringify(args.direction)},`,
        `  socketType: ${JSON.stringify(args.kind)},`,
        `  shape: ${JSON.stringify(args.shape)},`,
        "}",
        "",
        "socketRenderer.render({",
        "  host: surface,",
        "  entry: {",
        "    socket,",
        `    side: ${JSON.stringify(side)},`,
        "    center: {x, y},",
        "  },",
        `  selected: ${String(args.selected)},`,
        '  nodeId: "socket-story",',
        "})",
      ].join("\n")
      return socketStorySource({
        kind: args.kind,
        direction: args.direction,
        shape: args.shape,
        selected: args.selected,
        typescript,
      })
    },
  })
}
