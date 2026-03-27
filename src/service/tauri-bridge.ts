import { invoke } from '@tauri-apps/api/core';

/**
 * API 路径到 Tauri Command 的映射
 * key: API路径模式（去掉路径参数后），value: Tauri command 名称
 */
const API_COMMAND_MAP: Record<string, string> = {
  // 连接管理
  'GET:/api/connection/datasource/list': 'connection_list',
  'GET:/api/connection/datasource/:id': 'connection_get',
  'POST:/api/connection/datasource/create': 'connection_create',
  'POST:/api/connection/datasource/update': 'connection_update',
  'DELETE:/api/connection/datasource/:id': 'connection_delete',
  'POST:/api/connection/datasource/pre_connect': 'connection_test',
  'POST:/api/connection/datasource/close': 'connection_close',

  // 数据库
  'GET:/api/rdb/database/list': 'database_list',
  'GET:/api/rdb/schema/list': 'schema_list',
  'GET:/api/rdb/ddl/database_schema_list': 'database_schema_list',
  'POST:/api/rdb/database/create_database_sql': 'database_create_sql',

  // SQL 执行
  'POST:/api/rdb/dml/execute': 'sql_execute',
  'POST:/api/rdb/dml/execute_table': 'sql_execute_table',
  'POST:/api/rdb/dml/execute_ddl': 'sql_execute_ddl',
  'POST:/api/rdb/dml/execute_update': 'sql_execute_update',
  'POST:/api/rdb/dml/count': 'sql_count',
  'POST:/api/rdb/dml/get_update_sql': 'sql_get_update_sql',
  'GET:/api/sql/format': 'sql_format',

  // 表操作
  'GET:/api/rdb/table/list': 'table_list',
  'GET:/api/rdb/table/table_list': 'table_name_list',
  'GET:/api/rdb/table/query': 'table_detail',
  'GET:/api/rdb/table/column_list': 'table_column_list',
  'GET:/api/rdb/table/table_meta': 'table_meta',
  'POST:/api/rdb/table/modify/sql': 'table_modify_sql',
  'GET:/api/rdb/ddl/column_list': 'ddl_column_list',
  'GET:/api/rdb/ddl/index_list': 'ddl_index_list',
  'GET:/api/rdb/ddl/export': 'ddl_export',
  'GET:/api/rdb/ddl/create/example': 'ddl_create_example',
  'GET:/api/rdb/ddl/update/example': 'ddl_update_example',
  'POST:/api/rdb/ddl/execute': 'ddl_execute',
  'POST:/api/rdb/ddl/delete': 'ddl_delete',

  // 元数据
  'GET:/api/rdb/view/list': 'view_list',
  'GET:/api/rdb/view/detail': 'view_detail',
  'GET:/api/rdb/view/column_list': 'view_column_list',
  'GET:/api/rdb/function/list': 'function_list',
  'GET:/api/rdb/function/detail': 'function_detail',
  'GET:/api/rdb/procedure/list': 'procedure_list',
  'GET:/api/rdb/procedure/detail': 'procedure_detail',
  'GET:/api/rdb/trigger/list': 'trigger_list',
  'GET:/api/rdb/trigger/detail': 'trigger_detail',

  // Console / 历史
  'POST:/api/operation/saved/create': 'console_create',
  'POST:/api/operation/saved/update': 'console_update',
  'GET:/api/operation/saved/list': 'console_list',
  'DELETE:/api/operation/saved/:id': 'console_delete',
  'POST:/api/operation/log/create': 'history_create',
  'GET:/api/operation/log/list': 'history_list',

  // Console connect（简单返回成功）
  'GET:/api/connection/console/connect': '_noop',

  // 环境列表（返回默认）
  'GET:/api/common/environment/list_all': '_env_list',

  // 系统检测（启动健康检查）
  'GET:/api/system': '_system_check',

  // 用户信息（本地模式返回默认用户）
  'GET:/api/oauth/user_a': '_local_user',

  // AI 配置（本地模式返回空配置）
  'GET:/api/config/system_config/ai': '_ai_config_get',
  'POST:/api/config/system_config/ai': '_noop',

  // 系统配置
  'GET:/api/config/system_config/:code': '_noop',
  'POST:/api/config/system_config': '_noop',

  // AI 白名单检测
  'GET:/api/ai/embedding/white/check': '_noop',

  // 版本更新
  'GET:/api/system/get_latest_version': 'check_update',
  'POST:/api/system/update_desktop_version': 'download_and_install_update',
  'GET:/api/system/is_update_success': '_noop',
  'POST:/api/system/set_update_type': '_noop',
};

/**
 * 检测是否在 Tauri 环境
 */
export function isTauri(): boolean {
  return !!(window as any).__TAURI_INTERNALS__;
}

/**
 * 将 API 路径和 method 转换为 Tauri command 名称
 */
function resolveCommand(method: string, url: string): string | null {
  const key = `${method.toUpperCase()}:${url}`;
  return API_COMMAND_MAP[key] || null;
}

/**
 * 将前端参数中的路径参数提取出来
 * 例如 url="/api/connection/datasource/:id", params={id: 1, ...rest}
 * 返回 {resolvedUrl, cleanParams}
 */
function extractPathParams(
  url: string,
  params: any,
): { resolvedUrl: string; cleanParams: any } {
  const cleanParams = { ...params };
  const resolvedUrl = url.replace(/:(.+?)\b/, (_, name: string) => {
    const value = cleanParams[name];
    delete cleanParams[name];
    return `${value}`;
  });
  return { resolvedUrl, cleanParams };
}

/**
 * 通过 Tauri invoke 执行命令
 */
export async function tauriInvoke<R>(
  method: string,
  url: string,
  params: any,
): Promise<R> {
  const command = resolveCommand(method, url);

  if (!command) {
    console.warn(`[tauri-bridge] 未映射的 API: ${method} ${url}，尝试直接映射`);
    throw new Error(`未映射的 Tauri command: ${method} ${url}`);
  }

  // 处理特殊命令
  if (command === '_noop') {
    return undefined as any;
  }

  if (command === '_env_list') {
    return [
      { id: 1, name: 'Local', shortName: 'Local', color: '#1890ff' },
    ] as any;
  }

  if (command === '_system_check') {
    return true as any;
  }

  if (command === '_local_user') {
    return {
      id: 1,
      admin: true,
      nickName: 'Local User',
      roleCode: 'ADMIN',
      token: '',
    } as any;
  }

  if (command === '_ai_config_get') {
    return {
      aiSqlSource: 'OPENAI',
    } as any;
  }

  // 对于需要路径参数的命令（如 :id），将其提取为普通参数
  const cleanParams = { ...params };

  // 处理不同的参数传递方式
  // Tauri invoke 的参数是一个 object，command handler 接收 named params
  // 对于 GET 请求，params 直接作为命名参数
  // 对于 POST 请求，params 作为 named params 中的 "params" 字段

  let invokeArgs: any;

  // 某些命令需要特殊的参数映射
  switch (command) {
    case 'connection_get':
    case 'connection_delete':
    case 'connection_close':
      invokeArgs = { id: cleanParams.id || cleanParams };
      break;
    case 'connection_test':
      invokeArgs = { params: { ...cleanParams, port: cleanParams.port != null ? Number(cleanParams.port) : null } };
      break;
    case 'connection_list':
      invokeArgs = { params: cleanParams };
      break;
    case 'connection_create':
    case 'connection_update':
      invokeArgs = { params: { ...cleanParams, port: cleanParams.port != null ? Number(cleanParams.port) : null } };
      break;
    case 'console_delete':
      invokeArgs = { id: cleanParams.id || cleanParams };
      break;
    case 'sql_format':
      invokeArgs = {
        sql: cleanParams.sql,
        dbType: cleanParams.dbType,
      };
      break;
    case 'ddl_create_example':
    case 'ddl_update_example':
      invokeArgs = { dbType: cleanParams.dbType };
      break;
    case 'database_list':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        refresh: cleanParams.refresh,
      };
      break;
    case 'schema_list':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        refresh: cleanParams.refresh,
      };
      break;
    case 'database_schema_list':
      invokeArgs = { dataSourceId: cleanParams.dataSourceId };
      break;
    case 'database_create_sql':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
      };
      break;
    // SQL 执行相关
    case 'sql_get_update_sql':
    case 'sql_execute':
    case 'sql_execute_table':
    case 'sql_execute_ddl':
    case 'sql_execute_update':
    case 'sql_count':
      invokeArgs = { params: cleanParams };
      break;
    // 表操作
    case 'table_list':
    case 'view_list':
    case 'function_list':
    case 'procedure_list':
    case 'trigger_list':
      invokeArgs = { params: cleanParams };
      break;
    case 'table_detail':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
        tableName: cleanParams.tableName,
        refresh: cleanParams.refresh,
      };
      break;
    case 'table_name_list':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
      };
      break;
    case 'table_column_list':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
        tableName: cleanParams.tableName,
      };
      break;
    case 'table_meta':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
      };
      break;
    case 'table_modify_sql':
      invokeArgs = { params: cleanParams };
      break;
    case 'ddl_column_list':
    case 'ddl_index_list':
    case 'ddl_export':
    case 'ddl_delete':
      invokeArgs = { params: cleanParams };
      break;
    case 'ddl_execute':
      invokeArgs = { params: cleanParams };
      break;
    case 'view_detail':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
        tableName: cleanParams.tableName,
      };
      break;
    case 'view_column_list':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
        tableName: cleanParams.tableName,
      };
      break;
    case 'function_detail':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
        functionName: cleanParams.functionName,
      };
      break;
    case 'procedure_detail':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
        procedureName: cleanParams.procedureName,
      };
      break;
    case 'trigger_detail':
      invokeArgs = {
        dataSourceId: cleanParams.dataSourceId,
        databaseName: cleanParams.databaseName,
        schemaName: cleanParams.schemaName,
        triggerName: cleanParams.triggerName,
      };
      break;
    // Console / 历史
    case 'console_create':
    case 'console_update':
      invokeArgs = { params: cleanParams };
      break;
    case 'console_list':
      invokeArgs = { params: cleanParams };
      break;
    case 'history_create':
      invokeArgs = { params: cleanParams };
      break;
    case 'history_list':
      invokeArgs = { params: cleanParams };
      break;
    case 'check_update':
    case 'download_and_install_update':
      invokeArgs = {};
      break;
    default:
      invokeArgs = cleanParams;
  }

  try {
    const response = await invoke<any>(command, invokeArgs);

    // check_update 返回 {version, body} | null，需转换为 ILatestVersion 格式
    if (command === 'check_update') {
      if (!response) {
        return { desktop: true, version: __APP_VERSION__, type: 'manual', hotUpgradeUrl: null } as any;
      }
      return {
        desktop: true,
        version: response.version,
        hotUpgradeUrl: null,
        type: localStorage.getItem('duandb-update-type') || 'manual',
        updateLog: response.body,
        downloadLink: null,
      } as any;
    }

    // download_and_install_update 返回 bool
    if (command === 'download_and_install_update') {
      return response as R;
    }

    // Rust 端返回 ApiResponse<T>，前端需要取 data
    if (response && typeof response === 'object' && 'success' in response) {
      if (!response.success) {
        throw new Error(response.errorMessage || '操作失败');
      }
      return response.data as R;
    }
    return response as R;
  } catch (error: any) {
    const errMsg = typeof error === 'string' ? error : error?.message || '未知错误';
    throw new Error(errMsg);
  }
}
