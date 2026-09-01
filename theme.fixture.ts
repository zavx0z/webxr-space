import {
  acquireDocumentAuthorStyleSheetOwner,
  type Document,
  type DocumentAuthorStyleSheetOwner
} from "@zavx0z/dom"

const productionThemeCss = await Bun.file(new URL("./theme.css", import.meta.url)).text()
const owners = new WeakMap<Document, DocumentAuthorStyleSheetOwner>()

export function installProductionTheme(document: Document): DocumentAuthorStyleSheetOwner {
  const existing = owners.get(document)
  if (existing !== undefined) return existing
  const owner = acquireDocumentAuthorStyleSheetOwner(document)
  owner.replace([{id: "@ui/components/theme.css", cssText: productionThemeCss}])
  owners.set(document, owner)
  return owner
}

export function productionThemeText(): string {
  return productionThemeCss
}
