/**
MatrixParameter соединяет публичный MatrixField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {MatrixField, type MatrixFieldProps} from "@zavx0z/ui/fields/matrix-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт MatrixParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property value - Квадратная числовая матрица размером 2, 3 или 4.
*/
export type MatrixParameterProps = ParameterBaseProps & Omit<MatrixFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function MatrixParameter(props: MatrixParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    kind="matrix"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <MatrixField
      value={props.value}
      step={props.step}
      density={props.density ?? "compact"}
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

export type MatrixParameterComponent = FunctionComponent<MatrixParameterProps>
