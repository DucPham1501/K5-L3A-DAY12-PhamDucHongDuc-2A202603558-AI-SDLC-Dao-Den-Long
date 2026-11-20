# ADR-003 — Đèn có nhiên liệu và thắng tại bình minh

Trạng thái: chấp nhận cho Ticket-03 / Contract v1.2.

## Vấn đề

Mô hình lit một chiều và thắng khi tất cả đèn sáng của Phase 2 không còn phù hợp. Đèn phải có thể hết dầu, được thắp lại/châm dầu; kết quả chỉ xét ở cuối Đêm. Các tag phase-1/phase-2 và bằng chứng cũ được giữ nguyên.

## Quyết định

- Mỗi đèn giữ lit, deposited, ever_lit, relit_count và fuelUnits nguyên (60 đơn vị = 1 fuel). Mỗi tick sáng trừ 1 đơn vị; mỗi bóng drain trừ thêm 5 đơn vị. Snapshot xuất fuel làm tròn 1 chữ số, không dùng giá trị đã làm tròn để quyết định logic.
- Dựng scenario không tạo điểm, event hoặc successful_lights. lit:true mặc định 6000 fuelUnits và ever_lit=true; relit_count ban đầu 0. Đèn tắt luôn xuất fuel=0.
- Sau bước giảm bộ đếm, cộng dồn tất cả hao/hút và tắt ngay đèn hết dầu, reset deposited=0, giữ ever_lit. Do đó một đèn có thể tắt rồi được thắp lại trong chính tick đó nếu người chơi tương tác đủ tài nguyên.
- Nạp đèn tắt dùng cost 10 nếu chưa từng sáng, 5 nếu ever_lit. Đèn sáng nhận dầu theo ceil(phần thiếu/10), lượng dư giữ trong túi; đèn thực sự đầy bị loại khỏi danh sách chọn. Hao dầu diễn ra trước tương tác, nên đèn 100 ở tick 0 đã thiếu 1/60 khi xét input bước 1 và có thể nhận 1 đom đóm dù snapshot làm tròn vẫn là 100,0.
- Chỉ lit && fuelUnits>=1800 có vùng an toàn. Refuel lên ngưỡng được áp dụng trước cập nhật safe zone và pulse. Đẩy bóng ra mép ngay trong bước đó, trong giới hạn 30 tick.
- Wander tìm đèn yếu gần nhất, hòa chọn ID nhỏ; không có thì tìm đèn tắt. Chase giữ mục tiêu Mây. Drain không di chuyển; ở bước 2, bóng đang drain hợp lệ từ trạng thái trước hút dầu. Sau di chuyển Mây, drain chuyển chase khi Mây trong 6 m; khi đèn tắt/đủ dầu/ra ngoài 2 m thì về wander. Hết choáng có một bước wander trước khi chọn hành vi mới.
- fuel_drain phát mỗi 60 bước hút thực tế liên tục của mỗi bóng (bộ đếm riêng, không phải tick toàn cục), ghi fuel sau tổng hao/hút của bước; không reset vì pause. Pulse tính điểm theo trạng thái ngay trước pulse: drain 15, trạng thái khác 5, không cộng hai lần.
- successful_lights tăng khi thực sự thắp thành công, kể cả thắp lại; capacity=min(20,10+2×successful_lights). Refuel và setup không tăng. Reset khi tạo Đêm/retry, giữ qua hồi sinh do rơi.
- Không còn nhánh thắng sớm/all_lit. Sau toàn bộ bước gameplay: no_flames ưu tiên tuyệt đối; chỉ khi hết giờ mới so lit_count với ceil(0,6×count), thắng reason dawn_survived, thiếu đèn thua dawn. Thời lượng 240/270/300 giây.
- Thưởng thắng dùng floor của fuel chính xác trong bộ đếm nguyên; không floor số snapshot đã làm tròn. Bỏ thưởng thời gian; tổng chiến dịch chỉ lưu các Đêm thắng như Phase 2.

## Hệ quả và kiểm chứng

Renderer/HUD phải đọc nhiên liệu và capacity động, hiện thanh dầu/cảnh báo 1 Hz, chỉ hướng cả đèn cần châm; hướng dẫn và màn kết quả thay mục tiêu. Tùy chọn bảng màu dễ phân biệt chỉ thay renderer/CSS và localStorage, không được đưa vào simulation hoặc đầu ra headless.

Các test cũ về 300 giây Đêm 1, +10 điểm nạp và thưởng thắng Phase 2 phải thay kỳ vọng. Fixture thắng sớm trong CLI/browser phải chuyển thành fixture gần bình minh; không skip test cũ âm thầm. Các ca movement, jump, dash, terrain, Gió Lạc, Bùa Gió, pause và định dạng CLI vẫn kiểm tra hồi quy.
