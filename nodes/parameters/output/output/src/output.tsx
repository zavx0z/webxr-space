/**
OutputParameter соединяет публичный текстовый вывод с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Показывает значение только для чтения; направление соединения задаётся у Socket.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import type {NodeJsonValue} from "@nodes/tree"
import {ParameterOutput} from "../../../shared/output/src/output.tsx"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт OutputParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property value - Отображается как текст или JSON; не изменяется этим компонентом.
*/
export type OutputParameterProps = ParameterBaseProps & Readonly<{value: NodeJsonValue}>

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

export type OutputParameterComponent = FunctionComponent<OutputParameterProps>
