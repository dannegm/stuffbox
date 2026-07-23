'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueryState, parseAsInteger, parseAsString, parseAsStringEnum } from 'nuqs';
import {
    MagnifyingGlassIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    CaretLeftIcon,
    CaretRightIcon,
    TrashIcon,
    HouseIcon,
    UsersIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react/ssr';
import { supabase } from '@/services/supabase';
import { deleteWorkspaceMutation } from '@/queries/workspaces';
import { useConfirm } from '@/hooks/use-confirm';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/ui/table';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Stat } from '@/ui/stat';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { cn } from '@/helpers/utils';

const PER_PAGE = 20;
const SORT_KEYS = ['name', 'created_at'];

// Admin-specific composite query (search/sort/page all folded together) —
// colocated here rather than in queries/workspaces.js since it doesn't fit
// the simple per-entity factory shape used everywhere else.
const useAdminWorkspaces = ({ page, search, sortBy, sortDir }) =>
    useQuery({
        queryKey: ['admin-workspaces', page, search, sortBy, sortDir],
        queryFn: async () => {
            let query = supabase()
                .from('workspaces')
                .select(
                    'id, name, color, created_at, profiles!workspaces_owner_id_fkey(name), workspace_members(count)',
                    { count: 'exact' },
                );

            const q = search.trim();
            if (q) query = query.ilike('name', `%${q}%`);

            query = query.order(sortBy, { ascending: sortDir === 'asc' });

            const from = (page - 1) * PER_PAGE;
            query = query.range(from, from + PER_PAGE - 1);

            const { data, error, count } = await query;
            if (error) throw error;
            return { rows: data ?? [], total: count ?? 0 };
        },
    });

const HEAD_CLASS = 'text-xs font-semibold tracking-wide text-muted-foreground uppercase';

const SortableHead = ({ label, sortKey, sortBy, sortDir, onSort }) => (
    <TableHead
        className={cn(HEAD_CLASS, 'cursor-pointer select-none hover:text-foreground')}
        onClick={() => onSort(sortKey)}
    >
        <span className='flex items-center gap-1'>
            {label}
            {sortBy === sortKey &&
                (sortDir === 'asc' ? (
                    <ArrowUpIcon className='size-3' />
                ) : (
                    <ArrowDownIcon className='size-3' />
                ))}
        </span>
    </TableHead>
);

const TableSkeletonRows = ({ rows = 6 }) => (
    <>
        {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index} className='hover:bg-transparent'>
                <TableCell>
                    <span className='flex items-center gap-2'>
                        <Skeleton className='size-2.5 shrink-0 rounded-full' />
                        <Skeleton className='h-4 w-28 rounded' />
                    </span>
                </TableCell>
                <TableCell>
                    <Skeleton className='h-4 w-24 rounded' />
                </TableCell>
                <TableCell>
                    <Skeleton className='h-4 w-8 rounded' />
                </TableCell>
                <TableCell>
                    <Skeleton className='h-4 w-20 rounded' />
                </TableCell>
                <TableCell>
                    <Skeleton className='size-6 rounded' />
                </TableCell>
            </TableRow>
        ))}
    </>
);

export default function AdminWorkspacesPage() {
    const queryClient = useQueryClient();
    const confirm = useConfirm();
    const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
    const [sortBy, setSortBy] = useQueryState(
        'sort',
        parseAsStringEnum(SORT_KEYS).withDefault('created_at'),
    );
    const [sortDir, setSortDir] = useQueryState(
        'dir',
        parseAsStringEnum(['asc', 'desc']).withDefault('desc'),
    );

    const { data, isPending, isError } = useAdminWorkspaces({ page, search, sortBy, sortDir });

    const { mutate: destroy } = useMutation(
        deleteWorkspaceMutation({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-workspaces'] }),
        }),
    );

    const handleSort = key => {
        if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        else {
            setSortBy(key);
            setSortDir('asc');
        }
        setPage(1);
    };

    const handleDelete = async workspace => {
        const ok = await confirm({
            title: `¿Eliminar "${workspace.name}"?`,
            description: 'Se borra todo lo que contiene. Esto no se puede deshacer.',
            confirmLabel: 'Eliminar',
            variant: 'destructive',
            confirmText: workspace.name || 'eliminar',
        });
        if (!ok) return;
        destroy(workspace.id);
    };

    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const membersOnPage =
        data?.rows?.reduce((sum, w) => sum + (w.workspace_members?.[0]?.count ?? 0), 0) ?? 0;

    return (
        <div className='flex flex-col gap-4' data-block='AdminWorkspacesPage'>
            <div
                className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-6'
                data-block='AdminWorkspacesStats'
            >
                {isPending ? (
                    <>
                        <Skeleton className='h-16 w-full rounded-xl sm:w-40' />
                        <Skeleton className='h-16 w-full rounded-xl sm:w-40' />
                    </>
                ) : (
                    <>
                        <div className='rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5'>
                            <Stat
                                icon={HouseIcon}
                                value={total}
                                label={search ? 'resultados' : 'workspaces en total'}
                            />
                        </div>
                        <div className='rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5'>
                            <Stat
                                icon={UsersIcon}
                                value={membersOnPage}
                                label='miembros en esta página'
                            />
                        </div>
                    </>
                )}
            </div>

            <InputGroup className='max-w-xs'>
                <InputGroupAddon>
                    <MagnifyingGlassIcon />
                </InputGroupAddon>
                <InputGroupInput
                    value={search}
                    onChange={event => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                    placeholder='Buscar workspace'
                />
            </InputGroup>

            <div className='overflow-hidden rounded-xl border bg-card shadow-xs ring-1 ring-foreground/5'>
                <Table>
                    <TableHeader className='bg-muted/30'>
                        <TableRow>
                            <SortableHead
                                label='Nombre'
                                sortKey='name'
                                sortBy={sortBy}
                                sortDir={sortDir}
                                onSort={handleSort}
                            />
                            <TableHead className={HEAD_CLASS}>Dueño</TableHead>
                            <TableHead className={HEAD_CLASS}>Miembros</TableHead>
                            <SortableHead
                                label='Creado'
                                sortKey='created_at'
                                sortBy={sortBy}
                                sortDir={sortDir}
                                onSort={handleSort}
                            />
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            <TableSkeletonRows />
                        ) : isError ? (
                            <TableRow className='hover:bg-transparent'>
                                <TableCell colSpan={5} className='p-0'>
                                    <Empty
                                        className='p-6 sm:p-10'
                                        data-block='AdminWorkspacesError'
                                    >
                                        <EmptyHeader>
                                            <EmptyMedia
                                                variant='icon'
                                                className='bg-destructive/10 text-destructive'
                                            >
                                                <WarningCircleIcon />
                                            </EmptyMedia>
                                            <EmptyTitle>Error al cargar</EmptyTitle>
                                            <EmptyDescription>
                                                Ocurrió un error al cargar los workspaces.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        ) : data.rows.length === 0 ? (
                            <TableRow className='hover:bg-transparent'>
                                <TableCell colSpan={5} className='p-0'>
                                    <Empty
                                        className='p-6 sm:p-10'
                                        data-block='AdminWorkspacesEmpty'
                                    >
                                        <EmptyHeader>
                                            <EmptyMedia
                                                variant='icon'
                                                className='bg-primary/10 text-primary'
                                            >
                                                <HouseIcon />
                                            </EmptyMedia>
                                            <EmptyTitle>Sin workspaces</EmptyTitle>
                                            <EmptyDescription>
                                                {search
                                                    ? 'No hay resultados para tu búsqueda.'
                                                    : 'Todavía no se ha creado ningún workspace.'}
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.rows.map(workspace => (
                                <TableRow key={workspace.id} className='[&>td]:py-3'>
                                    <TableCell>
                                        <Link
                                            href={`/workspace/${workspace.id}`}
                                            className='flex items-center gap-2 hover:underline'
                                        >
                                            <span
                                                className='size-2.5 shrink-0 rounded-full bg-(--workspace-color)'
                                                style={{
                                                    '--workspace-color':
                                                        resolveWorkspaceColor(workspace),
                                                }}
                                            />
                                            {workspace.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className='text-muted-foreground'>
                                        {workspace.profiles?.name ?? '—'}
                                    </TableCell>
                                    <TableCell className='text-muted-foreground'>
                                        {workspace.workspace_members?.[0]?.count ?? 0}
                                    </TableCell>
                                    <TableCell className='text-muted-foreground'>
                                        {new Date(workspace.created_at).toLocaleDateString('es-MX')}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size='icon-sm'
                                            variant='ghost'
                                            onClick={() => handleDelete(workspace)}
                                        >
                                            <TrashIcon />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className='flex items-center justify-between gap-2 text-sm text-muted-foreground'>
                <span>{total} en total</span>
                <div className='flex items-center gap-2'>
                    <Button
                        size='icon-sm'
                        variant='outline'
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        <CaretLeftIcon />
                    </Button>
                    <span>
                        {page} / {totalPages}
                    </span>
                    <Button
                        size='icon-sm'
                        variant='outline'
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        <CaretRightIcon />
                    </Button>
                </div>
            </div>
        </div>
    );
}
