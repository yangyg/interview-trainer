import type { Component } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import {
  BookOpenIcon,
  CalculatorIcon,
  HomeIcon,
  LayersIcon,
  NotebookIcon,
  RouteIcon,
  TimerIcon,
} from '@lucide/vue'

/**
 * 主导航的唯一数据源。
 * 侧边栏、移动端底栏、⌘K 面板三处共用,避免新增页面时漏改某处。
 * 分组路由(课程地图 / 课程详情 / 课时页)通过 route.meta.nav 归到同一个 key。
 */
export interface NavItem {
  /** 与 route.meta.nav 对应;未声明 meta.nav 的路由回退到 route.name */
  key: string
  label: string
  /** 移动端底栏用的两字短标签 */
  short: string
  icon: Component
  to: { name: string }
  /** 是否进移动端底部导航(底栏只放主线,错题本放侧边栏) */
  mobile: boolean
}

export const MAIN_NAV: NavItem[] = [
  { key: 'home', label: '首页', short: '首页', icon: HomeIcon, to: { name: 'home' }, mobile: true },
  { key: 'courses', label: '学习路径', short: '路径', icon: RouteIcon, to: { name: 'courses' }, mobile: true },
  { key: 'browse', label: '题库浏览', short: '题库', icon: BookOpenIcon, to: { name: 'browse' }, mobile: true },
  { key: 'flashcards', label: '背题卡片', short: '背题', icon: LayersIcon, to: { name: 'flashcards' }, mobile: true },
  { key: 'quiz', label: '模拟面试', short: '模考', icon: TimerIcon, to: { name: 'quiz' }, mobile: true },
  { key: 'stats', label: '学习统计', short: '统计', icon: CalculatorIcon, to: { name: 'stats' }, mobile: true },
  { key: 'wrongbook', label: '错题本', short: '错题', icon: NotebookIcon, to: { name: 'wrongbook' }, mobile: false },
]

export const MOBILE_NAV: NavItem[] = MAIN_NAV.filter((item) => item.mobile)

/** 当前路由是否落在某个导航项下(课程子路由靠 meta.nav 归并) */
export function isNavActive(route: RouteLocationNormalizedLoaded, item: NavItem): boolean {
  const current = (route.meta.nav as string | undefined) ?? (route.name as string | undefined)
  return current === item.key
}
