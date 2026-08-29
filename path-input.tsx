import type {Event} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"
import {IconButton} from "./button.tsx"
import {uiIcons} from "./icons.ts"
import {TextField, textFieldCss} from "./text-field.tsx"
import {rgba8ToColor, uiTheme} from "./theme.ts"

export type PathInputDensity = "regular" | "compact"

export type PathInputProps = Readonly<{
  value: string
  placeholder?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: PathInputDensity | undefined
  title?: string | undefined
  browseTitle?: string | undefined
  style?: StyleValue
  onInput?: ((value: string, event: Event) => void) | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
  onBrowse?: ((event: Event) => void) | undefined
}>

export const pathInputStyles = defineStyles("@ui/components/path-input", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    minWidth: 0,
    width: 320,
    height: 28,
    gap: 0,
    padding: 0,
    overflow: "clip",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    background: "rgb(29 29 29)",
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`
  },
  compactRoot: {width: 220, height: 24},
  input: {
    width: 0,
    minWidth: 0,
    height: 26,
    flexGrow: 1,
    padding: "3px 7px",
    border: "none",
    borderRight: "1px solid rgb(61 61 61)",
    borderRadius: 0,
    background: "transparent",
    boxShadow: "none",
    color: "rgb(230 230 230)",
    fontSize: 11,
    ":hover": {
      border: "none",
      borderRight: "1px solid rgb(61 61 61)"
    },
    ":focus": {
      border: "none",
      borderRight: "1px solid rgb(61 61 61)",
      background: "rgb(34 34 34)"
    }
  },
  compactInput: {height: 22},
  readOnlyInput: {opacity: 0.5},
  browse: {
    width: 30,
    minWidth: 30,
    height: 26,
    padding: 0,
    border: "none",
    borderRadius: 0,
    background: "rgb(84 84 84)",
    boxShadow: "none",
    fontSize: 12,
    ":hover": {borderColor: "transparent", background: "rgb(101 101 101)"},
    ":active": {borderColor: "transparent", background: "rgb(71 114 179)"},
    ":focus": {borderColor: "transparent", background: "rgb(71 114 179)"}
  },
  compactBrowse: {height: 22},
  hidden: {display: "none"}
})

export const pathInputCss = [
  textFieldCss,
  pathInputStyles.cssText
].join("\n")

export function PathInput(props: PathInputProps) {
  assertPathInputProps(props)
  const density = props.density ?? "regular"
  const locked = props.disabled === true || props.readOnly === true
  const browseUnavailable = props.onBrowse === undefined

  return <div
    title={props.title}
    aria-disabled={String(locked)}
    style={[
      pathInputStyles.root,
      density === "compact" && pathInputStyles.compactRoot,
      props.style
    ]}
  >
    <TextField
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled === true}
      readOnly={props.readOnly === true}
      title={props.title}
      style={[
        pathInputStyles.input,
        density === "compact" && pathInputStyles.compactInput,
        props.readOnly === true && pathInputStyles.readOnlyInput
      ]}
      onInput={props.onInput}
      onChange={props.onChange}
    />
    <IconButton
      label="Browse"
      iconSrc={uiIcons.folder}
      title={props.browseTitle ?? "Browse"}
      disabled={locked || browseUnavailable}
      style={[
        pathInputStyles.browse,
        density === "compact" && pathInputStyles.compactBrowse,
        browseUnavailable && pathInputStyles.hidden
      ]}
      onClick={props.onBrowse}
    />
  </div>
}


function assertPathInputProps(props: PathInputProps): void {
  if (typeof props.value !== "string") throw new TypeError("PathInput value must be a string")
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") {
    throw new Error(`Unknown PathInput density: ${density}`)
  }
}
