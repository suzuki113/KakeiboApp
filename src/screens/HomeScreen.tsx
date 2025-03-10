import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { Text, Card, useTheme, Button, List, IconButton, Divider, FAB, SegmentedButtons } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTransactions, getCategories, getPaymentMethods, getAccounts, updateAccountBalances } from '../utils/storage';
import { calculateBalance, calculateMonthlyStats, calculateMonthlyPaymentMethodStats, calculateUpcomingSettlements } from '../utils/calculations';
import { PieChart } from 'react-native-gifted-charts';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Account, PaymentMethod } from '../models/types';
import { COLORS } from '../theme/theme';
import QuickTransactionModal from '../components/QuickTransactionModal';
import MoneyText from '../components/MoneyText';

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
  
  // 取引入力モーダル状態
  const [showTransactionModal, setShowTransactionModal] = useState(false);

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
      <View style={styles.section}>
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
            <MoneyText 
              amount={balances.totalBalance} 
              size="large"
              isIncome={true} 
              style={styles.totalBalanceText}
            />
            <View style={styles.assetDetailsContainer}>
              <View style={styles.operatingAssetsContainer}>
                <Text variant="bodyMedium" style={styles.operatingAssetsLabel}>運用中資産</Text>
                <MoneyText 
                  amount={balances.accountBalances.investment} 
                  size="medium"
                  isIncome={true} 
                  style={styles.operatingAssetsText}
                />
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  // 口座残高のセクション
  const renderAccountsSection = () => {
    return (
      <View style={styles.section}>
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
                      <IconButton
                        icon={getAccountIcon(account.type)}
                        size={20}
                        iconColor={getAccountColor(account.type)}
                        style={styles.accountIcon}
                      />
                      <Text style={styles.accountName}>{account.name}</Text>
                    </View>
                    <MoneyText
                      amount={account.balance}
                      isIncome={true}
                      size="small"
                    />
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  // 月間統計のセクション
  const renderMonthlyStatsSection = () => {
    return (
      <View style={styles.section}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <IconButton
                  icon="chart-line"
                  size={24}
                  iconColor={theme.colors.primary}
                  style={styles.sectionIcon}
                />
                <Text variant="titleMedium">{getJapaneseMonth(new Date(monthlyStats.year, monthlyStats.month - 1))}の収支</Text>
              </View>
            </View>

            {/* カテゴリと支払い方法の切り替えボタン */}
            <SegmentedButtons
              value={activeGraph}
              onValueChange={(value) => setActiveGraph(value as 'category' | 'paymentMethod')}
              buttons={[
                { value: 'category', label: 'カテゴリ' },
                { value: 'paymentMethod', label: '支払い方法' },
              ]}
              style={styles.segmentedButtons}
            />
            
            {/* 円グラフの表示 */}
            {activeGraph === 'category' ? (
              <>
                <Text variant="titleSmall" style={styles.chartTitle}>支出カテゴリ</Text>
                {monthlyStats.expenseData.length > 0 ? (
                  <>
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
                    
                    {/* 収支情報（グラフの下に移動） */}
                    <View style={styles.statsOverview}>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsLabel}>収入</Text>
                        <MoneyText
                          amount={monthlyStats.totalIncome}
                          isIncome={true}
                          size="small"
                          style={styles.incomeAmount}
                        />
                      </View>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsLabel}>支出</Text>
                        <MoneyText
                          amount={monthlyStats.totalExpenses}
                          isIncome={false}
                          size="small"
                          style={styles.expenseAmount}
                        />
                      </View>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsLabel}>残高</Text>
                        <MoneyText
                          amount={monthlyStats.balance}
                          isIncome={monthlyStats.balance >= 0}
                          size="small"
                        />
                      </View>
                    </View>
                    
                    {/* カテゴリ別の金額リスト */}
                    <View style={styles.categoryListContainer}>
                      {monthlyStats.expenseData
                        .sort((a, b) => b.amount - a.amount) // 金額の多い順にソート
                        .map((category, index) => (
                          <View key={index} style={styles.categoryListItem}>
                            <View style={styles.categoryListItemLeft}>
                              <View style={[styles.categoryColorDot, { backgroundColor: category.color }]} />
                              <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">
                                {category.name}
                              </Text>
                            </View>
                            <MoneyText
                              amount={category.amount}
                              isIncome={false}
                              size="small"
                              style={styles.categoryAmount}
                            />
                            <Text style={styles.categoryPercentage}>
                              {category.percentage.toFixed(1)}%
                            </Text>
                          </View>
                        ))}
                    </View>
                  </>
                ) : (
                  <Text style={styles.emptyText}>データがありません</Text>
                )}
              </>
            ) : (
              <>
                <Text variant="titleSmall" style={styles.chartTitle}>支払い方法</Text>
                {paymentMethodStats.paymentMethodData.length > 0 ? (
                  <>
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
                    
                    {/* 収支情報（グラフの下に移動） */}
                    <View style={styles.statsOverview}>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsLabel}>収入</Text>
                        <MoneyText
                          amount={monthlyStats.totalIncome}
                          isIncome={true}
                          size="small"
                          style={styles.incomeAmount}
                        />
                      </View>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsLabel}>支出</Text>
                        <MoneyText
                          amount={monthlyStats.totalExpenses}
                          isIncome={false}
                          size="small"
                          style={styles.expenseAmount}
                        />
                      </View>
                      <View style={styles.statsItem}>
                        <Text style={styles.statsLabel}>残高</Text>
                        <MoneyText
                          amount={monthlyStats.balance}
                          isIncome={monthlyStats.balance >= 0}
                          size="small"
                        />
                      </View>
                    </View>
                    
                    {/* 支払い方法別の金額リスト */}
                    <View style={styles.categoryListContainer}>
                      {paymentMethodStats.paymentMethodData
                        .sort((a, b) => b.amount - a.amount) // 金額の多い順にソート
                        .map((method, index) => (
                          <View key={index} style={styles.categoryListItem}>
                            <View style={styles.categoryListItemLeft}>
                              <View style={[styles.categoryColorDot, { backgroundColor: method.color }]} />
                              <Text style={styles.categoryName} numberOfLines={1} ellipsizeMode="tail">
                                {method.name}
                              </Text>
                            </View>
                            <MoneyText
                              amount={method.amount}
                              isIncome={false}
                              size="small"
                              style={styles.categoryAmount}
                            />
                            <Text style={styles.categoryPercentage}>
                              {method.percentage.toFixed(1)}%
                            </Text>
                          </View>
                        ))}
                    </View>
                  </>
                ) : (
                  <Text style={styles.emptyText}>データがありません</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  // 引き落とし予定のセクション
  const renderUpcomingSettlementsSection = () => {
    if (upcomingSettlements.currentMonthPayments.length === 0 && upcomingSettlements.nextMonthPayments.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <IconButton
                  icon="calendar-clock"
                  size={24}
                  iconColor={theme.colors.primary}
                  style={styles.sectionIcon}
                />
                <Text variant="titleMedium">引き落とし予定</Text>
              </View>
            </View>
            
            {/* 今月の引き落とし */}
            {upcomingSettlements.currentMonthPayments.length > 0 && (
              <View style={styles.settlementSection}>
                <Text style={styles.settlementTitle}>
                  今月の引き落とし (
                  <MoneyText
                    amount={upcomingSettlements.totalCurrentMonth}
                    isIncome={false}
                    size="small"
                    showSign={false}
                  />
                  )
                </Text>

                {upcomingSettlements.currentMonthPayments.map(payment => (
                  <View key={payment.id} style={styles.settlementItem}>
                    <View style={styles.settlementInfo}>
                      <IconButton
                        icon={getPaymentMethodIcon(payment.type)}
                        size={20}
                        iconColor={theme.colors.primary}
                        style={styles.iconButton}
                      />
                      <View>
                        <Text>{payment.name}</Text>
                        <Text style={styles.settlementDate}>{payment.billingDate.getDate()}日</Text>
                      </View>
                    </View>
                    <MoneyText
                      amount={payment.amount}
                      isIncome={false}
                      size="small"
                      style={styles.settlementAmount}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* 来月の引き落とし */}
            {upcomingSettlements.nextMonthPayments.length > 0 && (
              <View style={styles.settlementSection}>
                <Text style={styles.settlementTitle}>
                  来月の引き落とし (
                  <MoneyText
                    amount={upcomingSettlements.totalNextMonth}
                    isIncome={false}
                    size="small"
                    showSign={false}
                  />
                  )
                </Text>

                {upcomingSettlements.nextMonthPayments.map(payment => (
                  <View key={payment.id} style={styles.settlementItem}>
                    <View style={styles.settlementInfo}>
                      <IconButton
                        icon={getPaymentMethodIcon(payment.type)}
                        size={20}
                        iconColor={theme.colors.primary}
                        style={styles.iconButton}
                      />
                      <View>
                        <Text>{payment.name}</Text>
                        <Text style={styles.settlementDate}>{payment.billingDate.getDate()}日</Text>
                      </View>
                    </View>
                    <MoneyText
                      amount={payment.amount}
                      isIncome={false}
                      size="small"
                      style={styles.settlementAmount}
                    />
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderTotalAssets()}
        {renderAccountsSection()}
        {renderMonthlyStatsSection()}
        {renderUpcomingSettlementsSection()}
      </ScrollView>
      
      {/* 取引追加FAB */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="入力"
        onPress={() => setShowTransactionModal(true)}
      />
      
      {/* 取引の簡易入力モーダル */}
      <QuickTransactionModal
        visible={showTransactionModal}
        onDismiss={() => setShowTransactionModal(false)}
        onSuccess={onRefresh}
      />
    </View>
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
    backgroundColor: COLORS.white,
    padding: 12,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    elevation: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
  },
  cardContent: {
    padding: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    margin: 0,
  },
  totalBalanceText: {
    textAlign: 'center',
    marginVertical: 8,
  },
  assetDetailsContainer: {
    marginTop: 8,
  },
  operatingAssetsContainer: {
    alignItems: 'center',
  },
  operatingAssetsLabel: {
    color: '#757575',
  },
  operatingAssetsText: {
    marginTop: 4,
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
  accountIcon: {
    margin: 0,
    marginRight: 4,
  },
  accountName: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#757575',
  },
  segmentButton: {
    flex: 1,
    marginHorizontal: 4,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.purple,
  },
  categoryListContainer: {
    marginTop: 16,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    justifyContent: 'space-between',
  },
  categoryListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: '50%', // 名前部分の最大幅を50%に制限
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
  },
  categoryAmount: {
    textAlign: 'right',
    flex: 1,
  },
  categoryPercentage: {
    color: '#757575',
    width: 50,
    textAlign: 'right',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
}); 