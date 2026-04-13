<script setup lang="ts">
    import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper';
    import type { GetMornSignPaperResponse } from '~/src/types/responseTypes/GetMornSignPaperResponse';
    import { useRouter } from 'vue-router';

    const router = useRouter();
    const session = useSession();
    const selectValue = ref('');
    const data = ref<GetMornSignPaperResponse | null>(null);
    const isLoading = ref(true);
    const error = ref<string | null>(null);

    // 计算是否已完成今日签到
    const isSignCompleted = computed(() => {
        if (!data.value) return false;
        return data.value.dayCompSignCount >= data.value.dayNeedSignCount;
    });

    // 获取今日状态文本
    const todayStatus = computed(() => {
        if (!data.value) return '加载中...';
        if (isSignCompleted.value) return '已签到';
        return '未签到';
    });

    // 获取有效时段文本
    const timeRange = computed(() => {
        if (!data.value) return '加载中...';
        return `${data.value.startTime || '06:00'} - ${data.value.endTime || '08:30'}`;
    });

    // 获取起止日期文本
    const dateRange = computed(() => {
        if (!data.value) return '加载中...';
        const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            return dateStr.replace(/-/g, '/');
        };
        return `${formatDate(data.value.startDate || '2025/09/08')} - ${formatDate(data.value.endDate || '2026/01/09')}`;
    });

    // 添加 snackbar 相关状态
    const snackbar = ref(false);
    const snackbarMessage = ref('');
    const snackbarColor = ref<'success' | 'error' | 'warning'>('success');

    // 显示提示消息
    const showMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        snackbarMessage.value = message;
        snackbarColor.value = type;
        snackbar.value = true;
    };

    // 返回首页
    const goBack = () => {
        router.push('/');
    };

    // 格式化日期时间
    const formatDateTime = (dateTime: string) => {
        if (!dateTime) return '-';
        try {
            const date = new Date(dateTime);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateTime;
        }
    };

    // 获取早操签到页面数据
    const fetchMorningData = async () => {
        try {
            isLoading.value = true;
            error.value = null;
            const response = await TotoroApiWrapper.getMornSignPaper({
                token: session.value.token,
                campusId: session.value.campusId,
                schoolId: session.value.schoolId,
                stuNumber: session.value.stuNumber,
                phoneNumber: session.value.phoneNumber || '',
            });

            // API 返回 code 为 "0" 表示成功
            if (response.code === '0' || response.status === '00') {
                data.value = response;
            } else {
                error.value = response.message || '获取早操签到数据失败';
                showMessage(response.message || '获取早操签到数据失败', 'error');
            }
        } catch (err: any) {
            console.error('获取早操签到数据失败:', err);
            // Token 失效，清除 session 并跳转回首页
            if (err?.message?.includes('401') || err?.code === 'INVALID_TOKEN') {
                clearSession();
                router.push('/');
                return;
            }
            error.value = err.message || '获取早操签到数据失败,请稍后重试';
            showMessage('获取早操签到数据失败,请稍后重试', 'error');
        } finally {
            isLoading.value = false;
        }
    };

    // 提交早操签到
    const handleSubmit = async () => {
        if (!selectValue.value) {
            showMessage('请选择签到地点', 'warning');
            return;
        }

        if (!data.value) {
            showMessage('签到数据异常,请刷新页面', 'error');
            return;
        }

        try {
            // 找到选中的签到点
            const selectedPoint = data.value.signPointList?.find(
                point => point.pointId === selectValue.value
            );

            if (!selectedPoint) {
                showMessage('未找到选中的签到点', 'error');
                return;
            }

            // 构造早上8点的时间戳（伪造为签到时间范围内）
            const now = new Date();
            const fakeTime = new Date(now);
            fakeTime.setHours(8, 0, 0, 0); // 设置为早上8:00:00
            const taskDate = fakeTime.toISOString().split('T')[0]; // YYYY-MM-DD 格式

            // 构造请求参数
            const requestParams = {
                token: session.value.token,
                campusId: session.value.campusId,
                schoolId: session.value.schoolId,
                stuNumber: session.value.stuNumber,
                phoneNumber: session.value.phoneNumber || '',
                endTime: taskDate,
                taskId: selectedPoint.taskId || '',
                pointId: selectValue.value,
                runType: '1', // 早操类型
                qrCode: selectedPoint.qrCode || data.value.qrCode || '',
                headImage: '',
                baseStation: '',
                longitude: selectedPoint.longitude || '',
                latitude: selectedPoint.latitude || '',
                phoneInfo: navigator.userAgent || '',
                mac: '',
                appVersion: '1.2.14',
                signType: data.value.signType || '2',
            };

            // 显示加载中的消息
            showMessage('正在提交签到...', 'success');

            // 第一次请求（通常返回500）
            try {
                await TotoroApiWrapper.morningExercises(requestParams);
            } catch (firstError) {
                console.log('第一次请求失败（预期行为）:', firstError);
            }

            // 等待一小段时间
            await new Promise(resolve => setTimeout(resolve, 500));

            // 第二次请求（通常返回200）
            const response = await TotoroApiWrapper.morningExercises(requestParams);

            // API 返回 code 为 "0" 表示成功
            if (response.code === '0') {
                showMessage('早操签到成功!', 'success');
                // 刷新页面数据
                await fetchMorningData();
                selectValue.value = '';
            } else {
                showMessage(response.message || '早操签到失败！', 'error');
            }
        } catch (err: any) {
            console.error('早操签到失败:', err);
            showMessage('签到失败,请稍后重试', 'error');
        }
    };

    // 随机选择地点
    const handleRandom = () => {
        if (data.value?.signPointList && data.value.signPointList.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.value.signPointList.length);
            selectValue.value = data.value.signPointList[randomIndex].pointId;
            showMessage('已随机选择一个签到地点', 'success');
        } else {
            showMessage('暂无可用签到地点', 'warning');
        }
    };

    // 页面加载时获取数据
    onMounted(() => {
        fetchMorningData();
    });
</script>

<template>
    <div class="centered-container">
        <!-- Snackbar 提示组件 -->
        <VSnackbar v-model="snackbar" :color="snackbarColor" :timeout="3000" location="top">
            <div class="d-flex align-center">
                <VIcon v-if="snackbarColor === 'success'" icon="i-mdi-check-circle" class="mr-2" />
                <VIcon v-if="snackbarColor === 'error'" icon="i-mdi-alert-circle" class="mr-2" />
                <VIcon v-if="snackbarColor === 'warning'" icon="i-mdi-alert" class="mr-2" />
                {{ snackbarMessage }}
            </div>
            <template v-slot:actions>
                <VBtn icon variant="text" @click="snackbar = false">
                    <VIcon icon="i-mdi-close" />
                </VBtn>
            </template>
        </VSnackbar>

        <div class="header-section">
            <h2 class="text-h5 font-weight-bold mb-2">早操签到</h2>
            <p class="text-body-2 text-medium-emphasis">请选择签到地点并提交</p>
            <p class="text-body-2 text-medium-emphasis">由于技术限制，需要在规定时间段进行签到才可成功</p>
        </div>

        <!-- 个人信息和概览容器 -->
        <div class="info-overview-container">
            <!-- 个人信息框 -->
            <div class="info-card">
                <p class="text-subtitle-2 mb-3">个人信息</p>
                <VTable density="compact" class="mb-4">
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

            <!-- 概览框 -->
            <div class="overview-card">
                <p class="text-subtitle-2 mb-3">概览</p>
                <VTable density="compact" class="mb-4">
                    <tbody>
                        <tr>
                            <td class="overview-label">今日状态</td>
                            <td>{{ todayStatus }}</td>
                        </tr>
                        <tr>
                            <td class="overview-label">有效时段</td>
                            <td>{{ timeRange }}</td>
                        </tr>
                        <tr>
                            <td class="overview-label">起止日期</td>
                            <td>{{ dateRange }}</td>
                        </tr>
                    </tbody>
                </VTable>
            </div>
        </div>

        <!-- 加载状态 -->
        <template v-if="isLoading">
            <div class="loading-container">
                <VProgressCircular indeterminate color="primary" />
                <p class="mt-4">正在加载早操签到数据...</p>
            </div>
        </template>

        <!-- 错误状态 -->
        <template v-else-if="error">
            <div class="error-container">
                <VIcon icon="i-mdi-alert-circle-outline" size="64" color="error" />
                <p class="mt-4 text-error">{{ error }}</p>
                <VBtn color="primary" class="mt-4" @click="fetchMorningData">
                    重试
                </VBtn>
            </div>
        </template>

        <!-- 签到地点选择 -->
        <template v-else-if="data">
            <!-- 签到统计信息 -->
            <div class="stats-card" v-if="data.dayNeedSignCount">
                <div class="stat-item">
                    <span class="stat-label">今日需签到</span>
                    <span class="stat-value">{{ data.dayNeedSignCount }}次</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">已完成</span>
                    <span class="stat-value" :class="{'primary': !isSignCompleted, 'success': isSignCompleted}">
                        {{ data.dayCompSignCount || 0 }}次
                    </span>
                </div>
            </div>

            <!-- 已完成签到状态 -->
            <template v-if="isSignCompleted">
                <div class="completed-container">
                    <div class="completed-content">
                        <VIcon icon="i-mdi-check-circle" size="64" color="success" />
                        <h3 class="mt-4 text-h6 font-weight-bold">今日已完成签到</h3>
                        <VBtn class="mt-6" prepend-icon="i-mdi-arrow-left" @click="goBack">
                            返回首页
                        </VBtn>
                    </div>
                </div>
            </template>

            <!-- 未完成签到状态 -->
            <template v-else>
                <div class="sign-points-container" v-if="data.signPointList && data.signPointList.length > 0">
                    <p class="text-subtitle-2 mb-3">选择签到地点</p>

                    <div class="points-grid">
                        <VBtn v-for="point in data.signPointList"
                              :key="point.pointId"
                              :color="selectValue === point.pointId ? 'primary' : 'default'"
                              :variant="selectValue === point.pointId ? 'flat' : 'outlined'"
                              size="small"
                              class="point-button"
                              @click="selectValue = point.pointId">
                            <div class="point-button-content">
                                <span class="point-name">{{ point.pointName }}</span>
                                <span v-if="point.distance" class="point-distance">
                                    {{ point.distance }}m
                                </span>
                            </div>
                        </VBtn>
                    </div>

                    <!-- 操作按钮 -->
                    <div class="action-buttons-container">
                        <div class="action-buttons mt-6">
                            <VBtn variant="outlined"
                                  prepend-icon="i-mdi-arrow-left"
                                  @click="goBack">
                                返回首页
                            </VBtn>

                            <VBtn variant="outlined"
                                  color="primary"
                                  prepend-icon="i-mdi-dice-5"
                                  @click="handleRandom">
                                随机选择
                            </VBtn>

                            <VBtn color="primary"
                                  prepend-icon="i-mdi-check-circle"
                                  :disabled="!selectValue"
                                  @click="handleSubmit">
                                提交签到
                            </VBtn>
                        </div>
                    </div>
                </div>

                <template v-else>
                    <div class="no-points-container">
                        <VIcon icon="i-mdi-map-marker-off" size="48" color="grey-lighten-1" />
                        <p class="mt-4 text-grey">暂无可用签到地点</p>
                        <VBtn variant="outlined"
                              class="mt-4"
                              prepend-icon="i-mdi-arrow-left"
                              @click="goBack">
                            返回首页
                        </VBtn>
                    </div>
                </template>
            </template>
        </template>
    </div>
</template>

<style scoped>
    .centered-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
        position: relative;
    }

    .back-button {
        position: absolute;
        top: 0;
        left: 0;
        margin: 16px;
    }

    .header-section {
        text-align: center;
        margin-bottom: 32px;
        margin-top: 40px; /* 为返回按钮留出空间 */
    }

    /* 个人信息和概览容器 */
    .info-overview-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        width: 100%;
        margin-bottom: 24px;
    }

    @media (max-width: 768px) {
        .info-overview-container {
            grid-template-columns: 1fr;
            gap: 16px;
        }
    }

    .info-card,
    .overview-card {
        background: rgb(var(--v-theme-surface));
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .overview-label {
        min-width: 80px;
        color: rgba(var(--v-theme-on-surface), 0.7);
        font-size: 0.875rem;
    }

    .stats-card {
        width: 100%;
        background: rgb(var(--v-theme-surface));
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 24px;
        display: flex;
        justify-content: space-around;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .stat-label {
        font-size: 0.875rem;
        color: rgba(var(--v-theme-on-surface), 0.6);
    }

    .stat-value {
        font-size: 1.5rem;
        font-weight: 600;
    }

    .stat-value.primary {
        color: rgb(var(--v-theme-primary));
    }

    .stat-value.success {
        color: rgb(var(--v-theme-success));
    }

    .completed-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        background: rgb(var(--v-theme-surface));
        border-radius: 12px;
        margin-bottom: 24px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .completed-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }

    .loading-container,
    .error-container,
    .no-points-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
    }

    .sign-points-container {
        width: 100%;
    }

    .points-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
    }

    @media (max-width: 600px) {
        .points-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    @media (max-width: 400px) {
        .points-grid {
            grid-template-columns: 1fr;
        }
    }

    .point-button {
        min-height: 60px;
        transition: all 0.2s ease;
    }

    .point-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .point-button-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .point-name {
        font-weight: 500;
        font-size: 0.875rem;
    }

    .point-distance {
        font-size: 0.75rem;
        opacity: 0.7;
    }

    .action-buttons-container {
        display: flex;
        justify-content: center;
        width: 100%;
    }

    .action-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }

    @media (max-width: 600px) {
        .action-buttons {
            flex-direction: column;
            width: 100%;
            max-width: 300px;
        }

        .action-buttons .v-btn {
            width: 100%;
        }
    }

    @media (min-width: 601px) {
        .action-buttons {
            flex-wrap: nowrap;
        }
    }

    .sign-history {
        width: 100%;
    }

    .history-table {
        background: rgb(var(--v-theme-surface));
        border-radius: 8px;
        overflow: hidden;
    }

    .history-table th {
        background: rgb(var(--v-theme-surface-variant));
        font-weight: 600;
    }

    .history-table td {
        padding: 8px 16px;
    }
</style>