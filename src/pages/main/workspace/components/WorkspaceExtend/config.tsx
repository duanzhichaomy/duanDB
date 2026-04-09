import i18n from '@/i18n';
import GlobalExtendComponents from './GlobalExtendComponents';
import SaveList from '../SaveList';
import ViewDDL from '@/components/ViewDDL';

interface IToolbar {
  code: string;
  title: string;
  icon: string;
  components: any;
}

export enum GlobalComponents {
  view_ddl = 'viewDDL',
  save_list = 'saveList'
}

export const globalComponents: {
  [key in GlobalComponents]: any;
} = {
  [GlobalComponents.view_ddl]: ViewDDL,
  [GlobalComponents.save_list]: SaveList
}

export const extendConfig: IToolbar[] = [
  {
    code: 'info',
    title: i18n('common.title.info'),
    icon: '\ue8e8',
    components: GlobalExtendComponents,
  },
];
