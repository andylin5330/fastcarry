const app = getApp();
const db = wx.cloud.database();

Page({
    data: {
        messages: [],
        inputValue: '',
        lastMessageId: '',
        myOpenid: '',
        myAvatar: 'cloud://cloud1-1g75i69o3bf03886/images/default_avatar.png',
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

    initChat: async function () {
        if (!app.globalData.userInfo) return;

        this.setData({
            myOpenid: app.globalData.userInfo._id,
            myAvatar: app.globalData.userInfo.avatar || 'cloud://cloud1-1g75i69o3bf03886/images/default_avatar.png'
        });

        if (this.data.chatType === 'system') {
            wx.setNavigationBarTitle({ title: '智能客服' });
            // For system chat, use a deterministic conversationId based on user ID
            if (!this.data.conversationId) {
                this.setData({
                    conversationId: 'system_' + app.globalData.userInfo._id
                });
            }
        } else {
            // For user chat, fetch other party profile
            const db = wx.cloud.database();
            const _ = db.command;

            try {
                const convRes = await db.collection('conversations').doc(this.data.conversationId).get();
                const conv = convRes.data;
                const otherPartyId = conv.participants.find(id => id !== app.globalData.userInfo._id);

                const userRes = await db.collection('users').where(_.or([
                    { _id: otherPartyId },
                    { openid: otherPartyId }
                ])).get();

                if (userRes.data.length > 0) {
                    const otherUser = userRes.data[0];
                    this.setData({
                        otherAvatar: otherUser.avatar || 'cloud://cloud1-1g75i69o3bf03886/images/default_avatar.png'
                    });
                    wx.setNavigationBarTitle({ title: otherUser.name });
                } else {
                    wx.setNavigationBarTitle({ title: '聊天' });
                }
            } catch (err) {
                console.error('Init user chat failed', err);
                wx.setNavigationBarTitle({ title: '聊天' });
            }
        }

        this.watchMessages();
    },

    loadSystemWelcome: function () {
        this.setData({
            messages: [{
                _id: 'welcome',
                type: 'text',
                content: '您好！我是 FastCarry AI 助手。有什么我可以帮您的吗？您可以询问关于订单、违禁品或支付的问题。',
                senderId: 'system',
                timestamp: new Date()
            }],
            lastMessageId: 'msg-0'
        });
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
                    let messages = snapshot.docs;

                    // If system chat and no messages, show welcome
                    if (this.data.chatType === 'system' && messages.length === 0) {
                        messages = [{
                            _id: 'welcome',
                            type: 'text',
                            content: '您好！我是 FastCarry AI 助手。有什么我可以帮您的吗？您可以询问关于订单、违禁品或支付的问题。',
                            senderId: 'system',
                            timestamp: new Date()
                        }];
                    }

                    this.setData({
                        messages: messages,
                        lastMessageId: `msg-${messages.length - 1}`
                    });
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
            content,
            senderId: this.data.myOpenid,
            timestamp: db.serverDate(),
            type: 'text',
            conversationId: this.data.conversationId
        };

        // Save user message to database
        db.collection('messages').add({
            data: userMsg
        }).then(() => {
            // Trigger AI response
            return wx.cloud.callFunction({
                name: 'aiAssistant',
                data: { text: content }
            });
        }).then(res => {
            const aiMsg = {
                content: res.result.reply,
                senderId: 'system',
                timestamp: db.serverDate(),
                type: 'text',
                conversationId: this.data.conversationId
            };
            // Save AI message to database
            return db.collection('messages').add({
                data: aiMsg
            });
        }).catch(err => {
            console.error('System chat error:', err);
            wx.showToast({
                title: '发送失败',
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

    onUnload: function () {
        if (this.messageWatcher) {
            this.messageWatcher.close();
        }
    }
});
