import { useWorkspaceStore } from './index';
import { DatabaseTypeCode } from '@/constants';

export interface IModalStore {
  openCreateDatabaseModal: ((params: {
    type: 'database';
    relyOnParams: {
      databaseType: DatabaseTypeCode;
      dataSourceId: number;
      databaseName?: string;
    };
    executedCallback?: (status: true) => void;
  }) => void) | null;
}

export const initModalStore: IModalStore = {
  openCreateDatabaseModal: null,
};

export const setOpenCreateDatabaseModal = (fn: any) => {
  useWorkspaceStore.setState({ openCreateDatabaseModal: fn });
};
