/**
Передаёт RGBA8-пиксели нативному конвейеру Bun.Image с сохранением альфа-канала.

Bun.Image принимает изображения в контейнере, но не имеет raw-входа.
Здесь добавляется только заголовок несжатого BMP V5 и меняется порядок каналов
на BGRA. Декодирование контейнера и кодирование PNG выполняет сам Bun.

@param rgba - Строки пикселей сверху вниз, четыре байта на пиксель, без padding.
@param width - Положительная целочисленная ширина в пикселях.
@param height - Положительная целочисленная высота в пикселях.
@returns Bun.Image, который можно закодировать через `.png().buffer()` или `.write()`.
@throws Если размеры или длина RGBA не согласованы.
*/
export function imageFromRgba(rgba: Uint8Array, width: number, height: number): Bun.Image {
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0
    || rgba.length !== width * height * 4) {
    throw new Error("Размеры изображения должны соответствовать длине RGBA8")
  }
  const offset = 14 + 124
  const bitmap = Buffer.alloc(offset + rgba.length)
  bitmap.write("BM")
  bitmap.writeUInt32LE(bitmap.length, 2)
  bitmap.writeUInt32LE(offset, 10)
  bitmap.writeUInt32LE(124, 14)
  bitmap.writeInt32LE(width, 18)
  bitmap.writeInt32LE(-height, 22)
  bitmap.writeUInt16LE(1, 26)
  bitmap.writeUInt16LE(32, 28)
  bitmap.writeUInt32LE(3, 30)
  bitmap.writeUInt32LE(rgba.length, 34)
  bitmap.writeUInt32LE(0x00ff0000, 54)
  bitmap.writeUInt32LE(0x0000ff00, 58)
  bitmap.writeUInt32LE(0x000000ff, 62)
  bitmap.writeUInt32LE(0xff000000, 66)
  bitmap.writeUInt32LE(0x73524742, 70)
  for (let index = 0; index < rgba.length; index += 4) {
    bitmap[offset + index] = rgba[index + 2]!
    bitmap[offset + index + 1] = rgba[index + 1]!
    bitmap[offset + index + 2] = rgba[index]!
    bitmap[offset + index + 3] = rgba[index + 3]!
  }
  return new Bun.Image(bitmap)
}
