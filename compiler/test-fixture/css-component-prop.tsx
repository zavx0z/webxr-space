import {createRoot} from "@zavx0z/react"
import {CssButton} from "./css-style.tsx"

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<CssButton
  hoverColor="red"
  selected={false}
  width={22}
  style={css`
    color: red;
  `}
/>)
