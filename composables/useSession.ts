const SESSION_KEY = 'totoro_session';

export const useSession = () => useState<Record<string, any>>('totoroSession');

// Token 失效错误码
export const TOKEN_ERROR_CODES = ['401', '403', '1', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'AUTH_FAILED'];

export interface TokenError {
    code: string;
    message: string;
    isTokenError: true;
}

/**
 * 检测是否为 token 失效错误
 */
export function isTokenErrorResponse(data: any): data is TokenError {
    if (!data || typeof data !== 'object') return false;

    // 检查 code 字段
    if (data.code && TOKEN_ERROR_CODES.includes(String(data.code))) {
        return true;
    }

    // 检查 message 中是否包含 token 相关关键词
    const msg = data.message || '';
    if (/token|登录|认证|授权|expired|失效/i.test(msg)) {
        return true;
    }

    return false;
}

/**
 * 清除 session 并跳转到首页
 */
export const useClearSession = () => {
    const session = useSession();
    const router = useRouter();

    return (options: { showExpiredMessage?: boolean } = {}) => {
        session.value = null;

        // 清除 freeRun 持久化状态
        if (process.client) {
            localStorage.removeItem('freeRunState');
        }

        // 跳转到首页，可选择显示 token 过期消息
        if (options.showExpiredMessage) {
            router.push('/?reason=token_expired');
        } else {
            router.push('/');
        }
    };
};
