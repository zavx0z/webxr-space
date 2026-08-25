import {IntegerInput} from "@ui/components/integer-input"
import {uiShapeMetrics} from "@ui/elements/shape"
import {
  defineStorybookStoryModule,
  type StorybookStoryArgs,
  type StorybookStoryModule,
} from "@zavx0z/storybook/stories"
import type {IntegerInputStoryVariant} from "../stories.ts"

type IntegerInputStoryArgs = StorybookStoryArgs & Readonly<{
  label: string
  value: number
  disabled: boolean
  "read-only": boolean
}>

export function createIntegerInputStory(variant: IntegerInputStoryVariant): StorybookStoryModule {
  const initial = integerStoryArgs(variant)
  return defineStorybookStoryModule<IntegerInputStoryArgs>({
    defaultArgs: initial,
    controls: [
      {key: "label", label: "Подпись", group: "Основные", kind: "text", interactive: false},
      {key: "value", label: "Значение", group: "Основные", kind: "number", interactive: false},
      {key: "disabled", label: "Недоступно", group: "Состояние", kind: "boolean"},
      {key: "read-only", label: "Только чтение", group: "Состояние", kind: "boolean"},
    ],
    render(surface, args, frame) {
      const props: Parameters<typeof IntegerInput>[5] = {
        key: "components-story-integer",
        value: args.value,
        min: 0,
        max: 100,
        disabled: args.disabled,
        readOnly: args["read-only"],
        onChange: (value) => globalThis.__componentsStoryControlBridge?.("value", value),
        ...(args.label.length > 0 ? {label: args.label} : {}),
      }
      IntegerInput(
        surface,
        frame.x + (frame.w - 146) / 2,
        frame.y + frame.h * 0.56 - uiShapeMetrics.rowHeight / 2,
        146,
        uiShapeMetrics.rowHeight,
        props,
      )
    },
    source(args) {
      return [
        'import {IntegerInput} from "@ui/components/integer-input"',
        "",
        "IntegerInput(surface, x, y, 146, 24, {",
        '  key: "iterations",',
        ...(args.label.length > 0 ? [`  label: ${JSON.stringify(args.label)},`] : []),
        `  value: ${Math.round(args.value)},`,
        "  min: 0,",
        "  max: 100,",
        ...(args.disabled ? ["  disabled: true,"] : []),
        ...(args["read-only"] ? ["  readOnly: true,"] : []),
        "  onChange: setIterations,",
        "})",
      ].join("\n")
    },
  })
}

function integerStoryArgs(variant: IntegerInputStoryVariant): IntegerInputStoryArgs {
  return {
    label: variant === "value" ? "" : "Iterations",
    value: 3,
    disabled: variant === "disabled",
    "read-only": variant === "readonly",
  }
}
