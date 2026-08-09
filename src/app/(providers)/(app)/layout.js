'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PackageIcon } from '@phosphor-icons/react/ssr';
import { workspacesQuery } from '@/queries/workspaces';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function AppLayout({ children }) {
    // Same active-workspace resolution as WorkspaceSwitcher/AppSidebar
    // (pathname's /workspace/{id} segment, falling back to the first
    // workspace) — kept as its own copy here rather than a shared hook,
    // matching how those two already duplicate it independently.
    const pathname = usePathname();
    const { data: workspaces } = useQuery(workspacesQuery());
    const activeWorkspaceId = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
    const activeWorkspace =
        workspaces?.find(workspace => workspace.id === activeWorkspaceId) ?? workspaces?.[0];

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header
                    className='flex h-12 shrink-0 items-center gap-2 border-b bg-hero-mesh px-2 md:hidden'
                    data-block='MobileHeader'
                >
                    <SidebarTrigger />
                    <Link
                        href={activeWorkspace ? `/workspace/${activeWorkspace.id}` : '/workspace/new'}
                        className='flex items-center gap-1.5'
                    >
                        <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary [&>svg]:size-3.5'>
                            <PackageIcon weight='fill' />
                        </span>
                        <span className='font-heading text-sm font-semibold'>Stuffbox</span>
                    </Link>
                </header>
                <div className='relative min-h-0 flex-1'>{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
