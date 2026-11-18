# 🗺️ DMPTiFy - Bảng Kế Hoạch & Danh Sách Tính Năng Chưa Hoàn Thiện (BE & FE)

> **Dự án**: Nền tảng nghe nhạc trực tuyến đa nền tảng tích hợp gợi ý theo tâm trạng bằng AI (**DMPTiFy**)  
> **Người thực hiện**: Senior Fullstack Developer & QA Engineer  
> **Chủ sở hữu**: Nguyễn Tuấn Đạt  
> **Thời gian cập nhật**: 18/11/2026 (Phiên bản đồng bộ Phân hệ Admin Portal & Cấu hình AI)  
> **Trạng thái**: Kế hoạch mở rộng & Hoàn thiện Production (Ghi nhận để chuẩn bị triển khai khi có lệnh)  

---

## 📑 Mục Lục
1. [Tổng Quan Tiến Độ & Hiện Trạng Hệ Thống](#1-tổng-quan-tiến-độ--hiện-trạng-hệ-thống)
2. [Phân Hệ 1: Xác Thực & Quản Lý Người Dùng (Auth & User Profile)](#phân-hệ-1-xác-thực--quản-lý-người-dùng-auth--user-profile)
3. [Phân Hệ 2: Cổng Quản Trị Viên (Admin Portal `/admin`)](#phân-hệ-2-cổng-quản-trị-viên-admin-portal-admin)
4. [Phân Hệ 3: Bảng Xếp Hạng Âm Nhạc (Charts Hub)](#phân-hệ-3-bảng-xếp-hạng-âm-nhạc-charts-hub)
5. [Phân Hệ 4: Thư Viện & Quản Lý Danh Sách Phát (Library & Playlists)](#phân-hệ-4-thư-viện--quản-lý-danh-sách-phát-library--playlists)
6. [Phân Hệ 5: Trợ Lý AI Gợi Ý Theo Tâm Trạng (AI Music Assistant - Model 3.8)](#phân-hệ-5-trợ-lý-ai-gợi-ý-theo-tâm-trạng-ai-music-assistant---model-38)
7. [Phân Hệ 6: Trình Phát Nhạc, Tốc Độ Phát & Trải Nghiệm Nghe (Audio Player)](#phân-hệ-6-trình-phát-nhạc-tốc-độ-phát--trải-nghiệm-nghe-audio-player)
8. [Phân Hệ 7: Khám Phá Âm Nhạc Theo Chủ Đề Cảm Xúc (Mood Hub & Discover)](#phân-hệ-7-khám-phá-âm-nhạc-theo-chủ-đề-cảm-xúc-mood-hub--discover)
9. [Ma Trận Ưu Tiên Triển Khai (Priority Matrix: P0 / P1 / P2)](#ma-trận-ưu-tiên-triển-khai-priority-matrix)

---

## 1. Tổng Quan Tiến Độ & Hiện Trạng Hệ Thống

| Phân hệ / Tính năng | Hiện trạng Backend | Hiện trạng Frontend | Mức độ hoàn thiện |
| :--- | :--- | :--- | :---: |
| **Trình phát Dual-Deck Audio Handshake** | ✅ API Streaming / YouTube Sync | ✅ Fade-Out ➔ Fade-In 0% leak | **100% (Hoàn tất)** |
| **Kho bài hát V-Pop Seed Data** | ✅ 15 bài tuyển chọn (Đã đổi bài trùng sang *Lạ Lùng - Vũ.*) | ✅ 15 bài hiển thị chuẩn | **100% (Hoàn tất)** |
| **Bộ điều chỉnh Tốc độ phát nhạc (Speed) & Crossfade** | — | ⚠️ Nút `5s` là Crossfade, đang lên kế hoạch thêm Menu Playback Speed `0.75x - 2.0x` | **70%** |
| **Giao diện Liquid Glass 4 chế độ** | — | ✅ Light / Dark / Glass / System | **100% (Hoàn tất)** |
| **Picture-in-Picture & Đổi tab** | — | ✅ Floating Mini Player & Marquee | **100% (Hoàn tất)** |
| **Nghe nhạc chung (Jam Room)** | ✅ Gateway WebSocket & JamService | ✅ Modal Tạo / Tham gia phòng | **90%** |
| **Thanh toán VIP qua VNPay** | ✅ Ký HMAC-SHA512 & IPN Webhook | ✅ Flow gọi API tạo URL | **85%** |
| **Xác thực Đăng nhập / Đăng ký** | ✅ JWT, Bcrypt, Google OAuth | ⚠️ Mới có AuthModal, chưa có `/login` & `/register` | **50%** |
| **Cổng Quản trị viên (Admin Portal)** | ⚠️ Có role DB, chưa có AdminController | ❌ **Hoàn toàn chưa có giao diện `/admin`** | **10% (Chưa làm)** |
| **Quản lý Playlist chi tiết (CRUD)** | ⚠️ Mới có Create & List | ⚠️ Chưa có Xóa/Sửa/Thêm bài từ menu | **40%** |
| **Bảng xếp hạng nâng cao** | ⚠️ Mới có sort `playCount` tổng | ⚠️ Mới có Top #1-#15 tổng | **45%** |
| **Trợ lý AI Gemini Model 3.8** | ⚠️ Đã set `GEMINI_MODEL=gemini-3.8`, chưa có API Key của Google | ⚠️ Mới có ChatDrawer (chạy fallback offline), chưa có API thật | **60%** |

---

## Phân Hệ 1: Xác Thực & Quản Lý Người Dùng (Auth & User Profile)

### 📌 Những mục Backend cần làm:
1. **API Quên Mật Khẩu & Đặt Lại Mật Khẩu (Forgot/Reset Password)**:
   - Endpoint `POST /api/v1/auth/forgot-password`: Tạo token ngẫu nhiên có hạn sử dụng 15 phút, gửi email chứa liên kết khôi phục.
   - Endpoint `POST /api/v1/auth/reset-password`: Xác thực token và cập nhật mật khẩu mới đã hash qua Bcrypt.
2. **API Cập Nhật Thông Tin Cá Nhân (User Profile Update)**:
   - Endpoint `PATCH /api/v1/users/profile`: Cho phép đổi Tên hiển thị (`fullName`), Số điện thoại, Tiểu sử ngắn.
   - Endpoint `POST /api/v1/users/avatar`: Tải ảnh đại diện (avatar) cá nhân lên server và lưu URL.
   - Endpoint `POST /api/v1/users/change-password`: Đổi mật khẩu với việc kiểm tra mật khẩu cũ.
3. **API Lịch Sử Hóa Đơn & Đăng Ký Gói VIP**:
   - Endpoint `GET /api/v1/users/billing-history`: Lấy danh sách các giao dịch VNPay thành công, ngày kích hoạt và ngày hết hạn gói VIP.

### 📌 Những mục Frontend cần làm:
1. **Trang Đăng Nhập Chuyên Biệt (`/login`)**:
   - Thiết kế Split-Screen hiện đại (kính mờ Liquid Glass bên form, banner âm nhạc bên phải).
   - Form nhập Email, Mật khẩu có nút ẩn/hiện mắt (`Eye / EyeOff`).
   - Checkbox "Ghi nhớ đăng nhập" (Remember me).
   - Nút đăng nhập 1-chạm bằng Google OAuth.
   - Liên kết *"Quên mật khẩu?"* và liên kết sang trang `/register`.
2. **Trang Đăng Ký Chuyên Biệt (`/register`)**:
   - Form nhập Họ tên, Email, Mật khẩu, Xác nhận mật khẩu.
   - Thanh đo độ mạnh mật khẩu trực quan (Weak / Medium / Strong).
   - Điều khoản sử dụng và chính sách bảo mật.
3. **Trang Quên Mật Khẩu (`/forgot-password` & `/reset-password`)**:
   - Form nhập email nhận link khôi phục và form nhập mật khẩu mới.
4. **Trang Quản Lý Hồ Sơ Cá Nhân (`/profile`)**:
   - Xem thông tin tài khoản, ảnh đại diện, huy hiệu gói tài khoản (`FREE` hoặc `VIP PRO`).
   - Form đổi thông tin, đổi ảnh đại diện và đổi mật khẩu.
   - Tab xem lịch sử giao dịch và thời hạn VIP.

---

## Phân Hệ 2: Cổng Quản Trị Viên (Admin Portal `/admin`)

> ⚠️ **Hiện trạng**: **Chưa làm giao diện Admin trên Frontend** (chưa có thư mục `FE/src/app/admin/`), Backend mới chỉ có trường `role: 'ADMIN'` ở tầng CSDL/token, chưa có bộ điều khiển `AdminController`.

### 📌 Những màn hình Frontend cần làm (Giao diện Admin Portal):
1. **Layout Quản Trị Độc Lập (`/admin/layout.tsx`)**:
   - Sidebar Admin riêng biệt với các mục điều hướng:
     - 📊 *Tổng quan Dashboard* (`/admin`)
     - 🎵 *Quản lý Kho bài hát - Song CMS* (`/admin/songs`)
     - 👥 *Quản lý Tài khoản & Gói VIP* (`/admin/users`)
     - 💰 *Quản lý Doanh thu VNPay* (`/admin/billing`)
     - ⚙️ *Cài đặt Hệ thống* (`/admin/settings`)
   - Topbar Admin: Hiển thị avatar, tên Quản trị viên, nút chuyển đổi nhanh về Giao diện người dùng (`Về trang nghe nhạc`).
   - **Admin Guard Client-Side**: Tự động chuyển hướng hoặc hiển thị thông báo chặn truy cập nếu tài khoản đăng nhập không có quyền `ADMIN`.
2. **Trang Dashboard Thống Kê Tổng Quan (`/admin/page.tsx`)**:
   - 4 Thẻ KPI thống kê số liệu trực quan:
     - 👥 *Tổng người dùng đăng ký* (+ % tăng trưởng tuần).
     - 🎵 *Tổng bài hát trong hệ thống* (Phân loại Free / VIP).
     - 🎧 *Lượt nghe tích lũy* (Biểu đồ tăng trưởng lượt phát).
     - 💳 *Doanh thu gói VIP VNPay* (Tổng tiền thực thu bằng VNĐ).
   - Biểu đồ phân bổ bài hát theo tâm trạng/thể loại (Chill, Sad, Energetic, Focus, Acoustic).
3. **Trang Quản Lý Bài Hát - Song CMS (`/admin/songs/page.tsx`)**:
   - Bảng dữ liệu (Data Table) đầy đủ các cột: Ảnh cover, Tên bài hát, Nghệ sĩ/Ca sĩ, BPM, Thể loại/Mood, Lượt nghe, Cờ bài hát VIP.
   - Bộ lọc tìm kiếm theo từ khóa và theo tâm trạng.
   - **Modal Thêm Bài Hát Mới**: Nhập Tên bài, Ca sĩ, link YouTube / MP3, ảnh đại diện, BPM, chọn Mood.
   - **Modal Chỉnh Sửa Bài Hát**: Sửa thông tin, đổi link video YouTube dự phòng, cập nhật trạng thái VIP.
   - **Nút Xóa Bài Hát**: Kèm Popup xác nhận an toàn (Dialog confirmation) để tránh bấm nhầm.
4. **Trang Quản Lý Người Dùng & Gói VIP (`/admin/users/page.tsx`)**:
   - Bảng danh sách tài khoản: Avatar, Họ tên, Email, Vai trò (USER / ADMIN), Gói dịch vụ (FREE / VIP), Ngày tạo tài khoản, Hạn dùng VIP.
   - Menu thao tác nhanh:
     - Nâng cấp gói VIP thủ công (tặng ngày dùng VIP).
     - Chuyển đổi vai trò Quản trị viên (`USER` $\leftrightarrow$ `ADMIN`).
     - Khóa tài khoản tạm thời / Kích hoạt lại tài khoản.

### 📌 Những mục Backend cần làm (Admin API & Security):
1. **Guard Phân Quyền Quản Trị (`AdminRolesGuard`)**:
   - Chặn toàn bộ các request vào prefix `/api/v1/admin/*` nếu header Authorization không chứa JWT token có `role === 'ADMIN'`.
2. **API Thống Kê Tổng Quan (`GET /api/v1/admin/stats`)**:
   - Trả về JSON tổng hợp: Số lượng users, số VIP đang hoạt động, tổng bài hát, tổng lượt nghe và doanh thu VNPay thành công.
3. **API Quản Lý Bài Hát (Song CMS Endpoints)**:
   - `POST /api/v1/admin/songs`: Thêm bài hát mới vào CSDL.
   - `PUT /api/v1/admin/songs/:id`: Cập nhật thông tin bài hát.
   - `DELETE /api/v1/admin/songs/:id`: Xóa bài hát khỏi hệ thống.
4. **API Quản Lý Tài Khoản (User Management Endpoints)**:
   - `GET /api/v1/admin/users`: Danh sách người dùng, tìm kiếm theo email/tên, hỗ trợ phân trang (`page`, `limit`).
   - `PATCH /api/v1/admin/users/:id/role`: Cập nhật quyền Admin.
   - `PATCH /api/v1/admin/users/:id/vip`: Cập nhật thời hạn VIP.
   - `PATCH /api/v1/admin/users/:id/status`: Khóa / Mở khóa tài khoản.

---

## Phân Hệ 3: Bảng Xếp Hạng Âm Nhạc (Charts Hub)

### 📌 Những mục Backend cần làm:
1. **Bộ Lọc Bảng Xếp Hạng Đa Chiều**:
   - Hỗ trợ query params: `period=day|week|month|all` và `genre=vpop|usuk|kpop|all`.
2. **Tính Toán Chỉ Số Thăng / Tụt Hạng (Rank Trends)**:
   - So sánh vị trí thứ hạng của bài hát giữa ngày hôm nay và ngày hôm qua để tính biến động rank: `▲ +2`, `▼ -1`, `― 0`, hoặc `NEW`.

### 📌 Những mục Frontend cần làm:
1. **Dải Tabs Lọc Thời Gian & Thể Loại**:
   - Thanh chọn: *Hôm Nay*, *Tuần Này*, *Tháng Này*, *Mọi Thời Đại*.
   - Tab thể loại: *Top V-Pop*, *Top Quốc Tế*, *Top Lofi / Thư Giãn*.
2. **Huy Hiệu Xu Hướng (Rank Badges)**:
   - Hiển thị mũi tên xanh tăng hạng `▲ +3`, mũi tên đỏ giảm hạng `▼ -2`, hoặc nhãn vàng `NEW` trên từng dòng bài hát.
3. **Hiển Thị Lượt Nghe Cụ Thể**:
   - Hiển thị số lượt nghe chi tiết trên từng card bài hát (ví dụ: *"3.8K lượt nghe"*).
4. **Nút "Phát Toàn Bộ BXH" (Play All)**:
   - 1 nút bấm lớn ở đầu trang để nạp toàn bộ Top 10/15 bài hát vào hàng đợi và phát ngay từ bài #1.

---

## Phân Hệ 4: Thư Viện & Quản Lý Danh Sách Phát (Library & Playlists)

### 📌 Những mục Backend cần làm:
1. **API Thao Tác Chi Tiết Với Playlist (Playlist CRUD)**:
   - `POST /api/v1/playlists/:id/songs`: Thêm bài hát vào playlist đã có (chống trùng lặp ID).
   - `DELETE /api/v1/playlists/:id/songs/:songId`: Xóa một bài hát ra khỏi playlist.
   - `PATCH /api/v1/playlists/:id`: Cập nhật tên playlist, mô tả, ảnh bìa.
   - `DELETE /api/v1/playlists/:id`: Xóa hoàn toàn một playlist.
2. **API Lịch Sử Nghe Nhạc (Recently Played)**:
   - Bảng `user_playback_history`: Ghi nhận bài hát khi người dùng nghe trên 30s.
   - `GET /api/v1/users/recently-played`: Lấy 20 bài hát đã nghe gần nhất.

### 📌 Những mục Frontend cần làm:
1. **Menu 3 Chấm Trên Từng Bài Hát (Song Context Menu)**:
   - Bấm vào menu 3 chấm mở dropdown gồm:
     - *"Thêm vào danh sách phát..."* (chọn playlist muốn thêm hoặc tạo playlist mới).
     - *"Yêu thích / Bỏ thích"*.
     - *"Xem lời bài hát"*.
     - *"Sao chép liên kết bài hát"*.
2. **Trang Chi Tiết Danh Sách Phát (`/playlist/[id]`)**:
   - Ảnh bìa playlist lớn, tên, tác giả, số lượng bài hát, tổng thời lượng.
   - Nút *Phát ngẫu nhiên (Shuffle Play)*, nút *Đổi tên*, nút *Xóa playlist*.
   - Danh sách các bài hát trong playlist kèm nút xóa từng bài khỏi playlist.
3. **Tab "Đã Nghe Gần Đây" Trong Thư Viện**:
   - Hiển thị danh sách các bài hát người dùng vừa nghe để dễ dàng nghe lại.

---

## Phân Hệ 5: Trợ Lý AI Gợi Ý Theo Tâm Trạng (AI Music Assistant - Model 3.8)

### 🤖 Hiện Trạng Cấu Hình AI & API Key:
- **Cấu hình Model**: Đã đặt `GEMINI_MODEL=gemini-3.8` trong file [BE/.env](file:///c:/DMPTiFy_MusicAI/BE/.env).
- **Trạng thái API Key**: **Chưa có API Key của Google** (`GEMINI_API_KEY=` đang để trống).
- **Trạng thái chạy thực tế**:
  - Hiện tại con chat đang hoạt động ở chế độ **Fallback nội bộ** (`mood-fallback.engine.ts`), phân tích từ khóa mẫu offline tiếng Việt.
  - Chưa thể gọi ra AI thật của Google để phản hồi tự do cho đến khi anh Đạt cung cấp API Key.
- **Khung kết nối sẵn sàng**:
  - `BE/src/modules/ai-mood/gemini.client.ts` đã viết sẵn đường dẫn gọi tới Google Generative Language API (`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8:generateContent`).
  - Đã tích hợp Google Function Calling `recommend_music_by_mood` để AI tự động phân loại tâm trạng và đề xuất nhạc. Ngay khi có key dán vào `.env` là hoạt động ngay lập tức.

### 📌 Những mục Backend cần làm tiếp theo:
1. **Lưu Trữ Lịch Sử Cuộc Trò Chuyện (Chat Persistence)**:
   - Bảng CSDL `chat_conversations` và `chat_messages` gắn theo `userId`.
   - Endpoint `GET /api/v1/ai-mood/history`: Tải lại các tin nhắn cũ khi đăng nhập lại.
2. **API Tạo Playlist Tự Động Từ AI**:
   - Endpoint `POST /api/v1/ai-mood/create-playlist-from-recommendation`: Tự động gom toàn bộ các bài hát AI vừa gợi ý thành một playlist mới trong thư viện của người dùng.
3. **Phân Loại Chủ Đề Cảm Xúc Mở Rộng**:
   - Mở rộng phân loại chi tiết các trạng thái: *Thư giãn chill ngắm mưa*, *U buồn & Hoài niệm*, *Năng động & Vui vẻ*, *Tập trung cao độ (Coding/Study)*, *Acoustic mộc mạc*.

### 📌 Những mục Frontend cần làm tiếp theo:
1. **Lưu Giữ Trạng Thái Chat Khi Đổi Tab / F5**:
   - Kết nối với API lịch sử trò chuyện để không bị mất đoạn chat khi chuyển trang.
2. **Nút "1-Click Lưu Thành Danh Sách Phát"**:
   - Dưới mỗi câu trả lời của AI có danh sách đề xuất, thêm nút:  
     ✨ *"Lưu toàn bộ bài này vào Danh sách phát mới"*.
3. **Nhập Liệu Giọng Nói (Voice Input - Web Speech API)**:
   - Icon Micro cạnh ô nhập tin nhắn: Bấm vào để nói tiếng Việt, tự động chuyển giọng nói thành văn bản tâm sự với AI.
4. **Bộ Phím Tắt Gợi Ý Nhanh (Mood Prompt Chips)**:
   - Các gợi ý nhanh bấm 1 chạm: *"Tôi vừa chia tay người yêu"*, *"Cần tập trung viết code"*, *"Một buổi chiều mưa chill chill"*, *"Bật nhạc quẩy cùng bạn bè"*.

---

## Phân Hệ 6: Trình Phát Nhạc, Tốc Độ Phát & Trải Nghiệm Nghe (Audio Player)

### 📌 Cập Nhật Đã Thực Hiện & Cần Làm Ngay:
1. **Đổi Bài Hát Trùng Lặp (`vpop-15`)**:
   - Đã loại bỏ hoàn toàn bản trùng "Nàng Thơ (Piano)" và thay thế bằng bài hát mới: **"Lạ Lùng" - Vũ.** (YouTube ID: `gQL9Uq0sLw8`, BPM: 75, Mood: Acoustic/Chill) đồng bộ trên cả FE mock data và BE seed data.
2. **Khắc Phục Hiểu Lầm Nút Crossfade**:
   - Nút hiển thị `5s` trên thanh Bottom Player hiện tại là **Thời lượng Crossfade (Chuyển bài mượt mà)** chứ không phải tốc độ phát nhạc.
   - Cần bổ sung icon `Layers`/`Fade` và tooltip hiển thị rõ ràng: *"Chuyển bài mượt (Crossfade): 5s"* để người dùng phân biệt được ngay.
3. **Bổ Sung Bộ Điều Chỉnh Tốc Độ Phát Nhạc Thực Tế (Playback Speed)**:
   - Thêm nút tốc độ phát nhạc chuyên dụng (ví dụ icon `Gauge` hoặc nhãn `1.0x`):
     - Menu mở ra các mốc tốc độ: `0.75x`, `1.0x (Chuẩn)`, `1.25x`, `1.5x`, `2.0x`.
     - Điều khiển trực tiếp `player.setPlaybackRate(speed)` trên YouTube Player và `audio.playbackRate = speed` trên native HTML5 audio.
4. **Bộ Chỉnh Âm Thanh Cơ Bản (Equalizer Presets)**:
   - Các preset âm thanh thông dụng: *Mặc định*, *Tăng Bass (Bass Boost)*, *Acoustic Trong Trẻo*, *Giọng Ca Sĩ Rõ Nét (Vocal)*.

---

## Phân Hệ 7: Khám Phá Âm Nhạc Theo Chủ Đề Cảm Xúc (Mood Hub & Discover)

### 📌 Những mục Cần Làm:
1. **Khu Vực "Khám Phá Theo Tâm Trạng" Dạng Thẻ Đồ Họa (Mood Cards Grid)**:
   - Thiết kế khu vực Browse với các thẻ đồ họa lớn, rực rỡ và trực quan (chuẩn phong cách Spotify):
     - 🟣 Thẻ **Thư Giãn & Chill**: Màu tím pastel / gradient hoàng hôn, ảnh minh họa Lofi ngắm mưa.
     - 🟠 Thẻ **Năng Động & Vui Vẻ**: Màu cam rực rỡ / vàng chanh, ảnh tiệc tùng, dã ngoại.
     - 🔵 Thẻ **U Buồn & Hoài Niệm**: Màu xanh thẫm Indigo / xanh navy, ảnh đêm cô đơn bên cửa sổ.
     - 🟢 Thẻ **Tập Trung Cao Độ**: Màu xanh ngọc Emerald, ảnh góc làm việc bàn phím cơ và sách.
     - 🟡 Thẻ **Acoustic & Mộc Mạc**: Màu vàng gỗ ấm áp, ảnh đàn guitar thùng và quán cafe nhỏ.
2. **Lời Chào Cá Nhân Hóa Theo Thời Gian (Time-aware Greetings)**:
   - Tự động nhận diện khung giờ để chào thân thiện:  
     - *Sáng (5h-11h)*: *"Chào buổi sáng, anh Đạt! Cùng bắt đầu ngày mới tràn đầy năng lượng nhé."*  
     - *Chiều (12h-17h)*: *"Buổi chiều làm việc năng suất cùng những giai điệu tập trung."*  
     - *Tối (18h-22h)*: *"Thả lỏng tâm trí và thư giãn sau một ngày dài làm việc."*  
     - *Đêm (23h-4h)*: *"Đêm đã muộn, lắng nghe giai điệu ru êm giấc ngủ nhé."*

---

## Ma Trận Ưu Tiên Triển Khai (Priority Matrix)

| Mức Độ | Tên Tính Năng | Thành Phần | Hiện trạng | Lý Do Ưu Tiên |
| :---: | :--- | :---: | :---: | :--- |
| 🔴 **P0 (Cực Kỳ Cần Thiết)** | **Trang Login & Register chuyên biệt (`/login`, `/register`)** | FE + BE | 50% | Nền tảng nhận diện người dùng, bảo mật tài khoản và lưu trữ sở thích cá nhân. |
| 🔴 **P0 (Cực Kỳ Cần Thiết)** | **Cổng Quản Trị Viên Admin Portal (`/admin`)** | FE + BE | **10% (Chưa có giao diện)** | Cung cấp công cụ quản trị thêm/xóa/sửa kho nhạc và quản lý người dùng thực tế. |
| 🔴 **P0 (Cực Kỳ Cần Thiết)** | **Nút Tốc độ phát nhạc (Playback Speed) & Tách bạch Crossfade** | FE | 70% | Khắc phục hiểu lầm giao diện và hoàn thiện tính năng người dùng mong đợi. |
| 🟡 **P1 (Quan Trọng)** | **Quản lý Playlist chi tiết (Thêm/xóa bài từ menu 3 chấm)** | FE + BE | 40% | Trải nghiệm lưu giữ và phân loại nhạc của người dùng. |
| 🟡 **P1 (Quan Trọng)** | **Bảng Xếp Hạng nâng cao (Hôm nay/Tuần/Tháng & Rank badges `▲/▼`)** | FE + BE | 45% | Tăng tính hấp dẫn và tương tác khám phá âm nhạc thịnh hành. |
| 🟡 **P1 (Quan Trọng)** | **Lưu lịch sử chat AI vào Database & 1-click tạo playlist** | FE + BE | 60% | Khai thác tối đa thế mạnh gợi ý nhạc thông minh bằng AI Gemini Model 3.8. |
| 🟢 **P2 (Nâng Cao)** | **Khám phá Mood Hub đồ họa theo chủ đề & Lời chào theo thời gian** | FE | 0% | Tối ưu trải nghiệm thị giác và cá nhân hóa trải nghiệm người dùng. |
| 🟢 **P2 (Nâng Cao)** | **Trang Hồ sơ cá nhân (`/profile`) & Quên mật khẩu** | FE + BE | 0% | Hoàn thiện vòng đời tài khoản người dùng chuyên nghiệp. |

---

*Tài liệu được cập nhật và duy trì bởi Trợ lý Antigravity dành cho dự án DMPTiFy.*
