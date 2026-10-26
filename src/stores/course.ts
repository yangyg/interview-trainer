import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type {
  Course,
  CourseIndex,
  CourseProgressData,
  CourseSummary,
  Language,
  Lesson,
  Stage,
} from '@/lib/types'

const STORAGE_KEY = 'interview-trainer/course-v1'

function defaultProgress(): CourseProgressData {
  return { version: 1, lessons: {} }
}

function lessonKey(courseId: string, lessonId: string): string {
  return `${courseId}/${lessonId}`
}

/** 课程 JSON 是构建产物,但仍是外部输入:跑过旧版本 dev 缓存 / 手工改坏都可能出现 */
function parseCourse(raw: unknown, expectedId: string): Course {
  const c = raw as Partial<Course> | null
  if (!c || c.version !== 1) throw new Error('课程数据版本不支持')
  if (c.id !== expectedId) throw new Error(`课程 ID 不匹配(${String(c.id)})`)
  if (!Array.isArray(c.stages) || c.stages.length === 0) throw new Error('课程缺少阶段数据')
  return c as Course
}

export const useCourseStore = defineStore('course', () => {
  // 课程完成度与 SRS 进度(progress-v1)分开存:两者语义不同,
  // 混在一个 key 里会导致「重置学习记录」把课程解锁状态一起抹掉。
  const progress = useLocalStorage<CourseProgressData>(STORAGE_KEY, defaultProgress(), {
    listenToStorageChanges: true,
    mergeDefaults: true,
  })

  const index = shallowRef<CourseIndex | null>(null)
  /** courseId -> 完整课程(含阶段与课时),按需加载 */
  const loaded = shallowRef<Record<string, Course>>({})
  const indexLoading = ref(false)
  const indexError = ref('')
  const courseErrors = ref<Record<string, string>>({})
  /** 进行中的请求:同一门课并发进入时共用一次 fetch */
  const inflight = new Map<string, Promise<Course | null>>()

  const courses = computed<CourseSummary[]>(() => index.value?.courses ?? [])
  const isIndexReady = computed(() => !!index.value)
  const buildHash = computed(() => index.value?.buildHash ?? '')

  function summaryOf(courseId: string): CourseSummary | undefined {
    return courses.value.find((c) => c.id === courseId)
  }

  function courseOf(courseId: string): Course | undefined {
    return loaded.value[courseId]
  }

  /** 同语言内按 order 升序(构建脚本写入的是语言内序号,不能全局排序) */
  function coursesOf(language: Language): CourseSummary[] {
    return courses.value.filter((c) => c.language === language).sort((a, b) => a.order - b.order)
  }

  async function init() {
    if (indexLoading.value || index.value) return
    indexLoading.value = true
    indexError.value = ''
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/courses/index.json`)
      if (!res.ok) throw new Error(`课程索引加载失败(${res.status})`)
      const raw = (await res.json()) as CourseIndex
      if (!raw || raw.version !== 1 || !Array.isArray(raw.courses)) {
        throw new Error('课程索引格式不正确')
      }
      index.value = raw
    } catch (e) {
      indexError.value = e instanceof Error ? e.message : String(e)
    } finally {
      indexLoading.value = false
    }
  }

  /** 幂等 + 并发去重;失败返回 null 并把原因写进 courseErrors */
  function loadCourse(courseId: string): Promise<Course | null> {
    const cached = loaded.value[courseId]
    if (cached) return Promise.resolve(cached)
    const pending = inflight.get(courseId)
    if (pending) return pending

    const task = (async (): Promise<Course | null> => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/courses/${courseId}.json`)
        if (!res.ok) throw new Error(`课程数据加载失败(${res.status})`)
        const course = parseCourse(await res.json(), courseId)
        loaded.value = { ...loaded.value, [courseId]: course }
        if (courseErrors.value[courseId]) {
          const next = { ...courseErrors.value }
          delete next[courseId]
          courseErrors.value = next
        }
        return course
      } catch (e) {
        courseErrors.value = {
          ...courseErrors.value,
          [courseId]: e instanceof Error ? e.message : String(e),
        }
        return null
      } finally {
        inflight.delete(courseId)
      }
    })()

    inflight.set(courseId, task)
    return task
  }

  // ---------- 完成度派生 ----------

  function isLessonComplete(courseId: string, lessonId: string): boolean {
    return !!progress.value.lessons[lessonKey(courseId, lessonId)]
  }

  function completedAt(courseId: string, lessonId: string): number | undefined {
    return progress.value.lessons[lessonKey(courseId, lessonId)]?.completedAt
  }

  /** 课程内课时的扁平顺序,供「上一课 / 下一课 / 解锁」使用 */
  function flatLessons(courseId: string): { stage: Stage; lesson: Lesson }[] {
    const course = loaded.value[courseId]
    if (!course) return []
    return course.stages.flatMap((stage) => stage.lessons.map((lesson) => ({ stage, lesson })))
  }

  function completedKeyCount(courseId: string): number {
    const prefix = `${courseId}/`
    return Object.keys(progress.value.lessons).filter((k) => k.startsWith(prefix)).length
  }

  /**
   * 软锁:前一课没完成时本课标记为「未解锁」,但不阻断路由。
   * 直接输 URL 进来的人不该被挡在门外,只是列表里置灰 + 给一次提示。
   */
  function isUnlocked(courseId: string, lessonId: string): boolean {
    const flat = flatLessons(courseId)
    const i = flat.findIndex((x) => x.lesson.id === lessonId)
    // 课程未加载(i === -1)或第一课时:一律不锁
    if (i <= 0) return true
    return flat.slice(0, i).every((x) => isLessonComplete(courseId, x.lesson.id))
  }

  /** 课程内下一个未完成课时;全部完成返回 null。课程未加载时回退到 firstLessonId */
  function nextLesson(courseId: string): Lesson | null {
    const flat = flatLessons(courseId)
    if (!flat.length) return null
    for (const { lesson } of flat) {
      if (!isLessonComplete(courseId, lesson.id)) return lesson
    }
    return null
  }

  function prevLesson(courseId: string, lessonId: string): Lesson | null {
    const flat = flatLessons(courseId)
    const i = flat.findIndex((x) => x.lesson.id === lessonId)
    return i > 0 ? flat[i - 1].lesson : null
  }

  function nextLessonAfter(courseId: string, lessonId: string): Lesson | null {
    const flat = flatLessons(courseId)
    const i = flat.findIndex((x) => x.lesson.id === lessonId)
    return i >= 0 && i < flat.length - 1 ? flat[i + 1].lesson : null
  }

  function courseProgress(courseId: string): { done: number; total: number; pct: number } {
    const flat = flatLessons(courseId)
    const total = flat.length || summaryOf(courseId)?.lessonCount || 0
    const done = flat.length
      ? flat.filter((x) => isLessonComplete(courseId, x.lesson.id)).length
      : Math.min(completedKeyCount(courseId), total)
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }

  function stageProgress(
    courseId: string,
    stageId: string,
  ): { done: number; total: number; pct: number } {
    const stage = loaded.value[courseId]?.stages.find((s) => s.id === stageId)
    if (!stage) return { done: 0, total: 0, pct: 0 }
    const total = stage.lessons.length
    const done = stage.lessons.filter((l) => isLessonComplete(courseId, l.id)).length
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }

  /** 阶段课时是否全部完成(验收题是额外练习,不计入阶段完成态) */
  function isStageComplete(courseId: string, stageId: string): boolean {
    const stage = loaded.value[courseId]?.stages.find((s) => s.id === stageId)
    if (!stage) return false
    return stage.lessons.every((l) => isLessonComplete(courseId, l.id))
  }

  /** 首页「继续学习」:上次进入的课时优先,否则第一门课的第一课 */
  const continueTarget = computed<{ courseId: string; lessonId: string } | null>(() => {
    const last = progress.value.lastLesson
    if (last && summaryOf(last.courseId)) {
      return { courseId: last.courseId, lessonId: last.lessonId }
    }
    const first = coursesOf('java')[0] ?? courses.value[0]
    if (first) return { courseId: first.id, lessonId: first.firstLessonId }
    return null
  })

  const completedLessonCount = computed(() => Object.keys(progress.value.lessons).length)

  // ---------- 动作 ----------

  function touchLesson(courseId: string, lessonId: string) {
    progress.value.lastLesson = { courseId, lessonId, at: Date.now() }
  }

  /** 首次完成时写入并返回 true;重复完成不改时间戳(保留第一次达成时间) */
  function markLessonComplete(courseId: string, lessonId: string): boolean {
    const key = lessonKey(courseId, lessonId)
    touchLesson(courseId, lessonId)
    if (progress.value.lessons[key]) return false
    progress.value.lessons[key] = { completedAt: Date.now() }
    return true
  }

  function unmarkLessonComplete(courseId: string, lessonId: string) {
    delete progress.value.lessons[lessonKey(courseId, lessonId)]
  }

  function resetCourseProgress(courseId: string) {
    const prefix = `${courseId}/`
    const next: Record<string, { completedAt: number }> = {}
    for (const [k, v] of Object.entries(progress.value.lessons)) {
      if (!k.startsWith(prefix)) next[k] = v
    }
    progress.value.lessons = next
    if (progress.value.lastLesson?.courseId === courseId) {
      progress.value.lastLesson = undefined
    }
  }

  function resetAll() {
    progress.value = defaultProgress()
  }

  function exportJson(): string {
    return JSON.stringify(progress.value, null, 2)
  }

  function importJson(text: string): { ok: boolean; message: string } {
    try {
      const parsed = JSON.parse(text) as CourseProgressData
      if (!parsed || parsed.version !== 1 || typeof parsed.lessons !== 'object') {
        return { ok: false, message: '文件格式不正确(需要 version: 1 的课程进度备份)' }
      }
      progress.value = {
        version: 1,
        lessons: parsed.lessons ?? {},
        lastLesson: parsed.lastLesson,
      }
      return { ok: true, message: `已导入 ${Object.keys(parsed.lessons ?? {}).length} 条课时完成记录` }
    } catch {
      return { ok: false, message: 'JSON 解析失败,请检查文件内容' }
    }
  }

  return {
    // 状态
    index,
    indexLoading,
    indexError,
    courseErrors,
    progress,
    completedLessonCount,
    buildHash,
    // 派生
    courses,
    isIndexReady,
    continueTarget,
    // 查询
    summaryOf,
    courseOf,
    coursesOf,
    flatLessons,
    isLessonComplete,
    completedAt,
    isUnlocked,
    nextLesson,
    prevLesson,
    nextLessonAfter,
    courseProgress,
    stageProgress,
    isStageComplete,
    // 动作
    init,
    loadCourse,
    touchLesson,
    markLessonComplete,
    unmarkLessonComplete,
    resetCourseProgress,
    resetAll,
    exportJson,
    importJson,
  }
})
