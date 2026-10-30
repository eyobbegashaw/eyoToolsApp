import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Linking,
} from 'react-native';
import { marked, type Tokens } from 'marked';
import { Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  const { colors, fontScale } = useTheme();

  let tokens: any[] = [];
  try {
    tokens = marked.lexer(content || '');
  } catch {
    tokens = [];
  }

  const renderInlineToken = (token: Tokens.Generic, key: string | number): React.ReactNode => {
    switch (token.type) {
      case 'strong':
        return (
          <Text key={key} style={[styles.bold, { color: colors.text }]}>
            {token.tokens ? token.tokens.map((t: any, i: number) => renderInlineToken(t, i)) : token.text}
          </Text>
        );

      case 'em':
        return (
          <Text key={key} style={[styles.italic, { color: colors.text }]}>
            {token.tokens ? token.tokens.map((t: any, i: number) => renderInlineToken(t, i)) : token.text}
          </Text>
        );

      case 'codespan':
        return (
          <Text
            key={key}
            style={[
              styles.inlineCode,
              {
                backgroundColor: colors.cardSecondary,
                color: colors.purple,
                borderColor: colors.cardBorder,
                fontSize: 11 * fontScale,
              },
            ]}
          >
            {token.text}
          </Text>
        );

      case 'del':
        return (
          <Text key={key} style={[styles.strikethrough, { color: colors.textMuted }]}>
            {token.tokens ? token.tokens.map((t: any, i: number) => renderInlineToken(t, i)) : token.text}
          </Text>
        );

      case 'link':
        return (
          <Text
            key={key}
            onPress={() => {
              if (token.href) {
                Linking.openURL(token.href).catch(() => {});
              }
            }}
            style={[styles.link, { color: colors.primary }]}
          >
            {token.tokens ? token.tokens.map((t: any, i: number) => renderInlineToken(t, i)) : token.text}
          </Text>
        );

      case 'br':
        return '\n';

      case 'text':
      default:
        if (token.tokens && token.tokens.length > 0) {
          return token.tokens.map((t: any, i: number) => renderInlineToken(t, i));
        }
        return token.text || token.raw || '';
    }
  };

  const renderInlines = (inlines?: Tokens.Generic[]): React.ReactNode => {
    if (!inlines || !inlines.length) return null;
    return inlines.map((tok, idx) => renderInlineToken(tok, idx));
  };

  const renderBlockToken = (token: Tokens.Generic, index: number): React.ReactNode => {
    switch (token.type) {
      case 'heading': {
        const depth = token.depth || 1;
        const headingStyles = [
          styles.heading,
          depth === 1 && [styles.h1, { fontSize: 20 * fontScale, borderBottomColor: colors.cardBorder }],
          depth === 2 && [styles.h2, { fontSize: 17 * fontScale, borderBottomColor: colors.cardBorder }],
          depth === 3 && [styles.h3, { fontSize: 15 * fontScale }],
          depth === 4 && [styles.h4, { fontSize: 13 * fontScale }],
          depth === 5 && [styles.h5, { fontSize: 12 * fontScale }],
          depth === 6 && [styles.h6, { fontSize: 11 * fontScale }],
        ];

        return (
          <View key={index} style={styles.headingWrap}>
            <Text style={[headingStyles, { color: colors.text }]}>
              {token.tokens ? renderInlines(token.tokens) : token.text}
            </Text>
          </View>
        );
      }

      case 'paragraph':
        return (
          <Text
            key={index}
            style={[
              styles.paragraph,
              { color: colors.text, fontSize: 12.5 * fontScale },
            ]}
          >
            {token.tokens ? renderInlines(token.tokens) : token.text}
          </Text>
        );

      case 'code':
        return (
          <View
            key={index}
            style={[
              styles.codeBlockCard,
              {
                backgroundColor: colors.cardSecondary,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            {token.lang ? (
              <View style={styles.codeLangRow}>
                <Text style={[styles.codeLangBadge, { color: colors.textMuted }]}>
                  {token.lang.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text
                style={[
                  styles.codeText,
                  {
                    color: colors.text,
                    fontSize: 11 * fontScale,
                  },
                ]}
                selectable
              >
                {token.text}
              </Text>
            </ScrollView>
          </View>
        );

      case 'blockquote':
        return (
          <View
            key={index}
            style={[
              styles.blockquote,
              {
                borderLeftColor: colors.purple,
                backgroundColor: 'rgba(139, 92, 246, 0.08)',
              },
            ]}
          >
            {token.tokens
              ? token.tokens.map((subTok: any, subIdx: number) => renderBlockToken(subTok, subIdx))
              : (
                <Text style={[styles.blockquoteText, { color: colors.textSecondary, fontSize: 12 * fontScale }]}>
                  {token.text}
                </Text>
              )}
          </View>
        );

      case 'list': {
        const isOrdered = token.ordered;
        return (
          <View key={index} style={styles.listContainer}>
            {token.items?.map((item: any, itemIdx: number) => {
              const isTask = item.task;
              const isChecked = item.checked;

              return (
                <View key={itemIdx} style={styles.listItemRow}>
                  {isTask ? (
                    <View style={styles.taskIconWrap}>
                      <View
                        style={[
                          styles.checkboxBox,
                          {
                            borderColor: isChecked ? colors.purple : colors.textMuted,
                            backgroundColor: isChecked ? colors.purple : 'transparent',
                          },
                        ]}
                      >
                        {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                      </View>
                    </View>
                  ) : isOrdered ? (
                    <Text
                      style={[
                        styles.listMarker,
                        { color: colors.purple, fontSize: 12 * fontScale },
                      ]}
                    >
                      {itemIdx + 1}.
                    </Text>
                  ) : (
                    <View style={styles.bulletDotWrap}>
                      <View style={[styles.bulletDot, { backgroundColor: colors.purple }]} />
                    </View>
                  )}

                  <View style={styles.listItemContent}>
                    {item.tokens ? (
                      item.tokens.map((subTok: any, subIdx: number) => {
                        if (subTok.type === 'text' || subTok.type === 'paragraph') {
                          return (
                            <Text
                              key={subIdx}
                              style={[
                                styles.listItemText,
                                {
                                  color: isChecked ? colors.textMuted : colors.text,
                                  fontSize: 12 * fontScale,
                                  textDecorationLine: isChecked ? 'line-through' : 'none',
                                },
                              ]}
                            >
                              {subTok.tokens ? renderInlines(subTok.tokens) : subTok.text}
                            </Text>
                          );
                        }
                        return renderBlockToken(subTok, subIdx);
                      })
                    ) : (
                      <Text
                        style={[
                          styles.listItemText,
                          {
                            color: isChecked ? colors.textMuted : colors.text,
                            fontSize: 12 * fontScale,
                            textDecorationLine: isChecked ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {item.text}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      }

      case 'table': {
        const headers = token.header || [];
        const rows = token.rows || [];

        return (
          <ScrollView
            key={index}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.tableScroll, { borderColor: colors.cardBorder }]}
          >
            <View style={styles.table}>
              {/* Header Row */}
              <View style={[styles.tableRow, styles.tableHeaderRow, { backgroundColor: colors.cardSecondary }]}>
                {headers.map((cell: any, cIdx: number) => (
                  <View key={cIdx} style={[styles.tableCell, { borderRightColor: colors.cardBorder }]}>
                    <Text style={[styles.tableHeaderText, { color: colors.text, fontSize: 11 * fontScale }]}>
                      {cell.tokens ? renderInlines(cell.tokens) : cell.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Body Rows */}
              {rows.map((row: any[], rIdx: number) => {
                const isEven = rIdx % 2 === 0;
                return (
                  <View
                    key={rIdx}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor: isEven ? 'transparent' : 'rgba(139, 92, 246, 0.04)',
                        borderTopColor: colors.cardBorder,
                      },
                    ]}
                  >
                    {row.map((cell: any, cIdx: number) => (
                      <View key={cIdx} style={[styles.tableCell, { borderRightColor: colors.cardBorder }]}>
                        <Text style={[styles.tableCellText, { color: colors.text, fontSize: 11 * fontScale }]}>
                          {cell.tokens ? renderInlines(cell.tokens) : cell.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        );
      }

      case 'hr':
        return (
          <View
            key={index}
            style={[styles.hr, { backgroundColor: colors.cardBorder }]}
          />
        );

      case 'space':
        return <View key={index} style={{ height: 4 }} />;

      default:
        if (token.text) {
          return (
            <Text key={index} style={[styles.paragraph, { color: colors.text, fontSize: 12 * fontScale }]}>
              {token.tokens ? renderInlines(token.tokens) : token.text}
            </Text>
          );
        }
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {tokens.map((tok: any, idx: number) => renderBlockToken(tok, idx))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  headingWrap: {
    marginVertical: 4,
  },
  heading: {
    fontWeight: '800',
    lineHeight: 24,
  },
  h1: {
    fontWeight: '900',
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    marginBottom: 8,
    marginTop: 6,
  },
  h2: {
    fontWeight: '800',
    borderBottomWidth: 1,
    paddingBottom: 3,
    marginBottom: 6,
    marginTop: 6,
  },
  h3: {
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 4,
  },
  h4: {
    fontWeight: '700',
    marginBottom: 4,
  },
  h5: {
    fontWeight: '600',
    marginBottom: 2,
  },
  h6: {
    fontWeight: '600',
    marginBottom: 2,
  },
  paragraph: {
    lineHeight: 20,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '800',
  },
  italic: {
    fontStyle: 'italic',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  inlineCode: {
    fontFamily: 'monospace',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  codeBlockCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginVertical: 8,
  },
  codeLangRow: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  codeLangBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  codeText: {
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  blockquote: {
    borderLeftWidth: 3.5,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 6,
  },
  blockquoteText: {
    fontStyle: 'italic',
    lineHeight: 18,
  },
  listContainer: {
    marginBottom: 8,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDotWrap: {
    width: 16,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  listMarker: {
    width: 20,
    fontWeight: '700',
    lineHeight: 18,
  },
  taskIconWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  checkboxBox: {
    width: 13,
    height: 13,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemContent: {
    flex: 1,
  },
  listItemText: {
    lineHeight: 18,
  },
  tableScroll: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
  },
  table: {
    minWidth: 260,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    borderBottomWidth: 1.5,
  },
  tableCell: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRightWidth: 0.5,
    minWidth: 80,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontWeight: '800',
  },
  tableCellText: {
    lineHeight: 16,
  },
  hr: {
    height: 1,
    marginVertical: 10,
  },
});
