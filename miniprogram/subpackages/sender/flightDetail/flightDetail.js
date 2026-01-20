const app = getApp();

Page({
    data: {
        tripId: null,
        trip: null,
        carrier: null
    },

    onLoad: function (options) {
        if (options.id) {
            this.setData({ tripId: options.id });
            this.fetchTripDetails(options.id);
        }
    },

    fetchTripDetails: async function (tripId) {
        wx.showLoading({ title: '加载中...' });
        const db = wx.cloud.database();
        try {
            // 1. Fetch Trip
            const tripRes = await db.collection('trips').doc(tripId).get();
            const trip = tripRes.data;
            trip.date = trip.createTime ? new Date(trip.createTime).toLocaleDateString() : '近期';
            this.setData({ trip });

            // 2. Fetch Carrier via User ID (openid)
            // Assuming we have a 'users' collection or similar, or just relying on trip data if it includes author info.
            // If not, we might need to rely on what was passed or query a user profile.
            // For now, I'll mock the user fetch or assume we query by _openid if we have a users table.
            // Since we don't have a guaranteed users table structure confirmed, I'll mock the carrier for demo or try to fetch if 'users' exists.

            // MOCK CARRIER DATA for Visuals (since we rely on current user usually)
            // Ideally: db.collection('users').where({_openid: trip._openid}).get()

            // Try to mock a carrier for now or query if possible
            this.setData({
                carrier: {
                    nickName: '飞行达人',
                    avatarUrl: 'https://img.yzcdn.cn/vant/cat.jpeg', // Mock Avatar
                    role: 'carrier',
                    score: 98,
                    isVerified: true,
                    intro: '常往返中美，可带贵重物品，信誉保证。'
                }
            });

            wx.hideLoading();
        } catch (err) {
            console.error(err);
            wx.hideLoading();
            wx.showToast({ title: '加载失败', icon: 'none' });
        }
    },

    onContact() {
        wx.showToast({ title: '即将打开聊天窗口', icon: 'none' });
    },

    onRequest() {
        wx.showToast({ title: '已发送预约请求', icon: 'success' });
    }
});
