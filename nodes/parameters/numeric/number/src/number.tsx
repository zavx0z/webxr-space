/**
NumberParameter соединяет публичный NumberField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {NumberField, type NumberFieldProps} from "@zavx0z/ui/fields/number-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт NumberParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property [softMin] - Мягкая нижняя граница dragging; жёсткая валидация задаётся min.

@property [softMax] - Мягкая верхняя граница dragging; жёсткая валидация задаётся max.
*/
export type NumberParameterProps = ParameterBaseProps & Omit<NumberFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

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
      title={props.connected === true ? undefined : props.title}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export type NumberParameterComponent = FunctionComponent<NumberParameterProps>
