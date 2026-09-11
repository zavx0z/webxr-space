import {stat} from "node:fs/promises"
import {resolve} from "node:path"

/**
Разрешает и проверяет единственный исходник публичного parser API.

Этот helper остаётся в `parser/src`, потому что его contract относится к
single-input entrypoint: batch валидирует свой ordered набор путей отдельно.

@param root - Рабочий каталог TypeScript API.

@param path - Относительный либо абсолютный путь к документируемому файлу.

@returns Абсолютный путь существующего обычного файла.

@throws Если путь не указывает на читаемый файл.
*/
export async function resolveTypeDocSource(root: string, path: string): Promise<string> {
  const absolutePath = resolve(root, path)
  if (!(await stat(absolutePath).catch(() => undefined))?.isFile()) {
    throw new Error(`TypeDoc: исходник не найден: ${absolutePath}`)
  }
  return absolutePath
}
