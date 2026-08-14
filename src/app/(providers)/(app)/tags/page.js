'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    MagnifyingGlassIcon,
} from '@phosphor-icons/react/ssr';
import { TagIcon, TagsIcon } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useConfirm } from '@/hooks/use-confirm';
import { usePageTitle } from '@/hooks/use-page-title';
import { workspacesQuery } from '@/queries/workspaces';
import { tagsQuery, deleteTagMutation } from '@/queries/tags';
import { fuzzySearch } from '@/helpers/fuzzy-search';
import { DynamicIcon } from '@/ui/dynamic-icon';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { FALLBACK_TAG_ICON } from '@/constants/location-icons';
import { Stat } from '@/ui/stat';
import { VirtualList } from '@/ui/virtual-list';

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
    const [search, setSearch] = useState('');

    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(w => w.id === activeWorkspaceId) ?? workspaces?.[0];
    usePageTitle(['Tags', workspace?.name]);

    const { data: tags, isPending: isTagsPending } = useQuery(
        tagsQuery(workspace?.id, { enabled: !!workspace }),
    );

    const { mutate: destroy } = useMutation(
        deleteTagMutation({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags', workspace?.id] }),
        }),
    );

    const handleDelete = async tag => {
        const ok = await confirm({
            title: `¿Eliminar el tag "${tag.name}"?`,
            description: 'Se quita de todos los artículos que lo tengan.',
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

    const filteredTags = fuzzySearch(tags, search, ['name', 'search_terms']);

    // Shared between all three branches below (empty/no-results/list) so the
    // hero+search scroll away with the list instead of staying pinned above
    // a separately-scrolling container — same "whole page scrolls" treatment
    // as /search, but tags still needs row virtualization (unlike search's
    // paginated results), so this goes through VirtualList's `header` slot
    // rather than dropping virtualization to get a plain page scroll.
    const header = (
        <>
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
                    <Button variant='outline' size='sm' render={<Link href='/tag/new' />}>
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
        </>
    );

    return (
        <div className='absolute inset-0 flex flex-col overflow-hidden p-4' data-block='TagsPage'>
            {tags.length === 0 ? (
                <div className='flex flex-1 flex-col overflow-y-auto'>
                    <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
                        {header}
                        <Empty className='flex-1' data-block='TagsEmpty'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                                    <DynamicIcon icon={FALLBACK_TAG_ICON} />
                                </EmptyMedia>
                                <EmptyTitle>Sin tags todavía</EmptyTitle>
                                <EmptyDescription>
                                    Los tags son el mecanismo de búsqueda — crea los que uses
                                    seguido.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                </div>
            ) : filteredTags.length === 0 ? (
                <div className='flex flex-1 flex-col overflow-y-auto'>
                    <div className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4'>
                        {header}
                        <Empty className='flex-1' data-block='TagsEmptySearch'>
                            <EmptyHeader>
                                <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                                    <MagnifyingGlassIcon />
                                </EmptyMedia>
                                <EmptyTitle>Sin resultados</EmptyTitle>
                                <EmptyDescription>
                                    Ningún tag coincide con "{search.trim()}".
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                </div>
            ) : (
                // `-m-4` cancels TagsPage's own p-4 so VirtualList's scroll
                // track/scrollbar reaches the true edges instead of sitting
                // inset by a margin-shaped gap; padding moves onto the
                // header/row content below so the visible content keeps the
                // same inset as before — same pattern as location/[id] and
                // /search's own scroll containers.
                <VirtualList
                    nav
                    className='-m-4 min-h-0 flex-1'
                    header={
                        <div className='mx-auto flex w-full max-w-lg flex-col gap-4 p-4'>
                            {header}
                        </div>
                    }
                    items={filteredTags}
                    getItemKey={tag => tag.id}
                    estimateSize={index => (filteredTags[index].sku ? 76 : 60)}
                    renderItem={tag => (
                        <div className='mx-auto w-full max-w-lg px-4'>
                            <div
                                className='group relative mb-2 flex items-center gap-3 overflow-hidden rounded-lg border bg-card p-3 text-sm shadow-xs ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/10'
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
                                <Button
                                    size='icon-sm'
                                    variant='ghost'
                                    render={<Link href={`/tag/${tag.id}`} />}
                                >
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
                        </div>
                    )}
                />
            )}
        </div>
    );
}
