import { supabase } from '@/services/supabase';

export const tagQuery = (id, opts = {}) => ({
    queryKey: ['tag', id],
    queryFn: async () => {
        const { data, error } = await supabase().from('tags').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const tagsQuery = (workspaceId, opts = {}) => ({
    queryKey: ['tags', workspaceId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('tags')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('name');
        if (error) throw error;
        return data;
    },
    enabled: !!workspaceId,
    ...opts,
});

export const createTagMutation = (opts = {}) => ({
    mutationFn: async ({
        workspaceId,
        name,
        color,
        icon = null,
        sku = null,
        searchTerms = [],
        relatedIcons = [],
    }) => {
        const { data, error } = await supabase()
            .from('tags')
            .insert({
                workspace_id: workspaceId,
                name,
                color,
                icon,
                sku,
                search_terms: searchTerms,
                related_icons: relatedIcons,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

export const updateTagMutation = (opts = {}) => ({
    mutationFn: async ({
        id,
        name,
        color,
        icon = null,
        sku = null,
        searchTerms = [],
        relatedIcons = [],
    }) => {
        const { data, error } = await supabase()
            .from('tags')
            .update({
                name,
                color,
                icon,
                sku,
                search_terms: searchTerms,
                related_icons: relatedIcons,
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    ...opts,
});

// Cascades to item_tags (db.sql: tag_id on delete cascade) — untags every
// item that had it, doesn't touch the items themselves.
export const deleteTagMutation = (opts = {}) => ({
    mutationFn: async id => {
        const { error } = await supabase().from('tags').delete().eq('id', id);
        if (error) throw error;
        return id;
    },
    ...opts,
});

export const itemTagsQuery = (itemId, opts = {}) => ({
    queryKey: ['item-tags', itemId],
    queryFn: async () => {
        const { data, error } = await supabase()
            .from('item_tags')
            .select('tag_id, tags(*)')
            .eq('item_id', itemId);
        if (error) throw error;
        return data.map(row => row.tags);
    },
    enabled: !!itemId,
    ...opts,
});

// Replaces the item's full tag set in one call — simpler than diffing
// add/remove, and the picker always hands back the complete desired list.
export const syncItemTagsMutation = (opts = {}) => ({
    mutationFn: async ({ itemId, tagIds }) => {
        const { error: deleteError } = await supabase()
            .from('item_tags')
            .delete()
            .eq('item_id', itemId);
        if (deleteError) throw deleteError;
        if (tagIds.length === 0) return [];
        const { error: insertError } = await supabase()
            .from('item_tags')
            .insert(tagIds.map(tagId => ({ item_id: itemId, tag_id: tagId })));
        if (insertError) throw insertError;
        return tagIds;
    },
    ...opts,
});
