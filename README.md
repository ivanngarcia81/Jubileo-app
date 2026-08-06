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

Y repartir el mes, que es el camino que toca dinero, se recorre entero contra
un Supabase de mentiras que sí guarda: se le pone monto a un sobre y se
comprueba que quedó en centavos enteros, que el reparto salió solo y que las
asignaciones suman el monto al centavo:

```bash
npm run revisar:el-mes
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

Se entra con un código de seis dígitos que llega por correo. **No hay enlace**:
el enlace solo funciona si el correo se abre en el mismo navegador donde se
pidió, y en teléfono casi nunca pasa. Dejarlo en el correo serviría para que lo
toquen y falle.

#### Hace falta un servidor de correo propio

No es opcional y no es solo para los avisos. El correo que presta Supabase
manda **2 mensajes por hora**, desde el dominio de ellos, en inglés, y **solo a
las direcciones del equipo del proyecto**. Y desde junio de 2026, un proyecto
del plan gratis que usa ese correo prestado **no puede editar ninguna
plantilla** — el panel enseña *"Set up custom SMTP to edit templates"* y las
plantillas por omisión no traen `{{ .Token }}`. Sin proveedor propio no hay
código que teclear.

El aviso semanal del domingo, que la sección 9 del SPEC llama la función más
importante del producto, tampoco sale de ahí: está en el nivel gratis, o sea
que lo recibe todo el mundo.

**1. Resend** (gratis hasta 3,000 al mes; la misma cuenta sirve para los avisos)

- **Domains → Add Domain →** `jubileofinanciero.com`.
- Copiar los tres registros de DNS que enseña al panel del dominio: un `MX` y un
  `TXT` colgados de `send.jubileofinanciero.com`, y un `TXT` en
  `resend._domainkey`. Ninguno toca la raíz, así que no estorban al correo
  normal de la empresa.
- Esperar a que diga **Verified**.
- **API Keys → Create API Key** con permiso de envío. Empieza con `re_` y se ve
  una sola vez.

**2. Supabase → Authentication → Emails → SMTP Settings**

| Campo        | Valor                            |
| ------------ | -------------------------------- |
| Sender email | `hola@jubileofinanciero.com`     |
| Sender name  | `Jubileo`                        |
| Host         | `smtp.resend.com`                |
| Port         | `465`                            |
| Username     | `resend` ← literal, no un correo |
| Password     | la llave `re_…`                  |

Al guardar, las plantillas se vuelven editables y el límite sube a 30 por hora,
ajustable en **Authentication → Rate Limits**.

**3. Las plantillas — son dos**

`signInWithOtp` crea la cuenta si no existe. A un usuario nuevo o sin confirmar
le llega **Confirm signup**; a los demás, **Magic Link**. Las dos necesitan
`{{ .Token }}`, o falla la mitad de los casos sin patrón visible. El correo lo
ve el usuario final, así que va en español (principio 5 del SPEC).

Asunto de las dos: `Tu código para entrar a Jubileo`

*Confirm signup:*

```html
<h2>Bienvenido a Jubileo</h2>
<p>Este es tu código para entrar:</p>
<p style="font-size:32px;letter-spacing:.3em"><b>{{ .Token }}</b></p>
<p>Tecléalo en la pantalla donde lo pediste. Vence en una hora.</p>
<p>Si no fuiste tú, ignora este mensaje.</p>
```

*Magic Link:*

```html
<h2>Tu código para entrar</h2>
<p style="font-size:32px;letter-spacing:.3em"><b>{{ .Token }}</b></p>
<p>Tecléalo en la pantalla donde lo pediste. Vence en una hora.</p>
<p>Si no fuiste tú, ignora este mensaje.</p>
```

Sin `{{ .ConfirmationURL }}` a propósito. Verificar el código confirma el correo
igual que el enlace, así que no quedan cuentas a medias.

**4. Supabase → Authentication → Providers → Email**

- **Email OTP Length: 6.** La pantalla se manda sola al sexto dígito, que es lo
  normal y ahorra un toque. Si aquí se pone otro número la app no se rompe —
  el campo aguanta hasta diez y el botón de entrar sirve desde seis — pero se
  pierde el envío automático.
- **Email OTP Expiration: 3600.** El correo dice "vence en una hora".

**5. Supabase → Authentication → URL Configuration**

El *Site URL* es la dirección pública de la app, y en *Redirect URLs* van esa
misma y `http://localhost:5173/**`.

#### Cuando no llega un correo

**Resend → Logs** lista cada envío con su estado. Si el correo no aparece ahí,
el problema es de Supabase — llave del SMTP, dominio sin verificar o límite de
envíos — y no del correo.

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
