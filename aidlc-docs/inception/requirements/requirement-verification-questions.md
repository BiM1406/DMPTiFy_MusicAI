# Câu Hỏi Xác Minh Yêu Cầu

Phạm vi đã cố định: giữ giao diện hiện tại, backend NestJS, đúng 5 vertical slices và TDD gọn nhẹ bằng Vitest. Anh điền một chữ cái sau mỗi thẻ `[Answer]:`. Với lựa chọn D, anh mô tả ngay sau chữ D.

## Question 1 - Database và ORM

Nền tảng persistence nào sẽ là chuẩn duy nhất cho catalog, user, VIP và payment transaction?

A) PostgreSQL + TypeORM migrations và seed 5 bài hát hiện có (khuyến nghị, phù hợp dữ liệu giao dịch và NestJS)

B) PostgreSQL + Prisma migrations và seed 5 bài hát hiện có

C) MongoDB + Mongoose

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 2 - Media Delivery

Slice 1 nên triển khai Cloudinary/Local CDN theo chế độ nào?

A) Media adapter: local storage mặc định cho dev/test, Cloudinary bật bằng biến môi trường; backend bảo đảm HTTP Range/206 cho local (khuyến nghị)

B) Cloudinary là provider bắt buộc cho mọi môi trường, local chỉ dùng trong unit test

C) Chỉ local media trong phạm vi đồ án, Cloudinary được mô tả nhưng chưa tích hợp

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 3 - External Provider Demo Mode

Khi thiếu Gemini, Google, VNPay hoặc Resend credentials, ứng dụng cần hoạt động thế nào?

A) Provider interface + fake adapter xác định bằng env để demo/E2E chạy ổn định; production mode fail-fast nếu thiếu secret (khuyến nghị)

B) Mọi external provider bắt buộc có sandbox credential; thiếu key thì tính năng trả lỗi có cấu trúc

C) Chỉ mock toàn bộ provider trong đồ án, không gọi sandbox thật

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 4 - JWT Session Transport

Sau khi backend xác minh Google ID token tại `POST /api/auth/google`, session nên được truyền theo cách nào?

A) Access JWT trong HttpOnly, Secure, SameSite cookie; endpoint trả user/VIP nhưng không trả token cho JavaScript (khuyến nghị bảo mật)

B) Access JWT trả trong JSON và frontend gửi Bearer token

C) Access JWT ngắn hạn + refresh token rotation bằng HttpOnly cookie

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 5 - Giới Hạn Thay Đổi Frontend

Để nối đủ 5 slice nhưng giữ nguyên giao diện, phạm vi frontend nào được phép?

A) Thêm API client và chỉ nối hành vi vào UI sẵn có: catalog/player, AI Drawer, profile hiện tại, nút VIP; cho phép một Google sign-in modal tối giản (khuyến nghị)

B) Chỉ nối Slice 1 và Slice 2 vào frontend; auth/payment/email được demo bằng API/Postman

C) Không thêm modal hay control; toàn bộ Slice 3-5 chỉ kiểm chứng bằng E2E backend

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 6 - Security Baseline Extension

Có bật AI-DLC Security Baseline làm blocking constraints cho dự án không?

A) Có - áp dụng các quy tắc security phù hợp làm điều kiện bắt buộc cho từng stage (khuyến nghị vì có OAuth, JWT và payment)

B) Không - chỉ áp dụng acceptance criteria security đã ghi riêng trong requirements

C) Tạm dừng tại đây để quyết định security scope trước khi tiếp tục

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 7 - Resiliency Baseline Extension

Có bật AI-DLC Resiliency Baseline làm định hướng thiết kế không?

A) Có - áp dụng hướng dẫn timeout, retry, idempotency, observability và recovery phù hợp (khuyến nghị cho payment/webhook)

B) Không - giữ phạm vi PoC môn học, chỉ triển khai retry/idempotency bắt buộc theo từng slice

C) Tạm dừng tại đây để quyết định resiliency scope trước khi tiếp tục

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 8 - Property-Based Testing Extension

Có bật Property-Based Testing ngoài bộ Vitest unit/E2E gọn nhẹ không?

A) Có - áp dụng đầy đủ cho business logic, serialization và stateful components

B) Một phần - chỉ áp dụng cho pure functions quan trọng như HTTP Range parsing và VNPay signature canonicalization (khuyến nghị)

C) Không - chỉ dùng example-based unit/E2E tests

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: B

## Question 9 - Deployment Target Của Đồ Án

Mức triển khai cần đạt khi hoàn tất Construction là gì?

A) Local/demo-first nhưng deploy-ready: `.env.example`, Docker Compose PostgreSQL, scripts và tài liệu chạy; không bắt buộc cloud production (khuyến nghị)

B) Deploy public frontend/backend/database và dùng sandbox integrations thật

C) Chỉ chạy local bằng npm, không cần container hoặc deployment artifact

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A
