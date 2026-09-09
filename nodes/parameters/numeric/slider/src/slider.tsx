/**
SliderParameter соединяет публичный SliderField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {SliderField, type SliderFieldProps} from "@zavx0z/ui/fields/slider-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт SliderParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property min - Обязательная нижняя граница диапазона.

@property max - Обязательная верхняя граница диапазона.
*/
export type SliderParameterProps = ParameterBaseProps & Omit<SliderFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function SliderParameter(props: SliderParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
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
      density={props.density ?? "compact"}
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.connected === true ? undefined : props.title}
      style={css`
        width: 0;
        min-width: 0;
        flex-grow: 1;
        --field-label-width: 18px;
      `}
      onInput={props.onInput}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export type SliderParameterComponent = FunctionComponent<SliderParameterProps>
