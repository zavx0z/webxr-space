import {mkdir, mkdtemp, readdir, realpath, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {relative, resolve} from "node:path"

const repositoryRoot = resolve(import.meta.dir, "..")
const temporaryRoot = await realpath(
  await mkdtemp(resolve(tmpdir(), "zavx0z-template-package-")),
)
const packageRoot = resolve(temporaryRoot, "package")
const consumerRoot = resolve(temporaryRoot, "consumer")

try {
  await mkdir(packageRoot, {recursive: true})
  await mkdir(consumerRoot, {recursive: true})
  await run([
    process.execPath,
    "pm",
    "pack",
    "--destination",
    packageRoot,
    "--ignore-scripts",
  ], repositoryRoot)
  const tarballName = (await readdir(packageRoot)).find(name => name.endsWith(".tgz"))
  if (!tarballName) throw new Error("bun pm pack did not produce a tarball")
  const consumerPackage = {
    dependencies: {
      "@zavx0z/dom": `file:${relative(
        consumerRoot,
        resolve(repositoryRoot, "../renderer/packages/dom"),
      )}`,
      typescript: "7.0.2",
    },
    overrides: {
      "@zavx0z/dom": `file:${relative(
        consumerRoot,
        resolve(repositoryRoot, "../renderer/packages/dom"),
      )}`,
    },
    private: true,
    type: "module",
  }
  await writeFile(resolve(consumerRoot, "package.json"), JSON.stringify(consumerPackage))
  await writeFile(resolve(consumerRoot, "app.tsx"), [
    'import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"',
    "function Child() {",
    "  return <span style={css`color: red;`}>Package proof</span>",
    "}",
    "function Pane(props: Readonly<{children: JsxSourceElement}>) {",
    "  return <section>{props.children}</section>",
    "}",
    "function StandardDomInput() {",
    "  return <input",
    "    onInput={event => {",
    "      const input: HTMLInputElement = event.currentTarget",
    "      const nativeEvent: InputEvent = event",
    "      void input",
    "      void nativeEvent",
    "    }}",
    "    ref={input => {",
    "      const exact: HTMLInputElement | null = input",
    "      void exact",
    "    }}",
    "  />",
    "}",
    "export function Badge() {",
    "  return <Pane><Child /></Pane>",
    "}",
    "void StandardDomInput",
    "",
  ].join("\n"))
  await writeFile(resolve(consumerRoot, "compiler-types.ts"), [
    'import type {CapabilityUsage, CapabilityUsageManifest, CapabilityUsageValue, CssAttributeSelectorCapabilityUsage, JsxCompileResult, JsxCompilerSessionOptions, JsxCompilerStats} from "@zavx0z/template/compiler"',
    'import type {CompiledStyleSheet, CompiledTemplate} from "@zavx0z/template/compiled"',
    'import type {CssDeclarationValue, CssSourceValue, CssStyleValue, CssTemplateResult, CssTemplateValue} from "@zavx0z/template"',
    'import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"',
    "declare const options: JsxCompilerSessionOptions",
    "declare const stats: JsxCompilerStats",
    "declare const template: CompiledTemplate<Record<string, never>>",
    "declare const styleSheet: CompiledStyleSheet",
    "declare const jsx: JsxSourceElement",
    "declare const cssResult: CssTemplateResult",
    "declare const cssSource: CssSourceValue",
    "declare const cssDeclaration: CssDeclarationValue",
    "declare const cssStyle: CssStyleValue",
    "declare const cssValue: CssTemplateValue",
    "declare const compileResult: JsxCompileResult",
    "declare const usage: CapabilityUsage",
    "declare const usageManifest: CapabilityUsageManifest",
    "declare const usageValue: CapabilityUsageValue",
    "declare const attributeSelectorUsage: CssAttributeSelectorCapabilityUsage",
    "void options",
    "void stats",
    "void template",
    "void styleSheet",
    "void jsx",
    "void cssResult",
    "void cssSource",
    "void cssDeclaration",
    "void cssStyle",
    "void cssValue",
    "void compileResult",
    "void usage",
    "void usageManifest",
    "void usageValue",
    "void attributeSelectorUsage",
    "",
  ].join("\n"))
  await writeFile(resolve(consumerRoot, "global-css.tsx"), [
    "export function GlobalCssOnly() {",
    "  return <span style={css`color: red;`}>Global CSS</span>",
    "}",
    "",
  ].join("\n"))
  await writeFile(resolve(consumerRoot, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      allowImportingTsExtensions: true,
      jsx: "preserve",
      jsxImportSource: "@zavx0z/template",
      module: "Preserve",
      moduleResolution: "bundler",
      noEmit: true,
      strict: true,
      target: "ESNext",
    },
    files: ["app.tsx", "compiler-types.ts", "global-css.tsx"],
  }))
  await writeFile(resolve(consumerRoot, "build-proof.ts"), [
    'import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"',
    'const manifestPath = new URL("./capability-usage.json", import.meta.url).pathname',
    "const result = await Bun.build({",
    '  entrypoints: [new URL("./app.tsx", import.meta.url).pathname],',
    '  external: ["@zavx0z/react", "@zavx0z/template/compiled"],',
    "  plugins: [createTemplateJsxBunPlugin({",
    "    capabilityManifestPath: manifestPath,",
    "    cwd: import.meta.dir,",
    '    sourceRoots: ["app.tsx"],',
    "  })],",
    '  target: "browser",',
    "})",
    'if (!result.success) throw new Error(result.logs.map(log => log.message).join("\\n"))',
    'const output = await result.outputs[0].text()',
    'if (output.includes("<span") || output.includes("<Pane")) throw new Error("JSX survived package build")',
    'if (!output.includes("bindChild")) throw new Error("component children did not use the compiled ABI")',
    'if (!output.includes("styleSheets") || output.includes("css`")) throw new Error("scoped css did not use compiled metadata")',
    "const manifest = await Bun.file(manifestPath).json()",
    'if (manifest.schemaVersion !== 2 || manifest.files.length !== 1) throw new Error("capability manifest unavailable")',
    'if (!manifest.files[0].usages.some((usage: {kind: string}) => usage.kind === "event")) throw new Error("event usage missing")',
    'if (!manifest.files[0].usages.some((usage: {kind: string; name?: string; value?: {kind: string; value?: unknown}}) => usage.kind === "css-property" && usage.name === "color" && usage.value?.kind === "static" && usage.value.value === "red")) throw new Error("static CSS usage missing")',
    "",
  ].join("\n"))

  await run([process.execPath, "install"], consumerRoot)
  await writeFile(resolve(consumerRoot, "package.json"), JSON.stringify({
    ...consumerPackage,
    dependencies: {
      ...consumerPackage.dependencies,
      "@zavx0z/template": `file:../package/${tarballName}`,
    },
  }))
  await run([process.execPath, "install"], consumerRoot)
  await run([
    resolve(consumerRoot, "node_modules/.bin/tsc"),
    "--project",
    resolve(consumerRoot, "tsconfig.json"),
    "--pretty",
    "false",
  ], consumerRoot)
  await run([process.execPath, "build-proof.ts"], consumerRoot)

  const node = Bun.which("node")
  if (!node) throw new Error("Node is required for the portable compiler-core package proof")
  await run([
    node,
    "--input-type=module",
    "--eval",
    [
      'const compiler = await import("@zavx0z/template/compiler")',
      'if (typeof compiler.JsxCompilerSession !== "function") throw new Error("compiler core unavailable")',
      'if (typeof compiler.createCapabilityUsageManifest !== "function") throw new Error("capability manifest unavailable")',
      'if (typeof compiler.serializeCapabilityUsageManifest !== "function") throw new Error("capability manifest serializer unavailable")',
    ].join(";"),
  ], consumerRoot)

  await run([
    process.execPath,
    resolve(repositoryRoot, "compiler/runtime-plugin-proof.ts"),
    resolve(consumerRoot, "node_modules/@zavx0z/template/dist/compiler/bun.js"),
    resolve(consumerRoot, "app.tsx"),
  ], consumerRoot)

  console.log(JSON.stringify({
    cleanInstall: true,
    compilerCoreTarget: "node",
    distBunAdapter: true,
    packedTarball: resolve(packageRoot, tarballName),
  }))
} finally {
  await rm(temporaryRoot, {force: true, recursive: true})
}

async function run(command: readonly string[], cwd: string): Promise<void> {
  const child = Bun.spawn([...command], {cwd, stderr: "pipe", stdout: "pipe"})
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  if (exitCode !== 0) {
    throw new Error([
      `Command failed (${exitCode}): ${command.join(" ")}`,
      stdout,
      stderr,
    ].filter(Boolean).join("\n"))
  }
}
