Page({
    data: {
        activeTab: 0,
        myOrders: [],

        categories: ['药物', '电器', '特货(含自用书籍)', '普货', '文件'],
        categoryIndex: null, // Default to null for placeholder
        itemWeight: '',
        departure: '',
        searchQuery: '', // Destination
        agreed: false,

        // Results Data
        flights: [
            { id: 201, flightNo: 'MU588', date: '2023-11-01', availableWeight: 5.0, destination: '上海', cityCode: 'SHA', pricePerKg: 100 },
            { id: 202, flightNo: 'UA857', date: '2023-11-02', availableWeight: 10.0, destination: '上海', cityCode: 'SHA', pricePerKg: 120 },
            { id: 203, flightNo: 'CZ328', date: '2023-11-05', availableWeight: 2.0, destination: '广州', cityCode: 'CAN', pricePerKg: 90 },
            { id: 204, flightNo: 'CA982', date: '2023-11-03', availableWeight: 8.0, destination: '北京', cityCode: 'PEK', pricePerKg: 110 }
        ],
        filteredFlights: [],
        showFallback: false,
        nearbyCities: [
            { name: '苏州', distance: '100km' },
            { name: '杭州', distance: '180km' }
        ]
    },

    onLoad: function () {
        // Initial setup if needed
    },

    onShow: function () {
        if (this.data.activeTab === 1) {
            this.fetchMyOrders();
        }
    },

    onTabChange(event) {
        const tabIndex = event.detail.index; // van-tabs returns index in event.detail.index or event.detail.name
        this.setData({ activeTab: tabIndex });
        if (tabIndex === 1) {
            this.fetchMyOrders();
        }
    },

    fetchMyOrders: function () {
        wx.showLoading({ title: '加载订单...' });
        wx.cloud.callFunction({
            name: 'getMyPackages'
        }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.success) {
                const { myOrders } = res.result;

                // Simple formatting
                const formatTime = (isoStr) => {
                    if (!isoStr) return '';
                    const d = new Date(isoStr);
                    return `${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
                };

                const formattedOrders = myOrders.map(o => ({
                    ...o,
                    createTime_fmt: formatTime(o.createTime)
                }));

                this.setData({
                    myOrders: formattedOrders
                });
            }
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
        });
    },

    onCancelOrder: function (e) {
        const orderId = e.target.dataset.id || e.currentTarget.dataset.id;
        wx.showModal({
            title: '取消订单',
            content: '确定要取消这个订单吗？',
            success: (res) => {
                if (res.confirm) {
                    wx.showLoading({ title: '处理中...' });
                    wx.cloud.callFunction({
                        name: 'cancelOrder',
                        data: { orderId }
                    }).then(res => {
                        wx.hideLoading();
                        if (res.result && res.result.success) {
                            wx.showToast({ title: '已取消', icon: 'success' });
                            this.fetchMyOrders(); // Refresh list
                        } else {
                            wx.showToast({ title: '取消失败', icon: 'none' });
                        }
                    }).catch(err => {
                        wx.hideLoading();
                        console.error(err);
                        wx.showToast({ title: '网络异常', icon: 'none' });
                    });
                }
            }
        });
    },

    // Input Handlers
    onDepInput: function (e) {
        this.setData({ departure: e.detail.value });
    },

    onSearchInput: function (e) {
        this.setData({ searchQuery: e.detail.value });
    },



    onWeightInput: function (e) {
        this.setData({ itemWeight: e.detail.value });
    },

    onCategoryChange: function (e) {
        this.setData({ categoryIndex: e.detail.value });
    },

    onAgreementChange: function (e) {
        this.setData({ agreed: e.detail });
    },

    // AI Recognition
    onAIRecognize: function () {
        if (!this.data.agreed) {
            wx.showToast({ title: '请先勾选禁带清单', icon: 'none' });
            return;
        }

        wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sizeType: ['compressed'], // 尝试系统压缩
            sourceType: ['album', 'camera'],
            success: async (res) => {
                const file = res.tempFiles[0];
                let filePath = file.tempFilePath;
                const size = file.size;

                console.log(`Original file size: ${(size / 1024).toFixed(2)} KB`);

                // 降低阈值到 50KB：几乎对所有图都进行压缩，防止 weak network timeout
                if (size > 50 * 1024) {
                    wx.showLoading({ title: '正在压缩图片...' });
                    try {
                        const compressedRes = await wx.compressImage({
                            src: filePath,
                            quality: 10 // 更加强力压缩
                        });
                        filePath = compressedRes.tempFilePath;
                        console.log('Compressed filePath:', filePath);
                    } catch (e) {
                        console.error('Compression failed:', e);
                    }
                    wx.hideLoading();
                }

                this.performAIIdentify(filePath);
            }
        })
    },

    performAIIdentify: function (filePath) {
        wx.showLoading({ title: '正在上传及识别...' });

        // 1. 上传图片到云存储
        // 使用 simple-upload 模式，或者只是更短的名字
        const cloudPath = `ai-images/${Date.now()}.jpg`

        wx.cloud.uploadFile({
            cloudPath,
            filePath,
            success: res => {
                const fileID = res.fileID
                console.log('Upload success, fileID:', fileID);
                // 2. 调用云函数识别
                wx.cloud.callFunction({
                    name: 'identifyItem',
                    data: { fileID }
                }).then(res => {
                    wx.hideLoading();
                    console.log('云函数返回结果:', res)
                    const result = res.result;
                    if (result && result.success) {
                        this.mapLabelsToCategory(result);
                    } else {
                        const msg = result && result.error ? result.error : '云函数未返回结果';
                        console.error('AI 识别业务错误:', result);
                        wx.showToast({ title: '识别未能匹配物品', icon: 'none' });
                    }
                }).catch(err => {
                    wx.hideLoading();
                    console.error('云函数调用异常:', err);
                    // 区分超时错误
                    if (err.errMsg && (err.errMsg.includes('timeout') || err.errMsg.includes('time out'))) {
                        wx.showToast({ title: '识别超时，请重试', icon: 'none' });
                    } else {
                        wx.showToast({ title: '识别服务异常', icon: 'none' });
                    }
                });
            },
            fail: err => {
                wx.hideLoading();
                console.error('上传失败', err);
                if (err.errMsg && err.errMsg.includes('timeout')) {
                    wx.showToast({ title: '上传超时，请切换网络或用小图', icon: 'none' });
                } else {
                    wx.showToast({ title: '图片上传失败', icon: 'none' });
                }
            }
        })
    },

    mapLabelsToCategory: function (result) {
        console.log('AI Recognition Result:', result);
        const { itemName, allLabels, riskLevel } = result;

        // 如果风险等级高，弹出警告
        if (riskLevel === 'HIGH_RISK') {
            wx.showModal({
                title: '包含禁止物',
                content: '识别结果显示可能包含违禁或不适宜物品(如武器、成人内容)，请核实。',
                showCancel: false
            });
            // 依然尝试分类，但用户已知晓风险
        }

        // 映射逻辑：将 itemName 或 allLabels 映射到本地品类
        // categories: ['药物', '电器', '特货(含自用书籍)', '普货', '文件']
        // 0: 药物, 1: 电器, 2: 特货, 3: 普货, 4: 文件
        const labelStr = (itemName + ' ' + allLabels.join(' ')).toLowerCase();

        let targetIndex = 3; // 默认普货
        let matchReason = '通用物品';

        // Keywords Definitions
        // Keywords Definitions
        // 1. Electronics (Priority 1)
        const electronicKeywords = [
            'electronic', 'gadget', 'phone', 'mobile', 'cell', 'smart', 'communication', 'telephony',
            'laptop', 'computer', 'notebook', 'macbook', 'pad', 'kindle',
            'battery', 'camera', 'lens',
            'keyboard', 'mouse', 'charger', 'cable', 'adapter', 'plug',
            'monitor', 'screen', 'display', 'glass',
            'device', 'appliance', 'circuit', 'technology', 'hardware',
            'case', 'cover', 'protector', 'accessory', 'bumper',
            'iphone', 'android', 'smartphone', 'telephone', 'cellular',
            // Brands & Features
            'samsung', 'huawei', 'xiaomi', 'oppo', 'vivo', 'pixel', 'oneplus', 'realme', 'honor', 'sony', 'lg', 'nokia', 'motorola',
            'touch', 'wireless', 'portable', 'handheld', 'digital', 'audio', 'video', 'media', 'internet'
        ];

        // 2. Medicine
        // Removed 'tablet' (ambiguous with iPad) and 'capsule' (shape ambiguity)
        const medicineKeywords = ['medicine', 'drug', 'pill', 'health', 'pharmacy', 'bottle', 'vitamin', 'medical', 'prescription', 'supplement', 'medication'];

        // 3. Special Goods
        const specialKeywords = [
            'book', 'publication', 'magazine', 'novel', 'textbook', 'journal',
            'liquid', 'powder', 'serum', 'cosmetic', 'lotion', 'cream', 'fluid', 'makeup', 'perfume', 'lipstick', 'skincare', 'oil', 'gel', 'paste', 'aerosol'
        ];

        // 4. Documents
        const docKeywords = ['document', 'passport', 'visa', 'certificate', 'id', 'license', 'letter', 'envelope', 'paperwork', 'card'];

        // Logic Priority: Electronics -> Medicine -> Docs -> Special -> General
        if (this.checkKeywords(labelStr, electronicKeywords)) {
            targetIndex = 1;
            matchReason = '数码/电器';
        } else if (this.checkKeywords(labelStr, medicineKeywords)) {
            targetIndex = 0;
            matchReason = '药物/保健品';
        } else if (this.checkKeywords(labelStr, docKeywords)) {
            targetIndex = 4;
            matchReason = '文件/证件';
        } else if (this.checkKeywords(labelStr, specialKeywords)) {
            targetIndex = 2;
            matchReason = '特货(书籍/化妆品等)';
        }

        this.setData({
            categoryIndex: targetIndex
        });

        const displayCategory = this.data.categories[targetIndex];

        // DEBUG: 显示实际识别到的 Labels，方便调试
        wx.showModal({
            title: `识别为: ${displayCategory}`,
            content: `关键词匹配: ${matchReason}\n\nAI原始标签:\n${allLabels.join(', ')}`,
            showCancel: false
        });

        console.log(`Matched '${itemName}' (Labels: ${allLabels.join(',')}) to category index ${targetIndex} (${displayCategory}) via reason: ${matchReason}`);
    },

    checkKeywords: function (text, keywords) {
        return keywords.some(k => text.includes(k));
    },

    // Unified Action
    onSearchOrAdd: async function () {
        if (!this.data.agreed) {
            wx.showToast({ title: '请先勾选禁带清单', icon: 'none' });
            return;
        }

        if (!this.data.searchQuery || !this.data.departure) {
            wx.showToast({ title: '请完善出发/收货地址', icon: 'none' });
            return;
        }

        if (this.data.categoryIndex === null) {
            wx.showToast({ title: '请选择物品品类', icon: 'none' });
            return;
        }

        wx.showLoading({ title: '搜索航班中...' });

        const db = wx.cloud.database();
        const dep = this.data.departure.trim();
        const dest = this.data.searchQuery.trim();

        try {
            const res = await db.collection('trips').where({
                route: db.RegExp({
                    regexp: `${dep}.*${dest}|${dest}.*${dep}`,
                    options: 'i',
                })
            }).get();

            wx.hideLoading();
            console.log('Search Results:', res.data);

            if (!res.data || res.data.length === 0) {
                this.setData({
                    filteredFlights: [],
                    showFallback: true
                });
                wx.showToast({ title: '未找到直达航班', icon: 'none' });
            } else {
                const mapped = res.data.map(trip => ({
                    id: trip._id,
                    _openid: trip._openid,
                    flightNo: trip.flightNo,
                    destination: dest,
                    cityCode: 'ARR',
                    date: trip.createTime ? new Date(trip.createTime).toLocaleDateString() : '近期',
                    availableWeight: trip.details && trip.details.weight ? trip.details.weight : '咨询',
                    pricePerKg: '???'
                }));

                this.setData({
                    filteredFlights: mapped,
                    showFallback: false
                });
            }

        } catch (err) {
            wx.hideLoading();
            console.error('Search failed', err);
            wx.showToast({ title: '查询失败', icon: 'none' });
        }
    },

    // Unified Request Action
    onRequestCarry: function (e) {
        const item = e.currentTarget.dataset.item; // need to bind data-item in wxml

        wx.showModal({
            title: '确认预订',
            content: `确定要向航班 ${item.flightNo} 发送带货请求吗？`,
            success: (res) => {
                if (res.confirm) {
                    this.createOrder(item);
                }
            }
        })
    },

    createOrder: function (tripItem) {
        wx.showLoading({ title: '提交请求中...' });

        wx.cloud.callFunction({
            name: 'createOrder',
            data: {
                tripId: tripItem.id, // Database _id
                carrierId: tripItem._openid, // We need to ensure we fetch _openid in search
                flightNo: tripItem.flightNo,
                dep: this.data.departure,
                dest: this.data.searchQuery,
                weight: this.data.itemWeight,
                senderNote: this.data.categories[this.data.categoryIndex] // Use category as note for now
            }
        }).then(res => {
            wx.hideLoading();
            if (res.result && res.result.success) {
                wx.showToast({
                    title: '请求已发送',
                    icon: 'success'
                })
                // Auto switch to My Shipments tab
                this.setData({ activeTab: 1 });
                this.fetchMyOrders();

            } else {
                const errorMsg = res.result.msg || (res.result.error ? res.result.error.errMsg : '未知错误');
                wx.showToast({ title: '失败: ' + errorMsg, icon: 'none', duration: 3000 });
                console.error('Create Order Failed:', res.result);
            }
        }).catch(err => {
            wx.hideLoading();
            console.error(err);
            wx.showToast({ title: '网络异常', icon: 'none' });
        });
    },

    // View Details or Subscribe (Keep as fallback)
    onSubscribeRoute: function () {
        wx.showToast({ title: '订阅成功', icon: 'success' });
    }
});
