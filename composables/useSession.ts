const SESSION_KEY = 'totoro_session';

export const useSession = () => useState<Record<string, any>>('totoroSession');
