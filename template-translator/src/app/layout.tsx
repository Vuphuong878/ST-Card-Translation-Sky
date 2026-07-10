import React from "react";
import "./globals.css";

export const metadata = {
  title: "Template Translator",
  description: "Dịch tài liệu và giữ nguyên cấu trúc biến số",
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
