import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, FAB, IconButton, useTheme, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Category } from '../models/types';
import { getCategories, deleteCategory } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const CategoryListScreen = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const navigation = useNavigation<NavigationProp>();
  const theme = useTheme();

  const loadCategories = async () => {
    const data = await getCategories();
    // アクティブなカテゴリーのみ表示し、タイプごとにグループ化
    const activeCategories = data.filter(c => c.isActive);
    setCategories(activeCategories);
  };

  const handleDelete = async (id: string) => {
    await deleteCategory(id);
    await loadCategories();
  };

  useFocusEffect(
    useCallback(() => {
      loadCategories();
    }, [])
  );

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  return (
    <View style={styles.container}>
      <ScrollView>
        <List.Section>
          <List.Subheader>支出カテゴリー</List.Subheader>
          {expenseCategories.map(category => (
            <List.Item
              key={category.id}
              title={category.name}
              left={props => (
                <List.Icon
                  {...props}
                  icon={category.icon}
                  color={category.color}
                />
              )}
              right={props => (
                <View style={styles.actionButtons}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() =>
                      navigation.navigate('EditCategory', { categoryId: category.id })
                    }
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDelete(category.id)}
                  />
                </View>
              )}
            />
          ))}
        </List.Section>

        <List.Section>
          <List.Subheader>収入カテゴリー</List.Subheader>
          {incomeCategories.map(category => (
            <List.Item
              key={category.id}
              title={category.name}
              left={props => (
                <List.Icon
                  {...props}
                  icon={category.icon}
                  color={category.color}
                />
              )}
              right={props => (
                <View style={styles.actionButtons}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() =>
                      navigation.navigate('EditCategory', { categoryId: category.id })
                    }
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDelete(category.id)}
                  />
                </View>
              )}
            />
          ))}
        </List.Section>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddCategory')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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