/**
 * 轮询扫码状态
 */
import { H3Event } from 'h3';
import { WECHAT_HEADERS } from '~/server/utils/config';

export default defineEventHandler(async (event: H3Event) => {
    const uuid = getRouterParam(event, 'uuid');

    if (!uuid) {
        throw createError({
            statusCode: 400,
            message: "UUID is required"
        });
    }

    const pollUrl = `https://long.open.weixin.qq.com/connect/l/qrconnect?uuid=${uuid}&f=json`;

    try {
        const data = await $fetch<{
            wx_errcode: number;
            wx_code?: string;
        }>(pollUrl, {
            headers: WECHAT_HEADERS as Record<string, string>,
        });

        const wxErrcode = data.wx_errcode || 408;
        const wxCode = data.wx_code || "";

        const statusMessages: Record<number, string> = {
            408: "等待扫码",
            404: "已扫码，请在手机上确认",
            405: "授权成功",
            403: "用户取消授权",
            402: "二维码已过期"
        };

        const message = statusMessages[wxErrcode] || `未知状态: ${wxErrcode}`;

        return {
            status: wxErrcode,
            message,
            wx_code: wxCode || null
        };
    } catch (error: unknown) {
        console.error('轮询失败:', error);
        return {
            status: 408,
            message: `请求错误: ${error instanceof Error ? error.message : '未知错误'}`,
            wx_code: null
        };
    }
});
