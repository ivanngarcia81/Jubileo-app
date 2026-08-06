# Jubileo — presupuesto cheque a cheque

App de presupuesto personal en español para el público de Jubileo Financiero.
El mes es siempre el marco; los subperiodos se ajustan a la frecuencia de pago
real del usuario.

El contrato del proyecto está en [`SPEC.md`](SPEC.md). El contrato visual está
en [`design/`](design/) — **no se rediseña**.

## Correr

```bash
npm install
npm run dev        # http://localhost:5173
```

## Comprobar

```bash
npm test           # pruebas (corren en UTC+14 a propósito)
npm run typecheck  # TypeScript estricto
npm run build
```

Las pantallas se revisan contra el contrato visual en un navegador de verdad —
desbordamiento, objetivos tocables, tipografías y el deslizador de deudas — y
deja las capturas de la app al lado de las del mockup:

```bash
npm run build
npx vite preview --port 4173 &
npm run revisar:pantallas
```

La pantalla de entrar se revisa aparte, porque sin servidor configurado la app
nunca la enseña. Este comando compila con un Supabase de mentiras, contesta él
mismo las llamadas de `auth` y comprueba el camino completo: pedir el código,
teclearlo, y que un código malo se explique en español:

```bash
npm run revisar:entrar
```

Para ver el calendario de periodos de un año completo:

```bash
npm run periodos:demo -- --frecuencia cada_dos_semanas --ancla 2026-01-05 --anio 2026
npm run periodos:demo -- --frecuencia semanal --ancla 2026-01-05
npm run periodos:demo -- --frecuencia dos_veces_al_mes --dias-pago 15,31
```

El esquema de la base se prueba contra un Postgres desechable, sin tocar nada
real (necesita Postgres instalado). Levanta la base, aplica la migración y
comprueba las restricciones, el modo pareja y las políticas de RLS actuando
como usuarios de verdad:

```bash
./supabase/pruebas/probar-esquema.sh
```

## Desplegar

La app es estática: cualquier hosting sirve. En Vercel se conecta el repo y se
detecta solo (Vite, salida en `dist/`). Las variables se ponen en el panel del
hosting, no en un archivo.

**Solo las que empiezan con `VITE_`.** Esas viajan dentro del JavaScript que
descarga el navegador. La `anon key` está bien ahí — es pública por diseño y lo
que protege los datos son las políticas de RLS. La `service_role` se salta el
RLS entero y **nunca** va en el frontend.

Las tres que hacen falta:

| Nombre                                                  | Valor                                       |
| ------------------------------------------------------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`                                     | `https://xxxxx.supabase.co`                 |
| `VITE_SUPABASE_ANON_KEY` o `VITE_SUPABASE_PUBLISHABLE_KEY` | la llave pública, una sola de las dos     |
| `VITE_URL_APP`                                          | la dirección pública de la app              |

Son dos nombres para la misma llave: Supabase la llamaba `anon` y en los
proyectos nuevos la llama `publishable`. El código acepta cualquiera.

El panel *Connect* de Supabase entrega un bloque de dos renglones. **Cada
variable va en su propio renglón**, con el nombre en *Key* y solo el valor en
*Value* — sin el `VITE_...=` adelante. Si se pega el bloque entero en un campo,
la app lo detecta al abrir y lo dice; no espera a fallar mandando el correo.

Las variables se hornean al compilar. Cambiar una en el panel no cambia lo que
ya está desplegado: hay que volver a desplegar.

### El correo de entrada

Se entra con un código de seis dígitos que llega por correo. En Supabase,
**Authentication → URL Configuration**, el *Site URL* es la dirección pública de
la app, y en *Redirect URLs* van esa misma y `http://localhost:5173/**`.

En **Authentication → Emails → Magic Link**, la plantilla tiene que incluir
`{{ .Token }}`. Sin eso el correo llega con enlace pero sin código, y el código
es el camino que no se rompe: el enlace solo funciona si el correo se abre en el
mismo navegador donde se pidió, y en teléfono casi nunca pasa.

El correo lo ve el usuario final, así que va en español (principio 5 del SPEC):

```html
<h2>Tu código para entrar a Jubileo</h2>
<p style="font-size:32px;letter-spacing:.3em"><b>{{ .Token }}</b></p>
<p>Tecléalo en la pantalla donde lo pediste. Vence en una hora.</p>
<p>También puedes <a href="{{ .ConfirmationURL }}">entrar desde aquí</a>, si
abres este correo en el mismo navegador.</p>
<p>Si no lo pediste tú, ignora este mensaje.</p>
```

El servidor de correo que presta Supabase manda desde su dominio, en inglés, y
con un límite de unos pocos envíos por hora. Sirve para probar; el aviso
semanal del domingo necesita un proveedor propio con `jubileofinanciero.com`.

Una vez desplegada, se instala desde el navegador del teléfono con "Agregar a
la pantalla de inicio". `npm run revisar:pantallas` comprueba que el manifiesto
y los iconos estén, porque sin instalar no hay avisos push en iOS.

## Las llaves

Van en `.env`, nunca en el código ni en un commit. Copia `.env.example` y
llénalo. `.env` ya está en `.gitignore`.

## Cómo está armado

```
design/              contrato visual — no rediseñar
  design-tokens.css  única fuente de verdad de color y tipo
  movil.html         las cuatro pantallas de teléfono
  escritorio.html    el panel de computadora
public/fuentes/      Instrument Serif e Inter, alojadas aquí, no en un CDN
src/
  estilos/
    tema.css         puente de los tokens a las utilidades de Tailwind
    fuentes.css      @font-face de las tipografías locales
  componentes/
    movil/           las pantallas de teléfono de design/movil.html
    escritorio/      el panel de design/escritorio.html
  datos/
    ejemplo.ts       datos de ejemplo — TEMPORAL, mientras no haya servidor
    fuente.ts        el interruptor: ejemplo o servidor, según el .env
  servidor/
    mapeo.ts         filas de la base → el presupuesto que ven las pantallas
    repositorios/    puro I/O contra Supabase
  rutas.ts           enrutador por fragmento de URL
  lib/
    dinero/          centavos enteros y el único lugar donde se divide dinero
    fecha/           fechas civiles AAAA-MM-DD, sin zona horaria
    periodos/        el motor: calendario de periodos e invariante de asignaciones
    deudas/          simulador de la fecha de libertad
supabase/
  migraciones/       el esquema, versionado
  pruebas/           restricciones, modo pareja y RLS contra Postgres real
herramientas/
  demo-periodos.ts   imprime un año de periodos
```

### Lo que no se rompe

- **Dinero en centavos enteros.** Nunca flotantes. `src/lib/dinero` es el único
  lugar donde se divide un monto, y su reparto siempre suma exacto.
- **La lógica de periodos es pura.** Sin base de datos, sin red, sin reloj.
  `src/lib/periodos/generador.ts` es el único lugar donde se genera el
  calendario.
- **La invariante de asignaciones.** La suma de las asignaciones por periodo de
  una línea tiene que igualar su monto mensual. Si no cuadra, el mes no se
  cierra — es un rechazo, no una advertencia.
- **Las fechas se guardan en UTC**, pero la lógica de periodos trabaja con
  fechas civiles. La zona horaria del usuario solo entra en la capa de avisos.
- **Las llaves aguantan el modo pareja.** Los periodos cuelgan del usuario, no
  solo del hogar: en modo pareja cada quien cobra con su frecuencia y un mes
  trae dos juegos de cheques. Está probado hoy, no prometido para la fase 4.
- **Una asignación no puede cruzar de mes.** El mes viaja en las dos llaves
  foráneas de `asignaciones`, así que no hay forma de cuadrar una línea con
  dinero de otro mes.

## Estado

Fase 1, en construcción.

Listo: el motor de periodos con sus pruebas, las pantallas del contrato visual
— Mi semana, El mes, Deudas y el aviso en teléfono, y el panel de Resumen en
computadora — el esquema de la base con sus pruebas, y la capa de datos que lo
consulta.

Sin `VITE_SUPABASE_URL` en el `.env`, la app corre con datos de ejemplo y se ve
igual. Con la llave puesta, lee del servidor: es el único interruptor.

Se entra con el correo, sin contraseña, y se arma el primer mes.

Falta: el onboarding completo de 6 pasos, el webhook de Stripe, el cron de
avisos con un proveedor de correo propio y la caché de IndexedDB.
