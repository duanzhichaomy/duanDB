import { IConnectionListItem } from '@/typings/connection';
import { useWorkspaceStore } from './index';

export interface ICommonStore {
  currentConnectionDetails: IConnectionListItem | null;
  currentWorkspaceExtend: string | null;
  currentWorkspaceGlobalExtend: {
    code: string,
    uniqueData: any,
  } | null;
  showLeftSaveList: boolean;
}

export const initCommonStore: ICommonStore = {
  currentConnectionDetails: null,
  currentWorkspaceExtend: null,
  currentWorkspaceGlobalExtend: null,
  showLeftSaveList: false,
}

export const setCurrentConnectionDetails = (connectionDetails: ICommonStore['currentConnectionDetails']) => {
  return useWorkspaceStore.setState({ currentConnectionDetails: connectionDetails });
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
