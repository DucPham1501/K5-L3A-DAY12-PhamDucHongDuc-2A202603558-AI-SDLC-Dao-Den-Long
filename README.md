# Đảo Đèn Lồng · Ba hòn đảo

Game 3D góc nhìn thứ ba theo **Ticket-02 · Phase 2 · Test Contract v1.1**. Cùng Mây gom đom đóm, thắp đèn và đi qua Đảo Bến, Đảo Cau, Đảo Chuông để đón Bình Minh.

Phase 1 được giữ nguyên ở tag [`phase-1`](https://github.com/DucPham1501/K5-L3A-DAY12-PhamDucHongDuc-2A202603558-AI-SDLC-Dao-Den-Long/tree/phase-1). Hướng dẫn lab gốc: [LAB.md](LAB.md).

Hồ sơ nộp Phase 2: [checklist và bản đồ bằng chứng](docs/submission-phase-2.md).

## Chạy game — 3 lệnh

Cần Node.js 20+, npm và trình duyệt WebGL 2 trên Windows/macOS/Linux.

```bash
npm ci
npm run build
npm start
```

Mở **http://127.0.0.1:4173**. Bản build `dist/` là web tĩnh, có Three.js và giấy phép đi kèm; không dùng CDN. Chế độ headless không cần trình duyệt hay GPU.

## Điều khiển

| Phím | Hành động |
|---|---|
| WASD | Di chuyển theo camera |
| Space | Nhảy khi chạm đất |
| Shift | Lướt; trên không giữ độ cao |
| E | Nạp vào đèn chưa sáng gần nhất |
| Q | Tỏa sáng |
| ← / → hoặc kéo chuột | Xoay camera |
| Esc / P | Tạm dừng / tiếp tục |

Menu pause có Tiếp tục, Chơi lại Đêm, Cài đặt và Về menu. Âm lượng/độ nhạy chuột được lưu trong trình duyệt. Nhạc và hiệu ứng được tổng hợp bằng Web Audio sau thao tác bắt đầu của người chơi.

## Ba Đêm

| Đêm | Thời gian | Đèn | Đặc điểm |
|---|---:|---:|---|
| 1 · Đảo Bến | 300 s | 5 | Đảo tròn bán kính 40 m |
| 2 · Đảo Cau | 330 s | 6 | Hai đảo, cầu tre không lan can, hai bục phóng, Bùa Gió và Gió Lạc |
| 3 · Đảo Chuông | 360 s | 7 | Ba tầng, hai dốc, bục lên tầng cao, tháp chuông và gió mạnh |

Đi theo trình tự menu → lời Ông Đăng → chơi → kết quả → Đêm tiếp theo. Thắng Đêm 3 mở màn Bình Minh với tổng điểm các Đêm đã thắng. Thua được chơi lại đúng Đêm đó.

Mang tối đa **10** đom đóm. Mỗi đèn cần **10**, được nạp từng phần và giữ lượng dư. Đèn đã sáng tạo vùng an toàn **6 m**. Tỏa sáng tốn **3**, bán kính 3D **5 m**, hồi **3 s**, choáng Bóng Mực **120 tick** và đẩy **4 m trong 15 tick**. Lướt **14 m/s**, kéo dài **12 tick**, hồi **90 tick**, không bất tử. Bùa Gió kéo dài **600 tick**, chạy **7,2 m/s** và lướt không hồi.

Bị Bóng Mực chạm mất 1 trong 3 Ngọn Lửa, rơi `floor(carried/2)` đom đóm và bất tử 90 tick. Rơi dưới Y=−10 bỏ qua bất tử, mất toàn bộ đom đóm, chờ 60 tick để hồi sinh nếu còn lửa. Đồ rơi tồn tại 480 tick. Thắp hết đèn thì thắng; hết lửa luôn thua; nếu còn đèn chưa sáng khi hết giờ thì thua.

## Điểm chuẩn

- **+10 mỗi đom đóm nạp**, không cộng khi nhặt.
- **+100** mỗi đèn sáng.
- **+5** mỗi Bóng Mực trúng mỗi pulse, kể cả đang choáng.
- Thắng cộng **floor(giây còn lại) × 2 + 50 × lửa còn lại**.
- Tổng chiến dịch chỉ cộng điểm các Đêm đã thắng; retry không cộng lặp.

Trong tuning, `score.per_mote=0` là điểm nhặt; `score.per_deposit=10` là điểm nạp.

## Headless v1.1

```bash
node src/headless.mjs --seed 12 --night 2 --ticks 3600 --out night2.jsonl
```

```bash
node src/headless.mjs --seed 12 --night 2 --scenario tests/scenarios/phase-2/drifter-return.json --inputs tests/scenarios/phase-2/pulse.inputs.json --ticks 150 --snapshot-every 10 --out drifter.jsonl
```

Hỗ trợ `--night 1|2|3`, seed, scenario, inputs, ticks, out và snapshot-every (mặc định 10). Tick 0 chỉ dựng trạng thái; bước đầu bình thường có `night_start` tick 1. Event đứng trước snapshot cùng tick, `end` luôn cuối. Có thêm snapshot cuối khi lệch chu kỳ. Lỗi scenario/inputs mã 2 và stderr; lỗi khác mã 1; thành công mã 0.

Input giữ giá trị giữa các frame; jump/interact/pulse/dash/pause theo cạnh false→true. Khi pause, `tick` tăng, `sim_tick` và toàn bộ timer/gameplay đứng yên; snapshot state `paused`. Snapshot có night, wind, player velocity/grounded/invuln/cooldown/charm và đủ mảng motes/drifters/charms. `invuln` là boolean. Mote tự nhiên không có TTL nên `ttl_s=null`; đồ rơi có TTL số giây.

Schema bổ sung và các giả định được ghi tại [spec Phase 2](docs/notes/phase-2.md).

## Kiểm chứng và bằng chứng

```bash
npm run verify
```

Chạy unit/CLI tests, build, scenario tính năng mới, so replay byte-for-byte và benchmark **đủ 21.600 tick**. Bằng chứng tự sinh ở [docs/proof/phase-2](docs/proof/phase-2/), có hash source. Benchmark dùng scenario bất tử ban đầu để tránh thua sớm; vẫn bật sinh địch tự nhiên.

```bash
npm run test:browser
```

Chạy Edge có sẵn ở 1280×720; có thể đặt `BROWSER_PATH` tới Chromium. QA gồm ba bản đồ, di chuyển, pause/retry, lưu cài đặt, chuỗi Đêm, Bình Minh và đo FPS. Các fixture chọn Đêm bắt đầu / đèn dựng sẵn được ghi rõ trong báo cáo, không được coi là người chơi thắng cả ba Đêm bình thường. `SOFTWARE_WEBGL=1` dành cho máy không có GPU, không dùng số đó thay số đo GPU phần cứng.

Xem [báo cáo logic/headless](docs/proof/phase-2/verification.json), [báo cáo trình duyệt/FPS](docs/proof/phase-2/browser-qa.json), ảnh [Đêm 1](docs/proof/phase-2/night-1.png), [Đêm 2](docs/proof/phase-2/night-2.png), [Đêm 3](docs/proof/phase-2/night-3.png). CI Ubuntu chạy verify mỗi push/PR; trạng thái run GitHub cần được kiểm tra riêng.

## Sáng tạo của tôi

Mô hình nón lá treo đèn, biển mây, tiếng chuông/nhạc tổng hợp, lối đá và minimap đều tạo trong mã. Camera tự tránh địa hình che khuất Mây. Cảnh vật dùng instancing để giảm draw call. Chi tiết trang trí không có collider, không thêm thực thể hay làm đổi headless.

## Tổ chức mã

```text
src/core/game.mjs       Simulation và thứ tự tick
src/core/maps.mjs       Ba bản đồ, địa hình và vật cản
src/core/campaign.mjs   Tiến trình/điểm ba Đêm
src/core/validate.mjs   Kiểm tra dữ liệu đầu vào
src/headless.mjs        CLI v1.1
web/                   World, HUD/menu, audio và palette
tests/                 Regression và scenario Phase 2
docs/                  Spec, nhật ký và bằng chứng từng phase
```

Harness: [AGENTS.md](AGENTS.md), verification script và GitHub Actions. Nguồn: [CREDITS.md](CREDITS.md), giấy phép: [LICENSE](LICENSE). Phase 3–4 và Release/video cuối bài chờ ticket tiếp theo.
