import {useState} from "@zavx0z/react"
import {ColorField, type ColorFieldValue} from "./color-field.tsx"

export function ColorFieldFixture() {
  const [value, setValue] = useState<ColorFieldValue>({r: 1, g: 0, b: 0, a: 1})
  const [open, setOpen] = useState(false)
  return <ColorField label="Color" value={value} open={open} onInput={setValue} onOpenChange={setOpen} />
}
