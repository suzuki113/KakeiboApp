import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  SegmentedButtons,
  HelperText,
  useTheme,
  List,
  RadioButton,
  Switch,
  Divider,
  IconButton,
  Modal,
  Portal
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { 
  RecurringTransaction, 
  RecurrenceFrequency, 
  TransactionType,
  RecurringTransactionStatus,
  Category,
  PaymentMethod,
  Account
} from '../models/types';
import { 
  getRecurringTransactions, 
  saveRecurringTransaction, 
  updateRecurringTransaction,
  getCategories,
  getPaymentMethods,
  getAccounts
} from '../utils/storage';
import { COLORS } from '../theme/theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { simulateRecurringTransactions } from '../utils/recurringTransactions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RecurringTransactionFormRouteProp = RouteProp<RootStackParamList, 'RecurringTransactionForm'>;

const RecurringTransactionFormScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RecurringTransactionFormRouteProp>();
  const theme = useTheme();
  const isEditing = !!route.params?.recurringTransactionId;
  
  // フォームの状態
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [startDate, setStartDate] = useState(new Date());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)));
  
  // 繰り返し設定
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [interval, setInterval] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<string>('');
  const [monthOfYear, setMonthOfYear] = useState('');
  
  // 取引情報
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // ステータス
  const [status, setStatus] = useState<RecurringTransactionStatus>('active');
  
  // 各種リスト
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // セクション表示状態
  const [showCategorySection, setShowCategorySection] = useState(false);
  const [showAccountSection, setShowAccountSection] = useState(false);
  const [showPaymentMethodSection, setShowPaymentMethodSection] = useState(false);
  const [showFrequencySection, setShowFrequencySection] = useState(false);
  
  // 日付選択
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // シミュレーション結果表示
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationDates, setSimulationDates] = useState<Date[]>([]);
  
  // バリデーションエラー
  const [error, setError] = useState<string | null>(null);
  
  // データ読み込み
  const loadData = async () => {
    try {
      // カテゴリ、支払い方法、口座の取得
      const catsData = await getCategories();
      const pmData = await getPaymentMethods();
      const accsData = await getAccounts();
      
      // アクティブなものだけをフィルタリング
      setCategories(catsData.filter(c => c.isActive));
      setPaymentMethods(pmData.filter(pm => pm.isActive));
      setAccounts(accsData.filter(a => a.isActive));
      
      // 初期値の設定
      if (catsData.length > 0) {
        const defaultCategory = catsData.find(c => c.type === type && c.isActive);
        if (defaultCategory) {
          setSelectedCategory(defaultCategory);
        }
      }
      
      if (accsData.length > 0) {
        const defaultAccount = accsData.find(a => a.isActive);
        if (defaultAccount) {
          setSelectedAccount(defaultAccount);
        }
      }
      
      if (pmData.length > 0) {
        const defaultPaymentMethod = pmData.find(pm => pm.isActive);
        if (defaultPaymentMethod) {
          setSelectedPaymentMethod(defaultPaymentMethod);
        }
      }
      
      // 初期値の設定（日付などその他の項目）
      if (frequency === 'monthly') {
        setDayOfMonth(startDate.getDate().toString());
      } else if (frequency === 'weekly') {
        setDayOfWeek(startDate.getDay().toString());
      } else if (frequency === 'yearly') {
        setMonthOfYear((startDate.getMonth() + 1).toString());
        setDayOfMonth(startDate.getDate().toString());
      }
      
      // 編集モードの場合は既存データを読み込む
      if (isEditing) {
        const recurringTransactions = await getRecurringTransactions();
        const recurringTransaction = recurringTransactions.find(
          rt => rt.id === route.params.recurringTransactionId
        );
        
        if (recurringTransaction) {
          setTitle(recurringTransaction.title);
          setAmount(recurringTransaction.amount.toString());
          setType(recurringTransaction.type);
          setStartDate(recurringTransaction.startDate);
          
          if (recurringTransaction.endDate) {
            setHasEndDate(true);
            setEndDate(recurringTransaction.endDate);
          }
          
          setFrequency(recurringTransaction.frequency);
          setInterval(recurringTransaction.interval.toString());
          
          if (recurringTransaction.dayOfMonth !== undefined) {
            setDayOfMonth(recurringTransaction.dayOfMonth.toString());
          }
          
          if (recurringTransaction.dayOfWeek !== undefined) {
            setDayOfWeek(recurringTransaction.dayOfWeek.toString());
          }
          
          if (recurringTransaction.monthOfYear !== undefined) {
            setMonthOfYear(recurringTransaction.monthOfYear.toString());
          }
          
          // カテゴリ、口座、支払い方法オブジェクトを設定
          const category = catsData.find(c => c.id === recurringTransaction.categoryId);
          if (category) {
            setSelectedCategory(category);
          }
          
          const account = accsData.find(a => a.id === recurringTransaction.accountId);
          if (account) {
            setSelectedAccount(account);
          }
          
          const paymentMethod = pmData.find(pm => pm.id === recurringTransaction.paymentMethodId);
          if (paymentMethod) {
            setSelectedPaymentMethod(paymentMethod);
          }
          
          setStatus(recurringTransaction.status);
        }
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    }
  };
  
  // 初回ロード時にデータを取得
  useEffect(() => {
    loadData();
  }, []);
  
  // 取引タイプが変更されたときにカテゴリを更新
  useEffect(() => {
    const matchingCategory = categories.find(c => c.type === type && c.isActive);
    if (matchingCategory) {
      setSelectedCategory(matchingCategory);
    } else {
      setSelectedCategory(null);
    }
  }, [type, categories]);
  
  // 支払い方法が変更されたときに口座を自動設定
  useEffect(() => {
    if (type === 'expense' && selectedPaymentMethod) {
      const paymentMethodAccount = accounts.find(acc => acc.id === selectedPaymentMethod.accountId);
      if (paymentMethodAccount) {
        setSelectedAccount(paymentMethodAccount);
      }
    }
  }, [selectedPaymentMethod, type]);
  
  // セクションの切り替え
  const toggleCategorySection = () => {
    setShowCategorySection(!showCategorySection);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
    if (showAccountSection) setShowAccountSection(false);
    if (showFrequencySection) setShowFrequencySection(false);
  };

  const togglePaymentMethodSection = () => {
    setShowPaymentMethodSection(!showPaymentMethodSection);
    if (showCategorySection) setShowCategorySection(false);
    if (showAccountSection) setShowAccountSection(false);
    if (showFrequencySection) setShowFrequencySection(false);
  };

  const toggleAccountSection = () => {
    setShowAccountSection(!showAccountSection);
    if (showCategorySection) setShowCategorySection(false);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
    if (showFrequencySection) setShowFrequencySection(false);
  };
  
  const toggleFrequencySection = () => {
    setShowFrequencySection(!showFrequencySection);
    if (showCategorySection) setShowCategorySection(false);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
    if (showAccountSection) setShowAccountSection(false);
  };
  
  // フォームのバリデーション
  const validateForm = () => {
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return false;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('有効な金額を入力してください');
      return false;
    }
    
    if (!interval || isNaN(Number(interval)) || Number(interval) <= 0) {
      setError('有効な間隔を入力してください');
      return false;
    }
    
    if (frequency === 'monthly' && (!dayOfMonth || isNaN(Number(dayOfMonth)) || Number(dayOfMonth) < 1 || Number(dayOfMonth) > 31)) {
      setError('1から31の間で日付を入力してください');
      return false;
    }
    
    if (frequency === 'weekly' && (dayOfWeek === '' || isNaN(Number(dayOfWeek)) || Number(dayOfWeek) < 0 || Number(dayOfWeek) > 6)) {
      setError('曜日を選択してください');
      return false;
    }
    
    if (frequency === 'yearly' && (!monthOfYear || isNaN(Number(monthOfYear)) || Number(monthOfYear) < 1 || Number(monthOfYear) > 12)) {
      setError('1から12の間で月を入力してください');
      return false;
    }
    
    if (!selectedCategory) {
      setError('カテゴリを選択してください');
      return false;
    }
    
    if (type === 'income' && !selectedAccount) {
      setError('口座を選択してください');
      return false;
    }
    
    if (!selectedPaymentMethod) {
      setError('支払い方法を選択してください');
      return false;
    }
    
    if (hasEndDate && endDate <= startDate) {
      setError('終了日は開始日より後にしてください');
      return false;
    }
    
    return true;
  };
  
  // フォーム送信処理
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // 支出タイプの場合、支払い方法に紐づく口座IDを使用
      const accountIdToUse = type === 'expense' && selectedPaymentMethod 
        ? selectedPaymentMethod.accountId 
        : selectedAccount?.id || '';
        
      const recurringTransactionData: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        type,
        amount: Number(amount),
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        frequency,
        interval: Number(interval),
        dayOfMonth: frequency === 'monthly' || frequency === 'yearly' ? Number(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'weekly' ? Number(dayOfWeek) : undefined,
        monthOfYear: frequency === 'yearly' ? Number(monthOfYear) : undefined,
        description: title.trim(),
        categoryId: selectedCategory ? selectedCategory.id : '',
        accountId: accountIdToUse,
        paymentMethodId: selectedPaymentMethod ? selectedPaymentMethod.id : '',
        status,
        lastGeneratedDate: undefined,
      };
      
      if (isEditing) {
        await updateRecurringTransaction(route.params.recurringTransactionId, recurringTransactionData);
        Alert.alert('成功', '定期取引が更新されました');
      } else {
        await saveRecurringTransaction(recurringTransactionData);
        Alert.alert('成功', '定期取引が登録されました');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '定期取引の保存に失敗しました');
    }
  };
  
  // 定期取引のシミュレーション
  const runSimulation = () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      // 支出タイプの場合、支払い方法に紐づく口座IDを使用
      const accountIdToUse = type === 'expense' && selectedPaymentMethod 
        ? selectedPaymentMethod.accountId 
        : selectedAccount?.id || '';
        
      const recurringTransactionData: RecurringTransaction = {
        id: 'simulation',
        title: title.trim(),
        type,
        amount: Number(amount),
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        frequency,
        interval: Number(interval),
        dayOfMonth: frequency === 'monthly' || frequency === 'yearly' ? Number(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'weekly' ? Number(dayOfWeek) : undefined,
        monthOfYear: frequency === 'yearly' ? Number(monthOfYear) : undefined,
        description: title.trim(),
        categoryId: selectedCategory ? selectedCategory.id : '',
        accountId: accountIdToUse,
        paymentMethodId: selectedPaymentMethod ? selectedPaymentMethod.id : '',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // 今後3ヶ月分をシミュレーション
      const today = new Date();
      const threeMonthsLater = new Date(today);
      threeMonthsLater.setMonth(today.getMonth() + 3);
      
      const dates = simulateRecurringTransactions(recurringTransactionData, today, threeMonthsLater);
      setSimulationDates(dates);
      setShowSimulation(true);
    } catch (error) {
      console.error('シミュレーションエラー:', error);
      Alert.alert('エラー', 'シミュレーションの実行に失敗しました');
    }
  };
  
  // 日付を日本語フォーマットで表示
  const formatDateJP = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };
  
  // 頻度ラベルを取得
  const getFrequencyLabel = () => {
    let label = '';
    switch(frequency) {
      case 'daily':
        label = `${interval}日ごと`;
        break;
      case 'weekly':
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        label = `${interval}週間ごと`;
        if (dayOfWeek !== '') {
          label += `（${weekdays[parseInt(dayOfWeek)]}曜日）`;
        }
        break;
      case 'monthly':
        label = `${interval}ヶ月ごと`;
        if (dayOfMonth) {
          label += `（${dayOfMonth}日）`;
        }
        break;
      case 'yearly':
        label = `${interval}年ごと`;
        if (monthOfYear && dayOfMonth) {
          label += `（${monthOfYear}月${dayOfMonth}日）`;
        }
        break;
    }
    return label;
  };
  
  // 選択中の曜日をレンダリング
  const renderDayOfWeekSelector = () => {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return (
      <View style={styles.weekdayContainer}>
        {weekdays.map((day, index) => (
          <View key={index} style={styles.weekdayItem}>
            <RadioButton
              value={index.toString()}
              status={dayOfWeek === index.toString() ? 'checked' : 'unchecked'}
              onPress={() => setDayOfWeek(index.toString())}
            />
            <Text>{day}</Text>
          </View>
        ))}
      </View>
    );
  };
  
  // 頻度設定セクション
  const renderFrequencySection = () => {
    return (
      <>
        <RadioButton.Group
          value={frequency}
          onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}
        >
          <View style={styles.radioItem}>
            <RadioButton value="daily" />
            <Text>毎日</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="weekly" />
            <Text>毎週</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="monthly" />
            <Text>毎月</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="yearly" />
            <Text>毎年</Text>
          </View>
        </RadioButton.Group>
        
        <TextInput
          label="間隔"
          value={interval}
          onChangeText={setInterval}
          keyboardType="numeric"
          style={styles.input}
          right={<TextInput.Affix text={
            frequency === 'daily' ? '日ごと' :
            frequency === 'weekly' ? '週間ごと' :
            frequency === 'monthly' ? 'ヶ月ごと' :
            '年ごと'
          } />}
        />
        
        {frequency === 'monthly' && (
          <TextInput
            label="日付"
            value={dayOfMonth}
            onChangeText={setDayOfMonth}
            keyboardType="numeric"
            style={styles.input}
            right={<TextInput.Affix text="日" />}
          />
        )}
        
        {frequency === 'weekly' && renderDayOfWeekSelector()}
        
        {frequency === 'yearly' && (
          <>
            <TextInput
              label="月"
              value={monthOfYear}
              onChangeText={setMonthOfYear}
              keyboardType="numeric"
              style={styles.input}
              right={<TextInput.Affix text="月" />}
            />
            
            <TextInput
              label="日"
              value={dayOfMonth}
              onChangeText={setDayOfMonth}
              keyboardType="numeric"
              style={styles.input}
              right={<TextInput.Affix text="日" />}
            />
          </>
        )}
      </>
    );
  };
  
  // 支払い方法のアイコンを取得
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
      case 'direct_debit':
        return 'bank-transfer';
      default:
        return 'cash';
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="titleMedium" style={styles.label}>取引タイプ</Text>
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as TransactionType)}
          buttons={[
            { value: 'expense', label: '支出' },
            { value: 'income', label: '収入' },
          ]}
          style={styles.segmentedButtons}
        />
        
        <TextInput
          label="タイトル"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
        />
        
        <TextInput
          label="金額"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          style={styles.input}
        />
        
        {/* カテゴリ選択アコーディオン */}
        <List.Accordion
          title={selectedCategory ? selectedCategory.name : "カテゴリーを選択"}
          left={props => <List.Icon {...props} icon={selectedCategory?.icon || "folder"} color={selectedCategory?.color || "#000"} />}
          expanded={showCategorySection}
          onPress={toggleCategorySection}
          style={styles.accordion}
        >
          {categories.filter(c => c.type === type).map(category => (
            <List.Item
              key={category.id}
              title={category.name}
              left={props => (
                <List.Icon {...props} icon={category.icon} color={category.color} />
              )}
              onPress={() => {
                setSelectedCategory(category);
                setShowCategorySection(false);
              }}
              style={[
                styles.categoryItem,
                selectedCategory?.id === category.id && styles.selectedItem,
              ]}
            />
          ))}
          <Button
            mode="text"
            onPress={() => navigation.navigate('CategoryList')}
            style={styles.addButton}
          >
            カテゴリーを管理
          </Button>
        </List.Accordion>
        
        {/* 口座選択アコーディオン（収入の場合のみ表示） */}
        {type === 'income' && (
          <List.Accordion
            title={selectedAccount ? selectedAccount.name : "口座を選択"}
            left={props => <List.Icon {...props} icon="bank" />}
            expanded={showAccountSection}
            onPress={toggleAccountSection}
            style={styles.accordion}
          >
            {accounts.map(account => (
              <List.Item
                key={account.id}
                title={account.name}
                description={`残高: ¥${account.balance.toLocaleString()}`}
                left={props => (
                  <List.Icon {...props} icon="bank" />
                )}
                onPress={() => {
                  setSelectedAccount(account);
                  setShowAccountSection(false);
                }}
                style={[
                  styles.accountItem,
                  selectedAccount?.id === account.id && styles.selectedItem,
                ]}
              />
            ))}
            <Button
              mode="text"
              onPress={() => navigation.navigate('AccountList')}
              style={styles.addButton}
            >
              口座を管理
            </Button>
          </List.Accordion>
        )}
        
        {/* 支払い方法選択アコーディオン */}
        <List.Accordion
          title={selectedPaymentMethod ? selectedPaymentMethod.name : "支払い方法を選択"}
          left={props => <List.Icon {...props} icon={getPaymentMethodIcon(selectedPaymentMethod?.type || 'cash')} />}
          expanded={showPaymentMethodSection}
          onPress={togglePaymentMethodSection}
          style={styles.accordion}
        >
          {paymentMethods.map(method => (
            <List.Item
              key={method.id}
              title={method.name}
              left={props => (
                <List.Icon {...props} icon={getPaymentMethodIcon(method.type)} />
              )}
              onPress={() => {
                setSelectedPaymentMethod(method);
                setShowPaymentMethodSection(false);
              }}
              style={[
                styles.paymentMethodItem,
                selectedPaymentMethod?.id === method.id && styles.selectedItem,
              ]}
            />
          ))}
          <Button
            mode="text"
            onPress={() => navigation.navigate('PaymentMethodList')}
            style={styles.addButton}
          >
            支払い方法を管理
          </Button>
        </List.Accordion>
        
        {/* 頻度設定アコーディオン */}
        <List.Accordion
          title={`頻度: ${getFrequencyLabel()}`}
          left={props => <List.Icon {...props} icon="calendar-sync" />}
          expanded={showFrequencySection}
          onPress={toggleFrequencySection}
          style={styles.accordion}
        >
          {renderFrequencySection()}
        </List.Accordion>
        
        {/* 開始日と終了日 */}
        <Button
          mode="outlined"
          onPress={() => setShowStartDatePicker(true)}
          style={styles.input}
        >
          開始日: {formatDateJP(startDate)}
        </Button>
        
        <View style={styles.switchContainer}>
          <Text>終了日を設定する</Text>
          <Switch
            value={hasEndDate}
            onValueChange={setHasEndDate}
            color={theme.colors.primary}
          />
        </View>
        
        {hasEndDate && (
          <Button
            mode="outlined"
            onPress={() => setShowEndDatePicker(true)}
            style={styles.input}
          >
            終了日: {formatDateJP(endDate)}
          </Button>
        )}
        
        {/* ステータスセクション */}
        <Text variant="titleMedium" style={[styles.label, {marginTop: 16}]}>ステータス</Text>
        
        <RadioButton.Group
          value={status}
          onValueChange={(value) => setStatus(value as RecurringTransactionStatus)}
        >
          <View style={styles.radioItem}>
            <RadioButton value="active" />
            <Text>有効</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="paused" />
            <Text>一時停止</Text>
          </View>
          <View style={styles.radioItem}>
            <RadioButton value="cancelled" />
            <Text>無効</Text>
          </View>
        </RadioButton.Group>
        
        {error && (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        )}
        
        {/* アクションボタン */}
        <Button
          mode="outlined"
          onPress={runSimulation}
          style={styles.actionButton}
          icon="eye"
        >
          予定日をシミュレーション
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.actionButton}
        >
          {isEditing ? '更新' : '登録'}
        </Button>
      </View>
      
      {/* 日付選択モーダル */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            const currentDate = selectedDate || startDate;
            setShowStartDatePicker(false);
            setStartDate(currentDate);
          }}
        />
      )}
      
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            const currentDate = selectedDate || endDate;
            setShowEndDatePicker(false);
            setEndDate(currentDate);
          }}
        />
      )}
      
      {/* シミュレーション結果モーダル */}
      <Portal>
        <Modal
          visible={showSimulation}
          onDismiss={() => setShowSimulation(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text variant="titleMedium" style={styles.modalTitle}>今後3ヶ月の予定日</Text>
            
            {simulationDates.length === 0 ? (
              <Text style={styles.emptySimulation}>この期間に発生する予定はありません</Text>
            ) : (
              <ScrollView style={styles.simulationList}>
                {simulationDates.map((date, index) => (
                  <View key={index} style={styles.simulationItem}>
                    <Text style={styles.simulationDate}>{formatDateJP(date)}</Text>
                    <Text style={styles.simulationAmount}>
                      {type === 'income' ? '+' : '-'}¥{Number(amount).toLocaleString()}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
            
            <Button
              mode="contained"
              onPress={() => setShowSimulation(false)}
              style={styles.closeButton}
            >
              閉じる
            </Button>
          </View>
        </Modal>
      </Portal>
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
  segmentedButtons: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  accordion: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 4,
  },
  categoryItem: {
    borderRadius: 4,
    marginBottom: 2,
  },
  paymentMethodItem: {
    borderRadius: 4,
    marginBottom: 2,
  },
  accountItem: {
    borderRadius: 4,
    marginBottom: 2,
  },
  selectedItem: {
    backgroundColor: '#e8e8e8',
  },
  addButton: {
    marginVertical: 8,
  },
  actionButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekdayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  weekdayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '25%',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  modalContent: {
    padding: 10,
  },
  modalTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emptySimulation: {
    textAlign: 'center',
    marginVertical: 20,
    color: '#666',
  },
  simulationList: {
    maxHeight: 300,
  },
  simulationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  simulationDate: {
    fontSize: 16,
  },
  simulationAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 16,
  },
});

export default RecurringTransactionFormScreen; 