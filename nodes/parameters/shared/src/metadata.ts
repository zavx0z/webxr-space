/**
Чистое чтение метаданных JSON модели для проекции Node, Frame и Parameter.
Отсутствующие либо несовместимые свойства возвращают прежнее резервное значение без изменения модели.

@packageDocumentation
*/

import type {NodeJsonValue, NodeJsonObject} from "@nodes/tree"

export function metadata(value: NodeJsonValue | undefined, key: string): NodeJsonValue | undefined {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined
  return (value as NodeJsonObject)[key]
}

export function metadataString(value: NodeJsonValue | undefined, key: string, fallback: string): string {
  const candidate = metadata(value, key)
  return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback
}

export function metadataNumber(value: NodeJsonValue | undefined, key: string): number | undefined {
  const candidate = metadata(value, key)
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : undefined
}

export function metadataBoolean(value: NodeJsonValue | undefined, key: string, fallback: boolean): boolean {
  const candidate = metadata(value, key)
  return typeof candidate === "boolean" ? candidate : fallback
}

export function metadataStringArray(value: NodeJsonValue | undefined, key: string): readonly string[] | undefined {
  const candidate = metadata(value, key)
  if (!Array.isArray(candidate) || !candidate.every(entry => typeof entry === "string")) return undefined
  return candidate as readonly string[]
}

export function metadataObjectArray(value: NodeJsonValue | undefined, key: string): readonly NodeJsonObject[] | undefined {
  const candidate = metadata(value, key)
  if (!Array.isArray(candidate) || !candidate.every(entry => entry !== null && typeof entry === "object" && !Array.isArray(entry))) {
    return undefined
  }
  return candidate as readonly NodeJsonObject[]
}
