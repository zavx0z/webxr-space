/**
CycleParameter соединяет публичный CycleField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {CycleField} from "@zavx0z/ui/fields/cycle-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {CycleParameterProps} from "./contract/input.ts"

export type {CycleParameterProps} from "./contract/input.ts"

/**
Авторский контракт CycleParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property [open] - Управляемое состояние списка; onOpenChange возвращает запрос изменения.
*/
export function CycleParameter(props: CycleParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
    kind="cycle"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CycleField
      value={props.value}
      options={props.options}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      open={props.open}
      title={props.connected === true ? undefined : props.title}
      style={css`
        width: 0;
        min-width: 0;
        flex-grow: 1;
        --field-label-width: 18px;
      `}
      onChange={props.onChange}
      onOpenChange={props.onOpenChange}
    />
  </ParameterLayout>
}
