"""
Mở rộng nội dung các entry MVU:
- [150] MVU Init: thêm default values cho biến quan trọng
- [152] Quy tắc cập nhật biến: chi tiết hóa logic sinh tồn + quy tắc nghiệp vụ
- [153] Định dạng xuất biến: bổ sung ví dụ, few-shot, edge cases
"""
import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

INPUT_FILE = 'Europe_1351_Card (1).json'
OUTPUT_FILE = 'Europe_1351_Card (1).json'

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    card = json.load(f)

entries = card['data']['character_book']['entries']

# ═══════════════════════════════════════════════
# ENTRY [150] — MVU Init: Mở rộng kiểm tra khởi tạo
# ═══════════════════════════════════════════════
init_content = """{{!-- Bộ khởi tạo biến MVU: Kiểm tra stat_data --}}
<%_ var _stat = getvar('stat_data', { defaults: undefined }); _%>
<%_ if (!_stat) { _%>
<INIT_REQUIRED>
⚠️ stat_data chưa được khởi tạo!

## QUY TRÌNH KHỞI TẠO BẮT BUỘC
Khi nhận thông tin tạo nhân vật từ người chơi, AI PHẢI thực hiện:

### Bước 1: Phân tích thông tin nhân vật
- Trích xuất TẤT CẢ thông tin từ form: tên, tuổi, giới tính, xuất thân, tôn giáo, kỹ năng...
- Xác định social_class → quyết định treasury, income, troops ban đầu
- Xác định homeland → quyết định current_location, origin_region, native_language

### Bước 2: Áp dụng giá trị mặc định theo đẳng cấp
| Đẳng cấp | treasury | income | knights | infantry | levies | garrison |
|-----------|----------|--------|---------|----------|--------|----------|
| Vua/Hoàng đế | 50000 | 5000 | 200 | 500 | 2000 | 500 |
| Công tước | 20000 | 2000 | 80 | 200 | 800 | 200 |
| Bá tước | 10000 | 1000 | 40 | 100 | 400 | 100 |
| Nam tước | 5000 | 500 | 15 | 50 | 150 | 50 |
| Hiệp sĩ | 2000 | 200 | 5 | 20 | 50 | 20 |
| Thương nhân | 8000 | 800 | 0 | 10 | 0 | 5 |
| Giáo sĩ | 3000 | 300 | 0 | 5 | 0 | 10 |
| Nông dân | 100 | 20 | 0 | 0 | 0 | 0 |
| Lang thang | 50 | 5 | 0 | 0 | 0 | 0 |

### Bước 3: Giá trị mặc định bắt buộc
- health_status = "Khỏe mạnh"
- mental_state = "Bình thường"
- stability_state = "Ổn định"
- world_phase = "Khởi đầu"
- time_of_day = "Sáng"
- season = "Xuân"
- current_scene = "Bắt đầu cuộc phiêu lưu"
- morale_personal = "Vững vàng"
- plague_status = "Chưa nhiễm"
- hunger = "No đủ"
- fatigue = "Tỉnh táo"
- reputation_church = "Trung lập"
- reputation_nobles = "Trung lập"
- reputation_commoners = "Trung lập"
- honor_level = 50
- piety = 50
- morale = 60
- discipline = 50
- stress_level = 0
- willpower = 50
- faith = 50
- tax_rate = 10
- yield_ratio = 3
- crime_rate = "Thấp"
- at_war = false
- excommunicated = false

### Bước 4: Xuất <UpdateVariable>
Xuất "op":"replace" cho TẤT CẢ 1090 biến. Biến không có thông tin → dùng giá trị mặc định (số=0, boolean=false, text="").
</INIT_REQUIRED>
<%_ } _%>"""

entries[150]['content'] = init_content
print(f'[150] MVU Init: {len(init_content)} chars (was 554)')

# ═══════════════════════════════════════════════
# ENTRY [152] — Quy tắc cập nhật biến: Mở rộng logic sinh tồn
# ═══════════════════════════════════════════════
rules_content = """<Variable_rules>
# ĐẠI ĐIỂN QUY TẮC MVU & LOGIC SINH TỒN

## 1. NGUYÊN TẮC CỐT LÕI
syntax_compliance:
  - BẮT BUỘC sử dụng tên biến chính xác tuyệt đối theo MVUZOD Schema
  - Đường dẫn JSON Patch phải là tuyệt đối (ví dụ: /health_status, /treasury)
  - Trường `value` chỉ chứa KẾT QUẢ CUỐI CÙNG, KHÔNG chứa phép tính
  - Dùng `delta` thay vì `replace` cho thay đổi số (ví dụ: +10, -5)
  - KHÔNG cập nhật biến bắt đầu bằng `_` (readonly)

## 2. LOGIC SINH TỒN — Mỗi hành động đều có hệ quả

### 2.1 Sức khỏe & Thể chất
- Chiến đấu bị thương → health_status thay đổi (Khỏe mạnh → Bị thương nhẹ → Bị thương nặng → Hấp hối → Chết)
- Không ăn > 2 ngày → hunger = "Đói lả", stress_level += 10, health_status xuống cấp
- Hành quân liên tục → fatigue = "Kiệt sức", morale -= 5, discipline -= 3
- Bị dịch hạch → plague_status = "Nhiễm bệnh", health_status = "Bệnh nặng", phải cách ly

### 2.2 Tinh thần & Ý chí
- Thua trận → morale -= 15, stress_level += 20, cowardice_count có thể tăng
- Thắng trận → morale += 10, reputation_nobles += 5, battle_exp += 1
- Mất người thân → stress_level += 30, mental_state = "Đau buồn"
- stress_level > 80 → mental_state = "Sắp suy sụp", quyết định kém hơn
- stress_level > 95 → mental_state = "Khủng hoảng", có thể hành động điên rồ

### 2.3 Kinh tế & Tài chính
- Mỗi tháng: treasury += income - expenses - total_army_cost
- Thuê lính: total_army_cost tăng, treasury giảm theo thời gian
- Xây dựng: treasury -= construction_cost, cần nhiều tháng hoàn thành
- Phá sản (treasury < 0): morale -= 20, quân đội đào ngũ, chư hầu nổi loạn
- Thu thuế cao (tax_rate > 30): crime_rate tăng, reputation_commoners -= 10

### 2.4 Quân sự & Chiến trận  
- Mỗi trận đánh: troops giảm tùy quy mô (5-30% casualties)
- Bao vây lâu: morale -= 5/tuần, hunger cho cả hai bên
- Đào ngũ khi morale < 20 hoặc không trả lương > 2 tháng
- Lính lê dương (mercenaries) đắt gấp 3 nhưng mạnh, có thể phản bội

### 2.5 Ngoại giao & Danh tiếng
- Bội ước → reputation_nobles -= 30, "trust" giảm mạnh
- Giúp đỡ Giáo hội → piety += 10, reputation_church += 15
- Tấn công nhà thờ → excommunication risk, piety = 0
- Kết hôn chính trị → alliance mới, nhưng ràng buộc

### 2.6 Tôn giáo & Đức tin
- piety < 20 → Giáo hội nghi ngờ, có thể bị điều tra dị giáo
- Bị rút phép thông công → excommunicated = true, mất mọi đồng minh Kitô giáo
- Hành hương → piety += 20, stress_level -= 15, nhưng tốn thời gian

## 3. QUY TẮC CẬP NHẬT BẮT BUỘC
- MỌI lượt trả lời AI phải kiểm tra: có biến nào thay đổi không?
- Nếu có → PHẢI xuất <UpdateVariable> cuối tin nhắn
- Nếu không có thay đổi → KHÔNG xuất <UpdateVariable>
- Khi thời gian trôi (ngày/tuần/tháng) → cập nhật time_of_day, season, các biến kinh tế theo chu kỳ
- Khi di chuyển → cập nhật current_location, distance_remaining, current_scene

## 4. RÀNG BUỘC GIÁ TRỊ
- health_status: ["Tráng kiện","Khỏe mạnh","Bị thương nhẹ","Bị thương nặng","Nguy kịch","Hấp hối","Chết"]
- mental_state: ["Minh mẫn","Bình thường","Căng thẳng","Đau buồn","Sắp suy sụp","Khủng hoảng","Điên loạn"]
- hunger: ["No đủ","Hơi đói","Đói","Đói lả","Chết đói"]
- fatigue: ["Tỉnh táo","Hơi mệt","Mệt mỏi","Kiệt sức","Sắp ngất"]
- plague_status: ["Chưa nhiễm","Nghi ngờ","Nhiễm bệnh","Hồi phục","Miễn dịch"]
- stability_state: ["Thịnh vượng","Ổn định","Bất ổn","Hỗn loạn","Sụp đổ"]
- world_phase: ["Khởi đầu","Phát triển","Xung đột","Chiến tranh","Tái thiết"]
- season: ["Xuân","Hạ","Thu","Đông"]
- time_of_day: ["Bình minh","Sáng","Trưa","Chiều","Hoàng hôn","Tối","Đêm khuya","Rạng sáng"]
- crime_rate: ["Rất thấp","Thấp","Trung bình","Cao","Rất cao","Hỗn loạn"]
- honor_level: 0-100 (0=ô nhục, 50=trung bình, 100=anh hùng)
- piety: 0-100 (0=vô đạo, 50=bình thường, 100=thánh nhân)
- stress_level: 0-100 (0=thư thái, 50=căng thẳng, 100=suy sụp)
- tax_rate: 0-100 (0=miễn thuế, 10=nhẹ, 30=nặng, 50+=bóc lột)
</Variable_rules>"""

entries[152]['content'] = rules_content
print(f'[152] Quy tắc cập nhật biến: {len(rules_content)} chars (was 514)')

# ═══════════════════════════════════════════════
# ENTRY [153] — Định dạng xuất biến: Bổ sung ví dụ + few-shot
# ═══════════════════════════════════════════════
format_content = """<Variable_format>
# ĐỊNH DẠNG XUẤT BIẾN MVU

## Quy tắc chung
- Xuất update analysis + commands cuối MỖI tin nhắn khi có thay đổi
- Dùng chuẩn JSON Patch (RFC 6902)
- Operations: replace, delta, insert, remove
- KHÔNG cập nhật biến bắt đầu bằng `_` (readonly)
- Tên biến PHẢI khớp CHÍNH XÁC với MVUZOD Schema

## Cấu trúc bắt buộc
```
<UpdateVariable>
<Analysis>
english_checklist:
  step0_IDENTITY_INITIALIZATION:
    - extract_profile: "CRITICAL: If values are empty, extract from user's prompt"
  step1_MANDATORY_FULL_SYNC:
    - rule: "MUST output 'replace' for ALL changed paths"
  step2_CHANGES:
    - list each changed variable with reason
</Analysis>
[
  {"op":"replace","path":"/variable_name","value":"new_value"},
  {"op":"delta","path":"/numeric_var","value":-5},
  {"op":"insert","path":"/array_var","value":"new_item"},
  {"op":"remove","path":"/variable_name"}
]
</UpdateVariable>
```

## Ví dụ 1: Nhân vật bị tấn công và mất tiền
```
<UpdateVariable>
<Analysis>
english_checklist:
  step2_CHANGES:
    - health_status: "Khỏe mạnh" → "Bị thương nhẹ" (stabbed by bandit)
    - pocket_money: lost 15 coins to robbery
    - stress_level: +10 from attack
    - current_scene: changed to aftermath
    - morale_personal: decreased from fear
</Analysis>
[
  {"op":"replace","path":"/health_status","value":"Bị thương nhẹ"},
  {"op":"delta","path":"/pocket_money","value":-15},
  {"op":"delta","path":"/stress_level","value":10},
  {"op":"replace","path":"/current_scene","value":"Sau cuộc phục kích"},
  {"op":"replace","path":"/morale_personal","value":"Dao động"}
]
</UpdateVariable>
```

## Ví dụ 2: Di chuyển đến thành phố mới
```
<UpdateVariable>
<Analysis>
english_checklist:
  step2_CHANGES:
    - current_location: moved to Paris
    - current_scene: entering the city gates
    - time_of_day: evening arrival
    - distance_remaining: arrived (0)
    - fatigue: tired from journey
</Analysis>
[
  {"op":"replace","path":"/current_location","value":"Paris"},
  {"op":"replace","path":"/current_scene","value":"Cổng thành Paris"},
  {"op":"replace","path":"/time_of_day","value":"Hoàng hôn"},
  {"op":"replace","path":"/distance_remaining","value":0},
  {"op":"replace","path":"/fatigue","value":"Mệt mỏi"}
]
</UpdateVariable>
```

## Ví dụ 3: Trận đánh và hệ quả
```
<UpdateVariable>
<Analysis>
english_checklist:
  step2_CHANGES:
    - infantry: lost 30 in battle
    - archers: lost 12
    - battle_exp: gained from combat
    - morale: boosted from victory
    - reputation_nobles: fame from winning
    - treasury: looted 500 gold
    - prisoners: captured 15
    - current_scene: battlefield aftermath
</Analysis>
[
  {"op":"delta","path":"/infantry","value":-30},
  {"op":"delta","path":"/archers","value":-12},
  {"op":"delta","path":"/battle_exp","value":1},
  {"op":"delta","path":"/morale","value":10},
  {"op":"delta","path":"/reputation_nobles","value":5},
  {"op":"delta","path":"/treasury","value":500},
  {"op":"delta","path":"/prisoners","value":15},
  {"op":"replace","path":"/current_scene","value":"Chiến trường sau trận đánh"}
]
</UpdateVariable>
```

## Ví dụ 4: Chu kỳ tháng (kinh tế + thời gian)
```
<UpdateVariable>
<Analysis>
english_checklist:
  step2_CHANGES:
    - season: Spring → Summer
    - treasury: monthly income - expenses
    - harvest: summer growth bonus
    - tax collected this month
    - army cost deducted
</Analysis>
[
  {"op":"replace","path":"/season","value":"Hạ"},
  {"op":"delta","path":"/treasury","value":800},
  {"op":"delta","path":"/harvest","value":200},
  {"op":"replace","path":"/tax_collected_this_month","value":500},
  {"op":"delta","path":"/total_army_cost","value":0}
]
</UpdateVariable>
```

## Ví dụ 5: Gặp NPC mới
```
<UpdateVariable>
<Analysis>
english_checklist:
  step2_CHANGES:
    - npc1_name: new NPC introduced
    - npc1_role: merchant
    - npc1_relation: neutral first meeting
    - npc1_location: same as player
    - current_scene: updated
</Analysis>
[
  {"op":"replace","path":"/npc1_name","value":"Marco di Venezia"},
  {"op":"replace","path":"/npc1_role","value":"Thương nhân Venetian"},
  {"op":"replace","path":"/npc1_relation","value":"Trung lập"},
  {"op":"replace","path":"/npc1_location","value":"Chợ trung tâm"},
  {"op":"replace","path":"/npc1_mood","value":"Thân thiện"},
  {"op":"replace","path":"/npc1_status","value":"Khỏe mạnh"},
  {"op":"replace","path":"/current_scene","value":"Gặp thương nhân tại chợ"}
]
</UpdateVariable>
```

## LƯU Ý QUAN TRỌNG
1. LUÔN xuất <UpdateVariable> khi có BẤT KỲ thay đổi nào
2. Analysis phải bằng TIẾNG ANH (để dễ debug)
3. Value cho biến text phải bằng TIẾNG VIỆT
4. Dùng delta cho SỐ (không replace), ví dụ: {"op":"delta","path":"/treasury","value":-100}
5. Nếu biến chưa tồn tại trong stat_data → dùng replace để tạo mới
6. KHÔNG bỏ sót biến — nếu nhân vật di chuyển thì cập nhật current_location VÀ current_scene VÀ distance_remaining
</Variable_format>"""

entries[153]['content'] = format_content
print(f'[153] Định dạng xuất biến: {len(format_content)} chars (was 760)')

# ═══════════════════════════════════════════════
# Save
# ═══════════════════════════════════════════════
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(card, f, ensure_ascii=False, indent=2)

print(f'\n✅ Đã mở rộng nội dung 3 entries MVU!')
print(f'  [150] MVU Init: {len(init_content)} chars — bảng giá trị mặc định theo đẳng cấp')
print(f'  [152] Quy tắc: {len(rules_content)} chars — logic sinh tồn chi tiết')
print(f'  [153] Định dạng: {len(format_content)} chars — 5 ví dụ few-shot')
