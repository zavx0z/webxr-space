const result = Bun.spawnSync(["git", "submodule", "status", "--recursive"], {
  cwd: import.meta.dir + "/..",
  stdout: "pipe",
  stderr: "pipe",
})

const stdout = result.stdout.toString().trimEnd()
const stderr = result.stderr.toString().trimEnd()
if (stdout.length > 0) console.log(stdout)
if (stderr.length > 0) console.error(stderr)
if (result.exitCode !== 0) process.exit(result.exitCode)
