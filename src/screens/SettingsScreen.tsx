import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Divider, Card, useTheme, IconButton, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../theme/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>データ管理</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <IconButton icon="calendar-sync" iconColor={theme.colors.primary} size={24} />
              </View>
              <View style={styles.textContainer}>
                <Text variant="bodyLarge">定期取引管理</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>サブスクリプションや定期的な取引の管理</Text>
              </View>
            </View>
            <IconButton 
              icon="chevron-right" 
              size={24} 
              iconColor={theme.colors.outline}
              onPress={() => navigation.navigate('RecurringTransactionList')}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <IconButton icon="tag" iconColor={theme.colors.primary} size={24} />
              </View>
              <View style={styles.textContainer}>
                <Text variant="bodyLarge">カテゴリー管理</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>収入・支出カテゴリーの管理</Text>
              </View>
            </View>
            <IconButton 
              icon="chevron-right" 
              size={24} 
              iconColor={theme.colors.outline}
              onPress={() => navigation.navigate('CategoryList')}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <IconButton icon="bank" iconColor={theme.colors.primary} size={24} />
              </View>
              <View style={styles.textContainer}>
                <Text variant="bodyLarge">口座管理</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>銀行口座、クレジットカードなどの管理</Text>
              </View>
            </View>
            <IconButton 
              icon="chevron-right" 
              size={24} 
              iconColor={theme.colors.outline}
              onPress={() => navigation.navigate('AccountList')}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <IconButton icon="credit-card" iconColor={theme.colors.primary} size={24} />
              </View>
              <View style={styles.textContainer}>
                <Text variant="bodyLarge">支払い方法管理</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>支払い方法の追加・編集</Text>
              </View>
            </View>
            <IconButton 
              icon="chevron-right" 
              size={24} 
              iconColor={theme.colors.outline}
              onPress={() => navigation.navigate('PaymentMethodList')}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <IconButton icon="chart-line" iconColor={theme.colors.primary} size={24} />
              </View>
              <View style={styles.textContainer}>
                <Text variant="bodyLarge">投資銘柄管理</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>株式、投資信託などの銘柄管理</Text>
              </View>
            </View>
            <IconButton 
              icon="chevron-right" 
              size={24} 
              iconColor={theme.colors.outline}
              onPress={() => navigation.navigate('InvestmentItemList')}
            />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightBlue,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
}); 