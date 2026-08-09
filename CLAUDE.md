# Jubileo — App de Presupuesto

Presupuesto personal en español. El mes es el marco; adentro, **lo variable se
presupuesta por semana del mes (S1–S5)** y lo fijo vive en su fecha de
vencimiento. Los cheques —que se ajustan a la frecuencia de pago del usuario—
son la regla de fondeo y un lente derivado, **no el eje**. Se vende como
membresía desde jubileofinanciero.com.

Subtítulo del producto: **presupuesto cheque a cheque** — el cheque es cómo
entra el dinero y cómo se cuida que alcance; la semana es donde se reparte.
No "corrijas" el código de vuelta hacia el cheque como eje: ese cambio fue una
decisión (agosto 2026, `design/DECISIONES.md`), no un descuido.

---

## Antes de escribir código

1. Lee `SPEC.md` completo. Es el contrato del proyecto.
2. Los archivos en `design/` son el contrato visual. Extrae de ahí colores,
   tipografías, espaciados y estructura. **No rediseñes.**
3. Si algo del chat contradice `SPEC.md`, pregunta antes de decidir.

## Reglas que no se rompen

- **Dinero en centavos enteros.** Nunca flotantes. Formateo solo al presentar.
- **La lógica de periodos y la de semanas van en módulos puros, sin base de
  datos, con pruebas antes de conectarlas a nada.** Ver sección 6 de `SPEC.md`.
  Es la parte donde un error silencioso arruina el producto.
- **La invariante del eje semanal:** para cada línea repartible (mayordomía,
  variables, fondos), la suma de sus filas en `asignaciones_semana` debe igualar
  su monto mensual. Si no cuadra, el mes no se cierra. Lo fijo y las deudas no
  llevan plan semanal: vencen cuando vencen, y el esquema rechaza sus filas.
- **La regla de fondeo:** hasta la semana N no se reparte más de lo que entra
  hasta la semana N, sin contar el cheque extra. Vive en SQL
  (`semanas_sobregiradas`) y `cerrar_mes` la comprueba. La bandera de "apretada"
  del cliente es otra cosa a propósito: cuenta todo, fijos y extra incluidos,
  porque informa de la caja real — informar no es bloquear.
- **Nada de marcas de Ramsey Solutions** en el producto: no "Baby Steps", no
  "EveryDollar", no "Debt Snowball" como nombre de función. Ver sección 3 de `SPEC.md`.
- **Nunca auto-categorizar transacciones sin confirmación del usuario.** Presupuestar
  es un acto, no un reporte.
- **Las migraciones solo van hacia adelante.** Una migración que ya corrió contra el
  proyecto de Supabase **no se edita nunca más**, ni para arreglar un error, ni para
  cambiarle un comentario. El cambio va en un archivo nuevo: `0002_…`, `0003_…`. Si
  editas una que ya corrió, tu base y la del proyecto dejan de coincidir en silencio
  y nadie se entera hasta que algo truena en producción. `0001_esquema.sql` se
  reescribió varias veces mientras no existía el proyecto; desde que existe, se
  acabó.
- **Toda tabla nueva nace con RLS y con al menos una política**, y **toda columna de
  dinero nace en `bigint` con su `CHECK`.** No hace falta acordarse:
  `supabase/pruebas/04-reglas-del-esquema.sql` descubre las tablas y las columnas
  solo, y revienta si falta alguna. Si una tabla debe negar todo a propósito, escribe
  la política que niega — una tabla sin políticas también niega, pero no se distingue
  de un olvido.
- Fechas en UTC en la base; toda la lógica de periodos y avisos corre en la zona
  horaria del usuario.
- Interfaz en español, trato de tú. El texto en español ocupa ~20% más que en inglés:
  los componentes deben aguantarlo.

## Vocabulario de la interfaz

Usar siempre los mismos términos, y que los botones y sus confirmaciones usen el
mismo verbo: **cheque**, **semana** (la del mes, S1–S5, con su rango: "Semana 2 ·
del 8 al 14"), **apretada** (la semana en que se vence más de lo que ha llegado),
**sobre**, **fondo de reserva**, **fecha de libertad**, **enfoque** (la deuda que
se está atacando), **mayordomía**, **repartir**, **anotar**, **cerrar el mes**,
**cerrar la semana**.

## Stack

- React + TypeScript + Vite; Tailwind con los tokens de `design/design-tokens.css`
- Postgres administrado con autenticación (Supabase o equivalente)
- Stripe Checkout + Customer Portal + webhooks (los webhooks son la única fuente de
  verdad del nivel del usuario)
- IndexedDB como caché local; la verdad vive en el servidor
- Cron diario para los avisos

## Estructura

```
SPEC.md              contrato del proyecto
CLAUDE.md            este archivo
design/              contrato visual — no rediseñar
  escritorio.html
  sidebar.html       el marco de escritorio: navegación al costado
  movil.html
  listas.html
  design-tokens.css
  DECISIONES.md      por qué el diseño es como es. Léelo antes de "arreglarlo"
src/
  lib/periodos/      módulo puro + pruebas: los cheques
  lib/iconos/        las claves de icono y la sugerencia por nombre
  lib/semanas/       módulo puro + pruebas: el eje. Semanas del mes, números,
                     apretada, arrastre
  lib/dinero/        centavos enteros; el único lugar donde se divide dinero
  lib/fecha/         fechas civiles AAAA-MM-DD, sin zona horaria
  lib/deudas/        simulador de la fecha de libertad
  servidor/          mapeo puro + repositorios delgados
  componentes/       las pantallas, extraídas de design/
supabase/
  migraciones/       solo hacia adelante: 0001, 0002, 0003…
  pruebas/           se corren con ./supabase/pruebas/probar-esquema.sh
herramientas/        las comprobaciones de navegador y el candado de tokens
```

Migraciones corridas contra producción, y por lo tanto congeladas: **0001 a 0007**.
El cambio que sigue va en `0008_…`.

## Cómo trabajar

- Fase 1 es PWA. Nada de Tauri ni App Store todavía. Ver sección 12 de `SPEC.md`.
- Cambios chicos y verificables. Correr las pruebas de periodos y de semanas en
  cada cambio que toque fechas o el plan semanal.
- Commits en español, en imperativo: "agrega generador de periodos quincenales".
- Las llaves van en `.env`, nunca en el código ni en un commit.
- Al tocar el esquema, correr `./supabase/pruebas/probar-esquema.sh`. Levanta un
  Postgres desechable, aplica las migraciones y comprueba restricciones, modo pareja
  y políticas de RLS. No toca ninguna base real.
