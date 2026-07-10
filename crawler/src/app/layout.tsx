import React from "react";
import "./globals.css";

export const metadata = {
  title: "ST Crawler Tool",
  description: "Web crawler and local preview server for ST-Card-Translation-Sky",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="antialiased min-h-screen selection:bg-indigo-500/20 selection:text-indigo-300">
        {children}
      </body>
    </html>
  );
}
