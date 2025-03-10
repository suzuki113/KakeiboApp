import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction, Category, PaymentMethod, Account, InvestmentItem, TransactionStatus } from '../models/types';
import { calculateUpcomingSettlements } from './calculations';

const STORAGE_KEYS = {
  TRANSACTIONS: 'transactions',
  CATEGORIES: 'categories',
  PAYMENT_METHODS: 'paymentMethods',
  ACCOUNTS: 'accounts',
};

// デフォルトカテゴリー
const DEFAULT_CATEGORIES: Category[] = [
  {
    id: '1',
    name: '食費',
    type: 'expense',
    color: '#FF5252',
    icon: 'food',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: '交通費',
    type: 'expense',
    color: '#FF9800',
    icon: 'train',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: '給与',
    type: 'income',
    color: '#4CAF50',
    icon: 'cash',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// デフォルトの支払い方法
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: '1',
    name: '現金',
    type: 'cash',
    accountId: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'クレジットカード',
    type: 'credit_card',
    accountId: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: '銀行振込',
    type: 'bank_transfer',
    accountId: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: '電子マネー',
    type: 'electronic_money',
    accountId: '',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// デフォルトの銀行口座
const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: '1',
    name: '現金',
    type: 'cash',
    balance: 0,
    currency: 'JPY',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: '普通預金',
    type: 'bank',
    balance: 0,
    currency: 'JPY',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// カテゴリーの取得
export const getCategories = async (): Promise<Category[]> => {
  try {
    const categoriesJson = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!categoriesJson) {
      // デフォルトカテゴリーを保存して返す
      await AsyncStorage.setItem(
        STORAGE_KEYS.CATEGORIES,
        JSON.stringify(DEFAULT_CATEGORIES)
      );
      return DEFAULT_CATEGORIES;
    }

    const categories = JSON.parse(categoriesJson);
    return categories.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
    }));
  } catch (error) {
    console.error('Failed to get categories:', error);
    return DEFAULT_CATEGORIES;
  }
};

// カテゴリーの保存
export const saveCategory = async (
  category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Category> => {
  try {
    const categories = await getCategories();
    
    const newCategory: Category = {
      ...category,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedCategories = [...categories, newCategory];
    await AsyncStorage.setItem(
      STORAGE_KEYS.CATEGORIES,
      JSON.stringify(updatedCategories)
    );

    return newCategory;
  } catch (error) {
    console.error('Failed to save category:', error);
    throw error;
  }
};

// カテゴリーの更新
export const updateCategory = async (
  id: string,
  updates: Partial<Omit<Category, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Category> => {
  try {
    const categories = await getCategories();
    const categoryIndex = categories.findIndex(c => c.id === id);
    
    if (categoryIndex === -1) {
      throw new Error('Category not found');
    }

    const updatedCategory: Category = {
      ...categories[categoryIndex],
      ...updates,
      updatedAt: new Date(),
    };

    categories[categoryIndex] = updatedCategory;
    await AsyncStorage.setItem(
      STORAGE_KEYS.CATEGORIES,
      JSON.stringify(categories)
    );

    return updatedCategory;
  } catch (error) {
    console.error('Failed to update category:', error);
    throw error;
  }
};

// カテゴリーの削除（論理削除）
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await updateCategory(id, { isActive: false });
  } catch (error) {
    console.error('Failed to delete category:', error);
    throw error;
  }
};

export const saveTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'relatedTransactionId' | 'creditCardSettlementDate'>) => {
  try {
    const now = new Date();
    const id = `transaction_${now.getTime()}`;
    
    // すべての取引にcompletedステータスを設定（自動入力を停止）
    const newTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: now,
      updatedAt: now,
      status: 'completed',
      relatedTransactionId: '',
      creditCardSettlementDate: undefined,
    };
    
    // 取引をAsyncStorageに保存
    const storedTransactionsJSON = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const storedTransactions: Transaction[] = storedTransactionsJSON
      ? JSON.parse(storedTransactionsJSON)
      : [];
    
    let updatedTransaction = newTransaction;
    
    // クレジットカード支払いの場合、引き落とし予定を更新
    if (transaction.paymentMethodId) {
      const paymentMethodsJSON = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
      const paymentMethods: PaymentMethod[] = paymentMethodsJSON
        ? JSON.parse(paymentMethodsJSON)
        : [];
      
      const paymentMethod = paymentMethods.find(pm => pm.id === transaction.paymentMethodId);
      
      // クレジットカードかつ、締め日と引き落とし日が設定されている場合
      if (paymentMethod && 
          paymentMethod.type === 'credit_card' && 
          paymentMethod.closingDay && 
          paymentMethod.billingDay) {
        
        console.log('クレジットカード取引を検出:', transaction);
        
        // 締め日と引き落とし日から引き落とし予定日を計算
        const transactionDate = new Date(transaction.date);
        const settlementDate = calculateSettlementDate(
          transactionDate,
          paymentMethod.closingDay,
          paymentMethod.billingDay
        );
        
        console.log('計算された引き落とし日:', settlementDate);
        
        // トランザクション情報を更新（引き落とし予定日を設定）
        updatedTransaction = {
          ...newTransaction,
          creditCardSettlementDate: settlementDate
        };
      }
    }
    
    // 更新されたトランザクションを保存
    const updatedTransactions = [...storedTransactions, updatedTransaction];
    await AsyncStorage.setItem(
      STORAGE_KEYS.TRANSACTIONS,
      JSON.stringify(updatedTransactions)
    );
    
    console.log('トランザクション保存完了:', updatedTransaction);
    
    // 引き落とし予定の再計算が必要であることを示すフラグを設定
    // DebitCalendarScreenでの明示的な更新時にのみ再計算される
    await AsyncStorage.setItem('debitSchedulesNeedUpdate', 'true');
    
    // 口座残高を更新
    await updateAccountBalances();
    
    return updatedTransaction;
  } catch (error) {
    console.error('トランザクション保存エラー:', error);
    throw error;
  }
};

/**
 * 引き落としカレンダーのスケジュールを更新する
 */
const updateDebitCalendarSchedules = async () => {
  try {
    // 取引データを取得
    const transactionsJSON = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const transactions: Transaction[] = transactionsJSON
      ? JSON.parse(transactionsJSON)
      : [];
    
    // 支払い方法データを取得
    const paymentMethodsJSON = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
    const paymentMethods: PaymentMethod[] = paymentMethodsJSON
      ? JSON.parse(paymentMethodsJSON)
      : [];
    
    // 口座データを取得
    const accountsJSON = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    const accounts: Account[] = accountsJSON
      ? JSON.parse(accountsJSON)
      : [];
    
    console.log('引き落とし予定の計算開始...');
    console.log('トランザクション数:', transactions.length);
    console.log('支払い方法数:', paymentMethods.length);
    
    // クレジットカードの引き落とし予定があるトランザクションを確認
    const creditCardTransactions = transactions.filter(t => 
      t.creditCardSettlementDate !== undefined && 
      t.paymentMethodId && 
      paymentMethods.some(pm => pm.id === t.paymentMethodId && pm.type === 'credit_card')
    );
    
    console.log('クレジットカード引き落とし予定のあるトランザクション:', creditCardTransactions.length);
    
    // 引き落とし予定を計算
    const settlementData = calculateUpcomingSettlements(
      transactions,
      paymentMethods,
      accounts
    );
    
    console.log('今月の引き落とし予定:', settlementData.currentMonthPayments.length);
    console.log('来月の引き落とし予定:', settlementData.nextMonthPayments.length);
    
    // 自動計算された引き落とし予定情報をAsyncStorageに保存
    await AsyncStorage.setItem('autoDebitSchedules', JSON.stringify({
      currentMonthPayments: settlementData.currentMonthPayments,
      nextMonthPayments: settlementData.nextMonthPayments,
      totalCurrentMonth: settlementData.totalCurrentMonth,
      totalNextMonth: settlementData.totalNextMonth,
      updatedAt: new Date().toISOString()
    }));
    
    return settlementData;
  } catch (error) {
    console.error('引き落とし予定更新エラー:', error);
    throw error;
  }
};

// 引き落とし日の計算（クレジットカードと口座引き落とし共通）
const calculateSettlementDate = (
  transactionDate: Date,
  closingDay: number,
  billingDay: number
): Date => {
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth(); // 0-11
  const day = transactionDate.getDate();
  
  // 締め日を取引日の月で設定
  const closingDate = new Date(year, month, closingDay);
  
  // 取引日が締め日を過ぎているかチェック
  const isAfterClosingDate = transactionDate > closingDate;
  
  // 引き落とし月を計算（締め日を過ぎていれば翌々月、そうでなければ翌月）
  let settlementMonth = isAfterClosingDate ? month + 2 : month + 1;
  let settlementYear = year;
  
  // 年をまたぐ場合の調整
  if (settlementMonth > 11) {
    settlementMonth = settlementMonth - 12;
    settlementYear += 1;
  }
  
  // 引き落とし日を設定して返却
  return new Date(settlementYear, settlementMonth, billingDay);
};

// 引き落としトランザクションの自動生成（クレジットカードと口座引き落とし共通）
const createSettlementTransaction = async (originalTransaction: Transaction) => {
  try {
    // 支出または投資のトランザクションでない場合はスキップ
    if (originalTransaction.type !== 'expense' && originalTransaction.type !== 'investment') {
      console.log('非支出トランザクションのため引き落とし処理はスキップされました');
      return;
    }

    if (!originalTransaction.creditCardSettlementDate) {
      console.error('Settlement date is missing for transaction');
      return;
    }
    
    // 支払い方法の情報を取得
    const paymentMethods = await getPaymentMethods();
    const paymentMethod = paymentMethods.find(pm => pm.id === originalTransaction.paymentMethodId);
    
    if (!paymentMethod) {
      console.error('Payment method not found');
      return;
    }
    
    // 既存のトランザクションを取得
    const existingTransactions = await getTransactions();
    
    // 同じ支払い方法と同じ引き落とし日の既存引き落し取引をすべて検索
    const existingSettlements = existingTransactions.filter(t => 
      t.status === 'settlement' &&
      t.paymentMethodId === originalTransaction.paymentMethodId &&
      t.creditCardSettlementDate &&
      t.creditCardSettlementDate.getFullYear() === originalTransaction.creditCardSettlementDate!.getFullYear() &&
      t.creditCardSettlementDate.getMonth() === originalTransaction.creditCardSettlementDate!.getMonth() &&
      t.creditCardSettlementDate.getDate() === originalTransaction.creditCardSettlementDate!.getDate()
    );
    
    // 既存の引き落とし取引がある場合
    if (existingSettlements.length > 0) {
      // 最初の引き落とし取引を取得して更新
      const existingSettlement = existingSettlements[0];
      
      // 既存の引き落としトランザクションの金額を更新
      const updatedAmount = existingSettlement.amount + originalTransaction.amount;
      await updateTransaction(existingSettlement.id, { amount: updatedAmount });
      
      // 元のトランザクションに関連IDを設定
      await updateTransaction(originalTransaction.id, { relatedTransactionId: existingSettlement.id });
    } else {
      // 新しい引き落としトランザクションを作成
      const settlementTransaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
        // 元のトランザクションと同じタイプを使用（expense, investment など）
        type: originalTransaction.type,
        amount: originalTransaction.amount,
        date: originalTransaction.creditCardSettlementDate,
        description: `${paymentMethod.name}引き落とし`,
        categoryId: originalTransaction.categoryId, // 同じカテゴリを使用
        accountId: paymentMethod.accountId, // 引き落とし元口座
        paymentMethodId: originalTransaction.paymentMethodId,
        status: 'settlement',
        creditCardSettlementDate: originalTransaction.creditCardSettlementDate,
      };
      
      // トランザクションを保存
      const newTransaction: Transaction = {
        ...settlementTransaction,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // 保存
      await AsyncStorage.setItem(
        STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify([...existingTransactions, newTransaction])
      );
      
      // 元のトランザクションに関連IDを設定
      await updateTransaction(originalTransaction.id, { relatedTransactionId: newTransaction.id });
    }
  } catch (error) {
    console.error('Failed to create settlement transaction:', error);
  }
};

// トランザクションの取得
export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (jsonValue) {
      // JSONから復元したデータの日付文字列をDateオブジェクトに変換
      const parsedData = JSON.parse(jsonValue);
      return parsedData.map((item: any) => ({
        ...item,
        date: new Date(item.date),
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        // 引き落とし予定日も変換
        creditCardSettlementDate: item.creditCardSettlementDate ? new Date(item.creditCardSettlementDate) : undefined
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to get transactions:', error);
    return [];
  }
};

export const deleteTransaction = async (id: string) => {
  try {
    const transactions = await getTransactions();
    
    // 削除対象のトランザクションを取得
    const targetTransaction = transactions.find(t => t.id === id);
    
    if (!targetTransaction) {
      console.error('Transaction not found:', id);
      return;
    }
    
    let idsToDelete = [id];
    
    // 関連トランザクションのIDがある場合、それも削除対象に追加
    if (targetTransaction.relatedTransactionId) {
      idsToDelete.push(targetTransaction.relatedTransactionId);
    }
    
    // 逆方向の関連も確認（このトランザクションを参照している他のトランザクション）
    const relatedTransactions = transactions.filter(t => t.relatedTransactionId === id);
    idsToDelete = [...idsToDelete, ...relatedTransactions.map(t => t.id)];
    
    // 削除対象でないものだけをフィルタリング
    const updatedTransactions = transactions.filter(t => !idsToDelete.includes(t.id));
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.TRANSACTIONS,
      JSON.stringify(updatedTransactions)
    );
    
    // 口座残高を更新
    await updateAccountBalances();
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error;
  }
};

// トランザクションの更新
export const updateTransaction = async (
  id: string,
  updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Transaction> => {
  try {
    const transactions = await getTransactions();
    const transactionIndex = transactions.findIndex(t => t.id === id);

    if (transactionIndex === -1) {
      throw new Error(`Transaction with ID ${id} not found`);
    }

    const updatedTransaction = {
      ...transactions[transactionIndex],
      ...updates,
      updatedAt: new Date()
    };

    // 日付が文字列なら変換
    if (typeof updatedTransaction.date === 'string') {
      updatedTransaction.date = new Date(updatedTransaction.date);
    }
    
    // 引き落とし予定日も同様に処理
    if (updatedTransaction.creditCardSettlementDate && 
        typeof updatedTransaction.creditCardSettlementDate === 'string') {
      updatedTransaction.creditCardSettlementDate = new Date(updatedTransaction.creditCardSettlementDate);
    }

    const updatedTransactions = [
      ...transactions.slice(0, transactionIndex),
      updatedTransaction,
      ...transactions.slice(transactionIndex + 1)
    ];

    await AsyncStorage.setItem(
      STORAGE_KEYS.TRANSACTIONS,
      JSON.stringify(updatedTransactions)
    );

    return updatedTransaction;
  } catch (error) {
    console.error('Failed to update transaction:', error);
    throw error;
  }
};

// 支払い方法の取得
export const getPaymentMethods = async (): Promise<PaymentMethod[]> => {
  try {
    const paymentMethodsJson = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
    if (!paymentMethodsJson) {
      // デフォルトの支払い方法を保存して返す
      await AsyncStorage.setItem(
        STORAGE_KEYS.PAYMENT_METHODS,
        JSON.stringify(DEFAULT_PAYMENT_METHODS)
      );
      return DEFAULT_PAYMENT_METHODS;
    }

    const paymentMethods = JSON.parse(paymentMethodsJson);
    return paymentMethods.map((pm: any) => ({
      ...pm,
      createdAt: new Date(pm.createdAt),
      updatedAt: new Date(pm.updatedAt),
    }));
  } catch (error) {
    console.error('Failed to get payment methods:', error);
    return DEFAULT_PAYMENT_METHODS;
  }
};

// 支払い方法の保存
export const savePaymentMethod = async (
  paymentMethod: Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PaymentMethod> => {
  try {
    const paymentMethods = await getPaymentMethods();
    
    const newPaymentMethod: PaymentMethod = {
      ...paymentMethod,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedPaymentMethods = [...paymentMethods, newPaymentMethod];
    await AsyncStorage.setItem(
      STORAGE_KEYS.PAYMENT_METHODS,
      JSON.stringify(updatedPaymentMethods)
    );

    return newPaymentMethod;
  } catch (error) {
    console.error('Failed to save payment method:', error);
    throw error;
  }
};

// 支払い方法の更新
export const updatePaymentMethod = async (
  id: string,
  updates: Partial<Omit<PaymentMethod, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PaymentMethod> => {
  try {
    const paymentMethods = await getPaymentMethods();
    const index = paymentMethods.findIndex(pm => pm.id === id);
    
    if (index === -1) {
      throw new Error(`Payment method with id ${id} not found`);
    }
    
    const updatedPaymentMethod = {
      ...paymentMethods[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    paymentMethods[index] = updatedPaymentMethod;
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.PAYMENT_METHODS,
      JSON.stringify(paymentMethods)
    );
    
    return updatedPaymentMethod;
  } catch (error) {
    console.error('Failed to update payment method:', error);
    throw error;
  }
};

// 支払い方法の削除
export const deletePaymentMethod = async (id: string): Promise<void> => {
  try {
    const paymentMethods = await getPaymentMethods();
    const filteredPaymentMethods = paymentMethods.filter(pm => pm.id !== id);
    await AsyncStorage.setItem(
      STORAGE_KEYS.PAYMENT_METHODS,
      JSON.stringify(filteredPaymentMethods)
    );
  } catch (error) {
    console.error('Failed to delete payment method:', error);
    throw error;
  }
};

// 銀行口座の取得
export const getAccounts = async (): Promise<Account[]> => {
  try {
    const accountsJson = await AsyncStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    let accounts: Account[] = [];
    
    if (!accountsJson) {
      // デフォルトの銀行口座を保存して返す
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACCOUNTS,
        JSON.stringify(DEFAULT_ACCOUNTS)
      );
      accounts = DEFAULT_ACCOUNTS;
    } else {
      accounts = JSON.parse(accountsJson).map((acc: any) => ({
        ...acc,
        createdAt: new Date(acc.createdAt),
        updatedAt: new Date(acc.updatedAt),
      }));
    }
    
    // 口座として機能するクレジットカードも取得する
    const paymentMethodsJson = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENT_METHODS);
    if (paymentMethodsJson) {
      const paymentMethods = JSON.parse(paymentMethodsJson);
      const creditCardAccounts = paymentMethods
        .filter((pm: any) => pm.type === 'credit_card' && pm.isAccount)
        .map((pm: any) => ({
          id: `cc_${pm.id}`, // 通常の口座と区別するためにプレフィックス
          name: `${pm.name} (クレカ)`,
          type: 'credit',
          balance: 0, // 初期値。後で計算
          currency: 'JPY',
          isActive: pm.isActive,
          createdAt: new Date(pm.createdAt),
          updatedAt: new Date(pm.updatedAt),
          // クレジットカード特有の情報
          isFromCreditCard: true,
          originalPaymentMethodId: pm.id,
          billingDay: pm.billingDay,
          closingDay: pm.closingDay,
        }));
      
      // 既存のクレジットカード由来口座（ID: cc_から始まるもの）を削除
      accounts = accounts.filter((acc: Account) => !acc.id.startsWith('cc_'));
      
      // 新しいクレジットカード口座を追加
      accounts = [...accounts, ...creditCardAccounts];
    }
    
    return accounts;
  } catch (error) {
    console.error('Failed to get accounts:', error);
    return DEFAULT_ACCOUNTS;
  }
};

// 銀行口座の保存
export const saveAccount = async (
  account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Account> => {
  try {
    const accounts = await getAccounts();
    
    const newAccount: Account = {
      ...account,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedAccounts = [...accounts, newAccount];
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACCOUNTS,
      JSON.stringify(updatedAccounts)
    );

    return newAccount;
  } catch (error) {
    console.error('Failed to save account:', error);
    throw error;
  }
};

// 銀行口座の更新
export const updateAccount = async (
  id: string,
  updates: Partial<Omit<Account, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Account> => {
  try {
    const accounts = await getAccounts();
    const index = accounts.findIndex(acc => acc.id === id);
    
    if (index === -1) {
      throw new Error(`Account with id ${id} not found`);
    }
    
    const updatedAccount = {
      ...accounts[index],
      ...updates,
      updatedAt: new Date(),
    };
    
    accounts[index] = updatedAccount;
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACCOUNTS,
      JSON.stringify(accounts)
    );
    
    return updatedAccount;
  } catch (error) {
    console.error('Failed to update account:', error);
    throw error;
  }
};

// 銀行口座の削除
export const deleteAccount = async (id: string): Promise<void> => {
  try {
    const accounts = await getAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== id);
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACCOUNTS,
      JSON.stringify(filteredAccounts)
    );
  } catch (error) {
    console.error('Failed to delete account:', error);
    throw error;
  }
};

// 取引に基づいて口座残高を更新する関数
export const updateAccountBalances = async (): Promise<void> => {
  try {
    const transactions = await getTransactions();
    const accounts = await getAccounts();
    const paymentMethods = await getPaymentMethods();
    
    // すべての口座残高を0にリセット
    const resetAccounts = accounts.map(account => ({
      ...account,
      balance: 0,
      updatedAt: new Date()
    }));
    
    // 各取引に基づいて残高を計算
    const updatedAccounts = transactions.reduce((accs, transaction) => {
      const { type, amount, accountId, paymentMethodId, status } = transaction;
      
      // クレジットカード利用時（pending_settlement）は残高計算に影響しない
      if (status === 'pending_settlement') {
        return accs;
      }
      
      // 完了した取引または引き落とし取引の場合
      if (status === 'completed' || status === 'settlement') {
        // 収入の場合：accountIdに対応する口座に金額を追加
        if (type === 'income') {
          const accountIndex = accs.findIndex(a => a.id === accountId);
          if (accountIndex !== -1) {
            accs[accountIndex].balance += amount;
          }
        } 
        // 支出または投資の場合：paymentMethodに対応する口座から金額を引く
        else if (type === 'expense' || type === 'investment') {
          const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
          if (paymentMethod) {
            const accountIndex = accs.findIndex(a => a.id === paymentMethod.accountId);
            if (accountIndex !== -1) {
              accs[accountIndex].balance -= amount;
            }
          }
          
          // 投資の場合は、投資先口座にも反映
          if (type === 'investment') {
            const investmentAccountIndex = accs.findIndex(a => a.id === accountId);
            if (investmentAccountIndex !== -1) {
              accs[investmentAccountIndex].balance += amount;
            }
          }
        }
        // 振替の場合：sourceから引いてdestinationに追加
        else if (type === 'transfer') {
          // 振替元（通常はpaymentMethodIdに格納）
          if (paymentMethodId) {
            const sourceAccountIndex = accs.findIndex(a => a.id === paymentMethodId);
            if (sourceAccountIndex !== -1) {
              accs[sourceAccountIndex].balance -= amount;
            }
          }
          
          // 振替先（通常はaccountIdに格納）
          if (accountId) {
            const destAccountIndex = accs.findIndex(a => a.id === accountId);
            if (destAccountIndex !== -1) {
              accs[destAccountIndex].balance += amount;
            }
          }
        }
      }
      
      return accs;
    }, resetAccounts);
    
    // 更新された口座情報を保存
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACCOUNTS,
      JSON.stringify(updatedAccounts)
    );
  } catch (error) {
    console.error('Failed to update account balances:', error);
  }
}; 