export default {
    async scheduled(event, env, ctx) {
        await handleSchedule(env);
    },

    async fetch(request, env) {
        // 用于手动触发测试
        await handleSchedule(env);
        return new Response('执行完成', { status: 200 });
    }
};

async function handleSchedule(env) {
    try {
        console.log('=== 开始执行定时任务 ===');

        // 1. 抓取新闻
        console.log('[步骤1] 开始抓取新闻...');
        const newsContent = await fetchNews();
        if (!newsContent) {
            console.log('[步骤1] 未找到符合条件的新闻内容，退出');
            return; // 未找到内容，静默退出
        }
        console.log('[步骤1] 成功抓取新闻，内容长度:', newsContent.length);

        // 2. 转换格式并翻译
        console.log('[步骤2] 开始翻译内容...');
        const translatedContent = await translateContent(newsContent);
        if (!translatedContent) {
            console.log('[步骤2] 翻译失败，退出');
            return; // 翻译失败，静默退出
        }
        console.log('[步骤2] 翻译成功，内容长度:', translatedContent.length);

        // 3. 推送到 Bark
        console.log('[步骤3] 开始推送到 Bark...');
        await pushToBark(env.BARK_DEVICE_KEY, translatedContent);
        console.log('=== 任务执行完成 ===');
    } catch (error) {
        // 静默处理错误
        console.error('❌ 任务执行出错:', error.message);
        console.error(error);
    }
}

// 抓取新闻
async function fetchNews() {
//    const response = await fetch('https://api.mktnews.net/api/flash/host');
    const response = await fetch('https://static.mktnews.net/json/flash/en.json');
    const json = await response.json();

    if (!Array.isArray(json)) {
        return null;
    }

    // 在 1001 节点的 flash_list 中直接搜索标题包含 "【Past 24 Hours" 的新闻
    const targetNews = json.find(item =>
        item.data && item.data.content && item.data.content.includes('【Past 24 Hours')
    );

    if (targetNews && targetNews.data && targetNews.data.content) {
        return targetNews.data.content;
    }

    console.log('  ✗ 未找到包含 "【Past 24 Hours" 的新闻');
    return null;
}

// 翻译内容
async function translateContent(content) {
    // 去掉标题部分 "【Past 24 Hours: Key News - MKTNews 】"
    content = content.replace(/【Past 24 Hours.*?】/i, '').trim();

    // 将 <b> 和 </b> 替换为占位符，<br/> 替换为换行占位符
    let processedContent = content
        .replace(/<b>/g, '【B】')
        .replace(/<\/b>/g, '【/B】')
        .replace(/<br\s*\/?>/gi, '【BR】');

    // 一次性翻译整个内容
    const translatedContent = await translateText(processedContent);
    if (!translatedContent) {
        console.log('  ✗ 翻译失败');
        return null;
    }

    // 还原为 markdown 格式
    const finalContent = translatedContent
        .replace(/【B】/g, '**')
        .replace(/【\/B】/g, '**')
        .replace(/【BR】/g, '\n\n');

    return finalContent;
}

// 调用 Google Translate API（非官方）
async function translateText(text) {
    try {
        const encodedText = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=en&tl=zh-CN&q=${encodedText}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const responseText = await response.text();

        // 解析响应 - Google 返回格式: [[["翻译文本","原文本",null,null,10]],null,"en",...]
        const json = JSON.parse(responseText);

        // 提取翻译结果：json[0] 是翻译数组，每个元素的第一项是翻译文本
        if (json && json[0] && Array.isArray(json[0])) {
            let translatedText = '';
            for (const item of json[0]) {
                if (Array.isArray(item) && item[0]) {
                    translatedText += item[0];
                }
            }
            return translatedText;
        }

        console.error('    ✗ 翻译 API 返回格式错误:', responseText.substring(0, 200));
        return null;
    } catch (error) {
        console.error('    ✗ 翻译 API 请求异常:', error.message);
        return null;
    }
}

// 推送到 Bark
async function pushToBark(deviceKey, content) {
    if (!deviceKey) {
        console.error('  ✗ BARK_DEVICE_KEY 未设置');
        return;
    }

    try {
        const response = await fetch('https://api.day.app/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                group: 'MKTNews',
                markdown: content,
                device_key: deviceKey
            })
        });

        const result = await response.json();
        if (result.code === 200) {
        } else {
            console.error('  ✗ Bark 推送失败:', result);
        }
    } catch (error) {
        console.error('  ✗ Bark 推送请求异常:', error.message);
    }
}