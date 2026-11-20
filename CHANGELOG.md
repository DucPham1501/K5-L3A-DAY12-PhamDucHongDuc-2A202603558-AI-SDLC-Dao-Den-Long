# Changelog

## 1.0.0 — Phase 4: Bình minh, phát hành

### Contract v1.3

- `contract_version` 1.2 → 1.3; thêm `bench_cmd` (`node scripts/bench.mjs`) và `soak_cmd` (`node --expose-gc --max-semi-space-size=1 --no-opt scripts/soak.mjs`).
- `run_cmd` đổi từ `npm start` sang lệnh tương đương `node scripts/serve.mjs`, để `--export-leaderboard out.json` được chuyển thẳng vào script (npm sẽ nuốt cờ lạ nếu thiếu `--`). `npm start` vẫn chạy được.
- Luật chơi, tuning, headless, JSONL và mã thoát của v1.0–v1.2 giữ nguyên. Không có breaking change cho gameplay.

### Mới

- Benchmark chuẩn: cửa sổ 1280×720, tắt vsync, cảnh Đêm 1 với 200 Bóng Mực wander, 100 đom đóm, L1–L3 fuel 100, camera bay vòng 30 m/15 s ngược chiều kim đồng hồ. Đo avg_fps, p1_low_fps, p95, load_ms từ lúc tiến trình bắt đầu, và RAM đỉnh của cây tiến trình trình duyệt.
- Soak 10 Đêm trong một tiến trình với input ngẫu nhiên theo seed; đo RSS lúc đầu và lúc cuối.
- Bảng xếp hạng cục bộ lưu trên đĩa: nhập tên sau Bình Minh hoặc sau khi thua, top 10, có màn hình riêng từ menu, CLI `--export-leaderboard`, nhận tên tiếng Việt có dấu.
- Accessibility: đổi phím cho 9 hành động (báo trùng phím, khôi phục mặc định, có lưu); phụ đề và mũi tên mép màn hình cho Bóng Mực mới; cảnh báo gió, 10 giây cuối và đèn dưới 30 dầu; chế độ giảm chuyển động; chữ UI tối thiểu 18 px và tùy chọn chữ lớn ×1,25.
- Rung camera và chớp màn hình khi trúng đòn (hiệu ứng thuần hình ảnh, tắt bằng Giảm chuyển động).
- Đóng gói release `dao-den-long-v1.0.0.zip` (`npm run package`), chỉ cần Node để chạy.
- 11 test mới (tổng 81). `verify` và browser QA giờ ghi vào `docs/proof/phase-4`; proof Phase 1–3 giữ nguyên.

### Thay đổi khác

- Phím tạm dừng mặc định chỉ còn Esc (trước đây có cả P), vì mọi hành động đều đổi được phím; P vẫn gán lại được.
- HUD được bố trí lại cho chữ ≥18 px: bỏ chú giải minimap và các dòng chú thích nhỏ.

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
