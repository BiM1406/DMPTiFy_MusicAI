# scripts/export-context.ps1
# Tự động đóng gói toàn bộ source code sạch của dự án DMPTiFy ra 1 file duy nhất để đưa lên AI Web

$rootDir = (Get-Item $PSScriptRoot).Parent.FullName
$outputFile = Join-Path $rootDir "dmptify_code_context.md"
$dateStr = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

$header = @"
# 🎵 DMPTiFy - AI Mood-Based Music Streaming Platform
> Generated Codebase Context for AI Review (ChatGPT / Claude / Google AI Studio / DeepSeek)
> Date: $dateStr
> Author: Nguyen Tuan Dat & Team DMPTiFy

---

## 🤖 SYSTEM REVIEW PROMPT (Copy phần này gửi kèm model):
````text
Bạn là một Principal Fullstack Architect, Senior Security Engineer và QA Lead.
Dưới đây là toàn bộ mã nguồn của dự án DMPTiFy - nền tảng nghe nhạc trực tuyến tích hợp AI gợi ý theo cảm xúc (CS445 - Đại học Duy Tân).
Stack: Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Zustand 5 (Frontend) & NestJS 12 (Backend).

Hãy thực hiện một bài Review Codebase toàn diện và chuyên sâu theo các mục sau:
1. Đánh giá Kiến Trúc (Architecture & Design Patterns): Đánh giá tính module hóa, separation of concerns giữa Client UI, Audio Store và Backend NestJS.
2. Soi Lỗi Tiềm Ẩn (Bug Hunting & Edge Cases): Kiểm tra Audio Lifecycle (play/pause, seek, audio context leaks, unmount cleanup, song change race conditions), LRC parser edge cases.
3. Hiệu Năng & Tối Ưu (Performance): Render re-renders trong Zustand, Next.js 16 SSR vs CSR hydration, Tailwind v4 styling.
4. Bảo Mật & Kỹ Nghệ (Security & Code Quality): Type safety trong TypeScript, validation, sanitization.
5. Đề Xuất Kiến Trúc Cho 5 Trụ Cột Tích Hợp (CS445 Integration):
   - Trụ cột 1: Google Gemini 2.5 Flash Function Calling (Chuyển từ mock ở client sang NestJS controller).
   - Trụ cột 2: Cloudinary / Supabase Audio CDN & Audio Streaming Range Request (HTTP 206).
   - Trụ cột 3: VNPay Gateway Sandbox (Tạo payment URL, verify chữ ký HMAC-SHA512, IPN Webhook).
   - Trụ cột 4: Google OAuth 2.0 & JWT Session Guard trong NestJS.
   - Trụ cột 5: Resend Email Notification (Gửi biên lai VIP).
6. Actionable Checklist: Liệt kê top 5 việc cần làm ngay kèm code mẫu refactor minh họa.
````

---

## 🌳 CẤU TRÚC THƯ MỤC DỰ ÁN
````text
DMPTiFy_MusicAI/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ai/AiChatDrawer.tsx
│   │   ├── layout/MainContent.tsx, Sidebar.tsx, TopNav.tsx, ThemeSwitcher.tsx
│   │   └── player/BottomPlayer.tsx, KaraokeLyricsModal.tsx
│   ├── lib/mock-songs.ts
│   ├── store/useAudioStore.ts, useThemeStore.ts
│   └── types/music.ts
├── server/
│   ├── src/
│   │   ├── app.controller.spec.ts
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── test/
│   │   └── app.e2e-spec.ts
│   ├── package.json
│   └── vitest.config.e2e.ts
├── package.json
└── README.md
````

---

"@

# Dùng UTF8 không BOM để AI và mọi tool đọc text chuẩn
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputFile, $header, $utf8NoBom)

# Danh sách file tĩnh tại gốc
$rootFiles = @(
    "README.md",
    "package.json",
    "tsconfig.json",
    "next.config.ts"
)

# Quét động các file mã nguồn text trong src/ (loại bỏ binary như .ico, .png, .wav)
$srcFiles = Get-ChildItem -Path (Join-Path $rootDir "src") -Recurse -File | 
    Where-Object { 
        $_.FullName -notmatch "node_modules|\.next" -and 
        $_.Extension -match "\.(ts|tsx|js|jsx|json|css|md|html)$" 
    } | 
    ForEach-Object { $_.FullName.Substring($rootDir.Length + 1).Replace('\', '/') }

# Quét các file code trong server/
$serverFiles = @(
    "server/package.json",
    "server/vitest.config.e2e.ts",
    "server/src/main.ts",
    "server/src/app.module.ts",
    "server/src/app.controller.ts",
    "server/src/app.controller.spec.ts",
    "server/src/app.service.ts",
    "server/test/app.e2e-spec.ts"
)

$allFiles = @($rootFiles) + @($srcFiles) + @($serverFiles)

foreach ($relPath in $allFiles) {
    $fullPath = Join-Path $rootDir $relPath
    if (Test-Path $fullPath) {
        $content = Get-Content -Path $fullPath -Raw -Encoding UTF8
        $ext = [System.IO.Path]::GetExtension($fullPath).TrimStart('.')
        if ($ext -eq "tsx" -or $ext -eq "ts") { $lang = "typescript" }
        elseif ($ext -eq "json") { $lang = "json" }
        elseif ($ext -eq "css") { $lang = "css" }
        elseif ($ext -eq "md") { $lang = "markdown" }
        else { $lang = "text" }

        $section = "`n## 📄 File: $relPath`n```$lang`n$content`n````n`n---`n"
        [System.IO.File]::AppendAllText($outputFile, $section, $utf8NoBom)
    }
}

$fileInfo = Get-Item $outputFile
Write-Host "✅ Xuất file context thành công: $outputFile" -ForegroundColor Green
Write-Host "📊 Dung lượng file: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Cyan
