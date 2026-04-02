import { UseBoundStoreWithEqualityFn, createWithEqualityFn } from 'zustand/traditional';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { StoreApi } from 'zustand';

export interface ISettingState {
  holdingService: boolean;
  pageSize: number;
}

const initSetting = {
  holdingService: false,
  pageSize: 200,
}

export const useSettingStore: UseBoundStoreWithEqualityFn<StoreApi<ISettingState>> = createWithEqualityFn(
  devtools(
    persist(
      () => (initSetting),
      {
        name: 'global-setting',
        storage: createJSONStorage(() => localStorage),
        partialize: (state: ISettingState) => ({
          holdingService: state.holdingService,
          pageSize: state.pageSize,
        }),
      },
    ),
  ),
  shallow
);

export const setHoldingService = (holdingService: boolean) => {
  useSettingStore.setState({ holdingService });
}

export const setPageSize = (pageSize: number) => {
  useSettingStore.setState({ pageSize });
}

export const getPageSize = () => {
  return useSettingStore.getState().pageSize || 200;
}
