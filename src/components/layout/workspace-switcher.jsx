'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, CaretUpDownIcon } from '@phosphor-icons/react/ssr';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/ui/responsive-dialog';
import { Field, FieldGroup, FieldLabel } from '@/ui/field';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Spinner } from '@/ui/spinner';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/ui/sidebar';
import { workspacesQuery, createWorkspaceMutation } from '@/queries/workspaces';
import { getWorkspaceColor } from '@/helpers/workspace-color';
import { useAuth } from '@/providers/auth-provider';

const WorkspaceBullet = ({ workspaceId }) => (
    <span
        className='size-2.5 shrink-0 rounded-full bg-(--bullet-color)'
        style={{ '--bullet-color': getWorkspaceColor(workspaceId) }}
    />
);

const CREATE_WORKSPACE_FORM_ID = 'create-workspace-form';

// Controlled from the outside (no trigger of its own) — the "crear nuevo"
// item lives inside the switcher's dropdown, and nesting a dialog trigger
// inside a menu item races with the menu's own close-on-click. Keeping the
// two portaled trees as siblings, coordinated by plain state, avoids that.
const CreateWorkspaceDialog = ({ open, onOpenChange }) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const router = useRouter();
    const [name, setName] = useState('');

    const { mutate, isPending } = useMutation(
        createWorkspaceMutation({
            onSuccess: workspace => {
                queryClient.invalidateQueries({ queryKey: ['workspaces'] });
                setName('');
                onOpenChange(false);
                router.push(`/workspace/${workspace.id}`);
            },
        }),
    );

    const handleSubmit = event => {
        event.preventDefault();
        if (!name.trim()) return;
        mutate({ name: name.trim(), userId: user.id });
    };

    return (
        <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogContent data-block='CreateWorkspaceDialog'>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Crear espacio</ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <form
                    id={CREATE_WORKSPACE_FORM_ID}
                    onSubmit={handleSubmit}
                    className='px-4 sm:px-0'
                >
                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor='workspace-name'>Nombre</FieldLabel>
                            <Input
                                id='workspace-name'
                                autoFocus
                                value={name}
                                onChange={event => setName(event.target.value)}
                                placeholder='Ej. Casa de mis papás'
                            />
                        </Field>
                    </FieldGroup>
                </form>
                <ResponsiveDialogFooter>
                    <Button
                        type='submit'
                        form={CREATE_WORKSPACE_FORM_ID}
                        disabled={isPending || !name.trim()}
                    >
                        {isPending && <Spinner data-icon='inline-start' />}
                        Crear
                    </Button>
                </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    );
};

export const WorkspaceSwitcher = () => {
    const pathname = usePathname();
    const [createOpen, setCreateOpen] = useState(false);
    const { data: workspaces } = useQuery(workspacesQuery());

    const activeId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const current = workspaces?.find(workspace => workspace.id === activeId) ?? workspaces?.[0];

    return (
        <SidebarMenu data-block='WorkspaceSwitcher'>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger render={<SidebarMenuButton size='lg' />}>
                        {current ? (
                            <>
                                <WorkspaceBullet workspaceId={current.id} />
                                <span className='truncate font-medium'>{current.name}</span>
                            </>
                        ) : (
                            <span className='text-muted-foreground'>Sin espacio</span>
                        )}
                        <CaretUpDownIcon className='ml-auto text-muted-foreground' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='w-64' side='bottom' align='start'>
                        <DropdownMenuLabel>Espacios</DropdownMenuLabel>
                        {workspaces?.map(workspace => (
                            <DropdownMenuItem
                                key={workspace.id}
                                render={<Link href={`/workspace/${workspace.id}`} />}
                            >
                                <WorkspaceBullet workspaceId={workspace.id} />
                                <span className='truncate'>{workspace.name}</span>
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                            <PlusIcon />
                            Crear nuevo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
            <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
        </SidebarMenu>
    );
};
