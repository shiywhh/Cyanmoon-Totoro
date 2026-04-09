<script setup lang="ts">
    import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper';

    const router = useRouter();
    const session = useSession();
    const message = ref('');
    const scanning = ref(false);
    const timer = ref<NodeJS.Timeout | null>(null);
    const countdown = ref(120); // 2分钟倒计时
    const countdownTimer = ref<NodeJS.Timeout | null>(null);
    const showCountdown = ref(false);
    const isScanned = ref(false); // 标记是否已扫码成功
    const scannedCode = ref<string | null>(null); // 存储扫码获取的code
    const isRunning = ref(false); // 标记阳光跑是否在执行中

    // 二维码相关数据
    const qrData = ref<{ uuid: string; imgUrl: string } | null>(null);
    const qrLoading = ref(false); // 二维码加载状态
    const qrError = ref(false); // 二维码加载错误

    // 检查是否已经有会话
    const checkExistingSession = () => {
        if (session.value?.token && session.value?.code) {
            // 已经有会话，直接跳转到选择页面或功能页面
            return true;
        }
        return false;
    };

    // 清除会话
    const clearSession = () => {
        // 根据你的useSession实现方式，可能需要使用不同的清除方法
        session.value = null;

        // 如果是pinia存储的会话，可能需要调用reset方法
        // 或者使用专门的logout方法
        try {
            // 尝试不同的清除方法
            if (typeof session.reset === 'function') {
                session.reset();
            }
        } catch (e) {
            console.log('使用默认方式清除会话');
        }

        // 重置其他状态
        isScanned.value = false;
        scannedCode.value = null;
        qrData.value = null;
        qrLoading.value = false;
        qrError.value = false;
        message.value = '';
    };

    // 页面初始化
    onMounted(async () => {
        // 检查是否已经有有效会话
        if (checkExistingSession()) {
            console.log('已有会话，无需重新扫码');
            isScanned.value = true;
            return;
        }

        // 没有会话，初始化二维码
        await initQrCode();
    });

    // 初始化二维码
    const initQrCode = async () => {
        try {
            // 清除之前的定时器
            stopDetection();

            // 重置状态
            qrData.value = null;
            scanning.value = false;
            showCountdown.value = false;
            isScanned.value = false;
            scannedCode.value = null;
            qrLoading.value = true;
            qrError.value = false;

            // 获取新的二维码
            const { data: fetchData, error } = await useFetch<{ uuid: string; imgUrl: string }>('/api/scanQr');

            if (error.value) {
                console.error('获取二维码失败:', error.value);
                qrError.value = true;
                message.value = '二维码加载失败，请刷新重试';
                return;
            }

            // 监听数据变化
            watch(fetchData, (newData) => {
                qrLoading.value = false;

                if (newData) {
                    qrData.value = newData;
                    message.value = '';
                    if (!scanning.value && !isScanned.value) {
                        startScanDetection();
                    }
                } else {
                    qrError.value = true;
                    message.value = '未获取到二维码数据';
                }
            }, { immediate: true });

        } catch (error) {
            console.error('初始化二维码失败:', error);
            qrError.value = true;
            qrLoading.value = false;
            message.value = '二维码加载失败';
        }
    };

    // 获取二维码状态文本
    const getQrStatusText = () => {
        if (qrLoading.value) {
            return '二维码加载中...';
        }

        if (qrError.value) {
            return '加载失败，请刷新';
        }

        if (!qrData.value) {
            return '等待生成二维码...';
        }

        if (!qrData.value.imgUrl) {
            return '二维码生成失败';
        }

        if (isScanned.value) {
            return '扫码成功';
        }

        if (message.value && (message.value.includes('过期') || message.value.includes('失败'))) {
            return message.value;
        }

        return '请使用微信扫描二维码';
    };

    // 在setup顶部随机选择一首诗，只执行一次
    const selectedPoem = ref<string[]>([]);

    // 页面加载时初始化诗句
    onMounted(() => {
        if (poem && poem.length > 0) {
            const randomIndex = Math.floor(Math.random() * poem.length);
            selectedPoem.value = poem[randomIndex];
        }
    });

    // 开始检测扫码状态
    const startScanDetection = () => {
        if (!qrData.value) return;

        if (timer.value) {
            clearInterval(timer.value);
        }

        scanning.value = true;
        showCountdown.value = true;
        isScanned.value = false;
        scannedCode.value = null;
        countdown.value = 120;

        // 开始倒计时
        if (countdownTimer.value) {
            clearInterval(countdownTimer.value);
        }
        countdownTimer.value = setInterval(() => {
            countdown.value--;
            if (countdown.value <= 0) {
                stopDetection();
                message.value = '二维码已过期，请刷新后重新扫描';
            }
        }, 1000);

        // 每2秒检测一次扫码状态
        timer.value = setInterval(async () => {
            try {
                const scanRes = await $fetch(`/api/scanQr/${qrData.value!.uuid}`);
                const code = (scanRes as { code: string; message: null } | { code: null; message: string })
                    .code as string;

                if (code) {
                    // 扫码成功，停止检测
                    stopDetection();
                    isScanned.value = true;
                    scannedCode.value = code;
                    message.value = '扫码成功！请选择功能';
                }
            } catch (error) {
                console.error('检测扫码状态失败:', error);
            }
        }, 2000);
    };

    // 停止检测
    const stopDetection = () => {
        if (timer.value) {
            clearInterval(timer.value);
            timer.value = null;
        }
        if (countdownTimer.value) {
            clearInterval(countdownTimer.value);
            countdownTimer.value = null;
        }
        scanning.value = false;
        showCountdown.value = false;
    };

    // 通用的登录流程处理函数
    const handleLogin = async (code: string, redirectPath: string) => {
        try {
            isRunning.value = true;
            message.value = '登录中...';

            const loginResult = (
                await Promise.all([TotoroApiWrapper.getLesseeServer(code), TotoroApiWrapper.getAppAd(code)])
            )[0];

            if (!loginResult.token) {
                message.value = loginResult.message as string;
                isRunning.value = false;
                return;
            }

            // 获取额外信息
            const personalInfo = await TotoroApiWrapper.login({ token: loginResult.token });
            session.value = { ...personalInfo, token: loginResult.token, code, data: null };
            const breq = {
                token: loginResult.token,
                campusId: personalInfo.campusId,
                schoolId: personalInfo.schoolId,
                stuNumber: personalInfo.stuNumber,
            };

            // 并行执行所有API调用
            await Promise.all([
                TotoroApiWrapper.getAppFrontPage(breq),
                TotoroApiWrapper.getAppSlogan(breq),
                TotoroApiWrapper.updateAppVersion(breq),
                TotoroApiWrapper.getAppNotice(breq)
            ]);

            message.value = '登录成功，正在跳转...';
            setTimeout(() => {
                router.push(redirectPath);
            }, 500);

        } catch (e) {
            console.error(e);
            message.value = '龙猫服务器错误';
            isRunning.value = false;
        }
    };

    // 通用的功能按钮点击处理
    const handleFunctionButton = async (redirectPath: string) => {
        // 检查是否已经有会话
        if (session.value?.token && session.value?.code) {
            // 直接跳转到对应功能页面
            router.push(redirectPath);
            return;
        }

        // 没有会话，检查扫码
        let codeToUse = null;

        if (isScanned.value && scannedCode.value) {
            // 使用已扫描的code
            codeToUse = scannedCode.value;
        } else {
            // 如果没有自动检测到扫码，则手动检查一次
            try {
                if (!qrData.value) {
                    message.value = '请先刷新二维码';
                    return;
                }

                const scanRes = await $fetch(`/api/scanQr/${qrData.value.uuid}`);
                const code = (scanRes as { code: string; message: null } | { code: null; message: string })
                    .code as string;

                if (!code) {
                    message.value = '请先使用微信扫码';
                    return;
                }

                codeToUse = code;
            } catch (error) {
                console.error(error);
                message.value = '扫码验证失败';
                return;
            }
        }

        if (codeToUse) {
            await handleLogin(codeToUse, redirectPath);
        }
    };

    // 阳光跑按钮点击处理
    const handleSunRun = async () => {
        await handleFunctionButton('/sunrun');
    };

    // 自由跑按钮点击处理
    const handleFreeRun = async () => {
        await handleFunctionButton('/freerun');
    };

    // 早操签到按钮点击处理
    const handleMorningExercise = async () => {
        await handleFunctionButton('/morning');
    };

    // 刷新二维码
    const refreshQrCode = async () => {
        stopDetection();
        message.value = '';
        isScanned.value = false;
        scannedCode.value = null;
        await initQrCode();
    };

    // 切换账号
    const switchAccount = () => {
        clearSession();
        initQrCode();
    };

    // 页面卸载时清理定时器
    onUnmounted(() => {
        stopDetection();
    });

    // 响应二维码数据变化
    watch(() => qrData.value, (newData) => {
        if (newData && !scanning.value && !isScanned.value) {
            startScanDetection();
        }
    }, { immediate: true });
</script>

<template>
    <div class="flex flex-col items-center justify-center px-4">
        <div class="max-w-2xl w-full">
            <p class="text-subtitle-1 text-center">人只有献身于社会，才能找出那实际上是短暂而有风险的生命的意义。</p>
            <p class="mt-2 text-end">—— 爱因斯坦</p>

            <VDivider class="my-4" />

            <!-- 消息提示 -->
            <div v-if="message" class="mb-4 p-3 rounded-lg text-center"
                 :class="{
               'bg-red-100 text-red-700': message.includes('错误') || message.includes('失败') || message.includes('过期'),
               'bg-green-100 text-green-700': message.includes('成功'),
               'bg-blue-100 text-blue-700': message.includes('加载') || message.includes('登录中')
           }">
                {{ message }}
            </div>

            <div v-if="!session?.token" class="flex flex-col items-center gap-4">
                <p class="text-body-1 text-center">请用微信扫码，扫码成功后选择功能</p>

                <!-- 倒计时显示 -->
                <div v-if="showCountdown" class="text-sm text-gray-600">
                  二维码有效期: {{ Math.floor(countdown / 60) }}分{{ countdown % 60 }}秒
                </div>

                <div v-if="showCountdown" class="text-sm text-gray-600">
                    <span v-if="scanning" class="ml-2 inline-flex items-center">
                    <span class="loading-spinner mr-2"></span>
                    检测中...
                    </span>
                </div>
                
                <!-- 扫码状态提示 -->
                <div v-if="isScanned" class="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                    <VIcon icon="i-mdi-check-circle" class="mr-2" />
                    扫码成功！请选择功能按钮继续
                </div>

                <VCard :height="200" :width="200" class="flex items-center justify-center relative">
                    <!-- 二维码图片 -->
                    <img v-if="qrData?.imgUrl && !qrLoading && !qrError"
                         :src="qrData.imgUrl"
                         class="w-full h-full object-contain"
                         referrerpolicy="no-referrer" />

                    <!-- 加载中或错误状态 -->
                    <div v-else class="h-full w-full flex flex-col items-center justify-center p-4">
                        <!-- 加载中 -->
                        <div v-if="qrLoading" class="text-center">
                            <VProgressCircular indeterminate color="primary" size="48" width="4" class="mb-4" />
                            <p class="text-gray-600">二维码加载中...</p>
                        </div>

                        <!-- 错误状态 -->
                        <div v-else-if="qrError" class="text-center">
                            <VIcon icon="i-mdi-alert-circle" size="48" class="mb-2 text-red-500" />
                            <p class="text-red-600 mb-2">加载失败</p>
                            <p class="text-sm text-gray-500">请刷新二维码重试</p>
                        </div>

                        <!-- 其他状态 -->
                        <div v-else class="text-center">
                            <VIcon icon="i-mdi-qrcode" size="48" class="mb-2 text-gray-400" />
                            <p class="text-gray-600">{{ getQrStatusText() }}</p>
                        </div>
                    </div>
                </VCard>

                <!-- 状态说明 -->
                <div class="text-sm text-gray-500 text-center">
                    <p>{{ getQrStatusText() }}</p>
                    <p v-if="isRunning" class="mt-1">正在处理，请稍候...</p>
                </div>

                <!-- 刷新二维码按钮（单独一行） -->
                <div class="mt-4 flex justify-center">
                    <VBtn color="secondary"
                          variant="outlined"
                          prepend-icon="i-mdi-refresh"
                          :loading="qrLoading"
                          @click="refreshQrCode"
                          class="w-full max-w-xs">
                        刷新二维码
                    </VBtn>
                </div>

                <!-- 功能按钮组 -->
                <div class="mt-2 grid grid-cols-2 gap-3 w-full max-w-md">
                    <VBtn color="warning"
                          prepend-icon="i-mdi-weather-sunny"
                          @click="handleMorningExercise"
                          :disabled="!isScanned || isRunning"
                          :loading="isRunning && message.includes('早操')"
                          class="col-span-2">
                        早操签到
                    </VBtn>

                    <VBtn color="primary"
                          prepend-icon="i-mdi-run"
                          @click="handleSunRun"
                          :disabled="!isScanned || isRunning"
                          :loading="isRunning && message.includes('阳光')"
                          class="flex-1"
                          block>
                        阳光跑
                    </VBtn>

                    <VBtn color="success"
                          prepend-icon="i-mdi-map-marker-radius"
                          @click="handleFreeRun"
                          :disabled="!isScanned || isRunning"
                          :loading="isRunning && message.includes('自由')"
                          class="flex-1">
                        自由跑
                    </VBtn>

                </div>
            </div>

            <!-- 已经有会话的情况 -->
            <div v-else class="flex flex-col items-center gap-6">
                <div class="text-center">
                    <VIcon icon="i-mdi-check-circle" size="64" class="text-green-500 mb-4" />
                    <h3 class="text-h6 mb-2">您已登录</h3>
                    <p class="text-sm text-gray-500 mt-1">{{ session.stuNumber || '未知用户' }}</p>
                    <p class="text-body-1 text-gray-600">请选择要使用的功能：</p>
                </div>

                <!-- 功能按钮组 -->
                <div class="grid grid-cols-2 gap-4 w-full max-w-md">
                    <VBtn color="warning"
                          prepend-icon="i-mdi-weather-sunny"
                          @click="handleMorningExercise"
                          class="col-span-2"
                          size="large">
                        早操签到
                    </VBtn>

                    <VBtn color="primary"
                          prepend-icon="i-mdi-run"
                          @click="handleSunRun"
                          class="flex-1"
                          size="large"
                          block>
                        阳光跑
                    </VBtn>

                    <VBtn color="success"
                          prepend-icon="i-mdi-map-marker-radius"
                          @click="handleFreeRun"
                          class="flex-1"
                          size="large">
                        自由跑
                    </VBtn>

                </div>

                <!-- 退出登录按钮 -->
                <VBtn color="grey"
                      variant="outlined"
                      prepend-icon="i-mdi-logout"
                      @click="switchAccount"
                      class="mt-4">
                    切换账号
                </VBtn>
            </div>

            <!-- 显示固定诗句 -->
            <div v-if="selectedPoem.length > 0" class="text-sm pre-wrap text-center mt-4">
                {{ selectedPoem.join('\n') }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ccc;
  border-top-color: #1976d2; /* Vuetify primary 颜色 */
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 确保按钮组在小屏幕上也能正常显示 */
@media (max-width: 640px) {
  .grid-cols-2 {
    grid-template-columns: 1fr;
  }
  
  .col-span-2 {
    grid-column: span 1;
  }
  
  .max-w-md {
    max-width: 100%;
  }
}

/* 消息提示样式 */
.bg-red-100 {
  background-color: #fee;
}

.bg-green-100 {
  background-color: #efe;
}

.bg-blue-100 {
  background-color: #eef;
}
</style>