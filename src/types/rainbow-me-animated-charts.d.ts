declare module '@rainbow-me/animated-charts' {
  import { ComponentType } from 'react';

  interface PieChartData {
    value: number;
    color: string;
    key: string;
  }

  interface PieChartProps {
    data: PieChartData[];
    radius?: number;
    innerRadius?: number;
    selectedIndex?: number;
  }

  export const PieChart: ComponentType<PieChartProps>;
} 