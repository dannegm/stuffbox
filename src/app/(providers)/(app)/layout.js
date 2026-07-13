'use client';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default function AppLayout({ children }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className='flex h-12 shrink-0 items-center gap-2 border-b px-2 md:hidden'>
                    <SidebarTrigger />
                </header>
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
}
