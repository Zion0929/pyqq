/**
 * 存储管理模块
 * 使用IndexedDB存储聊天记录、朋友圈内容等数据
 */

// 数据库名称和版本
const DB_NAME = 'wxAppDB';
const DB_VERSION = 1;

// 存储对象存储空间名称
const STORES = {
    AI_FRIENDS: 'aiFriends',
    CHAT_MESSAGES: 'chatMessages',
    MOMENTS: 'moments'
};

// 数据库对象
let db = null;

/**
 * 初始化存储
 * @returns {Promise} 初始化完成的Promise
 */
function initStorage() {
    return new Promise((resolve, reject) => {
        // 如果数据库已经初始化，直接返回
        if (db) {
            resolve();
            return;
        }
        
        // 打开数据库
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        // 数据库打开失败
        request.onerror = function(event) {
            console.error('打开数据库失败:', event.target.error);
            reject(event.target.error);
        };
        
        // 数据库升级或创建
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // 创建AI好友存储空间
            if (!db.objectStoreNames.contains(STORES.AI_FRIENDS)) {
                const aiFriendsStore = db.createObjectStore(STORES.AI_FRIENDS, { keyPath: 'id' });
                aiFriendsStore.createIndex('name', 'name', { unique: false });
                
                // 初始化默认AI好友
                aiFriendsStore.transaction.oncomplete = function(event) {
                    const aiFriendsObjectStore = db.transaction(STORES.AI_FRIENDS, 'readwrite')
                        .objectStore(STORES.AI_FRIENDS);
                    
                    const initialFriends = [
                        {
                            id: 'ai1',
                            name: '小微',
                            avatar: '../static/img/avatar1.jpg',
                            description: '我是一个友善的AI助手',
                            personality: '友善、乐于助人、耐心'
                        },
                        {
                            id: 'ai2',
                            name: '小智',
                            avatar: '../static/img/avatar2.jpg',
                            description: '我对科技和历史非常感兴趣',
                            personality: '博学、理性、幽默'
                        },
                        {
                            id: 'ai3',
                            name: '小美',
                            avatar: '../static/img/avatar3.jpg',
                            description: '我喜欢时尚和创意',
                            personality: '活泼、时尚、情感丰富'
                        }
                    ];
                    
                    for (let friend of initialFriends) {
                        aiFriendsObjectStore.add(friend);
                    }
                };
            }
            
            // 创建聊天消息存储空间
            if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
                const chatMessagesStore = db.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id' });
                chatMessagesStore.createIndex('chat', ['sender', 'receiver'], { unique: false });
                chatMessagesStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            // 创建朋友圈存储空间
            if (!db.objectStoreNames.contains(STORES.MOMENTS)) {
                const momentsStore = db.createObjectStore(STORES.MOMENTS, { keyPath: 'id' });
                momentsStore.createIndex('userId', 'userId', { unique: false });
                momentsStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
        
        // 数据库打开成功
        request.onsuccess = function(event) {
            db = event.target.result;
            console.log('数据库初始化成功');
            resolve();
        };
    });
}

/**
 * 获取AI好友列表
 * @returns {Promise<Array>} AI好友列表
 */
function getAiFriends() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(STORES.AI_FRIENDS, 'readonly');
        const store = transaction.objectStore(STORES.AI_FRIENDS);
        const request = store.getAll();
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 根据ID获取AI好友
 * @param {string} id AI好友ID
 * @returns {Promise<Object>} AI好友对象
 */
function getAiFriend(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(STORES.AI_FRIENDS, 'readonly');
        const store = transaction.objectStore(STORES.AI_FRIENDS);
        const request = store.get(id);
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 获取聊天消息记录
 * @param {string} userId 用户ID
 * @param {string} friendId 好友ID
 * @param {number} limit 返回消息的数量限制
 * @returns {Promise<Array>} 聊天消息记录
 */
function getChatMessages(userId, friendId, limit) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
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
                        
                        // 限制返回数量
                        if (limit && messages.length > limit) {
                            messages = messages.slice(messages.length - limit);
                        }
                        
                        resolve(messages);
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
    });
}

/**
 * 保存聊天消息
 * @param {Object} message 聊天消息对象
 * @returns {Promise} 保存完成的Promise
 */
function saveChatMessage(message) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(STORES.CHAT_MESSAGES, 'readwrite');
        const store = transaction.objectStore(STORES.CHAT_MESSAGES);
        const request = store.add(message);
        
        request.onsuccess = function(event) {
            resolve();
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 获取朋友圈内容
 * @param {number} limit 返回条目的数量限制
 * @returns {Promise<Array>} 朋友圈内容
 */
function getMoments(limit) {
    return new Promise((resolve, reject) => {
        if (!db) {
            // 先初始化数据库
            initStorage().then(() => {
                // 递归调用自身，此时数据库已初始化
                getMoments(limit).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const transaction = db.transaction(STORES.MOMENTS, 'readonly');
        const store = transaction.objectStore(STORES.MOMENTS);
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // 按时间倒序
        
        let moments = [];
        
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                moments.push(cursor.value);
                
                // 如果设置了限制，检查是否达到限制
                if (limit && moments.length >= limit) {
                    resolve(moments);
                } else {
                    cursor.continue();
                }
            } else {
                resolve(moments);
            }
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 保存朋友圈内容
 * @param {Object} moment 朋友圈对象
 * @returns {Promise} 保存完成的Promise
 */
function saveMoment(moment) {
    return new Promise((resolve, reject) => {
        if (!db) {
            // 先初始化数据库
            initStorage().then(() => {
                // 递归调用自身，此时数据库已初始化
                saveMoment(moment).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const transaction = db.transaction(STORES.MOMENTS, 'readwrite');
        const store = transaction.objectStore(STORES.MOMENTS);
        const request = store.add(moment);
        
        request.onsuccess = function(event) {
            resolve();
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 添加朋友圈评论
 * @param {Object} comment 评论对象
 * @returns {Promise} 保存完成的Promise
 */
function addMomentComment(comment) {
    return new Promise((resolve, reject) => {
        if (!db) {
            // 先初始化数据库
            initStorage().then(() => {
                // 递归调用自身，此时数据库已初始化
                addMomentComment(comment).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const transaction = db.transaction(STORES.MOMENTS, 'readwrite');
        const store = transaction.objectStore(STORES.MOMENTS);
        const request = store.get(comment.momentId);
        
        request.onsuccess = function(event) {
            const moment = event.target.result;
            if (!moment) {
                reject(new Error('朋友圈不存在'));
                return;
            }
            
            // 添加评论
            if (!moment.comments) {
                moment.comments = [];
            }
            moment.comments.push(comment);
            
            // 更新朋友圈
            const updateRequest = store.put(moment);
            
            updateRequest.onsuccess = function(event) {
                resolve();
            };
            
            updateRequest.onerror = function(event) {
                reject(event.target.error);
            };
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
} 