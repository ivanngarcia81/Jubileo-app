# Renombrar las pantallas + Planeado, Gastado y Queda por semana

Lote chico, sin migración, y toca la pantalla que más se va a usar. Verificado
contra el repo en `7d4e9da` (el lote del sidebar y los iconos ya está adentro).

## Lo que hay hoy

Los nombres están dispersos en tres lugares, todos encontrados en el código:

* `Sidebar.tsx:37-38` — los renglones dicen "Mi semana" y "El mes".
* `Panel.tsx:32-38` — el mapa `TITULOS` de la cabecera de contenido repite los
  mismos textos.
* `Marco.tsx:60-61` — la píldora del teléfono dice "Semana" y "Mes".

Tres copias del mismo rótulo, que es justo cómo se desincronizan. Este lote
también las une en un solo lugar.

La vista por semanas da una sola cifra. `ElMes.tsx:163` — `DOS_COLUMNAS`:
nombre y un número. Mientras el eje del mes sí trae Gastado y Del mes
(`encabezadosPanel={['Categoría','Gastado',null,'Del mes']}`). O sea que la
vista que más va a usar la gente es la que menos información da.

## Lo que queda

**Nombres:** Dashboard · Presupuesto mensual · Movimientos · Deudas · Metas,
más Ajustes. El destino que hoy se llama "Mi semana" en el escritorio (la ruta
`resumen`) pasa a Dashboard — no porque ya sea el Panel completo, sino porque
ese es su nombre definitivo y no tiene sentido renombrarlo dos veces. En el
teléfono la píldora dice Inicio · Presupuesto · Deudas · Metas (los rótulos
largos no caben en cuatro botones; el título completo sí sale en la cabecera de
cada pantalla).

**Las tres cifras por semana:** Planeado, Gastado y Queda. Queda es la que
cambia de color — teal, ámbar cerca del límite, rojo si ya se pasó — y es la
única que la persona busca de verdad. En el teléfono caben Planeado y Queda con
la barra; Gastado sale al abrir el renglón.

## Prompt para Claude Code

> Estás en el repo de Jubileo app. Lote chico, sin migración: renombrar las
> pantallas y darle a la vista por semanas las tres cifras que le faltan. Lee
> `RENOMBRAR-Y-TRES-CIFRAS.md`.
>
> Un commit por paso, con `npm test`, `npm run typecheck` y las comprobaciones
> de navegador limpias en cada uno:
>
> 1. **Un solo lugar para los rótulos.** Hoy están tres veces: `Sidebar.tsx:37-38`,
>    el mapa `TITULOS` de `Panel.tsx:32-38`, y `Marco.tsx:60-61`. Saca los
>    nombres de las rutas a un módulo único (junto a `rutas.ts`) con dos formas
>    por ruta: el rótulo largo para el sidebar y la cabecera, y el corto para la
>    píldora del teléfono. Que las tres piezas lo consuman. Prueba de que toda
>    ruta visible tiene sus dos formas.
> 2. **Los nombres nuevos:** `resumen` → Dashboard (largo y corto), `mes` →
>    Presupuesto mensual (corto: Presupuesto), y en el teléfono `semana` →
>    Inicio en la píldora. Deudas, Metas, Movimientos y Ajustes no cambian. La
>    ruta de la URL no se toca — sigue siendo `#/resumen` y `#/mes`; esto es
>    solo cómo se lee. Revisa que ningún texto de otra pantalla siga diciendo
>    "El mes" o "Mi semana" refiriéndose al destino, incluido
>    `lib/aviso/contenido.ts`.
> 3. **Tres columnas en la vista por semanas.** `DOS_COLUMNAS` (`ElMes.tsx:163`)
>    pasa a tres cifras: Planeado, Gastado y Queda, con sus encabezados. En el
>    panel entran las tres más la barra; en el teléfono van Planeado y Queda con
>    la barra, y Gastado aparece al abrir el renglón — no metas tres columnas de
>    dinero en 380px, que nos costó cerrar la escala de tipografía. Aplícalo
>    igual a la vista por cheques, que tiene el mismo problema.
> 4. **Queda es la cifra con color:** teal normal, ámbar cuando pasa del 80% de
>    lo planeado, rojo cuando ya se pasó — la regla 4 de los tokens, la misma de
>    las barras. Planeado y Gastado se quedan en el color de texto normal; dos
>    cifras de color en una fila compiten y ninguna gana.
> 5. **Comprobación de navegador nueva:** que en la vista por semanas se lean
>    las tres cifras de un renglón y que Planeado − Gastado = Queda, para que no
>    se separen nunca de la aritmética.
>
> Reglas de siempre: tokens de `design/design-tokens.css` como única fuente;
> solo `iconos.tsx` importa de `lucide-react`; los rótulos nuevos van a
> `SPEC.md`, y a `design/DECISIONES.md` un párrafo sobre por qué los nombres se
> tomaron del vocabulario común de las apps de presupuesto (EveryDollar,
> MoneyWiz) y por qué la cifra con color es la que queda y no las otras dos.
>
> **Nota:** los rótulos van a quedar concentrados en un módulo, lo cual deja el
> terreno listo para el trabajo bilingüe que viene después — pero **no hagas
> i18n en este lote**. Nada de librerías de traducción ni claves de idioma
> todavía; solo el módulo en español.

---

## Notas al recibirlo

*(Agosto de 2026. El documento llegó a mitad del lote del Dashboard, cuando los
pasos 1 y 2 ya estaban escritos por lo que el propio prompt del Dashboard exigía
como prerrequisito. Lo que se decidió al leerlo, para que no se pierda:)*

1. **Los pasos 1 y 2 estaban hechos y coinciden.** El módulo quedó en
   `src/componentes/rotulos.ts` y no junto a `rutas.ts` como dice el prompt: es
   un módulo de nombres para pantallas, y su vecindario natural son los
   componentes que lo consumen, no el enrutador — que a propósito no sabe cómo
   se llaman las cosas, solo a dónde van. Las dos formas por ruta se llaman
   `pantalla` y `pildora`.
2. **El prompt dice "en el teléfono `semana` → Inicio en la píldora".** La ruta
   `semana` ya no existe: el lote del Dashboard la retiró y `#/semana` redirige
   a `#/resumen`. Lo que queda con el rótulo "Inicio" es `resumen`, que es lo
   mismo que el documento quiere decir.
3. **"El mes" y "Mi semana" como destino** salieron de `Anotar.tsx`,
   `Movimientos.tsx` y `MiSemana.tsx`. En `lib/aviso/contenido.ts` no había
   ninguno: el aviso nunca nombra pantallas, habla de la semana como periodo.
   El "mes" que queda en `PonerSemana.tsx` es el periodo, no el destino, y se
   quedó como está.
