/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    // Compiles every file it touches on every build — a real dev-server drag.
    // Keep it for production builds only, skip it in dev for faster HMR.
    reactCompiler: process.env.NODE_ENV === 'production',
    // Temporary: lets DevTools resolve minified prod stack traces to real
    // file/line. Turn back off (and redeploy) once done debugging.
    productionBrowserSourceMaps: true,
    // A bare '*' is rejected by Next itself (it only allows wildcards on a
    // subdomain segment, never a whole-domain catch-all), so this is the
    // widest allowlist actually achievable: the entire RFC1918 private range
    // + mDNS '.local' hostnames — lets the dev server be hit from another
    // device on the LAN (e.g. a phone, for camera-based barcode scanning).
    allowedDevOrigins: [
        '127.0.0.1',
        'stuffbox.test',
        '*.local',
        '192.168.*.*',
        '10.*.*.*',
        '172.16.*.*',
        '172.17.*.*',
        '172.18.*.*',
        '172.19.*.*',
        '172.20.*.*',
        '172.21.*.*',
        '172.22.*.*',
        '172.23.*.*',
        '172.24.*.*',
        '172.25.*.*',
        '172.26.*.*',
        '172.27.*.*',
        '172.28.*.*',
        '172.29.*.*',
        '172.30.*.*',
        '172.31.*.*',
    ],
};

export default nextConfig;
