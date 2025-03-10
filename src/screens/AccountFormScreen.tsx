import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, HelperText, Switch, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AccountType } from '../models/types';
import { getAccounts, saveAccount, updateAccount } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AccountFormRouteProp = RouteProp<RootStackParamList, 'EditAccount'>;

export const AccountFormScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AccountFormRouteProp>();
  
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('0');
  const [currency, setCurrency] = useState('JPY');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  
  useEffect(() => {
    if (route.params?.accountId) {
      loadAccount(route.params.accountId);
    }
  }, [route.params]);
  
  const loadAccount = async (id: string) => {
    try {
      setLoading(true);
      const accounts = await getAccounts();
      const account = accounts.find(a => a.id === id);
      
      if (account) {
        setName(account.name);
        setType(account.type);
        setBalance(account.balance.toString());
        setCurrency(account.currency);
        setIsActive(account.isActive);
        setAccountId(account.id);
      }
    } catch (error) {
      console.error('口座の読み込みに失敗しました:', error);
      setError('口座の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const validateForm = () => {
    if (!name.trim()) {
      setError('名前を入力してください');
      return false;
    }
    if (isNaN(parseFloat(balance))) {
      setError('残高は数値で入力してください');
      return false;
    }
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      if (accountId) {
        // 既存の口座を更新
        await updateAccount(accountId, {
          name,
          type,
          balance: parseFloat(balance),
          currency,
          isActive,
        });
      } else {
        // 新しい口座を保存
        await saveAccount({
          name,
          type,
          balance: parseFloat(balance),
          currency,
          isActive,
        });
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('口座の保存に失敗しました:', error);
      setError('口座の保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TextInput
          label="口座名"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          style={styles.input}
        />
        
        <TextInput
          label="残高"
          value={balance}
          onChangeText={(text) => {
            setBalance(text);
            setError(null);
          }}
          keyboardType="numeric"
          style={styles.input}
        />
        
        <TextInput
          label="通貨"
          value={currency}
          onChangeText={setCurrency}
          style={styles.input}
        />
        
        <View style={styles.switchContainer}>
          <Text>有効</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>
        
        {error && (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        )}
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {accountId ? '更新' : '保存'}
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
    backgroundColor: '#fff',
  },
  label: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  button: {
    marginTop: 8,
  },
}); 