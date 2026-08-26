const CHROME_API = process.env.META_CHROME_URL ?? "http://127.0.0.1:7880"
const CATALOG_URL = "http://127.0.0.1:4015/ui/component-graph"

type CdpTarget = Readonly<{
  targetId: string
  type: string
  title: string
  url: string
}>

type TargetResponse = Readonly<{
  ok: boolean
  targets?: readonly CdpTarget[]
  target?: CdpTarget
  error?: string
}>

const mode = Bun.argv[2] ?? "status"
const activate = Bun.argv.includes("--activate")
if (mode !== "status" && mode !== "ensure" && mode !== "reload") {
  throw new Error(`Unknown catalog browser mode: ${mode}`)
}

const health = await request("/health") as Readonly<{
  ok?: boolean
  running?: boolean
  cdp?: Readonly<{available?: boolean}>
}>
if (health.ok !== true || health.running !== true || health.cdp?.available !== true) {
  throw new Error("@meta/chrome CDP is not ready")
}

let target = await exactTarget()
if (mode === "status") {
  console.log(JSON.stringify({ok: true, mode, open: target !== null, target, url: CATALOG_URL}, null, 2))
  process.exit(0)
}

if (target === null) {
  const created = await request("/cdp/targets", {
    method: "POST",
    body: JSON.stringify({url: CATALOG_URL}),
  }) as TargetResponse
  if (created.ok !== true || created.target === undefined) {
    throw new Error(created.error ?? "Failed to create catalog CDP target")
  }
  target = created.target
} else if (mode === "reload") {
  await request("/reload", {
    method: "POST",
    body: JSON.stringify({targetId: target.targetId}),
  })
}

if (activate) {
  await request(`/cdp/targets/${encodeURIComponent(target.targetId)}/activate`, {method: "POST"})
}
await request("/wait-ready", {
  method: "POST",
  body: JSON.stringify({targetId: target.targetId, options: {reflowStable: false}}),
})

console.log(JSON.stringify({ok: true, mode, open: true, activated: activate, target, url: CATALOG_URL}, null, 2))

async function exactTarget(): Promise<CdpTarget | null> {
  const response = await request("/cdp/targets") as TargetResponse
  if (response.ok !== true || response.targets === undefined) {
    throw new Error(response.error ?? "Failed to list CDP targets")
  }
  const matches = response.targets.filter((candidate) => candidate.type === "page" && sameCatalogUrl(candidate.url))
  if (matches.length > 1) {
    throw new Error(`Multiple exact catalog targets: ${matches.map(({targetId}) => targetId).join(", ")}`)
  }
  return matches[0] ?? null
}

function sameCatalogUrl(value: string): boolean {
  try {
    const expected = new URL(CATALOG_URL)
    const actual = new URL(value)
    return actual.origin === expected.origin && actual.pathname === expected.pathname
  } catch {
    return false
  }
}

async function request(path: string, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined) headers.set("content-type", "application/json")
  const response = await fetch(`${CHROME_API}${path}`, {...init, headers})
  const text = await response.text()
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error(`Invalid @meta/chrome response for ${path}: ${text}`)
  }
  if (!response.ok) {
    const message = value !== null && typeof value === "object" && "error" in value
      ? String((value as {error: unknown}).error)
      : `${response.status} ${response.statusText}`
    throw new Error(message)
  }
  return value
}
