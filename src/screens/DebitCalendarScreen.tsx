import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, Card, Button, FAB, IconButton, TextInput, useTheme, Menu, Divider } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentMethod, Account, Transaction } from '../models/types';
import { getAccounts, getPaymentMethods, getTransactions } from '../utils/storage';
import { calculateUpcomingSettlements } from '../utils/calculations';

// 新しい引き落し予定のタイプを定義
interface DebitSchedule {
  id: string;
  date: string; // "YYYY-MM-DD" 形式
  amount: number;
  description: string;
  paymentMethodId: string;
  accountId: string;
  createdAt: string;
  updatedAt: string;
}

// 引き落とし予定の統合型
interface CombinedDebitItem {
  id: string;
  date: string;
  amount: number;
  description: string;
  paymentMethodId: string;
  accountId?: string;
  source: 'manual' | 'transaction'; // 手動追加かトランザクションからの自動計算か
  billingDay?: number;
}

// 自動計算された引き落とし予定のタイプを定義
interface AutoDebitSchedules {
  currentMonthPayments: {
    id: string;
    name: string;
    amount: number;
    billingDay: number;
    billingDate: Date;
    type: string;
  }[];
  nextMonthPayments: {
    id: string;
    name: string;
    amount: number;
    billingDay: number;
    billingDate: Date;
    type: string;
  }[];
  totalCurrentMonth: number;
  totalNextMonth: number;
  updatedAt: string;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 日付フォーマット関数
const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 日本語形式の日付フォーマット
const formatDateJP = (date: Date): string => {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export const DebitCalendarScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const today = formatDateString(new Date());

  // 状態変数
  const [selectedDate, setSelectedDate] = useState(today);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [debitSchedules, setDebitSchedules] = useState<DebitSchedule[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [combinedDebitItems, setCombinedDebitItems] = useState<CombinedDebitItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  // 新しい引き落とし予定のための状態
  const [newDebit, setNewDebit] = useState({
    amount: '',
    description: '',
    paymentMethodId: '',
    accountId: '',
    date: selectedDate
  });
  const [showPaymentMethodMenu, setShowPaymentMethodMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [autoDebitSchedules, setAutoDebitSchedules] = useState<AutoDebitSchedules | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // 日付選択ハンドラー
  const onDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    setNewDebit(prev => ({ ...prev, date: day.dateString }));
  };

  // データ読み込み
  const loadData = async () => {
    try {
      console.log('引き落としカレンダーデータの読み込み開始...');
      
      // 更新中であることをユーザーに通知
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // モバイル環境の場合はToastを表示
        // Alert.alert('更新中', '引き落とし予定を更新しています...');
      }
      
      // アカウントと支払い方法を取得
      const accountsData = await getAccounts();
      const paymentMethodsData = await getPaymentMethods();
      const transactionsData = await getTransactions();
      
      setAccounts(accountsData);
      setPaymentMethods(paymentMethodsData);
      setTransactions(transactionsData);
      
      console.log('トランザクション数:', transactionsData.length);
      console.log('支払い方法数:', paymentMethodsData.length);
      
      // 保存された手動追加の引き落とし予定を取得
      const storedSchedulesJson = await AsyncStorage.getItem('debitSchedules');
      const storedSchedules: DebitSchedule[] = storedSchedulesJson 
        ? JSON.parse(storedSchedulesJson) 
        : [];
      
      setDebitSchedules(storedSchedules);
      console.log('手動追加の引き落とし予定数:', storedSchedules.length);
      
      // 更新フラグがあるかどうかを確認
      const needsUpdate = await AsyncStorage.getItem('debitSchedulesNeedUpdate');
      const forceUpdate = needsUpdate === 'true';
      
      // 自動計算された引き落とし予定を取得
      const autoSchedulesJson = await AsyncStorage.getItem('autoDebitSchedules');
      console.log('自動計算の引き落とし予定データ:', autoSchedulesJson ? 'あり' : 'なし');
      
      let autoSchedules: AutoDebitSchedules | null = null;
      let recalculated = false;
      
      if (autoSchedulesJson && !forceUpdate) {
        try {
          console.log('自動計算の引き落とし予定データを解析中...');
          const parsedData = JSON.parse(autoSchedulesJson);
          
          // billingDateをDateオブジェクトに変換
          if (parsedData.currentMonthPayments && Array.isArray(parsedData.currentMonthPayments)) {
            parsedData.currentMonthPayments = parsedData.currentMonthPayments.map((payment: any) => ({
              ...payment,
              billingDate: new Date(payment.billingDate)
            }));
          } else {
            console.warn('currentMonthPaymentsが配列ではありません:', parsedData.currentMonthPayments);
            parsedData.currentMonthPayments = [];
          }
          
          if (parsedData.nextMonthPayments && Array.isArray(parsedData.nextMonthPayments)) {
            parsedData.nextMonthPayments = parsedData.nextMonthPayments.map((payment: any) => ({
              ...payment,
              billingDate: new Date(payment.billingDate)
            }));
          } else {
            console.warn('nextMonthPaymentsが配列ではありません:', parsedData.nextMonthPayments);
            parsedData.nextMonthPayments = [];
          }
          
          autoSchedules = parsedData;
          setLastUpdate(autoSchedules!.updatedAt || new Date().toISOString());
          
          console.log('自動計算の引き落とし予定データ解析完了:');
          console.log('- 今月の引き落とし:', autoSchedules!.currentMonthPayments.length);
          console.log('- 来月の引き落とし:', autoSchedules!.nextMonthPayments.length);
        } catch (e) {
          console.error('自動引き落とし予定の解析エラー:', e);
          autoSchedules = null;
        }
      }
      
      setAutoDebitSchedules(autoSchedules);
      
      // 手動追加の引き落とし予定をCombinedDebitItemに変換
      const manualDebitItems: CombinedDebitItem[] = storedSchedules.map(schedule => ({
        id: schedule.id,
        date: schedule.date,
        amount: schedule.amount,
        description: schedule.description,
        paymentMethodId: schedule.paymentMethodId,
        accountId: schedule.accountId,
        source: 'manual'
      }));
      
      console.log('手動追加の引き落とし予定アイテム数:', manualDebitItems.length);
      
      // 自動計算された引き落とし予定をCombinedDebitItemに変換
      let currentMonthItems: CombinedDebitItem[] = [];
      let nextMonthItems: CombinedDebitItem[] = [];
      
      // 自動計算されたデータがない場合、または更新フラグがある場合は再計算
      if (!autoSchedules || 
          !autoSchedules.currentMonthPayments || 
          !autoSchedules.nextMonthPayments ||
          (autoSchedules.currentMonthPayments.length === 0 && autoSchedules.nextMonthPayments.length === 0) ||
          forceUpdate) {
        console.log('自動計算データがないか更新が必要なため、再計算を実行します...');
        
        // 引き落とし予定を計算
        const settlementData = calculateUpcomingSettlements(
          transactionsData,
          paymentMethodsData,
          accountsData
        );
        
        console.log('再計算された引き落とし予定:');
        console.log('- 今月の引き落とし:', settlementData.currentMonthPayments.length);
        console.log('- 来月の引き落とし:', settlementData.nextMonthPayments.length);
        
        // 今月の引き落とし予定をCombinedDebitItemに変換
        currentMonthItems = settlementData.currentMonthPayments.map(payment => {
          const billingDate = new Date(payment.billingDate);
          return {
            id: `current_${payment.id}_${billingDate.getTime()}`,
            date: formatDateString(billingDate),
            amount: payment.amount,
            description: `${payment.name}の引き落とし`,
            paymentMethodId: payment.id,
            source: 'transaction',
            billingDay: payment.billingDay
          };
        });
        
        // 来月の引き落とし予定をCombinedDebitItemに変換
        nextMonthItems = settlementData.nextMonthPayments.map(payment => {
          const billingDate = new Date(payment.billingDate);
          return {
            id: `next_${payment.id}_${billingDate.getTime()}`,
            date: formatDateString(billingDate),
            amount: payment.amount,
            description: `${payment.name}の引き落とし`,
            paymentMethodId: payment.id,
            source: 'transaction',
            billingDay: payment.billingDay
          };
        });
        
        // 計算結果を保存して次回使用できるようにする
        await AsyncStorage.setItem('autoDebitSchedules', JSON.stringify({
          currentMonthPayments: settlementData.currentMonthPayments,
          nextMonthPayments: settlementData.nextMonthPayments,
          totalCurrentMonth: settlementData.totalCurrentMonth,
          totalNextMonth: settlementData.totalNextMonth,
          updatedAt: new Date().toISOString()
        }));
        
        // 更新フラグをリセット
        await AsyncStorage.setItem('debitSchedulesNeedUpdate', 'false');
        recalculated = true;
      } else if (autoSchedules !== null) {
        // 保存されている自動計算データを使用
        console.log('保存されている自動計算データを使用します');
        
        // 今月の引き落とし予定
        currentMonthItems = autoSchedules.currentMonthPayments.map(payment => {
          const billingDate = payment.billingDate;
          return {
            id: `current_${payment.id}_${billingDate.getTime()}`,
            date: formatDateString(billingDate),
            amount: payment.amount,
            description: `${payment.name}の引き落とし`,
            paymentMethodId: payment.id,
            source: 'transaction',
            billingDay: payment.billingDay
          };
        });
        
        // 来月の引き落とし予定
        nextMonthItems = autoSchedules.nextMonthPayments.map(payment => {
          const billingDate = payment.billingDate;
          return {
            id: `next_${payment.id}_${billingDate.getTime()}`,
            date: formatDateString(billingDate),
            amount: payment.amount,
            description: `${payment.name}の引き落とし`,
            paymentMethodId: payment.id,
            source: 'transaction',
            billingDay: payment.billingDay
          };
        });
      }
      
      console.log('変換後の引き落とし予定アイテム数:');
      console.log('- 今月:', currentMonthItems.length);
      console.log('- 来月:', nextMonthItems.length);
      
      // すべての引き落とし予定を統合
      const allDebitItems = [...manualDebitItems, ...currentMonthItems, ...nextMonthItems];
      setCombinedDebitItems(allDebitItems);
      
      console.log('統合された引き落とし予定アイテム数:', allDebitItems.length);
      
      // マーカー付きの日付を更新
      updateMarkedDates(allDebitItems);
      
      console.log('引き落としカレンダーデータの読み込み完了');
      
      // 更新完了をユーザーに通知
      if (recalculated) {
        Alert.alert('更新完了', '引き落とし予定を再計算しました');
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      Alert.alert('エラー', '引き落とし予定の読み込みに失敗しました');
    }
  };

  // マーカー付きの日付を更新する関数
  const updateMarkedDates = (items: CombinedDebitItem[]) => {
    const marked: Record<string, any> = {};
    
    // 選択された日付をマーク
    marked[selectedDate] = {
      selected: true,
      selectedColor: theme.colors.primary,
    };
    
    // 引き落とし予定がある日付をマーク
    items.forEach(item => {
      const dateString = item.date;
      
      if (dateString in marked) {
        // 既にマークされている場合は、ドットを追加
        marked[dateString] = {
          ...marked[dateString],
          dots: [
            ...(marked[dateString].dots || []),
            { key: item.id, color: item.source === 'manual' ? theme.colors.error : theme.colors.tertiary }
          ],
          marked: true
        };
      } else {
        // 新しく日付をマーク
        marked[dateString] = {
          marked: true,
          dots: [{ key: item.id, color: item.source === 'manual' ? theme.colors.error : theme.colors.tertiary }]
        };
      }
    });
    
    setMarkedDates(marked);
  };

  // 新しい引き落とし予定を追加
  const addDebitSchedule = async () => {
    if (!newDebit.amount || !newDebit.description || !newDebit.paymentMethodId || !newDebit.accountId) {
      Alert.alert('入力エラー', '全ての項目を入力してください');
      return;
    }
    
    try {
      const amount = parseFloat(newDebit.amount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('入力エラー', '有効な金額を入力してください');
        return;
      }
      
      // 新しい引き落とし予定を作成
      const newSchedule: DebitSchedule = {
        id: Date.now().toString(),
        date: newDebit.date,
        amount,
        description: newDebit.description,
        paymentMethodId: newDebit.paymentMethodId,
        accountId: newDebit.accountId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 既存の引き落とし予定と結合
      const updatedSchedules = [...debitSchedules, newSchedule];
      
      // AsyncStorageに保存
      await AsyncStorage.setItem('debitSchedules', JSON.stringify(updatedSchedules));
      
      // 状態を更新
      setDebitSchedules(updatedSchedules);
      
      // 新しいCombinedDebitItemを作成
      const newCombinedItem: CombinedDebitItem = {
        id: newSchedule.id,
        date: newSchedule.date,
        amount: newSchedule.amount,
        description: newSchedule.description,
        paymentMethodId: newSchedule.paymentMethodId,
        accountId: newSchedule.accountId,
        source: 'manual'
      };
      
      // 統合リストを更新
      const updatedCombinedItems = [...combinedDebitItems, newCombinedItem];
      setCombinedDebitItems(updatedCombinedItems);
      
      // マーカー付きの日付を更新
      updateMarkedDates(updatedCombinedItems);
      
      // フォームをリセット
      setNewDebit({
        amount: '',
        description: '',
        paymentMethodId: '',
        accountId: '',
        date: selectedDate
      });
      setShowForm(false);
      
      Alert.alert('成功', '引き落とし予定を追加しました');
    } catch (error) {
      console.error('引き落とし予定の追加エラー:', error);
      Alert.alert('エラー', '引き落とし予定の追加に失敗しました');
    }
  };

  // 引き落とし予定を削除
  const deleteDebitSchedule = async (id: string) => {
    try {
      // 手動追加の引き落とし予定のみ削除可能
      const updatedSchedules = debitSchedules.filter(schedule => schedule.id !== id);
      await AsyncStorage.setItem('debitSchedules', JSON.stringify(updatedSchedules));
      
      setDebitSchedules(updatedSchedules);
      
      // 統合リストからも削除
      const updatedCombinedItems = combinedDebitItems.filter(item => item.id !== id);
      setCombinedDebitItems(updatedCombinedItems);
      
      // マーカー付きの日付を更新
      updateMarkedDates(updatedCombinedItems);
      
      Alert.alert('成功', '引き落とし予定を削除しました');
    } catch (error) {
      console.error('引き落とし予定の削除エラー:', error);
      Alert.alert('エラー', '引き落とし予定の削除に失敗しました');
    }
  };

  // 選択された日付の引き落とし予定を表示
  const renderSelectedDateSchedules = () => {
    const filteredItems = combinedDebitItems.filter(
      item => item.date === selectedDate
    );
    
    if (filteredItems.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text>この日の引き落とし予定はありません</Text>
          </Card.Content>
        </Card>
      );
    }
    
    return filteredItems.map(item => {
      const paymentMethod = paymentMethods.find(pm => pm.id === item.paymentMethodId);
      const account = item.accountId ? accounts.find(acc => acc.id === item.accountId) : undefined;
      
      return (
        <Card key={item.id} style={styles.scheduleCard}>
          <Card.Content>
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleDescription}>{item.description}</Text>
              {item.source === 'manual' && (
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => {
                    Alert.alert(
                      '確認',
                      'この引き落とし予定を削除しますか？',
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除', onPress: () => deleteDebitSchedule(item.id), style: 'destructive' }
                      ]
                    );
                  }}
                />
              )}
            </View>
            <Divider style={{ marginVertical: 8 }} />
            <View style={styles.scheduleDetails}>
              <Text>支払い方法: {paymentMethod?.name || '不明'}</Text>
              {account && <Text>引き落とし口座: {account.name}</Text>}
              {item.billingDay && <Text>引き落とし日: {item.billingDay}日</Text>}
              <Text style={styles.scheduleAmount}>¥{item.amount.toLocaleString()}</Text>
              {item.source === 'transaction' && (
                <Text style={styles.sourceLabel}>※取引履歴から自動計算</Text>
              )}
            </View>
          </Card.Content>
        </Card>
      );
    });
  };

  // 月間の引き落とし予定を表示
  const renderMonthlySchedules = () => {
    // 選択された月の最初と最後の日付を計算
    const date = new Date(selectedDate);
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const firstDayStr = formatDateString(firstDay);
    const lastDayStr = formatDateString(lastDay);
    
    // 選択された月の引き落とし予定をフィルタリング
    const monthlyItems = combinedDebitItems.filter(
      item => item.date >= firstDayStr && item.date <= lastDayStr
    ).sort((a, b) => a.date.localeCompare(b.date));
    
    if (monthlyItems.length === 0) {
      return (
        <Card style={styles.emptyCard}>
          <Card.Content>
            <Text>この月の引き落とし予定はありません</Text>
          </Card.Content>
        </Card>
      );
    }
    
    // 月の合計金額を計算
    const totalAmount = monthlyItems.reduce((sum, item) => sum + item.amount, 0);
    
    return (
      <>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>
              {date.getFullYear()}年{date.getMonth() + 1}月の引き落とし予定
            </Text>
            <Text style={styles.summaryTotal}>
              合計: ¥{totalAmount.toLocaleString()}
            </Text>
          </Card.Content>
        </Card>
        
        {monthlyItems.map(item => {
          const itemDate = new Date(item.date);
          const paymentMethod = paymentMethods.find(pm => pm.id === item.paymentMethodId);
          const account = item.accountId ? accounts.find(acc => acc.id === item.accountId) : undefined;
          
          return (
            <Card key={item.id} style={styles.scheduleCard}>
              <Card.Content>
                <View style={styles.scheduleHeader}>
                  <Text style={styles.scheduleDate}>
                    {itemDate.getMonth() + 1}月{itemDate.getDate()}日
                  </Text>
                  <Text style={styles.scheduleDescription}>{item.description}</Text>
                  {item.source === 'manual' && (
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => {
                        Alert.alert(
                          '確認',
                          'この引き落とし予定を削除しますか？',
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            { text: '削除', onPress: () => deleteDebitSchedule(item.id), style: 'destructive' }
                          ]
                        );
                      }}
                    />
                  )}
                </View>
                <Divider style={{ marginVertical: 8 }} />
                <View style={styles.scheduleDetails}>
                  <Text>支払い方法: {paymentMethod?.name || '不明'}</Text>
                  {account && <Text>引き落とし口座: {account.name}</Text>}
                  {item.billingDay && <Text>引き落とし日: {item.billingDay}日</Text>}
                  <Text style={styles.scheduleAmount}>¥{item.amount.toLocaleString()}</Text>
                  {item.source === 'transaction' && (
                    <Text style={styles.sourceLabel}>※取引履歴から自動計算</Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </>
    );
  };

  // 画面がフォーカスされたときにデータをロード
  useFocusEffect(
    useCallback(() => {
      loadData();
      
      // 定期的な更新は行わない
      // ユーザーが明示的に更新ボタンを押したときだけ更新する
      
      return () => {
        // クリーンアップ処理
      };
    }, [])
  );

  // 選択された日付が変更されたときにマーカーを更新
  useEffect(() => {
    updateMarkedDates(combinedDebitItems);
  }, [selectedDate]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.calendarHeader}>
          <Text style={styles.sectionTitle}>
            引き落としカレンダー
          </Text>
          <Button
            mode="contained"
            icon="refresh"
            onPress={loadData}
            style={styles.refreshButton}
          >
            更新
          </Button>
        </View>
        
        <Calendar
          markedDates={markedDates}
          onDayPress={onDayPress}
          markingType="multi-dot"
          theme={{
            calendarBackground: theme.colors.background,
            textSectionTitleColor: theme.colors.primary,
            todayTextColor: theme.colors.primary,
            dayTextColor: theme.colors.onSurface,
            monthTextColor: theme.colors.onSurface,
          }}
        />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {new Date(selectedDate).getMonth() + 1}月{new Date(selectedDate).getDate()}日の引き落とし
          </Text>
          {renderSelectedDateSchedules()}
        </View>
        
        {showForm && (
          <Card style={styles.formCard}>
            <Card.Title title="新しい引き落とし予定" />
            <Card.Content>
              <TextInput
                label="金額"
                value={newDebit.amount}
                onChangeText={(text) => setNewDebit(prev => ({ ...prev, amount: text }))}
                keyboardType="numeric"
                style={styles.input}
              />
              
              <TextInput
                label="説明"
                value={newDebit.description}
                onChangeText={(text) => setNewDebit(prev => ({ ...prev, description: text }))}
                style={styles.input}
              />
              
              <View style={styles.menuContainer}>
                <Text style={styles.menuLabel}>支払い方法:</Text>
                <Menu
                  visible={showPaymentMethodMenu}
                  onDismiss={() => setShowPaymentMethodMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowPaymentMethodMenu(true)}
                      style={styles.menuButton}
                    >
                      {newDebit.paymentMethodId
                        ? paymentMethods.find(p => p.id === newDebit.paymentMethodId)?.name || '選択'
                        : '選択してください'}
                    </Button>
                  }
                >
                  {paymentMethods.map(method => (
                    <Menu.Item
                      key={method.id}
                      onPress={() => {
                        setNewDebit(prev => ({ ...prev, paymentMethodId: method.id }));
                        setShowPaymentMethodMenu(false);
                      }}
                      title={method.name}
                    />
                  ))}
                </Menu>
              </View>
              
              <View style={styles.menuContainer}>
                <Text style={styles.menuLabel}>引き落とし口座:</Text>
                <Menu
                  visible={showAccountMenu}
                  onDismiss={() => setShowAccountMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowAccountMenu(true)}
                      style={styles.menuButton}
                    >
                      {newDebit.accountId
                        ? accounts.find(a => a.id === newDebit.accountId)?.name || '選択'
                        : '選択してください'}
                    </Button>
                  }
                >
                  {accounts.map(account => (
                    <Menu.Item
                      key={account.id}
                      onPress={() => {
                        setNewDebit(prev => ({ ...prev, accountId: account.id }));
                        setShowAccountMenu(false);
                      }}
                      title={account.name}
                    />
                  ))}
                </Menu>
              </View>
              
              <View style={styles.formButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setShowForm(false)}
                  style={styles.cancelButton}
                >
                  キャンセル
                </Button>
                
                <Button
                  mode="contained"
                  onPress={addDebitSchedule}
                  style={styles.saveButton}
                >
                  保存
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>月間引き落とし予定</Text>
          {renderMonthlySchedules()}
        </View>
      </ScrollView>
      
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => setShowForm(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyCard: {
    marginBottom: 16,
    elevation: 2,
  },
  scheduleCard: {
    marginBottom: 12,
    elevation: 3,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleDate: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  scheduleDescription: {
    flex: 1,
    fontSize: 16,
  },
  scheduleDetails: {
    marginTop: 4,
  },
  scheduleAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 8,
  },
  formCard: {
    marginTop: 16,
    marginBottom: 16,
    elevation: 3,
  },
  input: {
    marginBottom: 12,
  },
  menuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuLabel: {
    width: 100,
  },
  menuButton: {
    flex: 1,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  cancelButton: {
    marginRight: 12,
  },
  saveButton: {},
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  summaryCard: {
    marginBottom: 16,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'right',
  },
  sourceLabel: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#757575',
    textAlign: 'right',
    marginTop: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshButton: {
    marginLeft: 8,
  },
});

export default DebitCalendarScreen; 