import {createRoot} from "@zavx0z/react"
import {OutsideCounter} from "../outside-counter.tsx"

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<OutsideCounter />)
