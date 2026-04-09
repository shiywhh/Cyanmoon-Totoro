<script setup lang="ts">
import { useNow } from '@vueuse/core';
import { onMounted, onUnmounted } from 'vue';
import TotoroApiWrapper from '~/src/wrappers/TotoroApiWrapper';
import generateRunReq from '~~/src/controllers/generateSunRunExercisesReq';
import generateRoute from '~~/src/utils/generateRoute';

const now = useNow({ interval: 1000 });
const startTime = ref(new Date());
const endTime = ref(new Date());
const timePassed = computed(() => Number(now.value) - Number(startTime.value));
const needTime = ref(0);
const running = ref(false);
const sunRunPaper = useSunRunPaper();
const { params } = useRoute();
const session = useSession();
const { route } = params as { route: string };
const runned = computed(() => !running.value && !!needTime.value);
const target = computed(() => sunRunPaper.value.runPointList.find((r) => r.pointId === route)!);

const router = useRouter();

const handleRun = async () => {
  const { req, endTime: targetTime } = await generateRunReq({
    distance: sunRunPaper.value.mileage,
    routeId: target.value.pointId,
    taskId: target.value.taskId,
    token: session.value.token,
    schoolId: session.value.schoolId,
    stuNumber: session.value.stuNumber,
    phoneNumber: session.value.phoneNumber,
    minTime: sunRunPaper.value.minTime,
    maxTime: sunRunPaper.value.maxTime,
  });
  
  // 设置开始时间和预计完成时间
  startTime.value = new Date();
  needTime.value = Number(targetTime) - Number(startTime.value);
  endTime.value = targetTime;
  running.value = true;

  // 开始跑步
  await TotoroApiWrapper.getRunBegin({
    campusId: session.value.campusId,
    schoolId: session.value.schoolId,
    stuNumber: session.value.stuNumber,
    token: session.value.token,
  });
  
  // 立即提交跑步数据
  try {
    const res = await TotoroApiWrapper.sunRunExercises(req);
    const runRoute = generateRoute(sunRunPaper.value.mileage, target.value);

    await TotoroApiWrapper.sunRunExercisesDetail({
      pointList: runRoute.mockRoute,
      scantronId: res.scantronId,
      breq: {
        campusId: session.value.campusId,
        schoolId: session.value.schoolId,
        stuNumber: session.value.stuNumber,
        token: session.value.token,
      },
    });

    running.value = false;
    console.log('跑步数据已提交');
  } catch (error) {
    console.error('提交跑步数据失败:', error);
    running.value = false;
  }
  
  // 这里不需要原来的setTimeout，因为我们在5秒后就提交了
  // 但保持needTime的显示，让用户看到总时长
};

// 返回阳光跑步页面
const goBackToSunRun = () => {
  router.push('/sunrun');
};

// 返回首页
const goBackToIndex = () => {
  router.push('/');
};

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
});

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (running.value && !runned.value) {
    e.preventDefault();
    e.returnValue = '跑步还未完成，确定要离开吗？';
  }
}
</script>

<template>
  <div class="responsive-center">
    <main class="centered-card">
      <header class="text-center mb-6">
        <h2 class="text-h6">跑步设置</h2>
        <p class="text-body-2 text-medium-emphasis">已选择路径: {{ target.pointName }}</p>
      </header>
      
      <div class="instructions">
        <p class="text-body-2">• 请再次确认是否开跑</p>
        <p class="text-body-2">• 开跑时会向龙猫服务器发送请求</p>
      </div>
      
      <div class="action-section">
        <div class="button-group">
          <VBtn 
            v-if="!runned && !running"
            variant="outlined"
            prepend-icon="i-mdi-arrow-left"
            @click="goBackToSunRun"
            class="back-button"
          >
            返回
          </VBtn>
          <VBtn 
            v-if="!runned && !running" 
            color="primary" 
            prepend-icon="i-mdi-run" 
            @click="handleRun"
            class="run-button"
          >
            确认开跑
          </VBtn>
        </div>
      </div>
      
      <template v-if="running">
        <div class="progress-section">
          <div class="d-flex justify-space-between align-center">
            <span class="text-caption">进度</span>
            <span class="text-caption font-weight-bold">
              <!-- 显示真实进度 -->
              {{ timePassed < 1000 ? Math.ceil((timePassed / 1000) * 100) : 100 }}%
            </span>
          </div>
          <VProgressLinear
            color="primary"
            :model-value="timePassed < 1000 ? (timePassed / 1000) * 100 : 100"
            height="8"
            class="mt-2 mb-1"
          />
          <div class="text-center text-caption text-medium-emphasis">
            {{ Math.min(timePassed, 1000) }}/1000
            <div v-if="timePassed < 1000" class="text-success">
              {{ Math.ceil((1000 - timePassed) / 1000) }}秒后完成...
            </div>
            <div v-else class="text-success font-weight-bold">
              正在提交数据...
            </div>
          </div>
        </div>
      </template>
      
      <div v-if="runned" class="completion-message">
        <VIcon color="success" icon="i-mdi-check-circle" size="large" />
        <p class="text-h6 font-weight-bold mt-2">跑步完成</p>
        <p class="text-body-2">请到 App 中查看跑步记录</p>
        <VBtn 
          variant="outlined"
          prepend-icon="i-mdi-arrow-left"
          @click="goBackToIndex"
          class="mt-4"
        >
          返回首页
        </VBtn>
      </div>
    </main>
  </div>
</template>

<style scoped>
.responsive-center {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.centered-card {
  width: 100%;
  max-width: 480px;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  background: white;
}

.instructions {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}

.action-section {
  margin: 2rem 0;
}

.button-group {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.back-button {
  flex-grow: 1;
  min-width: 0;
  height: 48px;
}

.run-button {
  flex-grow: 1;
  min-width: 0;
  height: 48px;
}

.progress-section {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
}

.completion-message {
  text-align: center;
  padding: 2rem;
  background-color: rgba(var(--v-theme-success), 0.05);
  border-radius: 8px;
  margin-top: 1.5rem;
}

@media (max-width: 600px) {
  .centered-card {
    padding: 1.5rem;
  }
  
  .button-group {
    flex-direction: column;
  }
  
  .back-button,
  .run-button {
    width: 100%;
  }
}
</style>