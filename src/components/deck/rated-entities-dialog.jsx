'use client';

import { useState } from 'react';
import Fuse from 'fuse.js';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ThumbsUpIcon, ThumbsDownIcon, TrashIcon, MagnifyingGlassIcon } from '@phosphor-icons/react/ssr';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
} from '@/ui/responsive-dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Button } from '@/ui/button';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { deleteEntityRatingMutation } from '@/queries/entity-ratings';
import { cn } from '@/helpers/utils';

// `ratedItems` is pre-joined by the deck page: [{ rating, entity }], entity
// carrying whatever the deck queue already fetched (name/icon) — this dialog
// only searches/displays/deletes, it doesn't refetch anything on its own.
export const RatedEntitiesDialog = ({ open, onOpenChange, ratedItems, workspaceId }) => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');

    const { mutate: removeRating, isPending, variables: pendingId } = useMutation(
        deleteEntityRatingMutation({
            onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['entity-ratings', workspaceId] }),
        }),
    );

    const fuse = new Fuse(ratedItems, { keys: ['entity.name'], threshold: 0.3 });
    const filtered = search.trim() ? fuse.search(search.trim()).map(result => result.item) : ratedItems;

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='RatedEntitiesDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Ya calificados</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Lo que ya calificaste — quita un like o dislike si te arrepentiste.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className='flex flex-col gap-3 px-4 sm:px-0'>
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
                    <div className='flex max-h-96 flex-col gap-2 overflow-y-auto pb-4 sm:pb-0'>
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
                                    <span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground [&_svg]:size-4'>
                                        <DynamicIcon icon={entity?.icon} />
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
                    </div>
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};
