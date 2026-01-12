// 云函数入口文件
const cloud = require('wx-server-sdk')
const path = require('path')
const vision = require('@google-cloud/vision');

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})
const config = JSON.parse(process.env.GOOGLE_KEY_JSON);
// 初始化客户端
const client = new vision.ImageAnnotatorClient({
  credentials: config
});

exports.main = async (event) => {
    const { fileID } = event;
    console.log('Processing fileID:', fileID);

    try {
        // 2. 调用 Google Vision API
        // 我们同时请求：标签识别(Labels)、合规性检查(SafeSearch)
        const res = await cloud.downloadFile({ fileID });
        const imageBuffer = res.fileContent;

        const [result] = await client.annotateImage({
            image: { content: imageBuffer },
            features: [
                { type: 'LABEL_DETECTION' },
                { type: 'SAFE_SEARCH_DETECTION' }
            ],
        });

        const labels = result.labelAnnotations;
        const safeSearch = result.safeSearchAnnotation;

        // 3. 简单的违禁品初步筛查逻辑
        let riskLevel = 'NONE';
        if (safeSearch.adult === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
            riskLevel = 'HIGH_RISK';
        }

        return {
            success: true,
            itemName: labels[0]?.description || '未知物品', // 提取最可能的名称
            allLabels: labels.map(l => l.description),
            riskLevel
        };

    } catch (err) {
        console.error(err);
        return { success: false, error: err };
    }
};