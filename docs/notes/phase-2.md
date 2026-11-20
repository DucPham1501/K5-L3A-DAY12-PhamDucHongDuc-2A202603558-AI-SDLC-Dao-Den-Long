# Phase 2 — Spec triển khai Ticket-02

Trạng thái: **đã triển khai và kiểm chứng local Contract v1.1**, chốt bàn giao bằng commit và tag phase-2; người dùng thực hiện push. Code Phase 1 được giữ ở tag phase-1; không sửa bằng chứng Phase 1. Checklist bàn giao: [../submission-phase-2.md](../submission-phase-2.md).

## Phạm vi áp dụng

- Ticket-02 thay thế các giả định Phase 1 khi đã quy định luật/số chuẩn.
- Chỉ đèn đã sáng tạo vùng an toàn trong Phase 2.
- Giữ nguyên ghi chép/evidence Phase 1 như hồ sơ lịch sử. Khi đổi test cho luật mới, ghi lý do, không sửa bằng chứng cũ để trông như đã chạy luật mới.

## Quy tắc Phase 2

| Chủ đề | Quyết định | Kiểm chứng cần có |
|---|---|---|
| Shade sinh tự nhiên | spawning kéo dài 1 giây = 60 gameplay tick, không gây sát thương; renderer cho hiện dần, sau đó wander | Test thời hạn và không hit trong spawning; QA hiệu ứng |
| Shade từ scenario | Bỏ qua spawning, mặc định bắt đầu wander ngay | Scenario shade ở gần, không phải chờ 60 tick; vẫn hỗ trợ state/state_ticks_left theo ticket khi được chỉ định |
| Xuất phát Đêm 2 | pos [0,0,0], quay +Z | Snapshot 0 và dash đứng yên theo hướng quay mặt |
| Xuất phát Đêm 3 | pos [0,0,-15], quay +Z | Snapshot 0; không bắt đầu trong tháp chuông |
| player.invuln trong snapshot | boolean, true khi đang bất tử | Assert kiểu boolean và đổi trạng thái tại biên bộ đếm |
| invuln_ticks | Số tick dựng tình huống trong scenario.player; không dùng thay boolean snapshot | Validation/scenario và kiểm tra thời gian bất tử |
| night_start | Phát tick 1 trong lượt khởi đầu bình thường; tick 0 chỉ snapshot, không event | JSONL tick 0 không event, bước đầu có night_start {night} |

Triển khai nhất quán theo quy ước tick 1, không phát event trong lúc dựng scenario.

## Chuyển đổi từ Phase 1

| Chủ đề | Quy tắc nền | Bản Phase 1 / hướng Phase 2 |
|---|---|---|
| Nhặt | Tự chọn cách nhặt; XZ ≤ radius, không vượt capacity; mỗi lần nhặt có mote_picked | Phase 1 tự động và không nhặt khi đầy hợp lệ. Phase 2 bắt buộc tự động, capacity=10, XZ≤1 và chênh cao≤1,5 |
| Nạp | deposited≤cost; amount đúng lượng chuyển; không mất dư âm thầm | Giữ min(carried,cost-deposited), giữ phần dư; Phase 2 bắt buộc cách này và chọn đèn gần nhất/ID nhỏ nhất |
| Pulse | Trừ carried hợp lý; thiếu tài nguyên không kích hoạt/không event | Giữ quy tắc này; Phase 2 áp dụng chi phí/bán kính/3D/push/cooldown chuẩn |
| Đồ rơi | Làm tròn và có tạo mote hay không được tự chọn, khai rõ | Phase 1 ratio=0 hợp lệ. Phase 2 bắt buộc floor(carried/2), tạo dropped motes TTL 480 tick, nhặt từ tick sau |
| Event/snapshot | Event trước snapshot trong cùng tick; end cuối cùng | Giữ thứ tự. Snapshot kết thúc đặc biệt không bắt buộc; Phase 1 hiện có thêm snapshot cuối |
| Thưởng thắng | Cộng tại game_over won, end có tổng cuối; thưởng thua tự chọn | Phase 1 chỉ thưởng khi thắng. Phase 2 thay bằng floor(time_left)×2+50×flames; điểm nạp thay điểm nhặt |
| Safe zone | CP1 tự chọn đèn áp dụng | Phase 1 dùng đèn sáng. Phase 2 giữ chỉ đèn sáng, radius=6 và đẩy shade đang ở trong ra mép trong tối đa 30 tick |

## Acceptance criteria tính năng mới (Phần 3 của Ticket-02)

| Mục | Điều kiện đạt | Bằng chứng dự kiến |
|---|---|---|
| Gió Lạc | Đêm 2/3, sinh mỗi 1200 sim_tick, tối đa 2; idle/chase/flee/removed đúng; steal một lần, pulse xua/trả đồ; safe zone/invuln không chặn cướp | Scenario ngưỡng carried/khoảng cách; steal trước shade hit; drop/TTL; lịch spawn |
| Bùa Gió | Nhặt đúng phạm vi/độ cao, 600 tick làm mới; chạy 7,2; dash không hồi nhưng cần cạnh nhấn; vật phẩm hồi sau 2700 tick | Scenario charm, dash liên tiếp/đang dash, pause đóng băng và respawn |
| Chuỗi ba Đêm | Menu→giới thiệu/lời Ông Đăng→chơi→kết quả→đêm sau; thắng Đêm 3 hiện Bình Minh và tổng các đêm thắng; thua chơi lại đúng Đêm | Browser flow; test không cộng lặp điểm khi retry |
| Pause | Esc/P hoặc pause edge; tick tăng còn sim_tick/timers/spawn/TTL đứng yên; snapshot paused; menu đủ tiếp tục/retry/cài đặt/menu | Scenario inputs pause/resume và browser menu |
| Cài đặt | Âm lượng và độ nhạy có tác dụng và lưu giữa lần mở | Browser reload và kiểm tra lưu trữ |
| Âm thanh | Nhạc nền; hiệu ứng nhặt, thắp, pulse, hit, jump, dash, thắng/thua, spawn shade, countdown 10 giây cuối | QA âm thanh; mute/volume; không tác động headless |
| HUD | Bố cục đúng; timer đỏ/nhấp nháy≤30s; thanh 10 ô; cooldown dash/pulse; prompt E (x/10); chỉ hướng đèn ngoài màn hình | Browser screenshots và kiểm tra các trạng thái HUD |
| Palette/ánh sáng | Dùng màu chuẩn cho các vật liệu được liệt kê; ambient=0,15+0,55×lit/total | Đối chiếu material config, ảnh và test công thức |

## Giả định triển khai cho phần chưa quy định

- Wander: lượn ngang 1 m/s theo hướng deterministic phụ thuộc ID/sim_tick. Trong 12 m chuyển chase; hơn 18 m bỏ chase. Các trạng thái đúng tên contract. Spawn tự nhiên 60 tick; scenario mặc định wander, tôn trọng state/state_ticks_left nếu có.
- Tâm shade tự nhiên ở mặt đất +0,8 m. Scenario giữ độ cao tâm đã chỉ định; khi di chuyển qua địa hình, giữ độ lệch cao ban đầu so với mặt đất. Pulse chốt khoảng cách Euclid tới chân Mây +0,8 m trước di chuyển địch.
- Safe zone chiếu bóng đang ở trong ra mép ngay trong tick cập nhật (nằm trong giới hạn tối đa 30 tick), không hit trong lần bị đẩy đó. Vùng an toàn và tương tác đèn dùng XZ như contract gốc; pickup/contact thêm height gate theo Ticket-02.
- Gió Lạc dùng tập điểm sinh shade của Đêm làm điểm sương; chỉ có ở Đêm 2/3. Không bị địa hình hoặc vùng an toàn chặn.
- Drifter scenario: {id?,pos,state?,stolen?,state_ticks_left?}; mặc định idle/stolen=0; flee thiếu thời gian mặc định 240 tick. Charms: {id,pos?,available?,respawn_s?,respawn_ticks?}; id C1/C2 có thể dùng vị trí chuẩn nếu không truyền pos. Các mảng thay thế danh sách mặc định.
- score.per_mote=0 cho nhặt; thêm score.per_deposit=10 cho nạp. Các hệ số còn lại đúng Ticket-02.
- Nếu pause ngay input tick 0: paused event tick 1; night_start chờ bước gameplay đầu tiên sau resume, không phát event khi setup. Resume tick có thực hiện bước gameplay.
- Mote random có ttl_s=null vì không hết hạn; dropped có ttl_s số. Khi sinh tự nhiên, chỉ thêm nếu tổng mote active dưới 30 và còn điểm trống. Đồ rơi do hit có thể làm tổng vượt 30, khi đó ngừng sinh tự nhiên tới khi dưới trần.
- Lịch shade Đêm 2/3 cũng bắt đầu 2 con ở tick 300; các lần sau tại 300+k×420 hoặc 300+k×360. Spawn mới chỉ tham gia từ tick sau.
- Gió đầu ở sim_tick 1800, báo từ 1680; hoạt động 1800…2099, rồi lặp mỗi 1800 tick. Góc hướng gió được chốt bằng RNG có seed khi bắt đầu báo.
- Gia tốc/dừng tức thì (≤0,1 giây). Physics dùng bước ballistic với trọng lực −20. Dash giữ Y và bảo lưu vận tốc dọc để tiếp tục sau dash; snapshot vel.Y=0 trong bước dash. Bục giữ vận tốc ngang tới khi chạm đất; dash có thể ghi đè tạm thời.

## Regression từ Phase 1

Các test về tick 0, input persistent, camera yaw, chuẩn hóa chéo, cạnh nhấn, sức chứa, nạp phần thiếu/giữ dư, event trước snapshot, kết thúc, mã thoát và tất định được giữ về ý nghĩa.

Các kỳ vọng cũ bị thay: bán kính đảo/chặn mép → bản đồ chuẩn/rơi; tốc độ nhảy/trọng lực → 7/−20; nhặt XZ thuần → thêm height gate; điểm nhặt → điểm nạp; pulse tức thì XZ → chốt 3D và push 15 tick; drop=0 → floor(carried/2); safe=4 → 6; spawn rải rác → điểm/lịch chuẩn; chỉ Đêm 1 → ba Đêm; UI pause dừng tick → tick tăng, sim_tick đứng yên. Test cũ được thay trong tests/game.test.mjs, bản gốc có ở tag phase-1.

## Kiểm chứng và nhật ký

- 46 unit/integration tests; mỗi cơ chế gameplay mới có scenario dưới tests/scenarios/phase-2 và output thật ở docs/proof/phase-2.
- Verify chạy CLI thật, replay hai lần, benchmark đủ 21.600 tick với invuln scenario để không chết sớm, vẫn bật địch. Report ghi cấu hình, thời gian và hash source; không phải kết quả test ẩn.
- Browser QA dùng GPU AMD trên máy hiện tại, Edge 1280×720. Đã kiểm tra menu/giới thiệu/ba bản đồ, pause/retry, cài đặt lưu qua lần mở, tổng điểm và Bình Minh. Luồng thắng dùng all-lit scenario fixture, không giả là chơi thắng bình thường. FPS là mẫu RAF trong cảnh game, kết quả cụ thể xem browser-qa.json.
- Chưa có người review độc lập chơi thắng cả ba Đêm; âm thanh đã được nối đủ event và phát qua Web Audio, chưa có đánh giá nghe độc lập. CI Ubuntu được cấu hình, chưa coi là đã chạy từ xa.
- Lỗi phát hiện: shade scenario cao bị kéo về mặt đất gây hit ngoài ý định của test pulse 3D → giữ offset độ cao; camera Đêm 3 bị tầng 2/tháp che Mây → kiểm tra đường nhìn và nâng camera; chase ở khoảng cách 0 tự chọn hướng +X → đứng yên khi trùng, chỉ push/recoil dùng fallback +X. Thêm test recoil đủ 2 m, ramp, air dash vel và campaign chống cộng lặp.
- Dùng Codex, không subagent. Ước tính 30.000–60.000 token cho ngữ cảnh/triển khai/kiểm chứng Phase 2, không có telemetry billing nên không phải số đo. Chi phí tiền chưa xác định. Tái sử dụng Node/Three đã cài, không thêm dependency; instancing giảm chi phí render.
- Harness cập nhật AGENTS.md, scripts/verify.mjs, scripts/browser-qa.mjs và CI để chỉ ghi proof Phase 2. Không thay tuning để đạt test; fixtures được nêu rõ.

## Kết quả đo local

- Verify: 46/46 tests đạt; replay giống byte-for-byte; đủ 21.600 tick Đêm 3 dưới 30 giây (Node.js 20, Windows, Ryzen 7 6800H). Thời gian của lần chốt được ghi tự động trong verification.json.
- Browser Edge 157, GPU AMD Radeon qua ANGLE D3D11, 1280×720: mẫu khoảng 2,5 giây mỗi Đêm sau sim_tick 420, có 2 shade; FPS lần lượt khoảng 165,04 / 165,15 / 164,97. Draw call 37 / 37 / 41. Đạt ngưỡng 30 FPS trên máy đo này; không suy ra mọi máy đều đạt.
- Không lỗi JavaScript trong QA; cài đặt giữ qua lần mở. Fixture hết giờ 0,1 giây kiểm tra thua/retry không tăng tổng điểm. Ảnh ba Đêm đã được lưu; đã xem ảnh để sửa camera che khuất Mây ở Đêm 3.
