import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, FAB, IconButton, Text, Divider, Card } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PaymentMethod } from '../models/types';
import { getPaymentMethods, deletePaymentMethod } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const PaymentMethodListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const loadPaymentMethods = async () => {
    const methods = await getPaymentMethods();
    setPaymentMethods(methods);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadPaymentMethods();
    }, [])
  );

  const handleEdit = (paymentMethodId: string) => {
    navigation.navigate('EditPaymentMethod', { paymentMethodId });
  };

  const handleDelete = async (id: string) => {
    await deletePaymentMethod(id);
    await loadPaymentMethods();
  };

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

  return (
    <View style={styles.container}>
      <ScrollView>
        {paymentMethods.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="bodyMedium">支払い方法がありません。追加ボタンから作成してください。</Text>
            </Card.Content>
          </Card>
        ) : (
          paymentMethods.map((method) => (
            <List.Item
              key={method.id}
              title={method.name}
              description={`${method.isActive ? '有効' : '無効'}`}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={getPaymentMethodIcon(method.type)}
                />
              )}
              right={(props) => (
                <View style={styles.actionButtons}>
                  <IconButton
                    {...props}
                    icon="pencil"
                    onPress={() => handleEdit(method.id)}
                  />
                  <IconButton
                    {...props}
                    icon="delete"
                    onPress={() => handleDelete(method.id)}
                  />
                </View>
              )}
            />
          ))
        )}
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddPaymentMethod')}
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