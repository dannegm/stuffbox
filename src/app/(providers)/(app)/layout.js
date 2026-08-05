'use client';

import { PackageIcon } from '@phosphor-icons/react/ssr';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function AppLayout({ children }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header
                    className='flex h-12 shrink-0 items-center gap-2 border-b bg-hero-mesh px-2 md:hidden'
                    data-block='MobileHeader'
                >
                    <SidebarTrigger />
                    <div className='flex items-center gap-1.5'>
                        <span className='flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary [&>svg]:size-3.5'>
                            <PackageIcon weight='fill' />
                        </span>
                        <span className='font-heading text-sm font-semibold'>Stuffbox</span>
                    </div>
                </header>
                <div className='relative min-h-0 flex-1'>{children}</div>
            </SidebarInset>
        </SidebarProvider>
    );
}
