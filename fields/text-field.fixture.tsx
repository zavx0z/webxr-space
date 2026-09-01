import {TextField} from "./text-field.tsx"

export function DuplicateIdTextFieldsFixture() {
  return <div>
    <TextField id="same" label="First" value="A" />
    <TextField id="same" label="Second" value="B" />
  </div>
}
