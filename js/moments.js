/**
 * 朋友圈功能模块
 * 管理朋友圈相关的交互逻辑和数据处理
 */

/**
 * 初始化朋友圈
 * 在首次访问朋友圈页面时调用
 */
function initMoments() {
    // 初始化存储
    return initStorage().then(function() {
        // 检查是否需要初始化一些默认的朋友圈内容
        return getMoments().then(function(moments) {
            if (!moments || moments.length === 0) {
                // 如果没有朋友圈内容，可以选择是否添加一些默认内容
                // 这里我们暂时不添加，让用户从零开始
                return Promise.resolve();
            }
        });
    });
}

/**
 * 发布朋友圈
 * @param {Object} moment 朋友圈对象
 * @returns {Promise} 发布完成的Promise
 */
function publishMoment(moment) {
    // 验证必要字段
    if (!moment.userId || (!moment.content && !moment.images && !moment.video)) {
        return Promise.reject(new Error('无效的朋友圈内容'));
    }
    
    // 确保有ID和时间戳
    moment.id = moment.id || generateId();
    moment.timestamp = moment.timestamp || Date.now();
    
    // 确保comments字段存在
    moment.comments = moment.comments || [];
    
    // 保存到存储
    return saveMoment(moment);
}

/**
 * 获取朋友圈内容
 * @param {number} limit 返回条目的数量限制
 * @param {number} offset 跳过前面的条目数量
 * @returns {Promise<Array>} 朋友圈内容
 */
function getMomentsFeed(limit, offset) {
    // 获取所有朋友圈内容
    return getMoments().then(function(moments) {
        // 按时间倒序排序
        moments.sort((a, b) => b.timestamp - a.timestamp);
        
        // 应用分页
        if (offset) {
            moments = moments.slice(offset);
        }
        
        if (limit) {
            moments = moments.slice(0, limit);
        }
        
        return moments;
    });
}

/**
 * 添加AI评论
 * 给指定的朋友圈添加AI评论
 * @param {string} momentId 朋友圈ID
 * @returns {Promise} 添加完成的Promise
 */
function addAiComments(momentId) {
    // 获取朋友圈
    return new Promise((resolve, reject) => {
        // 确保数据库已初始化
        if (!db) {
            // 先初始化数据库
            initStorage().then(() => {
                // 递归调用自身，此时数据库已初始化
                addAiComments(momentId).then(resolve).catch(reject);
            }).catch(reject);
            return;
        }
        
        const transaction = db.transaction(STORES.MOMENTS, 'readonly');
        const store = transaction.objectStore(STORES.MOMENTS);
        const request = store.get(momentId);
        
        request.onsuccess = function(event) {
            const moment = event.target.result;
            if (!moment) {
                reject(new Error('朋友圈不存在'));
                return;
            }
            
            // 获取AI好友
            getAiFriends().then(function(friends) {
                // 随机选择1-2个AI好友进行评论
                const commentCount = Math.floor(Math.random() * 2) + 1; // 1或2
                const selectedFriends = shuffleArray(friends).slice(0, commentCount);
                
                // 为每个选中的AI好友获取评论
                const commentPromises = selectedFriends.map(friend => {
                    // 检查该AI是否已经评论过
                    const hasCommented = moment.comments.some(c => c.userId === friend.id);
                    if (hasCommented) {
                        return Promise.resolve(null); // 已评论过，跳过
                    }
                    
                    // 获取AI评论
                    return getAiComment(friend, moment).then(commentContent => {
                        if (!commentContent) {
                            return null;
                        }
                        
                        // 创建评论对象
                        const comment = {
                            id: generateId(),
                            momentId: moment.id,
                            userId: friend.id,
                            userName: friend.name,
                            content: commentContent,
                            timestamp: Date.now()
                        };
                        
                        // 添加到朋友圈
                        return addMomentComment(comment).then(() => comment);
                    });
                });
                
                // 等待所有评论完成
                Promise.all(commentPromises)
                    .then(comments => {
                        // 过滤掉null值
                        const validComments = comments.filter(c => c !== null);
                        resolve(validComments);
                    })
                    .catch(reject);
            }).catch(reject);
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 删除朋友圈
 * @param {string} momentId 朋友圈ID
 * @param {string} userId 用户ID，用于验证权限
 * @returns {Promise} 删除完成的Promise
 */
function deleteMoment(momentId, userId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(STORES.MOMENTS, 'readwrite');
        const store = transaction.objectStore(STORES.MOMENTS);
        const request = store.get(momentId);
        
        request.onsuccess = function(event) {
            const moment = event.target.result;
            
            // 验证权限
            if (!moment || moment.userId !== userId) {
                reject(new Error('无权限删除该朋友圈'));
                return;
            }
            
            // 删除朋友圈
            const deleteRequest = store.delete(momentId);
            
            deleteRequest.onsuccess = function() {
                resolve();
            };
            
            deleteRequest.onerror = function(event) {
                reject(event.target.error);
            };
        };
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

/**
 * 给朋友圈点赞
 * @param {string} momentId 朋友圈ID
 * @param {string} userId 用户ID
 * @returns {Promise} 操作完成的Promise
 */
function likeMoment(momentId, userId) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }
        
        const transaction = db.transaction(STORES.MOMENTS, 'readwrite');
        const store = transaction.objectStore(STORES.MOMENTS);
        const request = store.get(momentId);
        
        request.onsuccess = function(event) {
            const moment = event.target.result;
            if (!moment) {
                reject(new Error('朋友圈不存在'));
                return;
            }
            
            // 初始化likes数组（如果不存在）
            if (!moment.likes) {
                moment.likes = [];
            }
            
            // 检查是否已经点过赞
            const likeIndex = moment.likes.indexOf(userId);
            if (likeIndex === -1) {
                // 添加点赞
                moment.likes.push(userId);
            } else {
                // 取消点赞
                moment.likes.splice(likeIndex, 1);
            }
            
            // 更新朋友圈
            const updateRequest = store.put(moment);
            
            updateRequest.onsuccess = function() {
                resolve(likeIndex === -1); // 返回是点赞还是取消点赞
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

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 数组随机排序
 * @param {Array} array 输入数组
 * @returns {Array} 随机排序后的数组
 */
function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
} 