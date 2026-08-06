'use client';

import { useState } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ThumbsUpIcon,
    ThumbsDownIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    WarningIcon,
} from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
} from '@/ui/responsive-dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { VirtualList } from '@/ui/virtual-list';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { PhotoLightbox } from '@/ui/photo-lightbox';
import { PackedTape } from '@/components/moves/packed-tape';
import { useConfirm } from '@/hooks/use-confirm';
import { deleteEntityRatingMutation, deleteAllEntityRatingsMutation } from '@/queries/entity-ratings';
import { locationAncestorsQuery } from '@/queries/locations';
import { cn } from '@/helpers/utils';

// Lets "eliminar"/"reiniciar"/"borrar"/"clear" surface the danger-zone action
// through the same search box used to filter rated items, instead of only
// ever showing it as a static row someone has to already know is there.
const DANGER_ZONE_KEYWORDS = ['eliminar', 'reiniciar', 'borrar', 'clear', 'empezar de nuevo'];

const DangerZone = ({ className, isClearingAll, onClearAll }) => (
    <div
        className={cn(
            'flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3',
            className,
        )}
        data-block='DeckDangerZone'
    >
        <p className='flex items-center gap-1.5 text-xs font-medium text-destructive'>
            <WarningIcon weight='fill' />
            Zona de peligro
        </p>
        <Button type='button' variant='destructive' disabled={isClearingAll} onClick={onClearAll}>
            {isClearingAll ? (
                <Spinner data-icon='inline-start' />
            ) : (
                <TrashIcon data-icon='inline-start' />
            )}
            Eliminar todo y empezar de nuevo
        </Button>
    </div>
);

// A real component, not an inline arrow returned straight from
// VirtualList's renderItem — it needs its own useQuery (the ancestor walk
// below), and renderItem is called directly inside VirtualList's own render
// loop, so hooks can only live here, in a component React mounts on its own
// fiber per row, not in the renderItem callback itself.
const RatedEntityRow = ({ rating, entity, isRemoving, onRemove }) => {
    const [lightboxIndex, setLightboxIndex] = useState(null);
    // Boxed items/locations inherit their nearest packed ancestor's move —
    // same rule as DeckEntityCard/location/[id]/page.js's packedAncestor.
    const { data: locationAncestors = [] } = useQuery(
        locationAncestorsQuery(entity?.containerId, { enabled: !!entity?.containerId }),
    );
    const isPacked =
        !!entity?.active_move_id || locationAncestors.some(ancestor => ancestor.active_move_id);
    const photos = entity?.photos ?? [];
    const detailHref = entity
        ? `/${entity.entityType === 'item' ? 'item' : 'location'}/${entity.entityId}`
        : null;

    return (
        <>
            <div
                className='relative mb-2 flex items-center gap-3 overflow-hidden rounded-lg border p-3'
                data-block='RatedEntityRow'
            >
                {isPacked && <PackedTape />}
                {photos.length > 0 ? (
                    <button
                        type='button'
                        aria-label='Ver fotos'
                        onClick={() => setLightboxIndex(0)}
                        className='relative z-1 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground [&_svg]:size-4'
                    >
                        <CroppedPhoto src={entity.photoUrl} photo={entity.photo} />
                    </button>
                ) : (
                    <span className='relative z-1 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground [&_svg]:size-4'>
                        <DynamicIcon icon={entity?.icon} />
                    </span>
                )}
                {detailHref ? (
                    <Link
                        href={detailHref}
                        className='relative z-1 min-w-0 flex-1 truncate font-medium hover:underline'
                    >
                        {entity.name}
                    </Link>
                ) : (
                    <span className='relative z-1 min-w-0 flex-1 truncate font-medium text-muted-foreground'>
                        Eliminado
                    </span>
                )}
                <span
                    className={cn(
                        'relative z-1 flex size-6 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5',
                        rating.liked
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-rose-500/15 text-rose-600',
                    )}
                >
                    {rating.liked ? (
                        <ThumbsUpIcon weight='fill' />
                    ) : (
                        <ThumbsDownIcon weight='fill' />
                    )}
                </span>
                <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    className='relative z-1'
                    aria-label='Quitar calificación'
                    disabled={isRemoving}
                    onClick={onRemove}
                >
                    <TrashIcon />
                </Button>
            </div>
            <PhotoLightbox
                photos={photos}
                index={lightboxIndex}
                onIndexChange={setLightboxIndex}
                onClose={() => setLightboxIndex(null)}
            />
        </>
    );
};

// `ratedItems` is pre-joined by the deck page: [{ rating, entity }], entity
// carrying whatever the deck queue already fetched (name/icon) — this dialog
// only searches/displays/deletes, it doesn't refetch anything on its own.
export const RatedEntitiesDialog = ({
    open,
    onOpenChange,
    ratedItems,
    workspaceId,
    profileId,
    onClearAll,
}) => {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [search, setSearch] = useState('');

    const { mutate: removeRating, isPending, variables: pendingId } = useMutation(
        deleteEntityRatingMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['entity-ratings', workspaceId] }),
        }),
    );

    const { mutate: clearAll, isPending: isClearingAll } = useMutation(
        deleteAllEntityRatingsMutation({
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['entity-ratings', workspaceId] });
                onOpenChange(false);
                onClearAll?.();
            },
        }),
    );

    const handleClearAll = async () => {
        // Closed *before* confirming, not after — leaving the drawer open
        // underneath the confirm dialog risked trapping clicks on the
        // confirm dialog until the drawer itself closed. Kept even now that
        // Drawer is built on the same Base UI Dialog primitive as
        // AlertDialog (src/ui/drawer.jsx) — untested whether that removes
        // the need for this ordering, and closing first is harmless either
        // way.
        onOpenChange(false);
        const ok = await confirm({
            title: '¿Eliminar todas tus calificaciones?',
            description:
                'Se borran todos tus likes y dislikes en este espacio, y el deck vuelve a empezar de cero. Esto no se puede deshacer.',
            confirmLabel: 'Eliminar todo',
            variant: 'destructive',
        });
        if (!ok) return;
        clearAll({ workspaceId, profileId });
    };

    const fuse = new Fuse(ratedItems, { keys: ['entity.name'], threshold: 0.3 });
    const filtered = search.trim() ? fuse.search(search.trim()).map(result => result.item) : ratedItems;
    const dangerZoneFuse = new Fuse(DANGER_ZONE_KEYWORDS, { threshold: 0.3 });
    const showDangerZone = !search.trim() || dangerZoneFuse.search(search.trim()).length > 0;

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='RatedEntitiesDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Ya calificados</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Lo que ya calificaste — quita un like o dislike si te arrepentiste.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className='flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 sm:px-0 sm:pb-0'>
                    <InputGroup>
                        <InputGroupAddon>
                            <MagnifyingGlassIcon />
                        </InputGroupAddon>
                        <InputGroupInput
                            value={search}
                            onChange={event => setSearch(event.target.value)}
                            placeholder='Buscar…'
                        />
                    </InputGroup>
                    {filtered.length === 0 ? (
                        <div className='flex min-h-0 flex-1 flex-col gap-2'>
                            <p className='py-6 text-center text-sm text-muted-foreground'>
                                Nada por aquí todavía.
                            </p>
                            {ratedItems.length > 0 && showDangerZone && (
                                <DangerZone
                                    isClearingAll={isClearingAll}
                                    onClearAll={handleClearAll}
                                />
                            )}
                        </div>
                    ) : (
                        <VirtualList
                            nav
                            className='min-h-0 flex-1'
                            items={filtered}
                            getItemKey={({ rating }) => rating.id}
                            estimateSize={() => 68}
                            renderItem={({ rating, entity }) => (
                                <RatedEntityRow
                                    rating={rating}
                                    entity={entity}
                                    isRemoving={isPending && pendingId === rating.id}
                                    onRemove={() => removeRating(rating.id)}
                                />
                            )}
                            footer={
                                ratedItems.length > 0 &&
                                showDangerZone && (
                                    <DangerZone
                                        className='mt-2'
                                        isClearingAll={isClearingAll}
                                        onClearAll={handleClearAll}
                                    />
                                )
                            }
                        />
                    )}
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
