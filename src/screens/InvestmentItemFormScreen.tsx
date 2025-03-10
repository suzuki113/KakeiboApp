import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { Text, TextInput, Button, RadioButton, useTheme, Title, Divider } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { InvestmentType } from '../models/types';

// カスタムのラジオボタンアイテムコンポーネント
const RadioItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.radioItem}>
    <RadioButton value={value} />
    <Text>{label}</Text>
  </View>
);

type InvestmentItemFormScreenProps = {
  route: RouteProp<RootStackParamList, 'AddInvestmentItem' | 'EditInvestmentItem'>;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 仮データ
interface InvestmentItem {
  id: string;
  name: string;
  type: InvestmentType;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const dummyItem: InvestmentItem = {
  id: '1',
  name: 'Apple Inc.',
  type: 'stock',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const InvestmentItemFormScreen = () => {
  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('stock');
  const [loading, setLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [item, setItem] = useState<InvestmentItem | null>(null);
  
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<InvestmentItemFormScreenProps['route']>();
  const theme = useTheme();
  
  useEffect(() => {
    // 編集モードの場合
    if (route.name === 'EditInvestmentItem' && route.params?.itemId) {
      setIsEdit(true);
      fetchItemDetails(route.params.itemId);
    }
  }, []);
  
  const fetchItemDetails = async (id: string) => {
    setLoading(true);
    // 実際の実装ではデータベースから取得
    // ここでは仮データを使用
    setTimeout(() => {
      setItem(dummyItem);
      setName(dummyItem.name);
      setType(dummyItem.type);
      setLoading(false);
    }, 300);
  };
  
  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('エラー', '銘柄名を入力してください');
      return false;
    }
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    const investmentItemData = {
      name,
      type,
      isActive: true,
      ...(isEdit && item ? { id: item.id } : {}),
    };
    
    try {
      // 実際の実装ではAPIやデータベースに保存
      console.log('保存データ:', investmentItemData);
      
      Alert.alert(
        '成功', 
        isEdit ? '銘柄情報を更新しました' : '銘柄を追加しました',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('保存エラー:', error);
      Alert.alert('エラー', '保存中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Title>{isEdit ? '銘柄を編集' : '銘柄を追加'}</Title>
        <Divider style={styles.divider} />
        
        <TextInput
          label="銘柄名"
          value={name}
          onChangeText={setName}
          style={styles.input}
          mode="outlined"
        />
        
        <Text style={styles.label}>銘柄種別</Text>
        <RadioButton.Group onValueChange={(value) => setType(value as InvestmentType)} value={type}>
          <View style={styles.radioRow}>
            <RadioItem label="株式" value="stock" />
            <RadioItem label="投資信託" value="mutual_fund" />
            <RadioItem label="暗号資産" value="crypto" />
          </View>
          <View style={styles.radioRow}>
            <RadioItem label="債券" value="bond" />
            <RadioItem label="外国為替" value="forex" />
            <RadioItem label="その他" value="other" />
          </View>
        </RadioButton.Group>
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.button}
          loading={loading}
          disabled={loading}
        >
          {isEdit ? '更新' : '追加'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    marginTop: 24,
  },
}); 