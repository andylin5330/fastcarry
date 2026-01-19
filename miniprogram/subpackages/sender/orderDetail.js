const app = getApp();

Page({
    data: {
        orderId: '',
        order: {},
        activeStep: 0,
        steps: [
            { text: '物品寄出', desc: '已经寄送给带货人' },
            { text: '带货人收到', desc: '物品已由带货人确认接收' },
            { text: '已装箱', desc: '物品已装入行李箱' },
            { text: '航班起飞', desc: '航班已经离港' },
            { text: '航班落地', desc: '航班已到达目的地' },
            { text: '物品签收', desc: '需带货人已确认收到物品' }
        ]
    },

    onLoad: function (options) {
        if (options.id) {
            this.setData({ orderId: options.id });
            this.fetchOrderDetail(options.id);
        }
    },

    fetchOrderDetail: async function (id) {
        wx.showLoading({ title: '加载中...' });
        const db = wx.cloud.database();
        try {
            // 1. Fetch Order
            const orderRes = await db.collection('orders').doc(id).get();
            const order = orderRes.data;

            // 2. Fetch Trip (for carryingNo and receiving address)
            const tripRes = await db.collection('trips').doc(order.tripId).get();
            const trip = tripRes.data;

            // 3. Enrich order data for UI
            order.carryingNo = trip ? trip.carryingNo : '未知';

            // Fallback: If trip record has userName, use it
            if (trip && trip.userName) {
                order.recipientName = trip.userName;
            } else if (trip && trip.carrierName) {
                order.recipientName = trip.carrierName;
            } else {
                const userRes = await db.collection('users').where({
                    openid: order.carrierId
                }).get();
                order.recipientName = userRes.data.length > 0 ? userRes.data[0].name : '带货人';
            }

            order.recipientAddress = trip ? trip.address : '未设置';
            order.recipientPhone = '请通过在线咨询获取'; // Privacy

            // 4. Calculate step
            let activeStep = 0;
            if (order.isSigned) activeStep = 5;
            else if (order.isLanded) activeStep = 4;
            else if (order.isDeparted) activeStep = 3;
            else if (order.isPacked) activeStep = 2;
            else if (order.isReceivedByCarrier) activeStep = 1;
            else if (order.isSent) activeStep = 0;

            this.setData({
                order: order,
                activeStep: activeStep
            });
            wx.hideLoading();
        } catch (err) {
            wx.hideLoading();
            console.error('Fetch order detail failed', err);
            wx.showToast({ title: '订单信息不完整', icon: 'none' });
        }
    },

    onContactCarrier: function () {
        const { order } = this.data;
        if (!order || !order._openid) {
            wx.showToast({ title: '无法获取带物人信息', icon: 'none' });
            return;
        }

        if (!app.globalData.userInfo) {
            wx.showToast({ title: '请先登录', icon: 'none' });
            return;
        }

        const myId = app.globalData.userInfo._id;
        const otherId = order._openid;

        if (myId === otherId) {
            wx.showToast({ title: '不能跟自己聊天哦', icon: 'none' });
            return;
        }

        const db = wx.cloud.database();
        const _ = db.command;

        db.collection('conversations')
            .where({
                participants: _.all([myId, otherId])
            })
            .get()
            .then(res => {
                if (res.data.length > 0) {
                    this.goToChat(res.data[0]._id);
                } else {
                    db.collection('conversations').add({
                        data: {
                            participants: [myId, otherId],
                            lastUpdate: db.serverDate(),
                            lastMessage: { content: '我发起了一个咨询', timestamp: db.serverDate() },
                            type: 'user',
                            unreadCount: 0
                        }
                    }).then(addRes => {
                        this.goToChat(addRes._id);
                    });
                }
            });
    },

    goToChat: function (id) {
        wx.navigateTo({
            url: `/pages/chat/chat?id=${id}&type=user`
        });
    }
});
