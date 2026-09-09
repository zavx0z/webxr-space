/**
ReferenceParameter соединяет публичный ReferenceField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {ReferenceField, type ReferenceFieldProps} from "@zavx0z/ui/fields/reference-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт ReferenceParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property value - Выбранная identity с подписью либо null.

@property [onPick] - Запрашивает выбор у приложения; новый объект не создаётся локально.
*/
export type ReferenceParameterProps = ParameterBaseProps & Omit<ReferenceFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function ReferenceParameter(props: ReferenceParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
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
      title={props.connected === true ? undefined : props.title}
      style={css`
        width: 0;
        min-width: 0;
        flex-grow: 1;
        --field-label-width: 18px;
      `}
      onActivate={props.onActivate}
      onPick={props.onPick}
      onClear={props.onClear}
    />
  </ParameterLayout>
}

export type ReferenceParameterComponent = FunctionComponent<ReferenceParameterProps>
