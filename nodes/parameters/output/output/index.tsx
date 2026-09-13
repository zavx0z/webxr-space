/**
OutputParameter соединяет публичный текстовый вывод с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.
Показывает значение только для чтения; направление соединения задаётся у Socket.

@packageDocumentation
*/

import {ParameterOutput} from "../../shared/output/index.tsx"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {OutputParameterProps} from "./contract/input.ts"

export type {OutputParameterProps} from "./contract/input.ts"

/**
Авторский контракт OutputParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property value - Отображается как текст или JSON; не изменяется этим компонентом.
*/
export function OutputParameter(props: OutputParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
    kind="output"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ParameterOutput
      value={props.value}
      title={props.connected === true ? undefined : props.title}
    />
  </ParameterLayout>
}
