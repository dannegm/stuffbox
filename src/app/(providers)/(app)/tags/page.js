'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import {
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    MagnifyingGlassIcon,
} from '@phosphor-icons/react/ssr';
import { TagIcon, TagsIcon } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import { workspacesQuery } from '@/queries/workspaces';
import { tagsQuery, deleteTagMutation } from '@/queries/tags';
import { TagDialog } from '@/components/tags/tag-dialog';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';
import { Stat } from '@/ui/stat';

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
    const confirm = useConfirm();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [search, setSearch] = useState('');

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

    const handleDelete = async tag => {
        const ok = await confirm({
            title: `¿Eliminar el tag "${tag.name}"?`,
            description: 'Se quita de todos los items que lo tengan.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: tag.name || 'eliminar',
        });
        if (!ok) return;
        destroy(tag.id);
    };

    if (isAuthLoading || !user || isWorkspacesPending || !workspace || isTagsPending) {
        return <Loading />;
    }

    const fuse = new Fuse(tags, { keys: ['name'], threshold: 0.3 });
    const filteredTags = search.trim() ? fuse.search(search.trim()).map(result => result.item) : tags;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='TagsPage'
        >
            <div
                className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='MoveHero'
            >
                <div className='flex items-center justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <span className='flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-flourish shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-5'>
                            <TagIcon />
                        </span>
                        <div className='min-w-0 flex-1'>
                            <h1 className='truncate font-heading text-xl leading-tight font-semibold tracking-tight'>
                                Tags
                            </h1>
                        </div>
                    </div>

                    {Boolean(tags.length) && (
                        <div className='flex flex-wrap items-center gap-x-3 sm:gap-x-6 gap-y-2'>
                            <Stat icon={TagsIcon} value={tags.length} label='tags' />
                        </div>
                    )}
                </div>

                <div className='h-1 bg-muted/50' />

                <div className='flex flex-wrap items-center justify-start gap-1 sm:gap-2'>
                    <Button variant='outline' size='sm' onClick={handleCreate}>
                        <PlusIcon data-icon='inline-start' />
                        Nuevo tag
                    </Button>
                </div>
            </div>

            {tags.length > 0 && (
                <InputGroup>
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder='Buscar tag'
                    />
                </InputGroup>
            )}

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
            ) : filteredTags.length === 0 ? (
                <Empty className='flex-1' data-block='TagsEmptySearch'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                            <MagnifyingGlassIcon />
                        </EmptyMedia>
                        <EmptyTitle>Sin resultados</EmptyTitle>
                        <EmptyDescription>Ningún tag coincide con "{search.trim()}".</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <div className='flex flex-col gap-2 mb-12'>
                    {filteredTags.map(tag => (
                        <div
                            key={tag.id}
                            className='group relative flex items-center gap-3 overflow-hidden rounded-lg border bg-card p-3 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
                            style={{ '--tag-color': tag.color }}
                        >
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
