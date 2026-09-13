/**
Регистрирует Template compiler до загрузки статических TSX-импортов Bun test.

Test host подключает этот entrypoint через `bun test --preload @immersive/headless/preload`.
Корнем компиляции становится Git-корень текущего рабочего каталога.

@packageDocumentation
*/
import {registerHeadlessCompiler, repositoryRoot} from "./compiler.ts"

registerHeadlessCompiler(repositoryRoot(process.cwd()))
