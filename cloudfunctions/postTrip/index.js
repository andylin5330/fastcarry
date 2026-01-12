// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const { flightNo, route, spaceType, details, address } = event;

    if (!flightNo || !route || !address) {
        return { success: false, msg: 'Missing required fields' };
    }

    try {
        const res = await db.collection('trips').add({
            data: {
                _openid: wxContext.OPENID, // Security: Ensure data belongs to user
                flightNo,
                route,
                spaceType,
                details,
                address,
                createTime: db.serverDate(),
                status: 'published' // published, booked, completed
            }
        });

        return {
            success: true,
            _id: res._id,
            msg: 'Trip published successfully'
        };
    } catch (err) {
        console.error(err);
        return {
            success: false,
            msg: 'Database error',
            error: err
        };
    }
}
