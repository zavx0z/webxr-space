import {useState} from "@zavx0z/react"
import {CycleField, type CycleFieldOption} from "./cycle-field.tsx"

const options = Object.freeze([
  {key: "a", value: "a", label: "Alpha", iconSrc: "icon:alpha"},
  {key: "b", value: "b", label: "Beta", iconSrc: "icon:beta"}
] satisfies readonly CycleFieldOption[])

export function CycleFieldFixture() {
  const [value, setValue] = useState("a")
  const [open, setOpen] = useState(false)
  return <CycleField label="Mode" value={value} options={options} open={open} onChange={setValue} onOpenChange={setOpen} />
}
