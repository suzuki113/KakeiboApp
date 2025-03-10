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
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  
  // ステータス
  const [status, setStatus] = useState<RecurringTransactionStatus>('active');
  
  // 各種リスト
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // 日付選択モーダル
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // シミュレーション結果表示
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationDates, setSimulationDates] = useState<Date[]>([]);
  
  // バリデーションエラー
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
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
          setCategoryId(defaultCategory.id);
        }
      }
      
      if (accsData.length > 0) {
        const defaultAccount = accsData.find(a => a.isActive);
        if (defaultAccount) {
          setAccountId(defaultAccount.id);
        }
      }
      
      if (pmData.length > 0) {
        const defaultPaymentMethod = pmData.find(pm => pm.isActive);
        if (defaultPaymentMethod) {
          setPaymentMethodId(defaultPaymentMethod.id);
        }
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
          
          setCategoryId(recurringTransaction.categoryId);
          setAccountId(recurringTransaction.accountId);
          setPaymentMethodId(recurringTransaction.paymentMethodId);
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
      setCategoryId(matchingCategory.id);
    }
  }, [type, categories]);
  
  // フォームのバリデーション
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!title.trim()) {
      newErrors.title = 'タイトルを入力してください';
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = '有効な金額を入力してください';
    }
    
    if (!interval || isNaN(Number(interval)) || Number(interval) <= 0) {
      newErrors.interval = '有効な間隔を入力してください';
    }
    
    if (frequency === 'monthly' && (!dayOfMonth || isNaN(Number(dayOfMonth)) || Number(dayOfMonth) < 1 || Number(dayOfMonth) > 31)) {
      newErrors.dayOfMonth = '1から31の間で日付を入力してください';
    }
    
    if (frequency === 'weekly' && (dayOfWeek === '' || isNaN(Number(dayOfWeek)) || Number(dayOfWeek) < 0 || Number(dayOfWeek) > 6)) {
      newErrors.dayOfWeek = '曜日を選択してください';
    }
    
    if (frequency === 'yearly' && (!monthOfYear || isNaN(Number(monthOfYear)) || Number(monthOfYear) < 1 || Number(monthOfYear) > 12)) {
      newErrors.monthOfYear = '1から12の間で月を入力してください';
    }
    
    if (!categoryId) {
      newErrors.categoryId = 'カテゴリを選択してください';
    }
    
    if (!accountId) {
      newErrors.accountId = '口座を選択してください';
    }
    
    if (!paymentMethodId) {
      newErrors.paymentMethodId = '支払い方法を選択してください';
    }
    
    if (hasEndDate && endDate <= startDate) {
      newErrors.endDate = '終了日は開始日より後にしてください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // フォーム送信処理
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      const recurringTransactionData: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        type,
        amount: Number(amount),
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        frequency,
        interval: Number(interval),
        dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'weekly' ? Number(dayOfWeek) : undefined,
        monthOfYear: frequency === 'yearly' ? Number(monthOfYear) : undefined,
        description: title.trim(),
        categoryId,
        accountId,
        paymentMethodId,
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
      const recurringTransactionData: RecurringTransaction = {
        id: 'simulation',
        title: title.trim(),
        type,
        amount: Number(amount),
        startDate,
        endDate: hasEndDate ? endDate : undefined,
        frequency,
        interval: Number(interval),
        dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'weekly' ? Number(dayOfWeek) : undefined,
        monthOfYear: frequency === 'yearly' ? Number(monthOfYear) : undefined,
        description: title.trim(),
        categoryId,
        accountId,
        paymentMethodId,
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
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 基本情報セクション */}
        <Text variant="titleMedium" style={styles.sectionTitle}>基本情報</Text>
        
        <TextInput
          label="タイトル"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            setErrors({...errors, title: ''});
          }}
          style={styles.input}
          error={!!errors.title}
        />
        {errors.title && <HelperText type="error">{errors.title}</HelperText>}
        
        <TextInput
          label="金額"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            setErrors({...errors, amount: ''});
          }}
          keyboardType="numeric"
          style={styles.input}
          error={!!errors.amount}
        />
        {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}
        
        <Text style={styles.label}>種類</Text>
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as TransactionType)}
          buttons={[
            { value: 'expense', label: '支出' },
            { value: 'income', label: '収入' },
          ]}
          style={styles.segmentedButtons}
        />
        
        <Text style={styles.label}>開始日</Text>
        <TouchableOpacity
          style={styles.datePickerButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text>{formatDateJP(startDate)}</Text>
          <IconButton icon="calendar" size={20} iconColor={theme.colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.switchContainer}>
          <Text>終了日を設定する</Text>
          <Switch
            value={hasEndDate}
            onValueChange={setHasEndDate}
            color={theme.colors.primary}
          />
        </View>
        
        {hasEndDate && (
          <>
            <Text style={styles.label}>終了日</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text>{formatDateJP(endDate)}</Text>
              <IconButton icon="calendar" size={20} iconColor={theme.colors.primary} />
            </TouchableOpacity>
            {errors.endDate && <HelperText type="error">{errors.endDate}</HelperText>}
          </>
        )}
        
        <Divider style={styles.divider} />
        
        {/* 繰り返し設定セクション */}
        <Text variant="titleMedium" style={styles.sectionTitle}>繰り返し設定</Text>
        
        <Text style={styles.label}>頻度</Text>
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
          onChangeText={(text) => {
            setInterval(text);
            setErrors({...errors, interval: ''});
          }}
          keyboardType="numeric"
          style={styles.input}
          error={!!errors.interval}
          right={<TextInput.Affix text={
            frequency === 'daily' ? '日ごと' :
            frequency === 'weekly' ? '週間ごと' :
            frequency === 'monthly' ? 'ヶ月ごと' :
            '年ごと'
          } />}
        />
        {errors.interval && <HelperText type="error">{errors.interval}</HelperText>}
        
        {frequency === 'monthly' && (
          <>
            <TextInput
              label="日にち"
              value={dayOfMonth}
              onChangeText={(text) => {
                setDayOfMonth(text);
                setErrors({...errors, dayOfMonth: ''});
              }}
              keyboardType="numeric"
              style={styles.input}
              error={!!errors.dayOfMonth}
              right={<TextInput.Affix text="日" />}
            />
            {errors.dayOfMonth && <HelperText type="error">{errors.dayOfMonth}</HelperText>}
          </>
        )}
        
        {frequency === 'weekly' && (
          <>
            <Text style={styles.label}>曜日</Text>
            <RadioButton.Group
              value={dayOfWeek}
              onValueChange={(value) => {
                setDayOfWeek(value);
                setErrors({...errors, dayOfWeek: ''});
              }}
            >
              <View style={styles.weekdayContainer}>
                {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
                  <View key={index} style={styles.weekdayItem}>
                    <RadioButton value={index.toString()} />
                    <Text>{day}</Text>
                  </View>
                ))}
              </View>
            </RadioButton.Group>
            {errors.dayOfWeek && <HelperText type="error">{errors.dayOfWeek}</HelperText>}
          </>
        )}
        
        {frequency === 'yearly' && (
          <>
            <TextInput
              label="月"
              value={monthOfYear}
              onChangeText={(text) => {
                setMonthOfYear(text);
                setErrors({...errors, monthOfYear: ''});
              }}
              keyboardType="numeric"
              style={styles.input}
              error={!!errors.monthOfYear}
              right={<TextInput.Affix text="月" />}
            />
            {errors.monthOfYear && <HelperText type="error">{errors.monthOfYear}</HelperText>}
            
            <TextInput
              label="日"
              value={dayOfMonth}
              onChangeText={(text) => {
                setDayOfMonth(text);
                setErrors({...errors, dayOfMonth: ''});
              }}
              keyboardType="numeric"
              style={styles.input}
              error={!!errors.dayOfMonth}
              right={<TextInput.Affix text="日" />}
            />
            {errors.dayOfMonth && <HelperText type="error">{errors.dayOfMonth}</HelperText>}
          </>
        )}
        
        <Divider style={styles.divider} />
        
        {/* 取引情報セクション */}
        <Text variant="titleMedium" style={styles.sectionTitle}>取引情報</Text>
        
        <Text style={styles.label}>カテゴリ</Text>
        <RadioButton.Group
          value={categoryId}
          onValueChange={(value) => {
            setCategoryId(value);
            setErrors({...errors, categoryId: ''});
          }}
        >
          <ScrollView horizontal style={styles.categorySelector}>
            {categories
              .filter(c => c.type === type)
              .map(category => (
                <View key={category.id} style={styles.categoryItem}>
                  <RadioButton value={category.id} />
                  <Text style={{ color: category.color }}>{category.name}</Text>
                </View>
              ))}
          </ScrollView>
        </RadioButton.Group>
        {errors.categoryId && <HelperText type="error">{errors.categoryId}</HelperText>}
        
        <Text style={styles.label}>口座</Text>
        <RadioButton.Group
          value={accountId}
          onValueChange={(value) => {
            setAccountId(value);
            setErrors({...errors, accountId: ''});
          }}
        >
          <ScrollView horizontal style={styles.horizontalSelector}>
            {accounts.map(account => (
              <View key={account.id} style={styles.selectorItem}>
                <RadioButton value={account.id} />
                <Text>{account.name}</Text>
              </View>
            ))}
          </ScrollView>
        </RadioButton.Group>
        {errors.accountId && <HelperText type="error">{errors.accountId}</HelperText>}
        
        <Text style={styles.label}>支払い方法</Text>
        <RadioButton.Group
          value={paymentMethodId}
          onValueChange={(value) => {
            setPaymentMethodId(value);
            setErrors({...errors, paymentMethodId: ''});
          }}
        >
          <ScrollView horizontal style={styles.horizontalSelector}>
            {paymentMethods.map(paymentMethod => (
              <View key={paymentMethod.id} style={styles.selectorItem}>
                <RadioButton value={paymentMethod.id} />
                <Text>{paymentMethod.name}</Text>
              </View>
            ))}
          </ScrollView>
        </RadioButton.Group>
        {errors.paymentMethodId && <HelperText type="error">{errors.paymentMethodId}</HelperText>}
        
        <Divider style={styles.divider} />
        
        {/* ステータスセクション */}
        <Text variant="titleMedium" style={styles.sectionTitle}>ステータス</Text>
        
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
        
        {/* シミュレーションボタン */}
        <Button
          mode="outlined"
          onPress={runSimulation}
          style={styles.actionButton}
          icon="eye"
        >
          予定日をシミュレーション
        </Button>
        
        {/* 保存ボタン */}
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
    backgroundColor: COLORS.white,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
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
  categorySelector: {
    maxHeight: 60,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  horizontalSelector: {
    maxHeight: 60,
  },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButton: {
    marginTop: 16,
    marginBottom: 8,
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