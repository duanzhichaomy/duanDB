import {useState, useEffect, useRef, useCallback} from 'react';
import { ConsoleStatus } from '@/constants';
import { message } from 'antd';
import indexedDB from '@/indexedDB';
import historyServer from '@/service/history';
import i18n from '@/i18n';
import { getCookie } from '@/utils';
import { getSavedConsoleList } from '@/pages/main/workspace/store/console';
import { useWorkspaceStore } from '@/pages/main/workspace/store';


interface IProps {
  isActive?: boolean;
  source?: string;
  editorRef: any;
  boundInfo: any;
  defaultValue?: string;
}

export const useSaveEditorData = (props: IProps) => {
  const { isActive, source, editorRef, boundInfo, defaultValue } = props;
  const timerRef = useRef<any>();
    // 上一次同步的console数据
  const lastSyncConsole = useRef<any>(defaultValue);
  const [saveStatus, setSaveStatus] = useState<ConsoleStatus>(boundInfo.status || ConsoleStatus.DRAFT);
  const [saveNameModalOpen, setSaveNameModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const pendingSaveValue = useRef<string>('');

  const doSave = useCallback((value: string, name?: string, noPrompting?: boolean) => {
    const p: any = {
      id: boundInfo.consoleId,
      status: ConsoleStatus.RELEASE,
      ddl: value,
    };
    if (name) {
      p.name = name;
    }

    historyServer.updateSavedConsole(p).then(() => {
      // 如果改了名字，同步更新 tab 标题
      if (name) {
        const workspaceTabList = useWorkspaceStore.getState().workspaceTabList;
        if (workspaceTabList) {
          const updatedList = workspaceTabList.map((tab) =>
            tab.id === boundInfo.consoleId ? { ...tab, title: name } : tab,
          );
          useWorkspaceStore.setState({ workspaceTabList: updatedList });
        }
      }
      getSavedConsoleList();
      indexedDB.deleteData('duandb', 'workspaceConsoleDDL', boundInfo.consoleId!);
      lastSyncConsole.current = value;
      setSaveStatus(ConsoleStatus.RELEASE);
      if (noPrompting) {
        return;
      }
      message.success(i18n('common.tips.saveSuccessfully'));
      timingAutoSave(ConsoleStatus.RELEASE);
    });
  }, [boundInfo.consoleId]);

  const saveConsole = useCallback((value?: string, noPrompting?: boolean) => {
    const val = value || '';
    // 首次保存（DRAFT -> RELEASE），弹出命名弹窗
    if (saveStatus !== ConsoleStatus.RELEASE && !noPrompting) {
      pendingSaveValue.current = val;
      setSaveName('');
      setSaveNameModalOpen(true);
      return;
    }
    doSave(val, undefined, noPrompting);
  }, [saveStatus, doSave]);

  const handleSaveNameConfirm = useCallback(() => {
    if (!saveName.trim()) {
      message.warning(i18n('common.tips.pleaseEnterName'));
      return;
    }
    setSaveNameModalOpen(false);
    doSave(pendingSaveValue.current, saveName.trim());
  }, [saveName, doSave]);

  const handleSaveNameCancel = useCallback(() => {
    setSaveNameModalOpen(false);
  }, []);

  function timingAutoSave(_status?: ConsoleStatus) {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      const curValue = editorRef?.current?.getAllContent();
      if (curValue === lastSyncConsole.current) {
        return;
      }
      if (saveStatus === ConsoleStatus.RELEASE || _status === ConsoleStatus.RELEASE) {
        doSave(curValue, undefined, true);
      } else {
        indexedDB
          .updateData('duandb', 'workspaceConsoleDDL', {
            consoleId: boundInfo.consoleId!,
            ddl: curValue,
            userId: getCookie('DUANDB.USER_ID'),
          })
          .then(() => {
            lastSyncConsole.current = curValue;
          });
      }
    }, 5000);
  }

  useEffect(() => {
    if (source !== 'workspace') {
      return;
    }
    // 离开时保存
    if (!isActive) {
      // 离开时清除定时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      const curValue = editorRef?.current?.getAllContent();
      if (curValue === lastSyncConsole.current) {
        return;
      }
      if (saveStatus === ConsoleStatus.RELEASE) {
        doSave(curValue, undefined, true);
      } else {
        indexedDB
          .updateData('duandb', 'workspaceConsoleDDL', {
            consoleId: boundInfo.consoleId!,
            ddl: curValue,
            userId: getCookie('DUANDB.USER_ID'),
          })
          .then(() => {
            lastSyncConsole.current = curValue;
          });
      }
    } else {
      timingAutoSave();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (saveStatus === ConsoleStatus.RELEASE) {
      editorRef?.current?.setValue(defaultValue, 'cover');
    } else {
      indexedDB
        .getDataByCursor('duandb', 'workspaceConsoleDDL', {
          consoleId: boundInfo.consoleId!,
          userId: getCookie('DUANDB.USER_ID'),
        })
        .then((res: any) => {
          // oldValue是为了处理函数视图等，他们是带着值来的，不需要去数据库取值
          const oldValue = editorRef?.current?.getAllContent();
          if (!oldValue) {
            editorRef?.current?.setValue(res?.[0]?.ddl || '', 'cover');
          }
        });
    }
  }, []);

  return {
    saveConsole,
    saveStatus,
    saveNameModalOpen,
    saveName,
    setSaveName,
    handleSaveNameConfirm,
    handleSaveNameCancel,
  }
}
