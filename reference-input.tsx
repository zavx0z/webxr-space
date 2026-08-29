import type {Event} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"
import {Button, IconButton} from "./button.tsx"
import {uiIcons} from "./icons.ts"
import {rgba8ToColor, uiTheme} from "./theme.ts"

export type ReferenceInputValue = Readonly<{
  id: string
  label: string
  kind?: string | undefined
}>
export type ReferenceInputDensity = "regular" | "compact"

export type ReferenceInputProps = Readonly<{
  value: ReferenceInputValue | null
  placeholder?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: ReferenceInputDensity | undefined
  style?: StyleValue
  onActivate?: ((event: Event) => void) | undefined
  onPick?: ((event: Event) => void) | undefined
  onClear?: ((event: Event) => void) | undefined
}>

export const referenceInputStyles = defineStyles("@ui/components/reference-input", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    minWidth: 0,
    width: 260,
    height: 28,
    gap: 0,
    padding: 0,
    overflow: "clip",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    background: "rgb(84 84 84)",
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`
  },
  compactRoot: {width: 190, height: 24},
  button: {
    height: 26,
    padding: "3px 7px",
    border: "none",
    borderRight: "1px solid rgb(61 61 61)",
    borderRadius: 0,
    background: "transparent",
    boxShadow: "none",
    color: "rgb(230 230 230)",
    fontSize: 11,
    ":hover": {borderColor: "transparent", background: "rgb(101 101 101)"},
    ":active": {borderColor: "transparent", background: "rgb(71 114 179)"},
    ":focus": {borderColor: "transparent", background: "rgb(71 114 179)"}
  },
  value: {
    width: 0,
    minWidth: 0,
    flexGrow: 1,
    justifyContent: "flex-start"
  },
  action: {width: 28, minWidth: 28, justifyContent: "center"},
  lastAction: {borderRight: 0},
  compactButton: {height: 22},
  hidden: {display: "none"}
})

export const referenceInputCss = [
  referenceInputStyles.cssText
].join("\n")

export function ReferenceInput(props: ReferenceInputProps) {
  assertReferenceInputProps(props)
  const density = props.density ?? "regular"
  const locked = props.disabled === true || props.readOnly === true
  const pickUnavailable = props.onPick === undefined
  const clearUnavailable = props.value === null || props.onClear === undefined
  const label = props.value?.label ?? props.placeholder ?? "Not selected"

  return <div
    title={props.title ?? props.value?.kind}
    aria-disabled={String(locked)}
    style={[
      referenceInputStyles.root,
      density === "compact" && referenceInputStyles.compactRoot,
      props.style
    ]}
  >
    <Button
      label={label}
      variant="text"
      title={props.value?.kind ?? props.title}
      disabled={locked || props.onActivate === undefined}
      style={[
        referenceInputStyles.button,
        referenceInputStyles.value,
        density === "compact" && referenceInputStyles.compactButton
      ]}
      onClick={props.onActivate}
    />
    <IconButton
      label="Choose reference"
      iconSrc={uiIcons.picker}
      title="Choose reference"
      disabled={locked || pickUnavailable}
      style={[
        referenceInputStyles.button,
        referenceInputStyles.action,
        density === "compact" && referenceInputStyles.compactButton,
        pickUnavailable && referenceInputStyles.hidden
      ]}
      onClick={props.onPick}
    />
    <IconButton
      label="Clear reference"
      iconSrc={uiIcons.clear}
      title="Clear reference"
      disabled={locked || clearUnavailable}
      style={[
        referenceInputStyles.button,
        referenceInputStyles.action,
        referenceInputStyles.lastAction,
        density === "compact" && referenceInputStyles.compactButton,
        clearUnavailable && referenceInputStyles.hidden
      ]}
      onClick={props.onClear}
    />
  </div>
}


function assertReferenceInputProps(props: ReferenceInputProps): void {
  if (props.value !== null) {
    if (typeof props.value.id !== "string" || props.value.id.length === 0) {
      throw new TypeError("ReferenceInput value id must not be empty")
    }
    if (typeof props.value.label !== "string") {
      throw new TypeError("ReferenceInput value label must be a string")
    }
  }
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") {
    throw new Error(`Unknown ReferenceInput density: ${density}`)
  }
}
