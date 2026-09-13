/**
CollectionParameter соединяет публичный CollectionField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {CollectionField} from "@zavx0z/ui/fields/collection-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {CollectionParameterProps} from "./contract/input.ts"

export type {CollectionParameterProps} from "./contract/input.ts"

/**
Авторский контракт CollectionParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property items - Внешний список; компонент не сохраняет его локальную копию.

@property [onMove] - Запрашивает перестановку элемента; приложение публикует новый порядок.
*/
export function CollectionParameter(props: CollectionParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
    kind="collection"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <CollectionField
      items={props.items}
      selectedId={props.selectedId}
      visibleRows={props.visibleRows}
      emptyLabel={props.emptyLabel}
      density="compact"
      disabled={props.disabled}
      readOnly={props.readOnly}
      title={props.connected === true ? undefined : props.title}
      style={css`
        width: 0;
        min-width: 0;
        flex-grow: 1;
        --field-label-width: 18px;
      `}
      onSelect={props.onSelect}
      onAdd={props.onAdd}
      onRemove={props.onRemove}
      onMove={props.onMove}
    />
  </ParameterLayout>
}
