# Bàn giao Phase 4: Bình minh, phát hành v1.0.0

**Phạm Đức Hồng Đức · 2A202603558 · Contract v1.3 · Tag `phase-4` · Release `v1.0.0`.** Các tag `phase-1..3` giữ nguyên.

- [x] Contract v1.3: `bench_cmd`, `soak_cmd`; yêu cầu v1.0–v1.2 giữ nguyên (81 test, scenario cũ, replay tất định).
- [x] Benchmark chuẩn: cửa sổ 1280×720, tắt vsync, 200 Bóng Mực wander, 100 đom đóm, L1–L3 fuel 100, camera bay vòng theo đề. Kết quả tự đo trong [bench.json](../bench.json).
- [x] Soak 10 Đêm trong một tiến trình: 0 crash, RAM ×1,10. Kết quả trong [soak.json](../soak.json).
- [x] Leaderboard: nhập tên sau Bình Minh hoặc khi thua, top 10, lưu đĩa, màn hình từ menu, `--export-leaderboard`, nhận tên tiếng Việt.
- [x] Accessibility: đổi 9 phím (báo trùng, khôi phục mặc định, có lưu); phụ đề và mũi tên Bóng Mực, gió, 10 s cuối, dầu <30; giảm chuyển động; chữ ≥18 px và ×1,25.
- [x] README (3 lệnh, ảnh, yêu cầu hệ thống, điều khiển, test, headless, bench, soak); CHANGELOG có 4 phase; CREDITS; LICENSE.
- [x] Bằng chứng: [docs/notes/phase-4.md](notes/phase-4.md), [verification.json](proof/phase-4/verification.json), [browser-qa.json](proof/phase-4/browser-qa.json) và ảnh chụp trong `docs/proof/phase-4/`.
- [x] Retro: [docs/notes/retro.md](notes/retro.md).
- [x] Gói release `dao-den-long-v1.0.0.zip` (`npm run package`), đã thử chạy từ thư mục giải nén.
- [x] Video người làm bài cung cấp: [demo.mp4](demo/demo.mp4), 3 phút 41,5 giây; có chơi ba Đêm, kết quả verify, soak, cảnh benchmark và lịch sử Git/ghi chép. Bản gốc `game_demo.mp4` trên 100 MB được giữ local; bản nén đặt đúng đường dẫn trong repo, không cắt nội dung.
- [ ] Đo trên máy chấm: giảng viên thực hiện. Số trong repo chỉ để tham khảo.

Không tự nhận đã đạt test ẩn hay CI từ xa khi chưa xem kết quả trên GitHub.
