import { describe, expect, it } from 'vitest'
import { centavos } from '../lib/dinero'
import { fecha } from '../lib/fecha'
import type { FilasDelMes } from './esquema'
import {
  aPresupuesto,
  chequeEnCurso,
  iniciales,
  ingresoDe,
  libreDelPeriodo,
  mesesEntre,
  porChequeParaLaMeta,
  venceEnElPeriodo,
} from './mapeo'

/**
 * El mes de agosto de 2026 del contrato visual, pero en filas de la base:
 * un hogar de dos personas con frecuencias distintas, que es el caso que las
 * llaves del esquema tienen que aguantar.
 */
const IVAN = '11111111-1111-1111-1111-111111111111'
const ROSA = '22222222-2222-2222-2222-222222222222'
const MES = 'aaaaaaaa-0000-0000-0000-000000000001'

function filas(): FilasDelMes {
  return {
    usuarioActual: IVAN,
    usuarios: [
      {
        id: IVAN,
        correo: 'ivan@casa.com',
        nombre: 'Iván García',
        zona_horaria: 'America/New_York',
        nivel: 'premium',
        nivel_vence_en: null,
        frecuencia_pago: 'cada_dos_semanas',
        fecha_ancla: '2026-08-03',
        dias_pago: null,
        ingreso_esperado_cents: 124000,
        onboarding_terminado_en: '2026-01-01T00:00:00Z',
      },
      {
        id: ROSA,
        correo: 'rosa@casa.com',
        nombre: 'Rosa',
        zona_horaria: 'America/New_York',
        nivel: 'premium',
        nivel_vence_en: null,
        frecuencia_pago: 'dos_veces_al_mes',
        fecha_ancla: '2026-08-01',
        dias_pago: [1, 15],
        ingreso_esperado_cents: 90000,
        onboarding_terminado_en: null,
      },
    ],
    mes: { id: MES, hogar_id: 'h', anio: 2026, mes: 8, estado: 'activo', cerrado_en: null },
    periodos: [
      // Iván: 3 y 17 de agosto, más el extra del 31.
      { id: 'p1', mes_id: MES, usuario_id: IVAN, numero: 1, fecha_inicio: '2026-08-03', fecha_fin: '2026-08-16', fecha_pago: '2026-08-03', ingreso_esperado_cents: 124000, ingreso_real_cents: null, es_extra: false, estado: 'cerrado' },
      { id: 'p2', mes_id: MES, usuario_id: IVAN, numero: 2, fecha_inicio: '2026-08-17', fecha_fin: '2026-08-30', fecha_pago: '2026-08-17', ingreso_esperado_cents: 124000, ingreso_real_cents: null, es_extra: false, estado: 'futuro' },
      { id: 'p3', mes_id: MES, usuario_id: IVAN, numero: 3, fecha_inicio: '2026-08-31', fecha_fin: '2026-09-13', fecha_pago: '2026-08-31', ingreso_esperado_cents: 120000, ingreso_real_cents: null, es_extra: true, estado: 'futuro' },
      // Rosa: 1 y 15. Su "cheque 1" convive con el de Iván.
      { id: 'r1', mes_id: MES, usuario_id: ROSA, numero: 1, fecha_inicio: '2026-08-01', fecha_fin: '2026-08-14', fecha_pago: '2026-08-01', ingreso_esperado_cents: 90000, ingreso_real_cents: null, es_extra: false, estado: 'activo' },
      { id: 'r2', mes_id: MES, usuario_id: ROSA, numero: 2, fecha_inicio: '2026-08-15', fecha_fin: '2026-08-31', fecha_pago: '2026-08-15', ingreso_esperado_cents: 90000, ingreso_real_cents: null, es_extra: false, estado: 'futuro' },
    ],
    categorias: [
      { id: 'c-diezmo', nombre: 'Diezmo y ofrenda', grupo: 'mayordomia', orden: 0, activa: true, es_fija: false, dia_vencimiento: null, deuda_id: null },
      { id: 'c-renta', nombre: 'Renta', grupo: 'fijo', orden: 1, activa: true, es_fija: true, dia_vencimiento: 3, deuda_id: null },
      { id: 'c-luz', nombre: 'Luz y agua', grupo: 'fijo', orden: 2, activa: true, es_fija: true, dia_vencimiento: 4, deuda_id: null },
      { id: 'c-comida', nombre: 'Comida', grupo: 'variable', orden: 3, activa: true, es_fija: false, dia_vencimiento: null, deuda_id: null },
      { id: 'c-capital', nombre: 'Capital One', grupo: 'deuda', orden: 4, activa: true, es_fija: true, dia_vencimiento: 9, deuda_id: 'd-capital' },
      { id: 'c-vieja', nombre: 'Categoría apagada', grupo: 'fijo', orden: 9, activa: false, es_fija: true, dia_vencimiento: 5, deuda_id: null },
    ],
    lineas: [
      { id: 'l-diezmo', mes_id: MES, categoria_id: 'c-diezmo', monto_mensual_cents: 36800 },
      { id: 'l-renta', mes_id: MES, categoria_id: 'c-renta', monto_mensual_cents: 90000 },
      { id: 'l-luz', mes_id: MES, categoria_id: 'c-luz', monto_mensual_cents: 13000 },
      { id: 'l-comida', mes_id: MES, categoria_id: 'c-comida', monto_mensual_cents: 60000 },
      { id: 'l-capital', mes_id: MES, categoria_id: 'c-capital', monto_mensual_cents: 15000 },
    ],
    asignaciones: [
      // La renta sale de los cheques de los dos: modo pareja de verdad.
      { id: 'a1', mes_id: MES, linea_presupuesto_id: 'l-renta', periodo_id: 'r1', monto_cents: 40000 },
      { id: 'a2', mes_id: MES, linea_presupuesto_id: 'l-renta', periodo_id: 'p1', monto_cents: 50000 },
      { id: 'a3', mes_id: MES, linea_presupuesto_id: 'l-luz', periodo_id: 'r1', monto_cents: 13000 },
      { id: 'a4', mes_id: MES, linea_presupuesto_id: 'l-comida', periodo_id: 'r1', monto_cents: 15000 },
      { id: 'a5', mes_id: MES, linea_presupuesto_id: 'l-comida', periodo_id: 'p1', monto_cents: 15000 },
      { id: 'a6', mes_id: MES, linea_presupuesto_id: 'l-comida', periodo_id: 'p2', monto_cents: 15000 },
      { id: 'a7', mes_id: MES, linea_presupuesto_id: 'l-comida', periodo_id: 'r2', monto_cents: 15000 },
      { id: 'a8', mes_id: MES, linea_presupuesto_id: 'l-capital', periodo_id: 'r1', monto_cents: 15000 },
      { id: 'a9', mes_id: MES, linea_presupuesto_id: 'l-diezmo', periodo_id: 'p1', monto_cents: 36800 },
    ],
    transacciones: [
      { id: 't1', usuario_id: ROSA, periodo_id: 'r1', categoria_id: 'c-luz', fecha: '2026-08-04', monto_cents: 8500, tipo: 'gasto', descripcion: 'PSE&G', comercio: null, estado: 'asignada' },
      { id: 't2', usuario_id: IVAN, periodo_id: 'r1', categoria_id: 'c-comida', fecha: '2026-08-06', monto_cents: 6200, tipo: 'gasto', descripcion: 'Supermercado', comercio: null, estado: 'asignada' },
      { id: 't3', usuario_id: IVAN, periodo_id: 'r1', categoria_id: null, fecha: '2026-08-07', monto_cents: 1200, tipo: 'gasto', descripcion: 'Sin asignar', comercio: null, estado: 'pendiente' },
    ],
    deudas: [
      { id: 'd-capital', nombre: 'Capital One', saldo_inicial_cents: 387500, saldo_cents: 124000, pago_minimo_cents: 3500, tasa_interes: 24.9, orden: 0, es_enfoque: true, pagada_en: null },
      { id: 'd-carro', nombre: 'Préstamo del carro', saldo_inicial_cents: 1450000, saldo_cents: 890000, pago_minimo_cents: 31000, tasa_interes: 7.5, orden: 1, es_enfoque: false, pagada_en: null },
      { id: 'd-vieja', nombre: 'Ya pagada', saldo_inicial_cents: 5000, saldo_cents: 0, pago_minimo_cents: 500, tasa_interes: 0, orden: 2, es_enfoque: false, pagada_en: '2026-05-01' },
    ],
    fondos: [
      { id: 'f-viaje', nombre: 'Viaje al país', meta_cents: 160000, acumulado_cents: 84000, fecha_objetivo: '2026-12-01' },
    ],
  }
}

describe('piezas del mapeo', () => {
  it('saca las iniciales del nombre, o del correo si no hay nombre', () => {
    expect(iniciales('Iván García', 'x@y.com')).toBe('IG')
    expect(iniciales('Rosa', 'x@y.com')).toBe('RO')
    expect(iniciales(null, 'jubileo@correo.com')).toBe('JU')
  })

  it('prefiere el ingreso real sobre el esperado', () => {
    expect(ingresoDe({ ingreso_real_cents: 100000, ingreso_esperado_cents: 124000 })).toBe(100000)
    expect(ingresoDe({ ingreso_real_cents: null, ingreso_esperado_cents: 124000 })).toBe(124000)
    // Ingreso variable sin confirmar: cero, no una suposición.
    expect(ingresoDe({ ingreso_real_cents: null, ingreso_esperado_cents: null })).toBe(0)
  })

  it('lo libre de un cheque es lo que entró menos lo repartido', () => {
    const p = { ingreso_real_cents: null, ingreso_esperado_cents: 124000 } as never
    expect(libreDelPeriodo(p, 124000)).toBe(0)
    expect(libreDelPeriodo(p, 118000)).toBe(6000)
  })

  it('reconoce el vencimiento aunque el periodo cruce de mes', () => {
    // Cheque del 31 de agosto al 13 de septiembre: el día 3 cae dentro.
    expect(venceEnElPeriodo(3, fecha('2026-08-31'), fecha('2026-09-13'))).toBe(true)
    expect(venceEnElPeriodo(20, fecha('2026-08-31'), fecha('2026-09-13'))).toBe(false)
    expect(venceEnElPeriodo(3, fecha('2026-08-03'), fecha('2026-08-16'))).toBe(true)
    // El 31 en un febrero se recorta al 28 y sigue cayendo dentro.
    expect(venceEnElPeriodo(31, fecha('2026-02-15'), fecha('2026-02-28'))).toBe(true)
  })

  it('reparte lo que falta de un fondo entre los cheques que quedan', () => {
    // $760 en 4 meses de 2 cheques = 8 cheques, $95 cada uno.
    expect(porChequeParaLaMeta(centavos(76000), 4, 2)).toBe(9500)
    // Sin meses por delante no divide entre cero.
    expect(porChequeParaLaMeta(centavos(76000), 0, 2)).toBe(76000)
    expect(mesesEntre(fecha('2026-08-01'), fecha('2026-12-01'))).toBe(4)
    expect(mesesEntre(fecha('2026-08-01'), null)).toBe(0)
    expect(mesesEntre(fecha('2026-08-01'), fecha('2026-05-01'))).toBe(0)
  })
})

describe('en qué cheque está parado el usuario', () => {
  // Cheques del 3 al 16, del 17 al 30, y el extra del 31 al 13 de septiembre.
  const riel = [
    { fecha_inicio: '2026-08-03', fecha_fin: '2026-08-16', estado: 'cerrado' as const },
    { fecha_inicio: '2026-08-17', fecha_fin: '2026-08-30', estado: 'futuro' as const },
    { fecha_inicio: '2026-08-31', fecha_fin: '2026-09-13', estado: 'futuro' as const },
  ]

  it('manda la fecha, no el estado guardado', () => {
    // El primero está marcado como cerrado y aun así es el que corre el día 10:
    // cerrar es lo que el usuario contestó, no dónde está parado.
    expect(chequeEnCurso(riel, fecha('2026-08-10'))).toBe(0)
    expect(chequeEnCurso(riel, fecha('2026-08-17'))).toBe(1)
    expect(chequeEnCurso(riel, fecha('2026-08-30'))).toBe(1)
    expect(chequeEnCurso(riel, fecha('2026-09-02'))).toBe(2)
  })

  it('los bordes del cheque cuentan como adentro', () => {
    expect(chequeEnCurso(riel, fecha('2026-08-03'))).toBe(0)
    expect(chequeEnCurso(riel, fecha('2026-08-16'))).toBe(0)
  })

  it('si ya pasó todo el riel, el último; si no ha llegado, el primero', () => {
    expect(chequeEnCurso(riel, fecha('2026-12-25'))).toBe(2)
    expect(chequeEnCurso(riel, fecha('2026-01-01'))).toBe(0)
  })

  it('sin fecha, el primero sin cerrar', () => {
    expect(chequeEnCurso(riel, undefined)).toBe(1)
  })

  it('con todo cerrado se queda en el último, no se sale del riel', () => {
    const todos = riel.map((p) => ({ ...p, estado: 'cerrado' as const }))
    expect(chequeEnCurso(todos, undefined)).toBe(2)
  })

  it('sin cheques no revienta', () => {
    expect(chequeEnCurso([], fecha('2026-08-10'))).toBe(0)
  })
})

describe('el mes armado desde la base', () => {
  const p = aPresupuesto(filas())

  it('junta los cheques de los dos en un solo riel, por fecha', () => {
    expect(p.periodos.map((x) => x.fechaPago)).toEqual([
      '2026-08-01', // Rosa
      '2026-08-03', // Iván
      '2026-08-15', // Rosa
      '2026-08-17', // Iván
      '2026-08-31', // Iván, el extra
    ])
    expect(p.periodos.map((x) => x.numero)).toEqual([1, 2, 3, 4, 5])
    expect(p.periodos.filter((x) => x.esExtra)).toHaveLength(1)
  })

  it('apunta al cheque que está corriendo', () => {
    expect(p.periodoActivo).toBe(0)
    expect(p.periodos[p.periodoActivo]!.fechaPago).toBe('2026-08-01')
    expect(p.ingresoPorChequeCents).toBe(90000)
  })

  it('el cheque extra aparece completo porque no se reparte', () => {
    const extra = p.periodos.findIndex((x) => x.esExtra)
    expect(p.libreporPeriodoCents[extra]).toBe(120000)
  })

  it('descuenta de cada cheque lo que ya tiene trabajo', () => {
    // Rosa, cheque 1: entran $900, repartidos 400+130+150+150 = $830.
    expect(p.libreporPeriodoCents[0]).toBe(7000)
    // Iván, cheque 1: entran $1,240, repartidos 500+150+368 = $1,018.
    expect(p.libreporPeriodoCents[1]).toBe(22200)
  })

  it('suma lo que entra y lo que sale del mes', () => {
    expect(p.entraCents).toBe(90000 + 124000 + 90000 + 124000 + 120000)
    expect(p.saleCents).toBe(36800 + 90000 + 13000 + 60000 + 15000)
    expect(p.sinRepartirCents).toBe(p.entraCents - p.saleCents)
    expect(p.aLaDeudaCents).toBe(15000)
  })

  it('los pagos del cheque activo salen de su día de vencimiento', () => {
    // Rosa cobra el 1 y su cheque llega al 14: caen renta (3), luz (4) y
    // Capital One (9). La categoría apagada no.
    expect(p.pagos.map((x) => x.nombre)).toEqual(['Renta', 'Luz y agua', 'Capital One'])
    expect(p.pagos.map((x) => x.montoCents)).toEqual([40000, 13000, 15000])
  })

  it('marca como pagado lo que ya tiene su movimiento, y dice cuál es', () => {
    const luz = p.pagos.find((x) => x.nombre === 'Luz y agua')!
    expect(luz.pagado).toBe(true)
    // Sin la llave del movimiento la casilla se podría marcar pero no
    // desmarcar: hay que saber qué borrar.
    expect(luz.transaccionId).toBe('t1')

    const renta = p.pagos.find((x) => x.nombre === 'Renta')!
    expect(renta.pagado).toBe(false)
    expect(renta.transaccionId).toBeNull()
  })

  it('señala la deuda de enfoque, amarrada por llave y no por nombre', () => {
    expect(p.pagos.find((x) => x.nombre === 'Capital One')!.esEnfoque).toBe(true)
    expect(p.pagos.find((x) => x.nombre === 'Renta')!.esEnfoque).toBeUndefined()
  })

  it('los sobres traen lo apartado y lo gastado del cheque activo', () => {
    expect(p.sobres).toEqual([
      { id: 'c-comida', nombre: 'Comida', presupuestoCents: 15000, gastadoCents: 6200 },
    ])
  })

  it('separa mayordomía de los fijos, y los variables van aparte', () => {
    expect(p.mayordomia.nombre).toBe('Diezmo y ofrenda')
    expect(p.mayordomia.montoMensualCents).toBe(36800)
    expect(p.fijos.map((f) => f.nombre)).toEqual(['Renta', 'Luz y agua'])
    expect(p.variables.map((v) => v.nombre)).toEqual(['Comida'])
  })

  it('cada fijo dice con qué cheque se paga, no solo cuándo vence', () => {
    // Los cheques del riel van 3–16 ago, 17–30 ago y el extra 31 ago–13 sep.
    // Renta vence el 3 y Luz y agua el 4: los dos caen en el primero.
    expect(p.fijos.map((f) => f.detalle)).toEqual([
      'Vence el 3 · Cheque 1',
      'Vence el 4 · Cheque 1',
    ])
  })

  it('un vencimiento tardío lo paga el cheque que termina en el mes siguiente', () => {
    // El riel de julio cierra el 3 de agosto. Comparando solo el día, un
    // recibo que vence el 25 no encontraría cheque y se quedaría sin decirlo.
    const f = filas()
    f.mes = { ...f.mes, mes: 7 }
    f.periodos = [
      { id: 'j1', mes_id: MES, usuario_id: IVAN, numero: 1, fecha_inicio: '2026-07-06', fecha_fin: '2026-07-19', fecha_pago: '2026-07-06', ingreso_esperado_cents: 124000, ingreso_real_cents: null, es_extra: false, estado: 'cerrado' },
      { id: 'j2', mes_id: MES, usuario_id: IVAN, numero: 2, fecha_inicio: '2026-07-20', fecha_fin: '2026-08-02', fecha_pago: '2026-07-20', ingreso_esperado_cents: 124000, ingreso_real_cents: null, es_extra: false, estado: 'futuro' },
    ]
    f.categorias = f.categorias.map((c) =>
      c.nombre === 'Renta' ? { ...c, dia_vencimiento: 25 } : c,
    )
    const julio = aPresupuesto(f)
    expect(julio.fijos.find((x) => x.nombre === 'Renta')?.detalle).toBe('Vence el 25 · Cheque 2')
  })

  it('deriva cuánto apartar por cheque para cada fondo', () => {
    const viaje = p.fondos[0]!
    expect(viaje.mesesQueFaltan).toBe(4)
    expect(viaje.mesObjetivo).toBe('Diciembre')
    // Faltan $760, y quedan 4 cheques repartibles al mes por 4 meses.
    expect(viaje.porChequeCents).toBe(porChequeParaLaMeta(centavos(76000), 4, 4))
  })

  it('deja fuera las deudas ya pagadas y las ordena de menor a mayor', () => {
    expect(p.deudas.map((d) => d.nombre)).toEqual(['Capital One', 'Préstamo del carro'])
    expect(p.deudas[0]!.saldoInicialCents).toBe(387500)
    // Lo que de verdad paga sale de su línea del presupuesto, no del mínimo.
    expect(p.deudas[0]!.pagoActualCents).toBe(15000)
    expect(p.deudas[1]!.pagoActualCents).toBe(31000)
  })

  it('trae los movimientos, incluidos los que están sin asignar', () => {
    expect(p.movimientos.map((m) => m.nombre)).toEqual(['Sin asignar', 'Supermercado', 'PSE&G'])
    expect(p.movimientos[0]!.categoria).toBe('Sin asignar')
  })

  it('el saludo y el mes vienen de quien abrió la sesión', () => {
    expect(p.usuario.nombre).toBe('Iván')
    expect(p.usuario.iniciales).toBe('IG')
    expect(p.usuario.frecuencia).toBe('Cada dos semanas')
    expect(p.mes.etiqueta).toBe('Agosto 2026')

    const deRosa = aPresupuesto({ ...filas(), usuarioActual: ROSA })
    expect(deRosa.usuario.nombre).toBe('Rosa')
    expect(deRosa.usuario.frecuencia).toBe('Dos veces al mes')
    // Pero el presupuesto es el mismo: es del hogar.
    expect(deRosa.saleCents).toBe(p.saleCents)
    expect(deRosa.periodos).toEqual(p.periodos)
  })

  it('no inventa las tarjetas de coaching que la base no tiene', () => {
    expect(p.observacion).toBeUndefined()
    expect(p.coach).toBeUndefined()
    expect(p.mesesPasados).toEqual([])
  })

  it('un mes sin nadie no se puede armar', () => {
    expect(() => aPresupuesto({ ...filas(), usuarios: [] })).toThrow(/sin ningún usuario/)
  })
})
