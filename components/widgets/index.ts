import type { ComponentType } from 'react';
import type { WidgetType } from '@/utils/widgets';
import BookmarksWidget from './bookmarks/BookmarksWidget';
import CalendarWidget from './calendar/CalendarWidget';
import FeedsWidget from './feeds/FeedsWidget';
import GardenWidget from './garden/GardenWidget';
import HistoryWidget from './history/HistoryWidget';
import HotListWidget from './hotlist/HotListWidget';
import NotesWidget from './notes/NotesWidget';
import TimerWidget from './timer/TimerWidget';
import WeatherWidget from './weather/WeatherWidget';
import WorldClockWidget from './worldclock/WorldClockWidget';
import type { WidgetProps } from './types';

// 每种小组件用哪个组件来画。
// 新增一种小组件：在 utils/widgets.ts 登记名称和默认尺寸，在这里对上组件（组件里用 WidgetFrame 包住内容）。
export const WIDGET_COMPONENTS: Record<WidgetType, ComponentType<WidgetProps>> = {
  notes: NotesWidget,
  calendar: CalendarWidget,
  garden: GardenWidget,
  bookmarks: BookmarksWidget,
  history: HistoryWidget,
  weather: WeatherWidget,
  worldclock: WorldClockWidget,
  timer: TimerWidget,
  hotlist: HotListWidget,
  feeds: FeedsWidget,
};

export type { FrameProps, WidgetProps } from './types';
