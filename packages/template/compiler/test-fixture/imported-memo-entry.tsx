import {createRoot} from "@zavx0z/react"
import {MemoCounter} from "./memo-counter.tsx"

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<MemoCounter label="Memo" />)
