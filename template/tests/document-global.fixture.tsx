import {useEffect} from "@zavx0z/component"

type Props = Readonly<{
  wait: Promise<void>
  mounted(value: Document): void
  clicked(value: Document): void
}>

function useApplicationDocument() {
  return {document}
}

export function DocumentConsumer(props: Props) {
  const fromHook = useApplicationDocument()
  useEffect(() => { props.mounted(fromHook.document) }, [])
  return <button
    onClick={async () => {
      await props.wait
      const element = document.createElement("span")
      element.textContent = "После ожидания"
      document.documentElement.append(element)
      props.clicked(document)
    }}
  >
    {document.nodeType}
  </button>
}

export function LocalDocument(props: {document: {title: string}}) {
  const document = props.document
  return <div>{document.title}</div>
}

export function DocumentParameter(document: {title: string}) {
  return <div>{document.title}</div>
}

// Вход страницы использует native Document и не выполняется как компонент.
export function readNativeDocument() {
  return document
}
