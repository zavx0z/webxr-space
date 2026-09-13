/**
TextParameter соединяет публичный TextField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {TextField} from "@zavx0z/ui/fields/text-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {TextParameterProps} from "./contract/input.ts"

export type {TextParameterProps} from "./contract/input.ts"

/**
Авторский контракт TextParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property value - Текущее строковое значение; изменение публикуется через onInput/onChange.
*/
export function TextParameter(props: TextParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
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
