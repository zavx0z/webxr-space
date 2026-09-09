/**
CheckboxParameter соединяет публичный CheckboxField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {CheckboxField, type CheckboxFieldProps} from "@zavx0z/ui/fields/checkbox-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт CheckboxParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property [indeterminate] - Смешанное отображение; checked остаётся логическим значением.
*/
export type CheckboxParameterProps = ParameterBaseProps & Omit<CheckboxFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function CheckboxParameter(props: CheckboxParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
    kind="checkbox"
    fieldBeforeLabel
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
      title={props.labelHidden === true && props.connected !== true ? props.title : undefined}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export type CheckboxParameterComponent = FunctionComponent<CheckboxParameterProps>
