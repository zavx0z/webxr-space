import {Field} from "./field-component.tsx"

export function DuplicateIdFieldsFixture() {
  return <div>
    <Field definition={{id: "same", label: "First", kind: "text", value: "A"}} />
    <Field definition={{id: "same", label: "Second", kind: "text", value: "B"}} />
  </div>
}
