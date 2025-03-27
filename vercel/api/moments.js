/**
 * Vercel朋友圈API端点
 * 负责接收朋友圈内容并调用派欧云API获取AI评论
 */

// 导入axios用于HTTP请求
const axios = require('axios');

// 派欧云API配置
const PAICLOUD_API_URL = process.env.PAICLOUD_API_URL || 'https://api.paicloud.com/v1/chat/completions';
const PAICLOUD_API_KEY = process.env.PAICLOUD_API_KEY || '';
const MODEL = 'deepseek/deepseek-v3-0324';

/**
 * 处理朋友圈评论请求
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
        const { content, hasImages, hasVideo, friend } = req.body;
        
        if (!content && !hasImages && !hasVideo) {
            return res.status(400).json({ error: '朋友圈内容不能为空' });
        }
        
        // 构建系统指令
        let systemPrompt = "你是一个AI助手，需要对用户发布的朋友圈内容进行评论。请给出真诚、自然的评论，就像真实好友之间的互动一样。";
        
        // 如果提供了AI好友信息，根据特性调整系统提示
        if (friend && friend.personality) {
            systemPrompt = `你是一个名叫${friend.name}的AI助手，性格特点是：${friend.personality}。你需要以这个角色对用户的朋友圈内容进行评论。请给出符合你角色特点的、自然的评论，就像真实好友之间的互动一样。评论应该简短、有趣、积极，长度控制在15-30个汉字左右。`;
        }
        
        // 构建媒体描述
        let mediaDescription = "";
        if (hasImages && hasVideo) {
            mediaDescription = "（包含图片和视频）";
        } else if (hasImages) {
            mediaDescription = "（包含图片）";
        } else if (hasVideo) {
            mediaDescription = "（包含视频）";
        }
        
        // 构建用户提示
        const userPrompt = `请对这条朋友圈内容进行评论：${content} ${mediaDescription}`;
        
        // 构建消息
        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];
        
        // 调用派欧云API
        const comment = await callPaiCloudAPI(messages, friend);
        
        return res.status(200).json({ comment });
    } catch (error) {
        console.error('处理朋友圈评论请求时出错:', error);
        
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
 * 调用派欧云API获取评论
 * @param {Array} messages - 消息
 * @param {Object} friend - AI好友信息
 * @returns {Promise<string>} AI生成的评论
 */
async function callPaiCloudAPI(messages, friend) {
    try {
        // 检查API密钥
        if (!PAICLOUD_API_KEY) {
            console.warn('未设置派欧云API密钥，使用模拟响应');
            return generateMockComment(messages[1].content, friend);
        }
        
        // 调用派欧云API
        const response = await axios.post(
            PAICLOUD_API_URL,
            {
                model: MODEL, // 使用DeepSeek模型
                messages: messages,
                temperature: 0.7,
                max_tokens: 100,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PAICLOUD_API_KEY}`
                }
            }
        );
        
        // 返回AI评论
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content;
        } else {
            throw new Error('AI服务返回了无效的响应格式');
        }
    } catch (error) {
        console.error('调用派欧云API时出错:', error);
        
        // 如果API调用失败，返回模拟评论
        return generateMockComment(messages[1].content, friend);
    }
}

/**
 * 生成模拟评论（当API不可用时使用）
 * @param {string} content - 朋友圈内容
 * @param {Object} friend - AI好友信息
 * @returns {string} 模拟的AI评论
 */
function generateMockComment(content, friend) {
    // 检查是否包含媒体文件
    const hasImages = content.includes('图片');
    const hasVideo = content.includes('视频');
    
    // 根据AI好友特性选择不同的评论风格
    let comments;
    if (friend) {
        switch(friend.id) {
            case 'ai1': // 友善型
                comments = [
                    "真棒！谢谢分享~",
                    "这看起来很不错呢！",
                    "我很喜欢你的这个分享",
                    "希望你今天过得愉快！",
                    "真的很感谢你分享这些！"
                ];
                break;
            case 'ai2': // 博学型
                comments = [
                    "很有深度的分享，让我思考了很多",
                    "这个视角很独特，我很欣赏",
                    "这个内容很有价值，感谢分享",
                    "我对这个话题也很感兴趣，可以多交流",
                    "你的见解总是这么独到"
                ];
                break;
            case 'ai3': // 时尚型
                comments = [
                    "太时尚了吧！我超喜欢！",
                    "简直是完美！你太有品味了",
                    "这个创意绝了！",
                    "好好看啊！我也想去尝试",
                    "这也太酷了吧！爱了爱了！"
                ];
                break;
            default:
                comments = [
                    "真不错！",
                    "谢谢分享！",
                    "我很喜欢这个！",
                    "真是太棒了！",
                    "很高兴看到你的分享！"
                ];
        }
    } else {
        comments = [
            "真不错！",
            "谢谢分享！",
            "我很喜欢这个！",
            "真是太棒了！",
            "很高兴看到你的分享！"
        ];
    }
    
    // 随机选择一个评论
    let randomIndex = Math.floor(Math.random() * comments.length);
    let comment = comments[randomIndex];
    
    // 根据是否有媒体添加额外评论
    if (hasImages) {
        const imageComments = ["图片拍得真好！", "照片很美！", "这张照片拍得太棒了！"];
        randomIndex = Math.floor(Math.random() * imageComments.length);
        comment += " " + imageComments[randomIndex];
    }
    
    if (hasVideo) {
        const videoComments = ["视频拍得真棒！", "这个视频太精彩了！", "视频很有趣！"];
        randomIndex = Math.floor(Math.random() * videoComments.length);
        comment += " " + videoComments[randomIndex];
    }
    
    return comment;
} 