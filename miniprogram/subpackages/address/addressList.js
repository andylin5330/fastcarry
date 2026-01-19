const app = getApp();
const db = wx.cloud.database();

Page({
    data: {
        addressList: [],
        mode: '' // 'select' or empty
    },

    onLoad: function (options) {
        if (options.mode) {
            this.setData({ mode: options.mode });
            if (options.mode === 'select') {
                wx.setNavigationBarTitle({ title: '选择地址' });
            }
        }
    },

    onShow: function () {
        this.fetchAddressList();
    },

    fetchAddressList: function () {
        wx.showLoading({ title: '加载中...' });
        db.collection('addresses')
            .where({})
            .get()
            .then(res => {
                wx.hideLoading();
                this.setData({
                    addressList: res.data
                });
            })
            .catch(err => {
                wx.hideLoading();
                console.error('Fetch address failed', err);
            });
    },

    addAddress: function () {
        wx.navigateTo({
            url: '/subpackages/address/addressEdit'
        });
    },

    editAddress: function (e) {
        const id = e.currentTarget.dataset.id;
        if (this.data.mode === 'select') {
            const address = this.data.addressList.find(a => a._id === id);
            if (address) {
                const eventChannel = this.getOpenerEventChannel();
                eventChannel.emit('addressSelected', address);
                wx.navigateBack();
            }
            return;
        }
        wx.navigateTo({
            url: `/subpackages/address/addressEdit?id=${id}`
        });
    }
});
