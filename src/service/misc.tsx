import createRequest from './base';
const testService = createRequest<null, boolean>('/api/system', { errorLevel: false });

export default {
  testService,
};
