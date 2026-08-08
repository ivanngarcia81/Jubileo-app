# Revisión del front end — Jubileo app

Repo revisado: `github.com/ivanngarcia81/Jubileo-app` (rama por defecto, 8 de agosto de 2026).

**Resumen del diagnóstico.** El problema no es el diseño: los mockups de `design/` son buenos y la
lógica está bien construida. El problema es que la implementación se quedó a medio camino entre
"copiar el mockup pixel por pixel" y "hacer una app responsiva". Los mockups son documentos de
presentación: dibujan un teléfono de 352 px y una ventana de escritorio de 1420 px, ambos
centrados. Al pasarlos a React se copiaron los píxeles de adentro y se tiró el marco de afuera — y
ese marco era justamente lo que definía el ancho. El resultado: en cualquier pantalla que no mida
exactamente lo que medía el mockup, la app se estira o se rompe.

Los hallazgos van ordenados por cuánto se ven.

## 1. El escritorio no tiene ancho máximo (el más visible)

`design/escritorio.html` mete todo en `.win{max-width:1420px;margin:0 auto}`. En la app ese
contenedor desapareció: `BarraSuperior`, `BandaIndicadores` y `Resumen` son de borde a borde. En un
monitor de 2560 px la columna central se estira sin límite mientras las laterales quedan clavadas
en 262 px, y el texto de 11.5–13 px flota en líneas larguísimas.

**Arreglo.** Un contenedor único de ancho máximo para las tres piezas, con el valor en los tokens
(`--ancho-max: 1420px`) para que no sea un número suelto.

## 2. El rango 1024–1280 px está roto

`Resumen.tsx` declara `lg:grid-cols-[1fr_262px]` y `xl:grid-cols-[1fr_262px_262px]`, pero tiene
**tres** columnas hijas. Entre 1024 y 1280 la tercera se cae a la fila 2 y se estira a ~700 px.

El mockup ya lo resolvía: a ≤1240 px la tercera columna cruza las dos y se parte en dos adentro.

**Nota.** Los cortes del mockup son 1240 y 880; los de Tailwind, 1024 y 1280. No coinciden. Definir
cortes propios en `tema.css`.

## 3. Entre 640 y 1024 px se ve un teléfono gigante

`movil/Marco.tsx` no tiene ancho máximo. Como el corte a escritorio está en 1024, un iPad o una
ventana a medio pantalla reciben tarjetas diseñadas para 352 px estiradas a 1000 px.

**Arreglo.** Ancho máximo en el marco móvil **y** bajar el corte de escritorio a 880 px.

## 4. La mitad del escritorio son pantallas de teléfono metidas en una caja

En escritorio, todo lo que no es *Resumen* renderiza los componentes móviles dentro de
`max-w-[720px]`. Se siente como un iframe del teléfono pegado en la página.

> **Corrección al revisar el código:** la revisión afirma que además se renderiza la `Cabecera`
> móvil, con flecha de regresar y avatar duplicado. **No es cierto** — el bloque de escritorio no
> monta `Marco` ni `Cabecera`. Lo de fondo sí: son pantallas de teléfono en una columna angosta.

**Arreglo.** Darles composición de escritorio con `TarjetaEscritorio`, que ya existe.

## 5. El contrato de tokens está roto

29 tamaños de tipografía a mano, 14 radios, 24 hexadecimales crudos en `src/` —incluido un segundo
teal (`#12C2A0`) que nunca se declaró— contra 9 usos de los tokens de tipo y 0 de los de radio.

**Arreglo.** Cerrar la escala, declarar o eliminar el segundo teal, y un candado en CI que falle si
aparece `text-[`, `rounded-[` o un hex en `src/`.

## 6. La app viola su propia regla de legibilidad en el teléfono

Los tokens dicen *"móvil nunca baja de 17px en texto de lectura"*. En la práctica: filas de lista en
14.5, detalles en 11.5, etiquetas en 10.5, montos secundarios en 11.

**Arreglo.** Subir la fila de lista a 17/13, las etiquetas a 12, los montos a 17. Menos filas
legibles es mejor que más filas apretadas.

## 7. Los iconos son glifos Unicode

`◆ ▣ ↓ ◍ ◔ ⌕ ✎ ⋯ ★ ⇅ ◌ ◷` los dibuja cada sistema con una fuente de respaldo distinta; en Windows
y varios Android algunos caen a un cuadro vacío, y siempre salen desalineados respecto a Inter.

**Arreglo.** Un set real, `lucide-react`, en un solo archivo.

## 8. La gráfica del panel es de mentira

`Resumen.tsx`, la constante `SEMANAS`, es un arreglo fijo con porcentajes inventados — y ocupa la
tarjeta más grande del escritorio.

**Arreglo.** Calcularla del presupuesto, o esconderla con una frase honesta mientras no haya datos.

## 9. Los dos árboles se renderizan siempre

`lg:hidden` y `hidden lg:block` esconden con CSS, no con lógica: cada lista se renderiza dos veces y
hay dos `<nav aria-label="Navegación principal">`.

**Arreglo.** Un `useMediaQuery` y un solo árbol.

## Detalles menores

- El subrayado del enlace activo usa `-bottom-[19px]`, atado al padding de la barra.
- `SinConexion` es `fixed top-0` y tapa la barra superior del escritorio.
- `Etiqueta` usa un teal y el mockup usa otro.
- La búsqueda de la barra superior es decorativa: o se conecta, o se quita.

## Orden recomendado

1. Ancho máximo en escritorio (#1) y en móvil (#3).
2. El rango 1024–1280 (#2) y las pantallas de teléfono en el escritorio (#4).
3. Iconos (#7).

Después: la escala de tipografía y el candado en CI (#5, #6), que es lo que evita que vuelva a pasar.
