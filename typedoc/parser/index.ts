/**
Создаёт структурированную документацию экспортируемых type/interface через API TypeScript 7.
Импорты разрешает компилятор; исходные модули не исполняются.
Каждая декларация содержит также JSON Schema с описаниями полей из TSDoc.

@packageDocumentation
*/
import {API} from "typescript/unstable/async"
import {resolve} from "node:path"
import type {AnalyzeTypeDocInput} from "./contract/input.ts"
import type {AnalyzeTypeDocOutput} from "./contract/output.ts"
import {analyzeTypeDocProject} from "../shared/parser/analyze-project.ts"
import {attestTypeScriptConfigurations} from "../shared/parser/configuration-attestation.ts"
import {resolveTypeDocSource} from "./src/resolve-source.ts"

export type {AnalyzeTypeDocInput} from "./contract/input.ts"
export type {AnalyzeTypeDocOutput} from "./contract/output.ts"

/**
Извлекает документацию экспортируемых type/interface через отдельную сессию TypeScript.
Разрешает поля {@link Readonly}, {@link Partial}, наследование и tuple; исходные модули не исполняет.
Сессия закрывается перед завершением Promise, в том числе при ошибке.

@param input - {@link AnalyzeTypeDocInput}: рабочий root и путь к документируемому файлу.

@returns {@link AnalyzeTypeDocOutput} с моделью справочника и digest посещённых источников.

@throws Promise отклоняется при отсутствии файла или экспортируемых type/interface,
ошибках TypeScript в анализируемом источнике и посещённых объявлениях.

@example
```ts
const result = await analyzeTypeDoc({root: projectRoot, path: "contract/input.ts"})
```
*/
export async function analyzeTypeDoc(input: AnalyzeTypeDocInput): Promise<AnalyzeTypeDocOutput> {
  const {root, path} = input
  const absolutePath = await resolveTypeDocSource(root, path)
  const configurations = await attestTypeScriptConfigurations([absolutePath])
  const api = new API({cwd: resolve(root)})
  try {
    const snapshot = await api.updateSnapshot({openFiles: [absolutePath]})
    const project = await snapshot.getDefaultProjectForFile(absolutePath)
    if (!project) throw new Error(`TypeDoc: исходник не найден: ${absolutePath}`)
    const result = await analyzeTypeDocProject(project, absolutePath, configurations.sources)
    await configurations.verify()
    return result
  } finally {
    await api.close()
  }
}
