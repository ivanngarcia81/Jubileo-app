import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos/tema.css'
import { App } from './App'
import { Barrera } from './componentes/Barrera'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('No se encontró el elemento #raiz en index.html')

// La barrera envuelve TODO y va aquí, no dentro de `App`: un error en el propio
// `App` —que es donde se leen los datos— también tiene que atraparse.
createRoot(raiz).render(
  <StrictMode>
    <Barrera>
      <App />
    </Barrera>
  </StrictMode>,
)
