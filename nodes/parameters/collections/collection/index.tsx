/**
CollectionParameter соединяет публичный CollectionField с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {CollectionField, type CollectionFieldProps} from "@zavx0z/ui/fields/collection-field"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {ParameterBaseProps} from "../../shared/src/contracts.ts"

/**
Авторский контракт CollectionParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property items - Внешний список; компонент не сохраняет его локальную копию.

@property [onMove] - Запрашивает перестановку элемента; приложение публикует новый порядок.
*/
export type CollectionParameterProps = ParameterBaseProps & Omit<CollectionFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

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

export type CollectionParameterComponent = FunctionComponent<CollectionParameterProps>
