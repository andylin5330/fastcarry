const app = getApp();

Page({
    data: {
        conversations: [],
        aiLastMessage: '',
        aiUnreadCount: 0,
        isLoggedIn: false
    },

    onShow: function () {
        if (!app.globalData.userInfo) {
            this.setData({ isLoggedIn: false });
            wx.showToast({
                title: '请先登录',
                icon: 'none',
                duration: 2000
            });
            setTimeout(() => {
                wx.switchTab({
                    url: '/pages/me/me',
                });
            }, 1000);
            return;
        }
        this.setData({ isLoggedIn: true });
        this.fetchConversations();
    },

    fetchConversations: async function () {
        if (!app.globalData.userInfo) {
            return;
        }

        const db = wx.cloud.database();
        const _ = db.command;

        try {
            // 1. Fetch user-to-user conversations
            const res = await db.collection('conversations')
                .where({
                    participants: app.globalData.userInfo._id
                })
                .orderBy('lastUpdate', 'desc')
                .get();

            const conversations = res.data;
            const updatedConversations = [];

            for (let conv of conversations) {
                // Identify the other participant
                const otherPartyId = conv.participants.find(id => id !== app.globalData.userInfo._id);

                // Fetch other party profile
                // Robust lookup: check both _id and openid
                const userRes = await db.collection('users').where(_.or([
                    { _id: otherPartyId },
                    { openid: otherPartyId }
                ])).get();

                const otherUser = userRes.data.length > 0 ? userRes.data[0] : null;

                updatedConversations.push({
                    ...conv,
                    otherPartyName: otherUser ? otherUser.name : '未知用户',
                    otherPartyAvatar: otherUser ? otherUser.avatar : 'cloud://cloud1-1g75i69o3bf03886/images/default_avatar.png',
                    lastMessageTime: this.formatTime(conv.lastUpdate)
                });
            }

            this.setData({
                conversations: updatedConversations
            });
        } catch (err) {
            console.error('Fetch conversations failed', err);
        }

        // Fetch latest AI message
        const systemConvId = 'system_' + app.globalData.userInfo._id;
        db.collection('messages')
            .where({
                conversationId: systemConvId
            })
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get()
            .then(res => {
                if (res.data.length > 0) {
                    this.setData({
                        aiLastMessage: res.data[0].content
                    });
                }
            });
    },

    goToAiChat: function () {
        wx.navigateTo({
            url: '/pages/chat/chat?type=system'
        });
    },

    goToChat: function (e) {
        const id = e.currentTarget.dataset.id;
        wx.navigateTo({
            url: `/pages/chat/chat?id=${id}&type=user`
        });
    },

    formatTime: function (date) {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        }
        return (d.getMonth() + 1) + '/' + d.getDate();
    }
});
