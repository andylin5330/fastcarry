// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID;

    const { orderId } = event;

    if (!orderId) {
        return { success: false, msg: 'Missing orderId' };
    }

    try {
        // 1. Verify ownership
        const orderRes = await db.collection('orders').doc(orderId).get();
        const order = orderRes.data;

        if (order._openid !== openid) {
            return { success: false, msg: 'Permission denied' };
        }

        // 2. Remove the order
        await db.collection('orders').doc(orderId).remove();

        return {
            success: true
        };
    } catch (err) {
        console.error(err);
        return {
            success: false,
            error: err
        };
    }
}
