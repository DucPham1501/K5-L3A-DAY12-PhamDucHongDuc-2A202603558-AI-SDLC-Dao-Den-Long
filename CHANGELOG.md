# Changelog

## 0.3.0 — Phase 3: Đèn cạn dầu

### Breaking changes

- Contract 1.1 → 1.2. Thời lượng Đêm 300/330/360 → 240/270/300 giây.
- Bỏ thắng sớm all_lit; chỉ thắng tại bình minh với ceil(60% số đèn) sáng, reason dawn_survived. Hết lửa ưu tiên tuyệt đối.
- Đèn sáng vẫn nhận đom đóm để châm dầu, đèn đầy không được chọn. Đèn hết dầu tắt/reset deposited nhưng nhớ ever_lit; thắp lại tốn 5 thay vì 10.
- Dầu 100, tự hao 1/s; dưới 30 mất safe zone. Wander ưu tiên đèn yếu, shade có drain hút 5/s cộng dồn. Đây thay luật bóng luôn bị đèn sáng chặn.
- Sức chứa cố định 10 → min(20,10+2×successful_lights); reset đầu Đêm, chỉ gameplay light/relight làm tăng.
- Thay toàn bộ điểm Phase 2: nạp/châm +5, lần đầu +100, relight +40, pulse drain tổng +15/khác +5, dawn thưởng đèn/fuel/lửa; bỏ thưởng thời gian.
- Snapshot/scenario/event mở rộng theo v1.2. Fixture thắng sớm chuyển thành fixture bình minh; kỳ vọng thời gian/điểm cũ cập nhật có lý do trong ADR/spec, không skip test.

### Hiển thị và kiểm chứng

- Thanh dầu, cảnh báo 1 Hz, đèn tắt xẹp/rách; chế độ Bảng màu dễ phân biệt lưu giữa các lần mở, viền/mắt xanh và cảnh báo trắng có ⚠.
- HUD sức chứa động, hướng dẫn mục tiêu mới, hàng đợi cho phím nhấn ngắn giữa hai tick render.
- ADR-003, 70 tests, scenario dầu/hút/thắp lại/dawn, replay tất định, benchmark và browser QA riêng Phase 3. Các bản/bằng chứng trước giữ nguyên.

## 0.2.0 — Phase 2

- Chuẩn hóa số liệu, bản đồ và Test Contract v1.1; hỗ trợ ba Đêm.
- Lướt, terrain nhiều tầng/dốc/cầu/bục, rơi/hồi sinh, đồ rơi và TTL, AI shade chuẩn, Gió Lạc, Bùa Gió và gió Đêm 3.
- Chuỗi Đêm/Bình Minh, pause đúng tick/sim_tick, cài đặt lưu, HUD chuẩn, palette và Web Audio.
- 46 unit/CLI tests, scenarios, replay tất định, full-night benchmark, browser QA và đo FPS 1280×720.
- Phase 1 giữ ở tag phase-1; proof hai phase tách riêng.

## 0.1.0 — Phase 1

- Một màn 3D Đêm 1 – Đảo Bến, Mây đội nón lá, di chuyển/nhảy, camera xoay, đom đóm, 5 đèn, Bóng Mực, tỏa sáng, HUD, minimap, kết thúc và chơi lại.
- Simulation chung 60 Hz, Test Contract v1.0, seeded world và CLI JSONL.
- 32 unit/CLI tests, replay tất định, lượt chơi tự động thế giới mặc định tới thắng, browser QA và ảnh thật.
- Harness, CI Ubuntu, ghi chú giả định/evaluation, CREDITS/LICENSE; giữ tài liệu lab gốc.
- Chưa tạo tag hoặc phát hành từ xa; Phase 2–4 chờ ticket.
