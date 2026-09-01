import {createDocument as createSemanticDocument} from "@zavx0z/dom"
import {installProductionTheme} from "./theme.fixture.ts"

export function createDocument(): ReturnType<typeof createSemanticDocument> {
  const document = createSemanticDocument()
  installProductionTheme(document)
  return document
}
