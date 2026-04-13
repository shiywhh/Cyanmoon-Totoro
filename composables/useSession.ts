const SESSION_KEY = 'totoro_session';

export const useSession = () => useState<Record<string, any>>('totoroSession');

export const clearSession = () => {
  const session = useSession();
  session.value = null;
  if (import.meta.client) {
    localStorage.removeItem(SESSION_KEY);
  }
};
