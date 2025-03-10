import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, useTheme, Button, List, IconButton, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTransactions, getCategories, getPaymentMethods, getAccounts, updateAccountBalances } from '../utils/storage';
import { calculateBalance, calculateMonthlyStats, calculateMonthlyPaymentMethodStats, calculateUpcomingSettlements } from '../utils/calculations';
import { PieChart } from 'react-native-gifted-charts';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Account, PaymentMethod } from '../models/types';

type MonthlyStatsData = {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
};

type MonthlyStats = {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  expenseData: MonthlyStatsData[];
  incomeData: MonthlyStatsData[];
  month: number;
  year: number;
};

type PaymentMethodStatsData = {
  paymentMethodId: string;
  name: string;
  color: string;
  amount: number;
  percentage: number;
};

type PaymentMethodStats = {
  totalExpenses: number;
  paymentMethodData: PaymentMethodStatsData[];
  month: number;
  year: number;
};

type CreditCardPayment = {
  id: string;
  name: string;
  amount: number;
  billingDay: number;
  billingDate: Date;
  type: string; // 支払い方法タイプ（'credit_card' or 'direct_debit'）
};

type SettlementPayments = {
  currentMonthPayments: CreditCardPayment[];
  nextMonthPayments: CreditCardPayment[];
  totalCurrentMonth: number;
  totalNextMonth: number;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [balances, setBalances] = useState({
    totalBalance: 0,
    accountBalances: {
      cash: 0,
      bank: 0,
      investment: 0,
    },
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    totalExpenses: 0,
    totalIncome: 0,
    balance: 0,
    expenseData: [],
    incomeData: [],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [paymentMethodStats, setPaymentMethodStats] = useState<PaymentMethodStats>({
    totalExpenses: 0,
    paymentMethodData: [],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [upcomingSettlements, setUpcomingSettlements] = useState<SettlementPayments>({
    currentMonthPayments: [],
    nextMonthPayments: [],
    totalCurrentMonth: 0,
    totalNextMonth: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeGraph, setActiveGraph] = useState<'category' | 'paymentMethod'>('category');

  const loadData = async () => {
    // 口座残高を更新
    await updateAccountBalances();
    
    const transactions = await getTransactions();
    const categories = await getCategories();
    const paymentMethodsData = await getPaymentMethods();
    const accountsData = await getAccounts();
    
    // アクティブな口座のみをフィルタリング
    const activeAccounts = accountsData.filter(account => account.isActive);
    setAccounts(activeAccounts);
    setPaymentMethods(paymentMethodsData);
    
    // 残高の計算
    const balanceData = calculateBalance(transactions);
    setBalances(balanceData);

    const stats = calculateMonthlyStats(transactions, categories);
    setMonthlyStats(stats);

    const paymentMethodStatsData = calculateMonthlyPaymentMethodStats(transactions, paymentMethodsData);
    setPaymentMethodStats(paymentMethodStatsData);
    
    // 引き落とし予定の計算（クレジットカードと口座引き落とし）
    const settlementData = calculateUpcomingSettlements(
      transactions,
      paymentMethodsData,
      activeAccounts
    );
    setUpcomingSettlements(settlementData);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 画面がフォーカスされるたびにデータを再読み込み
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const chartWidth = Dimensions.get('window').width - 32;

  // 口座アイコンを取得する関数
  const getAccountIcon = (type: string): string => {
    switch (type) {
      case 'cash':
        return 'cash';
      case 'bank':
        return 'bank';
      case 'credit':
        return 'credit-card';
      case 'investment':
        return 'chart-line';
      default:
        return 'bank';
    }
  };

  // 和暦の月を取得
  const getJapaneseMonth = (date: Date) => {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return months[date.getMonth()];
  };

  // 支払い方法アイコンを取得
  const getPaymentMethodIcon = (type: string): string => {
    switch (type) {
      case 'credit_card':
        return 'credit-card';
      case 'direct_debit':
        return 'bank-transfer';
      default:
        return 'credit-card';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 総資産のセクション */}
      <Card style={styles.totalBalanceCard}>
        <Card.Content>
          <Text variant="titleMedium">総資産</Text>
          <Text variant="headlineMedium" style={styles.totalBalanceText}>
            ¥{balances.totalBalance.toLocaleString()}
          </Text>
          <View style={styles.assetDetailsContainer}>
            <View style={styles.operatingAssetsContainer}>
              <Text variant="bodyMedium" style={styles.operatingAssetsLabel}>運用中資産</Text>
              <Text variant="titleLarge" style={styles.operatingAssetsText}>
                ¥{balances.accountBalances.investment.toLocaleString()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* 口座残高のセクション */}
      <Card style={styles.accountsCard}>
        <Card.Content>
          <View style={styles.accountsHeader}>
            <Text variant="titleMedium">口座残高</Text>
            <Button
              mode="text"
              compact
              onPress={() => navigation.navigate('AccountList')}
            >
              管理
            </Button>
          </View>
          
          {accounts.length === 0 ? (
            <Text style={styles.emptyText}>口座がありません</Text>
          ) : (
            accounts.map(account => (
              <View key={account.id} style={styles.accountItem}>
                <View style={styles.accountInfo}>
                  <IconButton
                    icon={getAccountIcon(account.type)}
                    size={24}
                    style={styles.accountIcon}
                  />
                  <Text variant="bodyMedium">{account.name}</Text>
                </View>
                <Text
                  variant="bodyLarge"
                  style={{
                    color: account.balance >= 0 ? theme.colors.primary : theme.colors.error,
                  }}
                >
                  ¥{account.balance.toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <Card style={styles.monthlyCard}>
        <Card.Content>
          <Text variant="titleLarge">
            {monthlyStats.year}年{monthlyStats.month}月の収支
          </Text>
          <View style={styles.monthlyBalance}>
            <View style={styles.monthlyItem}>
              <Text variant="titleMedium">収入</Text>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.primary }}
              >
                ¥{monthlyStats.totalIncome.toLocaleString()}
              </Text>
            </View>
            <View style={styles.monthlyItem}>
              <Text variant="titleMedium">支出</Text>
              <Text
                variant="titleLarge"
                style={{ color: theme.colors.error }}
              >
                ¥{monthlyStats.totalExpenses.toLocaleString()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* グラフ切り替えボタン */}
      <View style={styles.graphSwitchContainer}>
        <Button
          mode={activeGraph === 'category' ? 'contained' : 'outlined'}
          onPress={() => setActiveGraph('category')}
          style={styles.graphSwitchButton}
        >
          カテゴリー別
        </Button>
        <Button
          mode={activeGraph === 'paymentMethod' ? 'contained' : 'outlined'}
          onPress={() => setActiveGraph('paymentMethod')}
          style={styles.graphSwitchButton}
        >
          支払い方法別
        </Button>
      </View>

      {/* カテゴリ別グラフ */}
      {activeGraph === 'category' && monthlyStats.expenseData.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>
              カテゴリー別支出内訳
            </Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={monthlyStats.expenseData.map(item => ({
                  value: item.percentage,
                  color: item.color,
                  text: `${item.name}\n${Math.round(item.percentage)}%`,
                }))}
                donut
                showText
                textColor="black"
                radius={chartWidth / 3}
                innerRadius={chartWidth / 5}
                textSize={12}
                centerLabelComponent={() => null}
              />
            </View>
            <View style={styles.legendContainer}>
              {monthlyStats.expenseData.map(item => (
                <View key={item.categoryId} style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: item.color }]}
                  />
                  <Text variant="bodyMedium">
                    {item.name}: ¥{item.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 支払い方法別グラフ */}
      {activeGraph === 'paymentMethod' && paymentMethodStats.paymentMethodData.length > 0 && (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.chartTitle}>
              支払い方法別支出内訳
            </Text>
            <View style={styles.chartContainer}>
              <PieChart
                data={paymentMethodStats.paymentMethodData.map(item => ({
                  value: item.percentage,
                  color: item.color,
                  text: `${item.name}\n${Math.round(item.percentage)}%`,
                }))}
                donut
                showText
                textColor="black"
                radius={chartWidth / 3}
                innerRadius={chartWidth / 5}
                textSize={12}
              />
            </View>
            <View style={styles.legendContainer}>
              {paymentMethodStats.paymentMethodData.map(item => (
                <View key={item.paymentMethodId} style={styles.legendItem}>
                  <View
                    style={[styles.legendColor, { backgroundColor: item.color }]}
                  />
                  <Text variant="bodyMedium">
                    {item.name}: ¥{item.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {/* 引き落とし予定セクション */}
      <Card style={styles.settlementCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.settlementTitle}>引き落とし予定</Text>
          
          {/* 今月の引き落とし */}
          <View style={styles.settlementSection}>
            <Text variant="titleSmall">今月の引き落とし</Text>
            {upcomingSettlements.currentMonthPayments.length === 0 ? (
              <Text style={styles.emptyText}>今月の引き落とし予定はありません</Text>
            ) : (
              <>
                <View style={styles.settlementTotal}>
                  <Text variant="bodyMedium">合計</Text>
                  <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
                    ¥{upcomingSettlements.totalCurrentMonth.toLocaleString()}
                  </Text>
                </View>
                <Divider style={styles.divider} />
                {upcomingSettlements.currentMonthPayments.map(payment => (
                  <View key={payment.id} style={styles.settlementItem}>
                    <View style={styles.settlementInfo}>
                      <IconButton
                        icon={getPaymentMethodIcon(payment.type)}
                        size={20}
                        style={styles.settlementIcon}
                      />
                      <View>
                        <Text variant="bodyMedium">{payment.name}</Text>
                        <Text variant="bodySmall">{payment.billingDay}日引き落とし</Text>
                      </View>
                    </View>
                    <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
                      ¥{payment.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
          
          {/* 来月の引き落とし */}
          <View style={styles.settlementSection}>
            <Text variant="titleSmall">来月の引き落とし</Text>
            {upcomingSettlements.nextMonthPayments.length === 0 ? (
              <Text style={styles.emptyText}>来月の引き落とし予定はありません</Text>
            ) : (
              <>
                <View style={styles.settlementTotal}>
                  <Text variant="bodyMedium">合計</Text>
                  <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
                    ¥{upcomingSettlements.totalNextMonth.toLocaleString()}
                  </Text>
                </View>
                <Divider style={styles.divider} />
                {upcomingSettlements.nextMonthPayments.map(payment => (
                  <View key={payment.id} style={styles.settlementItem}>
                    <View style={styles.settlementInfo}>
                      <IconButton
                        icon={getPaymentMethodIcon(payment.type)}
                        size={20}
                        style={styles.settlementIcon}
                      />
                      <View>
                        <Text variant="bodyMedium">{payment.name}</Text>
                        <Text variant="bodySmall">{payment.billingDay}日引き落とし</Text>
                      </View>
                    </View>
                    <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
                      ¥{payment.amount.toLocaleString()}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  balanceCard: {
    marginBottom: 16,
  },
  monthlyCard: {
    marginBottom: 16,
  },
  monthlyBalance: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  monthlyItem: {
    alignItems: 'center',
  },
  chartCard: {
    marginBottom: 16,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
  },
  legendContainer: {
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  accountsCard: {
    margin: 8,
    marginTop: 0,
  },
  accountsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIcon: {
    marginRight: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#757575',
  },
  balanceTitle: {
    marginBottom: 8,
  },
  totalBalance: {
    marginTop: 8,
  },
  graphSwitchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  graphSwitchButton: {
    flex: 1,
  },
  totalBalanceCard: {
    margin: 8,
  },
  totalBalanceText: {
    marginVertical: 8,
  },
  assetDetailsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
  },
  operatingAssetsContainer: {
    width: '100%',
  },
  operatingAssetsLabel: {
    color: '#666',
  },
  operatingAssetsText: {
    marginTop: 4,
    color: '#2196F3', // Primary blue color
    fontWeight: 'bold',
  },
  settlementCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  settlementTitle: {
    marginBottom: 16,
  },
  settlementSection: {
    marginBottom: 16,
  },
  settlementTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  settlementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  settlementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementIcon: {
    margin: 0,
    marginRight: 8,
  },
  divider: {
    marginVertical: 8,
  },
}); 