/**
SwitchParameter соединяет публичный SwitchField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {SwitchField, type SwitchFieldProps} from "@zavx0z/ui/fields/switch-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {ParameterBaseProps} from "../../shared/src/contracts.ts"

/**
Авторский контракт SwitchParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property onChange - Запрашивает новое checked без записи во внешний Store.
*/
export type SwitchParameterProps = ParameterBaseProps & Omit<SwitchFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function SwitchParameter(props: SwitchParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
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
      title={props.connected === true ? undefined : props.title}
      style={css`
        width: 0;
        min-width: 0;
        flex-grow: 1;
        --field-label-width: 18px;
      `}
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export type SwitchParameterComponent = FunctionComponent<SwitchParameterProps>
