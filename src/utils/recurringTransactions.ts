import { RecurringTransaction, Transaction } from '../models/types';
import { getRecurringTransactions, getTransactions, saveTransaction, updateRecurringTransaction } from './storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 次回の発生日を計算する
 * @param recurringTransaction 定期取引
 * @param fromDate 計算の基準日（指定がなければ現在日時）
 * @returns 次回の発生日
 */
export const calculateNextOccurrence = (
  recurringTransaction: RecurringTransaction,
  fromDate: Date = new Date()
): Date | null => {
  const {
    frequency,
    interval,
    startDate,
    endDate,
    dayOfMonth,
    dayOfWeek,
    monthOfYear,
    lastGeneratedDate
  } = recurringTransaction;

  // 基準となる日付（最後の生成日がある場合はそれを基準に、なければ開始日から）
  const baseDate = lastGeneratedDate || startDate;
  
  // 終了日が設定されていて、それが基準日より前の場合は次の発生はない
  if (endDate && endDate < fromDate) {
    return null;
  }

  let nextDate = new Date(baseDate);

  switch (frequency) {
    case 'daily':
      // 毎日または数日おき
      nextDate.setDate(nextDate.getDate() + interval);
      break;

    case 'weekly':
      // 毎週または数週おき
      nextDate.setDate(nextDate.getDate() + (interval * 7));
      
      // 特定の曜日が指定されている場合
      if (dayOfWeek !== undefined) {
        // まず基本の週に進める
        while (nextDate < fromDate) {
          nextDate.setDate(nextDate.getDate() + 7 * interval);
        }
        
        // 次に対象曜日まで調整
        const currentDayOfWeek = nextDate.getDay();
        const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      }
      break;

    case 'monthly':
      // 毎月または数か月おき
      nextDate.setMonth(nextDate.getMonth() + interval);
      
      // 特定の日が指定されている場合
      if (dayOfMonth !== undefined) {
        // 日を特定の日に設定
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
      }
      
      // 基準日より前の場合、次の間隔に進める
      while (nextDate < fromDate) {
        nextDate.setMonth(nextDate.getMonth() + interval);
        
        if (dayOfMonth !== undefined) {
          // 日を特定の日に設定（月の最終日を超えないように調整）
          nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
        }
      }
      break;

    case 'yearly':
      // 毎年または数年おき
      nextDate.setFullYear(nextDate.getFullYear() + interval);
      
      // 特定の月と日が指定されている場合
      if (monthOfYear !== undefined && dayOfMonth !== undefined) {
        nextDate.setMonth(monthOfYear - 1); // monthOfYearは1-12、JavaScriptの月は0-11
        
        // 日を特定の日に設定（月の最終日を超えないように調整）
        const lastDayOfMonth = new Date(nextDate.getFullYear(), monthOfYear, 0).getDate();
        nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
      }
      
      // 基準日より前の場合、次の間隔に進める
      while (nextDate < fromDate) {
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        
        if (monthOfYear !== undefined && dayOfMonth !== undefined) {
          nextDate.setMonth(monthOfYear - 1);
          const lastDayOfMonth = new Date(nextDate.getFullYear(), monthOfYear, 0).getDate();
          nextDate.setDate(Math.min(dayOfMonth, lastDayOfMonth));
        }
      }
      break;
  }

  // 終了日がある場合、それを超えていないか確認
  if (endDate && nextDate > endDate) {
    return null;
  }

  return nextDate;
};

/**
 * 定期取引から実際のトランザクションを生成する
 * @param recurringTransaction 定期取引
 * @param generationDate 生成日
 * @returns 生成されたトランザクション
 */
export const generateTransactionFromRecurring = (
  recurringTransaction: RecurringTransaction,
  generationDate: Date
): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> => {
  return {
    type: recurringTransaction.type,
    amount: recurringTransaction.amount,
    date: new Date(generationDate),
    description: recurringTransaction.title,
    categoryId: recurringTransaction.categoryId,
    accountId: recurringTransaction.accountId,
    paymentMethodId: recurringTransaction.paymentMethodId,
    status: 'completed',
    recurringTransactionId: recurringTransaction.id,
  };
};

/**
 * すべての定期取引をチェックし、必要に応じてトランザクションを生成する
 * @returns 処理結果サマリー（生成数など）
 */
export const processRecurringTransactions = async (): Promise<{
  processed: number;
  created: number;
  errors: number;
}> => {
  try {
    const recurringTransactions = await getRecurringTransactions();
    const currentDate = new Date();
    
    let processed = 0;
    let created = 0;
    let errors = 0;

    // ステータスがactiveの定期取引のみを処理
    const activeRecurringTransactions = recurringTransactions.filter(rt => rt.status === 'active');

    for (const rt of activeRecurringTransactions) {
      processed++;
      
      try {
        // 次の発生日を計算
        const nextOccurrence = calculateNextOccurrence(rt);
        
        // 次の発生日がなければスキップ（終了日に達した場合など）
        if (!nextOccurrence) {
          continue;
        }
        
        // 現在日より前または当日の場合のみ処理
        if (nextOccurrence <= currentDate) {
          // トランザクションを生成
          const transactionData = generateTransactionFromRecurring(rt, nextOccurrence);
          await saveTransaction(transactionData);
          created++;
          
          // 定期取引の最終生成日を更新
          await updateRecurringTransaction(rt.id, {
            lastGeneratedDate: nextOccurrence
          });
        }
      } catch (err) {
        console.error(`定期取引(${rt.id})の処理中にエラーが発生しました:`, err);
        errors++;
      }
    }

    return { processed, created, errors };
  } catch (error) {
    console.error('定期取引の処理中にエラーが発生しました:', error);
    throw error;
  }
};

/**
 * アプリ起動時に実行する定期取引のチェック
 * 最後の実行から一定期間経過している場合のみ処理を実行
 */
export const checkRecurringTransactionsOnStartup = async (): Promise<void> => {
  try {
    // 最後に処理した日時をAsyncStorageから取得
    const lastProcessedTimeString = await AsyncStorage.getItem('lastRecurringTransactionProcessTime');
    const currentTime = new Date().getTime();
    
    // 最後の実行時間がない、または8時間以上経過している場合に処理を実行
    if (!lastProcessedTimeString || (currentTime - parseInt(lastProcessedTimeString, 10)) > 8 * 60 * 60 * 1000) {
      const result = await processRecurringTransactions();
      console.log('定期取引の処理結果:', result);
      
      // 処理時間を保存
      await AsyncStorage.setItem('lastRecurringTransactionProcessTime', currentTime.toString());
    }
  } catch (error) {
    console.error('定期取引の起動時チェックでエラーが発生しました:', error);
  }
};

/**
 * デバッグ用: 特定の期間内のすべての定期取引の発生日をシミュレートする
 */
export const simulateRecurringTransactions = (
  recurringTransaction: RecurringTransaction,
  startDate: Date,
  endDate: Date
): Date[] => {
  const occurrences: Date[] = [];
  let currentDate = new Date(Math.max(recurringTransaction.startDate.getTime(), startDate.getTime()));
  
  // 初期の発生日がstartDate以前の場合、startDateまでスキップ
  while (currentDate < startDate) {
    const nextDate = calculateNextOccurrence(recurringTransaction, currentDate);
    if (!nextDate) break;
    currentDate = nextDate;
  }
  
  // startDateからendDateまでの発生日をすべて取得
  while (currentDate <= endDate) {
    occurrences.push(new Date(currentDate));
    
    // 一時的にlastGeneratedDateを現在の日付に設定したオブジェクトを作成
    const tempRT: RecurringTransaction = {
      ...recurringTransaction,
      lastGeneratedDate: currentDate
    };
    
    const nextDate = calculateNextOccurrence(tempRT);
    if (!nextDate) break;
    currentDate = nextDate;
  }
  
  return occurrences;
}; 