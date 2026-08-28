import {defineStyles, type StyleValue} from "@zavx0z/react"

export type TypographyVariant = "title" | "subtitle" | "body" | "caption"

export type TypographyProps = Readonly<{
  text: string
  variant?: TypographyVariant | undefined
  title?: string | undefined
  style?: StyleValue
}>

export const typographyStyles = defineStyles("@ui/components/typography", {
  root: {
    display: "inline",
    color: "rgb(230 230 230)",
    fontSize: 12,
    lineHeight: 16
  },
  title: {fontSize: 15, lineHeight: 20},
  subtitle: {color: "rgb(204 204 204)", fontSize: 13, lineHeight: 18},
  caption: {color: "rgb(153 153 153)", fontSize: 11, lineHeight: 14}
})

export const typographyCss = typographyStyles.cssText

export function Typography(props: TypographyProps) {
  const variant = props.variant ?? "body"
  return <span
    title={props.title}
    style={[
      typographyStyles.root,
      variant === "title" && typographyStyles.title,
      variant === "subtitle" && typographyStyles.subtitle,
      variant === "caption" && typographyStyles.caption,
      props.style
    ]}
  >{props.text}</span>
}
