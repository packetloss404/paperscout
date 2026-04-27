/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['vm-8ibj4j3lnd2rta4ya11tviml.vusercontent.net'],
}

export default nextConfig
