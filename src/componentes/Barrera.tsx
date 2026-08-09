import { Component, type ReactNode } from 'react'

/**
 * La barrera de errores.
 *
 * Sin esto, una excepción al dibujar desmonta el árbol entero y deja **la
 * pantalla en blanco**: la peor falla posible para este público. Alguien parado
 * en el estacionamiento del trabajo, decidiendo si le alcanza para el súper, no
 * abre la consola del navegador — cierra la app y no vuelve.
 *
 * Y no basta con decir "algo se rompió": hay que dar la salida. La causa más
 * probable de que la app truene al abrir es una **copia local escrita por una
 * versión anterior** —el campo que el código de hoy espera no estaba ayer— y esa
 * el usuario sí la puede tirar. Por eso el botón principal borra la copia y
 * recarga, no solo recarga: recargar sobre la misma copia rota vuelve a
 * reventar, y entonces la app está muerta para siempre en ese aparato.
 *
 * Va como clase porque los ganchos de React no pueden atrapar errores de
 * dibujado: `componentDidCatch` no tiene equivalente en función.
 */

export class Barrera extends Component<
  { children: ReactNode },
  { fallo: Error | null }
> {
  override state: { fallo: Error | null } = { fallo: null }

  static getDerivedStateFromError(fallo: Error) {
    return { fallo }
  }

  override componentDidCatch(fallo: Error) {
    // A la consola también: si el usuario nos manda una captura, el mensaje de
    // abajo dice qué pasó, y aquí queda el rastro completo.
    console.error('Jubileo se cayó al dibujar:', fallo)
  }

  private async empezarDeNuevo() {
    try {
      const { olvidarTodo } = await import('../datos/cache')
      await olvidarTodo()
    } catch {
      // Si ni eso se puede, se recarga de todos modos.
    }
    location.reload()
  }

  override render() {
    if (!this.state.fallo) return this.props.children
    return (
      <main className="bg-gris text-texto font-sans grid min-h-dvh place-items-center px-6">
        <div className="w-full max-w-[26rem] text-center">
          <h1 className="font-serif text-cifra leading-[1.15]">Algo se rompió de nuestro lado</h1>
          <p className="text-texto-2 mt-3 text-cuerpo leading-[1.55]">
            Tu presupuesto está a salvo en el servidor: esto es la app, no tus números. Casi
            siempre se arregla borrando la copia que este aparato tiene guardada.
          </p>
          <button
            type="button"
            onClick={() => void this.empezarDeNuevo()}
            className="bg-teal text-tinta-teal mt-6 min-h-11 w-full rounded-btn text-cuerpo font-bold"
          >
            Borrar la copia y volver a abrir
          </button>
          <p className="text-texto-2 mt-4 text-menor leading-[1.5]">
            Si vuelve a pasar, avísanos y dinos qué estabas haciendo.
          </p>
          <p className="text-texto-2 mt-3 text-rotulo break-words opacity-70">
            {this.state.fallo.message}
          </p>
        </div>
      </main>
    )
  }
}
