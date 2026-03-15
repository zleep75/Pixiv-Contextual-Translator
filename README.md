# Pixiv Novel Contextual Translator

这是一个用于浏览器的 Tampermonkey（油猴）脚本，专为阅读 Pixiv 同人小说设计。它通过调用大语言模型（LLM）API，结合上下文对段落进行就地翻译，有效解决传统机器翻译中因日语主语省略导致的视角混乱问题。

## 核心功能

* **上下文感知翻译**：自动抓取目标段落及其前后各两段内容作为上下文，利用大模型精确推断动作主体，保证连贯的人物视角。
* **移动端深度适配**：采用无侧边栏、无悬浮窗的极致轻量设计。点击目标段落后，翻译结果会直接以新的 DOM 节点插入在原文下方，非常适合在 Kiwi Browser 等支持插件的移动端浏览器中使用。
* **可视化专有词库**：内置图形化界面的词库管理器。支持对专有词汇（如角色名、特定世界观设定）进行“日文-中文”键值对的增删改查。词库数据保存在本地，并在请求时自动注入大模型提示词。
* **支持重新翻译**：点击已生成翻译结果的段落，可清空旧数据并重新触发 API 请求。

## 安装指南

1. **准备环境**：
   * 电脑端：在 Chrome、Edge 等浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展。
   * 手机端（Android）：安装 [Kiwi Browser](https://kiwibrowser.com/)，并在其扩展商店中安装 Tampermonkey。
2. **安装脚本**：
   * 在 Tampermonkey 中点击“添加新脚本”。
   * 清空默认内容，将本项目中的代码完整粘贴进去。
   * 保存并启用脚本。

## 使用说明

1. **配置 API Key**：
   * 打开任意一篇 Pixiv 小说正文页面（URL 规则：`*://www.pixiv.net/novel/*`）。
   * 首次点击页面上的任意日文段落时，系统会自动弹窗请求输入 API Key（默认调用 OpenAI API 格式）。
   * 你也可以随时通过点击浏览器右上角的 Tampermonkey 扩展图标，在当前脚本菜单下点击**“设置 API Key”**进行修改。
2. **执行翻译**：
   * 将鼠标或手指停留在日文段落上，直接点击即可触发翻译。
   * 原文下方会显示“正在翻译中...”，请求完成后自动替换为中文。
3. **管理词库**：
   * 点击 Tampermonkey 扩展图标，选择**“管理专有词库”**。
   * 在弹出的可视化面板中添加日文原文及对应的中文翻译，点击保存即可立即生效。

## 高级配置 (开发者选项)

如果你需要使用其他兼容 OpenAI 格式的大模型 API（如 DeepSeek、Claude 代理等），请在油猴脚本代码的 `CONFIG` 对象中手动修改以下参数：

```javascript
const CONFIG = {
    apiEndpoint: GM_getValue('api_endpoint', '[https://api.openai.com/v1/chat/completions](https://api.openai.com/v1/chat/completions)'), // 替换为你的 API 地址
    model: GM_getValue('model', 'gpt-3.5-turbo'), // 替换为你使用的模型名称
    // ... 其他配置
};
