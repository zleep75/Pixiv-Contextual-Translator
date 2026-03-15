# Pixiv Novel Contextual Translator

这是一个用于浏览器的 Tampermonkey（油猴）脚本，专为阅读 Pixiv 同人小说设计。它通过调用大语言模型（LLM）API，结合上下文对段落进行就地翻译，有效解决传统机器翻译中因日语主语省略导致的视角混乱问题。

本项目包含两个版本，分别针对电脑端和移动端进行了交互优化。

## 核心功能

- **上下文感知翻译**：自动抓取目标段落及其前后各两段内容作为上下文，利用大模型精确推断动作主体，保证连贯的人物视角。
    
- **可视化专有词库**：内置图形化界面的词库管理器。支持对专有词汇（如角色名、特定世界观设定）进行“日文-中文”键值对的增删改查。词库数据保存在本地，并在请求时自动注入大模型提示词。
    
- **支持重新翻译**：点击已生成翻译结果的段落，可清空旧数据并重新触发 API 请求。
    
- **无侵入式就地展示**：翻译结果直接以新的 DOM 节点插入在原文下方，无需侧边栏或独立悬浮窗。
    

## 版本说明

请根据您的阅读设备选择对应的脚本文件进行安装：

- **Desktop 版 (`desktop.user.js`)**：
    
    - **适用场景**：电脑端浏览器（Chrome、Edge 等）。
        
    - **特点**：页面极致整洁，不注入任何额外 UI 元素。所有的设置操作（API Key 设置、词库管理）均通过点击浏览器右上角的 Tampermonkey 扩展菜单进行。
        
- **Mobile 版 (`mobile.user.js`)**：
    
    - **适用场景**：移动端浏览器（如 Android 的 Kiwi Browser）。
        
    - **特点**：针对手机触屏优化。在网页右下角注入了一个半透明的悬浮齿轮按钮（⚙️），点击即可一键呼出管理面板。面板的内边距、按钮尺寸均针对手指触控进行了放大处理，解决了手机端难以呼出插件原生菜单的痛点。
        

## 安装指南

1. **准备环境**：
    
    - 电脑端：在浏览器扩展商店安装 Tampermonkey。
        
    - 手机端：安装支持扩展的 Kiwi Browser，并在其扩展商店中安装 Tampermonkey。
        
2. **安装脚本**：
    
    - 在 Tampermonkey 中点击“添加新脚本”。
        
    - 清空默认内容，将本项目中对应的代码（`desktop.user.js` 或 `mobile.user.js`）完整粘贴进去。
        
    - 保存并启用脚本。
        

## 使用说明

1. **配置 API Key**：
    
    - 打开任意一篇 Pixiv 小说正文页面（URL 规则：`*://www.pixiv.net/novel/*`）。
        
    - 首次点击页面上的任意日文段落时，系统会自动弹窗请求输入 API Key（默认调用 OpenAI API 格式）。
        
    - **修改方式**：
        
        - Desktop 版：点击 Tampermonkey 扩展图标 -> “设置 API Key”。
            
        - Mobile 版：点击右下角悬浮齿轮按钮 -> 面板顶部的“🔑 API Key”。
            
2. **执行翻译**：
    
    - 将鼠标或手指停留在日文段落上，直接点击即可触发翻译。
        
    - 原文下方会显示“正在翻译中...”，请求完成后自动替换为中文。
        
3. **管理词库**：
    
    - **呼出面板**：
        
        - Desktop 版：点击 Tampermonkey 扩展图标 -> “管理专有词库”。
            
        - Mobile 版：点击页面右下角的悬浮齿轮按钮。
            
    - 在弹出的可视化面板中添加日文原文及对应的中文翻译，点击保存即可立即生效。
        

## 高级配置 (开发者选项)

脚本默认使用 OpenAI 的 `https://api.openai.com/v1/chat/completions` 接口和 `gpt-3.5-turbo` 模型。 如果您需要使用其他兼容 OpenAI 格式的大模型 API（如 DeepSeek、Claude 代理等），请在油猴脚本代码的 `CONFIG` 对象中手动修改以下参数：

```
const CONFIG = {
    apiEndpoint: GM_getValue('api_endpoint', '[https://api.your-custom-endpoint.com/v1/chat/completions](https://api.your-custom-endpoint.com/v1/chat/completions)'), 
    model: GM_getValue('model', 'your-preferred-model'), 
    // ... 其他配置
};
```

## 技术栈

- 原生 JavaScript (ES6+)
    
- HTML/CSS (DOM 动态操作)
    
- Tampermonkey API (`GM_xmlhttpRequest`, `GM_setValue`, `GM_getValue`, `GM_registerMenuCommand`)
    

## 开源协议 (License)

本项目采用 MIT License。 您可以自由地使用、修改和分发本项目的代码，只需在副本中保留原作者的版权声明即可。
