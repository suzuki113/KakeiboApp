import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>アカウント設定</List.Subheader>
        <List.Item
          title="プロフィール"
          left={props => <List.Icon {...props} icon="account" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="通知"
          left={props => <List.Icon {...props} icon="bell" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>データ管理</List.Subheader>
        <List.Item
          title="カテゴリー管理"
          description="収入・支出カテゴリーの管理"
          left={props => <List.Icon {...props} icon="tag" />}
          onPress={() => navigation.navigate('CategoryList')}
        />
        <List.Item
          title="口座管理"
          description="銀行口座、クレジットカードなどの管理"
          left={props => <List.Icon {...props} icon="bank" />}
          onPress={() => navigation.navigate('AccountList')}
        />
        <List.Item
          title="支払い方法管理"
          description="支払い方法の追加・編集"
          left={props => <List.Icon {...props} icon="credit-card" />}
          onPress={() => navigation.navigate('PaymentMethodList')}
        />
        <List.Item
          title="投資銘柄管理"
          description="株式、投資信託などの銘柄管理"
          left={props => <List.Icon {...props} icon="chart-line" />}
          onPress={() => navigation.navigate('InvestmentItemList')}
        />
      </List.Section>

      <Divider />

      <List.Section>
        <List.Subheader>その他</List.Subheader>
        <List.Item
          title="アプリについて"
          left={props => <List.Icon {...props} icon="information" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
        <List.Item
          title="ヘルプ"
          left={props => <List.Icon {...props} icon="help-circle" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
}); 