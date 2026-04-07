import { useEffect } from 'react';
import {useTheme} from '@/hooks/useTheme';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { ThemeType } from '@/constants';
 
// 如果用户点击的不是可复制的元素，就清空选中的内容
// 将颜色值标准化为 #RRGGBB 格式（Monaco Editor 要求完整的 6 位十六进制）
function normalizeColor(color: string): string {
  if (!color) return '#000000';
  const s = color.trim();
  // #RGB → #RRGGBB
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  }
  // rgb(r, g, b) → #RRGGBB
  const rgbMatch = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return s;
}

function useMonacoTheme() {
  const [appTheme] = useTheme();
  // 监听主题色变化切换编辑器主题色
  useEffect(() => {
    const { colorPrimary, colorBgBase, colorTextBase  } = window._AppThemePack || {};
    const primary = normalizeColor(colorPrimary);
    const bgBase = normalizeColor(colorBgBase);
    const textBase = normalizeColor(colorTextBase);

    const colors = {
      'editor.lineHighlightBackground': primary + '14', // 当前行背景色
      'editor.selectionBackground': primary + '50', // 选中文本的背景色
      'editorLineNumber.activeForeground': primary, // 当前行号颜色
      'editorRuler.foreground': primary + '15', // 右侧竖线颜色
      'editor.foreground': textBase, // 文本颜色
      'editor.background': bgBase, // 背景色
    };

    monaco.editor.defineTheme(appTheme.backgroundColor, {
      base: appTheme.backgroundColor.includes(ThemeType.Dark) ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [],
      colors,
    });
    
    monaco.editor.setTheme(appTheme.backgroundColor);
  }, [appTheme.backgroundColor]);

}

export default useMonacoTheme;
