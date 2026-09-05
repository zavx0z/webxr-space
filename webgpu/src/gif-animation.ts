/** Native decoding owns GIF compositing, disposal and frame metadata. */
export type GifDecoder = {
  tracks: {
    ready: Promise<unknown>
    selectedTrack: {frameCount: number; repetitionCount: number} | null
  }
  decode(options: {frameIndex: number; completeFramesOnly: true}): Promise<{image: VideoFrame}>
  close(): void
}

export type GifDecoderConstructor = {
  new(options: {type: string; data: ArrayBuffer; preferAnimation: boolean}): GifDecoder
  isTypeSupported(type: string): Promise<boolean>
}

type Timer = ReturnType<typeof setTimeout> | number

type GifAnimationOptions = {
  createDecoder(): GifDecoder
  present(frame: VideoFrame): void
  observed(): boolean
  failed(error: unknown): void
  now?: () => number
  schedule?: (callback: () => void, delay: number) => Timer
  cancel?: (timer: Timer) => void
}

/** One decoded frame at a time; presentation uses the existing Browser frame loop. */
export class GifAnimation {
  #decoder: GifDecoder | null = null
  #timer: Timer | null = null
  #generation = 0
  #ended = false
  #active = false
  #decoding = false
  #nextIndex = 0
  #repeat = 0
  #deadline = 0
  #remainingDelay = 0
  readonly #options: GifAnimationOptions

  constructor(options: GifAnimationOptions) {
    this.#options = options
  }

  start(): void {
    if (this.#active || this.#ended) return
    try {
      if (this.#decoder === null) {
        ++this.#generation
        this.#decoder = this.#options.createDecoder()
      }
      this.#active = true
      this.#deadline = this.#now() + this.#remainingDelay
      this.#schedule()
    } catch (error) {
      this.#ended = true
      this.stop()
      this.#options.failed(error)
    }
  }

  /** Suspends decoding while retaining the frame cursor and remaining delay. */
  pause(): void {
    if (!this.#active) return
    this.#active = false
    this.#remainingDelay = Math.max(0, this.#deadline - this.#now())
    if (this.#timer !== null) (this.#options.cancel ?? clearTimeout)(this.#timer)
    this.#timer = null
  }

  stop(): void {
    this.pause()
    ++this.#generation
    this.#decoder?.close()
    this.#decoder = null
    this.#decoding = false
    this.#nextIndex = 0
    this.#repeat = 0
    this.#remainingDelay = 0
  }

  #now(): number {
    return (this.#options.now ?? (() => performance.now()))()
  }

  #schedule(): void {
    if (!this.#active || this.#decoding || this.#timer !== null || this.#decoder === null) return
    const delay = Math.max(0, this.#deadline - this.#now())
    if (delay === 0) {
      void this.#decodeNext()
      return
    }
    this.#timer = (this.#options.schedule ?? setTimeout)(() => {
      this.#timer = null
      void this.#decodeNext()
    }, delay)
  }

  async #decodeNext(): Promise<void> {
    const decoder = this.#decoder
    if (decoder === null || !this.#active || this.#decoding) return
    const generation = this.#generation
    this.#decoding = true
    try {
      await decoder.tracks.ready
      if (generation !== this.#generation || !this.#active) return
      const track = decoder.tracks.selectedTrack
      if (track === null || track.frameCount < 1) throw new Error("GIF has no image frames")
      const index = this.#nextIndex
      const {image} = await decoder.decode({frameIndex: index, completeFramesOnly: true})
      let ended = false
      try {
        if (generation !== this.#generation || !this.#active) return
        const duration = Math.max(10, (image.duration ?? 100_000) / 1000)
        ended = index + 1 === track.frameCount && (track.frameCount === 1 || this.#repeat >= track.repetitionCount)
        this.#nextIndex = (index + 1) % track.frameCount
        if (this.#nextIndex === 0) this.#repeat++
        this.#deadline = Math.max(this.#deadline + duration, this.#now() + 1)
        this.#remainingDelay = Math.max(0, this.#deadline - this.#now())
        this.#options.present(image)
      } finally {
        image.close()
      }
      if (generation !== this.#generation) return
      if (ended) {
        this.#ended = true
        this.stop()
        return
      }
      if (!this.#options.observed()) this.pause()
    } catch (error) {
      if (generation !== this.#generation) return
      this.#ended = true
      this.stop()
      this.#options.failed(error)
    } finally {
      if (generation === this.#generation) {
        this.#decoding = false
        this.#schedule()
      }
    }
  }
}
