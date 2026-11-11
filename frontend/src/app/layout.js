import "./globals.css";
import Navbar from "@/components/navbar/navbar";
import Footer from "@/components/footer/footer";

export const metadata = {
  title: "TechNeeds 2.0 — Where Future Developers Find Their Edge",
  description: "Your all-in-one mentorship universe to learn, build, collaborate, and grow with AI-powered guidance, interactive skill galaxies, and verified cohorts.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
