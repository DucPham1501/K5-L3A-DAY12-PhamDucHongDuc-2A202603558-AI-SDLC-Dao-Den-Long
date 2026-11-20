# Phase 1 — yêu cầu, giả định và nhật ký

## Nguồn và nghiệm thu

PRD-0 và Test Contract v1.0 do người dùng cung cấp trong hội thoại. Đã đọc sáu tài liệu lab gốc; README gốc giữ ở `LAB.md`. Chưa có Ticket Phase 2–4.

| Yêu cầu | Kiểm chứng |
|---|---|
| Đảo tròn, năm đèn, Mây/nón lá, camera, HUD | Core giữ đủ L1…L5; QA hình ảnh riêng |
| Di chuyển/nhảy | Unit tốc độ, camera yaw, chuẩn hóa chéo, cạnh nhấn |
| Nhặt và nạp đèn | Unit biên XZ, sức chứa, nạp từng phần, overflow, thưởng một lần |
| Shade đuổi và sinh | Unit tốc độ và event tại tick 900 |
| Pulse | Unit chi phí, bán kính, push, choáng, cooldown, held input |
| Sát thương, safe zone | Unit nhiều shade, bất tử, vùng an toàn gồm biên |
| Thắng/thua, điểm | Unit và CLI thực, JSONL won/lost |
| Contract | Subprocess thật: tick 0, frames, rounding, exit 2, end |
| Tất định | Hai replay CLI so byte-for-byte |
| Chơi lại | Kiểm tra trình duyệt riêng |
| Đa nền tảng | Node/dist tĩnh; local Windows; Ubuntu CI được cấu hình, chưa tự nhận đã chạy |

## Giả định và thiết kế

- Đảo bán kính 30 m, Mây 6 m/s, sức chứa 20; năm đèn ở vòng tròn bán kính 20 m. Contract là nguồn tuning duy nhất.
- Đèn cần 10; E nạp phần có thể vào đèn chưa sáng gần nhất, hòa khoảng cách chọn ID tăng dần. Giữ lượng dư.
- Chỉ đèn sáng tạo safe zone 4 m; shade chiếu ra ngoài safe circle, Mây trong vùng không bị đánh. Dùng khoảng cách XZ gồm biên.
- Pulse: tốn 3, bán kính 5 m, choáng 2 s, đẩy 3 m, hồi 1 s. Thiếu tài nguyên/còn hồi không event, không tiêu tài nguyên. Có thể làm choáng lại shade đang choáng và cộng 20 điểm mỗi shade trúng.
- Trùng vị trí thì đẩy shade theo +X. Shade giữ Y scenario, mọi phạm vi dùng XZ. Shade đang choáng không di chuyển/gây sát thương.
- 3 lửa, invuln 1,5 s; hit_drop_ratio=0; shade 2,2 m/s, tầm chạm 0,8 m.
- Nhảy: vận tốc đầu 6 m/s, trọng lực 18 m/s²; không dash. Nhảy không tránh tương tác/va chạm XZ.
- Không rơi: chặn tại r=30. Scenario ngoài đảo giữ nguyên lúc setup, chỉ chặn bước đi xa hơn và cho phép đi vào lại.
- 300 giây; scenario.time_left_s nếu có là thời gian ban đầu, trừ steps/60. Snapshot làm tròn 3 số, logic giữ full precision.
- Điểm 10/mote, 100/đèn, 20/shade trúng pulse; thắng cộng floor(time_left_s)+50×flames. Thua không thưởng kết thúc. Setup không điểm/event.
- Setup lit:true hoặc deposited=cost chuẩn hóa thành đèn sáng đủ nạp. Scenario đã hoàn tất vẫn có snapshot 0 playing, bước đầu giải quyết kết thúc.
- Thứ tự bước: tăng tick/thời gian → giải quyết scenario đã kết thúc → đi/nhảy → nhặt → nạp → pulse → shade/va chạm → chốt kết thúc → spawn nếu còn playing. Ưu tiên chết > thắng > bình minh. Đèn cuối thắp lúc hết giờ vẫn thắng nếu còn lửa.
- Snapshot tick 0, mỗi snapshot-every, và snapshot cuối nếu lệch chu kỳ; cuối cùng end. --ticks 0 không chạy bước.
- Motes/shades scenario thay danh sách ban đầu. random_*:false ngăn thêm mới. Khi true, bù 1 mote/120 tick dưới 105; shade thêm/900 tick, tối đa 8. Mặc định 105 mote, 3 shade; setup không event.
- ID không trùng và deterministic. Trường sai tên, số không hữu hạn, frames trùng/giảm, move ngoài [-1,1] đều lỗi dữ liệu mã 2. dash boolean hợp lệ nhưng không có tác dụng.

## Harness và evaluation

AGENTS.md giữ lệnh và quy tắc. scripts/verify.mjs thoát ngay khi kiểm tra đỏ; CI chạy cùng script và upload bằng chứng cả khi lỗi. Cần người review độc lập chơi và đọc diff; không giả lập reviewer trong nhật ký.

- Công cụ: Codex. Viết core/CLI trước renderer; có unit/integration tests và verification.
- Chọn Node ES modules + Three.js; headless không import renderer, DOM, GPU hoặc đồng hồ thực. Dùng test runner có sẵn, pin dependency.
- npm ban đầu bị chặn cache, đã xin quyền và cài thành công. UI native thiếu pipe; không coi lỗi công cụ là bằng chứng game đạt.
- 32 tests đầu tiên đạt; chưa dùng kết quả này để khẳng định đồ họa/FPS.
- Token ước tính 20.000–35.000 gồm ngữ cảnh/triển khai, **không có telemetry billing**, không phải số đo chính xác. Chi phí tiền chưa xác định. Tiết kiệm bằng simulation chung, procedural geometry, test runner sẵn có và giới hạn một màn.
- Lỗi AI phát hiện khi chạy QA: truyền URL vào process.chdir thay vì đường dẫn chuỗi; unit core không bắt được lỗi orchestration. Sửa bằng fileURLToPath ở hai script và kiểm tra trực tiếp lệnh verify/browser. Bài học: phải chạy lệnh bàn giao thật, không suy ra từ unit tests. Khi phase mới thay luật phải cập nhật test/giả định kèm lý do.

## Giới hạn

Bằng chứng tự sinh ở docs/proof/phase-1, có hash source. Đã chạy Edge headless qua Playwright: WebGL khởi tạo, phím di chuyển/nhảy, pause/resume, help và ảnh 1440×960/700×850; không lỗi page/request trong lượt QA. Đã mở và xem ảnh gameplay thật. Nút chơi lại được kiểm tra qua fixture UI hết giờ 0,1 giây (intercept contract trong test, không sửa tuning sản phẩm). Dùng SwiftShader software nên không coi là benchmark FPS laptop. Xem browser-qa.json và PNG.

Bot điều khiển simulation từ thế giới mặc định seed 12, không override scenario/mutate state: thắng sau 1.305 tick, điểm 1.548. Chuỗi input được chạy lại qua CLI để kiểm chứng; đây là kiểm tra chơi tự động, không thay thế người review độc lập.

Chưa xác nhận reviewer độc lập, CI Linux từ xa, repo public, tag phase-1. Chưa làm Release/video Phase 4. Deadline thực tế chưa được cung cấp, không giả mạo thời gian commit/tag.
