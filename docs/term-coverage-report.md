# 术语覆盖报告

> 生成时间:2026-10-27 14:18 · 由 `.term.mjs` 生成,数据变了可以重跑

对每道题,从「标题 + 答案」抽可检索符号(反引号内容与英文标识符),检查它是否出现在所属课时正文里。
命中率低于 50% 的题再按三种情况拆分:

| 分类 | 含义 | 处理方式 |
|---|---|---|
| 覆盖在别处 | 本课没写,同一门课的其他课时写了 | 不用改,属正常分工 |
| 只是换了说法 | 正文写成了中文,英文标识符没保留 | 补一个括号,如「原子性(Atomicity)」 |
| 真缺口 | 整门课都没出现 | 要补内容 |

**总览**:检查 1404 道题,**359 道**命中率低于 50%。符号层面 覆盖在别处 855 个 / 只是换说法 19 个 / 真缺口 1144 个;去重后真缺口术语 **1053 个**。

这个指标是下限:正文用中文复述、没保留英文名时会算成「缺口」。所以下面的表不是判决书,是待核对清单。

## 一、全局高频缺口

「题眼」= 这个词出现在题目标题里,也就是题目真正在问的东西,**优先补这些**;只出现在答案里的多半是顺带提到的通用词(`user_id`、`crud`、`store`),补它收益很低。

| 术语 | 题眼 | 影响题数 | 涉及课程数 | 课程 |
|---|---|---|---|---|
| `reasoning` | **是** | 2 | 2 | ai-foundation、ai-rag-agent |
| `top10` | **是** | 2 | 2 | go-engineering-system、java-mysql-redis |
| `ticker` | **是** | 2 | 1 | go-engineering-system |
| `hashmap` | **是** | 2 | 1 | go-engineering-system |
| `online` | **是** | 2 | 1 | java-mysql-redis |
| `initializingbean#` | **是** | 2 | 1 | java-spring |
| `user_id` | — | 4 | 2 | go-concurrency-runtime、java-design-algorithm |
| `grpc` | — | 3 | 3 | arch-design、go-concurrency-runtime、java-design-algorithm |
| `apm` | — | 3 | 2 | go-concurrency-runtime、java-mysql-redis |
| `crud` | — | 3 | 2 | java-mysql-redis、java-spring |
| `vlm` | — | 2 | 2 | ai-foundation、ai-rag-agent |
| `checksum` | — | 2 | 2 | ai-rag-agent、java-mysql-redis |
| `a/b` | — | 2 | 2 | ai-serving-prompt、arch-design |
| `sequential` | — | 2 | 2 | arch-design、go-concurrency-runtime |
| `deadline` | — | 2 | 2 | arch-design、go-concurrency-runtime |
| `kill` | — | 2 | 2 | arch-design、java-lang-collections |
| `etcd/zk` | — | 2 | 2 | arch-design、go-engineering-system |
| `n/2` | — | 2 | 2 | arch-design、java-lang-collections |
| `orderid` | — | 2 | 2 | arch-design、java-spring |
| `store` | — | 2 | 2 | arch-design、go-language |
| `join` | — | 2 | 2 | arch-design、go-concurrency-runtime |
| `ssd` | — | 2 | 2 | arch-design、java-design-algorithm |
| `list/zset` | — | 2 | 2 | arch-design、java-design-algorithm |
| `async` | — | 2 | 2 | go-concurrency-runtime、java-mysql-redis |
| `sql.errnorows` | — | 2 | 2 | go-concurrency-runtime、go-language |
| `offset` | — | 2 | 2 | go-concurrency-runtime、java-spring |
| `prestop` | — | 2 | 2 | go-engineering-system、java-spring |
| `sigterm` | — | 2 | 2 | go-engineering-system、java-spring |
| `switching` | — | 2 | 2 | go-engineering-system、java-distributed-network |
| `protocols` | — | 2 | 2 | go-engineering-system、java-distributed-network |
| `redis+lua` | — | 2 | 2 | go-engineering-system、java-mysql-redis |
| `topn` | — | 2 | 2 | go-engineering-system、java-mysql-redis |
| `sharded` | — | 2 | 2 | go-engineering-system、go-language |
| `slices.sort` | — | 2 | 2 | go-engineering-system、go-language |
| `lsm` | — | 2 | 2 | go-engineering-system、java-design-algorithm |
| `ifsqlnode` | — | 2 | 2 | java-design-algorithm、java-spring |
| `foreachsqlnode` | — | 2 | 2 | java-design-algorithm、java-spring |
| `redisson` | — | 2 | 2 | java-design-algorithm、java-distributed-network |
| `shedlock` | — | 2 | 2 | java-design-algorithm、java-spring |
| `tcc` | — | 2 | 2 | java-design-algorithm、java-mysql-redis |

## 二、按课程

每门课下面的表只列出现 ≥2 次的术语;只出现一次的长尾放在折叠区,不值得逐个补。

### 大模型基础与训练 (`ai-foundation`)

缺口术语 19 个(出现 ≥2 次的 0 个),涉及 3 个课时。

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`decoding`** 采样解码、上下文与模型形态

- `ai-01-Q13` 推理模型（Reasoning Model）是什么？和普通对话模型的区别？ — 缺 `reasoning` `rlvr` `aha` `moment`
- `ai-01-Q16` 什么是多模态大模型？视觉 token 是怎么进入 LLM 的？ — 缺 `llava` `vlm` `ocr`
- `ai-01-Q22` Agent、Workflow、LLM 应用三者怎么区分？ — 缺 `agent` `workflow`

**`pretrain-sft`** 预训练与 SFT：从压缩互联网到学会答话

- `ai-02-Q8` LoRA 应该挂在哪些层？rank 怎么定？ — 缺 `q/k/v/o` `gate/up/down` `alpha/r` `dora` `rslora`
- `ai-02-Q9` 微调导致灾难性遗忘怎么办？ — 缺 `trade`;换说法 `checkpoint`

**`alignment-eval`** 偏好对齐、训练工程与评测

- `ai-02-Q16` 梯度检查点（Gradient Checkpointing）是什么？什么代 — 缺 `gradient` `checkpointing` `lora/qlora`

</details>

### 生产化、安全与 AI 协作 (`ai-production`)

缺口术语 1 个(出现 ≥2 次的 0 个),涉及 0 个课时。

### RAG 与 Agent 工程 (`ai-rag-agent`)

缺口术语 17 个(出现 ≥2 次的 0 个),涉及 3 个课时。

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`rag-basics`** RAG 基础链路与切分策略

- `ai-05-Q3` 文档解析环节有哪些坑？为什么说「解析质量决定 RAG 上限」？ — 缺 `ppt/excel` `garbage` `pymupdf` `layoutlm/document` `vlm`
- `ai-05-Q7` 向量库（Milvus/Qdrant/pgvector/ES）怎么选？ — 缺 `milvus/qdrant/pgvector/es` `pgvector/es` `es/opensearch`

**`rag-eval`** RAG 评估与进阶优化

- `ai-05-Q18` 知识库更新怎么做？文档改了索引怎么同步？ — 缺 `cms` `webhook` `checksum`

**`agent-basics`** Agent 基础架构与工具设计

- `ai-06-Q2` ReAct 模式是什么？为什么它成为 Agent 的基础范式？ — 缺 `reasoning` `acting` `observation`

</details>

### 推理部署与 Prompt 工程 (`ai-serving-prompt`)

缺口术语 34 个(出现 ≥2 次的 2 个),涉及 4 个课时。

| 术语 | 次数 |
|---|---|
| `claude` | 2 |
| `badcase` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`serving`** 服务化与工程实践

- `ai-03-Q11` 场景题：LLM 推理服务延迟突然从 500ms 涨到 5s，怎么排查？ — 缺 `max_num_seqs` `preemption` `tokenizer` `metrics` `queue` `prefill/decode` `exporter` `tracing`
- `ai-03-Q12` Prompt Caching（前缀缓存）是什么？什么场景收益最大？ — 缺 `openai/anthropic` `cached` `input`
- `ai-03-Q18` 端侧部署（手机/PC）和大模型服务端的推理有什么本质不同？ — 缺 `llama.cpp` `mlc` `onnx` `runtime` `apple` `mlx`

**`prompt-security`** Prompt 注入与防护

- `ai-04-Q14` 怎么系统地做 Prompt 的版本管理与评测回归？ — 缺 `review` `judge` `a/b` `badcase`
- `ai-04-Q15` 不同模型的 Prompt 能直接复用吗？迁移时注意什么？ — 缺 `claude` `xml/markdown`

**`inference-frameworks`** 推理框架与加速

- `ai-03-Q5` vLLM 为什么快？除了 PagedAttention 还有什么关键机制 — 缺 `hbm` `graph` `sglang` `radixattention` `tensorrt` `nvidia` `llm.cdog`

**`context-engineering`** 上下文工程

- `ai-04-Q9` Agent 执行 100 步后上下文被塞爆，你会怎么设计上下文管理？ — 缺 `scratchpad` `claude` `compact`

</details>

### 架构设计方法 (`arch-design`)

缺口术语 100 个(出现 ≥2 次的 5 个),涉及 5 个课时。

| 术语 | 次数 |
|---|---|
| `fencing` | 2 |
| `del` | 2 |
| `setnx` | 2 |
| `vary` | 2 |
| `userid` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`arch-scenario`** 场景题:五步骨架与两道真题

- `arch-05-Q4` 设计一个 Feed 流（关注/推荐信息流） — 缺 `list/zset`;换说法 `push` `pull`
- `arch-05-Q5` 设计一个 IM 消息系统 — 缺 `userid` `lastseq`
- `arch-05-Q11` 设计一个消息推送系统（App Push / 短信 / 邮件） — 缺 `apns/fcm`;换说法 `push`
- `arch-05-Q12` 设计一个搜索系统 — 缺 `cdc/binlog` `elasticsearch` `bm25` `search_after` `goods_v1` `goods_v2`
- `arch-05-Q13` 设计一个对象存储 / 文件服务 — 缺 `fileid` `bucket`
- `arch-05-Q14` 设计一个配置中心 — 缺 `polling` `diff`;换说法 `push` `pull`
- `arch-05-Q15` 设计一个 API 网关 — 缺 `header` `oauth2` `appid` `grpc`
- `arch-05-Q17` 设计一个打车派单系统 — 缺 `geohash/redis` `driver` `tps`
- `arch-05-Q18` 设计点赞/计数系统（高并发写 + 精确读） — 缺 `cnt` `set/hyperloglog` `userid` `hyperloglog` `mget`

**`arch-consistency`** 一致性:从分布式事务到对账

- `arch-04-Q9` 分布式锁用 Redis 还是 ZooKeeper？各自的问题是什么？ — 缺 `zookeeper/etcd` `etcd/zk` `fencing`
- `arch-04-Q10` Redis 分布式锁有哪些坑？为什么「加锁 + 过期」还不够？ — 缺 `del` `setnx` `fencing`
- `arch-04-Q11` 分布式 ID 有哪些方案？雪花算法的时钟回拨怎么处理？ — 缺 `uuid` `ntp`
- `arch-04-Q12` Raft 解决了什么问题？为什么它比 Paxos 更容易落地？ — 缺 `raft` `paxos` `follower` `n/2`
- `arch-04-Q13` 主从复制怎么保证不丢数据？半同步是什么？ — 缺 `apply` `received` `paxos/raft`
- `arch-04-Q17` 消费端幂等怎么做？和接口幂等有什么不同？ — 缺 `message_id` `setnx` `msg_id`

**`arch-thinking`** 架构判断力:质量属性与取舍

- `arch-01-Q1` 什么是软件架构？架构设计到底在决定什么？ — 缺 `getuser` `fetchuser`
- `arch-01-Q4` 为什么说「业务代码不能依赖框架」？依赖倒置在架构层怎么落地？ — 缺 `dip` `orderrepository` `mapper` `transactional` `gorm.db` `orm`
- `arch-01-Q6` 微服务的边界怎么划？DDD 的限界上下文能解决什么？ — 缺 `controller/service/dao` `bounded` `context` `root`
- `arch-01-Q8` CAP 到底在说什么？为什么说「三选二」是误读？ — 缺 `eureka` `cassandra` `cp/ap` `basically` `available` `soft` `eventually` `consistent`
- `arch-01-Q9` 强一致、线性一致、最终一致，这些一致性模型有什么区别？ — 缺 `linearizability` `sequential` `causal` `eventual` `your` `writes`

**`arch-performance`** 性能:先测量,再优化

- `arch-03-Q3` 缓存应该分几层？各层的职责和失效策略有什么不同？ — 缺 `control` `etag` `vary` `app.v3.js`
- `arch-03-Q6` 大 key 和热 key 怎么发现、怎么处理？ — 缺 `hash/list` `del` `bigkeys` `latency` `unlink` `monitor`
- `arch-03-Q13` 序列化和传输层的优化点有哪些？ — 缺 `protobuf/thrift` `schema` `gzip/snappy`
- `arch-03-Q14` CDN 和静态化怎么用？动态内容能不能走 CDN？ — 缺 `js/css` `a/b` `vary` `store`

**`arch-resilience`** 撑住:可用性的工程化

- `arch-02-Q4` 主备、主从、双主、集群，这几种冗余方式怎么选？ — 缺 `active` `standby`
- `arch-02-Q9` 超时时间怎么定？为什么「不设超时」是最危险的默认值？ — 缺 `deadline` `propagation` `timeout`

</details>

### 并发模型与运行时 (`go-concurrency-runtime`)

缺口术语 121 个(出现 ≥2 次的 4 个),涉及 7 个课时。

| 术语 | 次数 |
|---|---|
| `stopm` | 2 |
| `lrq` | 2 |
| `ctx.done` | 2 |
| `unsafe.offsetof` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`sync-package`** sync 包与并发正确性

- `go-02-Q31` sync.Cond 什么时候用？ （补） — 缺 `wait/signal/broadcast` `locker`
- `go-index-Q50` context 使用中有哪些坑？ — 缺 `children` `withtimeout` `deadline` `r.context` `context.withoutcancel`
- `go-index-Q53` 协程可以自己主动让出 CPU 吗？能绑定到一个固定线程吗？ — 缺 `runtime.lockosthread` `unlockosthread` `opengl/cgo` `tls`
- `go-index-Q54` 单机最多能开多少 goroutine？瓶颈在哪？ — 缺 `setmaxthreads` `lrq`
- `go-index-Q55` 什么是 CSP？Go 的 channel 和 CSP 是什么关系？ — 缺 `csp` `communicating` `sequential` `processes` `hoare`
- `go-index-Q56` channel 在什么情况下会造成资源泄漏？ — 缺 `time.timer` `receive`

**`channel`** channel 原理与常见死锁

- `go-02-Q19` select 的行为和底层实现？ — 缺 `scase` `runtime.selectgo` `ctx.done`
- `go-index-Q33` goroutine 的栈是怎么管理的？栈扩容会带来什么问题？ — 缺 `contiguous` `stack` `exceeds`
- `go-index-Q34` goroutine 泄漏有哪些常见场景？线上怎么排查？ — 缺 `resp.body.close` `goleak` `ctx.done`
- `go-index-Q43` sync.Mutex 的实现原理是什么？正常模式和饥饿模式有什么区别？ — 缺 `woken` `starving` `waiter`
- `go-index-Q46` sync.Once 是怎么保证只执行一次的？有哪些坑？ — 缺 `atomic.loaduint32` `atomic.storeuint32` `sync.oncefunc` `oncevalue` `oncevalues`

**`go-perf`** pprof 与性能调优

- `go-03-Q54` 火焰图和 go tool trace 分别什么时候用？ （补） — 缺 `flame` `syscalls`
- `go-03-Q55` GODEBUG 常用开关？ （补） — 缺 `goal` `m/p` `scheddetail` `asyncpreemptoff` `http2debug` `http/2`
- `go-03-Q56` cgo 的代价是什么？ （补） — 缺 `pinned` `libc` `purego`
- `go-index-Q111` 怎么做压测？关注哪些指标？ — 缺 `wrk` `hey` `ghz` `grpc` `vegeta` `p50/p95/p99`
- `go-index-Q115` MySQL 慢查询你怎么定位和优化？ — 缺 `slow_query_log` `apm` `show` `processlist` `explain` `all/index/range/ref/const` `extra` `filesort` `temporary` `offset` `join`

**`go-stdlib`** 标准库与运行时要点

- `go-index-Q94` Go 1.13 之后的错误处理：Is、As、Wrap 分别是什么？ — 缺 `wrap` `fmt.errorf` `target` `sql.errnorows` `errors.as` `mysqlerror` `errors.join` `is/as`
- `go-index-Q98` Go 服务如何实现优雅退出？ — 缺 `signal.notifycontext` `syscall.sigint` `syscall.sigterm` `signal.notify` `srv.shutdown` `srv.setkeepalivesenabled` `db/mq`
- `go-index-Q101` log/slog 相比 zap/logrus 有什么优势？结构化日志该怎 — 缺 `log/slog` `zap/logrus` `jsonhandler` `texthandler` `zap` `logattrs` `trace_id` `user_id` `path` `info` `slog` `slog.attr`
- `go-index-Q102` unsafe.Pointer 有哪些合法用法？什么时候该用？ — 缺 `unsafe.pointer` `uintptr` `unsafe.offsetof` `reinterpret` `unsafe.string` `unsafe.slice` `unsafe.slicedata`

**`goroutine-scheduling`** GMP 调度模型

- `go-02-Q4` findRunnable：M 如何找到下一个 G？（查找顺序） — 缺 `schedtick` `runqsize/gomaxprocs+1` `stealwork` `stopm` `futex`
- `go-index-Q27` 一个 goroutine 从创建到被执行，中间经历了什么？ — 缺 `runtime.newproc` `pc/sp` `lrq` `grq` `stopm`
- `go-index-Q30` Go 的抢占式调度是怎么实现的？为什么 1.14 之前有问题？ — 缺 `morestack` `async` `preempt`

**`go-gc`** 三色标记与 GC 调优

- `go-index-Q57` Go 的内存分配器是怎么设计的？三级结构分别是什么？ — 缺 `tcmalloc` `arena`
- `go-index-Q60` 怎么查看逃逸分析的结果？怎么验证优化有效？ — 缺 `moved` `b/op` `objdump`

**`go-memory`** 内存分配与逃逸分析

- `go-03-Q48` 内存对齐是什么？为什么重要？ （补） — 缺 `sizeof` `unsafe.offsetof` `atomic.loadint64` `q56/q57`
- `go-index-Q73` 如何观察一次 GC 的具体行为？ — 缺 `gc/cycles/total` `sched/latencies`

</details>

### 网络、存储与分布式 (`go-engineering-system`)

缺口术语 210 个(出现 ≥2 次的 4 个),涉及 9 个课时。

| 术语 | 次数 |
|---|---|
| `ticker` | 2 |
| `consul` | 2 |
| `nacos` | 2 |
| `hashmap` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`go-network`** 网络编程精编

- `go-index-Q77` 讲一下 TCP 的拥塞控制算法。 — 缺 `ssthresh` `cubic` `bbr` `net.dialer` `tcp_nodelay`
- `go-index-Q78` 一台服务器最大能支撑多少个 TCP 连接？瓶颈在哪？ — 缺 `fs.file` `sbuf` `c1000k` `net.core.somaxconn` `tcp_max_syn_backlog` `reuseport`
- `go-index-Q80` 常见的 HTTP 状态码有哪些？301 和 302 的区别？ — 缺 `continue` `switching` `protocols` `modified` `etag/if` `match`
- `go-index-Q81` HTTPS 的握手过程是怎样的？证书是怎么验证的？ — 缺 `clienthello` `serverhello` `serverkeyexchange` `changecipherspec` `finished` `crl/ocsp` `rsa` `crypto/tls` `minversion` `tls.versiontls12` `insecureskipverify`
- `go-index-Q82` GET 和 POST 有什么区别？ — 缺 `post` `referer`
- `go-index-Q84` Protobuf 和 JSON 有什么区别？为什么 Protobuf 更 — 缺 `tlv` `encoding/json` `sonic/easyjson`
- `go-index-Q85` Go 的 netpoll 是怎么工作的？为什么少量线程就能撑住大量连接？ — 缺 `kqueue` `macos` `iocp` `windows` `gopark` `sysmon` `extract` `syscall`
- `go-index-Q88` 服务端还没处理完请求，客户端就关闭了连接，会发生什么？ — 缺 `peer` `net.errclosed` `syscall.epipe` `cpu/db`
- `go-index-Q89` Go 的 http.Client 有哪些必须设置的超时？连接池怎么配？ — 缺 `http.client.timeout` `dialcontext`

**`go-system-design`** 系统设计场景题

- `go-index-Q159` 如何实现一个排行榜？ — 缺 `zincrby` `topn` `zunionstore` `mysql/clickhouse`
- `go-index-Q163` 分布式 ID 有哪些生成方案？雪花算法的原理和问题？ — 缺 `tinyid` `workerid` `uidgenerator`
- `go-index-Q164` 把「评论 id / 父评论 id / 内容」的平铺数据组织成树形结构输出 — 缺 `parentid` `bfs` `level`
- `go-index-Q165` 用 channel 实现一个限流器（也可以不用 channel）。 — 缺 `ticker` `default` `time.ticker` `tick` `burst` `allow` `setlimit`
- `go-index-Q166` 设计一个并发安全的 HashMap，要求扩容时不阻塞读。 — 缺 `hashmap` `sharded` `sync.rwmutex` `atomic.pointer` `sharddata` `cow` `dirty`
- `go-index-Q168` 设计一个 API 网关，需要考虑什么？ — 缺 `jwt/oauth` `httputil.reverseproxy` `upstream` `sse/grpc` `listener` `so_reuseport`
- `go-index-Q169` 算法题：多个会议时间段，求最少需要多少间会议室？ — 缺 `leetcode` `sort.slice` `slices.sort`
- `go-05-Q31` 海量日志/评论系统；100G 文件 500M 内存求 Top10（字节二 — 缺 `top10` `lsm` `hashmap`
- `go-05-Q32` 高并发下接口突然变慢，怎么排查？（综合场景题） — 缺 `qps/rt` `cpu/heap/goroutine` `profile` `cpu/io` `maxopenconns`

**`go-modules-index`** 工程化与存储中间件精编

- `go-index-Q142` 如何在 Go 里做 mock？接口应该定义在哪一方？ — 缺 `mockgen` `testify/mock` `moq` `sqlite`
- `go-index-Q143` 集成测试和环境依赖怎么处理？ — 缺 `testcontainers` `mysql/redis/kafka` `integration` `httptest.server`
- `go-index-Q144` 测试覆盖率有意义吗？多少合适？ — 缺 `coverprofile` `tool`
- `go-index-Q145` Go 项目应该配哪些静态检查？ — 缺 `linter` `errcheck` `govet` `ineffassign` `gosec` `revive` `bodyclose` `sqlclosecheck` `goimports` `golangci.yml`
- `go-index-Q147` 团队协作中 Git 工作流该怎么选？ — 缺 `trunk` `based` `feature` `develop/release/hotfix` `rebase` `revert` `fetch`
- `go-index-Q157` K8s 的探针有哪几种？Go 服务该怎么配？ — 缺 `livenessprobe` `readinessprobe` `startupprobe` `liveness` `readyz` `http.get` `probe` `prestop` `endpoints` `sigterm` `readiness`

**`go-engineering`** go mod、测试与部署

- `go-04-Q3` 私有仓库怎么配？ — 缺 `corp.example.com` `gonosumcheck` `config` `global` `insteadof` `goproxy` `athens/artifactory`
- `go-04-Q12` 连接池参数有哪些？怎么设置？ — 缺 `setmaxopenconns` `setmaxidleconns` `setconnmaxlifetime` `wait_timeout` `setconnmaxidletime` `maxopen` `db.conn` `freeconn` `connrequest`
- `go-04-Q15` JSON 处理的常见陷阱？ — 缺 `uint64/int64` `float64` `decoder.usenumber` `omitempty` `json.marshal` `encoder.setescapehtml` `time.time` `rfc3339` `marshaler/unmarshaler` `slice` `easyjson/codegen` `sonic` `jsoniter`
- `go-04-Q16` Timer/Ticker 有什么坑？time.After 在循环里的问题 — 缺 `timer/ticker` `time.newticker` `t.stop` `ticker` `newtimer` `t.reset` `time.parse` `time.parseinlocation`
- `go-04-Q17` 交叉编译与版本注入怎么做？ — 缺 `scratch/distroless` `trimpath` `gcflags` `gocache` `binary`

**`go-distributed-b`** 微服务治理与可靠性

- `go-index-Q131` 如何解决消息重复消费和顺序性问题？ — 缺 `messagequeueselector` `messagelistenerorderly`
- `go-index-Q133` 缓存穿透、击穿、雪崩分别是什么？怎么解决？ — 缺 `singleflight.group` `zero/kratos`
- `go-index-Q139` 灰度发布、蓝绿部署、金丝雀发布有什么区别？ — 缺 `pod` `virtualservice` `nacos`
- `go-index-Q140` 服务网格（Service Mesh）解决了什么问题？Go 在其中扮演什么 — 缺 `consul` `sidecarless` `ambient` `ztunnel` `waypoint` `kubelet` `manager` `prometheus`

**`go-net-backend`** 网络与消息队列实践

- `go-05-Q15` 三次握手/四次挥手？为什么握手三次挥手四次？ — 缺 `syn+ack` `rfc` `syn_rcvd` `established` `fin_wait_1/2`
- `go-05-Q11` Kafka 为什么快？ — 缺 `only` `gzip/lz4/zstd`

**`go-distributed-a`** 分布式基础与一致性

- `go-index-Q126` 超时应该怎么设？为什么会出现重试风暴？ — 缺 `random` `budget`
- `go-index-Q127` 服务注册与发现的原理是什么？ — 缺 `consul` `nacos` `ap/cp` `grpc/kratos` `kube` `eureka/nacos`

**`go-microservice`** 微服务拆分与通信

- `go-05-Q23` 分布式锁的几种实现与对比？ — 缺 `lease+watch` `etcd/zk`
- `go-05-Q24` 限流算法？熔断/降级？ — 缺 `redis+lua` `envoy/istio` `zero` `breakpoint/sentinel` `golang/hystrix`

**`go-storage`** MySQL 与 Redis 接入

- `go-05-Q1` 为什么 MySQL 用 B+ 树而不是 B 树/红黑树/hash？ — 缺 `avl` `mongodb`

</details>

### Go 语言精要 (`go-language`)

缺口术语 25 个(出现 ≥2 次的 0 个),涉及 4 个课时。

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`go-index-basics`** 语法与类型精编 24 题

- `go-index-Q3` slice 共享底层数组会带来哪些坑？ — 缺 `slices.clone` `high` `max`
- `go-index-Q5` map 并发写为什么会 panic？如何检测和规避？ — 缺 `hmap.flags` `race` `sharded`
- `go-index-Q6` sync.Map 的适用场景是什么？为什么官方说大多数情况不该用它？ — 缺 `atomic` `misses` `store`
- `go-index-Q7` map 的遍历为什么是无序的？如何有序遍历？ — 缺 `sort.strings` `slices.sort`
- `go-index-Q13` 值接收者和指针接收者的方法集有什么区别？ — 缺 `v.ptrmethod` `ptrmethod`
- `go-index-Q21` init 函数的执行顺序是怎样的？ — 缺 `github.com/go` `driver/mysql`

**`go-value-semantics`** 值传递、数组与切片

- `go-01-Q9` copy 与深浅拷贝？ — 缺 `dst` `src`

**`go-map-string`** map、string 与内存布局

- `go-01-Q18` map 的 key 有什么限制？slice 为什么不能作 key？ — 缺 `function` `assignment` `entry`

**`go-init-generics`** 初始化、泛型与错误处理

- `go-01-Q54` sentinel error（哨兵错误）的用法与缺点？ — 缺 `io.eof` `sql.errnorows`;换说法 `sentinel`

</details>

### 并发编程与 JVM (`java-concurrency-jvm`)

缺口术语 10 个(出现 ≥2 次的 0 个),涉及 3 个课时。

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`juc-tools`** JUC 工具类与并发容器

- `java-03-Q63` ArrayBlockingQueue 和 LinkedBlockingQ — 缺 `putlock/takelock` `fixed/single`

**`completable-future`** CompletableFuture 编排

- `java-03-Q71` CompletableFuture 和 Future 的区别？ — 缺 `supplyasync/thenapply/` `thencompose/thencombine/` `thenaccept/allof/anyof/` `thenxxxasync` `executionexception/`

**`jvm-memory`** 运行时数据区

- `java-04-Q4` JDK 8 / 11 / 17 / 21 这些 LTS 版本在 JVM  — 缺 `jigsaw` `epsilon` `macos/windows`

</details>

### 系统设计与手撕算法 (`java-design-algorithm`)

缺口术语 136 个(出现 ≥2 次的 2 个),涉及 10 个课时。

| 术语 | 次数 |
|---|---|
| `user_id` | 3 |
| `redis/db` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`high-concurrency`** 高并发场景设计

- `java-10-Q25` 场景题"设计一个 XX 系统"的答题框架是什么？ — 缺 `rt/qps` `rest/rpc` `mysql/redis/es/hbase`
- `java-10-Q26` 如何估算 QPS 和存储容量？举个具体例子 — 缺 `dau` `user_id`
- `java-10-Q27` 如何设计一个秒杀系统？（二面三面必考，务必完整） — 缺 `uid/ip` `seckill` `argv` `redis.call` `sismember` `then` `tonumber` `sadd` `rocketmq/kafka` `goods_id` `redis/db`
- `java-10-Q29` 设计一个微信拼手气红包系统（金额怎么拆？并发怎么处理？） — 缺 `remainmoney` `remaincount` `nextdouble` `lpush` `lpop`
- `java-10-Q31` 如何设计一个点赞/收藏系统？如何去重和计数？ — 缺 `setbit` `user_id` `target_id` `incr/decr` `like_count`
- `java-10-Q33` 如何设计微博/朋友圈 Feed 流？推模式、拉模式怎么选？ — 缺 `timeline` `list/zset`
- `java-10-Q35` 分布式环境下定时任务重复执行怎么办？ — 缺 `redisson` `zookeeper` `shedlock` `db/redis` `quartz` `qrtz_locks` `shardindex/shardtotal`
- `java-10-Q37` 敏感词过滤怎么实现？（DFA 算法） — 缺 `u200b` `buildtrie` `wordlist` `text.length` `string.valueof` `text.charat` `node.containskey` `houbb/sensitive`
- `java-10-Q38` 如何设计一个分布式 RPC 框架？（开放设计题） — 缺 `invokerequest` `dubbo` `hessian/kryo` `protobuf` `grpc` `reactor` `zookeeper/nacos/redis`
- `java-10-Q39` 如何设计一个消息队列（MQ）？如何设计一个数据库连接池？（开放题套路） — 缺 `kafka/rocketmq` `commitlog` `broker` `validationquery` `hikaricp` `concurrentbag`
- `java-10-Q40` 设计一个扫码登录功能，说说完整流程？ — 缺 `websocket/sse` `token/jwt`
- `java-10-Q41` 如何设计一个大文件上传（分片上传、断点续传、秒传）？ — 缺 `upload/chunk` `upload/merge` `multipart` `upload` `upload/status` `redis/db` `oss/s3`

**`design-basics`** 设计原则与创建型模式

- `java-10-Q1` 谈谈你对 SOLID 七大原则的理解，各举一个例子 — 缺 `square` `setwidth` `workable` `eatable`
- `java-10-Q7` 什么是建造者模式？它和 Lombok 的 @Builder 有什么区别？ — 缺 `computer.builder` `disk` `ssd` `stream.builder` `serverbootstrap`
- `java-10-Q8` 什么是原型模式？浅拷贝和深拷贝的区别怎么处理？ — 缺 `apache` `serializationutils.clone` `beanutils.copyproperties` `mapstruct` `arraylist.clone`

**`array-two-pointer`** 数组与双指针

- `java-11-Q43` 两数之和（考频：🔥🔥🔥 热题100统计 52 次） — 缺 `twosum` `seen` `seen.containskey` `seen.get` `seen.put`
- `java-11-Q46` 接雨水（考频：🔥🔥🔥 字节 38 次） — 缺 `lmax/rmax` `lmax` `rmax`
- `java-11-Q51` 无重复字符的最长子串（考频：🔥🔥🔥 字节面经统计第 1 名 174 — 缺 `hot100` `g.length`

**`troubleshooting`** 线上问题排查

- `java-10-Q51` 消息队列消息大量积压（百万级），怎么处理？ — 缺 `reset` `db/hdfs`
- `java-10-Q52` 如何设计一个高可用、高并发的系统？（总纲题，收尾必问） — 缺 `aside` `binlog` `user_id` `tcc`

**`handwrite-top`** 手撕 TOP 20

- `java-11-Q16` 最大子数组和（考频：🔥🔥🔥 字节 30 次，热题100统计 117 — 缺 `kadane` `cur+x`
- `java-11-Q19` 手写生产者消费者 / 交替打印 ABC（考频：🔥🔥🔥 各大厂 Ja — 缺 `lock+condition` `q87/q88`

**`binary-search-sort`** 二分与排序

- `java-11-Q52` 手写快速排序（考频：🔥🔥🔥 美团/快手/传统大厂必考，seven9 — 缺 `seven97` `math.random` `dualpivotquicksort`
- `java-11-Q55` 数组中第 K 个最大元素：快速选择 vs 小顶堆（考频：🔥🔥🔥 字 — 缺 `findkthlargest` `findkthlargest2` `bfprt`

**`scenario-algo`** 海量数据与 Java 特选手撕

- `java-11-Q82` 海量日志/搜索串统计频次 TopK（哈希分治经典，考频：🔥🔥） — 缺 `keyword` `flink`
- `java-11-Q84` 布隆过滤器：原理与误判率（考频：🔥🔥🔥，常与缓存穿透一起问） — 缺 `ln2` `hbase/leveldb` `lsm` `bloomfilter` `redisbloom`

**`structural-patterns`** 结构型模式

- `java-10-Q13` 组合模式是什么？什么场景下会用到？ — 缺 `gui` `swing` `container/component` `mixedsqlnode` `ifsqlnode` `foreachsqlnode`

**`big-data`** 海量数据处理

- `java-10-Q45` 如何统计一个网站/文章的日活 UV（独立访客数）？ — 缺 `hashset/set` `spark/hive` `user1` `user2` `user3` `month` `pv/uv/vv/ip`

**`linked-list`** 链表专题

- `java-11-Q24` 合并 K 个升序链表（考频：🔥🔥🔥） — 缺 `mergeklists` `lists` `integer.compare` `x.val` `y.val` `pq.isempty` `min.next`

</details>

### 分布式、消息队列与网络 (`java-distributed-network`)

缺口术语 36 个(出现 ≥2 次的 1 个),涉及 8 个课时。

| 术语 | 次数 |
|---|---|
| `fence` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`distributed-misc`** 分布式高频补充

- `java-08-Q86` 一致性哈希的原理？为什么需要虚拟节点？ — 缺 `memcached` `dht`
- `java-08-Q88` 【总结】幂等设计有哪些通用手段？（不只 MQ） — 缺 `requestid` `version+1`
- `java-08-Q89` 【大厂真题】分布式一套连环追问（真实面试节奏） — 缺 `tcc/seata` `fence`

**`kafka`** Kafka 存储、分区与消费组

- `java-08-Q13` 消费者组与分区分配策略（Rebalance 的范围）？ — 缺 `partition.assignment.` `strategy` `rangeassignor` `roundrobinassignor` `stickyassignor` `cooperativestickyassignor`

**`rocketmq`** RocketMQ 的架构与事务消息

- `java-08-Q24` RocketMQ 的延迟消息如何实现？ — 缺 `msg.setdelaytimelevel` `topic/queueid` `setdelivertimems` `timerwheel` `timerlog`

**`mq-common`** RabbitMQ 与 MQ 通用难题

- `java-08-Q35` 【通用总结】如何保证消息不被重复消费？（幂等设计在 MQ 的落地） — 缺 `messageid` `businesskey`

**`distributed-tx`** 分布式事务方案全景

- `java-08-Q48` TCC 的空回滚、悬挂、幂等是什么？如何解决？（高频追问） — 缺 `fence` `tried/committed/` `rollbacked` `tcc_fence_log` `twophasebusinessaction` `usetccfence`

**`governance`** 限流、熔断与降级

- `java-08-Q67` 如何实现分布式限流？（Redis + Lua） — 缺 `incr+expire` `redisson` `rratelimiter` `nginx/sentinel`

**`rpc`** RPC 与微服务通信

- `java-08-Q71` 微服务的拆分原则？ — 缺 `database` `api/mq`

**`http-https`** HTTP、HTTPS 与 DNS

- `java-09-Q30` HTTP 常见的状态码有哪些？301 和 302 的区别？502 和 5 — 缺 `switching` `protocols` `internal` `oom/panic`

</details>

### Java 语言与集合框架 (`java-lang-collections`)

缺口术语 55 个(出现 ≥2 次的 1 个),涉及 8 个课时。

| 术语 | 次数 |
|---|---|
| `add/remove` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`lang-jvm`** JVM、字节码与编译执行

- `java-01-Q1` JVM、JDK、JRE 有什么区别？ — 缺 `zing` `jconsole` `javap` `jlink`
- `java-01-Q2` Java 语言有哪些特点？ — 缺 `anywhere` `free/delete` `rust` `c++11`
- `java-01-Q6` Oracle JDK 和 OpenJDK 有什么区别？什么是 LTS？ — 缺 `oracle` `gplv2` `classpath` `nftc/otn` `amazon` `corretto` `alibaba` `dragonwell`
- `java-01-Q8` 什么是 native 方法？ — 缺 `object.hashcode` `thread.start0`

**`string-pool`** String 不可变与常量池

- `java-01-Q25` intern() 方法有什么作用？ — 缺 `s1.intern` `s3.intern`
- `java-01-Q30` String 有哪些常用方法？ — 缺 `charat` `equalsignorecase` `trim` `strip` `isblank`

**`collection-overview`** 集合体系与 List 实现

- `java-02-Q2` List、Set、Map 是否继承自 Collection？为什么 Ma — 缺 `put/get/keyset/values` `add/remove` `map.entryset`
- `java-02-Q11` ArrayList 插入和删除元素的时间复杂度？LinkedList 呢 — 缺 `add/remove` `addfirst/addlast/` `removefirst/removelast` `n/2`

**`hashmap`** HashMap 全链路：put、扩容与红黑树

- `java-02-Q26` HashMap 的 get 过程是怎样的？调用 get 一定安全吗？ — 缺 `put/resize` `happens`
- `java-02-Q27` HashMap 有哪些遍历方式？哪种效率最高？keySet/values — 缺 `keyset/values/entryset` `biconsumer` `view` `abstractset` `remove/put`

**`lang-types`** 基本类型、包装类与自动装箱

- `java-01-Q19` 静态变量有什么作用？ — 缺 `classname.field` `math.pi`

**`oop-model`** 继承、多态与初始化顺序

- `java-01-Q42` 内部类有哪几种？静态内部类和非静态内部类的区别？ — 缺 `outer.new` `inner` `runnable/comparator`

**`exceptions`** 异常体系与 try-with-resources

- `java-01-Q53` finally 中的代码一定会执行吗？ — 缺 `try/catch` `runtime.halt` `kill`

**`io-serial`** IO 模型与序列化

- `java-01-Q71` 为什么有了字节流还要有字符流？ — 缺 `inputstream/outputstream` `reader/writer`

</details>

### MySQL 与 Redis (`java-mysql-redis`)

缺口术语 146 个(出现 ≥2 次的 18 个),涉及 14 个课时。

| 术语 | 次数 |
|---|---|
| `dml` | 2 |
| `distinct` | 2 |
| `between` | 2 |
| `nested` | 2 |
| `loop` | 2 |
| `ignore` | 2 |
| `crud` | 2 |
| `is/ix` | 2 |
| `algorithm` | 2 |
| `inplace` | 2 |
| `apm` | 2 |
| `das` | 2 |
| `lock_key` | 2 |
| `seata` | 2 |
| `online` | 2 |
| `geo` | 2 |
| `listpack/ziplist` | 2 |
| `delayedqueue` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`mysql-misc`** 分库分表与亿级大表治理

- `java-06-Q77` 什么时候需要分库分表？垂直拆分和水平拆分分别怎么做？ — 缺 `user/order/product` `order_0..order_n`
- `java-06-Q79` 分库分表后会带来哪些问题？ — 缺 `tcc` `seata` `at/saga`
- `java-06-Q82` 分库分表后全局唯一 ID 怎么生成？ — 缺 `max+1` `max+step` `leaf`
- `java-06-Q83` 亿级大表还有什么优化手段？ — 缺 `apm` `das` `tidb`
- `java-06-Q84` MySQL 单表两千万真的要分表吗？"2000 万"怎么来的？ — 换说法 `i/o`
- `java-06-Q85` 千万级/亿级大表怎么加字段（或加索引）？Online DDL、gh-os — 缺 `online` `algorithm` `inplace` `dml` `insert/update/delete`
- `java-06-Q89` 大厂真题连环追问示例一：索引连环 — 缺 `q18/q22` `online`
- `java-06-Q90` 大厂真题连环追问示例二：事务/锁/日志连环 — 缺 `q40/q47` `q45/q46` `q65/q68`

**`mysql-btree`** 索引：B+ 树与回表

- `java-06-Q13` 为什么 MySQL（InnoDB）用 B+树，而不是 B树、红黑树、二叉 — 缺 `between` `log_d`;换说法 `i/o`
- `java-06-Q17` 主键用自增 ID 还是 UUID？为什么自增更快？ — 缺 `uuidv4` `uuid_to_bin` `uuidv1` `insert...select`
- `java-06-Q18` 索引失效有哪些场景？【必考】 — 缺 `idx_a` `id+1` `cast`
- `java-06-Q22` EXPLAIN 的关键字段有哪些？type 和 Extra 怎么看？ — 缺 `eq_ref` `const` `nested` `loop` `ignore` `dive`
- `java-06-Q23` 一页 16KB 怎么算出 B+树能存多少数据？叶子节点链表是单向还是双向 — 缺 `directory`;换说法 `i/o`
- `java-06-Q24` 插入一条数据，索引会有哪些变化？页分裂是怎么回事？ — 换说法 `i/o`
- `java-06-Q26` 怎么决定建立哪些索引？索引优化方法总结？ — 缺 `where/join/order` `by/group` `sys.schema_unused_indexes`

**`mysql-optimize`** SQL 优化：从排查到改写

- `java-06-Q28` 慢查询日志怎么用？ — 缺 `top10` `p95` `apm` `das`
- `java-06-Q29` count(*)、count(1)、count(主键)、count(字段 — 换说法 `i/o`
- `java-06-Q30` 深分页（limit 大偏移）为什么慢？怎么优化？【必考】 — 缺 `xxx` `t1.id` `t2.id` `last_id`
- `java-06-Q31` MySQL 的 JOIN 是怎么实现的？为什么说小表驱动大表？8.0 的 — 缺 `inlj` `bnlj` `join_buffer` `nested` `loop` `straight_join`;换说法 `i/o`
- `java-06-Q32` ORDER BY 怎么利用索引避免 filesort？ — 缺 `sort_buffer` `rowid` `asc`
- `java-06-Q35` 用 MySQL 怎么避免重复插入数据？ — 缺 `duplicate` `ignore` `replace` `into`
- `java-06-Q36` 如何用 MySQL 实现一个可重入锁 / 扣减库存避免超卖？ — 缺 `lock_key` `count+1` `redis/redisson`

**`redis-basics`** Redis：为什么单线程还这么快

- `java-07-Q1` 什么是 Redis？为什么用它做 MySQL 的缓存？ — 缺 `nosql` `string/hash/list/set/zset` `sentinel/cluster`
- `java-07-Q5` Redis 的线程模型/网络模型是怎样的？IO 多路复用是怎么实现的？ — 缺 `handler` `aecreatefileevent` `select/epoll/kqueue` `aemain`;换说法 `i/o`
- `java-07-Q6` Redis 和 Memcached 的区别？ — 缺 `bitmap/hyperloglog/geo/` `worker` `slab`
- `java-07-Q7` Redis 常用数据类型及使用场景？ — 缺 `set/get/incr/setnx` `hset/hget/hincrby` `lpush+rpop` `lpush/rpush/lrange` `spop/srandmember` `sadd/sinter/sdiff` `zadd/zincrby/zrevrange` `geo` `geohash`
- `java-07-Q8` 缓存一个对象用 String 还是 Hash？购物车怎么存？ — 缺 `hset/hget` `listpack/ziplist` `javaguide` `hdel`
- `java-07-Q9` Redis 除了缓存还能做什么？（应用场景清单） — 缺 `redis+lua` `rratelimiter` `lpush+brpop` `delayedqueue` `topn` `uv/pv` `pfadd/pfcount` `geo` `geoadd/geosearch`
- `java-07-Q11` 单节点 Redis 能扛多大并发？Redis 支持并发操作吗？ — 缺 `get/set` `lru/lfu`

**`mysql-log`** 三种日志与两阶段提交

- `java-06-Q61` update 语句的完整执行流程？【高频之王】 — 缺 `t_user` `logging`;换说法 `i/o`
- `java-06-Q66` binlog 有哪三种格式？各有什么优缺点？ — 缺 `full/minimal` `row/mixed`
- `java-06-Q67` redo log 写满了怎么办？checkpoint 是什么？ — 缺 `ib_logfile0/1` `innodb_io_capacity`

**`redis-struct`** 底层结构：编码、跳表与紧凑编码

- `java-07-Q14` String 为什么不用 C 字符串？SDS 相比 C 字符串的优势？ — 缺 `flags` `sdshdr5/8/16/32/64`
- `java-07-Q18` ZSet 为什么用跳表而不用红黑树/B+树？MySQL 为什么不用跳表？ — 缺 `zrange/zrangebyscore` `logn+m`
- `java-07-Q22` List 的底层 quicklist 是什么？ — 缺 `listpack/ziplist` `quicklistnode`

**`mysql-engine`** MySQL 架构与存储引擎

- `java-06-Q6` 为什么不推荐 NULL？NULL 和 '' 的区别？ — 缺 `sum/count` `distinct`
- `java-06-Q9` 什么是 Buffer Pool？有什么作用？ — 缺 `young` `innodb_old_blocks_time`;换说法 `i/o`

**`mysql-lock`** 锁：从行锁到元数据锁

- `java-06-Q52` MySQL 有哪些锁？总体分类【必考】 — 缺 `single` `crud` `is/ix`
- `java-06-Q58` 为什么执行 ALTER TABLE 会把后续查询堵住？（MDL 锁） — 缺 `crud` `algorithm` `inplace` `none` `ost/pt`

**`mysql-ha`** 主从复制：延迟从哪来

- `java-06-Q72` 异步复制、半同步复制、组复制的区别？ — 缺 `mgr` `mha` `orchestrator`
- `java-06-Q74` 读写分离是什么？怎么实现？ — 缺 `shardingsphere` `router` `proxysql` `mha/orchestrator`

**`mysql-transaction`** 事务：ACID 的四笔代价

- `java-06-Q37` 事务的 ACID 特性分别是什么？分别靠什么实现？【必考】 — 缺 `crash` `safe` `rr/rc` `a/i/d` `ddia`;换说法 `atomicity` `durability` `isolation`

**`cache-problems`** 穿透、击穿、雪崩与一致性

- `java-07-Q50` Redis 与 MySQL 的双写一致性能保证强一致吗？ — 缺 `mq/canal` `seata`

**`redis-eviction`** 过期删除与内存淘汰

- `java-07-Q51` Redis 的过期删除策略是什么？为什么不用定时删除？ — 缺 `servercron/hz` `expires`

**`redis-ops`** 性能、大 key 与运维

- `java-07-Q72` Redis 怎么实现延迟队列？ — 缺 `delay_queue` `notification` `delayedqueue` `getdelayedqueue` `offer/get` `rblockingqueue`

**`redis-misc`** Redis 延伸问题

- `java-07-Q80` 大厂真题：连环追问实例（字节/美团风格） — 缺 `canal/mq` `bigkey/swap/fork`

</details>

### Spring 全家桶 (`java-spring`)

缺口术语 185 个(出现 ≥2 次的 11 个),涉及 9 个课时。

| 术语 | 次数 |
|---|---|
| `postprocessproperties` | 2 |
| `environmentaware` | 2 |
| `initializingbean#` | 2 |
| `disposablebean#destroy` | 2 |
| `transactiontemplate.` | 2 |
| `after_commit` | 2 |
| `restcontrolleradvice` | 2 |
| `enableautoconfiguration` | 2 |
| `opensession` | 2 |
| `intercepts` | 2 |
| `eventlistener` | 2 |

<details><summary>课时明细(缺 2 个以上符号的题)</summary>

**`mybatis`** MyBatis：从一条 SQL 到结果集

- `java-05-Q76` #{} 和 ${} 的区别？怎么防 SQL 注入？ — 缺 `parameterhandler/` `typehandler` `preparedstatement.set` `orderfield` `concat`
- `java-05-Q79` MyBatis 的一级缓存是什么？为什么和 Spring 集成后"感觉失 — 缺 `perpetualcache` `baseexecutor` `localcache` `insert/update/delete` `clearcache` `commit/rollback/close`
- `java-05-Q80` 二级缓存是什么？为什么生产要谨慎使用？ — 缺 `cacheenabled` `cachingexecutor` `pojo` `redis/caffeine`
- `java-05-Q81` 延迟加载是什么？原理是什么？ — 缺 `association/collection` `lazyloadingenabled` `association` `fetchtype` `javassist` `proxyfactory` `aggressivelazyloading` `lazyloadtriggermethods`
- `java-05-Q82` 动态 SQL 有哪些标签？底层原理是什么？ — 缺 `otherwise` `switch` `trim` `where/set` `include` `sqlnode` `ifsqlnode` `foreachsqlnode` `dynamicsqlsource`
- `java-05-Q83` 批量插入有哪几种方式？有什么注意点？ — 缺 `into` `max_allowed_packet` `usegeneratedkeys` `flushstatements` `sqlsessionfactory.` `opensession` `flush` `id/uuid` `selectkey`
- `java-05-Q84` PageHelper 分页插件的原理？逻辑分页和物理分页的区别？ — 缺 `intercepts` `pagehelper.startpage` `pagenum` `pagesize` `offset` `pageinfo` `limit/rownum`
- `java-05-Q85` MyBatis 插件（Interceptor）的原理？ — 缺 `plugin` `intercepts` `interceptorchain.` `pluginall` `type/method/args`
- `java-05-Q86` MyBatis-Plus 和 MyBatis 是什么关系？提供了哪些能力 — 缺 `mapper/xml` `crud` `basemapper` `insert/selectbyid/` `updatebyid/deletebyid` `querywrapper/` `lambdaquerywrapper` `wrapper.eq` `mapper/service` `create_time` `tablelogic` `iservice/serviceimpl`
- `java-05-Q88` 为什么 Mapper 调用成功了，数据却没有提交？（MyBatis 与  — 缺 `factory.opensession` `sqlsession.commit` `opensession` `propagation_not_supported`

**`ioc-bean`** IoC、依赖注入与 Bean 生命周期

- `java-05-Q10` 说一下 Spring Bean 的生命周期（完整流程） — 缺 `postprocessproperties` `beanclassloaderaware` `environmentaware` `beanpostprocessor#` `initializingbean#` `hook` `disposablebean#destroy`
- `java-05-Q11` Bean 有哪些作用域？ — 缺 `servletcontext` `configurablebeanfactory.` `scope_prototype` `lookup` `scopedproxymode.`
- `java-05-Q12` 单例 Bean 是线程安全的吗？ — 缺 `juc` `prototype/request`
- `java-05-Q15` @Autowired 的实现原理是什么？ — 缺 `injectionmetadata` `postprocessproperties`
- `java-05-Q16` @PostConstruct、InitializingBean#afte — 缺 `initializingbean#` `disposablebean#destroy` `jsr` `cachewarmup` `system.out.println`
- `java-05-Q21` @Value 和 @ConfigurationProperties 有什 — 缺 `my.name` `jsr303` `myname` `my_name`

**`spring-boot`** Spring Boot：自动装配与启动流程

- `java-05-Q56` @SpringBootApplication 由哪些注解组成？各自的作用 — 缺 `springbootconfiguration` `enableautoconfiguration` `autoconfigurationpackage`
- `java-05-Q60` Spring Boot 的启动流程（SpringApplication. — 缺 `servlet/reactive` `initializer` `preparecontext` `onrefresh/finishrefresh` `applicationrunner` `commandlinerunner` `runner`
- `java-05-Q61` 内嵌 Tomcat 是怎么启动的？和外置 Tomcat 有什么区别？ — 缺 `createwebserver` `connector` `http/1.1` `startwebserver` `webserver` `servlet/filter` `tomcatstarter` `spi`
- `java-05-Q65` 如何排除某个自动配置？如何优雅停机？ — 缺 `exclude` `spring.autoconfigure.` `com.xx.autoconfig` `conditionevaluationreport` `server.shutdown` `graceful` `sigterm` `prestop`

**`spring-misc`** 扩展点、事件与异步定时任务

- `java-05-Q89` Spring 的事件机制是怎样的？ — 缺 `eventlistener` `publisher.publishevent` `orderid` `phase` `after_commit` `contextclosedevent`
- `java-05-Q91` Spring 定时任务怎么做？有什么局限？ — 缺 `fixedrate` `fixeddelay` `threadpooltaskscheduler` `spring.task.scheduling.` `pool.size` `shedlock` `cronjob`
- `java-05-Q93` Spring 常见"连环追问"答题链路（面试前过一遍） — 缺 `enableautoconfiguration` `importselector` `handlermapping/` `restcontrolleradvice`
- `java-05-Q94` Spring 有哪些值得提的扩展点？（收尾开放题） — 缺 `initializingbean/` `disposablebean` `eventlistener` `environmentpostprocessor` `feign/mapper`

**`spring-overview`** Spring 总览：三个问题串起整个框架

- `java-05-Q1` 简单介绍一下 Spring / Spring 家族？有哪些核心模块？ — 缺 `aspects` `mybatis/hibernate` `oxm` `jms` `junit`
- `java-05-Q7` 怎么理解 Bean？Spring 容器和 Web 容器有什么区别？ — 缺 `tomcat/jetty` `contextloaderlistener/`
- `java-05-Q9` Spring Boot 和 Spring 的区别与关系？SpringMV — 缺 `ioc/aop` `tomcat/jetty/undertow`

**`transactions`** 声明式事务：传播、隔离与失效

- `java-05-Q41` 自调用导致事务失效，怎么解决？（配代码） — 缺 `self.save` `transactiontemplate.`
- `java-05-Q42` 声明式事务和编程式事务怎么选？ — 缺 `transactiontemplate.` `commit/rollback`
- `java-05-Q43` 什么是大事务？有什么问题？怎么优化？ — 缺 `rpc/http` `rpc/mq/io` `after_commit` `insert/update`

**`spring-mvc`** Spring MVC：一次请求的完整旅程

- `java-05-Q50` Spring MVC 怎么做统一异常处理？ — 缺 `restcontrolleradvice` `xxxexception.class` `msg` `controlleradvice` `basepackages` `errorcontroller` `globalexceptionhandler` `bizexception.class` `bizexception` `result.fail` `e.getcode` `e.getmessage` `other`
- `java-05-Q51` 什么是跨域？Spring Boot 中有哪几种解决方案？ — 缺 `xhr/fetch` `cors` `w3c` `origin` `crossorigin` `webmvcconfigurer` `addcorsmappings` `corsregistry` `corsfilter` `allowcredentials` `allowedorigins` `allowedoriginpatterns`

**`aop`** AOP 与代理机制

- `java-05-Q35` 写一个接口耗时统计的切面（实践题） — 缺 `slf4j` `costtimeaspect` `com.demo.controller` `throws` `throwable` `system.currenttimemillis` `log.info` `cost` `getdeclaringtypename`

**`spring-cloud`** Spring Cloud：分布式治理的四件事

- `java-05-Q71` 熔断、降级、限流的区别？Hystrix 和 Sentinel 怎么选？ — 缺 `warm` `leaparray`

</details>
