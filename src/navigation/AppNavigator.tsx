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
import RecurringTransactionListScreen from '../screens/RecurringTransactionListScreen';
import RecurringTransactionFormScreen from '../screens/RecurringTransactionFormScreen';
import { Transaction, RecurringTransaction } from '../models/types';
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
  RecurringTransactionList: undefined;
  RecurringTransactionForm: { recurringTransactionId?: string };
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
          title: 'Home',
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
          title: 'Transactions',
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
          title: 'Debit Calendar',
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
          title: 'Settings',
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
        options={({ route }) => ({
          title: route.params?.transaction ? 'Edit Transaction' : 'New Transaction'
        })}
      />
      <Stack.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{ title: 'Category Management' }}
      />
      <Stack.Screen
        name="AddCategory"
        component={CategoryFormScreen}
        options={{ title: 'Add Category' }}
      />
      <Stack.Screen
        name="EditCategory"
        component={CategoryFormScreen}
        options={{ title: 'Edit Category' }}
      />
      <Stack.Screen
        name="PaymentMethodList"
        component={PaymentMethodListScreen}
        options={{ title: 'Payment Method Management' }}
      />
      <Stack.Screen
        name="AddPaymentMethod"
        component={PaymentMethodFormScreen}
        options={{ title: 'Add Payment Method' }}
      />
      <Stack.Screen
        name="EditPaymentMethod"
        component={PaymentMethodFormScreen}
        options={{ title: 'Edit Payment Method' }}
      />
      <Stack.Screen
        name="AccountList"
        component={AccountListScreen}
        options={{ title: 'Account Management' }}
      />
      <Stack.Screen
        name="AddAccount"
        component={AccountFormScreen}
        options={{ title: 'Add Account' }}
      />
      <Stack.Screen
        name="EditAccount"
        component={AccountFormScreen}
        options={{ title: 'Edit Account' }}
      />
      <Stack.Screen
        name="InvestmentItemList"
        component={InvestmentListScreen}
        options={{ title: 'Investment Item Management' }}
      />
      <Stack.Screen
        name="AddInvestmentItem"
        component={InvestmentItemFormScreen}
        options={{ title: 'Add Investment Item' }}
      />
      <Stack.Screen
        name="EditInvestmentItem"
        component={InvestmentItemFormScreen}
        options={{ title: 'Edit Investment Item' }}
      />
      <Stack.Screen
        name="RecurringTransactionList"
        component={RecurringTransactionListScreen}
        options={{ title: 'Recurring Transaction Management' }}
      />
      <Stack.Screen
        name="RecurringTransactionForm"
        component={RecurringTransactionFormScreen}
        options={({ route }) => ({
          title: route.params?.recurringTransactionId ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'
        })}
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