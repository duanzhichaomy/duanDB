// @ts-nocheck
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import sqlService from '@/service/sql';
import i18n from '@/i18n';

let fieldList: Record<string, Array<{ name: string; tableName: string }>> = {};
let pendingRequests: Record<string, boolean> = {};

/** 当前库下的表 */
let intelliSenseField = monaco.languages.registerCompletionItemProvider('sql', {
  provideCompletionItems: () => {
    return {
      suggestions: [],
    };
  },
});

export const resetSenseField = () => {
  intelliSenseField.dispose();
}

const addIntelliSenseField = async (props: {
  tableName: string;
  dataSourceId: number;
  databaseName: string;
  schemaName?: string;
}) => {
  const { tableName, dataSourceId, databaseName, schemaName } = props;

  if (!fieldList[tableName] && !pendingRequests[tableName]) {
    pendingRequests[tableName] = true;
    try {
      const data = await Promise.race([
        sqlService.getAllFieldByTable({
          dataSourceId,
          databaseName,
          schemaName,
          tableName,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
      ]);
      fieldList[tableName] = data;
    } catch {
      // 超时或请求失败，静默忽略
    } finally {
      delete pendingRequests[tableName];
    }
  }
};

function checkFieldContext(text) {
  const normalizedText = text.trim().toUpperCase();
  const columnKeywords = ['SELECT', 'WHERE', 'AND', 'OR', 'GROUP BY', 'ORDER BY', 'SET'];

  for (const keyword of columnKeywords) {
    if (normalizedText.endsWith(keyword)) {
      return true;
    }
  }

  return false;
}

const registerIntelliSenseField = (tableList: string[], dataSourceId, databaseName, schemaName) => {
  resetSenseField();
  fieldList = {};
  pendingRequests = {};
  intelliSenseField = monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: [' ', ',', '.', '('],
    provideCompletionItems: async (model, position, _context, token) => {
      // 获取到当前行文本
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const isFieldContext = checkFieldContext(textUntilPosition);
      const match = textUntilPosition.match(/(\b\w+\b)[^\w]*$/);

      let word;
      if (match) {
        word = match[1];
      }

      if (!word) {
        return { suggestions: [] };
      }

      if (word && tableList.includes(word) && !fieldList[word] && !pendingRequests[word]) {
        pendingRequests[word] = true;
        try {
          const data = await Promise.race([
            sqlService.getAllFieldByTable({
              dataSourceId,
              databaseName,
              schemaName,
              tableName: word,
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
          ]);
          if (token.isCancellationRequested) {
            return { suggestions: [] };
          }
          fieldList[word] = data;
        } catch {
          // 超时或请求失败，返回已有的建议
        } finally {
          delete pendingRequests[word];
        }
      }

      const suggestions: monaco.languages.CompletionItem[] = Object.keys(fieldList).reduce((acc, cur) => {
        const arr = fieldList[cur].map((fieldObj) => ({
          label: {
            label: fieldObj.name,
            detail: `(${fieldObj.tableName})`,
            description: i18n('sqlEditor.text.fieldName'),
          },
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: fieldObj.name,
          sortText: isFieldContext ? '01' : '08',
        }));

        return [...acc, ...arr];
      }, []);

      return {
        suggestions,
      };
    },
  });
};

export { intelliSenseField, registerIntelliSenseField, addIntelliSenseField };
