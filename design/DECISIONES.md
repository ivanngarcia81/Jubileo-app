# Decisiones de diseño al hacer la app responsiva

**Agosto de 2026.** Los mockups de `design/` son documentos de presentación: dibujan un teléfono de
352 px y una ventana de escritorio de 1420 px, los dos centrados sobre un fondo. Al pasarlos a React
se copiaron los píxeles de adentro y se tiró el marco de afuera — y ese marco no era decoración del
documento, era **el ancho del contenido**. Sin él la app solo se veía bien en esos dos anchos
exactos: en un monitor de 2560 px la columna central del panel crecía sin límite mientras las
laterales seguían clavadas en 262 px, y en un iPad las tarjetas pensadas para 352 px se estiraban a
mil. La decisión de fondo fue tratar `.win` y el bisel del teléfono como lo que son —el marco del
documento— y reemplazarlos por contenedores de ancho máximo de verdad: `--ancho-max: 1420px` y
`--ancho-movil: 440px`, declarados en `design-tokens.css` para que no vuelvan a ser números sueltos
dentro de un componente. El fondo llega hasta el borde de la pantalla; lo que se detiene es el
contenido.

La segunda decisión fue **usar los cortes de pantalla del mockup y no los de Tailwind**. El mockup
corta en 1240 px (de tres columnas a dos) y en 880 px (de dos a una); Tailwind corta en 1024 y 1280.
Forzar los suyos dejaba 256 px de rango donde la tercera columna del panel se caía a la fila de
abajo y se estiraba al doble de su ancho — justo donde cae un laptop de 13". Ahora los cortes se
llaman `panel` y `ancho`, viven en `tema.css` en un `@theme` normal (una media query no puede leer
`var()`, así que el valor tiene que quedar escrito), y el cambio de teléfono a escritorio bajó de
1024 a 880 para que un iPad horizontal reciba el panel y no un teléfono gigante. Aparte de eso, los
iconos dejaron de ser glifos Unicode copiados del mockup: en un mockup pasan porque se mira en una
computadora, pero cada sistema los dibuja con una fuente de respaldo distinta y en Windows y varios
Android algunos caen a un cuadro vacío. Todos pasan ahora por `src/componentes/iconos.tsx`, el único
archivo que importa de `lucide-react`, con trazo de 1.5 para que no se vean más gruesos que Inter.

**Por qué el fondo va de borde a borde y el contenido no.** El primer intento de arreglar esto puso
el tope de ancho en el contenedor que *envuelve* la barra superior y la banda de indicadores. El
resultado fue peor que el problema: en un monitor de 2560 px quedaban dos bloques carbón de 1420
centrados sobre franjas de gris claro de 570 px a cada lado, con un corte vertical duro. Eso no es
el mockup —donde la página entera es carbón y la ventana tiene esquinas redondeadas— ni es el patrón
normal de una app web; es el intermedio, y se lee como un error de maquetación. El patrón correcto
es el que usa cualquier sitio con barra fija: **el fondo cubre la pantalla y el contenido se
detiene**. Por eso el `max-w-app` vive ahora *dentro* de `BarraSuperior`, `BandaIndicadores` y
`Resumen`, y no en quien las envuelve. La regla práctica es sencilla: el elemento que lleva el color
de fondo nunca lleva el tope de ancho, y el que lleva el tope nunca lleva el color.

**Por qué la tarjeta dejó de ser el renglón y pasó a ser la sección.** Ver `design/listas.html`.
Los mockups de teléfono dibujan cada línea del presupuesto como su propia tarjeta —borde,
esquinas redondeadas, relleno propio— y así se copió. En un mockup con seis renglones se ve bien;
con dieciséis no. Cada tarjeta trae 26 px de cromo que no dicen nada, nada queda alineado entre
renglones porque cada una es un `flex` independiente, y cada barra de progreso mide lo que le
sobra a su tarjeta, así que comparar dos sobres exige leer los números uno por uno. En una
pantalla de teléfono cabían seis líneas donde caben dieciséis. Ahora hay un panel blanco por
sección y adentro filas en `grid` separadas por una línea de 1 px: la del borde de abajo, sin
borde en la última.

La pieza que hace que esto funcione no es el panel, es de dónde salen las columnas. Se declaran
**una sola vez, en la `ListaSeccion`**, y las filas las heredan por la variable CSS `--cols`. Si
cada fila pudiera declarar las suyas volveríamos al principio en tres meses, porque se irían
separando de a poquito y nadie lo notaría hasta que ya no se pareciera a nada. Por eso `Fila` no
recibe columnas: no es que se le hayan olvidado. Y como el mockup es un documento de 1420 px y la
app arranca en 320, la sección acepta dos juegos —el del teléfono y, desde el corte `panel`, el
del mockup— en vez de fingir que un solo juego sirve para los dos.

Eso obligó a cambiar también la prueba. `revisar-pantallas.mjs` medía el primer elemento visible con
`bg-carbon` y exigía que no pasara de 1440 px; con el arreglo bueno ese elemento mide lo que mide la
pantalla, **a propósito**, así que la prueba habría fallado justo cuando el código quedó bien. Ahora
apunta a `[data-ancho="contenido"]`, un gancho puesto para eso, y se le agregó la comprobación
inversa —que el fondo oscuro sí llegue al borde—, que es exactamente lo que se había roto. En un
monitor de 2560 px las dos respuestas juntas son la prueba de que el patrón está bien: fondo 2560,
contenido 1420.

**La escala tipográfica: de treinta tamaños a seis.** La app llegó a usar **treinta tamaños de
letra distintos en 335 lugares** —10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15…— y la mitad
de esas diferencias no las distingue nadie. Salieron de copiar píxel por píxel tres mockups
dibujados por separado: no había una escala, había tres. Lo curioso es que el contrato **sí traía
una escala** —`--t-hero`, `--t-h1`, `--t-cuerpo`…— y no la usaba ningún componente; cada uno
escribía su `text-[13.5px]` a mano. Una escala que nadie usa no existe.

Ahora son seis: **11 · 12.5 · 14 · 17 · 26 · 38**. El 11 para rótulos en versalitas, el 12.5 para
el texto secundario, el 14 para el renglón de una lista y los botones, el 17 para títulos de
sección y **todos los campos de texto**, y los dos grandes en serif para cifras y héroes. El precio
que se pagó a conciencia: la cifra de Mi semana bajó de 52 a 38 y la de Deudas de 40 a 38 — a
cambio, la cifra héroe de las cinco pantallas mide lo mismo, que antes eran 52, 38, 40, 34 y 60 sin
ninguna razón. Los títulos de hoja bajaron de 22 a 17, que es el mismo 17 en serif que el mockup
usa para el encabezado de un panel.

Los 17px de los campos de texto no son estética: **iOS le hace zoom a la página al enfocar un campo
de menos de 16px**, y salir de ese zoom es cosa del usuario. Había uno en 15px desde antes; ahora
está en 17 como los demás, y hay una comprobación de navegador que lo mide en tres pantallas.

La escala se fija con una prueba, no con buena voluntad: `revisar-pantallas.mjs` recorre los
**nodos de texto** de cinco pantallas —mil y pico— y revienta si aparece un tamaño que no sea uno
de los seis. Recorre nodos de texto y no elementos a propósito: un `<div>` que solo envuelve hereda
los 16px del navegador y saldría como si fuera un tamaño de la app. Y cuenta cuántos midió, porque
una comprobación que mide dos cosas y pasa no vale nada.
