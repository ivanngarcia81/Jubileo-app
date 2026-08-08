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

Eso obligó a cambiar también la prueba. `revisar-pantallas.mjs` medía el primer elemento visible con
`bg-carbon` y exigía que no pasara de 1440 px; con el arreglo bueno ese elemento mide lo que mide la
pantalla, **a propósito**, así que la prueba habría fallado justo cuando el código quedó bien. Ahora
apunta a `[data-ancho="contenido"]`, un gancho puesto para eso, y se le agregó la comprobación
inversa —que el fondo oscuro sí llegue al borde—, que es exactamente lo que se había roto. En un
monitor de 2560 px las dos respuestas juntas son la prueba de que el patrón está bien: fondo 2560,
contenido 1420.
