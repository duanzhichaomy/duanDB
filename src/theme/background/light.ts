import { theme } from 'antd';
import { PrimaryColorType } from '@/constants';
import { commonToken } from '../common';

type IAntdPrimaryColor = {
  [key in PrimaryColorType]: any;
};

// 主题色
const antdPrimaryColor: IAntdPrimaryColor = {
  [PrimaryColorType.Polar_Green]: {
    colorPrimary: '#039e74',
  },
  [PrimaryColorType.Golden_Purple]: {
    colorPrimary: '#9373ee',
  },
  [PrimaryColorType.Polar_Blue]: {
    colorPrimary: '#587df1',
  },
  [PrimaryColorType.Silver]: {
    colorPrimary: '#8e8374',
  },
  [PrimaryColorType.Red]: {
    colorPrimary: '#fd6874',
  },
  [PrimaryColorType.Orange]: {
    colorPrimary: '#fa8c16',
  },
  [PrimaryColorType.Blue2]: {
    colorPrimary: '#00c3ee',
  },
  [PrimaryColorType.Gold]: {
    colorPrimary: '#9a7d56',
  },
};

const antdLightTheme = {
  algorithm: [theme.defaultAlgorithm, theme.compactAlgorithm],
  customName: 'light',
  antdPrimaryColor,
  token: {
    ...commonToken,
    // colorText: "#232429",
    colorTextBase: '#232429',
    colorBgBase: '#ffffff',
    colorHoverBg: 'rgba(0, 0, 0, 0.04)',
    colorBgContainer: '#ffffff',
    colorBgSubtle: '#f4f5f7',
    colorBgElevated: '#ffffff',
    colorBorder: '#e1e3e6',
    colorBorderSecondary: '#ebedf0',
  },
};

export default antdLightTheme;
