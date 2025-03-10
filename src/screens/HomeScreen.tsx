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
import { COLORS } from '../theme/theme';

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

  // 総資産のセクション
  const renderTotalAssets = () => {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <IconButton
                icon="wallet"
                size={24}
                iconColor={theme.colors.primary}
                style={styles.sectionIcon}
              />
              <Text variant="titleMedium">総資産</Text>
            </View>
          </View>
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
    );
  };

  // 口座残高のセクション
  const renderAccountsSection = () => {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <IconButton
                icon="bank"
                size={24}
                iconColor={theme.colors.primary}
                style={styles.sectionIcon}
              />
              <Text variant="titleMedium">口座残高</Text>
            </View>
            <Button
              mode="text"
              compact
              onPress={() => navigation.navigate('AccountList')}
              style={styles.managementButton}
            >
              管理
            </Button>
          </View>
          
          {accounts.length === 0 ? (
            <Text style={styles.emptyText}>口座がありません</Text>
          ) : (
            <View style={styles.accountsList}>
              {accounts.map(account => (
                <View key={account.id} style={styles.accountItem}>
                  <View style={styles.accountInfo}>
                    <Text variant="bodyMedium">{account.name}</Text>
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={{
                      color: account.balance >= 0 ? theme.colors.primary : theme.colors.error,
                      fontWeight: 'bold',
                    }}
                  >
                    ¥{account.balance.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  // 月間統計のセクション
  const renderMonthlyStatsSection = () => {
    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <IconButton
                icon="chart-pie"
                size={24}
                iconColor={theme.colors.primary}
                style={styles.sectionIcon}
              />
              <Text variant="titleMedium">
                {monthlyStats.year}年{monthlyStats.month}月の統計
              </Text>
            </View>
          </View>
          
          <View style={styles.statsSelector}>
            <Button
              mode={activeGraph === 'category' ? 'contained' : 'outlined'}
              compact
              onPress={() => setActiveGraph('category')}
              style={styles.graphButton}
            >
              カテゴリ
            </Button>
            <Button
              mode={activeGraph === 'paymentMethod' ? 'contained' : 'outlined'}
              compact
              onPress={() => setActiveGraph('paymentMethod')}
              style={styles.graphButton}
            >
              支払い方法
            </Button>
          </View>
          
          <View style={styles.statsOverview}>
            <View style={styles.statsItem}>
              <Text variant="labelLarge" style={styles.statsLabel}>収入</Text>
              <Text variant="titleLarge" style={[styles.statsAmount, styles.incomeAmount]}>
                ¥{monthlyStats.totalIncome.toLocaleString()}
              </Text>
            </View>
            <View style={styles.statsItem}>
              <Text variant="labelLarge" style={styles.statsLabel}>支出</Text>
              <Text variant="titleLarge" style={[styles.statsAmount, styles.expenseAmount]}>
                ¥{monthlyStats.totalExpenses.toLocaleString()}
              </Text>
            </View>
          </View>
          
          {/* 円グラフの表示 */}
          {activeGraph === 'category' ? (
            <>
              <Text variant="titleSmall" style={styles.chartTitle}>支出カテゴリ</Text>
              {monthlyStats.expenseData.length > 0 ? (
                <View style={styles.chartContainer}>
                  <PieChart
                    data={monthlyStats.expenseData.map(item => ({
                      value: parseFloat(item.percentage.toFixed(1)),
                      color: item.color,
                      name: item.name,
                    }))}
                    radius={chartWidth / 4}
                    textColor="black"
                    textSize={12}
                    showText
                    showValuesAsLabels
                    textBackgroundRadius={18}
                    focusOnPress
                    centerLabelComponent={() => (
                      <View style={styles.centerLabel}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                          ¥{monthlyStats.totalExpenses.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  />
                </View>
              ) : (
                <Text style={styles.emptyText}>データがありません</Text>
              )}
            </>
          ) : (
            <>
              <Text variant="titleSmall" style={styles.chartTitle}>支払い方法</Text>
              {paymentMethodStats.paymentMethodData.length > 0 ? (
                <View style={styles.chartContainer}>
                  <PieChart
                    data={paymentMethodStats.paymentMethodData.map(item => ({
                      value: parseFloat(item.percentage.toFixed(1)),
                      color: item.color,
                      name: item.name,
                    }))}
                    radius={chartWidth / 4}
                    textColor="black"
                    textSize={12}
                    showText
                    showValuesAsLabels
                    textBackgroundRadius={18}
                    focusOnPress
                    centerLabelComponent={() => (
                      <View style={styles.centerLabel}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                          ¥{paymentMethodStats.totalExpenses.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  />
                </View>
              ) : (
                <Text style={styles.emptyText}>データがありません</Text>
              )}
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  // 引き落とし予定のセクション
  const renderUpcomingSettlementsSection = () => {
    const hasCurrentMonthPayments = upcomingSettlements.currentMonthPayments.length > 0;
    const hasNextMonthPayments = upcomingSettlements.nextMonthPayments.length > 0;

    if (!hasCurrentMonthPayments && !hasNextMonthPayments) {
      return null;
    }

    return (
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <IconButton
                icon="calendar-check"
                size={24}
                iconColor={theme.colors.primary}
                style={styles.sectionIcon}
              />
              <Text variant="titleMedium">引き落とし予定</Text>
            </View>
          </View>
          
          {hasCurrentMonthPayments && (
            <View style={styles.settlementSection}>
              <Text variant="titleSmall" style={styles.settlementTitle}>
                今月の引き落とし (¥{upcomingSettlements.totalCurrentMonth.toLocaleString()})
              </Text>
              {upcomingSettlements.currentMonthPayments.map(payment => (
                <View key={payment.id} style={styles.settlementItem}>
                  <View style={styles.settlementInfo}>
                    <IconButton
                      icon={payment.type === 'credit_card' ? 'credit-card' : 'bank-transfer'}
                      size={20}
                      iconColor={theme.colors.primary}
                      style={styles.iconButton}
                    />
                    <View>
                      <Text variant="bodyMedium">{payment.name}</Text>
                      <Text variant="bodySmall" style={styles.settlementDate}>
                        {getJapaneseMonth(payment.billingDate)} {payment.billingDay}日
                      </Text>
                    </View>
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={styles.settlementAmount}
                  >
                    ¥{payment.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          {hasNextMonthPayments && (
            <View style={styles.settlementSection}>
              <Text variant="titleSmall" style={styles.settlementTitle}>
                来月の引き落とし (¥{upcomingSettlements.totalNextMonth.toLocaleString()})
              </Text>
              {upcomingSettlements.nextMonthPayments.map(payment => (
                <View key={payment.id} style={styles.settlementItem}>
                  <View style={styles.settlementInfo}>
                    <IconButton
                      icon={payment.type === 'credit_card' ? 'credit-card' : 'bank-transfer'}
                      size={20}
                      iconColor={theme.colors.primary}
                      style={styles.iconButton}
                    />
                    <View>
                      <Text variant="bodyMedium">{payment.name}</Text>
                      <Text variant="bodySmall" style={styles.settlementDate}>
                        {getJapaneseMonth(payment.billingDate)} {payment.billingDay}日
                      </Text>
                    </View>
                  </View>
                  <Text
                    variant="bodyLarge"
                    style={styles.settlementAmount}
                  >
                    ¥{payment.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderTotalAssets()}
      {renderAccountsSection()}
      {renderMonthlyStatsSection()}
      {renderUpcomingSettlementsSection()}
    </ScrollView>
  );
};

// 口座タイプに応じた色を取得する関数
const getAccountColor = (type: string): string => {
  switch (type) {
    case 'cash':
      return COLORS.lightPurple;
    case 'bank':
      return COLORS.lightBlue;
    case 'credit':
      return COLORS.pinkPurple;
    case 'investment':
      return COLORS.purple;
    default:
      return '#757575'; // グレー
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    paddingHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    margin: 0,
    marginRight: 4,
  },
  totalBalanceText: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  assetDetailsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  operatingAssetsContainer: {
    alignItems: 'center',
  },
  operatingAssetsLabel: {
    color: '#757575',
  },
  operatingAssetsText: {
    fontWeight: 'bold',
    color: COLORS.purple,
  },
  accountsList: {
    marginTop: 8,
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#757575',
  },
  statsSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  graphButton: {
    marginHorizontal: 4,
  },
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsLabel: {
    color: '#757575',
    marginBottom: 4,
  },
  statsAmount: {
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: COLORS.lightPurple,
  },
  expenseAmount: {
    color: COLORS.pinkPurple,
  },
  chartTitle: {
    marginBottom: 8,
    color: '#757575',
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  centerLabel: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  settlementSection: {
    marginBottom: 16,
  },
  settlementTitle: {
    marginVertical: 8,
    color: '#757575',
  },
  settlementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  settlementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementDate: {
    color: '#757575',
  },
  settlementAmount: {
    fontWeight: 'bold',
  },
  managementButton: {
    marginLeft: 8,
  },
  iconButton: {
    margin: 0,
  },
}); 