<template>
    <div class="freerun-page">
        <!-- 加载路线数据中 -->
        <VAlert v-if="loadingSunRunPaper"
                type="info"
                variant="tonal"
                class="mb-4">
            <template #prepend>
                <VProgressCircular indeterminate size="20" />
            </template>
            正在加载路线数据...
        </VAlert>

        <!-- 单次自由跑设置 -->
        <FreeRunSetup v-if="currentView === 'setup'"
                      v-model="freeRunParams"
                      @start-run="handleStartRun"
                      @back="handleBack" />

        <!-- 跑步执行 -->
        <FreeRunExecution v-else-if="currentView === 'execution'"
                          :params="freeRunParams"
                          @completed="handleRunCompleted"
                          @error="handleRunError"
                          @back-to-setup="handleBackToSetup" />

        <!-- 错误提示 -->
        <VSnackbar v-model="showError"
                   color="error"
                   :timeout="5000"
                   location="top">
            {{ errorMessage }}
            <template #actions>
                <VBtn variant="text" @click="showError = false">
                    关闭
                </VBtn>
            </template>
        </VSnackbar>

        <!-- 成功提示 -->
        <VSnackbar v-model="showSuccess"
                   color="success"
                   :timeout="3000"
                   location="top">
            {{ successMessage }}
            <template #actions>
                <VBtn variant="text" @click="showSuccess = false">
                    关闭
                </VBtn>
            </template>
        </VSnackbar>
    </div>
</template>

<script setup lang="ts">
    import type { FreeRunParams } from '~/src/types/requestTypes/FreeRunRequest'
    import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper'

    // Page metadata
    definePageMeta({
        title: '自由跑'
    })

    // Composables
    const freeRun = useFreeRun()
    const freeRunConfig = useFreeRunConfig()
    const session = useSession()
    const sunRunPaper = useSunRunPaper()

    // Loading state for sunRunPaper
    const loadingSunRunPaper = ref(false)

    // Reactive data from composables
    const currentView = computed({
        get: () => freeRun.getCurrentView.value,
        set: (value) => freeRun.setCurrentView(value)
    })

    const showError = computed({
        get: () => freeRun.getShowError.value,
        set: (value) => value ? null : freeRun.hideError()
    })

    const showSuccess = computed({
        get: () => freeRun.getShowSuccess.value,
        set: (value) => value ? null : freeRun.hideSuccess()
    })

    const errorMessage = computed(() => freeRun.getErrorMessage.value)
    const successMessage = computed(() => freeRun.getSuccessMessage.value)

    // Form data with defaults from config
    const defaultParams = computed(() => freeRunConfig.getUIConfig.value.defaultParams)

    const freeRunParams = computed({
        get: () => freeRun.getCurrentParams.value || {
            distance: defaultParams.value.distance,
            avgSpeed: defaultParams.value.avgSpeed,
            template: freeRunConfig.getDefaultTemplate.value
        },
        set: (value) => freeRun.setCurrentParams(value)
    })

    // Navigation methods
    const handleBack = () => {
        freeRun.resetRunState()
        navigateTo('/')
    }

    const handleBackToSetup = () => {
        currentView.value = 'setup'
    }

    // Single run methods
    const handleStartRun = (params: FreeRunParams) => {
        freeRun.setCurrentParams(params)
        currentView.value = 'execution'
    }

    const handleRunCompleted = (recordId?: string) => {
        const message = recordId
            ? `跑步完成！记录ID: ${recordId}`
            : '跑步完成！'
        freeRun.showSuccess(message)

        // Update session stats if available
        if (session.value && recordId) {
            const currentStats = session.value.freeRunStats || {
                totalRuns: 0,
                totalDistance: 0,
                totalDuration: 0,
                averageSpeed: 0
            }

            const params = freeRun.getCurrentParams.value
            if (params) {
                currentStats.totalRuns += 1
                currentStats.totalDistance += params.distance
                currentStats.lastRunDate = new Date().toISOString()

                session.value.freeRunStats = currentStats
            }
        }
    }

    const handleRunError = (error: string) => {
        freeRun.showError(error)
    }

    // Check session on mount and restore state
    onMounted(async () => {
        const sessionValue = useSession()
        if (!sessionValue.value?.token) {
            navigateTo('/')
            return
        }

        // Restore free run state from localStorage
        freeRun.restoreState()

        // Load configuration
        freeRunConfig.reloadConfig()

        // Load sunRunPaper data if not already loaded
        // This is needed for getting real routeId and taskId
        if (!sunRunPaper.value?.runPointList?.length) {
            loadingSunRunPaper.value = true
            try {
                const result = await TotoroApiWrapper.getSunRunPaper({
                    token: sessionValue.value.token,
                    campusId: sessionValue.value.campusId,
                    schoolId: sessionValue.value.schoolId,
                    stuNumber: sessionValue.value.stuNumber,
                })
                if (result) {
                    sunRunPaper.value = result
                    console.log('Loaded sunRunPaper data:', result.runPointList?.length, 'routes')
                }
            } catch (error) {
                console.warn('Failed to load sunRunPaper data:', error)
                // Don't block the user, they can still use free run with mock data
            } finally {
                loadingSunRunPaper.value = false
            }
        } else {
            console.log('sunRunPaper data already loaded:', sunRunPaper.value.runPointList?.length, 'routes')
        }
    })
</script>

<style scoped>
    .freerun-page {
        padding: 16px;
    }
</style>