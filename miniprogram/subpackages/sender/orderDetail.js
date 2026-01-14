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

    fetchOrderDetail: function (id) {
        wx.showLoading({ title: '加载中...' });
        // In a real app, you would call a cloud function here
        // For now, we simulate with database query or mock
        const db = wx.cloud.database();
        db.collection('orders').doc(id).get().then(res => {
            wx.hideLoading();
            const order = res.data;

            // Calculate active step based on order status fields
            // This logic will depend on how your database stores these flags
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
        }).catch(err => {
            wx.hideLoading();
            console.error('Fetch order detail failed', err);
            wx.showToast({ title: '加载失败', icon: 'none' });
        });
    }
});
