/**
 * Go · 短链服务:从 0 到可运维
 * 项目驱动课:一间能跑的仓库 + 一条能讲的项目主线
 *
 * 这是"收口课":不引入新语法,把前三门课的判据落到一个能跑的系统上。
 * 题库来源:go-index(工程化 / 网络 / 存储 / 分布式 / 系统设计) + go-02 + go-03 + go-04 + go-05
 *
 * 阶段 A 已完成讲义(3 课);阶段 B 只有题单与提纲,待批次 2 补 sections。
 */
export default {
  id: 'go-shortlink',
  language: 'go',
  title: '短链服务:从 0 到可运维',
  subtitle: '用 Gin + GORM + Redis + Kafka 做一个能扛住面试追问的短链系统',
  level: 'expert',
  order: 10,
  prerequisites: ['go-engineering-system'],
  outcomes: [
    '搭起分层清晰、能优雅退出的 Gin 服务,而不是一个 main.go 写到底',
    '实现号段发号器,并说清雪花与 Redis INCR 各自的失效条件',
    '用 cache-aside 把读路径的 DB 压力压到可忽略,而不是靠调大连接池',
    '看到 CPU 或内存异常时,能用 pprof 定位到具体函数而不是重启试试',
    '面对「设计一个短链服务」的追问,按容量-分层-瓶颈-取舍四步作答',
  ],
  stages: [
    {
      id: 'bootstrap',
      title: 'A · 最小可运行闭环',
      goal: '让「创建短链 → 302 跳转」这条主链路端到端跑通,并立住分层与生命周期的底线',
      summary:
        '短链的最小定义只有两个接口和一张表,但「最小」不等于「随便写」。这一阶段先把服务的下限立住:不设超时的 server、没有就绪探针、退出时丢请求,这三件事在本地永远暴露不出来。再把 ID 的来源讲透——号段双 buffer 是这门课唯一一处必须自己写并发控制的地方。最后用 cache-aside 把读路径的 DB 压力降到可忽略,并埋下第三阶段打点的钩子。',
      checkpoint: {
        questionIds: [
          'go-index-Q98',
          'go-04-Q10',
          'go-index-Q142',
          'go-index-Q163',
          'go-index-Q148',
          'go-05-Q2',
          'go-index-Q80',
          'go-index-Q133',
        ],
        passRatio: 0.8,
      },
      lessons: [
        {
          id: 'skeleton-and-health',
          title: '服务骨架、配置与优雅退出',
          kind: 'concept',
          questionIds: [
            'go-04-Q1',
            'go-04-Q2',
            'go-04-Q10',
            'go-04-Q11',
            'go-index-Q98',
            'go-index-Q142',
          ],
          content: {
            intro:
              '一个 Go 服务最容易死的地方,往往不是业务逻辑,而是三个没人写过的默认值:超时、请求 ID、就绪探针。它们在本地一次都不会响,只在你最不希望的时候响。这一节先立三条下限——超时必须显式给、探针语义必须分开、退出必须等在途请求跑完;再讲清楚为什么分层不是审美,而是可测试性。范围划在这里:不讲 Gin 的路由树怎么实现,只讲一个请求从进入进程到离开进程,中间被谁碰过。',
            outline: [
              '三个只在线上暴露的默认值,以及它们各自防的是什么',
              '`cmd` / `internal` / `pkg` 的边界:一条被编译器强制,两条靠自觉',
              '中间件是洋葱不是队列:`c.Next` 前后各有一半逻辑',
              '`healthz` 与 `readyz` 回答两个不同的问题,写反会放大故障',
              '接口定义在消费方,单测才不需要数据库',
            ],
            pitfalls: [
              '把 `ReadTimeout` 当成万能超时——它管不住慢速 header,`ReadHeaderTimeout` 必须单独设。',
              '在 `readyz` 里每次都 ping 下游——下游抖三秒,整个集群的实例会在同一刻被摘光。',
              '`Shutdown` 之后立刻 `os.Exit`——在途请求被硬切,表现为每次发布期间一批 502。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '「能跑」和「能上线」之间隔着三个默认值',
                body: [
                  '本地把一个服务跑起来只需要三件事:端口、路由、一个连得上的数据库。所以新手写的服务通常也没有另外三样东西——超时、请求 ID、就绪探针。这三样在本地一次都不会暴露,因为它们防的都是「别人的慢」和「自己的重启」。',
                  '第一个是超时。`http.Server` 的四个超时字段默认值全是 0,含义是「不限制」。于是任何一个只发一个字节然后卡住的连接,都能长期占住一个 goroutine 和一条连接;几百个这样的连接就能把服务拖到无法接受新请求。这不是攻击才有的场景:弱网、半开的 TCP、客户端进程被 kill 都会产生它。',
                  '第二个是 request id。没有它,一次失败请求在入口日志、SQL 日志、下游调用日志里是三条互不相干的记录,你只能靠时间戳猜它们属于同一次请求。有了它,一条 `grep` 就能把整条链路串起来。',
                  '第三个是就绪探针。没有它,滚动发布时新实例还没连上数据库就开始接流量,老实例已经收到退出信号但请求还在飞——表现出来就是每次发布都掉一批 502。',
                  '[[判据只有一句:凡是在本地不会暴露、只在别人慢或自己重启时才暴露的东西,都必须显式写出来。]]这一节剩下的部分,就是把这三样落到代码上。',
                ],
              },
              {
                kind: 'concept',
                title: '`cmd` / `internal` / `pkg` 的边界不是审美,是可测试性',
                body: [
                  'Go 的目录约定不多,但 `internal` 是唯一被编译器强制的:`internal/` 下的包只能被同一模块内的代码 import。这一条直接决定了「外部使用者能不能绕过 service 直接调 repo」——不能,这在 SDK 化的项目里是刚需。',
                  '`cmd/api` 的职责只有一个——装配。读配置、建连接、装路由、等信号,全部发生在 `main` 的栈上,所有资源用 `defer` 释放。它也是全项目唯一允许出现 `os.Exit` 的地方。把业务逻辑写进 `main` 的代价不是「不好看」,而是这段逻辑永远无法被测试调用,只能靠手工点。',
                  '`pkg` 放「零业务依赖的纯函数」,比如 base62 编解码、带抖动的退避。判断标准很朴素:把它拷到另一个项目里能不能直接用。反例是把 `idgen` 放进 `pkg`——它 import 了 `gorm`,于是 `pkg` 立刻变成「和数据库绑定的工具箱」,不再可复用,也再也不能在没有数据库的环境里被测试。',
                  '`internal` 不是一个层次,是一个可见性边界。里面照样按 handler / service / repo 分层,只是外面看不到。[[把「边界」和「分层」当成两件事,目录就不会越写越乱。]]',
                ],
              },
              {
                kind: 'diagram',
                title: '依赖方向:四条边只能向内',
                diagram: {
                  type: 'layers',
                  items: [
                    {
                      label: 'cmd/api',
                      note: '只装配:读配置、建连接、装路由、等信号',
                      tone: 'primary',
                    },
                    {
                      label: 'server',
                      note: '路由表 + 中间件顺序 + 探针,不碰业务',
                      tone: 'muted',
                    },
                    {
                      label: 'handler',
                      note: '协议转换:绑定、校验、错误码映射',
                      tone: 'muted',
                    },
                    {
                      label: 'service',
                      note: '用例编排:顺序本身就是业务语义',
                      tone: 'primary',
                    },
                    {
                      label: 'repo / cache',
                      note: '只做 SQL、只做 Redis 命令',
                      tone: 'muted',
                    },
                    {
                      label: 'pkg',
                      note: '零业务纯函数,可整包拷走',
                      tone: 'muted',
                    },
                  ],
                  caption:
                    '箭头只允许从上往下。`service` 不认识 `repo` 的具体类型,只认识自己声明的接口;`pkg` 不被任何业务包反向依赖。一旦出现「repo import service」,依赖就成环,单测必须起数据库——这是分层最容易被违反的方式。',
                },
              },
              {
                kind: 'principle',
                title: '一次请求穿过五层,每层只做一件事',
                body: [
                  '把 `POST /api/v1/links` 从头跟到尾,五层各自的职责就清楚了。判断分层有没有做对,只需要看每一层「有没有做别人的事」。',
                ],
                steps: [
                  {
                    title: '① 路由匹配:决定谁来处理',
                    detail:
                      '`gin.Engine` 的树按 method + path 找 handler。`/api/v1/links` 是静态路径,`/:code` 是根级通配,两者在 gin 里可以共存——但顺序和写法不对会直接 panic,所以仓库里有一条 `router_test.go` 专门钉住这件事。',
                  },
                  {
                    title: '② 中间件入栈:request id → recovery → 访问日志',
                    detail:
                      '顺序就是语义。request id 必须最先,后面都要用它;recovery 必须在日志外层,否则 panic 会被日志记成 200。这三个中间件加起来不到 80 行,却决定了线上出问题时你手上有没有线索。',
                  },
                  {
                    title: '③ 绑定与格式校验:只判断「能不能解析」',
                    detail:
                      '`ShouldBindJSON` 校验 JSON 结构与 `required`。这里是格式层:字段缺失、类型不对归它管;「这个 URL 能不能被短链系统接受」属于业务规则,归 service。分不清这两层,校验逻辑就会散落在 handler 里,CLI 复用不了。',
                  },
                  {
                    title: '④ service 编排:顺序即语义',
                    detail:
                      '`Create` 的顺序是校验 → 查重 → 发号 → 落库 → 写缓存。任何一步换个位置,语义就变了:先写缓存再落库,一旦落库失败,缓存里就存在一条查不到的短链。',
                  },
                  {
                    title: '⑤ 错误映射:业务码 → HTTP 状态码',
                    detail:
                      '`httpx.Fail` 是唯一的错误出口。非 `*httpx.Error` 的错误一律当 500 并打日志——不认识的错误透给用户,SQL 报错里的表名、字段名就会原样出现在响应体里。',
                  },
                ],
                takeaway:
                  '五层一句话:路由选人、中间件立规矩、handler 翻译协议、service 决定顺序、错误映射收口。判断标准只有一个——把任何一层单独拿走,其它层还能不能编译。',
              },
              {
                kind: 'code',
                title: '`main.go`:装配、四个超时、优雅退出',
                lang: 'go',
                code:
                  'func run() error {\n\t// 信号变 ctx:整条退出链路只有一个触发点\n\tctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)\n\tdefer stop()\n\n\tcfg, err := config.Load() // 启动即校验,缺配置直接失败\n\tif err != nil {\n\t\treturn err\n\t}\n\tdb, err := storage.OpenMySQL(ctx, cfg.MySQLDSN)\n\tif err != nil {\n\t\treturn err\n\t}\n\tdefer func() {\n\t\tif sqlDB, err := db.DB(); err == nil {\n\t\t\t_ = sqlDB.Close()\n\t\t}\n\t}()\n\n\t// 四个超时各防一件事,缺一个都能被打挂\n\tsrv := &http.Server{\n\t\tAddr:              cfg.HTTPAddr,\n\t\tHandler:           engine,\n\t\tReadHeaderTimeout: 5 * time.Second,  // 慢速 header\n\t\tReadTimeout:       15 * time.Second, // 慢速 body\n\t\tWriteTimeout:      15 * time.Second, // 慢客户端\n\t\tIdleTimeout:       60 * time.Second, // 空闲连接堆积\n\t}\n\n\tgo func() {\n\t\tready.Store(true)\n\t\tif err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {\n\t\t\terrCh <- err\n\t\t}\n\t}()\n\n\tselect {\n\tcase err := <-errCh:\n\t\treturn err\n\tcase <-ctx.Done():\n\t}\n\n\t// 优雅退出四步:摘流 -> 停接新连接 -> 等在途 -> 关资源(靠 defer)\n\tready.Store(false)\n\tshutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownGrace)\n\tdefer cancel()\n\treturn srv.Shutdown(shutdownCtx)\n}\n\n// kill -TERM <pid> 之后日志依次是:\n//   {"msg":"shutdown started","grace":"10s"}\n//   {"msg":"shutdown done","elapsed":"12.4ms"}\n// 出现 "context deadline exceeded" 说明在途请求没在 grace 内跑完。\n',
                caption:
                  '注意 `ready.Store(true)` 的位置:它在监听之前,而不是在 `ListenAndServe` 返回之后——探针要读的是「能不能接流量」,此时端口已经绑好了。`kill -TERM` 之后进程不是立刻消失,而是按「摘流 → 停接 → 等在途 → 关资源」四步走完。',
                notes: [
                  {
                    line: 'ctx, stop := signal.NotifyContext(...)',
                    text: '把信号转成 ctx 的取消,后面的 `select` 只需要等一个 `ctx.Done()`。这样退出路径只有一条,不用再维护 `stopCh`。',
                  },
                  {
                    line: 'defer func() { ... sqlDB.Close() }()',
                    text: '资源释放写在 `run` 里而不是 `main` 里:所有 defer 都在同一个栈帧,顺序反过来就是「先关连接池、再关 server」,在途请求会拿到 `sql: database is closed`。',
                  },
                  {
                    line: 'ReadHeaderTimeout: 5 * time.Second',
                    text: '这一行最容易被删掉。`ReadTimeout` 管不到「慢慢发 header」——攻击者每个连接每 9 秒发一个字节,`ReadTimeout` 永远不会触发。',
                  },
                  {
                    line: 'srv.Shutdown(shutdownCtx)',
                    text: '`Shutdown` 会先关监听器,再等待所有活跃连接空闲。它不等待 context 之外的 goroutine,也不关 hijack 的连接——所以项目里还有 `defer segment.Close()` 这类主动收尾。',
                  },
                ],
                version: 'Go 1.23',
                env: '本地 go run 或 docker compose 里的 MySQL 8.0',
                verified: true,
              },
              {
                kind: 'concept',
                title: '配置从环境变量来,而且要启动即校验',
                body: [
                  '为什么不用 yaml:容器里配置是「注入」的,不是「随包发布」的。同一份镜像要在测试、预发、生产三套环境跑,配置只能是外部注入;而环境变量是唯一所有编排系统(compose、K8s、systemd)都原生支持的形式。',
                  '更关键的是「启动即校验」。`config.Load()` 把「必填项缺失」「数值越界」「时长格式不对」全部在 `ListenAndServe` 之前挡掉,并且用 `errors.Join` 一次报全,而不是修一个报一个。',
                  '[[一个「能起来但行为不对」的进程,比一个起不来的进程难查十倍。]]起不来会立刻触发重启与告警;起得来但读错了 TTL,可能三天后才有人发现缓存从来没生效。',
                  '项目里还有一条纪律:配置结构体只增不改名。改一个字段名等于让所有已部署环境的变量同时失效,而这类故障通常发生在发布之后,而不是发布之中。',
                ],
              },
              {
                kind: 'compare',
                title: 'env / yaml / flag 三种配置来源',
                head: ['来源', '热更新', '类型与校验', '容器友好'],
                rows: [
                  ['环境变量', '改完要重启(或配合 SIGHUP)', '全是字符串,必须自己解析并校验', '最好,所有编排系统原生支持'],
                  ['yaml 文件', '可以做到(监听文件变化)', '有结构、但校验仍要自己写', '一般,要么打进镜像要么挂 ConfigMap'],
                  ['命令行 flag', '不行,只在启动时读一次', '有类型,库会帮忙解析', '差,改参数要改编排文件'],
                ],
                note: '这三者不是互斥的:常见组合是「yaml 提供默认值 + 环境变量覆盖 + flag 临时调试」。本项目只用环境变量,是为了让「配置从哪来」这个问题只有一种答案。',
                caption: '选型的判据不是「哪个先进」,而是「谁在改它、多久改一次」。运维改的东西必须能被编排系统注入,开发者临时调的东西才用 flag。',
              },
              {
                kind: 'question',
                title: 'Q98 · Go 服务如何实现优雅退出?',
                questionId: 'go-index-Q98',
                intent: '考的不是「会不会调 `Shutdown`」,而是知不知道「优雅」到底在等什么、以及哪些东西它等不到。',
                points: [
                  '先说四步:捕获信号 → 停止接受新连接 → 等待在途请求 → 释放资源。四步的顺序不能换,换了就会出现「新连接还在进来,但数据库已经关了」。',
                  '再讲 `Shutdown` 的实际行为:它关闭监听器,然后轮询活跃连接直到全部空闲或 ctx 超时。超时后返回 `context.DeadlineExceeded`,但**不会**强制关闭连接。',
                  '必须补一句边界:`Shutdown` 不管 hijack 的连接(WebSocket)、不管你起的后台 goroutine、也不管连接池。所以项目里 `segment.Close()`、`sqlDB.Close()` 都是单独 defer 的。',
                  '给一个可观测的收尾:退出打两行日志,`shutdown started` 与 `shutdown done` 带耗时。没有这两行,你无法判断「发布掉的那批 502」是不是没排空。',
                ],
                depth: '追问「K8s 里 preStop 和 liveness 怎么配」时,答案是:先让端点摘除(preStop sleep 或 readiness 先置 false),再发 SIGTERM;否则 kubelet 发信号与 Service 摘端点几乎同时发生,总有请求打到已经准备退出的 Pod 上。这就是所谓的「摘流早于停机」。',
                followup: '如果面试官问「grace 设多长」:取 P99 请求耗时,再留 2 倍余量,并且必须小于 `terminationGracePeriodSeconds`,否则会被 SIGKILL。',
              },
              {
                kind: 'question',
                title: 'Q10 · server 端要设置哪些超时?',
                questionId: 'go-04-Q10',
                intent: '考「四个超时分别防什么」,而不是「都设成 30 秒」。',
                points: [
                  '`ReadHeaderTimeout`:防慢速 header 攻击。这是最容易被漏掉、也最容易被利用的一个。',
                  '`ReadTimeout`:从连接建立起读完整请求(含 body)的总时长,防慢速 body。',
                  '`WriteTimeout`:从读完请求头开始到写完响应的时长,防慢客户端拖住 goroutine。',
                  '`IdleTimeout`:keep-alive 连接的复用等待时长,防空闲连接堆积占满文件句柄。',
                ],
                depth: '反直觉的一点:`WriteTimeout` 对大文件下载是灾难——它会把「正在正常传输」的连接掐断。所以流式接口要么单独起 `http.Server`,要么用 `http.ResponseController` 单请求调整 deadline。',
                followup: '再往上一层:`http.Client` 也要设,`Timeout` 管整体、`Transport.ResponseHeaderTimeout` 管等响应头、`IdleConnTimeout` 管复用。客户端不设超时,服务端的超时等于白设。',
              },
              {
                kind: 'concept',
                title: '中间件是洋葱,不是队列',
                body: [
                  '`r.Use(a, b, c)` 的执行顺序是 a 前 → b 前 → c 前 → handler → c 后 → b 后 → a 后。`c.Next()` 之前是「请求进来」,之后是「响应出去」,同一个中间件被切成两半。',
                  '所以「在中间件里记录耗时」必须把计时器放在 `c.Next()` 之前、把日志放在之后,中间件才能覆盖到真正的处理时间。写在 `c.Next()` 之后的代码,在 handler panic 时不会执行——除非外层有 recovery 兜住。',
                  '`Abort()` 只是把索引推到最后,阻止后续 handler 执行,**不会**中断当前函数。所以 `Abort` 之后必须 `return`,否则这一层剩下的代码照跑;这是新手最常见的中间件 bug,表现为「已经返回 401 了,日志里还在打印业务参数」。',
                  '[[判断一个中间件写得对不对,看把它挪到链首或链尾会不会出问题。]]会出问题的中间件,说明它偷偷依赖了别人的副作用。',
                ],
              },
              {
                kind: 'code',
                title: '三件套:request id、结构化日志、recovery',
                lang: 'go',
                code:
                  'func RequestID() gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\tid := c.GetHeader("X-Request-ID")\n\t\tif id == "" {\n\t\t\tid = newID() // crypto/rand,8 字节 hex\n\t\t}\n\t\tc.Set(ctxRequestID, id)\n\t\tc.Writer.Header().Set("X-Request-ID", id)\n\t\tc.Next()\n\t}\n}\n\nfunc Recovery(log *slog.Logger) gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\tdefer func() {\n\t\t\tif r := recover(); r != nil {\n\t\t\t\tlog.Error("panic recovered", "panic", r, "path", c.Request.URL.Path,\n\t\t\t\t\t"request_id", FromContext(c), "stack", string(debug.Stack()))\n\t\t\t\tc.AbortWithStatusJSON(http.StatusInternalServerError, httpx.Envelope{\n\t\t\t\t\tCode: httpx.CodeInternal, Message: "internal error",\n\t\t\t\t})\n\t\t\t}\n\t\t}()\n\t\tc.Next()\n\t}\n}\n\nfunc AccessLog(log *slog.Logger) gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\tstart := time.Now()\n\t\tc.Next()\n\t\tlog.Info("http request",\n\t\t\t"method", c.Request.Method, "path", c.Request.URL.Path,\n\t\t\t"status", c.Writer.Status(),\n\t\t\t"elapsed_ms", float64(time.Since(start).Microseconds())/1000,\n\t\t\t"request_id", FromContext(c))\n\t}\n}\n',
                caption:
                  '三个中间件不到 80 行,但配好了就有「一次请求一行日志、一条 grep 串起全链路、panic 不炸进程」这三件事。注意注册顺序是 RequestID → Recovery → AccessLog:Recovery 在日志外层,panic 时才能被记成 500 而不是 200。',
                notes: [
                  {
                    line: 'id := c.GetHeader("X-Request-ID")',
                    text: '上游传了就用上游的。网关、前端、压测工具都会带,自己重新生成会断掉跨服务串联。',
                  },
                  {
                    line: 'log.Error("panic recovered", ... "stack", string(debug.Stack()))',
                    text: '`debug.Stack()` 只在这一层拿得到——恢复之后栈已经退掉了。少了它,日志只剩「发生了一个 panic」,没有位置。',
                  },
                  {
                    line: 'log.Info("http request", ...)',
                    text: '用 `slog` 而不是 `fmt.Printf`:字段是结构化的,能被 Loki/ES 直接按 `status>=500` 查,换输出格式不用改调用点。',
                  },
                ],
                version: 'Go 1.23',
                env: 'go test ./internal/server 可直接验证中间件顺序',
                verified: true,
              },
              {
                kind: 'question',
                title: 'Q11 · Gin 的 middleware 怎么实现?',
                questionId: 'go-04-Q11',
                intent: '考的是「函数签名 + 闭包 + 洋葱模型」这三件套,而不是会用 `r.Use`。',
                points: [
                  '类型层面:`type HandlerFunc func(*gin.Context)`,`gin.HandlerFunc` 就是这个类型。中间件只是「返回 `gin.HandlerFunc` 的函数」,所以它能捕获外部依赖(日志器、配置)。',
                  '执行层面:`Engine` 持有一个 `HandlersChain`,索引随 `c.Next()` 前进。`Use` 把函数追加到链上,`GET` 把路由 handler 追加到链尾。',
                  '终止层面:`c.Abort()` 把索引置为最大值,后续 handler 全部跳过;但当前函数体继续执行,必须 `return`。',
                  '标准库对照:不用框架时中间件的签名是 `func(next http.Handler) http.Handler`,返回的闭包里显式调 `next.ServeHTTP(w, r)`——Gin 的 `c.Next()` 就是这行调用的语法糖,只不过把 `w`、`r` 和链上索引一起塞进了 `*gin.Context`。标准库另有 `http.TimeoutHandler`,但它超时后只补一个 503 并丢弃后续写入,并不会取消 handler 自己的 context,所以业务侧的超时仍然要靠 `context.WithTimeout`。这句话在面试里很值钱:它能区分「会用框架」和「知道框架在封装什么」。',
                ],
                depth: '追一句「中间件里能改路由吗」:不能。路由在 `handleHTTPRequest` 里已经匹配完成,中间件拿到的只有 `c.Param` 与 `c.Request`。要改路由得用 `c.Request.URL.Path` 配合重定向,或者在 `NoRoute` 里做二次分发。',
                followup: '再问「中间件里能不能改响应体」:能,但要在 `c.Next()` 之后操作 `c.Writer`,或者自己包一层 `gin.ResponseWriter`。一旦 handler 已经 `WriteHeader`,再改就来不及了。',
              },
              {
                kind: 'concept',
                title: '`healthz` 和 `readyz` 是两个问题,不是一个问题的两种写法',
                body: [
                  '`healthz` 回答「进程还活着吗」,它决定 kubelet 要不要**重启**这个容器。所以它不能查数据库:数据库挂了重启应用没有意义,只会让恢复更慢,还会在重启期间丢掉所有本地状态。',
                  '`readyz` 回答「现在能不能给我放流量」,它决定 Service 要不要把这个 Pod 留在端点列表里。所以它必须反映「我准备好了吗」——依赖连上了、路由装好了、预热完成了。',
                  '最容易犯的错是让 `readyz` 每次都去 ping 下游。下游抖三秒,所有实例的 `readyz` 同时失败,端点被同时摘光,流量瞬间打到剩下的实例上——一次小抖动被放大成全站故障。',
                  '[[正确形态是「浅探测 + 可选深探测」:默认只看本地状态,排障时人工加 `?deep=1`。]]本项目的 `readyz` 就是这么写的,`deep=1` 才真的去 ping MySQL 与 Redis。',
                ],
              },
              {
                kind: 'diagram',
                title: '摘流与停机的先后顺序',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    {
                      label: '① 收到 SIGTERM',
                      note: 'kubelet 发信号,同时 Service 开始摘端点',
                    },
                    {
                      label: '② ready 置 false',
                      note: '新请求不再进来;已有连接继续服务',
                    },
                    {
                      label: '③ srv.Shutdown',
                      note: '关闭监听器,等待活跃连接空闲',
                    },
                    {
                      label: '④ 在途请求跑完',
                      note: '这是「优雅」真正在等的东西',
                    },
                    {
                      label: '⑤ defer 释放资源',
                      note: '先关发号器,再关连接池,最后关 Redis',
                    },
                  ],
                  caption:
                    '顺序错了会怎样:如果先关连接池再 `Shutdown`,在途请求会在最后一步拿到 `sql: database is closed`;如果不等在途请求就退出,发布期间必然掉一批 502。三个箭头里最容易省掉的是 ② 和 ④,它们恰好是线上故障的两个主要来源。',
                },
              },
              {
                kind: 'concept',
                title: '接口定义在消费方,这不是风格问题',
                body: [
                  '`service` 包里有三个接口:`LinkRepo`、`LinkCache`、`Allocator`。它们的实现分别在 `repo`、`cache`、`idgen` 包里,但那三个包里没有一行「我实现了某某接口」——Go 的隐式实现让这件事自动成立。',
                  '为什么定义在消费方:接口描述的是「我需要什么」,而不是「你能提供什么」。`service` 只需要「按 code 查一条记录」,它不需要知道对方是 MySQL、TiDB 还是内存 map。',
                  '反过来做会怎样:接口定义在 `repo`(实现方),`service` 就必须 import `repo` 才能拿到类型。于是编译期依赖成立,单测里想换成 fake 就必须先造一个 `repo.LinkRepo` 的替身——而它需要 `*gorm.DB`。最后的结果是「测一个业务规则要起 MySQL」。',
                  '[[一条可操作的判据:接口放哪边,看哪边更可能被替换。]]越容易被替换的一侧定义接口,依赖就越轻。',
                ],
              },
              {
                kind: 'question',
                title: 'Q142 · 在 Go 里怎么做 mock?接口应该定义在哪一方?',
                questionId: 'go-index-Q142',
                intent: '考「接口归属」与「怎么用最小代价造 fake」,而不是背 gomock 的用法。',
                points: [
                  '先说归属:接口定义在**调用方**(consumer),实现方只提供具体类型。Go 标准库就是这个风格——`io.Reader` 定义在 `io` 包,任何有 `Read` 方法的类型都自动满足它。',
                  '再说 mock 的三种粒度:手写 fake(状态简单时最划算)、表驱动 + 接口替换、生成式工具(gomock/mockgen,接口多且变更频繁时)。项目里 `LinkRepo` 只有 3 个方法,手写 fake 不到 40 行,比引入生成工具更快。',
                  '给出判据:如果 fake 里开始出现「第几次调用返回什么」的脚本,说明被测对象的行为过于依赖交互顺序,该重构而不是继续加 mock。',
                ],
                depth: '追问「什么时候该用 gomock」:接口方法超过 8 个、或者需要断言调用参数与次数时。手写 fake 的维护成本随方法数线性增长,而生成式工具的成本是固定的——这就是分界线。',
                followup: '再补一句 Go 特有的优势:因为隐式实现,你不需要「声明实现了接口」。测试文件里只要提供同名方法,`*fakeRepo` 就直接满足 `service.LinkRepo`,不需要额外代码。',
              },
              {
                kind: 'question',
                title: 'Q1 · go mod 的常用命令与文件?',
                questionId: 'go-04-Q1',
                intent: '考对 `go.mod` / `go.sum` / `go.work` 三者职责的区分,以及 `tidy` 到底做了什么。',
                points: [
                  '`go.mod`:模块路径、`go` 指令(语言版本)、直接与间接依赖。`require` 里带 `// indirect` 的是「被依赖的依赖」,不是直接 import 的。',
                  '`go.sum`:每个模块版本的哈希,防篡改。它必须入库,否则 CI 无法复现;但它不是「依赖清单」,删掉 `go.mod` 里的行不会自动清理 `go.sum`。',
                  '`go.work`:多模块开发时的本地工作区,把几个本地模块临时联编。它**不应该**入库——它是开发者本地的临时状态。',
                  '`go mod tidy` 做三件事:补上缺失的依赖、删掉没被引用的依赖、更新 `go.sum`。它只认「代码里真的 import 了」,所以注释掉代码再 tidy 会把依赖删掉。',
                ],
                depth: '追问「为什么 `go.sum` 里会有同一个模块的多个版本」:因为 MVS 选定的是每个模块的最终版本,但构建图里可能还有别的模块依赖它的旧版本,校验和会为所有参与计算的版本保留。',
                followup: '「`go mod vendor` 有什么用」:把依赖源码拷进仓库,适合内网或需要审计的构建;代价是仓库体积,以及每次升级依赖都会产生一次大 diff。',
              },
              {
                kind: 'question',
                title: 'Q2 · Go 的版本选择机制(MVS)是什么?',
                questionId: 'go-04-Q2',
                intent: '考「最小版本选择」这个名字里的「最小」到底相对谁最小。',
                points: [
                  '规则一句话:**每个模块取所有约束里要求的最低版本中的最高者**。A 要求 v1.2.0,B 要求 v1.5.0,最终选 v1.5.0;如果 C 只要求 v1.0.0,它不参与拉低。',
                  '为什么这样设计:可复现。只要有依赖升级,版本只会单调上升,不会因为「某个下游删了一行 require」而回退——回退是最难复现的一类构建差异。',
                  '代价:不能靠「依赖方声明了低版本」来降级。想降级必须显式 `go get module@vX.Y.Z` 或用 `replace` / `exclude`。',
                ],
                depth: '和 npm 的区别值得说一句:npm 装的是「满足范围的最新版」,go 装的是「满足所有约束的最低可行版」。前者让新版本自动进来(容易引入破坏性变更),后者让构建稳定但需要主动升级——两种取向,对应两种维护成本。',
                followup: '「`replace` 和 `exclude` 的区别」:`replace` 是把某个模块换源(本地目录、fork 仓库),开发调试时最常用;`exclude` 只是把某个版本从候选中剔除,让 MVS 选下一个,用得少得多。',
              },
              {
                kind: 'explore',
                title: '从单机到 K8s:这套探针与退出逻辑会被怎么改写',
                from: '这一节立的三个判据——超时要显式、探针要分语义、退出要等在途——在单机上靠代码保证,进了编排系统就变成「代码 + 平台配置」两半。',
                branches: [
                  {
                    direction: 'outward',
                    related: 'Kubernetes 的 liveness / readiness / startup 三种探针与 preStop 钩子',
                    basis:
                      '平台接管了「什么时候重启」「什么时候放流量」这两个决策,但它只能通过你暴露的端点来了解状态。所以协议还是那三个端点,只是语义被平台拆得更细。',
                    shared:
                      '都以 HTTP 状态码为唯一信号:200 表示「可以」,其它表示「不可以」。都要求探针本身足够便宜——平台会按秒级频率调用它。',
                    diff:
                      '单机上「探针失败」最多是监控告警;K8s 上 liveness 失败会**重启容器**,readiness 失败会**摘除端点**,startup 失败会**杀掉并重试启动**。同一个 500,三种后果。[[所以 liveness 绝不能查依赖——重启治不好数据库。]]',
                    value:
                      '被问「你线上服务怎么保证发布不掉请求」,能答的不是「配了探针」,而是「readiness 先置 false 摘流,preStop 等一个 P99,再让 SIGTERM 进来,grace 小于 terminationGracePeriodSeconds」。这是把代码判据翻译成平台配置的能力。',
                  },
                  {
                    direction: 'down',
                    related: 'HTTP/1.1 的 keep-alive 与连接排空',
                    basis:
                      '「等在途请求」之所以能等,前提是服务端知道哪些连接还活着。这个信息来自 HTTP/1.1 的连接状态机:请求-响应配对结束后连接回到 idle。',
                    shared:
                      '都依赖「连接有明确的生命周期状态」:活跃、空闲、关闭。`Shutdown` 轮询的就是这个状态。',
                    diff:
                      'HTTP/1.1 下一条连接同一时刻只有一个在途请求,排空逻辑简单;HTTP/2 一条连接上有多个并发流,`Shutdown` 需要发 GOAWAY 帧告诉对端「别再开新流」,再等已有的流结束。[[协议越并发,「排空」这件事越需要协议层配合。]]',
                    value:
                      '这解释了为什么 gRPC(HTTP/2)服务的优雅退出比 HTTP/1.1 更容易出问题:客户端如果忽略 GOAWAY,会继续往一条正在关闭的连接上开流,表现为随机的 `transport is closing`。',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'id-and-schema',
          title: '号段发号与短码建表',
          kind: 'concept',
          questionIds: [
            'go-index-Q163',
            'go-05-Q1',
            'go-index-Q148',
            'go-05-Q2',
            'go-index-Q149',
            'go-index-Q151',
            'go-04-Q12',
          ],
          content: {
            intro:
              '短链的 ID 不是随机数,而是一条可逆的、趋势递增的整数——这句话决定了后面所有的设计。可逆才能让短码短;趋势递增才能让写入落在 B+ 树最右侧,几乎不触发页分裂。这一节先给出发号的四条判据,再在雪花、号段、Redis INCR 三种方案里做出选择,然后把双 buffer 的并发控制逐行写完。最后回到表结构:为什么主键必须是它,唯一索引又该建在哪一列。',
            outline: [
              '发号的四条判据:唯一、趋势递增、不依赖时钟、可批量',
              '三种方案的分水岭:故障时是「停服」还是「重号」',
              '双 buffer 的核心不是缓存,是把「取号」从一次 RTT 变成一次 CAS',
              '短码 = base62(混淆(id)):盐值解决的是可枚举,不是安全',
              '主键与唯一索引的分工:一个给写入,一个给查询',
            ],
            pitfalls: [
              '用随机 6 位字符当短码——62^6 看着很大,生日悖论下几十万条就开始频繁碰撞,每次碰撞都要重试查库。',
              '号段模式下要求 ID 连续——换段会丢掉上一段的尾部,「连续」和「高性能」在号段里不可兼得。',
              '把 `url` 直接建成唯一索引——`VARCHAR(2048)` 超过 InnoDB 3072 字节的索引上限,建表就失败。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '发号的四条判据,以及它们各自的代价',
                body: [
                  '第一,唯一。这是底线,没有讨论空间。第二,趋势递增。这条不是为了好看:InnoDB 的主键是聚簇索引,插入位置决定页分裂的频率;递增意味着新行永远追加在最右侧,页利用率能维持在高位。',
                  '第三,不依赖时钟。时钟会回拨,回拨就意味着重号或阻塞;而「不依赖时钟」的方案在测试里也可复现——你没法在单测里稳定地让 NTP 回拨一秒。',
                  '第四,可批量。单次取号的成本要能被摊薄。一次 RTT 换一个 ID,在 QPS 上万时就是灾难;一次 RTT 换一千个 ID,成本就近似为零。',
                  '[[这四条互相冲突,不可能全占。]]趋势递增与可批量容易同时满足(号段),不依赖时钟与高 QPS 容易同时满足(号段、Redis INCR),但「严格递增且连续」与「高性能」在分布式下基本不可兼得——这是设计时要先想清楚的一条。',
                  '拿这四条去筛候选,`UUID` 第一个出局:它唯一、不依赖时钟,但 128 位压不成 7 位短码,而且完全随机,趋势递增和可批量两条都不满足。雪花(Snowflake)在唯一、递增、可批量上都能打,代价是绑死系统时钟、机器号(workerID)还要额外分配;号段把「批量」做到极致,代价是故障时会停服。工业界的 Leaf、UidGenerator 基本是「号段 + 雪花兜底」的混合体,原因也在这里:单靠任何一种,都要在四条判据上让一步。',
                ],
              },
              {
                kind: 'compare',
                title: '雪花 / 号段 / Redis INCR:分水岭在故障时',
                head: ['方案', '依赖', '单次开销', '时钟敏感', '故障时', '教学落点'],
                rows: [
                  [
                    '雪花算法 Snowflake',
                    '机器号 + 系统时钟',
                    '纯位运算,纳秒级',
                    '是,回拨即重号或阻塞',
                    '回拨期间发号阻塞',
                    '位布局与时钟兜底',
                  ],
                  [
                    '数据库号段',
                    'MySQL 一行记录',
                    '内存 CAS,摊薄后近零',
                    '否',
                    'DB 挂则余量耗尽后停服',
                    '双 buffer、锁、goroutine',
                  ],
                  [
                    'Redis INCR',
                    'Redis 单点',
                    '一次 RTT(0.2-1ms)',
                    '否',
                    'AOF everysec 丢 1 秒 → 重号',
                    '原子命令与持久化取舍',
                  ],
                ],
                note: '注意第三行那个「重号」:Redis 的 `INCR` 本身是原子的,但它不保证持久化。AOF 配 `everysec` 时,宕机会丢掉最多一秒的写入,重启后计数器回退——于是同一批 ID 会被发第二次。这是「原子不等于持久」的经典案例。',
                caption: '三种方案的差别不在「快慢」,而在「坏的时候怎么坏」。停服是可见的、可恢复的;重号是不可见的、会污染数据的。选型时先问自己更能接受哪一种坏法。',
              },
              {
                kind: 'principle',
                title: '双 buffer 取号的五个动作',
                body: [
                  '号段的核心思想很朴素:一次向数据库领 1000 个号,之后 1000 次发号全在内存里完成。难点不在「领」,在「什么时候领下一次」——领早了浪费,领晚了就要等一次 RTT。',
                ],
                steps: [
                  {
                    title: '① 快路径:纯 CAS,不碰锁',
                    detail:
                      '两个 `atomic.Uint64` 分别记录「当前发到哪」和「本段上界」。取号就是「读上界 → 判断还有余量 → CAS 自增」,失败就重读。整个路径没有 mutex,在 8 核上实测是线性扩展的。',
                  },
                  {
                    title: '② 水位线:余量低于 20% 触发异步预取',
                    detail:
                      '阈值取 `step/5`。选 20% 是因为预取要发一次 SQL,通常 1-5ms;20% 的余量在最坏情况下也够撑住这段延迟。阈值太小会在高 QPS 下退化成同步取号,太大则浪费一次预取。',
                  },
                  {
                    title: '③ 预取去重:三重判断,等价 singleflight',
                    detail:
                      '「已有预取」「正在加载」「拿不到启动锁」任一成立就直接返回。合并的不是 HTTP 请求,而是「取号段」这个动作——但模式和 singleflight 完全一样:同一时刻只允许一个飞行中的请求。',
                  },
                  {
                    title: '④ 换段:必须加锁,因为要同时改两个变量',
                    detail:
                      '`cur` 和 `end` 是两个独立的 atomic,但换段要求它们「一起」变。单独改任何一个,中间状态都会让并发的取号者读到 `cur > end` 或 `cur < 旧 end`。所以换段进 mutex,并在锁内做一次双重检查。',
                  },
                  {
                    title: '⑤ 降级:预取失败就同步取,只慢不错',
                    detail:
                      '预取失败(DB 抖动)不致命,余量耗尽时走同步路径即可,代价是一次 RTT 的延迟。真正致命的是「取不到就 panic」——那会把一次数据库抖动放大成服务不可用。',
                  },
                ],
                takeaway:
                  '五个动作里只有 ④ 需要锁,其余全是无锁或异步。这就是双 buffer 的性能来源:把「一次远程调用」摊到「一千次本地 CAS」上,并且让那次远程调用发生在不阻塞任何人的 goroutine 里。',
              },
              {
                kind: 'diagram',
                title: '号段的生命周期:三个状态,一条退路',
                diagram: {
                  type: 'state',
                  states: [
                    { label: '发放中', note: 'cur < end,快路径纯 CAS' },
                    { label: '预取中', note: '余量 < 20%,后台 goroutine 取下一段' },
                    { label: '已换段', note: 'pending 就位,cur/end 一起更新' },
                  ],
                  transitions: ['余量低于水位,触发 maybePrefetch()', '本段耗尽,reload() 在锁内 swap'],
                  back: { from: 3, to: 1, label: '预取失败 → 同步取号,流程回到发放中' },
                  caption:
                    '三个状态对应三种并发行为:发放中是无锁 CAS,预取中是「后台跑、前台不等」,换段是短暂持锁。那条回退边是最容易被忽略的:预取失败不是终点,只是把异步降级成同步——系统的正确性不依赖预取成功。',
                },
              },
              {
                kind: 'code',
                title: '`segment.go`:快路径 CAS、慢路径加锁',
                lang: 'go',
                code:
                  'func (s *Segment) Next(ctx context.Context) (uint64, error) {\n\tfor {\n\t\tif s.closed.Load() {\n\t\t\treturn 0, ErrClosed\n\t\t}\n\t\t// 快路径:两个 atomic 读 + 一个 CAS,没有任何锁\n\t\tv := s.cur.Load()\n\t\tif v < s.end.Load() {\n\t\t\tif s.cur.CompareAndSwap(v, v+1) {\n\t\t\t\ts.maybePrefetch()\n\t\t\t\treturn v, nil\n\t\t\t}\n\t\t\tcontinue // CAS 失败说明别人刚抢走一个,重新读\n\t\t}\n\t\t// 慢路径:号段用完,需要换段\n\t\tif err := s.reload(ctx); err != nil {\n\t\t\treturn 0, err\n\t\t}\n\t}\n}\n\nfunc (s *Segment) reload(ctx context.Context) error {\n\ts.mu.Lock()\n\tdefer s.mu.Unlock()\n\n\t// 双重检查:等锁期间可能已经有别的 goroutine 换过段了\n\tif v := s.cur.Load(); v < s.end.Load() {\n\t\treturn nil\n\t}\n\tif w := s.pending.Swap(nil); w != nil {\n\t\ts.cur.Store(w.next)\n\t\ts.end.Store(w.end)\n\t\treturn nil\n\t}\n\tw, err := s.fetch(ctx) // 降级:同步去取\n\tif err != nil {\n\t\treturn err\n\t}\n\ts.cur.Store(w.next)\n\ts.end.Store(w.end)\n\ts.maybePrefetch()\n\treturn nil\n}\n',
                caption:
                  '注意 `reload` 里的「双重检查」:等锁的这段时间里,前一个持锁者可能已经把段换掉了,所以拿到锁后必须重新判断余量,否则会把刚刚换好的新段再换一次,凭空丢掉一整段 ID。',
                notes: [
                  {
                    line: 'if v < s.end.Load()',
                    text: '先读 `cur` 再读 `end`。即使这两次读之间发生了换段,最坏结果也是「本次判断偏保守」,不会出现越界发放。',
                  },
                  {
                    line: 'if s.cur.CompareAndSwap(v, v+1)',
                    text: 'CAS 失败不是错误,是并发正常的信号。用 `continue` 重读即可,不需要退避——重试窗口只有几个指令周期。',
                  },
                  {
                    line: 'if w := s.pending.Swap(nil); w != nil',
                    text: '`Swap(nil)` 一步完成「取出并清空」,避免两个 goroutine 同时拿到同一个预取段。',
                  },
                ],
                version: 'Go 1.23',
                env: 'go test -race ./internal/idgen(需要 cgo)',
                verified: true,
              },
              {
                kind: 'code',
                title: '`segment_test.go`:8 个 goroutine 抢 8000 个号',
                lang: 'go',
                code:
                  'func TestSegmentConcurrentUnique(t *testing.T) {\n\tconst (\n\t\tgoroutines = 8\n\t\tperRoutine = 1000\n\t\tstep       = 100\n\t)\n\tstore := &memStore{next: 1} // 内存实现,不需要数据库\n\tseg, err := NewSegment(context.Background(), store, step)\n\tif err != nil {\n\t\tt.Fatalf("NewSegment: %v", err)\n\t}\n\tdefer seg.Close()\n\n\tids := make(chan uint64, goroutines*perRoutine)\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < goroutines; i++ {\n\t\twg.Add(1)\n\t\tgo func() {\n\t\t\tdefer wg.Done()\n\t\t\tfor j := 0; j < perRoutine; j++ {\n\t\t\t\tid, err := seg.Next(context.Background())\n\t\t\t\tif err != nil {\n\t\t\t\t\tt.Errorf("Next: %v", err)\n\t\t\t\t\treturn\n\t\t\t\t}\n\t\t\t\tids <- id\n\t\t\t}\n\t\t}()\n\t}\n\twg.Wait()\n\tclose(ids)\n\n\tseen := make(map[uint64]struct{}, goroutines*perRoutine)\n\tfor id := range ids {\n\t\tif _, dup := seen[id]; dup {\n\t\t\tt.Fatalf("号重复: %d", id)\n\t\t}\n\t\tseen[id] = struct{}{}\n\t}\n\tif len(seen) != goroutines*perRoutine {\n\t\tt.Fatalf("数量不对: 期望 %d, 实际 %d", goroutines*perRoutine, len(seen))\n\t}\n}\n',
                caption:
                  '这个测试能跑起来的关键是 `Store` 接口定义在 `idgen` 包里:`memStore` 只有 10 行,号段发号器就完全脱离了 MySQL。发号这种纯内存逻辑,值得用最强的并发压测去验证——`-race` 版本能直接抓到 `cur`/`end` 的可见性问题。',
                notes: [
                  {
                    line: 'store := &memStore{next: 1}',
                    text: '内存实现只在测试里用。它的 `Fetch` 用一个 mutex 模拟数据库行锁,语义和 `MySQLStore` 一致。',
                  },
                  {
                    line: 'ids := make(chan uint64, goroutines*perRoutine)',
                    text: '带缓冲的 channel 一次装下所有结果,避免主 goroutine 还没开始收集就把子 goroutine 堵住。',
                  },
                  {
                    line: 'if len(seen) != goroutines*perRoutine',
                    text: '数量断言比「无重复」更强:它同时能抓到「少发了号」——那是另一种 bug,通常来自 `reload` 的双重检查写错。',
                  },
                ],
                version: 'Go 1.23',
                env: 'go test ./internal/idgen',
                verified: true,
              },
              {
                kind: 'concept',
                title: '双 buffer 的三个并发坑',
                body: [
                  '坑一:重复预取。两个 goroutine 同时判断「余量不足」,就会同时发起预取,拿回两个号段,其中一个被丢弃——不仅浪费,还会让「pending 只有一个位置」的假设失效。解法就是那三重判断,典型实现是 `atomic.Bool` 的 CAS 或者 `singleflight`。',
                  '坑二:goroutine 泄漏。预取是后台 goroutine,如果它持有一个不设超时的 `context.Background()`,数据库一卡它就一直挂着;进程退出时也不会有任何东西等它。解法是给发号器一个自己的 `ctx`,在 `Close` 里 cancel 并 `wg.Wait()`。',
                  '坑三:swap 时的可见性。换段要同时改 `cur` 与 `end`,两者是独立的原子变量,中间必然存在一个瞬间 `cur` 属于新段、`end` 还是旧值。这时候并发的读会看到 `cur >= end`,于是走慢路径、发现锁被占、阻塞一小会儿——[[这是设计内的短暂阻塞,不是 bug;但如果忘记双重检查,就会变成「换两次段」的真 bug。]]',
                ],
              },
              {
                kind: 'why',
                title: '为什么取号能用 atomic,换段必须加锁',
                body: [
                  'atomic 保证的是「单个变量的读改写是原子的」,不是「多个变量一起变」。取号只涉及 `cur` 一个变量,所以 CAS 足够;换段涉及 `cur` 和 `end` 两个,没有任何一条 CPU 指令能同时原子地改两个内存位置。',
                  '有人会想用「一个 128 位的结构体 + CAS」把两个字段打包——理论上可行(`atomic.Pointer` 指向一个不可变结构体),但代价是每次取号都要分配一个新对象,GC 压力反而更大。**在一个每秒被调用十万次的路径上,锁的代价远小于分配。**',
                ],
                without:
                  '如果不加锁,用两个独立的 CAS 分别更新 `cur` 和 `end`:极端时序下会出现「A 已把 `cur` 改成新段起点,B 还把 `end` 读成旧段的终点」。若旧 `end` 恰好大于新 `cur`,B 就会发出一个落在旧段范围内的号——重号,而且极难复现。',
                real:
                  '所以这里的取舍很清楚:换段是低频事件(每 1000 次取号才一次),用 mutex 的代价可以忽略;而取号是高频路径,必须无锁。**锁的粒度应该跟着频率走,而不是跟着「看起来更优雅」走。**',
              },
              {
                kind: 'concept',
                title: '短码 = base62(混淆(id)),而不是随机 6 位',
                body: [
                  '6 位 base62 能表示 62^6 ≈ 568 亿个组合,看起来「随机取 6 位」很安全。但生日悖论下,取到 100 万个时碰撞概率已经接近 100%——每次碰撞都要回表查重、重试,写路径直接退化。',
                  '用自增 ID 编码就没有碰撞:ID 唯一,编码函数是双射,短码必然唯一。代价是「可枚举」:不加处理时 id=1 编出来就是 `1`,别人从 `1` 开始顺着爬就能把全站链接拉一遍。',
                  '解法是异或一个盐:`Encode(id ^ salt)`。这不是加密,盐值泄露就等于没加;但它消灭了「肉眼可数」这件事,把枚举成本从「遍历」提高到「拿到盐」。对短链这种业务,这个强度刚好够。',
                  '[[注意一个反直觉点:短码短不短,取决于 ID 的大小,不取决于编码方式。]]号段从 0 开始发,前 568 亿个号都能用 6 位表示;但如果起始值设成 10^12,那从第一个号开始就是 7 位。所以「6 位够用」这个结论,是和一个从 0 开始的发号方案绑定的。',
                ],
              },
              {
                kind: 'code',
                title: '`base62.go`:编码、解码与格式校验',
                lang: 'go',
                code:
                  'const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"\n\nconst base = uint64(len(alphabet))\n\nfunc Encode(id, salt uint64) string {\n\treturn encode(id ^ salt)\n}\n\nfunc Decode(code string, salt uint64) (uint64, error) {\n\tv, err := decode(code)\n\tif err != nil {\n\t\treturn 0, err\n\t}\n\treturn v ^ salt, nil\n}\n\nfunc encode(v uint64) string {\n\tif v == 0 {\n\t\treturn string(alphabet[0])\n\t}\n\tvar buf [11]byte // 62^11 > 2^64,11 位一定装得下\n\ti := len(buf)\n\tfor v > 0 {\n\t\ti--\n\t\tbuf[i] = alphabet[v%base]\n\t\tv /= base\n\t}\n\treturn string(buf[i:])\n}\n\nfunc Valid(code string) bool {\n\tif code == "" || len(code) > 16 {\n\t\treturn false\n\t}\n\tfor i := 0; i < len(code); i++ {\n\t\tif strings.IndexByte(alphabet, code[i]) < 0 {\n\t\t\treturn false\n\t\t}\n\t}\n\treturn true\n}\n',
                caption:
                  '`Valid` 是最便宜的防线:它不碰数据库、不碰缓存,就能把「路径里带 `%2F`」「长度超限」「字符集外的字符」全部挡在 service 之外。这类校验一定要放在最前,否则每个畸形请求都会打穿到 Redis。',
                notes: [
                  {
                    line: 'i := len(buf)',
                    text: '从缓冲区尾部往前填,最后返回 `buf[i:]`——这样省掉一次 reverse,也不用预估到底要几位。',
                  },
                  {
                    line: 'if v == 0 { return string(alphabet[0]) }',
                    text: '零值必须特判:不特判的话循环一次都不执行,返回空字符串,短链就变成 `http://host/`。',
                  },
                  {
                    line: 'if code == "" || len(code) > 16',
                    text: '上限取 16 而不是 6:留出未来 ID 增长的空间。校验「能不能被解析」,不校验「是不是当前的位数」。',
                  },
                ],
                version: 'Go 1.23',
                env: 'go test ./internal/shortcode',
                verified: true,
              },
              {
                kind: 'concept',
                title: '表设计:主键给写入,唯一索引给查询',
                body: [
                  '`PRIMARY KEY (id)`:聚簇索引,决定行的物理顺序。用趋势递增的号段 ID,新行永远追加在最右侧,页分裂极少,页利用率能维持在高位。这是「发号方案影响存储引擎」的唯一一条因果链。',
                  '`UNIQUE KEY uk_code (code)`:短链的读路径全部走它。它是二级索引,叶子存的是 `code + 主键`,所以要拿到 `url` 还得回表一次——这就是「聚簇索引与回表」的实景。',
                  '`UNIQUE KEY uk_url_hash (url_hash)`:这条索引不查,只用来**挡并发**。「同一 URL 只建一条」在并发下靠「先查再插」是挡不住的:两个请求同时查不到,然后同时插入。唯一索引是唯一可靠的实现,冲突时数据库返回 1062。',
                  '为什么用 `url_hash` 而不是 `url` 本身:`VARCHAR(2048)` 的索引长度会超过 InnoDB 3072 字节的上限,建表直接失败。取 `sha256(url)` 的前 16 字节,既定长又够用。',
                ],
              },
              {
                kind: 'diagram',
                title: '三条查询路径的代价',
                diagram: {
                  type: 'matrix',
                  cols: ['走哪棵索引', '要不要回表', '典型耗时'],
                  rows: [
                    ['按 id 查', '主键(聚簇)', '不用,行就在叶子', '1 次 B+ 树查找'],
                    ['按 code 查', 'uk_code(二级)', '要,拿主键再查一次', '2 次 B+ 树查找'],
                    ['按 url_hash 查', 'uk_url_hash(二级)', '要,拿主键再查一次', '2 次 B+ 树查找'],
                  ],
                  caption:
                    '三行里只有第一行不用回表,这就是「为什么主键查询最快」的完整答案——不是因为主键有魔法,而是因为聚簇索引的叶子节点就是数据行本身。反过来说,如果一条查询能只靠二级索引就返回全部需要的列(覆盖索引),它也能免掉回表。',
                },
              },
              {
                kind: 'question',
                title: 'Q148 · MySQL 索引的原理是什么?最左前缀怎么理解?',
                questionId: 'go-index-Q148',
                intent: '考「能不能用有序性解释规则」,而不是背「最左前缀」。',
                points: [
                  '先说结构:InnoDB 的索引是 B+ 树,非叶子只存「键 + 页号」,叶子存数据并双向相连。16KB 的页、14 字节的索引项,扇出约 1170,三层就能撑住两千万行。',
                  '再说最左前缀的成因:联合索引 `(a, b, c)` 是按 a 排序、a 相同再按 b 排序。所以「能用索引」等价于「能在这个全序上定位一个连续区间」。跳过 a 直接查 b,b 在全局是无序的,只能全扫。',
                  '最后给本项目的实例:`uk_code(code)` 是单列索引,不存在最左前缀问题;但如果哪天要按「用户 + 短码」查,就得建 `(user_id, code)`,并且查询必须带上 `user_id`。',
                ],
                depth: '追问「范围查询后面的列还能用索引吗」:`(a, b)` 上 `a = 1 AND b > 2` 能用;但 `a > 1 AND b = 2` 里 b 用不上——a 是范围,后面的列在全序上已经不连续了。这不是优化器的实现细节,是有序性的必然结果。',
                followup: '「索引下推(ICP)又是什么」:把 WHERE 里能用索引列的过滤条件下推到存储引擎,在回表之前就筛掉不匹配的行。`EXPLAIN` 的 Extra 出现 `Using index condition` 就是它生效了。',
              },
              {
                kind: 'question',
                title: 'Q149 · MySQL 索引失效的场景有哪些?',
                questionId: 'go-index-Q149',
                intent: '考「能不能把十种现象归成两类」,而不是罗列十条。',
                points: [
                  '第一类:**破坏了有序性**。函数包列(`WHERE DATE(created_at) = ?`)、隐式类型转换(`WHERE code = 123` 而 code 是 varchar)、前导模糊(`LIKE "%abc"`)、跳过最左列。这四种本质是同一件事:索引是按原值排序的,你给的不是原值。',
                  '第二类:**优化器算过账觉得不划算**。返回行数占比太高(比如 `status = 1` 命中 80% 的行)、回表是随机 IO、统计信息过期。这类「失效」不是不能走索引,是走了更慢。',
                  '本项目里要特别小心第一种:`code` 是 `VARCHAR`,如果哪天代码写成 `WHERE code = ?` 却传了个 `int`,MySQL 会把 `code` 转成数字比较,索引直接失效——而且不报错。',
                ],
                depth: '分得清这两类,才知道该改什么:第一类改 SQL 或改索引;第二类要么改索引(做覆盖索引),要么接受全表扫。把第二类当第一类去「加索引」,是最常见的无效优化。',
                followup: '「怎么验证索引有没有生效」:`EXPLAIN` 看三个字段——`type`(ALL 是全表扫)、`key`(实际用了哪条索引)、`rows`(预估扫描行数)。三个一起看,才知道是「没走索引」还是「走了但扫太多」。',
              },
              {
                kind: 'question',
                title: 'go-05-Q2 · 聚簇索引与二级索引?回表是什么?',
                questionId: 'go-05-Q2',
                intent: '考「为什么按主键查比按二级索引快」的物理原因。',
                points: [
                  '聚簇索引:InnoDB 把数据行直接存在主键 B+ 树的叶子节点里,所以「找到主键」等于「找到行」。一张表只有一个聚簇索引,就是主键。',
                  '二级索引:叶子存的是「索引列 + 主键值」,不是行。所以按 `code` 查到主键后,还要再拿主键去聚簇索引查一次——这一步叫回表。',
                  '什么时候能免掉回表:查询要的列全在二级索引里(覆盖索引)。比如 `SELECT id FROM link WHERE code = ?` 就不需要回表,因为 `id` 就在 `uk_code` 的叶子里。',
                ],
                depth: '把回表说成「多一次查询」还不够,要说清它的代价是**随机 IO**:二级索引按 code 有序,但对应的主键可能散落在聚簇索引的任意位置。所以回表 1000 次等于 1000 次随机读,而不是一次顺序扫描。',
                followup: '「覆盖索引为什么能免回表」:查询需要的列全在二级索引的叶子里时,引擎拿到索引项就可以直接返回。所以 `SELECT id FROM link WHERE code = ?` 只需要一次查找——写成 `SELECT *` 立刻就多一次回表。',
              },
              {
                kind: 'question',
                title: 'go-05-Q1 · 为什么 MySQL 用 B+ 树而不是 B 树、红黑树、Hash?',
                questionId: 'go-05-Q1',
                intent: '考「从磁盘特性推出数据结构」,关键是先立前提:慢在 IO 次数,不在比较次数。',
                points: [
                  '前提:磁盘按页读写,一次寻道约 10ms 量级(SSD 也有几十微秒),所以目标是**把树高压到最低**,而不是减少比较次数。',
                  '否掉红黑树:一个节点只存一个键,扇出为 2,两千万行就是 24 层、24 次 IO。',
                  '否掉 B 树:B 树的非叶子节点也存数据行,一行就占掉页的一大半,扇出骤降、树变高。B+ 树非叶子只存「键 + 页号」,同样一页能放上千个索引项。',
                  '否掉 Hash:等值查询 O(1),但不支持范围、排序、最左前缀。短链只用等值查询,理论上 Hash 也行——但没法做「按创建时间扫描」这类运营需求,扩展性差。',
                ],
                depth: '再补一条:B+ 树的叶子双向相连,所以 `ORDER BY id` 和范围扫描可以顺着叶子走,不需要回到根节点。这是 B 树做不到的,也是「为什么范围查询快」的真正原因。',
                followup: '「那为什么不用跳表」:跳表在内存里更快(Redis 用它),但磁盘上多级跳转会带来额外寻道,而 B+ 树的「一页装上千个键」恰好对齐磁盘的读写粒度。数据结构的选择总是跟着存储介质走。',
              },
              {
                kind: 'principle',
                title: '`ON DUPLICATE KEY` 背后的加锁顺序',
                body: [
                  '本项目用的是「插入 + 捕获 1062」而不是 `INSERT ... ON DUPLICATE KEY UPDATE`。两者都能实现幂等,但在并发与锁行为上有区别,值得说清楚。',
                ],
                steps: [
                  {
                    title: '① 唯一索引冲突时,InnoDB 加的是「插入意向锁 + 已存在记录的 S 锁」',
                    detail:
                      '插入前先要对目标位置加插入意向锁(一种间隙锁)。发现唯一键已存在时,会对那条已存在的记录加共享锁,然后返回 1062。所以「冲突」这件事本身就带了锁,不是无代价的。',
                  },
                  {
                    title: '② `ON DUPLICATE KEY UPDATE` 会升级成 X 锁',
                    detail:
                      '因为要改那一行,锁从 S 升级成 X。在高并发下,同一个 URL 的大量重复创建会在这条记录上排队,表现为「同一热点 URL 的创建请求延迟抖动」。',
                  },
                  {
                    title: '③ 所以这里选择「插入 + 失败后读回」',
                    detail:
                      '插入失败立刻按 `url_hash` 读一次,拿到赢家的 `code`。读走的是同一个唯一索引,大概率命中缓冲池,成本远低于排队等 X 锁。',
                  },
                ],
                takeaway:
                  '一句话:`ON DUPLICATE KEY UPDATE` 适合「每次冲突都要更新」的场景;如果冲突只是「已经有人建过了,我读一下就行」,那插入 + 读回更轻。',
              },
              {
                kind: 'question',
                title: 'Q151 · 间隙锁是怎么导致死锁的?怎么排查和避免?',
                questionId: 'go-index-Q151',
                intent: '考「能不能把死锁还原成一个具体的加锁顺序冲突」,而不是背「避免大事务」。',
                points: [
                  '先说间隙锁是什么:RR 隔离级别下,为了防止幻读,InnoDB 对「索引记录之间的空隙」也加锁。所以 `WHERE id BETWEEN 5 AND 10 FOR UPDATE` 锁的不是 6 行,是这段区间加两侧的间隙。',
                  '再说死锁怎么来的:两个事务以相反顺序锁两段区间。A 锁了 [5,10] 再要 [20,30],B 锁了 [20,30] 再要 [5,10],互相等。本质是**加锁顺序不一致**,和死锁四条件里的「循环等待」完全对应。',
                  '避免手段按有效性排:① 让事务内的加锁顺序一致(比如永远按主键升序批量更新);② 缩小锁范围(用唯一索引等值更新,而不是范围更新);③ 缩短事务(不要在事务里做 RPC);④ 必要时降隔离级别到 RC。',
                ],
                depth: '排查手段:`SHOW ENGINE INNODB STATUS` 的 `LATEST DETECTED DEADLOCK` 段会打印两个事务的完整 SQL 与持锁/等锁信息,这是唯一能还原现场的地方。线上还要配 `innodb_print_all_deadlocks=1`,否则只保留最后一次。',
                followup: '「RC 隔离级别下还有间隙锁吗」:基本没有,RC 只锁命中的行。所以很多高并发系统主动降到 RC,用「唯一约束 + 应用层重试」代替间隙锁——代价是幻读需要自己在业务上防。',
              },
              {
                kind: 'question',
                title: 'go-04-Q12 · database/sql 的连接池参数怎么理解?',
                questionId: 'go-04-Q12',
                intent: '考「三个参数各自防什么」,以及「为什么连接数不是越大越好」。',
                points: [
                  '`SetMaxOpenConns`:最大打开连接数。设太大不会更快——数据库的并发处理能力有上限,超过之后只是把排队从「应用侧」搬到「数据库侧」,还多了一堆上下文切换。经验值是 `CPU 核数 * 2 + 磁盘数` 量级。',
                  '`SetMaxIdleConns`:保留的空闲连接数。设得比 `MaxOpen` 小很多时,流量一波动就反复建连(每次 TCP + 认证 1-3ms),表现为「突发流量下 P99 抖动」。通常设成和 `MaxOpen` 相等。',
                  '`SetConnMaxLifetime`:连接寿命。必须小于 MySQL 的 `wait_timeout`(默认 8 小时),否则会拿到一条已被服务端单方面关闭的连接,报 `invalid connection`。本项目设 1 小时。',
                ],
                depth: '追问「怎么发现连接泄漏」:`db.Stats()` 里的 `InUse` 长期只增不减就是泄漏——通常是某条路径 `rows.Close()` 忘了调,或者 `Query` 出错后直接 return 没关。`SetConnMaxLifetime` 能缓解但不能根治。',
                followup: '「连接池满了会怎样」:`db.Query` 会阻塞等待空闲连接,直到 `ctx` 超时。所以每个查询都必须带 deadline——`context.Background()` 配一个满连接池,就是一串永久挂住的 goroutine。',
              },
              {
                kind: 'question',
                title: 'Q163 · 分布式 ID 有哪些方案?雪花算法的原理和问题?',
                questionId: 'go-index-Q163',
                intent: '考「能不能说出每种方案在什么条件下失效」,而不只是列举。',
                points: [
                  '雪花:1 位符号 + 41 位毫秒时间戳 + 10 位机器号 + 12 位序列号。单机每毫秒 4096 个,理论 QPS 约 400 万。优点是本地生成、无网络调用、趋势递增。',
                  '雪花的两个问题:① 时钟回拨——NTP 校正或虚拟机迁移会让时间倒退,回拨期间要么阻塞等待,要么发重号;② 机器号分配——10 位只能给 1024 个节点,容器环境下 Pod 频繁重建,机器号必须由外部系统分配(k8s StatefulSet 序号或 ZooKeeper 顺序节点)。',
                  '号段:一次领一批,内存发号。优点是不依赖时钟、可批量、QPS 高;缺点是 DB 故障时余量耗尽就停服,并且 ID 不连续。',
                  'Redis INCR:实现最简单,但 AOF `everysec` 丢数据会导致重启后重号——「原子」不等于「持久」。',
                ],
                depth: '选型判据一句话:能接受「停服」就选号段,能接受「重号风险」才选 Redis,能管住时钟与机器号才选雪花。三种方案没有优劣,只有「你更能接受哪种坏法」。',
                followup: '本项目的选择是号段,理由写在第 3 步:它的失效是「可见的停服」,而不是「不可见的重号」。',
              },
            ],
          },
        },
        {
          id: 'redirect-and-cache',
          title: '302 跳转与 cache-aside',
          kind: 'concept',
          questionIds: [
            'go-index-Q80',
            'go-index-Q133',
            'go-index-Q152',
            'go-05-Q7',
            'go-index-Q85',
            'go-index-Q88',
          ],
          content: {
            intro:
              '短链的性能不在写,在 302;302 的性能不在 SQL,在缓存命中率。一条链路创建一次、跳转百万次,这个读写比决定了整个架构的重心必须放在读路径上。这一节先把「为什么是 302 不是 301」讲清楚,再把 cache-aside 的四条分支逐个走一遍,最后处理两个只有真实流量才会暴露的问题:不存在的短码要不要缓存,以及客户端提前断开时该不该报错。',
            outline: [
              '302 与 301 的差别不是状态码,是「谁来决定下一次请求」',
              'cache-aside 的四条分支:命中、命中空值、未命中、回源也没有',
              '空值缓存防穿透,TTL 抖动防雪崩,两者必须同时有',
              '缓存的是数据不是响应:为什么存 STRING 而不是存整个 302',
              '打点要埋在响应之后,否则统计会拖慢跳转',
            ],
            pitfalls: [
              '用 301 做跳转——浏览器永久缓存之后,改目标、下线、统计全部失效,而且清不掉。',
              '只缓存存在的短码——被扫描器随机打的无效短码会 100% 穿透到 MySQL。',
              '缓存异常时直接返回 500——缓存是加速器,不是依赖,它挂了应该降级回源而不是让接口失败。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '302 而不是 301:把决定权留在服务端',
                body: [
                  '301 是「永久重定向」,浏览器会把它记进本地缓存,下次访问同一个短链**根本不发请求**,直接跳走。于是三件事同时失效:改目标地址(用户还跳到旧地址)、统计点击(服务端收不到请求)、下线链接(浏览器照跳)。',
                  '302 是「临时重定向」,浏览器每次都会回来问一次。代价是多一次请求,收益是服务端保留了全部控制权——这恰好是短链业务的核心价值。',
                  '[[短链卖的不是「短」,是「可控的跳转」。]]用 301 等于把这个卖点送给了浏览器缓存。',
                  '顺带记住另外两个:307 保留原方法(POST 还是 POST),308 是 307 的永久版。短链只用 GET,所以 302 足够;如果哪天要做「带参数的跳转」,要重新考虑。',
                ],
              },
              {
                kind: 'question',
                title: 'Q80 · 常见的 HTTP 状态码有哪些?301 和 302 的区别?',
                questionId: 'go-index-Q80',
                intent: '考「状态码的语义边界」,尤其是「谁缓存、缓存多久」这一层。',
                points: [
                  '1xx:101 Switching Protocols 是 WebSocket 升级用的,常规业务里见不到,但它说明「状态码按千位分类」这件事是设计约定,不是随手编号。',
                  '2xx:200 成功、201 已创建、204 无内容。本项目创建返回 200(不是 201),因为「已存在时返回老短码」也是成功,统一用 200 更简单。',
                  '3xx:301 永久(Moved Permanently)、302 临时(Found)、304 未修改(Not Modified)、307 保留方法临时、308 保留方法永久。区别有两维:是否永久(决定能不能缓存)、是否保留方法。',
                  '4xx:400 参数错、401 未认证、403 无权限、404 不存在、410 已删除、429 限流。410 值得单独用:它告诉客户端「这个东西曾经存在,现在永久没了」,比 404 更精确。',
                  '5xx:500 未预期错误、502 网关拿到坏响应、503 暂时不可用、504 网关超时。503 要配 `Retry-After`,否则客户端会立刻重试,把刚恢复的服务再打垮。',
                  '条件请求:304 不是自己出现的,它由请求头触发——客户端带上 `If-None-Match`(对应上次响应的 `ETag`)或 `If-Modified-Since`(对应 `Last-Modified`),服务端比对后只回响应头、不回归 body,带宽就省下来了。[[304 是唯一一个「不返回内容却算成功」的状态码。]]',
                ],
                depth: '追问「302 会被缓存吗」:HTTP/1.1 允许缓存 302,但要求响应里带明确的 `Cache-Control` 或 `Expires`;不带时浏览器通常不缓存。本项目在响应头里显式写 `Cache-Control: no-store`,把这个不确定性消掉。',
                followup: '「307 和 302 的实际差别」:307 要求客户端保持原方法,POST 跳转后仍是 POST;而 302 在历史上被浏览器实现成「一律改成 GET」。短链只用 GET,所以这个差别对这里不成立——但换到支付回调场景就是致命的。',
              },
              {
                kind: 'diagram',
                title: '读路径的四条分支',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    {
                      label: '① 查缓存',
                      note: 'GET link:{code},一次 RTT 内返回三态',
                    },
                    {
                      label: '② 命中真实值',
                      note: '直接 302,X-Cache: HIT,不进 service 的后续逻辑',
                    },
                    {
                      label: '③ 命中空值',
                      note: '确定不存在,直接 404,一次 DB 都不碰',
                    },
                    {
                      label: '④ 未命中 → 回源',
                      note: '查 MySQL,查到回填缓存;查不到写空值缓存',
                    },
                    {
                      label: '⑤ 回源也失败',
                      note: 'DB 错误返回 500,但要和「不存在」严格区分',
                    },
                  ],
                  caption:
                    '五步里最重要的是 ③ 和 ⑤:③ 是空值缓存的价值所在——它把「被扫描器随机打」这种流量全挡在 Redis;⑤ 则要求代码严格区分「查不到」和「查出错」,把两者混成同一个 404,会让真实的数据库故障被伪装成「链接不存在」,排查时毫无线索。',
                },
              },
              {
                kind: 'principle',
                title: 'cache-aside 的四步,以及每一步的失败姿态',
                body: [
                  'cache-aside(旁路缓存)是最常用的读缓存模式:应用自己管缓存,读的时候先查缓存,未命中再查库并回填。它的关键在于「每一步失败时怎么办」。',
                ],
                steps: [
                  {
                    title: '① 查缓存:失败当未命中,不当错误',
                    detail:
                      'Redis 超时、连接拒绝、序列化失败,一律按「未命中」处理并继续走 DB。把缓存故障放大成接口故障,是最没必要的自伤——缓存挂了的正确表现是「变慢」,不是「不可用」。',
                  },
                  {
                    title: '② 未命中查库:这里才是真正的错误源',
                    detail:
                      '`sql.ErrNoRows`(GORM 里是 `RowsAffected == 0`)是「不存在」,其它错误是「查不了」。前者要写空值缓存并返回 404,后者要返回 500 并且**不能**缓存——把一次数据库抖动缓存成「这个链接不存在」,是最坏的一种污染。',
                  },
                  {
                    title: '③ 回填:失败不影响本次响应',
                    detail:
                      '回填失败只意味着下次还要再查一次库,不影响本次返回。所以这里是 `_ = cache.Set(...)`,把错误丢掉是故意的——但记得打点,否则你永远不会知道缓存命中率为什么上不去。',
                  },
                  {
                    title: '④ 返回前判过期:业务时间与缓存时间要分开',
                    detail:
                      '过期判断用的是「当前时间 vs `expired_at`」,而不是「缓存有没有值」。因为缓存 TTL 是工程参数(30 分钟),业务过期是领域概念(2026-12-31 到期),两者混用会导致「链接明明过期了还能跳」。',
                  },
                ],
                takeaway:
                  '四步的失败姿态总结成一句:缓存错 → 降级;库查不到 → 负缓存;库出错 → 500 且不缓存;回填错 → 忽略但打点。这四种处理各不相同,混掉任何一种都会在生产上留下一个难查的 bug。',
              },
              {
                kind: 'code',
                title: '`cache/link.go`:三态与 TTL 抖动',
                lang: 'go',
                code:
                  'const missMarker = "\\x00" // 用控制字符,避免和真的叫 "null" 的 URL 撞车\n\nfunc (c *RedisLinkCache) Get(ctx context.Context, code string) (string, model.CacheState, error) {\n\tv, err := c.rdb.Get(ctx, key(code)).Result()\n\tif errors.Is(err, redis.Nil) {\n\t\treturn "", model.CacheMiss, nil\n\t}\n\tif err != nil {\n\t\treturn "", model.CacheMiss, err // 缓存出错也算未命中,由调用方降级\n\t}\n\tif v == missMarker {\n\t\treturn "", model.CacheNegative, nil\n\t}\n\treturn v, model.CacheHit, nil\n}\n\nfunc (c *RedisLinkCache) Set(ctx context.Context, code, url string) error {\n\treturn c.rdb.Set(ctx, key(code), url, c.ttl+jitter()).Err()\n}\n\nfunc (c *RedisLinkCache) SetNegative(ctx context.Context, code string) error {\n\treturn c.rdb.Set(ctx, key(code), missMarker, negativeTTL+jitter()).Err()\n}\n\nfunc jitter() time.Duration {\n\treturn time.Duration(rand.Int63n(int64(time.Minute)))\n}\n',
                caption:
                  '三态是这段代码最重要的设计:只用 `(string, bool)` 表达命中/未命中,就丢掉「命中的是空值」这个信息,空值缓存等于没做。另外注意 `SetNegative` 的 TTL 是 60 秒而不是 30 分钟:空值缓存只是挡穿透,一旦链接真的被创建,用户应该在一分钟内就能访问。',
                notes: [
                  {
                    line: 'if errors.Is(err, redis.Nil)',
                    text: '`redis.Nil` 是「key 不存在」,不是错误。用 `errors.Is` 而不是 `==`,因为 go-redis 未来可能包装它。',
                  },
                  {
                    line: 'return "", model.CacheMiss, err',
                    text: '返回错误但状态仍是 `CacheMiss`。调用方据此决定「降级继续」还是「直接失败」——本项目选择降级。',
                  },
                  {
                    line: 'c.ttl + jitter()',
                    text: '0-60 秒的随机抖动。一批同时写入的 key 不会在同一秒集体过期,这是防雪崩最便宜的一招,不需要任何额外组件。',
                  },
                ],
                version: 'Go 1.23',
                env: 'docker compose 的 Redis 7.2',
                verified: true,
              },
              {
                kind: 'concept',
                title: '空值缓存与 TTL 抖动:两个不同的问题,两套解法',
                body: [
                  '空值缓存解决的是**穿透**:请求的 key 根本不存在,于是每次都绕过缓存打到数据库。短链天然会被扫描器随机打(6 位 base62 的空间足够大,但扫描器不管),不做空值缓存,DB 的 QPS 会和总 QPS 一样高。',
                  'TTL 抖动解决的是**雪崩**:大量 key 在同一时刻过期,请求同时回源。批量预热、批量导入、整点刷新的场景最容易触发。解法就是在基础 TTL 上叠加随机量,把过期时刻打散到一个区间里。',
                  '第三个问题是**击穿**:单个热点 key 过期瞬间,大量并发请求同时回源。它需要的是「合并回源」(singleflight 或互斥重建),空值缓存和抖动都解决不了。',
                  '[[三个词经常被混着答,判据是「出问题的是多少 key」:不存在的 key 是穿透,一堆 key 同时过期是雪崩,一个热点 key 过期是击穿。]]',
                ],
              },
              {
                kind: 'compare',
                title: '穿透的三种解法:成本与副作用',
                head: ['方案', '挡住什么', '额外成本', '副作用'],
                rows: [
                  [
                    '空值缓存',
                    '重复查询同一个不存在的 key',
                    '一次 Redis 写入 + 一点内存',
                    '大量随机 key 会污染缓存,需要短 TTL 与容量上限',
                  ],
                  [
                    '布隆过滤器',
                    '所有不存在的 key,一次内存判断',
                    '需要预热全量 key,且只增不删',
                    '有假阳性(误判为存在),删除 key 后过滤器不会同步',
                  ],
                  [
                    '接口层参数校验',
                    '格式就不合法的请求',
                    '几乎为零',
                    '只能挡明显畸形的,挡不住「格式合法但不存在」',
                  ],
                ],
                note: '三者不是替代关系。本项目三层都做了:`shortcode.Valid` 挡格式,空值缓存挡重复,布隆过滤器留到 key 量级上千万之后再引入——它需要预热全量 key,阶段 1 引入是过度设计。',
                caption: '选解法的判据是「假阳性能不能接受」:布隆过滤器会把少量存在的 key 误判为不存在,对短链来说表现为「偶发 404」,这个副作用在用户体验上是不可接受的,所以它只能作为第二道防线,不能替代空值缓存。',
              },
              {
                kind: 'question',
                title: 'Q133 · 缓存穿透、击穿、雪崩分别是什么?怎么解决?',
                questionId: 'go-index-Q133',
                intent: '考「能不能先分清三者」——答混了,后面所有解法都是错的。',
                points: [
                  '穿透:查一个**不存在**的 key,缓存永远不命中,每次都打 DB。解法:空值缓存、布隆过滤器、参数校验。',
                  '击穿:一个**热点** key 过期瞬间,大量并发同时回源。解法:互斥重建(只放一个请求回源)、逻辑过期(不设 TTL,后台异步刷新)。',
                  '雪崩:**大量** key 同时过期,或缓存整体不可用。解法:TTL 抖动、多级缓存、缓存集群高可用、限流兜底。',
                  '再补一句降级:三个问题的最后一道防线都是「别让 DB 被打死」——限流 + 熔断 + 返回兜底数据,比任何缓存技巧都更兜底。',
                ],
                depth: '追一句「逻辑过期怎么实现」:value 里存 `{data, expireAt}`,不设 Redis TTL;读到过期数据时先返回旧值,同时异步起一个 goroutine 刷新。它的代价是「短时间读到不一致」,收益是「永不阻塞」——对短链这种能容忍几十毫秒旧值的业务,这是最优解。',
                followup: '「布隆过滤器为什么不能删元素」:它用多个哈希位共同标记一个元素,删除会把这些位清零,而它们可能同时被其它元素共享,于是产生假阴性——把「存在」误判成「不存在」,后果比假阳性严重得多。',
              },
              {
                kind: 'concept',
                title: '缓存的是数据,不是响应',
                body: [
                  '一个常见的设计错误是把整个 HTTP 响应(状态行 + 头 + body)缓存起来。看起来省事,实际上把「协议层」和「数据层」绑死了:改一个响应头要清缓存,加一个统计字段要清缓存,不同客户端要不同响应时直接没法做。',
                  '本项目的做法是只缓存 `url` 这一个字符串。`302` 状态码、`X-Cache` 头、`Cache-Control` 都由 handler 每次现算。',
                  '[[判据:缓存里应该只有「领域数据」,凡是「怎么呈现」的东西都不该进去。]]这条判据在 CDN 场景下反过来——CDN 就是缓存响应,因为它缓存的是「已经渲染好的视图」,而服务端缓存的是「数据」。',
                  '顺带一个工程收益:只缓存字符串时,序列化成本几乎为零。缓存整个响应要 `json.Marshal`,在十万 QPS 的读路径上,这一项能占到 CPU 的两位数百分比。',
                ],
              },
              {
                kind: 'question',
                title: 'Q152 · Redis 有哪些数据结构?分别用在什么场景?',
                questionId: 'go-index-Q152',
                intent: '考「同一份数据在不同结构下的命令复杂度」,而不是背五种名字。',
                points: [
                  'String:本项目用它存短链映射(`link:{code}` → url)和空值标记。优势是单次读一个 key,复杂度 O(1),没有任何额外索引开销。',
                  'Hash:适合存对象的多个字段(比如一个用户的多个属性),可以只取一个字段而不反序列化整个对象。本项目阶段 3 会用它存单条短链的 PV/UV 聚合。',
                  'ZSet:排行榜的标准答案。阶段 3 的「Top 短链」会用 `ZINCRBY` 累加,`ZREVRANGE` 取前 N。底层是跳表 + 哈希表,范围查询 O(log N)。',
                  'List / Set:List 做简单队列(用 `LPUSH` + `BRPOP`),也可以用 `LTRIM` 把列表裁成定长的「最近 N 条」;Set 做去重计数(UV 的精确版,但内存代价高),`SRANDMEMBER` 还能做随机抽样,比如抽奖、灰度名单。',
                  'Bitmap / HyperLogLog:Bitmap 是 String 的位运算视图,10 亿用户按位标记只占 125MB,签到、活跃、是否已读这类布尔场景都用它;HyperLogLog 用固定的 12KB 估基数,标准误差 0.81%,亿级 UV 用它而不是 Set。`Stream` 是 5.0 之后的消息日志,支持消费组和 ACK,但要做可靠队列,本项目还是直接用 Kafka——Redis 只留聚合,不承担消息可靠性。',
                ],
                depth: '追问「为什么不用 Hash 存整个 link 对象」:因为读路径只需要 `url` 一个字段,用 Hash 会多一次字段解析;而且 Hash 的过期只能设在 key 上,没法给单个字段设 TTL。**选结构的判据是「读的时候要拿多少字段」**,不是「数据结构像不像」。',
                followup: '「为什么不用 MySQL 存计数器」:每次 `UPDATE count = count + 1` 都是一次行锁加写盘,热点行直接成为瓶颈;Redis 单线程执行,天然把这类累加串行化,一条命令就完事。',
              },
              {
                kind: 'question',
                title: 'go-05-Q7 · Redis 常用数据结构及底层实现?',
                questionId: 'go-05-Q7',
                intent: '考「编码转换的阈值」与「为什么要有多种编码」。',
                points: [
                  'String:底层是 SDS(简单动态字符串),相比 C 字符串多了长度字段,所以 `STRLEN` 是 O(1),并且二进制安全(可以存 `\\x00`)。本项目正是靠这一点才能用控制字符当空值标记。',
                  'Hash:元素少且短时用 listpack(紧凑数组,省内存),超过阈值(默认 128 个字段 / 64 字节)转成 hashtable。转换是单向的,转过去不会转回来。',
                  'ZSet:元素少时用 listpack,多了转跳表 + 字典。跳表支持范围查询且实现比平衡树简单,这是 Redis 选它而不是红黑树的原因。',
                  'List:quicklist(链表 + 每个节点是一个 listpack),兼顾随机访问与内存碎片。',
                ],
                depth: '一句话串起来:Redis 几乎所有结构都有「小数据紧凑编码 + 大数据通用编码」两套,阈值可配。这解释了为什么「一个 Hash 里塞十万个字段」会突然变慢——不是数据量的问题,是编码切换的瞬间内存与操作复杂度同时跳变。',
                followup: '「listpack 和 ziplist 是什么关系」:listpack 是 ziplist 的替代品,解决了 ziplist 在中间插入时可能引发的连锁更新(每个节点都记录前一个节点的长度,一个变了后面全要改)。',
              },
              {
                kind: 'concept',
                title: '打点埋在响应之后,是阶段 3 的钩子',
                body: [
                  '跳转接口将来要统计 PV/UV,最自然的写法是在 handler 里同步写一条记录。但这个接口是全站 QPS 最高的路径,多一次写库就等于把读路径的吞吐砍掉一个数量级。',
                  '正确做法是「先返回 302,再把事件丢进内存队列,由后台批量投递」。用户感知的延迟只有 302 本身,统计的延迟可以是秒级——这两件事本来就不需要同步。',
                  '这一段代码本节不写,但位置要提前定好:[[在 `c.Redirect` 之后、`return` 之前,是唯一正确的位置。]]放在之前会拖慢跳转,放在别的中间件里会拿不到 code 参数。',
                  '顺带说清一个取舍:进程崩溃时内存队列里的事件会丢。这是有意的——统计丢几条可以接受,跳转变慢不可接受。要「不丢」就得落盘或同步写,那是另一个量级的成本。',
                ],
              },
              {
                kind: 'question',
                title: 'Q85 · Go 的 netpoll 是怎么工作的?为什么少量线程就能撑住大量连接?',
                questionId: 'go-index-Q85',
                intent: '考「阻塞的错觉是怎么造出来的」:goroutine 看起来在阻塞读,实际线程并没有被占住。',
                points: [
                  '一句话原理:Go 把 socket 设成非阻塞,注册到 epoll;goroutine 读不到数据时不阻塞线程,而是把自己挂到该 fd 的等待队列上,然后 `gopark` 让出 P。',
                  '谁来唤醒:netpoll 线程(或 sysmon)在 epoll 返回可读事件后,把对应的 goroutine 重新放回运行队列。所以「阻塞」只发生在 goroutine 层面,线程始终在跑别的 G。',
                  '为什么快:线程数不再等于连接数。1 万个连接可能只占几十个 M,因为每个阻塞的 goroutine 只花 2KB 栈,而不是一个 1MB 的线程栈。',
                ],
                depth: '追问「那 file IO 呢」:普通文件的读写不走 netpoll,因为磁盘文件始终「就绪」,epoll 对它没意义。所以读大文件会真的阻塞一个线程——这也是为什么高并发服务里要避免同步读大文件,或者用 `io_uring`(Go 目前还没原生支持)。',
                followup: '「GOMAXPROCS 设小了会怎样」:netpoll 唤醒了 goroutine,但没有 P 可以跑它们,吞吐直接被 P 的数量卡住。容器里要按 CPU limit 设而不是按宿主机核数——这也是 Go 1.25 改容器感知 GOMAXPROCS 的原因。',
              },
              {
                kind: 'question',
                title: 'Q88 · 服务端还没处理完请求,客户端就关闭了连接,会发生什么?',
                questionId: 'go-index-Q88',
                intent: '考「写失败该不该报错」这个判断,以及它和「业务成功」的关系。',
                points: [
                  '先看现象:handler 照常执行,`c.Redirect` 写响应时内核发现对端已发 FIN/RST,写操作返回 `EPIPE` 或 `ECONNRESET`。Go 的 `http` 包会把这个错误交给 `ErrorLog`,不会 panic。',
                  '关键是判断:短链的 302 已经「生效」了吗?没有——用户没收到重定向,就不会跳转。所以统计上这次点击不该计数,但也不该返回 500(没人能收到这个 500)。',
                  '正确做法:把写错误当「正常现象」记录(降级为 debug 日志),不影响业务统计口径;真正的错误(查库失败)才用 error 级别。',
                ],
                depth: '再深一层:HTTP/1.1 下客户端断开无法可靠检测,服务端只能靠写失败得知;而「请求还没开始处理客户端就走了」这种情况,服务端完全无感,会照常执行完整逻辑。所以要防「客户端断开导致的无效计算」,只能靠 `context` 取消 —— 本项目里 `c.Request.Context()` 会随连接关闭而取消,`db.WithContext(ctx)` 因此能提前终止查询。',
                followup: '「那怎么统计『用户真的看到了跳转』」:服务端只能统计「302 写出去了」,真正的到达要靠落地页打点或前端埋点。这两个口径天生不同,做数据看板时必须说清用的是哪一个,否则数字永远对不上。',
              },
              {
                kind: 'analogy',
                title: '短码是图书馆的索书号',
                text: '短码之于 URL,很像索书号之于书名。书名又长又可能有重名,索书号短、唯一、而且直接告诉你书在哪一排哪一格;想找书的时候,你查的是索书号,不是书名。',
                mapping: [
                  { real: '书名', tech: '原始长 URL(长、可能重复、不好传播)' },
                  { real: '索书号', tech: '短码(短、唯一、可直接定位)' },
                  { real: '图书馆的索引卡', tech: 'uk_code 唯一索引(按索书号查行)' },
                  { real: '书架上的实际位置', tech: '聚簇索引的主键 ID' },
                ],
                limit: '这个类比有两处不成立:第一,图书馆的书会下架,索书号会被回收复用;短链的短码一旦发出就不该复用,否则老链接会指向新目标。第二,索书号是人编的、有序的;短码是算法生成的、加了盐的——它故意让顺序不可见,正是为了防止别人顺着号爬。',
              },
              {
                kind: 'explore',
                title: '边缘缓存与 CDN:为什么短链天然适合放在离用户更近的地方',
                from: '这一节把缓存放在了应用与 Redis 之间。但短链的响应极简单(一个 302 + 一个 Location),这种「响应小、逻辑薄、读多写少」的形状,恰好是边缘计算最擅长处理的。',
                branches: [
                  {
                    direction: 'lateral',
                    related: 'CDN 的边缘缓存与 Cloudflare Workers / 边缘 KV',
                    basis:
                      '两者都在回答「能不能不回到源站就把请求答完」。判据是同一个:响应是否可缓存、缓存失效能否被接受。短链的 302 只要允许短暂不一致,就完全可以在边缘答完。',
                    shared:
                      '都以 key-value 查询为主,都在读路径上做缓存,都靠 TTL 控制一致性窗口。',
                    diff:
                      'CDN 缓存的是**响应**,受 HTTP 缓存语义约束(`Cache-Control`、`Vary`、`Age`),所以想「缓存 302」必须显式声明;边缘 KV 缓存的是**数据**,你在边缘代码里自己决定怎么用。[[前者省事但受协议约束,后者灵活但要自己写一致性。]]',
                    value:
                      '面试里被问「短链怎么扛千万 QPS」,最有效的答案不是「加 Redis」,而是「把 302 放到边缘:99% 的请求根本不回源」。这句话背后是「缓存位置比缓存技术更重要」的判断。',
                  },
                  {
                    direction: 'outward',
                    related: 'DNS 层的跳转与「无服务端短链」',
                    basis:
                      '如果把短码直接编进域名(`abc.example.com` → CNAME),跳转可以在 DNS 层完成,连 HTTP 请求都不需要。这是把「查表」推到协议栈更下层。',
                    shared:
                      '都是「短标识 → 长目标」的映射,都靠一次查表完成跳转。',
                    diff:
                      'DNS 方案没有 HTTP 状态码,也就没有 302/301 的语义,更没有点击统计——因为请求根本没到你的服务器。它的延迟更低(一次 DNS 查询),但完全失去可控性。[[这就是「控制权与性能」的又一次交换。]]',
                    value:
                      '这解释了为什么主流短链仍然坚持 302:短链的商业价值在于「知道谁点了、能改目标、能下线」,而这些都要求请求回到你这里。想清楚这一点,就不会在方案评审里被「DNS 更快」带走。',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: 'read-path',
      title: 'B · 读路径的性能与正确性',
      goal: '把 99% 的读流量挡在数据库之外,并且不牺牲一致性',
      summary:
        '短链是极端的读多写少:一条链接创建一次、跳转百万次。这一阶段讲清三件事——更新路径上缓存与库的一致窗口、热点 key 的两级缓存与回源合并、以及如何用 benchmark 与 pprof 证明优化真的生效。它的验收标准不是「跑通了」,而是「有数字」。',
      lessons: [
        {
          id: 'cache-consistency',
          title: '更新路径与缓存一致性',
          kind: 'concept',
          questionIds: [
            'go-index-Q134',
            'go-index-Q135',
            'go-index-Q5',
            'go-index-Q6',
            'go-index-Q44',
            'go-index-Q154',
          ],
          content: {
            intro:
              '读路径可以容忍几十毫秒的旧值,写路径不行——用户刚改完目标地址,刷新却还跳到旧地址,这是会被告警的体验问题。这一节先把「一致性」从一个模糊的要求,变成一个可以写在代码里的窗口:先更库还是先删缓存、删了要不要延迟再删一次、本地缓存那一层又该怎么失效。讲完你会得到一个明确的结论——强一致在这里既不必要也不划算,真正要做的是把不一致的窗口压到用户感知不到的长度。',
            outline: [
              '一致性不是「有没有」,是「窗口多大、谁能接受」',
              '先更库再删缓存:为什么是删不是改',
              '延迟双删与 binlog 订阅:两种把窗口压小的办法',
              '本地缓存的代价:多实例之间怎么失效',
              '热点 key 的两级缓存与回源合并',
            ],
            pitfalls: [
              '先删缓存再更库——并发读会在删除与更新之间把旧值重新填回去。',
              '以为「删缓存」是原子的——删除失败时旧值会一直留着,需要重试或 binlog 兜底。',
              '给本地缓存设了很长的 TTL 却没有失效通道——多实例下表现为「有的机器跳新地址,有的跳旧地址」。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '一致性不是有没有,是窗口多长、谁能接受',
                body: [
                  '先把「一致性」拆成三档,否则这句话根本没法讨论:强一致(任何时刻读到的都是最新值)、读己所写(自己刚写的自己一定读到)、最终一致(一段时间后收敛)。绝大多数业务真正需要的是第二档,而缓存能提供的上限也只是第二档。',
                  '为什么不做强一致:缓存和数据库是两个独立系统,要让它们在同一时刻对外呈现同一个值,就得在写路径上加一把跨系统的锁,把「写库 + 删缓存」包成一个原子操作。这把锁的持有时间要覆盖一次 UPDATE 加一次 DEL,期间所有读请求都得等——[[缓存本来是为了削掉读压力,加锁之后它反而变成了一个串行队列。]]',
                  '所以在短链这个场景里,真正要回答的不是「能不能强一致」,而是两个具体问题:不一致的窗口有多长?窗口里读到旧值的人会做什么?改目标地址这条业务,窗口 2 毫秒,读到旧值的人只是多点一次跳转——可以接受;如果是转账余额,同样 2 毫秒也不可接受。[[判断标准是业务后果,不是技术名词。]]',
                  '这条判据还有一个反作用力:它决定了你能用多激进的优化。能容忍 2 毫秒,就可以用「更库后删缓存」;能容忍 1 秒,就可以加本地缓存配短 TTL;完全不能容忍,那正确答案是别加缓存。',
                ],
              },
              {
                kind: 'diagram',
                title: '先更库再删缓存:窗口到底藏在哪里',
                diagram: {
                  type: 'sequence',
                  actors: ['写请求 A', 'MySQL', 'Redis', '读请求 B'],
                  messages: [
                    {
                      from: '写请求 A',
                      to: 'MySQL',
                      text: '`UPDATE link SET url = ? WHERE code = abc`(耗时 1–3ms)',
                    },
                    { from: 'MySQL', to: '写请求 A', text: 'OK —— 库里已经是新值了' },
                    { from: '读请求 B', to: 'Redis', text: '`GET link:abc`' },
                    {
                      from: 'Redis',
                      to: '读请求 B',
                      text: '旧 URL(还没人删它)—— !!窗口就是从 UPDATE 提交到这一刻!!',
                    },
                    { from: '读请求 B', to: '读请求 B', text: '302 到旧地址,用户看清了一个已经不生效的页面' },
                    { from: '写请求 A', to: 'Redis', text: '`DEL link:abc`' },
                    {
                      from: 'Redis',
                      to: '写请求 A',
                      text: '1 —— 之后的读会回源拿到新值',
                      reply: true,
                    },
                  ],
                  caption:
                    '注意窗口的两端:起点是 UPDATE 提交,终点是 DEL 返回。它不是一个模糊的「短暂不一致」,而是一段能画在时序图上的真实时间——通常 1–3 毫秒,由一次 UPDATE 加一次 DEL 的往返决定。想压小它只有两条路:让 DEL 更快(它已经在一个往返里了),或者干脆不在业务里删。[[能被画出来的窗口,才能被评估。]]',
                },
              },
              {
                kind: 'compare',
                title: '四种写路径策略,分水岭在「坏的时候怎么坏」',
                head: ['策略', '不一致窗口', '失败了会怎样', '额外代价', '结论'],
                rows: [
                  [
                    '先更库 → 删缓存',
                    '一次 DEL 的往返,1–3ms',
                    '删失败:旧值留到 TTL 到期',
                    '无',
                    '本项目采用',
                  ],
                  [
                    '先更库 → 更缓存',
                    '接近 0',
                    '更失败:缓存里新旧值不确定',
                    '要版本号或 CAS 防乱序',
                    '收益小而风险大',
                  ],
                  [
                    '先删缓存 → 更库',
                    '删到更库之间,任意长',
                    '被回填的旧值一直留着',
                    '要延迟双删来补救',
                    '自己给自己造窗口',
                  ],
                  [
                    '订阅 binlog 删缓存',
                    '一条复制链路,百毫秒级',
                    '消费失败可重试,不会永久脏',
                    '多一套 CDC 组件与运维',
                    '数据量大时再上',
                  ],
                ],
                note: '第二行值得单独说:两个写请求并发时,「更新缓存」的顺序可能与「更新数据库」的顺序相反——A 先写库、B 后写库,但 B 先更缓存、A 后更缓存,最后缓存里是 A 的旧值、库里是 B 的新值,这个脏值会一直留到 TTL 到期。删除没有这个问题:删除是幂等的。',
                caption:
                  '四行里只有第一行的坏法是「可自愈」的:删失败不改变库里的值,只是让缓存多活一会儿,而 TTL 是兜底。[[选策略时问的不是「哪种更快」,而是「出错时它会不会留下不会自己消失的脏数据」。]]',
              },
              {
                kind: 'principle',
                title: '延迟双删:那个 sleep 是猜的',
                body: [
                  '有人会问:先删缓存再更库不是更快吗?快是快,但那段时间里任何一个读请求都会把旧值重新填回缓存,而这次回填的旧值会留到 TTL 到期。延迟双删就是为补这个洞而生的。',
                ],
                steps: [
                  {
                    title: '① 先删一次缓存',
                    detail:
                      '清掉更库之前可能存在的旧值,让后续读去回源。但这一步的收益是有限的——如果紧接着就更库,回源读到的仍然是旧值。',
                  },
                  {
                    title: '② 更库',
                    detail:
                      '真正的状态变更只有这一步。它成功之后,数据库里是唯一真值,其余所有副本(缓存、本地缓存、从库)都只是它的投影。',
                  },
                  {
                    title: '③ sleep 一段「足够覆盖回填」的时间',
                    detail:
                      '这是整个方案最脆弱的地方:sleep 多久?它要覆盖的是「并发读请求从回源到写入缓存」的最长耗时,而这个值随负载、主从延迟、GC 停顿一起变化。猜小了没清干净,猜大了写请求要多等几十上百毫秒。',
                  },
                  {
                    title: '④ 再删一次',
                    detail:
                      '把窗口内被回填的旧值清掉。这一次删完,窗口才真正闭合——但注意它闭合的前提是「在 sleep 期间没有新的回填」,而这一点在高并发下并不成立。',
                  },
                ],
                takeaway:
                  '延迟双删不是错的,它是「没有更好的基础设施时,用时间换正确性」的折中。一旦有了 binlog 订阅或消息队列,它就该被替换掉——[[把正确性建立在一个 sleep 常量上,本质上是把不确定性藏进了代码。]]',
              },
              {
                kind: 'concept',
                title: 'binlog 订阅:把删缓存从业务里摘出去',
                body: [
                  '业务里删缓存有两个绕不过去的问题:删失败了怎么办?写请求要不要等它?binlog 订阅把这两个问题一起消掉——数据库的变更日志是既成事实,消费端跟着删就行,失败就重试,完全不影响写请求的响应时间。',
                  '代价是延迟:从 UPDATE 提交到消费端 DEL,中间隔着一个复制链路,通常是几十到几百毫秒。所以它换来的是「不会永久脏」,不是「更快」。[[它把「删缓存失败」从业务故障降级成了延迟生效——这是可用性的提升,不是性能的提升。]]',
                  '消费端要满足三个条件才算能用:幂等(重复消费就是多删一次,天然安全)、按 code 分区(同一个 key 的变更必须有序,否则后到的旧值可能覆盖新值)、可重放(消费位点要能回溯,否则一次 bug 就得全量重建缓存)。',
                  '还有一个容易被忽略的收益:它是唯一能覆盖「绕过应用直接改库」的机制。DBA 手工修数据、别的服务直接写这张表,业务层删缓存都感知不到,binlog 能。',
                ],
              },
              {
                kind: 'concept',
                title: '本地缓存是第二层,也是最难失效的一层',
                body: [
                  '当单个 key 的 QPS 高到 Redis 单分片扛不住时,唯一有效的办法是把这一层也搬到进程内。但本地缓存有个本质问题:它有几份取决于你有几个实例,而 Redis 只有一份。删 Redis 里的 key,动不了任何一台机器内存里的副本。',
                  '三条失效通道,成本依次上升:短 TTL(1–3 秒)最省事,窗口就等于 TTL,不需要任何通道,代价是总有那么几秒读到旧值;版本号轮询(每秒拉一次全局版本号,变了就整体失效)把窗口压到 1 秒内,但每个实例都要多一次请求;pub/sub 广播(删除时 publish,各实例收到就删)窗口最小,可消息丢了就永久脏,还得靠 TTL 兜底。',
                  '[[实例越多,越应该靠 TTL 而不是靠广播。]]因为广播的可靠性问题会随实例数放大:100 个实例里只要有一个没收到,它就一直是脏的,而你很难发现是哪一台。',
                  '顺带说清本地缓存和 sync.Map 的关系:sync.Map 只是「并发安全的 map」,它没有容量上限、没有淘汰、没有过期。拿它当缓存用,第一步就得自己补上 LRU 或者「分片 + 定期清理」,否则它会在流量高峰时把内存吃满。',
                ],
              },
              {
                kind: 'question',
                title: 'Q134 · 缓存和数据库的一致性怎么保证?',
                questionId: 'go-index-Q134',
                intent: '考「能不能说清不一致窗口与补偿手段」,而不是背「先更库再删缓存」这七个字。',
                points: [
                  '先说方案名与形态:Cache Aside——读 miss 回填,写更库后删缓存。它的正确性不依赖任何锁,只依赖「删除是幂等的」。',
                  '再说为什么删不是改:并发写的两个请求,更库顺序与更缓存顺序可能相反,最后缓存里留下旧值;删除没有这个问题,删两次等于删一次。',
                  '然后说顺序:先更库再删缓存。反过来先删缓存,在「删完」到「更完」之间任何读请求都会把旧值回填,而这份旧值会一直留到 TTL 到期。',
                  '最后给更强方案与它的代价:订阅 binlog(Canal / Debezium)异步删缓存,和业务解耦、失败可重试,代价是多一套 CDC 组件、延迟从毫秒变百毫秒。',
                  '收尾一句判据:强一致场景不要用缓存;想用锁保证缓存与库的强一致,等于把读吞吐换成串行,不划算。',
                ],
                depth:
                  '追问「删缓存失败了怎么办」:两件事一起做——把删除放进重试队列(指数退避),同时给缓存一个较短的 TTL 兜底。[[TTL 是最后一道防线:所有主动失效手段都可能失败,只有它会自己到期。]]',
                followup:
                  '再问「主从延迟会不会让回填读到旧值」:会。删缓存之后读请求回源,如果这时从库还没同步到新值,回填的就是旧值。本项目回源只读主库,就是为了避开这个坑;读写分离的架构里必须显式区分「可以读从库的查询」和「必须读主库的查询」。',
              },
              {
                kind: 'question',
                title: 'Q154 · Redis 主从复制和集群模式有什么区别?',
                questionId: 'go-index-Q154',
                intent: '考「异步复制带来的一致性代价」,而不是背哨兵和 Cluster 的定义。',
                points: [
                  '主从:异步复制。首次全量(RDB + 缓冲区),之后增量(`repl_backlog` 环形缓冲)。写主读从,从库天然可能落后。',
                  '哨兵(Sentinel):监控 + 自动故障转移,解决主节点单点问题,但仍然是单主写入,容量受单机内存限制。',
                  'Cluster:16384 个槽位分片,多主多从,支持水平扩容;代价是跨槽的多 key 操作要 hash tag(`{user1}:a`),事务与 Lua 只能在单槽内生效。',
                  '和这一课的关系:主从延迟是「缓存之外的第二类不一致窗口」。缓存的不一致由你的代码负责收敛,主从的不一致由复制机制负责收敛——两者叠加时,窗口是相乘的,不是相加的。',
                ],
                depth:
                  '追问「为什么是 16384 个槽,不是 65536」:槽位信息要随心跳包在节点间传播,65536 个槽的位图是 8KB,16384 个是 2KB;集群规模在千节点以内时,16384 已经足够均匀,再大只是浪费心跳带宽。这个数字是「带宽」与「分布均匀度」的折中,不是随手定的。',
                followup:
                  '再问「脑裂会怎样」:主节点网络分区后仍接受写入,哨兵在另一侧选出新主;分区恢复后旧主降级为从,它的写入被全量同步覆盖——这段时间的数据直接丢失。缓解手段是 `min-replicas-to-write`:从库数量或延迟不达标时主节点拒绝写入,用可用性换一致性。',
              },
              {
                kind: 'question',
                title: 'Q5 · map 并发写为什么会 panic?如何检测和规避?',
                questionId: 'go-index-Q5',
                intent: '考「fatal error 与 panic 的区别」,这是区分「背过」和「踩过」的分水岭。',
                points: [
                  '原因:map 不是并发安全的。运行时用 `hmap.flags` 里的 `hashWriting` 位做检测,发现两个 goroutine 同时进入写路径,直接 `fatal error: concurrent map writes`。',
                  '关键区别:这是 fatal error 不是 panic。`recover` 抓不到,defer 不执行,进程立刻退出——[[线上表现是「进程无故消失」,日志里连一个堆栈都没有。]]',
                  '只读并发是安全的:多个 goroutine 同时读没有任何问题,前提是没有人在写。',
                  '检测:`go test -race` 或 `go run -race`,它能直接指出读和写分别发生在哪一行;而 fatal error 只告诉你「有人并发写了」。',
                  '规避三条路:`sync.RWMutex` 包一层(通用)、`sync.Map`(读多写少且 key 集合稳定)、分片锁(按 key 哈希取模,争用降到 1/N)。',
                ],
                depth:
                  '追问「为什么本地缓存那一层特别容易踩」:因为它有「回填」这个动作——读 miss 之后要写回去。于是「读多写少」的假设在这里不成立,流量高峰时每个 miss 都是一次写。[[给 map 加读写锁时,要按「写操作的真实频率」估,而不是按「业务上看起来是读为主」估。]]',
                followup:
                  '再问「分片锁怎么分」:按 key 的哈希对片数取模,片数取 2 的幂,每片一把 `sync.Mutex`(分片之后争用已经很低,不需要 RWMutex)。好处是并发度提升到 N 倍;坏处是凡是「遍历全部 key」的操作(容量统计、全量失效)都要锁住所有分片,这类操作必须罕见。',
              },
              {
                kind: 'question',
                title: 'Q6 · sync.Map 的适用场景是什么?为什么官方说大多数情况不该用它?',
                questionId: 'go-index-Q6',
                intent: '考「它为什么快、又为什么大多数情况不该用」,两句话都要能落到实现上。',
                points: [
                  '实现:两个 map。`read` 是只读快照(用 `atomic.Pointer` 加载,读路径完全无锁),`dirty` 是可写副本,`misses` 计数在 miss 累积到一定程度时把 dirty 升级成 read。',
                  '适合两类场景:key 基本只增不删(缓存、注册表、连接表);多个 goroutine 各自读写不相交的 key(每个连接一个槽位)。',
                  '不适合写多的场景:每次新增 key 都可能触发 dirty 升级,而升级要复制整张 read——写越多越亏,还不如一把锁。',
                  '也不适合「读-改-写」:`Load` 之后 `Store` 不是原子的,计数类需求要用 `sync/atomic` 或加锁。',
                  '和普通 map + RWMutex 的对比:**读多写少且 key 稳定**时 sync.Map 赢;其它情况 RWMutex 版通常更快也更好懂。',
                ],
                depth:
                  '追问「read 里的 entry 为什么可以不持锁读」:因为 entry 里存的是 `atomic.Pointer`,更新时替换指针而不是改内容;删掉的 key 留一个 nil 哨兵,读的时候一次指针判空即可。[[它优化的是「读」这一侧的锁开销,代价是把复杂度全压在「升级」那一刻。]]',
                followup:
                  '再问「能拿 sync.Map 当本地缓存吗」:不能,它没有容量上限、没有淘汰、没有 TTL。要当缓存用,得在外面补 LRU 或「分片 + 定期清理」;而一旦补了这些,你会发现锁其实是更小的那个问题。',
              },
              {
                kind: 'question',
                title: 'Q44 · RWMutex 有什么陷阱?什么场景下它比 Mutex 更慢?',
                questionId: 'go-index-Q44',
                intent: '考「什么时候它会比 Mutex 更慢」,答不出来说明只背过「读锁可并发」。',
                points: [
                  '机制:读锁之间可并发,写锁独占;写锁会阻塞后续读锁,防止写饥饿。',
                  '陷阱一:只有读远多于写才有收益。写占比一旦上来,原子操作与唤醒的开销会超过 Mutex 的简单争用。',
                  '陷阱二:不可重入,且不能在持有读锁时升级为写锁——会死锁(写锁在等所有读锁释放,包括自己手里那把)。',
                  '陷阱三:临界区极短(几条指令)时,RWMutex 反而更慢:它要维护读者计数器和信号量,成本高于 Mutex 的一次 CAS。',
                  '陷阱四:读锁里做耗时操作会形成「读锁风暴」,把写者饿死;Go 的实现会给等待的写者优先权,但排队本身已经让延迟变长了。',
                ],
                depth:
                  '追问「临界区多短就该换 Mutex」:没有普适数字,但可以估——一次 RLock/RUnlock 大约是几十纳秒的量级,临界区如果只有几次内存访问(十几纳秒),锁的开销比被保护的操作还大。[[判断依据是「临界区耗时 / 锁开销」的比值,不是代码行数。]]',
                followup:
                  '再问「那本地缓存该用 RWMutex 还是分片锁」:读极多写极少、且 key 集合小,用 RWMutex;key 集合大、写操作也频繁(比如带 TTL 清理),用分片锁。真正的判断依据是「写操作会不会被读操作挡住」——会挡,就分片。',
              },
              {
                kind: 'question',
                title: 'Q135 · 什么是热 key 和大 key?怎么处理?',
                questionId: 'go-index-Q135',
                intent: '考「热 key 和击穿是不是一回事」,这题最容易被答成一锅粥。',
                points: [
                  '定义要分清:热 key 是「某个 key 的 QPS 远高于其它」,问题是单分片打满、Redis 单线程被它独占;大 key 是「单个 value 太大或元素太多」,问题是网络阻塞、删除时阻塞主线程、迁移困难。',
                  '热 key 的四条解法:本地缓存挡掉绝大部分、key 打散(`key#1..N`,读时随机选一个)、读写分离加副本、热点探测(京东 hotkey、有赞 TMC 这类方案)。',
                  '大 key 的三条解法:拆分(按 hash 分桶或按时间分片)、压缩、换存储(大 JSON 放对象存储,Redis 只存索引)。',
                  '排查:`redis-cli --bigkeys` 找大 key,`--hotkeys` 找热 key(必须先开 LFU 淘汰策略),`SLOWLOG` 看慢命令。',
                  '和本课的关系:热 key 是击穿的原因,singleflight 只是止血——真正治本的是「让这个 key 不必每次都回源」,也就是本地缓存。',
                ],
                depth:
                  '追问「key 打散之后怎么写」:读路径可以随机选一个分片;写路径只有两个选择——双写全部 N 份(写放大 N 倍,但读立刻一致),或者写一份 + 异步扩散(有短暂不一致)。[[打散是把「一个热点」换成「N 个温点」,代价从 Redis 转移到了写入逻辑。]]',
                followup:
                  '再问「本地缓存挡热 key,多实例之间怎么一致」:热 key 恰好属于「可以容忍旧值」的那类数据(它热是因为有人反复读同一个目标),所以 1 到 3 秒的短 TTL 就够了,不需要广播失效。这条判断很实用:[[越热的数据越容易容忍旧值,因为它的变化本来就不频繁。]]',
              },
              {
                kind: 'explore',
                title: '向外与反向:CDC,以及「干脆不加缓存」',
                from: '刚学的是「用删除加延迟,把不一致窗口压到毫秒级」——所有手段都在优化同一个窗口。',
                branches: [
                  {
                    direction: 'outward',
                    related:
                      'CDC(Change Data Capture):Canal 订阅 MySQL binlog、Debezium 订阅多种数据库的日志',
                    basis: '两者都在回答同一个问题:数据变了,怎么通知下游',
                    shared:
                      '都以「数据库是唯一真源」为前提,下游只读不写;都要求消费幂等与按 key 有序',
                    diff: '业务内删缓存是同步的、在请求链路里,失败要自己重试;CDC 是异步的、在链路外,失败可以无限重试但延迟更高',
                    value:
                      '想清楚这一层,面试里「缓存一致性」的答案就从「先更库再删缓存」升级成「按一致性要求选同步还是异步」——这才是架构层面的回答。',
                  },
                  {
                    direction: 'reverse',
                    related: '反例:不加缓存,直接读库,或者用读写分离让从库扛读',
                    basis: '两者都在权衡「一致性」与「读性能」',
                    shared: '都承认强一致与高读吞吐在单机上不可兼得',
                    diff: '缓存的不一致窗口是「旧值还能被读到」,从库的不一致窗口是「复制延迟」——后者由数据库保证最终收敛,前者要靠你的代码保证',
                    value:
                      '[[最好的缓存优化有时候是不加缓存]]:数据量小、QPS 低、要求强一致的场景,加缓存只是给自己造了一个必须长期维护的一致性 bug。',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'hotkey-singleflight',
          title: '热点 key、singleflight 与并发合并',
          kind: 'concept',
          questionIds: [
            'go-02-Q33',
            'go-index-Q52',
            'go-index-Q51',
            'go-02-Q2',
            'go-02-Q12',
            'go-index-Q34',
            'go-index-Q41',
          ],
          content: {
            intro:
              '击穿的本质不是「缓存没了」,是「一千个并发同时发现缓存没了」。单纯的加缓存、加 TTL 都解决不了这个问题,因为放大发生在同一瞬间。这一节把回源这件事从「每个请求自己做」改成「同一时刻只做一次」,并顺手把 GMP 与 goroutine 泄漏这两块运行时知识接进来——因为 singleflight 本身就是一段典型的并发代码,它的每个坑都能在调度模型里找到解释。',
            outline: [
              '击穿 = 并发回源放大,解法是合并而不是加缓存',
              '手写 singleflight:map + WaitGroup + 双重检查',
              '并发度的三种控法:信号量、errgroup、worker pool',
              '为什么 goroutine 便宜,以及它便宜在哪一步',
              '泄漏的三个来源:无缓冲 channel、无超时的等待、忘记关的 ticker',
            ],
            pitfalls: [
              'singleflight 里把 ctx 传成调用方的——第一个请求被取消,所有合并进来的请求一起失败。',
              '用无缓冲 channel 做信号量却不处理取消——goroutine 永久阻塞在发送上。',
              '拿 `runtime.NumGoroutine()` 的瞬时值判断泄漏——它会随流量波动,要看趋势。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '击穿是并发放大,不是缓存失效',
                body: [
                  '缓存过期本身不是问题,问题在于「过期」这件事被几百个请求同时发现。假设一个 key 的 QPS 是 5000,TTL 到期那一刻,接下来 1 毫秒内大约有 5 个请求发现 miss,每个都去查一次库——听起来并不多。真正可怕的是回源变慢的时候:库一慢,请求就在连接池里排队,排队让更多人超时,客户端重试又把 QPS 翻倍。[[击穿的本质是一个正反馈:回源变慢 → 超时 → 重试 → 更慢。]]',
                  '所以「加机器」在这里是无效的:故障不在容量,在于同一瞬间有 N 个请求在做同一件事,而 N 会随「慢」的程度自我放大。你加一倍的机器,回源请求数可能涨三倍。',
                  '解法只有一个方向:让同一时刻的 N 个请求里,只有 1 个真的去做,其余等待并共享结果。这就是请求合并,也叫 singleflight。它不减少总请求数,但把「N 次重复劳动」压成了「1 次劳动 + N-1 次等待」。',
                  '一个必须说清的边界:合并只对「同一个 key」有效。1000 个请求查 1000 个不同的 key,合并毫无作用——那种情况是大批 key 同时失效(雪崩),要靠 TTL 抖动和缓存预热,不是靠合并。[[分不清击穿和雪崩,就会用错工具。]]',
                ],
              },
              {
                kind: 'diagram',
                title: '合并前 vs 合并后:同一个时刻,只留一个人干活',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    {
                      label: '① `link:abc` 的 TTL 到期',
                      note: '接下来 1ms 内几个请求发现 miss;回源一慢,这个数字会放大到几十',
                    },
                    {
                      label: '② 未合并:各自查库',
                      note: '几十条一模一样的 SELECT,连接池里 25 个连接瞬间被占满,后面的人开始排队',
                    },
                    {
                      label: '③ 合并:第一个请求成为 leader',
                      note: '在 map 里登记一个 call,其余请求拿到的是同一个 call 指针',
                    },
                    {
                      label: '④ 其余请求在 `<-c.done` 上等待',
                      note: '不占数据库连接,只占一个 goroutine(初始栈 2KB)',
                    },
                    {
                      label: '⑤ leader 回源完成',
                      note: '先写 val/err,再摘 key,最后 close(done) —— 顺序不能乱',
                    },
                    {
                      label: '⑥ 所有等待者被唤醒',
                      note: '1 次 DB 查询换来几十个 302,延迟对等待者是可接受的:它们本来也要等一次回源',
                    },
                  ],
                  caption:
                    '注意第 ④ 步:等待者不占数据库连接,只占一个 goroutine。这就是合并比限流更优雅的地方——限流是拒绝多余的请求,合并是把它们留在队列里排队,而排队的成本低到可以忽略。[[合并把「N 次重复劳动」变成「1 次劳动 + N-1 次等待」,总延迟不变,总成本除以 N。]]',
                },
              },
              {
                kind: 'code',
                title: '`pkg/singleflight`:leader 与等待者只差一次 map 登记',
                lang: 'go',
                code:
                  '// Do 执行 fn,并在同一 key 上合并并发调用。\n// ctx 只影响「等待」这一步:leader 的 fn 拿到的是脱离取消的 context。\nfunc (g *Group) Do(ctx context.Context, key string, fn func(context.Context) (any, error)) (any, error) {\n\tg.mu.Lock()\n\tif c, ok := g.m[key]; ok {\n\t\tc.dups++\n\t\tg.mu.Unlock()\n\t\tselect {\n\t\tcase <-c.done:\n\t\t\treturn c.val, c.err\n\t\tcase <-ctx.Done():\n\t\t\t// 等待者自己不想等了 —— 但不影响 leader,也不影响其他等待者\n\t\t\treturn nil, ctx.Err()\n\t\t}\n\t}\n\tc := &call{done: make(chan struct{})}\n\tg.m[key] = c\n\tg.mu.Unlock()\n\n\tg.lead(c, key, ctx, fn)\n\treturn c.val, c.err\n}\n\n// lead 由 leader 同步执行。三件收尾:记录 panic、摘掉 key、关闭 done。\nfunc (g *Group) lead(c *call, key string, ctx context.Context, fn func(context.Context) (any, error)) {\n\tdefer func() {\n\t\tif r := recover(); r != nil {\n\t\t\t// panic 不往外抛:等待者正阻塞在 <-c.done 上,\n\t\t\t// 让 panic 逃出 leader 的栈,它们会永远等下去。\n\t\t\tc.err = fmt.Errorf("singleflight: panic: %v", r)\n\t\t\tc.val = nil\n\t\t}\n\t\tg.mu.Lock()\n\t\tdelete(g.m, key)\n\t\tg.mu.Unlock()\n\t\tclose(c.done)\n\t}()\n\tc.val, c.err = fn(context.WithoutCancel(ctx))\n}\n',
                caption:
                  '这段代码在仓库 `pkg/singleflight/singleflight.go` 里,五个用例都跑过。最不起眼但最必要的是 `recover` 那几行:它把「leader 崩了」和「等待者永远醒不来」这两件事解耦开。本项目的 `Resolve` 已经在回源分支上挂了它——`TestResolveMergesConcurrentMisses` 用五十个并发请求验证了「数据库只被查一次」。',
                notes: [
                  {
                    line: 'if c, ok := g.m[key]; ok',
                    text: '等待者不执行 fn,只拿 c 指针然后等 done。`dups++` 在锁内,它是这里唯一需要改的状态。',
                  },
                  {
                    line: 'case <-ctx.Done():',
                    text: '等待者可以自己放弃,这不会影响 leader——[[超时的请求走了,leader 仍然会把结果算完给剩下的人]]。这一点和 errgroup 正好相反:errgroup 是「一个失败,全部取消」。',
                  },
                  {
                    line: 'c.val, c.err = fn(context.WithoutCancel(ctx))',
                    text: '用 `WithoutCancel` 把调用方的取消摘掉,只保留 value。不这么做,leader 的请求一超时,所有合并进来的请求会一起失败,而它们本来完全来得及。',
                  },
                  {
                    line: 'if r := recover(); r != nil {',
                    text: '等待者正阻塞在 `<-c.done` 上。panic 一旦逃出 leader 的栈,`close(c.done)` 就永远执行不到——等待者集体死锁。',
                  },
                  {
                    line: 'delete(g.m, key) ... close(c.done)',
                    text: '顺序是「先摘 key,再 close(done)」。反过来,被唤醒的等待者可能拿到一个已从 map 删掉、结果却还没写完的 call。',
                  },
                ],
                version: 'Go 1.23',
                env: '`go test -v ./pkg/singleflight` —— 五个用例覆盖合并、顺序调用、panic、双向取消',
                verified: true,
              },
              {
                kind: 'principle',
                title: '四个坑,每一个都能在测试里复现',
                body: [
                  '上面那段代码要真正能用,得先过四关。仓库里的五个用例就是这四关的固化版本——其中两个是「反向」的:验证某种取消不该发生什么。',
                ],
                steps: [
                  {
                    title: '① leader 的 ctx 传染给所有人',
                    detail:
                      'fn 如果直接用调用方的 ctx,第一个请求超时取消,合并进来的几十个请求会一起失败。`TestLeaderCancelDoesNotKillExec` 专门喂了一个一开始就取消的 ctx,要求 fn 仍然跑出结果。',
                  },
                  {
                    title: '② panic 逃出 leader,等待者永久阻塞',
                    detail:
                      'done channel 和 WaitGroup 都依赖「leader 一定收尾」。panic 会跳过 `close`,所以 recover 必须写在 defer 里,并且顺序是「先记错误、再摘 key、最后 close」。',
                  },
                  {
                    title: '③ 结果被多个调用方共享',
                    detail:
                      '如果 fn 返回的是指针或切片,几十个调用方拿到的是同一份内存,其中一个改了,全部受影响。要么返回不可变的值,要么在合并层做拷贝。这一条在测试里最难发现,因为它在正常路径上完全正常。',
                  },
                  {
                    title: '④ 误合并:key 不够精确',
                    detail:
                      '把「查 code=abc」和「查 code=abd」合并成一个 key,就会有人拿到别人的结果——这是最危险的一类 bug,表现为「偶发跳错地址」。key 必须包含全部影响结果的输入,包括租户、语言这类容易漏掉的维度。',
                  },
                ],
                takeaway:
                  '还有一个不写在代码里、但必须写进运维文档的坑:合并会把「慢」放大成「更慢」。leader 卡住 3 秒,后面所有等待者一起等 3 秒,原本 1 秒就超时的请求现在全超时。所以合并层必须有自己的超时,而且要比下游的超时更短——[[合并层的超时不是保护自己,是保护排队的人。]]',
              },
              {
                kind: 'compare',
                title: '并发控制四种写法,选型看四件事',
                head: ['写法', '代码量', '能收错误', '能快速失败', '适用场景'],
                rows: [
                  [
                    '带缓冲 channel 当信号量',
                    '5 行',
                    '要自己加 channel',
                    '要自己判 ctx',
                    '脚本、一次性批处理',
                  ],
                  [
                    '`errgroup.SetLimit`',
                    '3 行',
                    '第一个错误即返回',
                    'WithContext 自动取消',
                    '服务内的并发编排(默认选择)',
                  ],
                  [
                    '固定 worker pool',
                    '20 行',
                    '要自己收敛',
                    '要自己下发停止信号',
                    '长任务、要复用 worker、要背压',
                  ],
                  ['`WaitGroup` + 分批', '10 行', '不能', '不能', '任务量小、失败可忽略'],
                ],
                note: '第一行那个「信号量」有个隐蔽的坑:缓冲满时 `sem <- struct{}{}` 会阻塞,而 channel 的发送不感知 ctx——必须有 `select` 带 `ctx.Done()` 才能退出。errgroup 把这件事做对了,这也是它值得成为默认选择的原因。',
                caption:
                  '[[选型的核心问题不是「哪种更快」,而是「失败时你要什么」]]:只想尽快返回第一个错误,用 errgroup;需要所有任务跑完再汇总,用 WaitGroup 或 worker pool;需要限住对下游的瞬时压力,三者都能做,但只有 errgroup 是「写对了」而不是「可以写对」。',
              },
              {
                kind: 'question',
                title: 'Q33 · errgroup 和 singleflight 用过吗?',
                questionId: 'go-02-Q33',
                intent: '考「两者解决的问题根本不是同一类」,答成「都能控制并发」就废了。',
                points: [
                  'errgroup 解决「一组任务怎么并发跑、错怎么收」:聚合错误(`First error wins`)、派生取消(`WithContext`)、`Wait` 等全部完成。',
                  'singleflight 解决「同一个 key 的重复劳动」:`singleflight.Group` 把相同 key 的并发调用合并成一次执行,结果共享。它不关心你有几个任务,只关心 key 是否相同。',
                  '关键区别在语义上:errgroup 是「任一失败即取消其他」,singleflight 是「一个失败,所有人一起拿到这个错误」——[[前者要尽快止损,后者要保证一致性。]]',
                  '组合用法:回源这一段用 singleflight 合并,回源内部如果有多个下游要并行查,再用 errgroup 收敛——两者不在同一层,不冲突。',
                ],
                depth:
                  '追问「singleflight 会掩盖错误吗」:会。100 个请求合并成一次,这一次失败则 100 个一起失败;但如果这次成功、而实际上只应该对其中一部分成功(比如权限不同),那就是误合并。所以 key 必须包含全部影响结果的输入。',
                followup:
                  '再问「两个都想限并发怎么办」:singleflight 的 `Do` 本身不限并发,它限制的是「同一 key 的执行次数」。要限总并发,得在 singleflight 外层套信号量或 `errgroup.SetLimit`——顺序是「先限流,再合并」,反过来会让等待者占着并发额度不干活。',
              },
              {
                kind: 'question',
                title: 'Q52 · errgroup 是怎么实现「任一失败即取消其他任务」的?',
                questionId: 'go-index-Q52',
                intent: '考「取消是不是自动的」,这题的分水岭是「子任务有没有听 ctx」。',
                points: [
                  '内部结构:`sync.WaitGroup` + `sync.Once` + `err` + 由 `WithContext` 派生的 `cancel`。',
                  '机制:`Go` 时注册到 WaitGroup;任务返回错误时用 `Once` 只记录第一个错误,并调 `cancel()`。',
                  '关键点:取消只是「把 ctx 关掉」。[[子任务必须自己监听 `ctx.Done()` 才会真的提前退出]],否则错误被记录了,任务照样跑完。',
                  '`Wait` 只返回第一个错误;要看全部错误得自己收集。Go 1.20 起有 `SetLimit`,可以直接限并发,不用再手写信号量。',
                  '它不捕获 panic:子任务 panic 会让整个进程崩,和普通 goroutine 一样,需要自己在 `Go` 里 recover。',
                ],
                depth:
                  '追问「为什么只记录第一个错误」:因为 `First error wins` 的语义是「我要知道最早出问题的那一个」,不是「我要一份完整报告」。要全部错误,就在每个任务里把 error 收进带锁的切片——但那时你已经不需要 errgroup 的错误聚合了,只需要它的取消。',
                followup:
                  '再问「cancel 的时机」:任务一返回错误就调,不等其它任务结束。这样还在跑的任务能尽早退出,把「等一个已经注定失败的结果」的时间省下来。而 `Wait` 仍然会等所有任务真正返回——取消是建议,不是强杀。',
              },
              {
                kind: 'question',
                title: 'Q51 · 如何控制并发数量?有哪几种常见写法?',
                questionId: 'go-index-Q51',
                intent: '考「四种写法的取舍」,尤其是那个「看起来能用其实会卡死」的信号量写法。',
                points: [
                  '带缓冲 channel 当信号量:`sem := make(chan struct{}, n)`,进入前 `sem <- struct{}{}`,退出 `<-sem`。代码最短,但**必须用 `select` 带上 `ctx.Done()`**。',
                  '`errgroup.SetLimit`:最推荐。自带错误聚合与 context 取消,代码三行。',
                  '固定 worker 池:N 个 goroutine 消费同一个 jobs channel,适合长任务、需要复用 worker、需要背压的场景。',
                  '`WaitGroup` + 分批:任务量小、失败可忽略时够用;它没有快速失败能力。',
                  '选型问四件事:要不要收集错误、要不要快速失败、任务能不能拆、要不要背压。',
                ],
                depth:
                  '追问「为什么信号量版本会卡死」:缓冲满时,`sem <- struct{}{}` 会阻塞;如果这时 ctx 被取消,代码仍然卡在这一行,因为 channel 发送不感知 ctx。[[凡是用 channel 做同步的地方,都要问一句「取消时它会退出吗」。]]',
                followup:
                  '再问「SetLimit 是硬上限吗」:是,`Go` 在超过 limit 时会阻塞直到有槽位。这意味着某个任务卡住,整个 group 会跟着停——所以 limit 之外还需要每个任务自己的超时,两层保护缺一不可。',
              },
              {
                kind: 'concept',
                title: 'goroutine 便宜,但便宜不等于免费',
                body: [
                  '理解合并层为什么能撑住,得先知道 goroutine 的成本到底在哪。一个新建的 goroutine 初始栈是 2KB(不是线程那种 MB 级),按需增长,上限默认 1GB。所以「创建一百万个」在栈内存上大约 2GB——这就是它的真实上限。[[goroutine 的瓶颈从来不是数量,是它活着的时候占的内存。]]',
                  '更关键的是阻塞的代价。goroutine 阻塞在读网络上时,它不占任何线程:runtime 把 socket 设成非阻塞、挂到 netpoller 上,goroutine 状态变成 `_Gwaiting`,`M` 立刻去跑别的 goroutine;fd 就绪后 netpoll 把它标记成 `runnable` 重新入队。所以「一万个 goroutine 等一个慢查询」在调度上几乎是免费的——这也是合并层敢让几十个请求排队的原因。',
                  '三条数量关系要记清:G 无上限;P 的数量等于 `GOMAXPROCS`,决定真正并行的上限;M(内核线程)通常略多于 P,因为阻塞在 syscall 上的 M 会被换下来,runtime 再起一个新 M 配上空闲的 P。',
                  '所以判断一段并发代码贵不贵,别看 goroutine 数量,看两件事:每个 goroutine 持有多大缓冲(内存),以及它阻塞时有没有把 ctx 传下去(能不能退出)。[[一个不会退出的 goroutine,和一个内存泄漏是同一件事。]]',
                ],
              },
              {
                kind: 'question',
                title: 'Q2 · 讲讲 GMP 模型,G、M、P 分别是什么?',
                questionId: 'go-02-Q2',
                intent: '考「三者各是什么、为什么需要 P」,而不是背三个字母的全称。',
                points: [
                  'G:goroutine。含栈(初始 2KB 可增长)、指令指针、调度现场 `gobuf`、状态(`_Grunnable` / `_Grunning` / `_Gwaiting` / `_Gsyscall`)。',
                  'M:machine,内核线程,真正的执行者。每个 M 有一个 `g0` 栈专门跑调度代码;默认上限 10000(`debug.SetMaxThreads` 可调)。',
                  'P:processor,调度上下文。持有本地队列 `runq`(256 容量的循环数组)+ `runnext` + `mcache`。**M 必须持有 P 才能执行 G**。',
                  '数量关系:G 无上限;P 数 = `GOMAXPROCS`,决定并行上限;M 通常略多于 P。',
                  '为什么需要 P:早期 GM 模型所有 M 从一把全局锁里取 G,锁竞争成为瓶颈。P 相当于给每个 M 一个私有队列,把大部分取任务的操作变成无锁。',
                ],
                depth:
                  '追问「work stealing 怎么工作」:P 的本地队列空了,先看全局队列,再去随机偷其它 P 队列的后半段一半。偷一半而不是一个,是为了让偷窃次数摊薄——[[偷一次的成本要能被偷来的工作量摊平。]]',
                followup:
                  '再问「`GOMAXPROCS` 该设多少」:默认等于 CPU 核数,但容器里要显式设成 limit 的核数,否则读到的是宿主机的核数,导致过度并行与频繁上下文切换。CPU 密集型可以略小于核数,IO 密集型保持等于核数即可。',
              },
              {
                kind: 'question',
                title: 'Q12 · netpoller:goroutine 阻塞在网络 IO 上为什么不占线程?',
                questionId: 'go-02-Q12',
                intent: '考「阻塞为什么不占线程」的机制细节,这是 Go 高并发的物理基础。',
                points: [
                  '前提:runtime 把 socket 设成非阻塞,读不到数据时返回 `EAGAIN`,而不是挂住线程。',
                  '然后把 fd 注册到多路复用器上:Linux 是 epoll,macOS 是 kqueue,Windows 是 IOCP,统一封装成 netpoller。',
                  'G 读网络没数据时被 `gopark` 挂到 netpoller 的等待列表,状态 `_Gwaiting`,M 立刻转头去跑别的 G。',
                  'fd 就绪后 netpoll 返回对应的 G,标记成 `_Grunnable` 重新入队,等某个 P 来取。',
                  '所以百万连接只需要少量线程:**线程数取决于「同时在跑的 G」,不取决于「同时在等的 G」**。',
                ],
                depth:
                  '追问「阻塞 syscall 和网络阻塞有什么区别」:网络阻塞走 netpoller,不占 M;而普通的阻塞 syscall(文件 IO、cgo 调用)会真的占住 M,runtime 只能新建一个 M 顶上——这也是 cgo 密集的服务线程数会暴涨的原因。',
                followup:
                  '再问「netpoll 什么时候被检查」:不是有事件就立刻处理,而是在调度循环里(`findRunnable`)顺便查一次,以及 sysmon 后台线程定期查。这意味着网络事件处理会有微秒级延迟——对绝大多数场景无所谓,对极致低延迟的场景就是可观测的毛刺。',
              },
              {
                kind: 'question',
                title: 'Q34 · goroutine 泄漏有哪些常见场景?线上怎么排查?',
                questionId: 'go-index-Q34',
                intent: '考「能不能给出可执行的排查路径」,而不是列七个场景。',
                points: [
                  '七个常见来源:向无人接收的 channel 发送;从无人发送的 channel 接收;等一个永远不会关闭的 channel;死锁或无限循环;循环里 `time.After`;HTTP 请求忘 `resp.Body.Close()`;ctx 没有向下传递。',
                  '排查第一步:打点 `runtime.NumGoroutine()`,看趋势而不是瞬时值——它会随流量波动,只有「只涨不落」才是泄漏。',
                  '第二步:`pprof/goroutine?debug=2` 拿全量栈,看几万个 goroutine 卡在同一行;那一行就是泄漏点。',
                  '第三步:单测里用 `goleak` 兜住,让泄漏在 CI 就被发现,而不是等线上内存涨。',
                  '预防只有一句话:每个 goroutine 都要有明确的退出条件——`ctx.Done()`、`close(stop)`、或有限次循环。',
                ],
                depth:
                  '追问「为什么循环里的 `time.After` 会泄漏」:每次调用都创建一个 Timer,它在触发前不会被回收;`select` 里如果别的 case 先返回,这个 Timer 仍要等到期才释放。高频循环里它会堆成内存与定时器堆的双重压力,正确写法是 `NewTicker` + `defer Stop()`。',
                followup:
                  '再问「泄漏的 goroutine 会一直占 CPU 吗」:不会,阻塞中的 goroutine 只占栈内存。所以泄漏的表现通常是「内存缓慢上涨、goroutine 数只增不减」,而不是 CPU 高——[[这也是它容易被忽视的原因:它不吵不闹,只是慢慢吃掉内存。]]',
              },
              {
                kind: 'question',
                title: 'Q41 · select 的执行规则是什么?多个 case 同时就绪会怎样?',
                questionId: 'go-index-Q41',
                intent: '考「随机选择」和「关闭 channel 的忙循环」,后者是真实事故的常客。',
                points: [
                  '多个 case 同时就绪时**随机**选一个:runtime 用伪随机打散顺序,保证公平、避免某个 case 长期饿死。',
                  '有 `default` 时,其它 case 都不就绪就立刻走 default(非阻塞);没有 default 就阻塞等待。',
                  'case 的表达式在进入 select 时全部求值一次,包括 channel 操作数;所以不要把有副作用的函数写在 case 里。',
                  '`select{}` 空 select 永久阻塞,常用来在 main 里阻止退出。',
                  '经典坑:`for { select { case v := <-ch: } }` 当 ch 已关闭会永远立刻返回零值,形成忙循环吃满一个核;必须用 `v, ok := <-ch` 判断并 return。',
                ],
                depth:
                  '追问「随机是真的随机吗」:runtime 用的是 per-P 的伪随机数(`cheaprand`),不是密码学随机。它只保证「不会每次都选同一个」,不保证均匀——但在统计意义上足够避免饥饿。',
                followup:
                  '再问「nil channel 的 case 会怎样」:永远不就绪,等价于这一路被禁用。这是个实用技巧:把某个 channel 变量置 nil,就能在 select 里动态关掉一路分支,不用改循环结构。',
              },
              {
                kind: 'explore',
                title: '向下与向外:合并之外的两个方向',
                from: '刚学的是「把并发压成一次」——一种用等待换成本的策略。',
                branches: [
                  {
                    direction: 'down',
                    related: 'GMP 与 netpoller 的调度细节(本课只讲了结论)',
                    basis: '合并层能撑住的物理基础,就是调度器',
                    shared: '两者都把「阻塞」处理成不占线程',
                    diff: '合并层是应用层策略,决定「谁去干活」;调度器是运行时机制,决定「干活的人怎么被安排」',
                    value:
                      '面试问「一万并发你怎么扛」,只答「用 goroutine」是背课文;能说到「阻塞在 netpoller 上不占 M,P 决定并行度,所以真正的瓶颈在内存和下游连接数」,才算理解。',
                  },
                  {
                    direction: 'outward',
                    related: '自适应限流与热点探测(京东 hotkey、有赞 TMC 这类方案)',
                    basis: '合并解决「同一个 key 的重复」,限流解决「总量过大」,热点探测解决「哪个 key 该被特殊对待」',
                    shared: '三者都在同一段调用链上做「少做一点」的决策',
                    diff: '合并是无状态的、只作用于一次调用窗口;限流有状态、按时间窗口计数;热点探测是全局的、需要额外采集与聚合',
                    value:
                      '真实系统三者都要:探测找出热 key,本地缓存挡掉它,合并兜住回源,限流保护下游。[[单靠任何一层都挡不住一次真实的流量尖峰。]]',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'bench-pprof',
          title: '压测、pprof 与一次真实优化',
          kind: 'drill',
          questionIds: [
            'go-index-Q105',
            'go-index-Q106',
            'go-index-Q107',
            'go-index-Q109',
            'go-index-Q111',
            'go-index-Q113',
            'go-index-Q114',
            'go-03-Q54',
            'go-03-Q47',
          ],
          content: {
            intro:
              '性能优化最容易犯的错是「凭感觉改」:觉得 map 慢就换 slice,觉得 GC 频繁就调 GOGC,改完没有数字对比,最后既不知道有没有用,也不知道有没有引入退化。这一节把优化变成一个有固定四步的流程——量化、定位、假设、验证,然后用一次真实的分配优化把它完整走一遍:从 benchmark 基线,到火焰图上定位热点,到改完再测,拿到一个可以写进简历的数字。',
            outline: [
              '先分类:是 CPU 密集、内存分配、还是锁竞争',
              '四步流程:量化 → 定位 → 假设 → 验证',
              '五种 profile 各自回答什么问题',
              'benchmark 的五个坑,尤其是编译器优化',
              '一次真实优化:减少高频路径上的分配',
            ],
            pitfalls: [
              'benchmark 里没有把结果赋给 `_`,编译器直接把整个循环优化掉。',
              '用 `time.Now()` 做微基准——精度不够,应该用 `testing.B` 的框架。',
              '只看平均值不看分位数——p99 毛刺才是用户能感知到的部分。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '优化的第一步不是改代码,是给「慢」下定义',
                body: [
                  '「这个接口有点慢」不是一个可以验收的问题。慢多少?p50 还是 p99?慢在服务端还是客户端?没有这三个答案,任何改动都无法证明有效——[[没有数字的优化是负资产:它增加了复杂度,却没换来可验证的收益。]]',
                  '把优化拆成四步,顺序不能换:量化(有指标、有基线)、定位(profile 指出热点)、假设(说清「为什么它慢」)、验证(改完再测,对比同一指标)。跳过第二步会变成「凭感觉改」;跳过第四步会把噪声当成收益。',
                  '还有一条决定收益量级的原则:先看上层再看下层。架构层(加缓存、改异步、批量合并)通常带来数倍到数十倍;算法层(换掉 O(n²))一到两个数量级;代码层(减少一次分配、去掉一次加锁)通常是百分比;系统层(调参数、改内核)往往是最后那 1%。[[在错误的层级上做优化,做得再漂亮也没用。]]',
                  '本项目已经做过一次上层优化:把 99% 的读挡在 MySQL 之外。所以剩下的都是代码层的百分比活儿——这也意味着,接下来要盯的不是「能不能快一倍」,而是「有没有把不该花的钱花掉了」。',
                ],
              },
              {
                kind: 'diagram',
                title: '一次跳转的耗时预算',
                diagram: {
                  type: 'scale',
                  items: [
                    { label: '本地缓存命中', value: 0.1, display: '0.1 ms' },
                    { label: 'Redis 命中(同机房)', value: 0.3, display: '0.3 ms' },
                    { label: 'MySQL 回源', value: 2.0, display: '2 ms' },
                    { label: '302 响应写出', value: 0.2, display: '0.2 ms' },
                    { label: '访问日志 + 序列化', value: 0.4, display: '0.4 ms' },
                  ],
                  caption:
                    '这是示意量级,不是本机实测——真实数字必须来自你自己的压测。它想说明的是一件事:命中缓存时,整条链路里只有很小一部分是「你的代码」,大头在网络往返。[[所以「优化代码」在命中路径上的天花板很低;真正的收益在「让更多请求走命中」。]]',
                },
              },
              {
                kind: 'principle',
                title: '五种 profile,各回答一个不同的问题',
                body: [
                  'pprof 不是「一个看性能的工具」,它是一组各自回答不同问题的采样器。选错 profile,会得到一份「看起来全是热点」的报告,然后开始瞎改。',
                ],
                steps: [
                  {
                    title: '① CPU(`/debug/pprof/profile?seconds=30`)',
                    detail:
                      '默认 100Hz 采样 30 秒,回答「CPU 时间花在哪些函数上」。注意它只统计「在 CPU 上」的时间——IO 等待、锁阻塞在这里是隐形的,这也是「明明很慢但 CPU 很闲」的常见原因。',
                  },
                  {
                    title: '② heap(`/debug/pprof/heap`)',
                    detail:
                      '两个视角必须分开看:`-inuse_space` 是「现在占着多少」(找内存泄漏),`-alloc_objects` 是「累计分配了多少次」(找高频小对象)。压测看前者,优化分配看后者。',
                  },
                  {
                    title: '③ goroutine(`?debug=2`)',
                    detail:
                      '全量栈快照。它不解方程,只是让你看见「有几万个 goroutine 卡在同一行」——这一条信息往往就够定位泄漏了。',
                  },
                  {
                    title: '④ block 与 mutex',
                    detail:
                      'block 回答「goroutine 阻塞在同步原语上多久」,mutex 回答「谁在争锁」。mutex 需要先 `runtime.SetMutexProfileFraction(n)` 打开采样,否则永远是空的——这是最常见的「采不到数据」原因。',
                  },
                  {
                    title: '⑤ trace(`go tool trace`)',
                    detail:
                      '时间线视角:每个 G 什么时候运行、什么时候被抢占、GC 的 STW 有多长、P 的利用率、调度延迟。它回答「什么时候卡、卡多久」,而 pprof 回答「谁最热」。延迟毛刺只有它看得出来。',
                  },
                ],
                takeaway:
                  '[[先写清「我的问题是什么」,再选 profile。]]问「哪个函数最费 CPU」用 profile;问「为什么内存涨」用 heap 的 inuse;问「为什么偶发 2 秒毛刺」用 trace;问「为什么 QPS 上不去但 CPU 不高」用 block 加 mutex。',
              },
              {
                kind: 'code',
                title: 'benchmark 的六条纪律',
                lang: 'go',
                code:
                  '// 包级 sink:防止编译器把被测调用整个优化掉。\nvar (\n\tsinkString string\n\tsinkUint   uint64\n)\n\nfunc BenchmarkEncode(b *testing.B) {\n\tvar id uint64 = 12345678\n\tb.ReportAllocs()\n\tb.ResetTimer()\n\tfor i := 0; i < b.N; i++ {\n\t\tsinkString = Encode(id+uint64(i), benchSalt)\n\t}\n}\n\nfunc BenchmarkValidTable(b *testing.B) {\n\tcode := Encode(12345678, benchSalt)\n\tb.ReportAllocs()\n\tb.SetBytes(int64(len(code)))  // 让结果多一列 MB/s\n\tb.ResetTimer()\n\tfor i := 0; i < b.N; i++ {\n\t\tif !validTable(code) {\n\t\t\tb.Fatal("unexpected invalid")\n\t\t}\n\t}\n}\n',
                caption:
                  '这段代码在仓库 `internal/shortcode/bench_test.go` 里,本节所有数字都是它跑出来的。注意 `sinkString` 那个包级变量——它不是洁癖,是必需品。',
                notes: [
                  {
                    line: 'sinkString = Encode(...)',
                    text: '结果必须「被使用」。只调用不赋值,编译器会发现整个循环没有副作用,直接把调用优化掉——这时 `-benchmem` 会报 0 allocs/op,看起来完美,实际什么都没测。',
                  },
                  {
                    line: 'b.ReportAllocs()',
                    text: '等价于命令行加 `-benchmem`,但写在代码里更难被忘记。耗时只说明一半问题,分配次数往往更能解释延迟——每次分配都可能触发 GC。',
                  },
                  {
                    line: 'b.ResetTimer()',
                    text: '排除准备数据的耗时。上面那行 `Encode(12345678, ...)` 如果算进计时,被测的就不是后面的循环了。',
                  },
                  {
                    line: 'b.SetBytes(int64(len(code)))',
                    text: '同样的耗时,处理 7 字节和处理 7KB 是两回事。有了吞吐数字,跨函数比较才有意义。',
                  },
                  {
                    line: '-count=5 加 benchstat',
                    text: '单次跑的差异可能是噪声。至少跑 5 次,再用 benchstat 比中位数与置信区间——它会把「21.3 ± 0.4」和「20.9 ± 0.2」判定为无显著差异。',
                  },
                ],
                version: 'Go 1.23',
                env: '`go test -run=^$ -bench=. -benchmem -count=5 ./internal/shortcode`',
                verified: true,
              },
              {
                kind: 'concept',
                title: '实测:同样的语义,写法差 9 倍;但真正该做的是「不做」',
                body: [
                  '下面这些数字是本机跑出来的(Intel Core Ultra 7 155H,`GOMAXPROCS=22`,`-count=5` 取中位数),不是估算。前两行是同一个语义的两种写法,后两行是一次候选优化。',
                ],
                points: [
                  '`Encode`(现状):**21.3 ns/op,16 B/op,1 allocs/op**。栈上 `[11]byte`,最后 `string(buf[i:])` 一次分配。',
                  '`EncodeConcat`(反例):**197 ns/op,80 B/op,11 allocs/op**。逐字符字符串拼接,每拼一次分配一次。慢 9.2 倍,多 10 次分配。',
                  '`Decode` 现状(`strings.IndexByte`):**29.7 ns/op,0 allocs**。候选实现(256 项查表):**7.5 ns/op,0 allocs**。快 4.0 倍。',
                  '`Valid` 现状:**27.3 ns/op(约 400 MB/s)**。查表版:**3.3 ns/op(约 3330 MB/s)**。快 8.3 倍。',
                  '算一笔账:读路径每个请求调一次 `Valid`,省下 24ns。按 5 万 QPS 算,一秒省 1.2ms CPU(单核的 0.12%),一个月省 52 分钟 CPU,摊在 8 核上是 0.1% 的利用率。',
                  '而 `Encode` 的那次分配在写路径上——创建短链的 QPS 是几十,不是几万。[[在写路径上省 16 字节,和在读路径上省 16 字节,价值差三个数量级。]]',
                ],
                caption:
                  '结论有点反直觉:查表版快 8.3 倍,但**不采纳**。理由是绝对收益 24ns/请求、占总预算的 0.03%,而多一张 256 项全局表和两套实现会长期增加维护成本。[[优化的门槛不是「能不能更快」,而是「快出来的这点,值不值得多一份代码」。]] 更值钱的一刀在别处:读路径上其实只有一次 `Valid`,没有 `Decode`——热路径优化的第一问永远是「这个调用能不能不做」,而不是「它能不能更快」。',
              },
              {
                kind: 'code',
                title: '查表版:把字符串搜索换成一字节索引',
                lang: 'go',
                code:
                  '// revTable 在包初始化时构建:反查表只建一次,代价可以忽略。\nvar revTable = func() [256]int8 {\n\tvar t [256]int8\n\tfor i := range t {\n\t\tt[i] = -1 // -1 当哨兵:非法字符\n\t}\n\tfor i := 0; i < len(alphabet); i++ {\n\t\tt[alphabet[i]] = int8(i)\n\t}\n\treturn t\n}()\n\nfunc decodeTable(s string) (uint64, error) {\n\tif s == "" {\n\t\treturn 0, ErrInvalidCode\n\t}\n\tvar v uint64\n\tfor i := 0; i < len(s); i++ {\n\t\tidx := revTable[s[i]]\n\t\tif idx < 0 {\n\t\t\treturn 0, ErrInvalidCode\n\t\t}\n\t\tv = v*base + uint64(idx)\n\t}\n\treturn v, nil\n}\n',
                caption:
                  '`strings.IndexByte` 内部是 SIMD,对 62 字节的字符表已经很快了;查表版之所以还能快 8 倍,是因为它把「搜索」变成了一次数组索引——O(62) 变 O(1)。',
                notes: [
                  {
                    line: 'var t [256]int8',
                    text: '用 256 项的定长数组,索引就是字节值本身,不需要任何判界。`string` 按下标取出来的是 `byte`,天然落在 0–255 里。',
                  },
                  {
                    line: 't[i] = -1',
                    text: '哨兵值。用 `-1` 而不是 `0`,是因为 `0` 是字符表第一个字符 `0` 的合法下标——[[哨兵取值的唯一要求是「不可能与合法值撞车」。]]',
                  },
                  {
                    line: 'idx := revTable[s[i]]',
                    text: '整个函数只剩一次内存访问加一次乘法。`0 allocs` 的原因是它不返回字符串,只返回数字。',
                  },
                ],
                version: 'Go 1.23',
                env: '`go test -run=^$ -bench=Decode -benchmem ./internal/shortcode`',
                verified: true,
              },
              {
                kind: 'handwrite',
                title: '手写:一个不会骗人的 benchmark',
                lang: 'go',
                prompt:
                  '为候选实现 `decodeTable` 写一组 benchmark,要求四条:① 报告分配;② 结果必须被使用,不能被编译器优化掉;③ 包含一个并发用例(`b.RunParallel`);④ 给出一行 benchstat 命令,用于对比「现状实现」和「候选实现」。最后说明:为什么并发 benchmark 的数字往往更「好看」,以及这个好看为什么可能是假的。',
                plan: [
                  {
                    title: '① 先想清楚「被测的到底是什么」',
                    detail:
                      '`Encode` 那一步是准备数据,必须放在 `b.ResetTimer()` 之前。放进去,你测的就是「编码 + 解码」的总和,而你想测的只有解码。这一步错了,后面所有数字都不可比。',
                  },
                  {
                    title: '② 把结果接到包级变量上',
                    detail:
                      '`sinkUint = v` 看起来毫无意义,但它是「让编译器相信这个调用有副作用」的唯一办法。不接,内联加死代码消除会把整个循环删掉,你会得到一个 0.3 ns/op 的漂亮数字——[[测出一个不可能的快的数字,第一反应应该是「代码被优化掉了」,而不是庆祝。]]',
                  },
                  {
                    title: '③ 并发用例用 pb.Next(),不是 b.N',
                    detail:
                      '`RunParallel` 里由框架把 N 个迭代分配给多个 goroutine,每个 goroutine 通过 `pb.Next()` 领任务。写成 `for i := 0; i < b.N; i++` 会让总操作数变成 N × goroutine 数,数字直接失真。',
                  },
                  {
                    title: '④ 用 benchstat 比较,而不是用眼睛比',
                    detail:
                      '两个实现各跑 `-count=10`,输出到两个文件,`benchstat old.txt new.txt`。它会给出中位数、变化百分比和 p 值——眼睛看 21.3 和 20.9 会以为快了 2%,benchstat 会告诉你这只是噪声。',
                  },
                ],
                skeleton:
                  'func BenchmarkDecodeTable(b *testing.B) {\n\tcode := Encode(12345678, benchSalt)\n\t// TODO: 报告分配、重置计时器\n\n\tfor i := 0; i < b.N; i++ {\n\t\t// TODO: 调用 decodeTable,并把结果写到一个「编译器看得见」的地方\n\t}\n}\n\nfunc BenchmarkDecodeTableParallel(b *testing.B) {\n\tcode := Encode(12345678, benchSalt)\n\tb.ReportAllocs()\n\tb.ResetTimer()\n\t// TODO: b.RunParallel,注意循环条件不是 b.N\n}\n',
                solution:
                  'func BenchmarkDecodeTable(b *testing.B) {\n\tcode := Encode(12345678, benchSalt)\n\tb.ReportAllocs()\n\tb.ResetTimer()\n\tfor i := 0; i < b.N; i++ {\n\t\tv, err := decodeTable(code)\n\t\tif err != nil {\n\t\t\tb.Fatal(err)\n\t\t}\n\t\tsinkUint = v // 少这一行,编译器会把整个循环删掉\n\t}\n}\n\nfunc BenchmarkDecodeTableParallel(b *testing.B) {\n\tcode := Encode(12345678, benchSalt)\n\tb.ReportAllocs()\n\tb.ResetTimer()\n\tb.RunParallel(func(pb *testing.PB) {\n\t\tfor pb.Next() { // 注意:不能用 b.N,并发下 N 由框架分配\n\t\t\tv, err := decodeTable(code)\n\t\t\tif err != nil {\n\t\t\t\tb.Fatal(err)\n\t\t\t}\n\t\t\tsinkUint = v\n\t\t}\n\t})\n}\n\n// 对比命令:\n//   go test -run=^$ -bench=Decode -benchmem -count=10 ./internal/shortcode > old.txt\n//   (切换实现后)\n//   go test -run=^$ -bench=Decode -benchmem -count=10 ./internal/shortcode > new.txt\n//   benchstat old.txt new.txt\n',
                complexity:
                  '单线程是 O(len(code)) 次数组索引,长度 5–7,基本等于常数;并发版的吞吐受内存带宽和 P 数量约束,不随核数线性增长,而且 `sinkUint` 这个共享写入本身就是竞争点——真要用这种方式测吞吐,得把 sink 换成 per-goroutine 的局部变量。',
                traps: [
                  '忘了给 sink 赋值,测出 0 allocs/op 的假象——数字太漂亮时先怀疑测试。',
                  '`RunParallel` 里写了 `b.N`,总操作数翻倍,`ns/op` 直接失真。',
                  '并发结果更好看是因为多核分摊了 wall time,不是单次调用变快了;报数字时必须同时给出并发度与 `GOMAXPROCS`。',
                  '在 benchmark 里打日志或拼字符串,把测试框架的开销算进被测代码——这类「看起来慢」最容易骗过自己。',
                ],
              },
              {
                kind: 'question',
                title: 'Q105 · pprof 有哪几种 profile?各自看什么?',
                questionId: 'go-index-Q105',
                intent: '考「每种 profile 回答什么问题」,答成名字列表等于没答。',
                points: [
                  'CPU(`profile`):默认 100Hz 采样 30 秒,回答「CPU 时间花在哪些函数」。只统计在 CPU 上的时间,IO 等待与锁阻塞在这里是隐形的。',
                  'heap:两个视角必须分开——`-inuse_space` 看「现在占着多少」(找泄漏),`-alloc_objects` 看「累计分配多少次」(找高频小对象)。',
                  'goroutine:`?debug=2` 拿全量栈,排查泄漏时看「几万个 goroutine 卡在同一行」。',
                  'block 与 mutex:block 看「阻塞在同步原语上多久」,mutex 看「谁在争锁」;mutex 必须先 `runtime.SetMutexProfileFraction` 打开采样。',
                  'trace:`go tool trace`,时间线视角,看调度、GC 的 STW、syscall、延迟毛刺——pprof 看不了的「时间相关性」问题用它。',
                ],
                depth:
                  '追问「为什么 CPU profile 里看不到 IO 等待」:它基于「定时中断采样当前栈」,一个 goroutine 阻塞在网络上时不在任何 M 上运行,自然采不到。[[所以「服务很慢但 CPU 很闲」这个现象,本身就说明该换 block 或 trace。]]',
                followup:
                  '再问「`inuse_space` 和 `alloc_space` 差在哪」:前者是采样时刻还活着的内存,后者是从启动到现在的累计分配量。一个正常服务的 `alloc_space` 可能是几 TB 而 `inuse_space` 只有几百 MB——[[看泄漏永远看 inuse,看 GC 压力才看 alloc。]]',
              },
              {
                kind: 'question',
                title: 'Q106 · 火焰图怎么看?怎么从中找到优化点?',
                questionId: 'go-index-Q106',
                intent: '考「怎么从图里读出结论」,而不是「图很好看」。',
                points: [
                  '读图规则:X 轴是采样占比(不是时间顺序),Y 轴是调用深度,越往上越深;宽度 = 该函数及其子调用占用的比例。',
                  '找「又宽又平的顶」:那是自身耗时最多的叶子函数,最直接的优化点。',
                  '找「重复出现的窄条」:高频小函数调用,往往是分配或字符串处理。',
                  '`runtime.mallocgc`、`gcBgMarkWorker`、`runtime.mapaccess` 占比高,通常意味着分配过多或数据结构选错——不是「runtime 慢」,是你的代码让 runtime 忙。',
                  '最有用的是对比:优化前后各一张,用 `-diff_base` 生成差异火焰图,红色变多是退化,蓝色变多是改善。',
                ],
                depth:
                  '追问「火焰图有什么看不见的」:短函数可能一次都没采到(100Hz 采样意味着 10ms 以下的热点容易被平均掉);IO 等待完全不可见;多线程的总占比可能超过 100%。[[所以火焰图适合找「CPU 花在哪」,不适合回答「为什么慢」。]]',
                followup:
                  '再问「off-CPU 的火焰图怎么看」:标准 pprof 做不到。要看阻塞、等锁、等 IO,得用 `block` profile 或 eBPF 类工具(如 bcc 的 offcputime)。这也是为什么很多「CPU 不高但很慢」的问题要靠 trace 而不是 pprof。',
              },
              {
                kind: 'question',
                title: 'Q107 · 写 benchmark 有哪些坑?怎么保证测的是真实性能?',
                questionId: 'go-index-Q107',
                intent: '考「怎么保证测的是真实性能」,这题答完应该能直接写出正确的 benchmark。',
                points: [
                  '用 `b.N` 循环,`b.ResetTimer()` 排除准备数据的耗时。',
                  '防止编译器优化:把结果赋给包级变量(如 `var sink string`),或用 `b.ReportAllocs()`。不这么做会测出 0 allocs/op 的假象。',
                  '循环里不要做与被测无关的事:`fmt.Sprintf` 打日志、拼错误信息,都会把测试框架的开销算进来。',
                  '`-benchmem` 看 `allocs/op` 与 `B/op`,往往比耗时更能说明问题。',
                  '用 `benchstat` 比较:`-count=10` 取多组,让工具判断差异是否显著;单次跑的 5% 差异可能纯属噪声。',
                  '`b.RunParallel` 测并发;注意 `GOMAXPROCS` 与机器负载,并发结果不能和单线程结果直接比。',
                ],
                depth:
                  '追问「为什么并发 benchmark 的数字更小」:`ns/op` 是「总耗时 / 总操作数」,并发时多个核在分摊 wall time,所以单次操作看起来更快——但这是吞吐的提升,不是延迟的降低。[[报并发结果时必须注明并发度与 `GOMAXPROCS`,否则这个数字没有意义。]]',
                followup:
                  '再问「怎么防住回归」:把关键 benchmark 加进 CI,用 benchstat 和基线比,超过阈值就让构建失败。没有门禁的优化,三个月后一定会被某个新提交抵消掉——而且没人会发现。',
              },
              {
                kind: 'question',
                title: 'Q109 · 性能优化应该遵循什么流程?',
                questionId: 'go-index-Q109',
                intent: '考「有没有方法论」,这题答得好说明你真做过优化,而不是背过。',
                points: [
                  '先定义指标:优化吞吐(QPS)、延迟(p50/p99)、还是资源(CPU/内存/成本)?没有指标的优化无法验收。',
                  '再测量:压测复现加 profile 定位,禁止「猜测式优化」。',
                  '找瓶颈的层级:架构(缓存/异步/批量) → 算法(复杂度) → 代码(分配/锁/序列化) → 系统(参数/内核),上层收益通常远大于下层。',
                  '小步验证:一次只改一个变量,用 benchstat 或压测数据对比,避免归因错误。',
                  '回归防护:加 benchmark 门禁,让优化不会被后续提交悄悄抵消。',
                ],
                depth:
                  '追问「怎么判断该停」:看边际收益。当优化带来的收益已经小于它增加的复杂度(多一层缓存、多一个索引、多一段看不懂的代码),就该停。[[优化不是做得越多越好,是把性价比最高的几个做完就收手。]]',
                followup:
                  '再问「p99 很差但 p50 很好怎么办」:长尾通常来自三类原因——GC 停顿、锁排队、下游超时重试。先排 GC(看 heap 与 GC 频率),再排锁(mutex profile),最后排下游(trace 看 syscall 与网络等待)。',
              },
              {
                kind: 'question',
                title: 'Q111 · 怎么做压测?关注哪些指标?',
                questionId: 'go-index-Q111',
                intent: '考「指标与方法」,尤其是「只看平均值」这个最常见的错误。',
                points: [
                  '工具:`wrk` / `hey`(HTTP)、`ghz`(gRPC)、`k6`(脚本化场景)、`vegeta`(恒定速率)。',
                  '核心指标:QPS、p50/p95/p99 延迟、错误率、资源占用(CPU、内存、连接数、GC 次数)。',
                  '只看平均值是错的:p99 才是用户体验,平均值会被大量快请求掩盖。',
                  '方法:阶梯加压找到拐点(QPS 不再上升而延迟陡增的水位),再在该水位持续跑 30 分钟看是否稳定。',
                  '注意施压端本身可能先成为瓶颈:端口耗尽(TIME_WAIT 堆积)、施压机 CPU 打满。要用多机施压,并预热连接池。',
                ],
                depth:
                  '追问「拐点之后会发生什么」:超过拐点后 QPS 不再增长而延迟线性上升——系统进入排队,吞吐已达上限,多出来的请求只增加等待时间。[[所以「压到最大 QPS」那个数字没有意义,有意义的是「延迟达标前提下的最大 QPS」。]]',
                followup:
                  '再问「怎么估容量」:单实例在延迟达标前提下的 QPS × 实例数 × 冗余系数(通常 0.6–0.7)= 可承载峰值。冗余是给故障、发布、突发留的余量;不留余量的容量规划,一次滚动发布就会打满。',
              },
              {
                kind: 'question',
                title: 'Q113 · []struct 和 []*struct 在性能上有什么区别?',
                questionId: 'go-index-Q113',
                intent: '考「缓存友好性」与「GC 压力」这两个常被忽略的维度。',
                points: [
                  '`[]struct`:数据连续存放,遍历时 CPU 预取友好、cache line 命中率高;但每个元素都会被完整拷贝,大结构体代价高;扩容要搬移全部数据。',
                  '`[]*struct`:遍历需要跳指针,缓存不友好(每次可能 miss);元素小、扩容便宜;适合元素大且需要共享引用的场景。',
                  'GC 视角:`[]*struct` 有 N 个指针要扫描追踪;`[]struct` 若字段里没有指针,GC 只需跳过整块——GC 压力显著更小。',
                  '结论:热路径上的小结构体优先值切片;需要修改、共享、或元素很大时用指针切片。',
                  '验证手段:pprof 看 `mallocgc` 占比,或 `perf stat` 看 cache-miss。',
                ],
                depth:
                  '追问「为什么连续存放更快」:CPU 一次读一整条 cache line(64 字节),连续的结构体可以一次取好几个;而指针切片要先读指针、再跳到另一个地址,两次内存访问且大概率 miss。[[这就是「数据结构即性能」的具体含义:不是复杂度变了,是常数因子差好几倍。]]',
                followup:
                  '再问「值切片 append 时拷贝很贵怎么办」:扩容要搬移全部元素,大结构体是 O(n)。折中是「预分配容量加值切片」(`make([]T, 0, n)`),把扩容次数降到 0,让连续存放的收益拿到手。',
              },
              {
                kind: 'question',
                title: 'Q114 · 如何减少高频路径上的内存分配?',
                questionId: 'go-index-Q114',
                intent: '考「具体手段」,而且要能说出「分配为什么贵」。',
                points: [
                  '分配贵在两处:一次内存分配本身的开销(几十纳秒),以及它给 GC 带来的后续扫描与回收成本——[[分配次数比分配大小更影响延迟。]]',
                  '预分配容量:`make([]T, 0, n)`、`strings.Builder.Grow(n)`。',
                  '对象复用:`sync.Pool` 缓存临时缓冲,取出后记得 `Reset()`。',
                  '避免装箱:不要用 `interface{}` 承载热数据,用泛型或具体类型——装箱等于一次分配加一次类型断言。',
                  '复用输出缓冲:`strconv.AppendInt` 而不是 `strconv.Itoa`,后者返回新 string,前者往已有 `[]byte` 追加。',
                  '度量:`-benchmem` 的 `allocs/op` 对纯计算函数应该趋近 0。',
                ],
                depth:
                  '追问「sync.Pool 有什么坑」:池中对象会在 GC 时被清理(Go 1.13 后的 victim cache 让它能撑过一到两个 GC 周期),所以不能拿它保存有状态的东西;另外池里对象大小不一致会造成内存碎片,最好按尺寸分池。[[池治的是「临时缓冲」,不是「缓存」。]]',
                followup:
                  '再问「分配能真的降到 0 吗」:纯计算函数可以(全部落在栈上或复用入参缓冲);只要返回值是 string、或对象逃逸到堆,就至少有一次分配。本项目 `Encode` 的 1 allocs/op 就是 `string(buf[i:])` 那一次。',
              },
              {
                kind: 'question',
                title: 'Q54 · 火焰图和 go tool trace 分别什么时候用?',
                questionId: 'go-03-Q54',
                intent: '考「什么时候该换工具」,这题考察的是排查经验而不是知识。',
                points: [
                  '火焰图(pprof 的 Flame Graph):横轴占比、纵轴调用深度,一眼定位宽板(热点)与宽顶(自身耗时)。回答「谁最热」。',
                  'trace(`go tool trace`):时间线维度,看每个 G 的运行/阻塞、P 的利用率、GC 与 STW 区间、调度延迟、syscall。回答「什么时候卡、卡多久」。',
                  '两者互补:CPU 高用火焰图;CPU 不高但延迟有毛刺用 trace;两者都正常但 QPS 上不去,去查连接数与下游。',
                  '典型分工:上线前看火焰图优化 CPU;线上 p99 抖动看 trace 找 STW 与调度延迟。',
                ],
                depth:
                  '追问「trace 里最该看哪一段」:先看 GC 的 STW 区间是否与毛刺时间对齐;再看有没有 G 长时间处于 `_Gwaiting`(等锁或等 IO);最后看 P 的利用率——如果 P 大量空闲但 QPS 上不去,问题不在 CPU,在等待。',
                followup:
                  '再问「STW 现在还有多长」:Go 1.14 之后 STW 只剩「标记终止」阶段的两次极短停顿,通常在百微秒以内,且与堆大小关系不大。所以现代 Go 服务的毛刺,更常见的来源是「GC 辅助标记抢占 CPU」和「高频分配导致 GC 频繁触发」,而不是 STW 本身。',
              },
              {
                kind: 'question',
                title: 'Q47 · 如何查看和减少逃逸?',
                questionId: 'go-03-Q47',
                intent: '考「有没有真的用 gcflags 看过」,这题一问细节就露底。',
                points: [
                  '查看:`go build -gcflags="-m -l"`。`-m` 输出 `escapes to heap` / `moved to heap: x`,`-l` 关掉内联让结果更清晰;`-m -m` 更啰嗦但更详细。',
                  '减少:小结构体传值代替传指针(值拷贝常比逃逸便宜);避免 `interface{}` 与反射出现在热路径(用泛型替代);预分配并让大小可静态确定;`sync.Pool` 复用;闭包只捕获需要的变量。',
                  '为什么要看:逃逸意味着对象从栈搬到堆,一次分配加一份 GC 负担——[[逃逸分析不是「编译器优化」,是你和编译器之间的一场协商。]]',
                  '常见误判:函数返回指针不一定逃逸(可能被内联后留在栈上);把指针塞进 `interface{}` 一定逃逸。',
                ],
                depth:
                  '追问「channel 里放指针一定逃逸吗」:被发送的值要跨 goroutine 存活,通常逃逸;放小值类型则只有拷贝成本。判断依据是「这个值的生命周期会不会超出当前栈帧」,而不是「它是不是指针」。',
                followup:
                  '再问「`-m` 的输出怎么读」:关注两类行——`moved to heap: x` 表示变量 x 本身被搬走;`x escapes to heap` 表示 x 被存进了堆上的东西。前者往往是「取地址后传出去」,后者往往是「塞进 interface 或闭包」。',
              },
              {
                kind: 'explore',
                title: '向外:生产环境里的持续 profiling',
                from: '刚学的是「在本地跑 benchmark、采一次 profile」——一次性、离线的分析。',
                branches: [
                  {
                    direction: 'outward',
                    related: '持续 profiling:pprof 的 HTTP 端点常开、Pyroscope / Parca 这类持续采样系统',
                    basis: '两者都基于同一个事实:性能问题发生在生产,而不是在本地 benchmark 里',
                    shared: '都用同一套采样机制(runtime/pprof),都能出火焰图',
                    diff: '离线分析是「出了问题再去采」,往往采不到现场;持续 profiling 是「一直低频采」,出事时能回看时间窗口',
                    value:
                      '[[本地 benchmark 能证明「改了更好」,但只有生产 profile 能证明「这里值得改」。]]两者的差别是「假设」和「事实」。',
                  },
                  {
                    direction: 'reverse',
                    related: '反例:把优化做过头——为了 3% 的收益引入 unsafe、手写汇编、复杂的池化',
                    basis: '两者都在权衡「性能」与「可维护性」',
                    shared: '都承认性能是有代价的',
                    diff: '合理优化把复杂度换成可度量的收益;过度优化把复杂度换成一个漂亮但无关紧要的数字',
                    value:
                      '本节的例子就是一次「测得出来但不值得」的优化:快 8.3 倍,绝对收益 24ns,不采纳。[[能主动放弃一个漂亮的优化,比能做出来更能说明工程判断力。]]',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: 'stats',
      title: 'C · 访问统计:把重活搬离跳转链路',
      goal: '让 302 只负责跳转,统计在链路另一侧完成,并且丢得起、算得准',
      summary:
        '短链的后半句是「访问统计」,而它和前半句的诉求完全相反:跳转要快、要永不失败,统计要全、要能重算。这一阶段讲清三件事——打点如何从同步路径上摘下来且丢得起、Kafka 在这条链路上到底保证了什么、以及消费者如何用「幂等」把至少一次投递变成效果上的恰好一次。验收标准是三个数字:打点的单次成本、队满时的降级成本、聚合的单事件开销。',
      checkpoint: {
        questionIds: [
          'go-05-Q28',
          'go-05-Q32',
          'go-05-Q11',
          'go-index-Q131',
        ],
        passRatio: 0.8,
      },
      lessons: [
        {
          id: 'async-tap',
          title: '打点:把重活从 302 上摘下来',
          kind: 'concept',
          questionIds: [
            'go-index-Q38',
            'go-02-Q17',
            'go-02-Q19',
            'go-04-Q16',
            'go-05-Q21',
            'go-05-Q24',
          ],
          content: {
            intro:
              '跳转是这条链路里唯一不能变慢的动作:它只做两件事,查缓存、写 302。统计如果挤在这条路上同步做,就等于把一个「可以失败、可以延迟、可以丢」的需求,绑到一个「必须成功、必须快」的动作上。这一节把打点从跳转路径上摘下来:一个非阻塞入队的 Tap、一个必须有界的队列、两种失败姿势(丢弃还是阻塞),以及退出时怎么把队列里剩的东西写完。判据只有一条——用户点链接的那一下,不能因为统计多等一毫秒。',
            outline: [
              '为什么统计不能和跳转串行',
              '非阻塞入队:队满就丢,并且记下来',
              '关闭队列与排空:退出时那一批去哪了',
              'Ticker 而不是 Timer:定时器为什么会漏触发',
              '降级与观测:可丢的数据必须可被看见',
            ],
            pitfalls: [
              '在 302 路径上同步写 Kafka——broker 抖一下,整条跳转链路一起超时。',
              '队列用无界 channel——下游挂掉时不丢数据,但内存先涨到 OOM,进程被杀比丢几条打点严重得多。',
              '关闭 Tap 时不判活——并发请求向已关闭 channel 发送会 panic,而且恰好发生在退出时刻,最容易被忽略。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '跳转路径上只允许做一件事',
                body: [
                  '把一次跳转拆开看,它是整个系统里唯一的同步路径:用户点了链接,浏览器在等 302。这条路径的预算通常只有几十毫秒,却承受全站最高的 QPS——短链是极端的读多写少,一次创建对应百万次跳转。',
                  '统计是什么?是可延迟、可合并、可丢弃的旁路信息。它和跳转的唯一关系是「读同一个事实」,不是「必须同时完成」。把这两件事绑在一起,等于让最不重要的需求去决定最重要路径的可用性。',
                  '事故的形状很具体:Kafka 某个 broker 进入长 GC 暂停,producer 的 `WriteMessages` 从 2ms 变成 12s。如果它在 302 之前同步执行,这段时间里所有跳转请求都在排队,连接池打满,P99 从 30ms 涨到 12s。统计本身一点没错,错的是它站的位置。',
                  '[[判据:任何「失败了不影响用户」的动作,都不许出现在「用户正在等」的同步路径上。]]这句话反过来也成立——如果你发现某个动作不能失败,那它本来就不该做旁路处理。',
                ],
              },
              {
                kind: 'diagram',
                title: '一次跳转走四步,打点只占后两步',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    {
                      label: '① 查缓存',
                      note: 'Redis GET 约 0.3ms;未命中回源 MySQL',
                    },
                    {
                      label: '② 写 302',
                      note: '响应已经交给 net/http,剩下的只是收尾',
                    },
                    {
                      label: '③ 入队',
                      note: '非阻塞 send:队满即丢,并计入 dropped',
                    },
                    {
                      label: '④ 批量下发',
                      note: '另一组 goroutine:攒 200 条,或等 200ms',
                    },
                  ],
                  caption:
                    '关键是 ② 与 ③ 的顺序:302 先写出去,打点后发生。所以即使 ③ 整个卡住,用户也已经拿到重定向——最坏情况是报表少算,而不是页面转圈。反过来说,如果打点放在 ② 之前,任何一次 Kafka 抖动都会变成用户可见的延迟。',
                },
              },
              {
                kind: 'why',
                title: '为什么队列一定要有界',
                body: [
                  '无界队列的诱惑是「不丢数据」。但队列本质是一个只进不出的缓冲,当消费速度长期低于生产速度时,它的容量就等于内存。5 万 QPS、每条事件按 140 字节算,一秒 7MB;下游挂十分钟就是 4GB——进程先被 OOM kill,然后你丢的是所有正在处理的请求,而不只是打点。',
                ],
                without:
                  '如果没有界,唯一的保护是 GC 和操作系统的 OOM killer,而它们不会留下任何观测数据:进程突然消失,日志停在半句话上,连 dropped 计数都来不及打。故障排查最怕的不是丢数据,是不知道为什么丢。',
                real:
                  '有界 + 丢弃 + 计数器,把「丢了多少」变成一个数字。本项目的默认值是 8192 条队列、200 条一批、200ms 一刷:队满时能吸收约 160ms 的峰值流量,再往上就丢,并且 `GET /version` 里的 dropped 会立刻上涨。[[能被观测到的丢弃,比不可观测的完整更有价值。]]',
              },
              {
                kind: 'code',
                title: '`Tap.Publish`:一次 RLock、一次 select、两个计数器',
                lang: 'go',
                code:
                  'func (t *Tap) Publish(e ClickEvent) bool {\n\tt.mu.RLock()\n\tdefer t.mu.RUnlock()\n\tif t.closed {\n\t\treturn false\n\t}\n\tt.published.Add(1)\n\t// select + default = 非阻塞发送:没人接就立刻走 default\n\tselect {\n\tcase t.ch <- e:\n\t\tt.accepted.Add(1)\n\t\treturn true\n\tdefault:\n\t\tt.dropped.Add(1)\n\t\treturn false\n\t}\n}\n\nfunc (t *Tap) run() {\n\tdefer t.workers.Done()\n\tbatch := make([]ClickEvent, 0, t.opt.BatchSize)\n\ttick := time.NewTicker(t.opt.FlushPeriod)\n\tdefer tick.Stop()\n\n\tfor {\n\t\tselect {\n\t\tcase e, ok := <-t.ch:\n\t\t\tif !ok {\n\t\t\t\tt.flush(batch) // 队列已关:写完这批再退出\n\t\t\t\treturn\n\t\t\t}\n\t\t\tbatch = append(batch, e)\n\t\t\tif len(batch) >= t.opt.BatchSize {\n\t\t\t\tt.flush(batch)\n\t\t\t\tbatch = batch[:0]\n\t\t\t}\n\t\tcase <-tick.C:\n\t\t\tif len(batch) > 0 {\n\t\t\t\tt.flush(batch)\n\t\t\t\tbatch = batch[:0]\n\t\t\t}\n\t\t}\n\t}\n}',
                version: 'Go 1.23',
                env: 'go test ./internal/stats -run TestTap 五个用例本地全绿',
                verified: true,
                caption:
                  '这段代码在仓库 `internal/stats/tap.go`,5 个用例覆盖。`mu` 那把 RWMutex 看起来多余——它挡的不是并发写,而是「关闭」与「发送」之间的竞态:向已关闭的 channel 发送会 panic,而用 recover 兜住只是把 bug 藏起来。',
              },
              {
                kind: 'question',
                title: 'Q38 · 如何优雅地关闭 channel?多个发送者怎么办?',
                questionId: 'go-index-Q38',
                intent:
                  '这题真正的考点是「谁有权关闭」,不是「怎么关」。多发送者的场景下,关闭权必须是唯一的。',
                points: [
                  '先说结论:channel 由「拥有它的那一方」关闭,通常是发送方;接收方永远不关。因为接收方无法确定还有没有别的发送者。',
                  '单发送者最简单:发完直接 `close(ch)`,接收方用 `for v := range ch` 自然退出。这是唯一不需要额外同步的场景。',
                  '多发送者两条正路:① 用一个额外的 `done` channel,发送方 `select { case ch <- v: case <-done: }`,由协调者 `close(done)`;② 用 `sync.WaitGroup` 等所有发送者退出后,由协调者关闭 ch。',
                  '本项目的形态接近第二种:Tap 里有 `mu` + `closed` 标志,Close 在写锁内 `close(ch)`,Publish 在读锁内判断并发送。[[借锁把「判活 + 发送」变成原子动作,比 recover 一个 send on closed channel 干净得多。]]',
                  '再补一个容易漏的点:关闭 channel 不会丢掉缓冲区里剩下的元素,接收方仍然能读完。所以「关闭」和「排空」是两件事,Close 里必须等 worker 读完。',
                ],
                depth:
                  '追问「close 之后还能读吗」:能,先读到缓冲区里剩下的值,读空后返回零值 + ok=false。所以 Close 之后立刻退出进程,缓冲区里的东西就真丢了——这也是 graceful shutdown 必须等 worker 的原因。',
                followup:
                  '如果面试官问「生产者远快于消费者怎么办」:那不是 channel 语义问题,是背压问题——要么有界队列丢,要么上游限流。channel 本身不提供背压,它只提供阻塞或丢弃。',
              },
              {
                kind: 'principle',
                title: 'Close 的四步:顺序错了就等于没做',
                body: [
                  '优雅退出的难点不在「关」,在「关之前还要做什么」。打点这一块的顺序尤其敏感,因为它同时依赖三个还活着的资源:在途请求、队列、下游。',
                ],
                steps: [
                  {
                    title: '① 摘流并停止接收新请求',
                    detail:
                      'ready 置 false + `srv.Shutdown`。在途请求必须在打点关闭之前跑完,否则它们产生的点击会打到已关闭的 Tap 上,被直接丢弃——丢的恰好是「已经在服务用户」的那批请求。',
                  },
                  {
                    title: '② 关闭队列',
                    detail:
                      '`close(ch)`。此后 Publish 一律返回 false,不再有新事件进来。这一步必须发生在 ① 之后,否则在途请求会撞上已关闭的 channel。',
                  },
                  {
                    title: '③ 等 worker 排空',
                    detail:
                      'worker 读到 channel 关闭后,把手上这一批 flush 掉再退出。用 `ctx` 限时,避免下游挂了导致退出永远等不到;超时就把 pending 的数字打进日志。',
                  },
                  {
                    title: '④ 最后才关下游',
                    detail:
                      'Kafka writer、连接池都在 ③ 之后关。顺序反了,第 ③ 步的 flush 会全部失败,而那正是「重启丢掉最后一批数据」的真实成因。',
                  },
                ],
              },
              {
                kind: 'code',
                title: '`main.go`:把关闭顺序变成一份能读的数据',
                lang: 'go',
                code:
                  '// 注册顺序 = 依赖顺序。CloseAll 逆序执行,所以最后注册的打点最先关。\nresources := &lifecycle.Stack{}\ndefer func() {\n\t// 用独立 context:走到这里时 signal ctx 已经取消,复用它会让关闭动作立刻失败。\n\tcloseCtx, cancelClose := context.WithTimeout(context.Background(), cfg.ShutdownGrace)\n\tdefer cancelClose()\n\n\tresults, err := resources.CloseAll(closeCtx)\n\tfor _, r := range results {\n\t\tif r.Err != nil {\n\t\t\tlogger.Error("resource close failed", "name", r.Name, "elapsed", r.Elapsed.String(), "err", r.Err)\n\t\t\tcontinue\n\t\t}\n\t\tlogger.Info("resource closed", "name", r.Name, "elapsed", r.Elapsed.String())\n\t}\n\tif err != nil {\n\t\tlogger.Error("退出时资源未全部干净关闭", "err", err)\n\t}\n}()\n\nresources.Add("mysql", func(context.Context) error {\n\tsqlDB, err := db.DB()\n\tif err != nil {\n\t\treturn err\n\t}\n\treturn sqlDB.Close()\n})\nresources.Add("redis", func(context.Context) error { return rdb.Close() })\nresources.Add("kafka-sink", func(context.Context) error { return ks.Close() }) // 没配 Kafka 时 Add(nil) 自己跳过\nresources.Add("stats-tap", tap.Close)  // 最后注册 → 最先关闭',
                version: 'Go 1.23',
                env: 'go test ./pkg/lifecycle 五个用例(逆序、失败不中断、nil 跳过、耗时、空栈)本地全绿',
                verified: true,
                caption:
                  '裸 `defer` 的问题不是它不可靠,而是它的顺序**只存在于阅读时的推理里**:中间插一行新的 defer,顺序就悄悄变了,编译器不提醒、测试也抓不到。改成栈之后,顺序从一个「位置约定」变成一条可以被 `Names()` 读出来、被用例断言的数据。三个副产品一起到手:一个资源关失败不会中断其余(否则 Redis 关不掉会让 MySQL 连接池泄漏)、错误用 `errors.Join` 聚合而不是逐条吞掉、每个资源关多久都会进日志——[[退出慢的那个资源,就是下次排障的入口。]]',
              },
              {
                kind: 'question',
                title: 'Q17 · nil channel / 已关闭 channel 各种操作的行为表?',
                questionId: 'go-02-Q17',
                intent:
                  '考的是能不能把四象限行为表默出来,以及知不知道这些「异常行为」各自有正当用途。',
                points: [
                  '先给表:nil channel 上发送、接收都永久阻塞;已关闭 channel 上发送 panic、接收立刻返回零值 + false;关闭 nil channel 会 panic;重复关闭也会 panic。',
                  'nil channel 的正经用途是「动态关闭 select 的某个分支」:把某个 case 的 channel 置成 nil,那条分支就永远不被选中,不需要额外写 if 判断。',
                  '已关闭 channel 的接收是「有缓冲的」:缓冲区里还有值就先返回那些值(ok=true),空了才返回零值(ok=false)。',
                  '[[最常见的事故:用 `v := <-ch` 接收却不看 ok,把关闭后的零值当真实数据。]]打点场景里这会写进一批 code 为空的事件,统计上表现为「某个短码的 PV 突然暴涨」。',
                ],
                depth:
                  '追问「为什么关闭要 panic 而不是静默」:因为关闭的语义是「不会再有值了」,重复关闭或关闭 nil 都说明代码逻辑错了,静默会让错误延迟到消费方才爆,更难查。',
                followup:
                  '如果问「怎么判断一个 channel 是否已关闭」:没有可靠办法(读到零值不等于关闭)。正解是设计上不依赖这个判断——由唯一的持有者负责关闭,其他人只读不关。',
              },
              {
                kind: 'question',
                title: 'Q19 · select 的行为和底层实现?',
                questionId: 'go-02-Q19',
                intent:
                  '表面问语法,实际问的是「随机选择的理由」和「非阻塞用法」。这两点答不出来,说明只用过最简单的 select。',
                points: [
                  'select 在所有就绪的 case 里随机选一个。随机不是缺陷而是设计:如果按顺序选,第一个 case 会长期垄断,后面的分支饿死。',
                  '`default` 让 select 变成非阻塞:没有就绪 case 时走 default。本项目的 Publish 就是 `select { case ch<-e: ... default: dropped++ }`,一行代码把「阻塞」换成「丢弃」。',
                  '底层是 runtime 的 `selectgo`:把所有 case 对应的 sudog(等待节点)挂到各自 channel 的等待队列上,然后休眠;任一 channel 就绪时被唤醒,并把其余挂载摘掉。',
                  '`select {}`(零 case)永久阻塞,是让 main goroutine 停住的最短写法;但生产代码里更该写 `<-ctx.Done()`,否则收到信号也退不出去。',
                ],
                depth:
                  '追问「select 会不会真的均等随机」:是伪随机,pollorder 的种子来自 runtime 的 fastrand。统计上均匀,但不保证「交替」——写测试断言「十次里各五次」会偶发失败。',
                followup:
                  '如果问「select 的 case 能不能写复杂表达式」:能,但所有 case 的 channel 表达式会在进入 selectgo 之前全部求值一次。写带副作用的表达式会得到「没被选中却执行了」的意外结果。',
              },
              {
                kind: 'compare',
                title: '同步写 / 无界队列 / 有界队列 + 丢弃',
                head: ['方案', '302 延迟', '下游挂掉时', '数据完整性'],
                rows: [
                  [
                    '同步写 Kafka 或 MySQL',
                    '起步 +2ms,抖动时 +秒级',
                    '跳转跟着一起挂',
                    '完整,但代价是可用性',
                  ],
                  [
                    '无界队列 + 异步',
                    '不变',
                    '内存涨到 OOM,进程被杀',
                    '一条不丢,直到被杀,然后全丢',
                  ],
                  [
                    '有界队列 + 丢弃 + 计数',
                    '不变(队满时 21ns)',
                    '丢弃,dropped 可见',
                    '丢一部分,但知道丢了多少',
                  ],
                ],
                note:
                  '第三种的「知道丢了多少」才是关键:前两种在故障时只有现象没有数字,排查时你连「丢没丢」都答不上来。',
                caption:
                  '这张表选的不是「哪个不丢」,而是「丢的时候有没有数」。打点这种可以重算、可以补采的数据,丢一部分可接受;不可接受的是丢了却不知道。',
              },
              {
                kind: 'question',
                title: 'Q16 · Timer/Ticker 有什么坑?time.After 在循环里的问题?',
                questionId: 'go-04-Q16',
                intent:
                  '这题在考「你踩过没有」,答不到 Reset 的丢失语义,基本可以判断没在长跑服务里用过定时器。',
                points: [
                  '`time.After` 在循环里每次都新建一个 Timer,在它触发之前不会被 GC。高频循环会积累成千上万个待触发的 Timer,这是最经典的内存增长原因。',
                  '`Timer.Reset` 的坑更隐蔽:如果 Timer 已经触发但值还没被读走,Reset 之后那一次信号会丢失,于是你少了一次超时。正确做法是先 Stop 并排空 channel。',
                  '`Ticker` 不保证「按间隔精确」:如果处理时间超过间隔,触发会被丢弃而不是排队,所以它不能当计数器用,也不该假设「一秒钟正好 5 次」。',
                  '[[本项目用 Ticker 而不是「每次 flush 后 Timer.Reset」,正是为了绕开上面第二条。]]一个 Ticker 加一个「批满立即 flush」的分支,就能同时覆盖量大与量小两种形态。',
                ],
                depth:
                  '追问「Go 1.23 改了什么」:Timer/Ticker 的 channel 从带缓冲(容量 1)改成同步 channel,Stop/Reset 不再需要手动排空,语义更接近直觉。旧代码里的 `if !t.Stop() { <-t.C }` 在新版本上反而可能阻塞。',
                followup:
                  '如果问「低峰期每 200ms 空转一次值不值」:一次 select 唤醒的成本是百纳秒级,一天 43 万次,合计几十毫秒 CPU。为省这点而引入 Reset 的复杂性,是不划算的交换。',
              },
              {
                kind: 'question',
                title: 'Q24 · 限流算法?熔断/降级?',
                questionId: 'go-05-Q24',
                intent:
                  '考的是「保护手段的分层」:限流保护自己,熔断保护调用方,降级保护业务。三者不是一回事。',
                points: [
                  '限流四个常见算法:计数器(有临界突刺)、滑动窗口(解决突刺,用内存换精度)、漏桶(恒定速率,削峰但不允许突发)、令牌桶(允许一定突发,最常用)。',
                  '熔断是另一类保护:统计错误率或慢调用比例,超阈值直接快速失败,并有半开状态试探恢复。它保护的是「不要把请求继续打给已经坏掉的下游」。',
                  '打点这里用的是最土的一种:队列满即丢弃。它等价于「容量等于队列长度的漏桶,超出的直接丢」,不需要额外组件,而且丢弃成本只有 21ns。',
                  '[[降级必须分级:PV 可以丢,UV 的 PFADD 可以丢,但「这个短码存在吗」不能丢——所以统计走旁路,短链主表永远同步写。]]分清哪些数据能丢,比选哪个算法更重要。',
                ],
                depth:
                  '追问「令牌桶怎么实现」:一个带容量的桶 + 按时间补充的速率,取令牌时先按 elapsed 补齐再判断。分布式场景要用 Redis + Lua 保证「补令牌 + 取令牌」的原子性。',
                followup:
                  '如果问「为什么不用 Sentinel 那套」:并发模型不同。Go 里一个 select 加一个有界 channel 就够了,引入完整熔断器只会多出一层要调的参数和一堆默认值。',
              },
              {
                kind: 'question',
                title: 'Q21 · CAP 与 BASE?etcd/ZooKeeper/Redis 是哪种?',
                questionId: 'go-05-Q21',
                intent:
                  '这题最容易背成三选二。真正的考点是「P 不是选项,是事实」,以及同一个系统里可以有不同的一致性级别。',
                points: [
                  'CAP 的准确表述:网络分区发生时,一致性与可用性只能二选一。P 在分布式系统里不是可选项,所以真正的选择是「分区时选 C 还是选 A」。',
                  'BASE 是对 AP 的工程化描述:基本可用、软状态、最终一致。打点管线是标准的 BASE 系统——302 永远可用,统计慢几秒甚至丢几条,最后仍收敛到一份可用报表。',
                  '对照写路径:创建短链要保证「同一 URL 只出一条短码」,这是 C;它靠唯一索引在单库内做到,不需要跨系统强一致。[[同一个系统里不同数据可以有不同的一致性级别,这是设计自由度。]]',
                  '判断标准还是那句:读旧值或丢一条会造成什么后果。报表少一次点击没人受伤;短码重复则是数据损坏。',
                ],
                depth:
                  '追问「etcd 是哪一类」:CP,ZooKeeper 也是 CP;Redis 单机看起来是 CA,但主从异步复制下分区会丢写,实际属于 AP + 弱一致。答「Redis 是 CA」是典型背书痕迹。',
                followup:
                  '如果问「最终一致的『最终』是多久」:必须给数字,否则这个词没有意义。本项目的数字是:正常 200ms 内可见;下游故障时以 Kafka 的保留期为上限。',
              },
              {
                kind: 'diagram',
                title: '一个打点事件的一生:四个状态,一条回头路',
                diagram: {
                  type: 'state',
                  states: [
                    {
                      label: '入队',
                      note: 'Publish 非阻塞 send,绝大多数在这里成功',
                    },
                    {
                      label: '成批',
                      note: '攒到 200 条,或 200ms 到期',
                    },
                    {
                      label: '写入',
                      note: 'WriteBatch → Kafka;失败计入 failed',
                    },
                    {
                      label: '丢弃',
                      note: '队满直接放弃,计入 dropped',
                    },
                  ],
                  transitions: [
                    '批满或定时器到期',
                    '写入成功,批次计数 +1',
                    '队列已满,select 走 default',
                  ],
                  back: {
                    label: '丢弃后回到等待下一批',
                    from: 4,
                    to: 1,
                    note: '丢弃不重试、不进死信:下一次点击会补上新的样本',
                  },
                  caption:
                    '注意「丢弃」不是终点状态而是回到起点:打点没有重试队列,因为它的价值随时间衰减——十分钟前的点击补回来,对实时看板也没有意义。要补数据,正确做法是从访问日志离线重算,而不是在内存里死等。',
                },
              },
              {
                kind: 'explore',
                title: '从「丢弃」到「采样」:可观测链路的下一种形态',
                from:
                  '这一节把打点做成「能丢但可观测」。这个取舍在流量再上一个量级时会不够用:当 QPS 到百万级,即使一条不丢,下游也存不下全部明细。',
                branches: [
                  {
                    direction: 'outward',
                    related: 'OpenTelemetry Collector 与头部采样/尾部采样',
                    basis: '都是「在链路上主动做取舍」',
                    shared: '都承认旁路数据必须有损,并且要把损失量化',
                    diff: '采样按比例决定「留哪些」,丢弃按容量决定「丢哪些」',
                    value:
                      '采样是有意的、可按比例还原的;丢弃是被动的、只能靠计数器兜底。[[能采样就不要丢弃,因为采样后的数字还能推回全量。]]',
                  },
                  {
                    direction: 'reverse',
                    related: '给 Tap 加本地 WAL(先落盘再发 Kafka)',
                    basis: '都是「下游不可用时不丢」',
                    shared: '都接受延迟,都要求写入幂等',
                    diff: 'WAL 换来了不丢,代价是磁盘、恢复逻辑和更复杂的退出流程',
                    value:
                      '只在计费、审计这类「一条都不能少」的事件上值得;PV 统计用不上,因为少一条的损失远小于多一套 WAL 的维护成本。',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'kafka-semantics',
          title: 'Kafka:它为什么快,以及它到底保证了什么',
          kind: 'concept',
          questionIds: [
            'go-05-Q11',
            'go-05-Q14',
            'go-index-Q155',
            'go-index-Q130',
            'go-index-Q132',
            'go-05-Q13',
          ],
          content: {
            intro:
              '打点进 Kafka 之后,「不丢」这件事就从「代码写对」变成了「三四个开关配对」。这一节把 Kafka 拆成两半:一半是它为什么能扛住百万级写入(顺序写、零拷贝、批量、压缩),另一半是它在什么条件下会丢消息、会重复、会乱序。我们只用得上三个概念——分区、消费者组、偏移量提交时机,但它们决定了整条统计链路的语义。落地时会看到:producer 用 RequireAll,consumer 关掉自动提交,并且分区键选短码而不是 event_id。',
            outline: [
              '为什么打点要先过 MQ,而不是直接写库',
              'Topic / Partition / Consumer Group 三件套',
              '不丢的三个开关:acks、重试、副本',
              '手动提交偏移量:提交时机就是投递语义',
              '分区键为什么选短码',
            ],
            pitfalls: [
              'producer 用 `acks=1`——leader 写完就返回,leader 立刻宕机且副本没同步时,消息静默消失。',
              'consumer 开着自动提交——它每秒提交的是「已拉取」而不是「已处理」,崩一次就丢一批。',
              '分区数拍脑袋定——分区只能增不能减,而且消费者数超过分区数后,多出来的实例纯属空转。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '为什么打点要先过 MQ,而不是直接写库',
                body: [
                  '最直接的写法是「302 之后起一个 goroutine,直接 `INSERT` 到统计表」。本地跑得很好,上线后两个问题一起出现:一是写入 QPS 直接压在 MySQL 上,统计写和业务读抢同一批连接;二是流量有峰谷,凌晨的写入量只有白天的十分之一,数据库规格却要按峰值买。',
                  '加一层 MQ 解决的正是这两件事:削峰(把 1 秒的 5 万次写入摊到 10 秒里)和解耦(生产者不需要知道有几个消费者、消费者挂了会不会影响生产)。代价是多了一个必须运维的组件,以及「不丢不重」的语义要自己保证。',
                  '还有一个不太被提到但很实际的好处:[[MQ 是一段可以重放的历史。]]统计口径写错了(比如时区算错、UV 定义改了),直接写库的方案只能从备份恢复;有 MQ 且保留期内,把消费组的 offset 重置到 7 天前重跑一遍就行。',
                  '所以判断要不要上 MQ,不看数据量大小,看两条:写入能不能接受同步延迟?口径错了能不能重算?两条有一个成立,就值得引入。',
                ],
              },
              {
                kind: 'diagram',
                title: '三个角色:生产者、分区、消费者组',
                diagram: {
                  type: 'layers',
                  items: [
                    {
                      label: 'Producer',
                      note: '按 Key 哈希选分区,批量发送,acks=all',
                      tone: 'primary',
                    },
                    {
                      label: 'Topic: link.clicks',
                      note: '逻辑上的队列;物理上分成 N 个 Partition',
                      tone: 'muted',
                    },
                    {
                      label: 'Partition 0..N-1',
                      note: '每个分区是一条只追加的日志,分区内严格有序',
                      tone: 'primary',
                    },
                    {
                      label: 'Consumer Group',
                      note: '组内每个分区只分给一个消费者,组间互不影响',
                      tone: 'muted',
                    },
                    {
                      label: 'link_stats_daily',
                      note: '消费者的产出:按 (code, day) 聚合后的增量',
                      tone: 'primary',
                    },
                  ],
                  caption:
                    '两层顺序要分清楚:分区内有序,Kafka 只保证这一层;跨分区没有任何顺序保证。所以「同一条短码的点击有序」是靠「同一个 Key 落同一个分区」换来的,不是 Kafka 自动给的。消费者组则是扩容的单位:一个分区同时只能被组内一个消费者消费,所以消费者数超过分区数就是浪费。',
                },
              },
              {
                kind: 'question',
                title: 'Q11 · Kafka 为什么快?',
                questionId: 'go-05-Q11',
                intent:
                  '这题答「因为零拷贝」只算及格。真正要讲清的是「它把随机写变成了顺序写」,以及每一层优化各解决了什么。',
                points: [
                  '最根本的一条:分区是一段只追加的日志,写入永远是顺序追加。机械盘上顺序写比随机写快两个数量级,SSD 上差距小但依然存在,更重要的是顺序写对文件系统和页缓存都友好。',
                  '第二条是批量:producer 攒批发送、broker 批量落盘、consumer 批量拉取。把「每条一次系统调用」变成「一批一次」,摊掉的大部分是固定开销。',
                  '第三条是零拷贝:`sendfile` 让数据从页缓存直接到网卡,省掉「内核态→用户态→内核态」两次拷贝。注意它只在「不做消息转换」时成立,所以 broker 端做压缩解压会退化。',
                  '[[还有一条常被忽略:分区让并行成为天然属性。]]读写都以分区为单位,加机器就加吞吐,不需要改任何代码。这也是它比 RabbitMQ 更适合「日志/打点」这类场景的结构性原因。',
                ],
                depth:
                  '追问「零拷贝的代价是什么」:数据不过用户态,应用就没机会检查或改写内容——所以 broker 端做消息校验、格式转换、加密都要额外拷贝。安全与性能在这里是对立的。',
                followup:
                  '如果面试官问「顺序写就一定快吗」:还要看刷盘策略。`flush.messages`/`flush.ms` 决定什么时候落盘,异步刷盘靠页缓存兜底,宕机会丢最后一段——这也是它需要多副本而不是单机可靠的原因。',
              },
              {
                kind: 'principle',
                title: '不丢的三个开关,缺一个就不成立',
                body: [
                  '「Kafka 会丢消息吗」这个问题没有统一答案,它完全取决于三个配置。面试时能把这三点拆开讲,比背「Kafka 不丢」有用得多。',
                ],
                steps: [
                  {
                    title: '① 生产端 acks:等谁确认',
                    detail:
                      '`acks=0` 发出去就不管;`acks=1` 等 leader 落盘;`acks=all` 等所有 ISR 副本都落盘。只有 all 能挡住「leader 写完立刻宕机、副本还没同步」这个窗口。本项目的 `RequiredAcks: kafka.RequireAll` 就是它。',
                  },
                  {
                    title: '② 生产端重试与幂等',
                    detail:
                      '网络超时不代表失败,可能只是 ack 丢了。开启重试(`retries > 0`)会把「未知」变成「可能重复」;再开幂等 producer(`enable.idempotence`)用 PID + 序列号在 broker 端去重,把重复也消掉。代价是只能保证单分区、单会话内。',
                  },
                  {
                    title: '③ 副本与 min.insync.replicas',
                    detail:
                      '`replication.factor` 决定有几份,`min.insync.replicas` 决定「至少几份落盘才算成功」。两者要一起看:副本 3、ISR 最小 1 时,acks=all 依然可能只写了一份。',
                  },
                  {
                    title: '④ 消费端:处理完再提交',
                    detail:
                      '前三步保证「消息到了 Kafka 不丢」,最后一步保证「消息到了消费者不丢」。关掉自动提交,处理成功之后再 `CommitMessages`。[[这里是全链路唯一一处「顺序反了就等于没做」的地方。]]',
                  },
                ],
              },
              {
                kind: 'question',
                title: 'Q130 · 消息队列如何保证消息不丢?',
                questionId: 'go-index-Q130',
                intent:
                  '这题必须按「生产 → 存储 → 消费」三段答,漏掉任何一段都算不完整。答完还要主动说「不丢的代价是重复」。',
                points: [
                  '生产段:acks=all + 重试 + 幂等 producer。三者一起才把「发出去了但不确定」这个窗口关掉。',
                  '存储段:多副本 + `min.insync.replicas >= 2` + 不做异步刷盘的过度优化。同时要保证「副本没同步时生产者写不进来」,否则可用性会把可靠性吃掉。',
                  '消费段:手动提交偏移量,先处理业务再提交。业务处理失败就不提交,让消息被重新投递。',
                  '[[必须主动补一句:这套组合得到的是「至少一次」,不是「恰好一次」。]]要变成恰好一次,只能靠消费端幂等——这正是下一节要解决的问题。',
                ],
                depth:
                  '追问「Kafka 的 exactly-once 是什么」:事务型 producer + `read_committed` 消费者,能把「生产 + 消费 + 提交偏移」放在一个事务里。但它只管 Kafka 内部,写 MySQL 那一步仍然要自己幂等。',
                followup:
                  '如果问「acks=all 会慢多少」:取决于副本数与网络,RTT 从 1 次变 2 次,吞吐通常下降 20%–50%。打点这种量级完全承受得起,不值得为它换可靠性。',
              },
              {
                kind: 'question',
                title: 'Q155 · Kafka 的架构是怎样的?消费者组如何工作?',
                questionId: 'go-index-Q155',
                intent:
                  '考的是「分区分配」和「rebalance」这两个具体机制。只会说「一个组里多个消费者」是不及格的。',
                points: [
                  '物理组成:broker(进程)、topic(逻辑)、partition(物理日志)、replica(副本,分 leader/follower)、controller(负责选主与元数据)。',
                  '消费者组:组内每个分区只分配给一个消费者,所以「组内并行度 = 分区数」。消费者数 > 分区数时,多出来的实例分不到分区,纯空转。',
                  'rebalance 的触发条件:消费者上下线、分区数变化、订阅关系变化。触发期间整组停止消费(STW),所以「频繁滚动发布」会表现为消费延迟周期性抖动。',
                  '[[协作式再均衡(cooperative-sticky)比 eager 好在于:它只迁移需要迁的分区,不是全部收回重分。]]这就是 `partition.assignment.strategy` 这个参数的实际意义。',
                ],
                depth:
                  '追问「offset 存在哪」:存在 `__consumer_offsets` 这个内部 topic 里,按 group + partition 做 key。所以 offset 提交本身也是一次 Kafka 写入,这也解释了为什么「每条消息提交一次」会把 broker 打爆。',
                followup:
                  '如果问「怎么做到不停机扩容」:先加分区(只能增),再用协作式再均衡;或者干脆按「消费者数 = 分区数」规划好,扩容靠加机器换更大的组,而不是原地加实例。',
              },
              {
                kind: 'code',
                title: 'producer:四个参数各挡一种失败',
                lang: 'go',
                code:
                  'w := &kafka.Writer{\n\tAddr:         kafka.TCP(brokers...),\n\tTopic:        topic,\n\tBalancer:     &kafka.Hash{},     // 按 Key 分区:同码同分区\n\tRequiredAcks: kafka.RequireAll,   // 等所有 ISR 落盘\n\tAsync:        false,              // 同步:失败必须让业务知道\n\tCompression:  kafka.Snappy,       // 打点字段重复,压缩比 3-5x\n\tBatchSize:    1000,\n\tBatchTimeout: 200 * time.Millisecond,\n\tWriteTimeout: 10 * time.Second,\n}\n\nfor i, e := range batch {\n\tpayload, _ := json.Marshal(e)\n\tmsgs[i] = kafka.Message{\n\t\tKey:   []byte(e.Code), // 分区键是短码,不是 event_id\n\t\tValue: payload,\n\t\tTime:  e.At,\n\t}\n}\nreturn w.WriteMessages(ctx, msgs...)',
                version: 'kafka-go v0.4.47',
                env: 'go test ./internal/stats 钉住分区键与七个 writer 参数(TestNewKafkaSinkConfig / TestBuildMessages);真实 broker 投递未验',
                verified: true,
                caption:
                  '这段在 `internal/stats/kafka.go`。`Async: false` 是刻意的:异步写吞吐高得多,但失败只进内部 channel,业务侧永远不知道丢了多少。打点这个量级(< 5 万/秒)用不上异步。',
              },
              {
                kind: 'compare',
                title: 'Kafka / RocketMQ / RabbitMQ 选型',
                head: ['维度', 'Kafka', 'RocketMQ', 'RabbitMQ'],
                rows: [
                  [
                    '定位',
                    '流式日志、大数据管道',
                    '业务消息、事务消息',
                    '复杂路由、低延迟任务',
                  ],
                  [
                    '吞吐',
                    '最高(百万级/秒)',
                    '高(十万级/秒)',
                    '中(万级/秒)',
                  ],
                  [
                    '延迟',
                    '毫秒到几十毫秒',
                    '毫秒级',
                    '微秒到毫秒级',
                  ],
                  [
                    '顺序与重试',
                    '分区内有序;无内置重试队列',
                    '支持顺序消息、延迟消息、重试队列',
                    '靠 ack 与死信队列',
                  ],
                  [
                    '运维复杂度',
                    '中(依赖 ZK 或 KRaft)',
                    '中(依赖 NameServer)',
                    '低(单机即可)',
                  ],
                ],
                note:
                  '本项目选 Kafka 只有一个理由:打点是典型的「高吞吐、可丢、可重放」日志型流量,而它恰好是 Kafka 最擅长的形状。',
                caption:
                  '选型的判据不是「谁更强」,而是「你的消息是什么形状」。业务消息要事务和延迟投递、量不大,RabbitMQ 或 RocketMQ 更合适;日志与打点要吞吐和回放,Kafka 更合适。',
              },
              {
                kind: 'question',
                title: 'Q14 · Kafka vs RocketMQ vs RabbitMQ 选型?',
                questionId: 'go-05-Q14',
                intent:
                  '考的是能不能给出判据,而不是给排名。答「Kafka 最快所以都选 Kafka」是典型的只背结论。',
                points: [
                  '先问三个问题:消息量大不大?要不要事务/延迟/顺序?团队能不能运维?这三个答案基本就决定了选型。',
                  'Kafka 强在吞吐与生态(Flink、Spark、ClickHouse 都原生对接),弱在「业务语义」:没有延迟消息、没有内置重试队列、分区数改起来麻烦。',
                  'RocketMQ 是国内业务消息的常见解:事务消息、延迟消息、消息重试、消息轨迹都内置,代价是社区与生态比 Kafka 小。',
                  '[[RabbitMQ 的优势是路由灵活(Exchange 类型多)和低延迟,劣势是堆积能力差——大量消息积压时性能断崖式下降。]]所以「会不会积压」是选型必须问的一句。',
                ],
                depth:
                  '追问「为什么 Kafka 堆积能力强」:因为消费只是移动一个 offset,消息还在日志里不动;而 RabbitMQ 的堆积会把消息从内存换到磁盘,并打乱索引结构。',
                followup:
                  '如果问「能不能同时用两个」:常见组合是「业务消息走 RocketMQ,日志走 Kafka」,代价是两套运维。小团队通常只留一套,按主要流量选。',
              },
              {
                kind: 'code',
                title: 'consumer:把「提交时机」暴露成返回值',
                lang: 'go',
                code:
                  'r := kafka.NewReader(kafka.ReaderConfig{\n\tBrokers:        brokers,\n\tTopic:          topic,\n\tGroupID:        group,\n\tCommitInterval: 0, // 关闭自动提交\n\tStartOffset:    kafka.FirstOffset,\n\tMaxWait:        200 * time.Millisecond,\n})\n\n// Fetch 返回事件与「提交函数」:什么时候提交由调用方决定\nfunc (c *Consumer) Fetch(ctx context.Context, max int) ([]ClickEvent, CommitFunc, error) {\n\t// ... 逐条 FetchMessage,反序列化失败只跳过并计数\n\tcommit := func(ctx context.Context) error {\n\t\treturn c.r.CommitMessages(ctx, msgs...)\n\t}\n\treturn events, commit, nil\n}',
                version: 'kafka-go v0.4.47',
                env: 'go test ./internal/stats -run Fetch 五个用例(fake reader)钉住提交时机与坏消息处理;未连真实 broker',
                verified: true,
                caption:
                  '把 commit 做成返回值,是为了让「提交时机」这件事在类型签名上就看得见。如果 Reader 内部自动提交,调用方根本没有机会表达「我还没处理完」。[[好的 API 会让错误用法写不出来。]]',
              },
              {
                kind: 'question',
                title: 'Q13 · 消息重复/顺序/积压怎么处理?',
                questionId: 'go-05-Q13',
                intent:
                  '三个子问题各有各的解,混在一起答就会变成一锅粥。核心是「重复靠幂等、顺序靠分区、积压靠扩容」。',
                points: [
                  '重复:根因是「至少一次」投递。解法不是不让它重复,而是让消费幂等——唯一键、状态机、或者本例的「增量累加 + 事件去重」。',
                  '顺序:只能保证分区内。要保序就把同一个业务键哈希到同一分区(本例用短码),并且注意「扩分区会破坏已有的键到分区映射」。',
                  '积压:先分清是「消费慢」还是「生产暴涨」。消费慢就加消费者(不超过分区数)、优化单条处理耗时、把同步 IO 改批量;生产暴涨则要考虑限流或临时扩分区。',
                  '[[积压时最危险的动作是「重启消费者」:rebalance 会让整组停摆几十秒,积压曲线会先陡增再下降,监控上看起来像故障扩大。]]',
                ],
                depth:
                  '追问「顺序消息能不能并行消费」:不能。要并行又要有序,只能先按业务键分区,让「同一个键」串行——这是唯一的解法,不存在既全局有序又无限并行的方案。',
                followup:
                  '如果问「消费失败的消息怎么办」:不能无限重试(会堵住整个分区)。要么重试 N 次后进死信 topic,要么记下 offset 跳过并在业务侧补偿。本项目的坏消息策略是「记日志 + 跳过 + 照常提交」。',
              },
              {
                kind: 'question',
                title: 'Q132 · 消息堆积了怎么处理?',
                questionId: 'go-index-Q132',
                intent:
                  '这题真正在考「能不能分清原因再动手」。上来就说「加机器」的人,通常没处理过真的积压。',
                points: [
                  '先量化:积压多少条、生产速率多少、消费速率多少。三个数字就能算出「按当前速度要多久追上」,以及「加多少消费者能在目标时间内追平」。',
                  '再看消费端:是单条处理太慢(同步写库、逐条 RPC),还是被下游拖住(数据库慢查询、锁等待)。前者改批量,后者要治下游。',
                  '扩容有天花板:消费者数不能超过分区数。到顶了就只剩两条路——扩分区(会打乱键映射),或者提高单消费者吞吐(批量 + 并发处理 + 异步 IO)。',
                  '[[还有一个非常实用的手段:临时把消费逻辑降级。]]积压时先只写 PV 不算 UV,把单条耗时从两次 IO 降到一次,往往比加机器更快见效。',
                ],
                depth:
                  '追问「扩分区会有什么副作用」:Key 到分区的映射变了,原来同一个键的消息可能落到不同分区,顺序保证失效。所以扩分区要在低峰做,并接受「交界处可能乱序」。',
                followup:
                  '如果问「怎么防止下次再堆积」:给积压设告警阈值(按时间而不是条数,比如「落后 5 分钟」),并且在压测里跑一遍「消费端慢 3 倍」的场景,提前知道瓶颈在哪。',
              },
              {
                kind: 'diagram',
                title: '一批消息的处理顺序:提交必须垫底',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    {
                      label: '① FetchMessage × N',
                      note: '最多 500 条;坏消息跳过但保留其 offset',
                    },
                    {
                      label: '② Aggregate',
                      note: '去重、按 (code, day) 折叠成增量',
                    },
                    {
                      label: '③ 写 MySQL',
                      note: '一条多值 upsert;失败则整批不提交',
                    },
                    {
                      label: '④ 写 Redis UV',
                      note: 'PFADD 幂等;失败只降级不阻塞',
                    },
                    {
                      label: '⑤ CommitMessages',
                      note: '只有走到这里,这批才算「处理过」',
                    },
                  ],
                  caption:
                    '③ 与 ⑤ 之间是「至少一次」的全部来源:崩在 ③ 之后 ⑤ 之前,这批会被重新投递。所以 ③ 必须是幂等的——多值 upsert 恰好满足,而「先 SELECT 再 UPDATE」不满足。',
                },
              },
              {
                kind: 'why',
                title: '分区键为什么是短码,不是 event_id',
                body: [
                  '用 event_id 当 Key 看起来更「均匀」:128 位随机串,哈希后必然分散到所有分区,负载最均衡。但它同时打散了唯一需要保序的东西——同一条短码的点击序列。',
                  '用短码当 Key,代价是「热点短码会压在一个分区上」。这是可以接受的:热点短码只影响它自己那一条时间线的吞吐,而其他短码仍然分散;而且统计本身对顺序不敏感,对「同码同分区」才有依赖。',
                ],
                without:
                  '如果 Keys 是 event_id,那么「同一条链接的点击」会散落在 N 个分区、被 N 个消费者并行处理。任何依赖顺序的逻辑(比如「首次点击」判定)都会失效,而且你无法通过增加消费者来解决。',
                real:
                  '[[分区键的选择本质是在「负载均衡」和「有序范围」之间选一个。]]打点要的是后者的一小部分:不要求全局有序,只要求「同码内可见」。选 Key 之前先问一句「我需要哪个范围有序」,答案就是 Key。',
              },
              {
                kind: 'explore',
                title: '从 Kafka 到 ClickHouse:统计的下一站',
                from:
                  '这一节用 Kafka + MySQL 做到了「日粒度 PV/UV」。当查询需求变成「按小时、按地区、按 referer 下钻」时,MySQL 的聚合表会迅速变成瓶颈。',
                branches: [
                  {
                    direction: 'outward',
                    related: 'Kafka → ClickHouse / Doris 的列式明细存储',
                    basis: '都是「先存明细,查询时聚合」',
                    shared: '都靠批量写入与列存换查询性能',
                    diff: '本项目预聚合(写入时算好),列存方案是事后聚合(查询时算)',
                    value:
                      '预聚合省查询、费写入且不可下钻;列存可任意维度下钻,代价是存储与查询资源。[[「要不要保留明细」是统计系统最重要的一次取舍。]]',
                  },
                  {
                    direction: 'reverse',
                    related: '在 MySQL 里补一张按小时的分区表',
                    basis: '都是「让查询变快」',
                    shared: '都依赖 (code, time) 的聚簇顺序',
                    diff: '分区裁剪只在按时间范围查询时有效,且分区数有上限',
                    value:
                      '作为过渡方案够用:先按天分区,再观察查询里时间范围的选择性。真正的信号是「扫描行数 >> 返回行数」,那时才该换存储。',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'idempotent-aggregate',
          title: '幂等聚合:让至少一次变成恰好一次的效果',
          kind: 'concept',
          questionIds: [
            'go-index-Q119',
            'go-index-Q131',
            'go-05-Q27',
            'go-05-Q5',
            'go-05-Q6',
            'go-05-Q28',
            'go-05-Q32',
          ],
          content: {
            intro:
              '上一节的结论是「不丢的代价是重复」。这一节把重复消化掉:消费端先按 event_id 做窗口去重,再用一条多值 upsert 把增量累加进日表,UV 交给 Redis 的 HyperLogLog——它天然幂等。三处配合下来,重投一次、重投一百次,结果都一样。落地时会看到两个具体决定:聚合的 map key 从字符串拼成结构体(单事件分配从 2.0 次降到 0.08 次),以及为什么 UV 宁可要 0.81% 的误差也不用精确集合。',
            outline: [
              '「恰好一次」是个伪需求,「效果恰好一次」才是目标',
              '幂等的三个层次:业务键、唯一索引、增量累加',
              '一条多值 upsert:为什么不是先查再改',
              '窗口去重的容量取舍,以及它挡不住什么',
              'UV 用 HyperLogLog:12KB 换 0.81% 误差',
            ],
            pitfalls: [
              '用「先 SELECT 再 UPDATE」实现累加——并发下两个事务都读到旧值,后写的把先写的覆盖掉。',
              '把最终值写进日表(而不是增量)——两个消费者各自算出 100 和 80,覆盖后得到 80,凭空少了 100。',
              '以为窗口去重能覆盖跨实例重复——多实例各有一份窗口,同一批被两个实例消费时两边都会算。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '「恰好一次」是伪需求,「效果恰好一次」才是目标',
                body: [
                  '面试里常被问「怎么保证消息恰好消费一次」。严格的恰好一次要求「处理」和「提交偏移量」是一个原子操作,而这两个动作发生在两个系统里——除非引入分布式事务,否则不可能。',
                  '所以工程上的正解是换目标:允许重复投递,但让重复不产生副作用。这就是「效果上的恰好一次」,也就是幂等。[[幂等不是一种投递语义,是消费端的一种性质。]]',
                  '这个转换的价值在于:它把「一个做不到的分布式保证」变成了「一个可以在单条 SQL 里做到的约束」。你不需要协调者,只需要一个唯一键或者一个累加表达式。',
                  '本项目里幂等落在三处,层层兜底:窗口去重挡住同一批重投,HyperLogLog 让 UV 重复计数无效,upsert 让 PV 累加可重放。任何一处失效,结果仍然正确。',
                ],
              },
              {
                kind: 'principle',
                title: '幂等的三个层次,从强到弱各有代价',
                body: [
                  '「幂等」在不同层次上有不同的实现,选哪一层取决于你能接受多少额外成本。三层都列出来,才知道自己站在哪。',
                ],
                steps: [
                  {
                    title: '① 业务键去重(最强)',
                    detail:
                      '给每条事件一个唯一键(event_id),处理前先检查是否已处理过。依赖一个持久化的去重表或有 TTL 的 Redis key。强,但每次都要多一次读写,而且窗口大小/ TTL 直接决定「多久之内的重复能被挡住」。',
                  },
                  {
                    title: '② 唯一索引兜底(最可靠)',
                    detail:
                      '把「唯一性」交给数据库:`INSERT ... ON DUPLICATE KEY UPDATE` 或 `INSERT IGNORE`。并发下由引擎的行锁保证只有一个成功,不需要应用层加锁。代价是要设计出能表达唯一性的键。',
                  },
                  {
                    title: '③ 增量累加(最适合计数)',
                    detail:
                      '不写「最终值」而写「增量」,让重复执行变成「多加一次」——前提是配合 ① 或 ② 把「多加」挡住。本项目正是这个组合:upsert 累加 + event_id 窗口去重。',
                  },
                  {
                    title: '④ 天然幂等的操作(最省事)',
                    detail:
                      '有些操作天生幂等:`PFADD` 同一个值多少次都只算一个;`SET k v` 覆盖写;把状态设成绝对值的更新。[[设计阶段就该优先选这类操作,而不是事后加去重表。]]',
                  },
                ],
              },
              {
                kind: 'code',
                title: '一条 SQL 完成「插入或累加」',
                lang: 'go',
                code:
                  'var b strings.Builder\nb.WriteString("INSERT INTO link_stats_daily (code, day, pv) VALUES ")\nargs := make([]interface{}, 0, len(deltas)*3)\nfor i, d := range deltas {\n\tif i > 0 {\n\t\tb.WriteString(", ")\n\t}\n\tb.WriteString("(?, ?, ?)")\n\targs = append(args, d.Code, d.Day.Format("2006-01-02"), d.PV)\n}\n// MySQL 8.0.20 起 VALUES(col) 废弃,改用行别名\nb.WriteString(" AS new ON DUPLICATE KEY UPDATE pv = link_stats_daily.pv + new.pv")\n\nreturn r.db.WithContext(ctx).Exec(b.String(), args...).Error',
                version: 'MySQL 8.0.19+',
                env: 'go test ./internal/repo 用 sqlmock 钉住 SQL 文本与 1500 个参数绑定;MySQL 引擎解析未验(行别名需 8.0.19+)',
                verified: true,
                caption:
                  '500 行的多值 INSERT 只有几十 KB,远低于 `max_allowed_packet`,又足够摊薄一次数据库往返。注意累加表达式里必须写「表名.列名」,否则 MySQL 会优先匹配即将插入的值。',
              },
              {
                kind: 'question',
                title: 'Q119 · 如何保证接口幂等?',
                questionId: 'go-index-Q119',
                intent:
                  '这题是幂等的母题。要答出「幂等键 + 唯一约束 + 状态机」这套组合,并且能说清各自的适用场景。',
                points: [
                  '第一步永远是「定义幂等键」:创建类接口用客户端生成的 request_id 或业务唯一键(比如 URL 的哈希),更新类接口用「目标状态的绝对值」而不是增量。',
                  '第二步是把判定放进数据库:唯一索引 + 捕获 1062,或者 `INSERT IGNORE` / `ON DUPLICATE KEY UPDATE`。[[不要在应用层写「先查再插」——并发下两个请求都查不到,然后都插。]]',
                  '第三步是处理「结果不确定」:网络超时既可能是没执行,也可能是执行了没回来。所以创建类接口应当「幂等返回同一个结果」,而不是报错让客户端重试。',
                  '第四步是状态机:支付、订单这类有流转的实体,用「当前状态 → 目标状态」的条件更新(`UPDATE ... WHERE status = ?`)天然幂等,重复执行影响 0 行。',
                ],
                depth:
                  '追问「分布式场景下 request_id 存在哪」:Redis + TTL 存「处理中」占位(SET NX PX),处理完改成结果;或者直接落库唯一索引。前者快但会丢,后者慢但可靠,通常两者叠加:Redis 挡绝大多数,唯一索引兜底。',
                followup:
                  '如果问「幂等的有效期多长」:由重试窗口决定,通常 24 小时。太短挡不住慢重试,太长会让「用户 genuinely 想再来一次」被误判成重复。',
              },
              {
                kind: 'diagram',
                title: '三种写法,只有一种在并发下正确',
                diagram: {
                  type: 'matrix',
                  cols: ['并发安全', '重放是否重复计数', '典型故障'],
                  rows: [
                    [
                      '先 SELECT 再 UPDATE',
                      '不安全',
                      '会重复',
                      '两个事务都读到 100,都写 101',
                    ],
                    [
                      '覆盖写最终值',
                      '安全',
                      '会丢更新',
                      '后写的 80 覆盖先写的 100',
                    ],
                    [
                      '多值 upsert 累加',
                      '安全',
                      '不重复(配合去重)',
                      '无;重放只多加一次并被去重挡住',
                    ],
                  ],
                  caption:
                    '第二行最容易被忽略:它不出错、不报错、并发也安全,只是数字不对。这类「静默丢数据」比崩溃更难发现,因为监控上一切正常,只有业务方觉得「报表偏低」。',
                },
              },
              {
                kind: 'question',
                title: 'Q5 · MySQL 有哪些锁?',
                questionId: 'go-05-Q5',
                intent:
                  '这题必须和上一块连起来看:upsert 之所以能挡住并发,靠的正是这里的锁。答锁不结合场景,就是背书。',
                points: [
                  '按粒度:全局锁(`FLUSH TABLES WITH READ LOCK`,备份用)、表锁(`LOCK TABLES`、MyISAM)、行锁(InnoDB,加在索引项上)。',
                  '按模式:共享锁 S(读锁)、排他锁 X(写锁);意向锁 IS/IX 是表级标记,用来说明「表里有人持有行锁」,避免逐行检查。',
                  'InnoDB 还有间隙锁(gap lock)与临键锁(next-key = 记录 + 前面的间隙),它们服务于可重复读下的幻读防治。[[注意:间隙锁只在 RR 隔离级别下存在,RC 下没有。]]',
                  '结合本项目:upsert 命中的是主键 (code, day),持有的是该行的 X 锁。并发写同一行会串行化——这是正确性的来源,也是「热点短码写入会排队」的原因。',
                ],
                depth:
                  '追问「upsert 会不会死锁」:多行 upsert 的加锁顺序取决于 VALUES 里的行顺序。两个事务以相反顺序写同一组行就会死锁,InnoDB 会检测并回滚一个。解法是「按主键排序后再写」,这也是批量写入常见的工程细节。',
                followup:
                  '如果问「为什么不用 `SELECT ... FOR UPDATE` 再更新」:多一次往返,而且持锁时间更长(应用层往返也算在锁内)。能一条语句解决就不要两条。',
              },
              {
                kind: 'code',
                title: '去重窗口:定长环形数组,不泄漏也不爆内存',
                lang: 'go',
                code:
                  'func (d *deduper) first(id string) bool {\n\td.mu.Lock()\n\tdefer d.mu.Unlock()\n\tif _, ok := d.seen[id]; ok {\n\t\treturn false\n\t}\n\t// 挤出最老的那个 id,同时从 map 里删掉,否则 map 只增不减\n\tif old := d.ring[d.pos]; old != "" {\n\t\tdelete(d.seen, old)\n\t}\n\td.ring[d.pos] = id\n\td.pos = (d.pos + 1) % len(d.ring)\n\td.seen[id] = struct{}{}\n\treturn true\n}',
                version: 'Go 1.23',
                env: 'go test ./internal/stats -run TestDeduper 本地可直接跑',
                verified: true,
                caption:
                  '不用「切片前移」是因为 `order = order[1:]` 不释放底层数组,容量一路涨到峰值再也不降——这比内存泄漏更隐蔽,因为 pprof 上看是「正常的 slice」。环形数组定长、O(1)、不泄漏。',
              },
              {
                kind: 'question',
                title: 'Q131 · 如何解决消息重复消费和顺序性问题?',
                questionId: 'go-index-Q131',
                intent:
                  '这题是上一节 Q13 的加深版,要求给出「幂等键怎么选」和「顺序边界在哪」的具体答案。',
                points: [
                  '重复的根因是 ack 与投递之间的不确定性,不是 bug。所以目标不是消灭重复,而是让重复无害——这是回答这题的总纲。',
                  '幂等键的选择有三种:客户端生成的 request_id、业务唯一键(URL 哈希、订单号)、以及「事件自身的 id」。本项目选第三种,因为点击没有天然唯一键。',
                  '顺序只能分区内保证。要让「同一条链接的点击有序」,就把短码当分区键;要「同一个用户有序」,就用 user_id。[[顺序保证的范围由 Key 决定,不由 Kafka 配置决定。]]',
                  '顺序与并行的取舍是硬的:全局有序等于单分区单消费者,吞吐锁死。绝大多数业务需要的只是「局部有序」,先问清楚「哪个范围」再设计。',
                ],
                depth:
                  '追问「幂等键重复了怎么办」:说明设计有问题——要么键生成规则冲突,要么业务上确实是「两次不同的事件」。前者改键,后者说明它本来就不该被去重。',
                followup:
                  '如果问「顺序错了会怎样」:统计场景几乎没影响(PV 是计数),但「首次点击归因」这类场景会算错。所以「要不要保序」取决于是否有时序语义,不是所有消息都需要。',
              },
              {
                kind: 'why',
                title: 'UV 为什么不用精确集合',
                body: [
                  '精确 UV 的做法是「把每个访客 ID 存进一个集合,最后数集合大小」。它没有误差、可以下钻到具体是谁,唯一的问题是内存:每个访客按 20 字节算,100 万 UV 就是 20MB,而且这个数字是「每天每条链接」的量级。',
                  'HyperLogLog 换了个思路:不记录「谁来过」,只记录「哈希值的特征」——每个桶存「见过的最长前导零个数」,用统计推断基数。固定 16384 个 6 bit 桶,总共 12KB,误差 0.81%,与基数无关。',
                ],
                without:
                  '如果坚持精确:一条热门短链一天的 UV 到千万级,内存就是 200MB 起,而且要在 Redis 里持续存在 35 天。这不是「贵一点」,是「不可行」。',
                real:
                  '[[近似不是妥协,是选对了误差的量级。]]报表上写「12.4 万 UV」,误差 0.81% 意味着 ±1000,而人对这个数字的解读精度本来就是「万」级。为不存在的精度付 100 倍内存,才是真正的浪费。',
              },
              {
                kind: 'question',
                title: 'Q27 · 一致性哈希?雪花 ID?幂等?',
                questionId: 'go-05-Q27',
                intent:
                  '一道题串三个知识点,考的是能不能各自独立讲清并且指出它们的共同点:都在解决「分布式下如何保持一致」。',
                points: [
                  '一致性哈希:解决「节点增减时大量 key 需要重新映射」。做法是把哈希环切成虚拟节点,节点下线只影响相邻区间。Redis Cluster 用的是「哈希槽」(16384 个槽)而不是纯环,本质是同一思路的离散化版本。',
                  '雪花 ID:64 位 = 时间戳 + 机器号 + 序列号。优点是趋势递增、本地生成、不依赖中心;缺点是强依赖时钟,回拨会产生重复 ID(所以要么等,要么用「逻辑时钟」兜)。',
                  '幂等:见 Q119 那套——业务键 + 唯一约束 + 状态机。三者共同的思路是「把正确性交给一个有原子性保证的地方」:哈希环交给固定映射,雪花交给时钟单调,幂等交给数据库唯一索引。',
                  '[[本项目的发号器其实避开了雪花:号段模式用数据库的 `UPDATE max_id = max_id + step` 保证唯一,连时钟都不需要。]]这也是「选型要看约束」的实例——单库能解决的,不必上雪花。',
                ],
                depth:
                  '追问「雪花 ID 回拨怎么处理」:三种:等待回拨时间过去(简单但会阻塞)、用上次的时间戳继续发(需要额外状态)、切换机器号(需要协调)。生产中更常见的是「不要用雪花,用号段或 UUIDv7」。',
                followup:
                  '如果问「为什么号段比雪花省事」:它把「唯一性」这个难题完全交给了数据库——一次 `UPDATE` 就是一次原子加法。代价是每次换段要访问 DB,靠预取把这次访问藏起来。',
              },
              {
                kind: 'code',
                title: 'UV 写入:一次 Pipeline,幂等且带过期',
                lang: 'go',
                code:
                  'pipe := c.rdb.Pipeline()\nfor _, s := range sets {\n\targs := make([]interface{}, len(s.IDs))\n\tfor i, id := range s.IDs {\n\t\targs[i] = id\n\t}\n\tkey := uvKey(s.Code, s.Day)\n\tpipe.PFAdd(ctx, key, args...)\n\tpipe.Expire(ctx, key, c.ttl) // 35 天:只比报表保留期长一点\n}\nif _, err := pipe.Exec(ctx); err != nil {\n\treturn fmt.Errorf("pfadd uv(%d 组): %w", len(sets), err)\n}',
                version: 'Redis 7.x + go-redis v9.7.0',
                env: 'go test ./internal/cache 用 miniredis(RESP 兼容内存实现)验证 PFADD 幂等、跨 code/day 隔离、TTL;真 Redis 实例未验',
                verified: true,
                caption:
                  'Pipeline 不是事务:它只是把 N 条命令合成一次往返,中间某条失败不影响其他条。对 UV 这种「重复无害」的数据完全够用,不需要 MULTI/EXEC 的原子性。',
              },
              {
                kind: 'question',
                title: 'Q6 · 慢查询怎么排查与优化?分库分表?',
                questionId: 'go-05-Q6',
                intent:
                  '考的是排查顺序:先定位是哪条 SQL,再看执行计划,最后才谈优化手段。跳过前两步直接说「加索引」是常见扣分点。',
                points: [
                  '定位:开 `slow_query_log`(阈值 1s 太长,统计接口建议 100ms),用 `pt-query-digest` 或 `performance_schema` 聚合出「总耗时最高的 SQL」——注意按总耗时排序,不是按单次耗时。',
                  '看计划:`EXPLAIN` 关注四列——type(要到 range/ref,不能是 ALL)、key(用了哪个索引)、rows(扫描行数)、Extra(出现 `Using filesort` / `Using temporary` 就是信号)。',
                  '优化的顺序:补索引 → 改 SQL(去掉函数包裹、避免 `!=`、拆大 IN)→ 改数据模型(冗余字段、预聚合)→ 最后才是分库分表。[[分库分表是最后的选项,因为它把「事务、join、分页」三个简单问题同时变成难题。]]',
                  '结合本项目:`link_stats_daily` 的主键是 (code, day),按码 + 时间范围查走最左前缀,天然不需要额外索引;真正会慢的是「按天查全站 Top N」,那需要的是 `idx_day` 加一次聚合,不是分表。',
                ],
                depth:
                  '追问「深分页怎么优化」:`LIMIT 100000, 20` 会扫描 10 万行再丢弃。正解是「记住上次的最大 id」用 `WHERE id > ? LIMIT 20`,或者用覆盖索引先取 id 再回表。',
                followup:
                  '如果问「什么时候该分表」:单表超过千万行且写入仍在增长,或者单表容量接近实例上限,或者需要「按时间归档」时。前提是已经做过索引与模型层面的优化——先证明不是那两类问题。',
              },
              {
                kind: 'compare',
                title: '精确 Set / HyperLogLog / 位图',
                head: ['方案', '内存', '误差', '能回答的问题'],
                rows: [
                  [
                    'Set(精确去重)',
                    '与基数线性相关(百万 UV 约 20MB)',
                    '0',
                    '有多少、以及具体是谁',
                  ],
                  [
                    'HyperLogLog',
                    '固定 12KB(16384 桶)',
                    '0.81%',
                    '有多少;不能下钻到个体',
                  ],
                  [
                    '位图 Bitmap',
                    '与 ID 空间线性相关(user_id 连续时极省)',
                    '0',
                    '有多少,以及某个 id 是否来过',
                  ],
                ],
                note:
                  '三者不是替代关系:Bitmap 在「ID 连续且稠密」时最优(比如按天活跃用户 1 亿以内的自增 id),HLL 在「ID 是任意字符串且基数巨大」时最优。',
                caption:
                  '选型的判据是「你要不要下钻」。只要总数,选 HLL;要查具体是谁或做交集,选 Set/Bitmap,并接受内存代价。本项目只需要报表上的一个数字,所以 HLL 是唯一理性的选择。',
              },
              {
                kind: 'diagram',
                title: '一次 flush 的完整路径:三处幂等各管一段',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    {
                      label: '500 条原始事件',
                      note: '可能含重复:同一批被投递两次',
                    },
                    {
                      label: '窗口去重',
                      note: '挡住「同一实例、短时间内」的重投',
                    },
                    {
                      label: '按 (code, day) 折叠',
                      note: '结构体 key,单事件 0.08 次分配',
                    },
                    {
                      label: 'upsert 累加 PV',
                      note: '(code, day) 主键 + 增量,可重放',
                    },
                    {
                      label: 'PFADD UV',
                      note: '同一访客重复 PFADD 不增计数',
                    },
                    {
                      label: 'CommitMessages',
                      note: '三处都成功之后才提交 offset',
                    },
                  ],
                  caption:
                    '这条链路上没有任何一步依赖「只执行一次」:去重挡一层、upsert 挡一层、PFADD 挡一层。所以即使 offset 提交失败导致整批重放,结果仍然不变——这就是「效果上的恰好一次」。',
                },
              },
              {
                kind: 'explore',
                title: '从日聚合到实时看板',
                from:
                  '这一节产出的是「T+0 的日粒度数字」,延迟一个 flush 周期。如果产品要的是「秒级刷新的实时大屏」,这套结构哪里会先扛不住?',
                branches: [
                  {
                    direction: 'outward',
                    related: 'Flink / Kafka Streams 的窗口聚合与状态存储',
                    basis: '都是「按时间窗口折叠事件」',
                    shared: '都用「键 + 窗口」作为聚合单位',
                    diff: '本方案把状态放在 MySQL,流处理把状态放在内存 + checkpoint',
                    value:
                      '流处理能做到秒级,代价是状态一致性、exactly-once 语义、以及一整套运维。[[只有「延迟本身就是产品价值」时才值得。]]',
                  },
                  {
                    direction: 'reverse',
                    related: '保留现有结构,把 flush 周期从 200ms 调小',
                    basis: '都是「缩短可见延迟」',
                    shared: '都受限于「批量越大越省、越小越实时」',
                    diff: '调小 flush 只是把延迟从 200ms 降到 20ms,不改变架构',
                    value:
                      '多数「实时」需求其实只需要「准实时」。先量一下产品真正能感知的延迟,再决定要不要引入流处理——这是最省钱的一次判断。',
                  },
                ],
              },
              {
                kind: 'question',
                title: 'Q28 · 设计短链接系统(字节四面原题)',
                questionId: 'go-05-Q28',
                intent:
                  '整门课的收束题。前八节都是「把某一块做对」,这题要求你按面试的节奏把八块拼成一条链路,并且每一块都能说出「为什么是这个方案、换一个会坏在哪」。',
                points: [
                  '发号与编码:自增 ID 或雪花 → `base62`。6 位能表 62^6≈568 亿,够用十年。也可以用「hash 长 URL + 冲突重试」,代价是重试路径要写对,而且短码不可预测性更强。[[这题先答发号器,是因为它决定了后面所有分片与索引的设计。]]',
                  '301 还是 302:`301` 会被浏览器永久缓存,第二次连请求都不发,统计必然少算、链接也改不了;`302` 每次回源,能统计、能改目标、能下线。本项目选 302,代价是每次都要过一次服务端。',
                  '读多写少是主战场:Redis 缓存 `short → long`,空值也要缓存(本项目用 `\\x00` 标记 + 60s TTL)防穿透;再往上就是热点 key,用 singleflight 把并发的同 key 回源合并成一次。',
                  '存储与分片:按短码 hash 分库分表,查询天然带分片键,不会跨片。不要在「长 URL 反查短码」上用范围扫描——那是另一条链路,靠 `uk_url_hash` 唯一索引直接命中。',
                  '统计异步化:打点绝不能同步写库。本项目在 302 之后投递到一个有界队列,队满直接丢弃并计数——[[丢一条统计远好过拖慢一次跳转]]。',
                  '防爬与限流:按 IP + 短码维度限流,恶意刷量既打服务也污染统计。',
                ],
                depth:
                  '分档就看两点:有没有主动提 301 与 302 的取舍(只答「302 能统计」是及格,答出「301 让链接永久不可改、统计永远少算」才是好),以及有没有把「读多写少」落到具体结构上(只说「加缓存」是及格,说出空值缓存 + 热点 key 合并 + 分片键不跨片才是高分)。[[能主动说「我这套方案在什么规模下会先坏」,基本就是面试官想要的答案。]]',
                followup:
                  '追问通常会往「自定义域名」「过期策略」「点击量去重」三个方向走。前两个是数据模型加字段,第三个要立刻答出「PV 用增量 upsert、UV 用 HyperLogLog」——因为 UV 要精确就得存集合,亿级 UV 的内存代价不可接受,而 0.81% 的误差在产品上完全可接受。',
              },
              {
                kind: 'question',
                title: 'Q32 · 高并发下接口突然变慢,怎么排查?',
                questionId: 'go-05-Q32',
                intent:
                  '如果说上一题考的是「设计」,这题考的是「运维直觉」。答这题最容易犯的错是一上来就说「去看 pprof」——正确的顺序是从外往里收缩,而不是先扎进应用内部。',
                points: [
                  '第一层看大盘:QPS、RT、错误率三条曲线,先判断是「流量涨了」还是「同样流量下变慢了」。前者是容量问题,后者才是故障。[[这两类的处理方向完全相反,分不清就会做反。]]',
                  '第二层看依赖:缓存命中率有没有掉(掉了就是穿透或热点 key 失效)、DB 有没有慢查询(`long_query_time` 之上的都算)、下游 RT 有没有涨。本项目里 `X-Cache` 响应头就是为这一层准备的——`MISS` 比例突然升高,基本就定位到了。',
                  '第三层进应用:`pprof` 看 CPU / heap / goroutine,mutex profile 看锁竞争。Go 里两个高频信号是「goroutine 数单调上涨」(泄漏或阻塞)和「GC 占比高」(`allocs` profile 里找分配大户)。',
                  '第四层看系统:CPU、IO、网络连接状态。`TIME_WAIT` 堆积说明短连接太多,`CLOSE_WAIT` 堆积说明对端关了但本端没 `Close`。',
                  'Go 特有的四个坑要能脱口而出:goroutine 泄漏、GC 压力来自高频小对象、`MaxIdleConnsPerHost` 默认只有 2 导致连接反复重建、`MaxOpenConns` 打满后请求在排队而不是在报错。',
                ],
                depth:
                  '这题的档位差在「顺序」和「指名道姓」上。只说「看监控、看日志、查数据库」是及格;能按「大盘 → 依赖 → 应用 → 系统」四层收缩,每层说出具体指标,是高一分;能再补一句「先分清容量问题还是故障」,就是高分。[[答这题最忌讳跳步:直接说去采 pprof,等于承认没有排查方法,只有工具。]]',
                followup:
                  '再深一层会问「压测环境和线上不一致怎么办」:先对齐三件事——机器规格、依赖的真实延迟(压测常把 DB mock 掉)、是否有预热。本项目 `bench-pprof` 那节测出的 `Encode` 21.3 ns 就是基准,线上 RT 突然从 2ms 涨到 20ms 时,先算一遍「编解码占比多少」,能直接排除掉一大半嫌疑。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'guard',
      title: 'D · 防护与一致性:被打断时还能不能对',
      goal: '系统在过载、多实例、客户端重试这三种压力下仍然可预测、可解释',
      summary:
        '前三个阶段解决的是「正常运行怎么更快更准」,这一阶段解决「不正常的时候还能不能对」。三件事看起来分散,其实同源:都是同一份资源在并发、重试或恶意请求下被碰了多次。限流挡住「太快」,跨实例锁挡住「同时」,幂等键挡住「重来」。验收标准是三个可测量的事实:本地限流的单次成本与 Redis 往返差几个数量级、两个实例共用一把锁时回源次数是不是 1、20 个并发同键请求里是不是只有 1 个真的执行。',
      checkpoint: {
        questionIds: [
          'go-index-Q122',
          'go-index-Q118',
          'go-index-Q126',
          'go-index-Q123',
          'go-index-Q160',
        ],
        passRatio: 0.8,
      },
      lessons: [
        {
          id: 'rate-limit',
          title: '限流:把过载挡在门外',
          kind: 'concept',
          questionIds: [
            'go-index-Q122',
            'go-index-Q123',
            'go-index-Q165',
            'go-index-Q124',
            'go-index-Q125',
          ],
          content: {
            intro:
              '前面八节都在优化「一次请求怎么处理得更快更准」,这一节换个方向:当请求多到处理不完时,怎么保证系统仍然可预测。落地会看到一个具体的顺序——进程内令牌桶在前、Redis 固定窗口在后,以及为什么这个顺序不是优化技巧而是必需。还会看到两个反直觉的决定:超限的请求也要计数,而 Redis 挂掉时选择放行而不是拒绝。',
            outline: [
              '限流、熔断、降级是三件不同的事,别混着答',
              '五种算法的取舍:突发、精度、成本三者不可兼得',
              '两级限流:为什么本地桶必须排在 Redis 前面',
              '超限请求为什么要计数,Redis 挂了为什么要放行',
            ],
            pitfalls: [
              '把限流和熔断混为一谈——限流是按「请求到来之前」拒绝,熔断是按「下游已经坏了」跳闸,前者防自己被打垮,后者防被别人拖死。',
              '只做单机限流就宣布「支持十万 QPS」——10 个实例就是 10 倍额度,而且每次扩容额度会悄悄变宽。',
              '限流器自己打垮 Redis——超限请求也去问一次全局计数,攻击者只要把 QPS 拉高,Redis 就要承受同样多的无效查询。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '限流的真正目的不是「拒绝」,是「让剩下的人还能用」',
                body: [
                  '很多人把限流理解成「挡住坏用户」。真实系统里它的第一价值是**给自己一个可预测的上界**:一旦知道每秒最多处理多少,容量规划、超时设置、连接池大小才有意义。没有上界的系统不是「弹性好」,而是「不知道自己什么时候会崩」。',
                  '过载有三种来源,处理方式完全不同。第一种是流量真的涨了(活动、爬虫、攻击),该做的是限流;第二种是下游变慢了(数据库慢查询、缓存抖动),该做的是熔断;第三种是自身出了问题(goroutine 泄漏、GC 压力、死锁),限流只会把故障藏起来,该做的是把流量摘掉再看。[[分不清这三类就去加限流,是最常见的误诊。]]',
                  '三者关系可以一句话记住:**限流挡在入口,熔断挡在出口,降级挡在功能**。限流判断的是「我要不要接」,熔断判断的是「我还能不能调」,降级判断的是「这个功能能不能先不做」。',
                  '本题的短链服务里,限流落在两条路径上,额度差两个数量级:跳转是读缓存 + 写 302,单次成本微秒级;创建要走发号、查重、落库、写缓存,单次成本毫秒级。用同一套额度限这两条路径,不是太松就是太严。',
                ],
              },
              {
                kind: 'principle',
                title: '五种算法:突发、精度、成本三者不可兼得',
                body: [
                  '面试常问「有哪些限流算法」,但真正拉开差距的是「为什么选这个」。所以按取舍来讲,而不是按名字讲。',
                ],
                steps: [
                  {
                    title: '① 固定窗口计数:一个整数,一个边界问题',
                    detail:
                      '每个窗口一个计数器,`INCR` 到上限就拒。成本最低(一个整数),精度最差:窗口边界处可以放过 2 倍额度——前一秒末尾打满、下一秒开头再打满。适合「额度粗放、请求量大、能容忍 2 倍突发」的场景。',
                  },
                  {
                    title: '② 滑动窗口计数:用两个窗口加权,把 2 倍压到 1.x 倍',
                    detail:
                      '当前窗口计数 + 上一窗口计数 ×(1 - 当前窗口已过比例)。内存还是常数(两个整数),边界突刺被平滑掉大半。代价是要知道「当前窗口过了多少」,多一次时间计算。本项目没上它,因为多一层逻辑换来的收益在这个 QPS 下看不出来。',
                  },
                  {
                    title: '③ 滑动窗口日志:精确,但内存与请求数成正比',
                    detail:
                      '每个请求在 ZSET 里存一条记录,统计 `[now-1s, now]` 内的条数。精度最高,能回答「过去 1 秒到底放过了多少次」。代价是每个请求一条记录——十万 QPS 就是每秒十万次写入加十万条记录,限流器自己成了瓶颈。[[只在「额度极小且必须精确」时用它,比如每分钟 3 次的短信验证码接口。]]',
                  },
                  {
                    title: '④ 令牌桶:允许突发,长期限速',
                    detail:
                      '桶里按 rate 补充令牌,取到才放行,桶容量 burst 决定瞬时突发上限。它的语义最贴近真实业务:「平均每秒 50 次,但允许一次 100 的突发」。本项目用它做单机限流,因为它是唯一「既能限速又能容纳突发」的低成本方案。',
                  },
                  {
                    title: '⑤ 漏桶:把请求整形成匀速',
                    detail:
                      '请求先进队列,以固定速率流出,队满即拒。它和令牌桶的区别是**输出是否平滑**:令牌桶允许「攒够了就放一批」,漏桶永远匀速。需要保护一个只能匀速处理的下游(比如老式计费接口)时用漏桶,需要照顾用户体验时用令牌桶。',
                  },
                ],
                takeaway:
                  '选型只需要回答一个问题:你能接受多大的突发?零突发选漏桶,有限突发选令牌桶,无所谓突发就选固定窗口。精度要求越高,成本越高——[[不要在没有量到问题的地方上精确方案。]]',
              },
              {
                kind: 'compare',
                title: '三种落地方案的取舍',
                head: ['方案', '突发控制', '精度', '成本', '典型失效'],
                rows: [
                  [
                    '单机令牌桶',
                    '好(桶容量决定)',
                    '中(各实例独立)',
                    '纳秒级,零分配',
                    '实例数变化时额度悄悄变化',
                  ],
                  [
                    'Redis 固定窗口',
                    '差(边界可能 2 倍)',
                    '好(全局一个计数)',
                    '一次往返 + 一次 Lua',
                    'Redis 抖动时全局限流失效',
                  ],
                  [
                    'Redis 滑动窗口日志',
                    '好(严格)',
                    '最好',
                    '每个请求一条记录',
                    '高 QPS 下限流器自己成瓶颈',
                  ],
                ],
                note:
                  '真实系统几乎都是组合:本地桶控总容量、Redis 窗口控全局总量。本项目正是这样:跳转接口用本地桶 + (可选)全局窗口,创建接口只配本地桶——因为创建的量本来就小,多一次往返不值当。',
                caption:
                  '这张表最该记住的不是哪一行更好,而是最后一列。「典型失效」写不出来的方案,说明你只是背过它。',
              },
              {
                kind: 'diagram',
                title: '两级限流的顺序:本地在前,全局在后',
                diagram: {
                  type: 'layers',
                  items: [
                    {
                      label: '入口',
                      note: '所有请求,包括恶意的那部分',
                      tone: 'muted',
                    },
                    {
                      label: '① 进程内令牌桶(~109ns)',
                      note: '按 IP 分桶,命中即放行;超限直接 429,不进网络',
                      tone: 'primary',
                    },
                    {
                      label: '② Redis 固定窗口(1 次往返)',
                      note: '只有本地认为可以放行的请求才来这里,全局总量在这里收口',
                      tone: 'primary',
                    },
                    {
                      label: '业务处理',
                      note: '此时才真正开始花 CPU 和数据库连接',
                      tone: 'muted',
                    },
                  ],
                  caption:
                    '顺序反过来的后果很具体:超限请求也要问一次 Redis,攻击者把 QPS 拉到十万,你的 Redis 就要承受十万次无效查询。[[限流器的第一职责是别把自己变成瓶颈。]] 顺带说一句,这两级的耗时差三个数量级——本地桶 109ns,一次 Redis 往返在本地环回是几百微秒,跨机房是一到几毫秒。',
                },
              },
              {
                kind: 'code',
                title: '`Bucket.AllowN`:惰性补充,零分配',
                lang: 'go',
                code: 'func (b *Bucket) AllowN(now time.Time, n float64) bool {\n\tb.mu.Lock()\n\tdefer b.mu.Unlock()\n\tb.refill(now)\n\tif b.tokens < n {\n\t\treturn false\n\t}\n\tb.tokens -= n\n\treturn true\n}\n\nfunc (b *Bucket) refill(now time.Time) {\n\telapsed := now.Sub(b.last)\n\tif elapsed <= 0 {\n\t\t// 时钟回拨或同一纳秒内的两次调用。不要更新 last,\n\t\t// 否则回拨的那段时间会被永久吞掉,桶会「卡住不补」。\n\t\treturn\n\t}\n\tb.last = now\n\tb.tokens = math.Min(b.burst, b.tokens+elapsed.Seconds()*b.rate)\n}',
                version: 'Go 1.23',
                env: 'go test ./internal/ratelimit -run TestBucket 六个用例全绿;BenchmarkBucketAllow 109ns/0 allocs',
                verified: true,
                caption:
                  '注意这个实现里**没有后台协程、没有定时器**。每次 `Allow` 时按「距上次访问过了多久」一次性补,1000 个闲置 key 不吃一点 CPU。两个细节都踩过:回拨时不更新 `last`,否则那段时间被永久吞掉;补充必须封顶在 `burst`,否则闲置一小时的桶能攒出三百多万个令牌,突发保护直接失效。',
              },
              {
                kind: 'code',
                title: '`Window.Allow`:一条 Lua 把自增和过期变成原子操作',
                lang: 'go',
                code: 'var incrScript = redis.NewScript(`\nlocal n = redis.call(\'INCR\', KEYS[1])\nlocal ttl = redis.call(\'PTTL\', KEYS[1])\nif ttl < 0 then\n  redis.call(\'PEXPIRE\', KEYS[1], ARGV[1])\n  ttl = tonumber(ARGV[1])\nend\nreturn {n, ttl}\n`)\n\nfunc (w *Window) Allow(ctx context.Context, key string) (Decision, error) {\n\tif key == "" {\n\t\treturn Decision{}, fmt.Errorf("ratelimit: key 不能为空")\n\t}\n\tres, err := incrScript.Run(ctx, w.rdb, []string{w.prefix + key}, w.period.Milliseconds()).Slice()\n\tif err != nil {\n\t\treturn Decision{}, fmt.Errorf("ratelimit: 窗口计数 %s: %w", key, err)\n\t}\n\tcount := toInt64(res[0])\n\tttl := time.Duration(toInt64(res[1])) * time.Millisecond\n\td := Decision{Allowed: count <= w.limit, Count: count, Remaining: w.limit - count, ResetIn: ttl}\n\tif d.Remaining < 0 {\n\t\td.Remaining = 0\n\t}\n\treturn d, nil\n}',
                version: 'Go 1.23 + go-redis v9',
                env: 'miniredis(含 gopher-lua)七条用例全绿,含「无 TTL 的遗留 key 被补上过期时间」与 100 并发只放行 10 个',
                verified: true,
                caption:
                  '`PEXPIRE` 必须和 `INCR` 在同一个脚本里。拆成两条命令,中间失败就留下一个没有 TTL 的计数器,这个 IP 被永久封禁——比不限流更糟。`ttl < 0` 那个分支是给历史遗留数据修毒的:主从切换丢了 `PEXPIRE`、进程在两条命令之间被 kill,都会造出这种 key。',
              },
              {
                kind: 'why',
                title: '两个反直觉的决定:超限也计数,故障时放行',
                body: [
                  '第一个:超限的请求**也要 `INCR`**。如果超限就不再计数,一个持续刷的客户端会变成「隔一次被放过一次」——因为每次拒绝时计数不涨,下一次它又落在额度内。计数先加后判,才能让持续刷的人稳定地待在门外。',
                  '第二个:Redis 出错时**放行而不是拒绝**。这个选择要能讲清楚理由:限流是保护组件,不是功能组件。保护组件自己坏了,继续放流量最多是「暂时失去保护」;而 fail-closed 会让 Redis 的一次抖动直接变成全站 503。',
                ],
                without: '如果反过来做 fail-closed,你会得到一个「比被攻击更容易挂」的系统:Redis 主从切换的 5 秒里,所有人都收到 503,监控上是 100% 错误率,而真正的敌人一个都还没来。',
                real: '例外是防刷类接口——登录、发短信、领券。这些接口的「放行」代价是真实的钱或真实的安全事件,所以它们必须 fail-closed,而且要按「本地 + 全局双层」都失败才算失败。**同一个原则在不同接口上得出相反结论,判据是「放行一次的代价有多大」。**',
              },
              {
                kind: 'question',
                title: 'Q122 · 常见的限流算法有哪些?各自的优缺点?',
                questionId: 'go-index-Q122',
                intent:
                  '高频题,但多数人只答得出名字。这题的高分点在「取舍」和「失效场景」,而不是算法细节。答题时主动给出「我选这个是因为能接受多大的突发」,面试官就知道你真的用过。',
                points: [
                  '先按「能不能容纳突发」分两族:计数类(固定窗口、滑动窗口)只关心「窗口内总数」,桶类(令牌桶、漏桶)关心「速率与容量」。这个分法比按名字背五个更有信息量。',
                  '固定窗口的致命缺陷是边界双倍突刺,说出这一点并给出两个改法(滑动窗口计数 / 滑动窗口日志),比只背名字高一档。',
                  '令牌桶和漏桶的区别要一句话说清:**令牌桶允许突发,漏桶不允许**。前者看的是「桶里攒了多少」,后者看的是「出口流速」。',
                  '最后必须落到选型:本项目单机用令牌桶(能容纳突发、成本 109ns),可选全局用固定窗口(内存与请求数无关)。[[能说出「为什么不用更精确的那个」,比说出「精确的那个更好」有价值。]]',
                ],
                depth:
                  '档位差在「失效场景」。只说优缺点,是背的;能说出「固定窗口在边界会放过 2 倍,滑动窗口日志在十万 QPS 下自己成瓶颈」,是用过的。再往上,能说出「限流阈值怎么定」——不是拍脑袋,而是用压测得到的「单实例 P99 拐点」乘以安全系数,再按实例数换算成全局额度。',
                followup:
                  '追问常走两个方向:一是「分布式限流怎么做」(见下一题),二是「限流和熔断的区别」。后者一句话:`限流` 在入口按预设额度拒绝,`熔断` 在出口按真实失败率跳闸。前者是「我预判你会太多」,后者是「我观测到你已经坏了」。',
              },
              {
                kind: 'question',
                title: 'Q123 · 分布式限流怎么实现?单机限流的问题是什么?',
                questionId: 'go-index-Q123',
                intent:
                  '这题真正考的是「你知不知道单机限流的额度会漂移」。很多人答「用 Redis 做计数器」就停了,但那样答不出版本差异和性能代价。',
                points: [
                  '先说清单机限流的问题:额度 = 单机额度 × 实例数,而实例数会因为扩容、HPA、滚动发布而变。10 台限 1000,扩到 20 台就变成 2000——**上限跟着容量一起长大,等于没有上限**。',
                  'Redis 方案的三种粒度:固定窗口(`INCR` + `PEXPIRE`)、滑动窗口(ZSET)、令牌桶(hash 存 tokens 与时间戳)。三者的内存与精度取舍跟单机版一样,只是多了一次网络往返。',
                  '原子性必须靠 Lua。`INCR` 和 `PEXPIRE` 分开两条命令,中间失败就是永久计数器。本项目用一条脚本把「自增 + 首次设过期 + 读回 TTL」做完。',
                  '性能账要算出来:一次 Redis 往返在本地环回几百微秒,跨机房一到几毫秒,而本地令牌桶是 109 纳秒。[[所以生产上不会「只做全局」,而是「本地桶前置 + 全局桶收口」。]]',
                ],
                depth:
                  '高分答案会给一个「不精确但够用」的方案:各实例按 `全局额度 / 实例数` 配置本地桶,定期从 Redis 拉一次最新实例数。它的误差是「实例数变化后的一小段时间」,但省掉了每次请求的 Redis 往返。这是典型的「限流不需要精确」——额度本身就是估算出来的。',
                followup:
                  '再深一层会问「Redis 集群模式下 Lua 脚本要注意什么」。答:脚本里所有 key 必须落在同一个 slot,否则 CROSSSLOT 报错。本项目的脚本都只有一个 key,所以没问题——但这个前提要自己确认,不能假设。',
              },
              {
                kind: 'handwrite',
                title: '手写:用 channel 实现一个限流器',
                lang: 'go',
                prompt:
                  '不用 `time.Ticker` 和 `golang.org/x/time/rate`,只用 channel 和 goroutine,实现一个「每秒放行 rate 次、允许瞬时突发 burst 次」的限流器。要求:`Allow() bool` 非阻塞;`Close()` 之后不再放行且不泄漏 goroutine;说明它与令牌桶在「时间精度」上的差别。',
                plan: [
                  {
                    title: '① 先想清楚「谁在计时」',
                    detail:
                      'channel 方案的计时是一个后台 goroutine:每 `time.Second/rate` 往 channel 里塞一个令牌。所以精度取决于这个 goroutine 的调度精度,而不是调用方。`Allow` 只做 `select` + `default`,完全不阻塞。',
                  },
                  {
                    title: '② 容量就是 burst',
                    detail:
                      '`make(chan struct{}, burst)` —— 缓冲区满时塞令牌的 goroutine 会阻塞,这正好实现了「补到封顶」:不需要额外的 `math.Min`。[[channel 的阻塞语义,在这里免费提供了令牌桶最难写对的那个边界。]]',
                  },
                  {
                    title: '③ 关闭要能被上游感知',
                    detail:
                      '需要一个 `done chan struct{}`。`Allow` 里 `select` 三个分支:拿到令牌、`done` 关闭、default。少了 `done` 分支,关闭后调用方仍可能拿到桶里剩的令牌。',
                  },
                  {
                    title: '④ 说清精度代价',
                    detail:
                      '`time.NewTicker(time.Second / rate)` 在 rate 很大时会退化成微秒级抖动,而且每次 tick 只有一次调度机会,机器负载高时令牌会晚到。令牌桶用「按时间差补」没有这个问题——它不依赖定时器,只依赖一次减法。**这就是标准库用令牌桶而不是 channel 的原因。**',
                  },
                ],
                signature:
                  'func NewChannelLimiter(rate int, burst int) *ChannelLimiter\nfunc (l *ChannelLimiter) Allow() bool\nfunc (l *ChannelLimiter) Close()',
                skeleton:
                  'type ChannelLimiter struct {\n\ttokens chan struct{}\n\tdone   chan struct{}\n\tonce   sync.Once\n}\n\nfunc NewChannelLimiter(rate, burst int) *ChannelLimiter {\n\tl := &ChannelLimiter{\n\t\ttokens: make(chan struct{}, burst),\n\t\tdone:   make(chan struct{}),\n\t}\n\t// TODO: 起一个 goroutine 周期性地往 tokens 里放令牌,并 select done 退出\n\treturn l\n}\n\nfunc (l *ChannelLimiter) Allow() bool {\n\t// TODO: 三个分支的 select\n\treturn false\n}\n\nfunc (l *ChannelLimiter) Close() {\n\t// TODO: 幂等地关闭 done\n}\n',
                solution:
                  'type ChannelLimiter struct {\n\ttokens  chan struct{}\n\tdone    chan struct{}\n\tstopped chan struct{}\n\tonce    sync.Once\n}\n\nfunc NewChannelLimiter(rate, burst int) *ChannelLimiter {\n\tl := &ChannelLimiter{\n\t\ttokens:  make(chan struct{}, burst),\n\t\tdone:    make(chan struct{}),\n\t\tstopped: make(chan struct{}),\n\t}\n\tinterval := time.Second / time.Duration(rate)\n\tgo func() {\n\t\tdefer close(l.stopped)\n\t\t// 初始装满:与令牌桶「初始 burst 个令牌」的语义保持一致\n\t\tfor i := 0; i < burst; i++ {\n\t\t\tl.tokens <- struct{}{}\n\t\t}\n\t\tt := time.NewTicker(interval)\n\t\tdefer t.Stop()\n\t\tfor {\n\t\t\tselect {\n\t\t\tcase <-l.done:\n\t\t\t\treturn\n\t\t\tcase <-t.C:\n\t\t\t\tselect {\n\t\t\t\tcase l.tokens <- struct{}{}:\n\t\t\t\tdefault: // 桶满,丢弃这次补充——这就是「补到封顶」\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}()\n\treturn l\n}\n\nfunc (l *ChannelLimiter) Allow() bool {\n\tselect {\n\tcase <-l.done:\n\t\treturn false\n\tcase <-l.tokens:\n\t\treturn true\n\tdefault:\n\t\treturn false\n\t}\n}\n\nfunc (l *ChannelLimiter) Close() {\n\tl.once.Do(func() { close(l.done) })\n\t<-l.stopped // 等 goroutine 真的退出,否则会有一次泄漏\n}',
                complexity:
                  'Allow 是 O(1) 且非阻塞;内存 O(burst);后台一个 goroutine,退出时靠 `stopped` 保证真正结束。',
                traps: [
                  '`Close` 不等 goroutine 退出就是泄漏。`close(done)` 只表示「请退出」,不表示「已退出」。',
                  '忘了初始装满,启动瞬间会拒绝所有请求,和「桶初始满载」的直觉不符。',
                  '`tokens <- struct{}{}` 不加 `default` 会让补充 goroutine 卡死——桶满时它永远阻塞在发送上,`done` 也就收不到了。',
                  '用 `b.N` 式的循环写 ticker 间隔(如 `time.Second / rate` 在 rate>1e9 时溢出为 0,`NewTicker` 直接 panic)。',
                ],
              },
              {
                kind: 'explore',
                title: '限流该放在应用里,还是提到网关?',
                from:
                  '这一节的实现都在应用进程里。但真实公司里,限流往往还有一层在网关——两者的边界在哪里?',
                branches: [
                  {
                    direction: 'outward',
                    related: 'API 网关的集群级限流(按路由、按调用方 appId、按 header)',
                    basis: '都是「按某个维度计数,超了就拒」',
                    shared: '都用固定窗口或令牌桶,都需要一个全局计数器(通常是 Redis)',
                    diff:
                      '网关看到的是「谁在调哪个接口」,看不到「这一次请求值多少钱」;应用看得到业务语义,但看不全跨接口的总量。',
                    value:
                      '合理的分工是:网关做**粗粒度、防攻击**的限流(单 IP 每秒请求数、单 appId 的日配额),应用做**细粒度、带业务权重**的限流(这个用户今天还能创建几条、这次批量导入要消耗多少额度)。[[判据是「谁掌握这个维度」,而不是「谁更靠近入口」。]]',
                  },
                  {
                    direction: 'reverse',
                    related: '不拒绝,而是排队:把超限请求放进队列慢慢处理',
                    basis: '都是「请求来得比处理能力快」时的应对',
                    shared: '都需要一个上界,否则队列会无限涨到 OOM',
                    diff:
                      '拒绝立刻返回 429,客户端可以立刻换机器重试;排队把等待时间转成延迟,客户端只能等或超时。',
                    value:
                      '排队适合「异步任务」(发邮件、生成报表),拒绝适合「同步接口」。把同步接口改成排队,用户体验上是「从明确失败变成莫名超时」——**这几乎总是更差的体验,除非你真的能把结果异步送回去。**',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'distributed-lock',
          title: '分布式锁:跨进程的临界区',
          kind: 'concept',
          questionIds: ['go-index-Q118', 'go-05-Q23', 'go-index-Q108', 'go-index-Q153'],
          content: {
            intro:
              '上一节挡的是「太快」,这一节处理「同时」。singleflight 只能合并本进程的重复请求,十个实例同时发现缓存失效,就会有十个 leader 同时回源。本节先讲一把可信的 Redis 锁需要哪三个条件,每个条件对应一次真实事故;再讲它接在哪个位置才有意义——如果只是「拿不到锁就直接查库」,这把锁就是装饰品。',
            outline: [
              '锁保护的是资源,不是代码:同一把锁在不同服务里含义不同',
              '可信 Redis 锁的三个条件,以及每个条件对应的线上事故',
              '为什么释放和续期都必须比对 token,而且要原子',
              '接在缓存重建上:二次检查缓存才是这把锁的价值所在',
            ],
            pitfalls: [
              '用 SETNX 加 EXPIRE 两步实现抢锁——第二步失败就留下一个永不过期的锁,这个 key 从此没人能拿到,比没有锁更糟。',
              '释放时裸 DEL——持有者超时后锁已被别人抢到,它删的是别人的锁,临界区瞬间失效。',
              '加锁但不二次检查缓存——锁只把 N 次并发回源变成 N 次串行回源,回源次数一次没少。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '锁保护的是资源,不是代码',
                body: [
                  '「分布式锁」这四个字容易让人以为它是个通用的互斥工具。实际上它保护的对象必须具体到「一块共享资源」:某个 Redis key 的重建、某行库存的扣减、某个文件的分片写入。说不清资源是什么,这把锁就无从设置 TTL,也无从判断「锁丢了会怎样」。',
                  '本项目的资源是「某个短码的缓存重建权」。同一时刻只应该有一个实例去查库并回填,否则十个实例同时打 MySQL——这正是缓存击穿的原貌,而 singleflight 对此无能为力:它合并的是进程内的 goroutine,不是进程之间的请求。',
                  '锁的语义也有强弱之分。**互斥锁**保证「同一时刻只有一个持有者」;而 Redis 单实例的锁严格说只是「一段时间内只有一个持有者」——主从切换、网络分区都会破坏它。所以真正严谨的场景要配 fencing token(单调递增的凭据,下游校验它),而本项目只用来做缓存重建,重复执行一次回填的代价只是多一次查库,不需要那么强。[[先确定「锁失效的最坏后果」,再决定要花多大力气。]]',
                  '这一点决定了三件事:TTL 可以短(几百毫秒),丢失锁不需要回滚(回填是幂等的),没抢到锁可以直接查库(结果一样正确)。如果换成扣库存,这三条一条都不成立。',
                ],
              },
              {
                kind: 'principle',
                title: '一把可信的 Redis 锁需要三个条件',
                body: [
                  '这三个条件不是「最佳实践」,而是「少一个就会出事故」。每一个都对应一种具体的失效方式,顺序按事故严重程度排。',
                ],
                steps: [
                  {
                    title: '① 抢锁必须是单条原子命令:SET key token NX PX ttl',
                    detail:
                      '拆成 `SETNX` 再 `EXPIRE`,第二步失败(网络中断、进程被 kill)就留下一个**没有过期时间的锁**。这个 key 从此没人能拿到,而且从监控上看「服务正常、只是偶发超时」——比直接崩掉难查十倍。`SET ... NX PX` 把「不存在才写」和「写时带过期」放进一条命令,要么全成要么全不成。',
                  },
                  {
                    title: '② 值必须是随机 token,不能是固定值',
                    detail:
                      '固定值 `"1"` 让持有者无法回答一个问题:「这个 key 还是我的吗」。没有这个问题,就没有安全的释放和续期——你只能在「可能删掉别人的锁」和「干脆不删」之间二选一。本项目用 `crypto/rand` 取 16 字节做 hex,而不是 `math/rand`:可预测的 token 意味着别人可以伪造「我也是持有者」。',
                  },
                  {
                    title: '③ 释放与续期必须比对 token,而且要原子',
                    detail:
                      '「`GET` 后判断再 `DEL`」在两步之间锁可能已经过期并被 B 抢到,于是 A 删掉了 B 的锁。所以走 Lua:比较和删除在 Redis 内部一次完成。续期同理——不比对 token 的续期更危险,它会把别人刚拿到的锁改成自己的 TTL。',
                  },
                ],
                takeaway:
                  '三条合起来是一句话:**锁的身份和锁的存在性必须在同一次原子操作里被读写**。抢锁时「不存在才写 + 写入身份」,释放时「身份匹配才删」,续期时「身份匹配才续」。[[任何把这两件事拆成两步的实现,都会在某个时序下出错。]]',
              },
              {
                kind: 'diagram',
                title: '没人写这个时序,但线上一定发生:A 迟到的释放',
                diagram: {
                  type: 'sequence',
                  actors: ['实例 A', 'Redis', '实例 B'],
                  messages: [
                    {
                      from: '实例 A',
                      to: 'Redis',
                      text: '`SET lock:resolve:abc A_token NX PX 100` → OK,A 成为持有者',
                    },
                    {
                      from: '实例 A',
                      to: '实例 A',
                      text: '开始查库……结果这条查询因为一个慢 SQL 卡了 300ms',
                    },
                    {
                      from: 'Redis',
                      to: 'Redis',
                      text: '100ms 到了,key 自动过期。!!此刻 A 不知道自己已经不是持有者!!',
                    },
                    {
                      from: '实例 B',
                      to: 'Redis',
                      text: '`SET lock:resolve:abc B_token NX PX 100` → OK,B 成为新持有者',
                    },
                    {
                      from: '实例 A',
                      to: 'Redis',
                      text: '`DEL lock:resolve:abc`(A 的 defer 终于执行)——!!裸 DEL 会在这里删掉 B 的锁!!',
                    },
                    {
                      from: '实例 B',
                      to: '实例 B',
                      text: '以为自己独占临界区,实际上第三个实例马上也要进来了',
                      reply: true,
                    },
                  ],
                  caption:
                    '这个时序的特殊之处在于:每一步单独看都「正常」。A 超时了,B 接手了,A 释放了。只有把三行日志按时间排在一起,才看得出问题。所以它不能靠集成测试碰运气,只能靠定点用例:`TestReleaseDoesNotDeleteOthersLock` 就是照这张图写的——推快 Redis 时钟让 A 过期,让 B 接手,再执行 A 迟到的 `Release`,断言返回 `ErrLost` 且 B 的 key 还在。',
                },
              },
              {
                kind: 'code',
                title: '`Acquire`:一条命令、一个随机身份',
                lang: 'go',
                code: 'func (l *Locker) Acquire(ctx context.Context, name string, ttl time.Duration) (*Lock, error) {\n\tif name == "" {\n\t\treturn nil, errors.New("distlock: name 不能为空")\n\t}\n\tif ttl <= 0 {\n\t\treturn nil, fmt.Errorf("distlock: ttl 必须为正数,收到 %v", ttl)\n\t}\n\ttoken, err := l.token()\n\tif err != nil {\n\t\treturn nil, fmt.Errorf("distlock: 生成 token: %w", err)\n\t}\n\n\tkey := l.prefix + name\n\t// 一条命令完成「不存在才写入 + 带过期时间」。\n\tok, err := l.rdb.SetNX(ctx, key, token, ttl).Result()\n\tif err != nil {\n\t\treturn nil, fmt.Errorf("distlock: 抢锁 %s: %w", key, err)\n\t}\n\tif !ok {\n\t\treturn nil, ErrLocked\n\t}\n\treturn &Lock{rdb: l.rdb, key: key, token: token, ttl: ttl, name: name}, nil\n}\n\nvar releaseScript = redis.NewScript(`\nif redis.call(\'GET\', KEYS[1]) == ARGV[1] then\n  return redis.call(\'DEL\', KEYS[1])\nend\nreturn 0\n`)',
                version: 'Go 1.23 + go-redis v9',
                env: 'miniredis 十四个用例全绿,含 100 并发只 1 个成功、过期后接管、迟到释放不删他人锁',
                verified: true,
                caption:
                  '`SetNX(ctx, key, token, ttl)` 生成的就是 `SET key token PX ttl NX`——一条命令,没有中间态。参数校验放在最前面:负数 TTL 会让 `SET PX` 直接报错,提前拦住比让它变成一个 Redis 错误、再被当成「抢锁失败」吞掉好得多。',
              },
              {
                kind: 'code',
                title: '`KeepAlive`:续期比抢锁更容易写错',
                lang: 'go',
                code: 'func (lk *Lock) KeepAlive(ctx context.Context, ttl time.Duration) (stop func()) {\n\tif ttl <= 0 {\n\t\tttl = lk.ttl\n\t}\n\tinterval := ttl / 3\n\tif interval <= 0 {\n\t\tinterval = ttl\n\t}\n\tdone := make(chan struct{})\n\tstopped := make(chan struct{})\n\tvar once atomic.Bool\n\n\tgo func() {\n\t\tdefer close(stopped)\n\t\tt := time.NewTicker(interval)\n\t\tdefer t.Stop()\n\t\tfor {\n\t\t\tselect {\n\t\t\tcase <-done:\n\t\t\t\treturn\n\t\t\tcase <-ctx.Done():\n\t\t\t\treturn\n\t\t\tcase <-t.C:\n\t\t\t\t// 续期失败(锁丢失或 Redis 抖动)后不再重试:锁丢了就是丢了\n\t\t\t\tif err := lk.Refresh(ctx, ttl); err != nil {\n\t\t\t\t\treturn\n\t\t\t\t}\n\t\t\t}\n\t\t}\n\t}()\n\n\treturn func() {\n\t\tif once.Swap(true) {\n\t\t\treturn\n\t\t}\n\t\tclose(done)\n\t\t<-stopped\n\t}\n}',
                version: 'Go 1.23',
                env: 'TestKeepAliveStopsCleanly 断言「三个 TTL 之后仍持有」与「stop 幂等」',
                verified: true,
                caption:
                  '停止函数里 `<-stopped` 那一行最不起眼,也最重要。没有它,`stop()` 只是「发了退出信号」,协程可能正在执行一次 `Refresh`——于是调用方 `Release` 之后,这次续期把别人刚拿到的锁改成了自己的 TTL。**「停止」必须等到「确实停了」,这是并发编程里最常被省掉的一步。**',
              },
              {
                kind: 'compare',
                title: 'Redis / ZooKeeper / etcd:三种实现的强弱',
                head: ['实现', '一致性', '锁失效风险', '运维成本', '适合'],
                rows: [
                  [
                    'Redis 单实例',
                    '弱(异步复制)',
                    '主从切换可能丢锁',
                    '低(通常已有)',
                    '缓存重建、幂等收口',
                  ],
                  [
                    'Redis Redlock',
                    '中(多数派)',
                    '争议未定,依赖时钟',
                    '中(要 3+ 独立实例)',
                    '谨慎使用,优先换方案',
                  ],
                  [
                    'ZooKeeper',
                    '强(临时顺序节点)',
                    '几乎不丢,会话断开即释放',
                    '高(要维护 ZK 集群)',
                    '选主、强互斥',
                  ],
                  [
                    'etcd',
                    '强(Raft + lease)',
                    '几乎不丢,lease 到期即释放',
                    '中(通常已有)',
                    '选主、配置协调、强互斥',
                  ],
                ],
                note:
                  '一个容易被忽略的差异:ZK 和 etcd 的锁是「会话绑定」的,客户端进程死了锁自动释放;Redis 的锁是「时间绑定」的,客户端死了要等 TTL 到期。前者恢复更快,后者实现更简单。',
                caption:
                  '面试里说「用 Redis 做锁」不算错,但要说清它弱在哪、为什么在这个场景可接受。本项目的答案很具体:锁丢了最坏结果是多一次回源,而回源是幂等的。[[先算失效代价,再选实现,顺序反了就是给缓存重建上一套 Raft。]]',
              },
              {
                kind: 'why',
                title: '为什么这把锁接在缓存重建上,还必须有「二次检查」',
                body: [
                  'singleflight 的合并范围是**进程内**。十个实例同时发现某个 key 过期,就会有十个 leader 同时去查库——singleflight 一点忙也帮不上,因为每个进程里都只有「一个」请求。这就是缓存击穿在多实例下被放大十倍的原貌。',
                  '所以顺序变成:进程内合并(纳秒)→ 跨实例抢锁(一次 Redis)→ 回源。但这里有个陷阱:如果没抢到锁就直接查库,那么 N 个实例仍然会查 N 次库,只是**从并发变成了串行**。锁成了装饰品。',
                ],
                without:
                  '没有二次检查时,锁唯一的收益是「回填只发生一次」。听起来还行,但代价是每个没抢到的实例都要等一次 Redis 加一次查库——比不加锁更慢,而数据库压力一点没降。',
                real: '加了二次检查之后,没抢到锁的实例在等锁的这几十毫秒里,持锁者通常已经回填完毕,于是它直接命中缓存返回,`GetByCode` 一次都没调。`TestCrossInstanceLockMakesLoserReadCache` 断言的就是这个数字:两个实例共用一把锁时,回源 1 次、回填 1 次。[[「锁有没有用」不看它有没有被拿到,看它有没有少掉一次下游调用。]]',
              },
              {
                kind: 'question',
                title: 'Q118 · 如何用 Redis 实现分布式锁?有哪些坑?',
                questionId: 'go-index-Q118',
                intent:
                  '这题的分水岭很清楚:答「SETNX + EXPIRE」是入门,答出「必须 SET NX PX 一条命令 + token + Lua 释放」是合格,能再答出主从切换丢锁和续期陷阱才算过关。',
                points: [
                  '先给最简正确版:`SET key <随机token> NX PX <ttl>`,释放用 Lua 比对 token 再 `DEL`。这两句是骨架,先说骨架再说坑。',
                  '坑一:两步式抢锁留下永不过期的 key。坑二:裸 `DEL` 删掉别人的锁。坑三:续期不比对 token。三个坑按「发生概率 × 排查难度」排,前两个最难查。',
                  '坑四:主从切换。Redis 主从是异步复制,主节点写入锁后还没同步就挂了,从节点升主后锁就消失了。要更强保证就上 Redlock(仍有争议)或换 etcd/ZK。',
                  '最后落到场景:如果锁失效的后果是可接受的(重做一次幂等操作),Redis 锁足够;如果后果是资损或超卖,要用「锁 + 唯一索引」双保险,或者干脆不用锁、用条件更新。[[能说「什么情况下我不该用锁」,比会用锁更有说服力。]]',
                ],
                depth:
                  '追问通常会到 fencing token:即使锁判断全对,「拿到锁 → 操作」之间仍可能有 GC 停顿或网络延迟,导致旧的持有者在锁失效后继续写。解法是让下游校验一个单调递增的 token,拒绝比已见过的更小的值。这一层答得出来,说明你读过 Kleppmann 那篇文章而不是只背了 Redis 文档。',
                followup:
                  '再深一层会问「怎么避免锁被大量请求同时抢」。答:本地先做请求合并(本项目就是 singleflight),把抢锁次数从「请求数」降到「进程数」;再配合较短的 TTL 与有限的等待上限(本项目 `LockWait` 默认 50ms),避免把锁竞争变成用户可见延迟。',
              },
              {
                kind: 'question',
                title: 'Q23 · 分布式锁的几种实现与对比?',
                questionId: 'go-05-Q23',
                intent:
                  '这题考的是选型视野。只答 Redis 一种、或者只答「ZK 更好」都不及格——判据是场景,不是排名。',
                points: [
                  '三种主流:基于 Redis(单实例 / Redlock)、基于 ZooKeeper(临时顺序节点)、基于 etcd(lease + 事务)。先把它们的**一致性来源**说清:Redis 靠单点 + TTL,ZK 靠 ZAB 的顺序性,etcd 靠 Raft。',
                  '释放机制的关键差异:Redis 是「时间绑定」(等 TTL 到期),ZK/etcd 是「会话绑定」(连接断即释放)。前者恢复慢但实现简单,后者恢复快但要多维护一套协调服务。',
                  '可用性 vs 正确性的取舍:Redis 主从切换会丢锁(可用性优先),ZK 选举期间不可写(正确性优先)。**如果你的业务不能容忍「短暂丢锁」,那就不该把正确性押在 Redis 上。**',
                  '实际选型的判据:如果系统里已经有 Redis,且锁失效的代价可接受,就用 Redis;如果需要选主、强互斥、配置协调,用 etcd/ZK;如果两者都没有,先问「这个场景能不能不用锁」——条件更新、唯一索引、消息去重能解决大部分问题。',
                ],
                depth:
                  '高分答案会补一句:「分布式锁的替代品比锁本身更重要」。幂等键 + 唯一索引解决重复创建,`UPDATE ... WHERE stock >= n` 解决超卖,CAS 解决并发更新——这三者都不需要锁,而且没有「锁过期」这个失效面。把锁当第一选择,通常说明还没想清竞态到底是什么。',
                followup:
                  '可能追问「Redlock 到底行不行」。给一个平衡的答案:它的前提是「各节点时钟漂移有界」,而这一点在虚拟化环境下并不总能保证;所以它适合「对正确性要求不极致」的场景。真正需要强保证时,业界的做法是 fencing token,而不是更强的锁算法。',
              },
              {
                kind: 'explore',
                title: '从「互斥」到「不需要互斥」',
                from:
                  '这一节的锁解决的是「同一个人被重复执行」。但很多并发问题的正解不是加锁,而是把操作改成「重复执行也无害」。',
                branches: [
                  {
                    direction: 'lateral',
                    related: '乐观锁 / 条件更新(CAS)',
                    basis: '都在解决「两个写者同时改一份数据」',
                    shared: '都要求能把「冲突」检测出来并重试',
                    diff:
                      '悲观锁先占位再操作,冲突在入口被挡;乐观锁先操作再校验,冲突在提交时被发现。前者等待,后者重试。',
                    value:
                      '冲突率低时乐观锁完胜:没有锁开销、没有死锁、没有过期问题。本项目建短链就是乐观的——靠 `uk_url_hash` 唯一索引,冲突了读回赢家。[[「加锁」和「靠唯一索引」的差别,是「协调」与「让数据库替我协调」。]]',
                  },
                  {
                    direction: 'down',
                    related: '锁的粒度与热点:分段锁、条带化(striping)',
                    basis: '都是「把一把大锁拆成多把小锁」',
                    shared: '都假设访问能按某个 key 均匀散开',
                    diff:
                      '分段锁是把一个数据结构切成 N 段各配一把锁;条带化是 `hash(key) % N` 直接选一把锁,不需要真的切分数据。',
                    value:
                      '本项目按短码哈希选锁(`resolve:<code>`),天然就是条带化的——不同短码互不阻塞。反过来,如果锁名写成 `resolve:all`,那所有短码的重建都会排队,这就是「锁的粒度选错」的典型症状:**QPS 上不去,但 CPU 和数据库都很闲**。',
                  },
                ],
              },
            ],
          },
        },
        {
          id: 'idempotency-key',
          title: '接口幂等:让重试不产生副作用',
          kind: 'concept',
          questionIds: [
            'go-index-Q126',
            'go-index-Q160',
            'go-05-Q29',
            'go-index-Q150',
            'go-index-Q120',
          ],
          content: {
            intro:
              '上一节的锁管的是「服务端自己别打自己」,这一节管的是「客户端重试」。一个请求超时并不等于失败,它可能已经执行完、只是响应在回程丢了——客户端无法区分,所以一定会重试。用户在弱网下点五次「生成短链」,落在库里就是五条记录、五个短码、五个号段号。解法不是让客户端别点,而是服务端认一个幂等键。落地会看到三个决定:键必须由客户端生成、指纹必须包含方法与路径、5xx 必须回滚而不是缓存。',
            outline: [
              '重试是客户端的本能,幂等是服务端的义务',
              '幂等的三个层次:唯一键、条件更新、状态机 + 结果复用',
              '为什么键之外还要指纹,为什么 pending 返回 409 而不是等待',
              '把幂等推到极端:秒杀里的防超卖',
            ],
            pitfalls: [
              '把消费端幂等当成接口幂等的答案——前者防中间件重投,后者防客户端重试,重复的来源不同,位置也不同。',
              '只比较幂等键不比较请求内容——同一个键配不同请求体时静默回放旧结果,客户端会以为新请求也成功了。',
              '把 5xx 的响应也写进幂等记录——一次数据库抖动被永久固化成「这个键的结果是 500」,客户端永远重试不成功。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '重试是客户端的本能,幂等是服务端的义务',
                body: [
                  '一个请求「超时」并不等于「失败」。它可能压根没到服务端,也可能已经到了、执行完了、只是响应在回程丢了。客户端无法区分这两种情况,所以它只有两个选择:不重试(可能丢单)或重试(可能重复)。任何有责任心的客户端都会选重试——**这是设计使然,不是用户手贱。**',
                  '所以幂等不是「防御性编程」,而是「接口契约的一部分」:我承诺,同一个幂等键的多次请求,效果等于一次。这个承诺让客户端的「超时就重试」变成安全动作。',
                  '这里要和阶段 C 的消费端幂等区分清楚。消费端幂等的位置在**消费者**,重复来源是 Kafka 的重投,目标是「同一批消息处理两次,数据库里的数字不变」。接口幂等的位置在**服务端入口**,重复来源是客户端重试,目标是「同一份请求执行两次,不产生两条业务记录」。[[一个是把重复「算对」,一个是把重复「挡掉」——方向相反。]]',
                  '还有一层区别值得注意:消费端幂等是「事后纠偏」(已经重复了,靠 upsert 让他算对),接口幂等是「事前拦截」(第二次根本不会执行)。所以前者可以做得粗糙(增量累加天然幂等),后者必须做得严谨(要么不执行,要么结果完全一致)。',
                ],
              },
              {
                kind: 'principle',
                title: '幂等的三个层次,从「事后纠偏」到「事前拦截」',
                body: [
                  '三个层次不是替代关系,而是可以叠加的关系。本项目三层都有,分别挡不同的东西。',
                ],
                steps: [
                  {
                    title: '① 唯一索引:让数据库替我判重(最可靠)',
                    detail:
                      '给业务键加唯一索引,插不进去就是重复。它不依赖应用层的判断,并发下由引擎保证。本项目的 `uk_url_hash` 就是这一层:同一个 URL 建两次,第二次撞索引,读回赢家的短码。代价是要设计出能表达「唯一」的键——URL 本身太长建不了索引,所以存 `sha256` 前 16 字节。',
                  },
                  {
                    title: '② 条件更新:把「读-判断-写」压进一条 SQL(防超卖)',
                    detail:
                      '`UPDATE stock SET n = n - ? WHERE id = ? AND n >= ?`,受影响行数为 0 就是库存不够。这条语句在并发下由行锁保证原子,不需要任何应用层加锁。它同时是「幂等的基础」——但如果请求本身重复,它会扣两次,所以还需要第 ③ 层。',
                  },
                  {
                    title: '③ 状态机 + 结果复用:真正挡住「同一个请求执行两次」',
                    detail:
                      '幂等记录有三个状态:不存在、`pending`(有人正在执行)、`done`(有结果可回放)。第二次请求看到 `done` 就直接返回第一次的响应,看到 `pending` 就返回 409。这一层是唯一能保证「副作用只发生一次」的,前两层只能保证「结果可接受」。',
                  },
                ],
                takeaway:
                  '工程上的顺序是:先看有没有天然的唯一天然键(有就用 ①),再看能不能把操作写成条件更新(能就用 ②),最后补 ③ 挡「完全相同的请求」。[[三层都上不是过度设计,因为它们挡的是三种不同的重复。]]',
              },
              {
                kind: 'diagram',
                title: '幂等记录的状态机只有两条边',
                diagram: {
                  type: 'state',
                  states: [
                    { label: '无记录', note: '首次请求,或记录已过期被清理' },
                    { label: 'pending', note: '已占位,正在执行;同键再来返回 409' },
                    { label: 'done', note: '有状态码和响应体,同键再来直接回放' },
                  ],
                  transitions: [
                    'INSERT 占位成功 → 拿到执行权(并发下只有一个能插入)',
                    'Finish:2xx/4xx 写回状态码与响应体,状态转 done',
                  ],
                  back: {
                    from: 2,
                    to: 1,
                    label: 'Abort:5xx 或响应体超限 → 删掉占位,客户端可立刻重试',
                  },
                  caption:
                    '没有 `failed` 状态是刻意的。加了就要定义「failed 能不能被覆盖」「覆盖后原来的结果算不算数」,而 5xx 的正确处理是**直接删掉记录**——既不需要第三态,也不需要任何清理逻辑。那条回退边是整个设计的核心:它保证「一次瞬时故障不会变成这个键的永久结果」。',
                },
              },
              {
                kind: 'code',
                title: '`Middleware`:占位 → 执行 → 落结果',
                lang: 'go',
                code: 'func Middleware(cfg Config) gin.HandlerFunc {\n\tcfg.withDefaults()\n\treturn func(c *gin.Context) {\n\t\tif !cfg.Methods[c.Request.Method] {\n\t\t\tc.Next()\n\t\t\treturn\n\t\t}\n\t\tkey := strings.TrimSpace(c.GetHeader(cfg.Header))\n\t\tif key == "" {\n\t\t\tc.Next() // 不带键 = 客户端放弃保护,放过去而不是强制\n\t\t\treturn\n\t\t}\n\t\tfp, err := fingerprint(c)\n\t\tif err != nil {\n\t\t\thttpx.Fail(c, httpx.New(httpx.CodeInvalid, "请求体过大或不可读"))\n\t\t\treturn\n\t\t}\n\n\t\tctx := c.Request.Context()\n\t\trec, created, err := cfg.Store.Begin(ctx, key, fp, cfg.TTL)\n\t\tif err != nil {\n\t\t\tif errors.Is(err, ErrConflict) {\n\t\t\t\thttpx.Fail(c, httpx.New(httpx.CodeConflict, "同一个幂等键不能用于另一份请求"))\n\t\t\t\treturn\n\t\t\t}\n\t\t\t// 写接口 fail-closed:放过去就会真的创建\n\t\t\thttpx.Fail(c, httpx.Wrap(httpx.CodeUnavailable, "幂等校验暂不可用,请稍后重试", err))\n\t\t\treturn\n\t\t}\n\t\tif !created {\n\t\t\treplay(c, rec)\n\t\t\treturn\n\t\t}\n\n\t\tw := &recorder{ResponseWriter: c.Writer, max: cfg.MaxBody}\n\t\tc.Writer = w\n\t\tc.Next()\n\n\t\tif w.status >= 500 || w.truncated {\n\t\t\t_ = cfg.Store.Abort(ctx, key) // 失败不缓存\n\t\t\treturn\n\t\t}\n\t\t_ = cfg.Store.Finish(ctx, key, w.status, w.buf.Bytes())\n\t}\n}',
                version: 'Go 1.23 + Gin',
                env: 'go test ./internal/idem 十一条用例全绿,含 20 并发同键只执行 1 次',
                verified: true,
                caption:
                  '两个反直觉的分支都在这里:存储故障时返回 **503 而不是放行**(写接口放行就是真的创建),5xx 时 **Abort 而不是 Finish**。注意 `c.Writer = w` 的位置——必须在 `c.Next()` 之前,否则 handler 已经写完响应了,抄不到东西。',
              },
              {
                kind: 'code',
                title: '`Begin`:插入 + 失败读回 + 条件接管',
                lang: 'go',
                code: 'for attempt := 0; attempt < 2; attempt++ {\n\tres := r.db.WithContext(ctx).Exec(\n\t\t`INSERT INTO idempotency_key (`+idemColumns+`) VALUES (?, ?, \'pending\', 0, NULL, ?)`,\n\t\tkey, fp, exp,\n\t)\n\tif res.Error == nil {\n\t\treturn &idem.Record{Key: key, Fingerprint: fingerprint, State: idem.StatePending}, true, nil\n\t}\n\tif !isDuplicateKey(res.Error) {\n\t\treturn nil, false, fmt.Errorf("idem: 占位 %s: %w", key, res.Error)\n\t}\n\n\tvar row idemRow\n\tif err := r.db.WithContext(ctx).\n\t\tRaw(`SELECT `+idemColumns+` FROM idempotency_key WHERE idem_key = ? LIMIT 1`, key).\n\t\tScan(&row).Error; err != nil {\n\t\treturn nil, false, fmt.Errorf("idem: 读回 %s: %w", key, err)\n\t}\n\n\tcur := toIdemRecord(&row)\n\t// 只看 expires_at,不看 state。写成「done 就当作还活着」\n\t// 会让一条已过期的 done 记录永远挡住同一个键。\n\tif row.ExpiresAt.After(now) {\n\t\tif cur.Fingerprint != fingerprint {\n\t\t\treturn nil, false, idem.ErrConflict\n\t\t}\n\t\treturn cur, false, nil\n\t}\n\n\tupd := r.db.WithContext(ctx).Exec(\n\t\t`UPDATE idempotency_key SET fingerprint = ?, state = \'pending\', status_code = 0, body = NULL, expires_at = ? `+\n\t\t\t`WHERE idem_key = ? AND expires_at <= ?`,\n\t\tfp, exp, key, now,\n\t)\n\tif upd.RowsAffected == 1 {\n\t\treturn &idem.Record{Key: key, Fingerprint: fingerprint, State: idem.StatePending}, true, nil\n\t}\n}',
                version: 'Go 1.23 + GORM',
                env: 'sqlmock 十条用例全绿,含「接管竞态 RowsAffected=0」与「非 1062 错误必须上抛」',
                verified: true,
                caption:
                  '顺序是「先插入,失败再读回」,和阶段 A 建短链同一个套路。`WHERE expires_at <= ?` 是接管的关键:两个请求同时想接管一条过期记录时,只有第一个的 `UPDATE` 能命中行,第二个 `RowsAffected=0`——这跟 Redis 的 `SET NX` 是同一个思路,只是把唯一性交给了行锁。',
              },
              {
                kind: 'compare',
                title: '消费端幂等 vs 接口幂等',
                head: ['维度', '消费端幂等(阶段 C)', '接口幂等(本节)'],
                rows: [
                  [
                    '重复的来源',
                    '消息中间件的重投(at-least-once 的必然)',
                    '客户端超时后的重试',
                  ],
                  [
                    '挡在什么位置',
                    '消费者里,处理之前',
                    '服务端入口,handler 之前',
                  ],
                  [
                    '判断依据',
                    '`event_id` 窗口去重 + 增量累加',
                    '`Idempotency-Key` + 请求指纹',
                  ],
                  [
                    '重复的后果',
                    '数字算多(可以靠累加语义纠正)',
                    '多创建一条记录(不可撤销)',
                  ],
                  [
                    '典型失效',
                    '窗口太小,跨实例的重投漏掉',
                    '键被复用、5xx 被缓存、TTL 太短',
                  ],
                ],
                note:
                  '两者可以共存而且要共存:一次创建请求走完 API(接口幂等),产生的打点事件被 Kafka 重投(消费端幂等),两边都不出错。它们挡的是重复的两个不同来源。',
                caption:
                  '把这张表背下来的价值,是面试里被问「幂等怎么做」时不会答成「用唯一索引就行」——唯一索引只挡得住「业务键相同」的重复,挡不住「业务键不同但其实是同一个请求」的重复(比如两次生成的短码本来就该不同)。',
              },
              {
                kind: 'why',
                title: '为什么 5xx 必须回滚,pending 必须返回 409',
                body: [
                  '先说 5xx。如果一次执行因为数据库抖动失败了,而你把「500」写进了幂等记录,那么**这个键从此永远返回 500**——客户端重试一万次都是 500,直到记录过期。一次 3 秒的故障被放大成 24 小时的不可用,而受害者只有那一个用户。',
                  '所以规则是:执行失败就 `Abort`(删掉占位),让「没有记录」这个状态重新成立。这样客户端下一次重试会重新拿到执行权,重新试一次。**幂等记录只应该记住「成功的样子」,不该记住「失败的样子」。**',
                  '再说 pending。第一个请求还没结束时,第二个同键请求有两种处理:等它完成再回放,或者立刻返回 409。',
                ],
                without:
                  '如果选择「等」,那么每个重试的客户端都会在服务端挂一个等待的 goroutine。数据库慢查询把第一个请求拖到 5 秒时,这个键会挂住所有重试者——**本来只是一个人慢,变成了所有人一起慢**。这就是重试风暴在单键上的缩影。',
                real: '选 409 + `Retry-After` 的理由:把决定权交回客户端,语义也更准确——你不是重复提交,你是抢先了一步。而且 409 是可观测的:日志里出现 409 就说明「这个键有并发请求」,这本身是个有用的信号。[[能用一个状态码表达清楚的语义,不要用「等待 + 超时」去表达。]]',
              },
              {
                kind: 'question',
                title: 'Q126 · 超时应该怎么设?为什么会出现重试风暴?',
                questionId: 'go-index-Q126',
                intent:
                  '这题表面问超时,实际问的是「超时、重试、幂等三者的关系」。把这三者串起来答,才能说明你真的排过这类故障。',
                points: [
                  '超时必须**逐层递减**:客户端 3s → 网关 2.5s → 服务 2s → 数据库 1.5s。反过来的话,内层比外层慢,外层先超时、内层还在跑,连接和 goroutine 都被占着。',
                  '超时时间不是拍的,是从 P99 推的:取依赖的 P99 乘以安全系数(常见 1.5~3),再留出本层的处理时间。**比 P99 还短的超时,等于给正常请求判死刑。**',
                  '重试风暴的成因有三个:重试没有退避(所有客户端同时重试)、重试没有上限(失败一次触发三次)、重试没有抖动(同步的心跳式重试)。三者叠加就是「故障 → 重试 → 更慢 → 更多超时 → 更多重试」的正反馈。',
                  '止血的三件套:指数退避 + 抖动、重试预算(整个调用链共享一个重试配额)、以及**让重试安全**——这就是本节幂等键的作用。[[没有幂等的重试不是容错,是把一个错误放大成 N 个。]]',
                ],
                depth:
                  '高分答案会区分「可以重试」和「不该重试」的错误:5xx、超时、连接拒绝可以重试;4xx(参数错、鉴权失败)重试一万次也不会成功,只会浪费容量。再往上,会提到「重试要在哪一层做」——最靠近故障点的一层做最划算,因为它知道「这次失败是不是瞬时的」。',
                followup:
                  '追问常到「怎么发现重试风暴」。答:三个信号同时出现——QPS 涨、成功率跌、P99 涨,而 CPU 和依赖延迟没有同比涨。本项目里 `X-Request-Id` 就是为了在这种时候把「同一个逻辑请求的多次物理尝试」串起来看。',
              },
              {
                kind: 'question',
                title: 'Q160 · 秒杀系统怎么设计?超卖怎么防?',
                questionId: 'go-index-Q160',
                intent:
                  '秒杀是幂等和并发控制的极限场景。这题答得好不好,看你能不能说清「哪一层挡住了哪一类错误」,而不是罗列中间件。',
                points: [
                  '防超卖的最小充分条件是**一条条件更新**:`UPDATE stock SET n = n - 1 WHERE id = ? AND n > 0`,受影响行数为 0 就失败。它靠 InnoDB 的行锁保证原子,不需要任何应用层锁。',
                  '往上一层是**预扣减**:Redis 里 `DECR` 库存,小于 0 就直接拒,把绝大部分请求挡在数据库之前。Redis 与 MySQL 的一致靠「异步对账 + 定时校准」,允许短暂不一致。',
                  '再往上一层是**请求去重**:同一个用户的重复提交用幂等键挡掉(本节的做法),不然一个人能占掉十个名额。这一层的价值在秒杀场景里被放大,因为「用户狂点」正是最典型的重试。',
                  '最外层是**流量整形**:限流(上一节)、答题/验证码、队列削峰。注意这些都不解决超卖,它们只降低打到库存层的并发——**正确性永远靠条件更新那一层兜底。**',
                ],
                depth:
                  '档位差在「同步扣减还是异步下单」。同步扣减链路短、可立即返回结果,但数据库压力大;异步下单(Redis 计数 + MQ 排队)能扛住十倍流量,但要处理「排队失败怎么补偿」「结果怎么查」。没有绝对优劣,判据是「秒杀的量级」和「能不能接受最终一致性」。',
                followup:
                  '可能追问「Redis 扣到 0 了但 MySQL 还有货怎么办」。答:这是预扣减的固有误差,靠对账修复;而「Redis 有货但 MySQL 扣失败」才是必须处理的路径——此时要么重试扣减,要么把库存加回 Redis 并把用户置为失败。**两个方向的误差成本不同,处理优先级也不同。**',
              },
              {
                kind: 'explore',
                title: '幂等键该由谁生成,存多久?',
                from:
                  '本节把这两个问题都给了默认答案(客户端生成、24 小时)。但它们其实都是可以讨论的取舍。',
                branches: [
                  {
                    direction: 'reverse',
                    related: '服务端生成幂等键(由首次请求返回一个 token,后续请求带上)',
                    basis: '都是「用一个标识把多次请求归并成一次」',
                    shared: '都需要一个存储来记住「这个标识处理到哪了」',
                    diff:
                      '客户端生成时,重试在「第一次请求还没回来」时就能发起;服务端生成时,必须先拿到 token,多一次往返。',
                    value:
                      '服务端生成适合「支付」这类必须两步确认的场景(先下单拿 token,再确认支付),它天然把「幂等」和「状态查询」合成一个接口。客户端生成适合「一次提交、超时就重试」的场景,少一次往返。[[判据是「第一次请求失败时,客户端还能不能重试」——不能重试的场景才需要服务端发 token。]]',
                  },
                  {
                    direction: 'outward',
                    related: 'TTL 到底该多长:24 小时 / 7 天 / 永久',
                    basis: '都是「记录要保留多久才能覆盖客户端的重试窗口」',
                    shared: '都受限于存储成本与业务的重试习惯',
                    diff:
                      'TTL 越长,覆盖的重复越全,但表越大、清理越慢;TTL 越短,越可能「同一个逻辑请求在过期后被当成新请求」。',
                    value:
                      '判据是「客户端最晚可能多久后重试」:同步接口通常是分钟级(用户在等),异步任务可能跨天(定时补偿)。本项目的创建接口取 24 小时,是按「用户当天可能反复点」估的。[[TTL 是业务假设,不是技术参数——写下来,别让它躺在默认值里。]]',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: 'observe',
      title: 'E · 可观测:出了问题,你能不能五分钟内说出哪里坏了',
      goal: '让「一次请求」和「一次故障」都能被追出来——日志能串成一条线,指标能算得出分位数,排障有固定入口而不是靠猜',
      summary:
        '前四个阶段都在让系统「跑得对」,这一阶段解决「坏了以后你怎么知道、怎么定位」。三种证据各有分工:日志记录离散事实,指标记录聚合趋势,pprof 记录调用栈现场。它们的共同前提是**身份**——没有 trace id,一次请求在日志里散成四片互不相干的记录;没有路由模板,指标会被业务数据撑爆;没有独立端口,排障工具本身变成攻击面。验收标准同样是可测量的事实:trace id 能从响应头一路追到 Kafka 消费并落进同一行日志、300 个短码在指标里只占 1 条时间序列、一个「PV 永远是 0」的故障能靠 lag 加四个计数器在五分钟内定位到具体那一行代码。',
      checkpoint: {
        questionIds: [
          'go-index-Q129',
          'go-index-Q101',
          'go-index-Q103',
          'go-index-Q104',
          'go-index-Q111',
          'go-index-Q71',
        ],
        passRatio: 0.8,
      },
      lessons: [
        {
          id: 'trace-and-log',
          title: 'trace id 与结构化日志:让一次请求在日志里连成一条线',
          kind: 'concept',
          questionIds: [
            'go-index-Q101',
            'go-index-Q129',
            'go-index-Q49',
            'go-index-Q50',
          ],
          content: {
            intro:
              '一次跳转在生产环境里至少留下四行日志:访问日志、缓存决定、SQL、打点。它们是四个不同的组件写的,时间戳差几毫秒,顺序还不一定对。没有身份的时候,你只能靠「时间接近」把它们猜到一起——而线上同一毫秒里有几十个请求在跑,猜错是常态。这一节做三件事:给每个请求一个 32 位十六进制的身份证、让它在跨进程时走标准头、让每一条日志自动带上它。落地会看到三个坑,它们共同的特征是**不报错**:用 `slog.Info` 而不是 `InfoContext` 会让身份证失效,Handler 忘了重写 `WithAttrs` 会让 `.With` 之后静默丢字段,`WithGroup` 会把字段塞进组里、导致查询写 `trace_id="..."` 一条都查不到。',
            outline: [
              '一次请求在日志里为什么会散成四片,以及「时间接近」为什么不可靠',
              'trace id 的三条来路:生成、继承、兜底,以及为什么拒绝宽松解析',
              '为什么注入点在 handler 层,而不是每个调用点手写一遍',
              '跨进程传播:为什么走 Kafka header 而不是消息正文',
            ],
            pitfalls: [
              '用 `slog.Info` 而不是 `slog.InfoContext`:前者内部传的是 `context.Background()`,handler 取不到 id。日志看起来一切正常,只是没有 trace_id——**故障时才会发现,而那时你已经在排障了。**',
              'Handler 包了,但 `WithAttrs` 直接返回内层:`main` 里一句 `logger.With("component", "api")` 之后,trace_id 全部消失,同样不报错。',
              '把 trace id 塞进消息正文:正文是生产者与消费者的数据契约,加一个字段就多一次版本协商;传播信息属于传输层,不属于数据。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '一次请求为什么会散成四片',
                body: [
                  '一个 302 跳转在本项目里会写四种日志:中间件写的访问日志(`POST /:code 302 1.2ms`)、cache-aside 写的缓存决定(`cache hit`)、GORM 慢查询日志(超过阈值才写)、打点管线写的批次日志(`flush batch=20`)。写它们的是四个组件,拿到的上下文各不相同。',
                  '最容易想到的办法是「按时间戳拼」:找 `20:18:37.112` 前后几毫秒的所有日志。这在本地开发时工作得很好,因为一秒只有一个请求。线上不一样——同一毫秒里有几十个请求在跑,**你拼出来的四行里,可能有一行属于别人的请求。** 而拼错比拼不出来更糟:你会沿着一条错误的线索查上半小时。',
                  '第二种办法是「按用户标识拼」,比如带上 IP 或用户 ID。它的问题是粒度不对:一个用户可能同时开五个页面、点十个链接,你还是分不清哪四个日志属于同一次点击。',
                  '所以在日志这个维度里,唯一可靠的关联手段是**给每一次物理请求分配一个唯一的、随请求流动的 id**。它必须满足三个条件:全局唯一(不能撞)、能跨进程(HTTP 到 HTTP、HTTP 到 Kafka)、不依赖业务字段(否则又绕回第二种办法)。这三条正好定义了 trace id。',
                ],
              },
              {
                kind: 'principle',
                title: 'trace id 的三条来路:生成、继承、兜底',
                body: [
                  '三条路有严格的优先级,顺序错了会出现「同一条链路被上游切断」这类很难查的现象。',
                ],
                steps: [
                  {
                    title: '① 继承:请求头里已经有 id,就用它的',
                    detail:
                      '标准是 W3C Trace Context 的 `traceparent` 头,格式固定四段:`版本-traceid-spanid-flags`,例如 `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`。只要上游是网关、另一个 Go 服务、或者任何接了 OpenTelemetry 的组件,它就会带上这个头。继承下来,你在 Jaeger 或 Loki 里才能看到「一个请求穿过三个服务」的完整瀑布图。',
                  },
                  {
                    title: '② 兜底:没有标准头,但有一个非标准的 `X-Request-ID`',
                    detail:
                      '很多网关只发 `X-Request-ID`,不发 `traceparent`。这个头**是不可信输入**——任何人都能发一个 3000 字符的字符串、带控制字符、带换行(日志注入)。所以它必须先过白名单:只留 `[0-9a-zA-Z-_]`,截到 64 字符,不合格就当作没给。',
                  },
                  {
                    title: '③ 生成:两个都没有,自己造一个',
                    detail:
                      '16 字节 `crypto/rand` → 32 个十六进制字符。为什么是 16 字节而不是 8:因为 W3C 规范里 trace-id 就是 16 字节。宽度对齐之后,将来接 OpenTelemetry 不用改字段长度、不用重刷历史日志的索引。`2^64` 在单机上确实够用,但**「够用」和「不用迁移」是两件事**。',
                  },
                ],
                takeaway:
                  '顺序必须是「继承 → 兜底 → 生成」,不能反过来:一旦自己先生成,上游的 id 就被丢弃,链路在你这一个服务处断开,而断点的特征恰恰是「上游有日志、下游也有日志,但两边对不上」。[[trace 的价值全在连续性上,断一次等于零。]]',
              },
              {
                kind: 'diagram',
                title: '一个 id 怎么穿过 HTTP、Redis、Kafka 三种边界',
                diagram: {
                  type: 'sequence',
                  actors: ['客户端', 'API 进程', 'Redis', 'Kafka', 'worker'],
                  messages: [
                    {
                      from: '客户端',
                      to: 'API 进程',
                      text: '`GET /1n0I6`(无 traceparent,只有 `X-Request-ID: abc` 这种网关头)',
                    },
                    {
                      from: 'API 进程',
                      to: 'API 进程',
                      text: 'RequestID 中间件:sanitize(`abc`) → 写进 `context.Context` → 回显到响应头',
                    },
                    { from: 'API 进程', to: 'Redis', text: '`GET link:1n0I6` —— 不传 id,Redis 不需要它' },
                    { from: 'Redis', to: 'API 进程', text: 'MISS' },
                    {
                      from: 'API 进程',
                      to: 'API 进程',
                      text: '回源 MySQL、写日志 —— 每行日志由 TraceHandler 自动补 `trace_id`',
                    },
                    {
                      from: 'API 进程',
                      to: 'Kafka',
                      text: '打点事件:正文里**没有** trace_id,id 放 message header',
                    },
                    {
                      from: 'Kafka',
                      to: 'worker',
                      text: 'Fetch 后从 header 读回 id,塞进 ctx;落库日志与 API 日志同 id',
                    },
                  ],
                  caption:
                    '注意 Redis 那一跳:内部缓存调用不传 trace id 是刻意的。传了反而会让 Redis 的慢日志里出现业务 id,而那属于「业务数据泄进了基础设施日志」。**只在你需要跨它做关联的边界上传**——HTTP 边界和消息边界,恰好是仅有的两个。',
                },
              },
              {
                kind: 'code',
                title: '`ParseTraceparent`:55 个字符,一个都不多',
                lang: 'go',
                code: 'func ParseTraceparent(s string) (string, bool) {\n\t// 32 + 16 + 2 个字符 + 3 个分隔符;长度不对就不必再 split。\n\tif len(s) != 55 {\n\t\treturn "", false\n\t}\n\tif s[2] != \'-\' || s[35] != \'-\' || s[52] != \'-\' {\n\t\treturn "", false\n\t}\n\tversion, traceID, spanID, flags := s[0:2], s[3:35], s[36:52], s[53:55]\n\tif version != "00" {\n\t\t// ff 是规范明确保留且非法的版本号。\n\t\treturn "", false\n\t}\n\tif !isHex(traceID) || !isHex(spanID) || !isHex(flags) {\n\t\treturn "", false\n\t}\n\tif allZero(traceID) || allZero(spanID) {\n\t\t// 全 0 是规范禁止的:trace id 全 0 无法和「没有 id」区分开。\n\t\treturn "", false\n\t}\n\treturn traceID, true\n}',
                version: 'Go 1.24 + 标准库',
                env: 'internal/obs 十条用例全绿,含长度错、分隔符错位、版本非 00、非 hex、全 0 五个负例',
                verified: true,
                caption:
                  '这里刻意写得比「宽容」严格得多。宽松解析(接受任意长度、跳过版本校验)看起来更健壮,实际后果是:一个拼错的头会被当成合法 id 接受,于是这条链路以一个**错误但看起来正常**的 id 继续往下走——排查时你会在两个本该连起来的日志中间发现断口,而没有任何报错提示。[[宁可拒绝,让上游把 id 生成好;也不要接受一个半对的 id,让它在链路中间制造断层。]]',
              },
              {
                kind: 'code',
                title: '`TraceHandler`:在 handler 层补字段',
                lang: 'go',
                code: 'func (h *TraceHandler) Handle(ctx context.Context, r slog.Record) error {\n\tid := TraceID(ctx)\n\tif id == "" {\n\t\treturn h.Handler.Handle(ctx, r)\n\t}\n\n\t// 调用点如果已经显式加了 trace_id,就不再重复 —— 否则输出里会出现\n\t// 两个同名键,而 JSON 解析器取第一个还是最后一个取决于实现。\n\tdup := false\n\tr.Attrs(func(a slog.Attr) bool {\n\t\tif a.Key == FieldTrace {\n\t\t\tdup = true\n\t\t\treturn false\n\t\t}\n\t\treturn true\n\t})\n\tif dup {\n\t\treturn h.Handler.Handle(ctx, r)\n\t}\n\n\t// Record 是按值传递的,但内部属性数组是共享的:必须 Clone 后再 AddAttrs,\n\t// 否则会写到上一条记录(或调用方的)缓冲区里。\n\tr2 := r.Clone()\n\tr2.AddAttrs(slog.String(FieldTrace, id))\n\treturn h.Handler.Handle(ctx, r2)\n}\n\n// WithAttrs 必须重新包一层。\n// 直接返回 h.Handler.WithAttrs(as) 会丢掉包装,于是\n// logger.With("component", "x") 之后的所有日志**都不再有 trace_id**。\nfunc (h *TraceHandler) WithAttrs(as []slog.Attr) slog.Handler {\n\treturn &TraceHandler{Handler: h.Handler.WithAttrs(as)}\n}',
                version: 'Go 1.21+ log/slog',
                env: 'obs 包八条用例全绿,含「With 之后仍注入」「组内嵌套行为」「不重复注入」',
                verified: true,
                caption:
                  '三个必须写对的地方:`Clone()`(不 Clone 会污染上一条记录)、去重判断(否则 JSON 里两个 `trace_id`,取哪个取决于解析器)、以及 `WithAttrs` 重新包装。最后这一条是这类 Handler 最容易漏的——它在 `main` 里一定会被触发,而症状是「加了字段之后 trace_id 就没了」。',
              },
              {
                kind: 'why',
                title: '为什么注入点必须在 handler 层,而不是每个调用点手写',
                body: [
                  '最直觉的做法是让每个调用点自己带上:`logger.Info("cache hit", "trace_id", id, "code", code)`。它在示例代码里工作得很好,因为示例只有三个调用点。',
                  '本项目的调用点在十个以上,分布在 handler、service、repo、stats、worker 五个包里。手写的后果不是「多打几个字」,而是**漏一个是必然的**——而漏掉的那一条,往往正好是排障要看的那一条(比如某个只在错误分支里打的日志)。',
                ],
                without:
                  '如果真要手写,你还需要把 id 从 `ctx` 里取出来的样板代码复制十遍。等到想改字段名(比如从 `trace_id` 改成 `traceId` 对齐前端约定),这十个地方全都要改,而漏改一处的结果是新旧字段并存——看板上一半的日志查不到。',
                real:
                  '在 handler 层做,只需要一个前提:`slog` 的 `Handle(ctx, r)` 本来就收 `ctx`。这是标准库设计好的路径,不是 hack。而且它天然满足「只改一处」:换字段名、加采样、接 OpenTelemetry 的 SpanContext,都只动这一个文件。[[能由框架保证的事,不要交给纪律;纪律会在第 137 个调用点上失效。]]',
              },
              {
                kind: 'concept',
                title: '两个「不报错」的失效点',
                body: [
                  '第一个是 `slog.Info` 与 `slog.InfoContext` 的区别。前者的签名是 `Info(msg string, args ...any)`,内部用 `context.Background()` 调用 handler——于是 `TraceID(ctx)` 返回空串,注入被静默跳过。编译通过、测试通过、日志格式完全正常,只是缺一个字段。本项目因此把所有日志调用都改成了 `InfoContext`/`ErrorContext`,并在 `AGENTS.md` 里写成硬规则:**在请求路径上不允许出现不带 ctx 的日志调用。**',
                  '第二个是 `WithGroup`。它把后续所有属性塞进一个嵌套对象,handler 注入的 `trace_id` 也不例外。写 `logger.WithGroup("http")` 之后,日志会变成 `{"http":{"trace_id":"...","method":"GET"}}`——查询时写 `trace_id="abc"` 一条都查不到,必须写 `http.trace_id`。',
                  '这不是 slog 的 bug,是 `WithGroup` 的语义就该如此:组的含义是「下面所有属性都属于这个命名空间」。但它带来的运维后果很实在——**日志字段的路径变成了代码结构的函数**,而代码结构会变。所以本项目的结论是:请求级字段(需要被聚合查询的)不进组,组件级字段(只在人眼看时有用)才进组。',
                  '顺带说清 `context.Context` 在这里的角色。为什么 id 挂 ctx 而不是塞进一个全局的 goroutine-local?因为 Go 没有 goroutine-local,而 `ctx` 就是它显式的替代品:它随调用链向下传递、随请求结束被回收、并且 `context.WithValue` 明确要求 key 是不可导出的自定义类型——这正是为了防撞车。这条设计约束在 `go-index-Q49` 里有完整展开。',
                ],
              },
              {
                kind: 'code',
                title: '跨进程:走 header,不走正文',
                lang: 'go',
                code: '// 生产侧:explicitly 放到 message header\nif e.TraceID != "" {\n\tmsg.Headers = []kafka.Header{{Key: obs.HeaderTrace, Value: []byte(e.TraceID)}}\n}\n\n// 消费侧:Fetch 成功、反序列化之后立刻读回来\ne.TraceID = traceFromHeaders(m.Headers)\n\nfunc traceFromHeaders(hs []kafka.Header) string {\n\tfor _, h := range hs {\n\t\tif h.Key != obs.HeaderTrace {\n\t\t\tcontinue\n\t\t}\n\t\tv := string(h.Value)\n\t\t// 先按标准 traceparent 解析;不是这个格式就当作裸 id(兼容自己发的)\n\t\tif id, ok := obs.ParseTraceparent(v); ok {\n\t\t\treturn id\n\t\t}\n\t\treturn v\n\t}\n\treturn ""\n}',
                version: 'Go 1.24 + kafka-go',
                env: 'stats 包用例全绿,含「正文里不含 trace_id」「两种形式都能读回」',
                verified: true,
                caption:
                  '`TraceID` 字段的 JSON tag 是 `json:"-"`,它结构上就不可能进正文——这是用类型系统兜住约定,而不是靠注释提醒。消费侧先试标准格式、再当裸 id,是为了兼容「别的服务用标准头、我们自己发裸 id」这种混用状态。',
              },
              {
                kind: 'concept',
                title: '一批消息里没有「那一个」id',
                body: [
                  '同步请求里,一份上下文对应一个 id,天经地义。异步批次里这个对应关系不存在了:一个 flush 批次有 20 条事件,来自 20 个不同的请求,20 个不同的 trace id。',
                  '这时候人会本能地想「那取第一个吧」——但要意识到这是个**语义降级**:批次日志里的 `sample_trace` 不是你正在查的那个请求,它只是「这批里恰好排第一的那个」。本项目的做法是明确叫它 `sample_trace`,并在文档里写清「要查具体某次点击,用它的 id 去 grep,不要用批次日志里的 sample」。',
                  '更进一步的做法是让批次本身也有 id(一个 batch_id),然后把「哪些事件属于哪个批次」记下来。本项目没做,理由是收益不够:打点链路的排障需求集中在「有没有丢」和「算得对不对」,而不是「这一条为什么慢」——后者是同步链路的活。[[给一个标识符赋予它承载不了的语义,是排障文档里最常见的错误来源。]]',
                ],
              },
              {
                kind: 'question',
                title: 'Q129 · 链路追踪的原理是什么?trace id 怎么在服务间传递?',
                questionId: 'go-index-Q129',
                intent:
                  '这题的标准答法是「trace id + span id + 上报」,但那只说清了「是什么」。真正的分水岭在于:你能不能说清**传播**这件事的边界条件——哪些地方要传、哪些地方不该传、传不过去时怎么发现。',
                points: [
                  '三个标识各管一段:trace id 管整条链路(全局唯一、跨进程不变),span id 管一个节点内部的一次操作(每跳新生成),`parent_span_id` 管父子关系。链路树是靠 parent 指针拼出来的,不是靠时间排序——时间只用来算耗时。',
                  '传播格式的既成标准是 W3C Trace Context 的 `traceparent` 头:`00-<32hex traceid>-<16hex spanid>-<flags>`。`flags` 的最低位是采样标记,它必须**随链路继承**:上游决定采样,下游不该重新掷骰子,否则一条链路只有一半被记录下来。',
                  '跨进程的三种边界各有各的走法:HTTP 走 header、消息队列走消息头(不能走正文)、gRPC 走 metadata。第三种常被忽略:RPC 框架的拦截器要负责注入和提取,漏了它就等于在这一跳断链。',
                  '进程内的传播靠 `context.Context`,而它有一个硬约束:跨 goroutine 要用 `context.WithValue` 派生后显式传下去,**不要用全局变量或 goroutine-local 模拟**。Go 没有 goroutine-local 是设计选择,不是缺陷。',
                  '采样是必需品不是优化:全量上报的成本随 QPS 线性涨。常见策略是头部采样(在入口决定,简单但会漏掉慢请求)和尾部采样(等链路结束按耗时/错误决定,准但要有缓冲)。[[面试里能说出「尾部采样要缓存整条链路」的人,通常是真接过。]]',
                ],
                depth:
                  '再深一层会问「异步任务怎么串」。答案是不能串成一条链路,只能串成两条并用 link 关联:定时任务触发的那次执行,与当初写入任务的那次请求之间没有因果关系的时间连续性,强行接上会得到一个长达几小时的假 span。OpenTelemetry 为此专门有 `Link`,而不是 `parent`。',
                followup:
                  '追问常到「没有 trace 系统时怎么排障」。答:退化成「一个请求 id + 结构化日志 + grep」,也就是本节实现的东西。它的能力边界要清楚:能回答「这一次请求发生了什么」,回答不了「这次慢在哪个环节占比多少」——后者需要 span 级别的耗时分解。',
              },
              {
                kind: 'question',
                title: 'Q101 · log/slog 相比 zap/logrus 有什么优势?结构化日志该怎么设计?',
                questionId: 'go-index-Q101',
                intent:
                  '对比三个库的 API 是最低档的答法。中档答法讲性能差异,高档答法讲**接口设计的可组合性**——slog 真正赢的地方是 Handler,而不是它属于标准库。',
                points: [
                  'slog 的核心抽象是 `Handler`:`Enabled` 决定要不要记、`Handle` 决定怎么写、`WithAttrs`/`WithGroup` 决定怎么派生。三件事分开之后,「加字段」「改格式」「加采样」「接 trace」全都是实现一个 Handler,而不是改业务代码。',
                  '性能上 slog 的默认 JSONHandler 确实比 zap 慢(反射 + 分配更多),但差距在「每秒十万条」这个量级才明显。判据不是跑分,是**你的日志量**:一个日活百万的服务,日志通常是每秒几百条,这时候可维护性远比 2 倍 CPU 重要。真到了瓶颈,换个 Handler 实现就行,接口不变。',
                  '结构化日志的设计有四条硬规则:① 字段名全项目统一(`trace_id` 不是 `traceId`);② 值是机器可解析的(数字就是数字,别写成 `"123"`);③ 消息体是给人看的一句话,变量全进字段(别拼字符串);④ 一定要有级别,而级别的语义要事先约定——`Error` 意味着「需要人看」,不是「出错了」。',
                  '最后一条最容易被违反:`Error` 被用来记「查库失败但降级成功」,于是告警天天响,人就学会忽略它。本项目的约定是 `Error` 只用于「本次请求对用户不可用」,可恢复的降级用 `Warn`。',
                ],
                depth:
                  '再往上会问「日志要不要采样」。答:入口处按请求采样(1% 的请求记全量),而不是按行采样——按行采样会把一次请求的日志砍成碎片,反而不可读。错误日志永远不采样,但要做速率限制(同一错误每秒最多 N 条 + 计数),否则一个死循环能写满磁盘。',
                followup:
                  '可能追问「日志和 trace 的关系」。答:日志是离散事实的集合,trace 是把它们按请求串起来的索引。没有 trace 的日志是「一堆行」,有 trace 的日志是「一条时间线」。这也是本节先做 trace id 再做日志格式的原因。',
              },
              {
                kind: 'question',
                title: 'Q49 · context 有哪几种派生方式?各自用途是什么?',
                questionId: 'go-index-Q49',
                intent:
                  '这题看着是背 API,实际考的是「你是否理解 ctx 只该传两类东西」。能答清「为什么 Value 要限制用途」,比背出六个函数名有用得多。',
                points: [
                  '`WithCancel` 手动取消,`WithTimeout` 到期取消,`WithDeadline` 到点取消——三者的区别只有触发方式,下游行为完全一样:都关闭 `Done()` channel。生产代码里 `WithTimeout` 用得最多,因为它表达的是「我等不了那么久」,这是业务语义而不是绝对时刻。',
                  '`WithValue` 只该传**请求作用域的元数据**:trace id、用户身份、语言、租户。不该传的:数据库连接、logger、配置、函数参数。判据是「这个值是不是每次调用的输入」——是的话它就是参数,不是上下文。',
                  '`WithCancelCause`(Go 1.20)让取消原因可查,`context.Cause(ctx)` 能拿到具体是谁取消的。这在多层嵌套取消里很有价值:日志里能写清是「客户端断开」还是「上游超时」,而不是笼统的 `context canceled`。',
                  '`WithoutCancel`(Go 1.21)派生一个不会被父 ctx 取消的 ctx,专门给「父请求结束了,但这个操作必须做完」的场景——比如审计日志落盘、异步补偿。用它的时候要自己加超时,否则就变成了「永不结束的后台任务」。',
                  '等价关系要清楚:`WithTimeout` 就是 `WithDeadline(now+timeout)`,而 `WithCancel` 是所有派生的基础。[[四个函数塌缩成两个语义:带截止时间的取消,和不带截止时间的取消。]]',
                ],
                depth:
                  '深一层会问「ctx 该不该存进 struct」。答案是几乎永远不该:存进 struct 就脱离了调用链,取消信号传不进来,而 `go vet` 也会报。唯一例外是「struct 本身代表一次请求的生命周期」,但那种情况通常说明你该把它做成参数传。',
                followup:
                  '追问常到「ctx 能不能当参数传给 goroutine」。答:能传,但**必须在启动 goroutine 之前捕获**。在 goroutine 里读外层的 ctx 变量是数据竞争;正确写法是把 ctx 作为函数第一个参数传进去。',
              },
              {
                kind: 'question',
                title: 'Q50 · context 使用中有哪些坑?',
                questionId: 'go-index-Q50',
                intent:
                  '这题的价值全在具体案例。答「要用 ctx 控制超时」是常识,答「哪些写法会让 ctx 静默失效」才是经验。',
                points: [
                  '坑一:`context.Background()` 满天飞。日志调用传 Background,trace id 就丢了;HTTP 请求传 Background,客户端断开时下游还在跑。判据很简单:**在请求路径上,除了最外层,不应该出现 Background。**',
                  '坑二:派生后忘了 `defer cancel()`。`WithTimeout` 返回的 cancel 不调用,计时器会一直活到超时——在长连接服务里这是最隐蔽的内存泄漏之一(每请求一个 timer)。`go vet` 的 `lostcancel` 检查能抓一部分,但抓不到「传给了别人」。',
                  '坑三:把 ctx 存进 struct 或全局 map。前者脱离调用链,后者等于用 ctx 实现 goroutine-local——两件事都破坏了「显式传递」这个前提。',
                  '坑四:判断取消原因时不看 `ctx.Err()`。`Err() == context.Canceled` 说明是主动取消(可能是正常的客户端断开),`DeadlineExceeded` 说明是超时(通常是需要告警的)。把两者混成一个「请求失败」,会让正常的连接关闭污染错误率。',
                  '坑五:在 `select` 里只等业务 channel,不等 `ctx.Done()`。这样即使上游已经放弃,goroutine 还是会等到业务结果——如果业务本身卡住,goroutine 就永久泄漏。这是 `go-index-Q70` 那个问题的最常见成因。',
                ],
                depth:
                  '再往上会问「ctx 的取消是同步还是异步」。答:关闭 `Done()` 是同步的,但**你的处理是异步的**——取消信号到达和你实际停止工作之间总有延迟。所以幂等和可重入不是可选项:任何可能被取消的操作,都必须能安全地在中途停下并重试。',
                followup:
                  '可能追问「超时了要不要回滚」。答:看语义。读操作超时不用回滚(什么都没改);写操作超时**必须**当作「可能已成功」处理,也就是重试要带幂等键——这正好接上阶段 D 的接口幂等。',
              },
            ],
          },
        },
        {
          id: 'metrics-cardinality',
          title: '指标:为什么 /metrics 必须长在另一个端口上',
          kind: 'concept',
          questionIds: ['go-index-Q116', 'go-index-Q112', 'go-index-Q97', 'go-index-Q139'],
          content: {
            intro:
              '上一节解决「一次请求发生了什么」,这一节解决「整体正在变好还是变坏」。两者的工程量级完全不同:日志按条产生,指标按秒聚合,所以你不可能给每个业务维度都建指标——除非你打算让 Prometheus 替你 OOM。落地会看到四个决定:为什么 `c.FullPath()` 和 `c.Request.URL.Path` 差着一个数量级的成本;为什么默认分桶对一个 200 微秒的跳转毫无分辨率;为什么管理端口必须和业务端口分开监听;以及为什么「用 0 表示读不到」是最坏的一种指标设计。',
            outline: [
              '日志、指标、调用栈:三种证据各回答什么问题',
              '/metrics 走独立端口的三个理由(侦察报告、CPU 消耗、内存快照)',
              '基数爆炸:500 万张短链为什么会变成 500 万条时间序列',
              '分桶决定分辨率:为什么不能用 DefBuckets',
              '注册一个恒为 0 的指标,比不注册更糟',
            ],
            pitfalls: [
              '用 `c.Request.URL.Path` 当标签值 —— 每个短码一条时间序列,而且**不报错**:系统照常运行,监控慢慢把自己吃死。',
              '用 `prometheus.DefBuckets` —— 起点 5ms,一次 200µs 的跳转全落进第一个桶,p50/p90/p99 全都等于「≤5ms」,看起来有数据,其实没有分辨率。',
              '依赖全局默认 registry —— 测试里重复注册直接 panic,任何被 import 的库都能往里塞指标,最后没人说得清那 200 行是谁贡献的。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '三种证据,三个问题',
                body: [
                  '排障时你说的每一句话,背后都要有证据。证据只有三类,能力边界各不相同。',
                  '**日志**回答「这一次发生了什么」:离散、带完整上下文、贵(每条都要序列化 + 写盘 + 建索引)。它的优势是细节,劣势是无法聚合——你不能对一亿条日志做 `sum` 然后得到一条曲线。',
                  '**指标**回答「整体趋势如何」:定长、按时间聚合、便宜(一个计数器就是一个数字)。它的优势是能算分位数、能画图、能告警,劣势是没有上下文——`http_requests_total{route="/:code",status="500"}` 涨了,但它不会告诉你「哪个短码、什么错误」。',
                  '**调用栈(pprof)** 回答「现在卡在哪一行」:现场快照、能定位到函数和行号、但开销大(CPU 采样要占一个核,heap 快照要 STW)。所以它是按需触发的工具,不是常驻的。',
                  '三者的关系是漏斗:指标先告警(便宜、全天候),日志再缩小范围(按 trace id 捞出那一次),pprof 最后定位(在出问题的实例上抓现场)。[[顺序反了就会很痛苦:一上来就 pprof,你会得到一张火焰图,却不知道该在哪个时间点抓。]]',
                ],
              },
              {
                kind: 'why',
                title: '为什么 /metrics 不能和业务端口共享一个监听',
                body: [
                  '把 `/metrics` 和 `/debug/pprof` 挂在业务路由上,是本地开发最省事的做法:一个端口、一个 curl、什么都能拿到。它在生产环境有三个必须拆开的理由,而且这三个理由互不重叠。',
                ],
                without:
                  '`/metrics` 的输出是一份**侦察报告**:所有路由、错误码分布、依赖健康状况、队列积压、甚至业务量。它等于把系统的内部结构打印出来贴在门口。挂在公网端口上,任何一次扫描都能拿到;而挂在管理端口上,你可以在 Kubernetes 里只让它在集群内网监听,业务端口才对外。',
                real:
                  '另外两个理由更硬。第一,`pprof.Profile` 是 CPU 消耗型接口:`?seconds=60` 会真的占满一个核 60 秒,谁触发谁就是一次小型 DoS。第二,业务端口的 `WriteTimeout=15s` 会让 `seconds=30` 的采样在写入中途被截断——排障的人看到的不是报错,而是「这次采样什么都没抓到」,于是他会怀疑工具,而不是怀疑超时配置。**管理端口的 `WriteTimeout` 必须是 0**,这是它和业务端口最本质的区别。',
              },
              {
                kind: 'code',
                title: '`NewAdminServer`:显式 mux,WriteTimeout 为 0',
                lang: 'go',
                code: 'func NewAdminServer(opt AdminOptions) *http.Server {\n\tmux := http.NewServeMux()\n\n\tif opt.Metrics != nil {\n\t\tmux.Handle("/metrics", opt.Metrics.Handler())\n\t}\n\n\tif opt.Pprof {\n\t\t// Index 会按 URL 路径分发到具体的 profile(heap/goroutine/…)\n\t\tmux.HandleFunc("/debug/pprof/", pprof.Index)\n\t\tmux.HandleFunc("/debug/pprof/cmdline", pprof.Cmdline)\n\t\tmux.HandleFunc("/debug/pprof/profile", pprof.Profile)\n\t\tmux.HandleFunc("/debug/pprof/symbol", pprof.Symbol)\n\t\tmux.HandleFunc("/debug/pprof/trace", pprof.Trace)\n\t}\n\n\treturn &http.Server{\n\t\tAddr:    opt.Addr,\n\t\tHandler: mux,\n\t\t// 只留 header 超时防慢速攻击。\n\t\t// WriteTimeout 必须是 0:pprof 的 profile/trace 可以跑几分钟,\n\t\t// 设成 15s 的后果不是报错,而是采样到一半被截断成一个空文件。\n\t\tReadHeaderTimeout: 5 * time.Second,\n\t}\n}',
                version: 'Go 1.24 + net/http',
                env: 'e2e 断言:管理端口 19090 输出 70 条 shortlink_ 序列;pprof 默认返回 404',
                verified: true,
                caption:
                  '两个容易漏的点。第一,**用显式 mux 而不是 `http.DefaultServeMux`**:`net/http/pprof` 的 `init()` 会把自己注册到默认 mux 上,用它就意味着「只要 import 了 pprof,它就一定被暴露」——开关变成了摆设。第二,**pprof 默认关闭**:它是运维动作,不是默认值。',
              },
              {
                kind: 'concept',
                title: '基数爆炸:500 万张短链变成 500 万条时间序列',
                body: [
                  'Prometheus 的存储单元是「时间序列」= 指标名 + 一组标签值。每出现一个新的标签组合,就多一条序列,每条占 1~2KB 内存和独立的磁盘 block。这个设计让查询非常灵活,也让一个手误变成灾难。',
                  '本项目的跳转路由是 `/:code`。如果指标中间件用 `c.Request.URL.Path` 当标签值,那么每张短链都会生成一组独立的标签组合:`/1aB3xK`、`/2bC4yL`、`/3cD5zM`……500 万张短链就是 500 万条序列。这个数字不是「大」,是「必死」:Prometheus 单实例的经验上限在百万级序列,而且它死之前会先拖慢所有查询。',
                  '更糟的是**它不报错**。服务照常运行,指标端点照常返回,只是响应体越来越大、抓取越来越慢,直到某天 Prometheus OOM 或者抓取超时。你不会在代码里看到任何异常,只会在几周后发现监控挂了——而监控挂了这件事,恰好是在你需要它的时候才被发现。',
                  '解法是 `c.FullPath()`,它返回的是**路由模板**而不是实际路径:`/:code`。基数从此由「代码里写了几个路由」决定,而不是由「用户创建了多少数据」决定。本项目实测:300 个不同短码的请求,用模板只有 1 条序列,用原始路径是 300 条。',
                  '同样的道理适用于两个常被忽略的维度:**未匹配路由**(扫描器会请求 `/wp-admin`、`/.env`、`/phpmyadmin`,每个都不同 → 全部归一成 `unmatched`)和**HTTP 方法**(扫描器会发 `PROPFIND`、`FOO` 这类任意 token → 归一成 7 个合法方法 + `other`)。',
                ],
              },
              {
                kind: 'code',
                title: '全项目最关键的一行是 `c.FullPath()`',
                lang: 'go',
                code: 'func (r *Registry) HTTPMiddleware() gin.HandlerFunc {\n\treturn func(c *gin.Context) {\n\t\troute := c.FullPath()\n\t\tif skipRoutes[route] {\n\t\t\tc.Next()\n\t\t\treturn\n\t\t}\n\t\tif route == "" {\n\t\t\troute = routeUnmatched\n\t\t}\n\t\tmethod := normalizeMethod(c.Request.Method)\n\n\t\tstart := time.Now()\n\t\tc.Next()\n\t\telapsed := time.Since(start)\n\n\t\t// 先记状态码再记耗时:万一 Observe 里出错(不该发生),\n\t\t// 请求数也不会少记一条。\n\t\tr.httpRequests.WithLabelValues(route, method, statusLabel(c.Writer.Status())).Inc()\n\t\tr.httpDuration.WithLabelValues(route, method).Observe(elapsed.Seconds())\n\t}\n}',
                version: 'Go 1.24 + Gin + client_golang',
                env: 'metrics 包十四条用例 + 基准全绿;e2e 断言「指标里不含真实短码」',
                verified: true,
                caption:
                  '`skipRoutes` 里排除了 `/healthz`、`/readyz`、`/version`、`/metrics`。理由不是「它们不重要」,而是**它们会污染分位数**:3 个副本 × 每 2 秒一次 readyz = 每天 13 万次探针,耗时恒定在几十微秒,数量上能超过真实业务请求,把「业务 p99」压成「探针耗时」,让人以为服务很快。[[把探针算进延迟指标,是自欺欺人的标准姿势。]]',
              },
              {
                kind: 'diagram',
                title: '每个标签都要付基数的代价',
                diagram: {
                  type: 'matrix',
                  cols: ['取值来源', '基数由什么决定', '出错后果'],
                  rows: [
                    ['`route`', '`c.FullPath()` 路由模板', '代码里写了几条路由', '正确:与业务数据量无关'],
                    ['`route`', '`URL.Path` 原始路径', '用户创建了多少短链', '500 万条序列,Prometheus OOM'],
                    ['`status`', '响应码字符串(100–599 预生成)', '有限集合', '正确:66 个可能值'],
                    ['`method`', '白名单归一化', '7 + other', '正确:挡住扫描器的任意 token'],
                    ['`source`', 'Resolve 的四条出口', '代码分支数', '正确:四值之和必须等于总请求数'],
                    ['`code`(反例)', '真实短码', '业务数据量', '绝不允许:这就是爆炸本身'],
                  ],
                  caption:
                    '判据可以压成一句话:**这个标签的取值集合,是不是由代码决定的**。由代码决定的(路由、状态码、方法、来源分支)可以放心加;由数据决定的(短码、用户 id、URL)一个都不能加。中间地带要小心,比如「错误码」——它由代码决定但是可能无限新增,所以只能放收敛后的类别,不能放原始错误消息。',
                },
              },
              {
                kind: 'why',
                title: '分桶决定分辨率:为什么不能用 DefBuckets',
                body: [
                  'Prometheus 的直方图不是存每个观测值,而是存「落进每个桶的数量」。分位数是**从桶边界插值**算出来的,所以桶不覆盖真实量级时,算出来的数字就是装饰品。',
                ],
                without:
                  '`prometheus.DefBuckets` 是 `{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10}`,起点 5 毫秒。而本项目一次跳转的实测量级是 200 微秒——所有观测值全部落进第一个桶。这时候 `histogram_quantile(0.99, ...)` 会返回 5ms,`p50` 也是 5ms,`p99` 还是 5ms。图表上有一条漂亮的线,而它对应的是「所有请求都 ≤5ms」这个几乎没有信息量的结论。',
                real:
                  '自定义桶从 100µs 起、到 10s 封顶:下面覆盖跳转(0.1–2ms),上面覆盖创建接口和回源(5–200ms),再往上留给「已经出事了」的那一段。桶的密度应该集中在**正常值附近**,而不是均匀铺开——分位数的精度只在正常值附近才有意义,异常值你只需要知道它「大于 1 秒」。',
              },
              {
                kind: 'code',
                title: '`DurationBuckets`:从 100µs 起',
                lang: 'go',
                code: 'var DurationBuckets = []float64{\n\t0.0001, 0.00025, 0.0005, 0.001, 0.0025,\n\t0.005, 0.01, 0.025, 0.05, 0.1,\n\t0.25, 0.5, 1, 2.5, 5, 10,\n}',
                version: 'Go 1.24 + client_golang',
                env: 'TestBucketsResolveSubMillisecond / TestDurationBucketsStartBelowOneMillisecond',
                verified: true,
                caption:
                  '两条用例分别守住两件事:① 200µs 与 900µs 必须落在**不同**的桶里(否则「有没有分辨率」这件事无法回归);② 第一个边界必须小于 1 毫秒(防止有人改回默认值)。这类「配置的意图」用用例钉住,比写在注释里可靠。',
              },
              {
                kind: 'concept',
                title: '用合法值表示缺失,是最坏的一种指标设计',
                body: [
                  '一个反例:worker 想暴露消费积压(lag),但某些情况下拿不到(比如用的是不支持查询 lag 的客户端)。最省事的做法是「拿不到就报 0」。',
                  '后果很具体:lag = 0 在监控上的含义是「没有积压,一切正常」。于是「读不到 lag」和「真的没积压」变成了同一个信号,而它们的处理方式完全相反——前者要去修采集,后者什么都不用做。看板会一直显示绿色,直到报表出错你才回头怀疑数据。',
                  '本项目的做法是把「能力」变成返回值的一部分:`LagFunc() (func() float64, bool)`,第二个返回值表示「这个客户端到底支不支持」。不支持时**根本不注册这个指标**。这样监控上就是「没有这条序列」,而「缺失」在告警规则里可以单独表达(`absent()`),不会被误读成正常。',
                  '同一个原则还体现在 `TapCounters` 上:它的类型是 `func() TapCounters`,传 nil 表示「本进程不打点」,这时候 tap 相关的四个计数器一个都不注册。注册一个恒为 0 的计数器比不注册更糟——看板上会显示「一切正常」,而实际上整条打点管线都不存在。',
                  '这条原则可以推广成一句判据:**一个指标的值域里,有没有一个值被用来表示「没有值」**。如果有,这个指标的每一个读数都不可信。',
                ],
              },
              {
                kind: 'principle',
                title: '九个指标,各自回答一个问题',
                body: [
                  '指标列表不该按「能测什么」来设计,而该按「要回答什么问题」来设计。本项目九个指标,每一个都对应排障时的一句具体提问。',
                ],
                steps: [
                  {
                    title: '① `http_requests_total{route,method,status}` / `http_request_duration_seconds{route,method}`',
                    detail:
                      '回答「哪里在出错、哪里在变慢」。按路由模板分组,所以能直接看出是跳转坏了还是创建坏了。这是唯一需要基数纪律的两个指标。',
                  },
                  {
                    title: '② `resolve_total{source}`',
                    detail:
                      '回答「这次变慢是缓存没挡住还是数据库慢了」。四个来源:cache、negative、merged、db。**四者之和必须等于总请求数**——这条恒等式本身就是自检,哪天多了一条出口忘了报数,总和立刻对不上。',
                  },
                  {
                    title: '③ `lock_acquire_total{result}`',
                    detail:
                      '回答「跨实例锁是帮忙还是添乱」。三个结果:ok、locked、error。`error` 涨说明 Redis 出问题了,而这时候锁会退化成「全部放行」——回源次数会突然翻倍。',
                  },
                  {
                    title: '④ `consumer_events_total{result}` / `consumer_lag_messages`',
                    detail:
                      '回答「统计为什么不准」。lag 涨 = 在追积压(等);lag 不动而 PV 不动 = 真的没消费到(查 worker);lag 为 0 而 PV 也不动 = 上游根本没打点(查 API)。三种原因、三种修法,而它们在报表上的表象完全一样。',
                  },
                  {
                    title: '⑤ `tap_{published,accepted,dropped,failed}_total`',
                    detail:
                      '回答「打点丢在哪一段」。published 是进队列,accepted 是出队列,dropped 是队列满(主动丢),failed 是下游失败(被动丢)。四个数字的差就是丢失发生的准确位置。',
                  },
                ],
                takeaway:
                  '九个指标里只有两个需要基数纪律(带 route 的),其余都是有限枚举。这说明**基数风险集中在「带业务维度」的指标上**——而这类指标恰恰是最想加的。[[每次想给指标加一个业务维度时,先问:它的取值集合由代码决定,还是由数据决定。]]',
              },
              {
                kind: 'question',
                title: 'Q112 · 服务 p99 延迟有毛刺,可能是哪些原因?',
                questionId: 'go-index-Q112',
                intent:
                  '这题的分水岭是「先看形状」。毛刺有三种形态,每种形态的成因几乎不重叠;不看形状就开始列原因,你会得到一张二十条的可能性清单,然后一条也验证不了。',
                points: [
                  '第一种是**偶发尖刺**:单点很高、间隔无规律、前后都正常。典型成因是依赖抖动(Redis 的一次 fork、MySQL 的一个大事务)、或者本机的页缓存未命中。判据是尖刺在多个实例上**不同时出现**——同时出现就是依赖问题。',
                  '第二种是**周期性毛刺**:固定间隔复现。最常见的是 GC(与分配率相关)、定时任务(清理、对账、全量扫描)、以及日志轮转导致的 fsync。判据是周期长度本身——30 秒一次多半是 GC 或 scrape,整分钟一次多半是 cron。',
                  '第三种是**阶梯**:涨上去不再下来。这不是毛刺,是容量问题:连接池被打满、文件描述符耗尽、或者某个缓存开始频繁淘汰。它的特征是基线稳定上移,而不是单点尖峰。',
                  '必须排除的两个观测陷阱:① 直方图桶没覆盖真实量级(用 DefBuckets 测 200µs 的请求,p99 会恒等于 5ms),② 探针请求混进了业务直方图(每天十几万次探针足以把 p99 拉到几十微秒量级)。**这两个陷阱的共同点是「看起来一切正常」。**',
                  '定位到具体请求还得靠 trace:毛刺发生时段的慢请求,用 trace id 把它的各环节耗时捞出来,和正常请求比,差在哪个 span 一目了然。这也是为什么 trace id 和指标要一起建——指标告诉你「什么时候」,trace 告诉你「哪里」。',
                ],
                depth:
                  '再深一层要能说出「尾部延迟放大」:一个请求要串行访问 10 个下游,每个下游有 1% 的概率慢 100ms,那么这个请求至少慢 100ms 的概率是 1-(0.99)^10,约 9.6%。所以 p99 毛刺往往不是「有一个慢服务」,而是「很多个偶尔慢一点的服务串起来」——修法是减少串行跳数或改成并行,而不是去追那一个慢服务。',
                followup:
                  '追问常到「怎么区分 GC 毛刺和业务毛刺」。答:把 `go_gc_duration_seconds` 的 p99 和业务 p99 画在同一张图上,看尖刺是否同步。同步就是 GC;不同步就去看 `resolve_total{source}` 的比例有没有在同一时刻变化。',
              },
              {
                kind: 'question',
                title: 'Q97 · database/sql 的连接池参数怎么理解?常见配置错误是什么?',
                questionId: 'go-index-Q97',
                intent:
                  '连接池是「容量」这件事最具体的一面。答得出四个参数的语义是入门,答得出「配错的症状长什么样」才是经验——因为配错从不报错,只表现为延迟和随机错误。',
                points: [
                  '四个参数:`SetMaxOpenConns` 是并发上限,`SetMaxIdleConns` 是保留的复用连接数,`SetConnMaxLifetime` 是连接的最大存活时间,`SetConnMaxIdleTime` 是空闲多久回收。**只有第一个限制并发,后三个影响的是复用率和「被中间件静默断开」的概率。**',
                  '最常见的错误:`MaxIdleConns` 保持默认的 2。它在低流量下毫无问题,一到高峰就变成「每次请求都新建连接」——TCP 握手加 MySQL 认证要几毫秒,于是 p99 直接涨一个数量级,而 CPU 和数据库负载看起来都不高。',
                  '第二个常见错误:不设 `ConnMaxLifetime`。MySQL 的 `wait_timeout`(默认 8 小时)或中间的负载均衡会静默断开空闲连接,连接池并不知道,下一次取出来用就报 `invalid connection`。设成 30 分钟到 1 小时,让连接在被别人断开之前自己先换掉。',
                  '第三个:`MaxOpenConns` 设得离谱地大。连接数不是越多越快——数据库每连接一份线程与内存开销,超过核数量级之后吞吐反而下降。经验值是核数的 2 到 4 倍,并且必须小于数据库的 `max_connections` 除以副本数。',
                  '配错了怎么看:暴露 `sql.DBStats` 里的 `WaitCount` 和 `WaitDuration`。`WaitDuration` 一涨就说明请求在等连接——这时候要么加池子(治标),要么缩短单次占用时长(治本:超时加批量)。这两个数字接到管理端口的指标上,才能在 p99 涨的时候一眼排除「是不是池子满了」。',
                ],
                depth:
                  '再往上会问「池子满了请求会怎样」。答:阻塞等待,直到拿到连接或 ctx 超时。这个行为的后果很具体——它不会立刻报错,而是让 p99 慢慢涨,涨到超过上游超时才开始出现错误。所以「错误率突然上升」往往已经是池子满了好几分钟之后的事。',
                followup:
                  '可能追问「为什么事务里不能做网络调用」。答:事务持有连接直到提交或回滚,中间任何一次外部调用(HTTP、另一个库)都在拉长单次占用时长,而池子大小是固定的——占用时长翻倍,等于池子容量减半。',
              },
              {
                kind: 'question',
                title: 'Q139 · 灰度发布、蓝绿部署、金丝雀发布有什么区别?',
                questionId: 'go-index-Q139',
                intent:
                  '这三者常被混着说,其实它们不是同一层的概念。答清「能力」与「策略」的区别,比背三个定义有用——因为真实系统里三者会叠加使用。',
                points: [
                  '**蓝绿**是两套完整环境加一次整体切换:回滚就是把流量切回去,速度以秒计。代价是资源翻倍,而且切换瞬间所有连接都要重建——对有长连接的场景(WebSocket、gRPC 流)并不温和。',
                  '**金丝雀**是按比例放量:1% 到 5% 到 25% 到 100%,每一步观察指标再决定下一步。它解决的是「新版本有隐藏问题」,代价是发布变慢,而且要能**按版本分组观测**,否则你看到的仍是混合后的数字。',
                  '**灰度**更像是底层的**能力**:按规则把请求路由到不同版本(用户 ID 取模、地域、请求头)。金丝雀是使用这个能力的一种**策略**,蓝绿也可以用同一套能力实现(把 100% 切过去)。[[三者不是三选一,是「能力加策略」的组合。]]',
                  '没有观测就没有灰度。判据很具体:你的指标里有没有 `version` 这个维度?能不能在同一时间窗里比较 v1 与 v2 的 p99 和错误率?如果只能看到混合值,灰度就退化成「小范围出事」——比全量出事好一点,但你不知道为什么。本项目的 `/version` 返回构建版本,就是让这个维度可用。',
                  '回滚的前提是兼容,而不是回滚动作本身。数据库变更必须向后兼容:先加列(不带 NOT NULL)、再用代码读写、最后才删旧列。消息格式同理:新版本发出去的消息,旧版本消费者必须能读,或至少能跳过。**能回滚的发布,是被 schema 和协议设计保证的,不是被发布工具保证的。**',
                ],
                depth:
                  '再深一层会问「灰度期间会话粘性怎么办」。答:同一个用户的请求如果在新旧版本之间来回切,会遇到「新版本写的缓存旧版本读不懂」「旧版本写的 token 新版本验不过」。解法是让路由规则稳定(按用户 ID 哈希而不是随机),并保证缓存与 token 格式在过渡期内双向兼容。',
                followup:
                  '追问常到「样本量不够怎么判断」。答:看两件事——差异的绝对幅度,以及这个版本的请求量。1% 流量跑十分钟可能只有几百个请求,几百个样本算出来的 p99 没有意义。这时候该看的是错误率这类「每个请求都贡献一个 0 或 1」的指标,而不是分位数。',
              },

            ],
          },
        },
        {
          id: 'triage',
          title: '三类故障:goroutine 泄漏、p99 变慢、统计不准',
          kind: 'concept',
          questionIds: [
            'go-index-Q103',
            'go-index-Q104',
            'go-index-Q70',
            'go-index-Q71',
            'go-index-Q73',
          ],
          content: {
            intro:
              '前两节把观测手段建好了,这一节用它们真的排一次障。三类故障是线上最常见的,而且它们的表象会互相伪装:goroutine 泄漏表现为「内存涨」,数据库变慢表现为「p99 涨」,消费卡住表现为「报表少了」。如果按表象去查,你会走很多弯路;按入口去查,每一步都能排除掉一大片。这一节还会讲一个真实的 bug——PV 永远是 0,单测全绿但它就是不通——以及它为什么只能靠端到端跑一遍才暴露。',
            outline: [
              '排障的本质是缩小范围,不是猜',
              '第一类:goroutine 泄漏——数量只涨不落,先按栈聚合别看总数',
              '第二类:p99 变慢——用分来源的计数器做决策树',
              '第三类:统计不准——lag 加四个计数器的四种组合',
              '一个真 bug:为什么「单测全绿」和「链路通」是两件事',
            ],
            pitfalls: [
              '一上来就 pprof 或在日志里撒网 —— 没有假设的采集只会得到一张看不懂的图。**先确定「哪一类故障」,再决定看哪个信号。**',
              '看 goroutine 总数就下结论 —— 总数 2000 在流量高峰是正常的。要看的是「同一个栈的实例数是否随时间单调上涨」。',
              '把「报表少了一截」当成「消费者有 bug」 —— 上游没打点、批次没提交、消费者没启动,三种原因的表象完全一样,只有 lag 加四个计数器能区分。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '排障的本质是缩小范围',
                body: [
                  '新手排障的典型动作是「把所有可能的原因都试一遍」:重启、扩容、清缓存、回滚。这些动作偶尔有效,但有效时你并不知道是哪一步起的作用,于是问题下次还会来。',
                  '老手的动作是**二分**:先确定故障的类别(是资源问题、延迟问题,还是数据问题),再确定范围(是一个实例、一个路由,还是全局),最后才看细节。每一步都在砍掉一半的可能性,而且每一步都能写下「如果排除成功,应该看到什么」。',
                  '这个「应该看到什么」是关键。它不是修辞:如果你认为「是 Redis 挂了」,那么清缓存之后 p99 应该立刻下降——没下降就说明假设错了,立刻换方向。**没有预测的排障等于赌博**,赌赢了也不涨经验。',
                  '所以可观测性建设的真正目标不是「多采集一些数据」,而是**让每一次假设都能被一个已有的信号验证或推翻**。这也是本节三个入口的由来:每一个入口对应一类假设。',
                ],
              },
              {
                kind: 'diagram',
                title: '从「用户说慢」到「第 137 行」',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    {
                      label: '① 分类:是慢、是错、还是数据不对',
                      note: '延迟看 p99,错误看 5xx 比例,数据不对看计数器恒等式',
                    },
                    {
                      label: '② 定位范围:全局 / 单路由 / 单实例',
                      note: '`http_requests_total` 按 route 分组;按实例对比能立刻分出「部署问题」和「依赖问题」',
                    },
                    {
                      label: '③ 沿依赖链下钻:缓存 → 数据库 → 下游',
                      note: '`resolve_total{source}` 的四条出口告诉你慢在 cache 还是 db',
                    },
                    {
                      label: '④ 锁定一次具体请求',
                      note: '用 trace id 把那一跳的日志全捞出来,看它在哪一层停了多久',
                    },
                    {
                      label: '⑤ 抓现场:pprof profile / goroutine / heap',
                      note: '到这一步假设已经收敛到一两个函数,采样 30 秒就有结论',
                    },
                  ],
                  caption:
                    '五步里前四步都只用便宜信号(指标 + 日志),最后一步才用重工具。反过来的路径(先 pprof)在单机小服务上也偶尔能成,但它依赖运气:采样窗口没对准,你抓到的是一张「一切正常」的火焰图。',
                },
              },
              {
                kind: 'principle',
                title: '三类故障,三个入口',
                body: [
                  '每一类故障都有一个「第一个该看的数字」。找对了入口,后面的路径几乎是确定的;找错了,你会在一堆正常的数据里反复确认「没问题」。',
                ],
                steps: [
                  {
                    title: '① 内存与线程:goroutine 数量,以及它在时间轴上的形状',
                    detail:
                      '看 `go_goroutines` 的曲线形状,不看瞬时值。锯齿形(涨到峰值再回落)是正常的请求并发;单调上涨且不回落到基线,是泄漏。确认之后再抓 `goroutine` profile 按栈聚合,找出「谁在等」。',
                  },
                  {
                    title: '② 延迟:分位数 + 分来源计数器',
                    detail:
                      '先看 p99 涨了多少、从什么时候开始(对齐发布记录)。再看 `resolve_total{source}` 的比例有没有变:cache 命中率掉了说明缓存层有问题,db 占比涨了说明回源变多——两者的修法完全不同。',
                  },
                  {
                    title: '③ 数据正确性:计数器恒等式 + lag',
                    detail:
                      '「报表少了」这类问题没有延迟也没有错误,只能靠恒等式查:`Published - Accepted = Dropped + Failed`,四值之和要对得上;`consumer_lag_messages` 告诉你积压还有多少。恒等式不平,就说明有一段没被计数。',
                  },
                ],
                takeaway:
                  '三个入口对应的采集成本依次升高:goroutine 数量是运行时自带的(零成本),分来源计数器要你埋点(一次成本),恒等式校验要设计(持续成本)。[[成本越低的信号越应该先看——这不是因为它更准,而是因为它更快。]]',
              },
              {
                kind: 'concept',
                title: '第一类:goroutine 泄漏——看形状,不看总数',
                body: [
                  'goroutine 便宜到让人忘记它也有成本:初始栈 2KB,加上调度元数据约 3~4KB。一万个泄漏的 goroutine 就是 40MB,而且它们持有的引用会把对象一起钉在堆上——**真正吃掉内存的往往不是栈,是被它们引用着的那些对象。**',
                  '所以判据不是绝对值,是形状。`go_goroutines` 在一天里从 200 涨到 3000 然后一直平着,这是泄漏;涨到 3000 又落回 200,这是正常并发。这个区别在瞬时抓取里看不出来,必须看时间序列。',
                  '确认泄漏之后,抓 `/debug/pprof/goroutine?debug=2`。注意两点:第一,`debug=1` 只给聚合后的计数,`debug=2` 给每个 goroutine 的完整栈——**排障要 `debug=2`**;第二,不要看总数,按栈聚合,找出「那个有几百个实例、且栈顶都停在同一个等待点」的。',
                  '等待点本身就是答案:`chan receive` 说明有人在等一个永远不会来的消息;`select` 停在 `ctx.Done()` 说明 ctx 从来没被取消;`IO wait` 说明连接没关;`semacquire` 说明锁或 WaitGroup 没释放。',
                  '本项目的几个高危位置正好对应四种典型泄漏:HTTP handler 里起的 goroutine 用了 `context.Background()`(请求结束了它还在跑)、`time.Ticker` 没有 `Stop()`、HTTP 响应体没有 `Close()`(连接无法复用,底层 goroutine 常驻)、以及无缓冲 channel 没人读。',
                ],
              },
              {
                kind: 'concept',
                title: '第二类:p99 变慢——用分来源的计数器做决策树',
                body: [
                  '延迟问题的难点不是「怎么测」,是「测出来之后往哪看」。一个 `http_request_duration_seconds` 只告诉你「慢了」,不告诉你「慢在哪」。',
                  '本项目的做法是在 `Resolve` 的四条出口各记一次数:`cache`(一级缓存命中)、`negative`(空值缓存命中)、`merged`(被 singleflight 合并)、`db`(真的回源)。这四个数字的**比例变化**就是一张决策表。',
                  '`cache` 比例从 98% 掉到 60%:缓存层出问题了。可能是 Redis 变慢、可能是 key 被大量淘汰、也可能是有人在批量刷不存在的短码。先去查 Redis 的 RT 和 evicted 计数。',
                  '`db` 比例上升而 `cache` 下降:典型是缓存穿透——大量请求打在不存在的短码上。看 `negative` 是不是也涨了:如果 negative 没涨,说明空值缓存没生效(或者被写成了很短的 TTL),这时候数据库会被扫穿。',
                  '`merged` 比例上升:说明热点更集中了。这本身不是坏事(singleflight 挡住了击穿),但它意味着「有单个短码的 QPS 特别高」。如果 `merged` 高而延迟也高,说明合并之后的那个请求本身慢——去看它的 trace。',
                  '还有一种最容易被忽略的情况:**四个比例都没变,但 p99 涨了**。这通常意味着问题不在跳转链路上,而在更下层——网络、DNS、或者 Go 运行时本身(GC 停顿、调度延迟)。这时候该看 `go_gc_duration_seconds` 和 `go_sched_latencies` 这类运行时指标,而不是继续在业务代码里找。',
                ],
              },
              {
                kind: 'code',
                title: '一个真 bug:批次永远凑不满,所以永远不提交',
                lang: 'go',
                code: '// consumeMaxWait 是「凑不满一批时最多等多久」。\n//\n// 这个常量是端到端跑起来之后才补上的,所以值得记下它是怎么被发现的:\n// Consumer.Fetch 的实现是「一直取到 max 条为止」,而 FetchMessage 在没有新消息时\n// 会**阻塞**到 ctx 取消。worker 之前直接把进程的 signal ctx 传进去 ——\n// 于是低流量下(比如压测之外的任何真实场景),它会一直等第 500 条,\n// 攒到的消息永远不落库、偏移量永远不提交,报表永远是 0。\nconst consumeMaxWait = 300 * time.Millisecond\n\nfor ctx.Err() == nil {\n\t// 每轮给一个上限:凑不满就先把已有的这批处理掉。\n\t// 用 WithTimeout 而不是给 signal ctx 加 deadline —— 后者会让退出信号失效。\n\tfetchCtx, cancelFetch := context.WithTimeout(ctx, consumeMaxWait)\n\tbatch, commit, err := consumer.Fetch(fetchCtx, consumeBatch)\n\tcancelFetch()\n\tif errors.Is(err, stats.ErrNoMessage) {\n\t\tcontinue\n\t}\n\t// ……\n}',
                version: 'Go 1.24 + kafka-go',
                env: 'e2e 阶段 7 由「PV 40s 内没到 5」变为「PV 收敛到 6（3s 内）」',
                verified: true,
                caption:
                  '两行代码的差别,一个恒等式的问题:`攒满一批才处理` 在批量语义上是对的,在延迟语义上是错的。而修正它的正确姿势是给**每轮**加 `WithTimeout`,不是给进程的 signal ctx 加 deadline——后者会让 SIGTERM 的退出路径失效。',
              },
              {
                kind: 'why',
                title: '为什么十一条单测没抓到这个 bug',
                body: [
                  '这个 bug 的性质值得单独说:代码逻辑没错、单测全绿、编译零警告,而端到端就是不通。',
                ],
                without:
                  '`Consumer.Fetch` 的单测里,确实有一条 `TestFetchReturnsPartialOnContextCancel`,专门验证「ctx 取消时返回已取到的部分」——它就是这么写的:传一个 `context.WithTimeout(200ms)` 进去,断言 200ms 后拿回 3 条。它测的是 `Fetch` 的**行为**,而且测得很准。',
                real:
                  '问题在于调用方传的是 `signal ctx`——没有 deadline,只在收到 SIGTERM 时取消。所以线上语义是「等到凑满 500 条或者进程退出」,而单测里那个 `WithTimeout` 恰好把「等到天荒地老」变成了「等 200 毫秒」,于是把唯一的症状掩盖掉了。**测试用例的参数选择和真实调用方的参数选择不一致,是这个 bug 的唯一成因。** 这也是为什么本项目从这一阶段起把「真起进程跑一遍」写进验收流程:单元测试验证函数的行为,端到端验证调用的形状。',
              },
              {
                kind: 'compare',
                title: '单元测试能抓到什么,抓不到什么',
                head: ['维度', '单元测试', '端到端(e2e)'],
                rows: [
                  ['函数行为', '能抓:输入输出、边界、错误分支', '间接抓:只有行为错到影响结果时才暴露'],
                  ['调用形状', '抓不到:参数由测试代码自己构造', '能抓:参数由真实调用方构造'],
                  ['超时与阻塞', '常常抓不到:测试会加超时来保护自己', '能抓:真实进程按真实配置跑'],
                  ['并发与时序', '能抓一部分:要显式构造竞态', '弱:结果依赖调度,不稳定'],
                  ['配置与装配', '抓不到:测试通常手工装配', '能抓:环境变量、顺序、端口冲突都会暴露'],
                  ['跨进程契约', '抓不到:没有第二个进程', '能抓:HTTP / Kafka / 数据库的真实协议'],
                ],
                note:
                  '所以两者的关系不是「替代」而是「互补」,判断标准是:如果失败原因里包含「调用方怎么用它」,那它只能被端到端抓到。本项目这一轮跑 e2e 抓到四个问题:一个真 bug(本节这个)、一个断言写错(见下一节)、一个 Git Bash 路径改写、一个 smoke 脚本同步遗漏——后三个单测都无从谈起。',
                caption:
                  '这也是为什么本项目在阶段 E 才把 e2e 做完整:前面阶段的验收标准都是「函数对不对」,到这一阶段第一次出现「进程之间连不连得上」这类问题。**验收手段的升级,应该跟着失败模式的变化走。**',
              },
              {
                kind: 'concept',
                title: '第三类:统计不准——lag 与四个计数器的四种组合',
                body: [
                  '「报表少了」是数据类故障的典型描述,而它的原因至少有四种,表象完全一样:上游没打点、队列丢了、消费没跑、落库失败。区分它们靠的是四组数字的组合。',
                  '第一种:**`Published` 不涨**。点击发生了但事件没进队列,问题在 API 侧——打点被丢弃(Dropped 涨)或者根本没调用。查 `tap_dropped_total` 和队列长度。',
                  '第二种:**`Published` 涨、`Accepted` 不涨、lag 在涨**。事件进了 Kafka 但没被消费。可能 worker 挂了、可能消费组 offset 卡住、也可能消费者在反复重启。`kafka-consumer-groups.sh --describe` 能直接看出「有没有活跃成员」。',
                  '第三种:**`Accepted` 涨、但 PV 不涨**。事件被消费了但没落库。这是最难查的一种,因为计数器看起来全都正常。要去 worker 日志里找落库错误,或者核对 `consumer_events_total{result="failed"}`。',
                  '第四种:**PV 涨了但比点击数少**。这是幂等或去重的问题:要么事件被去重窗口吃掉了(窗口太小,跨实例的重投没被识别),要么聚合的维度不对(日期时区错了)。本项目把统计日钉死成东八区,就是为了消掉「UTC 机器跨零点」这个变量。',
                  '四种组合对应四个完全不同的修法,而它们在「PV 比点击数少」这个表象上没有任何区别。[[这就是为什么计数器要分开记:合并成一个 `dropped_total` 就再也分不出这四种情况了。]]',
                ],
              },
              {
                kind: 'concept',
                title: '验收脚本自己也会骗人',
                body: [
                  '这一轮还遇到一个更隐蔽的问题:**测试断言本身错了**,而且错的方式和上一节那个 bug 一模一样——假设过时了。',
                  '阶段 7 要断言「PV 等于点击数」。最初这个数字是手写的常量 `expect=5`,注释里写着来源:「首跳 1 + 次跳 1 + 打点计数 3 = 5」。它当时是对的。',
                  '后来为了验证 cache-aside,在阶段 6 加了「删掉缓存键 → 首跳 MISS → 次跳 HIT」这组动作,多打了两次点。常量没有跟着改,于是断言变成:实际 PV=6,期望 5,报错信息写成「PV 在 40s 内没到 5,实际 6」——**一条自己承认矛盾的错误信息。**',
                  '修法不是把 5 改成 6,而是让数字跟着动作走:阶段 6 每次真的请求短码就执行一次 `jump`,把次数写进一个文件;阶段 7 读这个文件当期望值。这样以后再加断言也不会算错。修完之后同一个断言输出变成「PV 收敛到 6(3s 内)」,而且**收敛时间从 40s 超时变成 3s**——因为期望值对了,循环第一次比对就命中。',
                  '这件事的教训超出脚本本身:**断言里任何手写的常量,都是未来的一个 bug**。能推导的就推导,能计数的就计数,不能推导不能计数的,至少要写清「这个数字依赖哪几条动作」——而依赖关系一旦超过三条,人就会算错。',
                ],
              },
              {
                kind: 'question',
                title: 'Q103 · 线上 Go 服务 CPU 突然 100%,你会怎么排查?',
                questionId: 'go-index-Q103',
                intent:
                  '这题的分水岭是「先分类再采样」。CPU 100% 至少有四种成因(死循环、GC 空转、流量突增、锁竞争),而它们的处理方式完全不同——不分类就去 profile,你会得到一张看不出重点的火焰图。',
                points: [
                  '第一步是对照:CPU 涨的同时 QPS 涨了吗?涨了说明是流量问题,先看限流有没有生效;没涨说明单请求成本变了,那是代码或依赖的问题。这一步不需要任何工具,只要两块图并排放。',
                  '第二步是看 GC。`go_gc_duration_seconds` 和 `go_memstats_alloc_bytes` 同时上升,说明是 GC 在空转(分配率过高)。这时候 CPU 火焰图里会看到大量 `runtime.gcBgMarkWorker`——它不是你写的代码,但它在烧你的核。解法是查分配热点,不是查死循环。',
                  '第三步才是 profile。`pprof.Profile` 采 30 秒,看 `flat` 排序的前几名。注意看 `cum` 和 `flat` 的区别:flat 高是本函数在烧 CPU,cum 高是本函数调用了烧 CPU 的东西。前者改这个函数,后者继续往下钻。',
                  '第四步是排除「不是 CPU 的 CPU 问题」。`sys` 时间占比高说明在做系统调用或页面错误;`iowait` 高说明在等磁盘;CPU 限额被 cgroup 卡住(throttling)会让程序看起来慢但 CPU 使用率不高。这三种情况在用户态 profile 里都看不到。',
                  '最后是止血与定位分开:线上先限流/降级/回滚把火扑灭,再离线复现。**在着火的机器上做深度分析,是在用用户的时间换你的学习时间。**',
                ],
                depth:
                  '再深一层会问「怎么区分死循环和正常的高负载」。答案在火焰图的形状:死循环会表现为一个极窄极高的塔(单个函数占 90% 以上),正常高负载则是宽的、有层次的分布。另外一个信号是 goroutine 数:死循环的 goroutine 数不会涨,而流量突增会涨。',
                followup:
                  '追问常到「为什么 CPU 100% 但 QPS 没涨」。除了 GC 空转,还有两个常见原因:后台任务(定时清理、全量扫描)跑起来了,或者是锁竞争导致自旋。后者在 profile 里会看到大量 `runtime.lock2` / `futex`——那是「等锁」被算进了 CPU 时间。',
              },
              {
                kind: 'question',
                title: 'Q104 · Go 服务内存持续上涨,怎么判断是泄漏还是正常占用?',
                questionId: 'go-index-Q104',
                intent:
                  '这题的关键是分清三个数字:进程 RSS、Go 堆大小、活跃对象大小。三者上涨的含义完全不同,而多数人只看第一个就把结论下了。',
                points: [
                  '先看堆的**活跃对象**(`heap_alloc` 里 inuse 的部分,或者 `pprof heap` 的 `inuse_space`)。它在涨才是真泄漏;它平稳而 RSS 在涨,那是「Go 拿了内存还没还」(见 Q71),不是泄漏。',
                  '再看对象数量而不只是字节数。数量涨、平均大小不变 = 每请求漏一个对象(典型是 map 只增不删);字节数涨而数量不变 = 某个对象在变大(典型是 slice 无限 append)。两者的修法不同:前者要找到那个 map,后者要找到那个 slice。',
                  '抓两次 heap profile 做 diff 是最有效的手段:`go tool pprof -base before.prof after.prof`。它直接告诉你「这段时间里谁涨得最多」,比看单次快照准得多——单次快照里最大的那个对象,可能只是启动时就有的缓存。',
                  '还有一种「假泄漏」:连接池或缓存没有上限。它们的内存曲线也是单调上涨,但语义上是「缓存命中率换内存」,不是 bug。判据是「如果流量停掉,它会不会停」——会停就是缓存,不会停才要查。',
                  '最后一定要排除栈和 goroutine:栈不在堆上,`pprof heap` 看不到它。`go_goroutines` 单调上涨而堆平稳,说明是 goroutine 泄漏——它吃掉的是栈内存和它引用的对象,而这两块在堆 profile 里的表现会误导你。',
                ],
                depth:
                  '再往上会问「容器里 RSS 涨到 limit 被 OOMKill 怎么办」。答:先分清是堆涨还是堆外涨。堆涨 → 查泄漏或设 `GOMEMLIMIT`;堆外涨 → 查 CGO、mmap、以及 Go 运行时保留的虚拟内存(它通常不计入 RSS,但某些监控会把它算进去)。`GODEBUG=madvdontneed=1` 这类老方案在 Go 1.16 之后已无必要。',
                followup:
                  '可能追问「怎么在生产上安全地抓 heap profile」。答:用管理端口的 `?seconds=` 采样(它默认就是快照,开销小),不要在业务端口开——而且 heap 快照会把内存里的字符串带出来,里面有用户 URL 和连接串,所以管理端口只能内网监听。',
              },
              {
                kind: 'question',
                title: 'Q70 · Go 里有哪些隐蔽的内存泄漏场景?',
                questionId: 'go-index-Q70',
                intent:
                  '这题考的是「你踩过几个」。答「记得 close channel」是入门,能说出「slice 的子切片钉住了整个底层数组」才是经验。',
                points: [
                  'goroutine 泄漏是最大的一类,而它往往不是「忘了退出」,是「等在一个永远不会来的信号上」:无缓冲 channel 没人读、`select` 只等业务 channel 不等 `ctx.Done()`、WaitGroup 的 `Done` 少调了一次。这类泄漏的特点是 goroutine 数单调上涨,而堆看起来正常。',
                  '切片子串是最隐蔽的一类:`s = big[1000:1010]` 不会复制,新切片仍然指向原数组,于是 10 字节的切片钉住了一个 10MB 的数组。解法是 `strings.Clone` 或显式 `copy`。同样的问题出现在 map 上:`delete` 不会缩容,长期增删的 map 会一直占着峰值容量。',
                  '`time.Ticker` / `time.Timer` 不 `Stop()`:前者会让底层 runtime 一直持有它,后者在 Go 1.23 之前即使触发过也要 Stop 才回收。在长连接服务里,每个连接一个 ticker 而不 Stop,就是按连接数线性泄漏。',
                  '全局 map 当缓存用而不设上限、不设淘汰:这是「假泄漏」,但它同样会把内存吃干净。本项目的 negative cache 因此写进了 Redis 而不是进程内 map——不是因为 map 慢,是因为进程内 map 没有 TTL 和容量上限。',
                  '最后是 finalizer 和 `runtime.SetFinalizer` 的误用:它不保证及时执行,持有 finalizer 的对象至少要活过两轮 GC,而且会让对象晋升到老年代。用它做资源回收,等于给自己埋一颗延迟引爆的雷。',
                ],
                depth:
                  '再深一层会问「怎么在代码评审阶段就防住」。答:三条规则——① 任何 `go func` 前面先问「它的退出条件是什么」;② 任何缓存都要有容量上限和淘汰策略;③ 任何从大对象切出来的小对象,要显式复制。这三条能挡掉绝大多数泄漏,而且它们都是评审时一眼能看出来的。',
                followup:
                  '追问常到「channel 什么时候会泄漏」。答:发送方阻塞在没有接收方的 channel 上、接收方阻塞在没有发送方的 channel 上,以及 `range` 一个永远不会被 close 的 channel。第三种最隐蔽,因为代码看起来完全正常。',
              },
              {
                kind: 'question',
                title: 'Q71 · Go 什么时候把内存还给操作系统?为什么 RSS 降不下来?',
                questionId: 'go-index-Q71',
                intent:
                  '这题是内存问题的分水岭。答不出「Go 的目标是少向 OS 申请,不是及时归还」,就会把「RSS 高」误判成泄漏,然后开始改一个没坏的东西。',
                points: [
                  'Go 的堆是一大块从 OS 拿来的虚拟内存,内部切成 span 管理。GC 回收对象之后,空闲的 span 留在堆里等待复用——**这是刻意的**:向 OS 申请内存要 mmap,而 mmap 比复用 span 慢几个数量级。所以「RSS 不降」通常是设计,不是 bug。',
                  '真正会还的时机有两个:一是空闲内存超过一定比例并持续一段时间,后台的 scavenger 会 `madvise(MADV_FREE/DONTNEED)` 归还;二是 `debug.FreeOSMemory()` 强制归还(它同时触发一次 GC,所以不能频繁调)。',
                  'RSS 降不下来还有一个物理原因:`MADV_FREE` 只是标记「这些页可以回收」,OS 要等到真的需要内存时才回收。所以在内存充裕的机器上,RSS 会一直显示高位——**这是 Linux 的行为,不是 Go 的行为。**',
                  '在容器里这个行为会变成真问题:容器按 RSS 算用量,limit 到了就 OOMKill,而 Go 觉得自己还有空闲 span 可以复用。解法是设 `GOMEMLIMIT`(软限制,让 GC 更早开始)+ 把 limit 设在稳态用量的 1.5 倍以上。',
                  '`GOMEMLIMIT` 不解决泄漏,它只是让 GC 在接近上限时更激进。设得比真实需求低,程序会陷入「GC 一直跑但内存还是不够」的活锁——CPU 100% 而吞吐归零,这比 OOMKill 更难查。',
                ],
                depth:
                  '再往上会问「Go 1.16 那次 madvise 改动改了什么」。答:默认从 `MADV_FREE` 改成 `MADV_DONTNEED`,让 RSS 立刻下降——因为容器按 RSS 算账,而 `MADV_FREE` 的延迟回收在容器里表现为「内存不还」。这个改动不是性能优化,是为了让 Go 在云原生环境里不被误杀。',
                followup:
                  '可能追问「RSS 比 heap_alloc 大很多是正常的吗」。答:正常,差值来自栈、运行时元数据、GC 保留的空闲 span、以及 `madvise` 之后还没被 OS 回收的页。这个比值通常 1.5~3 倍,超过 5 倍才值得查。',
              },
              {
                kind: 'question',
                title: 'Q73 · 如何观察一次 GC 的具体行为?',
                questionId: 'go-index-Q73',
                intent:
                  '这题考的是「你会不会用工具看,而不是靠猜」。能说出 `GODEBUG=gctrace=1` 的输出怎么读,基本就过关了;能说清每次 GC 该花多少时间,是加分项。',
                points: [
                  '最快的手段是 `GODEBUG=gctrace=1`(Go 1.21 之后也可以用 `GODEBUG=gctrace=1,gcpacertrace=1` 看调速器决策)。它每次 GC 打一行,包含 GC 序号、阶段耗时、堆大小变化、以及 STW 时间。排查「GC 太频繁」时,这行日志比任何图表都直接。',
                  '输出的关键字段要看懂:`gc N @Ts X%` 里的 `X%` 是 GC 占用的 CPU 比例,超过 25% 就说明 GC 已经在抢业务 CPU 了;`A->B->C MB` 分别是标记前、标记后、存活堆大小,`B` 持续接近 `C` 说明存活对象多,`A-B` 大说明分配率高。',
                  '第二层是 `runtime/metrics`(标准库,零依赖)。它提供 `/gc/cycles/total`、`/gc/pauses:seconds`(直方图)、`/memory/classes/heap/*` 等结构化指标,可以直接导出成 Prometheus 指标,不用解析文本。本项目用的 `collectors.NewGoCollector()` 内部就是它。',
                  '第三层是 `pprof` 的 alloc profile(`/debug/pprof/allocs`)。它按**分配点**聚合,而不是按存活对象——这正是「降低 GC 压力」需要的视角:你要找的是「谁分配得最多」,不是「谁占得最多」。两者常常是两个不同的函数。',
                  '最后是 `GOGC` 与 `GOMEMLIMIT` 的调优判据:GC 频繁但每次都很短(亚毫秒),说明堆太小、调大 GOGC 就行;GC 不频繁但单次很长,说明存活对象太多,调参没用,必须减少存活集。**先分清是哪一种,再动手调,否则调完只觉得「好像快了一点」。**',
                ],
                depth:
                  '再往上会问「怎么证明 STW 真的不影响业务」。答:看 `go_gc_duration_seconds` 的分位数,以及业务 p99 与 GC 时间的相关性。Go 的三色标记 + 混合写屏障已经把 STW 压到亚毫秒级,但它有另一个成本:写屏障让每次指针写入都多几条指令——这部分开销在火焰图里散落在各处,看不到一个集中的热点,只能靠前后对比测出来。',
                followup:
                  '可能追问「GC 频繁但内存不高是什么原因」。答:分配率高。典型是一次请求里反复 `+` 拼字符串、反复 `append` 不预分配、或者在热路径上用 `fmt.Sprintf`。这三件事在 profile 里都表现为某个函数的 `alloc_objects` 特别高。',
              },
              {
                kind: 'explore',
                title: '为什么这一阶段没上 OpenTelemetry',
                from:
                  'trace id、指标、pprof 三件套都自己实现了,而业界标准答案是接 OpenTelemetry。这个取舍值得说清,否则看代码的人会以为作者不知道 OTel。',
                branches: [
                  {
                    direction: 'outward',
                    related: '接入 OTel SDK + Collector,拿现成的链路追踪和指标导出',
                    basis: '都是「让系统可观测」,而且都最终落到 trace / metrics / logs 三件套',
                    shared: 'trace id 的格式、W3C 传播头、以及「按请求串联」的基本模型',
                    diff:
                      'OTel 提供的是采集 + 上报 + 采样 + 后端协议一整套;本项目提供的是「三个最小可用的原语 + 一个能讲清原理的实现」。前者免去造轮子,后者让你在面试里能说清每一层发生了什么。',
                    value:
                      '判据是「你要的是能用的系统,还是能讲清的系统」。真实项目应该接 OTel——尤其是跨语言、多服务时,自研的 trace id 传播根本走不通。但**先用最小实现把原理吃透,再接框架**是有价值的:接完之后遇到「链路断了」,你知道断在哪一层。[[框架省掉的是工作,不是理解。]]',
                  },
                  {
                    direction: 'reverse',
                    related: '既然只要 trace id,为什么不用 request id 一把梭,不引入 traceparent',
                    basis: '两者都是「给一次请求一个唯一标识」',
                    shared: '都靠 HTTP 头传播、都存在 ctx 里、都由 handler 自动注入日志',
                    diff:
                      'request id 是「一个请求一个 id」;traceparent 携带的是 trace id + span id + 采样标记,天然支持「一条链路多个 span」。前者只能回答「这一次发生了什么」,后者还能回答「每个环节花了多久」。',
                    value:
                      '本项目两个都支持:优先读 `traceparent`,没有就退化成 `X-Request-ID`。这不是骑墙,是**兼容现实**:很多网关只发后一个。但代码里必须留出升级路径——`ParseTraceparent` 已经按标准严格实现,接 OTel 时不用改。',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: 'delivery',
      title: 'F · 交付:交出去以后,「能跑」和「验过」都不再自明',
      goal: '让同一份产物在没有 shell、没有工具链的环境里跑对,并让「验过了」和「没验成」不可能被混淆',
      summary:
        '前五个阶段的产物一直待在「有 Go、有 shell、有系统证书」的机器上。这一阶段把它交出去,三件事同时变了。第一,运行环境变了:最终镜像 `FROM scratch`,里面除了二进制和一份 CA 证书什么都没有——没有 libc 就要静态编译,没有 zoneinfo 就要把时区表编进二进制,没有 curl 就要把健康探测做成二进制自己的一个子命令。第二,启动顺序变成代码:`profiles` 让同一份 compose 既是开发环境也是交付编排,迁移被拆成一次性容器而不塞进 api 的启动脚本,`advertised.listeners` 要写「客户端视角」的地址——写错的表现是日志说连上了、客户端报 connection refused。第三,也是最反直觉的一条:证据的形式变了。这一阶段最值得讲的 bug 是 worker 容器 healthy、日志干净、lag 报 0,却 3 分 51 秒一条消息没处理——所有自动化的健康信号都是绿的,业务是死的。围绕它建的这套门禁因此有一条硬规则:环境不具备时渲染成「跳过」,绝不混进「通过」。',
      checkpoint: {
        questionIds: [
          'go-index-Q32',
          'go-index-Q25',
          'go-index-Q89',
          'go-index-Q157',
          'go-index-Q143',
          'go-index-Q99',
          'go-index-Q146',
          'go-index-Q144',
        ],
        passRatio: 0.8,
      },
      lessons: [
        {
          id: 'image-and-scratch',
          title: '镜像:为什么最终是 15MB,而且里面没有 shell',
          kind: 'concept',
          questionIds: [
            'go-index-Q32',
            'go-index-Q25',
            'go-index-Q21',
            'go-index-Q89',
          ],
          content: {
            intro:
              '前五个阶段跑的都是本地编译出来的二进制。这一节开始,同一个二进制要交给别人去跑——差别不在于「打包」,而在于**你不再能 ssh 进去看一眼**。镜像里少一个文件,症状会在运行期以完全不相干的形式出现:缺 CA 证书报的是 x509 错误,缺时区数据表现为统计写到昨天,缺 libc 报的是「文件不存在」。这一节把镜像从 367.8MB 压到 5.7MB,顺便把「少什么会怎样」逐条验一遍。',
            outline: [
              '多阶段的收益不在阶段数,而在把变化频率不同的东西分层',
              '静态编译是 scratch 的前提:CGO_ENABLED=0 之后二进制不再依赖 libc',
              '镜像里除了二进制只剩一个文件:CA 根证书',
              '没有 shell 之后,健康检查必须长在二进制里',
              '单阶段 367.8MB vs 多阶段 5.7MB —— 差的是构建过程本身',
            ],
            pitfalls: [
              '把 `COPY . .` 写在 `go mod download` 之前。多阶段构建就白做了:改一个字符就重新下载 300MB 依赖,而你以为自己在用缓存。它不会报错,只会每天多花两分钟。',
              '`-X server.version=...` 少写 module 路径。它**不报错**,只是静默不生效,`/version` 永远是 `dev`。构建日志里一个字都不会提。',
              'scratch 的三个隐形依赖,症状全在别处:`CGO_ENABLED=1` 编出来的二进制启动报 `no such file or directory`(文件明明在,少的是 libc);不拷 CA 证书报 `x509: certificate signed by unknown authority`;不处理时区则 `TZ` 设了也没用,`loc=Local` 退化成 UTC,每天 08:00 之前的点击算到前一天。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '三个 stage,各自的失效条件',
                body: [
                  '`deps` 只做一件事:`go mod download`。它单独的**唯一理由是缓存**——依赖清单变了才重新下载,源码改动不影响这一层。实测:只改 `cmd/worker/main.go` 时,这一层直接命中缓存。',
                  '真正省时间的不是「多阶段」这件事,而是**把变化频率不同的东西分开分层**。源码每天改十次,依赖一周改一次,把两者放在同一层,等于让每天十次都付出下载依赖的代价。',
                  '`build` 做编译。它继承 `deps` 的模块缓存,所以第二次构建不需要网络。`runtime-data` 在早期版本里存在(装 `ca-certificates` 和 `tzdata`),后来被删掉了——原因见后面两节。',
                  '最终 stage 是 `FROM scratch`。`scratch` 不是「很小的镜像」,它是**零字节**:没有 `/bin`、没有 `/etc`、没有 libc。所以这一步的前提条件很硬:二进制必须是完全静态的。',
                ],
              },
              {
                kind: 'diagram',
                title: '一次构建里,什么被留下了、什么被丢掉了',
                diagram: {
                  type: 'layers',
                  items: [
                    {
                      label: 'golang:1.23-alpine(74.8MB)',
                      note: '只在构建期需要:Go 工具链、编译缓存、module 缓存',
                      tone: 'muted',
                    },
                    {
                      label: 'deps:go mod download',
                      note: '单独成层,只随 go.mod / go.sum 变化;缓存命中时零网络',
                      tone: 'muted',
                    },
                    {
                      label: 'build:/out/api(15.1MB)',
                      note: 'CGO_ENABLED=0 + -trimpath + -s -w;静态、可复现',
                      tone: 'primary',
                    },
                    {
                      label: 'scratch:15.3MB',
                      note: '只有 /api 与 /etc/ssl/certs/ca-certificates.crt 两个文件',
                      tone: 'primary',
                    },
                  ],
                  caption:
                    '最终镜像里没有任何「构建期才需要」的东西。单阶段构建把这些全部留在镜像层里,所以它 367.8MB —— 而二进制是同一份。',
                },
              },
              {
                kind: 'code',
                title: 'Dockerfile 里真正决定体积与缓存的两段',
                lang: 'dockerfile',
                code:
                  '# 依赖层单独成 stage:只随 go.mod / go.sum 失效\nFROM golang:${GO_VERSION}-alpine AS deps\nWORKDIR /src\nARG GOPROXY=https://proxy.golang.org,direct\nENV GOPROXY=${GOPROXY}\nCOPY go.mod go.sum ./\nRUN --mount=type=cache,target=/go/pkg/mod go mod download\n\n# 源码在这之后才进来 —— 顺序反了,多阶段白做\nFROM deps AS build\nCOPY . .\nARG VERSION=dev\nRUN --mount=type=cache,target=/root/.cache/go-build \\\n    CGO_ENABLED=0 go build -trimpath \\\n    -ldflags "-s -w -X github.com/example/shortlink/internal/server.version=${VERSION}" \\\n    -o /out/api ./cmd/api\n\n# 最终镜像:两个文件\nFROM scratch AS api\nCOPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt\nCOPY --from=build /out/api /api\nUSER 65532:65532\n',
                caption:
                  '`--mount=type=cache` 是 BuildKit 的构建缓存,它不进镜像层,所以不会像单阶段构建那样把 `/root/.cache/go-build` 留在产物里。',
                notes: [
                  '`-trimpath` 去掉构建机的绝对路径。不加的话二进制里会留 `/home/某个用户名/...`,既泄露构建环境,也让不同机器构建出的产物 hash 不一致——而「可复现构建」是从这一步开始的。',
                  '`-s -w` 去符号表和 DWARF,体积小约 25%。代价是 panic 栈没有行号。本项目接受这个代价,因为排障靠 trace 和日志,不靠 core dump。',
                  '`USER 65532:65532` 只能用数字:scratch 里没有 `/etc/passwd`,写用户名会让构建时报错。',
                  '实测口径:镜像解压后 15.3 MB(`docker export | wc -c`),二进制本身 15,089,816 字节。',
                ],
                version: 'Docker 26(BuildKit)',
                env: '本机 Docker Desktop,GO_VERSION=1.23',
                verified: true,
              },
              {
                kind: 'compare',
                title: '同一份代码,两种构建方式',
                head: ['构建方式', '镜像体积', '里面有什么', '改一行代码后重建'],
                rows: [
                  ['单阶段 `FROM golang:alpine`', '367.8 MB', '完整工具链 + 源码 + 编译缓存 + 二进制', '全部重来'],
                  ['多阶段 `FROM scratch`', '5.7 MB', '二进制 + 一个 CA 证书', '只重跑 build 层'],
                ],
                note:
                  '六十五倍。差距不在二进制上——两种构建的二进制是同一份,都在 15MB 左右。差的是 Go 工具链(约 250MB)和 `/root/.cache/go-build`(几十万个中间文件)。**多阶段省下的不是你的代码,是构建过程本身**,所以这个收益和项目规模无关:一个只写三行的服务,单阶段镜像照样 300MB+。',
                caption:
                  '体积口径要说清:5.7MB 是压缩后的层(`docker save`),15.3MB 是解开后占的磁盘(`docker export`)。对外说 6MB、对运维说留 20MB,两者都对,混着说就是错。',
              },
              {
                kind: 'why',
                title: '为什么不是 alpine,也不是 distroless',
                body: [
                  '`alpine:3.20` 3.5MB,`distroless/static` 约 2MB,`scratch` 是 0。三者的差别不在体积,而在**「默认提供什么」**:alpine 有 shell 和包管理器(以及 musl libc),distroless 有 passwd/group、有 CA 证书、有 tzdata,scratch 什么都没有。',
                  '选 scratch 的实际收益是「镜像里有什么」这件事可以被一句话说清:**两个文件**。这个性质带来的是可验证性——`docker export` 出来的文件列表就是全部,不存在「某个基础镜像某天悄悄多了一个我不知情的二进制」。',
                  '顺带说一个现实原因:本轮构建时 `gcr.io` 不可达,拉 `distroless` 直接超时(`dial tcp ...:443`),而 `docker.io` 正常。也就是说 distroless 这条路线在这台机器上根本走不通。这不是设计的理由,但它确实让「scratch 是不是也能做到」这个问题从假设变成了实测。',
                ],
                without:
                  '如果继续用 alpine:镜像大 3.5MB 不是问题,问题是**它给了你一个 shell,于是你会用它**。`docker exec -it api sh` 一旦成为习惯,排障就会从「看指标和日志」退化成「进去看看」——而容器随时可能被重建,你看到的东西下一秒就不在了。没有 shell 逼着把可观测做扎实,这是选它的隐性收益。',
                real:
                  '代价也必须说清:没有 shell,`docker compose exec` 进不去。本轮的排查手段是三条——`docker compose logs`、管理端口的 `/metrics` 与 pprof、以及借一个临时容器共享网络命名空间(`docker run --rm --net container:shortlink-worker alpine wget -qO- localhost:9091/metrics`)。判断标准是这个服务需不需要人常常进去敲命令;一个只做跳转的服务不需要,它需要的是挂了就重启、起不来就看日志。',
              },
              {
                kind: 'concept',
                title: '没有 shell 之后,健康检查只能长在二进制里',
                body: [
                  'Dockerfile 的 `HEALTHCHECK` 有三种常见写法,前两种在 scratch 里都不成立:`CMD curl -f http://localhost/healthz`(没有 curl)、`CMD-SHELL "wget -q -O- ..."`(没有 sh)、`CMD ["/api", "-healthcheck"]`(只剩这一种)。',
                  '所以 `internal/selfcheck` 存在:它要在 `main` 的最前面拦下 `-healthcheck`,把监听地址(`:8080`、`0.0.0.0:8080`、`[::]:9090` 三种形态)换成本机可访问的 URL,发一次 GET,2xx 退出 0。',
                  '这个设计顺手解决了另一个更容易出错的问题:**探测地址与被探测服务的地址由同一份配置推导**。写死 `curl localhost:8080` 做不到这点——改了 `HTTP_ADDR` 之后,健康检查会静默地去探一个没人监听的端口,而容器永远显示 unhealthy,原因看起来像「服务没起来」。',
                  '还有一个位置上的硬约束:这段处理必须在 `config.Load()` **之前**。配置缺项时进程会退出,而「退出了」这件事恰恰要靠健康检查看到。反过来做的话,你会同时收到两条信息——容器 unhealthy、日志里一条配置错误——看起来是两件事,其实是同一件。',
                ],
              },
              {
                kind: 'code',
                title: '把「0.0.0.0」和「:8080」换成一个能连的地址',
                lang: 'go',
                code:
                  'func LocalURL(addr, path string) string {\n\thost, port, err := net.SplitHostPort(addr)\n\tif err != nil {\n\t\treturn "http://127.0.0.1" + ensureSlash(path)\n\t}\n\tswitch host {\n\tcase "", "0.0.0.0", "::", "[::]":\n\t\thost = "127.0.0.1"\n\t}\n\treturn "http://" + net.JoinHostPort(host, port) + ensureSlash(path)\n}\n',
                caption:
                  '不能直接把 addr 拼进 URL:监听在 `0.0.0.0` 时,把 `http://0.0.0.0:8080` 当目标地址发请求,在部分平台上会解析成一块真实但错误的网卡,探测结果就变成看运气。容器内探测一律打环回。',
                notes: [
                  '`Port` 为空时不报错,退化成默认端口:探测地址算不出来不该让进程起不来。',
                  '`Probe` 故意用 GET 不用 HEAD:gin 上很多路由只注册了 GET,HEAD 会得到 404,于是「服务明明是好的却报不健康」——这种 bug 只在换探测方法的那天出现。',
                  '`-healthcheck` 只认这一个参数,不引入 `flag` 包:`flag.Parse` 遇到未知参数会打印用法并退出 2,而这个二进制正常启动时不接受任何参数,加 flag 只是多了一种「参数写错就起不来」的可能。',
                  '10 个用例覆盖地址推导的 7 种形态与探测的 5 种状态码,覆盖率 96.7%。',
                ],
                version: 'Go 1.23',
                env: 'go test ./internal/selfcheck,不需要网络',
                verified: true,
              },
              {
                kind: 'concept',
                title: '时区:两条路都试过,选了编进二进制',
                body: [
                  '本项目的 MySQL DSN 是 `loc=Local`,`link_stats_daily.day` 按本地时区切。缺时区数据的后果不是报错,而是**所有统计落到 UTC 日期上**:每天 08:00 之前的点击算到前一天,而日志里没有任何一行提示你。',
                  '两条路都走过。第一条是从运行镜像拷 `/usr/share/zoneinfo`:整个目录 3.5MB,而只需要一个时区;只拷 `Asia/Shanghai` + `UTC` 能压到 2KB,但 Dockerfile 里就多了一个「必须记得同步时区名」的隐性约束——换成 `Asia/Tokyo` 的人不会想到还有这行。',
                  '第二条是 `import _ "time/tzdata"`:时区数据编进二进制,代价实测 **+405,504 字节(约 396 KiB)**。它让「镜像里除了二进制只有一个证书文件」这个性质成立——而**能被一句话说清的性质,才是能被验证的性质**。',
                  '验证方式就是看日志时间戳的偏移。带 `+08:00` 说明 `TZ` 真的生效了;如果是 `Z`,说明 tzdata 没被找到,而容器照样起来了。',
                ],
              },
              {
                kind: 'question',
                title: 'Q32 · 容器里 GOMAXPROCS 应该怎么设?Go 1.25 改了什么?',
                questionId: 'go-index-Q32',
                intent:
                  '这题在容器化的语境下才真正有意义。回答的及格线是「知道要看 cgroup limit 而不是宿主机核数」,加分项是知道 Go 1.25 把这个默认行为改掉了。',
                points: [
                  '问题本身:`runtime.NumCPU()` 读的是**宿主机**的核数。容器被 `--cpus=2` 限制在 2 核,但 Go 仍然认为有 32 个 P,于是开 32 个调度线程去抢 2 核的 CPU 时间——GMP 的 runqueue 被拉长,GC 的辅助标记也跟着按 32 个 P 来分配,结果是延迟抖动和吞吐下降同时出现。',
                  'Go 1.25 之前的标准做法是引 `automaxprocs`(Uber 那个库),它读 cgroup 的 `cpu.max`(cgroup v2)或 `cpu.cfs_quota_us`(v1),算出真实可用核数,再 `runtime.GOMAXPROCS(n)`。这个库要在 `main` 的最前面调用,因为很多库会在 `init` 里按 `NumCPU` 开协程池。',
                  'Go 1.25 起,运行时会**默认**感知 cgroup 的 CPU 限制(`GOMAXPROCS` 的默认值改为按 cgroup quota 计算)。也就是说新版本上不引库也对,但要知道这件事是什么时候变的——**升级 Go 版本会改变并发行为**,这是升级里最容易被忽略的一类变化。',
                  '还有一个反向的坑:设得太小。`GOMAXPROCS=1` 时,任何一个阻塞在 cgo 或 syscall 上的 goroutine 都会让整个进程的并行度变成 1;而项目中又有同步写日志、写 Kafka 这类操作,吞吐会断崖式下跌。经验区间是「cgroup limit 的核数」,不要为了「省调度」再往下压。',
                  '验证方法不是看文档,是跑基准:`GOMAXPROCS=1` 与 `GOMAXPROCS=<limit>` 各跑一次 `go test -bench`,对比 `ns/op` 与 `B/op`。本项目在 `internal/metrics` 的基准里做过类似的对照——同一份代码,并发度不同,数字差一个数量级。',
                ],
                depth:
                  '再深一层会问「GOMAXPROCS 影响 GC 吗」。会:GC 的标记阶段会被拆成 `GOMAXPROCS/4` 个后台 worker,同时每个 P 在分配内存时要做辅助标记。P 的数量翻倍,标记的并行度也翻倍,但每个 P 分到的 CPU 时间减半——净效果在 CPU 受限时通常是**更差**,因为 GC 抢走了本可以跑业务的 CPU。',
                followup:
                  '追问常到「这个容器实际该设多少」。答:先看 `docker stats` 的真实 CPU 使用率,再对齐 limit。如果使用率长期贴着 limit,问题不是 GOMAXPROCS,是容量不够——**调参数治不了容量问题**。',
              },
              {
                kind: 'question',
                title: 'Q25 · 进程、线程、协程有什么区别?为什么 Go 的协程更轻?',
                questionId: 'go-index-Q25',
                intent:
                  '在交付语境下,这题的正确落点不是背书,而是「为什么一个容器里跑一个进程就够了」——以及一个进程崩了之后会发生什么。',
                points: [
                  '三层的基本差别:进程有独立地址空间,切换要换页表(TLB 失效);线程共享地址空间,切换在内核里,代价是系统调用;协程在用户态调度,切换只保存几个寄存器。数量级上,创建进程约几十微秒、线程约几微秒、goroutine 约几百纳秒。',
                  'Go 的 goroutine 轻在三个地方:初始栈只有 2KB 且可增长(线程栈通常是 1–8MB 且固定)、调度在用户态(不需要陷入内核)、以及 M:N 调度——几万个 goroutine 映射到少数几个 OS 线程上。',
                  '这直接解释了本项目的容器形态:**一个容器一个进程**。API 进程里几万个并发请求对应几万个 goroutine,而 OS 线程只有 GOMAXPROCS 个。如果按「一个请求一个线程」的模型,同样的并发需要几万个线程,光是栈内存就要几十 GB。',
                  '反面也要说清:单进程意味着**没有进程级隔离**。一个 goroutine 里的空指针 panic 会让整个进程退出(除非 recover),没有「只挂一个 worker 进程」这种粒度。所以 Go 服务的容错策略不是「进程级重启」,而是「整个容器重启 + 上游重试」——这要求下游操作幂等,也就回到了阶段 D 讲的接口幂等。',
                  '还有一个具体的坑:容器里的 PID 1。Go 程序作为 PID 1 运行时,内核对它有两个特殊处理——**默认忽略 SIGTERM 等信号**(如果没有显式注册 handler),以及**不会自动回收僵尸子进程**。前者会让 `docker stop` 等满 10 秒超时才 SIGKILL,后者在程序 fork 子进程时会攒僵尸。本项目用 `signal.NotifyContext` 显式接管了 SIGTERM,所以第一个问题不存在;第二个问题因为不 fork 子进程,也不存在——但要知道它们是「默认行为」而不是「不会发生」。',
                ],
                depth:
                  '再深一层会问「goroutine 泄漏怎么发现」。答:看 goroutine 数的**形状**而不是绝对值——正常服务在流量平稳时是一条水平线,泄漏是一条单调上升的斜线。`/debug/pprof/goroutine?debug=1` 能看到按调用栈聚合的数量,通常第一条就是泄漏源。阶段 E 的排障那一节有完整路径。',
                followup:
                  '追问常到「GMP 里的 P 到底是什么」。答:P 是「调度上下文」,数量等于 GOMAXPROCS,它持有本地 runqueue 和 mcache(内存分配缓存)。M 是真正的 OS 线程,没有 P 的 M 只能执行 syscall 或空闲。所以「GOMAXPROCS=32」意味着 32 个 P,而不一定是 32 个线程——线程数可以更多(阻塞在 syscall 上时会新建)。',
              },
              {
                kind: 'question',
                title: 'Q21 · init 函数的执行顺序是怎样的?',
                questionId: 'go-index-Q21',
                intent:
                  '这题在镜像与启动顺序的语境下有两个具体落点:一是「哪些东西会在 main 之前跑」,二是「为什么镜像里不该有 shell 脚本做初始化」。',
                points: [
                  '顺序是确定的:同一个包内按**文件名**顺序初始化包级变量、再执行 `init`;包之间按**依赖顺序**,被依赖的先初始化;`main` 最后。所以 `init` 里读环境变量是可行的,但读一个「由另一个包的 init 设置」的变量不行,除非那个包被显式 import。',
                  '`init` 最危险的用法是**做有副作用的事**:连数据库、起 goroutine、注册 HTTP handler。它们的失败无法通过返回值传递(只能 panic),而 panic 发生在 `main` 之前——日志可能还没初始化,你看到的是一个没有上下文的栈。',
                  '本项目的做法是:**所有资源都活在 `run()` 的栈上**。`main` 里只有三行(调 `run`、记日志、退出),`run` 里依次读配置、建连接、装路由、等信号。这样做的好处是启动顺序在代码里是**可读的一条线**,而不是散落在十几个 `init` 里。',
                  '容器语境下还有一层:`init` 顺序决定了「镜像里能不能用 entrypoint 脚本做初始化」。可以,但那是另一种复杂度——脚本里做的每一步都要能被单独验证,而且它引入了一个 shell(scratch 里没有)。本项目把它去掉了:初始化 = 迁移,由一个一次性容器负责,而不是在启动脚本里。',
                  '一个具体的陷阱:`init` 里的 goroutine 会在 `main` 返回后继续跑(如果没被 ctx 管住),于是「优雅退出」会退化成「进程退出了但日志还在写」。这类问题在测试里表现为偶发的 panic 或数据竞争,而 `-race` 也未必抓得到。',
                ],
                depth:
                  '再深一层会问「能不能不用 init」。工程上可以做到完全不用:把初始化逻辑显式放到 `run()` 里,依赖用参数传入。代价是 `main` 变长,收益是「启动时发生了什么」变成一条可读、可测、可断点的序列。本项目选了后者——这也是 `pkg/lifecycle` 存在的理由:关闭顺序和启动顺序一样,应该是一条可断言的数据而不是一堆裸 defer。',
                followup:
                  '追问常到「`init` 里能做配置校验吗」。能做但不该做:校验失败只能 panic,而 panic 的输出格式取决于日志是否已初始化。本项目把校验放在 `config.Load()` 里,返回 `errors.Join` 聚合的全部错误——一次报全,而不是改一个重启一次。',
              },
              {
                kind: 'question',
                title: 'Q89 · Go 的 http.Client 有哪些必须设置的超时?连接池怎么配?',
                questionId: 'go-index-Q89',
                intent:
                  '健康检查本身就是一个 http.Client 调用。这题要答出「哪些超时是必须的」以及「默认值有多危险」,而不只是背四个字段名。',
                points: [
                  '`http.Client` 的零值 `Timeout: 0` 意味着**无限等待**。这是 Go 里最危险的一个默认值:没有超时的请求会一直占着连接和 goroutine,直到对端关闭或进程被杀。',
                  '四个层次的超时:`Client.Timeout` 是总时长(含连接、重定向、读 body);`Transport.DialContext` 的超时由 `net.Dialer.Timeout` 控制;`ResponseHeaderTimeout` 管「连接建立了但对端不回 header」;`IdleConnTimeout` 管连接池里的空闲连接多久回收。**只设 `Client.Timeout` 是不够的**——它管不住连接池里的空闲连接,也管不住 DNS 解析。',
                  '连接池的两个关键参数:`MaxIdleConnsPerHost`(默认只有 2!)和 `MaxIdleConns`。默认值 2 意味着高并发下大部分请求用完就关,每次都重新握手。这是 Go 服务里最常见的性能问题之一,而它不报错,只表现为 p99 抖动。',
                  '`Transport` 要不要共享:应该共享。每次 `&http.Client{}` 都创建一个新 Transport,等于每次新建一个连接池,连接复用完全失效。正确做法是全局一个 `http.Transport`,复制它的副本去改参数(它不能被并发修改)。',
                  '本项目的自检只用一次 GET、3 秒超时、进程马上退出,所以没设池子——但**要能说出为什么不设**:单次短命调用没有复用收益,设池子反而多一份要维护的状态。判据是「这个客户端会不会被反复使用」,而不是「照抄最佳实践」。',
                ],
                depth:
                  '再深一层会问「body 不读会怎样」。连接不会被回收:Go 的 Transport 要把 body 读完才能安全复用连接,不读就得关掉。所以 `defer resp.Body.Close()` 之前应该 `io.Copy(io.Discard, resp.Body)`——本项目 `selfcheck.Probe` 就是这么写的。一个每秒几千次的探测如果不读 body,会攒下大量 TIME_WAIT。',
                followup:
                  '追问常到「重试怎么加」。答:不要给 `http.Client` 加重试,它分不清「幂等请求」和「不幂等请求」。重试放在业务层,由调用方决定这个操作能不能重试,并配上退避(本项目 `pkg/backoff`)——否则一个超时的 POST 被重试三次,就是三次创建。',
              },
              {
                kind: 'principle',
                title: 'scratch 的四条前提,缺一条就是一个「看起来不相干」的故障',
                body: [
                  '把二进制放进空镜像,本质上是在回答一个问题:**这个进程运行期到底依赖哪些外部文件?** 这个问题在开发机上永远问不出来,因为开发机把答案全给齐了:libc、CA 证书、zoneinfo、`/etc/passwd`、shell。',
                  '依赖清单只有四项,而且都能用一句话判断:动态链接库(`ldd` 看有没有 `libc.so`)→ 必须 `CGO_ENABLED=0`;TLS 验证(`x509.SystemCertPool`)→ 必须带证书;本地时区(`time.LoadLocation("Asia/Shanghai")`)→ 必须带 zoneinfo;用户名解析(`os/user`)→ 必须用数字 UID。',
                  '每一项缺失的症状都离家很远:缺 libc 报的是「文件不存在」,缺证书报的是「证书签发者未知」,缺时区不报错、只是时间差 8 小时,缺 `/etc/passwd` 是构建期就失败。**它们的共同点是:错误信息里不会出现「scratch」这个词。**',
                  '这也是为什么这一节先用 `docker compose --profile app up` 把全链路跑一遍再收工:镜像能不能构建,只证明 COPY 路径写对了;能不能跑,要等它真的连上 MySQL(证书)、真的写出统计(时区)、真的被探针探到(自检)之后才知道。',
                ],
                takeaway:
                  '判断能不能上 scratch,不要问「镜像里还差什么」,要问「这个进程在运行期读了哪些本机文件」。答不出来的部分,就是上线后第一个故障。',
                steps: [
                  '`CGO_ENABLED=0` 静态编译,并用 `ldd` 确认输出是 `not a dynamic executable`',
                  '拷一份 CA 根证书到 `/etc/ssl/certs/`,否则所有 HTTPS 调用在运行期才失败',
                  '时区二选一:拷 zoneinfo 目录,或 `import _ "time/tzdata"` 把表编进二进制(本项目选后者,+396 KiB)',
                  '健康探测写成二进制自己的子命令,并在 `config.Load()` 之前拦下来——没有 shell 时,这是唯一还活着的探针',
                ],
              },
            ],
          },
        },
        {
          id: 'orchestration',
          title: '编排:一条命令起全栈,以及「起来了」和「能干活」的区别',
          kind: 'concept',
          questionIds: [
            'go-index-Q157',
            'go-index-Q143',
            'go-index-Q99',
            'go-index-Q127',
          ],
          content: {
            intro:
              '这一节的核心是一个 bug:worker 容器起来了、健康检查是绿的、日志干净、指标端口能访问、lag 报 0 —— 但它 **3 分 51 秒**一条消息都没处理。所有能自动化的健康信号都是绿的,而业务上是死的。这个症状后来在 e2e 里又出现了一次,根因完全不同(零分配的消费者);两次都治完之后,本节讲的三件事才站得住:启动顺序怎么表达、地址该写谁的视角、以及「探针绿了」到底证明了什么。',
            outline: [
              '一个 compose 文件两套用法:开发只起依赖,交付起全栈',
              '迁移是独立的一次性容器,不是 api 启动时顺手跑',
              'advertised.listeners 必须是「客户端视角」的地址',
              '同一个症状两条根因:协商被 300ms 切碎、以及零分配永不恢复',
              'healthcheck 探的是进程,不是业务',
            ],
            pitfalls: [
              '把迁移写在 api 的启动流程里。单实例时很舒服,多副本同时启动就是并发 DDL,后到的因「表已存在」起不来。同一类错还有 `depends_on: service_started` ——它只保证容器启动了,和「表建好了」是两件事。',
              '编排里的每个地址都要写「**谁在连**」的视角。`advertised.listeners` 写成 `127.0.0.1`:宿主机连得上、容器连不上,而报错出现在「已连接到 kafka:9092 成功」之后的一句 connection refused。漏配一个 `REDIS_ADDR` 相反:它退回默认值 `127.0.0.1:6379`,在容器里指向它自己,看起来像「Redis 没起」,实际是「配置缺了」。',
              '用 `lag=0` 判断消费者在工作。没 join 消费组时,lag 会报 0 而不是报错——这是「用合法值表示缺失」的又一例。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '两套用法,靠 profile 分开',
                body: [
                  '开发时不把应用放进容器:改一行代码要重新构建镜像,热循环太慢。`go run ./cmd/api` + 容器化的依赖,是这类项目的常见组合。交付时反过来,全部进容器,因为那时要验的是「镜像里的东西能不能跑」。',
                  '```\ndocker compose up -d                     # ① 开发:只起 MySQL + Redis\ndocker compose --profile stats up -d     # ① 开发:再加 Kafka\ndocker compose --profile app up -d       # ② 交付:全栈容器化\n```',
                  '一个容易踩的点:`kafka` 同时声明了 `profiles: ["stats", "app"]`。compose 的 profile **不会顺着 `depends_on` 自动展开**——如果 worker 声明在 `app` 里、kafka 只在 `stats` 里,`--profile app up` 的结果是「api 起来了、kafka 没起、worker 一直重启」。两个 profile 都写一行,比在文档里解释「记得同时加 --profile stats」可靠。',
                  '默认不拉起 Kafka 是有意的:省内存,也少一半「端口没起来导致应用起不来」的排查。这个决定和「配置缺了就是没开」是同一个思路——**让「没启用」这件事在编排文件里可见**,而不是藏在一个开关后面。',
                ],
              },
              {
                kind: 'diagram',
                title: '一次 `up` 里的实际顺序',
                diagram: {
                  type: 'sequence',
                  actors: ['compose', 'mysql', 'migrate', 'api', 'worker'],
                  messages: [
                    { from: 'compose', to: 'mysql', text: '起容器,等 healthcheck 通过(mysqladmin ping)' },
                    { from: 'compose', to: 'migrate', text: 'mysql 变 healthy 之后才启动迁移容器' },
                    { from: 'migrate', to: 'mysql', text: '依次执行 0001 / 0002 / 0003 三个 up.sql' },
                    { from: 'migrate', to: 'compose', text: '退出码 0 —— 这才满足 service_completed_successfully' },
                    { from: 'compose', to: 'api', text: '起 api;它的 healthcheck 打 /healthz' },
                    { from: 'compose', to: 'worker', text: '起 worker;它的 healthcheck 打 :9091/metrics' },
                  ],
                  caption:
                    '注意第三条到第四条:不是「迁移容器启动了」,而是「它成功退出了」。这两个条件的差别,和本节的主题是同一类错误——把「进程起来了」当成「它能干活了」。',
                },
              },
              {
                kind: 'why',
                title: '为什么迁移不能放在 api 的启动流程里',
                body: [
                  '「应用启动时自动迁移」在单实例时很舒服:一个进程,一条命令,不用管顺序。但它躲不掉三个问题,而且三个都会在「真的要部署」那天同时出现。',
                  '第一,**多副本同时启动会并发执行同一个 DDL**。MySQL 的元数据锁把它们串起来,后到的会因「表已存在」失败,于是副本起不来——而你面对的是一半副本在重启循环。加个分布式锁能解决,但那是在给一个本不该存在的问题打补丁。',
                  '第二,**迁移需要的权限和运行需要的权限不一样**。DDL 要 `ALTER`,运行时只要 `SELECT/INSERT/UPDATE`。合并成一个账号就是超权,而超权是那种「平时看不出问题、出事时才发现」的风险。',
                  '第三,**回滚代码不等于回滚 schema**。启动时迁移把这两件事绑死了:你想回滚到上一个版本,但它的启动流程会把 schema 再迁一遍(或者因为版本落后而失败)。分开之后,回滚代码就是换镜像,和数据库无关。',
                ],
                without:
                  '如果坚持在 api 里迁移,至少要加两样东西:一个跨实例的迁移锁(否则并发 DDL),以及一个「版本表 + 幂等执行」(否则重跑会失败)。这两样加起来,复杂度已经超过「多一个一次性容器」。也就是说,**启动时迁移不是更简单,只是把复杂度藏起来了**。',
                real:
                  '本项目的 `migrate` 服务是 `restart: "no"` + `image: mysql:8.0`,挂载 `./migrations` 只读,用 shell 循环执行每个 `*.up.sql`。代价是多一个服务、以及 api 的 `depends_on` 要写 `condition: service_completed_successfully`。收益是:迁移是一个可以单独跑、单独看日志、单独回滚的动作。',
              },
              {
                kind: 'code',
                title: '把「等它成功」写进编排文件',
                lang: 'yaml',
                code:
                  'migrate:\n  image: mysql:8.0\n  profiles: ["app"]\n  depends_on:\n    mysql:\n      condition: service_healthy\n  volumes:\n    - ./migrations:/migrations:ro\n  entrypoint: ["/bin/sh", "-c"]\n  command:\n    - |\n      set -e\n      for f in /migrations/*.up.sql; do\n        echo "---- applying $$f"\n        mysql -h mysql -ushortlink -pshortlink shortlink < "$$f"\n      done\n  restart: "no"\n\napi:\n  depends_on:\n    migrate:\n      condition: service_completed_successfully   # 不是 service_started\n    redis:\n      condition: service_healthy\n',
                caption:
                  '`$$` 是 compose 的转义:一个 `$` 会被当成变量插值,两个才是给容器里 shell 的。这个小坑第一次写必踩,而报错是「变量未定义」——看不出是转义问题。',
                notes: [
                  '`restart: "no"` 是必须的。默认的 `unless-stopped` 会让迁移容器跑完退出后被反复重启,每个周期重跑一遍 DDL。',
                  '`set -e` 让第一条 SQL 失败就停:否则会继续执行后面的迁移,把一个「部分完成」的状态留在库里。',
                  '三种 depends_on 条件的语义差别很大:`service_started` < `service_healthy` < `service_completed_successfully`。选错哪一个都不报错,只是「有时候起不来」。',
                  '首次 `--profile app up` 实测:3 个迁移依次执行,退出码 0,api 与 worker 随后才启动。',
                ],
                version: 'Compose v2 / MySQL 8.0',
                env: 'docker compose --profile app up -d',
                verified: true,
              },
              {
                kind: 'concept',
                title: '`advertised.listeners`:一个地址服务不了所有人',
                body: [
                  'Kafka 容器化最经典的坑。改造前的配置是只监听 9092、advertised 写 `127.0.0.1:9092`:宿主机上的客户端能连,容器里的 api/worker 连不上。',
                  '原因不是网络不通,而是**broker 会把地址告诉客户端**:客户端连上 `kafka:9092` 之后,broker 在响应里说「这个分区的 leader 在 `127.0.0.1:9092`」,客户端接着去连**自己容器里**的 127.0.0.1:9092——那里什么都没有。',
                  '报错是 `connection refused`,而日志里显示「已连接到 kafka:9092 成功」。两句话都对,只是它们说的是不同的事:连接建立成功,后续请求失败。',
                  '结论:**advertised 地址必须是「客户端视角」能访问到的地址**,而宿主机和容器是两个不同的视角。改法是多加一个 listener:`PLAINTEXT://127.0.0.1:9092` 给宿主机、`INTERNAL://kafka:9094` 给容器。同一个 broker,两套地址。',
                  '顺带说 healthcheck 也不能只探 TCP 端口:端口通了但 broker 还在选主时,连上去的客户端会拿到一堆 `NOT_LEADER_FOR_PARTITION`。这里用的是 `kafka-broker-api-versions.sh --bootstrap-server ...`,它会真的发一次元数据请求。',
                ],
              },
              {
                kind: 'concept',
                title: '漏配一个环境变量,报错却指向下游',
                body: [
                  '第一次 `--profile app up` 之后,worker 一直重启,错误是 `ping redis: dial tcp 127.0.0.1:6379: connect: connection refused`。',
                  '看起来像「Redis 没起」。实际上 Redis 早就 healthy 了,问题是 **worker 的环境变量里漏了 `REDIS_ADDR`**,于是用了默认值 `127.0.0.1:6379`——在容器里,那是它自己。',
                  '这类错误的价值在于:它把「配置缺失」伪装成了「下游不可用」。两种情况的排查方向完全相反(一个改编排,一个查服务),而报错信息只告诉你后者。',
                  '它不可能靠单测发现(单测里 `REDIS_ADDR` 指向 miniredis,永远是通的),也不可能靠「api 能跑」推断出来(api 的 `REDIS_ADDR` 配了)。**它只能在「全栈真的跑一遍」的时候暴露**——这是 e2e 存在的意义,不是覆盖率能替代的。',
                  '一个可操作的改进:配置文件里对「没有合理默认值的依赖地址」不要给默认值,启动时直接报「缺 REDIS_ADDR」。本项目 `MYSQL_DSN` 就是这么做的(`MYSQL_DSN 不能为空`),而 `REDIS_ADDR` 给了默认值——这个不一致本身就是 bug 的土壤。',
                ],
              },
              {
                kind: 'concept',
                title: '冷启动 3 分 51 秒:一个不报错的 bug',
                body: [
                  '容器化之后,api 正常、跳转正常、打点正常(`tap_published_total 4`)、topic 里有 4 条消息、worker 容器 healthy——但统计接口一直是 0。worker 的日志只有两行:启动、监听管理端口。没有错误,没有警告。',
                  '排除法走到第五步才见底:消息发出去了(api 侧计数正确)、topic 存在、容器内 `nc -zv kafka 9094` 通、用 `kafka-console-consumer` 能读出完整的 4 条 JSON、**宿主机上跑同一个二进制连同一个 broker 就正常落库**。最后一步说明代码没问题,问题在运行形态。',
                  '第六步:看消费组。`kafka-consumer-groups --describe` 返回**空**——group `shortlink-stats` 存在(说明有客户端尝试过 join),但没有任何成员行,也没有 offset。**协商从来没完成。**',
                  '根因在阶段 E 的那个修复上。当时为了修「批次凑不满就永不提交」,给每轮 Fetch 加了 300ms 上限。而 kafka-go 的 Reader 在第一次 `FetchMessage` 时要完成消费组协商(FindCoordinator → JoinGroup → SyncGroup),协商期间一直阻塞——300ms 的窗口把它切成碎片:调用方看到「ctx 到期、本轮无消息」,于是 continue 开下一轮,协商被打断重来。**每一轮都在重新开始,永远完成不了。**',
                  '决定性证据来自一次意外:为了对比,我在宿主机上跑了一个 worker 连同一个 broker。它 join 之后 **3 秒**,容器里的 worker 就把 4 条积压处理完并落库了——是「有人替它完成了协商」,不是它自己变快了。',
                ],
              },
              {
                kind: 'code',
                title: '首轮给长窗口,并且只取 1 条',
                lang: 'go',
                code:
                  'joined := false   // 「已经成功取到过消息」= 协商一定完成了\nfor ctx.Err() == nil {\n\twait, max := consumeMaxWait, consumeBatch\n\tif !joined {\n\t\t// 首轮的真正目的是完成协商,不是取满一批。\n\t\t// 按 500 条去取,Fetch 会在取到积压后就阻塞等第 17 条,\n\t\t// 一直等到窗口到期 —— 实测落库整整晚 15 秒。\n\t\twait, max = consumeJoinWait, 1\n\t}\n\tfetchCtx, cancelFetch := context.WithTimeout(ctx, wait)\n\tbatch, commit, err := consumer.Fetch(fetchCtx, max)\n\tcancelFetch()\n\tif errors.Is(err, stats.ErrNoMessage) {\n\t\tcontinue\n\t}\n\tjoined = true\n\t// ...\n}\n',
                caption:
                  '两行改动,把冷启动从 3 分 51 秒压到 6 秒。但真正要记住的不是这个数字,而是「协商」和「取消息」是两个阶段——用同一个超时窗口去套两个阶段,短的会卡住长的。',
                notes: [
                  '为什么用「取到过消息」而不是「跑了第几轮」:第一版按轮数切(前两轮用长窗口),在 e2e 里翻车了——那里的顺序是「worker 先起、topic 后建」,前两轮 15 秒全用来等 topic 出现,等主题真的有了,窗口已经退回 300ms。**轮数是时间的代理指标,而这里真正要等的是「协商完成」这个事件。**',
                  '`consumeJoinWait = 5s` 的依据:大于 broker 默认的 `group.initial.rebalance.delay.ms`(3s)加几轮 RTT,又明显小于编排系统的 readiness 超时。早期写的 15s 是错的:worker 比 topic 早启动时,那 15 秒全在白等。',
                  '`max = 1` 不是笔误。首轮只取一条,是为了让 `Fetch` 一拿到消息就返回,而不是凑满批次——凑批次会让「已经能消费了」这件事在日志里晚 15 秒才出现。',
                  '不要给 signal ctx 加 deadline:那会让退出信号失效。每轮用 `context.WithTimeout` 派生,父 ctx 取消时会立刻传播。',
                ],
                version: 'kafka-go v0.4',
                env: 'docker compose --profile app 与 verify-e2e.sh 两种运行形态都跑过',
                verified: true,
              },
              {
                kind: 'compare',
                title: '四种窗口策略,三个数量级',
                head: ['窗口策略', '冷启动到首次落库', '为什么'],
                rows: [
                  ['全程 300ms', '3 分 51 秒', '协商被切碎,永远完成不了;最后靠另一个成员加入才打破'],
                  ['首轮 15s × 2 轮,按 500 条取', '15 秒', '协商几秒就完了,但 Fetch 要等满窗口才返回'],
                  ['首轮 15s × 2 轮,只取 1 条', '6 秒', '取到第一条就返回,协商一完成立刻落库'],
                  ['改成「取到过消息之前都用 5s 窗口」', '6 秒', '按事件切而不是按轮数切:worker 比 topic 早启动时不再白等'],
                ],
                note:
                  '第二行到第三行的差别最值得记住:15 秒里只有极短一部分是协商,剩下都是 `Fetch` 在等第 17 条消息(`for len(events) < max`)。**「协商」和「取满一批」是两个阶段,用同一个 max 去套,短的会拖长长的。** 第四行则是被 e2e 打回来之后才改的:同一份代码在 compose 里 6 秒,在「worker 先启动、topic 后创建」的场景里仍然一条都不消费——不过那一次的原因已经不在窗口上了,见下一节的第二个根因。',
                caption:
                  '同一台机器、同一个 broker、同一份业务代码,只有窗口策略不同。这类 bug 的排查难点不在推理,在于「没有任何信号提示你它在等」——日志干净、指标正常、进程健康。',
              },
              {
                kind: 'why',
                title: '为什么 healthcheck 没发现',
                body: [
                  '这是本节真正的结论。容器状态 `Up (healthy)`、`shortlink_consumer_lag_messages 0`、日志干净、`shortlink_tap_published_total 4` 一切正常——把这五个信号摆在一起,没有一个能告诉你「它不干活」。',
                  '`lag=0` 这一条最值得警惕。它是「用合法值表示缺失」的又一例,和阶段 E 里 `RegisterConsumerLag` 返回 `(func, bool)` 是同一个问题的另一面:当时的设计是「读不到就不注册」,但它防不住「注册了、读得到、读出来是 0」这种情况。',
                  '容器状态同理:`healthy` 回答的是「进程还活着吗」,而 `liveness` 探针的设计原则本来就是「重启能不能治好它」。一个「协商卡住」的问题重启治不好(重启之后还是 300ms 窗口),所以它不该由 liveness 表达——但也没有别的探针能表达它。',
                ],
                without:
                  '如果没有那条「打了 N 次跳转,PV 必须变成 N」的端到端断言,这个 bug 会活到什么时候?活到有人发现报表不对的那天——可能是第二天早上,而那时你面对的是「昨天一整天的统计都是 0」和一堆**已经被轮转掉的日志**。',
                real:
                  '所以对「消费者是否在工作」,唯一可靠的自动化判据是**端到端断言**。这也解释了为什么 `verify-e2e.sh` 里那条「PV 收敛」的断言不能省:它是整套验证里唯一一条「业务意义上」的断言,其余都是协议和接口层面的。**三十多条断言里,验「接口对」的有三十二条,验「事情真的发生了」的只有一条。**',
              },
              {
                kind: 'concept',
                title: '第二个根因:零分配的消费者,永远不会自己好',
                body: [
                  '把窗口从 300ms 改成 5 秒之后,compose 里 6 秒就落库了。但同一份代码在 `verify-e2e.sh` 里仍然是红的:`PV 在 40s 内没到 6,实际 0`,worker 日志只有两行(启动 + 管理端口)。**同一个症状,不同的根因。**',
                  '差别在启动顺序。compose 里先建 topic 再起 worker;e2e 里 worker 先起(第 5 阶段),topic 到第 7 阶段才由 `ensure_topic` 建出来。Reader 在 topic 还不存在的时候就 join 了消费组,拿到的分配是**零个分区**。之后 topic 建出来了、消息也进来了,而这个 Reader 会永远保持零分配。',
                  '为了把它和「协商没完成」区分开,我写了个 60 行的诊断程序,直接调 `stats.NewConsumer`,打印每一轮 Fetch 的结果。结论很干净:**12 轮 × 5 秒 = 60 秒,每一轮都在 5.001 秒时正常返回「无消息」,零错误、零警告**;而同一时刻 `kafka-get-offsets.sh` 显示 topic 里有 1 条消息(offset=1)。也就是说 `FetchMessage` 每次都成功地告诉你「没有」——它没有被分配任何分区,所以「没有」是它的真话。',
                  '修法是 `ReaderConfig` 里的一个字段:`WatchPartitionChanges: true`。kafka-go 的默认值是 `false`,后果正是「零分配永不恢复」。打开之后 Reader 每 `PartitionWatchInterval`(默认 5 秒)查一次分区数,变了就让这一代消费组结束、重新 join。同一个实验里,消息在 topic 建成后 **5.9 秒**被取到。',
                  '这个默认值能坑人的原因值得单独说:它**只在一种顺序下才有影响**——Reader 在 topic 存在之前就 join 了消费组。而本地手动起服务的人永远遇不到:你总是先建库、先建 topic、再起进程。会遇到的只有「建 topic 的 Job」和「Deployment」谁先起来这个编排上的不确定项。',
                  '排障上记住一句话:如果一个消费者**没有任何错误、lag 恒为 0、但业务计数不动**,先去看消费组的分配(`kafka-consumer-groups.sh --describe` 的 `ASSIGNMENT` / `PARTITIONS` 列是不是空的),而不是继续翻日志。日志里不会写「我没被分配分区」,因为在那条代码路径上它不认为出了问题。',
                  '但**改完配置不等于修好**。加了 `WatchPartitionChanges` 之后,同一条 e2e 脚本仍然有三分之一的概率卡住(6 轮里 2 轮),而且卡住的时候消费组里连成员行都没有。kafka-go 没有提供「让一个已 join 的 Reader 重新协商」的方法,所以最后加了一个有界兜底:还没取到过任何消息时,按 15s → 30s → 60s → 120s 退避重建 Reader(`Close` 旧的 + `NewReader` 新的),取到第一条就永久停止。',
                  '兜底的三条边界比兜底本身更重要:①只在「一条都没取到」时触发,稳态不受影响;②退避到 120 秒封顶,否则一个「topic 里确实没消息」的正常部署会每 15 秒 rebalance 一次;③重建必须 `Close` 旧 Reader,否则它手里的分区分配不会释放,新 Reader 等的是一份永远拿不到的东西。**「已知根因」和「修好了」是两件事。**',
                  '效果能给出数字:只有 `WatchPartitionChanges` 时,6 轮 e2e 里 2 轮 PV 卡在 0;加上有界重建之后连跑 5 轮全绿,其中一轮的日志是 `21:58:23.636 worker started` → `21:58:38.666 WARN 消费组迟迟没有分配到消息,重建 Reader` → `21:58:38.865 一批已落库并提交`。**15 秒后触发第一次重建,199 毫秒后取到第一条消息**——重建这个动作几乎不花钱,成本全在那 15 秒的退避窗口上。',
                ],
              },
              {
                kind: 'question',
                title: 'Q157 · K8s 的探针有哪几种?Go 服务该怎么配?',
                questionId: 'go-index-Q157',
                intent:
                  '这题的正解不是背三种探针的定义,而是能把本项目已经有的 `/healthz` 与 `/readyz` 映射到三种探针上,并说清哪些配置会互相打架。',
                points: [
                  '三种探针的分工:`liveness` 失败会**重启容器**,`readiness` 失败会把 Pod **从 Service 端点摘掉**,`startup` 只在启动期生效、成功后交给另外两个。**它们回答的是三个不同的问题**:要不要重启、要不要放流量、启动完了没有。',
                  '最常见的事故是「把下游检查放进 liveness」。MySQL 抖动 3 秒,所有 Pod 的 liveness 同时失败,于是**全集群同时重启**——重启治不好 MySQL,但重启期间所有请求都失败。这就是把一次抖动放大成一次故障。',
                  '本项目的分工可以直接映射:`/healthz` 只返回进程状态,给 liveness;`/readyz` 默认浅探测(不碰下游),给 readiness;深探测(`?deep=1`)只在人排障时敲,不给任何探针用。',
                  '`startupProbe` 解决的是「启动慢」:`initialDelaySeconds` 猜不准时,要么设太大(每次发布多等几十秒),要么设太小(启动中被 liveness 杀掉)。startup 探针让「启动期」和「运行期」用两套时限。本节那个冷启动 bug,如果放进 K8s,300ms 窗口导致的 3 分 51 秒会被 startup 探针抓住(如果它探的是业务而不是端口)。',
                  '还有两个必配项:`terminationGracePeriodSeconds` 要大于服务的 `SHUTDOWN_GRACE`(否则优雅退出被 SIGKILL 打断),以及 `preStop` 里 sleep 几秒(否则 Pod 被摘流量的瞬间,还有请求在途)。这两条和代码里的优雅退出**必须成对出现**,少一个都等于没做。',
                ],
                depth:
                  '再深一层会问「探针该探多深」。判据是:**探针的失败必须能通过它触发的动作解决**。liveness 失败的动作是重启,所以它只能探「重启能治好的问题」(死锁、goroutine 泄漏到无法服务);readiness 失败的动作是摘流量,所以它可以探得深一点(依赖不可用时确实不该接流量)。反过来,「数据库连不上」放在 liveness 里就是设计错误。',
                followup:
                  '追问常到「多副本时探针会不会同时失败」。会,而且这正是最危险的部分:同一份配置、同一个下游、同一个时刻,所以它们会**同时**变红。缓解办法是给探针加抖动(不同副本的 `initialDelaySeconds` 略微不同),但更根本的办法是让探针只反映「本副本自己的状态」。',
              },
              {
                kind: 'question',
                title: 'Q143 · 集成测试和环境依赖怎么处理?',
                questionId: 'go-index-Q143',
                intent:
                  '这一节的三层验证(单测 / 真库 / 真协议栈)就是这个问题的答案。回答时要能说清「每一层证明什么、不证明什么」,而不是「我们都用 testcontainers」。',
                points: [
                  '先分层,再谈工具。本项目的四层是:纯逻辑(fake + 纯函数抽取)、真实库接口(`miniredis` / `sqlmock`)、真协议栈(docker compose + 真进程)、只 review。**每一层能证明的东西不同,混着说就是骗自己。**',
                  '`sqlmock` 只证明「发出去了这条 SQL」,不证明 MySQL 接受它。典型例子:`AS new` 的行别名要 MySQL 8.0.19+ 才支持,而 `sqlmock` 完全不管版本。所以「`sqlmock` 通过」不能写成「SQL 能跑」。',
                  '`miniredis` 是 RESP 兼容的内存实现,它证明的是接口语义(`PFADD` 幂等、`EXPIRE`、Lua 脚本的原子性),不证明真实 Redis 的版本差异和内存行为。本项目用它验 UV 的 HyperLogLog 去重,精度断言留了近似误差。',
                  '真协议栈那一层要能「从零开始」:本项目 `verify-e2e.sh` 做的是检查环境 → 起容器 → 迁移 → 编译 → 起进程 → 31 条断言 → 清理。关键是**它会在环境不具备时以 3 退出**,而不是假装通过。',
                  'Testcontainers 是一个合理的选择,但它的成本经常被低估:每个测试包起一次容器,CI 从 30 秒变成 5 分钟;而收益只在「真的需要跨进程行为」时才成立。本项目的选择是「单测不碰容器,e2e 一个脚本跑全部」——因为它只有一个仓库、一个服务,不需要为每个包隔离环境。',
                ],
                depth:
                  '再深一层会问「e2e 不稳定怎么办」。三条实践:① 所有等待都用「轮询到条件成立」而不是固定 sleep(本项目的 PV 断言就是轮询);② 断言里不写手写常量,能推导就推导(本轮因为手写 `expect=5` 而误报过一次);③ 失败时打印能定位的日志尾巴,而不是只报一个失败。',
                followup:
                  '追问常到「本地跑不了 e2e 的环境怎么办」。答:让脚本显式跳过并给出退出码 3,同时在 CI 上跑。**「本地没 Docker」不是取消 e2e 的理由,「没有 CI」才是。**',
              },
              {
                kind: 'question',
                title: 'Q99 · go.mod 是怎么做版本管理的?MVS 是什么?',
                questionId: 'go-index-Q99',
                intent:
                  '在镜像的语境下,这题落在一个很具体的地方:`go.mod` / `go.sum` 决定了「依赖层缓存能不能命中」,也决定了「构建可不可复现」。',
                points: [
                  'MVS(Minimal Version Selection):每个模块选「所有依赖要求里最高的那个最低版本」。它不是「选最新版」,而是「选能满足所有约束的最小版本」——这个设计让依赖图稳定:升级一个库不会顺带把所有东西都升一遍。',
                  '`go.sum` 是校验和数据库,不是锁文件。它保证「同一个模块版本,内容永远一样」,但不保证「每次构建选到的版本组合一样」——后者由 `go.mod` 里的 require 和 MVS 共同决定。两者都提交,缺一个都会出问题。',
                  '构建可复现的三个条件:锁定版本(`go.mod`)、锁定内容(`go.sum`)、锁定编译器(镜像里的 `golang:1.23-alpine` 或 `go 1.23` 指令)。少一个,两台机器就可能构建出不同的二进制——而 `-trimpath` 是第四个:去掉构建机路径,让**产物字节**也一致。',
                  '`go mod tidy` 应该作为一个门禁。本项目 `ci.sh` 里有一条:跑一遍 tidy,比对 `go.mod` / `go.sum` 有没有变化。有变化就说明「有人加了依赖没 tidy」或者「tidy 了没提交」——这两种都会让别人构建出和你不一样的东西,而本地永远复现不出来。',
                  '镜像里的依赖层就是靠这两个文件做缓存的:`COPY go.mod go.sum ./` 然后 `go mod download`。`go.mod` 变一次,这一层失效一次;源码变一百次,它命中一百次。',
                ],
                depth:
                  '再深一层会问「`replace` 指令该不该用」。可以用于临时替换(本地调试、fork 修复),但不该提交到主干:它会让「这个模块从哪来」变得不可预测,而且 `go.sum` 对 replace 的校验行为不同。真需要长期替换,应该 fork 并发布一个版本。',
                followup:
                  '追问常到「私有模块怎么拉」。答:`GOPRIVATE` + `GONOSUMDB` 配上 SSH 或 token,让这几个模块绕过 proxy 和校验和数据库。而**在 Docker 构建里**,这通常意味着要传 `--ssh` 或 build secret,而不是把私钥 COPY 进镜像——那会永久留在层里。',
              },
              {
                kind: 'question',
                title: 'Q127 · 服务注册与发现的原理是什么?',
                questionId: 'go-index-Q127',
                intent:
                  '这题和本节的关系是「地址」:注册中心存的是「谁在哪个地址」,而本节那个坑正是「地址是给谁看的」——两者是同一个问题的两个尺度。',
                points: [
                  '两种模型:客户端发现(调用方从注册中心拉列表,自己选一个,如 Eureka / Consul)和服务端发现(调用方只连一个 VIP 或网关,由基础设施转发,如 K8s Service)。前者的调用方要带负载均衡逻辑,后者不用。',
                  '注册的本质是「带 TTL 的键值 + 心跳」。服务启动时写入,定期续约,停止时删除(或等 TTL 过期)。**关键在失败检测**:进程被 kill -9 时不会删除自己,所以发现方必须能容忍「列表里有已死的实例」——配合主动健康检查或客户端重试。',
                  'K8s 里没有独立的注册中心:Service 的 Endpoints 就是注册表,由 kubelet 的 readiness 探针驱动。所以**readiness 探针失败 = 从注册表摘掉**,这和本节讲的「探针语义」是同一件事的两面。',
                  '和本节坑的对应关系:`advertised.listeners` 就是 Kafka 内部的「服务注册」——broker 告诉客户端「我在这个地址」。它踩的坑(注册的地址是服务端视角而不是客户端视角)在服务注册里同样存在:多网卡机器注册了内网 IP,跨网段调用方拿到后连不上。**任何「把地址告诉别人」的机制都有这个问题。**',
                  '本项目没有注册中心,因为它是单机房、地址由配置给定的部署。这是一个显式的取舍:引入注册中心换来的是「扩缩容不用改配置」,代价是多一个必须高可用的组件。规模没到之前,配置就够了。',
                ],
                depth:
                  '再深一层会问「注册中心挂了会怎样」。取决于客户端是否缓存:拉模式(Eureka)的客户端会缓存列表,注册中心短时间挂掉不影响调用,只是新实例不被感知;推模式( watch)则依赖长连接的可靠性。**所以「注册中心挂了」不等于「服务全挂」,前提是客户端实现了缓存 + 容错。**',
                followup:
                  '追问常到「怎么避免把流量打到正在下线的实例」。答:三步——先从注册表摘除、再等一个「摘除传播时间」、最后才停进程。K8s 里的对应物是 `preStop` 钩子里的 sleep;本项目的对应物是「先摘流量,再停接新连接,最后等在途请求」(见 `docs/01-architecture.md` 的退出顺序)。',
              },
              {
                kind: 'principle',
                title: '「起来了」和「能干活」之间,隔着一整类没人测的状态',
                body: [
                  '这一节那个 bug 的形状值得单独记住:进程在跑、端口能连、健康检查是绿的、日志干净、指标端口能访问、lag 报 0 —— 六项证据同时指向「正常」,而业务是死的。**当所有指示灯都绿时,人不会怀疑指示灯。**',
                  '原因是每个信号回答的问题都只到「进程」这一层:`HEALTHCHECK` 探的是 `/healthz`(进程活着),`lag=0` 探的是「有没有积压」(没 join 就不知道,于是报 0)。没有一个信号在回答「它最近有没有干成活」。',
                  '所以编排文件里要显式写出三类东西,而不是靠默认值:①**顺序**(`depends_on` 用 `service_healthy` / `service_completed_successfully`,不用 `service_started`);②**视角**(每个地址都写「谁在连」:宿主机 `127.0.0.1:9092`、容器 `kafka:9094`);③**业务级证据**(e2e 里的 `pv` 收敛、`tap_consumed_total` 递增,而不是「容器 healthy」)。',
                  '还有一个更普适的判据:**超时窗口要按「阶段的语义」给,不能一刀切**。300ms 对「取一条已有消息」是够的,对「完成一次消费组协商」是不够的;同一个数字在两件事上含义不同,而代码里它们共用了一个变量。',
                ],
                takeaway:
                  '判断一个服务是否就绪,不要看它「有没有起来」,要看它「有没有干成活」。前者有一堆现成的指标,后者只能自己定义——而坑永远在没定义的那一侧。',
                steps: [
                  '把启动顺序写进编排文件:`service_completed_successfully` 等迁移、`service_healthy` 等依赖',
                  '每个地址都问一句「谁在连」:宿主机的 `127.0.0.1` 与容器里的服务名是两个答案',
                  '给业务加一条可断言的证据(PV 收敛、消费计数递增),并让它进 e2e',
                  '超时按阶段分别给:协商要长、取批要短,不要让一个常量同时服务两件事',
                ],
              },
            ],
          },
        },
        {
          id: 'gates',
          title: '门禁:让「验过了」和「没验成」不可能被混淆',
          kind: 'concept',
          questionIds: [
            'go-index-Q146',
            'go-index-Q144',
            'go-index-Q145',
            'go-index-Q147',
            'go-index-Q78',
          ],
          content: {
            intro:
              '前两节解决「交出去的东西对不对」,这一节解决「**你怎么知道它对**」。一套门禁最容易犯的错不是漏了检查项,而是**把「没验」和「验过了」渲染成同一个绿勾**——那样它给人的是信心而不是信息。这个项目的门禁第一次跑就抓到 6 个存量文件不合 gofmt、一条文档数字漂移、和一个自己写错的断言。本节最后是答辩:12 个问题的浓缩版,每个都有这个仓库里真实跑出来的数字。',
            outline: [
              '判断逻辑放脚本里,CI 只负责「在哪台机器上跑」',
              'fast / full 分两档,因为提交前的检查必须足够便宜',
              '跳过不等于通过:三种返回值,而不是一个布尔',
              '门禁第一次跑就抓到 6 个存量文件不合 gofmt',
              '一条测不出问题的用例,比没有用例更糟',
            ],
            pitfalls: [
              '把所有断言写进 CI 的 YAML。结果本地跑不了,于是没人跑;而一个长期飘红的流水线等于没有流水线。同一类问题还有「文档里的数字靠手同步」——它一定会漂移,漂移之后没人知道哪一句还可信。',
              '环境不具备时返回 0。这是最坏的一种「通过」:它给出的信心是假的,而你要到出事那天才知道。',
              '两种自欺:覆盖率门槛贴着当前值(当前 63.8% 就设 63%),加一个没测的分支就飘红,于是人第一反应是改门槛;用「跑一遍看总耗时散不散」去测随机性,测到的是测量噪声,把随机逻辑整个删掉它照样通过。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '为什么判断逻辑不能写在 YAML 里',
                body: [
                  '一个反直觉的事实:**CI 的主要使用者不是 CI**。它跑在推送之后,而你写代码在推送之前。如果检查只存在于 YAML 里,那么「这次改动行不行」的第一个反馈来自几分钟后的邮件——而那时候你已经切到别的事情上了。',
                  '所以本项目的分工是:所有判断在 `scripts/ci.sh` 里,YAML 里只有「在哪台机器上、用什么前置条件跑它」。`ci.yml` 的三个 job 分别是 `bash scripts/ci.sh`(fast,双平台)、`bash scripts/ci.sh --full --only <各门禁>`(覆盖率/race/镜像)、`bash scripts/ci.sh --full --only e2e`(端到端)。**没有一行断言逻辑。**',
                  '这个决定带来一个可验证的性质:**本地能跑什么,CI 就能跑什么**——不是「差不多」,是同一份文件、同一个函数。YAML 里的语法错误、actions 版本、runner 环境的差异仍然存在(它们是另一类风险),但「检查逻辑本身对不对」这件事不需要两处维护。',
                  '代价也要说清:脚本必须能被两种 shell 跑(Git Bash 与 Linux bash)、两种文件系统(大小写敏感性、路径分隔符)、两种进程模型(信号、退出码)。本轮踩到的一个具体差异:Windows 上 `go test -count=1 ./...` 并行链接测试二进制时会争用 build cache,偶发 `Access is denied`;Linux 上不会。',
                ],
              },
              {
                kind: 'principle',
                title: '三种返回值:通过、失败、环境不具备',
                body: [
                  '几乎所有门禁脚本都只用两种状态:0 和 1。这是它们最大的设计缺陷——因为「环境不具备」被塞进了其中一边,而绝大多数实现把它算成 0。',
                  '本项目的约定是:**0 通过 / 1 失败 / 2 环境不具备**。第三类渲染成 `○ 跳过`,并在汇总里单独列出来,连同「缺什么」一起打印。',
                  '```\n通过  ✔ 8  ○ 2 跳过\n\n跳过项(没验,不等于通过):\n  ○ 竞态 go test -race —— 缺 C 编译器(gcc/clang)\n  ○ 镜像构建 api + worker —— 没有可用的 docker daemon\n```',
                  '这和 `verify-e2e.sh` 的退出码 3 是同一个思路,而那句话值得重复:**一个会假装通过的验收脚本,比没有验收脚本更危险,因为它给了你信心**。',
                  '第三个返回值还有一个隐性收益:它让「这个检查值不值得做」变成了一个可以讨论的问题。当 `-race` 因为缺 gcc 而常年显示 `○`,你会开始想「CI 上有 gcc,那里跑就够了」——而不是「反正它显示绿了」。',
                ],
                takeaway:
                  '把「没验」混进「通过」,是验收体系里最贵的一次偷懒。它省下的是一次解释,付出的是一次事故里没人相信任何指标。',
                steps: [
                  '门禁函数返回 0 / 1 / 2 三种状态,而不是 bool',
                  '渲染时把 2 单独标成 ○,并在汇总里列出「缺什么」',
                  '整套脚本在有跳过时仍然退出 0,但输出里必须能看到跳过项——不能只在成功时静默',
                  '失败时打印能定位的输出尾巴(最后 30 行),不让去翻别的终端',
                ],
              },
              {
                kind: 'code',
                title: '`gate`:三种返回值的统一出口',
                lang: 'bash',
                code:
                  'gate() { # 描述 fn\n  local desc=$1 fn=$2 t0 t1 out rc\n  t0=$(date +%s)\n  out=$("$fn" 2>&1); rc=$?\n  t1=$(date +%s)\n\n  case $rc in\n    0) PASS=$((PASS+1))\n       printf "  ✔ %-32s %ss\\n" "$desc" "$((t1-t0))" ;;\n    2) SKIPPED=$((SKIPPED+1)); SKIP_LIST+=("$desc —— $out")\n       printf "  ○ %-32s (%s)\\n" "$desc" "$out" ;;\n    *) FAIL=$((FAIL+1)); FAILED+=("$desc")\n       printf "  ✘ %-32s %ss\\n" "$desc" "$((t1-t0))"\n       printf "%s\\n" "$out" | tail -30 | sed "s/^/      /" ;;\n  esac\n  return 0   # 永远返回 0:让后续门禁继续跑,最后的汇总决定退出码\n}\n',
                caption:
                  '门禁用函数传进来而不是命令字符串:`gate "覆盖率" g_coverage`。这样引号和管道都是 shell 语义,不需要再发明一套转义规则——而「转义规则」是这类脚本出 bug 的重灾区。',
                notes: [
                  '`return 0` 是刻意的:一个门禁失败不应该阻断后面的检查。汇总时一次报全,而不是改一个再跑一遍。',
                  '`out=$("$fn" 2>&1)` 把输出捕获下来,只在失败时打印尾部。成功时最多打两行(覆盖率数字、用例统计),否则日志会被淹没。',
                  '`--only <name>` 只跑一个门禁,用来**验证门禁本身会不会失败**。`bash scripts/ci.sh --only doc` 在 README 数字漂移时会输出「写着 153 个用例,实测 183 个」——这条命令存在的意义就是这个。',
                  '11 条门禁;本机 full 模式实测 9 通过 / 1 跳过(缺 gcc,`-race` 无法构建)。',
                ],
                version: 'Bash 5 / Git Bash',
                env: 'Windows 11 + Docker Desktop,ci.sh --full 可复跑',
                verified: true,
              },
              {
                kind: 'concept',
                title: '门禁第一次跑,抓到了什么',
                body: [
                  '**六个存量文件不合 gofmt。** `internal/httpx/errcode.go`、`metrics/bench_test.go`、`metrics/metrics_test.go`、`repo/idem_test.go`、`shortcode/base62_test.go`、`stats/aggregate_test.go`、`pkg/distlock/distlock.go`——这些文件从阶段 A 起就没被 gofmt 过,而 `go vet` 和 `go test` 全都通过。也就是说:**在门禁立起来之前,「格式一致」这件事从未被验证过**,只是「没人抱怨过」。',
                  '**一条文档数字的漂移。** 阶段 E 结束时把「153 个用例」写进 README,之后加了 `selfcheck` / `config` / `backoff` 三个包的用例,数字悄悄变成了 183。这条门禁的实现很简单:抓 README 里所有 `N 个用例` 和 `N 个包`,逐个和实测比对。',
                  '**一个自己写错的断言。** 端到端脚本里「PV 应到 5」的 `expect=5` 是手写常量,而我在阶段 6 加了两次跳转(清缓存后验 MISS→HIT),常量没跟着改——于是报错是「PV 没到 5,实际 6」,**一条自相矛盾的错误信息**。修法不是把 5 改成 6,而是加一个 `jump()` 计数器:每真的请求一次短链就把计数写进文件,阶段 7 读它当期望值。',
                  '三次都指向同一类问题:**手写的、需要人同步的东西,一定会漂移**。数字会漂移、常量会漂移、格式会漂移。门禁的价值不是「发现了三个 bug」,而是把这三类东西从「靠人记住」变成「机器每次检查」。',
                ],
              },
              {
                kind: 'concept',
                title: '一条测不出问题的用例,比没有用例更糟',
                body: [
                  '`pkg/backoff` 里有个抖动(jitter):每次退避的等待时间加上 `[0, base)` 的随机量,避免一批任务在同一刻重试。第一版用例是这么写的:跑 200 次,看总耗时是否散在多个 100µs 的桶里。',
                  '它通过了。然后我把抖动整个删掉,它**照样通过**——因为它测到的是 `time.Since` 的测量噪声,而不是抖动。200 次调用本身的耗时就足够散,散在多个桶里是必然的。',
                  '改法是把 `jitter` 抽成纯函数,直接测它的取值分布:2000 次采样必须落在 `[0, base)`,产生至少 1000 个不同取值,且最大值接近 `base`。删掉抖动之后,这三条全部失败。',
                  '同一次改动里还有另一条:`base << i` 在 `attempts` 较大时会溢出成负数,而 `time.After(负数)` 立即返回——退避在最该冷静的时候退化成忙循环,把刚抖动的下游再打一遍。它不报错、不 panic,线上表现为「重试风暴」。原实现把计算埋在循环里,这条路只能靠「真的跑 40 次」去碰,而那样的用例没人愿意写。拆出 `nextDelay` 之后,边界才变得可测。',
                  '两件事合起来是一句:**可测性不是测出来的,是拆出来的**。而一条测不出问题的用例之所以更糟,是因为它会在 code review 里被当成「这里已经覆盖了」。',
                ],
              },
              {
                kind: 'compare',
                title: '覆盖率 0% 的包,哪些该补',
                head: ['包', '为什么 0%', '该补吗'],
                rows: [
                  ['`cmd/api`、`cmd/worker`', '`main` 只有装配,逻辑都在 `run()` 里', '不补,`run()` 由 e2e 覆盖'],
                  ['`internal/handler`', 'HTTP 层:解析请求、调 service、写响应', '不补单测,由 e2e 覆盖'],
                  ['`internal/model`', '数据结构,没有逻辑', '不补'],
                  ['`internal/storage`', '建连接池并 ping,需要真连接', '不补'],
                  ['`internal/config`', '环境变量解析 + 启动校验', '**补**(0% → 88.2%)'],
                  ['`pkg/backoff`', '纯逻辑,含溢出与除零边界', '**补**(0% → 100%)'],
                ],
                note:
                  '判据不是「这个包重不重要」,而是「**它的分支能不能在没有真依赖的情况下走到**」。`handler` 的每个分支都要一个真实 HTTP 请求,用 httptest 补一遍等于把 e2e 的一部分重写成单测;而 `config` 和 `backoff` 的边界全是纯逻辑,不补纯粹是懒。',
                caption:
                  '总体覆盖率的门槛设在 60%(当前 63.8%)。留几个点的余量是刻意的:门槛贴着当前值会让「加了一个没测的分支」飘红,而人第一反应是改门槛,不是补测试。',
              },
              {
                kind: 'concept',
                title: '答辩:12 个问题的浓缩',
                body: [
                  '系统设计答辩和代码 review 的区别是:review 问「这里为什么这么写」,答辩问「**换个量级还成立吗**」。同样的代码,回答前者靠记忆,回答后者靠数字。',
                  '**容量**:单机能扛多少 QPS?瓶颈不在 CPU(跳转实测 200µs),在连接数和 Redis 往返。算法是 `目标 QPS × 单请求依赖往返 = 需要的下游并发`,对齐连接池、Redis 连接数、`ulimit -n`,取最小值。**别忘了写假设——容量数字没有假设,就是谣言。**',
                  '**空间**:短码 7 位 62 进制 = 3.5 万亿,每天 1000 万条能用 958 年。先算再答,直接说「够用」是蒙的。真正该担心的是发号器(号段模式 + 多实例原子自增),不是码空间。',
                  '**一致性**:缓存和 DB 的不一致窗口多大?答不出具体时长,就等于没想过。本项目还没实现 `Update`,但设计上必须提前想好:延迟双删 + 订阅 binlog 是两条常见路。',
                  '**故障**:Kafka 挂了跳转还能用吗?能,而且这是设计目标——打点走有界队列,队满丢弃并计数,绝不阻塞 302。代价是报表少一段数据,这是显式的取舍。',
                  '**最脆弱的环节**:不是代码,是「起来了」和「能干活」之间的缝。容器 healthy、指标正常、日志干净,而业务死了近 4 分钟。**一个系统里最危险的状态,是所有指示灯都是绿的。**',
                  '完整的 12 个问题在 `docs/05-delivery.md` 第 5 节,每题都给了「答什么 / 别答什么」。共同的纪律是:**每个结论都要能落到一个实测数字或一个具体机制上**,否则听起来像背过。',
                ],
              },
              {
                kind: 'question',
                title: 'Q146 · 一个 Go 项目的 CI/CD 流水线应该包含什么?',
                questionId: 'go-index-Q146',
                intent:
                  '这题最容易答成一份清单。真正的分水岭是「能不能说出每一道门禁挡住的是什么」,以及「为什么有些检查不该放在提交前」。',
                points: [
                  '按成本分档,而不是按重要性。本项目三档:fast(十几秒,每次推送,双平台)、full(两分钟,覆盖率 / race / 镜像)、e2e(五分钟,真依赖全链路)。**提交前的检查必须足够便宜**,否则人会绕过它——而被绕过的门禁等于没有。',
                  '每道门禁要能回答「它挡的是什么」。`gofmt` 挡的是风格漂移(第一次跑抓到 6 个存量文件);`go mod tidy` 比对挡的是「加了依赖没 tidy」;覆盖率门槛挡的是「整块新代码没测」;README 数字挡的是文档漂移。说不出「挡什么」的检查,通常是别人抄来的。',
                  '`-race` 必须有,但要接受它可能需要 C 编译器。没有 gcc 时显式跳过并标 `○`,而不是静默省掉——CI 上有 gcc,那里跑就行。',
                  '构建产物也要验:镜像能不能构建出来。这一条比很多人想的便宜(本项目 15 秒),而它能挡住「Dockerfile 引用了不存在的路径」这类只在部署时暴露的问题。',
                  'CD 的部分要单独说:流水线到「镜像构建成功」为止,不等于「能发布」。发布还缺三样:镜像推送到仓库、版本号的唯一性保证、以及回滚路径(上一个版本的镜像还在不在)。本项目只做到 CI,这一点在文档里明说了——**不能因为「文件存在」就说「配了 CD」**。',
                ],
                depth:
                  '再深一层会问「怎么让流水线不飘」。三条:① 不用 `latest` 之类的浮动版本(`golang:1.23-alpine` 固定到 minor);② 测试里不写依赖时序的断言(所有等待都是「轮询到条件成立」);③ 失败时留下现场(容器日志、跑完的临时目录),否则重跑一次就复现不了。',
                followup:
                  '追问常到「CI 该不该跑 e2e」。该,但要和单测分开成两个 job:混在一起会让「e2e 挂了」和「单测挂了」在页面上是一个红方块,而两者的处理方式完全不同(前者查环境,后者查代码)。',
              },
              {
                kind: 'question',
                title: 'Q144 · 测试覆盖率有意义吗?多少合适?',
                questionId: 'go-index-Q144',
                intent:
                  '这题的陷阱是两端:说「覆盖率没用」显得敷衍,说「越高越好」说明没做过工程。正解是「覆盖率是必要条件,不是充分条件,而且它衡量的是执行不是验证」。',
                points: [
                  '覆盖率衡量的是「这行代码被执行过」,不是「这个行为被验证过」。一行 `if err != nil { return err }` 被走到,不代表有人检查过它返回的 err 对不对。所以**高覆盖率 + 弱断言 = 看起来很安全**。',
                  '那它还有什么用?它能抓「整块新代码没测」——一个 800 行的新包覆盖率 0%,这一定有问题;而一个 88% 的包还有 12% 没覆盖,通常不是问题。**它是筛子,不是尺子。**',
                  '门槛怎么定:低于当前值几个点,而不是贴着当前值。本项目当前 63.8%,门槛 60%。贴着当前值会让「加了一个没测的分支」飘红,而人第一反应是改门槛——那门槛就从「防线」变成了「待办清单」。',
                  '0% 的包要分类看。`cmd/*`、`handler`、`model`、`storage` 的 0% 是合理的(由 e2e 或根本不需要覆盖);`config`、`backoff` 的 0% 是懒——它们的边界全是纯逻辑,不补没有借口。**说清楚「谁覆盖了它」,而不是「覆盖率低所以算了」。**',
                  '一个更锋利的指标是「关键路径的分支覆盖」:本项目 `internal/service` 的 resolve 有四条出口(cache / negative / merged / db),四条都必须有用例,而且断言的是「四者之和 == 总请求数」——这个恒等式比任何百分比都更能抓住「加了出口忘了报数」。',
                ],
                depth:
                  '再深一层会问「怎么防止为了覆盖率写垃圾测试」。两个办法:① 要求测试名能说清「测的是什么行为」,`TestFoo2` 这种名字本身就是信号;② code review 时看断言而不是看覆盖率——一个有 5 个断言的测试和一个只有 `if err != nil { t.Fatal }` 的测试,覆盖率数字完全一样。',
                followup:
                  '追问常到「集成测试算不算覆盖率」。算,但通常不计入 `go test -cover` 的数字(它不在同一个进程里跑)。所以 e2e 覆盖的 `handler` 在覆盖率报告里仍然是 0%——**这正是「覆盖率不等于验证」的最直接例子**。',
              },
              {
                kind: 'question',
                title: 'Q145 · Go 项目应该配哪些静态检查?',
                questionId: 'go-index-Q145',
                intent:
                  '答案不是「把 golangci-lint 的所有 linter 都打开」。分水岭在于「能说出每个检查挡住什么类的错误」,以及「哪些检查应该从警告升级成失败」。',
                points: [
                  '`gofmt` 是底线,而且应该作为**失败**而不是警告。它的价值不在美观:格式不一致会让 diff 里混进无关改动,review 时看不出真正的变化。本项目这条门禁第一次跑就抓到 6 个存量文件从没被 gofmt 过。',
                  '`go vet` 是官方的最小集,免费且零误报。它抓的是「几乎一定是 bug」的东西:`Printf` 参数不匹配、锁被复制、无用赋值、结构体标签写错。**任何项目都该开,没有理由不开。**',
                  '`go build ./...` 也要跑,而且要跑**全部包**——`go run ./cmd/api` 只编译依赖到的包,一个没被引用的包坏了它发现不了。',
                  '`staticcheck` 抓的是「vet 抓不到但确实有问题」的一类:无效的类型断言、永远不会走到的分支、可以简化但语义不变的写法。它的误报率比 vet 高,所以建议先作为警告跑一段时间,稳定后再升级成失败。本项目没引入它(依赖一个外部二进制),这一点在文档里写明,而不是假装「已经做了最全的检查」。',
                  '`golangci-lint` 的价值是聚合 + 增量检查(只报改动行),但它也带来两个成本:一个几百 MB 的二进制,以及一份「谁都不敢改」的配置。**引入它之前先问:现在有哪些具体的错误是我们没挡住的?** 答不上来就先用 gofmt + vet + build。',
                ],
                depth:
                  '再深一层会问「lint 该阻塞合并吗」。判据是误报率:零误报的(go vet、gofmt、build)必须阻塞;有误报的(staticcheck 的部分规则)先警告,攒够经验再阻塞。一个经常被 `//nolint` 绕过的检查,实际上是在训练团队忽略检查。',
                followup:
                  '追问常到「怎么让存量代码过门禁」。两步:先把检查跑一遍看存量有多少问题(本项目 6 个文件),一次性格式化提交;然后把检查加进 CI。反过来做(先加门禁再修)会让主干红一段时间,而红着的主干很快会被无视。',
              },
              {
                kind: 'question',
                title: 'Q147 · 团队协作中 Git 工作流该怎么选?',
                questionId: 'go-index-Q147',
                intent:
                  '这题和个人偏好无关,和工作流与「提交能不能单独构建」的关系有关。本项目有一个很硬的自定规则,值得作为例子讲。',
                points: [
                  '三种主流:主干开发(trunk-based,小步提交 + 特性开关)、GitHub Flow(短分支 + PR)、Git Flow(develop/release/hotfix 多长分支)。选择的依据不是团队大小,而是**发布节奏**和**是否需要同时维护多个版本**。',
                  'trunk-based 的前提是「分支存活时间以小时计」,它靠特性开关把「合并」和「上线」解耦。没有开关能力时硬上 trunk-based,结果是主干长期不可发布。',
                  'Git Flow 的代价是分支合并的复杂度随分支数指数上升,它的适用场景是「同时维护 v1 和 v2」的库或客户端软件,不是持续部署的服务端。',
                  '本项目的规则比工作流更具体:**一个阶段(或一个能独立讲清的能力块)一次提交**,信息末尾写 `阶段: <字母>/<名字>`;排提交顺序按**依赖拓扑**而不是时间;判断标准很硬——每个提交 `git worktree` 单独检出后 `go build ./...` 必须通过。',
                  '这条规则解决的是一个具体问题:回滚。如果历史里有 5 个提交是「先写了 A,又把 A 拆成 B,再修 B」,那你要回滚到「只有 B」的状态时,git 帮不了你。**可回滚的前提是每个提交本身是一个完整状态**,而这需要纪律,不是工具。',
                ],
                depth:
                  '再深一层会问「A–D 四个阶段是补录的,这样还算数吗」。算,但要承认补录能还原「加了什么」,还原不了「当时为什么这么加」——所以本项目从阶段 E 起改成增量提交,并在 README 里把这段历史写清楚。诚实记录比完美历史更有价值。',
                followup:
                  '追问常到「commit message 该写多细」。判据是「半年后的你能不能只看 message 就知道该不该动这段代码」。本项目的做法是:标题一行说做什么,正文说**为什么这样做而不是别样**,并在末尾标注阶段与验证结果。',
              },
              {
                kind: 'question',
                title: 'Q78 · 一台服务器最大能支撑多少个 TCP 连接?瓶颈在哪?',
                questionId: 'go-index-Q78',
                intent:
                  '这题是容量答辩的入门题。答对一个数字没用,要能说出「在哪个条件下这个数字会变」——而本项目正好有一个真实的瓶颈观测点。',
                points: [
                  '理论上限由四元组决定:源 IP × 源端口 × 目标 IP × 目标端口。作为**服务端**,同一个监听端口可以被几万个客户端同时连(四元组不同即可),所以上限不是 65535,而是受资源限制。',
                  '真正的四个瓶颈:① 文件描述符(`ulimit -n`,默认常见 1024,这是最常见的第一个墙);② 内存(每个连接的内核缓冲区 + 应用侧缓冲);③ 端口范围(作为**客户端**时才受限,`net.ipv4.ip_local_port_range` 默认约 2.8 万);④ CPU(中断、协议栈处理)。',
                  'Go 服务还有一个应用层瓶颈:每个连接一个 goroutine,初始栈 2KB 但会增长。10 万连接不是问题(约 200MB 起),但每个连接上的 buffer(比如 `bufio.Reader` 默认 4KB)才是内存大头。',
                  '本项目的观测点很具体:**跳转路径的瓶颈不在 CPU**。单次跳转实测约 200µs,纯计算能到 5000 QPS/核,但真实上限由「连接池 + Redis 往返」决定。所以容量规划不是算 CPU,而是算「目标 QPS × 每次请求的下游往返次数」,再对齐 `MaxOpenConns`、Redis 连接数、`ulimit -n`。',
                  '`shortlink_http_requests_total` 与 `go_goroutines` 这两条曲线是判断依据:请求数涨而 goroutine 数不涨,说明连接在复用;goroutine 数涨得比请求快,说明有阻塞(或泄漏)。**指标的意义在于它们之间的关系,不在于单个值。**',
                ],
                depth:
                  '再深一层会问「TIME_WAIT 多了怎么办」。作为服务端,TIME_WAIT 出现在**主动关闭**的一方。Go 的 `http.Server` 由服务端主动关闭空闲连接(超过 `IdleTimeout`),所以 TIME_WAIT 会堆在服务端。缓解办法:让客户端先关(`Connection: close` 由客户端发起)、调大 `IdleTimeout` 减少关闭次数、以及 `tcp_tw_reuse`(只在客户端有效)。',
                followup:
                  '追问常到「怎么压测出真实上限」。答:逐步加并发,同时看四个指标(QPS、p99、goroutine 数、下游连接数),找到**第一个开始非线性变化的那个**。本项目 `docs/04-observe.md` 里的分桶从 100µs 起,就是为了在这个量级上还能看出分位数变化——用 `DefBuckets`(起点 5ms)压测 200µs 的接口,p99 会恒等于 5ms,等于没有观测。',
              },
              {
                kind: 'explore',
                title: '从 compose 到 K8s:这套门禁会被拆成几半',
                from: '这一节的门禁全部假设「一台机器、一个仓库、一条命令」。进 K8s 之后,一部分检查变成集群里的对象,另一部分仍然留在 CI —— 分界线不在技术上,而在「谁拥有那个环境」。',
                branches: [
                  {
                    direction: 'outward',
                    related: 'K8s 的 Job / CronJob 与「迁移容器」的对应',
                    basis:
                      'compose 的 `restart: "no"` + `service_completed_successfully` 在 K8s 里对应 Job + initContainer(或 Helm 的 pre-install hook)。语义一样:一个只跑一次、必须成功、失败要阻断后续的对象。',
                    shared:
                      '都以「退出码」为唯一信号,都要求幂等(重跑不能出错),都需要一个「版本表」记录已经执行到哪一版。',
                    diff:
                      'compose 的 `depends_on` 是**同一条命令内的顺序**,失败了整条 `up` 就停在那里,人可以立刻看到;K8s 的 Job 是**集群里的对象**,失败之后只会重试到 `backoffLimit`,而 Deployment 那边照样在滚动更新——除非你把「迁移成功」写成 initContainer 的前置条件,否则「代码上了、库没迁」是常态。',
                    value:
                      '判据是「失败之后谁停下来」。compose 的答案是「整条命令停下」,K8s 的答案是「什么都没停,只是 Job 在重试」——所以要显式把迁移接进 Pod 的启动路径(initContainer),或者让 CD 流水线等 Job 成功再继续。[[同一句「迁移必须先成功」,在两种编排里是两份不同的配置。]]',
                  },
                  {
                    direction: 'lateral',
                    related: '健康检查从 Dockerfile 的 HEALTHCHECK 变成三种探针',
                    basis:
                      'Dockerfile 里的一条 HEALTHCHECK 在 K8s 里被拆成 liveness / readiness / startup,而且**容器自带的 HEALTHCHECK 在 K8s 里会被忽略**——这是个常见误解,以为写了就生效。',
                    shared:
                      '探测的语义不变:进程活着、可以接流量、启动完了。变的只是「失败之后谁做什么」——重启、摘流量、还是不动作。',
                    diff:
                      'Docker 的 HEALTHCHECK 只有一个动作:把容器标成 unhealthy,**没有任何东西会因此发生**(除非外面还有一层自动重启);K8s 的三种探针各自绑定了一个动作,失败会真的重启或摘流量。所以「探得深不深」在 Docker 里几乎无所谓,在 K8s 里是事故与设计的区别。',
                    value:
                      '这解释了为什么本项目把探针设计成三层(`/healthz` 给 liveness、`/readyz` 给 readiness、`?deep=1` 只给人敲):同一份代码在两种编排下都能用,而且不用为了「容器里那条 HEALTHCHECK」牺牲探针语义。',
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
}
