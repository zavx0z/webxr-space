/**
CycleParameter соединяет публичный CycleField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {CycleField, type CycleFieldProps} from "@zavx0z/ui/fields/cycle-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт CycleParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property [open] - Управляемое состояние списка; onOpenChange возвращает запрос изменения.
*/
export type CycleParameterProps = ParameterBaseProps & Omit<CycleFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

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

export type CycleParameterComponent = FunctionComponent<CycleParameterProps>
