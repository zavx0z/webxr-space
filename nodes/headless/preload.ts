import {afterAll} from "bun:test"
import {registerHeadlessCompiler, repositoryRoot} from "./compiler.ts"

/** Bun загружает этот модуль до spec и их статических импортов; GPU здесь не создаётся. */
const closeCompiler = registerHeadlessCompiler(repositoryRoot(process.cwd()), true)
afterAll(closeCompiler)
