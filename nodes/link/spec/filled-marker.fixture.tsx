/** Минимальное воспроизведение generic fill для маркера, без приватного рисования. */
export function FilledMarkerFixture() {
  return <vector-path
    data-filled-marker-reproduction=""
    d="M 0 0 L 20 10 L 0 20 L 0 0"
    style={css`
      position: absolute;
      width: 0;
      height: 0;
      fill: #ffffff;
      stroke-width: 0;
    `}
  />
}
