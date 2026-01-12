// app.js
App({
  onLaunch() {
    this.globalData = {
      env: "cloud1-1g75i69o3bf03886"
    };
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      })
    }
  },
  globalData: {

    userInfo: null
  },

  initUserInfo(name, score, avatar, token) {
    this.globalData.userInfo = {
      name: name,
      score: score,
      avatar: avatar,
      token: token
    }
  },

  logoutUserInfo() {
    this.globalData.userInfo = null
  }
})
