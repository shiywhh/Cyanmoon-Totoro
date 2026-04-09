/**
 * 提交跑步记录
 */
import { H3Event } from 'h3';
import { BASE_URL, COMMON_HEADERS } from '~/server/utils/config';
import { rsaEncrypt } from '~/server/utils/crypto';
import { RunTask, generateRunData } from '~/server/utils/runDataGenerator';

interface SubmitRunRequest {
    token: string;
    stu_number: string;
    school_id: string;
    campus_id: string;
    campus_name: string;
    km?: number;
    used_time_minutes?: number;
    point_index?: number;
    run_date?: string;
    run_time?: string;
}

interface RunPointResponse {
    taskId: string;
    pointId: string;
    pointName: string;
    longitude: string;
    latitude: string;
    pointList: Array<{ longitude: string; latitude: string }>;
}

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody<SubmitRunRequest>(event);

    // 验证日期不能为未来
    if (body.run_date) {
        const runDate = new Date(body.run_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (runDate > today) {
            body.run_date = today.toISOString().split('T')[0];
        }
    }

    try {
        // 1. 获取任务
        const task = await getSunRunTask(body.token, body.stu_number, body.school_id, body.campus_id);

        if (!task.isSuccess) {
            return {
                success: false,
                message: `获取任务失败: ${task.message}`,
                scantron_id: null,
                data: null
            };
        }

        // 2. 开始跑步
        const startResult = await startRun(body.token, body.stu_number, body.school_id, body.campus_id);

        if (startResult.code !== "0") {
            return {
                success: false,
                message: `开始跑步失败: ${startResult.message || ''}`,
                scantron_id: null,
                data: null
            };
        }

        // 3. 提交跑步记录
        const runData = generateRunData({
            task: task.data,
            stuNumber: body.stu_number,
            token: body.token,
            campusName: body.campus_name,
            km: body.km,
            usedTimeMinutes: body.used_time_minutes,
            pointIndex: body.point_index,
            runDate: body.run_date,
            runTime: body.run_time
        });

        const pointList = runData._pointList as Array<{ longitude: string; latitude: string }>;
        const selectedPoint = runData._selectedPoint as string;
        delete runData._pointList;
        delete runData._selectedPoint;

        // 提交基础记录
        const result1 = await submitRunRecord(runData);

        if (result1.code !== "0") {
            return {
                success: false,
                message: `提交基础记录失败: ${result1.message || ''}`,
                scantron_id: null,
                data: {
                    km: runData.km,
                    usedTime: runData.usedTime,
                    selectedPoint,
                    trackPoints: pointList.length
                }
            };
        }

        const scantronId = result1.scantronId || "";

        // 提交轨迹详情
        const result2 = await submitRunDetail(
            scantronId,
            body.stu_number,
            body.token,
            pointList
        );

        return {
            success: true,
            message: "跑步记录提交成功",
            scantron_id: scantronId,
            data: {
                km: runData.km,
                usedTime: runData.usedTime,
                avgSpeed: runData.avgSpeed,
                steps: runData.steps,
                selectedPoint,
                trackPoints: pointList.length,
                scantronId
            }
        };
    } catch (error: unknown) {
        console.error('提交跑步记录失败:', error);
        throw createError({
            statusCode: 500,
            message: `提交跑步记录失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
    }
});

async function getSunRunTask(token: string, stuNumber: string, schoolId: string, campusId: string): Promise<{
    isSuccess: boolean;
    message: string;
    data: RunTask;
}> {
    const url = `${BASE_URL}/app/sunrun/getSunrunPaper`;
    const data = { stuNumber, schoolId, campusId };
    const encryptedBody = rsaEncrypt({ ...data, token });

    const response = await $fetch<{
        code: string;
        message?: string;
        startDate?: string;
        startTime?: string;
        endDate?: string;
        endTime?: string;
        mileage?: string;
        minTime?: string;
        maxTime?: string;
        minSpeed?: string;
        maxSpeed?: string;
        runPointList?: RunPointResponse[];
    }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });

    const runPointList = (response.runPointList || []).map(p => ({
        task_id: p.taskId || "",
        point_id: p.pointId || "",
        point_name: p.pointName || "",
        longitude: p.longitude || "",
        latitude: p.latitude || "",
        point_list: p.pointList || []
    }));

    return {
        isSuccess: response.code === "0",
        message: response.message || "",
        data: {
            code: response.code || "",
            message: response.message || "",
            start_date: response.startDate || "",
            start_time: response.startTime || "",
            end_date: response.endDate || "",
            end_time: response.endTime || "",
            mileage: response.mileage || "",
            min_time: response.minTime || "",
            max_time: response.maxTime || "",
            min_speed: response.minSpeed || "",
            max_speed: response.maxSpeed || "",
            run_point_list: runPointList
        }
    };
}

async function startRun(token: string, stuNumber: string, schoolId: string, campusId: string): Promise<{
    code: string;
    message?: string;
}> {
    const url = `${BASE_URL}/app/sunrun/getRunBegin`;
    const data = { stuNumber, schoolId, campusId };
    const encryptedBody = rsaEncrypt({ ...data, token });

    return await $fetch<{ code: string; message?: string }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });
}

async function submitRunRecord(runData: Record<string, unknown>): Promise<{
    code: string;
    message?: string;
    scantronId?: string;
}> {
    const url = `${BASE_URL}/app/platform/recrecord/sunRunExercises`;
    const encryptedBody = rsaEncrypt(runData);

    return await $fetch<{ code: string; message?: string; scantronId?: string }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });
}

async function submitRunDetail(
    scantronId: string,
    stuNumber: string,
    token: string,
    pointList: Array<{ longitude: string; latitude: string }>
): Promise<{ code: string; message?: string }> {
    const url = `${BASE_URL}/app/platform/recrecord/sunRunExercisesDetail`;
    const data = {
        scantronId,
        stuNumber,
        faceData: "",
        pointList,
        token
    };

    return await $fetch<{ code: string; message?: string }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: JSON.stringify(data)
    });
}
