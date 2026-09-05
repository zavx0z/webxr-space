import {useRef, useState} from "@zavx0z/component"
import {Space} from "@zavx0z/space/staging/space"
import {ViewPoint} from "@zavx0z/space/cameras/view-point"
import {Display} from "@zavx0z/space/portals/display"
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
  return <Space background="#101722">
    <ViewPoint
      x={0}
      y={-800}
      z={0}
      targetX={0}
      targetY={0}
      targetZ={0}
      far={3000}
    />
    <Mesh x={280} y={200} z={-60}>
      <Geometry kind="box" width={100} height={100} depth={100} />
      <Material kind="basic" color="#4166af" />
    </Mesh>
    <Display
      viewportWidth={360}
      viewportHeight={300}
      quaternionX={Math.SQRT1_2}
      quaternionW={Math.SQRT1_2}
    >
      <DisplayContent />
    </Display>
    <HUD>
      <HUDContent />
    </HUD>
  </Space>
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
