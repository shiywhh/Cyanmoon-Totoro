/**
 * 获取微信登录二维码
 */
import { H3Event } from 'h3';
import { BASE_URL, WECHAT_APPID, WECHAT_BUNDLE_ID, WECHAT_HEADERS } from '~/server/utils/config';

export default defineEventHandler(async (event: H3Event) => {
    const url = `https://open.weixin.qq.com/connect/app/qrconnect?appid=${WECHAT_APPID}&bundleid=${WECHAT_BUNDLE_ID}&scope=snsapi_userinfo&state=`;

    try {
        const response = await $fetch<string>(url, {
            headers: WECHAT_HEADERS as Record<string, string>,
        });

        // 从 HTML 中提取 uuid
        const uuidMatch = response.match(/uuid\s*=\s*["']([^"']+)["']/) ||
            response.match(/\/qrcode\/([a-zA-Z0-9_-]+)/);

        if (!uuidMatch) {
            throw createError({
                statusCode: 500,
                message: "无法从页面中提取 UUID"
            });
        }

        const uuid = uuidMatch[1];
        const qrcodeUrl = `https://open.weixin.qq.com/connect/qrcode/${uuid}`;

        return {
            qrcode_url: qrcodeUrl,
            uuid
        };
    } catch (error: unknown) {
        console.error('获取二维码失败:', error);
        throw createError({
            statusCode: 500,
            message: `获取二维码失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
    }
});
