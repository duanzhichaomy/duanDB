import { clearOlderLocalStorage } from '@/utils';
import initIndexedDB from './initIndexedDB';
import registerTauriApi from './registerElectronApi';
import registerMessage from './registerMessage';
import registerNotification from './registerNotification';
import { getLang, setLang } from '@/utils/localStorage';
import { LangType } from '@/constants';
import { initLogInterceptor } from '@/store/log';

const init = () => {
  // 尽早初始化日志拦截，捕获所有后续日志
  initLogInterceptor();

  clearOlderLocalStorage();

  initLang();
  initIndexedDB();
  registerTauriApi();

  registerMessage();
  registerNotification();
};

// 初始化语言
const initLang = () => {
  const lang = getLang();
  if (!lang) {
    setLang(LangType.EN_US);
    document.documentElement.setAttribute('lang', LangType.EN_US);
    const date = new Date('2030-12-30 12:30:00').toUTCString();
    document.cookie = `DUANDB.LOCALE=${lang};Expires=${date}`;
  }
};

export default init;
