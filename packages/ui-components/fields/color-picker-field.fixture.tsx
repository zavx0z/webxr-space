import {useState} from "@zavx0z/react"
import {ColorPickerField, type ColorPickerFieldValue} from "./color-picker-field.tsx"

export function ColorPickerFieldFixture() {
  const [value, setValue] = useState<ColorPickerFieldValue>({r: 0.2, g: 0.4, b: 0.8, a: 1})
  return <ColorPickerField label="Color" value={value} onInput={setValue} />
}
