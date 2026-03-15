// ==UserScript==
// @name         Pixiv Novel Contextual Translator (Desktop)
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  基于上下文的 Pixiv 同人文翻译工具（电脑端版本，依赖插件菜单）
// @author       Your Name
// @match        *://www.pixiv.net/novel/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      api.openai.com
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

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
        .novel-paragraph { cursor: pointer; transition: background-color 0.2s; }
        .novel-paragraph:hover { background-color: rgba(0, 150, 250, 0.05); }
        .trans-loading { color: #999; font-style: italic; }
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

    // --- 词库 ---
    function openGlossaryManager() {
        if (document.getElementById('glossary-modal')) return;

        const overlay = document.createElement('div');
        overlay.id = 'glossary-modal';
        overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:99999; display:flex; justify-content:center; align-items:center;';

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#fff; width:90%; max-width:500px; max-height:80vh; border-radius:8px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:flex; flex-direction:column; gap:12px;';

        const title = document.createElement('h3');
        title.innerText = '专有词库管理';
        title.style.cssText = 'margin:0; font-size:18px; color:#333;';

        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'flex-grow:1; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:4px; display:flex; flex-direction:column; gap:8px;';

        const createRow = (jp = '', zh = '') => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; gap:10px; align-items:center;';
            
            const jpInput = document.createElement('input');
            jpInput.type = 'text';
            jpInput.placeholder = '日文原文';
            jpInput.value = jp;
            jpInput.style.cssText = 'flex:1; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:14px; min-width:0;';
            
            const zhInput = document.createElement('input');
            zhInput.type = 'text';
            zhInput.placeholder = '中文翻译';
            zhInput.value = zh;
            zhInput.style.cssText = 'flex:1; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:14px; min-width:0;';
            
            const delBtn = document.createElement('button');
            delBtn.innerText = '删除';
            delBtn.style.cssText = 'padding:8px 12px; background:#ff4d4f; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:14px; white-space:nowrap;';
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
        addBtn.style.cssText = 'padding:10px; background:#f5f5f5; border:1px dashed #ccc; border-radius:4px; cursor:pointer; margin-top:5px; color:#333; font-size:14px;';
        addBtn.onclick = () => createRow();

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex; justify-content:flex-end; gap:10px; margin-top:10px;';

        const btnClose = document.createElement('button');
        btnClose.innerText = '取消';
        btnClose.style.cssText = 'padding:8px 16px; cursor:pointer; border:none; background:#e0e0e0; border-radius:4px; color:#333; font-size:14px;';
        btnClose.onclick = () => document.body.removeChild(overlay);

        const btnSave = document.createElement('button');
        btnSave.innerText = '保存词库';
        btnSave.style.cssText = 'padding:8px 16px; cursor:pointer; border:none; background:#0096fa; color:#fff; border-radius:4px; font-size:14px;';
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

        panel.appendChild(title);
        panel.appendChild(listContainer);
        panel.appendChild(addBtn);
        panel.appendChild(btnGroup);
        overlay.appendChild(panel);

        document.body.appendChild(overlay);
    }

    /**
     * 初始化监听器
     */
    function init() {
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

    GM_registerMenuCommand("设置 API Key", () => {
        const key = prompt("请输入 API Key:", CONFIG.apiKey);
        if (key) { GM_setValue('api_key', key); location.reload(); }
    });

    GM_registerMenuCommand("管理专有词库", openGlossaryManager);

    init();
})();
