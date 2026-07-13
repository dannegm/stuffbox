import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Standard Supabase App-Router pattern: getUser() refreshes an expired
// access token and rewrites the session cookies on the response, so pages
// never see a stale session. Touches no app logic beyond that.
export const proxy = async request => {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        {
            db: { schema: 'stuffbox' },
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: cookiesToSet => {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    await supabase.auth.getUser();

    return response;
};

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
