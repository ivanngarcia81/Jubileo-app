import type { Aviso } from './contenido.js'
import { formatearDolares } from './contenido.js'

/**
 * El aviso, hecho correo.
 *
 * HTML de 1998 a propósito: tablas, estilos en línea y nada de flexbox. Gmail,
 * Outlook y Mail de iPhone recortan las hojas de estilo y no todos entienden lo
 * moderno. Un correo que se ve roto en el teléfono del usuario no sirve, por
 * bonito que se vea en el navegador.
 *
 * Va acompañado siempre de una versión en texto: los clientes que bloquean HTML
 * enseñan esa, y sin ella el correo llega en blanco.
 */

const CARBON = '#1C1E1F'
const TEAL = '#0ABBB4'
const TEXTO2 = '#6B7175'
const AMBAR = '#E8A33D'

function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function avisoEnHtml(a: Aviso, urlApp: string): string {
  const fila = (contenido: string) =>
    `<tr><td style="padding:6px 0;font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:${CARBON}">${contenido}</td></tr>`

  const seccion = (titulo: string, filas: string[]) =>
    filas.length === 0
      ? ''
      : `<tr><td style="padding:18px 0 4px;font:700 11px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:${TEXTO2}">${escapar(titulo)}</td></tr>` +
        filas.join('')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F2F3F1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F3F1">
<tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:16px;padding:24px">

<tr><td style="font:400 26px/1.15 Georgia,serif;color:${CARBON};padding-bottom:2px">
  Jubileo<span style="color:${TEAL}">.</span>
</td></tr>
<tr><td style="font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:${TEXTO2};padding-bottom:14px">
  ${escapar(a.saludo)}
</td></tr>

<tr><td style="font:400 21px/1.3 Georgia,serif;color:${CARBON};padding:6px 0 2px">
  ${escapar(a.entra)}
</td></tr>

<tr><td style="font:700 13px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:${TEXTO2};padding:6px 0 2px">
  ${escapar(a.semana)}
</td></tr>

${
  a.alerta
    ? `<tr><td style="padding-top:14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF3E4;border-radius:10px"><tr><td style="padding:12px 14px;font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#7A5310"><b style="color:${AMBAR}">Apretada.</b> ${escapar(a.alerta)}</td></tr></table></td></tr>`
    : ''
}

${seccion(
  'Se vence en la semana',
  a.pagos.map((p) =>
    fila(
      p.esEnfoque
        ? `<b style="color:${CARBON}">${escapar(p.texto)}</b>`
        : escapar(p.texto),
    ),
  ),
)}

${seccion('Tus sobres de la semana', a.sobres.map((s) => fila(escapar(s))))}

<tr><td style="padding-top:20px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARBON};border-radius:12px">
    <tr><td style="padding:16px 18px">
      <div style="font:700 11px/1 -apple-system,Segoe UI,Roboto,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9AA09E">Te queda</div>
      <div style="font:400 32px/1.1 Georgia,serif;color:${a.libreCents < 0 ? '#E8A33D' : TEAL};padding-top:4px">${formatearDolares(a.libreCents)}</div>
      <div style="font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#9AA09E;padding-top:6px">${escapar(a.cierre)}</div>
    </td></tr>
  </table>
</td></tr>

<tr><td align="center" style="padding-top:22px">
  <a href="${escapar(urlApp)}" style="display:inline-block;background:${TEAL};color:#043432;font:700 15px/1 -apple-system,Segoe UI,Roboto,sans-serif;text-decoration:none;padding:14px 26px;border-radius:11px">Abrir mi semana</a>
</td></tr>

<tr><td style="font:12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:${TEXTO2};padding-top:20px">
  Recibes esto porque activaste el aviso semanal en Jubileo.
</td></tr>

</table>
</td></tr></table>
</body></html>`
}

/** La misma cosa en texto, para quien bloquea el HTML. */
export function avisoEnTexto(a: Aviso, urlApp: string): string {
  const partes = [a.saludo, '', a.entra, a.semana]
  if (a.alerta) {
    partes.push('', `APRETADA: ${a.alerta}`)
  }
  if (a.pagos.length > 0) {
    partes.push('', 'SE VENCE EN LA SEMANA', ...a.pagos.map((p) => `· ${p.texto}`))
  }
  if (a.sobres.length > 0) {
    partes.push('', 'TUS SOBRES DE LA SEMANA', ...a.sobres.map((s) => `· ${s}`))
  }
  partes.push('', `TE QUEDA: ${formatearDolares(a.libreCents)}`, a.cierre, '', urlApp)
  return partes.join('\n')
}
