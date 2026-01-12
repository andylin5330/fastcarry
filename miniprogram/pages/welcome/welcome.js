// pages/welcome/welcome.js
Page({

  /**
   * Page initial data
   */
  data: {
    second:3,
    img:'/images/bg/splash.png'
  },
  doJump(){
    //电击就跳转的首页
    wx.switchTab({
      url: '/pages/index/index',
    })
  },

  onLoad(options){
    wx.request({
      url:'http://127.0.0.1:8000/fastcarry/welcome/',
      method:'GET',
      success:(res)=>{
        if(res.data.code==100){
          this.setData({
            img:res.data.result
          })
        }else{
          wx.showToast({
            title: '网络请求异常',
          })
        }
      }
    })

    //启动定时器，倒计时
    //清除定时器
    var instance=setInterval(()=>{
      if(this.data.second<=0){
        clearInterval(instance)

        wx.switchTab({
          url: '/pages/index/index',
        })
      }
      else{
        this.setData({
          second:this.data.second-1
        })
      }
      
    },1000)
  }

})