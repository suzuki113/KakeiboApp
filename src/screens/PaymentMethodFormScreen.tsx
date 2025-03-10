import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, SegmentedButtons, HelperText, Switch, Text, List } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PaymentMethodType, Account } from '../models/types';
import { getPaymentMethods, savePaymentMethod, updatePaymentMethod, getAccounts } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type PaymentMethodFormRouteProp = RouteProp<RootStackParamList, 'EditPaymentMethod'>;

export const PaymentMethodFormScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentMethodFormRouteProp>();
  
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentMethodType>('cash');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // 引き落とし・締め日の設定
  const [billingDay, setBillingDay] = useState('');        // 引き落とし日
  const [closingDay, setClosingDay] = useState('');        // 締め日

  // 口座データをロードする
  useEffect(() => {
    const loadAccountsData = async () => {
      try {
        const accountsData = await getAccounts();
        setAccounts(accountsData.filter(acc => acc.isActive));
        
        // 選択された口座IDがある場合、対応する口座を選択
        if (selectedAccountId) {
          const account = accountsData.find(acc => acc.id === selectedAccountId);
          if (account) {
            setSelectedAccount(account);
          }
        }
      } catch (error) {
        console.error('口座の読み込みに失敗しました:', error);
      }
    };
    
    loadAccountsData();
  }, [selectedAccountId]);

  // 編集モードの場合、既存の支払い方法を読み込む
  useEffect(() => {
    if (route.params?.paymentMethodId) {
      loadPaymentMethod(route.params.paymentMethodId);
    }
  }, [route.params]);
  
  const loadPaymentMethod = async (id: string) => {
    try {
      setLoading(true);
      const methods = await getPaymentMethods();
      const method = methods.find(m => m.id === id);
      
      if (method) {
        setName(method.name);
        setType(method.type);
        setIsActive(method.isActive);
        setPaymentMethodId(method.id);
        
        // 引き落とし日と締め日を設定
        setBillingDay(method.billingDay ? method.billingDay.toString() : '');
        setClosingDay(method.closingDay ? method.closingDay.toString() : '');
        
        // 口座IDを設定
        if (method.accountId) {
          setSelectedAccountId(method.accountId);
        }
      }
    } catch (error) {
      console.error('支払い方法の読み込みに失敗しました:', error);
      setError('支払い方法の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = () => {
    if (!name.trim()) {
      setError('名前を入力してください');
      return false;
    }
    if (!selectedAccount) {
      setError('口座を選択してください');
      return false;
    }

    // クレジットカードと口座引き落としの場合の追加バリデーション
    if (type === 'credit_card' || type === 'direct_debit') {
      if (!billingDay || isNaN(Number(billingDay)) || Number(billingDay) < 1 || Number(billingDay) > 31) {
        setError('有効な引き落とし日を入力してください（1〜31）');
        return false;
      }
      
      if (!closingDay || isNaN(Number(closingDay)) || Number(closingDay) < 1 || Number(closingDay) > 31) {
        setError('有効な締め日を入力してください（1〜31）');
        return false;
      }
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      const paymentMethodData = {
        name,
        type,
        isActive,
        accountId: selectedAccount!.id,
        // クレジットカードと口座引き落としの場合のみ特殊フィールドを含める
        ...(type === 'credit_card' || type === 'direct_debit' ? {
          billingDay: Number(billingDay),
          closingDay: Number(closingDay),
        } : {})
      };
      
      if (paymentMethodId) {
        await updatePaymentMethod(paymentMethodId, paymentMethodData);
      } else {
        await savePaymentMethod(paymentMethodData);
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('支払い方法の保存に失敗しました:', error);
      setError('支払い方法の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

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

  const toggleAccountSelector = () => {
    setShowAccountSelector(!showAccountSelector);
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TextInput
          label="名前"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          style={styles.input}
        />
        
        <Text variant="titleMedium" style={styles.label}>支払い方法タイプ</Text>
        <SegmentedButtons
          value={type}
          onValueChange={(value) => {
            setType(value as PaymentMethodType);
            // クレジットカードまたは口座引き落とし以外を選択した場合は設定をリセット
            if (value !== 'credit_card' && value !== 'direct_debit') {
              setBillingDay('');
              setClosingDay('');
            }
          }}
          buttons={[
            { value: 'cash', label: '現金' },
            { value: 'credit_card', label: 'クレカ' },
            { value: 'bank_transfer', label: '銀行振込' },
            { value: 'electronic_money', label: '電子マネー' },
            { value: 'direct_debit', label: '口座引落' },
          ]}
          style={styles.segmentedButtons}
          multiSelect={false}
        />

        {/* クレジットカードと口座引き落とし共通の設定 */}
        {(type === 'credit_card' || type === 'direct_debit') && (
          <View style={styles.creditCardSettings}>
            <TextInput
              label="引き落とし日（1-31）"
              value={billingDay}
              onChangeText={setBillingDay}
              keyboardType="numeric"
              style={styles.input}
              placeholder="例: 27"
            />
            
            <TextInput
              label="締め日（1-31）"
              value={closingDay}
              onChangeText={setClosingDay}
              keyboardType="numeric"
              style={styles.input}
              placeholder="例: 15"
            />
            
            <Text style={styles.helpText}>
              {type === 'credit_card' ? 
                '締め日に利用分の合計が確定し、引き落とし日に口座から引き落としされます。' :
                '締め日までの利用分が、引き落とし日に口座から引き落としされます。'
              }
            </Text>
          </View>
        )}

        <List.Accordion
          title={selectedAccount ? `口座: ${selectedAccount.name}` : "口座を選択"}
          left={props => (
            <List.Icon
              {...props}
              icon={selectedAccount ? getAccountIcon(selectedAccount.type) : "bank-outline"}
            />
          )}
          expanded={showAccountSelector}
          onPress={toggleAccountSelector}
          style={styles.accordion}
        >
          {accounts.map(account => (
            <List.Item
              key={account.id}
              title={account.name}
              description={`${account.type} - 残高: ¥${account.balance.toLocaleString()}`}
              left={props => (
                <List.Icon
                  {...props}
                  icon={getAccountIcon(account.type)}
                />
              )}
              onPress={() => {
                setSelectedAccount(account);
                setShowAccountSelector(false);
                setError(null);
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

        <View style={styles.activeContainer}>
          <Text>有効</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        {error && <HelperText type="error">{error}</HelperText>}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          {paymentMethodId ? '更新' : '保存'}
        </Button>
      </View>
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
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  label: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  creditCardSettings: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  helpText: {
    color: 'gray',
    fontStyle: 'italic',
    fontSize: 12,
    marginBottom: 8,
  },
  activeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  accordion: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  accountItem: {
    backgroundColor: 'white',
  },
  selectedItem: {
    backgroundColor: 'rgba(98, 0, 238, 0.08)',
  },
  addButton: {
    marginTop: 8,
  },
  button: {
    marginTop: 16,
    marginBottom: 32,
  },
}); 