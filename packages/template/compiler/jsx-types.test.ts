import {expect, test} from "bun:test"
import {mkdtemp, rm, writeFile} from "node:fs/promises"
import {tmpdir} from "node:os"
import {resolve} from "node:path"

test("types standard DOM JSX events, exact currentTarget and callback refs", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "template-jsx-types-"))
  try {
    await writeFile(resolve(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        allowImportingTsExtensions: true,
        exactOptionalPropertyTypes: true,
        jsx: "preserve",
        jsxImportSource: "@zavx0z/template",
        lib: ["ESNext", "DOM"],
        module: "Preserve",
        moduleResolution: "bundler",
        noEmit: true,
        paths: {
          "@zavx0z/template/jsx-runtime": [resolve(import.meta.dir, "../jsx-runtime.ts")],
        },
        skipLibCheck: false,
        strict: true,
        target: "ESNext",
      },
      files: ["source.tsx"],
    }))
    await writeFile(resolve(root, "source.tsx"), [
      "declare const title: string | undefined",
      "declare const style: CssStyle | undefined",
      "declare const onInput: ((event: InputEvent & {readonly currentTarget: HTMLInputElement}) => unknown) | undefined",
      "declare const inputRef: ((input: HTMLInputElement | null) => void) | undefined",
      "",
      "export function TypedInput() {",
      "  return <input",
      "    max={10}",
      "    min={0}",
      "    onInput={onInput}",
      "    onKeyDown={event => {",
      "      const keyboard: KeyboardEvent = event",
      "      const input: HTMLInputElement = event.currentTarget",
      "      void keyboard",
      "      void input",
      "    }}",
      "    ref={inputRef}",
      "    style={style}",
      "    step={0.5}",
      "    title={title}",
      "    value={4}",
      "  />",
      "}",
      "",
      "export function TypedButton() {",
      "  return <button",
      "    onClick={event => {",
      "      const pointer: PointerEvent = event",
      "      const button: HTMLButtonElement = event.currentTarget",
      "      // @ts-expect-error button currentTarget is not an input",
      "      event.currentTarget.selectionStart",
      "      void pointer",
      "      void button",
      "    }}",
      "    onDoubleClick={event => {",
      "      const mouse: MouseEvent = event",
      "      void mouse",
      "    }}",
      "  >Button</button>",
      "}",
      "",
      "export function TypedSelect() {",
      "  return <select onChange={event => {",
      "    const change: Event = event",
      "    const select: HTMLSelectElement = event.currentTarget",
      "    void change",
      "    void select",
      "  }} />",
      "}",
      "",
      "declare const wrongRef: (select: HTMLSelectElement | null) => void",
      "declare const objectRef: {current: HTMLInputElement | null}",
      "declare const wrongInputHandler: (event: KeyboardEvent) => void",
      "",
      "export function RejectedJsx() {",
      "  return <div>",
      "    {/* @ts-expect-error unknown standard host tag */}",
      "    <unknown-widget />",
      "    {/* @ts-expect-error unknown intrinsic property */}",
      "    <input imaginaryProperty=\"no\" />",
      "    {/* @ts-expect-error ref target does not match input */}",
      "    <input ref={wrongRef} />",
      "    {/* @ts-expect-error object refs remain outside the current runtime profile */}",
      "    <input ref={objectRef} />",
      "    {/* @ts-expect-error input receives InputEvent, not KeyboardEvent */}",
      "    <input onInput={wrongInputHandler} />",
      "  </div>",
      "}",
      "",
    ].join("\n"))

    const child = Bun.spawn([
      resolve(import.meta.dir, "../node_modules/.bin/tsc"),
      "--project",
      resolve(root, "tsconfig.json"),
      "--pretty",
      "false",
    ], {cwd: root, stderr: "pipe", stdout: "pipe"})
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
    ])
    expect(exitCode, `${stdout}\n${stderr}`).toBe(0)
  } finally {
    await rm(root, {force: true, recursive: true})
  }
}, 30_000)
