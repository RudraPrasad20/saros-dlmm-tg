type UserState = {
    step?: string;
    payload?: any;
  };
  
  const state = new Map<string, UserState>();
  
  export function setState(telegramId: string, s: UserState) {
    state.set(telegramId, s);
  }
  
  export function getState(telegramId: string) {
    return state.get(telegramId) || {};
  }
  
  export function clearState(telegramId: string) {
    state.delete(telegramId);
  }
  