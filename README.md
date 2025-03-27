# 微信聊天与朋友圈 App

## 项目概述

这是一个模仿微信聊天和朋友圈功能的安卓应用程序。用户可以与预设的AI好友进行聊天互动，发布朋友圈动态（文字、图片、视频），并收到AI好友的评论或互动。

## 功能特点

### 聊天功能
- 联系人列表显示预设的AI好友
- 一对一聊天界面，支持文本消息发送
- 本地存储聊天记录
- AI好友智能回复

### 朋友圈功能
- 信息流界面展示用户和AI好友发布的动态
- 支持发布文本、图片和视频动态
- 本地存储朋友圈内容
- AI好友对动态进行评论互动

## 技术栈

- **前端**: HTML5+ App (HBuilderX)，HTML, CSS, JavaScript
- **AI能力**: 派欧云 (PaiCloud) API
- **后端/部署**: Vercel Serverless Functions
- **数据存储**: IndexedDB

## 项目结构

```
/
├── css/                  # 样式文件
│   ├── common.css        # 公共样式
│   ├── chat.css          # 聊天界面样式
│   └── moments.css       # 朋友圈界面样式
├── js/                   # JavaScript文件
│   ├── api.js            # API调用相关
│   ├── chat.js           # 聊天功能逻辑
│   ├── moments.js        # 朋友圈功能逻辑
│   └── storage.js        # 本地存储相关
├── pages/                # 页面文件
│   ├── chat/             # 聊天相关页面
│   │   ├── index.html    # 联系人列表
│   │   └── room.html     # 聊天室
│   └── moments/          # 朋友圈相关页面
│       ├── index.html    # 朋友圈主页
│       └── publish.html  # 发布动态
├── static/               # 静态资源
│   ├── img/              # 图片资源
│   └── fonts/            # 字体资源
├── vercel/               # Vercel后端函数
│   ├── api/              # API端点
│   │   ├── chat.js       # 聊天API
│   │   └── moments.js    # 朋友圈API
│   └── package.json      # 依赖配置
├── index.html            # 应用入口页面
├── manifest.json         # 应用配置
└── README.md             # 项目说明
```

## 如何使用

### 开发环境设置

1. 下载并安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)
2. 克隆本项目到本地
3. 使用HBuilderX打开项目
4. 需要添加以下资源文件:
   - 在 `static/img/` 目录下添加 `avatar1.jpg`, `avatar2.jpg`, `avatar3.jpg`, `user-avatar.jpg`, `default-avatar.jpg`, `moments-cover.jpg`, `default-cover.jpg`, `image-error.jpg` 图片

### 配置Vercel后端

要部署Vercel后端服务，需要执行以下步骤:

1. 注册 [Vercel](https://vercel.com) 账号
2. 安装 [Vercel CLI](https://vercel.com/docs/cli)
3. 在命令行中，导航到项目的 `vercel` 目录
4. 运行 `vercel login` 登录您的账号
5. 运行 `vercel` 命令，按照提示部署项目
6. 部署完成后，您会获得一个Vercel应用URL
7. 在 `js/api.js` 文件中，将 `API_BASE_URL` 变量更新为您的Vercel应用URL，例如:
   ```js
   const API_BASE_URL = 'https://your-app-name.vercel.app/api';
   ```

### 配置PaiCloud API

1. 注册 [派欧云](https://paicloud.com) 账号并获取API密钥
2. 在Vercel项目中，添加环境变量:
   - 名称: `PAICLOUD_API_KEY`，值: 您的API密钥
   - 名称: `PAICLOUD_API_URL`，值: PaiCloud API的URL（如有需要）

### 在HBuilderX中运行项目

1. 在HBuilderX中打开项目
2. 点击"运行"→"运行到手机或模拟器"→"Android"
3. 如果没有真机，可以使用内置的模拟器（需要安装）
4. 也可以选择"运行"→"运行到浏览器"，但某些原生功能（如拍照、选择相册）将无法使用

### 构建APK

1. 在HBuilderX中，点击"发行"→"原生App-云打包"
2. 选择Android平台
3. 按照提示配置应用信息（应用名称、包名、图标等）
4. 点击"打包"，等待云打包完成
5. 下载生成的APK文件，安装到Android设备上使用

## 使用说明

### 聊天功能

1. 打开应用，默认进入聊天列表页面
2. 点击列表中的任意AI好友进入聊天页面
3. 在底部输入框输入消息，点击发送按钮发送
4. AI会根据AI好友的性格特点回复消息

### 朋友圈功能

1. 点击底部导航栏的"朋友圈"进入朋友圈页面
2. 点击右下角的"+"按钮发布新动态
3. 输入文字内容，可选择添加图片或视频
4. 点击"发布"按钮发布动态
5. AI好友会自动对你的动态进行评论
6. 点击动态下方的"评论"按钮可以对动态进行评论

## 项目状态

本项目是一个原型演示应用，已实现基本的聊天和朋友圈功能。目前已完成的功能包括：

1. 基本的聊天界面和聊天功能
2. 朋友圈浏览和发布功能
3. 本地数据存储系统（使用IndexedDB）
4. Vercel后端API接口（聊天和朋友圈）
5. 模拟AI响应机制

在实际应用中，可能需要进一步完善:

1. 实现用户账号系统
2. 增强数据安全性
3. 优化AI对话体验
4. 接入真实的AI服务提供商（当前PaiCloud API密钥为模拟）
5. 增加表情和富文本支持
6. 实现已读状态和通知系统
7. 添加聊天历史搜索功能
8. 支持群聊功能
9. 增强朋友圈的定位标签功能

## 注意事项

- 应用使用IndexedDB存储聊天记录和朋友圈内容，清除应用数据会导致这些信息丢失
- 在开发模式下，使用模拟数据代替真实的AI响应，实际部署时需要配置正确的PaiCloud API密钥
- 媒体文件（图片、视频）存储在本地，占用设备存储空间

## 项目总结

本项目成功构建了一个模仿微信基本功能的应用原型，完成了以下工作：

1. **前端界面**：使用HTML5+、CSS和JavaScript构建了类似微信的用户界面，包括聊天列表、聊天室、朋友圈和发布页面。

2. **本地存储**：实现了基于IndexedDB的数据存储系统，可以存储聊天记录和朋友圈内容。

3. **后端服务**：使用Vercel Serverless Functions构建了处理聊天和朋友圈功能的API端点，支持调用PaiCloud API获取AI响应。

4. **AI交互**：设计了不同性格特点的AI好友，可以根据角色特点生成不同风格的回复和评论。

5. **容错机制**：实现了API调用失败时的备选响应生成机制，确保应用在各种情况下都能正常工作。

这个项目展示了如何使用现代Web技术和AI服务构建社交应用的基础架构，虽然是一个演示原型，但包含了实际应用的核心逻辑和关键功能点，为进一步开发完整商业应用奠定了基础。 