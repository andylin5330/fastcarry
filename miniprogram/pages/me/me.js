import api from '../../config/settings'
var app = getApp() // 取到 app.js 对象
const db = wx.cloud.database()
Page({


  data: {
    userInfo: null,
    agreed: false,
    avatarUrl: '/images/user.png', // Default avatar
    nickName: ''
  },

  onNicknameChange(e) {
    this.setData({
      nickName: e.detail.value
    })
  },

  // 1. 处理头像选择并直接登录
  getAvatar(e) {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先阅读并同意用户协议',
        icon: 'none'
      })
      return
    }

    if (!this.data.nickName) {
      wx.showToast({
        title: '请先输入或选择昵称',
        icon: 'none'
      })
      return
    }

    const { avatarUrl } = e.detail
    this.setData({
      avatarUrl
    })

    // 直接调用登录，使用输入的昵称
    this.loginToServer(this.data.nickName, avatarUrl)
  },

  // 2. 统一登录请求 (完全迁移至云开发)
  loginToServer(name, avatar) {
    wx.showLoading({
      title: '正在登录...',
    })

    wx.cloud.callFunction({
      name: 'login',
      data: {
        name: name,
        avatar: avatar
      },
      success: (res) => {
        wx.hideLoading()
        console.log('云函数调用成功', res.result)
        const data = res.result

        if (data.code === 100) {
          const { userInfo } = data
          app.initUserInfo(userInfo.name, userInfo.score, userInfo.avatar, 'CLOUD_AUTH')
          this.setData({
            userInfo: app.globalData.userInfo
          })
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
        } else {
          wx.showToast({
            title: '登录失败: ' + (data.msg || '未知错误'),
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('云函数调用失败', err)
        wx.showToast({
          title: '连接云服务失败',
          icon: 'none'
        })
      }
    })
  },

  // 手机号快速登录 (保留备份)
  getPhoneNumber(event) {
    console.log(event)
    wx.request({
      url: api.quick_login,
      method: 'POST',
      data: {
        code: event.detail.code
      },
      success: (res) => {
        console.log('Login Response:', res)
        var data = res.data;
        if (data.code == 100) {
          console.log('Login Success:', data)
          var token = data.token
          var name = data.name
          var score = data.score
          var avatar = data.avatar
          app.initUserInfo(name, score, avatar, token)
          var info = app.globalData.userInfo
          console.log('globalData.userInfo', info)
          if (info) {
            this.setData({
              userInfo: info
            })
          }
        } else {
          console.warn('Login Failed Code:', data.code, 'Msg:', data.msg)
          wx.showToast({
            title: '登录失败: ' + (data.msg || '未知错误'),
            icon: 'none',
            duration: 2000
          })
        }
      },
      fail: (err) => {
        console.error('Request Failed:', err)
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
      }
    })
  },

  handleOtherLogin() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  handleAgreeChange(e) {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  onShow() {
    // 1 取出放在app.js 中的用户信息
    var info = app.globalData.userInfo
    console.log('globalData.userInfo', info)
    if (info) {
      this.setData({
        userInfo: info,
        avatarUrl: info.avatar || '/images/user.png'
      })
    }
  },
  handleLogout() {
    // 1 调用app.js 的退出
    app.logoutUserInfo()
    // 2 当前页面中到的userInfo值为空
    this.setData({
      userInfo: null
    })
  }
})