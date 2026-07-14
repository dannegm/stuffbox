-- Migration 008 — Reset orientation option_lists seed to a fixed directional enum
-- Run in Supabase SQL Editor

delete from stuffbox.option_lists where field = 'orientation';

insert into stuffbox.option_lists (workspace_id, field, value, sort_order)
select w.id, 'orientation', v.value, v.sort_order
from stuffbox.workspaces w
cross join (
  values ('NONE', 1), ('UP', 2), ('DOWN', 3), ('LEFT', 4), ('RIGHT', 5)
) as v(value, sort_order);

update stuffbox.items
  set storage_orientation = null
  where storage_orientation is not null
    and storage_orientation not in ('NONE', 'UP', 'DOWN', 'LEFT', 'RIGHT');

update stuffbox.locations
  set storage_orientation = null
  where storage_orientation is not null
    and storage_orientation not in ('NONE', 'UP', 'DOWN', 'LEFT', 'RIGHT');
