/**
SelectParameter соединяет публичный SelectField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {SelectField, type SelectFieldProps} from "@zavx0z/ui/fields/select-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {ParameterBaseProps} from "../../shared/src/contracts.ts"

/**
Авторский контракт SelectParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property [state] - Передаёт особое состояние выбора публичному SelectField.
*/
export type SelectParameterProps = ParameterBaseProps & Omit<SelectFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function SelectParameter(props: SelectParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
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
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.connected === true ? undefined : props.title}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export type SelectParameterComponent = FunctionComponent<SelectParameterProps>
