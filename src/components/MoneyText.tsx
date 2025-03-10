import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { TransactionType } from '../models/types';

interface MoneyTextProps {
  amount: number;
  isIncome?: boolean;
  size?: 'small' | 'medium' | 'large'; // フォントサイズの指定
  showSign?: boolean; // +/-記号を表示するかどうか
  style?: TextStyle; // 追加のスタイル
  type?: TransactionType; // 取引タイプ（任意）
}

/**
 * お金（金額）を表示するための共通コンポーネント
 * 数字の色は黒/グレー/赤に限定し、用途に応じて適切な色を適用します
 */
export const MoneyText: React.FC<MoneyTextProps> = ({ 
  amount, 
  isIncome = false, 
  size = 'medium',
  showSign = false,
  style,
  type
}) => {
  // 金額の符号に基づいて色を決定
  // 収入（プラス）: 黒
  // 支出（マイナス）: 赤
  // 振替・投資: グレー
  // ゼロ: グレー
  const getColorForAmount = () => {
    if (amount === 0) return '#757575'; // グレー
    
    // 振替と投資はグレー
    if (type === 'transfer' || type === 'investment') return '#757575'; // グレー
    
    // 支出の場合は赤
    if (!isIncome && amount > 0) return '#E53935'; // 赤
    
    // それ以外（収入など）は黒
    return '#212121'; // 黒
  };
  
  // サイズに基づいてフォントサイズを設定
  const getFontSize = () => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 24;
      case 'medium':
      default: return 18;
    }
  };
  
  // 表示用の金額を整形
  const formattedAmount = amount.toLocaleString();
  
  // 符号を表示する場合
  const sign = showSign ? (isIncome || amount > 0 ? '+' : '-') : '';
  
  // 絶対値を表示（符号は別に処理）
  const displayAmount = showSign ? Math.abs(amount).toLocaleString() : formattedAmount;
  
  return (
    <Text
      style={[
        styles.text,
        { color: getColorForAmount(), fontSize: getFontSize() },
        style
      ]}
    >
      {sign}¥{displayAmount}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: 'bold',
  },
});

export default MoneyText; 