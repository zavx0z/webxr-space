/**
ColorParameter соединяет публичный ColorField с endpoint-композицией ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {ColorField, type ColorFieldProps} from "@zavx0z/ui/fields/color-field"
import {ParameterLayout} from "../../../shared/layout/src/layout.tsx"
import type {ParameterBaseProps} from "../../../shared/src/contracts.ts"

/**
Авторский контракт ColorParameter; общие endpoint-свойства описаны в ParameterBaseProps.

@property value - Одно RGBA-значение; всплывающий picker остаётся UI-композицией.

@property [open] - Управляемая видимость picker без изменения значения.
*/
export type ColorParameterProps = ParameterBaseProps & Omit<ColorFieldProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function ColorParameter(props: ColorParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
    kind="color"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ColorField
      value={props.value}
      open={props.open}
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
      onOpenChange={props.onOpenChange}
    />
  </ParameterLayout>
}

export type ColorParameterComponent = FunctionComponent<ColorParameterProps>
