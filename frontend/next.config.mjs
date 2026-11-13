/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Team portraits are served by TechNeeds' Cloudinary account.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
