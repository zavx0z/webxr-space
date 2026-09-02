import {createRoot} from "@zavx0z/react"
import type {ImportedCounter} from "./imported-counter.tsx"

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<ImportedCounter label="bad" />)
