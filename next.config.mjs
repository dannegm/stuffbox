/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    // Compiles every file it touches on every build — a real dev-server drag.
    // Keep it for production builds only, skip it in dev for faster HMR.
    reactCompiler: process.env.NODE_ENV === 'production',
};

export default nextConfig;
