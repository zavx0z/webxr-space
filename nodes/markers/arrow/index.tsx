/**
Открытый или заполненный наконечник для marker slots Link.

Link вычисляет endpoint и единичное направление и передаёт context. Arrow
применяет их к своей фигуре через общий geometry helper; length/width/offset
задают её размеры. Рисуется обычный semantic vector-path того же Document.

@packageDocumentation
*/
import {arrowGeometry} from "../../shared/markers/geometry.ts"
import type {ArrowProps} from "./contract/input.ts"

export type {ArrowProps} from "./contract/input.ts"

/**
Наконечник направлен наружу от конца пути. Положительный offset отступает внутрь пути.

@property context - Положение и состояние от Link; в собственной истории может задаваться явно.
@property variant - Открытый либо заполненный наконечник; по умолчанию open.
@property length - Длина в CSS-пикселях:9 для open,10 для filled.
@property width - Полная ширина:8 для open,12 для filled.
@property offset - Отступ кончика от endpoint внутрь маршрута, по умолчанию0.
*/
export function Arrow(props: ArrowProps) {
  const filled = props.variant === "filled"
  const context = props.context
  const geometry = arrowGeometry(context, {
    length: props.length ?? (filled ? 10 : 9),
    width: props.width ?? (filled ? 12 : 8),
    offset: props.offset ?? 0,
  }, filled)
  return <vector-path
    aria-hidden="true"
    data-link-owner={context.ownerId}
    data-link-arrow={context.side}
    data-marker-kind="arrow"
    data-marker-variant={props.variant ?? "open"}
    d={geometry.d}
    hidden={context.hidden}
    style={css`
      position: absolute;
      display: block;
      left: 0;
      top: 0;
      width: 0;
      height: 0;
      overflow: visible;
      z-index: 2;
      color: ${context.color};
      stroke: ${context.color};
      fill: ${filled ? "currentColor" : "none"};
      stroke-width: ${filled ? 0 : context.selected ? 3.4 : context.strokeWidth}px;
      opacity: ${context.disabled ? .45 : 1};
      pointer-events: none;

      &[hidden] {
        display: none;
      }
    `}
  />
}
