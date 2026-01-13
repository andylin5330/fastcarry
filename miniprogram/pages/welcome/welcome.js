// pages/welcome/welcome.js
Page({

  /**
   * Page initial data
   */
  data: {
    second: 3,
    img: 'cloud://cloud1-1g75i69o3bf03886.636c-cloud1-1g75i69o3bf03886-1394854433/bg/splash.png'
  },
  onLoad(options) {
    this.timer = setInterval(() => {
      let sec = this.data.second;
      if (sec <= 1) {
        this.doJump();
      } else {
        this.setData({
          second: sec - 1
        });
      }
    }, 1000);
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  doJump() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Check if we are already switching
    wx.switchTab({
      url: '/pages/index/index',
      fail: (err) => {
        // In case it's not a tab bar (though it is), fallback or log
        console.error("Switch tab failed", err);
      }
    })
  }

})