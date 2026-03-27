/**
 * 订单 API - Vercel Serverless Function
 * 接收订单并发送到飞书
 */

export default async function handler(req, res) {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const order = req.body;

        // 格式化订单消息
        const message = `🛒 新订单通知

订单编号：${order.id}
下单时间：${order.time}

客户信息：
姓名：${order.customer.name}
电话：${order.customer.phone}
微信：${order.customer.wechat || '未填写'}
地址：${order.customer.address}

商品明细：
${order.items.map(item => `• ${item.name} x${item.quantity} = ¥${item.price * item.quantity}`).join('\n')}

总计：¥${order.total}
备注：${order.note || '无'}`;

        // 发送到飞书
        // 使用飞书开放平台 API 发送消息
        const feishuResponse = await sendToFeishu(message, order);

        res.status(200).json({ 
            success: true, 
            orderId: order.id,
            message: '订单已发送到飞书' 
        });

    } catch (error) {
        console.error('订单处理失败:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

/**
 * 发送消息到飞书
 */
async function sendToFeishu(message, order) {
    // 飞书应用凭证
    const APP_ID = 'cli_a93adf343678dbd6';
    const APP_SECRET = 'WZEbU8D4L9zpPgZFWwv0NhemJjcF70dK';
    
    // 接收消息的用户 ID（从 MEMORY.md 获取）
    const USER_ID = 'ou_cb8c29619f1bde2460822ae719500327';

    // 1. 获取 tenant_access_token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: APP_ID,
            app_secret: APP_SECRET
        })
    });

    const tokenData = await tokenRes.json();
    
    if (tokenData.code !== 0) {
        throw new Error(`获取 Token 失败: ${tokenData.msg}`);
    }

    const token = tokenData.tenant_access_token;

    // 2. 发送消息到用户
    const sendRes = await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            receive_id: USER_ID,
            msg_type: 'text',
            content: JSON.stringify({ text: message })
        })
    });

    const sendData = await sendRes.json();
    
    if (sendData.code !== 0) {
        throw new Error(`发送消息失败: ${sendData.msg}`);
    }

    return sendData;
}
