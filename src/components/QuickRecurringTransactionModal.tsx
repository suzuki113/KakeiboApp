import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Modal, 
  Portal, 
  Text, 
  Button, 
  TextInput, 
  SegmentedButtons, 
  List,
  RadioButton,
  HelperText,
  useTheme
} from 'react-native-paper';
import { 
  RecurrenceFrequency, 
  TransactionType,
  Category,
  PaymentMethod,
  RecurringTransactionStatus
} from '../models/types';
import { getCategories, getPaymentMethods, saveRecurringTransaction } from '../utils/storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

interface QuickRecurringTransactionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
}

const QuickRecurringTransactionModal = ({ 
  visible, 
  onDismiss,
  onSuccess
}: QuickRecurringTransactionModalProps) => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // 基本フォーム項目
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(new Date().getDate().toString());
  
  // データリスト
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  
  // 選択項目
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);
  
  // カテゴリと支払い方法のロード
  useEffect(() => {
    const loadData = async () => {
      try {
        const cats = await getCategories();
        const pms = await getPaymentMethods();
        
        setCategories(cats.filter(c => c.isActive));
        setPaymentMethods(pms.filter(p => p.isActive));
        
        // デフォルト値の設定
        const defaultCategory = cats.find(c => c.type === type && c.isActive);
        if (defaultCategory) {
          setSelectedCategory(defaultCategory);
        }
        
        if (pms.length > 0) {
          setSelectedPaymentMethod(pms[0]);
        }
      } catch (err) {
        console.error('データの読み込みに失敗しました:', err);
      }
    };
    
    if (visible) {
      loadData();
    }
  }, [visible, type]);
  
  // フォームをリセット
  const resetForm = () => {
    setTitle('');
    setAmount('');
    setType('expense');
    setFrequency('monthly');
    setDayOfMonth(new Date().getDate().toString());
    setSelectedCategory(null);
    setSelectedPaymentMethod(null);
    setError(null);
  };
  
  // モーダルを閉じる
  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };
  
  // フォーム送信
  const handleSubmit = async () => {
    // バリデーション
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('有効な金額を入力してください');
      return;
    }
    
    if (!selectedCategory) {
      setError('カテゴリを選択してください');
      return;
    }
    
    if (!selectedPaymentMethod) {
      setError('支払い方法を選択してください');
      return;
    }
    
    try {
      // 支出タイプの場合、支払い方法に紐づく口座IDを使用
      const accountIdToUse = selectedPaymentMethod.accountId;
      
      const recurringTransactionData = {
        title: title.trim(),
        type,
        amount: Number(amount),
        startDate: new Date(),
        frequency,
        interval: 1,
        dayOfMonth: frequency === 'monthly' ? Number(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'weekly' ? new Date().getDay() : undefined,
        description: title.trim(),
        categoryId: selectedCategory.id,
        accountId: accountIdToUse,
        paymentMethodId: selectedPaymentMethod.id,
        status: 'active' as RecurringTransactionStatus,
      };
      
      await saveRecurringTransaction(recurringTransactionData);
      
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onDismiss();
    } catch (err) {
      console.error('定期取引の保存に失敗しました:', err);
      setError('定期取引の保存に失敗しました');
    }
  };
  
  // 詳細設定画面に移動
  const navigateToFullForm = () => {
    handleDismiss();
    navigation.navigate('RecurringTransactionForm', {});
  };
  
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <Text variant="headlineSmall" style={styles.title}>定期取引の簡易登録</Text>
          
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
          
          {/* カテゴリ選択 */}
          <Text style={styles.label}>カテゴリ</Text>
          <RadioButton.Group
            value={selectedCategory?.id || ''}
            onValueChange={(value) => {
              const category = categories.find(c => c.id === value);
              if (category) {
                setSelectedCategory(category);
              }
            }}
          >
            <ScrollView horizontal style={styles.horizontalScroll}>
              {categories
                .filter(c => c.type === type)
                .map(category => (
                  <View key={category.id} style={styles.radioItem}>
                    <RadioButton value={category.id} />
                    <Text style={{ color: category.color }}>{category.name}</Text>
                  </View>
                ))}
            </ScrollView>
          </RadioButton.Group>
          
          {/* 支払い方法選択 */}
          <Text style={styles.label}>支払い方法</Text>
          <RadioButton.Group
            value={selectedPaymentMethod?.id || ''}
            onValueChange={(value) => {
              const method = paymentMethods.find(p => p.id === value);
              if (method) {
                setSelectedPaymentMethod(method);
              }
            }}
          >
            <ScrollView horizontal style={styles.horizontalScroll}>
              {paymentMethods.map(method => (
                <View key={method.id} style={styles.radioItem}>
                  <RadioButton value={method.id} />
                  <Text>{method.name}</Text>
                </View>
              ))}
            </ScrollView>
          </RadioButton.Group>
          
          {/* 頻度選択 */}
          <Text style={styles.label}>頻度</Text>
          <RadioButton.Group
            value={frequency}
            onValueChange={(value) => setFrequency(value as RecurrenceFrequency)}
          >
            <View style={styles.frequencyContainer}>
              <View style={styles.radioItem}>
                <RadioButton value="monthly" />
                <Text>毎月</Text>
              </View>
              <View style={styles.radioItem}>
                <RadioButton value="weekly" />
                <Text>毎週</Text>
              </View>
              <View style={styles.radioItem}>
                <RadioButton value="daily" />
                <Text>毎日</Text>
              </View>
            </View>
          </RadioButton.Group>
          
          {/* 毎月の場合は日付入力 */}
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
          
          {error && (
            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>
          )}
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={navigateToFullForm}
              style={[styles.button, styles.cancelButton]}
            >
              詳細設定
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSubmit}
              style={styles.button}
            >
              登録
            </Button>
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  scrollView: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  horizontalScroll: {
    flexDirection: 'row',
    maxHeight: 50,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    borderColor: '#ccc',
  },
});

export default QuickRecurringTransactionModal; 