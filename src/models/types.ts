export type TransactionType = 'income' | 'expense' | 'transfer' | 'investment';
export type AccountType = 'cash' | 'bank' | 'credit' | 'investment';
export type PaymentMethodType = 'cash' | 'credit_card' | 'bank_transfer' | 'electronic_money' | 'direct_debit';
export type InvestmentType = 'stock' | 'crypto' | 'forex' | 'bond' | 'mutual_fund' | 'other';

// 定期取引の頻度タイプ
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// トランザクションの役割を明確にする新しいステータス型
export type TransactionStatus = 
  // 通常の取引（現金、銀行振込など、即時反映）
  'completed' | 
  // 将来の引き落としを予約（クレジットカードや口座引き落とし）
  'pending_settlement' | 
  // 実際の引き落とし（口座からの実際の引き落とし）
  'settlement';

// 定期取引のステータス
export type RecurringTransactionStatus = 'active' | 'paused' | 'cancelled';

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
  
  // 定期取引から生成されたことを示すID
  recurringTransactionId?: string;
  
  investmentItemId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 定期取引を表すインターフェース
export interface RecurringTransaction {
  id: string;
  title: string;               // サブスクリプション名や定期取引の名称
  type: TransactionType;       // 収入・支出・振替・投資
  amount: number;              // 金額
  startDate: Date;             // 開始日
  endDate?: Date;              // 終了日（未設定の場合は無期限）
  
  // 繰り返し設定
  frequency: RecurrenceFrequency;  // 頻度タイプ（毎日・毎週・毎月・毎年）
  interval: number;            // 頻度の間隔（例：2を指定すると隔週・隔月など）
  dayOfMonth?: number;         // 毎月の特定日（monthlyの場合）
  dayOfWeek?: number;          // 曜日（0-6, 0=日曜, weeklyの場合）
  monthOfYear?: number;        // 月（1-12, yearlyの場合）
  
  // 取引情報
  description: string;         // 説明
  categoryId: string;          // カテゴリID
  accountId: string;           // 口座ID
  paymentMethodId: string;     // 支払方法ID
  
  // ステータス
  status: RecurringTransactionStatus;  // 有効・一時停止・キャンセル
  
  // 最終生成日（最後に取引が生成された日）
  lastGeneratedDate?: Date;
  
  // メタデータ
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