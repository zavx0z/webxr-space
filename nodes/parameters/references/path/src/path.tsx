/**
PathParameter соединяет публичный PathField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {PathField, type PathFieldProps} from "@zavx0z/ui/fields/path-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт PathParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property [onBrowse] - Запрашивает действие приложения; компонент не открывает файловую систему.
*/
export type PathParameterProps = ParameterBaseProps & Omit<PathFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

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

export type PathParameterComponent = FunctionComponent<PathParameterProps>
