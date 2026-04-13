import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  forwardRef,
  ForwardedRef,
  useImperativeHandle,
  Fragment,
  createContext,
} from 'react';
import classnames from 'classnames';
import Tabs, { ITabItem } from '@/components/Tabs';
import Iconfont from '@/components/Iconfont';
import StateIndicator from '@/components/StateIndicator';
// import Output from '@/components/Output';
import { IManageResultData, IResultConfig } from '@/typings';
import TableBox from './components/TableBox';
import StatusBar from './components/StatusBar';
import styles from './index.less';
import EmptyImg from '@/assets/img/empty.svg';
import i18n from '@/i18n';
import sqlServer, { IExecuteSqlParams } from '@/service/sql';
import historyServer from '@/service/history';
import { v4 as uuidV4 } from 'uuid';
import { getPageSize } from '@/store/setting';
import LoadingIndicator from './components/LoadingIndicator';
import { isTauri } from '@/service/tauri-bridge';

interface IProps {
  className?: string;
  sql?: string;
  executeSqlParams: any;
  concealTabHeader?: boolean;
  viewTable?: boolean;
  isActive?: boolean;
}

const getDefaultResultConfig = (): IResultConfig => ({
  pageNo: 1,
  pageSize: getPageSize(),
  total: 0,
  hasNextPage: true,
});

export interface ISearchResultRef {
  handleExecuteSQL: (sql: string) => void;
}

interface IContext {
  // 这里不用ref的话，会导致切换时闪动
  activeTabId: string;
  notChangedSql: string;
}

export const Context = createContext<IContext>({} as any);

export default forwardRef((props: IProps, ref: ForwardedRef<ISearchResultRef>) => {
  const { className, sql, concealTabHeader, viewTable, isActive } = props;
  const executeSqlParamsRef = useRef(props.executeSqlParams);
  executeSqlParamsRef.current = props.executeSqlParams;
  const [resultDataList, setResultDataList] = useState<IManageResultData[]>();
  const [tableLoading, setTableLoading] = useState(false);
  const [loadingRowCount, setLoadingRowCount] = useState<number | undefined>();
  const controllerRef = useRef<AbortController>();
  const unlistenRef = useRef<(() => void) | null>(null);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [notChangedSql, setNotChangedSql] = useState<string>('');

  useEffect(() => {
    if (sql) {
      handleExecuteSQL(sql);
    }
  }, [sql]);

  useImperativeHandle(ref, () => ({
    handleExecuteSQL,
  }));

  /**
   * 执行SQL
   * @param sql
   */
  const handleExecuteSQL = async (_sql: string) => {
    setTableLoading(true);
    setLoadingRowCount(undefined);

    // 监听 Rust 端的流式进度事件
    if (isTauri()) {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlisten = await listen<number>('sql_progress', (event) => {
          setLoadingRowCount(event.payload);
        });
        unlistenRef.current = unlisten;
      } catch {}
    }

    const api = viewTable ? sqlServer.viewTable : sqlServer.executeSql;
    const currentParams = executeSqlParamsRef.current;

    const executeSQLParams: IExecuteSqlParams = {
      sql: _sql,
      tableName: currentParams?.tableName,
      ...getDefaultResultConfig(),
      ...currentParams,
      type: currentParams.databaseType, // 兼容写法，希望后端可以统一把type改成databaseType
    };

    controllerRef.current = new AbortController();
    // 获取当前SQL的查询结果
    api(executeSQLParams, {
      signal: controllerRef.current.signal,
    })
      .then((res) => {
        const sqlResult = res.map((_res) => ({
          ..._res,
          uuid: uuidV4(),
        }));

        setResultDataList(sqlResult);
        if(!notChangedSql){
          setNotChangedSql(_sql);
        }

        // 记录执行历史：只记录用户在编辑器手写的查询，viewTable（点开表）自动发起的查询跳过
        if (!viewTable) {
          const currentParams = executeSqlParamsRef.current;
          historyServer.createHistory({
            name: _sql.substring(0, 100),
            ddl: _sql,
            dataSourceId: currentParams?.dataSourceId,
            databaseName: currentParams?.databaseName,
            type: currentParams?.databaseType,
          }).catch(() => {});
        }
      })
      .finally(() => {
        unlistenRef.current?.();
        unlistenRef.current = null;
        setTableLoading(false);
      });
  };

  const onChange = useCallback((uuid) => {
    // activeTabIdRef.current = uuid;
    setActiveTabId(uuid);
  }, []);

  const renderResult = (queryResultData) => {
    function renderSuccessResult() {
      const needTable = queryResultData?.headerList?.length > 1;
      return (
        <div className={styles.successResult}>
          <div className={styles.successResultContent}>
            {needTable ? (
              <TableBox
                isActive={isActive}
                tableBoxId={queryResultData.uuid}
                key={queryResultData.uuid}
                outerQueryResultData={queryResultData}
                executeSqlParams={props.executeSqlParams}
                concealTabHeader={concealTabHeader}
                viewTable={viewTable}
              />
            ) : (
              <div className={styles.updateCountBox}>
                <div className={styles.updateCount}>
                  {i18n('common.text.affectedRows', queryResultData.updateCount)}
                </div>
                <StatusBar
                  dataLength={queryResultData?.dataList?.length}
                  duration={queryResultData.duration}
                  description={queryResultData.description}
                  sql={queryResultData.originalSql}
                />
              </div>
            )}
          </div>
        </div>
      );
    }
    return (
      <Fragment key={queryResultData.uuid}>
        {queryResultData.success ? (
          renderSuccessResult()
        ) : (
          <StateIndicator
            className={styles.stateIndicator}
            key={queryResultData.uuid}
            state="error"
            text={queryResultData.message}
          />
        )}
      </Fragment>
    );
  };

  const tabsList = useMemo(() => {
    return resultDataList?.map((queryResultData, index) => {
      return {
        prefixIcon: (
          <Iconfont
            key={index}
            className={classnames(styles[queryResultData.success ? 'successIcon' : 'failIcon'], styles.statusIcon)}
            code={queryResultData.success ? '\ue605' : '\ue87c'}
          />
        ),
        popover: queryResultData.originalSql,
        label: i18n('common.text.executionResult', index + 1),
        key: queryResultData.uuid!,
        children: renderResult(queryResultData),
      };
    });
  }, [resultDataList, isActive]);

  const onEdit = useCallback(
    (type: 'add' | 'remove', data: ITabItem[]) => {
      if (type === 'remove') {
        const newResultDataList = resultDataList?.filter((d) => {
          return data.findIndex((item) => item.key === d.uuid) === -1;
        });
        setResultDataList(newResultDataList);
      }
    },
    [resultDataList],
  );

  const stopExecuteSql = () => {
    controllerRef.current && controllerRef.current.abort();
    unlistenRef.current?.();
    unlistenRef.current = null;
    setResultDataList([]);
    setTableLoading(false);
  };

  return (
    <Context.Provider
      value={{
        activeTabId: activeTabId,
        notChangedSql: notChangedSql,
      }}
    >
      <div className={classnames(className, styles.searchResult)}>
        {tableLoading ? (
          <LoadingIndicator onStop={stopExecuteSql} rowCount={loadingRowCount} />
        ) : (
          <>
            {tabsList?.length ? (
              <Tabs
                hideAdd
                className={styles.tabs}
                onChange={onChange as any}
                onEdit={onEdit as any}
                items={tabsList}
                concealTabHeader={concealTabHeader}
                destroyInactiveTabPane={true}
              />
            ) : (
              <div className={styles.noData}>
                <img src={EmptyImg} />
                <p>{i18n('common.text.noData')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </Context.Provider>
  );
});
