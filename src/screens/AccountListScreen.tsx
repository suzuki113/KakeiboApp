import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, FAB, IconButton, Text, Divider, Card } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Account } from '../models/types';
import { getAccounts, deleteAccount, updateAccountBalances } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const AccountListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadAccounts = async () => {
    // 口座の残高を更新してから読み込む
    await updateAccountBalances();
    const data = await getAccounts();
    setAccounts(data);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadAccounts();
    }, [])
  );

  const handleEdit = (accountId: string) => {
    navigation.navigate('EditAccount', { accountId });
  };

  const handleDelete = async (id: string) => {
    await deleteAccount(id);
    await loadAccounts();
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

  return (
    <View style={styles.container}>
      <ScrollView>
        {accounts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyMedium">口座がありません。追加ボタンから作成してください。</Text>
            </Card.Content>
          </Card>
        ) : (
          accounts.map((account) => (
            <List.Item
              key={account.id}
              title={account.name}
              description={`${account.type} - ${account.isActive ? '有効' : '無効'}`}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={getAccountIcon(account.type)}
                />
              )}
              right={(props) => (
                <View style={styles.rightContainer}>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.balance,
                      { color: account.balance >= 0 ? '#4caf50' : '#f44336' }
                    ]}
                  >
                    ¥{account.balance.toLocaleString()}
                  </Text>
                  <View style={styles.actionButtons}>
                    <IconButton
                      {...props}
                      icon="pencil"
                      onPress={() => handleEdit(account.id)}
                    />
                    <IconButton
                      {...props}
                      icon="delete"
                      onPress={() => handleDelete(account.id)}
                    />
                  </View>
                </View>
              )}
            />
          ))
        )}
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddAccount')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyCard: {
    margin: 16,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balance: {
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 