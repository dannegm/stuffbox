import { Noto_Sans, Oxanium, Geist_Mono } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans({
    variable: '--font-sans',
    subsets: ['latin'],
});

const oxanium = Oxanium({
    variable: '--font-heading',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata = {
    title: 'Stuffbox',
    description: 'Inventario del hogar',
};

export default function RootLayout({ children }) {
    return (
        <html
            lang='es'
            className={`${notoSans.variable} ${oxanium.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className='min-h-full flex flex-col'>{children}</body>
        </html>
    );
}
