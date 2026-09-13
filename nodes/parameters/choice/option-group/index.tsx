/**
OptionGroupParameter соединяет публичный ToggleButtonGroup с композицией сокетов ноды.
Подключённый параметр сохраняет подпись и Socket, скрывая собственное поле.
Значение и обработчики принадлежат вызывающей стороне; компонент не создаёт Store.

@packageDocumentation
*/

import {ToggleButtonGroup} from "@zavx0z/ui/buttons/toggle-button-group"
import {ParameterLayout} from "../../shared/layout/index.tsx"
import type {OptionGroupParameterProps} from "./contract/input.ts"

export type {OptionGroupParameterProps} from "./contract/input.ts"

/**
Авторский контракт OptionGroupParameter; общие свойства сокетов описаны в ParameterBaseProps.

@property options - Полный набор вариантов; в каждый момент выбран одно строковое значение.
*/
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
