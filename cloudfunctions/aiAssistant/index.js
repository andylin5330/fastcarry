const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ==========================================
// AI 配置区域
// ==========================================
const AI_CONFIG = {
    // 优先从环境变量获取 API Key (process.env.AI_API_KEY)
    // ⚠️ 请在云开发控制台 -> 云函数 -> aiAssistant -> 版本与配置 -> 配置 -> 环境变量 中添加 AI_API_KEY
    apiKey: process.env.AI_API_KEY,

    // API 地址 (默认为 DeepSeek 地址，可根据服务商修改)
    apiUrl: 'https://api.deepseek.com/chat/completions',

    // 模型名称
    // DeepSeek: deepseek-chat
    // Moonshot: moonshot-v1-8k
    model: 'deepseek-chat'
};

// 知识库上下文
const KNOWLEDGE_BASE = `
你是 FastCarry (快带) 的智能客服助手。
你不仅要基于平台规则回答专业问题，还可以像朋友一样与用户进行日常闲聊。
即使问题超出平台业务范围，也请尽量给出有趣、有帮助的回答，不要生硬拒绝。

1. 平台定位：FastCarry 是一个连接"带物人"（有行李额度的旅客）和"寄送人"（需要寄送物品的用户）的互助物流平台。
2. 违禁品清单：严禁携带易燃易爆物品、武器、毒品、活体动植物、未经检疫食品、侵权物品等。
3. 交易流程：
   - 寄送方：发布需求 -> 协商下单 -> 支付到平台担保 -> 交货 -> 确认收货 -> 交易完成。
   - 带物方：发布行程 -> 接单 -> 确认收物 -> 带物 -> 对方确认收货 -> 收款。
4. 安全保障：平台提供资金托管（担保交易），建议实名认证，切勿私下通过微信/支付宝转账，以免被骗。
5. 费用说明：运费由双方协商，系统仅提供参考。建议参考物品重量、体积和飞行距离。
6. 纠纷处理：先友好协商，无法解决请联系平台客服介入。
7. 账号问题：使用微信一键登录，无需单独注册。
`;

// 发送 HTTP 请求的辅助函数
function callLLM(messages) {
    return new Promise((resolve, reject) => {
        const url = new URL(AI_CONFIG.apiUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_CONFIG.apiKey}`
            },
            timeout: 30000 // 30秒超时
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (res.statusCode >= 400) {
                        reject(new Error(`API Error: ${result.error?.message || res.statusMessage}`));
                    } else {
                        resolve(result);
                    }
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        // 构造请求体
        const body = JSON.stringify({
            model: AI_CONFIG.model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 500
        });

        req.write(body);
        req.end();
    });
}

exports.main = async (event, context) => {
    const { text } = event;
    const normalizedText = text ? text.trim() : '';

    if (!normalizedText) {
        return { reply: '🤔 您好，请问有什么可以帮您？' };
    }

    const db = cloud.database();
    const _ = db.command;
    const { OPENID } = cloud.getWXContext();

    try {
        // 1. 获取历史消息 (最近 10 条)
        const historyRes = await db.collection('messages')
            .where({
                _openid: OPENID
            })
            .orderBy('createTime', 'desc')
            .limit(10)
            .get();

        // 历史消息是倒序的，需要反转为正序
        const history = historyRes.data.reverse()
            .map(msg => ({
                role: msg.role,
                content: msg.content
            }))
            .filter(msg => msg.role && msg.content);

        // 2. 构造请求消息体
        const messages = [
            { role: "system", content: KNOWLEDGE_BASE },
            ...history,
            { role: "user", content: normalizedText }
        ];

        // 检查 API Key 是否配置
        if (!AI_CONFIG.apiKey) {
            throw new Error('API Key not configured');
        }

        // 3. 调用大模型
        // 注意：callLLM 函数也需要修改为接收 messages 数组
        const result = await callLLM(messages);

        // 解析返回结果，兼容 OpenAI 格式
        let reply = '';
        if (result.choices && result.choices.length > 0) {
            reply = result.choices[0].message.content;
        } else {
            reply = '抱歉，我暂时无法处理您的请求，请稍后再试。';
        }

        // 4. 保存用户消息
        try {
            await db.collection('messages').add({
                data: {
                    _openid: OPENID,
                    role: 'user',
                    content: normalizedText,
                    createTime: db.serverDate()
                }
            });

            // 5. 保存 AI 回复
            await db.collection('messages').add({
                data: {
                    _openid: OPENID,
                    role: 'assistant',
                    content: reply,
                    createTime: db.serverDate()
                }
            });
        } catch (dbErr) {
            console.error('保存消息记录失败:', dbErr);
            // 数据库保存失败不应影响回复用户的流程
        }

        return { reply };

    } catch (err) {
        console.error('LLM调用失败，回退到规则匹配模式:', err);

        // --- 降级处理：使用原有的关键词匹配逻辑 ---
        const faqs = [
            {
                keywords: ['取消', '退款', '退单', '不想要'],
                reply: '📦 **订单取消/退款流程**\n\n您可以按以下步骤操作：\n1. 打开"我的"页面\n2. 选择"我寄送的"或"我发布的"\n3. 找到对应订单\n4. 点击"取消订单"或"申请退款"\n\n⚠️ 注意：已发货订单可能无法取消，请及时联系带物人协商。'
            },
            {
                keywords: ['违禁品', '禁运', '不能带', '禁止', '限制'],
                reply: '🚫 **违禁品清单**\n\n以下物品严禁携带：\n• 易燃易爆物品\n• 管制刀具\n• 毒品\n• 活体动植物\n• 未经检疫食品\n\n详细清单请参考国家相关法律法规。'
            },
            {
                keywords: ['安全', '靠谱', '可靠', '支付', '保障'],
                reply: '🔒 **平台安全保障**\n\nFastCarry 提供担保交易，资金由平台托管。请务必在平台内完成支付，切勿私下转账。'
            },
            {
                keywords: ['价格', '邮费', '运费', '费用'],
                reply: '💰 **运费说明**\n\n运费由寄送人和带物人协商确定，系统仅提供参考。建议参考物品重量和距离。'
            },
            {
                keywords: ['人工', '客服', '电话'],
                reply: '👩‍💼 若您需要人工服务，请在工作时间（9:00-18:00）致电 400-XXX-XXXX。'
            }
        ];

        let fallbackReply = "抱歉，AI 服务暂时不可用。您可以尝试询问：订单取消、违禁品、安全保障、运费等问题。";

        const lowerText = normalizedText.toLowerCase();
        for (const faq of faqs) {
            if (faq.keywords.some(k => lowerText.includes(k))) {
                fallbackReply = faq.reply;
                break;
            }
        }

        // 如果是 API Key 未配置的错误，提示开发者
        if (err.message === 'API Key not configured') {
            console.error('API Key 未配置。请在云开发控制台 -> 云函数 -> aiAssistant -> 版本与配置 -> 配置 -> 环境变量 中添加 AI_API_KEY。');
            return { reply: '配置错误：未找到 API Key。请在云函数环境变量中配置 AI_API_KEY。' };
        }

        // 调试模式：将具体错误返回给前端以便排查 (如 API 错误或网络错误)
        fallbackReply += `\n\n(调试信息: ${err.message})`;

        return { reply: fallbackReply };
    }
}
