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

    navigateToCarrier() {
        wx.navigateTo({
            url: '/pages/carrier/carrier',
        })
    },
    navigateToSender() {
        wx.navigateTo({
            url: '/pages/sender/sender',
        })
    }
})
