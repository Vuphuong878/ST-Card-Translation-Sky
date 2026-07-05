# MVU ZOD 完整工作流指南

> **适用环境：** SillyTavern + 酒馆助手 + MVU ZOD 变量框架  
> **整理：** 秋青子  
> **更新日期：** 2026年3月4日

---

## 目录

1. [系统概览](#系统概览)
2. [第一步：设计变量结构脚本](#第一步设计变量结构脚本)
3. [第二步：初始化变量](#第二步初始化变量)
4. [第三步：验证变量是否生效](#第三步验证变量是否生效)
5. [第四步：为不同开局设置不同初始值](#第四步为不同开局设置不同初始值)
6. [第五步：编写变量提示词](#第五步编写变量提示词)
7. [第六步：配置酒馆正则](#第六步配置酒馆正则)
8. [第七步：适配两种变量更新方式](#第七步适配两种变量更新方式)
9. [酒馆助手脚本：后台控制变量](#酒馆助手脚本后台控制变量)
10. [酒馆助手界面：显示和修改变量](#酒馆助手界面显示和修改变量)
11. [特殊变量前缀](#特殊变量前缀)
12. [Zod 4 语法速查](#zod-4-语法速查)
13. [常见问题](#常见问题)

---

## 系统概览

MVU ZOD 是 SillyTavern 的变量管理框架。整个系统由以下部分组成：

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

### 核心工作流程

1. **变量结构脚本**定义变量应该是什么样的（类型、约束）
2. **initvar** 设定变量的初始值
3. **变量列表**让 AI 看到变量当前值
4. **变量更新规则**告诉 AI 什么时候该更新变量
5. **变量输出格式**告诉 AI 用 JSON Patch 格式输出更新命令
6. MVU 脚本解析 AI 回复中的更新命令，实际更新变量
7. 变量结构脚本对更新后的值进行检验和修复

---

## 第一步：设计变量结构脚本

### 先想清楚需要什么变量

写卡之前，必须先想好这张卡需要追踪哪些变量：

- 恋爱卡 → 好感度、着装、称号
- 冒险卡 → 背包物品、技能、任务
- 系统卡 → 任务列表、商城商品、角色商城

**变量名不要用宏（如 `{{user}}`），用 `主角` 等无需宏的变量名。**

### 脚本模板（固定头尾）

```js
import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';

export const Schema = z.object({
  // 在这里定义变量结构
});

$(() => {
  registerMvuSchema(Schema);
});
```

**头尾必须原封不动。** `z`（Zod 4）和 `_`（Lodash）已全局可用，**不要** import 它们。

### 完整示例

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

这个例子做到了：

- **依存度限制在 0~100 之间**：`z.coerce.number().transform(v => _.clamp(v, 0, 100))`
- **自我评价默认值**：`z.string().prefault('待评价')`——AI 没填写时自动设为"待评价"
- **称号数量上限**：依存度越高能拥有的称号越多，超出时移除最旧的
- **物品数量不为正数时自动删除**：`.transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0))`
- **物品数量默认为 1**：`z.coerce.number().prefault(1)`

### 存放位置

在 **酒馆助手脚本库 → 角色脚本** 中创建一个名为 `变量结构` 的角色脚本，内容填写上面的脚本。

---

## 第二步：初始化变量

### 编写初始值（YAML 格式）

变量初始值必须与变量结构一一对应：

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

### 世界书条目配置

- **条目名**：`[initvar]变量初始化勿开`
- **状态**：**必须禁用**——MVU 只读取禁用的 initvar 条目

---

## 第三步：验证变量是否生效

确保以下两点：

1. API 配置（左上角插头）选的是 **聊天补全**
2. 角色卡有设置 **开局消息**

然后 **新开聊天**，通过 `酒馆输入框左边魔棒 → 日志查看器` 查看是否出现 `【脚本|变量结构】: 变量结构注册成功`。

通过 `酒馆输入框左边魔棒 → 变量管理器 → 消息楼层` 查看变量初始化结果。

### 常见问题排查

**日志查看器中没有 `【脚本|变量结构】变量结构注册成功`：**
- 说明变量结构脚本有错误
- 从日志查看器复制 `【脚本|变量结构】` 开头的所有日志，发给 AI 修复

**出现黄色的 `【脚本|MVU】发生变量更新错误`：**
- 也说明变量结构脚本有错误

**出现红色的 `【脚本|变量结构】变量初始化失败`：**
- 说明 initvar 条目的 YAML 有错误
- 从日志查看器复制日志，发给 AI 修复

---

## 第四步：为不同开局设置不同初始值

角色卡每个开局往往是不同的故事情景，需要不同的变量初始值。

### 方案一：全量方案（`<initvar>` 块）

在开局消息中用 `<initvar>...</initvar>` 包裹该开局对应的完整变量初始值：

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

也可以在 `<initvar>` 块中包裹一个代码块（```yaml ... ```）。

**优先级规则：**

- 如果开局中有 `<initvar>...</initvar>`，**完全忽略** `[initvar]变量初始化勿开` 条目
- 如果开局中没有 `<initvar>...</initvar>`，使用 `[initvar]变量初始化勿开` 条目

你完全可以不在世界书里设置 `[initvar]` 条目，而是对所有开局单独设置 `<initvar>` 块。

### 方案二：增量方案（JSON Patch）

如果不同开局只有一两个变量不同，可以在开局消息中用变量更新命令进行增量修改：

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

这样会先使用 `[initvar]` 条目初始化，然后在开局（第 0 楼）应用增量更新。

---

## 第五步：编写变量提示词

变量提示词让 AI 了解变量，由三部分组成：

### 5.1 变量列表——让 AI 看到当前变量值

**内容（固定，直接复制）：**

```yaml
---
<status_current_variable>
{{format_message_variable::stat_data}}
</status_current_variable>
```

`{{format_message_variable::stat_data}}` 是酒馆助手宏，运行时会被替换为当前所有变量的 YAML 格式值。

**世界书条目配置：**

- **条目名**：`变量列表`（**不要**加 `[mvu_update]` 前缀）
- **位置**：D齿轮在深度 0 或 1
- **顺序**：200

**为什么放在 D0 或 D1？** 变量列表必须对应最新剧情。如果放在 D3 或 D2，它会被夹在两次回复之间，AI 可能认为它记录的是旧数据。

#### 选择性展示变量

你可以更细致地展示变量内容：

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

你也可以把变量列表拆成多个条目，一些设蓝灯一些设绿灯，来更细致地控制。

#### 具体解释变量含义

一些变量需要进一步解释含义。比如 `白娅.依存度` 为 23 时，白娅应该是什么心理状态？可以新建 `角色阶段` 条目：

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

但这样会发送所有阶段的提示词，浪费 token 且可能混淆 AI。解决方案是用 **EJS 提示词模板**（见 [EJS 实战指南](../EJS使用/EJS实战指南_2026_ZOD版.md)）根据当前依存度只发送对应阶段。

### 5.2 变量更新规则——告诉 AI 何时更新变量

**示例：**

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

#### 各字段含义

| 字段 | 含义 |
| --- | --- |
| `type` | 变量的类型，如 `number`、TypeScript 类型定义。string 类型可省略 |
| `range` | 数值变量的范围，如 `0~100` |
| `format` | 特定格式要求，如时间格式 |
| `check` | AI 更新变量时应考虑的因素——**这是最核心的部分** |

#### 编写技巧

- **省略自明变量**：`世界.当前地点` 这种名字已经告诉 AI 怎么更新，无需再写规则
- **合并同类变量**：`白娅.着装.${上装|下装|内衣|袜子|鞋子|饰品}` 合并写一条规则
- **不写只读变量**：以 `_` 开头的字段无需写更新规则
- **动态键放进 type**：`称号` 下面的 `称号名` 是任意的，在 `type` 中用索引签名解释

#### 直接用变量结构做更新规则

你也可以把变量结构直接用于更新规则的 `type` 部分：

```yaml
变量更新规则:
  白娅:
    依存度:
      type: z.coerce.number().transform(v => _.clamp(v, 0, 100))
      check:
        - 根据白娅对<user>行为的感知和反应调整 ±(3~6)
```

或者把整个变量结构复制过来，用 `/** 更新说明 */` 注释每个字段。

#### 插入位置

变量更新规则**不需要**放在 D0/D1——它不影响 AI 对剧情的理解。可以放在角色定义之前/之后或 D3/D4 等位置，减少对其他提示词的注意力干扰。变量输出格式中的思维链会帮 AI "召回" 这些规则。

**世界书条目配置：**

- **条目名**：`[mvu_update]变量更新规则`（**必须**含 `[mvu_update]`）
- **位置**：D齿轮在深度 0（或放在角色定义之前/之后等位置）
- **顺序**：200

### 5.3 变量输出格式——告诉 AI 用什么格式输出更新命令

**内容（固定，直接复制）：**

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

也有中文版本可选：

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

#### 格式解读

这套格式采用了**额外输出格式**写法：

- `rule` 部分：AI 只读取不输出。规定了输出位置（回复末尾）、格式规范（JSON Patch）
- `format` 部分：AI 按此模板输出。其中：
  - `${描述}`：AI 根据描述替换为对应内容
  - `$(要求)`：AI 听从要求但不输出该标记本身
  - `...`：AI 仿照前面的格式补充输出
  - 其他内容原封不动输出（`<UpdateVariable>`、`<Analysis>` 等标签）

#### `<Analysis>` 思维链的作用

`<Analysis>` 就是变量更新专用的思维链（CoT），让 AI 先分析再操作：

1. **计算时间变化**
2. **判断是否允许剧烈变动**（如好感度从 100 直接掉到 0）
3. **回忆每个变量的 `check` 规则，据此分析是否需要更新**——这会"召回"AI 对变量更新规则的注意力

#### JSON Patch 操作说明

| 操作 | 说明 | 路径示例 |
| --- | --- | --- |
| `replace` | 替换现有路径的值 | `/白娅/依存度` |
| `delta` | 对数值增减（正增负减） | `/白娅/依存度` |
| `insert` | 向对象插入新键，或向数组追加（`-`） | `/主角/物品栏/新物品` 或 `/记忆/-` |
| `remove` | 删除路径 | `/主角/物品栏/薄荷糖` |
| `move` | 移动路径 | `from: /a`, `to: /b` |

**路径规则：** 用 `/` 分隔，从变量根开始（**不需要** `stat_data` 前缀）。

#### AI 实际输出示例

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

**世界书条目配置：**

- **条目名**：`[mvu_update]变量输出格式`（**必须**含 `[mvu_update]`）
- **位置**：D齿轮在深度 0（Gemini）或 4（Claude）
- **顺序**：200

### 5.4 变量输出格式强调（可选）

如果 AI 经常不输出 `<UpdateVariable>` 块，添加这个强调条目：

```yaml
---
变量输出格式强调:
  rule: The following must be inserted to the end of reply, and cannot be omitted
  format: |-
    <UpdateVariable>
    ...
    </UpdateVariable>
```

**世界书条目配置：**

- **条目名**：`[mvu_update]变量输出格式强调`（**必须**含 `[mvu_update]`）
- **位置**：D齿轮在深度 0
- **顺序**：200

---

## 第六步：配置酒馆正则

AI 输出的 `<UpdateVariable>` 块已被 MVU 解析使用，不需要再发给 AI（浪费 token，可能导致 AI 偷懒照抄或重复更新）。

### 导入预制正则

前往 `酒馆右上角积木按钮 → 正则`，导入以下某个版本的三个正则到局部正则中：

- **美化版**：`[不发送]去除变量更新`、`[美化]变量更新中`、`[美化]完整变量更新`
- **折叠版**：`[不发送]去除变量更新`、`[折叠]变量更新中`、`[折叠]完整变量更新`
- **仅提示版**：`[不发送]去除变量更新`、`[仅提示]变量更新中`、`[仅提示]完整变量更新`

各正则的作用：

- **`去除变量更新`**：利用`仅格式提示词`功能，在发送给 AI 时将 `<UpdateVariable>` 替换为空
- **`变量更新中`/`完整变量更新`**：利用`仅格式显示`功能，美化 `<UpdateVariable>` 的显示

### 保留最后几层发给 AI（可选）

如果 AI 重复更新已做过的变量（比如重复根据"约会"剧情更新好感度），可以保留最后一两层的 `<UpdateVariable>` 发给 AI。

设置 `去除变量更新` 正则的**最小深度**为 4，即只对倒数第 5 楼及以上生效。代价是浪费一些 token。

---

## 第七步：适配两种变量更新方式

MVU 支持两种更新方式：

- **随 AI 输出**：AI 先输出剧情再输出更新命令
- **额外模型解析**：一个 AI 输出剧情，另一个 AI 输出更新命令

`[mvu_update]` 前缀就是为此设计的：

- 名字含 `[mvu_plot]` → 只发给负责剧情的 AI
- 名字含 `[mvu_update]` → 只发给负责更新变量的 AI
- 名字不含二者 → 两个 AI 都发

按照本教程的命名（`变量列表`、`[mvu_update]变量更新规则`、`[mvu_update]变量输出格式`），你的角色卡已经自动适配了两种方式。

---

## 酒馆助手脚本：后台控制变量

变量结构只能检验/修复更新后的变量值。如果需要获取更新前的变量值、对比变化、与酒馆交互等更强大的功能，需要酒馆助手脚本。

### 前置要求

代码开头必须添加：

```js
await waitGlobalInitialized('Mvu');
```

### 监听 COMMAND_PARSED（更新命令解析完成）

在更新命令被应用前修复它：

```js
await waitGlobalInitialized('Mvu');
eventOn(Mvu.events.COMMAND_PARSED, commands => {
  commands.forEach(command => {
    /* 修复 Gemini 在中文间加入的 '-' */
    command.args[0] = command.args[0].replaceAll('-', '');
  });
});
```

### 监听 VARIABLE_UPDATE_ENDED（变量更新结束）

获取更新前后的变量，进行额外处理：

```js
await waitGlobalInitialized('Mvu');
eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, (new_variables, old_variables) => {
  toastr.info(`更新前依存度: ${_.get(old_variables, 'stat_data.白娅.依存度')}`);
  toastr.info(`更新后依存度: ${_.get(new_variables, 'stat_data.白娅.依存度')}`);
});
```

**常用示例：**

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

### 在代码中获取/更新 MVU 变量

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

### 解析文本中的更新命令

```js
await waitGlobalInitialized('Mvu');

const mvu_data = Mvu.getMvuData({ type: 'message', message_id: -1 });

/* 解析文本中的更新命令 */
const content = "<JSONPatch>略</JSONPatch>";
const new_data = await Mvu.parseMessage(content, mvu_data);

await Mvu.replaceMvuData(new_data, { type: 'message', message_id: getCurrentMessageId() });
```

### 用变量激活绿灯条目

使用 `injectPrompts` 将变量值转换为可激活绿灯的预扫描文本：

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

或者利用 `filter` 字段：

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

### 在代码中请求 AI 生成

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

## 酒馆助手界面：显示和修改变量

MVU 在 AI 回复结束后自动附加 `<StatusPlaceHolderImpl/>`。这个占位符用于嵌入前端界面，通过两条正则实现：

### 正则1：不发送给 AI

```yaml
脚本名称: [不发送]界面占位符
查找正则表达式: <StatusPlaceHolderImpl/>
替换为: （留空）
作用范围: AI输出
短暂: 仅格式提示词 ✅
```

### 正则2：显示界面

```yaml
脚本名称: [界面]状态栏
查找正则表达式: <StatusPlaceHolderImpl/>
替换为: （你的界面代码）
作用范围: AI输出
短暂: 仅格式显示 ✅
```

**效果：AI 看不到任何东西（不消耗 token），玩家看到你的界面。**

### 纯文本状态栏

```text
💖 白娅当前依存度: {{format_message_variable::stat_data.白娅.依存度}}
```

可以用 HTML + CSS 美化：

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

### 前端界面状态栏（可交互）

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

### 在消息开头显示界面

将正则2的查找改为 `/(.*)<StatusPlaceHolderImpl\/>/s`，替换为 `你的界面\n$1`。

### 记录玩家在前端界面的操作

如果玩家通过界面修改了变量（如购买物品），建议在变量中设置一个 `系统日志` 字段记录操作过程，否则 AI 会看到变量无理由变化并尝试"修正"。

---

## 特殊变量前缀

### `_` 前缀：只读变量

AI **能看见**但**不能更新**：

```yaml
世界:
  _类型: 魔法    # AI 看得到，但更新命令不会生效
```

### `$` 前缀：对 AI 不可见

AI **看不见**但**仍可被脚本/提示词更新**：

```yaml
世界:
  $类型: 魔法    # {{format_message_variable::stat_data}} 不展示
```

| 前缀 | AI 能看见 | AI 能更新 | 典型用途 |
| --- | --- | --- | --- |
| 无 | ✅ | ✅ | 普通变量 |
| `_` | ✅ | ❌ | 固定设定、角色名等不可改的值 |
| `$` | ❌ | ✅（需提示词引导） | 开局类型、隐藏标记等仅供 EJS/脚本使用的值 |

---

## Zod 4 语法速查

### 基础类型

```js
z.string()              // 字符串
z.coerce.number()       // 数值（推荐，自动类型转换）
z.boolean()             // 布尔值（不要用 z.coerce.boolean()）
z.literal('固定值')     // 固定字面量
```

### 对象类型

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

### 约束和转换

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

### 使用规则

| 规则 | 说明 |
| --- | --- |
| 优先用 `z.coerce.number()` | 自动类型转换，比 `z.number()` 更安全 |
| 不要用 `z.coerce.boolean()` | 直接用 `z.boolean()` |
| 优先用对象代替数组 | `z.record()` 比 `z.array()` 更好维护 |
| 用 `z.transform` 做约束 | 值被修复而非丢弃 |
| 用 `z.prefault` 代替 `z.default` | MVU ZOD 推荐写法 |
| `z.transform` 只能接受一个参数 | `(value) => ...` ✅，`(value, ctx) => ...` ❌ |
| 不要用 `.strict()` 或 `.passthrough()` | 它们不存在 |
| 不要 import `z` 或 `_` | 它们已全局可用 |
| 保持幂等性 | `Schema.parse(Schema.parse(input))` 必须等于 `Schema.parse(input)` |

---

## 常见问题

### Q1: 变量结构脚本放在哪里？

酒馆助手脚本库 → 角色脚本，条目名包含"变量结构"。

### Q2: `[mvu_update]` 前缀什么时候加？

| 条目 | 前缀 |
| --- | --- |
| 变量更新规则 | `[mvu_update]` ✅ |
| 变量输出格式 | `[mvu_update]` ✅ |
| 变量输出格式强调 | `[mvu_update]` ✅ |
| 变量列表 | 不加 ❌ |
| 初始变量 | `[initvar]` |

### Q3: EJS/状态栏读变量和 AI 更新变量的路径有什么区别？

- **EJS/状态栏读取**：`stat_data.白娅.依存度`
- **AI 更新（JSON Patch）**：`/白娅/依存度`（从变量根开始，不需要 `stat_data`）

### Q4: 为什么 `z` 和 `_` 不需要 import？

它们在 MVU ZOD 环境中已全局可用。import 反而会冲突。只需要 import `registerMvuSchema`。

### Q5: 如何在不同开局设置不同初始值？

- **全量方案**：在开局消息中用 `<initvar>...</initvar>` 包裹完整初始值
- **增量方案**：在开局消息中用 `<JSONPatch>` 进行增量修改

### Q6: 如何让中途新增的角色有默认值？

在变量结构中为角色字段设置 `prefault('待初始化')`，这样 AI 即使遗漏某些字段，角色也能成功新增，后续回复再初始化。

### Q7: 制作角色卡时的特殊设置？

输入框上方有 `启用/禁用提示词模板和酒馆助手宏` 按钮：

- **制作时**：禁用——让 AI 看到原始提示词代码
- **测试/游玩时**：启用——让 AI 看到处理后的结果

### Q8: 变量提示词只是提示词

变量列表、变量更新规则、变量输出格式，只是写在世界书里的提示词。正常世界书条目能怎么写，变量提示词就也可以：拆分条目、使用绿灯、用 EJS 实现动态提示词……

---

**整理者：秋青子**  
适用场景：SillyTavern + 酒馆助手 + MVU ZOD 变量框架
