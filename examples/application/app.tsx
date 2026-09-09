import {useRef, useState} from "@zavx0z/component"
import {ViewPoint} from "@zavx0z/space/cameras/view-point"
import {HUD} from "@zavx0z/space/portals/hud"
import {Mesh} from "@zavx0z/space/shapes/mesh"
import {Geometry} from "@zavx0z/space/shapes/geometry"
import {Material} from "@zavx0z/space/shaders/material"

export function Counter() {
  const [count, setCount] = useState(0)
  const owner = useRef<HTMLElement | null>(null)
  const move = () => {
    const element = owner.current
    if (element === null) return
    const target = element.ownerDocument?.getElementById(
      element.parentElement?.id === "display-content" ? "hud-content" : "display-content",
    )
    target?.appendChild(element)
  }
  return <section
    ref={element => { owner.current = element }}
    aria-label="Счётчик"
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 300px;
      padding: 16px;
      background: #253146;
      color: #ffffff;
      border-radius: 8px;
      font-size: 16px;

    `}
  >
    <button
      onClick={() => setCount(count + 1)}
      style={css`
        padding: 8px;
        background: #4166af;
        color: #ffffff;
      `}
    >
      Нажатий: {count}
    </button>
    <button
      onClick={move}
      style={css`
        padding: 8px;
        background: #4166af;
        color: #ffffff;
      `}
    >
      Перенести в HUD / Display
    </button>
    <div
      aria-label="Прокрутка"
      style={css`
        height: 90px;
        overflow: auto;
      `}
    >
      <p style={css`
        height: 250px;
        margin: 0;
      `}>
        Прокрутите область. Счётчик и события сохраняются при переносе.
      </p>
    </div>
  </section>
}

/** The application owns its complete semantic root, camera and projection roots. */
export function App() {
  return <xr-space background="#101722">
    <ViewPoint
      position={{x: 0, y: -800, z: 0}}
      target={{x: 0, y: 0, z: 0}}
      far={3000}
    />
    <Mesh position={{x: 280, y: 200, z: -60}}>
      <Geometry kind="box" width={100} height={100} depth={100} />
      <Material kind="basic" color="#4166af" />
    </Mesh>
    <display
      width={360}
      height={300}
      style={css`
        width: 1361px;
        height: 1134px;
        rotate: x 90deg;
      `}
    >
      <DisplayContent />
    </display>
    <HUD>
      <HUDContent />
    </HUD>
  </xr-space>
}

export function DisplayContent() {
  return <div id="display-content">
    <Counter />
  </div>
}

export function HUDContent() {
  return <section style={css`
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 340px;
        padding: 20px;
        color: #ffffff;
        font-size: 18px;
      `}>
        <h1>WebXR · одно приложение</h1>
        <div id="hud-content" />
      </section>
}
