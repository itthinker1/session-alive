# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Session Alive 是一个 Chrome 浏览器扩展（Manifest V3），用于保持网页会话活跃状态。它通过以下两种方式工作：

1. **后台请求（Background Request）**：定期在后台发送 AJAX 请求来保持会话
2. **前台自动重载（Foreground Auto-Reload）**：定期自动刷新当前页面

## 安装和测试

### 加载扩展

**Chrome 开发模式：**
1. 打开 `chrome://extensions`
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目根目录

**Firefox（如有需要）：**
- 使用 `v2branch` 分支
- 在 `about:debugging` 中加载为临时扩展

### 测试规则

1. 导航到目标网站并登录
2. 点击扩展图标打开弹窗
3. 点击"为当前页面添加规则"按钮
4. 页面会自动重载，规则开始生效

## 核心架构

### 主要组件

1. **background.js** - Service Worker
   - 管理所有规则逻辑和存储
   - 处理来自内容脚本和弹窗的消息
   - 维护 `aliveRules`（本地存储的规则）和 `runningRules`（当前运行的规则）
   - 使用 `chrome.storage.local` 存储持久化规则
   - 使用 `chrome.storage.session` 存储运行中的规则状态
   - 关键函数：
     - `handleMessage()` - 消息路由中心
     - `handleInitializeMsg()` - 处理页面初始化，匹配规则
     - `handleRunningRules()` - 检查并执行已运行的规则
     - `handleAjax()` - 处理后台 AJAX 请求响应

2. **inject/cs.js** - 内容脚本
   - 注入到所有网页（`<all_urls>`）
   - 在页面上显示倒计时器（前台模式）
   - 发送后台 AJAX 请求（后台模式）
   - 关键函数：
     - `init()` - 初始化并通知后台脚本
     - `handleResponse()` - 处理来自后台脚本的命令
     - `startCountdown()` - 前台倒计时器，页面重载
     - `scheduleRule()` - 后台 AJAX 请求调度

3. **popup/popup.js** - 扩展弹窗
   - 显示当前运行的规则列表
   - 提供"添加当前页面规则"快捷按钮
   - 取消运行中的规则

4. **settings/settings.js** - 设置页面
   - 规则 CRUD（创建、读取、更新、删除）
   - 导入/导出规则为 JSON
   - 表单验证（包括 URL 重复检查）

### 数据结构

**规则对象结构：**
```javascript
{
  rule_name: string,        // 规则名称
  rule_disable: boolean,      // 是否禁用
  trigger_uri: string,       // 后台触发 URL（支持通配符 *）
  loop_uri: string,          // 后台请求 URL（可选）
  loop_interval: number,      // 后台请求间隔（分钟）
  loop_exit_200: boolean,     // 非 200 响应是否停止
  bg_head_only: boolean,      // 是否仅发送 HEAD 请求
  fg_trigger_uri: string,     // 前台触发 URL
  fg_interval: number,        // 前台重载间隔（分钟）
  fg_reload_sound: boolean,   // 重载前是否播放提示音
  notif_bgrequest: boolean,   // 后台请求成功通知
  notif_bgexit: boolean,     // 后台规则停止通知
  notif_fgreload: boolean,   // 前台重载通知
  notif_fgexit: boolean,      // 前台规则停止通知
  regexPattern: string,        // 通配符正则源（存储用）
  compiledRegex: RegExp        // 编译后的正则（运行时用）
}
```

### 消息流

```
页面加载 → cs.js init() → background.js Initialize
                                 ↓
                          匹配规则 → runningRules 添加条目
                                 ↓
background.js → cs.js handleResponse() → 执行规则
                                 ↓
                          前台：startCountdown() → 页面重载
                          后台：scheduleRule() → AJAX 请求
                                 ↓
                          cs.js → background.js Ajax 事件 → 循环继续/停止
```

## 开发注意事项

### 通配符 URL 匹配

- 触发 URL 支持 `*` 通配符（如 `https://example.com/*`）
- 使用正则表达式编译实现匹配
- 在 `updateRules()` 和 `updateVariables()` 中编译正则
- `compiledRegex.test(uri)` 用于匹配检查

### 存储策略

- `chrome.storage.local`：持久化规则配置
- `chrome.storage.session`：运行时状态（runningRules）
- 后台脚本初始化时从两个存储区加载数据

### 多账户容器支持（Firefox）

- 规则与 `cookieStoreId` 关联
- 运行规则 ID 格式：`ruleId + domain + cookieStoreId`
- 同一规则可在不同容器中独立运行

### 本地化（i18n）

- 翻译文件位于 `_locales/{语言代码}/messages.json`
- 使用 `chrome.i18n.getMessage()` 获取翻译
- 所有 UI 文本都支持本地化
- 当前支持语言：en, de, es, fr, nl, sv

### 主题支持

- 使用 Bootstrap 的 `data-bs-theme` 属性
- 支持系统深色/浅色模式自动切换
- 手动切换通过设置页面的主题开关

### 调试

- 打开浏览器控制台查看详细日志
- 查看存储：`chrome.storage.local.get()` 和 `chrome.storage.session.get()`
- 查看运行中的规则：弹窗会显示规则列表

## 文件结构

```
├── manifest.json          # 扩展清单（MV3）
├── background.js          # Service Worker（核心逻辑）
├── inject/
│   ├── cs.js             # 内容脚本
│   └── cs.css            # 内容脚本样式
├── popup/
│   ├── popup.html/js/css  # 扩展弹窗
│   └── filters.svg        # 图标
├── settings/
│   ├── settings.html/js/css # 设置页面
│   └── Open.svg          # 图标
├── views/
│   ├── installed.html      # 首次安装页面
│   ├── updated.html        # 更新后页面
│   └── views.js          # 视图脚本
├── _locales/{语言}/      # 翻译文件
├── assets/
│   ├── icon/             # 扩展图标
│   └── settings/         # 设置页面图标
├── beep.wav              # 重载提示音
└── translate.js          # 翻译辅助函数
```

## 常见任务

### 添加新翻译

1. 在 `_locales/` 下创建新语言文件夹（如 `zh/`）
2. 复制 `messages.json` 模板并翻译所有消息
3. 参考 `_locales/en/messages.json` 查看完整键列表

### 修改规则匹配逻辑

- 主要在 `background.js` 的 `handleInitializeMsg()` 和 `handleRunningRules()` 中
- 注意处理通配符 URL 使用 `compiledRegex.test()`
- URL 比较前统一小写并去除末尾斜杠

### 调整内容脚本行为

- 修改 `inject/cs.js`
- 注意：内容脚本在每次页面加载时都会重新初始化
- 使用 `chrome.runtime.sendMessage()` 与后台脚本通信

## 版本控制

- 当前分支：`chrome-mv3`（Chrome）
- Firefox 分支：`v2branch`
- 版本号在 `manifest.json` 中定义
