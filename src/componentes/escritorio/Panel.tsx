import type { ReactNode } from "react";
import type { Presupuesto } from "../../datos/tipos";
import { type Centavos, formatearRedondo } from "../../lib/dinero";
import type { Ruta } from "../../rutas";

/**
 * Todo lo que tiene una línea en el presupuesto del mes: los cuatro grupos que
 * El mes enseña, y nada más.
 *
 * Contaba `sobres` —que son los mismos variables pero del cheque en curso— y
 * `fondos`, que hoy ni siquiera tienen categoría. Con el árbol de El mes al
 * lado se veía el problema de frente: la banda decía 13 categorías y la lista
 * de abajo, 10.
 */
function contarCategorias(p: Presupuesto): number {
  return (
    1 + p.fijos.length + p.variables.length + p.lineasDeuda.length
  );
}

/**
 * La carcasa del panel de computadora. La navegación se mudó al sidebar
 * (`design/sidebar.html`); lo que queda arriba del contenido es la **cabecera
 * de la pantalla**: dónde estás y qué día es.
 *
 * Nombrar la pantalla dejó de ser un adorno cuando la navegación se fue al
 * costado: con los enlaces arriba, el que estaba subrayado decía dónde estabas.
 */

const TITULOS: Partial<Record<Ruta, string>> = {
  resumen: "Mi semana",
  mes: "El mes",
  deudas: "Deudas",
  metas: "Metas",
  movimientos: "Movimientos",
  ajustes: "Ajustes",
};

export function CabeceraDeContenido({
  activa,
  hoy,
}: {
  activa: Ruta;
  /** El día de hoy, ya en palabras. Entra hecho: esto no pregunta la hora. */
  hoy: string;
}) {
  return (
    <div
      data-ancho="contenido"
      className="mx-auto flex max-w-contenido items-baseline justify-between gap-4 px-[22px] pt-5"
    >
      <h1 className="font-serif text-cifra font-normal">{TITULOS[activa] ?? "Jubileo"}</h1>
      <span className="text-texto-2 text-menor">{hoy}</span>
    </div>
  );
}

/**
 * Las tres tarjetas de arriba del contenido: entra, sale, sin repartir.
 *
 * Antes eran una banda carbón a todo lo ancho con un degradado teal, cuatro
 * indicadores y el riel de cheques. Esa banda existía para separar la
 * navegación —que estaba arriba— del contenido; con la navegación al costado
 * ya no separa nada, y un bloque oscuro entre el sidebar oscuro y el lienzo
 * claro solo parte la pantalla en tres. El riel de cheques se fue con ella: el
 * contexto permanente ahora es **el rail de semanas** del sidebar, y qué cubre
 * cada cheque vive en El mes › Cheques, que es donde alguien va a buscarlo.
 *
 * Quedan tres y no cuatro. "A la deuda este mes" tenía su cifra repetida en la
 * tarjeta de deudas de abajo, con su fecha de libertad al lado.
 */

function Tarjeta({
  titulo,
  valor,
  detalle,
  teal = false,
}: {
  titulo: string;
  valor: Centavos;
  detalle: ReactNode;
  teal?: boolean;
}) {
  return (
    <div className="bg-blanco border-linea rounded-[13px] border px-[15px] py-[13px]">
      <div className="text-texto-2 text-rotulo font-semibold tracking-[.12em] uppercase">
        {titulo}
      </div>
      <div
        className={`font-serif mt-[5px] text-cifra [font-variant-numeric:tabular-nums] ${teal ? "text-teal-osc" : ""}`}
      >
        {formatearRedondo(valor)}
      </div>
      <div className="text-texto-2 mt-1 text-menor">{detalle}</div>
    </div>
  );
}

export function TarjetasDelMes({ presupuesto }: { presupuesto: Presupuesto }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tarjeta
        titulo="Entra este mes"
        valor={presupuesto.entraCents}
        detalle={`${presupuesto.periodos.length} cheques`}
      />
      <Tarjeta
        titulo="Sale este mes"
        valor={presupuesto.saleCents}
        detalle={`${contarCategorias(presupuesto)} categorías`}
      />
      <Tarjeta
        titulo="Sin repartir"
        valor={presupuesto.sinRepartirCents}
        teal={presupuesto.sinRepartirCents === 0}
        detalle={
          presupuesto.sinRepartirCents === 0
            ? "Tu presupuesto cuadra"
            : presupuesto.sinRepartirCents > 0
              ? "Te falta darle destino"
              : "Te pasaste de lo que entra"
        }
      />
    </div>
  );
}

export function TarjetaEscritorio({
  icono,
  titulo,
  derecha,
  children,
  className = "",
}: {
  icono: ReactNode;
  titulo: string;
  derecha?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-blanco border-linea rounded-[15px] border p-[18px] ${className}`}
    >
      <div className="mb-[15px] flex items-center gap-[10px]">
        <div className="bg-carbon text-teal font-serif grid size-7 shrink-0 place-items-center rounded-[9px] text-cuerpo">
          {icono}
        </div>
        <h3 className="font-serif flex-1 text-titulo font-normal">{titulo}</h3>
        {derecha}
      </div>
      {children}
    </section>
  );
}
