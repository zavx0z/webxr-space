/**
Deterministic interchange for Template capability usages.

The manifest groups compiler facts by exact source path. Consumer identity and
matrix resolution remain external platform-tooling responsibilities.

@packageDocumentation
*/

import type {CapabilityUsage} from "./capability-usage.ts"

export const CAPABILITY_USAGE_SCHEMA_VERSION = 2 as const
export const CAPABILITY_USAGE_GENERATOR_VERSION = "template-capability-usage-v2" as const

export type CapabilityUsageFile = Readonly<{
  path: string
  usages: readonly CapabilityUsage[]
}>

export type CapabilityUsageManifest = Readonly<{
  files: readonly CapabilityUsageFile[]
  generatorVersion: typeof CAPABILITY_USAGE_GENERATOR_VERSION
  schemaVersion: typeof CAPABILITY_USAGE_SCHEMA_VERSION
}>

/**
Creates the deterministic neutral interchange consumed by platform tooling.

@param usages - Usages from one or more successful governed compilations.
@returns An immutable manifest grouped by path and sorted deterministically.
*/
export function createCapabilityUsageManifest(
  usages: readonly CapabilityUsage[],
): CapabilityUsageManifest {
  const byPath = new Map<string, CapabilityUsage[]>()
  for (const usage of usages) {
    let file = byPath.get(usage.source.path)
    if (!file) {
      file = []
      byPath.set(usage.source.path, file)
    }
    file.push(usage)
  }
  const files = [...byPath]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, fileUsages]) => Object.freeze({
      path,
      usages: Object.freeze([...fileUsages].sort(compareUsages)),
    }))
  return Object.freeze({
    files: Object.freeze(files),
    generatorVersion: CAPABILITY_USAGE_GENERATOR_VERSION,
    schemaVersion: CAPABILITY_USAGE_SCHEMA_VERSION,
  })
}

/**
Serializes one manifest byte-for-byte deterministically with a final newline.

This function has no filesystem side effect. The Bun adapter writes only when
its caller explicitly supplies `capabilityManifestPath`.

@param manifest - A manifest produced by {@link createCapabilityUsageManifest}.
@returns Pretty JSON with stable field order and one final newline.
*/
export function serializeCapabilityUsageManifest(
  manifest: CapabilityUsageManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}

function compareUsages(left: CapabilityUsage, right: CapabilityUsage): number {
  return left.source.start.offset - right.source.start.offset ||
    left.source.end.offset - right.source.end.offset ||
    left.kind.localeCompare(right.kind) ||
    JSON.stringify(left).localeCompare(JSON.stringify(right))
}
