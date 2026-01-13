Page({
    data: {
        activeTab: 0,
        myTrips: [],

        statusBarHeight: 0,

        // Form Data
        flightNo: '',
        departure: '',
        destination: '',

        // Space Logic
        spaceType: 'empty', // 'empty' | 'remaining' | 'abnormal'
        remainingWeight: '', // kg
        volumeRatio: '1/4', // 1/4, 1/2, 3/4, 1
        volumeOptions: ['1/4', '1/2', '3/4', 'Full'],

        // Address
        address: '',
        isAddressSaved: false
    },

    onLoad: function (options) {
        const systemInfo = wx.getSystemInfoSync();
        this.setData({
            statusBarHeight: systemInfo.statusBarHeight
        });

        // Load cached address if available
        const cachedAddr = wx.getStorageSync('carrier_address');
        if (cachedAddr) {
            this.setData({ address: cachedAddr, isAddressSaved: true });
        }
    },

    onShow: function () {
        if (this.data.activeTab === 1) {
            this.fetchMyTrips();
        }
    },

    onTabChange(event) {
        const tabIndex = event.detail.index;
        this.setData({ activeTab: tabIndex });
        if (tabIndex === 1) {
            this.fetchMyTrips();
        }
    },

    fetchMyTrips: function () {
        wx.showLoading({ title: '加载行程...' });
        wx.cloud.callFunction({
            name: 'getMyPackages'
        }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.success) {
                const { myTrips } = res.result;

                const formatTime = (isoStr) => {
                    if (!isoStr) return '';
                    const d = new Date(isoStr);
                    return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
                };

                const formattedTrips = myTrips.map(t => ({
                    ...t,
                    createTime_fmt: formatTime(t.createTime)
                }));

                this.setData({
                    myTrips: formattedTrips
                });
            }
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
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
                            this.fetchMyTrips(); // Refresh list
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
    },

    handleBack: function () {
        wx.navigateBack();
    },

    // Handlers
    onFlightInput(e) { this.setData({ flightNo: e.detail }); },
    onDepInput(e) { this.setData({ departure: e.detail }); },
    onDestInput(e) { this.setData({ destination: e.detail }); },

    onSpaceTypeChange(e) {
        this.setData({ spaceType: e.detail });
    },

    onWeightInput(e) {
        this.setData({ remainingWeight: e.detail });
    },

    onVolumeSelect(e) {
        const val = e.currentTarget.dataset.value;
        this.setData({ volumeRatio: val });
    },

    onAddressInput(e) {
        this.setData({ address: e.detail });
        // Auto-save logic (simple debounce could be added here, currently just save on blur/change)
        wx.setStorageSync('carrier_address', e.detail);
        this.setData({ isAddressSaved: true });
    },

    onSubmit: function () {
        // Validate
        if (!this.data.flightNo || !this.data.departure || !this.data.destination) {
            wx.showToast({ title: '请补全航班及行程信息', icon: 'none' });
            return;
        }

        if (!this.data.address) {
            wx.showToast({ title: '请输入收件地址', icon: 'none' });
            return;
        }

        const data = {
            flightNo: this.data.flightNo,
            route: `${this.data.departure} -> ${this.data.destination}`,
            spaceType: this.data.spaceType,
            details: this.data.spaceType === 'remaining' ? {
                weight: this.data.remainingWeight,
                volume: this.data.volumeRatio
            } : {},
            address: this.data.address
        };

        // Call Cloud Function
        wx.showLoading({ title: '正在发布...' });

        wx.cloud.callFunction({
            name: 'postTrip',
            data: data
        }).then(res => {
            wx.hideLoading();
            console.log('Publish result:', res);
            const result = res.result;
            if (result && result.success) {
                wx.showToast({ title: '发布成功', icon: 'success' });
                // Auto switch to My Trips tab
                setTimeout(() => {
                    this.setData({ activeTab: 1 });
                    this.fetchMyTrips();
                }, 1000);
            } else {
                wx.showToast({ title: '发布失败: ' + (result.msg || '未知错误'), icon: 'none' });
            }
        }).catch(err => {
            wx.hideLoading();
            console.error('Cloud function fail:', err);
            wx.showToast({ title: '网络异常', icon: 'none' });
        });
    }
})
