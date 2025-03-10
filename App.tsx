import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import theme from './src/theme/theme';
import { useEffect } from 'react';
import { checkRecurringTransactionsOnStartup } from './src/utils/recurringTransactions';

export default function App() {
  // アプリ起動時に定期取引をチェック
  useEffect(() => {
    const checkRecurringTransactions = async () => {
      try {
        await checkRecurringTransactionsOnStartup();
      } catch (error) {
        console.error('定期取引チェック処理でエラーが発生しました:', error);
      }
    };
    
    checkRecurringTransactions();
  }, []);

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
