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

**Cuándo se retira el puente: un número, no una corazonada.** El puente del esquema
(`siembra_semanas`, migración 0006) siembra un plan semanal proporcional cada vez que cambia un
monto mensual, para que un cliente que todavía solo sabe de cheques no deje el eje semanal
huérfano. Su retiro estaba escrito como "cuando ya no queden clientes viejos", que no se sabe
mirando el aire — y con la app en producción con datos de verdad, quitarlo un día antes de tiempo
le rompe el mes a alguien que no hizo nada. Así que la migración 0008 lo instrumenta: el puente
cuenta cada línea que siembra **por el camino viejo**, por día, y `dias_sin_puente()` dice cuántos
días seguidos lleva en cero. En catorce, la contracción se escribe.

Lo que hace que el conteo no mienta es el canal por el que el cliente nuevo se anuncia:
`lineas_presupuesto.escrito_por` es un **buzón de un solo uso**, no una columna de identidad. Un
disparador `before` la lee y la deja en null, y un CHECK obliga a que siempre acabe así. Si el
sello sobreviviera, una línea nacida en el cliente nuevo pasaría por nueva para siempre y las
ediciones que le hiciera después un cliente viejo no contarían — el contador mentiría **hacia
abajo**, que es justo la mentira peligrosa: retiraría el puente antes de tiempo. Contar de más solo
retrasa. Se eligió una columna y no un RPC porque es lo único que PostgREST deja mandar sin
inventar un camino nuevo, y el cliente viejo no puede mandar una columna que no sabe que existe.

**Por qué las pantallas se llaman como se llaman.** *(Agosto de 2026 —
`RENOMBRAR-Y-TRES-CIFRAS.md`.)* "Mi semana" y "El mes" eran nombres de casa:
descriptivos, pero nadie llega a Jubileo sabiéndolos. **Dashboard** y
**Presupuesto mensual** son el vocabulario común de las apps de presupuesto
—EveryDollar, MoneyWiz y el resto usan esas dos palabras para esas dos cosas—
y eso vale más que la originalidad en los dos únicos rótulos que alguien lee
antes de entender el producto. Lo que sí es de Jubileo se queda tal cual:
semana, sobre, apretada, repartir, fondo de reserva, fecha de libertad. La
dirección no cambió —`#/resumen`, `#/mes`—: renombrar es cómo se lee, no a
dónde se va.

Los nombres viven en `src/componentes/rotulos.ts`, en dos formas por ruta:
`pantalla` para el sidebar y la cabecera, `pildora` para los cuatro botones del
teléfono, donde "Presupuesto mensual" simplemente no cabe. Estaban escritos
tres veces —Sidebar, el mapa `TITULOS` de Panel, la píldora de Marco— que es
exactamente cómo dos pantallas acaban llamándole distinto a lo mismo.

**Por qué la cifra con color es la que queda.** La vista por semanas daba una
sola cifra cuando el árbol del mes ya daba dos, y era la vista que más se usa.
Ahora da tres: **Planeado, Gastado y Queda**. De las tres, solo Queda lleva
color —teal, ámbar del 80% para arriba, rojo pasado el 100%, la regla 4 de los
tokens— porque es la única que contesta la pregunta con la que la persona abre
la app. Planeado y Gastado son el trabajo que ya hizo; Queda es la decisión que
tiene enfrente. Dos cifras de color en un mismo renglón compiten y ninguna
gana, y el color deja de querer decir algo — que es la misma razón por la que
el rojo no aparece como advertencia preventiva.

Queda no se recibe: se calcula dentro del componente, de Planeado − Gastado.
Recibirla dejaría que una pantalla mandara tres números que no se restan entre
sí, y una app de presupuesto que no cuadra en su propia pantalla no vale nada.
La regla de color se deriva de la de las barras (`claseDeQueda` llama a
`colorDeSobre`), así que el 80% solo existe en un sitio; hay una prueba que
recorre el rango entero comparando las dos.

En el teléfono no caben tres columnas de dinero en 380px sin dejarle cuarenta
píxeles al nombre — la escala de tipografía costó demasiado como para
reabrirla por esto. Ahí salen Queda grande con Planeado de referencia debajo, y
**Gastado aparece al abrir el renglón**, que es cuando ya hay sitio. La vista
por cheques usa la misma pieza con otros tres rótulos —Entra, Cubre, Queda—
porque mide otra cosa con la misma aritmética.

**Por qué el Dashboard abre con la semana en curso y no con el patrimonio neto.**
*(Agosto de 2026 — `DASHBOARD-JUBILEO.md`.)* Casi todas las apps de finanzas
abren con el patrimonio neto, y es la cifra equivocada para este producto. El
patrimonio neto cambia una vez al mes y no se puede hacer nada con él hoy;
quien vive cheque a cheque no abre la app para saber cuánto vale, la abre para
saber si le alcanza hasta el viernes. Por eso la primera tarjeta es **la semana
en curso** —el héroe de "te queda", su rótulo con el rango— y por eso los chips
de acción van **dentro** de ella: la pantalla anterior tenía una cosa buena, que
anotar un gasto costaba un toque, y sacarlos a otra pantalla lo habría vuelto
dos. Un dashboard que resume pero no despacha es un reporte.

De la mudanza salieron tres cosas que no cabían en las seis tarjetas del
documento, y ninguna se borró:

- **Cerrar la semana** se quedó como tercer chip de la primera tarjeta. Es un
  verbo del vocabulario y un flujo de tres preguntas; ninguna tarjeta era su
  sitio y perderlo no era una opción.
- **La invitación a premium** y **el coach** bajaron al final del Dashboard,
  condicionadas: la primera solo si la cuenta es gratis, el segundo solo si lo
  hay. Una cuenta premium con coach ve exactamente las seis tarjetas y ni una
  más.
- **La checklist de pagos** vive en la hoja del chip "Pagué", que abre siempre
  —incluso sin poder marcar nada— porque es también la única manera de *ver* los
  pagos de la semana desde el inicio.

Lo que sí se retiró fue la gráfica de barras de planeado contra gastado: la
reemplaza la tarjeta **Cómo va el reparto**, que mide contra el *ritmo* del plan
y no contra el plan a secas. "Llevas $180 de $300" no dice nada — en martes va
fatal y en domingo va perfecto. La cuenta vive en `lib/semanas/ritmo`, pura y
con pruebas, y reparte parejo entre los días: cualquier curva más lista sería
una suposición sobre la vida de alguien que no conocemos, y una suposición
vestida de precisión es peor que un promedio honesto.

**Los doce grises y los trece radios: la misma deuda que la escala tipográfica.**
*(Agosto de 2026.)* El archivo de tokens decía desde el principio que era "la
única fuente de verdad para color y tipo", y no lo era: quedaban doce hexes
crudos y trece valores de radio repartidos en 147 lugares. Un archivo que
declara una regla que nadie comprueba no es una regla, es una nota.

**Los grises.** Once de los doce vivían **sobre carbón** —el login, la
membresía, el aviso, la píldora del teléfono— donde ya existía una escala de
tres niveles que nunca los absorbió. El movimiento de fondo fue subir
`--texto-claro-3` de `#7C8483` a `#9AA09E`: era el valor que quince sitios ya
usaban a mano y el único del grupo que cruza AA. Antes los rótulos del sidebar y
la navegación inactiva iban a 4.4:1 y los marcadores de posición del login a
3.5:1 — la regla 5 de este mismo archivo no admite eso. Ahora todo va a 6.3:1.
Tres tokens nuevos recogieron el resto: `--tenue` (lo que está ahí pero no
reclama atención: texto de ejemplo, barras sin llenar), `--blanco-2` (dos
blancos casi iguales que no distingue nadie) y `--tinta-ambar` (el papel de
`--tinta-teal` sobre la barra ámbar, al que solo le faltaba el nombre).

De paso apareció que el candado **decía cero teniendo dos**: su expresión
terminaba en `\b`, y en `#31302B_58%` —una parada de degradado— el guion bajo es
carácter de palabra, así que el hex pasaba invisible. Un candado con un agujero
es peor que ninguno, porque se confía en él.

**Los radios.** Trece valores con diferencias —7 contra 8 contra 9— que no
distingue nadie. Cierran en tres, como manda el contrato: **chip** lo redondo
del todo, **botón** lo que se toca, **tarjeta** lo que contiene. La regla de
migración fue de forma, no de píxeles: 13px o más es tarjeta, menos es botón, y
lo que ya era pastilla o círculo es chip. Ningún elemento se movió más de 6px.

Lo que **no** era obvio: CSS **recorta** el radio cuando dos esquinas suman más
que el lado, así que `rounded-btn` (11px) sobre una caja de 21px no da un
cuadrado de esquinas suaves — da un **círculo**. La casilla de marcado se
convirtió en un radio button, y un círculo dice "escoge una" donde un cuadro
dice "marca cada una". La salida no fue un cuarto radio: fue **subir la caja**.
La casilla pasa de 21 a 30px (con su columna), la insignia del rail y el
mosaico del aviso a 24 y 22. El contador de una lista pasó a `chip`, que es su
forma correcta de todos modos. Cuando un token no cabe, lo que se cambia es la
caja, no la escala.

Las tres reglas —color, tipo y radio— las comprueba `revisar-tokens.mjs` en cada
empujón. El inventario de colores quedó **vacío**, que es la primera vez que el
archivo de tokens dice la verdad.

**Por qué la checklist de pagos tiene una sola casa.** *(Paso 5 del Dashboard.)*
Vivía en la pantalla de inicio y enseñaba solo los pagos de **la semana de hoy**,
porque ese era su único cliente. Se mudó al detalle de cada semana en
Presupuesto mensual, y eso obligó a abrir el dato: `pagosPorSemana` en vez de
`pagos` a secas. La semana que viene tiene pagos que adelantar y la que pasó
tiene pagos con los que ponerse al día — recortarla a hoy era una limitación
del sitio donde estaba, no una decisión.

Durante un rato hubo **dos**: la del detalle de la semana y una hoja que abría
el chip "Pagué" del Dashboard. Se quitó la hoja. Dos listas del mismo dato
escritas aparte terminan diciendo cosas distintas, y aquí además la del detalle
es mejor: el pago se marca viendo el resto de lo que pesa esa semana, no en una
lista suelta. El chip "Pagué" ahora **lleva** ahí, con la semana ya abierta.
Cuesta un toque más que la hoja y vale la pena; el que sí se quedó en un toque
es *Anotar*, que es lo que se hace todos los días.

Con eso `MiSemana` dejó de tener contenido propio y se retiró. Lo único que
sobrevivió entero fue el héroe, que se fue a `componentes/HeroeDeLaSemana.tsx`
en vez de seguir colgando de una pantalla que ya no existe.

**Sombra en vez de borde, y por qué la referencia solo sirvió para la mitad.**
*(Agosto de 2026. Llegó una captura de un panel de fintech con la petición de
que la app se viera "más premium".)* Se tomaron tres cosas y se dejaron fuera
las demás, con criterio:

**Lo que se tomó.** *Elevación:* una tarjeta se separa del lienzo con sombra, no
con un borde de 1px. El borde dibuja el contorno de la caja; la sombra hace que
la caja esté encima. Son dos capas —una de contacto y otra ancha y muy tenue—
porque una sola sombra ancha flota y una sola pegada se ve sucia. Los bordes no
desaparecieron: siguen separando renglones dentro de una lista y marcando los
campos, que es donde un contorno quiere decir algo. *Alturas parejas:* las
tarjetas de una fila se estiran igual y su enlace se clava abajo con `mt-auto`,
así los enlaces de dos tarjetas vecinas quedan a la misma altura — una fila
despareja se lee como algo a medio cargar. *La comparación contra el mes
pasado*, que es la que más se nota y la única que no es cosmética.

**Lo que no se tomó, y por qué.** La paleta lima (el teal es la marca). La
tarjeta de crédito con degradado (no hay banco conectado hasta la fase 3, y
dibujarla sería prometer). Los avatares de "Quick payment" (inventar una
función). El medidor de "75% del ingreso ahorrado" (una métrica que Jubileo no
calcula; ponerla obligaría a fabricarla). Y el **"Upgrade to Pro" fijo en el
sidebar**: un anuncio permanente dentro de una app de pago es exactamente lo que
la abarata, no lo que la sube de nivel.

De fondo, la referencia es un **dashboard de widgets** —tiene hasta un botón de
"Add widget"—. El de Jubileo es de seis tarjetas que despachan a donde se
arregla cada cosa. Copiar la parrilla habría sido cambiar de producto, no de
estilo. Una referencia visual sirve para el **acabado**; la estructura la decide
lo que el producto hace.

**El campo muerto que salió a la luz.** `variacionEntra` y `variacionSale`
existían en `Presupuesto` desde el principio y eran **cadenas vacías en
producción**: solo los datos de ejemplo los llenaban, con números escritos a
mano. Un campo que solo tiene valor en la demostración es peor que no tenerlo,
porque las capturas enseñan algo que la app no hace. Se borraron y en su lugar
está `lib/mes/variacion`, que la calcula de `mesesPasados` —lo que ya se trae
para la franja del selector— y devuelve **nulo cuando no hay contra qué
comparar**: en el primer mes de una cuenta nueva, "+$0" diría que no cambió nada
cuando la verdad es que no hay con qué medirlo. Tampoco compara contra dos meses
atrás si falta el de en medio: llamar "el mes pasado" a octubre desde diciembre
es mentir con precisión.

**Un color por categoría, sin gastar la tinta del ámbar.** *(Agosto de 2026.
Llegó otra referencia — la lista de movimientos de una app oscura, con una
píldora de color distinto por categoría.)* La píldora ya existía; lo que no
existía era el color propio: eran tres tonos, y este archivo decía por qué —
"si cada categoría trajera su tono, la lista se volvería un arcoíris y el teal
dejaría de querer decir algo".

Ese miedo era correcto y la conclusión no. El problema no es que haya muchos
colores: es que **el color de identidad y el de estado compartan tinta**. Una
categoría pintada de ámbar deja a la bandera de semana apretada sin querer
decir nada, y el día que el usuario de verdad se pase, el rojo ya no lo lee.

Así que la paleta de categorías se construyó **excluyendo ámbar y rojo**. Ocho
familias —teal, verde, azul, índigo, violeta, rosa, pizarra y neutro—, cada una
un fondo tenue con su texto oscuro encima. Los ocho pasan AA sobre su propio
fondo (regla 5); el más justo es verde con 5.08:1. Y los ocho fondos se
distinguen entre sí sobre blanco.

Dieciséis colores distintos tampoco se distinguirían, así que se agrupó: las
que llenan una lista de movimientos tienen familia propia —comida, transporte,
los recibos, la salud, la casa— y la cola larga comparte. Regalo, niños,
mascota y ropa son la misma familia a propósito: aparecen poco, y distinguirlas
habría costado cuatro colores que nadie sabría leer.

Los tonos **forzados** —"Extra", "Apretada", "enfoque", el conteo de pagos
pendientes— siguen siendo los tres de siempre y viven en otra tabla. Uno dice
qué es; el otro, cómo va. Hay una prueba que revienta si alguien mete ámbar o
rojo en la paleta de categorías, que es la regla que se va a romper sola el día
que alguien busque un octavo color bonito.

**Y el color tuvo que salir de la píldora para llegar a las listas.** La
píldora solo aparece donde hay sitio para su nombre —Movimientos, el detalle—;
en el árbol de El mes el nombre ya está en la fila y la píldora sobraría. Ahí
el color viaja en **el icono**, que es donde la referencia lo pone también.
`IconoDeCategoria` es la pieza: el icono y su color son el mismo dato leído dos
veces, y tenerlos separados era pedir que un día la comida saliera con el
tenedor verde en una pantalla y con el gris en otra.

**De la referencia no se copiaron los emoji.** Los iconos salen de `iconos.tsx`
—lucide, una sola puerta— y un emoji se dibuja distinto en cada sistema: la
misma categoría se vería de tres maneras según el teléfono. Y la medición sacó
de paso una falla vieja: el chip teal iba a **4.27:1**, por debajo de AA. Su
texto se oscureció a `#04645F`.

**Los seis botones que no eran botones.** *(Agosto de 2026. El usuario preguntó
qué hacía el lápiz de la cabecera de El mes. No hacía nada.)* La cabecera del
teléfono dibujaba un círculo con borde, de 34px, en la esquina superior derecha
—donde toda app del mundo pone su acción principal— y era un `<div>` con un
icono adentro, copiado de la composición del mockup. En seis pantallas: un
lápiz, dos "+", una campana y dos que repetían el icono de la pantalla en la
que ya estabas.

Un círculo del tamaño de un pulgar, con borde y en esa esquina, **es un botón**
aunque el código diga `div`. Y los dos "+" eran peores que inútiles: prometían
crear una deuda o un fondo cuando esa acción ya existía más abajo, en su propia
lista. Quien lo tocara aprendía que la app no responde.

Ahora el círculo **solo se dibuja si hace algo**. Cinco desaparecieron; la
campana se quedó, convertida en botón de verdad que lleva a la vista previa del
aviso del domingo — que es lo que una campana promete y lo que esa pantalla es.
De paso se fue el punto teal de "hay algo nuevo": nada lo calculaba.

La comprobación de navegador recorre las seis cabeceras y falla si encuentra un
círculo con borde que no sea `button` ni `a`. Es una regla que se rompe sola: el
siguiente mockup va a traer su adorno en esa misma esquina.

**El deslizador prometía un extra que la lista no sabía dónde poner.** *(Agosto
de 2026. El usuario lo dijo así: "no cuadra el pago extra con el orden de
saldo".)* La pantalla de Deudas decía "+$350" en el deslizador y, diez
centímetros más abajo, "Solo el mínimo · $50" en la única deuda. Las dos frases
eran ciertas —una simula, la otra es lo que se paga de verdad— pero juntas no se
distinguen, y faltaba lo único que de verdad importa: **a dónde iría ese
dinero**.

Va **completo a la deuda de menor saldo**, no repartido entre todas. Eso *es* el
método, y era justo lo que la pantalla no enseñaba. Ahora el encabezado de la
lista dice a cuál va —"el extra va a Capital One"— y esa fila, y solo esa, dice
"con el extra, $500". Las demás siguen en su mínimo, que es la verdad y además
es la lección: ver caer todo el dinero en una sola fila explica el método sin
un párrafo que lo explique.

El nombre sale de `conExtra.enfoqueId`, o sea del propio simulador, para que la
fila que se anota y la deuda que el cálculo ataca no puedan ser distintas.

**Dos puertas, dos propósitos: la que decide el eje es la puerta.** *(Agosto de
2026. El usuario lo pidió así: "Presupuesto mensual debería ser un resumen
mensual —comida en todo el mes, gasolina en todo el mes— y agosto por semanas
debería ser el lugar de trabajo".)*

Lo que pedía ya estaba construido: el eje **Mes** es exactamente ese resumen por
categoría. Lo que fallaba era dónde caías. Las dos entradas —el destino del menú
y una semana del riel— abrían en **Semanas**, y encima el eje se recordaba en
`localStorage`. Resultado: quien acababa de repartir la semana 2 y tocaba
"Presupuesto mensual" volvía a caer en el reparto de la semana 2. El destino no
llevaba a ningún sitio distinto del que ya estaba.

Ahora `#/mes` abre en Mes y `#/mes?semana=N` abre en Semanas. La memoria se fue:
servía a la pantalla y le estorbaba al usuario. El segmentado sigue ahí para
cambiar de eje una vez dentro; lo que ya no hace es decidir a dónde llegas.

El detalle que costó: ir del riel al destino **no vuelve a montar la pantalla**
—solo cambia el fragmento— así que `useState` no se enteraba y el eje se quedaba
donde estaba. La comprobación de navegador lo pilló en el primer intento, y por
eso mide las dos direcciones y no solo la primera carga.
