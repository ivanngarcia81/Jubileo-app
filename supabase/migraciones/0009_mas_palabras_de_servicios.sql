-- ---------------------------------------------------------------------------
-- 0009 — Tres palabras más para el icono de servicios, y la siembra en función
-- ---------------------------------------------------------------------------
--
-- "Electricidad" salía con el rombo genérico. La siembra de 0007 conoce `luz`
-- pero no `electricidad`, y media población le dice de la otra manera. Lo mismo
-- con `cable` y `celular`, que son recibos de todos los meses y no estaban.
--
-- ---------------------------------------------------------------------------
-- La palabra que NO se agregó, y por qué
-- ---------------------------------------------------------------------------
--
-- **`gas`.** Es un recibo tan común como los otros tres, y no se puede poner:
-- la comparación es por trozo (`like '%gas%'`), así que "Gasolina" contiene
-- "gas" y `servicios` se prueba **antes** que `transporte`. Agregarlo le
-- robaría el icono a la gasolina de todo el mundo — un caso frecuente
-- estropeado para arreglar uno menos frecuente.
--
-- Tiene arreglo, pero no es agregar una palabra: sería comparar por palabra
-- completa en vez de por trozo, y eso cambia el comportamiento de las diecisiete
-- que ya existen. Cuando alguien lo pida, va en su propio cambio con sus
-- pruebas. Hay una prueba en `src/lib/iconos/iconos.test.ts` que delata a quien
-- agregue `gas` "por completar la lista".
--
-- ---------------------------------------------------------------------------
-- La siembra pasa a ser una función
-- ---------------------------------------------------------------------------
--
-- En 0007 era una sentencia suelta, y sus palabras acabaron escritas en **tres**
-- sitios: la migración, `src/lib/iconos/claves.ts` y la prueba de esquema, que
-- la copiaba para poder ejercitarla. Tres copias de una lista que va a crecer es
-- una que se desincroniza — y la que se desincronizó fue justo la de la prueba,
-- que por eso no vio que faltaba `electricidad`.
--
-- Con la función quedan dos, SQL y TypeScript, que es el mínimo posible: el
-- cliente sugiere al crear una categoría y el servidor siembra al migrar, y no
-- hay forma de que compartan código. Las pruebas de los dos lados están fijadas
-- a la misma lista, así que si una cambia sin la otra, revienta.
--
-- Cada migración futura que agregue palabras es un `create or replace` de esta
-- función más un `select sembrar_iconos()`. Nada más.

create or replace function sembrar_iconos()
returns int
language plpgsql
set search_path = public, pg_temp
as $$
declare
  tocadas int;
begin
  -- El orden importa y es a propósito: `seguro` antes que `casa`, y `casa`
  -- antes que `transporte`, para que "Seguro del carro" salga con el escudo y
  -- no con el coche. Sin un orden fijo el resultado dependería del plan de la
  -- consulta.
  --
  -- Y solo toca las que están en nulo: eso hace que correr esto dos veces no
  -- pise lo que el usuario ya escogió, ni lo que sembró una migración anterior.
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
               when n like '%luz%' or n like '%electricidad%'
                 or n like '%agua%'
                 or n like '%internet%' or n like '%cable%'
                 or n like '%telefono%' or n like '%celular%'
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

  get diagnostics tocadas = row_count;
  return tocadas;
end $$;

-- No la llama la app: la llaman las migraciones y las pruebas de esquema, que
-- entran como dueño. Patrón de 0003.
revoke execute on function sembrar_iconos() from public, anon, authenticated;

select sembrar_iconos() as categorias_que_estrenaron_icono;

notify pgrst, 'reload schema';

-- El reporte: qué categorías tienen icono y cuáles siguen mandando su grupo.
-- "Electricidad" tiene que salir en `servicios`, no en `(del grupo)`.
select coalesce(icono, '(del grupo)') as icono, count(*) as cuantas
  from categorias
 group by 1
 order by 2 desc, 1;
