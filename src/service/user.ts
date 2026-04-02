import createRequest from './base';
import { IUserVO } from '@/typings/user';

/** 获取用户信息 */
const getUser = createRequest<void, IUserVO | null>('/api/oauth/user_a', { method: 'get' });

export { getUser };
