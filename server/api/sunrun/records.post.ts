/**
 * 获取跑步记录
 */
import { H3Event } from 'h3';
import { BASE_URL, COMMON_HEADERS } from '~/server/utils/config';
import { rsaEncrypt } from '~/server/utils/crypto';
import { RunTask } from '~/server/utils/runDataGenerator';

interface RecordsRequest {
    token: string;
    stu_number: string;
    school_id?: string;
    campus_id?: string;
    run_type?: string;
    month_id?: string;
    page_number?: string;
    row_number?: string;
}

interface RunRecord {
    day: string;
    status: string;
    runTime: string;
    usedTime: string;
    mileage: string;
}

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody<RecordsRequest>(event);

    try {
        // 获取跑步记录
        const recordsResult = await getSunRunSport(
            body.token,
            body.stu_number,
            body.school_id || "",
            body.campus_id || "",
            body.run_type || "0",
            body.month_id || "",
            body.page_number || "1",
            body.row_number || "100"
        );

        if (recordsResult.code !== "0") {
            return {
                success: false,
                message: recordsResult.message || "获取失败",
                total: 0,
                records: [],
                task_info: null
            };
        }

        const records: RunRecord[] = recordsResult.runList || [];
        let taskInfo: { startDate: string; endDate: string; mileage: string } | null = null;

        // 获取任务信息用于过滤
        if (body.school_id && body.campus_id) {
            try {
                const task = await getSunRunTask(
                    body.token,
                    body.stu_number,
                    body.school_id,
                    body.campus_id
                );

                if (task.isSuccess) {
                    taskInfo = {
                        startDate: task.data.start_date,
                        endDate: task.data.end_date,
                        mileage: task.data.mileage
                    };

                    // 过滤日期范围
                    const filtered = records.filter(record => {
                        const day = record.day;
                        if (!day || !task.data.start_date || !task.data.end_date) return true;
                        return task.data.start_date <= day && day <= task.data.end_date;
                    });

                    return {
                        success: true,
                        message: "获取成功",
                        total: filtered.length,
                        records: filtered,
                        task_info: taskInfo
                    };
                }
            } catch {
                // 忽略错误
            }
        }

        return {
            success: true,
            message: "获取成功",
            total: records.length,
            records,
            task_info: taskInfo
        };
    } catch (error: unknown) {
        console.error('获取记录失败:', error);
        return {
            success: false,
            message: `获取记录失败: ${error instanceof Error ? error.message : '未知错误'}`,
            total: 0,
            records: [],
            task_info: null
        };
    }
});

async function getSunRunSport(
    token: string,
    stuNumber: string,
    schoolId: string,
    campusId: string,
    runType: string = "0",
    monthId: string = "",
    pageNumber: string = "1",
    rowNumber: string = "100"
): Promise<{
    code: string;
    message?: string;
    runList?: RunRecord[];
}> {
    const url = `${BASE_URL}/app/sunrun/getSunrunSport`;
    const data = { stuNumber, runType, monthId, pageNumber, rowNumber };
    const encryptedBody = rsaEncrypt({ ...data, token, schoolId, campusId });

    return await $fetch<{ code: string; message?: string; runList?: RunRecord[] }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });
}

async function getSunRunTask(
    token: string,
    stuNumber: string,
    schoolId: string,
    campusId: string
): Promise<{ isSuccess: boolean; data: RunTask }> {
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
    }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });

    return {
        isSuccess: response.code === "0",
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
            run_point_list: []
        }
    };
}
