# Phase 2 — Spec triển khai Ticket-02

Trạng thái: **chuẩn bị spec**, chưa nâng mã game/contract lên v1.1.

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

## Chi tiết cần định nghĩa khi triển khai

- Hành vi wander và hình dạng schema scenario chi tiết cho drifters/charms.
- Độ cao tâm Bóng Mực sinh tự nhiên để tính pulse 3D.
- Ánh xạ khóa score của contract cũ sang điểm nạp đom đóm.
- Tập điểm sương dùng cho Gió Lạc.
- night_start nếu input đầu tiên pause ngay ở tick 0: cần quy ước nhất quán với việc xử lý pause trước mọi gameplay.

Những chi tiết chưa được quy định cần ghi giả định trước khi triển khai và kiểm thử.
