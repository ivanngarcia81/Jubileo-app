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

Falta: onboarding de 6 pasos, pantallas de sesión, el webhook de Stripe, el
cron de avisos, la caché de IndexedDB y el manifiesto de PWA.
