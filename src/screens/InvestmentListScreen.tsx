import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, List, FAB, Divider, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { InvestmentType } from '../models/types';

// 簡素化した投資銘柄モデル
interface InvestmentItem {
  id: string;
  name: string;
  type: InvestmentType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

// 投資タイプに応じたアイコンを取得
const getInvestmentTypeIcon = (type: InvestmentType): string => {
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

// 投資タイプのラベルを取得
const getInvestmentTypeLabel = (type: InvestmentType): string => {
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const InvestmentListScreen = () => {
  const [investmentItems, setInvestmentItems] = useState<InvestmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  useEffect(() => {
    fetchInvestmentItems();
  }, []);

  const fetchInvestmentItems = async () => {
    setLoading(true);
    // 実際の実装ではAPIやデータベースからデータを取得
    setTimeout(() => {
      setInvestmentItems(dummyInvestmentItems);
      setLoading(false);
    }, 500);
  };

  const renderItem = ({ item }: { item: InvestmentItem }) => {
    return (
      <List.Item
        title={item.name}
        description={getInvestmentTypeLabel(item.type)}
        left={props => <List.Icon {...props} icon={getInvestmentTypeIcon(item.type)} />}
        right={props => (
          <IconButton
            {...props}
            icon="pencil"
            onPress={() => navigation.navigate('EditInvestmentItem', { itemId: item.id })}
          />
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : (
        <>
          <FlatList
            data={investmentItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => <Divider />}
            contentContainerStyle={styles.listContent}
          />
          
          <FAB
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            icon="plus"
            onPress={() => navigation.navigate('AddInvestmentItem')}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 