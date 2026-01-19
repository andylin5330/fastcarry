const app = getApp()

Page({
    data: {
        balance: '0.00',
        transactions: []
    },

    onLoad: function (options) {
        this.fetchWalletData()
    },

    onShow: function () {
        this.fetchWalletData()
    },

    fetchWalletData: function () {
        const userInfo = app.globalData.userInfo
        if (userInfo) {
            this.setData({
                balance: (userInfo.balance || 0).toFixed(2)
            })
        }
    }
})
