import { nanoid } from 'nanoid';
import { supabase } from '@/services/supabase';
import { copyR2Objects } from '@/services/uploads';

// "Duplicar item" — a real new row end to end, not a shallow copy: each
// photo gets its own R2 object (server-side R2→R2 copy, see the presign
// route's PUT handler) so deleting one item's photo can never take the
// other's down with it. Tags are a join table, so copying item_tags rows is
// enough — no upload involved there. Everything else on the item rides over
// as-is; only the name gets the "(duplicado)" suffix.
//
// Tags are copied before photos (cheap direct-Supabase insert, effectively
// can't fail) so that if the photo copy ever does hit a transient issue, the
// duplicate still ends up complete except for its photos, rather than losing
// tags/redirect/toast too.
export const duplicateItem = async ({ item, photos = [], tagIds = [] }) => {
    const id = nanoid(8);

    const { data: duplicated, error } = await supabase()
        .from('items')
        .insert({
            id,
            workspace_id: item.workspace_id,
            location_id: item.location_id,
            name: `${item.name} (duplicado)`,
            description: item.description,
            quantity: item.quantity,
            condition: item.condition,
            sku: item.sku,
            serial_number: item.serial_number,
            purchase_price: item.purchase_price,
            acquired_month: item.acquired_month,
            acquired_year: item.acquired_year,
            sentimental_value: item.sentimental_value,
            is_fragile: item.is_fragile,
            storage_orientation: item.storage_orientation,
            icon: item.icon,
            active_move_id: item.active_move_id,
        })
        .select()
        .single();
    if (error) throw error;

    if (tagIds.length > 0) {
        const { error: tagsError } = await supabase()
            .from('item_tags')
            .insert(tagIds.map(tagId => ({ item_id: id, tag_id: tagId })));
        if (tagsError) throw tagsError;
    }

    if (photos.length > 0) {
        const copies = await copyR2Objects({
            workspaceId: item.workspace_id,
            r2Keys: photos.map(photo => photo.r2_key),
        });
        const copiedKeyBySource = new Map(copies.map(copy => [copy.sourceKey, copy.r2Key]));

        const { error: photosError } = await supabase()
            .from('item_photos')
            .insert(
                photos.map(photo => ({
                    item_id: id,
                    r2_key: copiedKeyBySource.get(photo.r2_key),
                    order: photo.order,
                    crop_x: photo.crop_x,
                    crop_y: photo.crop_y,
                    zoom: photo.zoom,
                    rotation: photo.rotation,
                    flip_x: photo.flip_x,
                    flip_y: photo.flip_y,
                })),
            );
        if (photosError) throw photosError;
    }

    return duplicated;
};
