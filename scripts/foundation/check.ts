import {join} from "node:path"
import {validateFoundation} from "./model.ts"

const root = join(import.meta.dir, "../..")
const boundariesOnly = process.argv.includes("--boundaries-only")

try {
  const result = await validateFoundation(root, {boundariesOnly})
  console.log(
    `visual-monorepo foundation: ${result.packages} imported packages, ` +
    `${result.imports} imports, ${result.productionEdges} production edges`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
