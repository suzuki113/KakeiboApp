import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, SegmentedButtons, HelperText } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { TransactionType } from '../models/types';
import { saveCategory, getCategories, updateCategory } from '../utils/storage';
import ColorPicker from 'react-native-wheel-color-picker';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryFormScreenRouteProp = RouteProp<RootStackParamList, 'EditCategory'>;

const ICONS = [
  'food', 'train', 'car', 'home', 'shopping', 'medical',
  'entertainment', 'sports', 'education', 'cash', 'bank',
  'credit-card', 'gift', 'chart-line'
];

export const CategoryFormScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryFormScreenRouteProp>();
  const isEditing = !!route.params?.categoryId;

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState('#FF5252');
  const [icon, setIcon] = useState(ICONS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadCategory();
    }
  }, [isEditing]);

  const loadCategory = async () => {
    const categories = await getCategories();
    const category = categories.find(c => c.id === route.params.categoryId);
    if (category) {
      setName(category.name);
      setType(category.type);
      setColor(category.color);
      setIcon(category.icon);
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      setError('カテゴリー名を入力してください');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (isEditing) {
        await updateCategory(route.params.categoryId, {
          name: name.trim(),
          type,
          color,
          icon,
        });
      } else {
        await saveCategory({
          name: name.trim(),
          type,
          color,
          icon,
          isActive: true,
        });
      }
      navigation.goBack();
    } catch (error) {
      setError('保存に失敗しました');
      console.error(error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TextInput
          label="カテゴリー名"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          style={styles.input}
        />

        <SegmentedButtons
          value={type}
          onValueChange={(value) => setType(value as TransactionType)}
          buttons={[
            { value: 'expense', label: '支出' },
            { value: 'income', label: '収入' },
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.colorPicker}>
          <ColorPicker
            color={color}
            onColorChange={setColor}
            thumbSize={30}
            sliderSize={30}
            noSnap={true}
            row={false}
          />
        </View>

        <View style={styles.iconGrid}>
          {ICONS.map((iconName) => (
            <Button
              key={iconName}
              icon={iconName}
              mode={icon === iconName ? 'contained' : 'outlined'}
              onPress={() => setIcon(iconName)}
              style={styles.iconButton}
            >
              {''}
            </Button>
          ))}
        </View>

        {error && (
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {isEditing ? '更新' : '作成'}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  colorPicker: {
    height: 200,
    marginBottom: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconButton: {
    width: '23%',
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 8,
  },
}); 