import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AddTransactionScreen } from '../screens/AddTransactionScreen';
import { CategoryListScreen } from '../screens/CategoryListScreen';
import { CategoryFormScreen } from '../screens/CategoryFormScreen';
import { PaymentMethodListScreen } from '../screens/PaymentMethodListScreen';
import { PaymentMethodFormScreen } from '../screens/PaymentMethodFormScreen';
import { AccountListScreen } from '../screens/AccountListScreen';
import { AccountFormScreen } from '../screens/AccountFormScreen';
import { InvestmentListScreen } from '../screens/InvestmentListScreen';
import { InvestmentItemFormScreen } from '../screens/InvestmentItemFormScreen';
import DebitCalendarScreen from '../screens/DebitCalendarScreen';
import { Transaction } from '../models/types';
import { IconButton, useTheme } from 'react-native-paper';
import { View, StyleSheet } from 'react-native';

export type RootStackParamList = {
  MainTabs: undefined;
  AddTransaction: { transaction?: Transaction };
  CategoryList: undefined;
  AddCategory: undefined;
  EditCategory: { categoryId: string };
  PaymentMethodList: undefined;
  AddPaymentMethod: undefined;
  EditPaymentMethod: { paymentMethodId: string };
  AccountList: undefined;
  AddAccount: undefined;
  EditAccount: { accountId: string };
  InvestmentItemList: undefined;
  AddInvestmentItem: undefined;
  EditInvestmentItem: { itemId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  DebitCalendar: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#757575',
        headerShown: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 60,
          paddingBottom: 5,
          paddingTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'ホーム',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <IconButton icon="home" size={28} iconColor={color} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{
          title: '取引履歴',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <IconButton icon="format-list-bulleted" size={28} iconColor={color} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="DebitCalendar"
        component={DebitCalendarScreen}
        options={{
          title: '引落カレンダー',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <IconButton icon="calendar" size={28} iconColor={color} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '設定',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconContainer}>
              <IconButton icon="cog" size={28} iconColor={color} />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} />}
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ title: '新規取引' }}
      />
      <Stack.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{ title: 'カテゴリー管理' }}
      />
      <Stack.Screen
        name="AddCategory"
        component={CategoryFormScreen}
        options={{ title: 'カテゴリー追加' }}
      />
      <Stack.Screen
        name="EditCategory"
        component={CategoryFormScreen}
        options={{ title: 'カテゴリー編集' }}
      />
      <Stack.Screen
        name="PaymentMethodList"
        component={PaymentMethodListScreen}
        options={{ title: '支払い方法管理' }}
      />
      <Stack.Screen
        name="AddPaymentMethod"
        component={PaymentMethodFormScreen}
        options={{ title: '支払い方法追加' }}
      />
      <Stack.Screen
        name="EditPaymentMethod"
        component={PaymentMethodFormScreen}
        options={{ title: '支払い方法編集' }}
      />
      <Stack.Screen
        name="AccountList"
        component={AccountListScreen}
        options={{ title: '口座管理' }}
      />
      <Stack.Screen
        name="AddAccount"
        component={AccountFormScreen}
        options={{ title: '口座追加' }}
      />
      <Stack.Screen
        name="EditAccount"
        component={AccountFormScreen}
        options={{ title: '口座編集' }}
      />
      <Stack.Screen
        name="InvestmentItemList"
        component={InvestmentListScreen}
        options={{ title: '投資銘柄管理' }}
      />
      <Stack.Screen
        name="AddInvestmentItem"
        component={InvestmentItemFormScreen}
        options={{ title: '投資銘柄追加' }}
      />
      <Stack.Screen
        name="EditInvestmentItem"
        component={InvestmentItemFormScreen}
        options={{ title: '投資銘柄編集' }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  activeIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
}); 