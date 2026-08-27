import {uiIcons} from "@ui/elements/icons"
import {uiShapeMetrics} from "@ui/elements/shape"
import {type StyleProps} from "@ui/elements/style"
import {type UiSurface} from "@layout/core/surface"
import {flexRow} from "@layout/core/flex"
import {IconButton, type IconButtonProps} from "./button.ts"
import {ControlGroup} from "./control-group.ts"
import {TextField} from "./text-field.ts"

export type PathInputDensity = "regular" | "compact"

export type PathInputProps = {
  key?: string
  value: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  density?: PathInputDensity
  style?: StyleProps
  onChange?(value: string): void
  onBrowse?(): void
}

/** Draws one controlled path string with a separate owner-provided browse action. */
export function PathInput(
  host: UiSurface,
  x: number,
  y: number,
  width: number,
  height: number,
  props: PathInputProps,
): void {
  const disabled = props.disabled === true || props.readOnly === true
  const showBrowse = props.onBrowse !== undefined
  const browseWidth = uiShapeMetrics.iconActionSlot
  const textFieldProps: Parameters<typeof TextField>[5] = {
    value: props.value,
    disabled,
  }
  if (props.key !== undefined) textFieldProps.key = props.key
  if (props.placeholder !== undefined) textFieldProps.placeholder = props.placeholder
  if (!disabled && props.onChange !== undefined) textFieldProps.onChange = (value) => props.onChange!(value)

  ControlGroup(host, x, y, width, height, {
    appearance: "text",
    columns: showBrowse ? ["grow", browseWidth] : 1,
    ...(props.style === undefined ? {} : {style: props.style}),
    children(group) {
      flexRow({
        x,
        y,
        w: width,
        h: height,
        gap: 0,
        alignItems: "stretch",
        items: [
          {width: "grow", height, draw: (slotX, slotY, slotW, slotH) => {
            TextField(host, slotX, slotY, slotW, slotH, {
              ...textFieldProps,
              appearance: group.cell(0, 0).inputAppearance,
              style: group.cellStyle,
            })
          }},
          showBrowse && {width: browseWidth, height, draw: (slotX, slotY, slotW, slotH) => {
            const browseProps: IconButtonProps = {
              label: "Выбрать путь",
              iconSrc: uiIcons.folder,
              disabled,
              action: props.onBrowse!,
              style: group.cellStyle,
              appearance: group.buttonAppearance,
              groupedCell: group.cell(0, 1).groupedCell,
            }
            IconButton(host, slotX, slotY, slotW, slotH, browseProps)
          }},
        ],
      })
    },
  })
}
