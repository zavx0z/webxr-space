/**
SliderParameter соединяет публичный SliderField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {SliderField} from "@zavx0z/ui/fields/slider-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {SliderParameterProps} from "./contract/input.ts"

export type {SliderParameterProps} from "./contract/input.ts"

/**
Авторский контракт SliderParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property min - Обязательная нижняя граница диапазона.

@property max - Обязательная верхняя граница диапазона.
*/
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
