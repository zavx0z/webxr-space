/**
 * Regression fixture for the former CodeEditor flex minimum interaction.
 * Expected widths: 42 + 478 = 520, with no horizontal overflow.
 * Renderer must freeze the first item and give the exact remainder to the second.
 */
export function CodeEditorFlexMinimumFixture() {
  return <div
    style={css`
      display: flex;
      width: 520px;
      height: 50px;
      overflow: auto;
    `}
  >
    <div
      style={css`
        width: 42px;
        min-width: 42px;
      `}
    />
    <div
      style={css`
        width: 520px;
        min-width: 0;
      `}
    />
  </div>
}
