/**
 * API调用模块
 * 负责与服务器交互，包括AI聊天、朋友圈评论等功能
 */

// Vercel后端API的基础URL
const API_BASE_URL = 'https://your-vercel-deployment-url.vercel.app/api';

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * 发送聊天消息并获取AI回复
 * @param {Object} friend AI好友对象
 * @param {Object} message 用户发送的消息对象
 * @returns {Promise<Object>} 包含AI回复的对象
 */
function sendChatMessage(friend, message) {
    // 实际项目中，应该将最近N条消息作为上下文一起发送
    return getChatMessages('user1', friend.id, 10).then(messages => {
        // 构建聊天历史，不要包含当前消息
        const history = messages.map(msg => ({
            role: msg.sender === 'user1' ? 'user' : 'assistant',
            content: msg.content
        }));
        
        // 发送API请求
        return fetchWithRetry(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message.content,
                history: history,
                friend: {
                    id: friend.id,
                    name: friend.name,
                    personality: friend.personality
                }
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('API请求失败: ' + response.status);
            }
            return response.json();
        });
    });
}

/**
 * 获取AI对朋友圈的评论
 * @param {Object} friend AI好友对象
 * @param {Object} moment 朋友圈对象
 * @returns {Promise<string>} AI生成的评论内容
 */
function getAiComment(friend, moment) {
    return fetchWithRetry(`${API_BASE_URL}/moments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            momentId: moment.id,
            content: moment.content,
            hasImages: moment.images && moment.images.length > 0,
            hasVideo: !!moment.video,
            friend: {
                id: friend.id,
                name: friend.name,
                personality: friend.personality
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('API请求失败: ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        return data.comment;
    });
}

/**
 * 带重试功能的fetch
 * @param {string} url 请求URL
 * @param {Object} options fetch选项
 * @param {number} retries 重试次数
 * @returns {Promise} fetch请求的Promise
 */
function fetchWithRetry(url, options, retries = 0) {
    return fetch(url, options)
        .catch(error => {
            if (retries < MAX_RETRIES) {
                // 延迟后重试
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(fetchWithRetry(url, options, retries + 1));
                    }, RETRY_DELAY * Math.pow(2, retries));
                });
            }
            throw error;
        });
}

/**
 * 模拟API调用，仅在开发阶段使用
 * @param {string} type 调用类型: 'chat' 或 'comment'
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 模拟的响应数据
 */
function mockApiCall(type, data) {
    return new Promise((resolve) => {
        // 模拟网络延迟
        setTimeout(() => {
            if (type === 'chat') {
                // 根据输入内容和AI特性生成简单回复
                const responses = {
                    ai1: [
                        "很高兴能帮到你！",
                        "有任何问题都可以问我哦~",
                        "这个问题很有趣，让我想想...",
                        "我很乐意为你解答这个问题。"
                    ],
                    ai2: [
                        "从技术角度来看，这个问题可以这样分析...",
                        "根据我的数据，有几种可能的解释...",
                        "历史上类似的情况也曾出现过...",
                        "让我给你一个详细的解答。"
                    ],
                    ai3: [
                        "哇，这个真的很酷！",
                        "你的想法很有创意！",
                        "这让我想到一个很时尚的点子...",
                        "我超喜欢你的这个问题！"
                    ]
                };
                
                // 随机选择一个响应
                const friendId = data.friend.id;
                const possibleResponses = responses[friendId] || responses.ai1;
                const randomIndex = Math.floor(Math.random() * possibleResponses.length);
                
                resolve({
                    reply: possibleResponses[randomIndex] + " " + data.message
                });
            } else if (type === 'comment') {
                // 根据朋友圈内容和AI特性生成简单评论
                const comments = {
                    ai1: [
                        "真棒！谢谢分享~",
                        "这看起来很不错呢！",
                        "我很喜欢你的这个分享",
                        "希望你今天过得愉快！"
                    ],
                    ai2: [
                        "很有深度的分享，让我思考了很多",
                        "这个视角很独特，我很欣赏",
                        "这个内容很有价值，感谢分享",
                        "我对这个话题也很感兴趣，可以多交流"
                    ],
                    ai3: [
                        "太时尚了吧！我超喜欢！",
                        "简直是完美！你太有品味了",
                        "这个创意绝了！",
                        "好好看啊！我也想去尝试"
                    ]
                };
                
                // 随机选择一个评论
                const friendId = data.friend.id;
                const possibleComments = comments[friendId] || comments.ai1;
                const randomIndex = Math.floor(Math.random() * possibleComments.length);
                
                // 根据朋友圈是否包含媒体调整评论
                let comment = possibleComments[randomIndex];
                if (data.hasImages) {
                    comment += " 图片拍得真好！";
                }
                if (data.hasVideo) {
                    comment += " 视频拍得真棒！";
                }
                
                resolve({
                    comment: comment
                });
            }
        }, 300 + Math.random() * 700); // 300-1000ms的随机延迟
    });
}

// 替换真实API调用，仅在开发阶段使用
// 实际项目中，应删除此部分代码，使用真实API调用
sendChatMessage = function(friend, message) {
    console.log('模拟API调用: sendChatMessage', friend, message);
    return mockApiCall('chat', {
        message: message.content,
        friend: friend
    });
};

getAiComment = function(friend, moment) {
    console.log('模拟API调用: getAiComment', friend, moment);
    return mockApiCall('comment', {
        momentId: moment.id,
        content: moment.content,
        hasImages: moment.images && moment.images.length > 0,
        hasVideo: !!moment.video,
        friend: friend
    }).then(data => data.comment);
}; 