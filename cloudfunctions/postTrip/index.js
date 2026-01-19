// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

function generateCarryingNo() {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0');
    const randomStr = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `CA${dateStr}${randomStr}`;
}

// 云函数入口函数
exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const { flightNo, route, spaceType, details, address } = event;

    if (!flightNo || !route || !address) {
        return { success: false, msg: 'Missing required fields' };
    }

    try {
        const carryingNo = generateCarryingNo();

        // 1. Fetch Carrier Name
        const userRes = await db.collection('users').where({
            openid: wxContext.OPENID
        }).get();
        const carrierName = userRes.data.length > 0 ? userRes.data[0].name : '微信用户';

        const res = await db.collection('trips').add({
            data: {
                _openid: wxContext.OPENID, // Security: Ensure data belongs to user
                carryingNo,
                carrierName,
                userName: carrierName, // Specific field requested by user
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
