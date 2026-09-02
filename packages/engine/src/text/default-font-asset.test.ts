import {describe, expect, test} from "bun:test"
import {createHash} from "node:crypto"
import {readFile} from "node:fs/promises"
import {resolve} from "node:path"
import {TrueTypeFont} from "./true-type-font"

const assetPath = resolve(import.meta.dir, "../../static/fonts/inter-regular.ttf")
const provenancePath = resolve(import.meta.dir, "../../static/fonts/inter-regular.provenance.json")
const licensePath = resolve(import.meta.dir, "../../static/fonts/inter-ofl.txt")
const outputSha256 = "b9ed74423726fa341f0701cea0ec610deda96da5627e85b361bf3031538dc38f"

describe("Engine-owned default font asset", () => {
  test("matches the accepted Blender v5.2.0 Inter conversion and OFL provenance", async () => {
    const bytes = await readFile(assetPath)
    const provenance = await Bun.file(provenancePath).json() as {
      output: {bytes: number; sha256: string}
      source: {gitBlob: string; sha256: string; version: string}
    }
    const licenseBytes = await readFile(licensePath)
    const license = licenseBytes.toString("utf8")

    expect(createHash("sha256").update(bytes).digest("hex")).toBe(outputSha256)
    expect(bytes.byteLength).toBe(402208)
    expect(provenance.output).toEqual({bytes: 402208, sha256: outputSha256})
    expect(provenance.source).toMatchObject({
      gitBlob: "0700d24d00b81b79341a9bcee761c64768111813",
      sha256: "fb865a5087637ba194b14aef6f0558214f3c4b3ec939e3c0812c66de41036a47",
      version: "v5.2.0",
    })
    expect(gitBlobHash(licenseBytes)).toBe("9b2ca37b3ffc77391d8b2ebef4a974ef32bf46ea")
    expect(license).toContain("Copyright (c) 2016 The Inter Project Authors")
    expect(license).toContain("SIL OPEN FONT LICENSE Version 1.1")
  })

  test("parses representative UI cmap entries, outlines and tabular digits", async () => {
    const bytes = await readFile(assetPath)
    const font = new TrueTypeFont(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))

    expect(font.unitsPerEm).toBe(2048)
    expect(font.numGlyphs).toBe(2937)
    expect(font.ascent).toBe(1984)
    expect(font.descent).toBe(494)
    expect(font.lineGap).toBe(0)

    for (const character of ["A", "a", "é", "Ж", "я", "0", "9"]) {
      const glyph = font.mapCharToGlyph(character.codePointAt(0)!)
      expect(glyph, character).toBeGreaterThan(0)
      expect(font.getGlyphOutline(glyph).points.length, character).toBeGreaterThan(0)
    }

    const digitAdvances = [..."0123456789"].map((character) => {
      const glyph = font.mapCharToGlyph(character.codePointAt(0)!)
      return font.getHMetric(glyph).advanceWidth
    })
    expect(new Set(digitAdvances)).toEqual(new Set([1328]))

    const space = font.mapCharToGlyph(" ".codePointAt(0)!)
    expect(font.getHMetric(space).advanceWidth).toBe(550)
    expect(font.getGlyphOutline(space).points).toHaveLength(0)
    expect(font.mapCharToGlyph(0x10ffff)).toBe(0)
  })
})

function gitBlobHash(bytes: Uint8Array): string {
  return createHash("sha1")
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest("hex")
}
