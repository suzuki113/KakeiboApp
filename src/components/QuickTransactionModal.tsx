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
  TransactionType,
  Category,
  PaymentMethod,
  Account
} from '../models/types';
import { getCategories, getPaymentMethods, getAccounts, saveTransaction } from '../utils/storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

interface QuickTransactionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
}

const QuickTransactionModal = ({ 
  visible, 
  onDismiss,
  onSuccess
}: QuickTransactionModalProps) => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // 基本フォーム項目
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [date, setDate] = useState(new Date());
  
  // データリスト
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // 選択項目
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);
  
  // データのロード
  useEffect(() => {
    const loadData = async () => {
      try {
        const cats = await getCategories();
        const pms = await getPaymentMethods();
        const accs = await getAccounts();
        
        setCategories(cats.filter(c => c.isActive));
        setPaymentMethods(pms.filter(p => p.isActive));
        setAccounts(accs.filter(a => a.isActive));
        
        // デフォルト値の設定
        const defaultCategory = cats.find(c => c.type === type && c.isActive);
        if (defaultCategory) {
          setSelectedCategory(defaultCategory);
        }
        
        if (pms.length > 0) {
          setSelectedPaymentMethod(pms[0]);
        }
        
        if (accs.length > 0) {
          setSelectedAccount(accs[0]);
        }
      } catch (err) {
        console.error('データの読み込みに失敗しました:', err);
      }
    };
    
    if (visible) {
      loadData();
    }
  }, [visible, type]);
  
  // 取引タイプが変更された時の処理
  useEffect(() => {
    // カテゴリを取引タイプでフィルタリング
    const matchingCategory = categories.find(c => c.type === type && c.isActive);
    if (matchingCategory) {
      setSelectedCategory(matchingCategory);
    } else {
      setSelectedCategory(null);
    }
  }, [type, categories]);
  
  // フォームをリセット
  const resetForm = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    setDate(new Date());
    setSelectedCategory(null);
    setSelectedPaymentMethod(null);
    setSelectedAccount(null);
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
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('有効な金額を入力してください');
      return;
    }
    
    if (!selectedCategory) {
      setError('カテゴリを選択してください');
      return;
    }
    
    if (type === 'expense' && !selectedPaymentMethod) {
      setError('支払い方法を選択してください');
      return;
    }
    
    if (type === 'income' && !selectedAccount) {
      setError('入金先口座を選択してください');
      return;
    }
    
    try {
      // 支出タイプの場合、支払い方法に紐づく口座IDを使用
      // 収入タイプの場合、選択した口座IDを使用
      const accountIdToUse = type === 'expense' 
        ? selectedPaymentMethod?.accountId || ''
        : selectedAccount?.id || '';
      
      const paymentMethodIdToUse = type === 'expense'
        ? selectedPaymentMethod?.id || ''
        : ''; // 収入の場合は支払い方法不要
      
      // 通常の取引データを作成
      const transactionData = {
        type,
        amount: Number(amount),
        date,
        description: description.trim() || `${selectedCategory?.name || 'カテゴリなし'}の${type === 'expense' ? '支出' : '収入'}`, // 説明が空の場合はカテゴリ名を使用
        categoryId: selectedCategory.id,
        accountId: accountIdToUse,
        paymentMethodId: paymentMethodIdToUse
      };
      
      await saveTransaction(transactionData);
      
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onDismiss();
    } catch (err) {
      console.error('取引の保存に失敗しました:', err);
      setError('取引の保存に失敗しました');
    }
  };
  
  // 詳細設定画面に移動
  const navigateToFullForm = () => {
    handleDismiss();
    navigation.navigate('AddTransaction', {});
  };
  
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <Text variant="headlineSmall" style={styles.title}>クイック入力</Text>
          
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
            label="説明"
            value={description}
            onChangeText={setDescription}
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
          
          {/* 支出の場合は支払い方法選択 */}
          {type === 'expense' && (
            <>
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
            </>
          )}
          
          {/* 収入の場合は口座選択 */}
          {type === 'income' && (
            <>
              <Text style={styles.label}>入金先口座</Text>
              <RadioButton.Group
                value={selectedAccount?.id || ''}
                onValueChange={(value) => {
                  const account = accounts.find(a => a.id === value);
                  if (account) {
                    setSelectedAccount(account);
                  }
                }}
              >
                <ScrollView horizontal style={styles.horizontalScroll}>
                  {accounts.map(account => (
                    <View key={account.id} style={styles.radioItem}>
                      <RadioButton value={account.id} />
                      <Text>{account.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </RadioButton.Group>
            </>
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

export default QuickTransactionModal; 