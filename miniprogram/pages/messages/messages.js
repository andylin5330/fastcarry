const app = getApp();

Page({
    data: {
        conversations: [],
        aiLastMessage: '',
        aiUnreadCount: 0
    },

    onShow: function () {
        this.fetchConversations();
    },

    fetchConversations: function () {
        if (!app.globalData.userInfo) {
            return;
        }

        const db = wx.cloud.database();
        const _ = db.command;

        // Fetch user-to-user conversations
        db.collection('conversations')
            .where({
                participants: app.globalData.userInfo._id
            })
            .orderBy('lastUpdate', 'desc')
            .get()
            .then(res => {
                this.setData({
                    conversations: res.data.map(conv => {
                        // Mocking names and avatars for now since real ones would be in user collection
                        return {
                            ...conv,
                            otherPartyName: '用户 ' + conv._id.substring(0, 4),
                            otherPartyAvatar: '',
                            lastMessageTime: this.formatTime(conv.lastUpdate)
                        };
                    })
                });
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
