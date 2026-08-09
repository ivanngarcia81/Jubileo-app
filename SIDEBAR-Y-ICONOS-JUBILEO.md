# Sidebar con el mes por semanas + iconos por categoría — v3

Este documento reemplaza a `SIDEBAR-JUBILEO-v2.md` y a `ICONOS-DE-CATEGORIA.md`. Es un solo lote con las dos cosas; dale a Claude Code únicamente este. El mockup `design/sidebar.html` no cambia y tiene que estar en el repo.

Los iconos van primero: son el bug visible en producción, y traen la única migración del lote — así el acuerdo de confirmación pasa al principio y el resto corre sin pausas. El sidebar además se ve bien a la primera, porque el rail y las píldoras ya nacen con los iconos correctos.

## Parte A — Los iconos por categoría (el bug de tu captura)

Los SVG sí renderizan: el rombo, el `$` y la chispa son lucide funcionando. Lo que no existe es el icono específico: `mapeo.ts:442` asigna por el grupo de la categoría, la tabla `categorias` no tiene columna de icono, y la hoja de crear categoría no lo pide. Los iconos específicos de `iconos.tsx` (`comida`, `transporte`, `casa`…) solo los usan los datos de ejemplo — ninguna categoría real sabe cuál le toca, y todo cae al genérico. El arreglo: una columna que guarda la clave (no el dibujo), una siembra por palabras clave en español como sugerencia editable, y un selector de ~16 iconos en la hoja de categoría.

## Parte B — El sidebar con el rail de semanas

La navegación se muda de la barra superior a un sidebar desde el corte `panel` (880px), como dibuja `design/sidebar.html`. Donde la referencia lista cuentas, Jubileo pone su contexto permanente: las semanas del mes, con números reales del motor que ya existe — pasadas atenuadas, la actual en teal, la apretada con punto y monto en ámbar, la S5 con sus días solo cuando existe. Debajo, Tu enfoque: la deuda de enfoque con saldo y barra. El Panel todavía no existe: la navegación de este lote es Mi semana · El mes · Deudas · Metas · Movimientos, con Ajustes y el avatar abajo; el renglón "Panel" del mockup entra en su propio prompt, y ahí se despide Mi semana. El teléfono no cambia en nada.

## Prompt para Claude Code

> Estás en el repo de Jubileo app. Lee `SIDEBAR-Y-ICONOS-JUBILEO.md` completo, y abre `design/sidebar.html` en el navegador y léelo como código — es el contrato del marco de escritorio; el contenido lo siguen rigiendo `design/listas.html` y los tokens.
>
> Son dos partes en un lote. La parte A trae la única migración: escríbela con sus pruebas, enséñamela y espera mi confirmación antes de correrla contra producción — el acuerdo de siempre. La parte B es solo interfaz.
>
> Un commit por paso, con `npm test`, `npm run typecheck` y las comprobaciones de navegador limpias en cada uno:
>
> **Parte A — iconos por categoría.** El bug: en producción toda categoría sale con el icono genérico de su grupo, porque `categorias` no tiene columna de icono, `mapeo.ts:442` asigna por grupo, y la hoja de categoría no lo pide.
>
> 1. **Migración 0007:** `categorias.icono text null` con CHECK contra la lista de claves válidas, y la siembra por palabras clave en español para lo existente (comida/súper/despensa → `comida`; gasolina/carro/auto/uber/bus → `transporte`; renta/casa/hipoteca → `casa`; luz/agua/internet/teléfono/servicios → `servicios`; seguro → `seguro`; el resto queda `null` = icono del grupo). Prueba SQL de que la siembra no pisa un icono ya elegido y de que una clave inválida se rechaza.
> 2. **`ClaveIcono` crece** con lo que falta para la vida real: `telefono`, `salud`, `ropa`, `regalo`, `mascota`, `ninos`, `ahorro`, `tarjeta`. Solo `iconos.tsx` importa de lucide, como siempre.
> 3. **`mapeo.ts` prefiere `categoria.icono`** y cae al grupo cuando es `null`. La misma preferencia en todas las filas y en `ChipCategoria` — verifica Movimientos, El mes, el panel de detalle y el aviso.
> 4. **El selector en la hoja de categoría** (crear y editar): la rejilla de claves con su dibujo, la sugerencia por nombre preseleccionada al escribir, guardado en la columna nueva. La función de palabras clave vive en `src/lib/` y la comparten el cliente y la migración — no dos copias.
>
> **Parte B — el sidebar.** El motor semanal ya existe (`lib/semanas`, `repositorios/semanas.ts`, el eje Semanas de El mes) — el rail consume esos números, no inventes ninguno.
>
> 5. **`Sidebar` nuevo** que reemplaza los enlaces de `BarraSuperior` desde el corte `panel`: navegación arriba (Mi semana · El mes · Deudas · Metas · Movimientos), Ajustes y avatar abajo. La barra superior queda solo como cabecera de contenido — título de la pantalla y fecha. El renglón "Panel" del mockup NO va todavía: entra con el prompt del Panel.
> 6. **`BandaIndicadores` se convierte** en las tres tarjetas de arriba del contenido (Entra · Sale · Sin repartir), y desaparece el fondo carbón con degradado del contenido.
> 7. **El rail "Mes por semanas":** las semanas del mes en curso con su rango; pasadas atenuadas, la actual resaltada, la apretada con punto y monto en ámbar; la S5 con sus días y solo cuando existe. El número es lo que te toca esa semana, del repositorio de semanas. Tocar una navega a El mes con el eje Semanas activo y esa semana desplegada — reutiliza el riel de Mi semana y el estado `semanasAbiertas` de ElMes; no inventes otro canal.
> 8. **El grupo "Tu enfoque":** la deuda de enfoque con saldo y barra, que navega a Deudas. Sin deudas activas, el grupo no aparece.
> 9. **Comprobaciones de navegador:** repara las que buscaban los enlaces en la barra vieja — ahora viven en el sidebar — y agrega dos: el rail enseña tantas semanas como tiene el mes (4 en un febrero normal, 5 en agosto), y tocar una semana del rail deja El mes en el eje Semanas con esa semana abierta.
> 10. **`CLAUDE.md` quedó atrás del eje nuevo** — ponlo al día aquí: el subtítulo sigue diciendo "presupuesto cheque a cheque". Escríbelo como es ahora: lo variable se presupuesta por semana del mes, lo fijo por fecha, el cheque es la regla de fondeo y un lente. Si no se escribe, una sesión futura "corrige" el código de vuelta hacia el cheque.
>
> Reglas de siempre: tokens de `design/design-tokens.css` como única fuente; solo `iconos.tsx` importa de `lucide-react`; las fuentes de la app son las locales de `public/fuentes/` — no copies el `<link>` de Google Fonts del mockup. Un paso por turno, verificado. Actualiza `SPEC.md` y agrega a `design/DECISIONES.md` por qué el icono es una clave en la base y no un dibujo, y por qué el rail lleva semanas y no cuentas.

---

## Notas al recibirlo (agosto de 2026)

Lo que se revisó contra el repo antes de empezar, y las decisiones que se tomaron:

- **El paso 10 ya estaba hecho.** `CLAUDE.md` se puso al día con el eje semanal en el commit
  `190aa06`, al cerrar el lote de semanas presupuestables. Se verifica y se deja dicho, pero no
  hay nada que reescribir.
- **La función de palabras clave no se puede "compartir" literalmente**: la migración es SQL
  corriendo dentro de Postgres y no puede importar TypeScript. Va como espejo, el patrón de
  `repartir` ↔ `reparto_semanal`: el módulo de `src/lib/` es la fuente, la migración lo copia, y
  una prueba fija los dos contra los mismos casos.
- **La tipografía del mockup no cabe en la escala de seis** (usa 9.5, 10, 10.5, 11.5, 12, 13, 16 y
  44). Se mapea a los seis tamaños, igual que se hizo con los otros mockups. El sidebar no queda
  idéntico al píxel, a propósito.
- **El marco `.app` del mockup —esquinas de 20px y sombra— no se copia.** Es el marco del
  documento, no el de la app. Ver el primer párrafo de `design/DECISIONES.md`.
- **"Mi semana" en escritorio abre lo que hoy es Resumen.** Sin Panel, el enrutador sigue mapeando
  `semana → resumen`; lo que cambia es el nombre del destino, no la pantalla.
- **El número del rail es lo presupuestado** (`totalCents`: lo fijo que vence más lo variable
  asignado), el mismo que enseña El mes › Semanas. En el mockup coincide con el héroe porque nada
  se había gastado todavía.
- **Las filas del rail llevan el mínimo tocable en puntero grueso.** El corte `panel` empieza en
  880px, así que un iPad horizontal recibe este marco con dedo y no con puntero.
