<template>
    <div class="centered-container">
        <div class="header-section">
            <h2 class="text-h5 font-weight-bold mb-2">批量补跑</h2>
            <p class="text-body-2 text-medium-emphasis">一键补齐本周期未跑的跑步记录</p>
        </div>

        <!-- 个人信息和任务概览 -->
        <div class="info-container">
            <div class="info-card personal-info">
                <p class="text-subtitle-2 mb-3">个人信息</p>
                <VTable density="compact" class="mb-0">
                    <tbody>
                        <tr>
                            <td>学校</td>
                            <td>{{ session.campusName }}</td>
                        </tr>
                        <tr>
                            <td>学院</td>
                            <td>{{ session.collegeName }}</td>
                        </tr>
                        <tr>
                            <td>学号</td>
                            <td>{{ session.stuNumber }}</td>
                        </tr>
                        <tr>
                            <td>姓名</td>
                            <td>{{ session.stuName }}</td>
                        </tr>
                    </tbody>
                </VTable>
            </div>

            <div class="info-card task-overview" v-if="taskInfo">
                <p class="text-subtitle-2 mb-3">任务概览</p>
                <VTable density="compact" class="mb-0">
                    <tbody>
                        <tr>
                            <td>任务周期</td>
                            <td>{{ taskInfo.startDate }} ~ {{ taskInfo.endDate }}</td>
                        </tr>
                        <tr>
                            <td>已完成</td>
                            <td class="font-weight-medium">{{ uniqueRecords.length }} / 36 次</td>
                        </tr>
                        <tr>
                            <td>剩余</td>
                            <td :class="remainingCount > 0 ? 'text-warning' : 'text-success'">
                                {{ remainingCount }} 次
                            </td>
                        </tr>
                    </tbody>
                </VTable>
            </div>

            <div class="info-card task-overview" v-else-if="recordsLoading">
                <div class="d-flex justify-center align-center py-4">
                    <VProgressCircular indeterminate size="24" />
                    <span class="ml-2">加载中...</span>
                </div>
            </div>
        </div>

        <!-- 主内容区域：左侧控制 + 右侧日历 -->
        <div class="main-content">
            <!-- 左侧控制区域 -->
            <div class="controls-section">
                <div class="control-item">
                    <p class="text-subtitle-2 mb-2">补跑次数</p>
                    <VTextField
                        v-model.number="runCount"
                        type="number"
                        :min="1"
                        :max="remainingCount"
                        label="次数"
                        density="compact"
                        variant="outlined"
                        :disabled="bulkRunning || remainingCount <= 0"
                    />
                </div>

                <div class="controls-buttons">
                    <VBtn variant="outlined" prepend-icon="i-mdi-arrow-left" to="/sunrun" block>
                        返回
                    </VBtn>
                    <VBtn
                        v-if="remainingCount > 0"
                        color="primary"
                        :loading="bulkRunning"
                        :disabled="bulkRunning || runCount <= 0"
                        @click="handleBulkRun"
                        block
                    >
                        <VIcon icon="i-mdi-run-fast" class="mr-2" />
                        一键跑完 {{ runCount }} 次
                    </VBtn>

                                        <VAlert v-else color="success" variant="tonal" class="d-flex align-center justify-center">
                        <VIcon icon="i-mdi-check-circle" class="mr-1" />
                        已完成本周期所有跑步任务
                    </VAlert>
                </div>
            </div>

            <!-- 右侧日历 -->
            <div class="calendar-section">
                <p class="text-subtitle-2 mb-3">已完成记录 ({{ uniqueRecords.length }})</p>
                <div class="calendar-container">
                    <div class="calendar-header">
                        <VBtn icon="i-mdi-chevron-left" variant="text" size="small" @click="prevMonth" :disabled="!canPrevMonth" />
                        <span class="calendar-title">{{ currentYear }}年{{ currentMonth + 1 }}月</span>
                        <VBtn icon="i-mdi-chevron-right" variant="text" size="small" @click="nextMonth" :disabled="!canNextMonth" />
                    </div>
                    <div class="calendar-weekdays">
                        <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">{{ day }}</span>
                    </div>
                    <div class="calendar-days">
                        <div
                            v-for="(day, index) in calendarDays"
                            :key="index"
                            class="calendar-day"
                            :class="{
                                'has-record': day.hasRecord,
                                'no-record': day.hasNoRecord,
                                'other-month': day.isOtherMonth,
                                'future-day': day.isFuture
                            }"
                        >
                            <span class="day-number">{{ day.dayNumber }}</span>
                            <span v-if="day.hasRecord" class="record-label">已打卡</span>
                            <span v-else-if="day.hasNoRecord" class="no-record-label">未打卡</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 确认对话框 -->
        <v-dialog v-model="confirmDialog.isShow" max-width="400">
            <v-card>
                <v-card-title class="text-h6">{{ confirmDialog.title }}</v-card-title>
                <v-card-text>{{ confirmDialog.message }}</v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn variant="text" @click="confirmDialog.isShow = false">取消</v-btn>
                    <v-btn color="primary" variant="flat" @click="handleConfirm">确定</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>

        <!-- 提示框（顶部） -->
        <v-snackbar v-model="snackbar.isShow" :color="snackbar.color" timeout="3000" location="top">
            {{ snackbar.text }}
            <template #actions>
                <v-btn variant="text" @click="snackbar.isShow = false">关闭</v-btn>
            </template>
        </v-snackbar>

        <!-- 批量跑步结果对话框 -->
        <v-dialog v-model="resultsDialog.isShow" max-width="500" scrollable>
            <v-card>
                <v-card-title class="d-flex align-center">
                    <VIcon icon="i-mdi-run-fast" class="mr-2" />
                    批量跑步结果
                </v-card-title>
                <v-card-text>
                    <VAlert
                        :type="bulkSuccessCount === bulkResults.length ? 'success' : 'warning'"
                        variant="tonal"
                        class="mb-3"
                    >
                        成功 {{ bulkSuccessCount }} / {{ bulkResults.length }} 次
                    </VAlert>
                    <div class="bulk-results">
                        <div
                            v-for="(result, idx) in bulkResults"
                            :key="idx"
                            class="result-item"
                        >
                            <VIcon
                                :icon="result.success ? 'i-mdi-check-circle' : 'i-mdi-close-circle'"
                                :color="result.success ? 'success' : 'error'"
                                size="small"
                            />
                            <span class="result-date">{{ result.date }} {{ result.time }}</span>
                            <span class="result-detail">
                                {{ result.success ? `${result.km}km ${result.usedTime}` : result.message }}
                            </span>
                        </div>
                    </div>
                </v-card-text>
                <v-card-actions>
                    <v-spacer />
                    <v-btn color="primary" variant="flat" @click="resultsDialog.isShow = false">关闭</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </div>
</template>

<script setup lang="ts">
    const router = useRouter();
    const session = useSession();
    const totoroApi = useTotoroApi();

    // 状态
    const records = ref<Array<{
        day: string;
        status: string;
        runTime: string;
        usedTime: string;
        mileage: string;
    }>>([]);
    const recordsLoading = ref(false);
    const taskInfo = ref<{
        startDate: string;
        endDate: string;
        mileage: string;
    } | null>(null);

    const bulkRunning = ref(false);
    const bulkResults = ref<Array<{
        date: string;
        time: string;
        success: boolean;
        message: string;
        km?: string;
        usedTime?: string;
    }>>([]);

    // 补跑次数
    const runCount = ref(0);

    // 监听 records 变化，更新 runCount 默认值
    watch(records, () => {
        const remaining = 36 - uniqueRecords.value.length;
        const remainingVal = Math.max(0, remaining);
        if (runCount.value === 0 || runCount.value > remainingVal) {
            runCount.value = remainingVal;
        }
    }, { immediate: true, deep: true });

    // 确认对话框
    const confirmDialog = ref({
        isShow: false,
        title: '',
        message: '',
        onConfirm: null as (() => void) | null
    });

    // 提示框
    const snackbar = ref({
        isShow: false,
        text: '',
        color: 'error'
    });

    // 结果对话框
    const resultsDialog = ref({
        isShow: false
    });

    // 日历相关
    const currentDate = ref(new Date());
    const currentYear = computed(() => currentDate.value.getFullYear());
    const currentMonth = computed(() => currentDate.value.getMonth());

    const showSnackbar = (text: string, color: string = 'error') => {
        snackbar.value = { isShow: true, text, color };
    };

    const handleConfirm = () => {
        confirmDialog.value.isShow = false;
        if (confirmDialog.value.onConfirm) {
            confirmDialog.value.onConfirm();
        }
    };

    const showConfirm = (title: string, message: string): Promise<boolean> => {
        return new Promise((resolve) => {
            confirmDialog.value = {
                isShow: true,
                title,
                message,
                onConfirm: () => resolve(true)
            };
        });
    };

    // 计算属性
    const uniqueRecords = computed(() => {
        const seen = new Set<string>();
        return records.value.filter((record) => {
            if (seen.has(record.day)) return false;
            seen.add(record.day);
            return true;
        });
    });

    const remainingCount = computed(() => {
        const remaining = 36 - uniqueRecords.value.length;
        return Math.max(0, remaining);
    });

    const bulkSuccessCount = computed(() =>
        bulkResults.value.filter((r) => r.success).length
    );

    // 日历相关计算
    const calendarDays = computed(() => {
        const year = currentYear.value;
        const month = currentMonth.value;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startWeekday = firstDay.getDay();
        const daysInMonth = lastDay.getDate();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskStart = taskInfo.value ? new Date(taskInfo.value.startDate) : null;
        const taskEnd = taskInfo.value ? new Date(taskInfo.value.endDate) : null;

        const days: Array<{
            dayNumber: number;
            hasRecord: boolean;
            hasNoRecord: boolean;
            isOtherMonth: boolean;
            isFuture: boolean;
            dateStr: string;
        }> = [];

        // 上月的日子
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startWeekday - 1; i >= 0; i--) {
            days.push({
                dayNumber: prevMonthLastDay - i,
                hasRecord: false,
                hasNoRecord: false,
                isOtherMonth: true,
                isFuture: false,
                dateStr: ''
            });
        }

        // 本月的日子
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const hasRecord = uniqueRecords.value.some(r => r.day === dateStr);

            // 判断是否在任务周期内且在今天或之前，且未打卡
            let hasNoRecord = false;
            let isFuture = date > today || (taskEnd ? date > taskEnd : false);

            if (!hasRecord && !isFuture && taskStart && taskEnd) {
                // 在任务周期内，且在今天或之前，且未打卡
                if (date >= taskStart && date <= taskEnd && date <= today) {
                    hasNoRecord = true;
                }
            }

            days.push({
                dayNumber: d,
                hasRecord,
                hasNoRecord,
                isOtherMonth: false,
                isFuture
            });
        }

        // 下月的日子
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            days.push({
                dayNumber: i,
                hasRecord: false,
                hasNoRecord: false,
                isOtherMonth: true,
                isFuture: false,
                dateStr: ''
            });
        }

        return days;
    });

    const canPrevMonth = computed(() => {
        if (!taskInfo.value) return true;
        const taskStart = new Date(taskInfo.value.startDate);
        const firstOfMonth = new Date(currentYear.value, currentMonth.value, 1);
        return firstOfMonth > taskStart;
    });

    const canNextMonth = computed(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstOfNextMonth = new Date(currentYear.value, currentMonth.value + 1, 1);
        return firstOfNextMonth <= today;
    });

    const prevMonth = () => {
        if (!canPrevMonth.value) return;
        currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
    };

    const nextMonth = () => {
        if (!canNextMonth.value) return;
        currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
    };

    // 检查登录
    onMounted(async () => {
        if (!session.value?.token) {
            router.push('/');
            return;
        }

        await fetchRecords();
    });

    // 获取记录
    const fetchRecords = async () => {
        recordsLoading.value = true;
        try {
            const result = await totoroApi.getRunRecords();
            if (result.success) {
                records.value = result.records || [];
                taskInfo.value = result.task_info || null;
            }
        } catch (error: any) {
            console.error('获取记录失败:', error);
            // Token 失效，清除 session 并跳转回首页
            if (error?.message?.includes('401') || error?.code === 'INVALID_TOKEN') {
                clearSession();
                router.push('/');
                return;
            }
        } finally {
            recordsLoading.value = false;
        }
    };

    // 批量跑步
    const handleBulkRun = async () => {
        if (remainingCount.value <= 0) {
            showSnackbar('已完成36次跑步，无需补跑！', 'warning');
            return;
        }

        const confirmed = await showConfirm(
            '确认批量补跑',
            `确定要一键补跑 ${runCount.value} 次吗？\n将在任务日期范围内选择未跑的日期进行提交。`
        );
        if (!confirmed) return;

        bulkRunning.value = true;
        bulkResults.value = [];

        try {
            const result = await totoroApi.bulkRun(runCount.value);
            bulkResults.value = result.results || [];

            if (result.success) {
                await fetchRecords();
            }

            // 显示结果对话框
            resultsDialog.value.isShow = true;
        } catch (error) {
            console.error('批量跑步失败:', error);
            showSnackbar('批量跑步失败', 'error');
        } finally {
            bulkRunning.value = false;
        }
    };
</script>

<style scoped>
    .centered-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        max-width: 900px;
        margin: 0 auto;
    }

    .header-section {
        text-align: center;
        margin-bottom: 32px;
    }

    .info-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        width: 100%;
        margin-bottom: 24px;
    }

    @media (max-width: 768px) {
        .info-container {
            grid-template-columns: 1fr;
            gap: 16px;
        }
    }

    .info-card {
        background: rgb(var(--v-theme-surface));
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        height: 100%;
    }

    .main-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        width: 100%;
        margin-bottom: 24px;
    }

    .controls-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .control-item {
        width: 100%;
    }

    .controls-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .calendar-section {
        min-width: 0;
    }

    .calendar-container {
        background: rgb(var(--v-theme-surface));
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .calendar-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-bottom: 16px;
    }

    .calendar-title {
        font-weight: 500;
        font-size: 1rem;
    }

    .calendar-weekdays {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
        font-size: 0.75rem;
        color: rgba(0, 0, 0, 0.6);
        margin-bottom: 8px;
    }

    .calendar-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
    }

    .calendar-day {
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        font-size: 0.875rem;
        min-height: 40px;
    }

    .calendar-day.has-record {
        background-color: rgba(25, 118, 210, 0.1);
    }

    .calendar-day.no-record {
        background-color: rgba(255, 152, 0, 0.15);
    }

    .calendar-day.other-month {
        color: rgba(0, 0, 0, 0.3);
    }

    .calendar-day.future-day {
        color: rgba(0, 0, 0, 0.3);
    }

    .day-number {
        font-weight: 500;
    }

    .record-label {
        font-size: 0.625rem;
        color: #1976d2;
        margin-top: 2px;
    }

    .no-record-label {
        font-size: 0.625rem;
        color: #ff9800;
        margin-top: 2px;
    }

    .bulk-results {
        max-height: 300px;
        overflow-y: auto;
    }

    .result-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
    }

    .result-date {
        font-weight: 500;
    }

    .result-detail {
        color: rgba(0, 0, 0, 0.6);
        font-size: 0.875rem;
    }

    @media (max-width: 768px) {
        .main-content {
            grid-template-columns: 1fr;
        }
    }
</style>
