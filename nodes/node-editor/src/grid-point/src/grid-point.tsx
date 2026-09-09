export type GridPointValue = Readonly<{id: string; x: number; y: number; major: boolean}>

export function GridPoint(props: Readonly<{point: GridPointValue}>) {
  return <span
    data-major={props.point.major ? "true" : undefined}
    style={css`
      box-sizing: border-box;
      position: absolute;
      display: block;
      left: ${props.point.x}px;
      top: ${props.point.y}px;
      width: ${props.point.major ? "2px" : "1px"};
      height: ${props.point.major ? "2px" : "1px"};
      border-radius: 1px;
      background: ${props.point.major ? "#484848" : "#353535"};
    `}
  ></span>
}
