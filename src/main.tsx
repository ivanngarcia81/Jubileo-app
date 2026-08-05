import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilos/tema.css'
import { App } from './App'

const raiz = document.getElementById('raiz')
if (!raiz) throw new Error('No se encontró el elemento #raiz en index.html')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
