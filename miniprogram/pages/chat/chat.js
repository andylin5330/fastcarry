const app = getApp();
const db = wx.cloud.database();

Page({
    data: {
        messages: [],
        inputValue: '',
        scrollToView: '',
        myOpenid: '',
        myAvatar: '/images/default_avatar.png',
        otherAvatar: '/images/ai_avatar.png',
        chatType: 'user', // 'user' or 'system'
        conversationId: ''
    },

    onLoad: function (options) {
        const { id, type } = options;
        this.setData({
            chatType: type || 'user',
            conversationId: id || ''
        });

        this.initChat();
    },

    initChat: function () {
        if (!app.globalData.userInfo) return;

        this.setData({
            myOpenid: app.globalData.userInfo._id,
            myAvatar: app.globalData.userInfo.avatar || '/images/default_avatar.png'
        });

        if (this.data.chatType === 'system') {
            wx.setNavigationBarTitle({ title: '智能客服' });
            this.loadSystemWelcome();
        } else {
            this.watchMessages();
        }
    },

    loadSystemWelcome: function () {
        this.setData({
            messages: [{
                _id: 'welcome',
                type: 'text',
                content: '👋 您好！我是 FastCarry 智能助手。\n\n我可以帮您解答：\n📦 订单取消/退款\n🚫 违禁品查询\n🔒 支付安全\n💰 运费说明\n📋 使用流程\n⏰ 时效查询\n\n请直接说出您的问题，或输入关键词（如：退款、违禁品、安全等）。',
                senderId: 'system',
                timestamp: new Date()
            }]
        });
        this.scrollToBottom();
    },

    watchMessages: function () {
        if (!this.data.conversationId) return;

        this.messageWatcher = db.collection('messages')
            .where({
                conversationId: this.data.conversationId
            })
            .orderBy('timestamp', 'asc')
            .watch({
                onChange: (snapshot) => {
                    this.setData({
                        messages: snapshot.docs
                    });
                    this.scrollToBottom();
                },
                onError: (err) => {
                    console.error('Watch error:', err);
                }
            });
    },

    onInput: function (e) {
        this.setData({ inputValue: e.detail.value });
    },

    sendMessage: function () {
        const content = this.data.inputValue.trim();
        if (!content) return;

        const newMessage = {
            content,
            senderId: this.data.myOpenid,
            timestamp: db.serverDate(),
            type: 'text'
        };

        if (this.data.chatType === 'system') {
            this.handleSystemChat(content);
        } else {
            this.handleUserChat(newMessage);
        }

        this.setData({ inputValue: '' });
    },

    handleSystemChat: function (content) {
        const userMsg = {
            _id: Date.now().toString(),
            content,
            senderId: this.data.myOpenid,
            timestamp: new Date(),
            type: 'text'
        };

        const newMessages = [...this.data.messages, userMsg];
        this.setData({
            messages: newMessages
        });
        this.scrollToBottom();

        // Add typing indicator
        const typingMsg = {
            _id: 'typing',
            content: '正在输入中...',
            senderId: 'system',
            timestamp: new Date(),
            type: 'typing'
        };

        const messagesWithTyping = [...this.data.messages, typingMsg];
        this.setData({
            messages: messagesWithTyping
        });
        this.scrollToBottom();

        // Trigger AI response
        wx.cloud.callFunction({
            name: 'aiAssistant',
            data: { text: content }
        }).then(res => {
            // Remove typing indicator and add AI response
            const aiMsg = {
                _id: 'ai-' + Date.now(),
                content: res.result.reply,
                senderId: 'system',
                timestamp: new Date(),
                type: 'text'
            };

            const finalMessages = this.data.messages.filter(m => m.type !== 'typing');
            this.setData({
                messages: [...finalMessages, aiMsg]
            });
            this.scrollToBottom();
        }).catch(err => {
            console.error('AI Assistant error:', err);

            // Remove typing indicator and show error message
            const errorMsg = {
                _id: 'error-' + Date.now(),
                content: '抱歉，智能客服暂时无法回复。请稍后再试或联系人工客服。',
                senderId: 'system',
                timestamp: new Date(),
                type: 'text'
            };

            const finalMessages = this.data.messages.filter(m => m.type !== 'typing');
            this.setData({
                messages: [...finalMessages, errorMsg]
            });
            this.scrollToBottom();

            wx.showToast({
                title: '客服响应失败',
                icon: 'none'
            });
        });
    },

    handleUserChat: function (msg) {
        db.collection('messages').add({
            data: {
                ...msg,
                conversationId: this.data.conversationId
            }
        });

        // Update last message in conversation
        db.collection('conversations').doc(this.data.conversationId).update({
            data: {
                lastMessage: msg,
                lastUpdate: db.serverDate()
            }
        });
    },

    scrollToBottom: function () {
        // Use a small delay to ensure DOM has updated
        setTimeout(() => {
            this.setData({
                scrollToView: 'bottom-anchor'
            });
        }, 100);
    },

    onUnload: function () {
        if (this.messageWatcher) {
            this.messageWatcher.close();
        }
    }
});
