import React from 'react';
import classnames from 'classnames';
import styles from './index.less';
import {
  Play,
  PlaySquare,
  Eye,
  Save,
  Download,
  AlignLeft,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Check,
  Trash2,
  Undo2,
  FileCode,
  Upload,
  Filter,
  ArrowUpDown,
  Minus,
  RotateCw,
  Bell,
  PanelLeftOpen,
  PanelRightOpen,
  Minimize2,
  Maximize2,
  Square,
  Copy,
  CircleAlert,
  CircleCheck,
  CircleX,
  Link,
  StopCircle,
  Database,
  Table2,
  FolderOpen,
  FolderClosed,
  Folder,
  FileText,
  Settings,
  Info,
  Pencil,
  Pin,
  Columns3,
  ListTree,
  Key,
  FunctionSquare,
  Workflow,
  Zap,
  LayoutList,
  TableProperties,
  PenLine,
  Send,
  Grid3X3,
  Globe,
  ArrowUpCircle,
  HelpCircle,
  Shield,
  PlugZap,
  Package,
  Hash,
  ScrollText,
  Terminal,
  FileUp,
  type LucideIcon,
} from 'lucide-react';

// iconfont unicode -> Lucide icon 映射
const lucideMap: Record<string, LucideIcon> = {
  // === 执行/播放 ===
  '\ue637': Play,           // 执行 SQL
  '\ue656': PlaySquare,     // 执行单条
  '\ue606': Eye,            // EXPLAIN / 查看
  '\ue665': Eye,            // Alter 查看

  // === 保存/文件 ===
  '\ue645': Save,           // 保存
  '\ue936': Save,           // 保存 (baocun)
  '\ue66c': Download,       // 另存为文件 / download

  // === 格式化 ===
  '\ue7f8': AlignLeft,      // 格式化 SQL
  '\ue64f': AlignLeft,      // 格式化

  // === 搜索/筛选 ===
  '\ue600': Search,         // 搜索
  '\ue888': Filter,         // 筛选/搜索
  '\ue66a': Filter,         // WHERE
  '\ue69a': ArrowUpDown,    // ORDER BY

  // === 关闭/删除 ===
  '\ue634': X,              // 关闭 tab
  '\ue66f': X,              // 关闭窗口
  '\ue64e': Trash2,         // 删除
  '\ue644': Minus,          // 删除行
  '\ue6a7': Trash2,         // 删除行 (右键菜单)
  '\ue792': Trash2,         // 删除操作

  // === 箭头/方向 ===
  '\ue674': ChevronLeft,    // 左箭头
  '\ue672': ChevronRight,   // 右箭头
  '\ue670': PanelLeftOpen,  // 面板左开
  '\ue673': PanelRightOpen, // 面板右开
  '\ue641': ChevronDown,    // 展开箭头
  '\u100be': ChevronDown,   // 下箭头

  // === 加号/新增 ===
  '\ue631': Plus,           // 新增
  '\ueb78': Plus,           // 加号_o
  '\ue63a': Plus,           // 创建控制台
  '\ue726': Plus,           // 创建表按钮

  // === 刷新/重启 ===
  '\ue668': RefreshCw,      // 刷新
  '\ue62d': RefreshCw,      // 刷新 (表格)
  '\uec08': RotateCw,       // 刷新按钮
  '\ue662': RotateCw,       // 重启

  // === 更多/下拉 ===
  '\ue601': MoreHorizontal, // 更多 tabs

  // === 勾选 ===
  '\ue617': Check,          // 选中色

  // === 撤销 ===
  '\ue6e2': Undo2,          // 撤销

  // === SQL/代码 ===
  '\ue654': FileCode,       // 查看 SQL
  '\ue6bb': FileCode,       // 打开 SQL

  // === 提交/上传/发送 ===
  '\ue687': Upload,         // 提交
  '\ue643': Send,           // 发送/回车

  // === 通知 ===
  '\ue661': Bell,           // 提醒/通知

  // === 窗口控制 ===
  '\ue671': Minimize2,      // 最小化
  '\ue66e': Maximize2,      // 最大化
  '\ue66b': Square,         // 还原

  // === 复制 ===
  '\uec7a': Copy,           // 复制
  '\ueb4e': Copy,           // 复制错误

  // === 状态指示 ===
  '\ue605': CircleCheck,    // 成功
  '\ue87c': CircleX,        // 失败
  '\ue60c': CircleAlert,    // 错误通知
  '\ue62e': CircleCheck,    // 成功状态指示
  '\ue755': CircleX,        // 错误状态指示
  '\ue760': Package,        // 空状态指示
  '\ue650': CircleCheck,    // 成功/执行指示

  // === 停止 ===
  '\ue652': StopCircle,     // 停止/取消

  // === 连接 ===
  '\ue622': Link,           // 新建连接
  '\ue638': Link,           // 无连接
  '\ue6b2': Globe,          // 网络/连接
  '\uec57': PlugZap,        // 建立连接

  // === 数据库相关 ===
  '\ue669': Database,       // database
  '\uec6d': Database,       // MySQL
  '\ue65a': Database,       // SQLite
  '\ue696': Database,       // 数据库类型
  '\ue744': Database,       // 数据库选项
  '\ue816': Database,       // 备份/导出数据库
  '\ue62c': Database,       // 数据库配置

  // === 表相关 ===
  '\ue611': Table2,         // 查看所有表
  '\ue6b6': Table2,         // 创建表
  '\ue6f3': TableProperties, // 编辑表
  '\ue618': PenLine,        // 编辑表数据
  '\ue647': Columns3,       // 表结构

  // === 树/文件夹 ===
  '\ue63e': FileText,       // 树节点文件
  '\ueac5': FolderClosed,   // 树折叠
  '\ueac7': FolderOpen,     // 树展开
  '\ueabe': Folder,         // 文件夹占位
  '\ue65b': ListTree,       // Schema

  // === 数据库对象 ===
  '\ue70c': Eye,            // 视图 (View)
  '\ue73c': Workflow,       // 存储过程 (Procedure)
  '\ue76a': FunctionSquare, // 函数 (Function)
  '\ue64a': Zap,            // 触发器 (Trigger)
  '\ue775': Key,            // 主键 (Primary Key)
  '\uec83': Terminal,       // 控制台 (Console)

  // === 右键菜单操作 ===
  '\ue651': LayoutList,     // 右键菜单操作
  '\ue602': Pencil,         // 重命名
  '\ue627': Pin,            // 固定/取消固定

  // === 设置 ===
  '\ue795': Settings,       // 基础设置
  '\ue630': Settings,       // 设置齿轮
  '\ue619': Settings,       // 设置
  '\ue65c': Info,           // 关于我们
  '\ue69c': ArrowUpCircle,  // 升级/更新
  '\ue67d': ArrowUpCircle,  // 版本更新

  // === 其他 ===
  '\ue658': Shield,         // 权限
  '\ue788': Eye,            // 查看
  '\ue8db': Copy,           // 克隆
  '\ue8e8': Info,           // 信息
  '\ue8ad': ScrollText,     // 日志
  '\ue657': HelpCircle,     // 对话气泡/帮助
  '\ue663': Hash,           // Schema/组织
  '\ue691': Grid3X3,        // 空间/模型
  '\ue646': Settings,       // AI 设置 (commented)
  '\ue63f': Globe,          // 代理设置 (commented)
  '\ue716': Bell,           // 提醒变体
  '\ue6cc': Bell,           // 提醒变体
  '\ue659': ArrowUpCircle,  // 全局升级
  '\ue6a8': HelpCircle,     // 问号
  '\ue686': HelpCircle,     // 答案
  '\u100bd': Send,          // 发送
  '\ue667': Shield,         // 权限
  '\ue6a9': Database,       // 数据库_jurassic
  '\ue65d': Minus,          // 减去
};

// 将各种 code 格式统一为 unicode 字符
function normalizeCode(code: string): string {
  // HTML entity 格式: &#xe637; 或 &#x100be;
  const htmlEntityMatch = code.match(/^&#x([0-9a-fA-F]+);$/);
  if (htmlEntityMatch) {
    return String.fromCodePoint(parseInt(htmlEntityMatch[1], 16));
  }
  return code;
}

interface IProps extends React.HTMLAttributes<HTMLElement> {
  code: string;
  box?: boolean;
  boxSize?: number;
  size?: number;
  className?: string;
  classNameBox?: string;
  active?: boolean;
}

const Iconfont = (props: IProps) => {
  const { box, boxSize = 32, size = 14, className, classNameBox, active, code, ...args } = props;

  const normalizedCode = normalizeCode(code);
  const LucideComponent = lucideMap[normalizedCode] || HelpCircle;

  const iconSize = size || 14;
  const lucideIcon = <LucideComponent size={iconSize} strokeWidth={1.75} />;

  if (box) {
    return (
      <div
        {...args}
        style={
          {
            '--icon-box-size': `${boxSize}px`,
            '--icon-size': `${iconSize}px`,
          } as any
        }
        className={classnames(classNameBox, styles.iconBox, { [styles.activeIconBox]: active })}
      >
        <span className={classnames(className, styles.lucideIcon)}>{lucideIcon}</span>
      </div>
    );
  }
  return (
    <span
      style={
        {
          '--icon-size': `${iconSize}px`,
        } as any
      }
      className={classnames(className, styles.lucideIcon)}
      {...args}
    >
      {lucideIcon}
    </span>
  );
};

export default Iconfont;
