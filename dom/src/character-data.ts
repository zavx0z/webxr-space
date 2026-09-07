import type {Document} from "./document.ts"
import type {CharacterDataMutation} from "./mutation.ts"
import {Node} from "./node.ts"
import type {NodeOrString} from "./node.ts"
import {domError} from "./internal/errors.ts"
import {updateDocumentRanges} from "./internal/live-ranges.ts"
import {invalidateTextPositionIndexes} from "./internal/text-position-index.ts"

export class CharacterData extends Node {
  private value: string

  constructor(ownerDocument: Document, data = "", nodeType = Node.TEXT_NODE, nodeName = "#text") {
    super(ownerDocument, nodeType, nodeName)
    this.value = String(data)
  }

  get data(): string {
    return this.value
  }

  set data(value: string) {
    this.replaceData(0, this.length, String(value))
  }

  replaceData(offset: number, count: number, data: string): void {
    offset = unsignedOffset(offset)
    count = unsignedOffset(count)
    if (offset > this.length) throw domError("IndexSizeError", "CharacterData offset exceeds its length")
    const removed = Math.min(count, this.length - offset)
    const replacement = String(data)
    const next = this.value.slice(0, offset) + replacement + this.value.slice(offset + removed)
    const oldValue = this.value
    this.value = next
    invalidateTextPositionIndexes(this)
    const document = this.ownerDocument
    updateDocumentRanges(document, {type: "data", node: this, offset, removed, added: replacement.length})
    if (!document || !this.isConnected) return
    const mutation: CharacterDataMutation = Object.freeze({
      type: "characterData",
      target: this,
      oldValue,
      newValue: next
    })
    document.recordMutation(mutation)
  }

  get length(): number {
    return this.value.length
  }

  override get nodeValue(): string {
    return this.value
  }

  override set nodeValue(value: string | null) {
    this.data = value ?? ""
  }

  override get textContent(): string {
    return this.value
  }

  override set textContent(value: string | null) {
    this.data = value ?? ""
  }

  appendData(data: string): void {
    this.replaceData(this.length, 0, data)
  }

  insertData(offset: number, data: string): void {
    this.replaceData(offset, 0, data)
  }

  deleteData(offset: number, count: number): void {
    this.replaceData(offset, count, "")
  }

  substringData(offset: number, count: number): string {
    offset = unsignedOffset(offset)
    count = unsignedOffset(count)
    if (offset > this.length) throw domError("IndexSizeError", "CharacterData offset exceeds its length")
    return this.value.slice(offset, offset + count)
  }

  before(...nodes: NodeOrString[]): void {
    this.beforeNodes(...nodes)
  }

  after(...nodes: NodeOrString[]): void {
    this.afterNodes(...nodes)
  }

  replaceWith(...nodes: NodeOrString[]): void {
    this.replaceWithNodes(...nodes)
  }

  remove(): void {
    this.removeNode()
  }
}

function unsignedOffset(value: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.trunc(numeric) >>> 0 : 0
}
