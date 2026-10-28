import { ref } from 'vue'

export interface StorageIssue {
  /** 哪类数据写失败,如「学习进度」 */
  scope: string
  message: string
}

/** 最近一次本地存储写入失败;null 表示正常。进度与课程共用一个提示位。 */
export const storageIssue = ref<StorageIssue | null>(null)

export function reportStorageError(scope: string, error: unknown) {
  storageIssue.value = {
    scope,
    message: error instanceof Error ? error.message : String(error),
  }
  console.warn(`[storage] ${scope} 写入失败:`, error)
}

export function clearStorageIssue() {
  storageIssue.value = null
}
