# Bàn giao Phase 2 — Ba hòn đảo

**Học viên:** Phạm Đức Hồng Đức · **MSSV:** 2A202603558 · **Contract:** 1.1 · **Tag bàn giao:** phase-2.

Commit và tag được tạo local; người dùng tự push nhánh main và tag. Không thay đổi tag phase-1. Không tạo Release v1.0.0 hoặc video cuối bài ở mốc Phase 2.

## Checklist nội dung

- [x] Mã nguồn ba Đêm và các cơ chế Ticket-02; game.contract.json khai tuning chuẩn và lệnh chạy.
- [x] README có cài/chạy trong 3 lệnh, điều khiển, điểm chuẩn, lệnh headless/test và liên kết bằng chứng.
- [x] Spec có acceptance criteria từng mục Phần 3, giả định và danh sách luật/test bị thay thế từ Phase 1.
- [x] Harness AGENTS.md, verification script, browser QA và GitHub Actions cập nhật cho Phase 2.
- [x] 46 unit/CLI tests đạt; scenario mới và JSONL thật có thể tái chạy.
- [x] Replay cùng seed/input giống byte-for-byte; hash source khớp mã bàn giao.
- [x] Benchmark đủ 21.600 tick trong ≤30 giây; cấu hình và thời gian nằm trong báo cáo.
- [x] Browser QA ba Đêm ở 1280×720, đạt ≥30 FPS trên máy đo; có ảnh và thông tin GPU.
- [x] Ghi chép dùng AI, ước tính token, lỗi đã sửa và đánh giá Phase 2.
- [x] CREDITS/LICENSE được giữ; không đưa node_modules, dist hoặc file bí mật vào commit.

## Bản đồ bằng chứng

| Nội dung | File / lệnh |
|---|---|
| Đặc tả, giả định, regression, evaluation | [notes/phase-2.md](notes/phase-2.md) |
| Test/build, replay, hash và benchmark | [proof/phase-2/verification.json](proof/phase-2/verification.json), `npm run verify` |
| Lướt và pause | tests/scenarios/phase-2/dash*.json → proof/phase-2/dash.jsonl |
| Pulse 3D/push | tests/scenarios/phase-2/pulse*.json → proof/phase-2/pulse.jsonl |
| Rơi/hồi sinh | tests/scenarios/phase-2/fall.json → proof/phase-2/fall.jsonl |
| Cầu, bục, tầng/dốc/vách | Unit tests và launch.json → proof/phase-2/launch.jsonl |
| Bùa Gió | charm.json → proof/phase-2/charm.jsonl |
| Gió Lạc cướp/trả đồ | drifter.json, drifter-return.json → output tương ứng |
| Gió Đêm 3 | wind.json → proof/phase-2/wind.jsonl |
| Thắng/kết thúc headless cả ba Đêm | proof/phase-2/won-night-1.jsonl, won-night-2.jsonl, won-night-3.jsonl |
| Menu, giới thiệu, pause, retry, cài đặt, chuỗi Đêm/Bình Minh | [proof/phase-2/browser-qa.json](proof/phase-2/browser-qa.json) |
| Hình ảnh | proof/phase-2/menu.png, night-1.png, night-2.png, night-3.png, dawn-fixture.png |

Đường dẫn không có tiền tố docs/ trong bảng được hiểu tương đối từ gốc repo nếu bắt đầu bằng tests/, và từ docs/ nếu bắt đầu bằng proof/.

## Giới hạn kiểm chứng

Các fixture thắng đặt sẵn một số đèn sáng để kiểm tra nạp đèn cuối, điểm và chuyển Đêm; không được hiểu là lượt chơi độc lập thắng toàn bộ bản đồ thường. Chưa có người review độc lập hoàn thành cả ba Đêm hoặc đánh giá nghe âm thanh. FPS là mẫu khoảng 2,5 giây/Đêm trên GPU AMD của máy hiện tại; không bảo đảm cùng FPS trên mọi laptop. CI Ubuntu sẽ chạy khi push, chưa tự nhận kết quả run từ xa hoặc test ẩn.

## Push và hoàn tất nộp

Sau khi kiểm tra commit/tag local:

```bash
git push --atomic origin main refs/tags/phase-2
```

Sau đó kiểm tra tag phase-2 trên GitHub, repo public và kết quả Actions. Nộp link repo theo hướng dẫn lớp. Thời hạn tính theo lịch lab thực tế; không giả mạo thời gian commit/tag.
