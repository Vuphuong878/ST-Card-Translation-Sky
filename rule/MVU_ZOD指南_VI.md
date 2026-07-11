# Hướng dẫn quy trình hoàn chỉnh về MVU ZOD

> **Môi trường áp dụng:** SillyTavern + Tavern Helper + framework biến MVU ZOD
> **Biên soạn:** 秋青子 (Qiu Qingzi)
> **Ngày cập nhật:** 04/03/2026

> **Bản dịch tiếng Việt:** 10/07/2026
> **Ghi chú bản địa hóa:** Phần giải thích và quy trình đã được chuyển sang tiếng Việt. Các khối mã, tên API, tên biến, đường dẫn và tiền tố cố định được giữ nguyên để có thể sao chép và chạy đúng trong môi trường gốc.

---

## Mục lục

1. [Tổng quan hệ thống](#mvu-01)
2. [Bước 1: Thiết kế script cấu trúc biến](#mvu-02)
3. [Bước 2: Khởi tạo biến](#mvu-03)
4. [Bước 3: Xác minh biến đã hoạt động chưa](#mvu-04)
5. [Bước 4: Đặt giá trị ban đầu khác nhau cho từng mở đầu](#mvu-05)
6. [Bước 5: Viết prompt về biến](#mvu-06)
7. [Bước 6: Cấu hình regex của SillyTavern](#mvu-07)
8. [Bước 7: Tương thích với hai phương thức cập nhật biến](#mvu-08)
9. [Script Tavern Helper: điều khiển biến ở chế độ nền](#mvu-09)
10. [Giao diện Tavern Helper: hiển thị và sửa biến](#mvu-10)
11. [Tiền tố biến đặc biệt](#mvu-11)
12. [Tra cứu nhanh cú pháp Zod 4](#mvu-12)
13. [Câu hỏi thường gặp](#mvu-13)

---

<a id="mvu-01"></a>

## Tổng quan hệ thống

MVU ZOD là khung quản lý biến của SillyTavern. Toàn bộ hệ thống bao gồm các bộ phận sau:

```
角色卡/
├── 变量结构脚本          ← Zod Schema，定义变量的类型和约束（角色脚本）
├── [initvar] 初始变量    ← YAML，设定开局变量值（世界书条目，禁用状态）
├── 变量列表              ← 让 AI 看到当前变量值（世界书条目）
├── [mvu_update] 变量更新规则  ← 告诉 AI 何时更新变量（世界书条目）
├── [mvu_update] 变量输出格式  ← 告诉 AI 用什么格式更新变量（世界书条目）
├── 酒馆正则              ← 隐藏 <UpdateVariable> 块，处理界面占位符
├── 酒馆助手脚本（可选）   ← 监听 MVU 事件，后台控制变量
└── 前端界面（可选）       ← 通过 <StatusPlaceHolderImpl/> 占位符显示状态栏
```

### Quy trình làm việc cốt lõi

1. **Script cấu trúc biến** xác định kiểu dữ liệu và ràng buộc của biến
2. **initvar** đặt giá trị ban đầu
3. **Danh sách biến** cho AI thấy giá trị hiện tại
4. **Quy tắc cập nhật biến** cho AI biết khi nào cần cập nhật
5. **Định dạng đầu ra biến** yêu cầu AI xuất lệnh cập nhật theo JSON Patch
6. Script MVU phân tích lệnh trong câu trả lời của AI rồi cập nhật biến thật
7. Script cấu trúc biến kiểm tra và sửa giá trị sau khi cập nhật

---

<a id="mvu-02"></a>

## Bước 1: Thiết kế script cấu trúc biến

### Trước tiên, xác định những biến cần theo dõi

Trước khi viết thẻ, hãy xác định những dữ liệu mà thẻ cần theo dõi:

- Thẻ thiên về tình cảm → độ thiện cảm, trang phục, danh hiệu
- Thẻ phiêu lưu → túi đồ, kỹ năng, nhiệm vụ
- Thẻ hệ thống → danh sách nhiệm vụ, vật phẩm trong cửa hàng

**Không dùng macro như `{{user}}` làm tên biến; hãy dùng tên biến cố định như `主角`.**

### Mẫu script (phần đầu và cuối cố định)

```js
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const Schema = z.object({
  // 在这里定义变量结构
});

$(() => {
  registerMvuSchema(Schema);
});
```

**Phần đầu và phần cuối phải được giữ nguyên.** `z` (Zod 4) và `_` (Lodash) đã có sẵn toàn cục; **không import** chúng.

### Ví dụ hoàn chỉnh

```js
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const Schema = z.object({
  世界: z.object({
    当前时间: z.string(),
    当前地点: z.string(),
    近期事务: z.record(z.string().describe('事务名'), z.string().describe('事务描述')),
  }),

  白娅: z
    .object({
      依存度: z.coerce.number().transform(v => _.clamp(v, 0, 100)),
      着装: z.record(z.enum(['上装', '下装', '内衣', '袜子', '鞋子', '饰品']), z.string().describe('服装描述')),
      称号: z.record(
        z.string().describe('称号名'),
        z.object({
          效果: z.string(),
          自我评价: z.string().prefault('待评价'),
        }),
      ),
    })
    .transform(data => {
      data.称号 = _(data.称号)
        .entries()
        .takeRight(Math.ceil(data.依存度 / 10))
        .fromPairs()
        .value();
      return data;
    }),

  主角: z.object({
    物品栏: z
      .record(
        z.string().describe('物品名'),
        z.object({
          描述: z.string(),
          数量: z.coerce.number().prefault(1),
        }),
      )
      .transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0)),
  }),
});

$(() => {
  registerMvuSchema(Schema);
});
```

Ví dụ này có:

- **Mức độ phụ thuộc được giới hạn trong khoảng 0~100**: `z.coerce.number().transform(v => _.clamp(v, 0, 100))`
- **Giá trị tự đánh giá mặc định**: `z.string().prefault('待评价')` - tự động đặt thành "Đang chờ đánh giá" nếu AI không điền
- **Giới hạn số danh hiệu**: mức độ phụ thuộc càng cao thì có thể giữ càng nhiều danh hiệu; khi vượt giới hạn, danh hiệu cũ nhất bị xóa
- **Tự động xóa nếu số lượng mặt hàng không dương**: `.transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0))`
- **Số lượng vật phẩm mặc định là 1**: `z.coerce.number().prefault(1)`

### Vị trí lưu trữ

Trong **thư viện script Tavern Helper → script nhân vật**, tạo một script nhân vật tên `变量结构`, rồi dán đoạn script ở trên vào.

---

<a id="mvu-03"></a>

## Bước 2: Khởi tạo biến

### Viết giá trị ban đầu (định dạng YAML)

Giá trị ban đầu của một biến phải tương ứng với cấu trúc biến:

```yaml
世界:
  当前时间: 2024-04-08 10:45
  当前地点: 私立风祭学院 高中部 2年A班教室
  近期事务:
    转学生安置: 白娅刚刚转入，需要领取教材、熟悉校园环境
    座位调整: 班长正在确认最终的座位表，可能会有微调
    午休临近: 还有一节课就是午休，是接触白娅的机会
白娅:
  依存度: 35
  着装:
    上装: 整洁的深蓝色校服外套，一丝不苟地扣好每一颗纽扣
    下装: 规整的深蓝色百褶裙，长度恰好及膝
    内衣: 素白色内衣套装
    袜子: 黑色过膝袜，没有一丝皱褶
    鞋子: 黑色皮质学生鞋，擦得锃亮
    饰品: 无
  称号:
    行尸:
      效果: 日常行动带有明显的倦怠感与机械感
      自我评价: 活着本身就是惩罚
    逃避者:
      效果: 对来自<user>的任何接触都会本能回避
      自我评价: 我不配出现在他的生活里
主角:
  物品栏:
    陈旧的创可贴:
      描述: 钱包夹层里放了两年的卡通创可贴，粘性大概已经失效了
      数量: 1
    薄荷糖:
      描述: 提神用的强力薄荷糖，以前她很讨厌这个味道
      数量: 1
```

### Cấu hình mục World Info

- **Tên mục**: `[initvar]变量初始化勿开`
- **Trạng thái**: **bắt buộc tắt** — MVU chỉ đọc mục initvar đang bị tắt

---

<a id="mvu-04"></a>

## Bước 3: Xác minh biến đã hoạt động chưa

Đảm bảo hai điểm sau:

1. Cấu hình API (biểu tượng phích cắm ở góc trên bên trái) chọn **Chat Completion**
2. Thẻ nhân vật đã có **tin nhắn mở đầu**

Sau đó, **mở một cuộc trò chuyện mới** và sử dụng `酒馆输入框左边魔棒 → 日志查看器` để xem `【脚本|变量结构】: 变量结构注册成功` có xuất hiện hay không.

Xem kết quả khởi tạo biến thông qua `酒馆输入框左边魔棒 → 变量管理器 → 消息楼层`.

### Khắc phục sự cố thường gặp

**Không thấy `【脚本|变量结构】变量结构注册成功` trong trình xem nhật ký:**
- Điều này cho thấy script cấu trúc biến có lỗi
- Sao chép mọi dòng nhật ký bắt đầu bằng `【脚本|变量结构】` và gửi cho AI để sửa

**Dòng màu vàng `【脚本|MVU】发生变量更新错误`:**
- Điều này cũng cho thấy script cấu trúc biến có lỗi

**Dòng màu đỏ `【脚本|变量结构】变量初始化失败`:**
- YAML trong mục initvar có lỗi
- Sao chép nhật ký và gửi cho AI để sửa

---

<a id="mvu-05"></a>

## Bước 4: Đặt giá trị ban đầu khác nhau cho từng mở đầu

Mỗi phần mở đầu của thẻ nhân vật thường là một kịch bản khác nhau và cần giá trị biến ban đầu riêng.

### Phương án 1: Toàn bộ giá trị (`<initvar>`)

Trong tin nhắn mở đầu, bọc toàn bộ giá trị ban đầu tương ứng bằng `<initvar>...</initvar>`:

```text
开局 2 的故事...

<UpdateVariable>
<initvar>
世界:
  当前时间: 2025年4月7日 星期一 08:42
  当前地点: 私立星见学园·2年A班教室
  近期事务:
    白娅转学: 白娅刚刚转入私立星见学园2年A班
白娅:
  依存度: 15
  着装:
    上装: 整洁的私立星见学园女生制服
    ...
主角:
  物品栏:
    旧手帕:
      描述: 角落绣着歪歪扭扭小兔子的手帕
      数量: 1
</initvar>
</UpdateVariable>
```

Bạn cũng có thể bao bọc một khối mã (```yaml ... ```) trong một khối `<initvar>`.

**Quy tắc ưu tiên:**

- Nếu phần mở đầu có `<initvar>...</initvar>`, MVU **bỏ qua hoàn toàn** mục `[initvar]变量初始化勿开`
- Nếu không có `<initvar>...</initvar>`, MVU dùng mục `[initvar]变量初始化勿开`

Bạn hoàn toàn có thể bỏ qua cài đặt `[initvar]` mục trong World Info, mà thay vào đó đặt `<initvar>` khối cho mỗi lần mở.

### Phương án 2: Cập nhật tăng dần (JSON Patch)

Nếu chỉ có một hoặc hai biến khác nhau trong các lần bắt đầu khác nhau, bạn có thể sử dụng lệnh cập nhật biến trong thông báo bắt đầu để thực hiện các sửa đổi gia tăng:

```text
开局 2 剧情...

<UpdateVariable>
<JSONPatch>
[
  { "op": "replace", "path": "/白川璃/挫折剧情开关", "value": true }
]
</JSONPatch>
</UpdateVariable>
```

Trước tiên, thao tác này sẽ sử dụng `[initvar]` mục khởi tạo, sau đó áp dụng các bản cập nhật gia tăng khi bắt đầu (Tầng 0).

---

<a id="mvu-06"></a>

## Bước 5: Viết prompt về biến

Prompt về biến giúp AI hiểu hệ thống biến và gồm ba phần:

### 5.1 Danh sách biến — Cho AI thấy giá trị biến hiện tại

**Nội dung (cố định, sao chép trực tiếp):**

```yaml
---
<status_current_variable>
{{format_message_variable::stat_data}}
</status_current_variable>
```

`{{format_message_variable::stat_data}}` là macro của Tavern Helper; khi chạy, nó được thay bằng toàn bộ giá trị biến hiện tại ở định dạng YAML.

**Cấu hình mục World Info:**

- **Tên mục**: `变量列表` (**không** thêm tiền tố `[mvu_update]`)
- **Vị trí**: D-gear ở độ sâu 0 hoặc 1
- **Thứ tự**: 200

**Tại sao đặt ở D0 hoặc D1?** Danh sách biến phải tương ứng với diễn biến mới nhất. Nếu đặt ở D3 hoặc D2, nó sẽ nằm giữa hai câu trả lời và AI có thể tưởng đó là dữ liệu cũ.

#### Hiển thị có chọn lọc các biến

Bạn có thể hiển thị các biến chi tiết hơn:

```yaml
---
<status_current_variable>
世界:
  {{format_message_variable::stat_data.世界}}
白娅:
  依存度: {{format_message_variable::stat_data.白娅.依存度}}
  着装:
    {{format_message_variable::stat_data.白娅.着装}}
  称号:
    {{format_message_variable::stat_data.白娅.称号}}
主角:
  {{format_message_variable::stat_data.主角}}
</status_current_variable>
```

Bạn cũng có thể tách danh sách biến thành nhiều mục, một số đặt blue-light và số khác đặt green-light để điều khiển chi tiết hơn.

#### Giải thích chi tiết ý nghĩa của biến

Một số biến cần được giải thích rõ hơn. Ví dụ, khi `白娅.依存度` bằng 23 thì trạng thái tâm lý của Bai Ya là gì? Có thể tạo một mục mới tên `角色阶段`:

```yaml
白娅当前行为: # 白娅当前依存度为{{format_message_variable::stat_data.白娅.依存度}}
  # 0~19 时
  消极自毁: ...
  # 20~39 时
  渴求注视: ...
  # 40~59 时
  暗中靠近: ...
  ...
```

Nhưng cách này gửi prompt của mọi giai đoạn, vừa tốn token vừa dễ làm AI nhầm lẫn. Hãy dùng **EJS Prompt Template** (xem [Hướng dẫn EJS bằng tiếng Việt](../EJS使用/EJS实战指南_2026_ZOD版_VI.md)) để chỉ gửi giai đoạn tương ứng với mức độ phụ thuộc hiện tại.

### 5.2 Quy tắc cập nhật biến — Cho AI biết khi nào cần cập nhật biến

**Ví dụ:**

```yaml
---
变量更新规则:
  世界:
    当前时间:
      format: YYYY年MM月DD日 星期X HH:MM
    近期事务:
      type: |-
        {
          [事务名: string]: string; // 事务描述
        }
      check:
        - 记录需要完成的任务、约定、重要事件等
        - 完成后从列表中移除，新增事务时及时添加
        - 最多保持5-8项活跃事务
  白娅:
    依存度:
      type: number
      range: 0~100
      check:
        - 根据白娅对<user>行为的感知和反应调整 ±(3~6)
        - 仅在白娅当前察觉到<user>的行为时才更新
    着装.${上装|下装|内衣|袜子|鞋子|饰品}:
      check:
        - 换装、衣物损坏、特殊场合时更新
        - 描述需包含颜色、材质、款式等细节
    称号:
      type: |-
        {
          [称号名: string]: {
            效果: string;
            自我评价?: string;  // 默认为 '待评价'
          }
        }
      check:
        - 基于白娅的重要行为、心理变化或与<user>的互动获得
        - 称号应反映白娅当前的依存状态和心理发展
        - 最多保持Math.ceil(依存度/10)个称号，超出时移除最早获得的
  主角:
    物品栏:
      type: |-
        {
          [物品名: string]: {
            描述: string;
            数量?: number;  // 默认为 1
          }
        }
      check:
        - 获取、消耗、丢弃物品时更新数量
        - 数量归零后该条目不再显示
```

#### Ý nghĩa của từng trường

| Trường | Ý nghĩa |
| --- | --- |
| `type` | Kiểu biến, chẳng hạn `number` hoặc định nghĩa kiểu TypeScript; có thể bỏ qua với chuỗi |
| `range` | Phạm vi của biến số, chẳng hạn `0~100` |
| `format` | Yêu cầu định dạng cụ thể, chẳng hạn như định dạng thời gian |
| `check` | Những điều AI phải kiểm tra khi cập nhật biến — **đây là phần quan trọng nhất** |

#### Kỹ thuật viết

- **Bỏ qua biến có ý nghĩa quá rõ**: tên như `世界.当前地点` đã cho AI biết cách cập nhật, nên không cần thêm quy tắc
- **Gộp các biến cùng loại**: có thể gộp `白娅.着装.${上装|下装|内衣|袜子|鞋子|饰品}` vào một quy tắc
- **Không ghi biến chỉ đọc**: Các trường bắt đầu bằng `_` không cần cập nhật quy tắc
- **Đặt khóa động trong `type`**: các khóa dưới `称号` như `称号名` là tùy ý, nên mô tả bằng index signature trong `type`

#### Dùng trực tiếp cấu trúc biến làm quy tắc cập nhật

Bạn cũng có thể sử dụng cấu trúc biến trực tiếp trong phần `type` cập nhật các quy tắc:

```yaml
变量更新规则:
  白娅:
    依存度:
      type: z.coerce.number().transform(v => _.clamp(v, 0, 100))
      check:
        - 根据白娅对<user>行为的感知和反应调整 ±(3~6)
```

Hoặc sao chép toàn bộ cấu trúc biến và sử dụng `/** 更新说明 */` để nhận xét từng trường.

#### Vị trí chèn

**Quy tắc cập nhật biến không cần đặt ở D0/D1** — nó không ảnh hưởng đến việc AI hiểu cốt truyện. Có thể đặt trước/sau phần định nghĩa nhân vật hoặc ở D3/D4 để giảm nhiễu cho các prompt khác. Chuỗi suy luận trong định dạng đầu ra biến sẽ giúp AI “nhớ lại” các quy tắc này.

**Cấu hình mục World Info:**

- **Tên mục**: `[mvu_update]变量更新规则` (**phải có** `[mvu_update]`)
- **Vị trí**: D-gear ở độ sâu 0 (hoặc trước/sau phần định nghĩa nhân vật)
- **Thứ tự**: 200

### 5.3 Định dạng đầu ra biến — Quy định định dạng lệnh cập nhật của AI

**Nội dung (cố định, sao chép trực tiếp):**

```yaml
---
变量输出格式:
  rule:
    - you must output the update analysis and the actual update commands at once in the end of the next reply
    - the update commands works like the **JSON Patch (RFC 6902)** standard, must be a valid JSON array containing operation objects, but supports the following operations instead:
      - replace: replace the value of existing paths
      - delta: update the value of existing number paths by a delta value
      - insert: insert new items into an object or array (using `-` as array index intends appending to the end)
      - remove
      - move
    - don't update field names starts with `_` as they are readonly, such as `_变量`
  format: |-
    <UpdateVariable>
    <Analysis>$(IN ENGLISH, no more than 80 words)
    - ${calculate time passed: ...}
    - ${decide whether dramatic updates are allowed as it's in a special case or the time passed is more than usual: yes/no}
    - ${analyze every variable based on its corresponding `check`, according only to current reply instead of previous plots: ...}
    </Analysis>
    <JSONPatch>
    [
      { "op": "replace", "path": "${/path/to/variable}", "value": "${new_value}" },
      { "op": "delta", "path": "${/path/to/number/variable}", "value": "${positive_or_negative_delta}" },
      { "op": "insert", "path": "${/path/to/object/new_key}", "value": "${new_value}" },
      { "op": "insert", "path": "${/path/to/array/-}", "value": "${new_value}" },
      { "op": "remove", "path": "${/path/to/object/key}" },
      { "op": "remove", "path": "${/path/to/array/0}" },
      { "op": "move", "from": "${/path/to/variable}", "to": "${/path/to/another/path}" },
      ...
    ]
    </JSONPatch>
    </UpdateVariable>
```

Một phiên bản tiếng Trung cũng có sẵn:

```yaml
---
变量输出格式:
  rule:
    - 你必须在回复末尾输出更新分析和实际的更新命令
    - 更新命令效果与**JSON Patch (RFC 6902)**标准类似，有效的 JSON 数组，其中每个元素都是表示单个操作的对象，但支持的是以下操作而不是标准操作：
      - replace: 替换已存在变量的值
      - delta: 用一个变动值更新已存在的数值变量
      - insert: 插入新元素到对象或数组中 (使用`-`作为数组索引则表示追加到末尾)
      - remove
    - 不要更新以`_`开头的变量，因为它们是只读的，例如`_变量`
  format: |-
    <UpdateVariable>
    <Analysis>$(按英文输出，不超过80词)
    - ${计算经过的时间: ...}
    - ${根据当前情节是否足够特殊、时间跨度是否远超正常情况，判断是否允许变量值发生戏剧性变化: 是/否}
    - ${基于变量对应的`check`，仅根据当前回复而不是之前的剧情来分析每个变量是否需要更新: ...}
    </Analysis>
    <JSONPatch>
    [
      { "op": "replace", "path": "${/到/变量/的路径}", "value": "${新值}" },
      { "op": "delta", "path": "${/到/数值/变量/的路径}", "value": "${正或负的变动值}" },
      { "op": "insert", "path": "${/到/对象/新键/的路径}", "value": "${新值}" },
      { "op": "insert", "path": "${/到/数组/-}", "value": "${新值}" },
      { "op": "remove", "path": "${/到/对象/键/的路径}" },
      { "op": "remove", "path": "${/到/数组/的路径/0}" },
      ...
    ]
    </JSONPatch>
    </UpdateVariable>
```

#### Giải thích định dạng

Định dạng này dùng cú pháp **đầu ra bổ sung**:

- Phần `rule`: AI chỉ đọc, không xuất ra; phần này quy định vị trí (cuối câu trả lời) và chuẩn định dạng (JSON Patch)
- Phần `format`: AI xuất theo mẫu này, trong đó:
  - `${描述}`: AI thay thế mô tả bằng nội dung tương ứng
  - `$(要求)`: AI làm theo yêu cầu nhưng không xuất chính dấu này
  - `...`: AI bổ sung đầu ra bằng cách bắt chước định dạng trước đó
  - Nội dung còn lại được xuất nguyên văn (các thẻ như `<UpdateVariable>`, `<Analysis>`, v.v.)

#### Vai trò của chuỗi suy luận `<Analysis>`

`<Analysis>` là chuỗi suy luận chuyên dùng cho việc cập nhật biến, để AI phân tích trước khi thao tác:

1. **Tính toán thay đổi thời gian**
2. **Xác định xem có cho phép thay đổi mạnh hay không** (ví dụ: độ thiện cảm giảm trực tiếp từ 100 xuống 0)
3. **Nhớ lại các quy tắc `check` cho từng biến và phân tích xem có cần cập nhật hay không** — điều này sẽ "gợi lại" sự chú ý của AI đối với quy tắc cập nhật biến

#### Giải thích thao tác JSON Patch

| Thao tác | Giải thích | Ví dụ đường dẫn |
| --- | --- | --- |
| `replace` | Thay thế các giá trị của đường dẫn hiện có | `/白娅/依存度` |
| `delta` | Tăng và giảm giá trị số (tăng dương hoặc giảm âm) | `/白娅/依存度` |
| `insert` | Chèn một khóa mới vào một đối tượng hoặc thêm (`-`) vào một mảng | `/主角/物品栏/新物品` hoặc `/记忆/-` |
| `remove` | Xóa đường dẫn | `/主角/物品栏/薄荷糖` |
| `move` | Di chuyển đường dẫn | `from: /a`, `to: /b` |

**Quy tắc đường dẫn:** dùng `/` để phân tách và bắt đầu từ gốc biến (**không cần** tiền tố `stat_data`).

#### Ví dụ đầu ra thực tế của AI

```text
剧情部分...

<UpdateVariable>
<Analysis>
- Time advanced by 10 minutes (from 10:47 to 10:57).
- Special Case? No, routine plot progression.
- 白娅.依存度: Baiya showed a strong reaction, warranting an increase.
- 主角.物品栏: The mints were placed on Baiya's desk. Should be removed.
</Analysis>
<JSONPatch>
[
  { "op": "replace", "path": "/世界/当前时间", "value": "2024-04-08 10:57" },
  { "op": "replace", "path": "/白娅/依存度", "value": 40 },
  { "op": "remove", "path": "/主角/物品栏/薄荷糖" }
]
</JSONPatch>
</UpdateVariable>
```

**Cấu hình mục World Info:**

- **Tên mục**: `[mvu_update]变量输出格式` (**phải có** `[mvu_update]`)
- **Vị trí**: D-gear ở độ sâu 0 (Gemini) hoặc 4 (Claude)
- **Thứ tự**: 200

### 5.4 Nhấn mạnh định dạng đầu ra biến (tùy chọn)

Nếu AI thường bỏ qua khối `<UpdateVariable>`, hãy thêm mục nhấn mạnh sau:

```yaml
---
变量输出格式强调:
  rule: The following must be inserted to the end of reply, and cannot be omitted
  format: |-
    <UpdateVariable>
    ...
    </UpdateVariable>
```

**Cấu hình mục World Info:**

- **Tên mục**: `[mvu_update]变量输出格式强调` (**phải có** `[mvu_update]`)
- **Vị trí**: D-gear ở độ sâu 0
- **Thứ tự**: 200

---

<a id="mvu-07"></a>

## Bước 6: Cấu hình regex của SillyTavern

Khối `<UpdateVariable>` do AI xuất đã được MVU phân tích và sử dụng, nên không cần gửi lại cho AI; làm vậy chỉ tốn token và có thể khiến AI sao chép lười biếng hoặc cập nhật trùng.

### Nhập các regex dựng sẵn

Mở `酒馆右上角积木按钮 → 正则`, rồi nhập ba regex của một trong các phiên bản dưới đây vào regex cục bộ:

- **Phiên bản đẹp**: `[不发送]去除变量更新`, `[美化]变量更新中`, `[美化]完整变量更新`
- **Phiên bản có thể gập lại**: `[不发送]去除变量更新`, `[折叠]变量更新中`, `[折叠]完整变量更新`
- **Phiên bản chỉ nhắc**: `[不发送]去除变量更新`, `[仅提示]变量更新中`, `[仅提示]完整变量更新`

Chức năng của từng regex:

- **`去除变量更新`**: dùng `仅格式提示词` để thay `<UpdateVariable>` bằng chuỗi rỗng khi gửi cho AI
- **`变量更新中`/`完整变量更新`**: dùng `仅格式显示` để làm đẹp phần hiển thị `<UpdateVariable>`

### Giữ lại vài tin nhắn gần nhất để gửi cho AI (tùy chọn)

Nếu AI lặp lại một cập nhật đã làm (ví dụ cứ tăng độ thiện cảm vì cùng một tình tiết “hẹn hò”), có thể giữ lại khối `<UpdateVariable>` của một hoặc hai tin nhắn gần nhất để gửi cho AI.

Đặt **độ sâu tối thiểu** của regex `去除变量更新` thành 4, tức regex chỉ áp dụng từ tin nhắn thứ 5 tính từ cuối trở lên. Đổi lại sẽ tốn thêm một ít token.

---

<a id="mvu-08"></a>

## Bước 7: Tương thích với hai phương thức cập nhật biến

MVU hỗ trợ hai phương thức cập nhật:

- **Đi kèm đầu ra AI**: AI xuất cốt truyện trước, rồi xuất lệnh cập nhật
- **Dùng model phụ để phân tích**: một AI xuất cốt truyện, AI khác xuất lệnh cập nhật

Tiền tố `[mvu_update]` được thiết kế cho mục đích này:

- Tên chứa `[mvu_plot]` → chỉ được gửi đến AI chịu trách nhiệm về câu chuyện
- Tên chứa `[mvu_update]` → chỉ được gửi đến AI chịu trách nhiệm cập nhật các biến
- Tên không chứa tiền tố nào → gửi cho cả hai AI

Với cách đặt tên trong hướng dẫn này (`变量列表`, `[mvu_update]变量更新规则`, `[mvu_update]变量输出格式`), thẻ nhân vật tự động tương thích với cả hai phương thức.

---

<a id="mvu-09"></a>

## Script Tavern Helper: điều khiển biến ở chế độ nền

Cấu trúc biến chỉ có thể kiểm tra hoặc sửa giá trị sau cập nhật. Muốn đọc giá trị cũ, so sánh thay đổi, tương tác với SillyTavern hoặc làm những việc phức tạp hơn, bạn cần script Tavern Helper.

### Điều kiện tiên quyết

Phải thêm dòng sau ở đầu mã:

```js
await waitGlobalInitialized('Mvu');
```

### Lắng nghe COMMAND_PARSED (đã phân tích xong lệnh cập nhật)

Khắc phục trước khi lệnh cập nhật được áp dụng:

```js
await waitGlobalInitialized('Mvu');
eventOn(Mvu.events.COMMAND_PARSED, commands => {
  commands.forEach(command => {
    /* 修复 Gemini 在中文间加入的 '-' */
    command.args[0] = command.args[0].replaceAll('-', '');
  });
});
```

### Lắng nghe VARIABLE_UPDATE_ENDED (đã cập nhật biến xong)

Truy xuất các biến trước và sau khi cập nhật và thực hiện xử lý bổ sung:

```js
await waitGlobalInitialized('Mvu');
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (new_variables, old_variables) => {
  toastr.info(`更新前依存度: ${_.get(old_variables, 'stat_data.白娅.依存度')}`);
  toastr.info(`更新后依存度: ${_.get(new_variables, 'stat_data.白娅.依存度')}`);
});
```

**Ví dụ phổ biến:**

```js
await waitGlobalInitialized('Mvu');

/* 限制变动幅度不超过 3 */
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (new_variables, old_variables) => {
  const old_value = _.get(old_variables, 'stat_data.白娅.依存度');
  _.update(new_variables, 'stat_data.白娅.依存度', value => _.clamp(value, old_value - 3, old_value + 3));
});

/* 检测好感度突破 30 */
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (new_variables, old_variables) => {
  const old_value = _.get(old_variables, 'stat_data.白娅.依存度');
  const new_value = _.get(new_variables, 'stat_data.白娅.依存度');
  if (old_value < 30 && new_value >= 30) {
    toastr.success('白娅依存度突破 30 了!');
  }
});

/* 让 AI 不能更新某个变量 */
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (new_variables, old_variables) => {
  _.set(new_variables, 'stat_data.白娅.依存度', _.get(old_variables, 'stat_data.白娅.依存度'));
});

/* 角色死亡时删除所有相关变量 */
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, variables => {
  if (_.get(variables, 'stat_data.青空莉.死亡') === true) {
    _.unset(variables, 'stat_data.青空莉');
  }
});

/* 记录好感度第一次超过 30 */
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, variables => {
  if (_.get(variables, 'stat_data.白娅.依存度') > 30) {
    _.set(variables, 'stat_data.$flag.白娅依存度突破30', true);
  }
});
```

### Nhận/cập nhật biến MVU trong mã

```js
await waitGlobalInitialized('Mvu');

/* 获取最后一楼的 MVU 变量 */
const variables = Mvu.getMvuData({ type: 'message', message_id: -1 });

/* 获取前端界面所在楼层的 MVU 变量 */
const variables2 = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });

/* 修改变量并写回楼层 */
_.update(variables2, 'stat_data.白娅.依存度', value => value + 5);
await Mvu.replaceMvuData(variables2, { type: 'message', message_id: getCurrentMessageId() });
```

### Phân tích cú pháp lệnh cập nhật trong văn bản

```js
await waitGlobalInitialized('Mvu');

const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });

/* 解析文本中的更新命令 */
const content = "<JSONPatch>略</JSONPatch>";
const new_data = await Mvu.parseMessage(content, mvu_data);

await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getCurrentMessageId() });
```

### Kích hoạt mục green-light bằng biến

Sử dụng `injectPrompts` để chuyển đổi giá trị biến thành văn bản được quét trước có thể kích hoạt green-light:

```js
await waitGlobalInitialized('Mvu');
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, variables => {
  const value = _.get(variables, 'stat_data.白娅.依存度');

  let content = '白娅阶段';
  if (value < 20) content += '一';
  else if (value < 40) content += '二';
  else if (value < 60) content += '三';
  else if (value < 80) content += '四';
  else content += '五';

  injectPrompts([{
    id: '激活-白娅依存度',
    content,
    position: 'none',
    depth: 0,
    role: 'user',
    should_scan: true,
  }]);
});
```

Hoặc sử dụng trường `filter`:

```js
injectPrompts([{
  id: '激活-依存度最低时立即事件',
  position: 'none',
  depth: 0,
  role: 'system',
  content: '【【依存度最低时立即事件】】',
  filter: () => _.get(getAllVariables(), 'stat_data.白娅.依存度') === 0,
  should_scan: true,
}]);
```

### Yêu cầu AI tạo nội dung trong mã

```js
await waitGlobalInitialized('Mvu');

/* 获取旧变量 */
const old_data = Mvu.getMvuData({ type: 'message', message_id: getCurrentMessageId() });

/* 请求 AI 生成 */
const message = await generate({ user_input: '你好' });

/* 解析生成结果中的更新命令 */
const data = await Mvu.parseMessage(message, old_data);

/* 将回复和变量结果创建为新楼层 */
await createChatMessages([{ role: 'assistant', message, data }]);
```

---

<a id="mvu-10"></a>

## Giao diện Tavern Helper: hiển thị và sửa biến

Sau khi AI trả lời xong, MVU tự động nối thêm `<StatusPlaceHolderImpl/>`. Placeholder này dùng để nhúng giao diện và được xử lý bằng hai regex:

### Regex 1: Không gửi cho AI

```yaml
脚本名称: [不发送]界面占位符
查找正则表达式: <StatusPlaceHolderImpl/>
替换为: （留空）
作用范围: AI输出
短暂: 仅格式提示词 ✅
```

### Regex 2: Hiển thị giao diện

```yaml
脚本名称: [界面]状态栏
查找正则表达式: <StatusPlaceHolderImpl/>
替换为: （你的界面代码）
作用范围: AI输出
短暂: 仅格式显示 ✅
```

**Kết quả: AI không thấy nội dung nào (không tốn token), còn người chơi thấy giao diện của bạn.**

### Thanh trạng thái văn bản thuần túy

```text
💖 白娅当前依存度: {{format_message_variable::stat_data.白娅.依存度}}
```

Bạn có thể sử dụng HTML + CSS để làm đẹp:

```html
<style>
.status-bar {
  font-size: 14px;
  color: #ff69b4;
  border: 1px solid #ff69b4;
  padding: 5px;
  border-radius: 8px;
}
</style>
<div class="status-bar">
💖 白娅当前依存度: {{format_message_variable::stat_data.白娅.依存度}}
</div>
```

### Thanh trạng thái giao diện front-end (tương tác)

```html
<head>
  <style>
  body { margin: 0; padding: 0; }
  </style>
  <script type="module">
    function populateCharacterData() {
      const all_variables = getAllVariables();
      const value = _.get(all_variables, 'stat_data.白娅.依存度', 'N/A');
      $('#dependency-value').text(value);
    }

    async function init() {
      await waitGlobalInitialized('Mvu');
      populateCharacterData();
      eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, () => {
        populateCharacterData();
      });
    }

    $(errorCatched(init));
  </script>
</head>
<body>
  <div class="status-bar">
    💖 依存度: <span id="dependency-value">--</span>
  </div>
</body>
```

### Hiển thị giao diện ở đầu tin nhắn

Đổi biểu thức tìm kiếm của Regex 2 thành `/(.*)<StatusPlaceHolderImpl\/>/s` và phần thay thế thành `你的界面\n$1`.

### Ghi lại thao tác của người chơi trên giao diện

Nếu người chơi sửa biến qua giao diện (ví dụ mua vật phẩm), nên có trường `系统日志` để ghi lại thao tác. Nếu không, AI sẽ thấy biến đổi không có nguyên nhân và có thể cố “sửa” lại.

---

<a id="mvu-11"></a>

## Tiền tố biến đặc biệt

### Tiền tố `_`: biến chỉ đọc

AI **có thể nhìn thấy** nhưng **không thể cập nhật**:

```yaml
世界:
  _类型: 魔法    # AI 看得到，但更新命令不会生效
```

### Tiền tố `$`: AI không nhìn thấy

AI **không nhìn thấy**, nhưng biến **vẫn có thể được script/prompt cập nhật**:

```yaml
世界:
  $类型: 魔法    # {{format_message_variable::stat_data}} 不展示
```

| Tiền tố | AI có thể nhìn thấy | AI có thể cập nhật | Sử dụng điển hình |
| --- | --- | --- | --- |
| Không có | ✅ | ✅ | Biến thông thường |
| `_` | ✅ | ❌ | Cài đặt cố định, tên nhân vật và các giá trị không thể thay đổi khác |
| `$` | ❌ | ✅ (cần prompt hướng dẫn) | Kiểu mở đầu, cờ ẩn và dữ liệu chỉ dùng cho EJS/script |

---

<a id="mvu-12"></a>

## Tra cứu nhanh cú pháp Zod 4

### Loại cơ bản

```js
z.string()              // 字符串
z.coerce.number()       // 数值（推荐，自动类型转换）
z.boolean()             // 布尔值（不要用 z.coerce.boolean()）
z.literal('固定值')     // 固定字面量
```

### Loại đối tượng

```js
/* 固定必需键 + 不同类型 */
z.object({
  好感度: z.coerce.number(),
  姓名: z.string(),
})

/* 固定必需键 + 相同类型（枚举键） */
z.record(z.enum(['力量', '敏捷', '体质']), z.coerce.number())

/* 固定可选键 + 相同类型 */
z.partialRecord(z.enum(['剑', '盾', '杖']), z.string())

/* 动态可选键 + 相同类型（如物品栏、成就） */
z.record(z.string().describe('物品名'), z.object({
  描述: z.string(),
  数量: z.coerce.number(),
}))
```

### Ràng buộc và chuyển đổi

```js
/* 数值范围限制（推荐 transform，不要用 min/max） */
z.coerce.number().transform(v => _.clamp(v, 0, 100))

/* 默认值（用 prefault，不要用 default） */
z.coerce.number().prefault(0)
z.string().prefault('待初始化')

/* 复杂对象的默认值 */
z.object({
  好感度: z.coerce.number().prefault(0),
  姓名: z.string().prefault('未知'),
}).prefault({})
/* 注意：复合类型用了 prefault，其所有字段也必须 prefault */

/* 限制键数量（保留最新的 10 个） */
z.record(z.string(), z.string())
  .transform(data => _(data).entries().takeRight(10).fromPairs().value())

/* 过滤掉数量为 0 的物品 */
z.record(z.string().describe('物品名'), z.object({
  描述: z.string(),
  数量: z.coerce.number(),
})).transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0))
```

### Quy tắc sử dụng

| Quy tắc | Giải thích |
| --- | --- |
| Ưu tiên `z.coerce.number()` | Chuyển đổi kiểu tự động, an toàn hơn `z.number()` |
| Không sử dụng `z.coerce.boolean()` | Chỉ cần sử dụng `z.boolean()` |
| Ưu tiên sử dụng đối tượng thay vì mảng | `z.record()` dễ bảo trì hơn `z.array()` |
| Sử dụng `z.transform` làm ràng buộc | Các giá trị được sửa chữa thay vì bị loại bỏ |
| Dùng `z.prefault` thay cho `z.default` | Cách viết được MVU ZOD khuyến nghị |
| `z.transform` chỉ có thể chấp nhận một tham số | `(value) => ...` ✅，`(value, ctx) => ...` ❌ |
| Không sử dụng `.strict()` hoặc `.passthrough()` | Chúng không tồn tại |
| Không import `z` hoặc `_` | Chúng đã có sẵn toàn cục |
| Duy trì idempotency | `Schema.parse(Schema.parse(input))` phải bằng `Schema.parse(input)` |

---

<a id="mvu-13"></a>

## Câu hỏi thường gặp

### Q1: Đặt script cấu trúc biến ở đâu?

Trong thư viện script Tavern Helper → script nhân vật; tên mục phải chứa “变量结构”.

### Q2: Khi nào nên thêm tiền tố `[mvu_update]`?

| mục | Tiền tố |
| --- | --- |
| quy tắc cập nhật biến | `[mvu_update]` ✅ |
| định dạng đầu ra biến | `[mvu_update]` ✅ |
| phần nhấn mạnh định dạng đầu ra biến | `[mvu_update]` ✅ |
| danh sách biến | Không thêm ❌ |
| Biến ban đầu | `[initvar]` |

### Q3: Đường dẫn đọc biến trong EJS/thanh trạng thái khác đường dẫn cập nhật của AI thế nào?

- **EJS / Đọc thanh trạng thái**: `stat_data.白娅.依存度`
- **Cập nhật AI (JSON Patch)**: `/白娅/依存度` (bắt đầu từ gốc biến, không cần `stat_data`)

### Q4: Tại sao không cần nhập `z` và `_`?

Chúng đã có sẵn toàn cục trong môi trường MVU ZOD; import lại có thể gây xung đột. Chỉ cần import `registerMvuSchema`.

### Q5: Đặt giá trị ban đầu khác nhau cho từng mở đầu thế nào?

- **Phương án toàn bộ**: bọc toàn bộ giá trị ban đầu trong `<initvar>...</initvar>` ở tin nhắn mở đầu
- **Phương án tăng dần**: dùng `<JSONPatch>` để áp dụng phần thay đổi ở tin nhắn mở đầu

### Q6: Đặt giá trị mặc định cho nhân vật được thêm giữa chừng thế nào?

Đặt `prefault('待初始化')` cho các trường của nhân vật. Nhờ đó, dù AI bỏ sót vài trường, nhân vật mới vẫn được thêm thành công và có thể tiếp tục khởi tạo ở câu trả lời sau.

### Q7: Khi tạo thẻ nhân vật cần cài đặt đặc biệt gì?

Phía trên hộp nhập là nút `启用/禁用提示词模板和酒馆助手宏`:

- **Khi biên soạn**: Tắt — để AI thấy mã prompt gốc
- **Khi thử nghiệm/chơi**: Bật — để AI thấy kết quả đã xử lý

### Q8: Prompt về biến vẫn chỉ là prompt

Danh sách biến, quy tắc cập nhật biến và định dạng đầu ra biến đều chỉ là prompt viết trong World Info. Vì vậy có thể xử lý như mục World Info bình thường: tách thành nhiều mục, dùng green-light hoặc dùng EJS để tạo prompt động.

---

**Biên soạn bởi: Qiu Qingzi**
Các tình huống áp dụng: Khung biến SillyTavern + Tavern Helper + MVU ZOD
 
