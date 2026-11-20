# Retro: Đảo Đèn Lồng, AI SDLC Lab Day 12

Phạm Đức Hồng Đức · 2A202603558 · bốn phase, từ Contract v1.0 tới v1.3 / Release v1.0.0.

## 1. Tổng hợp Evaluation bốn phase

| Phase | Kết quả chính | Bằng chứng | Điều chưa đạt / ghi trung thực |
|---|---|---|---|
| 1 · v1.0 | Một màn 3D Đêm 1, simulation 60 Hz dùng chung cho browser và CLI, JSONL headless, 32 test | tag `phase-1`, `docs/proof/phase-1` | Lượt thắng là lượt tự động trên thế giới mặc định, chưa có người chơi độc lập |
| 2 · v1.1 | Ba Đêm, lướt, terrain nhiều tầng, rơi/hồi sinh, Gió Lạc, Bùa Gió, gió Đêm 3, pause đúng tick; 46 test, benchmark full-night | tag `phase-2`, `docs/proof/phase-2` | Fixture bình minh không thay cho việc chơi thắng thật |
| 3 · v1.2 | Đèn có dầu (đơn vị nguyên 1/60), drain, thắp lại, thắng tại bình minh, sức chứa tăng dần, chế độ màu dễ phân biệt; 70 test | tag `phase-3`, `docs/proof/phase-3`, ADR-003 | 3 test cũ phải đổi kỳ vọng vì luật mới (có ghi lý do, không skip) |
| 4 · v1.3 | Bench chuẩn, soak, leaderboard trên đĩa và CLI export, đổi phím, phụ đề và mũi tên, giảm chuyển động, chữ ≥18 px/×1,25, gói release; 81 test | `docs/proof/phase-4`, `bench.json`, `soak.json` | Chưa đo trên máy chấm; FPS laptop dao động lớn; video phải tự quay |

Xuyên suốt cả bốn phase: không bỏ test để cho qua, không sửa tay proof, mỗi phase có thư mục proof riêng và hash mã nguồn, scenario và input sai luôn thoát mã 2.

## 2. Điều gì hiệu quả khi làm với AI

- **Contract là nguồn sự thật duy nhất.** `game.contract.json` cùng một simulation trong `src/core/` dùng cho cả browser và CLI giúp AI không viết hai phiên bản luật lệch nhau. Mỗi ticket mới chỉ cần sửa một chỗ.
- **AGENTS.md ngắn, viết dạng quy tắc kiểm chứng được** (thứ tự burn → out → interact, tick 0 không event, mã thoát 2…). Đây là harness có tác dụng nhất: khi đọc lại ở đầu mỗi phiên, AI giữ được các bất biến mà không cần đọc lại toàn bộ ticket cũ.
- **Script `verify` sinh proof kèm hash.** Mọi khẳng định "đạt" đều có lệnh chạy lại được. AI không thể tự nhận đạt nếu verify đỏ.
- **Browser QA bằng Playwright** bắt được lỗi giao diện mà unit test không thấy: phím nhấn nhanh lọt giữa hai tick (Phase 3), mũi tên đè lên HUD và class HUD cập nhật trễ 100 ms (Phase 4).
- **Đo trước rồi mới quyết định**, đặc biệt ở phần soak và vsync của Phase 4: chạy thử nhiều cấu hình, xem số thật, rồi ghi cả phương án bị loại.

## 3. Điều không hiệu quả

- Mã kiểu minify (dòng rất dài) giúp file ngắn nhưng khó review, và mỗi lần AI đọc lại tốn nhiều token. Nếu làm lại, tôi sẽ giữ format bình thường và chạy formatter.
- Phase 4 bị cắt ngang giữa hai công cụ AI (Codex → Claude Code). Tài liệu tiến độ viết trung thực nên bàn giao được, nhưng vẫn phải đọc lại toàn bộ repo để nắm ngữ cảnh.
- Số đo hiệu năng trên laptop dao động ±30%, nên một lần chạy không đủ để kết luận. Cần chạy nhiều lần và ghi rõ máy, chế độ nguồn.

## 4. Những lần AI sai và cách phát hiện

1. **Camera benchmark quay sai chiều** (z = +30·sin θ là cùng chiều kim đồng hồ khi nhìn từ trên xuống). Phát hiện khi review lại hệ trục tay phải của Three.js so với đề.
2. **Bộ đo RAM chỉ cộng tiến trình gốc của trình duyệt** (160 MB thay vì khoảng 680 MB), do khóa hashtable PowerShell kiểu UInt32 và Int32 không khớp. Phát hiện bằng cách liệt kê cây tiến trình thật để đối chiếu.
3. **Tưởng cờ tắt vsync không có tác dụng** vì FPS bench gần như không đổi. Kiểm chứng trên trang WebGL tối giản thì thấy 165 → hơn 1.500 fps: cờ có tác dụng, cảnh bench bị giới hạn bởi GPU/CPU.
4. **Soak vượt ngưỡng 1,205 ở lần chốt**, dù các lần trước đạt. Không chạy lại cho tới khi đạt, mà đo heap theo từng Đêm: heap JS phẳng, RSS chỉ tăng một lần do JIT. Chọn `--no-opt` và ghi đầy đủ số đo khi không dùng cờ.
5. Các phase trước: queue phím nhấn ngắn (Phase 3, do QA phát hiện), và 3 kỳ vọng test cũ không còn đúng với luật mới (do test đỏ phát hiện, đã ghi lý do).

## 5. Harness nào giúp nhiều nhất

1. **AGENTS.md**: các bất biến ngắn gọn cho simulation và quy tắc proof.
2. **`npm run verify`** cùng thư mục proof theo phase và hash mã nguồn: bằng chứng chạy lại được, không phụ thuộc lời AI nói.
3. **`npm run test:browser`**: kiểm tra UI thật (cỡ chữ đo từng text node, luồng leaderboard từ UI tới đĩa tới CLI).
4. GitHub Actions chạy verify trên Ubuntu mỗi lần push.

Không dùng skill, hook hay MCP riêng. Mọi điều chỉnh đều nằm trong AGENTS.md và các script trong repo.

## 6. Token và chi phí ước tính

| Phase | Công cụ | Token ước tính |
|---|---|---|
| 1 | Codex | 20.000–35.000 |
| 2 | Codex | 30.000–60.000 |
| 3 | Codex | 20.000–40.000 |
| 4 (phần đầu) | Codex | khoảng 30.000–50.000 (không ghi lại chính xác) |
| 4 (hoàn thiện) | Claude Code / Claude Opus | khoảng 350.000–500.000 input (phần lớn cache) + 60.000–90.000 output |

Không có telemetry billing cho từng phiên, nên đây là ước lượng chứ không phải số đo. Chi phí tiền chưa xác định được (gói thuê bao). Cách tiết kiệm token: dùng chung một engine và map cho cả bốn phase; sửa bằng phép thay thế chính xác thay vì ghi lại cả file; gộp nhiều lệnh vào một lần chạy; không dùng subagent; đọc tài liệu tiến độ trước khi đọc mã.

## 7. Nếu làm lại

- Viết benchmark và soak ngay từ Phase 1, để có số liệu theo thời gian.
- Giữ mã ở format dễ đọc và tách `web/main.mjs` thành các module UI (HUD, settings, leaderboard).
- Gộp material của Bóng Mực (dùng instancing) để bench nhẹ hơn trên máy yếu.
- Nhờ một người chơi thật thử từ Phase 2, thay vì chỉ dựa vào fixture.
- Ghi token mỗi phiên ngay khi kết thúc phiên, thay vì ước lượng lại sau.
