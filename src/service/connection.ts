import { IPageResponse, IConnectionDetails, ICreateConnectionDetails, IConnectionEnv, IPageParams, IConnectionListItem } from '@/typings';
import createRequest from './base';

/**
 * 查询连接列表
 */
const getList = createRequest<IPageParams, IPageResponse<IConnectionListItem>>(
  '/api/connection/datasource/list',
  {},
);

const getDetails = createRequest<{ id: number }, IConnectionDetails>('/api/connection/datasource/:id', {});

const save = createRequest<ICreateConnectionDetails, number>('/api/connection/datasource/create', {
  method: 'post',
  delayTime: true,
});

const close = createRequest<{ id: number }, void>('/api/connection/datasource/close', { method: 'post' });

const test = createRequest<IConnectionDetails, boolean>('/api/connection/datasource/pre_connect', {
  method: 'post',
  delayTime: true,
});

const update = createRequest<IConnectionDetails, void>('/api/connection/datasource/update', { method: 'post' });

const remove = createRequest<{ id: number }, void>('/api/connection/datasource/:id', { method: 'delete' });

const getDatabaseList = createRequest<{ dataSourceId: number; refresh?: boolean }, any>('/api/rdb/database/list', {
  method: 'get',
});

const getSchemaList = createRequest<{ dataSourceId: number; databaseName?: string; refresh?: boolean }, any>(
  '/api/rdb/schema/list',
  { method: 'get' },
);

const getEnvList = createRequest<void, IConnectionEnv[]>('/api/common/environment/list_all', { errorLevel: false });

export default {
  getEnvList,
  getList,
  getDetails,
  save,
  test,
  update,
  remove,
  getDatabaseList,
  getSchemaList,
  close,
};
