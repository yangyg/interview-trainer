import javaLangCollections from './java/lang-collections.mjs'
import javaConcurrencyJvm from './java/concurrency-jvm.mjs'
import javaSpring from './java/spring.mjs'
import javaMysqlRedis from './java/mysql-redis.mjs'
import javaDistributedNetwork from './java/distributed-network.mjs'
import javaDesignAlgorithm from './java/design-algorithm.mjs'
import goLanguage from './go/language.mjs'
import goConcurrencyRuntime from './go/concurrency-runtime.mjs'
import goEngineeringSystem from './go/engineering-system.mjs'
import aiFoundation from './ai/foundation.mjs'
import aiServingPrompt from './ai/serving-prompt.mjs'
import aiRagAgent from './ai/rag-agent.mjs'
import aiProduction from './ai/production.mjs'
import archDesign from './arch/design.mjs'

/**
 * 全部课程作者源。
 * 顺序不影响产物(构建时按 order 排序),但建议保持「Java → Go → AI」的阅读顺序。
 */
export const COURSES = [
  javaLangCollections,
  javaConcurrencyJvm,
  javaSpring,
  javaMysqlRedis,
  javaDistributedNetwork,
  javaDesignAlgorithm,
  goLanguage,
  goConcurrencyRuntime,
  goEngineeringSystem,
  aiFoundation,
  aiServingPrompt,
  aiRagAgent,
  aiProduction,
  archDesign,
]
