import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "Quick-Commerce AI",
  description: "AI-powered store management system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
