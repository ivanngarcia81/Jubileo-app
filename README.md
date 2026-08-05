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
real (necesita Postgres instalado):

```bash
./supabase/pruebas/probar-esquema.sh
```

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
  datos/ejemplo.ts   datos de ejemplo — TEMPORAL, se cambia por el servidor
  rutas.ts           enrutador por fragmento de URL
  lib/
    dinero/          centavos enteros y el único lugar donde se divide dinero
    fecha/           fechas civiles AAAA-MM-DD, sin zona horaria
    periodos/        el motor: calendario de periodos e invariante de asignaciones
    deudas/          simulador de la fecha de libertad
supabase/
  migraciones/       el esquema, versionado
  pruebas/           comprobación del esquema contra un Postgres desechable
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

## Estado

Fase 1, en construcción.

Listo: el motor de periodos con sus pruebas, el esquema de la base, y las
pantallas del contrato visual — Mi semana, El mes, Deudas y el aviso en
teléfono, y el panel de Resumen en computadora. Corren con datos de ejemplo.

Falta: autenticación, onboarding de 6 pasos, el servidor detrás de las
pantallas, Stripe, el cron de avisos y el manifiesto de PWA.
