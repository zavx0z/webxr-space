function CapabilityProbe(props: Readonly<{
  checked: boolean
  label: string
  tabIndex: number
}>) {
  return <input
    aria-label={props.label}
    checked={props.checked}
    data-state="ready"
    indeterminate={props.checked}
    onChange={event => {
      event.preventDefault()
      event.currentTarget.value = "next"
      event.currentTarget.showPicker()
    }}
    onClickCapture={event => event.preventDefault()}
    ref={input => input?.focus()}
    style={css`
      color: red;

      &[data-state="ready"][aria-label]:hover {
        opacity: 0.8;
      }
    `}
    tabIndex={props.tabIndex}
    type="checkbox"
  />
}

function NumberCapabilityProbe() {
  return <input
    max={10}
    min={0}
    step={0.5}
    type="number"
    value={4}
  />
}

function RangeCapabilityProbe() {
  return <input
    max={100}
    min={0}
    required={true}
    type="range"
    value={50}
  />
}

function ExtensionProbe(props: Readonly<{path: string}>) {
  return <vector-path
    aria-label="Connection"
    d={props.path}
  />
}

void CapabilityProbe
void ExtensionProbe
void NumberCapabilityProbe
void RangeCapabilityProbe
