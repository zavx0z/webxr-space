import {CheckboxField} from "@ui/components/fields/checkbox-field"
import {CollectionField} from "@ui/components/fields/collection-field"
import {ColorField} from "@ui/components/fields/color-field"
import {CycleField} from "@ui/components/fields/cycle-field"
import {MatrixField} from "@ui/components/fields/matrix-field"
import {NumberField} from "@ui/components/fields/number-field"
import {OptionGroupField} from "@ui/components/fields/option-group-field"
import {PathField} from "@ui/components/fields/path-field"
import {ReferenceField} from "@ui/components/fields/reference-field"
import {SelectField} from "@ui/components/fields/select-field"
import {SliderField} from "@ui/components/fields/slider-field"
import {SwitchField} from "@ui/components/fields/switch-field"
import {TextField} from "@ui/components/fields/text-field"
import {VectorField} from "@ui/components/fields/vector-field"
import {
  ParameterLayout,
  ParameterOutput,
  type CheckboxParameterProps,
  type CollectionParameterProps,
  type ColorParameterProps,
  type CycleParameterProps,
  type MatrixParameterProps,
  type NumberParameterProps,
  type OptionGroupParameterProps,
  type OutputParameterProps,
  type PathParameterProps,
  type ReferenceParameterProps,
  type SelectParameterProps,
  type SliderParameterProps,
  type SwitchParameterProps,
  type TextParameterProps,
  type VectorParameterProps,
} from "./parameter.tsx"

const compactFieldStyle: CssStyle = css`
  width: 0;
  min-width: 0;
  min-height: 20px;
  flex-grow: 1;
  --control-height-medium: 20px;
  --control-height-large: 20px;
  --text-field-height: 20px;
  --number-field-height: 20px;
  --slider-field-height: 20px;
  --field-label-width: 18px;
`

export function TextParameter(props: TextParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="text"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <TextField
      value={props.value}
      type={props.type}
      placeholder={props.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function NumberParameter(props: NumberParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="number"
    fieldOwnsLabel
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <NumberField
      label={props.label}
      value={props.value}
      min={props.min}
      max={props.max}
      softMin={props.softMin}
      softMax={props.softMax}
      step={props.step}
      precision={props.precision}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={css`
        ${compactFieldStyle}

        --field-label-width: 58%;
        --number-field-label-padding: 2px 5px;
      `}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function SliderParameter(props: SliderParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="slider"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <SliderField
      value={props.value}
      min={props.min}
      max={props.max}
      step={props.step}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function CheckboxParameter(props: CheckboxParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="checkbox"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CheckboxField
      checked={props.checked}
      indeterminate={props.indeterminate}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function SwitchParameter(props: SwitchParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="switch"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <SwitchField
      checked={props.checked}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function SelectParameter(props: SelectParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="select"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <SelectField
      value={props.value}
      options={props.options}
      state={props.state}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function CycleParameter(props: CycleParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="cycle"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CycleField
      value={props.value}
      options={props.options}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      open={props.open}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
      onOpenChange={props.onOpenChange}
    />
  </ParameterLayout>
}

export function OptionGroupParameter(props: OptionGroupParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="option-group"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <OptionGroupField
      value={props.value}
      options={props.options}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function ColorParameter(props: ColorParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="color"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ColorField
      value={props.value}
      open={props.open}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
      onOpenChange={props.onOpenChange}
    />
  </ParameterLayout>
}

export function VectorParameter(props: VectorParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="vector"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <VectorField
      value={props.value}
      axes={props.axes}
      min={props.min}
      max={props.max}
      step={props.step}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function MatrixParameter(props: MatrixParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="matrix"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <MatrixField
      value={props.value}
      step={props.step}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export function PathParameter(props: PathParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="path"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <PathField
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      density="compact"
      title={props.title}
      browseTitle={props.browseTitle}
      style={compactFieldStyle}
      onInput={props.onInput}
      onChange={props.onChange}
      onBrowse={props.onBrowse}
    />
  </ParameterLayout>
}

export function ReferenceParameter(props: ReferenceParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="reference"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ReferenceField
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      density="compact"
      title={props.title}
      style={compactFieldStyle}
      onActivate={props.onActivate}
      onPick={props.onPick}
      onClear={props.onClear}
    />
  </ParameterLayout>
}

export function CollectionParameter(props: CollectionParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="collection"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CollectionField
      items={props.items}
      selectedId={props.selectedId}
      visibleRows={props.visibleRows}
      emptyLabel={props.emptyLabel}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.title}
      style={compactFieldStyle}
      onSelect={props.onSelect}
      onAdd={props.onAdd}
      onRemove={props.onRemove}
      onMove={props.onMove}
    />
  </ParameterLayout>
}

export function OutputParameter(props: OutputParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="output"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ParameterOutput value={props.value} />
  </ParameterLayout>
}
