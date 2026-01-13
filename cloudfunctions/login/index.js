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
    // --- 确保计数器文档存在 ---
    const counterDoc = db.collection('counters').doc('user_id')
    const checkCounter = await counterDoc.get().catch(() => null)
    if (!checkCounter) {
      await db.collection('counters').add({
        data: {
          _id: 'user_id',
          count: 221525
        }
      }).catch(() => {
        // 防止并发创建导致的冲突
      })
    }

    // 1. 查找用户是否已存在
    const userRes = await db.collection('users').where({
      openid: openid
    }).get()

    let userData;
    const _ = db.command
    if (userRes.data.length === 0) {
      // 2. 如果不存在，则创建新用户
      // 原子自增
      await counterDoc.update({
        data: { count: _.inc(1) }
      })

      // 读取最新值
      const finalCounter = await counterDoc.get()
      const newUid = finalCounter.data.count

      userData = {
        openid: openid,
        uid: newUid,
        name: name,
        avatar: avatar,
        score: 100, // 初始分值
        createTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
      const addRes = await db.collection('users').add({ data: userData })
      userData._id = addRes._id
    } else {
      // 3. 如果已存在，则更新昵称、头像和最后登录时间
      userData = userRes.data[0]

      // 兼容旧用户：如果没有 uid，补发一个
      if (!userData.uid) {
        await counterDoc.update({
          data: { count: _.inc(1) }
        })
        const finalCounter = await counterDoc.get()
        userData.uid = finalCounter.data.count
      }

      userData.name = name
      userData.avatar = avatar
      userData.lastLoginTime = db.serverDate()

      await db.collection('users').doc(userData._id).update({
        data: {
          uid: userData.uid,
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
        _id: userData._id,
        uid: userData.uid,
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