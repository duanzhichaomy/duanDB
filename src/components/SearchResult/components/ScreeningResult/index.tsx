// @ts-nocheck
import React, { useEffect, useContext, useRef, forwardRef, useImperativeHandle } from 'react';
import classnames from 'classnames';
import styles from './index.less';
import Iconfont from '@/components/Iconfont';
import SingleFileMonacoEditor from '@/components/SingleFileMonacoEditor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { IExecuteSqlParams } from '@/service/sql';
import { Context } from '@/components/SearchResult';

interface IProps {
  className?: string;
  promptWord: any[];
  getTableData: (params?: Partial<IExecuteSqlParams>) => void;
}

export interface IScreeningResultRefFunction {
  setOrderByValue: (value: string) => void;
  search: (extraParams?: Partial<IExecuteSqlParams>) => void;
}

const keywordHintList = [
  'AND',
  'OR',
  'NOT',
  'IS',
  'NULL',
  'IN',
  'IS NOT NULL',
  'IS NULL',
  'IS NOT',
  'NOT IN',
  'EXISTS',
  'BETWEEN',
  'LIKE',
  'ASC',
  'DESC',
]

export default forwardRef<IScreeningResultRefFunction, IProps>((props, ref) => {
  const { promptWord, getTableData } = props;
  const { notChangedSql } = useContext(Context);
  const [isActive, setIsActive] = React.useState(false);
  const whereSingleFileMonacoEditorRef = React.useRef<any>(null);
  const orderBySingleFileMonacoEditorRef = React.useRef<any>(null);

  // 用 ref 持有最新的 promptWord，让补全 provider 每次被调用时都能拿到最新字段列表，
  // 避免因为搜索刷新 headerList 后需要 dispose / 重新注册带来的时序问题
  const promptWordRef = useRef(promptWord);
  useEffect(() => {
    promptWordRef.current = promptWord;
  }, [promptWord]);

  // 只在 WHERE / ORDER BY 编辑器聚焦期间，向 Monaco 的 sql 语言注册本地补全 provider；
  // 失焦时通过 cleanup 一次性 dispose，避免污染全局 sql 语言的补全
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const fieldProvider = monaco.languages.registerCompletionItemProvider('sql', {
      // 除字母外，在空格/逗号/括号/点后也自动弹出建议，
      // 让用户在 `id=2285 and ` 的空格后直接看到全部字段
      triggerCharacters: [' ', ',', '(', '.'],
      provideCompletionItems: () => {
        const current = promptWordRef.current || [];
        return {
          suggestions: current.slice(1).map((item: any) => ({
            insertText: item.name,
            kind: monaco.languages.CompletionItemKind.Field,
            label: item.name,
          })),
        };
      },
    });

    const keywordProvider = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '('],
      provideCompletionItems: () => ({
        suggestions: keywordHintList.map((item) => ({
          insertText: item,
          kind: monaco.languages.CompletionItemKind.Keyword,
          label: item,
        })),
      }),
    });

    return () => {
      fieldProvider.dispose();
      keywordProvider.dispose();
    };
  }, [isActive]);

  const search = (extraParams?: Partial<IExecuteSqlParams>) => {
    const whereValue = whereSingleFileMonacoEditorRef.current?.getAllContent().trim() || '';
    const orderByValue = orderBySingleFileMonacoEditorRef.current?.getAllContent().trim() || '';
    let sql = whereValue ? notChangedSql + ' WHERE ' + whereValue : notChangedSql;
    sql = orderByValue ? sql + ' ORDER BY ' + orderByValue : sql;
    getTableData({ sql, ...extraParams });
  };

  const focusChange = (_isActive: boolean) => {
    setIsActive(_isActive);
  };

  useImperativeHandle(ref, () => ({
    setOrderByValue: (value: string) => {
      orderBySingleFileMonacoEditorRef.current?.setValue(value);
    },
    search,
  }));

  return (
    <div className={styles.screeningResult}>
      <div className={styles.whereBox}>
        <div className={styles.titleBox}>
          <Iconfont box boxSize={20} classNameBox={styles.titleIcon} code="&#xe66a;" />
          <div
            className={classnames(styles.title, {
              [styles.activeTitle]: true,
            })}
          >
            WHERE
          </div>
        </div>
        <SingleFileMonacoEditor
          ref={whereSingleFileMonacoEditorRef}
          focusChange={focusChange}
          handelEnter={search}
          className={styles.monacoEditor}
        />
      </div>
      <div className={styles.orderByBox}>
        <div className={styles.titleBox}>
          <Iconfont box boxSize={20} classNameBox={styles.titleIcon} code="&#xe69a;" />
          <div
            className={classnames(styles.title, {
              [styles.activeTitle]: true,
            })}
          >
            ORDER BY
          </div>
        </div>
        <SingleFileMonacoEditor
          ref={orderBySingleFileMonacoEditorRef}
          focusChange={focusChange}
          handelEnter={search}
          className={styles.monacoEditor}
        />
      </div>
    </div>
  );
});
