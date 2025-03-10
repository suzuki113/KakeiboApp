import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { Text, Card, IconButton, FAB, Searchbar, Divider, Chip, Menu, Button, useTheme } from 'react-native-paper';
import { Transaction, Category, PaymentMethod, InvestmentItem, Account } from '../models/types';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getTransactions, deleteTransaction, getCategories, getPaymentMethods, getAccounts } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 日付ごとにトランザクションをグループ化する関数
const groupTransactionsByDate = (transactions: Transaction[]) => {
  const groups: { [key: string]: Transaction[] } = {};
  
  transactions.forEach(transaction => {
    const dateStr = transaction.date.toLocaleDateString('ja-JP');
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(transaction);
  });
  
  // 日付の降順でソート
  return Object.keys(groups)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map(date => ({
      date,
      transactions: groups[date].sort((a, b) => b.date.getTime() - a.date.getTime())
    }));
};

// 仮データ（実際の実装ではデータベースから取得）
const dummyInvestmentItems: InvestmentItem[] = [
  {
    id: '1',
    name: 'Apple Inc.',
    type: 'stock',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Bitcoin',
    type: 'crypto',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'S&P500',
    type: 'mutual_fund',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: '米国債10年',
    type: 'bond',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 日付フォーマット関数
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ja-JP', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
};

// 時間フォーマット関数
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ja-JP', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

export const TransactionsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState<{[key: string]: boolean}>({});
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    minAmount: '',
    maxAmount: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    selectedTypes: [] as string[],
    selectedCategories: [] as string[],
    selectedPaymentMethods: [] as string[],
  });
  
  // 口座情報取得関数（コンポーネント内に移動）
  const getAccountById = (accountId: string): Account | undefined => {
    return accounts.find(account => account.id === accountId);
  };
  
  // 口座アイコン取得関数（コンポーネント内に移動）
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

  const loadData = async () => {
    const txData = await getTransactions();
    const catData = await getCategories();
    const pmData = await getPaymentMethods();
    const accData = await getAccounts();
    setTransactions(txData.sort((a, b) => b.date.getTime() - a.date.getTime()));
    setCategories(catData);
    setPaymentMethods(pmData);
    setAccounts(accData);
  };

  const handleDelete = async (id: string) => {
    await deleteTransaction(id);
    await loadData();
  };

  const handleEdit = (transaction: Transaction) => {
    navigation.navigate('AddTransaction' as any, { transaction });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleMenu = (id: string) => {
    setMenuVisible({
      ...menuVisible,
      [id]: !menuVisible[id]
    });
  };

  // 支払い方法でのフィルタリング
  const applyFilters = (transactions: Transaction[]) => {
    let filtered = transactions;
    
    // 検索クエリでフィルタリング
    filtered = filtered.filter(transaction => 
      transaction.description.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (transaction.categoryId && 
        categories.find(c => c.id === transaction.categoryId)?.name.toLowerCase().includes(filters.searchTerm.toLowerCase()))
    );
    
    // 支払い方法でフィルタリング
    if (filters.selectedPaymentMethods.length > 0) {
      filtered = filtered.filter(transaction => 
        filters.selectedPaymentMethods.includes(transaction.paymentMethodId)
      );
    }
    
    return filtered;
  };

  // グループ化されたトランザクション
  const groupedTransactions = groupTransactionsByDate(applyFilters(transactions));

  // カテゴリの取得
  const getCategoryById = (categoryId?: string) => {
    if (!categoryId) return null;
    return categories.find(c => c.id === categoryId);
  };

  // 支払い方法の取得
  const getPaymentMethodById = (paymentMethodId?: string) => {
    if (!paymentMethodId) return null;
    return paymentMethods.find(pm => pm.id === paymentMethodId);
  };

  const getInvestmentItemById = (investmentItemId?: string) => {
    if (!investmentItemId) return null;
    return investmentItems.find(item => item.id === investmentItemId) || null;
  };

  // 取引タイプに応じたアイコンとカラーを取得
  const getTransactionTypeIconAndColor = (type: string) => {
    switch (type) {
      case 'expense':
        return { icon: 'cash-minus', color: '#f44336' };
      case 'income':
        return { icon: 'cash-plus', color: '#4caf50' };
      case 'transfer':
        return { icon: 'bank-transfer', color: '#2196f3' };
      case 'investment':
        return { icon: 'chart-line', color: '#9c27b0' };
      default:
        return { icon: 'cash', color: '#757575' };
    }
  };

  // 振替取引の場合、振替元と振替先の口座を取得
  const getTransferAccounts = (transaction: Transaction) => {
    if (transaction.type !== 'transfer') return null;
    
    // 振替取引では、paymentMethodIdが振替元、accountIdが振替先として使用されている想定
    const sourceAccount = accounts.find(a => a.id === transaction.paymentMethodId);
    const destinationAccount = accounts.find(a => a.id === transaction.accountId);
    
    return {
      source: sourceAccount,
      destination: destinationAccount
    };
  };

  // 画面がフォーカスされるたびにデータを再読み込み
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      minAmount: '',
      maxAmount: '',
      startDate: null,
      endDate: null,
      selectedTypes: [],
      selectedCategories: [],
      selectedPaymentMethods: [],
    });
    setFilterMenuVisible(false);
  };

  // 関連トランザクションを取得する関数を追加
  const getRelatedTransaction = (relatedId: string): Transaction | undefined => {
    return transactions.find(t => t.id === relatedId);
  };

  // 関連トランザクションに移動する関数
  const navigateToRelatedTransaction = (relatedId: string) => {
    const relatedTransaction = getRelatedTransaction(relatedId);
    if (relatedTransaction) {
      navigation.navigate('AddTransaction', { transaction: relatedTransaction });
    }
  };

  // トランザクションカードをレンダリングする関数
  const renderTransactionCard = (transaction: Transaction) => {
    const category = getCategoryById(transaction.categoryId);
    const paymentMethod = getPaymentMethodById(transaction.paymentMethodId);
    const account = getAccountById(transaction.accountId);
    const typeInfo = getTransactionTypeIconAndColor(transaction.type);

    // 状態アイコンの計算
    let statusIcon = undefined;
    let statusIconColor = undefined;
    
    if (transaction.status === 'pending_settlement') {
      statusIcon = 'clock-outline';
      statusIconColor = '#FFA000'; // オレンジ色（警告色）
    } else if (transaction.status === 'settlement') {
      statusIcon = 'bank-transfer';
      statusIconColor = '#4CAF50'; // 緑色（成功色）
    }

    // キャプションに表示される情報を構築
    const transferAccounts = getTransferAccounts(transaction);
    
    return (
      <Card style={styles.card} key={transaction.id}>
        <TouchableOpacity
          onPress={() => handleEdit(transaction)}
          style={{ flex: 1 }}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.leftSection}>
                <View style={[styles.typeIconContainer, { backgroundColor: typeInfo.color }]}>
                  <IconButton
                    icon={typeInfo.icon}
                    iconColor="#fff"
                    size={18}
                    style={styles.typeIcon}
                  />
                </View>
                
                <View style={styles.timeInfoContainer}>
                  <Text variant="labelMedium" style={styles.time}>
                    {formatTime(transaction.date)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.rightSection}>
                <Text 
                  variant="titleMedium" 
                  style={[
                    styles.amount, 
                    transaction.type === 'income' ? styles.incomeAmount : 
                    transaction.type === 'expense' ? styles.expenseAmount : 
                    styles.transferAmount
                  ]}
                >
                  {transaction.type === 'income' ? '+' : 
                   transaction.type === 'expense' ? '-' : ''}
                  ¥{transaction.amount.toLocaleString()}
                </Text>
                
                <IconButton
                  icon="dots-vertical"
                  size={20}
                  onPress={() => toggleMenu(transaction.id)}
                />
                
                <Menu
                  visible={menuVisible[transaction.id] || false}
                  onDismiss={() => toggleMenu(transaction.id)}
                  anchor={<View />}
                >
                  <Menu.Item 
                    onPress={() => {
                      toggleMenu(transaction.id);
                      navigation.navigate('AddTransaction', { transaction });
                    }} 
                    title="編集" 
                    leadingIcon="pencil"
                  />
                  <Menu.Item 
                    onPress={() => {
                      toggleMenu(transaction.id);
                      handleDelete(transaction.id);
                    }} 
                    title="削除" 
                    leadingIcon="delete"
                  />
                </Menu>
              </View>
            </View>
            
            <View style={styles.descriptionContainer}>
              <Text variant="bodyLarge" style={styles.description}>
                {transaction.description}
              </Text>
              
              {statusIcon && (
                <IconButton
                  icon={statusIcon}
                  size={18}
                  iconColor={statusIconColor}
                  style={styles.statusIcon}
                />
              )}
            </View>
            
            <View style={styles.iconsContainer}>
              {category && transaction.type !== 'transfer' && (
                <View style={[styles.infoIconContainer, { borderColor: category.color }]}>
                  <Text style={[styles.infoIconText, { color: category.color }]}>
                    {category.name}
                  </Text>
                </View>
              )}
              
              {paymentMethod && transaction.type !== 'transfer' && (
                <IconButton
                  icon={getPaymentMethodIcon(paymentMethod.type)}
                  size={16}
                  style={styles.infoIcon}
                  iconColor={theme.colors.primary}
                />
              )}
              
              {account && (
                <IconButton
                  icon={getAccountIcon(account.type)}
                  size={16}
                  style={styles.infoIcon}
                  iconColor={theme.colors.primary}
                />
              )}
              
              {transaction.relatedTransactionId && (
                <IconButton
                  icon="link-variant"
                  size={16}
                  style={styles.infoIcon}
                  iconColor={theme.colors.primary}
                  onPress={() => navigateToRelatedTransaction(transaction.relatedTransactionId!)}
                />
              )}
            </View>
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="取引を検索..."
          onChangeText={(text) => setFilters({ ...filters, searchTerm: text })}
          value={filters.searchTerm}
          style={styles.searchBar}
        />
        <IconButton
          icon="filter-variant"
          size={24}
          onPress={() => setFilterMenuVisible(true)}
          style={[
            styles.filterButton,
            filters.selectedPaymentMethods.length > 0 ? styles.filterButtonActive : null
          ]}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={{ x: Dimensions.get('window').width - 40, y: 60 }}
        >
          <Menu.Item title="支払い方法でフィルター" disabled />
          <Divider />
          {paymentMethods.map(pm => (
            <Menu.Item
              key={pm.id}
              title={pm.name}
              onPress={() => {
                setFilters({ ...filters, selectedPaymentMethods: [pm.id] });
                setFilterMenuVisible(false);
              }}
              leadingIcon={filters.selectedPaymentMethods.includes(pm.id) ? "check" : undefined}
            />
          ))}
          <Divider />
          <Menu.Item
            title="フィルターをクリア"
            onPress={clearFilters}
            leadingIcon="filter-remove"
          />
        </Menu>
      </View>

      {filters.selectedPaymentMethods.length > 0 && (
        <View style={styles.activeFilterContainer}>
          <Text variant="bodyMedium">フィルター: </Text>
          <Chip
            onClose={clearFilters}
            style={styles.filterChip}
          >
            {paymentMethods.find(pm => pm.id === filters.selectedPaymentMethods[0])?.name || '支払い方法'}
          </Chip>
        </View>
      )}
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {groupedTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                取引がありません
              </Text>
            </Card.Content>
          </Card>
        ) : (
          groupedTransactions.map(group => (
            <View key={group.date}>
              <View style={styles.dateHeader}>
                <Text variant="titleMedium" style={styles.dateText}>
                  {group.date}
                </Text>
              </View>
              
              {group.transactions.map(transaction => renderTransactionCard(transaction))}
            </View>
          ))
        )}
      </ScrollView>
      
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddTransaction' as any)}
      />
    </View>
  );
};

// 支払い方法のアイコンを取得する関数
const getPaymentMethodIcon = (type: string): string => {
  switch (type) {
    case 'cash':
      return 'cash';
    case 'credit_card':
      return 'credit-card';
    case 'bank_transfer':
      return 'bank';
    case 'electronic_money':
      return 'cellphone';
    default:
      return 'cash';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  searchBar: {
    flex: 1,
    elevation: 2,
  },
  filterButton: {
    marginLeft: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  activeFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    marginHorizontal: 4,
  },
  dateHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e0e0e0',
  },
  dateText: {
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typeIcon: {
    margin: 0,
    padding: 0,
  },
  timeInfoContainer: {
    marginLeft: 4,
  },
  time: {
    color: '#757575',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: '#4caf50',
  },
  expenseAmount: {
    color: '#f44336',
  },
  transferAmount: {
    color: '#2196f3',
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  description: {
    flex: 1,
  },
  statusIcon: {
    margin: 0,
    width: 24,
    height: 24,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  infoIconContainer: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  infoIconText: {
    fontSize: 12,
  },
  infoIcon: {
    margin: 0,
    width: 24,
    height: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyCard: {
    margin: 16,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
  },
  pendingCard: {
    backgroundColor: '#fff8e1', // 薄い黄色
  },
  settlementCard: {
    backgroundColor: '#e8f5e9', // 薄い緑
  },
  relatedChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: '#e3f2fd',
  },
}); 