import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {readPinnedGitFile} from "./git-source.ts"

const root = resolve(import.meta.dir, "../..")

test("исторический исходник читается из коммита, даже когда рабочий файл уже удалён или переименован", async () => {
  const source = await readPinnedGitFile(root, "834a5b2cffc1971589799400bb2370e0b8c668de", "browser/src/experience.ts")
  const bytes = new TextEncoder().encode(source)
  const objectId = new Bun.CryptoHasher("sha1")
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest("hex")
  expect(objectId).toBe("d96d7a7b5c418c9912b81d3474a54e486d8cec7e")
})

test("проверка истории не принимает ссылки, которые сдвигаются после обычных коммитов", () => {
  for (const revision of ["HEAD", "main", "HEAD~1", "834a5b2"]) {
    expect(() => readPinnedGitFile(root, revision, "package.json")).toThrow("full immutable commit id")
  }
  expect(() => readPinnedGitFile(root, "834a5b2cffc1971589799400bb2370e0b8c668de", "../package.json"))
    .toThrow("inside its commit")
})
