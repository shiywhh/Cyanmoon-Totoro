export default interface MorningExercisesRequest {
    stuNumber: string;     // 学号
    phoneNumber: string;   // 手机号
    qrCode: string;        // 二维码数据
    headImage: string;     // 头像/人脸图片
    baseStation: string;   // 基站信息
    longitude: string;     // 经度
    latitude: string;      // 纬度
    phoneInfo: string;     // 手机信息
    mac: string;           // MAC地址
    taskId: string;        // 任务ID
    pointId: string;       // 签到点ID
    appVersion: string;    // APP版本
    signType: string;      // 签到类型
    token: string;         // 登录令牌
}