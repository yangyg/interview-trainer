import { describe, expect, it } from 'vitest'
import { cjkTokenizer, createQuestionSearch } from './search'
import type { Question } from './types'

function question(id: string, title: string, searchText: string): Question {
  return {
    id,
    language: 'java',
    topicId: 'java-01',
    chapter: '第三章 String',
    no: 'Q1',
    title,
    frequency: 3,
    difficulty: 2,
    answerHtml: '',
    searchText,
    sources: [],
    tags: [],
  }
}

describe('cjkTokenizer', () => {
  it('中文按二元组切分', () => {
    expect(cjkTokenizer('线程池')).toEqual(['线程', '程池'])
  })

  it('单个汉字保留,不被丢成空数组', () => {
    expect(cjkTokenizer('锁')).toEqual(['锁'])
  })

  it('拉丁词整词小写,中英混排按标点断开', () => {
    expect(cjkTokenizer('JDK 线程池,G1 与 CMS')).toEqual(['jdk', '线程', '程池', 'g1', '与', 'cms'])
  })
})

describe('createQuestionSearch', () => {
  it('中文任意连续两字可命中标题', () => {
    const index = createQuestionSearch()
    index.addAll([question('a', 'JVM 垃圾回收', 'GC 分代'), question('b', 'HashMap 扩容', '红黑树')])
    const ids = index.search('垃圾').map((h) => h.id)
    expect(ids).toContain('a')
  })

  it('英文检索大小写不敏感,且能搜到答案正文', () => {
    const index = createQuestionSearch()
    index.addAll([question('a', 'JVM 垃圾回收', 'GC 分代'), question('b', 'HashMap 扩容', '红黑树')])
    expect(index.search('hashmap').map((h) => h.id)).toContain('b')
    expect(index.search('分代').map((h) => h.id)).toContain('a')
  })
})
