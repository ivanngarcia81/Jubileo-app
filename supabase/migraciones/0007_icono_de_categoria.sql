-- ---------------------------------------------------------------------------
-- 0007 — El icono de una categoría
-- ---------------------------------------------------------------------------
--
-- El bug: en producción **toda** categoría sale con el icono genérico de su
-- grupo. `mapeo.ts` lo asigna con `categoria.grupo`, así que las cuatro
-- variables del hogar salen las cuatro con el mismo rombo y los fijos con el
-- mismo `$`. Los iconos específicos —comida, transporte, casa— existen en
-- `iconos.tsx` desde que se cambiaron los glifos Unicode, pero nada en la base
-- podía decir cuál le toca a cada categoría: no había dónde guardarlo.
--
-- Se guarda **la clave, no el dibujo**. La columna dice `'comida'`; qué SVG es
-- `'comida'` lo decide el cliente. Guardar el marcado obligaría a una migración
-- de datos cada vez que se corrija un icono que se ve mal en un Android, y
-- metería en la base algo que no le toca.
--
-- Nulo significa **"no eligió"**, y entonces manda el grupo — que es lo que la
-- app hacía siempre. No es lo mismo que `'gasto'`, que sí es una elección: "de
-- verdad quiero el genérico".
--
-- La siembra es una **sugerencia**, no un veredicto: mira el nombre que el
-- usuario ya escribió y propone. Toda categoría sembrada se puede cambiar en la
-- misma hoja donde se ve, y por eso un falso positivo cuesta poco.
--
-- Espejo de `src/lib/iconos/claves.ts`. No se puede compartir el código —esto
-- corre dentro de Postgres— así que los dos lados están fijados a los mismos
-- casos: `src/lib/iconos/iconos.test.ts` y `supabase/pruebas/07-iconos.sql`.
-- Si un lado cambia de criterio, el otro lo delata.
-- ---------------------------------------------------------------------------

alter table categorias add column if not exists icono text;

-- Las dieciséis que la rejilla de la hoja de categoría deja escoger. Las claves
-- que salen del grupo —`fijo`, `variable`, `ingreso`— **no** están: no se
-- eligen a mano, y aceptarlas aquí dejaría guardar una elección que la interfaz
-- no puede volver a enseñar ni cambiar.
alter table categorias drop constraint if exists icono_conocido;
alter table categorias add constraint icono_conocido check (
  icono is null or icono in (
    'casa', 'comida', 'transporte', 'servicios', 'telefono', 'seguro',
    'salud', 'ropa', 'ninos', 'mascota', 'regalo', 'ahorro', 'tarjeta',
    'deuda', 'mayordomia', 'gasto'
  )
);

-- ---------------------------------------------------------------------------
-- La siembra por palabras clave
-- ---------------------------------------------------------------------------
--
-- `translate` quita los acentos sin depender de la extensión `unaccent`, que no
-- está garantizada: "Teléfono" y "telefono" tienen que caer en el mismo lugar,
-- porque depende del teclado del usuario y no de lo que quiso decir.
--
-- El orden importa y no es casual: `seguro` se prueba **antes** que
-- `transporte` para que "Seguro del carro" salga con el escudo y no con el
-- coche. Sin un orden fijo el resultado dependería del plan de la consulta.
--
-- Se compara por trozo (`like '%…%'`) y no por palabra completa: la gente
-- escribe "Supermercado", no "súper".
--
-- Y solo toca las que están en nulo: `where icono is null` es lo que hace que
-- correr esto dos veces no pise lo que el usuario ya escogió.
-- ---------------------------------------------------------------------------

with limpio as (
  select id, translate(lower(nombre), 'áéíóúüñ', 'aeiouun') as n
    from categorias
   where icono is null
)
update categorias c
   set icono = s.clave
  from (
    select id,
           case
             when n like '%seguro%'                              then 'seguro'
             when n like '%renta%' or n like '%casa%'
               or n like '%hipoteca%'                            then 'casa'
             when n like '%luz%' or n like '%agua%'
               or n like '%internet%' or n like '%telefono%'
               or n like '%servicios%'                           then 'servicios'
             when n like '%comida%' or n like '%super%'
               or n like '%despensa%'                            then 'comida'
             when n like '%gasolina%' or n like '%carro%'
               or n like '%auto%' or n like '%uber%'
               or n like '%bus%'                                 then 'transporte'
           end as clave
      from limpio
  ) s
 where c.id = s.id
   and s.clave is not null
   and c.icono is null;

-- ---------------------------------------------------------------------------
-- Permisos: ninguno cambia.
--
-- `icono` es una columna más de `categorias`, y las políticas de RLS de esa
-- tabla ya dicen quién la ve y quién la escribe — son por fila, no por columna.
-- Un `alter table` no toca la lista de privilegios.
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';

-- El reporte: cuántas categorías salieron con sugerencia y cuántas se quedaron
-- con el icono de su grupo. Ninguna de las dos cifras está mal — la segunda son
-- las que el usuario nombró de un modo que no se parece a nada, y esas se
-- eligen a mano cuando quiera.
select coalesce(icono, '(del grupo)') as icono, count(*) as categorias
  from categorias
 group by 1
 order by categorias desc, 1;
