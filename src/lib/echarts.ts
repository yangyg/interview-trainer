import { BarChart, HeatmapChart, PieChart } from 'echarts/charts'
import {
  CalendarComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  BarChart,
  PieChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CalendarComponent,
  VisualMapComponent,
])

export { VChart }
