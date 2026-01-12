Page({
    data: {
        activeTab: 0,
        myOrders: [],
        myTrips: []
    },

    onShow: function () {
        this.fetchPackages();
    },

    onTabChange(event) {
        this.setData({ activeTab: event.detail.name });
    },

    fetchPackages: function () {
        wx.showLoading({ title: '加载中...' });

        wx.cloud.callFunction({
            name: 'getMyPackages'
        }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.success) {
                const { myTrips, myOrders } = res.result;

                // Simple formatting
                const formatTime = (isoStr) => {
                    if (!isoStr) return '';
                    const d = new Date(isoStr);
                    return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
                };

                const formattedTrips = myTrips.map(t => ({
                    ...t,
                    createTime_fmt: formatTime(t.createTime)
                }));

                const formattedOrders = myOrders.map(o => ({
                    ...o,
                    createTime_fmt: formatTime(o.createTime)
                }));

                this.setData({
                    myTrips: formattedTrips,
                    myOrders: formattedOrders
                });
            }
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
        });
    },

    onCancelOrder: function (e) {
        const orderId = e.target.dataset.id || e.currentTarget.dataset.id;
        wx.showModal({
            title: '取消订单',
            content: '确定要取消这个订单吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '处理中...' });
                    wx.cloud.callFunction({
                        name: 'cancelOrder',
                        data: { orderId }
                    }).then(res => {
                        wx.hideLoading();
                        if (res.result && res.result.success) {
                            wx.showToast({ title: '已取消', icon: 'success' });
                            this.fetchPackages(); // Refresh list
                        } else {
                            wx.showToast({ title: '取消失败', icon: 'none' });
                        }
                    }).catch(err => {
                        wx.hideLoading();
                        console.error(err);
                        wx.showToast({ title: '网络异常', icon: 'none' });
                    });
                }
            }
        });
    },

    onRemoveTrip: function (e) {
        const tripId = e.target.dataset.id || e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认下架',
            content: '下架后需带货人将无法搜索到此行程。确定下架吗？',
            confirmColor: '#FF0000',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '下架中...' });
                    wx.cloud.callFunction({
                        name: 'removeTrip',
                        data: { tripId }
                    }).then(res => {
                        wx.hideLoading();
                        if (res.result && res.result.success) {
                            wx.showToast({ title: '已下架', icon: 'success' });
                            this.fetchPackages(); // Refresh list
                        } else {
                            wx.showToast({ title: '下架失败', icon: 'none' });
                        }
                    }).catch(err => {
                        wx.hideLoading();
                        console.error(err);
                        wx.showToast({ title: '网络异常', icon: 'none' });
                    });
                }
            }
        });
    }
});
