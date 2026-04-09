/**
 * RSA 加密模块
 * 用于龙猫 API 请求体加密
 */
import crypto from 'crypto';

// RSA 公钥
const RSA_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDU/j+c5FdkEwhSIF9jmw+050iN
0/yfjhk/669RyFiG5wu0Adpk3NR2Ikbo2lA+rTBJBx1bpGVGCvMKKQ/pljNUSmJt
JaM5ieONFrZD6RhSUbjrNENH89Ks9GGWi+1dkOfdSHNujQilF5oLOIHez1HYmwml
ADA29Ux4yb8e4+PtLQIDAQAB
-----END PUBLIC KEY-----`;

// RSA 密钥长度和分段大小
const RSA_BLOCK_SIZE = 117; // 1024位密钥最大加密 117 字节

export function rsaEncrypt(data: Record<string, unknown>): string {
    // 将字典转为 JSON 字符串，再转为字节
    const jsonStr = JSON.stringify(data);
    const dataBytes = Buffer.from(jsonStr, 'utf-8');

    const publicKey = crypto.createPublicKey(RSA_PUBLIC_KEY_PEM);

    // 分段加密
    const encryptedChunks: Buffer[] = [];
    let offset = 0;

    while (offset < dataBytes.length) {
        const chunk = dataBytes.slice(offset, offset + RSA_BLOCK_SIZE);
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            chunk
        );
        encryptedChunks.push(encrypted);
        offset += RSA_BLOCK_SIZE;
    }

    // 合并所有加密分段并 Base64 编码
    return Buffer.concat(encryptedChunks).toString('base64');
}
