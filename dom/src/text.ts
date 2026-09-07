import {CharacterData} from "./character-data.ts"
import type {Document} from "./document.ts"
import {Node} from "./node.ts"
import {domError} from "./internal/errors.ts"
import {updateDocumentRanges} from "./internal/live-ranges.ts"

export class Text extends CharacterData {
  constructor(ownerDocument: Document, data = "") {
    super(ownerDocument, data, Node.TEXT_NODE, "#text")
  }

  splitText(offset: number): Text {
    offset = Number.isFinite(Number(offset)) ? Math.trunc(Number(offset)) >>> 0 : 0
    if (offset > this.length) throw domError("IndexSizeError", "Text split offset exceeds its length")
    const document = this.ownerDocument!
    return document.transaction(() => {
      const next = document.createTextNode(this.data.slice(offset))
      const parent = this.parentNode
      const index = parent?.childNodes.indexOf(this) ?? 0
      parent?.insertBefore(next, this.nextSibling)
      updateDocumentRanges(document, {type: "split", node: this, next, offset, parent, index})
      this.deleteData(offset, this.length - offset)
      return next
    })
  }
}
