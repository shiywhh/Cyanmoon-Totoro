/**
 * 批量跑步
 */
import { H3Event } from 'h3';
import { BASE_URL, COMMON_HEADERS } from '~/server/utils/config';
import { rsaEncrypt } from '~/server/utils/crypto';
import { RunTask, generateRunData } from '~/server/utils/runDataGenerator';

interface BulkRunRequest {
    token: string;
    stu_number: string;
    school_id: string;
    campus_id: string;
    campus_name: string;
    count: number;
}

export default defineEventHandler(async (event: H3Event) => {
    const body = await readBody<BulkRunRequest>(event);

    if (body.count <= 0) {
        return {
            success: false,
            message: "跑步次数必须大于0",
            total_submitted: 0,
            results: []
        };
    }

    try {
        // 1. 获取任务信息
        const task = await getSunRunTask(body.token, body.stu_number, body.school_id, body.campus_id);

        if (!task.isSuccess) {
            return {
                success: false,
                message: `获取任务失败: ${task.message}`,
                total_submitted: 0,
                results: []
            };
        }

        // 2. 获取已有跑步记录
        const recordsResult = await getSunRunSport(body.token, body.stu_number, body.school_id, body.campus_id);
        const existingDays = new Set<string>();

        if (recordsResult.code === "0") {
            for (const record of recordsResult.runList || []) {
                const day = record.day;
                if (day && task.data.start_date <= day && day <= task.data.end_date) {
                    existingDays.add(day);
                }
            }
        }

        // 3. 生成可用日期列表
        const startDate = new Date(task.data.start_date + 'T00:00:00');
        const endDate = new Date(task.data.end_date + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const actualEndDate = endDate < today ? endDate : today;

        if (actualEndDate < startDate) {
            return {
                success: false,
                message: "任务日期范围内没有可补跑的日期",
                total_submitted: 0,
                results: []
            };
        }

        const allDates: string[] = [];
        const currentDate = new Date(startDate);
        while (currentDate <= actualEndDate) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            if (!existingDays.has(dateStr)) {
                allDates.push(dateStr);
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 4. 解析时间范围
        let startHour = 6, startMin = 0, endHour = 22, endMin = 0;
        try {
            if (task.data.start_time) {
                const [h, m] = task.data.start_time.split(':').map(Number);
                startHour = h;
                startMin = m;
            }
            if (task.data.end_time) {
                const [h, m] = task.data.end_time.split(':').map(Number);
                endHour = h;
                endMin = m;
            }
        } catch {
            // 使用默认值
        }

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // 5. 随机选择日期并提交
        const countToSubmit = Math.min(body.count, allDates.length);

        if (countToSubmit <= 0) {
            return {
                success: false,
                message: "没有可用的日期进行跑步（所有日期已有记录或日期范围已过）",
                total_submitted: 0,
                results: []
            };
        }

        // 打乱并选择日期
        const selectedDates = allDates.sort(() => Math.random() - 0.5).slice(0, countToSubmit);
        selectedDates.sort();

        const results: Array<{
            date: string;
            time: string;
            success: boolean;
            message: string;
            km?: string;
            usedTime?: string;
        }> = [];

        let successCount = 0;

        for (const runDate of selectedDates) {
            // 生成随机时间
            const timeRangeMinutes = Math.max(30, endMinutes - startMinutes - 45);
            const randomMinutes = startMinutes + Math.floor(Math.random() * timeRangeMinutes);
            const runHour = Math.floor(randomMinutes / 60);
            const runMin = randomMinutes % 60;
            const runSec = Math.floor(Math.random() * 60);
            const runTime = `${runHour.toString().padStart(2, '0')}:${runMin.toString().padStart(2, '0')}:${runSec.toString().padStart(2, '0')}`;

            try {
                // 开始跑步
                const startResult = await startRun(body.token, body.stu_number, body.school_id, body.campus_id);

                if (startResult.code !== "0") {
                    results.push({
                        date: runDate,
                        time: runTime,
                        success: false,
                        message: `开始跑步失败: ${startResult.message || ''}`
                    });
                    continue;
                }

                // 生成并提交跑步数据
                const runData = generateRunData({
                    task: task.data,
                    stuNumber: body.stu_number,
                    token: body.token,
                    campusName: body.campus_name,
                    runDate,
                    runTime
                });

                const pointList = runData._pointList as Array<{ longitude: string; latitude: string }>;
                const selectedPoint = runData._selectedPoint as string;
                delete runData._pointList;
                delete runData._selectedPoint;

                // 提交基础记录
                const result1 = await submitRunRecord(runData);

                if (result1.code !== "0") {
                    results.push({
                        date: runDate,
                        time: runTime,
                        success: false,
                        message: result1.message || '提交失败'
                    });
                    continue;
                }

                const scantronId = result1.scantronId || "";

                // 提交轨迹详情
                await submitRunDetail(scantronId, body.stu_number, body.token, pointList);

                successCount++;
                results.push({
                    date: runDate,
                    time: runTime,
                    success: true,
                    message: "提交成功",
                    km: runData.km as string,
                    usedTime: runData.usedTime as string
                });
            } catch (error: unknown) {
                results.push({
                    date: runDate,
                    time: runTime,
                    success: false,
                    message: error instanceof Error ? error.message : '未知错误'
                });
            }
        }

        return {
            success: successCount > 0,
            message: `成功提交 ${successCount}/${countToSubmit} 次跑步记录`,
            total_submitted: successCount,
            results
        };
    } catch (error: unknown) {
        console.error('批量跑步失败:', error);
        throw createError({
            statusCode: 500,
            message: `批量跑步失败: ${error instanceof Error ? error.message : '未知错误'}`
        });
    }
});

async function getSunRunTask(
    token: string,
    stuNumber: string,
    schoolId: string,
    campusId: string
): Promise<{ isSuccess: boolean; message: string; data: RunTask }> {
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
            run_point_list: []
        }
    };
}

async function getSunRunSport(
    token: string,
    stuNumber: string,
    schoolId: string,
    campusId: string
): Promise<{
    code: string;
    message?: string;
    runList?: Array<{ day: string; status: string; runTime: string; usedTime: string; mileage: string }>;
}> {
    const url = `${BASE_URL}/app/sunrun/getSunrunSport`;
    const data = { stuNumber, runType: "0", monthId: "", pageNumber: "1", rowNumber: "200" };
    const encryptedBody = rsaEncrypt({ ...data, token, schoolId, campusId });

    return await $fetch<{
        code: string;
        message?: string;
        runList?: Array<{ day: string; status: string; runTime: string; usedTime: string; mileage: string }>;
    }>(url, {
        method: 'POST',
        headers: COMMON_HEADERS as Record<string, string>,
        body: encryptedBody
    });
}

async function startRun(
    token: string,
    stuNumber: string,
    schoolId: string,
    campusId: string
): Promise<{ code: string; message?: string }> {
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
