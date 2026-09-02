import {Typography, type TypographyProps} from "./typography.tsx"

export type TypographyFixtureProps = TypographyProps

export function TypographyFixture(props: TypographyFixtureProps) {
  return <Typography text={props.text} variant={props.variant} title={props.title} style={props.style} />
}
