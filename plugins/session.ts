const SESSION_KEY = 'totoro_session';

export default defineNuxtPlugin(() => {
  const session = useState<Record<string, any>>('totoroSession');

  // 初始化：从 localStorage 恢复
  if (import.meta.client) {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try {
        session.value = JSON.parse(saved);
      } catch (e) {
        console.error('恢复session失败:', e);
      }
    }

    // 监听变化，自动持久化
    watch(session, (val) => {
      if (val) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(val));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }, { deep: true });
  }
});
