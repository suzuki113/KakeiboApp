import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, SegmentedButtons, Text, HelperText, List } from 'react-native-paper';
import { TransactionType, Category, PaymentMethod, Account, InvestmentItem, TransactionStatus } from '../models/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { saveTransaction, updateTransaction, getCategories, getPaymentMethods, getAccounts, getTransactions } from '../utils/storage';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AddTransactionScreenRouteProp = RouteProp<RootStackParamList, 'AddTransaction'>;

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

// 投資種別に応じたアイコンを取得
const getInvestmentTypeIcon = (type: string): string => {
  switch (type) {
    case 'stock':
      return 'chart-line';
    case 'crypto':
      return 'currency-btc';
    case 'forex':
      return 'currency-usd';
    case 'bond':
      return 'file-document';
    case 'mutual_fund':
      return 'chart-areaspline';
    case 'other':
      return 'help-circle';
    default:
      return 'help-circle';
  }
};

export const AddTransactionScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AddTransactionScreenRouteProp>();
  const editTransaction = route.params?.transaction;

  const [type, setType] = useState<TransactionType>(editTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editTransaction ? editTransaction.amount.toString() : '');
  const [description, setDescription] = useState(editTransaction?.description || '');
  const [date, setDate] = useState(editTransaction?.date || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>(dummyInvestmentItems);
  const [selectedInvestmentItem, setSelectedInvestmentItem] = useState<InvestmentItem | null>(null);
  const [showCategorySection, setShowCategorySection] = useState(true);
  const [showPaymentMethodSection, setShowPaymentMethodSection] = useState(false);
  const [showAccountSection, setShowAccountSection] = useState(false);
  const [showInvestmentItemSection, setShowInvestmentItemSection] = useState(false);

  // 振替元の口座
  const [sourceAccount, setSourceAccount] = useState<Account | null>(null);
  // 振替先の口座
  const [destinationAccount, setDestinationAccount] = useState<Account | null>(null);
  // 振替元口座選択セクションの表示状態
  const [showSourceAccountSection, setShowSourceAccountSection] = useState(false);
  // 振替先口座選択セクションの表示状態
  const [showDestinationAccountSection, setShowDestinationAccountSection] = useState(false);

  useEffect(() => {
    loadCategories();
    loadPaymentMethods();
    loadAccounts();
    loadInvestmentItems();
    
    // 編集モードの場合、既存の取引データをフォームに設定
    if (editTransaction) {
      const setupForm = async () => {
        // カテゴリを設定
        const allCategories = await getCategories();
        const category = allCategories.find(c => c.id === editTransaction.categoryId);
        if (category) {
          setSelectedCategory(category);
        }
        
        // 支払い方法を設定
        const allPaymentMethods = await getPaymentMethods();
        const paymentMethod = allPaymentMethods.find(p => p.id === editTransaction.paymentMethodId);
        if (paymentMethod) {
          setSelectedPaymentMethod(paymentMethod);
        }
        
        // 口座を設定
        const allAccounts = await getAccounts();
        const account = allAccounts.find(a => a.id === editTransaction.accountId);
        if (account) {
          setSelectedAccount(account);
        }
        
        // 投資銘柄を設定（投資取引の場合）
        if (editTransaction.type === 'investment' && editTransaction.investmentItemId) {
          const investmentItem = investmentItems.find(i => i.id === editTransaction.investmentItemId);
          if (investmentItem) {
            setSelectedInvestmentItem(investmentItem);
          }
        }
        
        // 振替の場合、振替元と振替先の口座を設定
        if (editTransaction.type === 'transfer') {
          // 振替取引では、paymentMethodIdが振替元、accountIdが振替先として使用されている想定
          const source = allAccounts.find(a => a.id === editTransaction.paymentMethodId);
          const destination = allAccounts.find(a => a.id === editTransaction.accountId);
          
          if (source) {
            setSourceAccount(source);
          }
          
          if (destination) {
            setDestinationAccount(destination);
          }
        }
      };
      
      setupForm();
    }
  }, []);

  // 取引タイプが変更されたときの処理
  useEffect(() => {
    // トランザクションタイプが変更されたら適切なカテゴリをロード
    loadCategories();
    
    if (type === 'investment') {
      // 投資の場合、投資銘柄選択を表示
      setShowInvestmentItemSection(true);
      // カテゴリーは非表示に
      setShowCategorySection(false);
      setSelectedCategory(null);
    } else if (type === 'transfer') {
      // 振替の場合
      setShowInvestmentItemSection(false);
      setSelectedInvestmentItem(null);
      // カテゴリーは非表示に
      setShowCategorySection(false);
      setSelectedCategory(null);
    } else {
      setShowInvestmentItemSection(false);
      setSelectedInvestmentItem(null);
    }
  }, [type]);

  const loadCategories = async () => {
    const allCategories = await getCategories();
    // 投資タイプ以外の場合はタイプに合致するアクティブなカテゴリーのみをフィルタリング
    const filteredCategories = allCategories.filter(
      c => c.type === type && c.isActive && type !== 'investment' && type !== 'transfer'
    );
    setCategories(filteredCategories);
    
    // 選択したカテゴリが現在のタイプと一致しない場合はリセット
    if (selectedCategory && (selectedCategory.type !== type || type === 'investment' || type === 'transfer')) {
      setSelectedCategory(null);
    } else if (!editTransaction && filteredCategories.length > 0 && type !== 'investment' && type !== 'transfer') {
      // 編集でなく、フィルターされたカテゴリがあり、選択されていない場合は最初のカテゴリを選択
      if (!selectedCategory) {
        setSelectedCategory(filteredCategories[0]);
      }
    }
  };

  const loadPaymentMethods = async () => {
    const methods = await getPaymentMethods();
    setPaymentMethods(methods.filter(m => m.isActive));
    if (!editTransaction && methods.length > 0) {
      setSelectedPaymentMethod(methods[0]); // デフォルトで最初の支払い方法を選択
    }
  };

  const loadAccounts = async () => {
    const accountsData = await getAccounts();
    setAccounts(accountsData.filter(acc => acc.isActive));
    if (!editTransaction && accountsData.length > 0) {
      setSelectedAccount(accountsData[0]); // デフォルトで最初の口座を選択
    }
  };

  const loadInvestmentItems = async () => {
    // 実際の実装ではデータベースから取得
    // ここでは仮データを使用
    setInvestmentItems(dummyInvestmentItems);
  };

  const validateForm = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('有効な金額を入力してください');
      return false;
    }
    
    if (!selectedCategory && type !== 'transfer' && type !== 'investment') {
      setError('カテゴリーを選択してください');
      return false;
    }
    
    if (!selectedPaymentMethod && (type === 'expense' || type === 'investment')) {
      setError('支払い方法を選択してください');
      return false;
    }
    
    if (!selectedAccount && (type === 'income' || type === 'transfer')) {
      setError('口座を選択してください');
      return false;
    }
    
    if (type === 'investment' && !selectedInvestmentItem) {
      setError('投資銘柄を選択してください');
      return false;
    }
    
    // 振替取引の場合、振替元と振替先の口座が必要
    if (type === 'transfer') {
      if (!sourceAccount) {
        setError('振替元の口座を選択してください');
        return false;
      }
      if (!destinationAccount) {
        setError('振替先の口座を選択してください');
        return false;
      }
      if (sourceAccount.id === destinationAccount.id) {
        setError('振替元と振替先は異なる口座を選択してください');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      const amountValue = parseFloat(amount);
      
      if (type === 'transfer') {
        // 振替取引の場合
        if (!sourceAccount || !destinationAccount) {
          setError('振替元と振替先の口座を選択してください');
          return;
        }
        
        // 説明が空の場合、振替取引のデフォルト説明を設定
        let descriptionText = description.trim();
        if (!descriptionText) {
          descriptionText = `${sourceAccount.name}から${destinationAccount.name}への振替`;
        }
        
        const transferTransaction = {
          type,
          amount: amountValue,
          date,
          description: descriptionText,
          categoryId: selectedCategory ? selectedCategory.id : '',
          accountId: destinationAccount.id, // 振替先
          paymentMethodId: sourceAccount.id, // 振替元
        };

        if (editTransaction) {
          await updateTransaction(editTransaction.id, transferTransaction);
        } else {
          await saveTransaction(transferTransaction);
        }
      } else {
        // 通常の取引の場合
        // 説明が空の場合のデフォルト説明を設定
        let descriptionText = description.trim();
        if (!descriptionText) {
          if (type === 'investment' && selectedInvestmentItem) {
            descriptionText = `${selectedInvestmentItem.name}への投資`;
          } else if (selectedCategory) {
            descriptionText = `${selectedCategory.name}の${type === 'expense' ? '支出' : '収入'}`;
          } else {
            descriptionText = type === 'expense' ? '支出' : type === 'income' ? '収入' : '取引';
          }
        }
        
        let transactionData = {
          type,
          amount: amountValue,
          date,
          description: descriptionText,
          categoryId: selectedCategory ? selectedCategory.id : '',
          accountId: selectedAccount ? selectedAccount.id : '',
          paymentMethodId: selectedPaymentMethod ? selectedPaymentMethod.id : '',
          // 投資アイテムは投資タイプの場合のみ設定
          investmentItemId: type === 'investment' && selectedInvestmentItem ? selectedInvestmentItem.id : undefined,
        };

        if (editTransaction) {
          await updateTransaction(editTransaction.id, transactionData);
        } else {
          await saveTransaction(transactionData);
        }
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('取引の保存に失敗しました:', error);
      setError('取引の保存に失敗しました');
    }
  };

  const toggleCategorySection = () => {
    setShowCategorySection(!showCategorySection);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
    if (showAccountSection) setShowAccountSection(false);
  };

  const togglePaymentMethodSection = () => {
    setShowPaymentMethodSection(!showPaymentMethodSection);
    if (showCategorySection) setShowCategorySection(false);
    if (showAccountSection) setShowAccountSection(false);
  };

  const toggleAccountSection = () => {
    setShowAccountSection(!showAccountSection);
    if (showCategorySection) setShowCategorySection(false);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
  };

  const toggleInvestmentItemSection = () => {
    setShowInvestmentItemSection(!showInvestmentItemSection);
    if (showCategorySection) setShowCategorySection(false);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
    if (showAccountSection) setShowAccountSection(false);
  };

  // 振替元口座選択セクションの表示/非表示を切り替え
  const toggleSourceAccountSection = () => {
    setShowSourceAccountSection(!showSourceAccountSection);
    if (showDestinationAccountSection) setShowDestinationAccountSection(false);
    if (showCategorySection) setShowCategorySection(false);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
    if (showAccountSection) setShowAccountSection(false);
    if (showInvestmentItemSection) setShowInvestmentItemSection(false);
  };

  // 振替先口座選択セクションの表示/非表示を切り替え
  const toggleDestinationAccountSection = () => {
    setShowDestinationAccountSection(!showDestinationAccountSection);
    if (showSourceAccountSection) setShowSourceAccountSection(false);
    if (showCategorySection) setShowCategorySection(false);
    if (showPaymentMethodSection) setShowPaymentMethodSection(false);
    if (showAccountSection) setShowAccountSection(false);
    if (showInvestmentItemSection) setShowInvestmentItemSection(false);
  };

  // トランザクションのステータス情報表示
  const renderTransactionStatusInfo = () => {
    if (!editTransaction) return null;
    
    let statusLabel = '';
    let statusColor = '#666';
    
    switch (editTransaction.status) {
      case 'completed':
        statusLabel = '完了';
        break;
      case 'pending_settlement':
        statusLabel = '引き落とし予定';
        statusColor = '#ff9800'; // オレンジ
        break;
      case 'settlement':
        statusLabel = '引き落とし';
        statusColor = '#4caf50'; // 緑
        break;
      default:
        statusLabel = '不明';
    }
    
    // 関連トランザクションを取得
    const navigateToRelatedTransaction = async () => {
      if (editTransaction.relatedTransactionId) {
        try {
          const transactions = await getTransactions();
          const relatedTransaction = transactions.find(t => t.id === editTransaction.relatedTransactionId);
          
          if (relatedTransaction) {
            // 編集画面を閉じてから関連トランザクションへ移動
            navigation.goBack();
            setTimeout(() => {
              navigation.navigate('AddTransaction', { transaction: relatedTransaction });
            }, 100);
          } else {
            setError('関連トランザクションが見つかりませんでした');
          }
        } catch (error) {
          console.error('関連トランザクションの取得に失敗しました:', error);
          setError('関連トランザクションの取得に失敗しました');
        }
      }
    };
    
    return (
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Text variant="bodyMedium">ステータス:</Text>
          <Text variant="bodyMedium" style={{ color: statusColor, fontWeight: 'bold' }}>
            {statusLabel}
          </Text>
        </View>
        
        {editTransaction.status === 'pending_settlement' && editTransaction.creditCardSettlementDate && (
          <View style={styles.statusRow}>
            <Text variant="bodyMedium">引き落とし予定日:</Text>
            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
              {new Date(editTransaction.creditCardSettlementDate).toLocaleDateString('ja-JP')}
            </Text>
          </View>
        )}
        
        {editTransaction.relatedTransactionId && (
          <View style={styles.relatedTransactionRow}>
            <Text variant="bodyMedium">関連取引:</Text>
            <Button
              mode="text"
              compact
              onPress={navigateToRelatedTransaction}
              style={styles.relatedTransactionButton}
            >
              {editTransaction.status === 'pending_settlement' ? '引き落とし取引を表示' : '元の取引を表示'}
            </Button>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* ステータス情報表示（編集時のみ） */}
        {renderTransactionStatusInfo()}
        
        {/* 取引タイプ選択 */}
        <Text variant="titleMedium" style={styles.label}>取引タイプ</Text>
        
        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as TransactionType)}
          buttons={[
            { value: 'expense', label: '支出' },
            { value: 'income', label: '収入' },
            { value: 'transfer', label: '振替' },
            { value: 'investment', label: '投資' },
          ]}
          style={styles.segmentedButtons}
        />

        <TextInput
          label="金額"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            setError(null);
          }}
          keyboardType="numeric"
          style={styles.input}
        />

        <TextInput
          label="説明"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            setError(null);
          }}
          style={styles.input}
        />

        {type !== 'investment' && type !== 'transfer' && (
          <List.Accordion
            title={selectedCategory ? selectedCategory.name : "カテゴリーを選択"}
            left={props => <List.Icon {...props} icon={selectedCategory?.icon || "folder"} color={selectedCategory?.color || "#000"} />}
            expanded={showCategorySection}
            onPress={toggleCategorySection}
            style={styles.accordion}
          >
            {categories.map(category => (
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
              onPress={() => navigation.navigate('CategoryList' as any)}
              style={styles.addButton}
            >
              カテゴリーを管理
            </Button>
          </List.Accordion>
        )}

        {(type === 'expense' || type === 'investment') && (
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
              onPress={() => navigation.navigate('PaymentMethodList' as any)}
              style={styles.addButton}
            >
              支払い方法を管理
            </Button>
          </List.Accordion>
        )}

        {type === 'income' && (
          <List.Accordion
            title={selectedAccount ? selectedAccount.name : "入金先口座を選択"}
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
              onPress={() => navigation.navigate('AccountList' as any)}
              style={styles.addButton}
            >
              口座を管理
            </Button>
          </List.Accordion>
        )}

        {type === 'investment' && (
          <List.Accordion
            title={selectedInvestmentItem ? selectedInvestmentItem.name : "投資銘柄を選択"}
            left={props => <List.Icon {...props} icon={selectedInvestmentItem ? getInvestmentTypeIcon(selectedInvestmentItem.type) : "help-circle"} />}
            expanded={showInvestmentItemSection}
            onPress={toggleInvestmentItemSection}
            style={styles.accordion}
          >
            {investmentItems.filter(item => item.isActive).map((item) => (
              <List.Item
                key={item.id}
                title={item.name}
                description={getInvestmentTypeLabel(item.type)}
                left={props => <List.Icon {...props} icon={getInvestmentTypeIcon(item.type)} />}
                onPress={() => {
                  setSelectedInvestmentItem(item);
                  setShowInvestmentItemSection(false);
                }}
              />
            ))}
          </List.Accordion>
        )}

        {type === 'transfer' && (
          <List.Accordion
            title={sourceAccount ? `振替元: ${sourceAccount.name}` : "振替元口座を選択"}
            left={props => <List.Icon {...props} icon="bank-transfer-out" />}
            expanded={showSourceAccountSection}
            onPress={toggleSourceAccountSection}
            style={styles.accordion}
          >
            {accounts.filter(account => account.isActive).map(account => (
              <List.Item
                key={account.id}
                title={account.name}
                description={`残高: ¥${account.balance.toLocaleString()}`}
                left={props => <List.Icon {...props} icon="bank" />}
                onPress={() => {
                  setSourceAccount(account);
                  setShowSourceAccountSection(false);
                }}
                style={[
                  styles.accountItem,
                  sourceAccount?.id === account.id && styles.selectedItem,
                ]}
              />
            ))}
            <Button
              mode="text"
              onPress={() => navigation.navigate('AccountList' as any)}
              style={styles.addButton}
            >
              口座を管理
            </Button>
          </List.Accordion>
        )}

        {type === 'transfer' && (
          <List.Accordion
            title={destinationAccount ? `振替先: ${destinationAccount.name}` : "振替先口座を選択"}
            left={props => <List.Icon {...props} icon="bank-transfer-in" />}
            expanded={showDestinationAccountSection}
            onPress={toggleDestinationAccountSection}
            style={styles.accordion}
          >
            {accounts.filter(account => account.isActive && account.id !== sourceAccount?.id).map(account => (
              <List.Item
                key={account.id}
                title={account.name}
                description={`残高: ¥${account.balance.toLocaleString()}`}
                left={props => <List.Icon {...props} icon="bank" />}
                onPress={() => {
                  setDestinationAccount(account);
                  setShowDestinationAccountSection(false);
                }}
                style={[
                  styles.accountItem,
                  destinationAccount?.id === account.id && styles.selectedItem,
                ]}
              />
            ))}
            <Button
              mode="text"
              onPress={() => navigation.navigate('AccountList' as any)}
              style={styles.addButton}
            >
              口座を管理
            </Button>
          </List.Accordion>
        )}

        <Button
          mode="outlined"
          onPress={() => setShowDatePicker(true)}
          style={styles.input}
        >
          日付: {date.toLocaleDateString('ja-JP')}
        </Button>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        {error && (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {editTransaction ? '更新' : '保存'}
        </Button>
      </View>
    </ScrollView>
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

// 投資タイプのラベルを取得
const getInvestmentTypeLabel = (type: string): string => {
  switch (type) {
    case 'stock':
      return '株式';
    case 'crypto':
      return '暗号資産';
    case 'forex':
      return '外国為替';
    case 'bond':
      return '債券';
    case 'mutual_fund':
      return '投資信託';
    case 'other':
      return 'その他';
    default:
      return 'その他';
  }
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
  submitButton: {
    marginTop: 8,
  },
  statusContainer: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  relatedTransactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  relatedTransactionButton: {
    marginLeft: 8,
    padding: 0,
  },
}); 