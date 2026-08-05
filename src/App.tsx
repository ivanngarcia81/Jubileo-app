/**
 * Cascarón provisional. Las pantallas se construyen a partir del contrato
 * visual de design/movil.html y design/escritorio.html; todavía no existen.
 * Esto solo comprueba que los tokens llegan a las utilidades de Tailwind.
 */
export function App() {
  return (
    <main className="bg-gris text-texto font-sans min-h-dvh p-gap">
      <h1 className="font-serif text-h1">Jubileo</h1>
      <p className="text-texto-2 text-dato mt-1">presupuesto cheque a cheque</p>
    </main>
  )
}
