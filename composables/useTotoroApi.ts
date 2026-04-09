/**
 * Totoro API 封装
 * 调用 Nuxt Nitro 服务端路由
 */
const API_BASE = '/api';

interface SubmitRunOptions {
    km?: number;
    usedTimeMinutes?: number;
    pointIndex?: number;
    runDate?: string;
    runTime?: string;
}

interface RunRecord {
    day: string;
    status: string;
    runTime: string;
    usedTime: string;
    mileage: string;
}

interface TaskInfo {
    startDate: string;
    endDate: string;
    mileage: string;
}

interface SubmitRunResponse {
    success: boolean;
    message: string;
    scantron_id?: string;
    data?: {
        km: string;
        usedTime: string;
        avgSpeed?: string;
        steps?: string;
        selectedPoint?: string;
        trackPoints?: number;
        scantronId?: string;
    };
}

interface GetRecordsResponse {
    success: boolean;
    message: string;
    total: number;
    records: RunRecord[];
    task_info?: TaskInfo;
}

interface BulkRunResult {
    date: string;
    time: string;
    success: boolean;
    message: string;
    km?: string;
    usedTime?: string;
}

interface BulkRunResponse {
    success: boolean;
    message: string;
    total_submitted: number;
    results: BulkRunResult[];
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
    });
    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    return response.json() as Promise<T>;
}

export const useTotoroApi = () => {
    const session = useSession();

    const getAuthData = () => ({
        token: session.value?.token || '',
        stuNumber: session.value?.stuNumber || '',
        schoolId: session.value?.schoolId || '',
        campusId: session.value?.campusId || '',
        campusName: session.value?.campusName || '',
    });

    /**
     * 提交跑步记录
     */
    const submitRun = async (options: SubmitRunOptions = {}): Promise<SubmitRunResponse> => {
        const authData = getAuthData();
        const body: Record<string, unknown> = {
            token: authData.token,
            stu_number: authData.stuNumber,
            school_id: authData.schoolId,
            campus_id: authData.campusId,
            campus_name: authData.campusName,
        };

        if (options.km !== undefined) body.km = options.km;
        if (options.usedTimeMinutes !== undefined) body.used_time_minutes = options.usedTimeMinutes;
        if (options.pointIndex !== undefined) body.point_index = options.pointIndex;
        if (options.runDate) body.run_date = options.runDate;
        if (options.runTime) body.run_time = options.runTime;

        return request<SubmitRunResponse>('/sunrun/submit', {
            method: 'POST',
            body: JSON.stringify(body),
        });
    };

    /**
     * 获取跑步记录
     */
    const getRunRecords = async (options: {
        runType?: string;
        monthId?: string;
        pageNumber?: string;
        rowNumber?: string;
    } = {}): Promise<GetRecordsResponse> => {
        const authData = getAuthData();
        return request<GetRecordsResponse>('/sunrun/records', {
            method: 'POST',
            body: JSON.stringify({
                token: authData.token,
                stu_number: authData.stuNumber,
                school_id: authData.schoolId,
                campus_id: authData.campusId,
                run_type: options.runType || '0',
                month_id: options.monthId || '',
                page_number: options.pageNumber || '1',
                row_number: options.rowNumber || '100',
            }),
        });
    };

    /**
     * 批量跑步 - 一键跑完
     */
    const bulkRun = async (count: number): Promise<BulkRunResponse> => {
        const authData = getAuthData();
        return request<BulkRunResponse>('/sunrun/bulk', {
            method: 'POST',
            body: JSON.stringify({
                token: authData.token,
                stu_number: authData.stuNumber,
                school_id: authData.schoolId,
                campus_id: authData.campusId,
                campus_name: authData.campusName,
                count,
            }),
        });
    };

    return {
        submitRun,
        getRunRecords,
        bulkRun,
    };
};
