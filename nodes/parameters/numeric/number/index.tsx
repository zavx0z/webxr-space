/**
NumberParameter соединяет публичный NumberField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {NumberField} from "@zavx0z/ui/fields/number-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {NumberParameterProps} from "./contract/input.ts"

export type {NumberParameterProps} from "./contract/input.ts"

/**
Авторский контракт NumberParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property [softMin] - Мягкая нижняя граница перетаскивания; жёсткая валидация задаётся min.

@property [softMax] - Мягкая верхняя граница перетаскивания; жёсткая валидация задаётся max.
*/
export function NumberParameter(props: NumberParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
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
      label={props.labelHidden === true ? undefined : props.label}
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
