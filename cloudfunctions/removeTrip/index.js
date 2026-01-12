// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID;

    const { tripId } = event;

    if (!tripId) {
        return { success: false, msg: 'Missing tripId' };
    }

    try {
        // 1. Verify ownership
        const tripRes = await db.collection('trips').doc(tripId).get();
        const trip = tripRes.data;

        if (trip._openid !== openid) {
            return { success: false, msg: 'Permission denied' };
        }

        // 2. Remove the trip
        await db.collection('trips').doc(tripId).remove();

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
