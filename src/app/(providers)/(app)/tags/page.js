'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import { tagsQuery, deleteTagMutation } from '@/queries/tags';
import { TagDialog } from '@/components/tags/tag-dialog';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='TagsLoading'
    >
        <div className='flex items-center justify-between gap-2'>
            <Skeleton className='h-7 w-20 rounded' />
            <Skeleton className='h-9 w-28 rounded-md' />
        </div>
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-14 w-full rounded-xl' />
            <Skeleton className='h-14 w-full rounded-xl' />
            <Skeleton className='h-14 w-full rounded-xl' />
        </div>
    </div>
);

export default function TagsPage() {
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState(null);

    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(w => w.id === activeWorkspaceId) ?? workspaces?.[0];

    const { data: tags, isPending: isTagsPending } = useQuery(
        tagsQuery(workspace?.id, { enabled: !!workspace }),
    );

    const { mutate: destroy } = useMutation(
        deleteTagMutation({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags', workspace?.id] }),
        }),
    );

    const handleCreate = () => {
        setEditingTag(null);
        setDialogOpen(true);
    };

    const handleEdit = tag => {
        setEditingTag(tag);
        setDialogOpen(true);
    };

    const handleDelete = tag => {
        if (
            !window.confirm(
                `¿Eliminar el tag "${tag.name}"? Se quita de todos los items que lo tengan.`,
            )
        ) {
            return;
        }
        destroy(tag.id);
    };

    if (isAuthLoading || !user || isWorkspacesPending || !workspace || isTagsPending) {
        return <Loading />;
    }

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='TagsPage'
        >
            <div className='flex items-center justify-between gap-2'>
                <h1 className='font-heading text-xl font-semibold tracking-tight'>Tags</h1>
                <Button size='sm' onClick={handleCreate}>
                    <PlusIcon data-icon='inline-start' />
                    Nuevo tag
                </Button>
            </div>

            {tags.length === 0 ? (
                <Empty className='flex-1' data-block='TagsEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                            <DynamicIcon icon={FALLBACK_TAG_ICON} />
                        </EmptyMedia>
                        <EmptyTitle>Sin tags todavía</EmptyTitle>
                        <EmptyDescription>
                            Los tags son el mecanismo de búsqueda — crea los que uses seguido.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className='flex flex-col gap-2'>
                    {tags.map(tag => (
                        <div
                            key={tag.id}
                            className='group relative flex items-center gap-3 overflow-hidden rounded-xl border bg-card p-3 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
                            style={{ '--tag-color': tag.color }}
                        >
                            <span
                                aria-hidden
                                className='absolute inset-y-0 left-0 w-1 bg-(--tag-color)'
                            />
                            <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--tag-color)/15 text-(--tag-color) [&_svg]:size-4.5'>
                                <DynamicIcon icon={tag.icon ?? FALLBACK_TAG_ICON} />
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='block truncate font-medium'>{tag.name}</span>
                                {tag.sku && (
                                    <span className='block truncate text-xs text-muted-foreground'>
                                        {tag.sku}
                                    </span>
                                )}
                            </span>
                            <Button size='icon-sm' variant='ghost' onClick={() => handleEdit(tag)}>
                                <PencilSimpleIcon />
                            </Button>
                            <Button
                                size='icon-sm'
                                variant='ghost'
                                onClick={() => handleDelete(tag)}
                            >
                                <TrashIcon />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <TagDialog
                workspaceId={workspace.id}
                tag={editingTag}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </div>
    );
}
