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
} from '@phosphor-icons/react/ssr';
import { supabase } from '@/services/supabase';
import { deleteWorkspaceMutation } from '@/queries/workspaces';
import { resolveWorkspaceColor } from '@/helpers/workspace-color';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/ui/table';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';

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

const SortableHead = ({ label, sortKey, sortBy, sortDir, onSort }) => (
    <TableHead className='cursor-pointer select-none' onClick={() => onSort(sortKey)}>
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

export default function AdminWorkspacesPage() {
    const queryClient = useQueryClient();
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

    const handleDelete = workspace => {
        if (
            !window.confirm(
                `¿Eliminar "${workspace.name}"? Se borra todo lo que contiene. Esto no se puede deshacer.`,
            )
        ) {
            return;
        }
        destroy(workspace.id);
    };

    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

    return (
        <div className='flex flex-col gap-4' data-block='AdminWorkspacesPage'>
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

            <div className='overflow-hidden rounded-lg border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHead
                                label='Nombre'
                                sortKey='name'
                                sortBy={sortBy}
                                sortDir={sortDir}
                                onSort={handleSort}
                            />
                            <TableHead>Dueño</TableHead>
                            <TableHead>Miembros</TableHead>
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
                            <TableRow>
                                <TableCell colSpan={5} className='py-8 text-center'>
                                    <Spinner className='mx-auto size-5' />
                                </TableCell>
                            </TableRow>
                        ) : isError ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className='py-8 text-center text-muted-foreground'
                                >
                                    Ocurrió un error al cargar los workspaces.
                                </TableCell>
                            </TableRow>
                        ) : data.rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className='py-8 text-center text-muted-foreground'
                                >
                                    Sin resultados.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.rows.map(workspace => (
                                <TableRow key={workspace.id}>
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
