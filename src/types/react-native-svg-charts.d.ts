declare module 'react-native-svg-charts' {
  import { ComponentType } from 'react';
  
  interface PieChartProps {
    data: any[];
    valueAccessor: ({ item }: { item: any }) => number;
    style?: any;
    spacing?: number;
    outerRadius?: string;
    innerRadius?: string;
    renderDecorator?: ({ item, piePath, index }: { item: any; piePath: string; index: number }) => JSX.Element;
  }

  export const PieChart: ComponentType<PieChartProps>;
} 