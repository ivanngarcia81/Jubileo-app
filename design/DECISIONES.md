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

**Por qué el icono de una categoría es una clave y no un dibujo.** La columna `categorias.icono`
guarda `'comida'`; qué SVG es `'comida'` lo decide `componentes/iconos.tsx`. Guardar el marcado
convertiría "corregir un icono que se ve mal en un Android" en una migración de datos, y metería en
la base algo que no le toca — la base sabe de dinero, no de trazos. El precio es que la clave puede
quedar huérfana si alguien borra un icono del set, y por eso `mapeo` la valida al leer y cae al
grupo en vez de pintar un hueco, **aunque el CHECK de la base ya la cuide**: la fila llega por
PostgREST como texto suelto, y un cliente viejo o una migración a medias no son imposibles.

Lo que sí importaba distinguir: **nulo no es `'gasto'`**. Nulo quiere decir "esta categoría no eligió
icono" y entonces manda su grupo, que es lo que la app hacía siempre; `'gasto'` es elegir el genérico
a propósito. Sin esa distinción, la siembra por palabras clave no podría correrse dos veces sin
pisarle la elección a alguien — y una migración que se corre de nuevo pasa, pero que le borre la
elección al usuario no puede.

**Por qué el rail del sidebar lleva semanas y no cuentas.** La referencia de la que sale
`design/sidebar.html` pone ahí las cuentas conectadas, y tiene razón: su producto son cuentas, y el
contexto permanente de una app es lo que la define. El de Jubileo no son las cuentas —la mitad del
público no conecta banco, y eso es a propósito (sección 11)— sino **dónde estás parado en el mes**.
Por eso el rail son las semanas, con la actual marcada y la apretada en ámbar. Estar siempre a la
vista es justo lo que convierte la semana en un marco mental en vez de una pantalla que se visita.

El número de cada semana es **lo presupuestado**, no lo que queda. Es tentador poner lo que queda
—suena más útil— pero en una semana que ya pasó "lo que te queda" no quiere decir nada, y un rail
que dice una cosa en las semanas futuras y otra en las pasadas no se puede leer de un vistazo. Es
además el mismo número que enseña El mes › Semanas: dos lugares que dicen lo mismo del mismo dinero
terminan diciendo cosas distintas en cuanto uno de los dos cambia.

Tocar una semana navega con **el fragmento** (`#/mes?semana=3`) y no con un estado compartido en
memoria. El enrutador de este proyecto era deliberadamente sin parámetros, y agregar el primero se
pensó dos veces; ganó porque un estado en memoria habría perdido lo único que el fragmento da
gratis —dirección compartible y botón de atrás— que es exactamente la razón por la que este
enrutador usa el fragmento y no un enrutador de verdad.

**El candado de los tokens, y por qué es un trinquete y no una limpieza.**
`design-tokens.css` dice desde el primer día que es "la única fuente de verdad para color y tipo", y
`tema.css` repite que el único lugar donde vive un hex es ese archivo. Era falso: llegó a haber **92
hexes crudos en `src/`**. Un archivo que declara una regla que nadie comprueba no es una regla, es
una nota. Lo que se arregló de una vez fue lo que no tiene criterio de por medio: los hexes que
*ya eran* un token declarado (`#1C1E1F` es `--carbon`, `#0ABBB4` es `--teal`) y los que hacen un
solo trabajo evidente y nadie había nombrado — la tinta que va **encima** del turquesa
(`--tinta-teal` en los botones, `--tinta-heroe` en el degradado; nunca es blanco, que sobre el teal
de la marca no pasa AA) y el extremo oscuro de los degradados (`--teal-hondo`). Eso son 43 de 92, y
no mueve un píxel.

Los 49 que quedan son **ocho grises casi iguales** —`#9AA09E`, `#787E7D`, `#6E7473`, `#C9CECC`,
`#C9CCCA`, `#8E9492`, `#A7ACAB`, `#C3C7C4`— haciendo casi el mismo trabajo: texto secundario sobre
carbón y marcadores de posición. Colapsarlos en dos o tres es la decisión correcta y **mueve píxeles
en casi toda la app**, igual que cerrar la escala tipográfica de treinta tamaños a seis: no es una
limpieza mecánica, es una decisión de diseño y se toma aparte. Mientras tanto,
`herramientas/revisar-tokens.mjs` congela el inventario: cada color con su cuenta y con el trabajo
que hace. Si aparece uno nuevo, truena. Si uno sube de cuenta, truena. Y si baja también truena,
pidiendo que se actualice el inventario — un trinquete que se afloja solo no es un trinquete. Lo
único exento es `lib/aviso/correo.ts`: Gmail y Outlook no entienden `var()`, así que ahí el hex es
la única forma que hay.

De paso, el repositorio dejó de no tener CI. Había un workflow, y era el cron del aviso: nada corría
al subir código. Ahora `revisar.yml` corre tipos, pruebas, el candado y el build en cada empujón.
Las comprobaciones de navegador se quedan fuera a propósito —necesitan Chromium y tardan minutos— y
se siguen corriendo a mano antes de cada commit que toca pantallas.

**Un solo árbol en el documento, escogido con lógica.** `panel:hidden` y `hidden panel:block`
escondían con CSS, no con lógica: los dos árboles —el del teléfono y el del escritorio— se
renderizaban siempre. Eso costaba el doble de trabajo en cada cambio de estado, pero lo caro era
otra cosa: en el documento había **dos `<nav aria-label="Navegación principal">` y dos `<main>`**, y
para quien navega con lector de pantalla eso no es una optimización pendiente, es una app con dos de
cada cosa donde la mitad no se ve. Ahora `useEsEscritorio()` (`src/componentes/pantalla.ts`) escoge
uno. El detalle que hace que esto no se pudra: el corte **no se escribe en el JavaScript**, se lee
de `--breakpoint-panel` con `getComputedStyle`. La media query de `tema.css` no puede leer `var()`
—por eso el 880 está escrito ahí— pero el JS sí puede leer la variable, así que sigue habiendo una
sola fuente de verdad. Y `revisar-pantallas.mjs` lo mide en el borde exacto, a 879 y a 880: si algún
día los dos números se separan, la app dibujaría el árbol de un lado con los estilos del otro, y eso
no se nota en ningún ancho redondo.

**Por qué el eje del presupuesto pasó del cheque a la semana del mes.** *(Agosto de 2026 — ver
`SEMANAS-PRESUPUESTABLES-JUBILEO.md`.)* La voz del producto ya era semanal —el aviso sale el
domingo, la pantalla se llama "Mi semana", el texto dice "te queda esta semana"— pero el motor
estaba anclado al cheque. Al usuario quincenal la app le decía "esta semana" enseñándole una
quincena, y al mensual no le daba ningún corte. Presupuestar por semana del mes (S1: 1–7, S2:
8–14, S3: 15–21, S4: 22–28, S5: 29–fin) alinea el motor con la voz, y la semana es el marco
mental que cualquiera entiende sin que se lo expliquen. El cheque no murió: quedó de **guardia**
—hasta la semana N no se reparte más de lo que entra hasta la semana N, validado en SQL— y de
**lente** —qué cubre cada cheque se deriva de las fechas, sin presupuestarse aparte—, porque el
dinero entra cuando entra y esa verdad no se negocia.

**Por qué los fijos no se presupuestan por semana.** La renta con vencimiento el día 3 cae en la
semana 1 sola: ya lo decidió el calendario. Pedirle al usuario que además la "asigne" a una semana
es trabajo doble y la puerta a que no cuadre — dos lugares diciendo cuándo pesa la renta terminan
diciendo cosas distintas. Por eso el plan semanal (`asignaciones_semana`) existe solo para lo
repartible —mayordomía, sobres variables, fondos—, el esquema rechaza filas semanales de fijos y
deudas con un disparador, y el número de cada semana se compone: lo fijo que **vence** en sus días
más lo variable que se le **asignó**. De ahí salen también la bandera de "apretada" (acumulada, e
informativa a propósito: cuenta fijos y cheque extra porque mide la caja real, mientras el guardia
solo bloquea lo que sí se puede mover) y el arrastre dentro del mes: lo que sobra de un sobre en
una semana pasa al mismo sobre en la siguiente, y el sobregasto viaja igual, en negativo.
