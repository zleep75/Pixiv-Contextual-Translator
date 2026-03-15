// ==UserScript==
// @name         Pixiv Novel Contextual Translator (Mobile)
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  基于上下文的 Pixiv 同人文翻译工具（移动端版本，包含悬浮设置按钮）
// @author       Your Name
// @match        *://www.pixiv.net/novel/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      api.openai.com
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // --- 配置与常量 ---
    const CONFIG = {
        apiEndpoint: GM_getValue('api_endpoint', 'https://api.openai.com/v1/chat/completions'),
        apiKey: GM_getValue('api_key', ''),
        model: GM_getValue('model', 'gpt-3.5-turbo'),
        glossary: GM_getValue('glossary', {}), 
        contextRange: 2 
    };

    // --- 样式注入 ---
    const style = document.createElement('style');
    style.innerHTML = `
        .trans-result {
            display: block;
            margin-top: 8px;
            padding: 10px;
            background-color: #f0f7ff;
            border-left: 4px solid #0096fa;
            font-size: 0.95em;
            color: #333;
            line-height: 1.6;
            word-wrap: break-word;
        }
        .novel-paragraph { cursor: pointer; }
        .trans-loading { color: #999; font-style: italic; }
        
        /* 移动端悬浮按钮样式 */
        .mobile-fab {
            position: fixed;
            bottom: 24px;
            right: 24px;
            width: 48px;
            height: 48px;
            background-color: rgba(0, 150, 250, 0.85);
            color: white;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 22px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 99998;
            border: none;
            backdrop-filter: blur(4px);
        }
    `;
    document.head.appendChild(style);

    // --- 核心逻辑 ---

    function buildPrompt(target, context) {
        const glossaryStr = Object.entries(CONFIG.glossary)
            .map(([jp, zh]) => `${jp} -> ${zh}`)
            .join('\n');

        return `你是一位专业的轻小说翻译家。请根据提供的上下文，将目标段落翻译成中文。
注意：
1. 保持原文风格。
2. 尤其注意日文主语省略问题，根据上下文推断正确的动作主体。
3. 遵循以下专有名词对应关系：
${glossaryStr}

上下文：
${context.join('\n')}

目标段落：
${target}

请直接输出目标段落的翻译结果，不要包含任何解释。`;
    }

    async function fetchTranslation(prompt) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: CONFIG.apiEndpoint,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CONFIG.apiKey}`
                },
                data: JSON.stringify({
                    model: CONFIG.model,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3
                }),
                onload: (res) => {
                    try {
                        const json = JSON.parse(res.responseText);
                        if (json.error) {
                            reject(json.error.message || "API 返回错误");
                            return;
                        }
                        resolve(json.choices[0].message.content.trim());
                    } catch (e) {
                        reject("解析失败: " + e.message);
                    }
                },
                onerror: (err) => reject("网络错误")
            });
        });
    }

    async function handleParagraphClick(event) {
        const targetNode = event.currentTarget;
        
        if (!CONFIG.apiKey) {
            const key = prompt("未检测到 API Key。请在此处输入您的 API Key：");
            if (key) { 
                GM_setValue('api_key', key); 
                CONFIG.apiKey = key; 
            } else { 
                return; 
            }
        }

        let loadingNode = targetNode.nextSibling;
        const hasExistingTranslation = loadingNode && loadingNode.classList && loadingNode.classList.contains('trans-result');

        if (hasExistingTranslation) {
            if (loadingNode.classList.contains('trans-loading')) return;
            loadingNode.innerText = '正在重新翻译中...';
            loadingNode.classList.add('trans-loading');
            loadingNode.style.color = '#999';
        } else {
            loadingNode = document.createElement('div');
            loadingNode.className = 'trans-result trans-loading';
            loadingNode.innerText = '正在翻译中...';
            targetNode.after(loadingNode);
        }

        const allParagraphs = Array.from(document.querySelectorAll('p'));
        const index = allParagraphs.indexOf(targetNode);

        if (index === -1) {
            loadingNode.innerText = "错误：无法定位当前段落索引";
            loadingNode.classList.remove('trans-loading');
            return;
        }

        const start = Math.max(0, index - CONFIG.contextRange);
        const end = Math.min(allParagraphs.length, index + CONFIG.contextRange + 1);
        const context = allParagraphs.slice(start, end).map(p => p.innerText);

        try {
            const prompt = buildPrompt(targetNode.innerText, context);
            const translation = await fetchTranslation(prompt);
            loadingNode.innerText = translation;
            loadingNode.classList.remove('trans-loading');
            loadingNode.style.color = '#333';
        } catch (error) {
            loadingNode.innerText = "翻译出错: " + error;
            loadingNode.style.color = "red";
            loadingNode.classList.remove('trans-loading');
        }
    }

    // --- 移动端设置面板 ---
    function openSettingsManager() {
        if (document.getElementById('settings-modal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'settings-modal';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:99999; display:flex; justify-content:center; align-items:center;';

        const panel = document.createElement('div');
        // 增大移动端触控内边距
        panel.style.cssText = 'background:#fff; width:92%; max-width:400px; max-height:85vh; border-radius:12px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.2); display:flex; flex-direction:column; gap:16px;';

        const headerRow = document.createElement('div');
        headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center;';
        
        const title = document.createElement('h3');
        title.innerText = '翻译设置与词库';
        title.style.cssText = 'margin:0; font-size:18px; color:#333;';
        
        // 将 API Key 设置集成在此面板中，方便手机端操作
        const btnApiKey = document.createElement('button');
        btnApiKey.innerText = '🔑 API Key';
        btnApiKey.style.cssText = 'padding:6px 12px; background:#f0f0f0; border:none; border-radius:6px; font-size:13px; color:#333;';
        btnApiKey.onclick = () => {
            const key = prompt("请输入新的 API Key:", CONFIG.apiKey);
            if (key) { GM_setValue('api_key', key); CONFIG.apiKey = key; }
        };

        headerRow.appendChild(title);
        headerRow.appendChild(btnApiKey);

        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'flex-grow:1; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:8px; display:flex; flex-direction:column; gap:10px; background:#fafafa;';

        const createRow = (jp = '', zh = '') => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; gap:8px; align-items:center;';
            
            const jpInput = document.createElement('input');
            jpInput.type = 'text';
            jpInput.placeholder = '日文原文';
            jpInput.value = jp;
            jpInput.style.cssText = 'flex:1; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:15px; min-width:0; background:#fff;';
            
            const zhInput = document.createElement('input');
            zhInput.type = 'text';
            zhInput.placeholder = '中文翻译';
            zhInput.value = zh;
            zhInput.style.cssText = 'flex:1; padding:10px; border:1px solid #ddd; border-radius:6px; font-size:15px; min-width:0; background:#fff;';
            
            const delBtn = document.createElement('button');
            delBtn.innerText = '×';
            delBtn.style.cssText = 'padding:0; width:36px; height:36px; background:#ff4d4f; color:#fff; border:none; border-radius:6px; font-size:18px; line-height:36px; text-align:center;';
            delBtn.onclick = () => row.remove();
            
            row.appendChild(jpInput);
            row.appendChild(zhInput);
            row.appendChild(delBtn);
            listContainer.appendChild(row);
        };

        for (const [jp, zh] of Object.entries(CONFIG.glossary)) {
            createRow(jp, zh);
        }

        const addBtn = document.createElement('button');
        addBtn.innerText = '+ 添加新词条';
        addBtn.style.cssText = 'padding:12px; background:#e6f7ff; border:1px dashed #91d5ff; border-radius:6px; color:#0096fa; font-size:15px; font-weight:bold;';
        addBtn.onclick = () => createRow();

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex; justify-content:flex-end; gap:12px; margin-top:8px;';

        const btnClose = document.createElement('button');
        btnClose.innerText = '取消';
        btnClose.style.cssText = 'flex:1; padding:12px; border:none; background:#e0e0e0; border-radius:8px; color:#333; font-size:16px; font-weight:bold;';
        btnClose.onclick = () => document.body.removeChild(overlay);

        const btnSave = document.createElement('button');
        btnSave.innerText = '保存生效';
        btnSave.style.cssText = 'flex:1; padding:12px; border:none; background:#0096fa; color:#fff; border-radius:8px; font-size:16px; font-weight:bold;';
        btnSave.onclick = () => {
            const newGlossary = {};
            const rows = listContainer.querySelectorAll('div');
            
            rows.forEach(row => {
                const inputs = row.querySelectorAll('input');
                const jpVal = inputs[0].value.trim();
                const zhVal = inputs[1].value.trim();
                if (jpVal && zhVal) {
                    newGlossary[jpVal] = zhVal;
                }
            });
            
            CONFIG.glossary = newGlossary;
            GM_setValue('glossary', newGlossary);
            document.body.removeChild(overlay);
        };

        btnGroup.appendChild(btnClose);
        btnGroup.appendChild(btnSave);

        panel.appendChild(headerRow);
        panel.appendChild(listContainer);
        panel.appendChild(addBtn);
        panel.appendChild(btnGroup);
        overlay.appendChild(panel);

        document.body.appendChild(overlay);
    }

    // --- 注入移动端悬浮按钮 ---
    function injectFloatingButton() {
        const fab = document.createElement('button');
        fab.className = 'mobile-fab';
        fab.innerHTML = '⚙️'; 
        fab.onclick = openSettingsManager;
        document.body.appendChild(fab);
    }

    /**
     * 初始化监听器
     */
    function init() {
        injectFloatingButton();

        const observer = new MutationObserver(() => {
            const paragraphs = document.querySelectorAll('p');
            paragraphs.forEach(p => {
                if (!p.dataset.handlerBound) {
                    p.classList.add('novel-paragraph');
                    p.addEventListener('click', handleParagraphClick);
                    p.dataset.handlerBound = "true";
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    init();
})();
