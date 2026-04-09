<script setup lang="ts">
const appConfig = useAppConfig();

useHead({
    title: 'Cyanmoon Totoro 青月龙猫',
    link: [{
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico'
    }]
})
</script>
<script lang="ts">
window.global = window;
</script>

<template>
    <VApp>
        <VAppBar color="primary">
            <VAppBarTitle>Cyanmoon Totoro 青月龙猫</VAppBarTitle>
            <template #append>
                <VAppBarNavIcon v-ripple icon="i-mdi-github" href="https://github.com/shiywhh/Cyanmoon-Totoro"
                                rel="noreferrer noopener" target="_blank" />
            </template>
        </VAppBar>
        <VMain>
            <div class="p-4">
                <NuxtPage />
            </div>

            <!-- 版本信息 - 响应式设计 -->
            <div class="version-info">
                <p class="text-xs">
                    Developed Based on totoro-paradise
                </p>
                <p class="text-xs">
                    Original Developer：<a href="https://github.com/BeiyanYunyi" target="_blank" rel="noopener noreferrer" class="no-underline hover:text-blue-500">北雁云依（BeiyanYunyi）</a>
                </p>
                <p class="text-xs">
                    Contributor：<a href="https://github.com/shiywhh" target="_blank" rel="noopener noreferrer" class="no-underline hover:text-blue-500">十一（shiywhh）</a>
                </p>
                <p class="text-xs">
                    Copyright © 2026 shiywhh. All Rights Reserved.
                </p>
            </div>
        </VMain>
    </VApp>
</template>

<style scoped>
/* 默认样式 - PC端：固定在右下角 */
.version-info {
    position: fixed;
    bottom: 0;
    right: 0;
    padding: 1rem;
    text-align: right;
    background: transparent;
    z-index: 10;
}

/* 移动端样式 */
@media screen and (max-width: 768px) {
    .version-info {
        position: static; /* 取消固定定位 */
        padding: 1rem 0.5rem;
        margin-top: 2rem;
        width: 100%;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
    }
    
    /* 确保VMain容器在移动端有足够的底部空间 */
    .v-main {
        padding-bottom: 0 !important;
    }
}

/* 小屏幕手机优化 */
@media screen and (max-width: 480px) {
    .version-info {
        padding: 0.75rem 0.25rem;
        font-size: 0.7rem;
    }
    
    .version-info .text-xs {
        font-size: 0.7rem !important;
        line-height: 1.2;
        margin-bottom: 0.25rem;
    }
}
</style>