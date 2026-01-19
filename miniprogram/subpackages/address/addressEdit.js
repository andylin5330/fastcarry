const app = getApp();
const db = wx.cloud.database();

// Minimal area list for demonstration if full data isn't available
// In a real app, you'd import the full vant area-data
const areaList = {
    province_list: {
        110000: '北京市',
        120000: '天津市',
        310000: '上海市',
        440000: '广东省'
    },
    city_list: {
        110100: '北京市',
        120100: '天津市',
        310100: '上海市',
        440100: '广州市',
        440300: '深圳市'
    },
    county_list: {
        110101: '东城区',
        110102: '西城区',
        440106: '天河区',
        440305: '南山区'
    }
};

Page({
    data: {
        id: '',
        name: '',
        phone: '',
        country: '',
        region: [],
        regionText: '',
        street: '',
        building: '',
        apt: '',
        postcode: '',
        detail: '',
        isDefault: false,
        showArea: false,
        areaList: areaList,
        areaCode: '',
        countries: ['中国', '加拿大', '美国', '英国', '澳大利亚', '新西兰', '日本', '韩国', '新加坡', '其他'],
        showCountryPicker: false
    },

    onLoad: function (options) {
        if (options.id) {
            this.setData({ id: options.id });
            this.fetchAddressDetail(options.id);
            wx.setNavigationBarTitle({ title: '编辑地址' });
        } else {
            wx.setNavigationBarTitle({ title: '添加地址' });
        }
    },

    fetchAddressDetail: function (id) {
        wx.showLoading({ title: '加载中...' });
        db.collection('addresses').doc(id).get().then(res => {
            wx.hideLoading();
            const addr = res.data;
            this.setData({
                name: addr.name,
                phone: addr.phone,
                country: addr.country || '',
                region: addr.region,
                regionText: addr.region.join(' '),
                street: addr.street || '',
                building: addr.building || '',
                apt: addr.apt || '',
                postcode: addr.postcode || '',
                detail: addr.detail,
                isDefault: addr.isDefault
            });
        }).catch(err => {
            wx.hideLoading();
            console.error('Fetch address detail failed', err);
        });
    },

    onNameChange: function (e) { this.setData({ name: e.detail }); },
    onPhoneChange: function (e) { this.setData({ phone: e.detail }); },
    onStreetChange: function (e) { this.setData({ street: e.detail }); },
    onBuildingChange: function (e) { this.setData({ building: e.detail }); },
    onAptChange: function (e) { this.setData({ apt: e.detail }); },
    onPostcodeChange: function (e) { this.setData({ postcode: e.detail }); },
    onDetailChange: function (e) { this.setData({ detail: e.detail }); },
    onDefaultChange: function (e) { this.setData({ isDefault: e.detail }); },

    showAreaPopup: function () { this.setData({ showArea: true }); },
    hideAreaPopup: function () { this.setData({ showArea: false }); },

    showCountryPopup: function () { this.setData({ showCountryPicker: true }); },
    hideCountryPopup: function () { this.setData({ showCountryPicker: false }); },

    onCountryConfirm: function (e) {
        this.setData({
            country: e.detail.value,
            showCountryPicker: false
        });
    },

    onAreaConfirm: function (e) {
        const values = e.detail.values;
        const region = values.map(item => item.name);
        this.setData({
            region: region,
            regionText: region.join(' '),
            areaCode: values[2].code,
            showArea: false
        });
    },

    saveAddress: async function () {
        const { id, name, phone, country, region, street, building, apt, postcode, detail, isDefault } = this.data;

        if (!name || !phone || !country || !street) {
            wx.showToast({ title: '请填写必要信息', icon: 'none' });
            return;
        }

        wx.showLoading({ title: '保存中...' });

        try {
            // If setting as default, unset other default addresses first
            if (isDefault) {
                await wx.cloud.callFunction({
                    name: 'login', // Reuse login or dedicated function to unset default
                    data: { action: 'unsetDefaultAddress' }
                    // Note: Better to have a dedicated cloud function, but here we'll simulate or use client-side if allowed
                });
                // Client-side unset (sequential updates are slower but work for demo)
                const defaults = await db.collection('addresses').where({ isDefault: true }).get();
                for (const doc of defaults.data) {
                    if (doc._id !== id) {
                        await db.collection('addresses').doc(doc._id).update({ data: { isDefault: false } });
                    }
                }
            }

            const data = {
                name,
                phone,
                country,
                region,
                street,
                building,
                apt,
                postcode,
                detail,
                isDefault,
                updateTime: db.serverDate()
            };

            if (id) {
                await db.collection('addresses').doc(id).update({ data });
            } else {
                await db.collection('addresses').add({ data: { ...data, createTime: db.serverDate() } });
            }

            wx.hideLoading();
            wx.showToast({ title: '保存成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1000);
        } catch (err) {
            wx.hideLoading();
            console.error('Save address failed', err);
            wx.showToast({ title: '保存失败', icon: 'none' });
        }
    },

    deleteAddress: function () {
        wx.showModal({
            title: '提示',
            content: '确定要删除该地址吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '删除中...' });
                    db.collection('addresses').doc(this.data.id).remove().then(() => {
                        wx.hideLoading();
                        wx.showToast({ title: '已删除', icon: 'success' });
                        setTimeout(() => wx.navigateBack(), 1000);
                    }).catch(err => {
                        wx.hideLoading();
                        console.error('Delete address failed', err);
                    });
                }
            }
        });
    }
});
