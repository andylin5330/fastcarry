// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID;

    const { tripId, flightNo, dep, dest, weight, senderNote, carrierId } = event;

    if (!tripId) {
        return { success: false, msg: 'Missing tripId' };
    }

    try {
        const res = await db.collection('orders').add({
            data: {
                _openid: openid, // Sender's OpenID
                tripId: tripId,
                carrierId: carrierId, // The carrier's OpenID (should be passed from frontend)
                flightNo: flightNo,
                route: `${dep} -> ${dest}`,
                weight: weight || '0',
                note: senderNote || '',
                status: 'pending', // pending, accepted, rejected, completed
                createTime: db.serverDate(),
                updateTime: db.serverDate()
            }
        });

        return {
            success: true,
            orderId: res._id
        };
    } catch (err) {
        console.error(err);
        return {
            success: false,
            error: err
        };
    }
}
