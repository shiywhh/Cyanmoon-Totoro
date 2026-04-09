import type BaseResponse from "./BaseResponse";

export default interface GetMornSignPaperResponse extends BaseResponse {
    code: string;
    message: string;
    startDate: string;         // 开始日期
    startTime: string;         // 开始时间
    endDate: string;           // 结束日期
    endTime: string;           // 结束时间
    dayNeedSignCount: string;  // 当日需签到次数
    dayCompSignCount: string;  // 当日已签到次数
    minTimeInterval: string;   // 最小间隔时间
    offsetRange: string;       // 偏移范围（米）
    qrCode: string;            // 二维码
    signType: string;          // 签到类型
    signPointList: [             // 签到点列表
        {
            taskId: string;
            pointId: string;
            pointName: string;
            longitude: string;
            latitude: string;
            qrCode: string;
        }
    ]
}