import {useSpace} from "@zavx0z/browser"

export function Invalid(props: {enabled: boolean}) {
  if (props.enabled) useSpace(state => state.size)
  return <div />
}
