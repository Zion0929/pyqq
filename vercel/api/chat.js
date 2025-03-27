/**
 * Vercel聊天API端点
 * 负责接收聊天消息并调用派欧云API获取回复
 */

// 导入axios用于HTTP请求
const axios = require('axios');

// 派欧云API配置
const PAICLOUD_API_URL = process.env.PAICLOUD_API_URL || 'https://api.paicloud.com/v1/chat/completions';
const PAICLOUD_API_KEY = process.env.PAICLOUD_API_KEY || '';
const MODEL = 'deepseek/deepseek-v3-0324';

/**
 * 处理聊天请求
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
module.exports = async (req, res) => {
    // 允许跨域请求
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // 仅接受POST请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '仅支持POST请求' });
    }
    
    try {
        const { message, history, friend } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: '消息内容不能为空' });
        }
        
        // 构建系统指令
        let systemPrompt = "你是一个AI助手，与用户进行友好的对话。";
        
        // 如果提供了AI好友信息，根据特性调整系统提示
        if (friend && friend.personality) {
            systemPrompt = `你是一个名叫${friend.name}的AI助手，性格特点是：${friend.personality}。请以这个角色与用户对话，保持一致的语气和风格。回复应该简洁自然，像真人聊天一样。`;
        }
        
        // 构建消息历史
        let messages = [
            { role: "system", content: systemPrompt }
        ];
        
        // 添加聊天历史
        if (history && Array.isArray(history) && history.length > 0) {
            messages = messages.concat(history);
        }
        
        // 添加当前用户消息
        messages.push({ role: "user", content: message });
        
        // 调用派欧云API
        const response = await callPaiCloudAPI(messages);
        
        return res.status(200).json({ reply: response });
    } catch (error) {
        console.error('处理聊天请求时出错:', error);
        
        // 如果是API调用错误，尝试返回具体错误信息
        if (error.response && error.response.data) {
            return res.status(500).json({ 
                error: '调用AI服务失败', 
                details: error.response.data 
            });
        }
        
        return res.status(500).json({ error: '服务器错误', message: error.message });
    }
};

/**
 * 调用派欧云API获取回复
 * @param {Array} messages - 消息历史
 * @returns {Promise<string>} AI回复的内容
 */
async function callPaiCloudAPI(messages) {
    try {
        // 检查API密钥
        if (!PAICLOUD_API_KEY) {
            console.warn('未设置派欧云API密钥，使用模拟响应');
            return generateMockResponse(messages);
        }
        
        // 调用派欧云API (兼容OpenAI格式)
        const response = await axios.post(
            PAICLOUD_API_URL,
            {
                model: MODEL, // 使用DeepSeek模型
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PAICLOUD_API_KEY}`
                }
            }
        );
        
        // 返回AI回复
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content;
        } else {
            throw new Error('AI服务返回了无效的响应格式');
        }
    } catch (error) {
        console.error('调用派欧云API时出错:', error);
        
        // 如果API调用失败，返回模拟响应
        return generateMockResponse(messages);
    }
}

/**
 * 生成模拟回复（当API不可用时使用）
 * @param {Array} messages - 消息历史
 * @returns {string} 模拟的AI回复
 */
function generateMockResponse(messages) {
    // 获取最后一条用户消息
    const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
    const userMessage = lastUserMessage ? lastUserMessage.content : '';
    
    // 检查系统消息以确定AI特性
    const systemMessage = messages.find(msg => msg.role === 'system');
    const isAI1 = systemMessage && systemMessage.content.includes('友善');
    const isAI2 = systemMessage && systemMessage.content.includes('博学');
    const isAI3 = systemMessage && systemMessage.content.includes('时尚');
    
    // 根据AI特性选择不同的回复风格
    let responses;
    if (isAI1) {
        responses = [
            `很高兴能帮到你！关于"${userMessage}"，我认为...`,
            `这是个很好的问题！"${userMessage}"，我的回答是...`,
            `谢谢你的提问。对于"${userMessage}"，我想说...`,
            `很开心收到你的消息。关于"${userMessage}"，我觉得...`
        ];
    } else if (isAI2) {
        responses = [
            `从技术角度分析，"${userMessage}"这个问题，我认为...`,
            `有意思的问题！关于"${userMessage}"，历史上有类似的例子...`,
            `让我思考一下"${userMessage}"，从科学的角度来看...`,
            `"${userMessage}"是个好问题，我可以从多个维度为你解答...`
        ];
    } else if (isAI3) {
        responses = [
            `哇！"${userMessage}"真的超酷的！我觉得...`,
            `你的问题"${userMessage}"很有创意！我的看法是...`,
            `"${userMessage}"？这让我想到最新的潮流是...`,
            `真喜欢和你聊天！关于"${userMessage}"，时尚圈的观点是...`
        ];
    } else {
        responses = [
            `关于"${userMessage}"，我的回答是...`,
            `谢谢你的提问。"${userMessage}"这个问题，我认为...`,
            `我思考了一下"${userMessage}"，我觉得...`,
            `很高兴收到你的消息。对于"${userMessage}"，我想说...`
        ];
    }
    
    // 随机选择一个回复
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
} 