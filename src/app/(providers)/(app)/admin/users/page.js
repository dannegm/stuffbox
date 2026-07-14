'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useQueryState, parseAsInteger, parseAsString, parseAsStringEnum } from 'nuqs';
import {
    MagnifyingGlassIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    CaretLeftIcon,
    CaretRightIcon,
    ShieldCheckIcon,
    UsersIcon,
    WarningCircleIcon,
} from '@phosphor-icons/react/ssr';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/services/supabase';
import { setSuperAdminMutation } from '@/queries/profiles';
import { useConfirm } from '@/hooks/use-confirm';
import { getAvatarUrl } from '@/helpers/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/ui/table';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ui/input-group';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/skeleton';
import { Stat } from '@/ui/stat';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/ui/empty';
import { cn } from '@/helpers/utils';

const PER_PAGE = 20;
const SORT_KEYS = ['name', 'created_at'];

// Same admin-only composite-query shape as admin/workspaces — colocated
// here, not in queries/profiles.js, since it doesn't fit the simple
// per-entity factory pattern used everywhere else.
const useAdminUsers = ({ page, search, sortBy, sortDir }) =>
    useQuery({
        queryKey: ['admin-users', page, search, sortBy, sortDir],
        queryFn: async () => {
            let query = supabase()
                .from('profiles')
                .select(
                    'uuid, name, email, avatar_seed, gender, color, is_super_admin, created_at, workspace_members(count)',
                    { count: 'exact' },
                );

            const q = search.trim();
            if (q) query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);

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
                        <Skeleton className='size-6 shrink-0 rounded-full' />
                        <Skeleton className='h-4 w-24 rounded' />
                    </span>
                </TableCell>
                <TableCell>
                    <Skeleton className='h-4 w-32 rounded' />
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

export default function AdminUsersPage() {
    const { user } = useAuth();
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

    const { data, isPending, isError } = useAdminUsers({ page, search, sortBy, sortDir });

    const { mutate: toggleAdmin } = useMutation(
        setSuperAdminMutation({
            onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
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

    const handleToggleAdmin = async profile => {
        const next = !profile.is_super_admin;
        const title = next
            ? `¿Hacer admin a "${profile.name}"?`
            : `¿Quitarle admin a "${profile.name}"?`;
        const ok = await confirm({ title, confirmLabel: next ? 'Hacer admin' : 'Quitar admin' });
        if (!ok) return;
        toggleAdmin({ id: profile.uuid, isSuperAdmin: next });
    };

    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    const adminsOnPage = data?.rows?.filter(profile => profile.is_super_admin).length ?? 0;

    return (
        <div className='flex flex-col gap-4' data-block='AdminUsersPage'>
            <div
                className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-6'
                data-block='AdminUsersStats'
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
                                icon={UsersIcon}
                                value={total}
                                label={search ? 'resultados' : 'usuarios en total'}
                            />
                        </div>
                        <div className='rounded-xl border bg-card p-3 shadow-xs ring-1 ring-foreground/5'>
                            <Stat
                                icon={ShieldCheckIcon}
                                value={adminsOnPage}
                                label='admins en esta página'
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
                    placeholder='Buscar por nombre o correo'
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
                            <TableHead className={HEAD_CLASS}>Correo</TableHead>
                            <TableHead className={HEAD_CLASS}>Espacios</TableHead>
                            <SortableHead
                                label='Creado'
                                sortKey='created_at'
                                sortBy={sortBy}
                                sortDir={sortDir}
                                onSort={handleSort}
                            />
                            <TableHead className={HEAD_CLASS}>Admin</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            <TableSkeletonRows />
                        ) : isError ? (
                            <TableRow className='hover:bg-transparent'>
                                <TableCell colSpan={5} className='p-0'>
                                    <Empty className='p-6 sm:p-10' data-block='AdminUsersError'>
                                        <EmptyHeader>
                                            <EmptyMedia
                                                variant='icon'
                                                className='bg-destructive/10 text-destructive'
                                            >
                                                <WarningCircleIcon />
                                            </EmptyMedia>
                                            <EmptyTitle>Error al cargar</EmptyTitle>
                                            <EmptyDescription>
                                                Ocurrió un error al cargar los usuarios.
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        ) : data.rows.length === 0 ? (
                            <TableRow className='hover:bg-transparent'>
                                <TableCell colSpan={5} className='p-0'>
                                    <Empty className='p-6 sm:p-10' data-block='AdminUsersEmpty'>
                                        <EmptyHeader>
                                            <EmptyMedia
                                                variant='icon'
                                                className='bg-primary/10 text-primary'
                                            >
                                                <UsersIcon />
                                            </EmptyMedia>
                                            <EmptyTitle>Sin usuarios</EmptyTitle>
                                            <EmptyDescription>
                                                {search
                                                    ? 'No hay resultados para tu búsqueda.'
                                                    : 'Todavía no se ha registrado ningún usuario.'}
                                            </EmptyDescription>
                                        </EmptyHeader>
                                    </Empty>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.rows.map(profile => (
                                <TableRow key={profile.uuid} className='[&>td]:py-3'>
                                    <TableCell>
                                        <span className='flex items-center gap-2'>
                                            <Avatar
                                                className='size-6 bg-(--profile-color)'
                                                style={{ '--profile-color': profile.color }}
                                            >
                                                <AvatarImage
                                                    src={getAvatarUrl(
                                                        profile.avatar_seed,
                                                        profile.gender,
                                                    )}
                                                    alt={profile.name}
                                                />
                                                <AvatarFallback>
                                                    {profile.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            {profile.name}
                                        </span>
                                    </TableCell>
                                    <TableCell className='text-muted-foreground'>
                                        {profile.email}
                                    </TableCell>
                                    <TableCell className='text-muted-foreground'>
                                        {profile.workspace_members?.[0]?.count ?? 0}
                                    </TableCell>
                                    <TableCell className='text-muted-foreground'>
                                        {new Date(profile.created_at).toLocaleDateString('es-MX')}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            size='icon-sm'
                                            variant='ghost'
                                            disabled={profile.uuid === user?.id}
                                            onClick={() => handleToggleAdmin(profile)}
                                            className={cn(profile.is_super_admin && 'text-primary')}
                                        >
                                            <ShieldCheckIcon
                                                weight={profile.is_super_admin ? 'fill' : 'regular'}
                                            />
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
