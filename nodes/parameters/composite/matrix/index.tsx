/**
MatrixParameter соединяет публичный MatrixField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {MatrixField} from "@zavx0z/ui/fields/matrix-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {MatrixParameterProps} from "./contract/input.ts"

export type {MatrixParameterProps} from "./contract/input.ts"

/**
Авторский контракт MatrixParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property value - Квадратная числовая матрица размером 2, 3 или 4.
*/
export function MatrixParameter(props: MatrixParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
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
