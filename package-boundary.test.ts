import {describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {fileURLToPath} from "node:url"

const packageRoot = fileURLToPath(new URL(".", import.meta.url))

describe("layout Worker policy bundle boundaries", () => {
  test("publishes only exact policy entrypoints from the physical package", async () => {
    const manifest = await Bun.file(join(packageRoot, "package.json")).json() as {
      name?: string
      dependencies?: Record<string, string>
      exports?: Record<string, string>
    }
    expect(manifest.name).toBe("@nodes/worker")
    expect(manifest.dependencies).toEqual({"@nodes/layout": "workspace:*"})
    expect(Object.keys(manifest.exports ?? {}).sort()).toEqual([
      ".",
      "./adaptive/client",
      "./adaptive/executor",
      "./fixed/client",
      "./fixed/executor",
      "./top-down/client",
      "./top-down/executor",
      "./transport",
      "./types",
    ])
    for (const target of Object.values(manifest.exports ?? {})) {
      expect(await Bun.file(join(packageRoot, target)).exists(), target).toBeTrue()
    }
  })

  test("keeps shared transport policy-neutral and executors exact", async () => {
    const transport = await Bun.file(join(packageRoot, "transport.ts")).text()
    const executor = await Bun.file(join(packageRoot, "executor.ts")).text()
    const fixed = await Bun.file(join(packageRoot, "fixed/executor.ts")).text()
    const adaptive = await Bun.file(join(packageRoot, "adaptive/executor.ts")).text()
    const topDown = await Bun.file(join(packageRoot, "top-down/executor.ts")).text()

    expect(transport).not.toMatch(/@nodes\/layout/)
    expect(executor).not.toMatch(/@nodes\/layout/)
    expect(fixed).toContain('from "@nodes/layout/fixed"')
    expect(fixed).not.toContain("@nodes/layout/adaptive")
    expect(adaptive).toContain('from "@nodes/layout/adaptive"')
    expect(adaptive).not.toContain("@nodes/layout/fixed")
    expect(topDown).toContain('from "@nodes/layout/top-down"')
    expect(topDown).not.toContain("@nodes/layout/fixed")
    expect(topDown).not.toContain("@nodes/layout/adaptive")
  })

  test("builds isolated policy executors and solver-free clients", async () => {
    const fixedExecutor = await buildFixture("fixed-worker-executor-consumer.ts")
    const adaptiveExecutor = await buildFixture("adaptive-worker-executor-consumer.ts")
    const fixedClient = await buildFixture("fixed-worker-client-consumer.ts")
    const adaptiveClient = await buildFixture("adaptive-worker-client-consumer.ts")
    const topDownExecutor = await buildFixture("top-down-worker-executor-consumer.ts")
    const topDownClient = await buildFixture("top-down-worker-client-consumer.ts")

    expect(fixedExecutor.source).toContain("Port has conflicting edge roles")
    expect(fixedExecutor.source).toContain("NO_LEGAL_LAYOUT")
    expect(fixedExecutor.source).not.toContain("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
    expect(adaptiveExecutor.source).toContain("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
    expect(adaptiveExecutor.source).toContain("NO_LEGAL_LAYOUT")
    expect(adaptiveExecutor.source).not.toContain("Port has conflicting edge roles")
    expect(fixedExecutor.source).not.toContain("TOP_DOWN_CYCLE_DETECTED")
    expect(adaptiveExecutor.source).not.toContain("TOP_DOWN_CYCLE_DETECTED")
    expect(topDownExecutor.source).toContain("TOP_DOWN_CYCLE_DETECTED")
    expect(topDownExecutor.source).not.toContain("NO_LEGAL_LAYOUT")
    expect(topDownExecutor.source).not.toContain("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
    expect(topDownExecutor.source).not.toContain("Port has conflicting edge roles")

    for (const client of [fixedClient, adaptiveClient, topDownClient]) {
      expect(client.source).toContain("Stale layout generation")
      expect(client.source).not.toContain("NO_LEGAL_LAYOUT")
      expect(client.source).not.toContain("NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT")
      expect(client.source).not.toContain("Port has conflicting edge roles")
      expect(client.source).not.toContain("TOP_DOWN_CYCLE_DETECTED")
    }

    expect(fixedExecutor).toMatchObject({
      bytes: 75_995,
      gzipBytes: 23_641,
      sha256: "5de2b22da15013fc58a3364e9c0c21c9185420ff6022bcadef29c9b793003eb8",
    })
    expect(adaptiveExecutor).toMatchObject({
      bytes: 81_579,
      gzipBytes: 25_450,
      sha256: "bce92c4178dcfd3cfff9ef3a0c02516527f2b9436b29fa0176eb6a4ec8e9a16f",
    })
    expect(fixedClient).toMatchObject({
      bytes: 1_521,
      gzipBytes: 673,
      sha256: "fc7547c8b960d6fe588756a64f74f55819a36e034ea1455ef2e45029eed25890",
    })
    expect(adaptiveClient).toMatchObject({
      bytes: 1_524,
      gzipBytes: 674,
      sha256: "d117634350f5567efcf5997c24d1a3d0818a36bfc2951b2daeaf739289885296",
    })
    expect(topDownExecutor).toMatchObject({
      bytes: 10_030,
      gzipBytes: 3_527,
      sha256: "fc9779d95d2ffa39a9c7537191dea1fc7c3e3fd550cf908b5469cec6551c0e3a",
    })
    expect(fixedClient.bytes).toBeLessThan(8_000)
    expect(adaptiveClient.bytes).toBeLessThan(8_000)
    expect(topDownClient).toMatchObject({
      bytes: 1_487,
      gzipBytes: 658,
      sha256: "e4e102a0f376d1b9283f363b7838be796b805c6939ddb48cf66ade6a72bf1fd0",
    })
  })
})

async function buildFixture(name: string): Promise<{
  source: string
  bytes: number
  gzipBytes: number
  sha256: string
}> {
  const directory = await mkdtemp(join(tmpdir(), "nodes-worker-bundle-"))
  const output = join(directory, "bundle.js")
  try {
    const childProcess = Bun.spawn([
      process.execPath,
      "build",
      join(packageRoot, "fixtures", name),
      "--target=browser",
      "--format=esm",
      "--minify",
      `--outfile=${output}`,
    ], {cwd: packageRoot, stdout: "pipe", stderr: "pipe"})
    const [exitCode, stdout, stderr] = await Promise.all([
      childProcess.exited,
      new Response(childProcess.stdout).text(),
      new Response(childProcess.stderr).text(),
    ])
    if (exitCode !== 0) throw new Error(`${stdout}\n${stderr}`.trim())
    const bytes = new Uint8Array(await Bun.file(output).arrayBuffer())
    return {
      source: new TextDecoder().decode(bytes),
      bytes: bytes.byteLength,
      gzipBytes: Bun.gzipSync(bytes).byteLength,
      sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
    }
  } finally {
    await rm(directory, {recursive: true, force: true})
  }
}
