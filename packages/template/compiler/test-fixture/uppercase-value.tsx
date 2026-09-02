import {createRoot} from "@zavx0z/react"
import {UserModel} from "./model.ts"

function Valid() {
  return <span>{UserModel.name}</span>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Valid />)
