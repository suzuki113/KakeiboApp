import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  useTheme, 
  IconButton, 
  FAB, 
  Divider, 
  List, 
  Badge, 
  Button,
  ActivityIndicator,
  Menu
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { 
  getRecurringTransactions, 
  deleteRecurringTransaction, 
  getCategories,
  getPaymentMethods,
  getAccounts
} from '../utils/storage';
import { 
  RecurringTransaction, 
  RecurrenceFrequency, 
  Category, 
  PaymentMethod, 
  Account,
  RecurringTransactionStatus
} from '../models/types';
import { COLORS } from '../theme/theme';
import { processRecurringTransactions, simulateRecurringTransactions } from '../utils/recurringTransactions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RecurringTransactionListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();
  
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [menuVisible, setMenuVisible] = useState<{[key: string]: boolean}>({});
  
  const loadData = async () => {
    try {
      const rtData = await getRecurringTransactions();
      const catsData = await getCategories();
      const pmData = await getPaymentMethods();
      const accsData = await getAccounts();
      
      setRecurringTransactions(
        rtData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      );
      setCategories(catsData);
      setPaymentMethods(pmData);
      setAccounts(accsData);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    }
  };
  
  // 手動更新処理
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
  
  // 定期取引を手動で実行する
  const runRecurringTransactions = async () => {
    try {
      setProcessing(true);
      const result = await processRecurringTransactions();
      
      Alert.alert(
        '処理完了',
        `処理結果:\n処理件数: ${result.processed}\n生成件数: ${result.created}\nエラー: ${result.errors}`
      );
      
      // データを再読み込み
      await loadData();
    } catch (error) {
      console.error('定期取引処理エラー:', error);
      Alert.alert('エラー', '定期取引の処理に失敗しました');
    } finally {
      setProcessing(false);
    }
  };
  
  // メニューの表示切替
  const toggleMenu = (id: string) => {
    setMenuVisible({
      ...menuVisible,
      [id]: !menuVisible[id]
    });
  };
  
  // 定期取引を削除する
  const handleDelete = async (id: string) => {
    try {
      Alert.alert(
        '削除の確認',
        'この定期取引を削除してもよろしいですか？\n過去のトランザクションは削除されません。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: '削除', 
            style: 'destructive',
            onPress: async () => {
              await deleteRecurringTransaction(id);
              await loadData();
            }
          }
        ]
      );
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '定期取引の削除に失敗しました');
    }
  };
  
  // 日本語で頻度を表示する
  const getFrequencyLabel = (frequency: RecurrenceFrequency, interval: number) => {
    switch (frequency) {
      case 'daily':
        return interval === 1 ? '毎日' : `${interval}日ごと`;
      case 'weekly':
        return interval === 1 ? '毎週' : `${interval}週間ごと`;
      case 'monthly':
        return interval === 1 ? '毎月' : `${interval}ヶ月ごと`;
      case 'yearly':
        return interval === 1 ? '毎年' : `${interval}年ごと`;
      default:
        return '不明';
    }
  };
  
  // 曜日を日本語で表示
  const getDayOfWeekLabel = (dayOfWeek?: number) => {
    if (dayOfWeek === undefined) return '';
    
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[dayOfWeek] + '曜日';
  };
  
  // ステータスに応じた色とラベルを取得
  const getStatusInfo = (status: RecurringTransactionStatus) => {
    switch (status) {
      case 'active':
        return { color: COLORS.lightPurple, label: '有効' };
      case 'paused':
        return { color: '#FFA000', label: '一時停止' };
      case 'cancelled':
        return { color: '#F44336', label: '無効' };
      default:
        return { color: '#9E9E9E', label: '不明' };
    }
  };
  
  // カテゴリー名を取得
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '不明なカテゴリ';
  };
  
  // アカウント名を取得
  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : '不明なアカウント';
  };
  
  // 支払い方法名を取得
  const getPaymentMethodName = (paymentMethodId: string) => {
    const paymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
    return paymentMethod ? paymentMethod.name : '不明な支払い方法';
  };
  
  // 次回の実行日を表示
  const getNextExecutionDate = (rt: RecurringTransaction) => {
    const today = new Date();
    const nextDates = simulateRecurringTransactions(rt, today, new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000));
    
    if (nextDates.length === 0) {
      return '予定なし';
    }
    
    return nextDates[0].toLocaleDateString('ja-JP');
  };
  
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerContent}>
              <View>
                <Text variant="titleMedium">定期的な入出金の管理</Text>
                <Text variant="bodySmall">サブスクリプションや給与など定期的な取引を自動化します</Text>
              </View>
              <Button
                mode="contained"
                onPress={runRecurringTransactions}
                disabled={processing}
                icon="play"
              >
                今すぐ実行
              </Button>
            </View>
            {processing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator animating={true} color={theme.colors.primary} />
                <Text style={{ marginLeft: 10 }}>処理中...</Text>
              </View>
            )}
          </Card.Content>
        </Card>
        
        {recurringTransactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <IconButton icon="calendar-refresh" size={40} iconColor={theme.colors.primary} />
              <Text style={styles.emptyText}>定期取引がありません</Text>
              <Text variant="bodySmall">右下の「+」ボタンから新しい定期取引を登録できます</Text>
            </Card.Content>
          </Card>
        ) : (
          recurringTransactions.map(rt => {
            const statusInfo = getStatusInfo(rt.status);
            
            return (
              <Card key={rt.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                      <Text variant="titleMedium">{rt.title}</Text>
                      <Badge style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                        {statusInfo.label}
                      </Badge>
                    </View>
                    
                    <View style={styles.menuContainer}>
                      <Text
                        variant="titleMedium"
                        style={[
                          styles.amount,
                          rt.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                        ]}
                      >
                        {rt.type === 'income' ? '+' : '-'}¥{rt.amount.toLocaleString()}
                      </Text>
                      
                      <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={() => toggleMenu(rt.id)}
                      />
                      
                      <Menu
                        visible={menuVisible[rt.id] || false}
                        onDismiss={() => toggleMenu(rt.id)}
                        anchor={<View />}
                      >
                        <Menu.Item
                          title="編集"
                          leadingIcon="pencil"
                          onPress={() => {
                            toggleMenu(rt.id);
                            navigation.navigate('RecurringTransactionForm', { recurringTransactionId: rt.id });
                          }}
                        />
                        <Menu.Item
                          title="削除"
                          leadingIcon="delete"
                          onPress={() => {
                            toggleMenu(rt.id);
                            handleDelete(rt.id);
                          }}
                        />
                      </Menu>
                    </View>
                  </View>
                  
                  <Divider style={styles.divider} />
                  
                  <List.Item
                    title="頻度"
                    description={getFrequencyLabel(rt.frequency, rt.interval)}
                    left={props => <List.Icon {...props} icon="calendar-refresh" />}
                    style={styles.listItem}
                  />
                  
                  {rt.frequency === 'monthly' && rt.dayOfMonth && (
                    <List.Item
                      title="毎月の日付"
                      description={`${rt.dayOfMonth}日`}
                      left={props => <List.Icon {...props} icon="calendar-month" />}
                      style={styles.listItem}
                    />
                  )}
                  
                  {rt.frequency === 'weekly' && rt.dayOfWeek !== undefined && (
                    <List.Item
                      title="曜日"
                      description={getDayOfWeekLabel(rt.dayOfWeek)}
                      left={props => <List.Icon {...props} icon="calendar-week" />}
                      style={styles.listItem}
                    />
                  )}
                  
                  <List.Item
                    title="次回の予定日"
                    description={getNextExecutionDate(rt)}
                    left={props => <List.Icon {...props} icon="calendar-clock" />}
                    style={styles.listItem}
                  />
                  
                  <List.Item
                    title="カテゴリ"
                    description={getCategoryName(rt.categoryId)}
                    left={props => <List.Icon {...props} icon="tag" />}
                    style={styles.listItem}
                  />
                  
                  <List.Item
                    title="口座"
                    description={getAccountName(rt.accountId)}
                    left={props => <List.Icon {...props} icon="bank" />}
                    style={styles.listItem}
                  />
                  
                  <List.Item
                    title="支払方法"
                    description={getPaymentMethodName(rt.paymentMethodId)}
                    left={props => <List.Icon {...props} icon="credit-card" />}
                    style={styles.listItem}
                  />
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
      
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('RecurringTransactionForm', {})}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  emptyCard: {
    borderRadius: 12,
    elevation: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
    marginVertical: 24,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    marginVertical: 8,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    marginLeft: 8,
  },
  menuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontWeight: 'bold',
  },
  incomeAmount: {
    color: COLORS.lightPurple,
  },
  expenseAmount: {
    color: COLORS.pinkPurple,
  },
  divider: {
    marginVertical: 8,
  },
  listItem: {
    paddingVertical: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default RecurringTransactionListScreen; 