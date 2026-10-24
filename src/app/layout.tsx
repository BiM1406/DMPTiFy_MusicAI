import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DMPTiFy - Nền Tảng Nghe Nhạc AI Theo Tâm Trạng",
  description: "Xây dựng DMPTiFy - Hệ thống nghe nhạc trực tuyến đa nền tảng tích hợp gợi ý bài hát theo tâm trạng bằng AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark h-full bg-[#090D16]">
      <body className="h-full bg-[#090D16] text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
