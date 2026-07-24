'use client';

import { useState } from 'react';
import Fuse from 'fuse.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { CroppedPhoto } from '@/ui/cropped-photo';
import { useConfirm } from '@/hooks/use-confirm';
import { deleteEntityRatingMutation, deleteAllEntityRatingsMutation } from '@/queries/entity-ratings';
import { cn } from '@/helpers/utils';

// Lets "eliminar"/"reiniciar"/"borrar"/"clear" surface the danger-zone action
// through the same search box used to filter rated items, instead of only
// ever showing it as a static row someone has to already know is there.
const DANGER_ZONE_KEYWORDS = ['eliminar', 'reiniciar', 'borrar', 'clear', 'empezar de nuevo'];

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
                <div className='flex flex-col gap-3 px-4 pb-4 sm:px-0 sm:pb-0'>
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
                    <div className='flex max-h-96 flex-col gap-2 overflow-y-auto'>
                        {filtered.length === 0 ? (
                            <p className='py-6 text-center text-sm text-muted-foreground'>
                                Nada por aquí todavía.
                            </p>
                        ) : (
                            filtered.map(({ rating, entity }) => (
                                <div
                                    key={rating.id}
                                    className='flex items-center gap-3 rounded-lg border p-3'
                                    data-block='RatedEntityRow'
                                >
                                    <span className='relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-foreground [&_svg]:size-4'>
                                        {entity?.photoUrl ? (
                                            <CroppedPhoto src={entity.photoUrl} photo={entity.photo} />
                                        ) : (
                                            <DynamicIcon icon={entity?.icon} />
                                        )}
                                    </span>
                                    <span className='min-w-0 flex-1 truncate font-medium'>
                                        {entity?.name ?? 'Eliminado'}
                                    </span>
                                    <span
                                        className={cn(
                                            'flex size-6 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5',
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
                                        aria-label='Quitar calificación'
                                        disabled={isPending && pendingId === rating.id}
                                        onClick={() => removeRating(rating.id)}
                                    >
                                        <TrashIcon />
                                    </Button>
                                </div>
                            ))
                        )}
                        {ratedItems.length > 0 && showDangerZone && (
                            <div
                                className='flex shrink-0 flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3'
                                data-block='DeckDangerZone'
                            >
                                <p className='flex items-center gap-1.5 text-xs font-medium text-destructive'>
                                    <WarningIcon weight='fill' />
                                    Zona de peligro
                                </p>
                                <Button
                                    type='button'
                                    variant='destructive'
                                    disabled={isClearingAll}
                                    onClick={handleClearAll}
                                >
                                    {isClearingAll ? (
                                        <Spinner data-icon='inline-start' />
                                    ) : (
                                        <TrashIcon data-icon='inline-start' />
                                    )}
                                    Eliminar todo y empezar de nuevo
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
