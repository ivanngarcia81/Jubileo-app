# SPEC — App de Presupuesto · Jubileo Financiero

> Este archivo es el contrato del proyecto. Léelo completo antes de escribir código.
> Si algo aquí choca con una petición del chat, pregunta antes de decidir.

---

## 1. Qué estamos construyendo

Una app de presupuesto personal en español, con método de presupuesto base cero, para el público de Jubileo Financiero (coaching financiero en español, principalmente comunidad latina en Estados Unidos).

Se vende como membresía desde `jubileofinanciero.com`, con nivel gratis y nivel premium.

**El diferenciador central, y la razón de existir de la app:**

> El mes es siempre el marco del presupuesto. Adentro, **lo variable se presupuesta por semana del mes** (S1–S5) y lo fijo vive en su fecha de vencimiento. Los cheques —los subperiodos que se ajustan a la frecuencia de pago real del usuario— son **la regla de fondeo y un lente**, no el eje: el dinero entra cuando entra, y hasta la semana N no se reparte más de lo que entra hasta la semana N.

Ninguna app grande hace esto bien. Todo el diseño gira alrededor de esta idea. *(El eje pasó del cheque a la semana en agosto de 2026 — ver la sección 6 y `design/DECISIONES.md`. Si algo en este documento todavía suena a "se reparte entre los cheques", perdió contra esta línea.)*

**A quién le hablamos.** Persona que cobra por cheque, muchas veces en efectivo o con ingreso variable, que se queda corta la última semana del mes, que manda dinero a su familia en otro país, y que está pagando deudas. Puede tener 50 años y poca paciencia con software. La app tiene que ser obvia.

---

## 2. Principios de producto

1. **La notificación es el producto; la app es el respaldo.** El usuario debe poder saber su semana sin abrir nada. Abre la app solo a verificar lo que entró y lo que gastó.
2. **Una pantalla, un número.** Cada vista tiene un dato principal grande y todo lo demás en segundo plano.
3. **Presupuestar es un acto, no un reporte.** El usuario asigna; la app nunca decide por él. Ver el punto sobre Plaid en la sección 11.
4. **Funciona sin banco conectado.** La captura manual es el modo por defecto, no un modo degradado.
5. **Español primero.** Toda la interfaz, los correos y los avisos nacen en español. El texto en español ocupa ~20% más que en inglés: los componentes deben aguantarlo sin cortar palabras.

---

## 3. No-objetivos y restricciones legales

Estas reglas no son negociables.

- **No usar marcas de Ramsey Solutions** en ninguna parte del producto: nada de "Baby Steps", "Paso de bebé", "EveryDollar", "Financial Peace", "Total Money Makeover", "Debt Snowball" como nombre de función. Describir el método en genérico: *presupuesto base cero*, *pagar la deuda más pequeña primero*, *fondo de emergencia*, *pasos de libertad financiera*.
- **No clonar la interfaz de EveryDollar** ni copiar sus textos, nombres de categorías ni estructura de pantallas.
- **No dar consejo de inversión, legal ni de impuestos** dentro de la app. La app organiza dinero; no recomienda productos financieros.
- **No es una app de pagos.** No mueve dinero, no hace transferencias, no paga cuentas.
- **No auto-categorizar sin confirmación.** Ver sección 11.
- No hay chat, no hay red social, no hay foro. No hay gamificación con puntos ni insignias, salvo el reto de 30 días (fase 4).

---

## 4. Arquitectura

### Fase 1 — Web app instalable (PWA)

- Un solo frontend responsivo que sirve escritorio y teléfono.
- Servido en el subdominio `app.jubileofinanciero.com`. El sitio de marketing sigue en su propio repo, intacto.
- Instalable en iPhone y Android desde el navegador ("Agregar a la pantalla de inicio"). El onboarding debe empujar esto: sin instalación no hay notificaciones push en iOS.
- Datos en el servidor, no locales. Escritorio y teléfono ven exactamente lo mismo.

### Fase 2 — Envoltura Tauri para App Store

- Tauri 2, apuntando a iOS y iPadOS, reutilizando el mismo frontend.
- **Regla dura:** dentro de la app nativa no hay registro, ni precios, ni botón de comprar, ni enlaces a pagar. Solo "Iniciar sesión". La cuenta y el pago se hacen en la web. Esto es para no caer en la obligación de compra dentro de la app de Apple.

### Stack propuesto

- **Frontend:** React + TypeScript + Vite. Tailwind con los tokens de `/design/design-tokens.css`.
- **Backend y base de datos:** Postgres administrado con autenticación incluida (Supabase o equivalente). Autenticación por correo con enlace mágico o contraseña; nada de contraseñas propias hechas a mano.
- **Trabajos programados:** un cron diario que dispara los avisos (sección 9).
- **Pagos:** Stripe Checkout + Customer Portal + webhooks.
- **Caché local:** IndexedDB para lectura sin señal y captura de gastos en cola. Sincroniza al recuperar conexión. La verdad vive en el servidor.

### Reglas técnicas

- **Todo el dinero en centavos enteros.** Nunca flotantes. Formateo solo en la capa de presentación.
- Fechas guardadas en UTC; toda la lógica de periodos y avisos corre en la zona horaria del usuario, que se guarda en su perfil.
- Un solo lugar en el código donde se genera el calendario de periodos. Con pruebas. Ver sección 6.
- Accesibilidad: 17px base en móvil, contraste mínimo AA, objetivos tocables de 44px, ningún gesto oculto sin botón equivalente.

---

## 5. Modelo de datos

Nombres orientativos; ajusta a la convención del proyecto.

**usuarios**
- id, correo, nombre, zona_horaria, nivel (`gratis` | `premium`), stripe_customer_id
- frecuencia_pago: `semanal` | `cada_dos_semanas` | `dos_veces_al_mes` | `mensual` | `variable`
- fecha_ancla (fecha de un cheque conocido, base para generar los periodos)
- dias_pago (para `dos_veces_al_mes`, ej. `[1, 15]`)
- ingreso_esperado_cents (opcional; nulo si el ingreso es variable)
- creado_en

**meses**
- id, usuario_id, anio, mes, estado (`borrador` | `activo` | `cerrado`)
- Único por (usuario_id, anio, mes)

**periodos**
- id, usuario_id, mes_id, numero, fecha_inicio, fecha_fin, fecha_pago
- ingreso_esperado_cents, ingreso_real_cents (nulo hasta que el usuario confirma)
- es_extra (booleano: tercer cheque en meses de 3)
- estado (`futuro` | `activo` | `cerrado`)

**categorias**
- id, usuario_id, nombre, orden, activa
- grupo: `mayordomia` | `fijo` | `variable` | `deuda` | `fondo`
- es_fija (booleano: monto igual todos los meses)
- dia_vencimiento (1–31, nulo para variables) — **campo obligatorio para las fijas: sin él el aviso semanal pierde la mitad de su valor**
- icono — **la clave, no el dibujo** (`'comida'`, no un SVG). Nulo significa "no eligió", y entonces manda el icono del grupo; no es lo mismo que `'gasto'`, que sí es elegir el genérico. Un CHECK la limita a las claves que la interfaz sabe dibujar. La lista vive en `src/lib/iconos/claves.ts`, con la sugerencia por nombre que la migración espeja en SQL.

**lineas_presupuesto**
- id, mes_id, categoria_id, monto_mensual_cents

**asignaciones_semana** ← *la capa clave del producto (0005)*
- id, mes_id, linea_presupuesto_id, semana (1–5), monto_cents
- Solo para lo repartible: `mayordomia`, `variable` y `fondo`. Lo fijo y las deudas **no llevan plan semanal** — pesan en la semana de su vencimiento, y un disparador rechaza sus filas.
- **Invariante:** para cada línea repartible, la suma de sus semanas debe igualar `monto_mensual_cents`. Si no cuadra, la interfaz lo marca y el mes no se puede cerrar.
- **Regla de fondeo (el guardia, en SQL):** hasta la semana N, lo repartible acumulado no puede pasar de lo que entra acumulado hasta la semana N — sin contar el cheque extra, que no financia el mes. `cerrar_mes` la comprueba.

**asignaciones** *(legado 0001)*
- El reparto por cheque. El cliente ya no lo lee ni lo escribe; un puente en el esquema lo mantiene poblado para clientes viejos hasta la migración de contracción, que se lleva la tabla.

**transacciones**
- id, usuario_id, periodo_id, categoria_id (nulo si está pendiente), fecha, monto_cents
- tipo (`gasto` | `ingreso`), descripcion, comercio
- origen (`manual` | `plaid`), estado (`pendiente` | `asignada`)
- revisada (booleano) — **el usuario ya lo vio.** Lo que anota a mano nace en
  `true`; lo que llegue del banco, en `false`. Es otra pregunta que `estado`,
  que dice si tiene sobre: del banco puede llegar algo categorizado y sin ver,
  o visto y todavía sin sobre.

**deudas**
- id, usuario_id, nombre, saldo_cents, pago_minimo_cents, tasa_interes, orden
- es_enfoque (booleano: solo una a la vez), pagada_en

**fondos_reserva**
- id, usuario_id, nombre, meta_cents, acumulado_cents, fecha_objetivo
- Derivado, no guardado: cuánto apartar por periodo para llegar a la meta.

**preferencias_aviso**
- id, usuario_id, canal (`push` | `correo` | `sms`), dia_semana, hora_local, activo
- Gratis: solo `correo`. Premium: los tres, con hora elegible.

**hogares** *(fase 4, modo pareja)*
- id, nombre; **miembros_hogar**: hogar_id, usuario_id, rol. Los datos del presupuesto cuelgan del hogar, no del usuario. Diseña las llaves con esto en mente desde el día uno para no migrar después.

---

## 6. La lógica de periodos y semanas — el corazón del proyecto

Esta es la parte donde se gana o se pierde el producto. Aíslala en módulos puros, sin acceso a base de datos, con pruebas unitarias exhaustivas: `lib/periodos` genera los cheques y `lib/semanas` genera el eje.

### El eje semanal

- **Las semanas son del calendario del mes**, no de la semana civil: 1–7, 8–14, 15–21, 22–28 y 29–fin cuando existe. Cuatro semanas de 7 días siempre, y la quinta de 1–3 días o ninguna (febrero de 28). Así "la semana 2 de julio" y "la semana 2 de agosto" miden lo mismo y se pueden comparar.
- **Lo variable y la mayordomía se presupuestan por semana.** Cada peso repartible vive en una sola semana. El monto mensual de una línea repartible **es la suma de sus semanas** — editar una semana edita el mes.
- **Lo fijo y las deudas van por fecha.** La renta con `dia_vencimiento` 3 cae en la semana 1 sola; nadie la presupuesta a mano. Sin fecha, cuenta en la última semana: no se le exige antes de tiempo.
- **El número de cada semana** = lo fijo que vence en sus días + lo variable asignado. Con eso salen la bandera de **apretada** (acumulada: hasta aquí se vence más de lo que ha llegado — informa, no bloquea, y sí cuenta el cheque extra porque mide la caja real) y el **arrastre dentro del mes**: lo que sobra de un sobre pasa al mismo sobre en la semana siguiente, y lo que se pasó también viaja, en negativo.
- **El cheque queda de guardia y de lente.** El guardia es la regla de fondeo de la sección 5, en SQL, sobre lo repartible y sin el extra. El lente se deriva de las fechas: cada cheque cubre los fijos que vencen y las semanas del plan que arrancan antes de que llegue el siguiente; el extra no cubre nada. Nada de esto se asigna aparte.

### El motor de cheques

**Entrada:** frecuencia de pago, fecha ancla, días de pago, y el mes a generar.
**Salida:** lista de periodos con fecha de inicio, fecha de fin y fecha de pago.

### Reglas por frecuencia

- **`semanal`** — Semanas del mes; pueden ser 4 o 5. Nunca asumir 4: la quinta semana es exactamente donde el usuario truena. La semana empieza el día que el usuario cobra.
- **`dos_veces_al_mes`** — 24 al año, siempre 2 por mes, en los días configurados (típico: 1 y 15, o 15 y último). Los periodos caen limpios dentro del mes.
- **`cada_dos_semanas`** — 26 al año, cada 14 días desde la fecha ancla. Dos meses del año traen **3 cheques**. Los periodos cruzan el límite del mes.
- **`mensual`** — Un solo periodo que es el mes.
- **`variable`** — Periodos semanales. `ingreso_esperado_cents` queda nulo; el usuario captura lo que entró al arrancar el periodo y ahí se reparte. **Nunca se presupuesta ingreso que no ha entrado.**

### Reglas que cruzan meses

1. **Un cheque se asigna al mes que financia, no al mes en que cae.** Un cheque del 28 de agosto que paga cuentas de septiembre pertenece a septiembre. Por defecto asigna al mes de la fecha de pago; el usuario puede moverlo con un control explícito.
2. **Meses de 3 cheques:** la app los detecta sola y lo dice en la interfaz. El tercer cheque se marca `es_extra`, **no financia el mes** —el guardia no lo cuenta como ingreso repartible— y llega entero. Sugerencia por defecto: va completo a la deuda de enfoque, o al fondo de emergencia si no hay deudas.
3. **Cambiar de frecuencia no rehace el presupuesto.** Es un solo control en ajustes: se regeneran los periodos y ya. Los montos mensuales no se tocan, y **el plan semanal tampoco** — las semanas del mes no dependen de cuándo te pagan. Esto debe tener prueba.

### Pruebas mínimas exigidas

- Un mes con 5 semanas en modo `semanal`.
- Los dos meses de 3 cheques del año en modo `cada_dos_semanas`, con la fecha ancla en distintos días de la semana.
- Febrero, incluyendo año bisiesto.
- Un cheque que cae el 28–31 y financia el mes siguiente.
- Cambio de `semanal` a `cada_dos_semanas` con presupuesto ya armado: los montos mensuales y el plan semanal quedan idénticos.
- Un mes que cierra con la invariante semanal violada: debe rechazarse.
- El guardia de fondeo: cargar la semana 1 con dinero que llega el 20 debe rechazarse al cerrar; presupuestar la semana 3 con ese mismo cheque debe pasar, porque llega antes de que la semana 3 termine.
- Una fila en una semana que el mes no tiene (la 5 de un febrero de 28): debe rechazarse — es dinero que ninguna vista enseña.

---

## 7. Pantallas

El contrato visual está en `/design`. **Extrae de ahí colores, tipografías, espaciados y estructura. No rediseñes.**

- `/design/escritorio.html` — panel de computadora
- `/design/movil.html` — cuatro pantallas de teléfono
- `/design/design-tokens.css` — variables de color y tipografía
- `/design/listas.html` — el sistema de listas: la tarjeta es la **sección**, no
  el renglón; filas en grid con las mismas columnas, la barra en su propio
  carril, grupos que se abren y se cierran, y la píldora de categoría

### Móvil

1. **Dashboard** *(inicio, ruta `#/resumen`)* — Resume y despacha, con la acción diaria adentro. Héroe turquesa con lo que queda en los sobres de la semana (con su arrastre), el rótulo que dice cuál es —"Semana 2 · del 8 al 14"— y los chips de *Anotar* y *Pagué* dentro de la primera tarjeta, para que meter un gasto no cueste dos toques. *(La dirección vieja `#/semana` redirige aquí.)*
2. **Presupuesto mensual** *(ruta `#/mes`)* — Base cero. Selector de mes con barras (entra / sale / sobró) y el segmentado **Semanas · Cheques · Mes**. En Semanas, las 4–5 del calendario con **Planeado, Gastado y Queda** y su bandera de apretada: adentro los fijos que caen por fecha (solo lectura) y los sobres editables por semana. En Cheques, la vista derivada con las mismas tres cifras bajo otros rótulos —**Entra, Cubre, Queda**—. En Mes, el árbol por grupos: mayordomía, fijos con su día, variables, deudas, y los fondos de reserva.

   De las tres cifras, **solo Queda lleva color** (teal · ámbar del 80% · rojo pasado el 100%): es la que contesta la pregunta con la que se abre la app. En el teléfono salen Queda y Planeado con la barra, y Gastado aparece al abrir el renglón.
3. **Deudas** — Héroe carbón con la fecha de libertad. Deslizador de "¿y si mandas un pago extra?" que recalcula la fecha en vivo. Lista en orden de saldo, menor primero, con la de enfoque marcada.
4. **Metas** — Los fondos de reserva, con su barra y para cuándo se necesitan.
5. **Movimientos** — Todo lo del mes agrupado por día, con lo que entró y lo que
   salió en cada encabezado, la píldora del sobre, el cheque del que salió y la
   casilla de revisado. Arriba, cuando hay algo que hacer, la barra de "te
   faltan N por revisar" con la acción en bloque.
6. **El aviso** — No es una pantalla de la app: es la notificación. Ver sección 9.

Navegación flotante en píldora oscura, cuatro destinos: **Inicio · Presupuesto ·
Deudas · Metas**. **Ajustes y Movimientos viven fuera de la píldora** —son
cuatro y así lo dibuja el mockup—: a Ajustes se llega tocando el avatar y a
Movimientos desde el Dashboard.

Los nombres de los destinos salen de un solo módulo, `src/componentes/rotulos.ts`,
en dos formas: la larga para el sidebar y la cabecera de escritorio, la corta
para la píldora, donde "Presupuesto mensual" no cabe. El resto —Deudas, Metas,
Movimientos, Ajustes— usa la misma palabra en los dos sitios.

El detalle de un movimiento es **un solo componente** para los dos lados: en la
computadora es la columna de la derecha que sigue a la fila escogida; en el
teléfono sube desde abajo en una hoja.

### Escritorio

**Sidebar carbón al costado**, desde el corte `panel` (880px) — contrato: `/design/sidebar.html`. Tres zonas:

1. **Navegación:** Dashboard · Presupuesto mensual · Deudas · Metas · Movimientos, con Ajustes y el avatar al pie. El Dashboard es el primero y es la pantalla de inicio.
2. **El mes por semanas** — el contexto permanente del producto, donde otras apps ponen las cuentas conectadas. Las 4–5 semanas con su rango; las pasadas atenuadas, la actual en teal, la apretada con punto y monto en ámbar, y la quinta solo cuando el mes la tiene, rotulada con sus días. El número es **lo que te toca esa semana**, el mismo de El mes › Semanas. Tocar una abre El mes en el eje Semanas con esa semana desplegada.
3. **Tu enfoque** — la deuda que se está atacando, con su saldo y una barra que mide lo **pagado**. Sin deudas, la zona no aparece.

A la derecha, la cabecera del contenido —el nombre de la pantalla y la fecha— y tres tarjetas con entra, sale y sin repartir. Debajo, el lienzo de tres columnas: reparto y gráfica de planeado vs. gastado; movimientos y bloque de premium; fondos de reserva y bloque del coach.

El "Ver todos" de la tarjeta de movimientos abre la pantalla de Movimientos.

El sidebar lleva el color de fondo, así que llega al borde izquierdo y al alto de la pantalla; el que se detiene es el contenido. Ver `design/DECISIONES.md`.

### Onboarding — 6 pasos, nada más

1. ¿Cada cuánto te pagan? *(esto define la frecuencia y la fecha ancla)*
2. ¿Cuánto entra, más o menos? *(o "es variable")*
3. Tus gastos fijos, con día de vencimiento
4. Tus deudas, con saldo y mínimo
5. ¿Cuándo quieres el aviso, y por dónde?
6. Instala la app en tu pantalla de inicio *(paso destacado, con instrucciones distintas para iPhone y Android)*

Al terminar, el usuario ve su primera semana ya armada. Nunca una pantalla vacía.

---

## 8. Estados vacíos y errores

- Pantalla vacía = invitación a actuar, con el botón que resuelve. Nunca un dibujo con "no hay nada aquí".
- Lista vacía = una frase que diga **qué falta y por qué vale la pena**, no "sin
  datos". Un panel en blanco con su encabezado y nada adentro se lee como un
  error de carga.
- Los errores dicen qué pasó y cómo arreglarlo, sin disculparse y sin jerga.
- Si el usuario se pasó de un sobre, la app lo dice sin regañar: *"Te pasaste $12 en gasolina. ¿De dónde lo tomamos?"* con opciones concretas.

---

## 9. Los avisos

**El aviso de arranque de periodo** es la función más importante del producto. Lo dispara la llegada de un cheque —el dinero entra cuando entra— y **habla de la semana del mes que arranca con él**.

Contenido, en este orden:
1. Cuánto entra y qué día. Si el ingreso es variable, la pregunta es *"¿cuánto entró?"*.
2. De qué semana se trata y cuánto suma: *"Semana 2 · del 8 al 14 · presupuesto de $370"*.
3. La alerta de **apretada**, solo cuando hace falta, con cifra y con salida: cuánto se vence de más hasta el fin de la semana y cuánto traen sus sobres, que es lo único que se puede mover. Si lo que aprieta es fijo, se dice que no hay sobres que mover.
4. Las cuentas y deudas que vencen dentro de la semana, con su fecha y su monto entero. La de enfoque se señala como pago extra.
5. Los sobres de la semana, con lo asignado a ella.
6. Cuánto queda: lo que entra con el cheque menos lo que la semana compromete.

**El aviso de cierre de periodo:** tres preguntas, treinta segundos. ¿Entró lo esperado? ¿Cuánto gastaste en los sobres variables? ¿Pagaste lo que faltaba?

Implementación:
- Cron diario que evalúa qué usuarios arrancan o cierran periodo y respeta hora local y canal elegido.
- Canales: correo (todos), push web y SMS (premium). Push en iOS solo funciona si la app está instalada en la pantalla de inicio — detecta si no lo está y ofrece correo mientras tanto.
- Registro de envíos para no duplicar. Idempotente por (usuario, periodo, tipo de aviso).
- En modo pareja el aviso llega a los dos, con el mismo número.

---

## 10. Membresía

**Gratis**
- Presupuesto mensual base cero completo
- Motor de subperiodos por frecuencia de pago *(el diferenciador va gratis: es lo que hace que la gente lo cuente)*
- Sobres del periodo, captura manual de gastos
- Deudas con fecha de libertad
- Resumen semanal **por correo**
- Historial: mes actual y el anterior

**Premium — $8 al mes o $79 al año**
- Aviso al teléfono (push y SMS), canal y hora elegibles
- Banco conectado (fase 3)
- Modo pareja (fase 4)
- Planificador de remesas (fase 4)
- Fondos de reserva ilimitados
- Historial completo, comparar meses, tendencias
- Simulador "¿qué pasa si?"
- Exportar el presupuesto en PDF
- Compartir con el coach

**Reglas de negocio**
- Premium incluye **2 cuentas bancarias conectadas**. Más cuentas requieren nivel superior o cargo adicional. Esto es por el costo de Plaid: se cobra por cuenta conectada, no por usuario.
- El pago se hace en la web con Stripe. Los webhooks son la única fuente de verdad del nivel del usuario.
- Al vencer premium, la cuenta baja a gratis sin borrar datos: el historial viejo queda visible en modo lectura.
- Código de cortesía: premium gratis por 3 meses para clientes de coaching. Necesita tabla de códigos con vencimiento y un solo uso.

---

## 11. Plaid — fase 3, no antes

Cómo se usa, y esto es filosófico, no técnico:

- Plaid trae las transacciones como **pendientes de asignar**. El usuario las manda a su sobre con un toque.
- Plaid **verifica** saldos y el ingreso que entró — que es justo lo que pregunta el aviso de cierre.
- La captura manual sigue existiendo y sigue siendo el modo por defecto.

**Nunca** dejar que las transacciones caigan categorizadas y listas sin que el usuario toque nada. Si eso pasa, el usuario deja de presupuestar y empieza a leer un reporte, y se pierde el efecto del método completo.

Notas de implementación: empezar en sandbox; el producto que se necesita es Transactions, que se cobra como suscripción mensual por cuenta conectada; guardar los access token cifrados y nunca en el cliente; manejar el estado de conexión caída y avisarle al usuario con instrucciones para reconectar.

---

## 12. Fases de entrega

**Fase 1 — El núcleo (PWA)**
Autenticación, onboarding de 6 pasos, motor de periodos con sus pruebas, presupuesto base cero, asignación por periodo con la invariante, sobres, captura manual, Dashboard, Presupuesto mensual, deudas con fecha de libertad, fondos de reserva, resumen semanal por correo, Stripe con los dos niveles.
*Criterio de aceptación:* un usuario nuevo cobra cada dos semanas, se registra, arma su mes, y recibe el correo del domingo con los números correctos, incluido el mes de 3 cheques.

**Fase 2 — Envoltura Tauri para iOS y iPadOS**
Mismo frontend, sin registro ni precios dentro. Push nativo.

**Fase 3 — Banco conectado**
Plaid en premium, con el flujo de "pendientes de asignar".

**Fase 4 — Los diferenciadores grandes**
Modo pareja con la reunión mensual de dinero guiada. Planificador de remesas con tipo de cambio y la alerta de remesa contra interés alto. Panel del coach. Reto de 30 días.

---

## 13. Vocabulario de la interfaz

Usar siempre los mismos términos. Un botón dice exactamente lo que hace, y el mensaje de confirmación usa el mismo verbo.

- **cheque** (no "periodo de pago", no "pay period")
- **semana** para la semana del mes (S1–S5), el eje donde se presupuesta; el rótulo dice su rango: "Semana 2 · del 8 al 14"
- **apretada** para la semana en la que se vence más de lo que ha llegado
- **sobre** para las categorías variables
- **fondo de reserva** para el ahorro con propósito y fecha
- **fecha de libertad** para la fecha en que sale de deudas
- **enfoque** para la deuda que se está atacando
- **mayordomía** para diezmo y ofrenda
- **repartir** para asignar dinero a categorías
- **anotar** para registrar un gasto
- **cerrar el mes** / **cerrar la semana**

Trato de tú, no de usted. Frases cortas. Nada de "¡Felicidades!" con signos de exclamación en cada acción.
