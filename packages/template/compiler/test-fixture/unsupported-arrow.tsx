import {createRoot} from "@zavx0z/react"

const ArrowComponent = () => <div>Unsupported</div>
declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<ArrowComponent />)
