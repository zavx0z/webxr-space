/**
PathParameter соединяет публичный PathField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {PathField} from "@zavx0z/ui/fields/path-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {PathParameterProps} from "./contract/input.ts"

export type {PathParameterProps} from "./contract/input.ts"

/**
Авторский контракт PathParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property [onBrowse] - Запрашивает действие приложения; компонент не открывает файловую систему.
*/
export function PathParameter(props: PathParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
    kind="path"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <PathField
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled}
      readOnly={props.readOnly}
      density="compact"
      title={props.connected === true ? undefined : props.title}
      browseTitle={props.browseTitle}
      style={css`
        width: 0;
        min-width: 0;
        flex-grow: 1;
        --field-label-width: 18px;
      `}
      onInput={props.onInput}
      onChange={props.onChange}
      onBrowse={props.onBrowse}
    />
  </ParameterLayout>
}
