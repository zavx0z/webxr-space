import {FieldGroup} from "./field-group.tsx"
import {NumberField} from "./number-field.tsx"

export function FieldGroupFixture(props: Readonly<{reverse?: boolean | undefined}>) {
  const keys = props.reverse === true ? ["y", "x"] : ["x", "y"]
  return <FieldGroup>{keys.map(key => <NumberField
    key={key}
    label={key.toUpperCase()}
    value={key === "x" ? 1 : 2}
  />)}</FieldGroup>
}
