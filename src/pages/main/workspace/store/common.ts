import { IConnectionListItem } from '@/typings/connection';
import { useWorkspaceStore } from './index';

export interface ICommonStore {
  currentConnectionDetails: IConnectionListItem | null;
  openedDatabaseConnections: Record<number, string[]>;
  currentWorkspaceExtend: string | null;
  currentWorkspaceGlobalExtend: {
    code: string,
    uniqueData: any,
  } | null;
  showLeftSaveList: boolean;
}

export const initCommonStore: ICommonStore = {
  currentConnectionDetails: null,
  openedDatabaseConnections: {},
  currentWorkspaceExtend: null,
  currentWorkspaceGlobalExtend: null,
  showLeftSaveList: false,
}

export const setCurrentConnectionDetails = (connectionDetails: ICommonStore['currentConnectionDetails']) => {
  return useWorkspaceStore.setState({ currentConnectionDetails: connectionDetails });
}

export const addOpenedDatabaseConnection = (dataSourceId?: number, databaseName?: string) => {
  if (!dataSourceId || !databaseName) return;

  return useWorkspaceStore.setState((state) => {
    const openedDatabaseConnections = state.openedDatabaseConnections || {};
    const opened = openedDatabaseConnections[dataSourceId] || [];
    if (opened.includes(databaseName)) {
      return state;
    }

    return {
      openedDatabaseConnections: {
        ...openedDatabaseConnections,
        [dataSourceId]: [...opened, databaseName],
      },
    };
  });
}

export const removeOpenedDatabaseConnection = (dataSourceId?: number, databaseName?: string) => {
  if (!dataSourceId || !databaseName) return;

  return useWorkspaceStore.setState((state) => {
    const openedDatabaseConnections = state.openedDatabaseConnections || {};
    const opened = openedDatabaseConnections[dataSourceId] || [];
    return {
      openedDatabaseConnections: {
        ...openedDatabaseConnections,
        [dataSourceId]: opened.filter((name) => name !== databaseName),
      },
    };
  });
}

export const setCurrentWorkspaceExtend = (workspaceExtend: ICommonStore['currentWorkspaceExtend']) => {
  return useWorkspaceStore.setState({ currentWorkspaceExtend: workspaceExtend });
}

export const setCurrentWorkspaceGlobalExtend = (workspaceGlobalExtend: ICommonStore['currentWorkspaceGlobalExtend']) => {
  return useWorkspaceStore.setState({ currentWorkspaceGlobalExtend: workspaceGlobalExtend });
}

export const setShowLeftSaveList = (value: boolean) => {
  return useWorkspaceStore.setState({ showLeftSaveList: value });
}
