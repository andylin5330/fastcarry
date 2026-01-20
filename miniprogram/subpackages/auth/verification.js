const app = getApp();

Page({
    data: {
        realName: '',
        idCard: '',
        fileList: [],
    },

    onNameChange(e) {
        this.setData({ realName: e.detail });
    },

    onIdCardChange(e) {
        this.setData({ idCard: e.detail });
    },

    afterRead(event) {
        const { file } = event.detail;
        const { fileList = [] } = this.data;
        fileList.push({ ...file, url: file.url });
        this.setData({ fileList });
    },

    deleteImg(event) {
        const { index } = event.detail;
        const { fileList } = this.data;
        fileList.splice(index, 1);
        this.setData({ fileList });
    },

    onSubmit() {
        if (!this.data.realName || this.data.idCard.length !== 18) {
            wx.showToast({ title: '请填写完整信息', icon: 'none' });
            return;
        }

        wx.showLoading({ title: '验证中...' });

        // Mock API Call
        setTimeout(() => {
            wx.hideLoading();

            // Update Global State
            if (app.globalData.userInfo) {
                app.globalData.userInfo.isVerified = true;
            }

            // Update Storage if needed (omitted for mock)

            wx.showToast({ title: '认证成功', icon: 'success' });

            setTimeout(() => {
                wx.navigateBack();
            }, 1500);
        }, 1500);
    },

    onQuickVerify() {
        wx.showLoading({ title: '认证中...' });
        setTimeout(() => {
            wx.hideLoading();
            if (app.globalData.userInfo) {
                app.globalData.userInfo.isVerified = true;
            }
            wx.showToast({ title: '认证成功', icon: 'success' });
            setTimeout(() => {
                wx.navigateBack();
            }, 1000);
        }, 500);
    }
});
