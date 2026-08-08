-- ---------------------------------------------------------------------------
-- 0004 — Movimientos revisados
-- ---------------------------------------------------------------------------
--
-- Un movimiento que el usuario anotó a mano ya lo vio: lo escribió él. Uno que
-- llegue del banco, no. La pantalla de Movimientos necesita saber la
-- diferencia para poder poner arriba "te faltan 3 por revisar" y no hacer que
-- el usuario recorra la lista entera buscando lo que no ha visto.
--
-- `estado` no sirve para esto y no se toca: dice si el movimiento **tiene
-- sobre**, que es otra pregunta. Un gasto del banco puede estar categorizado y
-- sin revisar, o revisado y sin categoría —"esto lo vi, no sé todavía de dónde
-- sale"—, y las cuatro combinaciones son estados legítimos.
--
-- **La columna nace en `false` a propósito.** Podría nacer en `true` y que el
-- importador del banco la ponga en `false`; si el importador se le olvidara a
-- alguien, cada movimiento del banco entraría marcado como revisado sin que
-- nadie lo haya visto, y eso no se nota nunca. Al revés sí se nota: al usuario
-- le aparecen cosas por revisar de más y lo dice.

alter table transacciones
  add column revisada boolean not null default false;

-- Lo que ya está en la base lo anotó el usuario a mano —no hay otra manera de
-- meter un movimiento hoy— así que ya lo vio.
update transacciones set revisada = true;

comment on column transacciones.revisada is
  'El usuario ya vio este movimiento. Lo anotado a mano nace revisado; lo que '
  'llegue del banco, no. Distinto de `estado`, que dice si tiene sobre.';

-- El índice cubre la única consulta que hace falta: cuántos le faltan por
-- revisar a este hogar. Parcial porque lo revisado no se pregunta nunca.
create index on transacciones (hogar_id) where not revisada;
