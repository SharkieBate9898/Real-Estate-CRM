import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mini CRM",
  description: "Lead + Follow-Up Mini CRM for Solo Real Estate Agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="theme-dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
  try {
    var stored = localStorage.getItem("theme");
    var theme = stored === "light" ? "theme-light" : "theme-dark";
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(theme);
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
