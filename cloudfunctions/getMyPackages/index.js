// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID;

    try {
        // 1. Get My Trips (As Carrier)
        // Ordered by createTime desc
        const tripsRes = await db.collection('trips')
            .where({
                _openid: openid
            })
            .orderBy('createTime', 'desc')
            .get();

        // 2. Get My Orders (As Sender)
        // Filter out cancelled orders
        const ordersRes = await db.collection('orders')
            .where({
                _openid: openid,
                status: _.neq('cancelled')
            })
            .orderBy('createTime', 'desc')
            .get();

        return {
            success: true,
            myTrips: tripsRes.data,
            myOrders: ordersRes.data
        };

    } catch (err) {
        console.error(err);
        return {
            success: false,
            error: err
        };
    }
}
