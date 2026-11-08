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
    <html lang="vi" className="dark h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('dmptify-theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved || 'system';
                  var isDark = theme === 'dark' || (theme === 'system' && systemDark);
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.classList.remove('light');
                  } else {
                    root.classList.add('light');
                    root.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-full bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-white antialiased overflow-hidden transition-colors duration-300" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
