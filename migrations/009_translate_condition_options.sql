-- Migration 009 — Translate condition option_lists seed to Spanish
-- Run in Supabase SQL Editor

delete from stuffbox.option_lists where field = 'condition';

insert into stuffbox.option_lists (workspace_id, field, value, sort_order)
select w.id, 'condition', v.value, v.sort_order
from stuffbox.workspaces w
cross join (
  values
    ('Nuevo', 1),
    ('Como nuevo', 2),
    ('Buen estado', 3),
    ('Usado', 4),
    ('Desgastado', 5),
    ('Dañado', 6),
    ('Necesita reparación', 7),
    ('Restaurado', 8),
    ('Vintage', 9),
    ('Fuera de servicio', 10),
    ('Para desechar', 11)
) as v(value, sort_order);

update stuffbox.items set condition = 'Nuevo' where condition = 'New';
update stuffbox.items set condition = 'Como nuevo' where condition = 'Like new';
update stuffbox.items set condition = 'Buen estado' where condition = 'Good';
update stuffbox.items set condition = 'Usado' where condition = 'Used';
update stuffbox.items set condition = 'Desgastado' where condition = 'Worn';
update stuffbox.items set condition = 'Dañado' where condition = 'Damaged';
update stuffbox.items set condition = 'Necesita reparación' where condition = 'Needs repair';
update stuffbox.items set condition = 'Restaurado' where condition = 'Restored';
update stuffbox.items set condition = 'Fuera de servicio' where condition = 'Out of service';
update stuffbox.items set condition = 'Para desechar' where condition = 'To discard';
