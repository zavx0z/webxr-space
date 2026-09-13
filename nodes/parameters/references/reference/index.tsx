/**
ReferenceParameter соединяет публичный ReferenceField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {ReferenceField} from "@zavx0z/ui/fields/reference-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {ReferenceParameterProps} from "./contract/input.ts"

export type {ReferenceParameterProps} from "./contract/input.ts"

/**
Авторский контракт ReferenceParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property value - Идентификатор выбранного объекта с подписью либо null.

@property [onPick] - Запрашивает выбор у приложения; новый объект не создаётся локально.
*/
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
