import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';

let registered = false;

export function ensureChartRegistry(): typeof ChartJS {
  if (!registered) {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      BarController,
      DoughnutController,
      LineController,
      BarElement,
      ArcElement,
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Legend,
      Filler,
    );
    registered = true;
  }
  return ChartJS;
}
