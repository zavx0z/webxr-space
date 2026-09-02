function App() {
  return <div>Not a component root</div>
}

const unrelated = {render(_value: unknown) {}}
unrelated.render(<App />)
