export default interface GetMornSignPaperRequest {
    stuNumber: string;     // 学号
    phoneNumber: string;   // 手机号
    schoolId: string;      // 学校ID
    campusId: string;      // 校区ID
    token: string;         // 登录令牌
}