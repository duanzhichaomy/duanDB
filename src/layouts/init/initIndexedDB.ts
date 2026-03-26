import indexedDB from '@/indexedDB';

/** 初始化indexedDB */
const initIndexedDB = () => {
  indexedDB.createDB('duandb', 1).then((db) => {
    window._indexedDB = {
      duandb: db,
    };
  });
};

export default initIndexedDB;
