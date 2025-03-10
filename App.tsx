import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { AppNavigator } from './src/navigation/AppNavigator';
import theme from './src/theme/theme';

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
