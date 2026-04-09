/**
 * 完成登录
 */
import { H3Event } from 'h3';
import { BASE_URL, COMMON_HEADERS } from '~/server/utils/config';
import { rsaEncrypt } from '~/server/utils/crypto';

interface LoginCompleteRequest {
    wx_code: string;
    longitude?: string;
    latitude?: string;
}

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody<LoginCompleteRequest>(event);

    if (!body.wx_code) {
        throw createError({
            statusCode: 400,
            message: "wx_code is required"
        });
    }

    const longitude = body.longitude || "116.397428";
    const latitude = body.latitude || "39.908823";

    try {
        // 1. 获取服务器 token
        const tokenData = await getServerToken(body.wx_code);

        // 2. 执行登录
        const loginData = await login(body.wx_code, tokenData.token, longitude, latitude);

        return {
            success: loginData.code === "0",
            message: loginData.code === "0" ? "登录成功" : loginData.message,
            data: loginData.code === "0" ? loginData : null
        };
    } catch (error: unknown) {
        console.error('登录失败:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : "登录失败",
            data: null
        };
    }
});

async function getServerToken(wechatCode: string): Promise<{ token: string }> {
    const url = `${BASE_URL}/app/platform/serverlist/getLesseeServer`;
    const encryptedBody = rsaEncrypt({ code: wechatCode });

    const response = await $fetch<{
        code: string;
        message?: string;
        token?: string;
    }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });

    if (response.code !== "0") {
        throw new Error(`获取服务器token失败: ${response.message || '未知错误'}`);
    }

    return { token: response.token || "" };
}

async function login(
    wechatCode: string,
    serverToken: string,
    longitude: string,
    latitude: string
): Promise<Record<string, unknown>> {
    const url = `${BASE_URL}/app/platform/login/login`;

    const data = {
        loginWay: "1",
        phoneNumber: "",
        password: "",
        code: wechatCode,
        longitude,
        latitude,
        token: serverToken
    };

    const encryptedBody = rsaEncrypt(data);

    const response = await $fetch<Record<string, unknown>>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });

    if (response.code !== "0") {
        throw new Error(`登录失败: ${response.message || '未知错误'}`);
    }

    return {
        ...response,
        token: serverToken
    } as Record<string, unknown>;
}
