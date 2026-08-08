# El sistema de listas — lo que hace que se sienta pagada

> **Falta el mockup.** Este documento acompaña a `design-listas-jubileo.html`, que **no está en el
> repo**. `CLAUDE.md` dice que `design/` es el contrato visual y que no se rediseña; sin ese archivo,
> los pasos que dependen de cómo se ve exactamente el sistema están detenidos. Lo que no depende del
> mockup —quitar los controles muertos— ya se hizo.

## El diagnóstico

Lo que se circuló no es estilo, es un **sistema de filas**. Categorías: un árbol con grupos que se
abren y cierran, contador por grupo, hijos con sangría, y tres columnas fijas —gastado, barra,
presupuesto— alineadas en todos los renglones. Movimientos: filas agrupadas por día, con casilla de
revisión, insignia «R» para lo recurrente, píldora de categoría y monto, todo en columnas.

Lo común: **la tarjeta es la sección y las filas viven dentro**. Eso permite comparar diez renglones
sin leer ninguno completo.

## Lo que Jubileo hace hoy

En `ElMes.tsx` cada línea va envuelta en `<Tarjeta>`: su borde, su radio, su relleno. Una pila de
cajitas donde nada se alinea entre renglones, cada barra tiene su propio ancho —dos barras al 60 %
se ven de largo distinto—, no hay encabezados de columna, y caben seis renglones donde caben
dieciséis. Tampoco hay jerarquía: fijos, sobres, deudas y fondos son cuatro listas planas.

## La sensación de producto pagado no viene del tema oscuro

Son cuatro cosas, y ninguna es el color de fondo:

1. **Alineación en columnas** — el ojo recorre una sola línea vertical de números.
2. **Densidad con ritmo** — filas de 44 px, todas iguales, con una hairline en vez de un borde por caja.
3. **Jerarquía real** — grupos con total, contador y estado abierto/cerrado.
4. **Estado en la propia fila** — la insignia, la casilla, el punto de nota. Información sin abrir nada.

El fondo claro se queda: es la regla 3 de los tokens y el tema oscuro sería otra decisión, grande, que
reemplazaría los mockups aprobados.

## El trabajo, en orden

1. **`Fila` y `ListaSeccion` en `base.tsx`.** En grid, no en flex:
   `grid-template-columns: minmax(150px,1fr) 88px minmax(90px,300px) 88px`, `min-height: 44px`,
   hairline abajo salvo la última. `Tarjeta` pasa a ser el contenedor de la sección.
2. **Árbol de grupos en El mes**, con total, contador y abierto/cerrado recordado en `localStorage`.
3. **La barra en columna propia**, mismo carril, 5 px, color por la regla 4: teal bajo 80 %, ámbar de
   80 a 100 %, rojo solo cuando ya se pasó.
4. **`ChipCategoria`** como pieza única; generaliza el `Etiqueta` que hoy solo dice «enfoque».
5. **Movimientos agrupados por día**, con total del día, insignia «R» y píldora.
6. **Estado de revisión**: columna en el esquema con su migración y su prueba SQL, casilla en la fila
   y barra de pendientes con acción en bloque. Es lo que vuelve usable Plaid el día que llegue.
7. **Panel de detalle en escritorio** que sigue a la fila seleccionada. En teléfono se queda la hoja.
8. **Pantallas vacías** con una frase que invite a la acción. Sin Plaid las listas van a estar casi
   vacías, así que la pantalla vacía es parte del diseño premium, no un caso borde.

## Hecho

- **Los controles muertos.** Cuatro botones visibles que no hacían nada y un campo de búsqueda
  decorativo. Un botón muerto destruye más confianza que un borde feo, y en una app de dinero la
  confianza *es* el producto.
