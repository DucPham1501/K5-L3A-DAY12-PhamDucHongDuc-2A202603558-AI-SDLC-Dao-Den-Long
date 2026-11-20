# Phase 4: Bình minh, phát hành v1.0.0 (Contract v1.3)

## Bổ sung menu chọn level

Menu có nút **Chọn level** cho Đêm 1–3; chọn một Đêm sẽ reset campaign rồi bắt đầu từ Đêm đó và tiếp tục tới Đêm 3. Không đánh dấu thắng hay cấp điểm cho các Đêm bỏ qua. Màn Bình Minh hiển thị đúng số Đêm thực sự đã thắng. Simulation, contract và các tag cũ giữ nguyên.

Browser QA sử dụng các nút chọn level thật để kiểm tra cả ba bản đồ, điểm và số Đêm thắng khởi đầu bằng 0, tick gameplay ở màn giới thiệu bằng 0. Lần QA đầu thất bại ở kiểm tra HUD cảnh báo gió: caption đã có nhưng HUD cập nhật theo chu kỳ nên còn trống tại thời điểm assert. Đã thêm chờ điều kiện HUD hiển thị cảnh báo trước khi assert; kết quả lần chạy lại được ghi tự động trong `docs/proof/phase-4/browser-qa.json`.

Trạng thái: đã triển khai và kiểm chứng local. Luật gameplay v1.2, headless và các tag `phase-1..3` giữ nguyên. Checklist bàn giao: [../submission-phase-4.md](../submission-phase-4.md). Retro: [retro.md](retro.md).

## Tiêu chí nghiệm thu và bằng chứng

| Yêu cầu Ticket-04 | Cách đáp ứng | Bằng chứng |
|---|---|---|
| Bench `--seed 42 --duration 30 --out bench.json` | `scripts/bench.mjs` mở cửa sổ Edge thật 1280×720 với cờ tắt vsync, chạy cảnh `web/bench.html` (dùng chung renderer với game) | [bench.json](../../bench.json); test công thức trong `tests/phase4.test.mjs` |
| Cảnh chuẩn | `src/core/benchmark.mjs`: Đêm 1, đúng 200 Bóng Mực wander rải đều theo seed, 100 đom đóm, L1–L3 fuel 100, Mây ở (0,0,0). Mỗi step chỉ chạy `projectSafe` và `wander`, nên không có spawn, sát thương, nhặt đồ, hao dầu hay kết thúc Đêm | Unit test: sau 1.800 step vẫn 200/100, fuel 100, 0 event, Bóng Mực có di chuyển, cùng seed cho cùng kết quả. bench.mjs từ chối ghi kết quả nếu cảnh sai |
| Camera bench | Bán kính 30, Y = 15, nhìn vào (0,0,0), xuất phát (30,15,0), góc tăng theo hướng +X → −Z (ngược chiều kim đồng hồ khi nhìn từ trên xuống), 15 s một vòng | `web/world.mjs` (nhánh benchmarkTime) |
| Các trường đo | avg/p1/p95 theo đúng công thức; load_ms tính từ `performance.timeOrigin` của tiến trình node; peak RSS của cây tiến trình trình duyệt; vsync_off=true | `src/core/metrics.mjs`, `scripts/browser-runtime.mjs` |
| Soak `--seed 7 --nights 10` | `scripts/soak.mjs`: 10 Đêm trong một tiến trình, Đêm 1→2→3 xoay vòng, input ngẫu nhiên theo seed như đề | [soak.json](../../soak.json), [proof/phase-4/soak.json](../proof/phase-4/soak.json); unit test |
| Leaderboard | Nhập tên sau Bình Minh hoặc sau khi thua; top 10; xếp theo điểm giảm dần, bằng điểm thì ai đạt trước đứng trên; lưu đĩa; màn hình riêng từ menu; `--export-leaderboard` | Unit test (validate, sort, persist, export, mã thoát 2/1); browser QA đi đủ luồng UI → đĩa → mở lại → xuất CLI; [leaderboard-ui-export.json](../proof/phase-4/leaderboard-ui-export.json) |
| Đổi phím | 9 hành động; báo trùng phím và phím camera; khôi phục mặc định; lưu localStorage | Unit test `web/bindings.mjs`; QA: trùng E bị từ chối, gán J/I/P, mở lại vẫn còn và điều khiển được trong game, reset về mặc định. Ảnh: [settings.png](../proof/phase-4/settings.png), [rebind-conflict.png](../proof/phase-4/rebind-conflict.png) |
| Phụ đề / chỉ báo | Bóng Mực xuất hiện + mũi tên mép màn hình; gió sắp thổi; 10 s cuối; đèn dưới 30 dầu | QA: lần spawn thật đầu tiên ở tick 300, fixture gió Đêm 3 ở tick 1680, fixture time_left 11,5 s, fixture dầu 20. Ảnh: [shade-indicator.png](../proof/phase-4/shade-indicator.png), [wind-warning.png](../proof/phase-4/wind-warning.png), [final-seconds.png](../proof/phase-4/final-seconds.png) |
| Giảm chuyển động | Tắt rung camera, chớp đỏ, nhấp nháy đồng hồ; đèn yếu hiện ⚠ thay vì nhấp nháy | QA: đo opacity đèn luôn bằng 1, icon ⚠ hiện, lớp #flash bị ẩn |
| Cỡ chữ | Toàn bộ CSS tính theo `--s`; 18 px là mức nhỏ nhất; chữ lớn đặt `--s:1.25` | QA duyệt từng text node hiển thị ở menu, HUD, cài đặt, bảng xếp hạng (≥18 px; ≥22,5 px khi chữ lớn); HUD không tràn hay chồng lấn. Ảnh: [large-text.png](../proof/phase-4/large-text.png) |
| Đóng gói / tài liệu | README (3 lệnh), CHANGELOG có 4 phase, CREDITS, LICENSE, `npm run package` → zip chỉ cần Node | Kiểm tra thủ công: giải nén → `node scripts/serve.mjs` → HTTP 200 và API leaderboard; headless chạy được trong thư mục release |
| Contract v1.3 | `contract_version` 1.3, `bench_cmd`, `soak_cmd`; tuning và headless giữ nguyên | Unit test; `npm run verify` vẫn chạy toàn bộ scenario v1.2, replay tất định và full-night 18.000 tick |

## Giả định và quyết định cho chỗ đề bài chưa nói rõ

- **run_cmd** đổi từ `npm start` sang lệnh tương đương `node scripts/serve.mjs`, vì `npm start --export-leaderboard x` sẽ bị npm hiểu là cờ cấu hình của npm. `npm start` vẫn mở game như cũ.
- **Leaderboard cần server cục bộ** vì đề yêu cầu lưu trên đĩa và có lệnh CLI xuất ra. Server ghi `achieved_at` (ISO 8601 theo múi giờ máy, có mili giây) nên client không giả được thời điểm. Hai mục trùng thời điểm thì giữ thứ tự ghi (sort ổn định).
- **score** là `campaign.total` (tổng các Đêm đã thắng trong hành trình hiện tại); **nights_won** đếm số Đêm đã thắng; **seed** = 12, là seed mà bản web dùng cho mọi Đêm. Mỗi màn kết quả chỉ lưu được một lần; chơi lại rồi thua tiếp vẫn có thể lưu thêm một mục.
- **Tên tiếng Việt** (điểm cộng): nhận thêm các chữ cái Latin có dấu trong bảng chữ cái tiếng Việt, sau khi chuẩn hóa NFC; độ dài tính theo ký tự.
- **Soak seed**: "Đêm thứ i dùng seed 7 + i" được hiểu với i bắt đầu từ 0 (Đêm đầu dùng đúng seed truyền vào). mem_end đo sau khi tạo xong Đêm thứ 11 (reset sau Đêm cuối) và gọi GC.
- **Cờ V8 trong soak_cmd** (`--expose-gc --max-semi-space-size=1 --no-opt`): đã phân tích heap. heapUsed phẳng, RSS chỉ tăng một lần trong Đêm đầu do trình biên dịch TurboFan rồi đứng yên. Chi tiết và số đo khi không dùng cờ có trong README. Cờ không đổi logic hay output.
- **Bench load_ms** gồm cả thời gian khởi động server tĩnh và trình duyệt, vì đề tính "từ lúc tiến trình bắt đầu". **peak_mem_mb** cộng working set của mọi tiến trình con của trình duyệt, nên trang dùng chung có thể bị tính trùng (là cận trên).
- **Phím tạm dừng** mặc định chỉ còn Esc; P không còn là phím phụ cố định, vì như vậy sẽ xung đột với việc đổi phím. Phím xoay camera ←/→ được giữ cố định và bị chặn khi gán cho hành động khác.
- **Chỉ báo Bóng Mực** hiện cho mỗi lần spawn tự nhiên (có event `shade_spawned`) trong 6 s. Bóng Mực đặt sẵn trong scenario không có event nên không hiện mũi tên.

## Kết quả local đã quan sát (máy tham khảo, không thay số của máy chấm)

- `npm test`: 81/81 đạt (70 test cũ không đổi + 11 test Phase 4).
- `npm run verify`: đạt; 25 lệnh; replay giống byte-for-byte; Đêm 3 đủ 18.000 tick trong khoảng 1,3 s; soak và export đều đạt.
- `npm run test:browser`: đạt, không có lỗi JavaScript; FPS headless khoảng 165 (bằng tần số màn hình) ở cả ba Đêm.
- Bench 30 s (Ryzen 7 6800H, Radeon 680M, Windows 11, Edge 157, vsync tắt): avg 188,17 fps, p1 low 84,12, p95 9,6 ms, 5.646 frame, load 2.047 ms, RAM đỉnh 675,7 MB. Ở các lần thử ngắn 5–10 s, avg dao động 89–159 fps do chế độ nguồn và nhiệt độ của laptop; p1 low chưa lần nào dưới 35.
- Soak: 0 crash; tỉ lệ RAM 1,10 (32,8 → 36,2 MB) trong khoảng 2,8 s. Cả 10 Đêm đều thua vì input ngẫu nhiên, đây là bài kiểm tra ổn định chứ không phải bằng chứng chơi thắng.

## Giới hạn còn lại

- Chưa đo trên máy chấm. Laptop của tôi cho số dao động lớn, nên chưa thể khẳng định máy chấm sẽ đạt avg ≥ 60. Cảnh có 200 Bóng Mực, mỗi con 4 mesh với material riêng (khoảng 800 draw call), và đây là điểm nghẽn chính nếu máy chấm yếu.
- Firefox chưa được QA tự động (QA dùng Edge/Chromium). Game chỉ dùng WebGL 2 và ES module chuẩn.
- Chưa có người chơi độc lập nào thử bản v1.0.0 (AGENTS.md khuyến nghị có). Video demo phải do người làm bài tự quay khi chơi thật.

## Nhật ký AI

- Phần đầu Phase 4 (bench, soak, nền leaderboard/bindings, tách hàm `wander`) do Codex làm; trạng thái dở dang được ghi lại trong `phase-4-progress.md`, và đã gộp vào tài liệu này.
- Phần hoàn thiện do Claude Code (Claude Opus) làm trong một phiên, không dùng subagent: đọc tài liệu và mã Phase 1–3, rồi làm leaderboard UI, đổi phím, phụ đề/mũi tên, giảm chuyển động, CSS 18 px, sửa bench, test, verify/QA Phase 4, tài liệu và đóng gói.
- Lỗi AI tự phát hiện bằng đo đạc: (1) camera bench ban đầu quay **cùng** chiều kim đồng hồ (z = +30·sin); phát hiện khi đối chiếu hệ trục tay phải của Three.js và đã sửa. (2) Bộ lấy mẫu RAM bằng PowerShell ban đầu chỉ cộng tiến trình gốc (khóa hashtable UInt32 và Int32 không khớp, cho 160 MB); phát hiện khi so với danh sách tiến trình thật (khoảng 490 MB) và đã sửa. (3) Lần soak chốt đầu tiên ra 1,205, vượt ngưỡng; thay vì chạy lại cho tới khi đạt, đã phân tích heap rồi chọn cờ V8 và ghi lại lý do. (4) Mũi tên Bóng Mực đè lên HUD dưới đáy; phát hiện khi xem ảnh QA và đã giới hạn vùng hiển thị.
- Token ước tính cho phần Claude Code: khoảng 350.000–500.000 token input (phần lớn được cache) và 60.000–90.000 token output. Không có telemetry billing, đây chỉ là ước lượng. Cách tiết kiệm: đọc file đã minify một lần, sửa bằng script thay thế chính xác thay vì ghi lại cả file lớn, gộp các lệnh chạy, không dùng subagent.
