import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {Button} from "./button.tsx"
import {uiIcons} from "./icons.ts"

export const document = createDocument()
export const host = document.createElement("main")
document.appendChild(host)
export const root = createRoot(host)

root.render(<Button
  label="Output"
  iconSrc={uiIcons.run}
  iconPosition="start"
  title="Output"
/>)
