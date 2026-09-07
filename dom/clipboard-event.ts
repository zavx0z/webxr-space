import {DataTransfer} from "./data-transfer.ts"
import {Event} from "./src/event.ts"
import type {EventInit} from "./src/event.ts"

export type ClipboardEventInit = EventInit & Readonly<{clipboardData?: DataTransfer | null}>

export class ClipboardEvent extends Event {
  readonly clipboardData: DataTransfer | null

  constructor(type: string, init: ClipboardEventInit = {}) {
    super(type, init)
    if (init.clipboardData != null && !(init.clipboardData instanceof DataTransfer)) {
      throw new TypeError("clipboardData must be a semantic DataTransfer")
    }
    this.clipboardData = init.clipboardData ?? null
  }
}
