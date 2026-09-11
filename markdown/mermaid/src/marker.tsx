import {useContext} from "@zavx0z/component"
import {Arrow} from "@webxr/nodes/markers/arrow"
import type {MarkerProps} from "@webxr/nodes/markers"
import {MermaidHorizontal} from "./graph-context.ts"

/**
Настраивает {@link Arrow} по направлению диаграммы из {@link MermaidHorizontal}.
Горизонтальная схема использует открытый наконечник, вертикальная — заполненный;
размеры и смещение задаются в CSS px контракта {@link Arrow}.

@param props - Контекст конца связи из {@link MarkerProps}; позиционирование
и ориентацию предоставляет владелец связи. Начальный и конечный наконечники
вертикальной схемы получают разные reference offsets.
*/
export function MermaidMarker(props: MarkerProps) {
  const horizontal = useContext(MermaidHorizontal)
  const start = props.context.side === "start"
  return <Arrow
    context={props.context}
    variant={horizontal ? "open" : "filled"}
    length={horizontal ? 9 : start ? 11.5 : 10.5}
    width={horizontal ? 8 : start ? 14 : 14 * 10.5 / 11.5}
    offset={horizontal ? 0 : start ? 3 : 4 * 10.5 / 11.5}
  />
}
