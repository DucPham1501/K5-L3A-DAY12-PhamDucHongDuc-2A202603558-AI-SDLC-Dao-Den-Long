# Đảo Đèn Lồng · Đêm 1 – Đảo Bến

Game 3D góc nhìn thứ ba: cùng **Mây** gom đom đóm, thắp 5 Đèn Lồng Lớn và né Bóng Mực trước bình minh. Nhân vật, đảo, cây, đèn và hiệu ứng tạo bằng hình học trong mã nguồn.

**Phase 1 · Test Contract v1.0.** Bản web và CLI headless dùng cùng simulation 60 tick/giây. Hướng dẫn gốc của bài lab được giữ tại [LAB.md](LAB.md).

## Cài và chơi — tối đa 3 lệnh

Cần **Node.js 20+ và npm** trên Windows, macOS hoặc Linux. Trình duyệt cần WebGL 2; headless không cần trình duyệt hay GPU.

```bash
npm ci
npm run build
npm start
```

Mở **http://127.0.0.1:4173**. `dist/` là bản web tĩnh độc lập, có Three.js đi kèm, không tải CDN/asset ngoài khi chơi. Có thể đặt biến môi trường `PORT`. Dừng server bằng Ctrl+C.

## Điều khiển và luật chơi

| Phím | Hành động |
|---|---|
| W A S D | Di chuyển theo camera; W đi về phía trước màn hình |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn chưa sáng gần nhất |
| Q / nút Tỏa sáng | Tỏa sáng, choáng và đẩy Bóng Mực |
| ← / → hoặc kéo chuột | Xoay camera |
| Esc / H | Tạm dừng / hướng dẫn |

- Đèn cần **10** đom đóm; mang tối đa **20**; được nạp từng phần. Thả E rồi nhấn lại để nạp lần nữa.
- Tỏa sáng tốn **3**, bán kính **5 m**, choáng **2 giây**, đẩy **3 m**, hồi **1 giây**.
- **3 ngọn lửa**, **300 giây**. Chạm Bóng Mực mất 1 lửa, bất tử **1,5 giây**, không rơi đom đóm.
- Đèn sáng tạo vùng an toàn **4 m**. Nhảy vẫn có thể bị chạm: tương tác/va chạm dùng XZ theo contract.
- Thắp đủ **5 đèn** thắng; hết lửa hoặc hết giờ thua. Nút **Chơi lại Đêm 1** dựng lại thế giới seed 12.
- Rìa đảo chặn bước đi, không có sát thương rơi. Trang tự tạm dừng khi mất focus; headless chạy liên tục.

## Điểm số

Nhặt 1 đom đóm: **10**; thắp 1 đèn: **100**; mỗi Bóng Mực trúng pulse: **20**. Khi thắng cộng **floor(số giây còn lại) + 50 × số ngọn lửa**. Thua không có thưởng kết thúc. Setup scenario không cộng điểm.

## Headless

```bash
node src/headless.mjs --seed 12 --night 1 --ticks 600 --out output.jsonl
```

```bash
node src/headless.mjs --seed 12 --night 1 --scenario tests/scenarios/last-lantern.json --inputs tests/scenarios/last-lantern.inputs.json --ticks 60 --snapshot-every 10 --out won.jsonl
```

`game.contract.json` khai báo tuning dùng thật và các lệnh. Tick 0 xuất trước gameplay; input tick k tạo trạng thái/sự kiện tick k+1. Snapshot mỗi 10 tick (hoặc `--snapshot-every`), thêm snapshot cuối nếu lệch chu kỳ, rồi `end` bắt buộc. Thành công mã 0; scenario/inputs lỗi mã 2 và ghi stderr; lỗi lệnh/I/O khác mã 1.

Trường input được giữ giữa các frame; nút kích hoạt false → true. Không có dash; trường boolean `dash` được chấp nhận nhưng không có tác dụng. Xem [spec và giả định](docs/notes/phase-1.md).

## Kiểm chứng

```bash
npm run verify
```

Chạy test, build, CLI thắng/thua, so sánh replay byte-for-byte; lưu bằng chứng thật tại [docs/proof/phase-1](docs/proof/phase-1/). `npm test` chạy riêng unit/CLI tests. GitHub Actions chạy verify trên Ubuntu khi push/PR; có cấu hình chưa đồng nghĩa CI đã chạy thành công.

Harness: [AGENTS.md](AGENTS.md), [scripts/verify.mjs](scripts/verify.mjs), [.github/workflows/verify.yml](.github/workflows/verify.yml). Nhật ký và giới hạn: [docs/notes/phase-1.md](docs/notes/phase-1.md).

Ảnh thật: [gameplay](docs/proof/phase-1/gameplay.png), [màn bắt đầu](docs/proof/phase-1/title.png). Kiểm tra trình duyệt: `npm run test:browser` dùng Edge đã cài, hoặc đặt `BROWSER_PATH` tới Chromium; không cần cho headless hay CI thông thường. Đây là QA bằng software WebGL, chưa phải số đo FPS phần cứng.

## Sáng tạo của tôi

- Đèn sáng có quầng vàng lan dần, tăng ánh sáng đảo và chuông tổng hợp bằng Web Audio.
- Nón lá, đèn nhỏ đung đưa, biển mây và đom đóm lơ lửng tạo bằng geometry thủ tục.
- Minimap chỉ vị trí đèn, Mây, Bóng Mực và hướng camera; HUD và hướng dẫn tiếng Việt.

Các chi tiết này nằm trong renderer, không thêm thực thể gameplay hay đổi output headless. Kiểm chứng hình ảnh được ghi riêng trong ghi chú Phase 1.

## Cấu trúc

```text
src/core/           Simulation và validation dùng chung
src/headless.mjs   CLI Test Contract v1.0
web/               Renderer Three.js và giao diện
tests/             Unit, CLI integration và scenario
scripts/           Build, server, verification
docs/              Ghi chép và bằng chứng theo phase
```

Nguồn: [CREDITS.md](CREDITS.md), giấy phép: [LICENSE](LICENSE). Phase 2–4, Release v1.0.0 và video cuối bài chưa thực hiện trong Phase 1.
