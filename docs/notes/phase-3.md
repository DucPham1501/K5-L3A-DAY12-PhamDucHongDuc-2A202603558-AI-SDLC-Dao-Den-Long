# Phase 3 — Đèn cạn dầu / Contract v1.2

Trạng thái: đã triển khai và kiểm chứng local Contract v1.2, chốt bằng commit và tag phase-3; người dùng tự push. Mã và evidence Phase 1–2 giữ nguyên ở tag tương ứng. Checklist: [../submission-phase-3.md](../submission-phase-3.md).

## Quyết định thiết kế

[ADR-003](../decisions/ADR-003-lantern-fuel-and-dawn.md) mô tả chuyển từ lit vĩnh viễn sang fuel/ever_lit/relit_count, thứ tự burn→out→interaction→safe zone→pulse→enemy→dawn, độ chính xác 1/60 và luật thắng mới. Danh sách breaking changes trong CHANGELOG.md.

## Tiêu chí nghiệm thu và bằng chứng

| Yêu cầu | Kiểm chứng |
|---|---|
| 100 dầu, hao đúng 1/s, không sai số tích lũy | fuel.test: 5999 tick còn 1 đơn vị, 6000 tick tắt; fuel-out.jsonl |
| Châm theo ceil, giữ dư, không chọn đèn đầy | Unit trực tiếp và refuel.jsonl; có test hao trước tương tác khi snapshot làm tròn 100 |
| Thắp lại 5, nhớ ever_lit/relit_count | Test nạp nhiều lần, score/event, relight.jsonl |
| Bóng wander tìm yếu, chase không đổi mục tiêu | Test nearest/tie-ID và chase |
| Drain 5/s, nhiều bóng cộng dồn, log mỗi 60 bước hút | Unit và drain.jsonl |
| Drain→chase/stunned/wander; khôi phục safe zone trước hit | Test 6 m, ra khỏi target, pulse 15 điểm, refuel/ejection |
| Không thắng sớm, ngưỡng 3/5–4/6–5/7 | Test all-lit còn playing; no-early-win.jsonl; won-night-N.jsonl |
| Tick cuối: dầu tắt trước xét, được relight/refuel, no_flames ưu tiên | Test cùng tick out→relight→dawn, lamp expiring/damage priority |
| Capacity tăng theo số lần thắp, tối đa 20, setup/refuel không tăng | Unit scenario.successful_lights, collect động, cap 20, relight output capacity12 |
| Điểm toàn bộ mới và floor fuel chính xác | Unit first/relight/refuel/pulse/drain/dawn; game_over/end score |
| Thanh dầu/nhấp nháy/hình dạng đèn tắt | Browser fixture 20 s: đo opacity hai pha, body scale0,8/1, tear, bar, ảnh trước/sau |
| Màu dễ phân biệt và lưu cài đặt | Browser toggle/reopen, đọc màu accent #00B3FF, cảnh báo trắng/⚠; không đưa setting vào headless |
| Hồi quy còn hiệu lực | 46 tests Phase 2 kế thừa/cập nhật +24 tests fuel; verify chạy CLI cũ còn đúng, replay và benchmark |

Các output ở docs/proof/phase-3 được sinh bởi scripts/verify.mjs; browser-qa.json/PNG do scripts/browser-qa.mjs. Có hash source trong verification.json. Không coi cấu hình CI hoặc tests của mình là kết quả test ẩn.

## Test cũ đã thay có lý do

- fixed 60Hz: thời gian sau 120 bước từ 298 → 238 vì Đêm 1 rút còn 240 giây; quãng đường giữ 12 m.
- partial deposit: 4 mote cho 40 → 20 điểm, đủ 10 cho tổng 200 → 150 theo +5/mote/+100 lần đầu; giữ kiểm tra cạnh nhấn và lượng dư.
- dawn last deposit: bỏ công thức Phase 2 350, thay tổng 1046 gồm nạp/lần đầu và đèn/fuel/lửa theo giá trị trước khi làm tròn. Kiểm tra dawn_survived.
- tên test death ưu tiên bỏ all_lit; không còn luật thắng sớm. Test all-lit cũ trong browser/CLI đổi sang time_left_s gần 0, giữ kiểm tra progression/total.
- Benchmark Đêm 3 đủ 21.600 → 18.000 tick theo 300 giây mới. Không giữ thời lượng cũ để giả đạt.
- Các case movement/physics/dash/terrain/shade hit/pause/drifter/charm/wind/determinism/exit codes không bị thay luật vẫn chạy, không skip test.

## Giả định và giới hạn

- Các chi tiết chưa quy định trong Ticket-03 theo ADR: fuel quantize về integer1/60 khi setup; fuel_drain theo mỗi 60 bước hút liên tục của từng bóng; ejection tức thì nằm trong tối đa 30 tick; tick hồi từ stun giữ wander trước quyết định tiếp.
- Fixture browser dùng đèn đặt sẵn/time_left_s ngắn để kiểm tra UI và bình minh, không thay bằng chứng một người chơi thắng cả ba Đêm thường. Chưa có review chơi/nghe độc lập; CI Linux từ xa cần xem sau push.
- Commit/tag phase-3 được tạo local khi chốt; chưa push. Thời hạn lab thực tế chưa được cung cấp, không giả thời gian tag. Phase 4/Release/video chưa làm.

## Nhật ký AI / evaluation

- Codex thực hiện, không subagent. Đọc code/spec Phase 2, thay mô hình fuel và nhánh kết thúc, cập nhật test trước QA UI; không thêm dependency.
- Lần test đầu có 3 lỗi kỳ vọng đúng ở luật thay thế (thời lượng, điểm nạp, thưởng thắng); cập nhật test và lý do bên trên, không tắt/skip.
- QA browser phát hiện nhấn E rất nhanh lọt giữa các tick; sửa bằng queue cạnh nhấn cho E/Space/Shift/Q, giữ logic false→true trong simulation. Regression trực tiếp giữ phím và CLI input vẫn chạy.
- Bảo toàn proof cũ bằng đổi đường dẫn scripts/CI sang phase-3. Hình dạng/opacity/cảnh báo chỉ ở renderer, không dùng setting mù màu để đổi game state/RNG.
- Ước tính 20.000–40.000 token cho ngữ cảnh/triển khai/kiểm chứng Phase 3; không có telemetry billing, chi phí tiền chưa xác định. Tái dùng engine, map và toolchain giúp giới hạn phạm vi; thêm test nhắm vào thay luật và biên tick.

## Kết quả local đã quan sát

- Verify đạt 70/70 tests, 22 lệnh kiểm chứng; replay giống byte-for-byte. Đêm 3 đủ 18.000 tick dưới 30 giây; thời gian lần chốt và cấu hình nằm trong verification.json. Hash source khớp mã hiện tại.
- Edge 157, GPU AMD Radeon qua ANGLE D3D11, 1280×720: khoảng 165,03 / 165,02 / 164,25 FPS ở ba mẫu 2,5 giây sau khi có shade; không lỗi JavaScript trong QA cuối.
- Đã xem ảnh fixture trước/sau thắp lại: đèn tắt rách/xẹp, đèn yếu có thanh trắng/⚠, thắp lại hiện dầu và capacity 12. QA đo opacity 1/0,3 ở hai pha của chu kỳ 1 Hz, kiểm tra mắt/viền xanh và cài đặt lưu qua lần mở.
- Luồng ba Đêm/Bình Minh dùng scenario gần bình minh; mất lửa/thua/retry và tổng điểm được kiểm tra riêng. Không tự nhận một người đã chơi thắng toàn bộ ba Đêm thường.
