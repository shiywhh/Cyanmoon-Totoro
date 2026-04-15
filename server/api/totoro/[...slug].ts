export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  // console.log(body);

  // let headers = event.node.req.headers;
  // headers.referer = undefined;
  // headers['x-forwarded-for'] = undefined;
  // headers['x-forwarded-host'] = undefined;
  // headers['x-forwarded-proto'] = undefined;
  // headers['x-forwarded-port'] = undefined;
  // headers.origin = undefined;
  // headers['sec-ch-ua-mobile'] = undefined;
  // headers['sec-ch-ua'] = undefined;
  // headers['sec-ch-ua-platform'] = undefined;
  // headers['sec-fetch-dest'] = undefined;
  // headers['sec-fetch-mode'] = undefined;
  // headers['sec-fetch-site'] = undefined;
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    // "Content-Length": "0",
    Host: 'app.xtotoro.com',
    Connection: 'keep-alive',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'TotoroSchool/1.2.14 (iPhone; iOS 17.4.1; Scale/3.00)',
    Cookie: event.node.req.headers.cookie,
    Accept: 'application/json',
    // 'sec-fetch-mode': undefined,
  };
  const path = event.path.replace('/api/totoro/', '/app/');
  // event.context.params.slug to get the route segment: 'bar/baz'

  try {
    const response = await fetch(`https://app.xtotoro.com${path}`, {
      method: 'post',
      headers: { ...(headers as HeadersInit) },
      body,
    });

    // 获取响应文本
    const responseText = await response.text();

    // 尝试解析 JSON
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      // 如果不是 JSON，直接返回文本
      return responseText;
    }

    // 检测 token 失效错误
    if (data) {
      const code = String(data.code || '');
      const msg = String(data.message || '').toLowerCase();

      // 龙猫 API 的 token 失效特征
      const isTokenError =
        code === '401' ||
        code === '403' ||
        code === '-1' ||
        code === '1' ||
        code === '1001' ||
        /token|登录|认证|授权|expired|失效|session/i.test(msg);

      if (isTokenError) {
        // 返回带有明确错误标记的响应
        return {
          code: 'TOKEN_EXPIRED',
          message: data.message || '登录已过期，请重新扫码',
          isTokenError: true,
          originalCode: code,
        };
      }
    }

    return data;
  } catch (error: any) {
    // 网络错误等
    throw createError({
      statusCode: 500,
      message: error.message || '请求失败',
    });
  }
});
