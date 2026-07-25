export default function manifest() {
    return {
        name: 'Stuffbox',
        short_name: 'Stuffbox',
        description: 'Inventario del hogar',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#4c35e0',
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
                src: '/icons/icon-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    };
}
