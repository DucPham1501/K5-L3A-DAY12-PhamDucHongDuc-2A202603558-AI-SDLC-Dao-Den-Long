# Bàn giao Phase 3 — Đèn cạn dầu

**Phạm Đức Hồng Đức · 2A202603558 · Contract v1.2 · Tag phase-3.** Commit/tag được chốt local, người dùng tự push; giữ nguyên phase-1/phase-2.

- [x] Contract v1.2 và tuning nhiên liệu/thời lượng/sức chứa/điểm mới.
- [x] Dầu, châm, tắt/thắp lại, drain, thắng tại bình minh và ưu tiên no_flames.
- [x] HUD nhiên liệu/capacity, đèn xẹp/rách/nhấp nháy và chế độ màu dễ phân biệt được lưu.
- [x] [ADR-003](decisions/ADR-003-lantern-fuel-and-dawn.md) mô tả thay mô hình đèn và luật thắng.
- [x] [CHANGELOG](../CHANGELOG.md) liệt kê breaking changes; [spec/evaluation](notes/phase-3.md) ghi lý do thay test, không skip âm thầm.
- [x] 70/70 unit/CLI tests; scenario và output thật cho luật mới, hồi quy còn hiệu lực.
- [x] Replay tất định, full-night benchmark và hash source: [verification.json](proof/phase-3/verification.json).
- [x] QA màu/cảnh báo/thắp lại/capacity/luồng ba Đêm và FPS: [browser-qa.json](proof/phase-3/browser-qa.json), ảnh trong cùng thư mục.
- [x] README có ba lệnh chạy, điều khiển, luật/điểm v1.2, lệnh headless/test và liên kết bằng chứng.
- [x] AGENTS.md, verify/browser scripts và CI dùng phạm vi/proof Phase 3; bằng chứng cũ không bị ghi đè.

Fixture gần bình minh và đèn đặt sẵn chỉ kiểm tra luật/UI, không thay lượt chơi thắng độc lập. Chưa có review chơi/nghe độc lập; CI Linux từ xa/test ẩn không được tự nhận đã đạt. Phase 4, Release và video cuối bài chưa thuộc mốc này.

Người dùng push commit và tag bằng:

```bash
git push --atomic origin main refs/tags/phase-3
```

Sau push kiểm tra tag/Actions và repo public. Không giả mạo thời gian commit/tag hoặc ghi đè tag phase cũ.
