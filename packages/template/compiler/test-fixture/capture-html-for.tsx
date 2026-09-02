import {createRoot} from "@zavx0z/react"

function Form({id, onClick}: Readonly<{id: string; onClick(): void}>) {
  return <label htmlFor={id} onClickCapture={onClick}>Label</label>
}

declare const container: Parameters<typeof createRoot>[0]
createRoot(container).render(<Form id="field" onClick={() => {}} />)
