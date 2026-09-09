/**
SelectParameter соединяет публичный SelectField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {SelectField, type SelectFieldProps} from "@zavx0z/ui/fields/select-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт SelectParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property [state] - Передаёт exceptional state выбора публичному SelectField.
*/
export type SelectParameterProps = ParameterBaseProps & Omit<SelectFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

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
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.connected === true ? undefined : props.title}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export type SelectParameterComponent = FunctionComponent<SelectParameterProps>
