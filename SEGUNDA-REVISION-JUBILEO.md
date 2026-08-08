# Segunda revisión — Jubileo app

Commits revisados: `39746ee` → `59a44c4`. Verificado: `tsc -b --noEmit` limpio, 196 pruebas en verde.

**Veredicto: sí mejoró.** Cuatro de los cinco puntos quedaron resueltos, no parchados. Quedan tres
cosas; una es nueva, causada por el arreglo mismo.

**Corrección de la primera revisión.** Allí escribí que en escritorio las pantallas de Presupuesto,
Deudas y Metas arrastraban la `Cabecera` móvil con su flecha y su avatar. **Era falso**:
`cabeceraDe()` solo se le pasa a `Marco`, y `Marco` solo existe en el árbol móvil.

## 1. El arreglo del ancho máximo dejó la barra oscura flotando (nuevo)

El tope se le puso al contenedor que *envuelve* la barra y la banda, no al contenido de adentro. En
un monitor de 2560 px eso deja dos bloques carbón de 1420 centrados con franjas de gris claro de 570
a cada lado. El degradado radial de la banda, posicionado a `88% 120%` de un ancho ahora fijo,
tampoco cae donde debía.

**Arreglo.** Fondo de borde a borde, contenido con tope: el `max-w-app` baja dentro de
`BarraSuperior` y `BandaIndicadores`, y se quita el envoltorio de `App.tsx`. Ojo: la comprobación de
`revisar-pantallas.mjs` mide el primer `.bg-carbon` y exige ≤1440; después del cambio ese elemento
medirá 2560 **a propósito** y la prueba fallaría con el arreglo correcto.

## 2. Los iconos que más se repiten siguen siendo glifos Unicode

`iconos.tsx` quedó bien, pero los iconos de categoría y de movimiento vienen como texto desde la
capa de datos: `mapeo.ts` y `ejemplo.ts` guardan `✦ ◇ ⌂ ⚡ ⛨ ☰ ↓ ·`. Son los peores casos —`⛨` y `☰`
faltan en varias fuentes, `⌂` en casi todas las de Android— y los más repetidos: uno por línea del
presupuesto y uno por movimiento.

**Arreglo.** El campo deja de guardar un carácter y guarda una clave, con su mapa en `iconos.tsx`.

## 3. La barra superior a 880 px, el borde recién creado

En el mockup, 880 es donde la búsqueda **se esconde**. En la app es `panel:flex`, o sea que aparece
desde ahí, y con `min-w-[250px]` no se deja encoger. A 880 cabe raspando. Las medidas nuevas (768,
1024, 1180, 2560) pasan por encima de ese rango.

**Arreglo.** Búsqueda a `ancho:flex`, y agregar 900 px a la lista `ANCHOS`.

## Detalles menores

- `MiSemana`: icono de 15 px dentro de un círculo de 17. Queda pegado al borde.
- `Membresia`: la palomita necesita `shrink-0` y 2–3 px hacia abajo; un SVG no se alinea como un carácter.
- `Resumen`: el `$` quedó como texto mientras sus cinco hermanos son SVG.

## Pendiente de la primera revisión

La dispersión de tokens y el candado en CI, la legibilidad de 17 px en el teléfono, la gráfica con
datos inventados, y los dos árboles renderizando siempre. **El primero debería ser la legibilidad**:
es el único que el cliente sí va a notar.
