import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let _client = null;

export const supabase = () => {
    if (_client) return _client;
    _client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY, {
        db: { schema: 'stuffbox' },
    });
    return _client;
};
