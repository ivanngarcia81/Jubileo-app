import type { ReactNode } from "react";
import type { Presupuesto } from "../../datos/tipos";
import { type Centavos, centavos, formatearRedondo } from "../../lib/dinero";
import { variacionContraElMesPasado } from "../../lib/mes/variacion";
import type { Ruta } from "../../rutas";
import { ROTULO } from "../rotulos";
import { cuantos } from "../textos";

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
      <h1 className="font-serif text-cifra font-normal">{ROTULO[activa].pantalla}</h1>
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

/**
 * La variación contra el mes pasado, al lado de la cifra.
 *
 * El color dice si el cambio es bueno **para esa cifra**, que no es lo mismo
 * que si el número subió: entrar más es bueno, salir más no. Nada va en rojo —
 * regla 4 de los tokens: el rojo es del sobregiro y de nada más, y un mes con
 * gastos más altos no es un sobregiro.
 *
 * No se dibuja cuando no hay contra qué comparar. Ver `lib/mes/variacion`.
 */
function Variacion({
  cents,
  subirEsBueno,
}: {
  cents: Centavos;
  subirEsBueno: boolean;
}) {
  const subio = cents > 0;
  const bien = subio === subirEsBueno;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-[3px] rounded-chip px-[7px] py-[3px] text-rotulo font-bold [font-variant-numeric:tabular-nums] ${
        bien ? "bg-brillo-teal text-teal-osc" : "bg-brillo-ambar text-ambar-osc"
      }`}
    >
      {subio ? "↑" : "↓"}
      {formatearRedondo(centavos(Math.abs(cents)))}
    </span>
  );
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  variacion,
  subirEsBueno = true,
  teal = false,
}: {
  titulo: string;
  valor: Centavos;
  detalle: ReactNode;
  /** La diferencia contra el mes pasado. Ausente cuando no hay con qué. */
  variacion?: Centavos | undefined;
  subirEsBueno?: boolean;
  teal?: boolean;
}) {
  return (
    <div className="bg-blanco rounded-card shadow-tarjeta px-[15px] py-[13px]">
      <div className="text-texto-2 text-rotulo font-semibold tracking-[.12em] uppercase">
        {titulo}
      </div>
      <div className="mt-[5px] flex flex-wrap items-baseline gap-x-[9px] gap-y-1">
        <div
          className={`font-serif text-cifra [font-variant-numeric:tabular-nums] ${teal ? "text-teal-osc" : ""}`}
        >
          {formatearRedondo(valor)}
        </div>
        {variacion !== undefined && (
          <Variacion cents={variacion} subirEsBueno={subirEsBueno} />
        )}
      </div>
      <div className="text-texto-2 mt-1 text-menor">
        {detalle}
        {variacion !== undefined && (
          <span className="text-texto-2"> · contra el mes pasado</span>
        )}
      </div>
    </div>
  );
}

export function TarjetasDelMes({ presupuesto }: { presupuesto: Presupuesto }) {
  // Sale de `mesesPasados`, que ya se trae para la franja del selector de mes.
  // Nula en el primer mes de una cuenta nueva, y entonces no se dibuja: "+$0"
  // diría que no cambió nada cuando la verdad es que no hay contra qué medir.
  const { anio, mes } = presupuesto.mes;
  const entra = variacionContraElMesPasado(presupuesto.mesesPasados, anio, mes, "entra");
  const sale = variacionContraElMesPasado(presupuesto.mesesPasados, anio, mes, "sale");

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Tarjeta
        titulo="Entra este mes"
        valor={presupuesto.entraCents}
        detalle={cuantos(presupuesto.periodos.length, "cheque", "cheques")}
        {...(entra ? { variacion: entra.diferenciaCents } : {})}
      />
      <Tarjeta
        titulo="Sale este mes"
        valor={presupuesto.saleCents}
        detalle={cuantos(contarCategorias(presupuesto), "categoría", "categorías")}
        subirEsBueno={false}
        {...(sale ? { variacion: sale.diferenciaCents } : {})}
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
      className={`bg-blanco rounded-card shadow-tarjeta p-[18px] ${className}`}
    >
      <div className="mb-[15px] flex items-center gap-[10px]">
        <div className="bg-carbon text-teal font-serif grid size-7 shrink-0 place-items-center rounded-btn text-cuerpo">
          {icono}
        </div>
        <h3 className="font-serif flex-1 text-titulo font-normal">{titulo}</h3>
        {derecha}
      </div>
      {children}
    </section>
  );
}
