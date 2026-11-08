# Câu Hỏi Bổ Sung Cho Resiliency Baseline

Các quyết định này bắt buộc do anh đã bật Resiliency Baseline. Phương án khuyến nghị được điều chỉnh cho đồ án CS445 local/demo-first nhưng deploy-ready.

## Question 1 - RTO, RPO và Disaster Recovery

Mục tiêu phục hồi nào phù hợp với đồ án?

A) RTO tối đa 4 giờ, RPO tối đa 24 giờ; Backup & Restore, chi phí thấp (khuyến nghị)

B) RTO/RPO vài chục phút; Pilot Light

C) Không đặt RTO/RPO vì chỉ chạy demo, không có dữ liệu cần phục hồi

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 2 - Change Management

Thay đổi của nhóm được quản lý theo quy trình nào?

A) Dùng quy trình hiện có của tổ chức hoặc lớp học; ghi tên công cụ/quy trình sau câu trả lời

B) Dùng quy trình nhẹ do AI-DLC đề xuất: GitHub issue, pull request, quality gates, phê duyệt và rollback note (khuyến nghị)

C) Miễn quy trình formal; chỉ lưu Git history và AI-DLC audit cho đồ án

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: B

## Question 3 - CI/CD Tooling

Pipeline của dự án nên dùng công cụ nào?

A) GitHub Actions chạy lint, build, unit, E2E, PBT và dependency scan (khuyến nghị)

B) Không tạo pipeline; chỉ cung cấp scripts chạy local

C) Dùng pipeline hiện có của nhóm; ghi tên công cụ sau câu trả lời

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 4 - Rollback Mechanism

Khi bản deploy lỗi, chiến lược rollback nào được chấp nhận?

A) Redeploy artifact/version trước; TypeORM migration theo forward-fix và backup trước migration (khuyến nghị)

B) Blue/green swap về môi trường cũ

C) Canary tự rollback theo health/error metrics

D) Other - ghi rõ chiến lược application và database sau thẻ `[Answer]:`

[Answer]: A

## Question 5 - Deployment Style

Kiểu deployment nào phù hợp mức rủi ro của đồ án?

A) Direct/in-place cho local hoặc sandbox demo, có health check và rollback script (khuyến nghị)

B) Rolling deployment

C) Blue/green hoặc canary

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 6 - Regional Topology

Topology nào thuộc phạm vi nghiệm thu?

A) Local/sandbox single-instance; tài liệu ghi production tương lai cần single-region multi-zone (khuyến nghị)

B) Single-region multi-zone được triển khai thực tế

C) Multi-region active-passive hoặc active-active

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: A

## Question 7 - Incident Response

Sự cố demo/sandbox được xử lý theo quy trình nào?

A) Dùng quy trình incident response hiện có của nhóm; ghi tham chiếu sau câu trả lời

B) Quy trình nhẹ: tạo GitHub issue, thu log/correlation ID, khôi phục dịch vụ, viết post-mortem ngắn và theo dõi corrective action (khuyến nghị)

C) Không cần quy trình incident response trong phạm vi đồ án

D) Other - ghi lựa chọn tùy chỉnh sau thẻ `[Answer]:`

[Answer]: B
