# Hướng dẫn quy trình hoàn chỉnh về EJS Prompt Template

> **Môi trường được hỗ trợ:** SillyTavern + tiện ích Prompt Template (ST-Prompt-Template)
> **Biên soạn:** 秋青子 (Qiu Qingzi)
> **Ngày cập nhật:** 04/03/2026

> **Bản dịch tiếng Việt:** 10/07/2026
> **Ghi chú bản địa hóa:** Phần giải thích và quy trình đã được chuyển sang tiếng Việt. Các khối mã, tên API, tên biến, đường dẫn và tiền tố cố định được giữ nguyên để có thể sao chép và chạy đúng trong môi trường gốc.

---

## Mục lục

1. [Prompt Template là gì?](#ejs-01)
2. [Nguyên lý cốt lõi: gửi prompt động](#ejs-02)
3. [Cú pháp cơ bản](#ejs-03)
4. [Dùng điều kiện if để kiểm soát prompt được gửi](#ejs-04)
5. [Dùng getvar để lấy biến](#ejs-05)
6. [Tổ chức prompt với print và getwi](#ejs-06)
7. [Dùng `<%= %>` để chèn giá trị biến](#ejs-07)
8. [Các điều kiện phong phú hơn](#ejs-08)
9. [Xác minh và gỡ lỗi](#ejs-09)
10. [Hệ thống biến](#ejs-10)
11. [Thao tác World Info](#ejs-11)
12. [Decorator](#ejs-12)
13. [Chèn nội dung](#ejs-13)
14. [Chèn Prompt (@INJECT)](#ejs-14)
15. [Chèn prompt (`injectPrompt`)](#ejs-15)
16. [Kích hoạt regex](#ejs-16)
17. [Thực hành hệ thống thiết lập nhân vật nhiều giai đoạn](#ejs-17)
18. [Hằng số tích hợp sẵn](#ejs-18)
19. [Tra cứu nhanh các hàm tích hợp sẵn](#ejs-19)
20. [Câu hỏi thường gặp](#ejs-20)

---

<a id="ejs-01"></a>

## Prompt Template là gì?

Tiện ích Prompt Template mở rộng cú pháp macro của SillyTavern dựa trên [Embedded JavaScript (EJS)](https://ejs.co/), cho phép dùng mã JavaScript ngay trong prompt.

Nó có thể chạy trong **World Info/Lorebook**, **prompt trong preset**, **nội dung liên quan đến nhân vật** và **tin nhắn**.

Bạn chỉ cần dùng khối lệnh `<% ... %>` trong prompt. Ví dụ:

```javascript
<% print('hello world!') %>
```

### Quy trình xử lý

1. SillyTavern chuẩn bị prompt để tạo nội dung (hợp nhất preset, World Info, định nghĩa nhân vật, tin nhắn, v.v.)
2. **Tiện ích Prompt Template** xử lý tất cả các khối lệnh `<% ... %>`
3. Gửi prompt đã xử lý cho LLM
4. Nhận đầu ra của LLM và hiển thị thành tin nhắn
5. Tiện ích xử lý nội dung vừa nhận (bao gồm các khối lệnh `<% ... %>` hiển thị được)

### Cài đặt đặc biệt khi tạo thẻ nhân vật

Phía trên hộp nhập là nút `启用/禁用提示词模板和酒馆助手宏`:

- **Khi biên soạn**: Tắt — để AI thấy mã EJS gốc
- **Khi thử nghiệm/chơi**: Bật — để AI thấy kết quả đã xử lý (ví dụ: `好感度: 10` thay vì `好感度: {{format_message_variable::络络.好感度}}`)

---

<a id="ejs-02"></a>

## Nguyên lý cốt lõi: gửi prompt động

Trong thẻ nhân vật truyền thống, AI đọc tất cả thông tin bạn cung cấp cùng một lúc, nhưng cách nó phân bổ sự chú ý là không thể kiểm soát được và dễ gây nhầm lẫn các cài đặt trong các ngữ cảnh khác nhau.

Ví dụ: nếu bạn viết 100 từ nền hiện đại + 300 từ nền cổ, bạn tưởng tượng chỉ sử dụng bối cảnh cổ xưa sau khi du hành thời gian. Nhưng AI có thể nhầm lẫn coi bối cảnh cổ đại là bối cảnh chính hiện tại đơn giản vì nó dài hơn.

**Giải pháp: trong từng điều kiện cụ thể, không để AI “nhìn thấy” những thiết lập tạm thời chưa liên quan.**

Khi độ thiện cảm thấp, chỉ gửi:

```text
【络络现在非常拘谨，不太愿意与人交流】
```

Sau khi độ thiện cảm tăng, nó sẽ chuyển sang gửi:

```text
【络络对你非常信任，像个话痨一样说个不停】
```

AI chỉ nhận mô tả về giai đoạn hiện tại và không nhầm lẫn giữa hai trạng thái.

Để chuyển đổi mượt mà hơn, nhiều giai đoạn có thể được thiết kế:

```text
好感度 0~40 时发送：【络络非常拘谨。随着好感提升可能愿意交谈】
好感度 40~80 时发送：【络络已经能和你简单交流。好感提升后可能主动开玩笑】
好感度 80~100 时发送：【络络对你非常话痨，愿意分享小秘密】
```

Đây là ý tưởng cốt lõi của việc gửi prompt có chọn lọc với EJS.

---

<a id="ejs-03"></a>

## Cú pháp cơ bản

### Các loại thẻ

| Thẻ | Chức năng | Giải thích |
| --- | --- | --- |
| `<% 代码 %>` | Thực thi mã | Nếu bạn không xuất nội dung, bạn có thể kết thúc với các dòng trống |
| `<%_ 代码 _%>` | Thực thi mã (Khuyến nghị) | Không có nội dung nào được xuất ra và khoảng trống sẽ tự động bị xóa |
| `<%= 表达式 %>` | Giá trị đầu ra | Đầu ra thoát HTML (được định dạng trong quá trình kết xuất) |
| `<%- 表达式 %>` | Giá trị đầu ra (nguyên trạng) | Không có lối thoát, xuất HTML nguyên trạng |
| `<%# 注释 %>` | Ghi chú | Nó sẽ không được xử lý |

**Nên sử dụng `<%_ _%>` để thực thi mã và tránh ngắt dòng không cần thiết.**

### Phân biệt mã và văn bản

`<%_ _%>` là "dấu ngoặc đơn đặc biệt" của EJS. Nội dung kèm theo nó là một hướng dẫn mã và bên ngoài dấu ngoặc đơn là văn bản prompt thông thường:

```javascript
<%_ if (getvar('stat_data.角色.络络.好感度') < 30) { _%>
这里是好感度小于30时发送的提示词（普通文本）
<%_ } _%>
```

---

<a id="ejs-04"></a>

## Dùng điều kiện if để kiểm soát prompt được gửi

### Cấu trúc cơ bản

```javascript
<%_ if (条件) { _%>
条件成立时发送的提示词
<%_ } _%>
```

### if / else

```javascript
<%_ if (条件) { _%>
条件成立时发送的提示词
<%_ } else { _%>
条件不成立时发送的提示词
<%_ } _%>
```

### if / else if / else

```javascript
<%_ if (getvar('stat_data.角色.络络.好感度') < 30) { _%>
【络络对你态度平淡，甚至有些冷漠】
<%_ } else if (getvar('stat_data.角色.络络.好感度') < 60) { _%>
【络络对你抱有好感，但仍保持着一些距离】
<%_ } else { _%>
【络络现在非常信任你，愿意和你分享她的小秘密】
<%_ } _%>
```

Logic thực thi theo thứ tự:

1. Kiểm tra `if` trước — nếu đúng, gửi đoạn đầu tiên rồi kết thúc toàn bộ khối logic
2. Nếu sai, kiểm tra `else if` — nếu đúng, gửi đoạn thứ hai rồi kết thúc khối logic
3. Nếu cả hai đều sai, chạy `else` và gửi đoạn cuối cùng

### So sánh chuỗi

Sử dụng `===` để xác định xem chúng có bằng nhau hay không:

```javascript
<%_ if (getvar('stat_data.事件.天气') === '晴天') { _%>
【今天阳光明媚，适合出门散步】
<%_ } else if (getvar('stat_data.事件.天气') === '雨天') { _%>
【外面下着雨，记得带伞】
<%_ } else { _%>
【今天天气一般】
<%_ } _%>
```

---

<a id="ejs-05"></a>

## Dùng getvar để lấy biến

`getvar('变量路径')` lấy giá trị tại đường dẫn biến. Cách viết đường dẫn giống với macro `{{format_message_variable::变量路径}}`.

### Cách sử dụng cơ bản

```javascript
/* 数值比较 */
getvar('stat_data.角色.络络.好感度') < 30

/* 文本相等 */
getvar('stat_data.事件.天气') === '晴天'
```

### Xử lý các biến không tồn tại

```javascript
/* 判断变量是否存在 */
getvar('stat_data.角色.络络.好感度') !== undefined

/* 变量不存在时使用默认值 */
getvar('stat_data.角色.络络.好感度', { defaults: 0 })
```

### Ví dụ hoàn chỉnh

```javascript
<%_ if (getvar('stat_data.角色.络络.好感度') < 30) { _%>
这里是当络络的好感度小于30时，AI看到的专属描述
<%_ } _%>
```

---

<a id="ejs-06"></a>

## Tổ chức prompt với print và getwi

### Xuất nội dung trong mã bằng print()

Đặt toàn bộ nội dung vào một khối mã và xuất prompt với `print()` rõ ràng hơn là thường xuyên chuyển đổi giữa `<%_ _%>` và văn bản:

```javascript
<%_
if (getvar('stat_data.事件.天气') === '晴天') {
  print('【今天阳光明媚，适合出门散步】');
} else if (getvar('stat_data.事件.天气') === '雨天') {
  print('【外面下着雨，记得带伞】');
} else {
  print('【今天天气一般】');
}
_%>
```

### Dùng getwi() để lấy nội dung từ mục World Info khác

Khi các điều kiện khác nhau tương ứng với một số lượng lớn prompt, hãy chia thành nhiều mục World Info và tải chúng theo yêu cầu bằng cách sử dụng `getwi()`:

```javascript
<%_
if (getvar('stat_data.事件.天气') === '晴天') {
  print(await getwi('天气-晴天'));
} else if (getvar('stat_data.事件.天气') === '雨天') {
  print(await getwi('天气-雨天'));
} else {
  print(await getwi('天气-一般'));
}
_%>
```

`await getwi('天气-晴天')` lấy nội dung của mục `天气-晴天`; `print()` xuất nội dung đó.

**Lưu ý:** `getwi` phải đi kèm `await`. `print(await getwi('条目名'))` và `<%- await getwi('条目名') %>` có cùng tác dụng.

### Tham số của getwi

```javascript
/* 自动推断当前世界书（推荐） */
await getwi('条目名')

/* 明确指定世界书 */
await getwi('世界书名', '条目名')

/* 传递数据给条目 */
await getwi('条目名', { key: value })
```

Trong các cuộc gọi đệ quy (mục A tải mục B qua getwi, mục B tải mục C qua getwi), tên World Info có thể được tự động suy ra và chỉ tên mục được truyền đi.

---

<a id="ejs-07"></a>

## Dùng `<%= %>` để chèn giá trị biến

`<%= 表达式 %>` chèn trực tiếp giá trị của biểu thức vào prompt, tương tự macro nhưng linh hoạt hơn:

```javascript
/* 当前时间 */
<%= new Date(Date.now()).toISOString() %>

/* 随机整数 0~10 */
<%= _.random(0, 10) %>

/* 随机选择一个元素 */
<%= _.sample(['一', '二', '三']) %>

/* 按 YAML 展示变量 */
<%= YAML.stringify(getvar('stat_data'), { blockQuote: 'literal' }) %>

/* 按 JSON 展示变量 */
<%= JSON.stringify(getvar('stat_data')) %>
```

Bạn cũng có thể lọc dữ liệu hiển thị, chẳng hạn liệt kê mọi nhân vật có độ thiện cảm dưới 30:

```javascript
当前好感度在 30 以下的人物:
<%=
  JSON.stringify(
    _(getvar('stat_data.角色'))
      .pickBy(角色 => 角色.好感度 < 30)
      .values()
      .value(),
  )
%>
```

---

<a id="ejs-08"></a>

## Các điều kiện phong phú hơn

Code có thể làm được nhiều hơn bạn nghĩ:

```javascript
/* 20% 概率发送提示词 */
<%_ if (_.random(0, 1, true) < 0.2) { _%>
要发送的提示词
<%_ } _%>

/* 5 楼以后才发送 */
<%_ if (TavernHelper.getLastMessageId() > 5) { _%>
要发送的提示词
<%_ } _%>

/* 现实时间 12 点以后才发送 */
<%_ if ((new Date).getHours() >= 12) { _%>
要发送的提示词
<%_ } _%>
```

### Dùng matchChatMessages() để mô phỏng cơ chế green-light

Gửi prompt khi bạn đề cập đến từ khóa trong cuộc trò chuyện gần đây:

```javascript
<%_ if (matchChatMessages(['络络', '笨蛋'])) { _%>
最后 2 楼中提到了"络络"或"笨蛋"时发送的提示词
<%_ } _%>
```

Điều chỉnh số tin nhắn cần quét:

```javascript
/* 扫描最后 4 楼 */
<%_ if (matchChatMessages(['络络', '笨蛋'], { start: -4 })) { _%>
...
<%_ } _%>
```

Hỗ trợ biểu thức chính quy (regex):

```javascript
<%_ if (matchChatMessages([/<thinking>.*<\/thinking>/s])) { _%>
最后 2 楼中有 <thinking> 块时发送的提示词
<%_ } _%>
```

---

<a id="ejs-09"></a>

## Xác minh và gỡ lỗi

### Prompt Viewer

Xem nội dung thực tế gửi đến AI sau khi xử lý EJS thông qua `输入框左下角的魔棒 → 提示词查看器`.

### Hộp thoại alert

```javascript
<%_
if (getvar('stat_data.事件.天气') === '晴天') {
  alert('触发了晴天提示词');
} else {
  alert(`什么都没触发, 天气值是: ${getvar('stat_data.事件.天气')}`);
}
_%>
```

### Thông báo toastr

```javascript
<%_
toastr.info('信息通知');
toastr.success('成功通知');
toastr.warning('警告通知');
toastr.error('错误通知');
_%>
```

### Xuất ra console

```javascript
<%_
const value = getvar('stat_data.角色.属性', { defaults: 0 });
console.log('普通日志:', value);
console.info('信息:', value);       // 蓝色
console.warn('警告:', value);       // 黄色
console.error('错误:', value);      // 红色
_%>
```

Nhấn `F12`, rồi mở tab Console để xem.

### Gỡ lỗi bằng breakpoint

```javascript
<%_ debugger; _%>
```

Nhấn `F12` để mở các công cụ dành cho nhà phát triển và khi đến `debugger;`, quá trình thực thi sẽ tạm dừng, cho phép bạn xem tất cả các biến.

---

<a id="ejs-10"></a>

## Hệ thống biến

### Scope của biến

| Scope | Giải thích | Lưu giữ | Trường hợp sử dụng |
| --- | --- | --- | --- |
| `global` | Biến toàn cục | ✅ | Chia sẻ trên nhân vật và đối thoại |
| `local` | Biến trò chuyện | ✅ | Bản ghi trò chuyện hiện tại |
| `message` | Biến tin nhắn | ✅ | Gắn với một tin nhắn cụ thể |
| `cache` | Biến tạm thời | ❌ | Tính toán tạm thời (mặc định) |
| `initial` | Biến ban đầu | ❌ | Chỉ đọc, từ `[InitialVariables]` |

Độ ưu tiên (từ cao xuống thấp): biến tin nhắn (từ mới nhất đến cũ nhất) → biến cục bộ → biến toàn cục

Tất cả các biến được hợp nhất được lưu trữ trong đối tượng `variables` toàn cục.

### Biến của framework MVU ZOD

MVU ZOD lưu biến dưới đường dẫn `stat_data`. **Giá trị biến được lưu trực tiếp**, không cần chỉ mục `[0]`:

```javascript
/* ✅ 正确 */
const value = getvar('stat_data.角色.好感度', { defaults: 0 });

/* ❌ 错误：缺少 stat_data 前缀 */
const value = getvar('角色.好感度');

/* ❌ 错误：不需要 [0] 索引 */
const value = getvar('stat_data.角色.好感度[0]');
```

### getvar() - Đọc biến

```javascript
getvar(key, options)
```

| Thông số | Giải thích |
| --- | --- |
| `key` | Đường dẫn biến (chuỗi), null truy xuất toàn bộ cây biến |
| `options.scope` | Chỉ định scope (`'global'`/`'local'`/`'message'`/`'cache'`/`'initial'`) |
| `options.defaults` | Giá trị mặc định (trả về khi biến không tồn tại) |
| `options.noCache` | Tắt bộ nhớ cache (dùng để đọc các biến mới đặt) |

```javascript
/* 读取 MVU ZOD 变量 */
const value = getvar('stat_data.白娅.依存度', { defaults: 0 });

/* 指定作用域 */
const name = getvar('用户名', { scope: 'local', defaults: '未知' });
```

Phiên bản chuyên dụng: `getLocalVar()`, `getGlobalVar()`, `getMessageVar()`

### setvar() - Đặt biến

```javascript
setvar(key, value, options)
```

| Thông số | Giải thích |
| --- | --- |
| `key` | tên biến, null, thay thế toàn bộ cây biến |
| `value` | Giá trị biến |
| `options.scope` | scope (`'message'` mặc định) |
| `options.flags` | Đặt điều kiện |

**Cờ:**

| Ký hiệu | Giải thích |
| --- | --- |
| `n` | Cài đặt trực tiếp (Mặc định) |
| `nx` | Chỉ đặt khi nó không tồn tại (dựa trên bộ nhớ cache) |
| `xx` | Chỉ đặt khi nó tồn tại (dựa trên bộ nhớ đệm) |
| `nxs` | Chỉ đặt khi nó không tồn tại (dựa trên phạm vi được chỉ định) |
| `xxs` | Chỉ đặt khi nó tồn tại (dựa trên phạm vi được chỉ định) |

```javascript
/* 设置到 local 作用域 */
setvar('计数器', 1, { scope: 'local' });

/* 仅当变量不存在时设置 */
setvar('初始化标记', true, { scope: 'local', flags: 'nx' });

/* 快捷写法 */
setvar('a', 1, 'nx');        // flags 快捷
setvar('a', 1, 'global');    // scope 快捷
```

Phiên bản chuyên dụng: `setLocalVar()`, `setGlobalVar()`, `setMessageVar()`

### incvar() / decvar() - Tăng hoặc giảm biến

```javascript
incvar(key, value, options)  // 增加
decvar(key, value, options)  // 减少
```

```javascript
/* 好感度 +5，限制在 [0, 100] */
incvar('好感度', 5, { scope: 'local', min: 0, max: 100 });

/* 金币 -100，不低于 0 */
decvar('金币', 100, { scope: 'local', min: 0 });
```

Phiên bản chuyên dụng: `incLocalVar()`, `incGlobalVar()`, `incMessageVar()`, `decLocalVar()`, `decGlobalVar()`, `decMessageVar()`

### delvar() - Xóa biến

```javascript
/* 删除整个变量 */
delvar('变量名');

/* 删除对象的某个属性 */
delvar('变量名', '属性名');

/* 删除数组的某个索引 */
delvar('变量名', 0);
```

### insvar() - Chèn phần tử

```javascript
/* 向对象插入新键 */
insvar('对象变量', '新值', '新键名');

/* 向数组末尾追加 */
insvar('数组变量', '新元素');

/* 向数组指定位置插入 */
insvar('数组变量', '新元素', 2);
```

### define() - Định nghĩa biến/hàm toàn cục

```javascript
define('myHelper', function() {
  return this.getvar('stat_data.角色.好感度', { defaults: 0 });
});
```

**Lưu ý:** Khi định nghĩa hàm, bạn phải sử dụng câu lệnh `function` và khi truy cập các biến và hàm, bạn phải sử dụng `this` (chẳng hạn như `this.getvar`, `this.setvar`).

### Thao tác JSON Patch

```javascript
/* 对变量应用 JSON Patch */
patchVariables('stat_data', [
  { op: 'replace', path: '/角色/好感度', value: 50 },
  { op: 'add', path: '/角色/新属性', value: '值' },
]);

/* 底层函数：对任意对象应用 JSON Patch */
const result = jsonPatch(原始对象, [
  { op: 'replace', path: '/path', value: '新值' },
]);
```

### Phân tích JSON không nghiêm ngặt

```javascript
/* 能解析 LLM 输出的格式错误的 JSON */
const obj = parseJSON('{ key: "value", }');  // 尾逗号也能解析
```

---

<a id="ejs-11"></a>

## Thao tác World Info

### getwi() - Đọc nội dung mục

```javascript
/* 自动推断世界书 */
await getwi('条目名')

/* 指定世界书 */
await getwi('世界书名', '条目名')

/* 传递数据 */
await getwi('条目名', { key: value })

/* 支持正则匹配条目名 */
await getwi(/角色_\d+/)

/* 支持 UID */
await getwi(12345)
```

### activewi() - Kích hoạt mục

Để SillyTavern xử lý mục theo cơ chế gốc (tuân theo từ khóa green-light, vector hóa, nhóm và các tính năng khác):

```javascript
/* 自动推断世界书 */
await activewi('条目名')

/* 强制激活（无视关键词检测） */
await activewi('条目名', true)

/* 指定世界书 */
await activewi('世界书名', '条目名', true)
```

**Phải dùng trong mục `[GENERATE:BEFORE]` hoặc `@@generate_before`**; nếu không, thay đổi chỉ có hiệu lực từ lần tạo tiếp theo.

Tự động coi mục bị vô hiệu hóa là đã bật (mà không sửa đổi chính World Info).

### getchar() - Đọc định nghĩa thẻ nhân vật

```javascript
const charDef = await getchar();            // 当前角色卡
const charDef = await getchar('角色名');    // 指定角色卡
```

### getpreset() - Đọc prompt từ preset

```javascript
const prompt = await getpreset('提示词名');
```

### getqr() - Đọc Quick Reply

```javascript
const content = await getqr('快速回复集名', '条目名');
```

### Lấy dữ liệu thô

```javascript
/* 角色卡原始数据 */
const charData = await getCharData();

/* 世界书所有条目 */
const entries = await getWorldInfoData('世界书名');

/* 快速回复数据 */
const qrData = getQuickReplyData('快速回复集名');

/* 当前已启用的所有世界书条目 */
const allEntries = await getEnabledWorldInfoEntries();
```

---

<a id="ejs-12"></a>

## Decorator

Thêm decorator có tiền tố `@@` ở đầu nội dung mục World Info. Mỗi decorator nằm trên một dòng và không được có dòng trống xen giữa.

### Các decorator có sẵn

| decorator | Chức năng |
| --- | --- |
| `@@activate` | Coi mục là 🔵 kích hoạt vĩnh viễn |
| `@@dont_activate` | Vô hiệu hóa hoàn toàn kích hoạt (ngay cả khi `activewi` không được phép) |
| `@@generate_before` | Chèn vào đầu prompt gửi cho LLM |
| `@@generate_after` | Chèn vào cuối prompt gửi cho LLM |
| `@@render_before` | Kết xuất ở đầu tin nhắn (không gửi cho LLM) |
| `@@render_after` | Kết xuất ở cuối tin nhắn (không gửi cho LLM) |
| `@@preprocessing` | Thực thi **trước khi** SillyTavern xử lý World Info (dùng để kích hoạt green-light động) |
| `@@initial_variables` | Coi nội dung là biến ban đầu |
| `@@always_enabled` | mục đặc biệt buộc phải bật |
| `@@only_preload` | Chỉ bật giai đoạn tải ngay lập tức |
| `@@dont_preload` | Nó không được xử lý giai đoạn tải ngay lập tức |
| `@@private` | Tự động bao bọc `<% { %>` và `<% } %>` để tránh khai báo trùng lặp các biến |
| `@@if 条件` | mục này bị loại trừ khi điều kiện là sai |
| `@@iframe` | Bọc nội dung trong iframe để tránh xung đột CSS |
| `@@message_formatting` | Đầu ra dưới dạng HTML (chỉ ở chế độ RENDER) |

### Thực hành với @@preprocessing

**Mục đích:** Thực thi mã trước khi xử lý World Info, tự động tạo từ khóa để kích hoạt các mục khác.

**Yêu cầu:** SillyTavern 1.13.4+

```javascript
@@preprocessing
<%_ if (getvar('stat_data.事件.天气') === '晴天') { _%>
晴天关键词
<%_ } _%>
```

Sau khi xử lý nội dung mục nó trở nên `晴天关键词`, cho phép mục green-light được kích hoạt chính xác.

### Điều kiện ngắn gọn với @@if

Một cách đơn giản để viết khi bạn không muốn viết một đống `<% ... %>`:

```
@@if variables.哈基米.好感度 >= 90
哈基米很喜欢{{user}}
```

```
@@if variables.哈基米.好感度 > 50 && variables.哈基米.好感度 < 90
哈基米认为{{user}}是朋友
```

Điều kiện có thể là bất kỳ mã JavaScript nào, nhưng chỉ một dòng.

### Tạo giao diện cách ly với @@iframe

```
@@render_after
@@iframe
@@if !is_user && !is_system
<html>
<head></head>
<body>
<div>
【哈基米】<br/>
好感度：<%- variables.哈基米.好感度 %>
</div>
</body>
</html>
```

Thêm thanh trạng thái ở cuối mọi tin nhắn của nhân vật mà không làm CSS ảnh hưởng ra toàn trang.

**Phiên bản có thể gập lại:**

```
@@render_after
@@iframe 折叠状态栏（点击显示）
@@if !is_user && !is_system
<html>...内容...</html>
```

Thêm văn bản tiêu đề sau `@@iframe` để giao diện tự động chuyển thành dạng thu gọn.

---

<a id="ejs-13"></a>

## Chèn nội dung

Thêm tiền tố đặc biệt vào **tiêu đề (memo)** của mục World Info để chèn nội dung mục vào vị trí chỉ định:

| Tiền tố | Vị trí chèn | Giải thích |
| --- | --- | --- |
| `[GENERATE:BEFORE]` | Đầu prompt gửi cho LLM | Chỉ dành cho 🔵 |
| `[GENERATE:AFTER]` | Vào cuối prompt gửi cho LLM | 🔵 và 🟢 |
| `[RENDER:BEFORE]` | Đầu nội dung LLM nhận được | Chỉ dùng khi kết xuất |
| `[RENDER:AFTER]` | Cuối nội dung LLM nhận được | Chỉ dùng khi kết xuất |
| `[GENERATE:{idx}:BEFORE]` | Đầu tin nhắn thứ idx | idx bắt đầu từ 0 |
| `[GENERATE:{idx}:AFTER]` | Cuối tin nhắn thứ idx | idx bắt đầu từ 0 |
| `[GENERATE:REGEX:模式]` | Chèn khi khớp nội dung tin nhắn | khớp regex |
| `[InitialVariables]` | Biến ban đầu | Nó phải là JSON tiêu chuẩn |

`[RENDER:BEFORE]` và `[RENDER:AFTER]` chỉ để kết xuất và sẽ không được gửi đến LLM.

### Chèn khi khớp regex

```
世界书条目标题: [GENERATE:REGEX:你好]
世界书条目内容:
检测到问候语！当前消息: <%- matched_message %>
消息索引: <%- matched_message_index %>
```

Các biến có sẵn: `matched_message` (nội dung tin nhắn khớp), `matched_message_index` (chỉ mục), `matched_message_role` (role)

---

<a id="ejs-14"></a>

## Chèn Prompt (@INJECT)

⚠️ **Mục phải ở trạng thái tắt thì tính năng mới có hiệu lực.**

`@INJECT` chèn prompt trực tiếp dưới dạng tin nhắn `{role, content}` độc lập, chính xác hơn mục World Info vốn được hợp nhất vào tin nhắn system.

### Ba chế độ chèn

**1. Vị trí tuyệt đối (POS):**

```
@INJECT pos=1,role=system          // 在第1条消息位置插入
@INJECT pos=-1,role=user           // 在最后一条消息位置插入
```

**2. Tin nhắn mục tiêu :**

```
@INJECT target=user,index=1,at=before,role=system     // 在第一条用户消息前
@INJECT target=assistant,index=-1,at=after,role=user   // 在最后一条助手消息后
```

**3. Khớp regex:**

```
@INJECT regex=你好,at=before,role=system        // 在包含"你好"的消息前
@INJECT regex="^用户.*",at=after,role=assistant  // 在以"用户"开头的消息后
```

### Xếp hạng và ưu tiên

1. Thực hiện từ sau ra trước theo vị trí chèn
2. Với cùng vị trí, sắp xếp theo tham số thứ tự của mục World Info
3. Ưu tiên loại: `pos` > `target` > `regex`

### Lưu ý về hậu xử lý prompt

Các API khác nhau có các yêu cầu khác nhau đối với định dạng tin nhắn:

| API | Yêu cầu về định dạng |
| --- | --- |
| ChatGPT | Hệ thống thường được đặt ở phía trước, không yêu cầu thay thế nghiêm ngặt |
| Gemini | Hệ thống độc lậpHướng dẫn, người dùng / mô hình xen kẽ nghiêm ngặt |
| Claude | người dùng / trợ lý luân phiên nghiêm ngặt và hệ thống có thể ở bất kỳ đâu trong hệ thống |
| Deepseek | Người dùng / trợ lý được khuyến nghị thay thế, với người cuối cùng phải là người dùng |

⚠️ **Hãy bảo đảm tin nhắn system nằm ở đầu!**

---

<a id="ejs-15"></a>

## Chèn prompt (`injectPrompt`)

Thực hiện đảo ngược phụ thuộc thông qua khóa nhãn: định nghĩa các đoạn prompt trong World Info, rồi nhập và dùng chúng trong preset:

**Định nghĩa trong World Info:**

```javascript
<%
injectPrompt("CoT", `
# 好感度
Q: <char>的好感度是多少？
Q: 接下来的生成将会导致好感度发生什么变化？
Q: 变化后的好感度是多少？
`)
%>
```

**Dùng trong preset:**

```javascript
按照以下<thinking>步骤进行思考。
<thinking>
<%- getPromptsInjected("CoT") %>
</thinking>
```

**Hiệu ứng:** CoT của World Info được đưa chính xác vào các khối preset `<thinking>`, cho phép LLM tập trung hơn.

Các chức năng liên quan:

- `injectPrompt(key, prompt, order, sticky, uid)` - Chèn prompt
- `getPromptsInjected(key, postprocess)` - Đọc prompt đã chèn
- `hasPromptsInjected(key)` - Kiểm tra xem nó có tồn tại không

---

<a id="ejs-16"></a>

## Kích hoạt regex

Tạm thời tạo biểu thức chính quy (regex) xử lý nội dung qua `activateRegex()`:

### Regex của SillyTavern (chỉ khi tạo)

```javascript
<%
    /* 隐藏楼层里的深度思考内容 */
    activateRegex(/<think>[\s\S]*?<\/think>/gi, "");
%>
```

### Regex tiền xử lý (có hiệu lực khi tạo và kết xuất)

```javascript
<%
    /* 自定义宏 {{getvars::...}} */
    activateRegex(/\{\{getvars::([a-zA-Z0-9_]+?)\}\}/gi, function(match, varName) {
        return this.getvar(varName);
    }, {
        generate: true
    });
%>
```

### Regex HTML cho tin nhắn

```javascript
<%_
    /* 替换图床链接为反代 */
    activateRegex(
        /files\.catbox\.moe/gi,
        'catbox.xxx.net',
        {
            message: true,
            html: true
        }
    );
_%>
```

---

<a id="ejs-17"></a>

## Thực hành hệ thống thiết lập nhân vật nhiều giai đoạn

### Phương pháp thiết kế

Tự động tải các cài đặt nhân vật khác nhau dựa trên các biến để đạt được sự phát triển nhân vật và thay đổi mối quan hệ.

**Cấu trúc:**

```
世界书/
├── 角色_控制器 (✅蓝灯永久激活)
├── 角色_阶段01   (❌禁用)
├── 角色_阶段02   (❌禁用)
├── 角色_阶段03   (❌禁用)
└── ...
```

- **mục điều khiển**: Đèn xanh được kích hoạt vĩnh viễn, chịu trách nhiệm đọc các biến và gọi giai đoạn tương ứng
- **mục giai đoạn**: Tắt, được bộ điều khiển tải động qua `getwi()`

### Mẫu 1: Bộ điều khiển đa giai đoạn đơn biến

```javascript
<%_
if (typeof goodwill === 'undefined') var goodwill = getvar('stat_data.关系系统.好感度', { defaults: 0 });
if (typeof relationship === 'undefined') var relationship = getvar('stat_data.关系系统.关系状态', { defaults: '陌生人' });
_%>

<%_ if (goodwill < 26) { _%>
<%- await getwi('美玲_阶段01_陌生接触期') %>
<%_ } else if (goodwill < 51) { _%>
<%- await getwi('美玲_阶段02_暧昧拉扯期') %>
<%_ } else if (goodwill < 76) { _%>
<%- await getwi('美玲_阶段03_告白前夜期') %>
<%_ } else if (relationship === '恋人') { _%>
<%- await getwi('美玲_阶段04_恋人阶段') %>
<%- await getwi('美玲_NSFW档案') %>
<%_ } else { _%>
<%- await getwi('美玲_阶段03_告白前夜期') %>
<%_ } _%>
```

### Mẫu 2: Kích hoạt kiểu green-light bằng @@preprocessing

```javascript
@@preprocessing
<%_
if (typeof currentDate === 'undefined') var currentDate = getvar('stat_data.世界信息.当前日期', { defaults: '' });
_%>

<%_ if (currentDate.includes('10月25日') || currentDate.includes('10月27日')) { _%>
学园祭活动
<%_ } else if (currentDate.includes('12月24日') || currentDate.includes('12月25日')) { _%>
圣诞活动
<%_ } _%>
```

### Mẫu 3: Khối mã thuần túy + print

```javascript
<%_
if (typeof value === 'undefined') var value = getvar('stat_data.角色.属性', { defaults: 0 });

if (value > 50) {
  print(await getwi('条目名'));
}
_%>
```

### Cấu hình mục

| Loại mục | Cách kích hoạt | Thứ tự |
| --- | --- | --- |
| Bộ điều khiển (với getwi / activewi) | Đèn xanh được kích hoạt vĩnh viễn | 100 |
| Mục giai đoạn được tải | Tắt | 98-800 |
| Bộ điều khiển từ khóa động (@@preprocessing) | Đèn xanh được kích hoạt vĩnh viễn | 100 |
| mục kích hoạt bằng từ khóa | green-light | Theo nhu cầu |

### Tránh khai báo trùng lặp

Nhiều mục có thể sử dụng các biến có cùng tên; sử dụng kiểm tra `typeof` để tránh khai báo trùng lặp:

```javascript
/* ✅ 推荐写法 */
if (typeof xialiAo === 'undefined') var xialiAo = getvar('stat_data.傲娇系统.傲', { defaults: 100 });

/* ✅ 使用角色名前缀避免冲突 */
if (typeof xialiRelation === 'undefined') var xialiRelation = getvar('stat_data.世界信息.关系状态', { defaults: '同学' });
```

---

<a id="ejs-18"></a>

## Hằng số tích hợp sẵn

### Luôn sẵn sàng

```javascript
variables         // 合并后的所有变量
SillyTavern       // SillyTavern.getContext() 返回内容
faker             // Faker 库（faker.fakerEN, faker.fakerCN）
_                 // Lodash 库
$                 // jQuery 库
toastr            // toastr 通知库
runType           // 'generate' | 'preparation' | 'render' | 'render_permanent'
charLoreBook      // 角色卡世界书名
userLoreBook      // 用户角色世界书名
chatLoreBook      // 聊天世界书名
userName          // 用户角色名
charName          // 角色卡角色名
chatId            // 聊天会话 ID
characterId       // 角色卡 ID
groupId           // 群聊 ID（null 表示非群聊）
charAvatar        // 角色卡头像 URL
userAvatar        // 用户头像 URL
lastUserMessageId // 最新用户消息楼层 ID
lastCharMessageId // 最新角色消息楼层 ID
lastUserMessage   // 最后一条用户消息内容
lastCharMessage   // 最后一条角色消息内容
lastMessageId     // 最后一条消息 ID
model             // 当前选择的模型
generateType      // 当前生成类型：'' | 'normal' | 'continue' | 'regenerate' | 'swipe' | 'quiet' 等
```

### Chỉ trong quá trình hiển thị (runType === 'render')

```javascript
message_id        // 消息楼层号
swipe_id          // 消息页码 ID
name              // 消息角色名
is_last           // 是否为最后一条
is_user           // 是否为用户消息
is_system         // 是否为系统消息
```

### Chỉ khi sử dụng GENERATE

```javascript
world_info        // 当前处理的世界书条目对象
generateBuffer    // 当前已处理的上文内容
generateData      // 当前生成内容（未经模板处理）
```

---

<a id="ejs-19"></a>

## Tra cứu nhanh các hàm tích hợp sẵn

### Thao tác biến

```javascript
getvar(key, options)           // 读取变量
setvar(key, value, options)    // 设置变量
incvar(key, value, options)    // 增加变量
decvar(key, value, options)    // 减少变量
delvar(key, index, options)    // 删除变量
insvar(key, value, index, options)  // 插入元素
define(name, value, merge)     // 定义全局变量/函数
patchVariables(key, changes, options)  // 应用 JSON Patch
```

### Thao tác World Info

```javascript
await getwi(title, data)                    // 读取条目内容
await getwi(lorebook, title, data)
await activewi(title, force)                // 激活条目
await activewi(lorebook, title, force)
await activateWorldInfoByKeywords(keywords)  // 通过关键字激活
await getEnabledWorldInfoEntries()           // 获取所有启用的条目
```

### Nhân vật/preset/Quick Reply

```javascript
await getchar(name, template, data)    // 读取角色卡定义
await getCharData(name)                // 读取角色卡原始数据
await getpreset(name, data)            // 读取预设提示词
await getqr(name, label, data)         // 读取快速回复
```

### Tin nhắn trò chuyện

```javascript
getChatMessage(idx, role)              // 获取指定楼层消息
getChatMessages(count)                 // 获取指定数量的消息
getChatMessages(start, end, role)      // 获取范围内消息
matchChatMessages(pattern, options)    // 搜索匹配消息
```

### Đầu ra và chèn

```javascript
print(...args)                                    // 输出文本
injectPrompt(key, prompt, order, sticky, uid)     // 注入提示词
getPromptsInjected(key, postprocess)              // 读取注入的提示词
hasPromptsInjected(key)                           // 检查是否存在注入
```

### Regex và template

```javascript
activateRegex(pattern, replace, opts)    // 激活临时正则
await evalTemplate(content, data, options)  // 处理模板语法
await getSyntaxErrorInfo(code, max_lines)   // 检查语法错误
```

### Hàm tiện ích

```javascript
parseJSON(text)                   // 宽松 JSON 解析
jsonPatch(dest, changes)          // 应用 JSON Patch
await execute(cmd)                // 执行 SillyTavern 命令
```

---

<a id="ejs-20"></a>

## Câu hỏi thường gặp

### Q1: Viết đường dẫn đọc biến như thế nào?

- **EJS/Thanh trạng thái**: `getvar('stat_data.角色.属性')`
- **`{{format_message_variable::...}}` trong macro**:`{{format_message_variable::stat_data.角色.属性}}`
- **Trong con đường JSON Patch của AI**: `/角色/属性` (không cần `stat_data`)

### Q2: getwi có bắt buộc dùng await không?

Có `<%- getwi('条目') %>` ❌ ,`<%- await getwi('条目') %>` ✅

### Q3: Làm gì khi biến bị khai báo trùng?

```javascript
/* ✅ typeof 检查 + var */
if (typeof value === 'undefined') var value = getvar('stat_data.角色.属性', { defaults: 0 });
```

Hoặc sử dụng `@@private` decorator scope gói tự động.

### Q4: Có thể dùng @@preprocessing cùng decorator khác không?

- `@@preprocessing` + `@@generate_before`/`@@generate_after`: **Không sử dụng đồng thời**, tiền xử lý sẽ bị bỏ qua
- `@@generate_before` + `@@generate_after`: **Có thể sử dụng đồng thời**

### Q5: Kiểm tra thế nào khi mục không được thực thi?

1. Mục điều khiển phải **bật** (green-light kích hoạt vĩnh viễn)
2. Kiểm tra xem từ khóa hoặc phương pháp kích hoạt có chính xác không
3. Định dạng decorator có đúng không (không có dòng trống xen giữa)?
4. Thêm `<%_ console.info('条目已执行'); _%>` vào mục để xác nhận

### Q6: Kết xuất tin nhắn và tạo prompt khác nhau thế nào?

- **Khi tạo nội dung**: xử lý prompt gửi cho LLM và thay thế `<% ... %>` bằng kết quả thực thi
- **Khi kết xuất**: xử lý HTML của tin nhắn; `<%=` xuất nội dung đã escape, còn `<%-` xuất HTML nguyên trạng
- Kết xuất không sửa nội dung gốc của tin nhắn, chỉ thay đổi HTML hiển thị
- regex ẩn `<% ... %>` trong tin nhắn để tránh thực thi lặp đi lặp lại khi gửi đến LLM

### Q7: Dùng cơ chế escape phạm vi như thế nào?

`<%` và `%>` trong `<#escape-ejs>...<#/escape-ejs>` sẽ tự động thoát ra và sẽ không được thực thi:

```html
<%= 'line 1' %>
<#escape-ejs>
<%= 'line 2' %>    <!-- 不执行，原样输出 -->
<#/escape-ejs>
<%= 'line 3' %>
```

### Q8: Cần cung cấp gì để AI viết mã EJS?

- `TavernHelper` cho phép mã EJS truy cập các chức năng của Tavern Helper
- Có thể gọi trực tiếp các hàm của Prompt Template như `getvar`
- Nên cung cấp cho AI thư mục `@types` của Tavern Helper và tệp `reference_cn.md` của Prompt Template

---

## Tài nguyên tham khảo

- **Tham khảo cú pháp EJS**: <https://ejs.co/>
- **Tài liệu chính thức của Prompt Template**: <https://github.com/zonde306/ST-Prompt-Template/blob/main/README_CN.md>
- **Tham khảo API của Prompt Template**: <https://github.com/zonde306/ST-Prompt-Template/blob/main/docs/reference_cn.md>
- **Tài liệu chức năng của Tavern Helper**: <https://n0vi028.github.io/JS-Slash-Runner-Doc/>
- **Hướng dẫn MVU ZOD**: [MVU_ZOD指南_VI.md](../MVU%20ZOD/MVU_ZOD指南_VI.md)

---

**Biên soạn bởi: Qiu Qingzi**
Các tình huống áp dụng: SillyTavern + tiện ích Prompt Template
