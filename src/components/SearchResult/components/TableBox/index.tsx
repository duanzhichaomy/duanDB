import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dropdown, Input, MenuProps, Modal, Space, Popover, Spin, Button } from 'antd';
import { message } from '@/utils/globalMessage';
import { BaseTable, ArtColumn, useTablePipeline, features, SortItem } from 'ali-react-table';
import styled from 'styled-components';
import classnames from 'classnames';
import lodash from 'lodash';
import { v4 as uuid } from 'uuid';
import i18n from '@/i18n';
import ScreeningResult, { IScreeningResultRefFunction } from '@/components/SearchResult/components/ScreeningResult';
import { getPageSize } from '@/store/setting';
// import { Context } from '@/components/SearchResult';

// 样式
import styles from './index.less';

// 工具函数
import { compareStrings } from '@/utils/sort';
import { transformInputValue } from '../../utils';

// 类型定义
import { CRUD } from '@/constants';
import { TableDataType } from '@/constants/table';
import { IManageResultData, IResultConfig, ITableHeaderItem } from '@/typings/database';

// api
import sqlService, { IExecuteSqlParams } from '@/service/sql';
import historyService from '@/service/history';
import { isTauri } from '@/service/tauri-bridge';
import { save as tauriSaveDialog } from '@tauri-apps/plugin-dialog';
import { invoke as tauriInvokeCore } from '@tauri-apps/api/core';
import * as XLSX from 'xlsx';

// store
import { setFocusedContent } from '@/store/common/copyFocusedContent';

// 依赖组件
import ExecuteSQL from '@/components/ExecuteSQL';
import { CheckOutlined, DownOutlined } from '@ant-design/icons';
import { copy, tableCopy } from '@/utils';
import Iconfont from '../../../Iconfont';
import StateIndicator from '../../../StateIndicator';
import MonacoEditor from '../../../MonacoEditor';
import MyPagination from '../Pagination';
import StatusBar from '../StatusBar';
import RightClickMenu, { AllSupportedMenusType } from '../RightClickMenu';

// 自定义hooks
import useCurdTableData from '../../hooks/useCurdTableData';
import useMultipleSelect from '../../hooks/useMultipleSelect';
import usePasteData from '../../hooks/usePasteData';

interface ITableProps {
  className?: string;
  outerQueryResultData: IManageResultData;
  executeSqlParams: any;
  tableBoxId: string;
  isActive?: boolean;
  concealTabHeader?: boolean; // concealTabHeader 是否隐藏tab头部, 目前来说隐藏头部都是单表查询。需要显示筛选
  viewTable?: boolean; // 是否使用 viewTable API（单表查询场景）
}

interface IViewTableCellData {
  name: string;
  value: any;
  colId: string;
  rowId: string;
}

export interface IUpdateData {
  oldDataList?: Array<string | null>;
  dataList?: Array<string | null>;
  type: CRUD;
  rowId: string;
}

export enum USER_FILLED_VALUE {
  DEFAULT = 'DUANDB_UPDATE_TABLE_DATA_USER_FILLED_DEFAULT',
}

const SupportBaseTable: any = styled(BaseTable)`
  &.supportBaseTable {
    --bgcolor: var(--color-bg-base);
    --header-bgcolor: var(--color-bg-layout);
    --hover-bgcolor: transparent;
    --header-hover-bgcolor: var(--color-bg-layout);
    --highlight-bgcolor: transparent;
    --header-highlight-bgcolor: var(--color-bg-layout);
    --color: var(--color-text);
    --header-color: var(--color-text);
    --lock-shadow: rgb(37 37 37 / 0.5) 0 0 6px 2px;
    --border-color: var(--color-border-secondary);
    --cell-padding: 0px;
    --row-height: 28px;
    --header-row-height: 36px;
    --lock-shadow: 0px 1px 2px 0px var(--color-border);
  }
`;

const preCode = '$$duandb_';

// No列的code
const colNoCode = `${preCode}0No.`;

const getDefaultPaginationConfig = (): IResultConfig => ({
  pageNo: 1,
  pageSize: getPageSize(),
  total: 0,
  hasNextPage: true,
});

export const TableContext = React.createContext({} as any);

export default function TableBox(props: ITableProps) {
  // const {} = useContext(Context);
  const { className, outerQueryResultData, isActive, concealTabHeader, viewTable } = props;
  const [viewTableCellData, setViewTableCellData] = useState<IViewTableCellData | null>(null);
  const [, contextHolder] = message.useMessage();
  const [paginationConfig, setPaginationConfig] = useState<IResultConfig>(getDefaultPaginationConfig);
  // sql查询结果
  const [queryResultData, setQueryResultData] = useState<IManageResultData>(outerQueryResultData);
  // tableData：带列标识的表数据 可以传给Table组件 进行渲染
  // 保存原始的表数据，用于撤销
  const [oldTableData, setOldTableData] = useState<{ [key: string]: string }[]>([]);
  // 实时更新的表数据
  const [tableData, setTableData] = useState<{ [key: string]: string | null }[]>([]);
  // DataList不带列标识的表数据
  // 保存原始的表数据，用于对比新老数据看是否有变化
  const [oldDataList, setOldDataList] = useState<string[][]>([]);
  // 当前聚焦的单元格的坐标，以及是否正在编辑，为false时，代表正在聚焦，但是没有编辑
  const [editingCell, setEditingCell] = useState<[string, string, boolean] | null>(null);
  // input受控的正在编辑的数据
  const [editingData, setEditingData] = useState<string>('');
  // 当前选中的行号
  const [curOperationRowNo, setCurOperationRowNo] = useState<Array<string> | null>(null);
  const [refreshSpinning, setRefreshSpinning] = useState(false);
  // 操作过的数据列表
  const [updateData, setUpdateData] = useState<IUpdateData[] | []>([]);
  // 更新数据的sql
  const [updateDataSql, setUpdateDataSql] = useState<string | null>(null);
  // ExecuteSQL弹窗 初始化的错误信息
  const [initError, setInitError] = useState<string | null>(null);
  // 是否显示更新数据的sql
  const [viewUpdateDataSqlModal, setViewUpdateDataSqlModal] = useState<boolean>(false);
  // 用于滚动到底部
  const tableBoxRef = React.useRef<HTMLDivElement>(null);
  // 所有数据准备好了
  const [allDataReady, setAllDataReady] = useState<boolean>(false);
  // 编辑数据的inputRef
  const editDataInputRef = React.useRef<any>(null);
  // monacoEditorRef
  const monacoEditorRef = React.useRef<any>(null);
  // ScreeningResult ref
  const screeningResultRef = React.useRef<IScreeningResultRefFunction>(null);
  // 表格loading
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  // 列宽数组
  const [columnResize, setColumnResize] = useState<number[]>([50]);
  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  // 搜索是否展开
  const [searchVisible, setSearchVisible] = useState<boolean>(false);
  // 搜索匹配的行索引
  const [matchedRowIndices, setMatchedRowIndices] = useState<number[]>([]);
  // 当前高亮的匹配项索引
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  // 表格的宽度
  // const [tableBoxWidth, setTableBoxWidth] = useState<number>(0);
  // 缓存当前展示的（过滤后）表格数据，供表头右键菜单读取最新值
  const filteredTableDataRef = useRef<{ [key: string]: string | null }[]>([]);
  // 表头是否展示字段类型（受右键菜单中的"显示字段类型"开关控制，作用于所有列）
  const [showColumnType, setShowColumnType] = useState<boolean>(false);

  // 当前时间戳，用于默认文件名
  const timestampSuffix = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  };

  // 取当前页有效的列头与对应 colId（剔除序号列）
  const getExportColumns = () => {
    return (queryResultData.headerList || [])
      .map((h, idx) => ({ header: h, colId: `${preCode}${idx}${h.name}` }))
      .filter(({ header }) => header.dataType !== TableDataType.DUANDB_ROW_NUMBER);
  };

  // CSV 字段转义
  const escapeCsvCell = (val: string | null | undefined) => {
    if (val == null || val === USER_FILLED_VALUE.DEFAULT) return '';
    const s = String(val);
    if (/[",\r\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  // SQL 字面量转义（INSERT 用）
  const escapeSqlLiteral = (val: string | null | undefined) => {
    if (val == null || val === USER_FILLED_VALUE.DEFAULT) return 'NULL';
    const s = String(val).replace(/\\/g, '\\\\').replace(/'/g, "''");
    return `'${s}'`;
  };

  // 通用：弹出系统保存对话框，让用户选择保存路径，然后写入 bytes
  // 桌面（Tauri）模式：使用原生 dialog.save() + 自定义命令 save_file_bytes
  // Web 模式（兜底）：回退到浏览器下载（写入下载目录）
  const saveBytesWithDialog = async (
    bytes: Uint8Array,
    defaultFileName: string,
    filters: { name: string; extensions: string[] }[],
    mime: string,
  ) => {
    try {
      if (isTauri()) {
        const targetPath = await tauriSaveDialog({
          defaultPath: defaultFileName,
          filters,
        });
        if (!targetPath) return; // 用户取消
        await tauriInvokeCore('save_file_bytes', {
          path: targetPath,
          bytes: Array.from(bytes),
        });
        message.success(i18n('common.text.successfulExecution'));
      } else {
        // Web 兜底：浏览器下载
        const blob = new Blob([bytes.buffer as ArrayBuffer], { type: `${mime};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      console.error('导出失败:', e);
      message.error(`导出失败: ${e?.message || e}`);
    }
  };

  // 字符串 → UTF-8 字节（CSV 自动加 BOM 让 Excel 正确识别）
  const stringToBytes = (text: string, withBom: boolean) => {
    const encoder = new TextEncoder();
    const bom = withBom ? '\uFEFF' : '';
    return encoder.encode(bom + text);
  };

  // 导出当前页为 CSV
  const handleExportCurrentPageCsv = async () => {
    const cols = getExportColumns();
    if (!cols.length || !tableData.length) {
      message.warning(i18n('common.text.noData'));
      return;
    }
    const headerLine = cols.map(({ header }) => escapeCsvCell(header.name)).join(',');
    const lines = tableData.map((row) =>
      cols.map(({ colId }) => escapeCsvCell(row[colId])).join(','),
    );
    const csv = [headerLine, ...lines].join('\r\n');
    const baseName = queryResultData.tableName || 'export';
    await saveBytesWithDialog(
      stringToBytes(csv, true),
      `${baseName}_${timestampSuffix()}.csv`,
      [{ name: 'CSV', extensions: ['csv'] }],
      'text/csv',
    );
  };

  // 导出当前页为 INSERT SQL
  const handleExportCurrentPageInsert = async () => {
    const cols = getExportColumns();
    if (!cols.length || !tableData.length) {
      message.warning(i18n('common.text.noData'));
      return;
    }
    const tableName = queryResultData.tableName;
    if (!tableName) {
      message.warning('当前结果集无对应表名，无法生成 INSERT SQL');
      return;
    }
    const escapedTable = `\`${tableName.replace(/`/g, '``')}\``;
    const colNames = cols.map(({ header }) => `\`${header.name.replace(/`/g, '``')}\``).join(', ');
    const lines = tableData.map((row) => {
      const values = cols.map(({ colId }) => escapeSqlLiteral(row[colId])).join(', ');
      return `INSERT INTO ${escapedTable} (${colNames}) VALUES (${values});`;
    });
    await saveBytesWithDialog(
      stringToBytes(lines.join('\n'), false),
      `${tableName}_${timestampSuffix()}.sql`,
      [{ name: 'SQL', extensions: ['sql'] }],
      'text/plain',
    );
  };

  // 导出当前页为 Excel (.xlsx)
  const handleExportCurrentPageExcel = async () => {
    const cols = getExportColumns();
    if (!cols.length || !tableData.length) {
      message.warning(i18n('common.text.noData'));
      return;
    }
    try {
      // 第一行表头，后续为数据行
      const aoa: (string | null)[][] = [
        cols.map(({ header }) => header.name),
        ...tableData.map((row) =>
          cols.map(({ colId }) => {
            const v = row[colId];
            return v == null || v === USER_FILLED_VALUE.DEFAULT ? null : String(v);
          }),
        ),
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      const sheetName = (queryResultData.tableName || 'Sheet1').slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      // SheetJS `type: 'array'` 返回 Uint8Array
      const written = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
      const bytes = written instanceof Uint8Array ? written : new Uint8Array(written);
      const baseName = queryResultData.tableName || 'export';
      await saveBytesWithDialog(
        bytes,
        `${baseName}_${timestampSuffix()}.xlsx`,
        [{ name: 'Excel', extensions: ['xlsx'] }],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch (e: any) {
      console.error('Excel 导出失败:', e);
      message.error(`Excel 导出失败: ${e?.message || e}`);
    }
  };

  useEffect(() => {
    let total: any = queryResultData.fuzzyTotal;

    // 如果total是数字，且不为0，则还是使用原先的total
    if (lodash.isNumber(paginationConfig.total) && paginationConfig.total !== 0) {
      total = paginationConfig.total;
    }

    if (!lodash.isNumber(paginationConfig.total) && queryResultData.fuzzyTotal) {
      const oldTotal = Number(paginationConfig.total.split('+')[0]);
      const newTotal = Number(String(queryResultData.fuzzyTotal).split('+')[0]);
      if (oldTotal > newTotal) {
        total = paginationConfig.total;
      }
    }

    setPaginationConfig({
      ...paginationConfig,
      total,
      hasNextPage: queryResultData.hasNextPage,
    });
  }, [queryResultData]);

  useEffect(() => {
    // 每次dataList变化，都需要重新计算tableData
    if (!columns?.length) {
      setTableData([]);
    } else {
      const newTableData = dataListTransformTableData(queryResultData.dataList);
      setTableData(newTableData);
      setOldTableData(newTableData);
      setAllDataReady(true);
    }
    // 每次data变化，都需要重新计算oldDataList
    if (queryResultData.dataList?.length) {
      setOldDataList(queryResultData.dataList);
    }

    // 初次加载时，根据内容自动计算列宽
    if (queryResultData.headerList?.length && queryResultData.dataList?.length) {
      const MIN_COL_WIDTH = 80;
      const MAX_COL_WIDTH = 500;
      const HEADER_PADDING = 12 + 26; // 左右 padding(6+6) + 排序图标(22px) + 间距(4px)
      const CELL_PADDING = 24; // 单元格内左右 padding + 余量
      const sampleRows = queryResultData.dataList.slice(0, 50);

      // 使用 canvas 精确测量文本宽度
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const measureText = (text: string, font: string) => {
        ctx.font = font;
        return ctx.measureText(text).width;
      };

      const headerFont = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const cellFont = '400 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      const newSizes = queryResultData.headerList.map((header, colIndex) => {
        if (colIndex === 0) return 50; // No. 列固定宽度

        // 测量列标题宽度
        const headerWidth = measureText(header.name || '', headerFont) + HEADER_PADDING;

        // 采样数据中最宽内容
        let maxCellWidth = 0;
        for (const row of sampleRows) {
          const cellValue = row[colIndex];
          if (cellValue != null) {
            const cellWidth = measureText(String(cellValue), cellFont);
            maxCellWidth = Math.max(maxCellWidth, cellWidth);
          }
        }
        maxCellWidth += CELL_PADDING;

        const width = Math.min(Math.max(headerWidth, maxCellWidth, MIN_COL_WIDTH), MAX_COL_WIDTH);
        return Math.ceil(width);
      });
      setColumnResize(newSizes);
    }
  }, [queryResultData.dataList]);

  // 导出菜单项（仅支持当前页，前端直接生成，不依赖后端）
  const exportDropdownItems: MenuProps['items'] = useMemo(
    () => [
      {
        label: i18n('workspace.table.export.cur.csv'),
        key: 'cur-csv',
        onClick: handleExportCurrentPageCsv,
      },
      {
        label: i18n('workspace.table.export.cur.excel'),
        key: 'cur-excel',
        onClick: handleExportCurrentPageExcel,
      },
      {
        label: i18n('workspace.table.export.cur.insert'),
        key: 'cur-insert',
        onClick: handleExportCurrentPageInsert,
      },
    ],
    [queryResultData, tableData],
  );

  const defaultSorts: SortItem[] = useMemo(
    () =>
      (queryResultData.headerList || []).map((item, colIndex) => ({
        code: item.dataType === TableDataType.DUANDB_ROW_NUMBER ? colNoCode : `${preCode}${colIndex}${item.name}`,
        order: 'none' as const,
      })),
    [queryResultData.headerList],
  );

  const [sorts, setSorts] = useState<SortItem[]>(defaultSorts);
  // 记录用户当前激活的排序，在 headerList 变化时保留
  const activeSortRef = useRef<SortItem | null>(null);

  useEffect(() => {
    if (activeSortRef.current) {
      // 保留用户的排序选择
      const active = activeSortRef.current;
      const exists = defaultSorts.some((s) => s.code === active.code);
      if (exists) {
        setSorts([active]);
        return;
      }
    }
    setSorts(defaultSorts);
  }, [defaultSorts]);

  // 从列 code 中提取真实列名（去掉 $$duandb_ 前缀和索引）
  const getColumnNameFromCode = (code: string) => {
    const header = queryResultData.headerList?.find(
      (item, colIndex) => `${preCode}${colIndex}${item.name}` === code,
    );
    return header?.name || code;
  };

  // 点击列头排序箭头时，生成 ORDER BY 子句并触发服务端查询
  const onChangeSorts = (nextSorts: SortItem[]) => {
    setSorts(nextSorts);
    // 找到有排序方向的项
    const activeSorts = nextSorts.filter((s) => s.order !== 'none');
    // 记录用户的排序选择，防止查询结果返回后被重置
    activeSortRef.current = activeSorts.length > 0 ? activeSorts[0] : null;
    const orderByClause = activeSorts
      .map((s) => `\`${getColumnNameFromCode(s.code)}\` ${s.order === 'asc' ? 'ASC' : 'DESC'}`)
      .join(', ');

    // 排序时重置到第 1 页
    setPaginationConfig((prev) => ({ ...prev, pageNo: 1 }));

    // 同步到 ORDER BY 输入栏并触发查询
    if (screeningResultRef.current) {
      screeningResultRef.current.setOrderByValue(orderByClause);
      setTimeout(() => {
        screeningResultRef.current?.search({ pageNo: 1 });
      }, 0);
    }
  };

  function monacoEditorEditData() {
    const editorData = monacoEditorRef?.current?.getAllContent();
    const { rowId, colId } = viewTableCellData!;
    oldTableData.forEach((item) => {
      if (item[colNoCode] === rowId) {
        if (item[colId] !== editorData) {
          const newTableData = lodash.cloneDeep(tableData);
          let newRowDataList: any = [];
          newTableData.forEach((i) => {
            if (i[colNoCode] === rowId) {
              i[colId] = editorData;
              newRowDataList = Object.keys(i).map((_i) => i[_i]);
            }
          });
          setTableData(newTableData);
          // 添加更新记录
          setUpdateData([
            ...updateData,
            {
              type: CRUD.UPDATE,
              oldDataList: Object.keys(item).map((_i) => item[_i]),
              dataList: newRowDataList,
              rowId,
            },
          ]);
        }
        return;
      }
    });
    setViewTableCellData(null);
  }

  function handleCancel() {
    setViewTableCellData(null);
  }

  const handleClickTableItem = (colId, rowId, value, isEditing) => {
    // 1. 如果当前单元格正在编辑，则不需要再次编辑
    // 2. 如果当前单元格正在编辑，则不需要聚焦
    if (editingCell?.[0] === colId && editingCell?.[1] === rowId && editingCell?.[2]) {
      return;
    }
    setFocusedContent(value);
    // 聚焦当前单元格，取消对于行的聚焦
    setCurOperationRowNo(null);
    // 当前聚焦或者编辑的单元格的数据
    setEditingData(value);
    // 如果数据不支持修改，则该单元格不支持编辑
    if (!queryResultData.canEdit) {
      setEditingCell([colId, rowId, false]);
    } else {
      setEditingCell([colId, rowId, isEditing]);
    }
    // 当前聚焦或者编辑的单元格的坐标
    // 如果是编辑状态，则需要聚焦到input
    if (isEditing) {
      setTimeout(() => {
        editDataInputRef?.current?.focus();
      }, 0);
    }
  };

  // 渲染单元格的值
  const renderTableCellValue = (value) => {
    if (value === null) {
      return <span className={styles.cellValueNull}>{'<null>'}</span>;
    } else if (value === USER_FILLED_VALUE.DEFAULT) {
      return <span />;
    } else if (!value) {
      // 如果为空需要展位
      return <span />;
    } else {
      return value;
    }
  };

  // 每个单元格的样式
  const tableCellStyle = (value, rowId, colId) => {
    // 单元格的基础样式
    const styleList = [styles.tableItem];
    // 如果当前行中的单元格正在聚焦或编辑
    if (editingCell?.[1] === rowId) {
      // 设置正在编辑或聚焦的单元格所在行的样式为高亮
      styleList.push(styles.tableItemHighlight);
      // 精确找到列，设置正在编辑或聚焦的单元格的样式为Focus
      if (editingCell?.[0] === colId && !editingCell?.[2]) {
        styleList.push(styles.tableItemFocus);
      }
      return classnames(...styleList);
    }
    // 当前单元格所在的行被选中了(行聚焦)
    if (curOperationRowNo?.includes(rowId)) {
      // No列的高亮只需要用tableItemHighlight不需要用tableItemFocus
      if (colId === colNoCode) {
        styleList.push(styles.tableItemHighlight);
      } else {
        styleList.push(styles.tableItemFocus);
      }
      return classnames(...styleList);
    }
    // 新添加的行
    const index2 = updateData.findIndex((item) => {
      return item.rowId === rowId && item.type === CRUD.CREATE;
    });
    if (index2 !== -1) {
      styleList.push(styles.tableItemSuccess);
      return classnames(...styleList);
    }
    // 如果是删除过的行
    const index = updateData.findIndex((item) => item.rowId === rowId && item.type === CRUD.DELETE);
    if (index !== -1) {
      styleList.push(styles.tableItemError);
      return classnames(...styleList);
    }
    // 编辑过的单元格的样式
    let oldValue = '';
    oldTableData.forEach((item) => {
      if (item[colNoCode] === rowId) {
        oldValue = item[colId];
      }
    });

    if (value !== oldValue && colId !== colNoCode) {
      // console.log('colId', colId, 'rowId', rowId)
      // console.log('oldValue', oldValue, 'value', value)

      styleList.push(styles.tableItemEdit);
    }
    return classnames(...styleList);
  };

  // 纯数据的dataList 转换为 tableData
  const dataListTransformTableData = (myDataList: string[][]) => {
    const newTableData = (myDataList || []).map((item) => {
      const rowData: any = {};
      item.map((i: string | null, colIndex: number) => {
        const colId = `${preCode}${colIndex}${columns[colIndex].name}`;
        rowData[colId] = i;
      });
      return rowData;
    });
    return newTableData;
  };

  const onPageNoChange = (pageNo: number) => {
    const config = { ...paginationConfig, pageNo };
    setPaginationConfig(config);
    getTableData({ pageNo });
  };

  const onPageSizeChange = (pageSize: number) => {
    const config = { ...paginationConfig, pageSize, pageNo: 1 };
    setPaginationConfig(config);
    getTableData({ pageSize, pageNo: 1 });
  };

  const onClickTotalBtn = async () => {
    const res = await sqlService.getDMLCount({
      sql: queryResultData.originalSql,
      ...(props.executeSqlParams || {}),
    });
    setPaginationConfig({ ...paginationConfig, total: res });
    return res;
  };

  // 撤销按钮是否可用
  const revokeDisableBarState = useMemo(() => {
    // 如果有聚焦的行，但是没有操作过的数据，则不可用
    const operationType = [CRUD.CREATE, CRUD.UPDATE, CRUD.DELETE];
    if (curOperationRowNo) {
      // 当前选中的行里面有没有操作过的数据
      const hasOperationData = updateData.some((item) => {
        return operationType.includes(item.type) && curOperationRowNo.includes(item.rowId);
      });
      if (hasOperationData) {
        return false;
      }
    }
    // 如果有聚焦的单元格
    if (editingCell && editingCell[2] === false) {
      const oldRowDataList = oldDataList.find((item) => item[0] === editingCell[1]);
      const oldData = oldRowDataList?.[editingCell[0]];
      // 如果当前单元格的数据和老数据一样，则可用
      if (oldData !== editingData) {
        return false;
      }
    }
    // 如果都没，那撤销按钮不可用
    return true;
  }, [curOperationRowNo, updateData, editingCell]);

  // 处理撤销
  const handleRevoke = () => {
    if (revokeDisableBarState) {
      return;
    }
    // 多行撤销处理
    if (curOperationRowNo?.length) {
      const _updateData = updateData.filter((item) => !curOperationRowNo?.includes(item.rowId));
      let _tableData = tableData.map((item) => {
        const oldData = oldTableData.find((i) => i[colNoCode] === item[colNoCode])!;
        return curOperationRowNo.includes(item[colNoCode]!) ? oldData : item;
      });
      _tableData = _tableData.filter((item) => item);

      setUpdateData(_updateData);
      setTableData(_tableData);
      setCurOperationRowNo(null);
      return;
    }

    // 聚焦单元格撤销
    if (editingCell && editingCell[2] === false) {
      const oldRowTableData = oldTableData.find((item) => item[colNoCode] === editingCell[1])!;
      const oldData = oldRowTableData[editingCell[0]];
      const _tableData = tableData.map((item) => {
        if (item[colNoCode] === editingCell[1]) {
          item[editingCell[0]] = oldData || '';
        }
        return item;
      });

      // 如果撤销后这一行的数据和原始数据一样，则删除这条更新记录
      const newRowTableData = _tableData.find((item) => item[colNoCode] === editingCell[1])!;
      if (lodash.isEqual(newRowTableData, oldRowTableData)) {
        setUpdateData(updateData.filter((item) => item.rowId !== editingCell[1]));
      }

      setTableData(_tableData);
    }
  };

  // 查看更新数据的sql
  const handleViewSql = () => {
    if (!updateData.length) {
      return;
    }
    getExecuteUpdateSql().then((res) => {
      setUpdateDataSql(res);
      setViewUpdateDataSqlModal(true);
    });
  };

  // 更新数据的sql
  const handleUpdateSubmit = () => {
    if (!updateData.length || tableLoading) {
      return;
    }
    setTableLoading(true);
    getExecuteUpdateSql()
      .then((res) => {
        executeUpdateDataSql(res);
      })
      .catch(() => {
        setTableLoading(false);
      });
  };

  // 获取更新数据的sql
  const getExecuteUpdateSql = (_updateData?: any) => {
    return new Promise<string>((resolve) => {
      const params = {
        databaseName: props.executeSqlParams?.databaseName,
        dataSourceId: props.executeSqlParams?.dataSourceId,
        schemaName: props.executeSqlParams?.schemaName,
        type: props.executeSqlParams?.databaseType,
        tableName: queryResultData.tableName,
        headerList: queryResultData.headerList,
        operations: _updateData || updateData,
      };
      sqlService
        .getExecuteUpdateSql(params)
        .then((res) => {
          resolve(res || '');
        })
        .catch((e) => {
          console.error('getExecuteUpdateSql error:', e);
          message.error(`SQL 生成失败: ${e?.message || e}`);
          resolve('');
        });
    });
  };

  // 执行sql
  const executeUpdateDataSql = (sql: string) => {
    const executeSQLParams: IExecuteSqlParams = {
      sql,
      dataSourceId: props.executeSqlParams?.dataSourceId,
      databaseName: props.executeSqlParams?.databaseName,
      schemaName: props.executeSqlParams?.schemaName,
      tableName: queryResultData.tableName,
    };
    sqlService
      .executeUpdateDataSql(executeSQLParams)
      .then((res) => {
        if (res?.success) {
          // 记录 DML 执行历史（表内编辑/新增/删除提交）
          historyService
            .createHistory({
              name: sql.substring(0, 100),
              ddl: sql,
              dataSourceId: props.executeSqlParams?.dataSourceId,
              databaseName: props.executeSqlParams?.databaseName,
              type: props.executeSqlParams?.databaseType,
            })
            .catch(() => {});
          // 更新成功后，需要重新获取表格数据
          getTableData().then(() => {
            message.success(i18n('common.text.successfulExecution'));
            setUpdateData([]);
          });
        } else {
          setTableLoading(false);
          setUpdateDataSql(res?.sql);
          setViewUpdateDataSqlModal(true);
          setInitError(res.message);
        }
      })
      .catch(() => {
        setTableLoading(false);
      });
  };

  // 获取表格数据 接受一个参数params 包含IExecuteSqlParams中的一个或多个
  const getTableData = (params?: Partial<IExecuteSqlParams>) => {
    setTableLoading(true);
    setCurOperationRowNo(null);
    setEditingCell(null);
    const executeSQLParams: IExecuteSqlParams = {
      sql: queryResultData.originalSql,
      dataSourceId: props.executeSqlParams?.dataSourceId,
      databaseName: props.executeSqlParams?.databaseName,
      schemaName: props.executeSqlParams?.schemaName,
      tableName: props.executeSqlParams?.tableName,
      pageNo: paginationConfig.pageNo,
      pageSize: paginationConfig.pageSize,
      ...(params || {}),
    };

    // 有自定义 sql（排序/筛选）时用 executeSql，因为 viewTable 会忽略 params.sql
    const api = viewTable && !params?.sql ? sqlService.viewTable : sqlService.executeSql;
    return api(executeSQLParams)
      .then((res) => {
        setTableLoading(false);
        if (res?.[0]) {
          setQueryResultData(res[0]);
          setUpdateData([]);
        }
      })
      .catch((err) => {
        setTableLoading(false);
        message.error(err?.message || String(err));
      });
  };

  // sql执行成功后的回调
  const executeSuccessCallBack = () => {
    getTableData().then(() => {
      setViewUpdateDataSqlModal(false);
      message.success(i18n('common.text.successfulExecution'));
    });
  };

  const { multipleSelect } = useMultipleSelect({
    setCurOperationRowNo,
    tableData,
    colNoCode,
    curOperationRowNo,
    setFocusedContent,
  });

  const handelRowNoClick = (rowId: string) => {
    multipleSelect(rowId);
    setEditingCell(null);
    // const newRowData = tableData.find((item) => item[colNoCode] === rowId)!;
    // const newRowDataList = Object.keys(newRowData).map((item) => newRowData[item]);
    // newRowDataList.splice(0, 1);
  };

  // 渲染表头标题（带右键菜单：复制 / 复制字段名称 / 显示字段类型）
  const renderColumnHeaderTitle = (header: ITableHeaderItem, colId: string, showType: boolean) => {
    const { name, columnType, dataType } = header;
    const typeText = columnType || dataType || '';
    const headerMenuItems: MenuProps['items'] = [
      {
        key: 'copy-column',
        label: i18n('common.button.copy'),
        onClick: async () => {
          // 复制当前列在表格中所有展示的值（按行顺序，使用过滤后的数据反映搜索结果）
          const values = filteredTableDataRef.current.map((row) => {
            const val = row[colId];
            return val === USER_FILLED_VALUE.DEFAULT || val == null ? '' : String(val);
          });
          await copy(values.join('\n'));
          message.success(i18n('common.button.copySuccessfully'));
        },
      },
      {
        key: 'copy-column-name',
        label: i18n('common.button.copyColumnName'),
        onClick: async () => {
          await copy(name);
          message.success(i18n('common.button.copySuccessfully'));
        },
      },
      {
        key: 'show-column-type',
        // 已开启时右侧展示勾选标记，再次点击则关闭
        label: (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 120 }}>
            <span>{i18n('common.button.showColumnType')}</span>
            <CheckOutlined style={{ marginLeft: 16, fontSize: 12, visibility: showType ? 'visible' : 'hidden' }} />
          </span>
        ),
        onClick: () => {
          setShowColumnType((prev) => !prev);
        },
      },
    ];

    return (
      <Dropdown menu={{ items: headerMenuItems }} trigger={['contextMenu']}>
        <span className={styles.columnHeaderTitle}>
          <span className={styles.columnHeaderName}>{name}</span>
          {showType && typeText && <span className={styles.columnHeaderType}>{typeText}</span>}
        </span>
      </Dropdown>
    );
  };

  // 表格 列配置
  const columns: ArtColumn[] = useMemo(() => {
    return (queryResultData.headerList || []).map((item, colIndex) => {
      const { dataType, name } = item;
      const isNumber = dataType === TableDataType.NUMERIC;
      const isNumericalOrder = dataType === TableDataType.DUANDB_ROW_NUMBER;
      const colId = `${preCode}${colIndex}${name}`;

      if (isNumericalOrder) {
        return {
          code: colNoCode,
          name: 'No.',
          title: (
            <div
              className={styles.allSelectBox}
              onClick={() => {
                setEditingCell(null);
                if (curOperationRowNo) {
                  setCurOperationRowNo(null);
                  return;
                }
                // 全选列
                const rowIds = tableData.map((i) => i[colNoCode]!);
                setCurOperationRowNo(rowIds);
              }}
            />
          ),
          key: name,
          lock: true,
          // features: { sortable: compareStrings },
          render: (value: any, rowData, rowIndex) => {
            const rowId = rowData[colNoCode];
            return (
              <div
                data-duandb-general-can-copy-element
                data-duandb-edit-table-data-can-paste
                data-duandb-edit-table-data-can-right-click
                onClick={() => {
                  handelRowNoClick(rowId);
                }}
                onContextMenu={() => {
                  if (!curOperationRowNo?.includes(rowId)) {
                    handelRowNoClick(rowId);
                  }
                }}
                className={tableCellStyle(value, rowId, colNoCode)}
              >
                <div className={styles.tableItemNo}>{rowIndex + 1}</div>
              </div>
            );
          },
        };
      }

      return {
        code: colId,
        name: name,
        key: name,
        title: renderColumnHeaderTitle(item, colId, showColumnType),
        render: (value: any, rowData) => {
          const rowId = rowData[colNoCode];
          const content = renderTableCellValue(value);
          return (
            <div
              data-duandb-general-can-copy-element
              data-duandb-edit-table-data-can-paste
              data-duandb-edit-table-data-can-right-click
              className={tableCellStyle(value, rowId, colId)}
              onClick={handleClickTableItem.bind(null, colId, rowId, value, false)}
              onDoubleClick={handleClickTableItem.bind(null, colId, rowId, value, true)}
              onContextMenu={handleClickTableItem.bind(null, colId, rowId, value, false)}
            >
              {editingCell?.[0] === colId && editingCell?.[1] === rowId && editingCell?.[2] ? (
                <Input
                  ref={editDataInputRef}
                  value={transformInputValue(editingData) as any}
                  onChange={(e) => {
                    setEditingData(e.target.value);
                  }}
                  onBlur={() => {
                    setEditingCell([editingCell![0], editingCell![1], false]);
                    updateTableData('setCell', editingData);
                  }}
                />
              ) : (
                <>
                  <div className={styles.tableItemContent}>{content}</div>
                  <div className={styles.previewTableItemContent}>{content}</div>
                </>
              )}
            </div>
          );
        },
        // 如果是数字类型，因为后端返回的都是字符串，所以需要调用字符串对比函数来判断
        features: { sortable: isNumber ? compareStrings : true },
      };
    });
  }, [queryResultData.headerList, editingCell, editingData, curOperationRowNo, oldDataList, showColumnType]);

  const { updateTableData, handleCreateData, handleDeleteData } = useCurdTableData({
    tableData,
    setTableData,
    preCode,
    editingCell,
    columns,
    curOperationRowNo,
    oldDataList,
    updateData,
    setUpdateData,
    queryResultData,
    setCurOperationRowNo,
    setEditingCell,
    tableBoxRef,
    oldTableData,
    colNoCode,
  });

  // 处理粘贴的数据 hooks
  usePasteData({ updateTableData, curOperationRowNo, editingCell });

  // 计算表格总宽度，避免表格撑满整个屏幕
  const tableWidth = useMemo(() => {
    const fallbackSize = 150;
    const totalWidth = columns.reduce((sum, _, index) => {
      return sum + (columnResize[index] || fallbackSize);
    }, 0);
    return totalWidth;
  }, [columns, columnResize]);

  // 搜索过滤后的数据
  const filteredTableData = useMemo(() => {
    if (!searchKeyword.trim()) {
      setMatchedRowIndices([]);
      setCurrentMatchIndex(-1);
      filteredTableDataRef.current = tableData;
      return tableData;
    }
    const keyword = searchKeyword.toLowerCase();
    const matched: number[] = [];
    const filtered = tableData.filter((row, index) => {
      const values = Object.entries(row)
        .filter(([key]) => key !== colNoCode)
        .map(([, val]) => val);
      const isMatch = values.some((val) => val != null && String(val).toLowerCase().includes(keyword));
      if (isMatch) {
        matched.push(index);
      }
      return isMatch;
    });
    setMatchedRowIndices(matched);
    setCurrentMatchIndex(matched.length > 0 ? 0 : -1);
    filteredTableDataRef.current = filtered;
    return filtered;
  }, [tableData, searchKeyword]);

  const handleSearchPrev = () => {
    if (matchedRowIndices.length === 0) return;
    setCurrentMatchIndex((prev) => (prev <= 0 ? matchedRowIndices.length - 1 : prev - 1));
  };

  const handleSearchNext = () => {
    if (matchedRowIndices.length === 0) return;
    setCurrentMatchIndex((prev) => (prev >= matchedRowIndices.length - 1 ? 0 : prev + 1));
  };

  const handleCloseSearch = () => {
    setSearchVisible(false);
    setSearchKeyword('');
  };

  // 自定义排序表头，支持独立点击上/下箭头
  const CustomSortHeaderCell = useMemo(() => {
    return function SortHeaderCell({ children, column, onToggle, sortOrder, sortOptions }: any) {
      const justifyContent = column.align === 'right' ? 'flex-end' : column.align === 'center' ? 'center' : 'flex-start';

      const handleClick = (targetOrder: 'asc' | 'desc') => (e: React.MouseEvent) => {
        e.stopPropagation();
        // 点击已激活的箭头 → 取消排序；否则切换到目标排序
        const nextOrder = sortOrder === targetOrder ? 'none' : targetOrder;
        const nextSorts = nextOrder === 'none' ? [] : [{ code: column.code, order: nextOrder }];
        sortOptions.onChangeSorts(nextSorts);
      };

      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent, height: '100%' }}>
          {children}
          <svg
            style={{ userSelect: 'none', marginLeft: 2, flexShrink: 0 }}
            focusable="false"
            preserveAspectRatio="xMidYMid meet"
            width="22"
            height="22"
            viewBox="0 0 32 32"
          >
            <path
              style={{ cursor: 'pointer' }}
              fill={sortOrder === 'asc' ? 'var(--color-primary)' : 'var(--color-text-quaternary)'}
              transform="translate(0, 4)"
              d="M8 8L16 0 24 8z"
              onClick={handleClick('asc')}
            />
            <path
              style={{ cursor: 'pointer' }}
              fill={sortOrder === 'desc' ? 'var(--color-primary)' : 'var(--color-text-quaternary)'}
              transform="translate(0, -4)"
              d="M24 24L16 32 8 24z"
              onClick={handleClick('desc')}
            />
          </svg>
        </div>
      );
    };
  }, []);

  // 表格渲染的配置
  const pipeline = useTablePipeline()
    .input({ dataSource: filteredTableData, columns })
    .use(
      features.sort({
        mode: 'single',
        sorts,
        SortHeaderCell: CustomSortHeaderCell,
        onChangeSorts: concealTabHeader ? onChangeSorts : undefined,
        defaultSorts: concealTabHeader ? undefined : defaultSorts,
        highlightColumnWhenActive: true,
        clickArea: 'icon',
        keepDataSource: !!concealTabHeader,
      }),
    )
    .use(
      features.columnResize({
        fallbackSize: 150,
        // handleBackground: '#ddd',
        handleHoverBackground: `var(--color-primary-bg-hover)`,
        handleActiveBackground: `var(--color-primary-bg-hover)`,
        minSize: 60,
        maxSize: 1080,
        sizes: columnResize,
        onChangeSizes: (sizes) => {
          sizes[0] = 50;
          setColumnResize(sizes);
        },
      }),
    );

  const getSelectTableRowData = () => {
    if (!curOperationRowNo && !editingCell) {
      return [[]];
    }
    const rowIds = curOperationRowNo || [editingCell?.[1]];
    const newRowDatas = tableData.filter((item) => rowIds.includes(item[colNoCode]!));
    const newRowDatasList = newRowDatas.map((item) => {
      const _item = lodash.cloneDeep(item);
      delete _item[colNoCode];
      return Object.keys(_item).map((i) =>
        _item[i] === USER_FILLED_VALUE.DEFAULT ? null : _item[i],
      );
    });
    return newRowDatasList;
  };

  // 右键菜单配置项
  const copyRow = {
    key: AllSupportedMenusType.CopyRow,
    children: [
      {
        callback: () => {
          const rowIds = curOperationRowNo || [editingCell?.[1]];
          if (!rowIds?.length) return;
          const newRowDatas = tableData.filter((item) => rowIds.includes(item[colNoCode]!));
          const newRowDatasList = newRowDatas.map((item) => {
            const _item = lodash.cloneDeep(item);
            return Object.keys(_item).map((i) => _item[i]);
          });
          const _updateDatas = newRowDatasList.map((item, index) => {
            return {
              type: CRUD.CREATE,
              dataList: item,
              rowId: (tableData.length + index + 1).toString(),
            };
          });

          getExecuteUpdateSql(_updateDatas).then(async (res) => {
            if (res) {
              await copy(res);
              message.success(i18n('common.button.copySuccessfully'));
            } else {
              message.warning('SQL 生成为空');
            }
          });
        },
        hide: !queryResultData.canEdit,
      },
      {
        callback: () => {
          const rowIds = curOperationRowNo || [editingCell?.[1]];
          if (!rowIds?.length) return;
          const newRowDatas = tableData.filter((item) => rowIds.includes(item[colNoCode]!));
          const newRowDatasList = newRowDatas.map((item) => {
            const _item = lodash.cloneDeep(item);
            return Object.keys(_item).map((i) => _item[i]);
          });
          const _updateDatas = newRowDatasList.map((item, index) => {
            return {
              type: CRUD.UPDATE_COPY,
              dataList: item,
              rowId: (tableData.length + index + 1).toString(),
            };
          });

          getExecuteUpdateSql(_updateDatas).then(async (res) => {
            if (res) {
              await copy(res);
              message.success(i18n('common.button.copySuccessfully'));
            } else {
              message.warning('SQL 生成为空');
            }
          });
        },
        hide: !queryResultData.canEdit,
      },
      // 复制当前行的数据
      {
        callback: () => {
          const selectTableRowData = getSelectTableRowData();
          tableCopy(selectTableRowData);
        },
      },
      // 复制表头
      {
        callback: () => {
          const headerList = queryResultData.headerList.map((item) => item.name);
          // 去掉No列
          headerList.splice(0, 1);
          tableCopy([headerList]);
        },
      },
      // 复制表头和当前行的数据
      {
        callback: () => {
          const rowIds = curOperationRowNo || [editingCell![1]];
          const newRowDatas = tableData.filter((item) => rowIds.includes(item[colNoCode]!));
          const newRowDatasList = newRowDatas.map((item) => {
            const _item = lodash.cloneDeep(item);
            delete _item[colNoCode];
            return Object.keys(_item).map((i) =>
              _item[i] === USER_FILLED_VALUE.DEFAULT ? null : _item[i],
            );
          });
          const headerList = queryResultData.headerList.map((item) => item.name);
          // 去掉No列
          headerList.splice(0, 1);
          tableCopy([headerList, ...newRowDatasList]);
        },
      },
    ],
  };

  const cloneRow = {
    key: AllSupportedMenusType.CloneRow,
    callback: () => {
      const newTableData = lodash.cloneDeep(tableData);
      const rowIds = curOperationRowNo || [editingCell![1]];
      // 在newTableData中找出 rowIds中所有的行
      const newRowDatas = newTableData.filter((item) => rowIds.includes(item[colNoCode]!));
      newRowDatas.map((t, i) => {
        t[colNoCode] = (newTableData.length + i + 1).toString();
      });
      handleCreateData(newRowDatas);
    },
  };

  const deleteRow = {
    key: AllSupportedMenusType.DeleteRow,
    callback: handleDeleteData,
  };

  const copyCell = {
    key: AllSupportedMenusType.CopyCell,
    callback: () => {
      copy(editingData);
    },
  };

  const setDefault = {
    key: AllSupportedMenusType.SetDefault,
    callback: () => {
      updateTableData('setCell', USER_FILLED_VALUE.DEFAULT);
    },
  };

  const setNull = {
    key: AllSupportedMenusType.SetNull,
    callback: () => {
      updateTableData('setCell', null);
    },
  };

  const viewData = {
    key: AllSupportedMenusType.ViewData,
    callback: () => {
      setViewTableCellData({
        name: columns.find((i) => i.code === editingCell![0])!.name,
        value: editingData,
        colId: editingCell![0],
        rowId: editingCell![1],
      });
    },
  };

  const rowRightClickMenu = useMemo(() => {
    let rightClickMenu: any = [];
    if (curOperationRowNo) {
      rightClickMenu = [copyRow, cloneRow, deleteRow];
      // 如果当前数据不可编辑，则不显示cloneRow和deleteRow
      if (!queryResultData.canEdit) {
        rightClickMenu = rightClickMenu.filter(
          (i) => i.key !== AllSupportedMenusType.CloneRow && i.key !== AllSupportedMenusType.DeleteRow,
        );
      }
    }

    if (editingCell) {
      rightClickMenu = [viewData, copyCell, copyRow, cloneRow, setNull, setDefault, deleteRow];
      // 判断是否有默认值,如果没有默认值，则不显示设置默认值的菜单
      const colId = editingCell[0];
      const hasDefaultValue =
        queryResultData.headerList.find((item) => {
          return item.name === columns.find((i) => i.code === colId)?.name;
        })?.defaultValue !== null;

      if (!hasDefaultValue) {
        rightClickMenu = rightClickMenu.filter((i) => i.key !== AllSupportedMenusType.SetDefault);
      }
      // 如果当前数据不可编辑，则不显示cloneRow和deleteRow
      if (!queryResultData.canEdit) {
        rightClickMenu = rightClickMenu.filter(
          (i) =>
            i.key !== AllSupportedMenusType.CloneRow &&
            i.key !== AllSupportedMenusType.DeleteRow &&
            i.key !== AllSupportedMenusType.SetNull,
        );
      }
    }

    if (!curOperationRowNo && !editingCell) {
      return null;
    }
    return rightClickMenu;
  }, [curOperationRowNo, editingCell, queryResultData]);

  const renderContent = () => {
    const bottomStatus = (
      <div className={styles.statusBar}>
        <span>{`【${i18n('common.text.result')}】${queryResultData.description}.`}</span>
        <span>{`【${i18n('common.text.timeConsuming')}】${queryResultData.duration}ms.`}</span>
        <span>{`【${i18n('common.text.searchRow')}】${tableData.length} ${i18n('common.text.row')}.`}</span>
      </div>
    );

    if (!columns.length) {
      return (
        <>
          {queryResultData.success ? (
            <StateIndicator state="success" text={i18n('common.text.successfulExecution')} />
          ) : (
            <StateIndicator state="error" text={queryResultData.message || i18n('common.text.executionFailed')} />
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>{bottomStatus}</div>
        </>
      );
    } else {
      return (
        <>
          <div className={styles.toolBar}>
            <div className={styles.toolBarItem}>
              <MyPagination
                paginationConfig={paginationConfig}
                onPageNoChange={onPageNoChange}
                onPageSizeChange={onPageSizeChange}
                onClickTotalBtn={onClickTotalBtn}
              />
            </div>
            <div className={classnames(styles.toolBarItem, styles.refreshBar)}>
              {/* 刷新 */}
              <Popover mouseEnterDelay={0.8} content={i18n('common.button.refresh')} trigger="hover">
                <div
                  onClick={() => {
                    setRefreshSpinning(true);
                    screeningResultRef.current ? screeningResultRef.current.search() : getTableData();
                    setTimeout(() => setRefreshSpinning(false), 600);
                  }}
                  className={classnames(styles.refreshIconBox)}
                >
                  <Iconfont code="&#xe62d;" className={classnames({ [styles.spinning]: refreshSpinning })} />
                </div>
              </Popover>
            </div>
            {queryResultData.canEdit && (
              <div className={classnames(styles.toolBarItem, styles.editTableDataBar)}>
                {/* 新增行 */}
                <Popover mouseEnterDelay={0.8} content={i18n('editTableData.tips.addRow')} trigger="hover">
                  <div
                    onClick={() => {
                      handleCreateData();
                    }}
                    className={classnames(styles.createDataBar, styles.editTableDataBarItem)}
                  >
                    <Iconfont code="&#xe631;" />
                  </div>
                </Popover>
                {/* 删除行 */}
                <Popover mouseEnterDelay={0.8} content={i18n('editTableData.tips.deleteRow')} trigger="hover">
                  <div
                    onClick={() => {
                      handleDeleteData();
                    }}
                    className={classnames(styles.deleteDataBar, styles.editTableDataBarItem, {
                      [styles.disableBar]: curOperationRowNo === null,
                    })}
                  >
                    <Iconfont code="&#xe644;" />
                  </div>
                </Popover>
                {/* 撤销 */}
                <Popover mouseEnterDelay={0.8} content={i18n('editTableData.tips.revert')} trigger="hover">
                  <div
                    onClick={handleRevoke}
                    className={classnames(styles.revokeBar, styles.editTableDataBarItem, {
                      [styles.disableBar]: revokeDisableBarState,
                    })}
                  >
                    <Iconfont code="&#xe6e2;" />
                  </div>
                </Popover>
                {/* 查看更改sql */}
                <Popover
                  mouseEnterDelay={0.8}
                  content={i18n('editTableData.tips.previewPendingChanges')}
                  trigger="hover"
                >
                  <div
                    onClick={handleViewSql}
                    className={classnames(styles.viewSqlBar, styles.editTableDataBarItem, {
                      [styles.disableBar]: !updateData.length,
                    })}
                  >
                    <Iconfont code="&#xe654;" />
                  </div>
                </Popover>
                {/* 提交 */}
                <Popover mouseEnterDelay={0.8} content={i18n('editTableData.tips.submit')} trigger="hover">
                  <div
                    onClick={handleUpdateSubmit}
                    className={classnames(styles.updateSubmitBar, styles.editTableDataBarItem, {
                      [styles.disableBar]: !updateData.length,
                    })}
                  >
                    <Iconfont code="&#xe687;" />
                  </div>
                </Popover>
              </div>
            )}
            <div className={styles.toolBarRight}>
              <Dropdown menu={{ items: exportDropdownItems }} trigger={['click']}>
                <Space className={styles.exportBar}>
                  {i18n('common.text.export')}
                  <DownOutlined />
                </Space>
              </Dropdown>
            </div>
          </div>
          {concealTabHeader && <ScreeningResult ref={screeningResultRef} getTableData={getTableData} promptWord={queryResultData.headerList} />}
          <div className={styles.searchBar}>
            <div className={styles.searchBarLeft}>
              <Iconfont code="&#xe600;" className={styles.searchBarIcon} />
              <input
                className={styles.searchBarInput}
                placeholder={i18n('common.text.searchResultData')}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <div className={styles.searchBarRight}>
              {searchKeyword && (
                <span className={styles.searchBarCount}>
                  {matchedRowIndices.length > 0 ? `${currentMatchIndex + 1}/${matchedRowIndices.length}` : `0/0`}
                </span>
              )}
              <div className={styles.searchBarBtn} onClick={handleSearchPrev}>
                <Iconfont code="&#xe674;" />
              </div>
              <div className={styles.searchBarBtn} onClick={handleSearchNext}>
                <Iconfont code="&#xe672;" />
              </div>
              {searchKeyword && (
                <div className={styles.searchBarBtn} onClick={handleCloseSearch}>
                  <Iconfont code="&#xe66f;" />
                </div>
              )}
            </div>
          </div>
          {isActive ? (
            <RightClickMenu menuList={rowRightClickMenu}>
              <div
                ref={tableBoxRef}
                className={classnames(styles.supportBaseTableBox, { [styles.supportBaseTableBoxHidden]: tableLoading })}
              >
                {allDataReady && (
                  <>
                    {tableLoading && <Spin className={styles.supportBaseTableSpin} />}
                    <SupportBaseTable
                      className={classnames('supportBaseTable', props.className, styles.table)}
                      components={{ EmptyContent: () => <h2>{i18n('common.text.noData')}</h2> }}
                      style={{ width: tableWidth, overflow: 'visible' }}
                      isStickyHead
                      stickyTop={39}
                      {...pipeline.getProps()}
                    />
                  </>
                )}
              </div>
            </RightClickMenu>
          ) : (
            <div className={styles.supportBaseTableBox} />
          )}
          <StatusBar
            description={queryResultData.description}
            duration={queryResultData.duration}
            dataLength={filteredTableData.length}
            sql={queryResultData.originalSql}
          />
        </>
      );
    }
  };

  const renderMonacoEditor = useMemo(() => {
    return (
      <div className={styles.monacoEditor}>
        <MonacoEditor
          ref={monacoEditorRef}
          id={`view_table-Cell_data-${uuid()}`}
          appendValue={{
            text: transformInputValue(viewTableCellData?.value),
            range: 'reset',
          }}
          language="plaintext"
          options={{
            lineNumbers: 'off',
            readOnly: !queryResultData.canEdit,
          }}
        />
      </div>
    );
  }, [queryResultData, viewTableCellData]);

  return (
    <div className={classnames(className, styles.tableBox, { [styles.noDataTableBox]: !tableData.length })}>
      {renderContent()}
      <Modal
        title={viewTableCellData?.name}
        open={!!viewTableCellData?.name}
        onCancel={handleCancel}
        width="60vw"
        mask={{ closable: false }}
        destroyOnHidden={true}
        footer={
          queryResultData.canEdit && [
            <Button key="1" type="primary" onClick={monacoEditorEditData}>
              {i18n('common.button.modify')}
            </Button>,
          ]
        }
      >
        {renderMonacoEditor}
      </Modal>
      <Modal
        width="60vw"
        mask={{ closable: false }}
        title={initError ? i18n('common.button.executionError') : i18n('editTable.title.sqlPreview')}
        open={viewUpdateDataSqlModal}
        footer={false}
        destroyOnHidden={true}
        onCancel={() => {
          setViewUpdateDataSqlModal(false);
          setUpdateDataSql('');
          setInitError(null);
        }}
      >
        <ExecuteSQL
          initError={initError}
          initSql={updateDataSql}
          databaseName={props.executeSqlParams?.databaseName}
          dataSourceId={props.executeSqlParams?.dataSourceId}
          tableName={queryResultData.tableName}
          schemaName={props.executeSqlParams?.schemaName}
          databaseType={props.executeSqlParams?.databaseType}
          executeSuccessCallBack={executeSuccessCallBack}
          executeSqlApi="executeUpdateDataSql"
        />
      </Modal>
      {contextHolder}
    </div>
  );
}
