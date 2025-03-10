import { Transaction, Category, PaymentMethod, Account, TransactionStatus } from '../models/types';

/**
 * 口座残高を計算する
 */
export const calculateBalance = (transactions: Transaction[]) => {
  // 現金、銀行、投資の残高を追跡
  const accountBalances = {
    cash: 0,
    bank: 0,
    investment: 0,
  };
  
  // 総残高
  let totalBalance = 0;
  
  // 各取引に基づいて残高を計算
  transactions.forEach(transaction => {
    // クレジットカード利用（pending_settlement）は残高計算に含めない
    if (transaction.status === 'pending_settlement') {
      return;
    }
    
    // 完了した取引（completed）や引き落とし（settlement）のみを計算
    const { type, amount, accountId } = transaction;
    
    // 収入：残高に加算
    if (type === 'income') {
      totalBalance += amount;
      
      // 口座種別に応じて加算
      if (accountId.startsWith('cash_')) {
        accountBalances.cash += amount;
      } else if (accountId.startsWith('bank_') || accountId.startsWith('cc_')) {
        accountBalances.bank += amount;
      } else if (accountId.startsWith('inv_')) {
        accountBalances.investment += amount;
      }
    }
    // 支出：残高から減算
    else if (type === 'expense') {
      totalBalance -= amount;
      
      // 口座種別に応じて減算
      if (accountId.startsWith('cash_')) {
        accountBalances.cash -= amount;
      } else if (accountId.startsWith('bank_') || accountId.startsWith('cc_')) {
        accountBalances.bank -= amount;
      } else if (accountId.startsWith('inv_')) {
        accountBalances.investment -= amount;
      }
    }
    // 投資：投資口座に加算、出金元口座から減算
    else if (type === 'investment') {
      // 投資はトータル残高には影響しない（資金移動として考える）
      // totalBalanceは変更しない
      
      // 投資額を投資残高に加算
      accountBalances.investment += amount;
      
      // 出金元口座から減算
      if (accountId.startsWith('cash_')) {
        accountBalances.cash -= amount;
      } else if (accountId.startsWith('bank_') || accountId.startsWith('cc_')) {
        accountBalances.bank -= amount;
      }
      
      // 注意: 投資額が投資口座から別の投資口座へ移動する場合は
      // ここでは考慮していません。必要に応じて拡張してください。
    }
  });
  
  return {
    totalBalance,
    accountBalances,
  };
};

export const calculateMonthlyStats = (
  transactions: Transaction[],
  categories: Category[],
  targetDate: Date = new Date()
) => {
  // 対象月の開始日と終了日を計算
  const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

  // 当月のトランザクションをフィルタリング
  const monthlyTransactions = transactions.filter(
    t => t.date >= startOfMonth && t.date <= endOfMonth
  );

  // カテゴリーごとの集計
  const expensesByCategory = new Map<string, number>();
  const incomesByCategory = new Map<string, number>();
  let totalExpenses = 0;
  let totalIncome = 0;

  monthlyTransactions.forEach(transaction => {
    const category = categories.find(c => c.id === transaction.categoryId);
    if (!category) return;

    if (transaction.type === 'expense') {
      const currentAmount = expensesByCategory.get(category.id) || 0;
      expensesByCategory.set(category.id, currentAmount + transaction.amount);
      totalExpenses += transaction.amount;
    } else if (transaction.type === 'income') {
      const currentAmount = incomesByCategory.get(category.id) || 0;
      incomesByCategory.set(category.id, currentAmount + transaction.amount);
      totalIncome += transaction.amount;
    }
  });

  // グラフ用のデータを作成
  const expenseData = Array.from(expensesByCategory.entries()).map(([categoryId, amount]) => {
    const category = categories.find(c => c.id === categoryId)!;
    return {
      categoryId,
      name: category.name,
      color: category.color,
      amount,
      percentage: (amount / totalExpenses) * 100,
    };
  });

  const incomeData = Array.from(incomesByCategory.entries()).map(([categoryId, amount]) => {
    const category = categories.find(c => c.id === categoryId)!;
    return {
      categoryId,
      name: category.name,
      color: category.color,
      amount,
      percentage: (amount / totalIncome) * 100,
    };
  });

  return {
    totalExpenses,
    totalIncome,
    balance: totalIncome - totalExpenses,
    expenseData: expenseData.sort((a, b) => b.amount - a.amount),
    incomeData: incomeData.sort((a, b) => b.amount - a.amount),
    month: targetDate.getMonth() + 1,
    year: targetDate.getFullYear(),
  };
};

// 支払い方法ごとの月間支出を計算する関数
export const calculateMonthlyPaymentMethodStats = (
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  targetDate: Date = new Date()
) => {
  // 指定された月の開始日と終了日を計算
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  
  // その月のトランザクションのみをフィルタリング
  const monthlyTransactions = transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return transactionDate >= startDate && 
           transactionDate <= endDate && 
           transaction.type === 'expense';
  });
  
  // 支払い方法ごとに支出を集計
  const paymentMethodStats: {
    paymentMethodId: string;
    name: string;
    color: string;
    amount: number;
    percentage: number;
  }[] = [];
  
  // 支払い方法ごとに金額を合計
  const paymentMethodTotals: { [key: string]: number } = {};
  let totalAmount = 0;
  
  monthlyTransactions.forEach(transaction => {
    const paymentMethodId = transaction.paymentMethodId;
    
    if (paymentMethodId) {
      if (!paymentMethodTotals[paymentMethodId]) {
        paymentMethodTotals[paymentMethodId] = 0;
      }
      paymentMethodTotals[paymentMethodId] += transaction.amount;
      totalAmount += transaction.amount;
    }
  });
  
  // 支払い方法ごとの色を設定
  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];
  
  // 支払い方法ごとの統計を作成
  Object.keys(paymentMethodTotals).forEach((paymentMethodId, index) => {
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
    if (paymentMethod) {
      const amount = paymentMethodTotals[paymentMethodId];
      paymentMethodStats.push({
        paymentMethodId,
        name: paymentMethod.name,
        color: colors[index % colors.length],
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      });
    }
  });
  
  // 金額の降順でソート
  paymentMethodStats.sort((a, b) => b.amount - a.amount);
  
  return {
    totalExpenses: totalAmount,
    paymentMethodData: paymentMethodStats,
    month: month + 1,
    year,
  };
};

/**
 * 今月と来月の引き落とし予定を計算する（クレジットカードと口座引き落とし）
 */
export const calculateUpcomingSettlements = (
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  accounts: Account[]
) => {
  // クレジットカードか口座引き落としで、かつ締め日と引き落とし日が設定されているものをフィルタリング
  const debitMethods = paymentMethods.filter(
    pm => (pm.type === 'credit_card' || pm.type === 'direct_debit') && pm.billingDay && pm.closingDay
  );
  
  if (debitMethods.length === 0) {
    return {
      currentMonthPayments: [],
      nextMonthPayments: [],
      totalCurrentMonth: 0,
      totalNextMonth: 0,
    };
  }
  
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const currentDay = today.getDate();
  
  const currentMonthPayments = [];
  const nextMonthPayments = [];
  
  // クレジットカードの使用履歴を各支払い方法ごとに集計
  for (const debitMethod of debitMethods) {
    // 必要なデータが揃っていない場合はスキップ
    if (!debitMethod.id || !debitMethod.name || !debitMethod.billingDay || !debitMethod.closingDay) {
      continue;
    }
    
    // クレジットカードの過去の利用履歴を取得（支出のみ）
    const allCardTransactions = transactions.filter(t => 
      t.paymentMethodId === debitMethod.id &&
      (t.type === 'expense' || t.type === 'investment')
    );
    
    // 引き落とし予定日が設定されている取引
    const transactionsWithSettlementDate = allCardTransactions.filter(t => 
      t.creditCardSettlementDate !== undefined && t.creditCardSettlementDate !== null
    );
    
    // 今月の引き落とし予定を検索
    const currentMonthSettlements = transactionsWithSettlementDate.filter(t => {
      if (!t.creditCardSettlementDate) return false;
      const settlementDate = new Date(t.creditCardSettlementDate);
      return settlementDate.getFullYear() === currentYear && 
             settlementDate.getMonth() === currentMonth;
    });
    
    // 来月の引き落とし予定を検索
    const nextMonth = (currentMonth + 1) % 12;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    const nextMonthSettlements = transactionsWithSettlementDate.filter(t => {
      if (!t.creditCardSettlementDate) return false;
      const settlementDate = new Date(t.creditCardSettlementDate);
      return settlementDate.getFullYear() === nextYear && 
             settlementDate.getMonth() === nextMonth;
    });
    
    // もし引き落とし予定日のない取引なら、締め日と引き落とし日に基づいて自動的に計算
    if (debitMethod.type === 'credit_card' && allCardTransactions.length > 0 && transactionsWithSettlementDate.length === 0) {
      // 現在の締め日を計算
      const currentClosingDate = new Date(currentYear, currentMonth, debitMethod.closingDay);
      const prevClosingDate = new Date(
        currentMonth === 0 ? currentYear - 1 : currentYear,
        currentMonth === 0 ? 11 : currentMonth - 1,
        debitMethod.closingDay
      );
      
      // 前回締め日から今回締め日までの取引を取得
      const relevantTransactions = allCardTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= prevClosingDate && transactionDate <= currentClosingDate;
      });
      
      if (relevantTransactions.length > 0) {
        // 引き落とし予定日を計算（締め日の翌月の引き落とし日）
        const settlementMonth = currentMonth;
        const settlementYear = currentYear;
        
        // 引き落とし日が締め日より前の場合は翌月の引き落とし
        const billingMonth = debitMethod.billingDay < debitMethod.closingDay
          ? (currentMonth + 1) % 12
          : currentMonth;
          
        const billingYear = (currentMonth === 11 && billingMonth === 0)
          ? currentYear + 1
          : currentYear;
        
        // 今月か来月の引き落としかを判断
        if (billingMonth === currentMonth && currentDay <= debitMethod.billingDay) {
          // 今月の引き落とし
          const totalAmount = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);
          currentMonthPayments.push({
            id: debitMethod.id,
            name: debitMethod.name,
            amount: totalAmount,
            billingDay: debitMethod.billingDay,
            billingDate: new Date(currentYear, currentMonth, debitMethod.billingDay),
            type: debitMethod.type,
          });
        } else {
          // 来月の引き落とし
          const totalAmount = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);
          nextMonthPayments.push({
            id: debitMethod.id,
            name: debitMethod.name,
            amount: totalAmount,
            billingDay: debitMethod.billingDay,
            billingDate: new Date(billingYear, billingMonth, debitMethod.billingDay),
            type: debitMethod.type,
          });
        }
      }
    } else {
      // 今月の支払いがまだの場合（現在日が引き落とし日以前）
      if (currentDay <= debitMethod.billingDay && currentMonthSettlements.length > 0) {
        // 同じ日の引き落としは1つにまとめる
        const totalAmount = currentMonthSettlements.reduce((sum, t) => sum + t.amount, 0);
        
        currentMonthPayments.push({
          id: debitMethod.id,
          name: debitMethod.name,
          amount: totalAmount,
          billingDay: debitMethod.billingDay,
          billingDate: new Date(currentYear, currentMonth, debitMethod.billingDay),
          type: debitMethod.type,
        });
      }
      
      // 来月の支払い予定
      if (nextMonthSettlements.length > 0) {
        // 同じ日の引き落としは1つにまとめる
        const totalAmount = nextMonthSettlements.reduce((sum, t) => sum + t.amount, 0);
        
        nextMonthPayments.push({
          id: debitMethod.id,
          name: debitMethod.name,
          amount: totalAmount,
          billingDay: debitMethod.billingDay,
          billingDate: new Date(nextYear, nextMonth, debitMethod.billingDay),
          type: debitMethod.type,
        });
      }
    }
  }
  
  // 引き落とし日でソート
  currentMonthPayments.sort((a, b) => a.billingDay - b.billingDay);
  nextMonthPayments.sort((a, b) => a.billingDay - b.billingDay);
  
  // 合計金額の計算
  const totalCurrentMonth = currentMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalNextMonth = nextMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
  
  return {
    currentMonthPayments,
    nextMonthPayments,
    totalCurrentMonth,
    totalNextMonth,
  };
}; 