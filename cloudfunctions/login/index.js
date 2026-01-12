// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { name, avatar } = event
  const openid = wxContext.OPENID

  try {
    // 1. 查找用户是否已存在
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()

    let userData;
    if (userRes.data.length === 0) {
      // 2. 如果不存在，则创建新用户
      userData = {
        openid: openid,
        name: name,
        avatar: avatar,
        score: 100, // 初始分值
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
      await db.collection('users').add({ data: userData })
    } else {
      // 3. 如果已存在，则更新昵称、头像和最后登录时间
      userData = userRes.data[0]
      userData.name = name
      userData.avatar = avatar
      userData.lastLoginTime = db.serverDate()

      await db.collection('users').doc(userData._id).update({
        data: {
          name: name,
          avatar: avatar,
          lastLoginTime: db.serverDate()
        }
      })
    }

    // 返回完整的用户信息
    return {
      code: 100,
      msg: '登录成功',
      userInfo: {
        name: userData.name,
        avatar: userData.avatar,
        score: userData.score || 100
      }
    }
  } catch (e) {
    console.error(e)
    return {
      code: 500,
      msg: '云函数内部错误: ' + e.message
    }
  }
}