import {useEffect, useState} from 'react';
import {store, AppState} from '../store/remindersStore';

export function useStore(): AppState {
  const [state, setState] = useState(store.getState());

  useEffect(() => {
    const unsub = store.subscribe(() => setState({...store.getState()}));
    return unsub;
  }, []);

  return state;
}
