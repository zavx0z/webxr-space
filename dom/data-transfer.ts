const sealTransfer = Symbol("seal-clipboard-data-transfer")

/** String-data subset of the standard DataTransfer used by clipboard events. */
export class DataTransfer {
  private readonly strings = new Map<string, string>()
  private writable = true

  get types(): readonly string[] { return Object.freeze([...this.strings.keys()]) }

  getData(format: string): string {
    const key = normalizeFormat(format)
    const value = this.strings.get(key) ?? ""
    if (String(format).toLowerCase() !== "url") return value
    return value.split(/\r?\n/).find(line => line.length > 0 && !line.startsWith("#")) ?? ""
  }

  setData(format: string, data: string): void {
    if (this.writable) this.strings.set(normalizeFormat(format), String(data))
  }

  clearData(format?: string): void {
    if (!this.writable) return
    if (format === undefined) this.strings.clear()
    else this.strings.delete(normalizeFormat(format))
  }

  [sealTransfer](): void { this.writable = false }
}

/** Browser-owned incoming clipboard payload becomes read-only before event dispatch. */
export function sealDataTransfer(transfer: DataTransfer): DataTransfer {
  transfer[sealTransfer]()
  return transfer
}

function normalizeFormat(format: string): string {
  const normalized = String(format).toLowerCase()
  return normalized === "text" ? "text/plain" : normalized === "url" ? "text/uri-list" : normalized
}
