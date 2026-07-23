'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useQueryState, parseAsString, parseAsArrayOf, parseAsBoolean } from 'nuqs';
import { MagnifyingGlassIcon, WarningCircleIcon, ScanIcon } from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { workspacesQuery } from '@/queries/workspaces';
import { searchQuery, SEARCH_PAGE_SIZE } from '@/queries/search';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { SearchFilters } from '@/components/search/search-filters';
import { SearchResultRow } from '@/components/search/search-result-row';
import { ScanSkuDialog } from '@/components/items/scan-sku-dialog';
import { parseSku } from '@/helpers/barcode';
import { matchDeepLink } from '@/helpers/deep-link';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/ui/input-group';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';

const Loading = () => (
    <div
        className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
        data-block='SearchLoading'
    >
        <Skeleton className='h-24 w-full rounded-2xl' />
        <Skeleton className='h-9 w-full rounded-md' />
        <div className='flex flex-col gap-2'>
            <Skeleton className='h-16 w-full rounded-lg' />
            <Skeleton className='h-16 w-full rounded-lg' />
            <Skeleton className='h-16 w-full rounded-lg' />
        </div>
    </div>
);

export default function SearchPage() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isLoading: isAuthLoading } = useAuth();

    const [q, setQ] = useQueryState('q', parseAsString.withDefault(''));
    const [tagIds, setTagIds] = useQueryState(
        'tags',
        parseAsArrayOf(parseAsString).withDefault([]),
    );
    const [typeIds, setTypeIds] = useQueryState(
        'types',
        parseAsArrayOf(parseAsString).withDefault([]),
    );
    const [packed, setPacked] = useQueryState('packed', parseAsBoolean);
    const [houseIds, setHouseIds] = useQueryState(
        'houses',
        parseAsArrayOf(parseAsString).withDefault([]),
    );

    const [inputValue, setInputValue] = useState(q);
    const debouncedInput = useDebouncedValue(inputValue, 300);
    useEffect(() => {
        if (debouncedInput !== q) setQ(debouncedInput || null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedInput]);

    const [isScanOpen, setIsScanOpen] = useState(false);
    // A scanned QR might be one of our own printed-label deep links
    // (`{APP_URL}/i/{id}` or `/l/{id}`) — in that case we already know
    // exactly which item/location it is, so go straight there instead of
    // showing it as a search result. Otherwise, scanned values are
    // `type|code` (see helpers/barcode.js) — only the bare code is useful as
    // a search term, and setting both q and inputValue skips the 300ms
    // debounce for this discrete action instead of waiting on it like typing.
    const handleScan = scanned => {
        const deepLink = matchDeepLink(scanned);
        if (deepLink) {
            router.push(`/${deepLink.kind}/${deepLink.id}`);
            return;
        }

        const { code } = parseSku(scanned);
        setInputValue(code);
        setQ(code || null);
    };

    const [limit, setLimit] = useState(SEARCH_PAGE_SIZE);
    useEffect(() => {
        setLimit(SEARCH_PAGE_SIZE);
    }, [q, tagIds, typeIds, packed, houseIds]);

    const { data: workspaces, isPending: isWorkspacesPending } = useQuery(
        workspacesQuery({ enabled: !!user }),
    );
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const workspace = workspaces?.find(w => w.id === activeWorkspaceId) ?? workspaces?.[0];

    const {
        data,
        isPending: isSearchPending,
        isError,
    } = useQuery(
        searchQuery({
            workspaceId: workspace?.id,
            q,
            tagIds,
            typeIds,
            packed,
            houseIds,
            limit,
        }),
    );

    if (isAuthLoading || !user || isWorkspacesPending || !workspace) {
        return <Loading />;
    }

    const total = data?.total ?? 0;
    const rows = data?.rows ?? [];
    const hasMore = rows.length < total;

    return (
        <div
            className='mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4'
            data-block='SearchPage'
        >
            <div
                className='relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-hero-mesh p-4 ring-1 ring-foreground/10'
                data-block='SearchHero'
            >
                <div className='flex items-center gap-3'>
                    <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-foreground shadow-sm shadow-black/10 ring-1 ring-foreground/10 [&_svg]:size-4'>
                        <MagnifyingGlassIcon />
                    </span>
                    <div className='min-w-0'>
                        <h1 className='truncate font-heading text-xl leading-tight font-semibold tracking-tight'>
                            Buscar
                        </h1>
                    </div>
                </div>

                <InputGroup className='bg-card'>
                    <InputGroupAddon>
                        <MagnifyingGlassIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        autoFocus
                        value={inputValue}
                        onChange={event => setInputValue(event.target.value)}
                        onFocus={event => event.target.select()}
                        placeholder='Nombre de un item o lugar…'
                    />
                    <InputGroupAddon align='inline-end'>
                        <InputGroupButton
                            size='icon-xs'
                            aria-label='Escanear código'
                            onClick={() => setIsScanOpen(true)}
                        >
                            <ScanIcon />
                        </InputGroupButton>
                    </InputGroupAddon>
                </InputGroup>
                <ScanSkuDialog open={isScanOpen} onOpenChange={setIsScanOpen} onScan={handleScan} />
            </div>

            <SearchFilters
                workspaceId={workspace.id}
                tagIds={tagIds}
                onTagIdsChange={setTagIds}
                typeIds={typeIds}
                onTypeIdsChange={setTypeIds}
                packed={packed}
                onPackedChange={setPacked}
                houseIds={houseIds}
                onHouseIdsChange={setHouseIds}
            />

            <p className='text-xs text-muted-foreground'>
                {isSearchPending ? 'Buscando…' : `Mostrando ${rows.length} de ${total} resultados`}
            </p>

            {isError ? (
                <Empty className='flex-1' data-block='SearchError'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-destructive/10 text-destructive'>
                            <WarningCircleIcon />
                        </EmptyMedia>
                        <EmptyTitle>Error al buscar</EmptyTitle>
                        <EmptyDescription>Ocurrió un error al cargar los resultados.</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : isSearchPending ? (
                <div className='flex flex-col gap-2'>
                    <Skeleton className='h-16 w-full rounded-lg' />
                    <Skeleton className='h-16 w-full rounded-lg' />
                    <Skeleton className='h-16 w-full rounded-lg' />
                </div>
            ) : rows.length === 0 ? (
                <Empty className='flex-1' data-block='SearchEmpty'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-primary/10 text-primary'>
                            <MagnifyingGlassIcon />
                        </EmptyMedia>
                        <EmptyTitle>Sin resultados</EmptyTitle>
                        <EmptyDescription>
                            Prueba con otro nombre o quita algunos filtros.
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            ) : (
                <>
                    <div className='flex flex-col gap-2'>
                        {rows.map(result => (
                            <SearchResultRow
                                key={`${result.kind}-${result.data.id}`}
                                result={result}
                            />
                        ))}
                    </div>
                    {hasMore && (
                        <Button
                            variant='outline'
                            className='w-full'
                            onClick={() => setLimit(current => current + SEARCH_PAGE_SIZE)}
                        >
                            Cargar más
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}
