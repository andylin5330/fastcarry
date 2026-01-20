const app = getApp();
const db = wx.cloud.database();

Page({
    data: {
        activeTab: 0,
        myTrips: [],

        statusBarHeight: 0,

        // Wizard State
        currentStep: 0,
        steps: [
            { text: '航班信息', desc: 'Flight' },
            { text: '行程地点', desc: 'Route' },
            { text: '收件地址', desc: 'Address' },
            { text: '行李空间', desc: 'Space' }
        ],

        // Form Data
        flightNo: '',

        // Route Data
        departure: '',
        destination: '',
        commonCities: ['上海', '北京', '广州', '多伦多', '温哥华', '纽约'],

        // Picker State
        showDepPicker: false,
        showDestPicker: false,
        cityColumns: [
            '上海', '北京', '广州', '深圳', '杭州', '成都', '重庆', '西安',
            '多伦多', '温哥华', '蒙特利尔', '卡尔加里',
            '纽约', '洛杉矶', '旧金山', '西雅图', '芝加哥',
            '伦敦', '巴黎', '东京', '首尔', '新加坡', '悉尼'
        ],

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

    // Wizard Navigation
    nextStep() {
        if (this.data.currentStep < 3) {
            // Validation
            if (this.data.currentStep === 0 && !this.data.flightNo) {
                wx.showToast({ title: '请输入航班号', icon: 'none' });
                return;
            }
            if (this.data.currentStep === 1 && (!this.data.departure || !this.data.destination)) {
                wx.showToast({ title: '请完善行程地点', icon: 'none' });
                return;
            }
            if (this.data.currentStep === 2 && !this.data.address) {
                wx.showToast({ title: '请输入收件地址', icon: 'none' });
                return;
            }

            this.setData({ currentStep: this.data.currentStep + 1 });
        }
    },

    prevStep() {
        if (this.data.currentStep > 0) {
            this.setData({ currentStep: this.data.currentStep - 1 });
        }
    },

    // Picker Handlers
    onShowDepPicker() {
        this.setData({ showDepPicker: true });
    },

    onCloseDepPicker() {
        this.setData({ showDepPicker: false });
    },

    onConfirmDep(e) {
        this.setData({
            departure: e.detail.value,
            showDepPicker: false
        });
    },

    onShowDestPicker() {
        this.setData({ showDestPicker: true });
    },

    onCloseDestPicker() {
        this.setData({ showDestPicker: false });
    },

    onConfirmDest(e) {
        this.setData({
            destination: e.detail.value,
            showDestPicker: false
        });
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
        // Real-name Authentication Check
        if (app.globalData.userInfo && !app.globalData.userInfo.isVerified) {
            wx.showModal({
                title: '实名认证提示',
                content: '为了保障交易安全，发布行程前需完成实名认证。',
                confirmText: '去认证',
                success: (res) => {
                    if (res.confirm) {
                        wx.navigateTo({ url: '/subpackages/auth/verification' });
                    }
                }
            });
            return;
        }

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
            address: this.data.address,
            createTime: db.serverDate()
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
    },

    onSelectSavedAddress: async function () {
        if (!app.globalData.userInfo) {
            wx.showModal({
                title: '提示',
                content: '请先登录以使用保存的地址',
                confirmText: '去登录',
                success: (res) => {
                    if (res.confirm) {
                        wx.switchTab({
                            url: '/pages/me/me'
                        });
                    }
                }
            });
            return;
        }

        wx.showLoading({ title: '获取地址...' });
        try {
            const res = await db.collection('addresses').get();
            wx.hideLoading();
            const list = res.data;
            if (list && list.length > 0) {
                // Find default or use first
                const target = list.find(a => a.isDefault) || list[0];

                // Format the full address: Country Region Street Building Apt
                const parts = [
                    target.country,
                    target.region ? target.region.join(' ') : '',
                    target.street,
                    target.building,
                    target.apt ? '#' + target.apt : ''
                ].filter(p => !!p);

                const formattedAddress = parts.join(', ');

                this.setData({
                    address: formattedAddress,
                    isAddressSaved: true
                });

                // Sync to local storage
                wx.setStorageSync('carrier_address', formattedAddress);
                wx.showToast({ title: '已自动填充', icon: 'success' });
            } else {
                wx.showToast({ title: '暂无已存地址', icon: 'none' });
            }
        } catch (err) {
            wx.hideLoading();
            console.error('Fetch addresses failed', err);
            wx.showToast({ title: '获取失败', icon: 'none' });
        }
    }
})
