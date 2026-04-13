<script setup lang="ts">
    import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper';

    const sunrunPaper = useSunRunPaper();
    const session = useSession();
    const selectValue = ref('');
    const router = useRouter();

    // 在 setup 顶层获取数据
    const data = ref<any>(null);

    const fetchData = async () => {
        try {
            const result = await TotoroApiWrapper.getSunRunPaper({
                token: session.value.token,
                campusId: session.value.campusId,
                schoolId: session.value.schoolId,
                stuNumber: session.value.stuNumber,
            });
            data.value = result;
            sunrunPaper.value = result;
        } catch (e) {
            console.error('获取阳光跑数据失败:', e);
            clearSession();
            router.push('/');
        }
    };

    // 只有在客户端才执行数据获取
    if (import.meta.client) {
        await fetchData();
    }

    const handleUpdate = (target: string) => {
        selectValue.value = target;
    };

    const handleRandom = () => {
        if (data.value?.runPointList) {
            const randomIndex = Math.floor(Math.random() * data.value.runPointList.length);
            selectValue.value = data.value.runPointList[randomIndex].pointId;
        }
    };

    // 格式化日期显示
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return dateStr.replace(/-/g, '/');
    };

    const goBack = () => {
        router.push('/');
    };
</script>

<template>
    <div class="centered-container">
        <div class="header-section">
            <h2 class="text-h5 font-weight-bold mb-2">阳光跑</h2>
            <p class="text-body-2 text-medium-emphasis">请选择跑步路线并提交</p>
        </div>

        <!-- 修改：将个人信息和任务概览放在同一行 -->
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

            <div class="info-card task-overview" v-if="data">
                <p class="text-subtitle-2 mb-3">概览</p>
                <VTable density="compact" class="mb-0">
                    <tbody>
                        <tr>
                            <td>目标公里</td>
                            <td class="font-weight-medium">{{ data.mileage }} 公里</td>
                        </tr>
                        <tr>
                            <td>今日状态</td>
                            <td :class="data.ifHasRun === '1' ? 'text-success' : 'text-warning'">
                                {{ data.ifHasRun === '1' ? '已跑' : '未跑' }}
                            </td>
                        </tr>
                        <tr>
                            <td>单次时长(分)</td>
                            <td>{{ data.minTime }} - {{ data.maxTime }}</td>
                        </tr>
                        <tr>
                            <td>有效时段</td>
                            <td>{{ data.startTime }} - {{ data.endTime }}</td>
                        </tr>
                        <tr>
                            <td>起止日期</td>
                            <td>{{ formatDate(data.startDate) }} - {{ formatDate(data.endDate) }}</td>
                        </tr>
                    </tbody>
                </VTable>
            </div>
        </div>

        <template v-if="data">
            <p class="text-subtitle-2 mb-3">选择路线</p>
            <div class="route-buttons-container">
                <div class="route-buttons-grid">
                    <VBtn v-for="route in data.runPointList"
                          :key="route.pointId"
                          :color="selectValue === route.pointId ? 'primary' : 'default'"
                          :variant="selectValue === route.pointId ? 'flat' : 'outlined'"
                          class="route-button"
                          @click="selectValue = route.pointId">
                        {{ route.pointName }}
                    </VBtn>
                </div>
            </div>

            <div class="flex gap-4">
                <VBtn variant="outlined"
                      prepend-icon="i-mdi-arrow-left"
                      @click="goBack">
                    返回首页
                </VBtn>

                <VBtn variant="outlined"
                      color="primary"
                      append-icon="i-mdi-gesture"
                      @click="handleRandom">
                    随机路线
                </VBtn>

                <NuxtLink v-if="selectValue" :to="`/run/${encodeURIComponent(selectValue)}`">
                    <VBtn class="ml-auto" color="primary" append-icon="i-mdi-arrow-right">
                        开始跑步
                    </VBtn>
                </NuxtLink>
                <VBtn v-else class="ml-auto" color="primary" append-icon="i-mdi-arrow-right" disabled>
                    开始跑步
                </VBtn>
            </div>

            <div class="flex gap-4 mt-4">
                <VBtn color="primary"
                      append-icon="i-mdi-run-fast"
                      :to="{ path: '/sunrun-records' }">
                    批量补跑
                </VBtn>
            </div>
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
        max-width: 900px;
        margin: 0 auto;
    }

    .header-section {
        text-align: center;
        margin-bottom: 32px;
    }

    /* 修改：新增信息容器，用于并排显示两个卡片 */
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

    .personal-info {
        /* 可以根据需要调整样式 */
    }

    .task-overview {
        /* 可以根据需要调整样式 */
    }

    .route-buttons-container {
        width: 100%;
        max-width: 800px;
    }

    .route-buttons-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 10px;
        margin-bottom: 20px;
    }

    .route-button {
        min-height: 36px;
        transition: all 0.2s ease;
    }

        .route-button:hover {
            transform: translateY(-2px);
        }

    /* 响应式调整 */
    @media (max-width: 600px) {
        .route-buttons-grid {
            grid-template-columns: repeat(2, 1fr);
        }

        .flex.gap-4.mt-6 {
            flex-wrap: wrap;
            gap: 12px !important;
        }

            .flex.gap-4.mt-6 .ml-auto {
                margin-left: 0 !important;
                width: 100%;
            }
    }

    @media (max-width: 400px) {
        .route-buttons-grid {
            grid-template-columns: 1fr;
        }

        .flex.gap-4.mt-6 > * {
            width: 100%;
        }
    }
</style>