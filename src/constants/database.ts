import mysqlLogo from '@/assets/img/databaseImg/mysql.png';

import { IDatabase } from '@/typings';
import { DatabaseTypeCode } from '@/constants';

export enum ConnectionEnvType {
  DAILY = 'DAILY',
  PRODUCT = 'PRODUCT',
}

export const databaseMap: {
  [keys: string]: IDatabase;
} = {
  [DatabaseTypeCode.MYSQL]: {
    name: 'MySQL',
    img: mysqlLogo,
    code: DatabaseTypeCode.MYSQL,
    // port: 3306,
    icon: '\uec6d',
  },
};

export const databaseTypeList = Object.keys(databaseMap).map((keys) => {
  return databaseMap[keys];
});
