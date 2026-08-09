# El Dashboard como pantalla de inicio

**Reemplaza a `IA-PANEL-JUBILEO.md`** (nunca se subió al repo). Aquel se
escribió cuando el eje era el cheque, la pantalla se llamaba "Panel" y "Mi
semana" seguía viva. Verificado contra el repo en `7d4e9da`.

## Depende del lote anterior

Este trabajo va **después** de `RENOMBRAR-Y-TRES-CIFRAS.md`, que concentra los
rótulos en un módulo y bautiza la ruta `resumen` como **Dashboard**. Si ese
lote no está hecho, los nombres quedarían escritos tres veces otra vez.

## Qué cambia

Hoy la pantalla de inicio del teléfono es "Mi semana" — una pantalla de
ejecución hecha casa. Pasa a ser el **Dashboard**: resume y despacha, con la
acción diaria adentro para que meter un gasto no cueste dos toques.

**"Mi semana" desaparece como destino.** Sus tres funciones se mudan:

- El héroe ("te queda"), Anotar y Pagué → la primera tarjeta del Dashboard.
- La checklist de pagos → el detalle de la semana, en Presupuesto mensual.
- El riel de semanas → ya vive en el sidebar de escritorio; en el teléfono se
  queda en la primera tarjeta.

La píldora del teléfono queda: **Inicio · Presupuesto · Deudas · Metas**.
Movimientos y Ajustes se llegan como hoy.

## Las tarjetas, en este orden

1. **La semana en curso** — el héroe teal con "te queda", el rótulo de la
   semana ("Semana 2 · del 8 al 14 de agosto") y los chips de **Anotar** y
   **Pagué** dentro de la tarjeta. → *Presupuesto mensual, eje Semanas*
2. **Cómo va el reparto** — dos líneas: lo gastado contra el ritmo del plan,
   con la píldora de cuánto vas por encima o por debajo hoy. Sale de
   `presupuesto` y del motor de semanas; **nada de datos de relleno**. →
   *Presupuesto mensual*
3. **Por revisar** — los movimientos sin sobre asignado, con la acción en
   bloque. La columna `revisada` ya existe. Con datos manuales estará vacía
   casi siempre, y vacía tiene que decir algo útil. → *Movimientos*
4. **Lo que viene** — los pagos de los próximos catorce días. Es el mismo
   contenido del aviso del domingo, y está bien que se repita: uno llega solo,
   el otro se consulta. → *Presupuesto mensual*
5. **Salir de deudas** — saldo total, deuda de enfoque y fecha de libertad. →
   *Deudas*
6. **Fondos de reserva** — dos o tres barras. → *Metas*

**Ojo con no duplicar:** en el escritorio las tres tarjetas de Entra · Sale ·
Sin repartir ya son la cabecera del contenido desde el lote del sidebar. El
Dashboard va **debajo** de ellas y no repite esas cifras.

**Insights no va en este lote.** Cuando llegue, va completo y en premium, con
gráficas de semanas primero y de meses cuando haya meses.

---

## Prompt para Claude Code

> Estás en el repo de Jubileo app. Lee `DASHBOARD-JUBILEO.md`. La pantalla de
> inicio pasa a ser el Dashboard: resume y despacha, con la acción diaria
> adentro. "Mi semana" se despide como destino y sus funciones se mudan.
>
> **Requisito previo:** el lote de `RENOMBRAR-Y-TRES-CIFRAS.md`. Si no está
> hecho, detente y dímelo.
>
> Un commit por paso, con `npm test`, `npm run typecheck` y las comprobaciones
> de navegador limpias en cada uno:
>
> 1. **El Dashboard como inicio.** `RUTA_INICIAL` pasa a `resumen`. En el
>    sidebar, Dashboard queda de primero y "Mi semana" ya no aparece. La
>    píldora del teléfono queda **Inicio · Presupuesto · Deudas · Metas**;
>    `rutaMovil` deja de mandar `resumen` a `semana` y la ruta `semana` sale de
>    `RUTAS`. Redirige `#/semana` a `#/resumen`.
> 2. **Componente `Dashboard`** compartido por teléfono y escritorio, con las
>    seis tarjetas en el orden del documento, cada una con su enlace a la
>    sección. Reutiliza lo que ya existe — no dupliques nada.
> 3. **La tarjeta del reparto:** dos líneas, gastado contra el ritmo del plan,
>    con la píldora de cuánto vas por encima o por debajo hoy.
> 4. **La tarjeta de Por revisar** con la acción en bloque.
> 5. **Retira `MiSemana` como pantalla** solo cuando las tarjetas 1 y 4 ya
>    cubran lo suyo, y mueve la checklist de pagos al detalle de la semana en
>    Presupuesto mensual. Ninguna función se pierde en el camino; si algo no
>    tiene dónde vivir todavía, dímelo antes de borrarlo.
> 6. **Pantallas vacías con frase útil** en las seis tarjetas.
> 7. **Comprobaciones de navegador:** que la app abre en el Dashboard, que
>    `#/semana` redirige, que cada tarjeta lleva a su sección, y que Anotar
>    abre su hoja desde el Dashboard.
>
> Reglas de siempre: tokens de `design/design-tokens.css` como única fuente;
> solo `iconos.tsx` importa de `lucide-react`; un paso por turno, verificado.
> Actualiza `SPEC.md` y agrega a `design/DECISIONES.md` por qué el Dashboard
> abre con la semana en curso y sus chips y no con el patrimonio neto.

---

## Notas al hacerlo

*(Agosto de 2026. Lo que se decidió sobre la marcha y no estaba en el
documento:)*

1. **Tres funciones se quedaban sin casa** y ninguna se borró. Están escritas
   en `design/DECISIONES.md`: **cerrar la semana** quedó como tercer chip de la
   primera tarjeta (es un verbo del vocabulario y un flujo de tres preguntas);
   **la invitación a premium** y **el coach** bajaron al final, condicionadas a
   que apliquen. Una cuenta premium con coach ve exactamente las seis tarjetas.
2. **La checklist de pagos** vive en la hoja del chip "Pagué" y no en el
   detalle de la semana todavía. El chip abre **siempre**, incluso sin poder
   marcar nada, porque es también la única manera de *ver* los pagos de la
   semana desde el inicio. Mudarla al detalle de la semana es el paso 5, que
   queda pendiente.
3. **El panel de escritorio (`Resumen.tsx`) se retiró entero.** Su gráfica de
   barras la reemplaza la tarjeta de reparto, que mide contra el *ritmo* del
   plan; sus movimientos recientes los reemplaza "Por revisar"; sus deudas y
   fondos tienen su tarjeta; premium y coach bajaron con él.
4. **`MiSemana.tsx` sigue en el repo** como fuente del héroe compartido, pero
   ya no es alcanzable como pantalla. Retirarla del todo es el paso 5.
