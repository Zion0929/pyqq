/**
 * 聊天功能模块
 * 管理聊天相关的交互逻辑和数据处理
 */

/**
 * 初始化聊天页面
 * 仅在首次访问聊天列表页面时调用
 */
function initChatList() {
    // 初始化存储
    return initStorage().then(function() {
        // 检查是否需要初始化默认AI好友
        return getAiFriends().then(function(friends) {
            if (!friends || friends.length === 0) {
                // 如果没有AI好友数据，初始化默认好友
                const initialFriends = [
                    {
                        id: 'ai1',
                        name: '小微',
                        avatar: '../../static/img/avatar1.jpg',
                        description: '我是一个友善的AI助手',
                        personality: '友善、乐于助人、耐心'
                    },
                    {
                        id: 'ai2',
                        name: '小智',
                        avatar: '../../static/img/avatar2.jpg',
                        description: '我对科技和历史非常感兴趣',
                        personality: '博学、理性、幽默'
                    },
                    {
                        id: 'ai3',
                        name: '小美',
                        avatar: '../../static/img/avatar3.jpg',
                        description: '我喜欢时尚和创意',
                        personality: '活泼、时尚、情感丰富'
                    }
                ];
                
                // 存储初始AI好友数据
                const promises = initialFriends.map(friend => {
                    return new Promise((resolve, reject) => {
                        const transaction = db.transaction(STORES.AI_FRIENDS, 'readwrite');
                        const store = transaction.objectStore(STORES.AI_FRIENDS);
                        const request = store.add(friend);
                        
                        request.onsuccess = function() {
                            resolve();
                        };
                        
                        request.onerror = function(event) {
                            reject(event.target.error);
                        };
                    });
                });
                
                return Promise.all(promises);
            }
        });
    });
}

/**
 * 生成系统欢迎消息
 * 当用户首次与AI好友聊天时调用
 * @param {Object} friend AI好友对象
 * @param {string} userId 用户ID
 * @returns {Object} 欢迎消息对象
 */
function generateWelcomeMessage(friend, userId) {
    // 根据AI好友的特性生成不同的欢迎语
    let welcomeContent = "";
    
    switch (friend.id) {
        case 'ai1':
            welcomeContent = `你好！我是${friend.name}，很高兴认识你。我会是你友善的助手，有什么我能帮到你的吗？`;
            break;
        case 'ai2':
            welcomeContent = `你好！我是${friend.name}，我对科技和历史很感兴趣。如果你有相关问题，或者想聊聊其他话题，我都很乐意参与讨论。`;
            break;
        case 'ai3':
            welcomeContent = `嗨！我是${friend.name}，时尚和创意是我的最爱！有什么新奇的想法想和我分享吗？我们可以一起聊聊有趣的话题！`;
            break;
        default:
            welcomeContent = `你好！我是${friend.name}，很高兴认识你。有什么我可以帮忙的吗？`;
    }
    
    // 创建欢迎消息对象
    return {
        id: 'welcome_' + friend.id,
        sender: friend.id,
        receiver: userId,
        content: welcomeContent,
        timestamp: Date.now(),
        read: true
    };
}

/**
 * 获取与特定AI好友的聊天记录
 * 如果没有聊天记录，会自动生成欢迎消息
 * @param {string} userId 用户ID
 * @param {string} friendId AI好友ID
 * @param {number} limit 返回消息的数量限制
 * @returns {Promise<Array>} 聊天消息记录
 */
function getChatMessages(userId, friendId, limit) {
    return new Promise((resolve, reject) => {
        // 确保数据库已初始化
        if (!db) {
            // 先初始化数据库
            initStorage().then(() => {
                // 递归调用自身，此时数据库已初始化
                getChatMessages(userId, friendId, limit).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        // 先从存储中获取消息
        getAiFriend(friendId).then(friend => {
            if (!friend) {
                reject(new Error('好友不存在'));
                return;
            }
            
            // 从存储获取聊天记录
            const transaction = db.transaction(STORES.CHAT_MESSAGES, 'readonly');
            const store = transaction.objectStore(STORES.CHAT_MESSAGES);
            const index = store.index('chat');
            
            // 创建查询范围，匹配双向的聊天消息
            const range1 = IDBKeyRange.only([userId, friendId]);
            const range2 = IDBKeyRange.only([friendId, userId]);
            
            let messages = [];
            
            // 获取第一个方向的消息
            const request1 = index.openCursor(range1);
            request1.onsuccess = function(event) {
                const cursor = event.target.result;
                if (cursor) {
                    messages.push(cursor.value);
                    cursor.continue();
                } else {
                    // 获取另一个方向的消息
                    const request2 = index.openCursor(range2);
                    request2.onsuccess = function(event) {
                        const cursor = event.target.result;
                        if (cursor) {
                            messages.push(cursor.value);
                            cursor.continue();
                        } else {
                            // 按时间排序
                            messages.sort((a, b) => a.timestamp - b.timestamp);
                            
                            // 如果没有消息记录，添加欢迎消息
                            if (messages.length === 0) {
                                const welcomeMessage = generateWelcomeMessage(friend, userId);
                                
                                // 保存欢迎消息
                                saveChatMessage(welcomeMessage).then(() => {
                                    messages.push(welcomeMessage);
                                    
                                    // 限制返回数量
                                    if (limit && messages.length > limit) {
                                        messages = messages.slice(messages.length - limit);
                                    }
                                    
                                    resolve(messages);
                                }).catch(reject);
                            } else {
                                // 限制返回数量
                                if (limit && messages.length > limit) {
                                    messages = messages.slice(messages.length - limit);
                                }
                                
                                resolve(messages);
                            }
                        }
                    };
                    
                    request2.onerror = function(event) {
                        reject(event.target.error);
                    };
                }
            };
            
            request1.onerror = function(event) {
                reject(event.target.error);
            };
        }).catch(reject);
    });
}

/**
 * 标记消息为已读
 * @param {string} messageId 消息ID
 * @returns {Promise} 操作完成的Promise
 */
function markMessageAsRead(messageId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(STORES.CHAT_MESSAGES, 'readwrite');
        const store = transaction.objectStore(STORES.CHAT_MESSAGES);
        const request = store.get(messageId);
        
        request.onsuccess = function(event) {
            const message = event.target.result;
            if (message) {
                message.read = true;
                
                const updateRequest = store.put(message);
                updateRequest.onsuccess = function() {
                    resolve();
                };
                
                updateRequest.onerror = function(event) {
                    reject(event.target.error);
                };
            } else {
                resolve(); // 消息不存在，视为已处理
            }
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 获取未读消息数量
 * @param {string} userId 用户ID
 * @param {string} friendId 好友ID，可选，如果不提供则获取所有未读消息
 * @returns {Promise<number>} 未读消息数量
 */
function getUnreadMessageCount(userId, friendId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(STORES.CHAT_MESSAGES, 'readonly');
        const store = transaction.objectStore(STORES.CHAT_MESSAGES);
        const request = store.getAll();
        
        request.onsuccess = function(event) {
            const messages = event.target.result;
            
            // 筛选未读消息
            const unreadMessages = messages.filter(message => {
                return message.receiver === userId && 
                       !message.read && 
                       (friendId ? message.sender === friendId : true);
            });
            
            resolve(unreadMessages.length);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 删除聊天记录
 * @param {string} userId 用户ID
 * @param {string} friendId 好友ID
 * @returns {Promise} 操作完成的Promise
 */
function clearChatHistory(userId, friendId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        // 获取所有聊天消息
        const transaction = db.transaction(STORES.CHAT_MESSAGES, 'readwrite');
        const store = transaction.objectStore(STORES.CHAT_MESSAGES);
        const request = store.getAll();
        
        request.onsuccess = function(event) {
            const messages = event.target.result;
            
            // 筛选出需要删除的消息ID
            const messageIdsToDelete = messages
                .filter(message => {
                    return (message.sender === userId && message.receiver === friendId) ||
                           (message.sender === friendId && message.receiver === userId);
                })
                .map(message => message.id);
            
            // 逐个删除消息
            const deletePromises = messageIdsToDelete.map(id => {
                return new Promise((resolveDelete, rejectDelete) => {
                    const deleteRequest = store.delete(id);
                    
                    deleteRequest.onsuccess = function() {
                        resolveDelete();
                    };
                    
                    deleteRequest.onerror = function(event) {
                        rejectDelete(event.target.error);
                    };
                });
            });
            
            Promise.all(deletePromises)
                .then(resolve)
                .catch(reject);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
} 