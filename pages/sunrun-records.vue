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

        <!-- 进度条 -->
        <div v-if="taskInfo" class="progress-section">
            <v-progress-linear
                :model-value="(uniqueRecords.length / 36) * 100"
                color="primary"
                height="10"
                rounded
            />
        </div>

        <!-- 操作按钮 -->
        <div class="d-flex gap-4 flex-wrap">
            <VBtn variant="outlined" prepend-icon="i-mdi-arrow-left" to="/sunrun">
                返回
            </VBtn>
            <VBtn
                v-if="remainingCount > 0"
                color="primary"
                :loading="bulkRunning"
                :disabled="bulkRunning"
                @click="handleBulkRun"
                class="flex-grow-1"
            >
                <VIcon icon="i-mdi-run-fast" class="mr-2" />
                一键跑完 {{ remainingCount }} 次
            </VBtn>

            <VAlert v-else type="success" variant="tonal" class="flex-grow-1">
                <VIcon icon="i-mdi-check-circle" class="mr-1" />
                已完成本周期所有跑步任务
            </VAlert>
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

        <!-- 批量跑步结果 -->
        <VCard v-if="bulkResults.length > 0" class="result-card">
            <VCardTitle>批量跑步结果</VCardTitle>
            <VCardText>
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
            </VCardText>
        </VCard>

        <!-- 已完成记录 -->
        <div v-if="uniqueRecords.length > 0" class="records-section">
            <p class="text-subtitle-2 mb-3">已完成记录 ({{ uniqueRecords.length }})</p>
            <div class="records-grid">
                <div
                    v-for="(record, index) in uniqueRecords"
                    :key="index"
                    class="record-item"
                >
                    <span class="record-day">{{ record.day }}</span>
                    <v-chip
                        :color="record.status === '1' ? 'success' : 'warning'"
                        size="x-small"
                    >
                        {{ record.status === '1' ? '有效' : '待审核' }}
                    </v-chip>
                    <span class="record-info">{{ record.mileage }}km</span>
                </div>
            </div>
        </div>
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

    const remainingCount = computed(() => 36 - uniqueRecords.value.length);

    const bulkSuccessCount = computed(() =>
        bulkResults.value.filter((r) => r.success).length
    );

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
        } catch (error) {
            console.error('获取记录失败:', error);
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
            `确定要一键补跑 ${remainingCount.value} 次吗？\n这将在任务日期范围内随机选择未跑的日期进行提交。`
        );
        if (!confirmed) return;

        bulkRunning.value = true;
        bulkResults.value = [];

        try {
            const result = await totoroApi.bulkRun(remainingCount.value);
            bulkResults.value = result.results || [];

            if (result.success) {
                await fetchRecords();
            } else {
                showSnackbar(result.message, 'error');
            }
        } catch (error) {
            console.error('批量跑步失败:', error);
            showSnackbar('批量跑步失败', 'error');
        } finally {
            bulkRunning.value = false;
        }
    };

    // 返回
    const goBack = () => {
        router.push('/sunrun');
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

    .progress-section {
        width: 100%;
        max-width: 500px;
        margin-bottom: 24px;
    }

    .action-section {
        width: 100%;
        max-width: 400px;
        margin-bottom: 24px;
    }

    .result-card {
        width: 100%;
        margin-bottom: 24px;
    }

    .bulk-results {
        max-height: 200px;
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

    .records-section {
        width: 100%;
        margin-bottom: 24px;
    }

    .records-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
        max-height: 300px;
        overflow-y: auto;
    }

    .record-item {
        background: rgb(var(--v-theme-surface));
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .record-day {
        font-weight: 500;
        font-size: 0.9rem;
    }

    .record-info {
        font-size: 0.8rem;
        color: rgba(0, 0, 0, 0.6);
    }

    @media (max-width: 600px) {
        .flex.gap-4.mt-6 {
            flex-wrap: wrap;
            gap: 12px !important;
        }

        .flex.gap-4.mt-6 > * {
            width: 100%;
        }
    }
</style>
