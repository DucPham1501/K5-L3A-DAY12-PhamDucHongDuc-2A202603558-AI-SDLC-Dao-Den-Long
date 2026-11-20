# Đảo Đèn Lồng · Đèn cạn dầu

Game 3D góc nhìn thứ ba · **Phase 3 · Ticket-03 · Test Contract v1.2**. Cùng Mây gom đom đóm, châm dầu và giữ đủ đèn sáng tới Bình Minh. Thắp hết đèn không còn kết thúc sớm.

Các bản trước được giữ ở tag `phase-1`, `phase-2`. Tài liệu lab gốc: [LAB.md](LAB.md). Hồ sơ Phase 3: [checklist bàn giao](docs/submission-phase-3.md), [spec và kiểm chứng](docs/notes/phase-3.md), [ADR](docs/decisions/ADR-003-lantern-fuel-and-dawn.md), [breaking changes](CHANGELOG.md).

## Chạy game — 3 lệnh

Cần Node.js 20+, npm và trình duyệt WebGL 2 trên Windows/macOS/Linux.

```bash
npm ci
npm run build
npm start
```

Mở **http://127.0.0.1:4173**. `dist/` là web tĩnh độc lập, có Three.js và giấy phép đi kèm, không dùng CDN. Headless không cần trình duyệt/GPU.

## Điều khiển và cài đặt

| Phím | Hành động |
|---|---|
| WASD | Di chuyển theo camera |
| Space | Nhảy |
| Shift | Lướt |
| E | Nạp, thắp lại hoặc châm dầu vào đèn nhận được gần nhất |
| Q | Tỏa sáng |
| ← / → hoặc kéo chuột | Xoay camera |
| Esc / P | Tạm dừng / tiếp tục |

Pause có Tiếp tục, Chơi lại Đêm, Cài đặt, Về menu. Âm lượng, độ nhạy và **Bảng màu dễ phân biệt** lưu trong trình duyệt. Chế độ màu đổi viền/mắt Bóng Mực sang #00B3FF, cảnh báo sang trắng kèm ⚠. Đèn tắt xẹp 20% và có vết rách; đèn yếu nhấp nháy, phân biệt được không chỉ bằng màu.

## Giữ đảo sáng tới bình minh

| Đêm | Thời gian | Đèn cần sáng ở tick cuối |
|---|---:|---:|
| 1 · Đảo Bến | 240 s | 3/5 |
| 2 · Đảo Cau | 270 s | 4/6 |
| 3 · Đảo Chuông | 300 s | 5/7 |

Bản đồ, cầu, bục phóng, tầng/dốc/tháp và gió giữ theo Phase 2. Luồng menu → giới thiệu → chơi → kết quả → Đêm tiếp theo; thắng Đêm 3 mở Bình Minh. Hết Ngọn Lửa luôn thua trước, kể cả tick cuối. Không thắng sớm khi thắp đủ đèn.

- Sức chứa bắt đầu **10**, tăng **2 mỗi lần thắp thành công** kể cả thắp lại, tối đa **20**. Reset đầu Đêm/retry; scenario đặt sẵn đèn không tính.
- Thắp lần đầu cần **10** đom đóm, thắp lại cần **5**. Được nạp từng phần, giữ dư.
- Đèn vừa thắp có **100 dầu**, tự hao **1/giây**. E châm **10 dầu/đom đóm**, dùng `min(carried, ceil((100-fuel)/10))`, không vượt 100. Đèn đầy không được chọn, không event/điểm.
- Hết dầu: tắt, mất tiến độ nạp, nhớ ever_lit. Đèn **≥30 dầu** có safe zone 6 m; dưới 30 mất safe zone và nhấp nháy 1 Hz.
- Bóng wander tìm đèn yếu gần nhất; trong 2 m thì drain, hút thêm **5 dầu/giây/con**, cộng dồn. Mây tới trong 6 m khiến nó đuổi; pulse làm choáng và phá hút. Châm lên ≥30 đẩy bóng ra mép vùng an toàn.
- Pulse giữ chi phí 3, bán kính 3D 5 m, hồi 3 s, choáng 120 tick, đẩy 4 m/15 tick. Dash 14 m/s trong 12 tick, hồi 90 tick, không bất tử. Bùa Gió và Gió Lạc giữ luật Phase 2.
- Bị chạm mất 1/3 Ngọn Lửa, rơi nửa đom đóm, bất tử 90 tick. Rơi dưới Y=−10 mất toàn bộ đom đóm, chờ 60 tick hồi sinh nếu còn lửa. Đồ rơi tồn tại 480 tick.

## Điểm v1.2

Nạp/châm: **+5 mỗi đom đóm**; thắp lần đầu **+100**, thắp lại **+40**. Pulse mỗi bóng: tổng **+15** nếu ngay trước đó đang drain, tổng **+5** với trạng thái khác. Chỉ khi thắng: mỗi đèn sáng **+50 + floor(fuel)**, mỗi Ngọn Lửa **+50**. Bỏ thưởng thời gian. Tổng chiến dịch chỉ tính các Đêm thắng, không cộng lặp khi retry.

Tuning: per_mote=0, per_deposit=5, per_lantern=100, per_relight=40, per_stun=5, per_drain_stun=15, per_second_left=0.

## Headless v1.2

```bash
node src/headless.mjs --seed 12 --night 2 --ticks 3600 --out night2.jsonl
```

```bash
node src/headless.mjs --seed 12 --night 1 --scenario tests/scenarios/phase-3/refuel.json --inputs tests/scenarios/phase-3/interact.inputs.json --ticks 60 --out refuel.jsonl
```

Hỗ trợ night 1/2/3, seed, scenario, inputs, ticks, out, snapshot-every (mặc định 10). Tick 0 không event, bước đầu bình thường có night_start tick 1; event trước snapshot, end cuối. Input giữ trường giữa frame, nút theo false→true. Pause vẫn tăng tick, dừng sim_tick và mọi bộ đếm, kể cả dầu/hút. Lỗi scenario/inputs mã 2, lỗi khác mã 1, thành công 0.

Snapshot đèn có fuel làm tròn 1 chữ số (đèn tắt 0), ever_lit, relit_count; player có capacity; shade có drain. Scenario thêm fuel/ever_lit, player.successful_lights, shade.target_lantern_id. Event mới refuel, lantern_out, fuel_drain; lantern_lit thêm relight; thắng dùng dawn_survived, bỏ all_lit.

Dầu tính bằng số nguyên đơn vị 1/60; xử lý hao/hút và tắt trước tương tác. Thưởng floor dùng nhiên liệu chính xác, không dùng snapshot đã làm tròn. Mote random ttl_s=null; invuln snapshot boolean. Xem ADR về các trường hợp biên và giả định schema kế thừa Phase 2.

## Kiểm chứng

```bash
npm run verify
```

Chạy 70 unit/CLI tests, build, scenario dầu/hút/thắp lại và regression, so replay byte-for-byte, benchmark đủ **18.000 tick** Đêm 3. Report có hash source/cấu hình máy. Chỉ ghi [proof Phase 3](docs/proof/phase-3/), không sửa bằng chứng Phase 1–2.

```bash
npm run test:browser
```

QA Edge 1280×720; `BROWSER_PATH` hỗ trợ Chromium khác, `SOFTWARE_WEBGL=1` cho máy không GPU. Kiểm tra ba bản đồ, pause/retry/cài đặt, màu dễ phân biệt, dầu yếu/thắp lại/HUD và chuyển Đêm. Fixture gần bình minh chỉ kiểm tra luật kết thúc, không giả là lượt chơi thắng cả ba Đêm thường.

Xem [logic/headless](docs/proof/phase-3/verification.json), [browser/FPS](docs/proof/phase-3/browser-qa.json), ảnh [Đêm 1](docs/proof/phase-3/night-1.png), [dầu trước thắp lại](docs/proof/phase-3/fuel-before-fixture.png), [sau thắp lại](docs/proof/phase-3/fuel-after-fixture.png). CI Ubuntu chạy verify khi push/PR; kết quả từ xa phải kiểm tra riêng.

## Sáng tạo của tôi

Nón lá treo đèn, biển mây, lối đá, minimap, âm thanh tổng hợp và camera tránh che Mây. Cảnh dùng instancing; chi tiết trang trí không thay headless. Quầng safe zone mất khi dầu yếu; hình dạng/vết rách và biểu tượng cảnh báo bổ sung thông tin ngoài màu.

Mã simulation/terrain/campaign/validation ở src/core, CLI ở src/headless.mjs; renderer/HUD/audio/palette ở web. Harness: [AGENTS.md](AGENTS.md), verify script và GitHub Actions. Nguồn: [CREDITS.md](CREDITS.md), giấy phép: [LICENSE](LICENSE). Phase 4/Release/video cuối bài chờ ticket.
