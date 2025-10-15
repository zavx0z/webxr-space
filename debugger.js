import { Actor } from "@metafor/actor"
const css = String.raw
const html = String.raw

class Debugger extends HTMLElement {
  constructor() {
    Actor.break()
    console.log(Actor.isLocked)

    super()

    this.innerHTML = html`
      <style>
        ${style}
      </style>
      <div class="toolbar" part="toolbar">
        <button id="play" title="Пуск/Пауза">▶</button>
        <button id="step" title="Шаг вперёд">⏭</button>
      </div>
    `
  }

  connectedCallback() {
    const playBtn = this.querySelector("#play")
    const stepBtn = this.querySelector("#step")
    if (!playBtn || !stepBtn) return

    if (Actor.isLocked) playBtn.textContent = "⏸"
    else playBtn.textContent = "▶"

    playBtn?.addEventListener("click", () => {
      if (!Actor.isLocked) {
        Actor.break()
        playBtn.textContent = "⏸"
      } else {
        Actor.resume()
        playBtn.textContent = "▶"
      }
    })

    stepBtn?.addEventListener("click", () => {
      Actor.step()
    })
  }

  disconnectedCallback() {}
}

const style = css`
  meta-debugger {
    position: fixed;
    left: 50%;
    top: 10px;
    transform: translateX(-50%);
    z-index: 110;
    color: #e6e6e6;
    font: 12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    width: max-content;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: #1f1f1f;
    border: 1px solid #2a2a2a;
    border-bottom: none;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    width: max-content;
  }

  .toolbar button {
    background: #2b2b2b;
    color: #e6e6e6;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    padding: 4px 8px;
    width: 40px;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.06s ease, box-shadow 0.15s ease;
  }

  .toolbar button {
    cursor: pointer;
  }

  .toolbar button:hover {
    background: #343434;
    box-shadow: 0 0 0 1px #3f3f3f inset;
  }

  .toolbar button:active {
    transform: translateY(1px) scale(0.98);
    background: #272727;
  }

  .toolbar button:focus-visible {
    outline: 2px solid #4b7fff;
    outline-offset: 2px;
  }

  .toolbar button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`
if (!customElements.get("meta-debugger")) customElements.define("meta-debugger", Debugger)
