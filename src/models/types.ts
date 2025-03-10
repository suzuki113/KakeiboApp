export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
export type AccountType = 'cash' | 'bank' | 'credit' | 'investment';
export type PaymentMethodType = 'cash' | 'credit_card' | 'bank_transfer' | 'electronic_money' | 'direct_debit';
export type InvestmentType = 'stock' | 'crypto' | 'forex' | 'bond' | 'mutual_fund' | 'other';

// トランザクションの役割を明確にする新しいステータス型
export type TransactionStatus = 
  // 通常の取引（現金、銀行振込など、即時反映）
  'completed' | 
  // 将来の引き落としを予約（クレジットカードや口座引き落とし）
  'pending_settlement' | 
  // 実際の引き落とし（口座からの実際の引き落とし）
  'settlement';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  categoryId: string;
  accountId: string;
  paymentMethodId: string;
  
  // トランザクションの状態
  status: TransactionStatus;
  
  // 関連トランザクションの追跡
  relatedTransactionId?: string; // 関連する取引のID
  
  // 引き落とし関連情報
  creditCardSettlementDate?: Date; // 引き落とし予定日
  
  investmentItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  accountId: string; // 引き落とし元口座ID
  isActive: boolean;
  
  // クレジットカードと口座引き落とし共通の設定
  // 締め日 (例: クレジットカードなら利用が締め切られる日、引き落としなら対象月の締め日)
  closingDay?: number; 
  
  // 引き落とし日 (例: クレジットカードなら口座から引き落とされる日、引き落としなら口座から引き落とされる日)
  billingDay?: number; 
  
  createdAt: Date;
  updatedAt: Date;
}

export interface InvestmentItem {
  id: string;
  name: string;
  type: InvestmentType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
} 