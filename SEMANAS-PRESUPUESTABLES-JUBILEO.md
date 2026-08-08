# Semanas presupuestables — la semana como eje del presupuesto

**Este documento reemplaza a `SEMANAS-DEL-MES-JUBILEO.md`.** Aquel proponía las semanas como vista derivada; con tu aclaración, la decisión cambia: la semana pasa a ser **el eje donde se presupuesta**. Borra el documento viejo del repo si ya lo habías metido.

## Por qué tu instinto tiene un argumento fuerte a su favor

Hay una incoherencia en el producto que esta decisión resuelve: **la voz de Jubileo ya es semanal, pero el motor es por cheque.** El aviso sale el domingo y habla de la semana. La pantalla se llama "Mi semana". El texto dice "te queda esta semana". Pero por debajo, todo está anclado al cheque — y por eso al usuario quincenal la app le dice "esta semana" cuando le está enseñando una quincena, y al mensual no le da ningún corte. Presupuestar por semana alinea por fin el motor con la voz. Y la semana es el marco mental que cualquiera entiende sin que se lo expliquen — ahí está la conveniencia que dices.

## El modelo que recomiendo: híbrido, no doble presupuesto

"Poner el presupuesto de S2" no debe significar repartir *todo* en S2, porque la mitad del mes no se presupuesta por semana — se cae solo en una semana por su fecha:

- **Los fijos y las deudas van por fecha, como hoy.** La renta tiene `diaVencimiento` 1: cae en S1 sola. Nadie debería "presupuestar la renta en S1" a mano — ya está decidido por el calendario. Pedirle al usuario que lo haga es trabajo doble y la puerta a que no cuadre.
- **Los sobres variables sí se presupuestan por semana.** Comida, gasolina, personales: eliges S2 y le pones $110 de comida y $50 de gasolina. Eso es exactamente lo que describes — y es donde el presupuesto semanal tiene sentido, porque es el gasto que se decide semana a semana.
- **El número de cada semana** = lo fijo que se vence en sus días + lo variable que le asignaste. Las 4–5 semanas quedan visibles con su monto, como quieres.
- **Lo que sobra de un sobre en S1 pasa al mismo sobre en S2** (arrastre dentro del mes). Al cerrar el mes, aplica el arrastre mensual que ya existe.

Así no hay dos presupuestos del mismo dinero peleándose: cada peso variable vive en una sola semana, y los fijos viven en su fecha.

## El cheque no muere: se vuelve el guardia

Que la semana sea el eje no cambia un hecho: el dinero **entra** cuando entra. Si te pagan el 6 y el 20, S1 empieza sin fondos. La regla que protege al usuario (la versión semanal de tu invariante actual):

> **Hasta la semana N, no se puede repartir más de lo que entra hasta la semana N.**

Es acumulada: puedes presupuestar S3 con dinero del cheque del 20 porque ese cheque llega antes de que S3 termine — pero no puedes cargar S1 con dinero que llega el 20. Se valida en SQL, igual que hoy, solo que sobre el eje nuevo. Y el cheque queda como **lente secundario** en el control Semana · Cheque · Mes, para quien quiera ver "¿qué cubre este cheque?" — se deriva solo de las fechas, sin presupuestarse aparte.

## Qué pasa con "Mi semana"

De acuerdo en eliminarla **como destino** — pero sus funciones no pueden desaparecer, se mudan:

- El héroe ("te queda"), Anotar y Pagué se van al **Panel**, anclados a la semana en curso.
- La checklist de pagos y el detalle viven en **la semana**: tocas S2 (en el rail o en El mes) y ahí está todo.

Y el orden importa para no dejar al teléfono sin casa: el Panel todavía no existe (es el prompt de `IA-PANEL-JUBILEO.md`). Así que "Mi semana" **sigue existiendo hasta que el Panel llegue** — solo que después de este trabajo ya estará anclada a la semana del mes, no al cheque. Se elimina como destino en el paso del Panel. La píldora del teléfono termina siendo: **Panel · El mes · Deudas · Metas**.

## Los costos, con los ojos abiertos

1. **Es una migración de esquema y de datos.** Las asignaciones variables pasan del cheque a la semana. Punto de partida automático: repartir lo actual proporcional a los días de cada semana, editable después. Mismo acuerdo que ya tienes con Claude Code: te avisa antes de correr una migración contra producción.
2. **La invariante SQL se rehace** sobre el eje acumulado, con sus pruebas.
3. **Tu tesis del producto cambia oficialmente.** "Cheque a cheque" deja de ser el marco principal y pasa a ser el guardia y un lente. Hay que escribirlo en `SPEC.md` y en `CLAUDE.md` — si no, Claude Code va a "corregir" de vuelta hacia el cheque en tres sesiones, porque eso dicen hoy sus instrucciones.
4. **El aviso del domingo mejora gratis:** ya era semanal; ahora por fin habla del presupuesto de la semana que empieza, sus vencimientos y su alerta de apretada.

## La secuencia queda así

1. Claude Code termina el lote actual (panel de detalle + pantallas vacías).
2. **Este prompt** — el motor de semanas, el modelo híbrido, la vista en El mes.
3. El de `IA-PANEL-JUBILEO.md` — y ahí muere "Mi semana" como destino.
4. El de `SIDEBAR-JUBILEO.md` — el rail ya con números de verdad.

---

## Prompt para Claude Code

> Estás en el repo de Jubileo app. Lee `SEMANAS-PRESUPUESTABLES-JUBILEO.md` completo. Cambia el eje del presupuesto: los sobres variables se presupuestan **por semana del mes** (S1–S5); los fijos y las deudas siguen por fecha de vencimiento. El cheque deja de ser el eje y pasa a ser la regla de fondeo y un lente derivado.
>
> Antes de escribir código: este trabajo incluye **migración de esquema y de datos** (las asignaciones variables se mudan del periodo del cheque a la semana). Escribe primero la migración y sus pruebas, enséñamela, y espera mi confirmación antes de correrla contra producción — el mismo acuerdo de siempre.
>
> Un commit por paso, con `npm test`, `npm run typecheck` y las comprobaciones de navegador limpias en cada uno:
>
> 1. **`src/lib/semanas/`** — las semanas del mes: 1–7, 8–14, 15–21, 22–28 y 29–fin cuando existe. Pruebas para febrero de 28 y 29, y meses de 30 y 31. Cada semana con número, rango y días.
> 2. **El modelo:** asignación semanal para los sobres variables (esquema + RLS + migración con la traducción proporcional por días como punto de partida). La **invariante acumulada** en SQL: hasta la semana N no se reparte más de lo que entra hasta la semana N — con pruebas que la intenten romper.
> 3. **El número de cada semana:** fijos que se vencen en sus días + variable asignado + lo gastado + la bandera de apretada (se vence más de lo que hay). El arrastre dentro del mes: lo que sobra de un sobre en una semana pasa al mismo sobre en la siguiente.
> 4. **El mes, vista Semanas:** el control Semana · Cheque · Mes por fin funciona. En Semanas: las 4–5 con su monto, y dentro de cada una los fijos que caen (por fecha, solo lectura de monto) y los sobres variables editables. La vista Cheque se **deriva** de las fechas: qué cubre cada cheque, sin asignarse aparte.
> 5. **Mi semana se re-ancla a la semana del mes en curso** — héroe, Anotar, Pagué y checklist siguen ahí, pero el periodo es S1–S5, y el rótulo lo dice: "Semana 2 · 8 al 14". No la elimines todavía: eso pasa cuando llegue el Panel. Corrige todos los textos que decían "esta semana" sobre un periodo que no era una semana, incluido `lib/aviso/contenido.ts`.
> 6. **El aviso del domingo** habla de la semana que empieza: su presupuesto, sus vencimientos, y la alerta de apretada con qué mover.
> 7. **`SPEC.md` y `CLAUDE.md`:** deja escrito el eje nuevo — semanas presupuestables para lo variable, fechas para lo fijo, cheque como regla de fondeo y lente. Sin esto, las instrucciones viejas te van a hacer deshacer este trabajo en una sesión futura.
>
> Reglas de siempre: tokens de `design/design-tokens.css` como única fuente; solo `iconos.tsx` importa de `lucide-react`; un paso por turno, verificado. Agrega a `design/DECISIONES.md` por qué el eje cambió y por qué los fijos no se presupuestan por semana.
