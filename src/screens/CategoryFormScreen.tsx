import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, SegmentedButtons, HelperText, Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { TransactionType } from '../models/types';
import { saveCategory, getCategories, updateCategory } from '../utils/storage';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type CategoryFormScreenRouteProp = RouteProp<RootStackParamList, 'EditCategory'>;

const ICONS = [
  'silverware-fork-knife', 'train', 'car', 'home', 'cart-outline', 'medical-bag',
  'movie', 'tennis', 'school', 'cash', 'bank',
  'credit-card', 'gift', 'chart-line', 'face-woman', 'face-woman-outline',
  'hair-dryer', 'spray', 'bottle-tonic', 'mirror', 'hanger', 'emoticon-kiss',
  'water-outline', 'coffee', 'beer', 'hamburger', 'pizza', 'cake',
  'phone', 'cellphone', 'laptop', 'television', 'gamepad-variant',
  'baby-face-outline', 'dog', 'cat'
];

const COLOR_PALETTE = [
  '#BAB9EB', // 薄い紫
  '#EAB9EB', // ピンク寄りの薄い紫
  '#B9C9EB', // 薄い青
  '#AB89F0', // 紫
  '#FFFFFF', // 白
];

export const CategoryFormScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CategoryFormScreenRouteProp>();
  const isEditing = !!route.params?.categoryId;

  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
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

        <View style={styles.sectionTitle}>
          <HelperText type="info" style={styles.sectionLabel}>カラー選択</HelperText>
        </View>
        
        <View style={styles.colorGrid}>
          {COLOR_PALETTE.map((colorOption) => (
            <TouchableOpacity
              key={colorOption}
              style={[
                styles.colorItem,
                { backgroundColor: colorOption },
                color === colorOption && styles.selectedColorItem
              ]}
              onPress={() => setColor(colorOption)}
            />
          ))}
        </View>

        <View style={styles.colorPreview}>
          <Text style={styles.colorPreviewText}>選択した色:</Text>
          <View style={[styles.selectedColorPreview, { backgroundColor: color }]} />
        </View>

        <View style={styles.sectionTitle}>
          <HelperText type="info" style={styles.sectionLabel}>アイコン選択</HelperText>
        </View>

        <View style={styles.iconGrid}>
          {ICONS.map((iconName) => (
            <View key={iconName} style={styles.iconButtonContainer}>
              <Button
                icon={iconName}
                mode={icon === iconName ? 'contained' : 'outlined'}
                onPress={() => setIcon(iconName)}
                style={styles.iconButton}
                contentStyle={styles.iconButtonContent}
              >
                {''}
              </Button>
            </View>
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
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginVertical: 12,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedColorItem: {
    borderWidth: 3,
    borderColor: '#000',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 6,
  },
  colorPreviewText: {
    marginRight: 12,
  },
  selectedColorPreview: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginVertical: 12,
  },
  iconButtonContainer: {
    width: '25%',
    padding: 4,
  },
  iconButton: {
    width: '100%',
    marginBottom: 0,
  },
  iconButtonContent: {
    height: 44,
  },
  submitButton: {
    marginTop: 16,
  },
}); 