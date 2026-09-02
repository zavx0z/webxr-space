import {join} from "node:path"
import {
  loadFoundationData,
  topologicalCheckUnits,
  type CheckUnit,
} from "./model.ts"

const root = join(import.meta.dir, "../..")
const planOnly = process.argv.includes("--plan")
const includeExternal = process.argv.includes("--include-external")
const data = await loadFoundationData(root)
const repositories = new Map<string, string>()
const repositoryValues = data.sourceSnapshot.repositories

if (!Array.isArray(repositoryValues)) throw new Error("Source repositories must be an array")
for (const value of repositoryValues) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid source repository record")
  }
  const record = value as Record<string, unknown>
  if (typeof record.id !== "string" || typeof record.path !== "string") {
    throw new Error("Invalid source repository identity")
  }
  repositories.set(record.id, record.path)
}

const ordered = topologicalCheckUnits(data.checkUnits.units)
const selected = ordered.filter(({state}) => state === "workspace" || includeExternal)

for (const unit of selected) {
  const cwd = repositories.get(unit.repository)
  if (cwd === undefined) throw new Error(`Unknown repository for check unit ${unit.id}`)
  const line = `${unit.id}\t${cwd}\t${unit.command.join(" ")}`
  if (planOnly) {
    console.log(line)
    continue
  }
  console.log(`checking ${unit.id}: ${unit.command.join(" ")}`)
  await runUnit(unit, cwd)
}

if (selected.length === 0) console.log("No package check units selected")

async function runUnit(unit: CheckUnit, cwd: string): Promise<void> {
  const process = Bun.spawn([...unit.command], {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  const exitCode = await process.exited
  if (exitCode !== 0) throw new Error(`Package check failed: ${unit.id} (${exitCode})`)
}
