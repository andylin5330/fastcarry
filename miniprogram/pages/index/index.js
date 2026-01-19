const app = getApp();

Page({
    data: {
        gridItems: [
            { text: '水果', icon: 'flower-o', color: '#ff5722' },
            { text: '生鲜', icon: 'shop-o', color: '#f44336' },
            { text: '蔬菜', icon: 'hot-o', color: '#ff9800' },
            { text: '啤酒', icon: 'gift-o', color: '#e91e63' },
            { text: '充值', icon: 'phone-o', color: '#2196f3' },
            { text: '领券', icon: 'gem-o', color: '#9c27b0' },
            { text: '外卖', icon: 'bag-o', color: '#ff5722' },
            { text: '美食', icon: 'smile-o', color: '#e91e63' }
        ]
    },

    checkLogin() {
        if (!app.globalData.userInfo) {
            wx.showModal({
                title: '友情提示',
                content: '为了给您提供更好的服务，请先登录',
                confirmText: '去登录',
                success: (res) => {
                    if (res.confirm) {
                        wx.switchTab({
                            url: '/pages/me/me'
                        });
                    }
                }
            });
            return false;
        }
        return true;
    },

    navigateToCarrier() {
        if (!this.checkLogin()) return;
        wx.navigateTo({
            url: '/subpackages/carrier/carrier',
        })
    },
    navigateToSender() {
        if (!this.checkLogin()) return;
        wx.navigateTo({
            url: '/subpackages/sender/sender',
        })
    }
})
