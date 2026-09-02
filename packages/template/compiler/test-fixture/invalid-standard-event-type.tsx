const handleInput = (_event: KeyboardEvent): void => {}

export function InvalidStandardEventType() {
  return <input onInput={handleInput} />
}
