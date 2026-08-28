import {defineStyles, type FunctionComponent, type StyleValue} from "@zavx0z/react"

export type DividerVariant = "full-width" | "inset" | "middle"

export type DividerProps = Readonly<{
  variant?: DividerVariant | undefined
  title?: string | undefined
  style?: StyleValue
}>

export const dividerStyles = defineStyles("@ui/components/divider", {
  root: {
    boxSizing: "border-box",
    display: "block",
    width: "100%",
    height: 1,
    margin: "4px 0",
    border: 0,
    background: "rgb(22 22 22)"
  },
  inset: {width: "96%", marginLeft: 16},
  middle: {width: "90%", marginLeft: 16}
})

export const dividerComponentCss = dividerStyles.cssText

export function Divider(props: DividerProps) {
  const variant = props.variant ?? "full-width"
  return <hr
    title={props.title}
    style={[
      dividerStyles.root,
      variant === "inset" && dividerStyles.inset,
      variant === "middle" && dividerStyles.middle,
      props.style
    ]}
  />
}

export type DividerComponent = FunctionComponent<DividerProps>

export * from "./divider.ts"
