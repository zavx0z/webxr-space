/**
OptionGroupParameter соединяет публичный ToggleButtonGroup с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import type {FunctionComponent} from "@zavx0z/component"
import {ToggleButtonGroup, type ToggleButtonGroupProps} from "@zavx0z/ui/buttons/toggle-button-group"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {ParameterBaseProps} from "../../shared/src/contracts.ts"

/**
Авторский контракт OptionGroupParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property options - Полный набор вариантов; в каждый момент выбран одно строковое значение.
*/
export type OptionGroupParameterProps = ParameterBaseProps & Omit<ToggleButtonGroupProps, "label" | "disabled" | "readOnly" | "title" | "style">

export function OptionGroupParameter(props: OptionGroupParameterProps) {
  return <ParameterLayout
    id={props.id}
    nodeId={props.nodeId}
    label={props.label}
    labelHidden={props.labelHidden}
    spacingBefore={props.spacingBefore}
    kind="option-group"
    sockets={props.sockets}
    connected={props.connected}
    hidden={props.hidden}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onSocketActivate={props.onSocketActivate}
  >
    <ToggleButtonGroup
      value={props.value}
      options={props.options}
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
      onChange={props.onChange}
    />
  </ParameterLayout>
}

export type OptionGroupParameterComponent = FunctionComponent<OptionGroupParameterProps>
