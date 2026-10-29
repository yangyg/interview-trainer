/**
 * Go · 并发模型与运行时
 * go-02(18) + go-03(12) + go-index(并发 32 / 内存 17 / 标准库 13 / 性能 14) = 106 题
 */
export default {
  id: 'go-concurrency-runtime',
  language: 'go',
  title: '并发模型与运行时',
  subtitle: 'GMP、channel、GC 与 pprof，Go 工程师的核心竞争力',
  level: 'advanced',
  order: 8,
  prerequisites: ['go-language'],
  outcomes: [
    '画出 GMP 调度模型，解释 goroutine 抢占与 work stealing',
    '说清 channel 的底层结构与阻塞唤醒机制，避开死锁与泄漏',
    '用逃逸分析与三色标记解释 Go 的内存分配与 GC 行为',
    '看到 CPU 或内存异常时，能用 pprof 定位到具体函数',
    '在高并发场景下做出「加锁 / channel / 原子操作」的合理选择',
  ],
  stages: [
    {
      id: 'scheduler',
      title: 'A · goroutine 与 GMP',
      goal: '理解 goroutine 如何被调度到线程上执行',
      summary:
        'goroutine 的轻量来自用户态调度：几 KB 的初始栈、由运行时而非内核管理。这一阶段讲清 G、M、P 三者的职责与协作，以及调度器在什么时机切换——系统调用、channel 阻塞、抢占信号。',
      lessons: [
        {
          id: 'goroutine-scheduling',
          title: 'GMP 调度模型',
          kind: 'concept',
          sources: [
            { topic: 'go-02', chapters: ['goroutine'] },
            { topic: 'go-index', chapters: ['并发编程'], slice: [0, 8] },
          ],
          content: {
            intro:
              'GMP 这三个字母之所以难讲清,是因为大多数人只记住了「G 是协程、M 是线程、P 是处理器」,却答不出「P 到底解决什么问题」。答案在一句话里:P 是「运行 goroutine 所需的上下文」——它持有本地队列、内存缓存(`mcache`)、以及其他调度状态,把原本需要全局锁的操作变成每个 P 各自加锁。这就是「GM 演进到 GMP」的全部动机:不是抽象更漂亮,而是把一把大锁拆成了 N 把小锁。再理解 `findRunnable` 的四级查找、系统调用时的 `handoff`、以及 netpoller 如何让阻塞的 IO 不占线程,「为什么 Go 能开百万协程」这个问题就有完整答案了。',
            outline: [
              'P 是锁的粒度:本地队列让「取 G」不需要全局锁,这是 GMP 存在的理由',
              '`findRunnable` 四级查找:本地队列 → 全局队列 → netpoll → 偷别人的',
              '`go func()` 的四步:newproc → 入本地队列或全局队列 → 唤醒或新建 M',
              '系统调用的 `handoff`:M 阻塞时把 P 交给别的 M,保证 P 不被浪费',
              'netpoller:网络 IO 阻塞时 G 挂到 epoll,线程立刻去跑别的 G',
            ],
            pitfalls: [
              '说「P 是 CPU 核心」——P 的数量默认等于 `GOMAXPROCS`,但 P 本身不是核,它只是「被允许执行的令牌」。M 才是线程,一个 M 必须绑定一个 P 才能执行 G。',
              '认为 goroutine 阻塞系统调用会导致整个程序卡住——只会让那个 M 和它的 G 一起阻塞,运行时会 handoff 把 P 交给新建的 M。',
              '认为 `GOMAXPROCS` 越大越好——超过逻辑核数只会增加 P 之间偷任务的开销和 GC 的辅助标记压力,并不会提升吞吐。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '从线程到协程:三级抽象各自解决什么',
                body: [
                  '进程、线程、协程的差别,一句话概括:进程是资源隔离单位,线程是内核调度单位,协程是用户态调度单位。',
                  '线程的代价在哪? ① 创建贵:每个线程要有独立栈(默认 1~8MB),`clone` 系统调用本身也要几微秒。② 切换贵:要从用户态陷入内核,保存/恢复寄存器、刷新 TLB、可能切换页表。③ 数量受限:内核能管理的线程数有限,几万个就开始吃力。',
                  '协程把这三件事都变便宜了。① 创建:初始栈只有 2KB,而且是用户态分配,纯内存操作,几十纳秒。② 切换:完全在用户态完成,只需保存少量寄存器,不陷入内核。③ 数量:因为栈按需增长,100 万个 goroutine 大约只占 2GB 虚拟内存(初始栈 2KB),现实中很常见。',
                  '但「用户态调度」有一个绕不开的问题:谁来调度? 如果没有调度器,所有 goroutine 挤在一个线程上,一个阻塞全部阻塞。如果每个 goroutine 配一个线程,又退化成线程模型。GMP 就是这两者之间的答案:用少量线程(M)去跑大量协程(G),用 P 做「执行许可」来控制并行度。',
                ],
              },
              {
                kind: 'diagram',
                title: 'G / M / P 三层的职责',
                diagram: {
                  type: 'layers',
                  items: [
                    { label: 'G(goroutine)', note: '用户代码的执行单元:栈 + 指令指针 + 状态;初始栈 2KB,按需增长', tone: 'primary' },
                    { label: 'P(processor)', note: '执行上下文:本地 G 队列(最多 256)、`mcache`(内存缓存)、状态;数量 = `GOMAXPROCS`', tone: 'primary' },
                    { label: 'M(machine)', note: 'OS 线程:持有栈和寄存器;一个 M 必须绑定一个 P 才能执行 G;空闲时进 `midle` 池' },
                    { label: '全局队列 `sched.runq`', note: '存放「放不进本地队列」的 G;所有 P 共享,访问要加 `sched.lock`' },
                    { label: 'netpoller + sysmon', note: '前者管网络 IO 就绪,后者是后台监控线程(抢占、回收、触发 GC)' },
                  ],
                  caption:
                    '这张图回答的是「谁持有执行上下文」:G 是任务,P 是执行资源与本地队列,M 是 OS 线程。[[关键不是背三层,而是看「解绑」发生在哪]]——M 阻塞时 P 可以交给别的 M,所以 G 的数量可以远大于线程数。',
                },
              },
              {
                kind: 'concept',
                title: 'P 到底解决什么问题:把一把大锁拆成 N 把小锁',
                body: [
                  '在 GM 模型(Go 1.1 之前)里,所有 goroutine 放在一个全局队列,所有 M 抢同一个锁。于是两个问题同时出现:',
                  '第一,锁竞争。M 越多,抢全局锁越激烈,调度的开销反而随并发度上升——这是典型的「加了机器更慢」。',
                  '第二,内存分配的锁竞争。每个 M 分配对象都要访问堆的全局结构(`mheap`),同样是热点。',
                  'GMP 的解法是把这两件事都「下放」到 P。每个 P 有自己的本地队列(最多 256 个 G),从本地队列取 G 完全不需要加锁;每个 P 有自己的 `mcache`(按 size class 缓存的空闲 span),小对象分配也不需要碰全局结构。于是 M 的数量可以远超 P,而竞争只发生在「P 抢 G」和「`mcache` miss」这两个低频事件上。',
                  '所以 P 的本质是「分片」——和数据库分库分表、`sync.Map` 的 `read`/`dirty`、分片锁是同一个思路:把共享状态按某个维度切开,让每份只被一个执行体访问。把这条想通,你就能解释为什么「P 的数量应该等于 CPU 逻辑核数」:P 是「同时执行的 goroutine 上限」,超过核数只会增加切换开销,不会增加并行度。',
                ],
              },
              {
                kind: 'diagram',
                title: '一个 P 的内部:队列 + 缓存 + 状态',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '`runtime.p`',
                      note: '一个 P 就是一块执行上下文',
                      tone: 'primary',
                      slots: [
                        { label: 'status', value: '_Pidle / _Prunning / _Psyscall', tone: 'primary' },
                        { label: 'runq', value: '本地队列(环形数组,容量 256)', ref: '待跑的 G' },
                        { label: 'runqhead', value: '队头下标' },
                        { label: 'runqtail', value: '队尾下标' },
                        { label: 'runnext', value: '优先执行的 G(刚 `go` 出来的那个)', tone: 'primary' },
                        { label: 'mcache', value: '→ 本 P 的内存缓存', ref: '小对象分配免锁' },
                        { label: 'm', value: '→ 当前绑定的 M', ref: '必须成对工作' },
                      ],
                    },
                    {
                      name: '`runtime.m`',
                      note: '一个 M 就是一个 OS 线程',
                      tone: 'muted',
                      slots: [
                        { label: 'g0', value: '调度用的特殊 G(执行调度代码)' },
                        { label: 'curg', value: '当前正在跑的 G' },
                        { label: 'p', value: '→ 绑定的 P(为空则不能执行用户 G)' },
                        { label: 'spinning', value: '是否处于自旋找活状态', tone: 'warn' },
                      ],
                    },
                    {
                      name: '`runtime.sched`(全局)',
                      note: '所有 P 共享,访问要加锁',
                      tone: 'warn',
                      slots: [
                        { label: 'runq', value: '全局 G 队列', ref: '本地队列满了才放这里' },
                        { label: 'midle', value: '空闲 M 链表', ref: '有活就唤醒' },
                        { label: 'pidle', value: '空闲 P 链表', ref: 'handoff 时取用' },
                        { label: 'nmspinning', value: '自旋 M 的数量', tone: 'warn' },
                      ],
                    },
                  ],
                  caption: '注意 `runnext` 这个字段:它让「刚 `go` 出来的 G」优先于本地队列里的老 G 执行——这是一个刻意的优化,提高了「父 G 启动子 G 后立刻等待」这类模式的局部性。',
                },
              },
              {
                kind: 'principle',
                title: '`findRunnable`:一个 M 找活的四级顺序',
                body: [
                  '当一个 M 手上没有 G(比如刚跑完一个),它会调用 `findRunnable` 找下一个。查找顺序是固定的四级,而且顺序本身就是设计:先找「最近、最便宜」的,越往后越贵。',
                ],
                steps: [
                  {
                    title: '① 本地队列(含 `runnext`)——不加锁,最快',
                    detail:
                      '先取 `runnext`(最近 `go` 出来的那个),再取本地队列队头。这两步都不需要任何锁,因为它们只被本 P 读写。绝大多数情况在这一级就命中了——这是 GMP 性能的来源。',
                  },
                  {
                    title: '② 全局队列——要加 `sched.lock`',
                    detail:
                      '本地队列空了才来这里。为了避免「全局队列被某个 P 独吞」,取的时候会一次性取一批(约 `len/ GOMAXPROCS + 1` 个)放进本地队列,而不是只取一个。这个「批量迁移」也是减少锁竞争的设计。',
                  },
                  {
                    title: '③ netpoller——看有没有网络 IO 就绪',
                    detail:
                      '调用 `netpoll(0)` 非阻塞地检查 epoll,若有就绪的 G 就直接拿来跑。这一步的意义是:网络 IO 的 goroutine 不走「等别人唤醒」的路径,而是由任意一个空闲 M 主动「收割」——这是「IO 密集场景下线程利用率高」的关键。',
                  },
                  {
                    title: '④ 偷别人的(work stealing)——随机挑一个 P 偷一半',
                    detail:
                      '从 `sched.pidle` 之外的 P 里随机选一个(最多试 4 轮),偷它本地队列的一半。偷一半而不是一个,是为了避免「频繁偷」——一次偷够本。如果四轮都没偷到,再回头检查全局队列和 netpoll(防止在偷的过程中有新任务),最后才进入休眠。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '`go func()` 之后发生了什么:一条 G 的四步',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '`newproc` 分配一个 G,拷贝参数', note: '从 `gfree` 池复用或新建;栈 2KB' },
                    { label: '尝试放进当前 P 的 `runnext`', note: '如果 `runnext` 已有 G,把旧的挤进本地队列' },
                    { label: '本地队列满了(256)就放全局队列', note: '并对全局队列做「批量迁移」以控制长度' },
                    { label: '`wakep`:需要时唤醒或新建一个 M', note: '有空闲 P 且自旋 M 不足时,才真正创建线程' },
                    { label: '`schedule` 循环取出 G 执行', note: '从 `g0` 栈切到目标 G 的栈——这就是「协程切换」' },
                  ],
                  caption: '注意第三步之后有个隐藏动作:如果本地队列刚放进去时队列变长,会触发「把一半 G 迁到全局队列」,防止某个 P 攒太多。',
                },
              },
              {
                kind: 'concept',
                title: 'work stealing:为什么「偷一半」而不是「偷一个」',
                body: [
                  '负载不均是一定会发生的:有的 P 手上 200 个 G,有的 P 一个都没有。不处理的话,前者排队排到天荒地老,后者闲着。work stealing 就是让闲的 P 去「偷」忙的 P 的活。',
                  '关键设计是「偷一半」。假设偷一个:偷一次只够跑一小会儿,马上又得偷,偷的动作频率和任务耗时成正比,锁竞争急剧上升。偷一半则让「偷」这个动作的收益放大:一次偷到 `n/2` 个,可以连跑很久,下次再偷的时间推迟了。',
                  '还有一个细节:偷取方只偷「本地队列的后半段」,而队列的「前半段」由所有者从队头消费——这样偷取和消费几乎不会争抢同一个位置,用 CAS 就能安全实现。',
                  '这也是为什么 `GOMAXPROCS=1` 时 work stealing 完全不起作用:只有一个 P,没得偷。所以在单核容器里,Go 程序的并发度其实完全依赖「G 主动让出」(阻塞、channel 操作、抢占),不存在真正的并行。',
                ],
              },
              {
                kind: 'concept',
                title: 'hand off:系统调用阻塞时,P 为什么不能被浪费',
                body: [
                  'goroutine 执行 `read()`、`write()`、`accept()` 这类阻塞系统调用时,阻塞的是整个 M(OS 线程),而不是 G。如果什么都不做,这个 M 就带着它的 P 一起卡住了——P 被绑在阻塞的 M 上,等于少了一个并行度。如果有 4 个 P,四个 goroutine 同时做阻塞 IO,整个程序就停了。',
                  '运行时的解法叫 `handoff`(移交)。在陷入系统调用之前,`entersyscall` 会把 P 的状态改为 `_Psyscall`,并解除 M 与 P 的绑定;此时 `sysmon`(后台监控线程)会发现这个 P 已经「被系统调用占用超过一个阈值(约 20 微秒)」,于是把 P 抢回来,交给另一个空闲 M(或新建一个 M)。于是 P 继续跑别的 G,而被阻塞的 M 独自等待系统调用返回。',
                  '系统调用返回后,`exitsyscall` 会尝试重新拿一个 P:拿到就继续跑;拿不到(所有 P 都在忙)就把 G 放进全局队列,自己进入休眠。这就是「阻塞系统调用不会拖住整个程序」的完整机制。',
                  '一个重要的实践推论:大量并发的阻塞式系统调用(比如用标准库 `os.ReadFile` 读文件、或 cgo 调用)会让 Go 创建大量线程——因为每个阻塞的 M 都要占一个线程。这就是「cgo 与文件 IO 会显著增加线程数」的原因,也是 `GODEBUG=schedtrace` 里 `M` 数量暴涨的常见解释。',
                ],
              },
              {
                kind: 'diagram',
                title: '系统调用阻塞时的 P 移交',
                diagram: {
                  type: 'sequence',
                  actors: ['G1', 'M1', 'P1', 'sysmon', 'M2'],
                  messages: [
                    { from: 'G1', to: 'M1', text: '执行 `read(fd)` 这类阻塞调用' },
                    { from: 'M1', to: 'P1', text: '`entersyscall`:P 状态改为 `_Psyscall`,解除绑定' },
                    { from: 'sysmon', to: 'P1', text: '轮询发现 P 被占用超过阈值(约 20µs)' },
                    { from: 'sysmon', to: 'M2', text: '`handoff`:把 P1 交给空闲 M2(没有就新建)' },
                    { from: 'M2', to: 'P1', text: '绑定 P1,继续从本地队列取 G 执行', reply: true },
                    { from: 'M1', to: 'G1', text: '系统调用返回,`exitsyscall`:尝试抢回一个 P' },
                    { from: 'M1', to: 'G1', text: '抢不到 → G1 入全局队列,M1 休眠', reply: true },
                  ],
                  caption:
                    '按顺序读:进入系统调用 → P 改为 `_Psyscall` → sysmon 发现 P 被占用超过约 20µs 后 handoff → 另一个 M 接管 P;原 M 返回后若抢不到 P,G 进全局队列。[[阻塞的是 M,不是 P]]。',
                },
              },
              {
                kind: 'concept',
                title: '抢占式调度:1.14 之前为什么会出现「卡死」',
                body: [
                  'Go 的调度是「协作式 + 信号抢占」的混合体。协作式的意思是:G 只有在「安全点」才会被调度走,比如函数调用、channel 操作、`runtime.Gosched()`。问题在于:如果一个 G 执行的是纯计算的死循环(没有任何函数调用),它就永远碰不到安全点,于是那个 P 被它独占,同 P 上的其他 G 永远排不上队。',
                  'Go 1.14 之前,这个问题只能靠「编译期在函数入口插入抢占检查」缓解——但死循环里没有函数调用,所以还是不行。1.14 引入了基于信号的异步抢占:`sysmon` 发现某个 G 运行超过 10ms,就给它所在的 M 发一个 `SIGURG` 信号,信号处理函数把 G 的栈「掰」到调度器,强制切换。于是「无函数调用的死循环」也能被抢占。',
                  '为什么用 `SIGURG` 而不是别的信号? 因为它默认被忽略、不会被应用层占用、也不会像 `SIGSEGV` 那样有特殊语义——这是「借一个安静的信号做内部通信」的典型手法。',
                  '这套机制还有一个副作用值得知道:G 被抢占时,它会记录一个「异步抢占」标志,下次在安全点检查时真正让出。所以「抢占」不是立刻生效的,中间有一小段延迟——这也是为什么 Go 不能保证「硬实时」的原因之一。',
                ],
              },
              {
                kind: 'concept',
                title: 'netpoller:网络 IO 为什么不占线程',
                body: [
                  '前面说的 handoff 处理的是「阻塞系统调用」,但网络 IO 走的是另一条路——非阻塞 + epoll。这就是 netpoller。',
                  '当 G 对一个网络 fd 做 `Read`,而数据还没到,运行时不会让线程阻塞,而是:把 fd 注册到 epoll、把 G 标记为等待状态、把 G 从 P 上摘下来,然后立刻返回去跑别的 G。等 epoll 报告就绪,运行时把对应的 G 重新放回某个 P 的队列。整个过程线程从没阻塞过。',
                  '所以网络服务的 goroutine 数可以远大于线程数:10 万个连接 + 10 万个 goroutine 是常见的,而线程可能只有几十个。这也是「Go 天然适合写网络服务」的根本原因——它把「连接」和「线程」解耦了。',
                  '对照一下三种阻塞。① channel / mutex 等待:纯用户态,G 挂起,P 继续跑别的——零成本。② 网络 IO:注册 epoll,G 挂起,线程继续——接近零成本。③ 文件 IO / cgo:真正的阻塞系统调用,只能 handoff——每个并发都要一个线程,昂贵。这个三分法能解释绝大多数「为什么我的程序线程数暴涨」的问题。',
                ],
              },
              {
                kind: 'analogy',
                title: 'GMP 像「银行柜台、客户与取号机」',
                text:
                  '把 P 想成柜台窗口——一个窗口同一时刻只能服务一个客户,窗口数量等于 `GOMAXPROCS`(默认等于核数)。M 是柜员,一个柜员必须站在一个窗口后面才能办业务(绑定 P 才能执行 G);柜员可以比窗口多,但多出来的柜员只能站着等窗口空出来。G 是客户,数量可以成千上万,大部分人都在等号。每个窗口前面有一小段排队区(本地队列,最多 256 人),排满了就请到大厅中央的等候区(全局队列)。窗口的柜员办完一个客户,先看自己队里有没有人(本地队列),没有就去等候区领一批人(全局队列),再没有就去问大厅里有没有「网上预约已到店」的客户(netpoll),最后才去别的窗口队尾「借一半人」(work stealing)——而且是随机挑一个窗口借,免得总借同一个。最有意思的是系统调用:某个客户要办的事必须等外部审批(阻塞系统调用),柜员只能陪着等——这时大堂经理(sysmon)会把这个窗口从柜员手里收回来,交给另一个闲着的柜员继续办业务,而原来那个柜员就陪着客户等审批结果。这就是 handoff:窗口(P)不能被一个卡住的人浪费掉。',
                mapping: [
                  { real: '柜台窗口(数量有限,同时只服务一人)', tech: 'P:执行上下文,数量 = `GOMAXPROCS`' },
                  { real: '柜员(可以比窗口多,但没窗口就干等)', tech: 'M:OS 线程,必须绑定 P 才能执行 G' },
                  { real: '客户(成千上万)', tech: 'G:goroutine,初始栈仅 2KB' },
                  { real: '每个窗口前的小排队区', tech: 'P 的本地队列(容量 256,免锁)' },
                  { real: '大厅中央等候区', tech: '全局队列 `sched.runq`(要加锁)' },
                  { real: '去别的窗口「借一半人」', tech: 'work stealing:偷一半而不是一个' },
                  { real: '「网上预约已到店」的客户', tech: 'netpoll:网络 IO 就绪的 G' },
                  { real: '大堂经理把窗口收回交给别的柜员', tech: 'sysmon 触发的 handoff' },
                ],
                limit: '类比不成立的地方:现实中「借人」要跟对方窗口协商,而 work stealing 是直接 CAS 改对方的队列下标,几乎无协调成本;另外 P 还兼着「内存缓存」的角色(类比里没有对应物),这是 P 的第二个职责。',
              },
              {
                kind: 'compare',
                title: 'GM 与 GMP:差在哪一步',
                head: ['维度', 'GM(Go 1.1 前)', 'GMP(现在)', '收益'],
                cols: ['GM(Go 1.1 前)', 'GMP(现在)', '收益'],
                rows: [
                  ['G 的存放', '只有全局队列', '每个 P 一个本地队列 + 全局队列兜底', '取 G 无需全局锁'],
                  ['锁竞争', '所有 M 抢 `sched.lock`', '只有本地队列空/满时才碰全局锁', '并发度上升不再放大开销'],
                  ['内存分配', '所有 M 抢 `mheap` 全局锁', '每个 P 有 `mcache`,小对象免锁', '分配成为主要热点之一被消除'],
                  ['负载均衡', '天然共享,不存在不均', '需要 work stealing 补偿', '换来免锁,代价是偷取开销'],
                  ['并行度控制', '靠 `GOMAXPROCS` 限制 M 数', 'P 的数量即并行度,M 可多可少', '语义更清晰,handoff 更简单'],
                ],
                note: '一句话:GMP 用「分片」换「免锁」,再用「work stealing」补回负载均衡。这套「分片 + 偷取」的组合,后来被大量并发框架借鉴。',
              },
              {
                kind: 'question',
                title: 'Q2 · 讲讲 GMP 模型，G、M、P 分别是什么？',
                questionId: 'go-02-Q2',
                intent: 'GMP 三者定义 + P 的作用 + 与 GM 的区别,这是必答题。',
                points: [
                  '定义:G 是 goroutine(用户态执行单元,初始栈 2KB);M 是 OS 线程(真正执行代码的实体,必须绑定 P);P 是执行上下文(持有本地队列、`mcache`、状态),数量等于 `GOMAXPROCS`。',
                  'P 的作用(高分点):把全局队列和内存分配缓存下放到每个 P,使「取 G」和「小对象分配」都不需要全局锁——这是 GMP 相对 GM 的核心改进。',
                  '数量关系:`G > P`,通常 `M > P`(因为阻塞系统调用时 M 会被 handoff 掉),但同一时刻只有 P 个 M 在真正执行用户代码。',
                ],
                depth: '追问「P 的数量为什么等于核数」——P 代表「同时执行用户 G 的许可数」,超过核数不会增加并行度,只会增加上下文切换和偷取开销;而 GC 的后台标记 worker 也按 P 数量分配,过多的 P 会让标记抢占更多 CPU。',
              },
              {
                kind: 'question',
                title: 'Q3 · go func() 之后发生了什么？（一条 G 的完整生命周期）',
                questionId: 'go-02-Q3',
                intent: '一条 G 的完整生命周期:从 `go` 到被调度、执行、阻塞、唤醒、结束。',
                points: [
                  '创建:`newproc` 分配 G(从 `gfree` 复用),设置栈(2KB)与入口;尝试放入当前 P 的 `runnext`,若已被占用则把旧的挤进本地队列。',
                  '入队:本地队列满(256)则放入全局队列,并对全局队列做批量迁移以控制长度;随后 `wakep` 在必要时唤醒/新建 M。',
                  '执行:M 通过 `schedule` → `execute` 从 `g0` 栈切到 G 的栈;G 在安全点(函数调用、channel、`Gosched`)或超 10ms 被信号抢占时让出。',
                  '阻塞与唤醒:channel/mutex 等待 → G 挂到等待队列;网络 IO → 注册 epoll;阻塞系统调用 → P 被 handoff。结束后 G 进入 `gfree` 池复用。',
                ],
                followup: '「G 执行完会被销毁吗?」 不会。它被放回 P 的 `gfree` 链表(或全局 `sched.gFree`)复用,栈可能被保留——这就是「创建 goroutine 便宜」的一半原因:对象和栈都能复用。',
              },
              {
                kind: 'question',
                title: 'Q10 · goroutine 在哪些时机会被调度走？main goroutine 退出会怎样？（补）',
                questionId: 'go-02-Q10',
                intent: '「goroutine 何时被调度走」+「main 退出会怎样」两个子问题。',
                points: [
                  '主动让出:`runtime.Gosched()`、channel 收发阻塞、`select` 无就绪分支且无 `default`、`sync` 原语等待、`time.Sleep`、系统调用。',
                  '被动抢占:函数入口的协作检查(1.14 前)、`sysmon` 检测到运行超 10ms 时发 `SIGURG` 强制抢占(1.14+)。',
                  'main 退出:`main.main` 返回即调用 `exit(0)`,不会等其他 goroutine、不会执行它们的 `defer`——所以「后台 goroutine 写日志」在进程退出时可能丢数据,必须显式同步(如 `defer wg.Wait()` 或信号处理里优雅退出)。',
                ],
                depth: '这也是「`time.Sleep` 后程序立刻退出,goroutine 没跑」的原因——不是 goroutine 慢,而是 `main` 已经 `exit` 了。正确做法是 `sync.WaitGroup` 或 `channel` 显式等待,不要用 `Sleep` 赌时间。',
              },
              {
                kind: 'question',
                title: 'Q12 · netpoller：goroutine 阻塞在网络 IO 上为什么不占线程？',
                questionId: 'go-02-Q12',
                intent: 'netpoller 机制:为什么阻塞在网络 IO 上的 goroutine 不占线程。',
                points: [
                  '机制:网络 fd 设为非阻塞并注册到 epoll;G 读不到数据时,运行时把 G 标记为等待、从 P 上摘下,线程立刻去跑别的 G。epoll 就绪后由任意空闲 M 收割并重新入队。',
                  '效果:线程数只与「同时真正在跑的用户代码」相关,与「连接数/goroutine 数」无关——十万连接可以只用几十个线程。',
                  '对比:channel/mutex 等待是纯用户态挂起(最便宜);文件 IO 和 cgo 是真正的阻塞系统调用,只能 handoff,每个并发都要一个线程。',
                ],
                depth: '追问「那 `os.ReadFile` 为什么会让线程数暴涨」——文件 fd 在 Linux 上无法用 epoll 高效管理(普通文件永远「就绪」),所以 Go 对文件 IO 走的是阻塞 + handoff 路径。解决办法是用 `io_uring`(Go 尚未全面支持)或限制并发文件操作数。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'channel-sync',
      title: 'B · channel 与同步原语',
      goal: '掌握通信式并发与共享内存式并发的取舍',
      summary:
        'Go 提倡「用通信共享内存」，但 channel 不是万能的：它有明确的适用边界与性能代价。这一阶段讲清 channel 的底层结构（环形缓冲 + 等待队列）、关闭与阻塞的语义，再对比 mutex 与 atomic 的适用场景。',
      lessons: [
        {
          id: 'channel',
          title: 'channel 原理与常见死锁',
          kind: 'concept',
          sources: [
            { topic: 'go-02', chapters: ['channel'] },
            { topic: 'go-index', chapters: ['并发编程'], slice: [8, 22] },
          ],
          content: {
            intro:
              '`hchan` 只有六个关键字段,但它们把 channel 的全部行为都定死了——`buf` 环形容器、`sendx`/`recvx` 两个下标、`sendq`/`recvq` 两个等待队列、`closed` 标志。发送和接收各有三条路径:能直接配给对方就直接配、有缓冲就写/读缓冲、都不行就挂到等待队列上阻塞。死锁的本质因此变得很简单:某个操作需要「对面有人」,而对面那个人永远不可能出现。再叠上 nil channel(永久阻塞)与已关闭 channel(发送 panic、接收零值)这两张行为表,以及 `select` 的随机选择,channel 这一块的题目就只剩下推导,没有记忆了。',
            outline: [
              '`hchan` 六字段:`buf` / `sendx` / `recvx` / `sendq` / `recvq` / `closed`',
              '发送三路径:有等待的接收者 → 直接交付;缓冲未满 → 写缓冲;否则挂 `sudog` 阻塞',
              '接收三路径:有等待的发送者 → 直接取;缓冲非空 → 读缓冲;否则阻塞',
              'nil 与 closed 的六种组合:发送/接收/关闭在三种状态下的确定行为',
              '死锁的判据:所有 goroutine 都阻塞且没有任何「可能被唤醒」的来源',
            ],
            pitfalls: [
              '认为 `close` 之后接收会 panic——不会,接收返回零值和 `false`;panic 的是「向已关闭的 channel 发送」和「重复关闭」。',
              '用 `len(ch)` 做同步判断——`len(ch)` 只是某一瞬间缓冲里的元素数,既不原子也不保证后续操作成功,不能当信号量用。',
              '多个发送者时由其中一个去 `close`——会 panic(重复关闭或向已关闭发送),正确做法是「只让唯一的协调者关闭」或用 `sync.Once`。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '`hchan`:六个字段决定一切',
                body: [
                  'channel 变量本身是一个指针,指向运行时的 `hchan`。所以「传 channel 是传引用」——和 map 一样,拷贝的只是一个指针。',
                  '六个关键字段的职责:',
                  '`buf`:环形缓冲区,只在有缓冲 channel 里存在(无缓冲时是 `nil`)。`make(chan T, n)` 里的 `n` 就是它的元素个数。',
                  '`sendx` / `recvx`:环形缓冲的「下一个可写位置」和「下一个可读位置」。两者独立移动,当 `sendx == recvx` 时缓冲空(或满,用 `qcount` 区分)。',
                  '`qcount`:当前缓冲里的元素个数。`len(ch)` 返回的就是它——一次无锁读,所以只是一个快照。',
                  '`sendq` / `recvq`:两个等待队列,里面挂的是 `sudog` 结构(包含了指回 G 的指针和待传数据的地址)。当发送方发现没人接收、缓冲又满时,就打包一个 `sudog` 挂到 `sendq` 上,然后 `gopark` 把自己挂起。',
                  '`closed`:关闭标志。`close` 时置 1,并唤醒 `recvq` 里所有等待者(它们会收到零值 + `false`)。',
                  '一个必要的细节:所有对 `hchan` 的操作都由 `hchan.lock` 保护。所以 channel 是线程安全的——它内部就是一把互斥锁加两个队列。这也解释了「channel 比 mutex 慢」:每次收发都要拿锁、可能挂起/唤醒 goroutine(涉及调度器)。',
                ],
              },
              {
                kind: 'diagram',
                title: '`hchan` 的内存布局与两个队列',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '`hchan`(通道本体)',
                      note: 'channel 变量只是一个指向它的指针',
                      tone: 'primary',
                      slots: [
                        { label: 'qcount', value: '2(当前缓冲元素数)', tone: 'primary' },
                        { label: 'dataqsiz', value: '4(缓冲容量)' },
                        { label: 'buf', value: '→ 环形数组 [4]T', ref: '缓冲区' },
                        { label: 'sendx', value: '2(下一个写位置)' },
                        { label: 'recvx', value: '0(下一个读位置)' },
                        { label: 'sendq', value: '→ sudog 链(等发送的 G)', ref: '阻塞的发送方' },
                        { label: 'recvq', value: '→ sudog 链(等接收的 G)', ref: '阻塞的接收方' },
                        { label: 'closed', value: '0' },
                        { label: 'lock', value: 'mutex(所有操作都要拿)', tone: 'warn' },
                      ],
                    },
                    {
                      name: '环形缓冲 `buf[4]`',
                      note: '`sendx=2`、`recvx=0` → 可读 `[0]`、`[1]`',
                      tone: 'primary',
                      slots: [
                        { label: 'buf[0]', value: 'a(可读)', tone: 'primary' },
                        { label: 'buf[1]', value: 'b(可读)', tone: 'primary' },
                        { label: 'buf[2]', value: '空(下一个写入点)' },
                        { label: 'buf[3]', value: '空' },
                      ],
                    },
                    {
                      name: '`sudog`(每个阻塞的 G 一个)',
                      note: '挂起时把「要传的数据地址」也存进来',
                      tone: 'muted',
                      slots: [
                        { label: 'g', value: '→ 阻塞的 goroutine', ref: '被挂起的 G' },
                        { label: 'elem', value: '→ 数据地址(发送/接收各指向自己)' },
                        { label: 'next', value: '→ 队列里的下一个 sudog' },
                      ],
                    },
                  ],
                  caption: '注意 `buf` 只有 4 个槽,但 `qcount` 是 2——`sendx` 和 `recvx` 的差不是元素数,必须靠 `qcount` 判断空/满。',
                },
              },
              {
                kind: 'principle',
                title: '发送的三条路径:先直接配、再写缓冲、最后阻塞',
                body: [
                  '`ch <- v` 看起来是一个操作,实际是三个分支。分支顺序本身就是设计:优先做「零拷贝直接交付」,其次用缓冲,最后才阻塞。',
                ],
                steps: [
                  {
                    title: '① 如果 `recvq` 非空——直接把值交给等待的接收者',
                    detail:
                      '这说明有 goroutine 正阻塞在「从这个 channel 收」。运行时从 `recvq` 取出一个 `sudog`,把 `v` 直接写进它的 `elem` 指向的内存(跳过缓冲区!),然后 `goready` 唤醒那个 G。这叫「直接交付」——即使是有缓冲的 channel,只要有人在等,也走这条路径,数据不经过 `buf`。',
                  },
                  {
                    title: '② 否则,如果缓冲区未满——写进 `buf[sendx]`',
                    detail:
                      '`buf[sendx] = v`,`sendx = (sendx+1) % dataqsiz`,`qcount++`。这条路径不涉及 goroutine 挂起,最快。注意无缓冲 channel 的 `dataqsiz == 0`,所以这条路径不存在——无缓冲 channel 永远只能走路径①或③。',
                  },
                  {
                    title: '③ 否则——打包 `sudog` 挂到 `sendq`,然后 `gopark`',
                    detail:
                      '把「要发的值」拷贝到 `sudog.elem`(通常是发送方栈上的地址),挂到 `sendq` 队尾,然后 `gopark` 让出 P。此时这个 G 处于 `_Gwaiting` 状态,不在任何运行队列里。直到有接收方取走它(或被 `close` 唤醒)。',
                  },
                  {
                    title: '④ 向已关闭的 channel 发送 —— 直接 panic',
                    detail:
                      '这条检查在最前面:`if closed { panic("send on closed channel") }`。注意这是 `panic`,不是 `fatal`,可以被 `recover` 捕获——但捕获了也没意义,因为数据已经丢了。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '`ch <- v` 的判定流程',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '`ch <- v`', note: '先 `lock` 住 `hchan`' },
                    { label: '`closed == 1`?', note: '是 → `panic: send on closed channel`' },
                    { label: '`recvq` 非空?', note: '是 → 直接把 v 拷进 sudog.elem,唤醒对方(跳过 buf)' },
                    { label: '缓冲未满?', note: '是 → `buf[sendx]=v; sendx++; qcount++`' },
                    { label: '都不是 → 挂 `sendq` + `gopark`', note: 'G 进入 `_Gwaiting`,直到有人接收' },
                  ],
                  caption: '顺序很关键:先判 closed、再判有人等、再判缓冲。所以「有人在等」比「缓冲有空间」优先——数据不经过缓冲区。',
                },
              },
              {
                kind: 'principle',
                title: '接收的三条路径:与发送镜像,但多一个「关闭」分支',
                body: [
                  '`v := <-ch` 与发送是对称的,但因为它要「返回值」,分支多了一个「closed 且缓冲空」的情况。',
                ],
                steps: [
                  {
                    title: '① 缓冲区非空——直接从 `buf[recvx]` 读',
                    detail:
                      '`v = buf[recvx]; recvx = (recvx+1) % dataqsiz; qcount--`。注意这里还有一个优化:如果此时 `sendq` 里有等待的发送者,运行时会顺手把它的值填进刚刚空出的槽位,并唤醒它——这样「发送方」不用等下一次接收,吞吐提升明显。',
                  },
                  {
                    title: '② 缓冲空且有等待的发送者——直接取它的值',
                    detail:
                      '从 `sendq` 取出一个 `sudog`,把它的 `elem` 里的值拷给接收方,然后 `goready` 唤醒它。这条路径同样跳过缓冲区。无缓冲 channel 的接收走的就是这条(或路径③)。',
                  },
                  {
                    title: '③ 只有「closed 且缓冲空」才走关闭分支',
                    detail:
                      '返回零值和 `false`(双返回值形态)。注意顺序:先看缓冲有没有数据,再看 closed——所以「关闭前已经发进去的数据仍然能读出来」,这是很多人的盲点。',
                  },
                  {
                    title: '④ 都不满足——挂 `recvq` 阻塞',
                    detail:
                      '打包 `sudog`(带接收变量的地址)挂到 `recvq`,然后 `gopark`。被 `close` 唤醒时,`sudog` 会被标记为「关闭导致的唤醒」,于是 `goready` 后返回零值 + `false`。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: '无缓冲与有缓冲:差的不只是容量',
                body: [
                  '`make(chan T)` 与 `make(chan T, 1)` 在语义上有一个关键差别:无缓冲 channel 是「同步交接」,有缓冲是「异步投递」。',
                  '无缓冲:发送方必须等到接收方就位才能返回。所以它天然是一个同步点——`ch <- v` 返回时,可以保证「对方已经拿到了 v」。这个性质叫「happens-before」:`v` 的写入一定对接收方可见。',
                  '有缓冲:发送方只要缓冲没满就立刻返回,不等接收方。所以它把「同步」降级成了「解耦」——生产者和消费者的速率可以短暂不匹配。代价是「发送成功」不再意味着「对方收到了」;如果要保证,得再额外同步一次。',
                  '所以选择判据是:要「交接即确认」用无缓冲;要「削峰/解耦」用有缓冲;要「限流」用容量 1 或 N 的有缓冲(容量就是允许堆积的量)。而「容量设多大」是个真问题:太小起不到削峰作用,太大会把内存撑爆并且掩盖下游的问题。',
                ],
              },
              {
                kind: 'diagram',
                title: 'nil / 正常 / 已关闭:九种操作的结果表',
                diagram: {
                  type: 'matrix',
                  head: ['操作', '`nil` channel', '正常 channel', '已关闭 channel', '记忆点'],
                  cols: ['`nil` channel', '正常 channel', '已关闭 channel', '记忆点'],
                  rows: [
                    ['发送 `ch <- v`', '永久阻塞', '成功或阻塞', 'panic', '「关了的不能发」'],
                    ['接收 `<-ch`', '永久阻塞', '成功或阻塞', '立刻返回零值', '「关了的能读,读到零值」'],
                    ['接收 `v, ok := <-ch`', '永久阻塞', '`ok=true`', '`ok=false`', '「用 ok 判关闭」'],
                    ['`close(ch)`', 'panic', '成功(仅一次)', 'panic(重复关闭)', '「nil 不能关,只能关一次」'],
                    ['`len(ch)` / `cap(ch)`', '0 / 0', '当前元素数 / 容量', '剩余可读数 / 容量', '「只是快照,不能当同步用」'],
                    ['`for v := range ch`', '永久阻塞', '持续接收', '读完缓冲后正常结束', '「range 靠 close 收尾」'],
                  ],
                  caption: '只有两个 panic:向已关闭的 channel 发送、重复 close。其余全是「阻塞」或「返回零值」。把这张表背下来,channel 相关选择题基本不会错。',
                },
              },
              {
                kind: 'code',
                title: 'nil channel 的一个正经用途:动态禁用 `select` 分支',
                lang: 'go',
                code:
                  "package main\n\nimport \"fmt\"\n\nfunc main() {\n\ta := make(chan int)\n\tvar b chan int // nil\n\n\tgo func() {\n\t\tfor i := 0; i < 3; i++ {\n\t\t\ta <- i\n\t\t}\n\t\tclose(a)\n\t}()\n\n\t// b 是 nil,所以 case <-b 永远不会就绪 —— 相当于「禁用这个分支」\n\tfor i := 0; i < 5; i++ {\n\t\tselect {\n\t\tcase v, ok := <-a:\n\t\t\tif !ok {\n\t\t\t\tfmt.Println(\"a 已关闭,把 a 置 nil 以禁用该分支\")\n\t\t\t\ta = nil\n\t\t\t\tcontinue\n\t\t\t}\n\t\t\tfmt.Println(\"收到\", v)\n\t\tcase v := <-b:\n\t\t\tfmt.Println(\"这条永远不会打印\", v)\n\t\t}\n\t}\n}\n",
                caption: '这个模式叫「nil channel 惯用法」:把已完成的 channel 置 nil,`select` 就自动忽略它——不需要额外的 `if` 判断,也不需要删分支。',
                notes: [
                  { line: 'var b chan int', text: 'nil channel 的收发都会永久阻塞,所以 `select` 永远不会选它。' },
                  { line: 'a = nil', text: '读到关闭后把 `a` 置 nil,下一轮 `select` 就只剩 `case <-b`(也不就绪)——于是永久阻塞,这个例子里的 for 会卡住。实际代码里应该是「两个都完成才退出」。' },
                  { line: 'case v := <-b:', text: '如果 b 不是 nil,这个分支就可能被选中。这正是「动态增删监听源」的实现方式。' },
                ],
              },
              {
                kind: 'concept',
                title: '`close` 的语义与「谁该关闭」',
                body: [
                  '`close` 做了三件事:置 `closed = 1`、唤醒 `recvq` 里所有等待者(它们返回零值 + `false`)、唤醒 `sendq` 里所有等待者(它们 panic)。',
                  '第一条规则:只有发送方(或唯一的生产者)有权关闭,接收方永远不该关闭。因为接收方无法知道「还有没有别的发送者」,贸然关闭会导致别人发送时 panic。',
                  '第二条规则:多个发送者时,不要由发送者去关闭。标准解法有两种:① 引入一个「协调者」,由它收集所有发送者的完成信号后再关闭;② 用 `sync.Once` 包装 `close`,但这只防重复关闭,不防「关闭后还有人发」——所以严格来说只有方案①安全。',
                  '第三条规则:关闭不是必须的。只有当接收方需要用 `range` 或 `v, ok` 感知「结束了」时才需要 close;如果接收方知道确切的消息数量,直接收 N 次即可。「不 close 会内存泄漏」是错误的说法——channel 本身会被 GC,只有「阻塞在 channel 上的 goroutine」才会泄漏。',
                  '最后一个细节:`close` 之后,缓冲里剩余的数据仍然可以读出。所以 `for v := range ch` 会先把缓冲读空,然后才退出——这保证「关闭前发出的数据不会丢」,是 channel 作为「任务队列」的基础保证。',
                ],
              },
              {
                kind: 'concept',
                title: '死锁的四种形态:都是「对面永远不来」',
                body: [
                  'Go 运行时有死锁检测:当所有 goroutine 都阻塞、且没有任何「可能由外部事件唤醒」的来源(定时器、网络、系统调用)时,会报 `fatal error: all goroutines are asleep - deadlock!`。',
                  '形态一:自己发自己收。`ch := make(chan int); ch <- 1`——无缓冲,发送需要接收方,而接收方就是自己,永远到不了下一行。这是最常见的死锁。',
                  '形态二:忘记启动消费者。生产者 goroutine 阻塞在发送上,主 goroutine 阻塞在 `wg.Wait()` 或 `<-done` 上。两者互等。',
                  '形态三:关闭后仍有人发送。虽然这报的是 panic 不是 deadlock,但效果一样——程序挂了。',
                  '形态四:锁与 channel 交叉。A 持锁等 channel,B 持 channel 等锁——这种「循环等待」是经典死锁,和数据库的死锁同构。',
                  '还有一类「看起来像死锁但不是」的情况:部分 goroutine 阻塞,但另有 goroutine 在跑——运行时不会报错,但那些阻塞的 goroutine 就是泄漏。这就是 「runtime 能检测到哪些死锁」:它只能检测「全体阻塞」,单个 goroutine 泄漏它检测不到,只能靠 pprof 的 `goroutine` profile 看数量与栈。',
                ],
              },
              {
                kind: 'diagram',
                title: '死锁检测的判据与盲区',
                diagram: {
                  type: 'split',
                  left: {
                    title: '能检测到(报 fatal error)',
                    tone: 'bad',
                    items: [
                      '所有 goroutine 都处于阻塞态',
                      '没有 timer、网络 poller、系统调用在等',
                      '典型:`ch <- 1` 后没有任何接收',
                      '两个 goroutine 互相等对方的 channel',
                      '报错信息会打印所有 goroutine 的栈',
                    ],
                  },
                  right: {
                    title: '检测不到(静默泄漏)',
                    tone: 'warn',
                    items: [
                      '只有一个 goroutine 阻塞,其他在跑',
                      '有 timer 在跑(哪怕很远)',
                      '有网络连接或文件 IO 未完成',
                      '阻塞在 mutex 上(runtime 不管锁的死锁)',
                      '只能靠 pprof `goroutine` profile 发现',
                    ],
                  },
                },
                caption: '所以「程序没报 deadlock」不等于「没有泄漏」。线上排查必须看 goroutine 数量是否随请求量线性增长。',
              },
              {
                kind: 'concept',
                title: '`select` 的实现:随机 + 两轮扫描',
                body: [
                  '`select` 的语义有三条,而实现方式决定了「为什么顺序不确定」。',
                  '语义一:多个 case 同时就绪时,随机选一个。这是规范明确规定的——运行时会先把所有 ready 的 case 收集起来,再用 `fastrand` 随机挑一个。目的是防止「某个 case 永远饿死」。',
                  '语义二:有 `default` 时,若没有 case 就绪,立刻执行 `default`(非阻塞)。没有 `default` 时,若没有 case 就绪,当前 G 阻塞,并被挂到所有 case 的等待队列上。',
                  '语义三:阻塞后被任一 case 唤醒,会把该 G 从其他 case 的队列里摘掉。这就是为什么 `select` 的阻塞开销比单个 channel 高:它要同时在 N 个队列上登记,醒来后还要清理。',
                  '实现细节:`select` 会做两轮扫描。第一轮检查「有没有能立刻完成的 case」(比如缓冲非空可读、没人等可发)——这一轮不阻塞;第二轮若一个都没有,才把所有 case 的 `sudog` 挂上并 `gopark`。所以「多个 case 同时就绪」的随机性体现在第一轮的收集阶段。',
                ],
              },
              {
                kind: 'analogy',
                title: 'channel 像「传送带 + 两个等候区」',
                text:
                  '有缓冲 channel 像一条传送带:生产者往带子上放件(发送),消费者从带子上取件(接收),带子上的位置数就是容量 `cap`。带子上摆满的位置是「当前的货」(`qcount`),`sendx` 是「下一个空位的编号」,`recvx` 是「下一件要取的编号」——两个编号各走各的,转圈用,所以叫环形缓冲。如果消费者来得比生产者快,带子空了,消费者只能站在接收等候区(`recvq`);如果生产者来得太快,带子满了,生产者站在发送等候区(`sendq`)。关键的一幕是:当消费者来取件时,如果发送等候区已经有人站着,他不会等带子转一圈,而是直接从那个人手里接过件(直接交付),同时让那个人回去干活——这就是「有人在等时数据不走缓冲区」。`close` 相当于在传送带入口挂一块「停止投料」的牌子:之后还能把带子上剩的货取完,但再有人来投料就会被赶出去(`panic`),而重复挂第二块牌子也是错(`panic`)——所以「挂停止牌」这件事,只能由唯一的那个人做。',
                mapping: [
                  { real: '传送带上的位置数', tech: '`cap(ch)` / `dataqsiz`' },
                  { real: '当前带子上的货', tech: '`qcount`(`len(ch)` 返回它)' },
                  { real: '下一个空位编号 / 下一件货编号', tech: '`sendx` / `recvx`(环形取模)' },
                  { real: '接收等候区 / 发送等候区', tech: '`recvq` / `sendq`(挂 `sudog`)' },
                  { real: '直接从等候者手里接货,不等传送带', tech: '直接交付,跳过 `buf`' },
                  { real: '挂「停止投料」牌', tech: '`close`:唤醒所有等待者' },
                  { real: '牌挂上后还能取完剩下的货', tech: '关闭后仍可读出缓冲里的数据' },
                  { real: '只能由唯一的投料负责人挂牌', tech: '只有发送方/唯一生产者可以 `close`' },
                ],
                limit: '类比不成立的地方:传送带是物理的,「取件」和「投料」不会同时发生;而 channel 内部有锁,发送和接收是互斥的,所以「同一时刻只有一个操作在改 `hchan`」。另外「无缓冲 channel」相当于传送带长度为 0——必须投料的人和取件的人同时到位才能交接,这就是「同步交接」的含义。',
              },
              {
                kind: 'compare',
                title: 'channel / mutex / atomic:该用哪个',
                head: ['维度', 'channel', '`sync.Mutex`', '`sync/atomic`'],
                cols: ['channel', '`sync.Mutex`', '`sync/atomic`'],
                rows: [
                  ['传递语义', '「消息传递」,把数据所有权交出去', '「保护共享状态」,大家都能读', '「单个变量/计数的无锁更新」'],
                  ['开销', '最高:锁 + 可能挂起/唤醒 goroutine', '中等:无竞争时一次 CAS,有竞争时挂起', '最低:单条 CPU 原子指令'],
                  ['阻塞行为', '缓冲满/空时阻塞,天然背压', '争不到锁时自旋后挂起', '不阻塞(CAS 失败就重试)'],
                  ['适用场景', '流水线、任务分发、信号/广播、限流', '保护一段临界区(多个字段要保持一致)', '计数器、标志位、指针替换(`atomic.Value`)'],
                  ['典型误用', '用它做「共享内存」,导致死锁与泄漏', '锁粒度太大,把 IO 放进临界区', '用多个原子操作组合「以为整体原子」'],
                ],
                note: 'Go 的官方建议是「不要通过共享内存来通信,而要通过通信来共享内存」——但这不等于「禁用 mutex」。判据是:如果你要保护的是「一段不变量」,用 mutex;如果你要传的是「一件事」,用 channel。',
              },
              {
                kind: 'question',
                title: 'Q17 · nil channel / 已关闭 channel 各种操作的行为表？',
                questionId: 'go-02-Q17',
                intent: 'nil / 已关闭 channel 的行为表,这是 channel 最硬的知识点。',
                points: [
                  'nil channel:发送、接收、`range` 全部永久阻塞;`close` 会 panic;`len`/`cap` 返回 0。',
                  '已关闭 channel:发送 panic;接收立刻返回零值(双返回值时 `ok=false`);重复 `close` panic;`range` 读完缓冲后正常结束。',
                  '用途:nil channel 可以用来「动态禁用 `select` 分支」;已关闭 channel 的零值返回是「用 close 做广播」的基础。',
                ],
                depth: '为什么 nil channel 阻塞反而是特性? 因为它让 `select` 可以「条件性忽略某个分支」——把 channel 置 nil,那个 `case` 就永远不就绪,不需要写 `if` 也不用改结构。这是官方推荐的惯用法。',
              },
              {
                kind: 'question',
                title: 'Q19 · select 的行为和底层实现？',
                questionId: 'go-02-Q19',
                intent: '`select` 的行为与底层实现:随机性、default、以及为什么开销比单 channel 高。',
                points: [
                  '三条语义:多 case 就绪时随机选一个(防饿死);有 `default` 且无就绪 case 时立刻走 `default`;无 `default` 且无就绪 case 时阻塞,并同时挂到所有 case 的等待队列。',
                  '两轮扫描:第一轮找「立刻能完成」的 case(不阻塞);一个都没有才在第二轮挂 `sudog` 并 `gopark`。',
                  '开销来源:要在 N 个队列上登记,醒来后还要把 G 从其余 N-1 个队列摘掉——所以「在热循环里用大 `select`」是有成本的。',
                ],
                followup: '「`select` 里对 nil channel 的 case 会被选中吗?」 不会,永远不就绪。所以 `select` 天然的「可选分支」写法就是把对应 channel 置 nil。',
              },
              {
                kind: 'question',
                title: 'Q38 · 如何优雅地关闭 channel？多个发送者怎么办？',
                questionId: 'go-index-Q38',
                intent: '如何优雅关闭 channel,尤其是多发送者场景。',
                points: [
                  '原则:只有发送方能关闭;接收方不能关(不知道还有没有别的发送者);多发送者时谁都不要直接关。',
                  '单发送者:发送完直接 `close`,接收方用 `for range` 或 `v, ok` 感知结束。',
                  '多发送者:引入「协调者」——每个发送者完成后向一个 `done` channel 报告,协调者收齐后关闭数据 channel;或用 `sync.WaitGroup` + 一个专门的 goroutine 执行 `close`。`sync.Once` 只能防重复 close,防不了「关闭后还有人发」。',
                ],
                depth: '一个更简单的替代方案:根本不用 close。接收方如果知道消息总数,直接收 N 次;或者用 `context.Context` 做取消信号,数据 channel 不关闭——这样完全避免了「谁关」的问题。',
              },
              {
                kind: 'question',
                title: 'Q42 · 关于 channel 的 happens-before 规则有哪些？',
                questionId: 'go-index-Q42',
                intent: 'channel 提供的 happens-before 保证,以及「哪些同步是它给不了的」。',
                points: [
                  '发送先于接收:第 k 次发送 happens-before 第 k 次接收完成——发送方在 `ch <- v` 之前的写入,对「成功收到 v 的那个 goroutine」一定可见。这就是「用 channel 传数据就不用额外加锁」的依据。',
                  '关闭先于读到零值:`close(ch)` happens-before 「因关闭而返回零值的接收」——所以「关闭前发出的数据不会丢」是有保证的。',
                  '接收先于第 k+C 次发送:容量为 `C` 的有缓冲 channel 里,第 k 次接收 happens-before 第 k+C 次发送完成——这是「缓冲 channel 可以当信号量限流」的依据。',
                ],
                depth: '它给不了的保证:① 「发送方看到接收方之后做的事」需要反向信号(另一次收发或 mutex);② 「多个 goroutine 对同一变量的写入顺序」——happens-before 是偏序,不相关的操作仍然可能并发。所以「用 channel 传引用就能免锁」是错的:channel 只保证传递那一刻的顺序,后续共享访问照样要同步。',
              },
            ],
          },
        },
        {
          id: 'sync-package',
          title: 'sync 包与并发正确性',
          kind: 'concept',
          sources: [
            { topic: 'go-02', chapters: ['sync 包'] },
            { topic: 'go-index', chapters: ['并发编程'], slice: [22, 32] },
          ],
          content: {
            intro:
              '`sync` 包最容易被轻视,因为它 API 太简单——`Lock`/`Unlock` 谁都会写。但面试问的从来不是「怎么用」,而是「为什么」:`Mutex` 为什么要自旋、正常模式和饥饿模式怎么切换、为什么不可重入、`RWMutex` 在什么场景下比 `Mutex` 还慢、`WaitGroup` 的 `Add` 为什么必须在 `go` 之前。这些问题的答案都在同一个地方:这些类型都是「用原子操作 + 队列 + 状态位」手写的,理解了它们的实现,你就能判断「我的代码会不会有竞态」。最后补上 `Pool` 的 per-P 缓存与 `atomic` 的适用边界,并发正确性这一块就闭环了。',
            outline: [
              '`Mutex` 两模式:正常模式允许新来的抢(吞吐优先),饥饿模式强制 FIFO(公平优先)',
              '自旋的四个条件:多核、本地队列为空、自旋次数未超、`GOMAXPROCS>1`',
              '不可重入:`Mutex` 只有一个 `state` 字段,不记录持有者,重入必死锁',
              '`WaitGroup.Add` 必须在 `go` 之前:否则 `Wait` 可能在 `Add` 之前返回',
              '`Pool` 是「临时对象复用」:随时可能被 GC 清空,不能当缓存',
            ],
            pitfalls: [
              '`defer mu.Unlock()` 写在 `mu.Lock()` 之前——两者顺序反了会立刻死锁,而且 `go vet` 不报。',
              '把 `sync.Mutex` 按值传给函数或放进结构体后被复制——复制后是两个锁,保护失效;`go vet` 能检出 `copylocks`。',
              '`WaitGroup.Add` 放在 goroutine 内部——`Wait` 可能在 `Add` 之前就返回,提前退出,漏掉所有任务。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '`Mutex` 的两个模式:为什么不只用 FIFO',
                body: [
                  '`Mutex` 只有两个字段:`state int32` 和 `sema uint32`。`state` 是一个位图,最低位是「已加锁」,第二位是「已唤醒」,第三位是「饥饿模式」,第四位是「有新 goroutine 在等」;高 29 位是等待者数量。`sema` 是信号量,用来挂起/唤醒等待者。',
                  '正常模式(默认)的规则是「允许插队」。当一个 G 释放锁时,它会先唤醒等待队列的队头,但不直接把锁交给它——队头被唤醒后要和其他「新来的、还没排队的」G 一起竞争。新来的 G 正在 CPU 上跑,天然有优势,所以经常能抢赢。好处是吞吐高:锁在 CPU 上被立刻用起来,不用等调度;坏处是不公平:队头的 G 可能反复抢输,饿死。',
                  '饥饿模式的规则是「排队交付」。当某个等待者等了超过 1ms,`Mutex` 就切换成饥饿模式:释放锁时直接把锁的所有权交给队头,并且新来的 G 一律不许抢(直接排队)。这样队头必然拿到锁,不会饿死。当队列清空,或者队尾的等待时间已经小于 1ms,就切回正常模式。',
                  '为什么需要一个阈值而不是永远 FIFO? 因为纯 FIFO 的代价是「唤醒-调度延迟」——每次释放锁都要等被唤醒的 G 真正被调度到 CPU 上,这中间可能几十微秒,而在这段时间里锁是空闲的。正常模式让锁「无缝」被下一个执行者接手,把这段延迟藏起来了。所以这是一个明确的权衡:用一点点不公平,换掉大部分唤醒延迟。',
                ],
              },
              {
                kind: 'diagram',
                title: '`Mutex` 的三态与迁移',
                diagram: {
                  type: 'state',
                  states: [
                    '未锁定(`state & mutexLocked == 0`)',
                    '正常模式:新来的 G 可以抢',
                    '饥饿模式:严格 FIFO,新来的不许抢',
                  ],
                  transitions: [
                    '`Lock` 抢不到(自旋失败)→ 入队,等待者 +1',
                    '队头等待 > 1ms → 置饥饿位',
                  ],
                  back: { from: 2, to: 1, label: '队列清空,或队尾等待 < 1ms' },
                  caption: '正常模式追求吞吐(允许插队),饥饿模式追求公平(强制 FIFO)。「1ms」这个阈值就是两种目标的切换开关——短于 1ms 的等待不值得牺牲吞吐去保证公平。',
                },
              },
              {
                kind: 'principle',
                title: '自旋的四个条件:少一个都不许转',
                body: [
                  '「自旋」是指:抢不到锁时不立刻挂起,而是在 CPU 上空转几圈再试——因为挂起/唤醒的代价是微秒级,而锁可能几十纳秒就释放了。但自旋只在「大概率很快能拿到」时才划算,所以有四个必要条件。',
                ],
                steps: [
                  {
                    title: '① `GOMAXPROCS > 1`:单核不许自旋',
                    detail:
                      '单核上自旋毫无意义:持锁的 G 正需要 CPU 才能释放锁,而你占着 CPU 空转,它永远跑不了。所以单核场景下自旋是纯粹的浪费。',
                  },
                  {
                    title: '② 当前 P 的本地队列为空',
                    detail:
                      '如果本地队列里还有别的 G 等着跑,你自旋占着 CPU 就是「该让别人跑的时候你赖着不走」。所以运行时先检查 `runqempty`,非空就直接放弃自旋去排队。',
                  },
                  {
                    title: '③ 自旋次数未超过上限(4 次)',
                    detail:
                      '`active_spin = 4`,即最多自旋 4 轮。超过就认为「这个锁短期不会释放」,挂起更划算。这是用「固定次数」而不是「固定时间」来估算——简单且足够。',
                  },
                  {
                    title: '④ 自旋的 M 数量不超过「运行中 P 数 / 2」',
                    detail:
                      '如果一半以上的 P 都在自旋等锁,说明锁竞争已经很激烈,再让新的 M 自旋只会加剧 CPU 浪费。所以用 `sched.nmspinning` 做全局配额。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: '为什么 `Mutex` 不可重入、不可复制',
                body: [
                  '这两个「不可」不是设计上的疏忽,而是刻意的取舍,而且都能从实现推出来。',
                  '不可重入的原因:`Mutex` 的 `state` 里没有记录「谁持有」——它只有一个「已加锁」的位。所以当同一个 goroutine 第二次 `Lock` 时,它看到的是「已加锁」,于是把自己挂到等待队列里——而能解锁的正是它自己,它却已经睡着了。这就是死锁。',
                  '为什么不做成可重入? 因为「可重入」需要一个「持有者 ID + 重入计数」,而 Go 的 goroutine 没有稳定的对外 ID(`goid` 是运行时内部的,不保证语义);而且可重入会让「锁的语义」变得模糊——你无法从代码上判断「这一层解锁会不会真的解锁」。所以 Go 的选择是:要么用可重入的场景就换设计,要么就严格保证「加锁与解锁成对且在同一层」。',
                  '不可复制的原因更直接:`Mutex` 的状态就是一个整数,复制它就是复制了「已加锁」这个状态。于是副本和原本各自认为自己持有锁,但它们保护的是不同的互斥域——保护彻底失效,而且不会报错。所以 `sync` 包的所有类型都内嵌了 `noCopy`(一个带 `Lock` 方法的空结构体),配合 `go vet` 的 `copylocks` 检查器在编译期抓出来。',
                  '实践纪律:含 `sync` 类型的结构体一律用指针传递;`sync` 类型永远不要作为结构体字段被「按值」赋值;嵌入时用 `*sync.Mutex`(虽然 `sync.Mutex` 本身就该按地址用)。',
                ],
              },
              {
                kind: 'concept',
                title: '`RWMutex`:读多写少才划算,否则更慢',
                body: [
                  '`RWMutex` 的卖点是「多个读可以并行」。但它的实现比 `Mutex` 复杂得多:内部有一个 `Mutex` 保护计数器、一个 `readerCount`(高 30 位是读者数,最低位是「有写者在等」)、一个 `readerWait`、还有一个信号量。所以「加一次读锁」的成本明显高于「加一次 `Mutex`」。',
                  '关键陷阱是「写者饥饿保护」。当一个写者到来时,它会先把 `readerCount` 的最低位取反,让后续的 `RLock` 全部阻塞——这样可以保证写者不会被源源不断的读者饿死。但副作用是:如果读操作里又有嵌套的读(或者读临界区很长),就可能形成「写者在等读者,读者在等写者」的死锁。',
                  '另一个陷阱是「递归读锁」。`RLock` 是不可重入的:如果同一个 goroutine 在持有读锁时再次 `RLock`,而中间有个写者在等,那么第二次 `RLock` 会阻塞;而第一次读锁永远不会释放(因为被阻塞住了)——死锁。这在「函数内部调用了另一个也会 `RLock` 的函数」时极易发生。',
                  '所以判据是:只有在「读操作占绝对多数(比如 10:1 以上)、且读临界区短、且没有嵌套读」时,`RWMutex` 才比 `Mutex` 快。其它情况一律用 `Mutex`——它的实现简单、可预测,而且正常模式下的插队机制已经能提供不错的吞吐。',
                ],
              },
              {
                kind: 'diagram',
                title: '`RWMutex` 与 `Mutex` 的实际表现对照',
                diagram: {
                  type: 'matrix',
                  head: ['场景', '`sync.Mutex`', '`sync.RWMutex`', '建议', '原因'],
                  cols: ['`sync.Mutex`', '`sync.RWMutex`', '建议', '原因'],
                  rows: [
                    ['读:写 = 10:1,临界区短', '好', '更好', '用 `RWMutex`', '读并行是真实收益'],
                    ['读:写 = 1:1', '好', '差', '用 `Mutex`', '写者频繁触发「阻塞新读者」,读并行被打断'],
                    ['临界区很长(含 IO)', '差', '更差', '缩小临界区', '任何锁都不该包住 IO'],
                    ['读里有嵌套 `RLock`', '安全', '可能死锁', '用 `Mutex`', '`RLock` 不可重入 + 写者等待'],
                    ['需要「读时改一点」', '可以', '不行', '用 `Mutex`', '`RLock` 下写是数据竞争'],
                  ],
                  caption: '注意第三行:很多人以为「读多写少就该用 RWMutex」,但只要临界区里有一次网络调用,两种锁都是灾难——锁的粒度问题比锁的类型问题重要得多。',
                },
              },
              {
                kind: 'principle',
                title: '`WaitGroup` 的四个错误用法',
                body: [
                  '`WaitGroup` 的 API 只有三个方法,但错误用法有四种,而且每种都能在生产上造成「任务静默丢失」或 panic。',
                ],
                steps: [
                  {
                    title: '① `Add` 放在 goroutine 内部 —— 最危险',
                    detail:
                      '`go func(){ wg.Add(1); ...; wg.Done() }()` 与 `wg.Wait()` 之间存在竞态:如果 `Wait` 先执行,此时计数还是 0,它会立刻返回,主 goroutine 提前退出,所有任务被丢弃。正确做法是 `Add` 在 `go` 之前调用(在父 goroutine 里)。',
                  },
                  {
                    title: '② `Done` 次数与 `Add` 不匹配 —— panic 或永久阻塞',
                    detail:
                      '`Done` 多于 `Add` 会 panic(`negative WaitGroup counter`);少则 `Wait` 永久阻塞。所以 `Done` 一律用 `defer wg.Done()` 放在 goroutine 开头——这样即使 panic 也能减一次。',
                  },
                  {
                    title: '③ 复用未归零的 `WaitGroup`',
                    detail:
                      '`WaitGroup` 可以被复用,前提是「上一次的 `Wait` 已经全部返回」。如果在还有 goroutine 没 `Done` 时就再次 `Add`,会与 `Wait` 竞态。所以「复用」只适合「顺序的多轮」场景,不能交叉。',
                  },
                  {
                    title: '④ 忘记 `Wait`(或没有其他同步手段)—— 任务被丢弃',
                    detail:
                      '最常见的形态是「起了后台 goroutine 干日志上报」,而 `main` 直接返回——进程 `exit(0)` 不会等任何 goroutine。必须显式 `wg.Wait()`,或者在服务退出流程里等它。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: '`Once` 与 `Pool`:两个「看起来简单实则微妙」的类型',
                body: [
                  '`Once.Do(f)` 保证 `f` 在整个进程生命周期内只执行一次,即使多个 goroutine 并发调用。实现是「原子快路径 + 互斥慢路径」:先原子读 `done` 位,为 1 就直接返回(不加锁);否则加锁、再检查一次(`double-check`)、执行 `f`、置 `done`。所以已经执行过之后,后续调用是纯原子读,几乎零成本。',
                  '`Once` 的两个坑。① 如果 `f` 里 panic,`done` 已经被置位——后续调用会直接返回,认为「已完成」,而实际上什么也没做成。② 递归调用 `Do` 会死锁(同一个 `Once` 在 `f` 内再次 `Do`)。',
                  '`Pool` 是「临时对象复用」,不是缓存。它的结构是「每个 P 一个 `private`(只能本 P 取)+ 一个 `shared` 队列(本 P 可加锁访问)+ 全局的 `victim` 缓存(上一轮 GC 留下的)」。`Get` 的顺序是:`private` → `shared` → 其他 P 的 `shared`(偷) → `victim` → 新建。',
                  '为什么不能当缓存? 因为每次 GC 都会清空 `Pool`(元素被移到 `victim`,下一轮 GC 再清掉)。所以「放进去的东西可能在任意时刻消失」——这对「复用缓冲区」没问题(没了就新建),但对「缓存数据库连接/计算结果」是致命的。官方文档明确写着:`Pool` 适合「临时对象,复用能减少分配」,不适合「有状态的长期缓存」。',
                ],
              },
              {
                kind: 'diagram',
                title: '`Pool.Get` 的五级查找',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '`p.private`(本 P 私有)', note: '无锁,最快;取走后置 nil' },
                    { label: '`p.shared`(本 P 共享队列)', note: '要加 `poolLocal` 的锁;取队尾(减少竞争)' },
                    { label: '偷其他 P 的 `shared`', note: '随机挑一个 P,取它的队头' },
                    { label: '`victim`(上一轮 GC 的幸存者)', note: '只在这一轮 GC 后短暂可用' },
                    { label: '都没有 → 调用 `New()` 新建', note: '所以 `New` 必须能返回可用对象' },
                  ],
                  caption: '注意第四步:`victim` 的存在是为了让「刚被 GC 清掉的池」还有一次机会被复用——它把「GC 后立刻大量新建」的尖峰削平了。',
                },
              },
              {
                kind: 'concept',
                title: '`atomic` 的边界:单次操作原子 ≠ 整体原子',
                body: [
                  '`atomic` 提供的是「一个内存位置的读写是原子的,并且有内存序保证」。它比锁快得多(单条 CPU 指令),但它只能保护「一个值」。',
                  '最常见的误用是「用多个原子操作拼一个不变量」。比如「读 `a` 和 `b`,要求它们相等」——两个 `atomic.Load` 分别原子,但读之间可能有别的 goroutine 修改,于是你读到的是「半个旧值 + 半个新值」。这类 bug 极难复现,因为它依赖时序。判据是:如果你需要「多个值同时一致」,就必须用锁。',
                  '另一个误用是「用 `atomic` 做计数器然后 `if v == 0` 判断」。`atomic.AddInt64` 返回的是「加之后的值」,这是原子的;但「先 `Load` 再判断再 `Store`」这三步合起来不是原子的——必须用 `CAS`(`CompareAndSwap`)循环。',
                  '`atomic.Value` 有两个约束:`Store` 的类型必须与之前一致(否则 panic),且不能存 nil。所以它适合「读多写少的配置/快照替换」:写方构造一个新快照 `Store` 进去,读方 `Load` 拿到一个不可变对象——这是「写时复制 + 原子指针替换」的经典模式,完全不需要锁。',
                  '最后一条纪律:`atomic` 操作的对象必须有对齐保证(64 位类型在 32 位平台上要 8 字节对齐),否则会 panic。用 `atomic.Int64` 这类包装类型(Go 1.19+)可以自动保证——它们在结构体里会强制对齐,这也是推荐用法。',
                ],
              },
              {
                kind: 'code',
                title: '`atomic` 的三种正确姿势与一种错误姿势',
                lang: 'go',
                code:
                  "package main\n\nimport (\n\t\"fmt\"\n\t\"sync\"\n\t\"sync/atomic\"\n)\n\ntype Counter struct {\n\tn atomic.Int64 // 1.19+ 包装类型,自动对齐\n}\n\nfunc (c *Counter) Inc()        { c.n.Add(1) }\nfunc (c *Counter) Load() int64 { return c.n.Load() }\n\n// 快照替换:读多写少的最佳模式\ntype Config struct{ Timeout int }\n\ntype Holder struct {\n\tv atomic.Value // 存 *Config,必须始终同一类型\n}\n\nfunc (h *Holder) Set(c *Config) { h.v.Store(c) }\nfunc (h *Holder) Get() *Config {\n\tif c, ok := h.v.Load().(*Config); ok {\n\t\treturn c\n\t}\n\treturn &Config{Timeout: 3}\n}\n\nfunc main() {\n\tvar c Counter\n\tvar wg sync.WaitGroup\n\tfor i := 0; i < 100; i++ {\n\t\twg.Add(1)\n\t\tgo func() { defer wg.Done(); c.Inc() }()\n\t}\n\twg.Wait()\n\tfmt.Println(c.Load()) // 100\n\n\tvar h Holder\n\th.Set(&Config{Timeout: 5})\n\tfmt.Println(h.Get().Timeout) // 5\n\n\t// 错误姿势:Load 后判断再 Store,三步不是原子的\n\tvar flag atomic.Bool\n\tif !flag.Load() { // 另一个 goroutine 可能在这里插进来\n\t\tflag.Store(true)\n\t}\n\t// 正确姿势:CompareAndSwap\n\t_ = flag.CompareAndSwap(false, true)\n}\n",
                caption: '最后两段是本节的重点:多个原子操作组合起来不是原子的,必须用 `CAS`。',
                notes: [
                  { line: 'n atomic.Int64', text: 'Go 1.19 的包装类型,内部会做对齐填充,避免 32 位平台上的对齐 panic。' },
                  { line: 'h.v.Store(c)', text: '`atomic.Value` 的 `Store` 要求「类型始终一致」,且不能存 nil——所以这里存的是 `*Config` 指针。' },
                  { line: 'flag.CompareAndSwap(false, true)', text: '这是「读-判断-写」的原子版本:只有当前值是 false 时才写成 true,否则返回 false。循环调用就是无锁的「检查并设置」。' },
                ],
              },
              {
                kind: 'concept',
                title: '`Cond` / `errgroup` / `singleflight`:三个「按需选」的工具',
                body: [
                  '`sync.Cond` 是「条件变量」,用途是「等待某个条件成立」。它的 `Wait` 会原子地释放锁并挂起,被 `Signal`/`Broadcast` 唤醒后重新加锁。它比 channel 好的地方是「可以广播给所有等待者」且「不占缓冲」;比 channel 差的地方是「容易写错」——`Wait` 必须在 `for` 循环里判断条件(防止虚假唤醒与惊群)。现代 Go 里绝大多数「等条件」的场景都能用 channel 替代,所以 `Cond` 用得越来越少。',
                  '`errgroup.Group` 是「一组 goroutine + 任一失败即取消」。它内部是 `sync.WaitGroup` + `context.WithCancel` + 一个 `sync.Once` 记录「第一个错误」——`Wait` 返回第一个非 nil 的 error,并已经取消了 context。写并发任务(尤其是「并行调多个下游,任一失败就整体失败」)时它几乎是标配。',
                  '`singleflight.Group` 是「同一时刻相同 key 只执行一次」。典型用途是「缓存击穿保护」:1000 个请求同时查同一个不存在的 key,只有 1 个真的去查库,其余 999 个等待并共享结果。注意它只合并「时间上重叠」的调用,不缓存结果——所以它是「去重」而不是「缓存」。',
                  '这三者的选择判据很简单:要「等条件」且需要广播 → `Cond`;要「并发 + 错误传播 + 取消」→ `errgroup`;要「同 key 请求合并」→ `singleflight`。其它情况优先用 channel 和 `Mutex`,因为它们的语义最容易被 review。',
                ],
              },
              {
                kind: 'compare',
                title: '四种同步手段的选择线',
                head: ['手段', '保护什么', '开销', '最容易犯的错', '典型场景'],
                cols: ['保护什么', '开销', '最容易犯的错', '典型场景'],
                rows: [
                  ['`sync.Mutex`', '一段临界区(多个字段的不变量)', '中:无竞争一次 CAS', '临界区里放 IO、复制了 Mutex', '保护 map、结构体状态'],
                  ['`sync.RWMutex`', '读多写少的临界区', '读略高于 Mutex', '嵌套 RLock、写者饥饿导致死锁', '配置缓存、只读索引'],
                  ['`sync/atomic`', '单个值/指针', '最低:单条指令', '多个原子操作「以为整体原子」', '计数器、开关、快照替换'],
                  ['channel', '消息传递 + 所有权转移', '最高:锁 + 可能挂起', '当共享内存用、忘记关闭、泄漏', '流水线、任务分发、信号广播'],
                ],
                note: '选择顺序建议:先想「能不能用不可变数据 + 原子替换」,不行再想「能不能用 channel 传所有权」,最后才用锁。因为锁最容易写对,也最容易写错——它把正确性责任交给了调用方。',
              },
              {
                kind: 'question',
                title: 'Q24 · Mutex 允许自旋的条件？',
                questionId: 'go-02-Q24',
                intent: '`Mutex` 允许自旋的四个条件,少一个都不行。',
                points: [
                  '四个条件:① `GOMAXPROCS > 1`(单核自旋是纯浪费);② 当前 P 的本地队列为空(有别的 G 该跑);③ 自旋次数未超过 4 次;④ 全局自旋的 M 数不超过「运行中 P 数 / 2」。',
                  '为什么要自旋:挂起/唤醒 goroutine 是微秒级开销,而锁可能几十纳秒就释放;自旋是「用 CPU 时间换调度开销」。',
                  '为什么要有上限:如果锁的持有者被抢占或阻塞在 IO 上,自旋就是空转浪费;所以用「4 次」+「全局配额」两个限制把风险控制住。',
                ],
                depth: '这也解释了「为什么高并发下 CPU 会飙高但吞吐不涨」——大量 M 在自旋等同一把锁(`nmspinning` 配额被占满),CPU 全花在空转上。解法不是加机器,而是减小锁粒度或改用分片。',
              },
              {
                kind: 'question',
                title: 'Q25 · Mutex 为什么不可重入、不可复制？（补）',
                questionId: 'go-02-Q25',
                intent: '不可重入 + 不可复制:两个「不可」的实现原因。',
                points: [
                  '不可重入:`state` 只有一个「已加锁」位,不记录持有者;同一 goroutine 再次 `Lock` 会看到「已加锁」并把自己挂起,而唯一能解锁的就是它自己 → 死锁。',
                  '为什么不做可重入:需要「持有者 ID + 重入计数」,而 goroutine 没有稳定的对外 ID;而且可重入会让「这层解锁会不会真解锁」变得不可判断。Go 的选择是要求「加解锁在同层成对」。',
                  '不可复制:复制 `Mutex` 就是复制「已加锁」状态,两个副本各认为持有锁但保护的是不同互斥域——保护静默失效。所以 `sync` 类型都内嵌 `noCopy`,`go vet` 的 `copylocks` 会在编译期报错。',
                ],
                followup: '「那 `sync.Mutex` 放在结构体里,结构体按值传参会怎样?」 `go vet` 会报 `passes lock by value`。必须传指针。这也是「为什么要用 `*T` 而不是 `T`」的一个具体理由。',
              },
              {
                kind: 'question',
                title: 'Q26 · RWMutex 的规则与陷阱？（补）',
                questionId: 'go-02-Q26',
                intent: '`RWMutex` 的规则与两个陷阱,重点说「什么时候它比 Mutex 还慢」。',
                points: [
                  '基本规则:可多个读者并发,但写者独占;写者到来时会阻塞后续新读者(防写者饥饿)。',
                  '陷阱一:递归/嵌套 `RLock` → 死锁。若同 goroutine 二次 `RLock` 而中间有写者在等,第二次会阻塞,而第一次永不释放。',
                  '陷阱二:写频繁时更慢。写者一到来就阻塞新读者,读并行被打断,而且 `RWMutex` 内部结构更复杂,单次开销高于 `Mutex`。只有「读远多于写 + 临界区短 + 无嵌套读」才划算。',
                ],
                depth: '一个实用替代方案:`atomic.Value` + 不可变快照。读方一次 `Load`(零锁),写方构造新对象再一次 `Store`——读多写少场景下它比 `RWMutex` 快一个数量级,而且没有死锁风险。',
              },
              {
                kind: 'question',
                title: 'Q30 · sync.Pool 是什么？有哪些坑？（补）',
                questionId: 'go-02-Q30',
                intent: '`sync.Pool` 是什么、有哪些坑——核心是「它会被 GC 清空」。',
                points: [
                  '结构:每 P 一个 `private`(无锁取)+ `shared` 队列(加锁);`Get` 顺序是 `private` → 本 P `shared` → 偷别的 P 的 `shared` → `victim` → `New`。',
                  '坑一:随时可能被清空。每次 GC 会把 `Pool` 里的对象移到 `victim`,下一轮 GC 再清掉——所以「放进去的东西」不保证还在,不能当缓存用。',
                  '坑二:对象状态不干净。复用前必须 `Reset`(切片要 `s[:0]`,含指针的结构要清零),否则会把上一个使用者的数据带出去——这是安全问题。',
                ],
                depth: '适合什么:`bytes.Buffer`、`[]byte` 缓冲、`json.Encoder`、临时大结构——这些「创建昂贵、用完即弃、可以重建」的对象。不适合:数据库连接、有业务状态的缓存、任何「必须还在」的东西。',
              },
              {
                kind: 'question',
                title: 'Q48 · atomic 能替代锁吗？atomic.Value 有什么约束？',
                questionId: 'go-index-Q48',
                intent: '`atomic` 能替代锁吗——不能,理由要说到「单次 vs 整体」。',
                points: [
                  '能做的:单个值的读写、加减、`CAS`、指针替换(`atomic.Value`);都是单次操作的原子性,并且带内存序保证。',
                  '不能做的:多个值同时一致(两个 `Load` 之间可能被改,读到「半个旧值 + 半个新值」)、「读-判断-写」三步(必须用 `CAS` 循环)、以及需要挂起等待的场景。',
                  '约束:`atomic.Value` 的 `Store` 类型必须始终一致且不能存 nil;64 位类型在 32 位平台上要对齐(用 `atomic.Int64` 包装类型可自动保证)。',
                ],
                followup: '「`atomic.Value` 和 `Mutex` 保护一个指针,哪个好?」 读多写少时 `atomic.Value` 明显更好——读操作零锁零阻塞,而 `Mutex` 每次读都要抢锁。但前提是「存的对象不可变」:写完就 `Store` 一个新对象,绝不修改已 `Store` 的那个。',
              },
              {
                kind: 'question',
                title: 'Q34 · runtime 能检测到哪些死锁？什么时候检测不到？（补）',
                questionId: 'go-02-Q34',
                intent: 'runtime 能检测到哪些死锁——这是「goroutine 泄漏」的入口题。',
                points: [
                  '能检测:所有 goroutine 都阻塞,且没有任何可能由外部唤醒的来源(timer、netpoll、syscall),运行时报 `fatal error: all goroutines are asleep - deadlock!`。',
                  '检测不到:只有部分 goroutine 阻塞(其他还在跑)、有 timer 在跑、以及阻塞在 `Mutex` 上(运行时完全不追踪锁的等待图,所以锁死锁只能靠 `pprof` 看栈发现)。',
                  '排查手段:pprof `goroutine` profile(看数量与栈)、`runtime.NumGoroutine()` 打点告警、`GODEBUG=schedtrace=1000`;线上用「goroutine 数随请求量线性增长」做告警。',
                ],
                depth: '为什么运行时不管锁死锁? 因为要追踪锁的等待图需要给每个 `Mutex` 维护「等待者列表 + 持有者」,这会显著增加无竞争路径的开销——而 `Mutex` 的快路径必须极致轻量。所以 Go 选择了「不检测」,把这件事交给工具(`go-deadlock` 库可以替换 `sync.Mutex` 做检测)。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'runtime',
      title: 'C · 内存管理与 GC',
      goal: '掌握逃逸分析与三色标记的实际影响',
      summary:
        'Go 的 GC 目标是低延迟而非高吞吐，因此采用并发三色标记加混合写屏障。这一阶段先讲对象分配路径与逃逸分析，再讲 GC 的各个阶段与调优手段。',
      lessons: [
        {
          id: 'go-gc',
          title: '三色标记与 GC 调优',
          kind: 'concept',
          sources: [
            { topic: 'go-03', chapters: ['GC'] },
            { topic: 'go-index', chapters: ['内存管理'], slice: [0, 8] },
          ],
          content: {
            intro:
              'GC 的核心问题只有一个:在「用户代码还在改指针」的同时,怎么保证「不把活对象当垃圾收掉」。三色标记给出了判定的框架(白=待定、灰=已发现待扫描、黑=已扫描),但并发标记天生会漏标——漏标必须同时满足「黑色对象新增了指向白色的指针」和「灰对象到该白色的引用被删除」两个条件。只要能破坏其中一个,就安全了,于是有了插入屏障(Dijkstra)、删除屏障(Yuasa)和 Go 1.8 起的混合写屏障。再叠上 STW 只发生在「启动标记」与「标记终止」两个极短阶段、以及 `GOGC`/`GOMEMLIMIT` 两个调优旋钮,这块最容易被问倒的知识就有了完整链条。',
            outline: [
              '三色含义:白=可能垃圾、灰=已发现待扫描、黑=已扫描且其引用全处理完',
              '漏标两条件:黑色对象新增指向白的指针 + 灰对象到该白的路径被删除,必须同时满足',
              '三种写屏障:插入(保黑→白新边)、删除(保灰→白旧边)、混合(两者都保,Go 1.8+)',
              'STW 只有两处:标记启动(开启写屏障)与标记终止(关闭写屏障 + 重扫栈)',
              '两个旋钮:`GOGC`(堆增长百分比)与 `GOMEMLIMIT`(软内存上限,1.19+)',
            ],
            pitfalls: [
              '说「三色标记不需要 STW」——标记过程确实并发,但启动和终止各有一小段 STW,只是被压到亚毫秒。',
              '把写屏障理解成「内存屏障(CPU 指令重排)」——Go 的写屏障是「编译器插入的一段检查代码」,与硬件内存屏障是两件事(虽然内部会用原子操作)。',
              '只调 `GOGC` 不看 `GOMEMLIMIT`——`GOGC` 是「相对增长」,在堆很大时会导致内存翻倍;1.19 之后应该用 `GOMEMLIMIT` 设绝对上限。',
            ],
            sections: [
              {
                kind: 'concept',
                title: 'GC 要同时满足两个互相矛盾的要求',
                body: [
                  '要求一:找全所有「活对象」。从根集合(全局变量、各 goroutine 的栈、寄存器)出发,顺着指针能到达的对象都是活的,其余是垃圾。',
                  '要求二:不能停下来太久。如果「找全」需要暂停整个程序,那堆越大暂停越久——这正是早期 Java 的痛点。所以现代 GC 都追求「并发标记」:用户代码继续跑,GC 在后台扫。',
                  '矛盾就在这里:用户代码随时可能修改指针,而 GC 的扫描是「一段时间内的快照」——两者交错,就可能出现「GC 已经扫过某个对象(判定为黑),而用户代码刚刚给它加了一个指向白对象的指针」这种情况。如果白对象在别处已不可达,GC 就会把它当垃圾回收——但它其实是活的。这就是「对象消失问题」。',
                  '三色标记就是用来精确描述「扫描进度」的。白:还没被 GC 访问过(可能垃圾)。灰:被访问过,但它引用的对象还没全部扫描(在待处理队列里)。黑:自己和自己的引用都扫描完了。标记结束时,白色就是垃圾。',
                ],
              },
              {
                kind: 'diagram',
                title: '三色标记:灰集合是「工作队列」',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '初始:根对象置灰,其余全白', note: '根包括全局变量、各 G 的栈、寄存器' },
                    { label: '从灰集合取一个对象 X', note: '灰集合就是一个工作队列' },
                    { label: '把 X 引用的所有白对象置灰', note: '「发现」新对象,加入待扫描队列' },
                    { label: 'X 置黑(它已扫描完)', note: '黑色表示「这个对象及其引用都处理完了」' },
                    { label: '重复直到灰集合为空', note: '此时黑色 = 活对象,白色 = 垃圾' },
                    { label: '清扫:回收所有白色对象', note: 'Go 的清扫是并发的、惰性的(用到时才清)' },
                  ],
                  caption: '关键理解:整个过程只有「灰集合」是活跃的,黑和白都是终态。所以「并发标记」的难点就是「用户代码在改指针时,可能让某个白对象从灰集合的可达范围里溜走」。',
                },
              },
              {
                kind: 'principle',
                title: '漏标的两个条件:必须同时满足才会出事',
                body: [
                  '这是 GC 理论里最漂亮的一个结论:对象消失(把活对象当垃圾)必须同时满足两个条件。只要能破坏任意一个,就是安全的——三种写屏障就是三种破坏方式。',
                ],
                steps: [
                  {
                    title: '① 条件一:一个黑色对象新增了指向白色对象的指针',
                    detail:
                      '黑对象已经被 GC 扫过了,GC 不会再回头看它。所以如果它新指向一个白对象,GC 永远不会「发现」这个白对象——它会被当垃圾。注意:这条边的建立必须发生在「黑对象被置黑之后」。',
                  },
                  {
                    title: '② 条件二:所有从灰对象到该白色对象的路径都被删除了',
                    detail:
                      '如果这个白对象还能从某个灰对象到达,那么灰对象被扫描时就会把它置灰,它就得救了。所以出事的另一个必要条件是:原本唯一能到达它的那条灰→白边被删掉了。',
                  },
                  {
                    title: '③ 于是三种屏障就是「破坏哪一个」',
                    detail:
                      '插入屏障(Dijkstra):破坏条件一——黑对象新增指向白的指针时,把那个白对象置灰(或把黑对象重新置灰),于是 GC 会扫到它。删除屏障(Yuasa):破坏条件二——删除灰→白引用时,把被删的白对象置灰,于是它「虽然失去了唯一路径,但已经被保护起来」。混合屏障(Go 1.8+):两者都做,但只在特定条件下触发,以降低开销。',
                  },
                  {
                    title: '④ 强弱三色不变式:两种「安全」的表述',
                    detail:
                      '强三色不变式:黑对象不允许指向白对象。插入屏障保证它。弱三色不变式:允许黑指向白,但该白对象必须能通过某条路径从灰对象到达。删除屏障保证它。混合屏障同时保证两者——代价更高但实现更简单,且能消除「栈重扫」。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '三种写屏障的对照',
                diagram: {
                  type: 'matrix',
                  head: ['屏障', '触发时机', '做的事', '保证', '缺点'],
                  cols: ['触发时机', '做的事', '保证', '缺点'],
                  rows: [
                    ['插入屏障(Dijkstra)', '指针写入时(建立新边)', '若目标是白且源是黑 → 目标置灰', '强三色不变式', '只在堆上生效,栈上的写不拦 → 必须 STW 重扫栈'],
                    ['删除屏障(Yuasa)', '指针被覆盖时(删除旧边)', '若被覆盖的旧目标是白 → 旧目标置灰', '弱三色不变式', '漏标的下游对象可能被「复活」,产生浮游垃圾'],
                    ['混合写屏障(Go 1.8+)', '指针写入时(同时看新旧两侧)', '新值置灰 + 旧值置灰', '强弱都保证', '每次写都要判断,开销略高;但栈无需重扫'],
                  ],
                  caption: '混合屏障的关键收益是「栈不需要在标记结束时重扫」——这直接把 STW 从「与栈大小成正比」压到几乎恒定。',
                },
              },
              {
                kind: 'concept',
                title: '混合写屏障:为什么它让 STW 变成亚毫秒',
                body: [
                  '在混合屏障之前(Go 1.7 及更早),插入屏障只在堆上生效,因为要在栈上也插屏障代价太大(栈操作极热)。于是标记阶段开始时,所有 goroutine 的栈必须先扫一遍并冻结;标记结束时,因为栈上的写没被拦,又得重新扫一遍栈——这次重扫必须 STW,而且耗时与栈总大小成正比。栈越多、goroutine 越多,暂停越长。',
                  '混合屏障的解法是「让栈的写也不需要拦」,但通过在写入时同时保护新旧两个值来保证安全。具体规则是:`*slot = ptr` 时,如果 `slot` 在堆上,则把新值 `ptr` 置灰(插入侧),同时把旧值 `*slot` 置灰(删除侧)。这样无论用户代码怎么改,被「丢掉」和「新加」的对象都被保护住了。',
                  '为什么这样就可以不重扫栈? 因为「栈上的黑对象新增指向白的指针」这个危险场景,在混合屏障下不会造成漏标:栈是「根」,标记开始时会被全量扫描(此时短暂 STW);而扫描之后栈上新增的边,由于栈被「视为始终灰」的特殊处理(运行时保证「栈上的对象在标记期间不会被置黑」),所以栈永远不会变成「不再被扫描的黑对象」。于是「黑→白」的边不可能出现在栈上,条件一不成立。',
                  '结果就是:标记终止阶段不再需要重扫所有栈,STW 降到只需做「关闭写屏障 + 少量收尾」的工作,耗时与堆大小和 goroutine 数量基本无关——这就是「亚毫秒 STW」的真正来源。注意它不是「消除了 STW」,而是「把 STW 的工作量变成了常数级」。',
                ],
              },
              {
                kind: 'diagram',
                title: '一次完整 GC 的四个阶段',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① Sweep Termination(清扫终止)', note: 'STW:等上一轮清扫完成,开启写屏障' },
                    { label: '② Mark(并发标记)', note: '占 25% CPU(后台 worker),用户代码照跑;写屏障生效' },
                    { label: '③ Mark Termination(标记终止)', note: 'STW:关闭写屏障、完成剩余标记、重新计算下次触发阈值' },
                    { label: '④ Sweep(并发清扫)', note: '惰性清扫:分配时才真正清零 span,不集中做' },
                  ],
                  caption: '两处 STW:① 和 ③。① 极短(只是切换状态);③ 在混合屏障后也很短(不再重扫栈)。中间 ② 才是大头,而它完全并发。',
                },
              },
              {
                kind: 'concept',
                title: 'GC 什么时候触发:三个来源',
                body: [
                  '来源一:堆增长达到阈值(最常见的那个)。`GOGC=100`(默认)的含义是「当堆的存活大小增长 100% 时触发」——也就是「上次 GC 后存活 4MB,那么堆到 8MB 就触发」。所以 `GOGC` 越小 GC 越频繁、内存占用越低;越大 GC 越少、内存占用越高、但 CPU 开销更低。`GOGC=off` 完全关闭 GC(仅适合短生命周期程序)。',
                  '来源二:距离上次 GC 超过 2 分钟(`forcegc`)。这是一个兜底:即使堆没增长,长时间不 GC 也会触发一次,防止「内存缓慢增长但一直不达阈值」。这个 2 分钟是硬编码的,不可配置。',
                  '来源三:手动 `runtime.GC()`。它会触发一次完整的 GC 并阻塞到完成(包括清扫)。只应在测试或明确的「需要立刻释放」场景调用,生产代码里调用它是「不知道自己在干什么」的信号。',
                  '1.19 新增 `GOMEMLIMIT`(软内存上限)。它解决的是 `GOGC` 的根本问题:`GOGC` 是相对增长,所以堆越大、增量越大,在 16GB 堆上 100% 就是再要 16GB。`GOMEMLIMIT` 给一个绝对上限(比如 12GiB),GC 会按「离上限还有多远」来调整频率——越接近上限越激进。注意它是「软」上限:Go 不能保证绝不超,只能保证「尽量不超」,因为 GC 需要时间,而分配可能瞬间爆发。',
                ],
              },
              {
                kind: 'principle',
                title: 'GC 调优的三个旋钮与判断顺序',
                body: [
                  'GC 调优不是「把参数调小」,而是「先搞清楚瓶颈是 CPU 还是内存」。顺序错了会越调越糟。',
                ],
                steps: [
                  {
                    title: '① 先看 GC 占比:`GODEBUG=gctrace=1` 里的 CPU 百分比',
                    detail:
                      '`gctrace` 每次 GC 打一行,里面 `X%` 就是「GC 占用的 CPU 比例」。如果它大于 5%~10%,说明 GC 是热点——这时才值得调。如果只有 1%,那 GC 不是瓶颈,去优化业务逻辑。',
                  },
                  {
                    title: '② GC 太频繁 → 先减分配,不是先调 GOGC',
                    detail:
                      '减少分配的手段:对象池(`sync.Pool`)、预分配(`make` 带 cap)、避免不必要的字符串拼接、避免 `interface{}` 装箱、用 `[]byte` 代替 `string`。这些是「从源头减少垃圾」,收益远大于调参数。调大 `GOGC` 只是「让垃圾多堆一会儿」,治标不治本。',
                  },
                  {
                    title: '③ 内存吃紧 → 用 `GOMEMLIMIT` 而不是调小 `GOGC`',
                    detail:
                      '调小 `GOGC`(比如 50)会让 GC 变得非常频繁,CPU 被吃掉;而 `GOMEMLIMIT` 只在「接近上限」时才激进——平时保持宽松,紧张时收紧,这是更合理的策略。实践配置:`GOMEMLIMIT` 设为容器内存的 80%~90%,`GOGC` 保持默认。',
                  },
                  {
                    title: '④ 延迟有毛刺 → 先看 STW 与 mark assist,而不是 GOGC',
                    detail:
                      '`gctrace` 里 STW 的时间如果是几十微秒,它不是毛刺来源;如果 `mutator assist` 占比很高,说明「分配太快,用户 goroutine 被迫帮 GC 干活」——这才是延迟毛刺的真凶,解法还是「减少分配」。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: '辅助标记(mark assist):分配太快会被强制「帮 GC 干活」',
                body: [
                  '并发标记有一个隐含的约束:标记速度必须跟上分配速度,否则「标记还没扫完,白色对象已经被新的分配挤满」——会导致 GC 永远做不完。所以 Go 引入「辅助标记」。',
                  '机制是:每个 goroutine 有一个「分配配额」(基于它上次帮忙扫了多少),当它分配超过配额时,会被强制暂停业务代码,去帮忙扫描一段灰色对象,扫描量与分配量成比例。这就是 `gctrace` 里的 `assist` 时间。',
                  '这解释了一个很常见的现象:某个服务在 GC 期间延迟突然升高,但 STW 明明只有几十微秒。因为延迟不是来自 STW,而是来自辅助标记:业务 goroutine 被拉去干 GC 的活,自己的请求就慢了。`gctrace` 里如果 `assist` 占比高,就是这个原因。',
                  '解法还是「减少分配」:分配少了,配额消耗慢,辅助标记自然少。其次是调大 `GOGC`(让 GC 少跑几次),但这会把内存推高——这是「内存换延迟」的交易,要按场景决定。',
                ],
              },
              {
                kind: 'diagram',
                title: 'GC 的版本演进:每次都在缩短 STW',
                diagram: {
                  type: 'matrix',
                  head: ['版本', '关键变化', 'STW 量级', '解决的问题', '遗留问题'],
                  cols: ['关键变化', 'STW 量级', '解决的问题', '遗留问题'],
                  rows: [
                    ['1.5', '并发三色标记 + 插入屏障', '几十~几百 ms', '首次把标记做成并发', '标记结束要 STW 重扫栈'],
                    ['1.6', '优化栈扫描与小对象', '几~几十 ms', '大幅缩短重扫栈', '仍有明显暂停'],
                    ['1.7', '并发栈扫描', '< 1ms(多数场景)', '栈扫描不再全 STW', '插入屏障只在堆生效,仍需重扫'],
                    ['1.8', '混合写屏障', '亚毫秒,与栈大小无关', '栈无需重扫 → 暂停变成常数级', '写屏障开销略升'],
                    ['1.19', '`GOMEMLIMIT` + 软内存上限', '不变', '解决「`GOGC` 在堆大时失控」', '软上限,不保证绝不超'],
                    ['1.20+', '持续优化清扫与分配路径', '进一步降低', '减少辅助标记、提高分配吞吐', '——'],
                  ],
                  caption: '主线就一句话:每一次演进都在把「与堆大小/栈数量成正比的工作」搬出 STW。1.8 的混合屏障是最后一大步。',
                },
              },
              {
                kind: 'concept',
                title: '为什么 Go 不需要分代 GC',
                body: [
                  '分代 GC 的理论基础是「弱代假说」:大多数对象朝生夕死,所以把新对象放在「新生代」、频繁回收小的新生代,比扫整个堆便宜。Java、.NET 都用这个思路。Go 为什么不用?',
                  '原因一:Go 的「逃逸分析」已经把大量临时对象放到栈上了。栈上分配不需要 GC,函数返回就回收——所以「朝生夕死」的那批对象根本没进堆,分代的前提被削弱了。这是 Go 独有的优势:它是一门静态编译语言,能精确知道哪些对象不会逃逸。',
                  '原因二:Go 的 GC 是并发的,STW 已经与堆大小无关。分代的主要收益是「减少单次扫描量 → 缩短暂停」;而 Go 的暂停已经是亚毫秒且不随堆增长,这个收益消失了。剩下的收益只有「减少总扫描工作量」,但代价是「写屏障要额外维护代际间的引用记录(remembered set)」——得不偿失。',
                  '原因三:分代会让「内存布局」变复杂。对象要按年龄分布在不同的区域,分配器、清扫器、压缩(Go 不做压缩)都要相应复杂化;而 Go 的目标是「简单、可预测」,不希望引入这种复杂度。',
                  '所以 Go 的选择是:用逃逸分析把短命对象赶到栈上,用并发标记把长命对象的扫描摊到后台,用混合屏障把 STW 压到常数——三条路合起来,分代的必要性就不大了。',
                ],
              },
              {
                kind: 'analogy',
                title: 'GC 像「图书馆夜间盘点」',
                text:
                  '把堆想成一个图书馆,书就是对象,「被借阅登记表(根集合)引用到的书」就是活书。盘点员的规则很简单:从登记表出发,顺着一本本书里夹的「相关书目卡片」(指针)往下找,找到的都是要有用的;找不到的就是可以下架的书。三色就是给每本书贴标签:还没检查过的贴白色,「已经发现有用了但里面的卡片还没逐个核对」的贴灰色,「自己和自己的卡片都核对完了」的贴黑色。盘点员的工作台就是一摞灰色标签的待办书(`灰集合`)。问题在于:图书馆白天还要正常借阅,读者随时可能在黑书里夹进一张新卡片,指向一本还没检查过的白书。如果盘点员已经检查过那本黑书、再也不会回头看,那本白书就永远贴不上标签——被误下架。这就是漏标。要防止它,只需要在读者夹卡片的那一刻做一件事:要么把被指向的白书立刻贴灰(插入屏障),要么在读者抽走卡片时把被抽走的白书贴灰(删除屏障);Go 1.8 之后两件事都做(混合屏障)。代价是「每次夹卡片都要多一个动作」——这就是写屏障的开销。而「闭馆盘点」(STW)只在「开始贴标签」和「贴完收尾」两个极短时刻发生,中间全程开门营业。',
                mapping: [
                  { real: '登记表(根集合)', tech: '全局变量 + 各 goroutine 栈 + 寄存器' },
                  { real: '书里夹的相关书目卡片', tech: '对象的指针字段' },
                  { real: '白色/灰色/黑色标签', tech: '三色标记的三种状态' },
                  { real: '贴灰色标签的待办书堆', tech: '灰集合(标记工作队列)' },
                  { real: '读者夹进新卡片,指向未检查的白书', tech: '黑对象新增指向白对象的指针(条件一)' },
                  { real: '夹卡片时立刻给白书贴灰', tech: '插入屏障(Dijkstra)' },
                  { real: '抽走卡片时给被抽走的白书贴灰', tech: '删除屏障(Yuasa)' },
                  { real: '夹和抽都做一次', tech: '混合写屏障(Go 1.8+)' },
                  { real: '只有开始和收尾要闭馆', tech: '两处极短 STW' },
                ],
                limit: '类比不成立的地方:现实中「贴灰标签」是物理动作,可以随便贴;而写屏障是编译器插入的代码,每次指针写都要执行判断——这就是它为什么必须「只在必要时触发」以控制开销。另外 Go 的清扫是「惰性」的:不是集中下架,而是下次要用这块位置时才清,类比里没有对应。',
              },
              {
                kind: 'question',
                title: 'Q37 · 什么是三色标记法？',
                questionId: 'go-03-Q37',
                intent: '三色标记的定义与流程,这是 GC 的地基题。',
                points: [
                  '三色定义:白=未被访问(可能垃圾);灰=已发现但其引用还没扫完;黑=自身与引用都扫完。',
                  '流程:根置灰 → 从灰集合取对象 → 把它的白色引用置灰 → 自身置黑 → 重复至灰集合空 → 白色即垃圾。本质是「从根出发的可达性遍历」,灰集合就是工作队列。',
                  '结束时:黑色 + 灰色(理论上为空)= 活对象;白色 = 可回收。注意 Go 的清扫是并发的、惰性的。',
                ],
                depth: '为什么不用两色(活/垃圾)? 因为「标记」需要中间态来表达「发现了但还没处理完」——没有灰色,就只能一次性递归到底,无法并发。灰色集合的存在正是「可中断、可并发」的前提。',
              },
              {
                kind: 'question',
                title: 'Q38 · 为什么需要写屏障？强/弱三色不变式是什么？',
                questionId: 'go-03-Q38',
                intent: '为什么需要写屏障 + 强弱三色不变式,这是区分「背过」和「懂了」的分水岭。',
                points: [
                  '需要写屏障的原因:并发标记期间用户代码会改指针,可能让「已扫描的黑对象」新增指向「未被发现的白对象」的边,导致该白对象被误回收。',
                  '漏标两条件(必须同时满足):① 黑对象新增指向白对象的指针;② 所有从灰对象到该白对象的路径都被删除。破坏任一条即安全。',
                  '两个不变式:强三色不变式 =「黑不允许指向白」(插入屏障保证);弱三色不变式 =「黑可以指向白,但该白必须从灰可达」(删除屏障保证)。',
                ],
                followup: '「Go 用的是强还是弱?」 混合屏障同时保证强弱两者——写入时对新值做插入屏障(保强)、对旧值做删除屏障(保弱),所以「栈无需重扫」才成立。',
              },
              {
                kind: 'question',
                title: 'Q39 · Dijkstra 插入屏障 vs Yuasa 删除屏障 vs Go 1.8 混合写屏障？',
                questionId: 'go-03-Q39',
                intent: '三种写屏障的差别,重点是「各自的缺点」与「为什么最终选混合」。',
                points: [
                  '插入屏障(Dijkstra):新值置灰,保强不变式;缺点:只在堆上生效(栈上插屏障太贵),所以标记结束必须 STW 重扫所有栈。',
                  '删除屏障(Yuasa):旧值置灰,保弱不变式;缺点:会产生「浮游垃圾」(本该被回收的对象被保护了一轮),回收不彻底。',
                  '混合屏障(1.8+):新值和旧值都置灰,强弱都保;收益是栈无需重扫,STW 与栈大小解耦;代价是每次指针写都要多做判断。',
                ],
                depth: '一个细节:混合屏障下,「栈上的对象在标记期间不会被置黑」是运行时保证的——所以「栈上的黑指向白」这个危险场景不存在,条件一在栈上永不成立。这就是「不重扫栈」的严格依据,不只是「性能优化」。',
              },
              {
                kind: 'question',
                title: 'Q40 · STW 发生在哪两个阶段？各做什么？',
                questionId: 'go-03-Q40',
                intent: '两处 STW 各自做什么,以及「为什么它们短」。',
                points: [
                  '① Sweep Termination(标记启动前):STW 等上一轮清扫完成、开启写屏障。极短(状态切换)。',
                  '② Mark Termination(标记结束后):STW 关闭写屏障、完成剩余标记、重算下次触发阈值。在混合屏障后也很短——因为不再需要重扫所有 goroutine 的栈。',
                  '「亚毫秒」的来源:不是消除了 STW,而是把「与堆大小/栈数量成正比的工作」搬出了 STW(并发标记 + 混合屏障)。',
                ],
                followup: '「那 STW 还会变长吗?」 会。如果 goroutine 数量极多、或某个 goroutine 长时间不进入安全点(比如纯计算的死循环,虽然有 1.14 的异步抢占),Mark Termination 的收尾会变慢。所以「控制 goroutine 数量」也是间接的延迟优化。',
              },
              {
                kind: 'question',
                title: 'Q42 · GC 如何观察与调优？',
                questionId: 'go-03-Q42',
                intent: '怎么观察与调优 GC:工具 + 两个旋钮 + 判断顺序。',
                points: [
                  '观察工具:`GODEBUG=gctrace=1`(每次 GC 一行,含堆大小、STW、辅助标记占比)、`GODEBUG=gcpacertrace=1`(调步器决策)、pprof 的 `heap`(存活对象)与 `allocs`(累计分配)、`runtime/metrics`(细粒度指标)。',
                  '两个旋钮:`GOGC`(相对增长阈值,默认 100)与 `GOMEMLIMIT`(绝对软上限,1.19+)。容器里推荐「`GOMEMLIMIT` = 内存上限 × 80%~90%,`GOGC` 保持默认」。',
                  '判断顺序:先看 `gctrace` 的 GC CPU 占比是否 >5%;是则先减少分配(Pool / 预分配 / 减少装箱),而不是先调参数;内存吃紧用 `GOMEMLIMIT`,延迟毛刺看 `assist` 占比。',
                ],
                depth: '一个反直觉点:`GOMEMLIMIT` 配得太紧会更慢。因为 GC 会为了「不超上限」而频繁运行,GC CPU 占比上升,吞吐下降。所以它的正确用法是「防 OOM 的护栏」,不是「省内存的开关」——想省内存应该减少分配。',
              },
            ],
          },
        },
        {
          id: 'go-memory',
          title: '内存分配与逃逸分析',
          kind: 'concept',
          sources: [
            { topic: 'go-03', chapters: ['逃逸分析'] },
            { topic: 'go-index', chapters: ['内存管理'], slice: [8, 17] },
          ],
          content: {
            intro:
              'Go 的分配器是三级结构:`mcache`(每 P 私有)→ `mcentral`(每 size class 一个)→ `mheap`(全局),而 `mspan` 是它们之间流转的「页块」。这三级的存在理由只有一个:让「小对象分配」变成「从无锁链表里摘一个槽位」,几纳秒完成。而逃逸分析决定了「这个对象到底需不需要走分配器」——不逃逸就放栈上,函数返回即回收,连 GC 都不用参与。所以「降低 GC 压力」的第一手段永远不是调参数,而是「让更多对象别逃逸 + 少分配」。最后再解释「为什么 RSS 降不下来」——那是 Go 的内存归还策略与操作系统视角的差异,不是泄漏。',
            outline: [
              '三级结构:`mcache`(无锁)→ `mcentral`(每档一把锁)→ `mheap`(全局大锁)',
              '三类对象:tiny(< 16B 且无指针,可合并)、small(≤ 32KB,走 size class)、large(> 32KB,直接按页)',
              '`mspan` 是流转单位:一组连续页,按 size class 切成等大的槽位',
              '逃逸分析:能证明「不活过栈帧」就放栈;否则放堆(编译期决定)',
              'RSS 高 ≠ 泄漏:Go 归还内存是「惰性 + 分批」的,`scavenger` 会慢慢还',
            ],
            pitfalls: [
              '说「`make([]T, n)` 一定分配在堆上」——如果 `n` 是常量且切片不逃逸,编译器可以直接在栈上分配数组。',
              '把「`RSS` 不降」当内存泄漏——Go 的堆释放后,物理内存归还给 OS 是异步的,`GODEBUG=madvdontneed=1` 或等 `scavenger` 才降。',
              '认为「`sync.Pool` 能解决所有分配问题」——池里的对象会被 GC 清空,且取出来必须 `Reset`,否则会带出脏数据。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '三级分配器:为什么要这么多层',
                body: [
                  '如果只有一个全局堆,每次分配都要抢一把大锁——这和 GM 模型的问题一模一样。Go 的解法也是「分片」,只是分了三级。',
                  '第一级:`mcache`,每 P 一个,完全无锁。它按 size class 缓存了一批 `mspan`(每个 `mspan` 是一组连续页,被切成等大的槽位)。小对象分配就是「从 `mcache` 对应档位的 `mspan` 里摘一个空闲槽位」——纯指针操作,几纳秒。',
                  '第二级:`mcentral`,每个 size class 一个,带一把锁。当 `mcache` 里某个档位的 `mspan` 用完了(没有空闲槽位),就去 `mcentral` 要一个新的 `mspan`。这个操作频率低得多(一个 span 通常有几百个槽位),所以锁竞争不严重。',
                  '第三级:`mheap`,全局,一把大锁。当 `mcentral` 也没有空闲 `mspan` 时,向 `mheap` 申请新的页(通常一次要 1MB 以上),或者触发向操作系统 `mmap`。这个操作频率极低。',
                  '所以「分配一个 32 字节对象」的正常路径是:「算 size class → 查 `mcache` → 摘槽位」三步,零锁。只有当缓存用完时才往上走一层。这就是「Go 的分配很快」的具体机制——不是因为它用了什么神奇算法,而是因为它把「锁」这件事从热路径上挪走了。',
                ],
              },
              {
                kind: 'diagram',
                title: '三级结构与 `mspan` 的流转',
                diagram: {
                  type: 'layers',
                  items: [
                    { label: '`mcache`(每 P 一个,无锁)', note: '按 size class 缓存 `mspan`;小对象分配就走这里,几 ns', tone: 'primary' },
                    { label: '`mcentral`(每 size class 一个,一把锁)', note: '维护「有空槽」与「已满」两个 `mspan` 链表;`mcache` 用完时来这里换' },
                    { label: '`mheap`(全局,一把大锁)', note: '管理所有页;`mcentral` 缺 `mspan` 时来这里要(通常 1MB 起)' },
                    { label: '操作系统(`mmap` / `madvise`)', note: '`mheap` 向 OS 要内存,或把空闲内存归还(`scavenger`)' },
                    { label: '`mspan`(流转单位)', note: '一组连续页,按某个 size class 切成等大槽位;是三级之间传递的「货币」', tone: 'primary' },
                  ],
                  caption:
                    '从 `mcache` 到 `mcentral` 到 `mheap` 再到 OS,是一条「缺了才向上要」的路径;`mspan` 是三级之间传递的单位。[[小对象走 `mcache` 无锁,大对象直接找 `mheap`]]。',
                },
              },
              {
                kind: 'principle',
                title: '一次分配的完整路径:先看大小,再看有没有指针',
                body: [
                  '分配器不是「一个函数」,而是「按对象大小走三条不同的路」。这三条路的分界点是:16 字节、32KB。',
                ],
                steps: [
                  {
                    title: '① tiny 对象(< 16 字节且不含指针)—— 合并分配',
                    detail:
                      '如果对象小于 16 字节且不含指针(比如 `int32`、`bool`、小 struct),分配器会把多个这样的对象塞进同一个 16 字节的块里。这叫「tiny allocator」,目的是消除「分配 1 个字节也占 16 字节」的浪费。注意「不含指针」这个条件很关键:含指针的对象必须独立,否则 GC 扫描时无法区分。',
                  },
                  {
                    title: '② small 对象(16 字节 ~ 32KB)—— 走 size class',
                    detail:
                      '向上取整到最近的 size class(约 67 档,从 8 字节到 32KB,每档相差约 1.125 倍),然后从 `mcache` 对应档位的 `mspan` 里摘槽位。所以「申请 33 字节」实际会拿到 40 字节的槽位——这 7 字节就是内部碎片。档位设计成「约 1.125 倍递增」,是为了把内部碎片控制在 12.5% 以内。',
                  },
                  {
                    title: '③ large 对象(> 32KB)—— 直接按页分配',
                    detail:
                      '不再走 size class,而是直接向 `mheap` 申请「足够多的连续页」。所以大对象分配的开销和小对象完全不是一个量级,而且大对象会加剧堆碎片。实践推论:大量 32KB 以上的小数组(比如 `make([]byte, 100<<10)`)会让堆碎片化严重,应该改用 `sync.Pool` 复用或分块处理。',
                  },
                  {
                    title: '④ 无论哪条路,最后都要问「会不会逃逸」',
                    detail:
                      '逃逸分析在编译期就完成了:如果编译器能证明「这个对象不会活过当前函数栈帧」,就根本不会调用分配器,直接在栈上分配。所以「分配快不快」这个问题,第一层答案是「它有没有被分配」——栈分配比堆分配快 10 倍以上。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '对象分配的决策树',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '编译期:会逃逸吗?', note: '不会 → 栈上分配,零分配器开销' },
                    { label: '运行时:大小 < 16B 且无指针?', note: '是 → tiny allocator,多个小对象合并进 16B 块' },
                    { label: '≤ 32KB?', note: '是 → 取整到 size class,从 `mcache.mspan` 摘槽位(无锁)' },
                    { label: '`mcache` 该档位没有空槽?', note: '→ 向 `mcentral` 换一个 `mspan`(一把锁)' },
                    { label: '`mcentral` 也没有?', note: '→ 向 `mheap` 申请新页(全局锁),必要时 `mmap`' },
                    { label: '> 32KB(large)', note: '→ 直接向 `mheap` 按页申请,不走 size class' },
                  ],
                  caption: '注意第一行在最前面:逃逸分析决定「要不要分配」,后面五行只决定「怎么分配」。这是判断性能问题的第一分岔口。',
                },
              },
              {
                kind: 'concept',
                title: '`mcache` 为什么不需要锁:和 P 绑定的因果',
                body: [
                  '`mcache` 挂在 P 上,而「同一时刻一个 P 只被一个 M 使用」——这就是它无锁的全部理由。因为 P 是「执行许可」,同一时刻只有一个 M 持有它,所以只有那个 M 能访问它的 `mcache`。',
                  '由此可以推出两个有意思的结论。第一:`GOMAXPROCS` 决定了 `mcache` 的数量。如果有 8 个 P,就有 8 个 `mcache`,每个都缓存了各类 size class 的 `mspan`——这会带来一定的内存冗余(每 P 都囤一点)。这也是「`GOMAXPROCS` 设得过大反而浪费内存」的原因之一。',
                  '第二:`mcache` 是「跟着 P 走」而不是「跟着 M 走」。当 M 阻塞被 `handoff` 时,P 交给别的 M,`mcache` 也跟着 P 走——所以缓存不会因为线程切换而失效,这是 P 抽象带来的一个额外好处。',
                  '还有一个细节:`mcache` 里的 `mspan` 会「双向流动」。某档位的 span 全用完了就从 `mcentral` 换一个;如果某个 span 里的对象全被回收了,它也可能被归还给 `mcentral`——这个归还动作发生在 GC 之后的清扫阶段,而且有上限(每个档位最多保留一定数量),避免缓存无限膨胀。',
                ],
              },
              {
                kind: 'concept',
                title: '逃逸分析:编译器在证明什么',
                body: [
                  '逃逸分析要回答的问题是:「这个变量的生命周期会不会超过它所在的栈帧?」 如果不会,就放栈上;如果会,就必须放堆上(因为栈帧销毁后内存就没了)。',
                  '判定的核心是「引用会不会流出去」。编译器构造一个「引用图」,如果某个对象的地址被「存到了别的地方」,就算逃逸。「别的地方」包括:函数返回值、全局变量、其他逃逸对象的字段、channel、interface、闭包捕获。',
                  '一个关键限制:Go 的逃逸分析是流不敏感的(flow-insensitive),而且跨函数不做上下文分析(除非内联)。意思是:它不会做「这个分支里逃逸了但那个分支没有」的精细分析,只要有一条路径逃逸,就整体判为逃逸。所以「稍微多写一个 `&x`」就可能让整个函数的所有 `x` 都上堆。这也是为什么「重构代码有时能让性能突然变好」——你恰好让编译器能证明不逃逸了。',
                  '另一条重要规则:「赋给 interface」几乎必然导致逃逸。因为接口是两个字的结构,装进去的值必须有一个稳定的地址(否则接口里的指针会悬空),所以编译器只能把它放堆上。这就是「`fmt.Println(x)` 会让 `x` 逃逸」的原因——`Println` 的参数是 `...any`。',
                ],
              },
              {
                kind: 'diagram',
                title: '六种典型逃逸场景',
                diagram: {
                  type: 'matrix',
                  head: ['场景', '典型代码', '为什么逃逸', '能否避免', '替代方案'],
                  cols: ['典型代码', '为什么逃逸', '能否避免', '替代方案'],
                  rows: [
                    ['返回局部变量地址', '`return &T{}`', '地址要在函数外被使用', '不能(语义要求)', '返回值而不是指针(小对象)'],
                    ['赋给全局变量', '`global = &x`', '全局活得更久', '能', '改成参数传递'],
                    ['大小编译期不定', '`make([]T, n)`(n 是变量)', '栈帧大小必须编译期确定', '有时能', '`n` 小时用 `[N]T` 数组'],
                    ['存入 interface', '`fmt.Println(x)` / `var a any = x`', '接口需要稳定地址', '能', '避免装箱;用泛型或具体类型'],
                    ['被闭包捕获', '`func(){ use(x) }`', '闭包可能比栈帧活得久', '有时能', '内联执行,不延迟'],
                    ['发到 channel', '`ch <- x`', '数据要被另一个 goroutine 用', '不能', '传指针而不是大结构体'],
                  ],
                  caption: '注意第四行:`fmt.Println` 是最常见的「隐形逃逸源」。热点路径上「为了打日志而装箱」的开销，往往比日志本身的 IO 更贵。',
                },
              },
              {
                kind: 'concept',
                title: '栈分配与堆分配:差的不只是「快一点」',
                body: [
                  '栈分配的成本是「移动栈指针」——一条指令,零分配器调用、零 GC 参与。堆分配的成本是「算 size class + 查 mcache + 摘槽位」,再加上后续的 GC 扫描与清扫成本。所以两者的差距不是 2 倍,而是「一个数量级 + 额外的 GC 压力」。',
                  '更重要的是「GC 压力」这一项。堆上的对象越多,标记阶段要扫的对象越多,辅助标记触发越频繁,清扫工作量越大——这是一个正反馈:分配越多,GC 越忙,GC 越忙又占掉更多 CPU。而栈对象完全不参与 GC(栈是根,但栈上的对象不需要被「回收」,函数返回即消失)。',
                  '所以「减少逃逸」的收益是双份的:省掉分配本身,也省掉 GC 的工作。这也是为什么「基准测试里 `-benchmem` 的 `allocs/op` 比 `ns/op` 更值得关注」——`ns/op` 会随机器波动,而 `allocs/op` 是结构性的,它直接决定了 GC 压力。',
                  '一个实践判据:如果一个高频路径上的函数有 `allocs/op > 0`,就值得问「这个分配能不能消掉」。常见手段:预分配(`make` 带 cap)、`sync.Pool` 复用、把 `[]byte` 的临时转换改成 `unsafe` 借用、把 `string` 拼接改成 `Builder`。',
                ],
              },
              {
                kind: 'code',
                title: '用 `-gcflags -m` 把逃逸看清楚',
                lang: 'go',
                code:
                  "package main\n\nimport \"fmt\"\n\ntype Point struct{ X, Y int }\n\n// 逃逸:返回地址\nfunc newPoint() *Point { return &Point{1, 2} }\n\n// 不逃逸:返回值(小对象按值返回更便宜)\nfunc makePoint() Point { return Point{1, 2} }\n\n// 逃逸:存入 interface\nfunc printIt(p Point) { fmt.Println(p) }\n\n// 不逃逸(若被内联):切片不逃逸\nfunc sumLocal() int {\n\ts := make([]int, 10)\n\tfor i := range s {\n\t\ts[i] = i\n\t}\n\ttotal := 0\n\tfor _, v := range s {\n\t\ttotal += v\n\t}\n\treturn total\n}\n\nfunc main() {\n\tp := newPoint()\n\tq := makePoint()\n\tprintIt(q)\n\tfmt.Println(p.X, q.Y, sumLocal())\n}\n\n// 验证:go build -gcflags=\"-m -m\" main.go\n// 输出示例:\n//   ./main.go:9:9: &Point{...} escapes to heap      <- newPoint\n//   ./main.go:15:22: p escapes to heap              <- printIt 里的 Println\n//   ./main.go:18:11: make([]int, 10) does not escape <- sumLocal\n",
                caption: '注意第三行:`make([]int, 10)` 没有逃逸——长度是常量、切片没流出函数,编译器就把它放栈上。所以「切片一定在堆上」是错的。',
                notes: [
                  { line: 'func newPoint() *Point { return &Point{1, 2} }', text: '返回地址 → 必须逃逸。但编译器可能做「内联 + 栈上提升」优化,所以 `-m` 报逃逸不代表一定分配——要结合 `-benchmem` 的 `allocs/op` 判断。' },
                  { line: 'fmt.Println(p)', text: '`p` 被装箱成 `any` → 逃逸。这是最常见的隐形分配。' },
                  { line: 's := make([]int, 10)', text: '常量长度 + 不流出 → 栈分配。如果写成 `make([]int, n)`,`n` 是变量,就必须上堆。' },
                ],
              },
              {
                kind: 'concept',
                title: 'RSS 为什么降不下来:Go 的「归还」是惰性的',
                body: [
                  '这是最常被误判为「内存泄漏」的现象:pprof 的 `heap` 显示堆只用了 100MB,但容器的 RSS 显示 800MB,而且不降。',
                  '原因一:Go 归还内存是惰性 + 分批的。`scavenger`(后台清扫器)会根据「堆目标」逐步把空闲页 `madvise(MADV_FREE)` 还给 OS,而且每次只还一点,避免频繁系统调用。所以「刚释放完就去看 RSS」几乎一定还是不降。',
                  '原因二:`MADV_FREE` 与 `MADV_DONTNEED` 的差别。`MADV_FREE` 只是「标记为可回收」,OS 在内存压力下才会真正回收,但RSS 数字不会立刻下降(因为页还在);`MADV_DONTNEED` 会立即归还,RSS 立刻降但代价是后续再访问要缺页中断。Go 1.16 之前默认用 `MADV_DONTNEED`(RSS 立刻降),1.16 之后改成 `MADV_FREE`(RSS 不降但更快)——所以「升级 Go 版本后 RSS 看起来变高了」其实是行为变更,不是泄漏。可以用 `GODEBUG=madvdontneed=1` 恢复旧行为。',
                  '原因三:堆碎片。如果分配模式是「大小混杂」,空闲页可能被切得很碎,无法整块归还——这时 `heap` 统计的空闲内存很多,但能归还的连续页很少。解法是减少大对象与大小混杂的分配,或者用 `GOMEMLIMIT` 给 GC 压力让它更积极。',
                  '原因四:不是 Go 堆,而是别的东西。cgo 分配的内存、`mmap` 的文件、goroutine 栈(每个 2KB 起,百万 goroutine 就是 2GB)、以及被 `sync.Pool` 或全局 map 长期持有的引用——这些都不在 `heap` profile 的「inuse」里,但都算 RSS。排查手段:`/proc/<pid>/smaps` 看各段的实际占用,或者用 `runtime/metrics` 的 `memory/classes/*` 分类。',
                ],
              },
              {
                kind: 'diagram',
                title: '`pprof heap` 显示的与 RSS 显示的为什么不一样',
                diagram: {
                  type: 'split',
                  left: {
                    title: '`pprof heap` / `heap_inuse`',
                    note: 'Go 堆的视角',
                    tone: 'neutral',
                    items: [
                      '只统计 Go 分配器管的堆内存',
                      '`inuse_space` = 存活对象占用',
                      '`alloc_space` = 累计分配(含已回收)',
                      '不含 goroutine 栈、cgo、mmap',
                      '不含已归还但未归还完的页',
                    ],
                  },
                  right: {
                    title: 'RSS(容器 / `ps` 看到的)',
                    note: '操作系统的视角',
                    tone: 'warn',
                    items: [
                      '包含 Go 堆 + goroutine 栈 + cgo + 代码段',
                      '包含 `MADV_FREE` 标记但未回收的页',
                      '包含堆碎片(无法整块归还)',
                      '包含被 `Pool`/全局 map 长期持有的引用',
                      '只有 `MADV_DONTNEED` 才会立刻降',
                    ],
                  },
                },
                caption: '两者差距大时,先用 `runtime/metrics` 的 `memory/classes/*` 分类,再看 `/proc/pid/smaps`。不要直接下「泄漏」的结论——大多数「RSS 高」其实是「归还策略 + 碎片 + 非堆内存」三者叠加,而不是真的漏了。',
              },
              {
                kind: 'question',
                title: 'Q44 · 微对象/小对象/大对象怎么分？各走什么路径？',
                questionId: 'go-03-Q44',
                intent: '微/小/大对象的分界与各自路径,这是分配器的基础题。',
                points: [
                  'tiny(< 16B 且不含指针):走 tiny allocator,多个小对象合并进同一个 16 字节块,消除「分配 1 字节也占 16 字节」的浪费。',
                  'small(16B ~ 32KB):向上取整到最近 size class(约 67 档,1.125 倍递增),从 `mcache` 的 `mspan` 摘槽位(无锁)。',
                  'large(> 32KB):不走 size class,直接向 `mheap` 申请连续页;开销大且加剧碎片,应尽量用 `sync.Pool` 复用。',
                ],
                depth: '为什么「不含指针」是 tiny 的前提? 因为 GC 扫描时需要知道「这个 16 字节块里哪几个字节是指针」。如果多个对象混在一起且都有指针,就没法区分归属——所以含指针的对象必须独占槽位。',
              },
              {
                kind: 'question',
                title: 'Q47 · 如何查看和减少逃逸？',
                questionId: 'go-03-Q47',
                intent: '怎么查看与减少逃逸,要给出工具与手段。',
                points: [
                  '查看:`go build -gcflags="-m"`(要更详细用 `-m -m`),关注 `escapes to heap`;用 `go test -bench . -benchmem` 看 `allocs/op` 验证优化是否生效。',
                  '减少:预分配(`make` 带 cap)、`sync.Pool` 复用热点对象、避免不必要的 `interface{}` 装箱(尤其 `fmt.*` 在热点路径)、用 `strings.Builder` 替代 `+`、小对象按值返回代替指针。',
                  '注意:`-m` 报逃逸不等于一定分配——内联可能把它优化掉;以 `allocs/op` 为准。',
                ],
                followup: '「为什么 `fmt.Println` 会导致逃逸?」 因为签名是 `Println(a ...any)`,实参要被装箱成接口值;接口里的值需要一个稳定地址(否则接口持有悬空指针),所以编译器只能把它放堆上。热点路径应改用结构化 logger(字段预分配)或 `strconv` 直接拼接。',
              },
              {
                kind: 'question',
                title: 'Q50 · RSS 很高但 Go heap 统计很低，可能是什么原因？',
                questionId: 'go-03-Q50',
                intent: 'RSS 高但 heap 统计低——要给出四类原因与排查手段。',
                points: [
                  '原因一:惰性归还。`scavenger` 分批归还,刚释放时 RSS 不会立刻降。',
                  '原因二:`MADV_FREE` 行为。Go 1.16+ 默认用 `MADV_FREE`,只标记可回收、RSS 不降;`GODEBUG=madvdontneed=1` 可恢复立刻归还。',
                  '原因三:堆碎片 + 非堆内存。大小混杂导致无法整块归还;另外 goroutine 栈、cgo、`mmap`、`Pool`/全局 map 持有引用都不在 heap profile 的 `inuse` 里。',
                  '排查:`runtime/metrics` 的 `memory/classes/*` 分类、`/proc/<pid>/smaps`、`pprof -alloc_space` 看累计分配热点。',
                ],
                depth: '一个典型误判案例:服务里有个 `map[string][]byte` 缓存且没有淘汰策略——heap profile 的 `inuse_space` 会显示它,但很多人只看 `alloc_space`(累计)就以为是「分配太多」,于是去优化分配,结果毫无效果。看 `inuse` 才能定位「谁在持有」。',
              },
              {
                kind: 'question',
                title: 'Q70 · Go 里有哪些隐蔽的内存泄漏场景？',
                questionId: 'go-index-Q70',
                intent: '隐蔽的内存泄漏场景:Go 有 GC 但照样会漏。',
                points: [
                  '引用被长期持有:全局 `map` 当缓存无淘汰、`sync.Pool` 里存超大对象、slice 长期持有大数组的一小段(`big[:1]` 拖住整个 `big`)。',
                  'goroutine 泄漏连带内存:阻塞在 `<-ch` / `WaitGroup.Wait` / `time.After` 的 goroutine 永不退出,栈与闭包捕获的对象都不释放。',
                  'time.Ticker 未 Stop。被 `time.NewTicker` 创建后忘记 `Stop`,ticker 及其闭包常驻。',
                  '切片/字符串的「子串陷阱」:`s[i:j]` 与 `substr` 共享底层数组,只要还持有小片段,整块大内存就无法回收;解法是 `string([]byte(sub))` 或 `append([]byte(nil), sub...)` 做真拷贝。',
                ],
                followup: '「怎么确认是泄漏而不是没到 GC 时机?」 连续打两次 `runtime.GC()` 后再看 `heap_inuse`——如果还是持续上涨,才是真泄漏;否则只是没触发 GC。',
              },
              {
                kind: 'question',
                title: 'Q71 · Go 什么时候把内存还给操作系统？为什么 RSS 降不下来？',
                questionId: 'go-index-Q71',
                intent: 'Go 什么时候把内存还给 OS、为什么 RSS 降不下来。',
                points: [
                  '机制:GC 清扫后,空闲页不立即归还;由后台 `scavenger` 按「堆目标」分批 `madvise` 归还。Go 1.16 起默认 `MADV_FREE`(标记可回收,RSS 不降);`MADV_DONTNEED` 会立刻降 RSS。',
                  '为什么降不下来:① 惰性分批;② `MADV_FREE` 语义;③ 堆碎片导致无法整块归还;④ RSS 里还有 goroutine 栈、cgo、mmap 等非 Go 堆内存。',
                  '操作手段:`GODEBUG=madvdontneed=1`(立刻归还但更慢)、`GOMEMLIMIT`(给 GC 压力更积极回收)、`debug.FreeOSMemory()`(强制一次,仅调试用)。',
                ],
                depth: '在容器里要特别注意:`GOMEMLIMIT` 应设为 limit 的 80%~90%,留出「非 Go 堆内存 + 瞬时峰值」的空间。如果按 limit 的 100% 设,GC 会为了「绝不超」而疯狂运行,导致 CPU 打满、延迟飙升——这比 OOM 更难查。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'perf',
      title: 'D · 标准库与性能分析',
      goal: '用工具把性能问题定位到函数级',
      summary:
        '最后一阶段从原理转向工具：pprof 的四类 profile 各看什么、benchmark 怎么写才可信、以及标准库里那些容易踩的坑。这部分内容在面试里通常以「你怎么优化」的形式出现。',
      lessons: [
        {
          id: 'go-stdlib',
          title: '标准库与运行时要点',
          kind: 'concept',
          sources: [{ topic: 'go-index', chapters: ['标准库与运行时'] }],
          content: {
            intro:
              '标准库的题目有个共同特点:「会用」和「用对」之间隔着一层坑。`encoding/json` 会把 `int64` 变成浮点丢精度、会忽略未导出字段、会把 `nil` 切片序列化成 `null`;`time` 包的时间比较会受单调时钟影响、`Ticker` 不 `Stop` 就泄漏;`database/sql` 的四个池参数如果配错,会出现「连接数打满但 QPS 上不去」。这一节按「反射 → json → time → io → 数据库 → 工程」的顺序,把每个包最容易被追问的坑列清楚,并给出替代方案——因为标准库的坑,大多有更好的写法可以绕开。',
            outline: [
              '反射三条铁律:`Type` 与 `Value` 分开、`Value` 不能凭空创建、要 `Set` 必须可寻址',
              'json 六个坑:`int64` 精度、`omitempty` 对零值、`nil` 切片变 `null`、未导出字段、`time.Time` 格式、`HTML` 转义',
              '`time` 三个坑:时区缺失、单调时钟、`Ticker` 泄漏',
              '`database/sql` 四参数:`MaxOpen` / `MaxIdle` / `MaxLifetime` / `MaxIdleTime`',
              '工程要点:`go.mod` 的 MVS、优雅退出的四步、`strconv` 远快于 `fmt`',
            ],
            pitfalls: [
              '用 `json.Unmarshal` 解大整数到 `int64` 字段——JSON 数字默认按 `float64` 解析,超过 2^53 会丢精度;要 `UseNumber()` 或解到 `json.Number`。',
              '`Ticker` 创建后忘记 `Stop`——它会让整个 goroutine 和闭包常驻,是标准库里最经典的泄漏源。',
              '`MaxOpenConns` 设得比数据库 `max_connections` 还大——结果是「一半连接被拒」,应用侧表现为随机超时,排查方向完全跑偏。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '反射的三条铁律:为什么它又慢又容易 panic',
                body: [
                  '`reflect` 包干的事是「在运行时检查与操作类型」,而编译期已经知道的东西,运行时再做一遍必然要付代价。具体代价有两块:类型信息查找(走 `type` 元数据的链表与哈希)+ 值操作(装箱、解箱、边界检查)。',
                  '铁律一:`reflect.Type` 与 `reflect.Value` 是两个东西。`Type` 描述「这个类型长什么样」(字段、方法、大小、kind),`Value` 描述「这个具体的值」。要操作值必须拿到 `Value`;要看结构则用 `Type`。',
                  '铁律二:`Value` 不能凭空创建。你只能用 `reflect.ValueOf(x)` 从已有值拿到 `Value`,或者用 `reflect.New(T)` / `reflect.Zero(T)` 造新的。`reflect.Value{}` 的零值是「无效 Value」,任何操作都 panic。',
                  '铁律三:要 `Set`,必须「可寻址」。`reflect.ValueOf(x).Set(...)` 一定 panic(`using unaddressable value`),因为 `ValueOf` 拿到的是 `x` 的副本。正确做法是 `reflect.ValueOf(&x).Elem()`,先拿指针再 `Elem()` 解引用,这样才可寻址。这一条是反射最容易踩的坑,而且报错信息不够直观。',
                  '为什么慢:① 每次 `ValueOf` 可能触发装箱(把值拷到堆上的 `interface{}`);② 字段访问是按名字线性查找(或用 `Type.FieldByName`,内部建了 map 但仍是间接);③ 调用方法要构造参数切片(`[]Value`),这会分配;④ 编译器无法内联、无法做类型特化。所以热点路径上出现反射,基本等于性能事故。',
                ],
              },
              {
                kind: 'diagram',
                title: '反射取值与设值的两条路径',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '`reflect.ValueOf(x)`', note: '拿到 x 的副本,不可寻址 → 只能读' },
                    { label: '`reflect.ValueOf(&x).Elem()`', note: '先拿指针再解引用 → 可寻址 → 可以 Set' },
                    { label: '`v.Kind()` 判断底层类别', note: '注意是 `Kind` 不是 `Type`:Kind 只有 26 种,Type 无穷' },
                    { label: '`v.Field(i)` / `FieldByName` 取字段', note: '未导出字段的 `CanSet` 为 false' },
                    { label: '`v.Set(newVal)`', note: '要求 `CanSet() == true`,且类型可赋值' },
                  ],
                  caption: '记住「可寻址」这个门槛:所有「反射改不了值」的问题,根因都是忘了先取地址。',
                },
              },
              {
                kind: 'code',
                title: '反射改值的唯一正确写法',
                lang: 'go',
                code:
                  "package main\n\nimport (\n\t\"fmt\"\n\t\"reflect\"\n)\n\ntype User struct {\n\tName string\n\tAge  int\n\thash string // 未导出,反射也改不了\n}\n\nfunc main() {\n\tu := User{Name: \"a\", Age: 1}\n\n\t// 错误:ValueOf(u) 是副本,不可寻址\n\t// reflect.ValueOf(u).FieldByName(\"Name\").SetString(\"b\") // panic\n\n\t// 正确:先取地址再 Elem\n\tv := reflect.ValueOf(&u).Elem()\n\tv.FieldByName(\"Name\").SetString(\"b\")\n\tv.FieldByName(\"Age\").SetInt(18)\n\tfmt.Println(u) // {b 18 }\n\n\t// 未导出字段:CanSet 为 false\n\th := v.FieldByName(\"hash\")\n\tfmt.Println(\"hash CanSet =\", h.CanSet()) // false\n\n\t// 遍历字段:Type 与 Kind 的配合\n\tt := v.Type()\n\tfor i := 0; i < t.NumField(); i++ {\n\t\tf := t.Field(i)\n\t\tfmt.Printf(\"%s kind=%v tag=%q\\n\", f.Name, f.Type.Kind(), f.Tag.Get(\"json\"))\n\t}\n}\n",
                caption: '`CanSet` 为 false 的两种情况:「不可寻址」和「未导出字段」。后者在反射库里是硬限制,无法绕过(除非用 `unsafe`)。',
                notes: [
                  { line: 'reflect.ValueOf(&u).Elem()', text: '`Elem()` 的作用是「解引用指针」,得到的 `Value` 指向 `u` 本身,所以可寻址。' },
                  { line: 'fmt.Println("hash CanSet =", h.CanSet())', text: '未导出字段永远是只读的——这是反射库刻意保留的封装边界。' },
                  { line: 'f.Type.Kind()', text: '`Kind` 是「底层类别」(如 `struct`、`ptr`、`slice`),`Type` 是「具体类型」。判断该用哪个分支时看 `Kind`。' },
                ],
              },
              {
                kind: 'principle',
                title: '`encoding/json` 的六个坑',
                body: [
                  '`encoding/json` 是标准库最常用的包,也是坑最多的包。六个坑全部来自「JSON 的类型系统比 Go 弱」这一件事。',
                ],
                steps: [
                  {
                    title: '① 数字默认按 `float64` 解析 → 大整数丢精度',
                    detail:
                      '`json.Unmarshal` 到 `map[string]any` 时,所有数字都变成 `float64`。而 `float64` 只有 53 位有效位,所以 `int64` 超过 2^53 的 ID(比如雪花 ID)会丢精度。解法:用 `json.Decoder` 的 `UseNumber()`,或直接解到有具体类型的 struct。',
                  },
                  {
                    title: '② `omitempty` 对「零值」全部生效,包括 `false` 和 `0`',
                    detail:
                      '`omitempty` 的语义是「零值就省略」,而 `false`、`0`、`""`、`nil` 都是零值。所以「用户明确把开关设成 `false`」会被省略,前端拿到的是「字段不存在」而不是 `false`——这两者语义完全不同。解法:用 `*bool` 指针(区分「没传」和「传了 false」),或 Go 1.24 的 `omitzero`。',
                  },
                  {
                    title: '③ `nil` 切片序列化成 `null`,不是 `[]`',
                    detail:
                      '`var s []int` 序列化是 `null`,而 `s := []int{}` 是 `[]`。前端拿到 `null` 去 `.map()` 会直接报错。解法:要么初始化成空切片,要么在 API 层统一用自定义 `MarshalJSON` 把 nil 转成 `[]`。',
                  },
                  {
                    title: '④ 未导出字段既不序列化也不反序列化',
                    detail:
                      '`json` 只能处理导出字段(首字母大写)。所以「结构体里有小写字段,反序列化后是零值」是必然行为,不是 bug。要参与序列化必须导出,并用 tag 控制名字。',
                  },
                  {
                    title: '⑤ `time.Time` 只认 RFC3339,且带时区偏移',
                    detail:
                      '默认序列化格式是 `2006-01-02T15:04:05Z07:00`。如果你的接口文档写的是 `2006-01-02 15:04:05`,那 `Unmarshal` 会失败——必须自定义类型实现 `MarshalJSON`/`UnmarshalJSON`。另一个坑:不带时区的时间字符串会被当成 UTC 解析,于是「看起来差了 8 小时」。',
                  },
                  {
                    title: '⑥ `HTML` 转义:`<` `>` `&` 会被转成 `\\u003c` 等',
                    detail:
                      '`json.Marshal` 默认转义 HTML 特殊字符(为防 XSS)。如果对端期望原字符(比如生成 SQL 片段或前端直接用),就会看到一堆 `\\u003c`。解法:用 `json.Encoder` 并 `SetEscapeHTML(false)`。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '六个坑的症状与解法',
                diagram: {
                  type: 'matrix',
                  head: ['坑', '症状', '根因', '解法'],
                  cols: ['症状', '根因', '解法'],
                  rows: [
                    ['大整数丢精度', '雪花 ID 末几位变成 0', '默认 `float64`,只有 53 位有效位', '`UseNumber()` 或解到具体类型'],
                    ['`omitempty` 省略 `false`', '开关关不掉,前端拿不到字段', '`false` 是零值', '用 `*bool` 或 Go 1.24 `omitzero`'],
                    ['`nil` 切片变 `null`', '前端 `.map()` 报错', '`nil` 与空切片序列化不同', '初始化为 `[]T{}` 或自定义 `MarshalJSON`'],
                    ['未导出字段是零值', '反序列化后某个字段总是空', 'json 只处理导出字段', '改为导出 + tag'],
                    ['`time.Time` 解析失败', '400 Bad Request', '只认 RFC3339', '自定义类型实现 `UnmarshalJSON`'],
                    ['出现 `\\u003c`', '对端收到的字符串不对', '默认转义 HTML 字符', '`SetEscapeHTML(false)`'],
                  ],
                  caption: '这六条几乎覆盖了「JSON 接口对接 bug」的全部形态。写 API 时把这张表当 checklist 过一遍,能省掉大量联调时间。',
                },
              },
              {
                kind: 'concept',
                title: '`time` 包的三个坑:时区、单调时钟、`Ticker`',
                body: [
                  '坑一:时区缺失。`time.Parse("2006-01-02 15:04:05", s)` 解析出来的 `Time` 是 UTC,因为格式里没有时区信息。而 `time.Now()` 是本地时区。两者相减就会差 8 小时(在 CST)。解法:要么用 `time.ParseInLocation` 显式指定时区,要么在格式里带上时区(`Z07:00`)。',
                  '坑二:单调时钟与「墙钟」是两个分量。Go 的 `Time` 内部同时存「墙钟时间」和「单调时钟读数」(`monotonic clock`)。`time.Since(t)` 优先用单调时钟,所以即使系统时间被 NTP 调整,`Since` 也不会算出负数或跳跃。但 `t.Add(...)` 与 `t.Sub(...)` 之后,单调分量可能丢失;而用 `==` 比较两个 `Time` 也会比较单调分量——所以「两个时间是否相等」应该用 `t1.Equal(t2)`,不是 `t1 == t2`。',
                  '坑三:`Ticker` 不 `Stop` 就泄漏。`time.NewTicker` 会在运行时注册一个定时器,只有 `Stop()` 才会注销。忘了 `Stop` 的话,定时器永远存在,ticker 的 channel 一直被引用,闭包捕获的对象也无法回收——这是标准库里最经典的泄漏源,而且 pprof 的 `goroutine` profile 里不一定看得到(它不是一个 goroutine)。纪律:`defer ticker.Stop()` 写在 `NewTicker` 的下一行。',
                  '还有一个与 `Ticker` 同源的坑:`time.After` 在 `select` 循环里使用。`time.After(d)` 每次都创建一个新定时器,循环里用它会导致定时器堆积(直到超时才回收)。解法:用 `NewTimer` + `Reset`,或复用同一个 `Ticker`。',
                ],
              },
              {
                kind: 'concept',
                title: '`io.Reader` / `io.Writer`:Go 最重要的两个接口',
                body: [
                  '`io.Reader` 只有一个方法 `Read(p []byte) (n int, err error)`,`io.Writer` 只有一个 `Write(p []byte)`。它们的威力在于「组合」:任何 Reader 都能被任何「吃 Reader 的函数」处理,于是 `gzip`、`base64`、`bufio`、`http`、`os.File` 全部能任意串联。',
                  '组合的具体形态是「装饰器」:`gzip.NewReader(bufio.NewReader(file))`——从外到内三层,但每一层都只依赖 `io.Reader` 接口。这种「接口小 + 组合自由」正是 Go 设计哲学的核心体现。',
                  '`bufio` 解决的问题是「系统调用太贵」。直接对文件/网络做小批量 `Read` 会产生大量系统调用,而 `bufio.Reader` 一次性读 4KB 到内部缓冲,后续小读都从缓冲里拿——这就是「为什么按行读文件必须用 `bufio.Scanner`」的原因。同理 `bufio.Writer` 把小的 `Write` 攒起来,`Flush` 时一次写出。',
                  '三个实用细节。① `Read` 返回 `n > 0` 时,必须先把这 `n` 字节处理完再看 `err`——因为「读到最后一块数据 + `io.EOF`」是合法的同时返回。② 判断「读完了」要用 `errors.Is(err, io.EOF)`,而不是 `err == io.EOF`(包装后不相等)。③ `io.Copy` 会自动用 `WriterTo`/`ReaderFrom` 快路径(比如文件到 socket 走 `sendfile`),比手写循环快得多。',
                ],
              },
              {
                kind: 'principle',
                title: '`database/sql` 的四个池参数:配错的典型症状',
                body: [
                  '`database/sql` 是一个「连接池 + 接口抽象」,它的四个参数配错会产生非常迷惑的现象。顺序不能乱,因为它们是互相约束的。',
                ],
                steps: [
                  {
                    title: '① `MaxOpenConns`:池中最大连接数(含使用中 + 空闲)',
                    detail:
                      '默认 0 = 不限制,这会「连接数无限增长直到数据库拒绝」。必须显式设置。上限的约束是「应用实例数 × `MaxOpenConns` ≤ 数据库 `max_connections`」,并且要留余量给运维和别的服务。症状:如果设得比数据库上限还大,会随机出现「连接被拒」,表现为随机超时而不是报错,极难排查。',
                  },
                  {
                    title: '② `MaxIdleConns`:最大空闲连接数',
                    detail:
                      '必须 ≤ `MaxOpenConns`;如果设得比它大,`database/sql` 会静默把它降下来。设得太小会导致「连接频繁创建销毁」——每次建连要 TCP 三次握手 + 认证,几毫秒起。症状:QPS 上不去,但数据库 CPU 很低——因为时间花在建连上。实践上设成等于 `MaxOpenConns`,让池子保持热的。',
                  },
                  {
                    title: '③ `ConnMaxLifetime`:连接最长存活时间',
                    detail:
                      '它解决的是「中间设备悄悄断连」的问题:负载均衡器、NAT、数据库的 `wait_timeout` 都可能在空闲一段时间后断掉连接,而应用还以为是好的。所以要把 `ConnMaxLifetime` 设得小于中间设备的最短超时(通常 3~30 分钟),主动轮换。症状:偶发 `broken pipe` / `connection reset` / `invalid connection`,尤其是在低峰期后的第一个请求。',
                  },
                  {
                    title: '④ `ConnMaxIdleTime`:连接最长空闲时间',
                    detail:
                      '与 `Lifetime` 的区别:`Lifetime` 管「总寿命」,`IdleTime` 管「连续空闲多久就关」。低峰期用它可以释放资源,高峰前不会因为「全是冷连接」而抖动。如果只设 `Lifetime` 不设 `IdleTime`,低峰期的连接会一直占着直到寿命到期——对数据库是浪费。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: '优雅退出:四步,少一步就会丢请求',
                body: [
                  '「优雅退出」要保证两件事:不再接新请求 + 把手上的请求处理完。四步顺序是有依赖的。',
                  '第一步:收到信号后,把 `/healthz` 或 readiness 探针改为失败。这一步必须先做,因为 K8s 需要时间把 Pod 从 Service 的 Endpoints 里摘掉——如果你直接关监听,K8s 还没摘完,新请求仍会被路由过来,直接 502。通常等 3~10 秒(`preStop` hook 的 sleep)让摘除生效。',
                  '第二步:`http.Server.Shutdown(ctx)`。它会:关闭监听(不再接新连接)、等待所有活跃请求完成、返回。注意它不会中断已经建立的长连接(WebSocket / SSE),那些要单独处理。`ctx` 要设超时,否则某个卡住的请求会让退出永远等下去。',
                  '第三步:停止后台任务(定时器、消费者、连接池)。顺序是先停「产生请求的东西」(消费者、ticker),再停「处理请求的东西」,最后关资源(DB、Redis、日志)。反了就会出现「消费者还在拉消息,但数据库已关」。',
                  '第四步:刷日志 + 关 tracing + `os.Exit`。注意 `os.Exit` 不执行 `defer`,所以「刷日志」「关 tracer」必须显式调用完成后再退出。这也是为什么优雅退出要用「显式调用」而不是「靠 defer」。',
                ],
              },
              {
                kind: 'concept',
                title: '`go.mod` 与 MVS:依赖版本是怎么定下来的',
                body: [
                  'Go 的版本选择算法叫 MVS(Minimal Version Selection):对每个模块,选「所有依赖方要求的最低版本中的最高者」。注意关键词:最低——它不是「选最新版」,而是「选能满足所有人的最低版本」。',
                  '举个具体例子。A 依赖 `lib v1.2.0`,B 依赖 `lib v1.5.0`,那么最终选 `v1.5.0`——因为这是「能同时满足两者的最低版本」。而如果 C 依赖 `lib v2.0.0`,由于 `v2` 是大版本,模块路径会变成 `lib/v2`,被视为另一个模块,于是两个版本可以共存。',
                  '这套设计的好处是「可预测」:同样的 `go.mod` 集合,任何人都能算出同样的结果,不需要解析整个依赖树、不需要「锁文件」。`go.sum` 不是锁文件,它是校验和清单,用来防篡改。',
                  '三个常用命令。`go mod tidy`:补齐缺失、删除未用。`go mod graph`:打印依赖图,排查「为什么引入了这个版本」。`go mod why -m X`:解释「为什么要这个模块」。还有 `replace` 指令可以临时替换成本地路径或 fork——但上线前必须删掉,否则 CI 会找不到。',
                ],
              },
              {
                kind: 'compare',
                title: '`strconv` vs `fmt`:数量级的差距',
                head: ['任务', '慢的方式', '快的方式', '差距', '原因'],
                cols: ['慢的方式', '快的方式', '差距', '原因'],
                rows: [
                  ['int → string', '`fmt.Sprint(n)`', '`strconv.Itoa(n)`', '约 3~5 倍', '`fmt` 走反射 + 格式解析'],
                  ['string → int', '`fmt.Sscan(s, &n)`', '`strconv.Atoi(s)`', '约 10 倍', '`fmt` 要解析格式串'],
                  ['float → string', '`fmt.Sprintf("%f", f)`', '`strconv.FormatFloat(...)`', '约 3 倍', '`Sprintf` 分配格式缓冲区'],
                  ['bool → string', '`fmt.Sprint(b)`', '`strconv.FormatBool(b)`', '约 5 倍', '反射 + 装箱'],
                  ['拼字符串', '`fmt.Sprintf("%s:%d", s, n)`', '`s + ":" + strconv.Itoa(n)`', '约 2~3 倍', '`Sprintf` 每次都新建 buffer'],
                ],
                note: '判据:`fmt` 用在「日志、错误信息、一次性输出」;`strconv` 用在「热点路径、序列化、协议编码」。两者可读性差距不大,但性能差距是数量级。',
              },
              {
                kind: 'compare',
                title: '`sort.Slice` 与 `slices.Sort`:同一件事,一层反射的差距',
                body: [
                  '这两个函数排的都是切片,区别不在用法而在编译器知道多少。`sort.Slice` 是 `interface{}` 时代的产物:它接收一个 `less(i, j int) bool`,自己并不知道元素是什么类型,交换元素只能靠 `reflect.Swapper` 现场造一个交换函数——[[每一次交换都走一次反射加两次接口调用]]。',
                  '`slices.Sort` 是 Go 1.21 引入的泛型版本:元素类型在编译期就定死了,排序过程由 `cmp.Ordered` 约束下的普通比较驱动,没有反射、没有接口装箱。所以官方在新代码里一律推荐后者,不是因为「新」,而是因为少了一层运行期开销。',
                  '稳定性是另一半问题,而且两者默认都不稳定。稳定排序的代价是额外内存:它不能随意远距离交换,只能相邻搬移,于是既要更多移动、又要一块临时缓冲。所以只有当你「先按次关键字排、再按主关键字排」这种两趟排序时,才需要 `slices.SortStableFunc` / `sort.SliceStable`。',
                ],
                head: ['维度', '`sort.Slice`', '`slices.Sort`'],
                rows: [
                  ['引入版本', 'Go 1.8(随 `reflect.Swapper` 一起)', 'Go 1.21(泛型)'],
                  ['元素类型', '`interface{}`,运行期才知', '编译期确定(`cmp.Ordered`)'],
                  ['比较函数', '`less(i, j int) bool`,靠下标', '`Sequence` 元素本身,直接给值'],
                  ['交换方式', '`reflect.Swapper` 造交换函数,反射加接口调用', '直接赋值,可内联'],
                  ['是否稳定', '否(`sort.SliceStable` 才是)', '否(`slices.SortStableFunc` 才是)'],
                  ['什么时候还用旧的', '元素不是有序类型、要自定义比较,且不想引泛型约束', '新代码默认用它'],
                ],
                note: '「稳定性」的准确含义:相等元素在排序后保持原有相对顺序。它只在多关键字场景里才有意义——先按时间排一次,再用稳定排序按状态排一次,时间序才不会被破坏;如果不稳定,第二步会把第一步的结果打乱。',
                caption:
                  '面试里这道题的分水岭是能不能说出「为什么后者快」:答「泛型更快」是背的,答「`sort.Slice` 每次交换要过一遍 `reflect.Swapper`,而泛型版本编译期就把类型定死了,可以直接赋值」才是懂了。再补一句「两者都不稳定,要稳定得显式选 Stable 版本」,这题就完整了。',
              },
              {
                kind: 'question',
                title: 'Q90 · 反射的原理是什么？为什么慢？什么时候必须用？',
                questionId: 'go-index-Q90',
                intent: '反射的原理与「为什么慢」,以及什么时候必须用。',
                points: [
                  '原理:`reflect.Type` 从 `_type` 元数据读出类型结构(字段、方法、kind);`reflect.Value` 是「类型指针 + 数据指针」的组合。每次 `ValueOf` 可能装箱,字段访问按名查找,方法调用要构造 `[]Value` 参数切片。',
                  '为什么慢:① 装箱分配;② 无法内联、无法类型特化;③ 方法调用走 `Call` 的通用路径;④ 字段访问有边界检查与名字查找。所以热点路径用反射基本等于性能事故。',
                  '必须用的场景:序列化/反序列化(不知道类型)、ORM 的字段映射、通用校验、`encoding/json` 本身、测试断言库。能用泛型或代码生成替代的地方优先替代(`easyjson`/`stringer` 就是代码生成的例子)。',
                ],
                depth: '三条使用铁律:① `Value` 要 `Set` 必须可寻址(`ValueOf(&x).Elem()`);② 未导出字段 `CanSet` 恒为 false;③ 判断类别用 `Kind` 而不是 `Type`。这三条踩了就是 panic。',
              },
              {
                kind: 'question',
                title: 'Q91 · encoding/json 有哪些常见的坑？',
                questionId: 'go-index-Q91',
                intent: '`encoding/json` 的常见坑,要按「类型系统差异」归类。',
                points: [
                  '精度类:数字默认解析成 `float64` → 大整数(>2^53)丢精度;解法 `UseNumber()` 或解到具体类型。',
                  '语义类:`omitempty` 省略 `false`/`0`/`""`(用 `*T` 或 Go 1.24 `omitzero`);`nil` 切片变 `null`(初始化成 `[]T{}`);未导出字段不参与(必须导出 + tag)。',
                  '格式类:`time.Time` 只认 RFC3339(需自定义 `MarshalJSON`);默认 HTML 转义(`SetEscapeHTML(false)` 关闭)。',
                ],
                followup: '「怎么优化 JSON 性能?」 ① 用 `easyjson`/`sonic` 等代码生成或 JIT 方案(2~5 倍);② 复用 `json.Encoder`/`Decoder` 减少分配;③ 大对象用 `json.RawMessage` 延迟解析;④ 热点路径改用 protobuf/msgpack。但先测再优化——大多数服务的 JSON 不是瓶颈。',
              },
              {
                kind: 'question',
                title: 'Q97 · database/sql 的连接池参数怎么理解？常见配置错误是什么？',
                questionId: 'go-index-Q97',
                intent: '四个池参数的含义与配错后的症状,这是最实操的一题。',
                points: [
                  '`MaxOpenConns`:池中最大连接数(含使用中),默认 0 = 不限;必须显式设,且「实例数 × 它 ≤ 数据库上限」并留余量。太大 → 随机「连接被拒」超时。',
                  '`MaxIdleConns`:最大空闲数,必须 ≤ `MaxOpenConns`(超过会被静默降低);设太小 → 频繁建连,QPS 上不去但数据库很闲;实践设为等于 `MaxOpenConns`。',
                  '`ConnMaxLifetime`:连接总寿命;必须小于中间设备( LB / NAT / DB `wait_timeout`)的最短超时,避免用到被悄悄断掉的连接(偶发 `invalid connection`)。',
                  '`ConnMaxIdleTime`:连续空闲多久关闭;低峰期释放资源用。与 `Lifetime` 互补,不是替代。',
                ],
                depth: '一个真实排障场景:「QPS 上不去,数据库 CPU 只有 10%」。先看 `sql.DBStats`(`OpenConnections`/`WaitCount`/`WaitDuration`)——如果 `WaitCount` 在涨,说明池子不够大;如果 `OpenConnections` 远小于 `MaxOpen`,说明瓶颈不在池子。这个区分能省掉大量瞎调。',
              },
              {
                kind: 'question',
                title: 'Q98 · Go 服务如何实现优雅退出？',
                questionId: 'go-index-Q98',
                intent: '优雅退出的四步与两个易漏点。',
                points: [
                  '四步:① 探针转失败 + 等 K8s 摘除(3~10s);② `server.Shutdown(ctx)`(关监听 + 等活跃请求,`ctx` 要带超时);③ 停后台任务(消费者、ticker),再关资源(DB/Redis);④ 刷日志、关 tracer,再 `os.Exit`。',
                  '易漏一:顺序。先摘流量再关监听,否则 K8s 还没摘完就 502;先停「产生请求的」再停「处理请求的」,否则会「拉到消息但 DB 已关」。',
                  '易漏二:`os.Exit` 不执行 `defer`。所以「刷日志/关 tracer」必须显式调用完成;`Shutdown` 也要用显式 `ctx` 超时,否则卡住的请求会让退出无限等待(最终被 K8s `SIGKILL`,等于没优雅)。',
                ],
                followup: '「长连接(WebSocket)怎么优雅退出?」 `Shutdown` 不会中断已建立的长连接,所以要么主动向客户端发关闭帧并等待,要么给一个「宽限期」后强制 `Close`。实践上通常把长连接服务与短连接服务分开部署,避免互相拖累。',
              },
            ],
          },
        },
        {
          id: 'go-perf',
          title: 'pprof 与性能调优',
          kind: 'concept',
          sources: [
            { topic: 'go-03', chapters: ['性能分析'] },
            { topic: 'go-index', chapters: ['性能优化与调试'] },
          ],
          content: {
            intro:
              '性能优化最容易犯的错是「不测量就动手」——凭直觉猜瓶颈,九成猜错,而且改完不知道有没有变好。所以这一节的主线是工具链:pprof 的七种 profile 各自回答什么问题、火焰图怎么从「宽」和「深」两个维度找瓶颈、benchmark 的五个坑为什么会让测量结果失真。然后再讲两类具体的症状:CPU 100% 的排查命令链(从 `top` 到 `pprof` 到具体函数)和 p99 毛刺的七个可能原因(因为它往往不是「代码慢」,而是 GC、锁、连接池、调度抖动)。最后落到「减少分配」的六个手段——Go 的性能优化,八成都在这一件事上。',
            outline: [
              '先测量后优化:`benchmark` → `pprof` → 改 → 再 `benchmark`,闭环才算优化',
              '七种 profile:`cpu` / `heap` / `allocs` / `goroutine` / `block` / `mutex` / `threadcreate`',
              '火焰图两个维度:宽度=耗时占比,深度=调用栈;找「宽而平」的那一层',
              'benchmark 五坑:没重置计时器、编译器优化掉、循环体太短、没设 `GOMAXPROCS`、忽略 `allocs/op`',
              'p99 毛刺:GC 辅助标记、锁竞争、连接池、调度抖动、`timer` 堆积、日志同步写、缺页',
            ],
            pitfalls: [
              '用 `time.Now()` 手工测一次函数耗时——没有统计意义,而且会被编译器优化掉;必须用 `testing.B`。',
              '只看平均值(`avg`)不看 `p99`——平均值 10ms 的服务里 p99 可能是 800ms,用户的体感是后者。',
              '在 `benchmark` 里用了 `b.N` 之外的全局状态——多次运行会互相污染,结果不可复现。',
            ],
            sections: [
              {
                kind: 'concept',
                title: '优化的黄金流程:测量 → 定位 → 改 → 再测量',
                body: [
                  '「先测量再优化」这句话被说烂了,但真正的关键是测量必须有对照。也就是说:改之前要有 baseline,改之后要有同样的测量,中间只变一个变量。没有 baseline 的「优化」是玄学。',
                  '具体流程是四步。① 用 `benchmark` 建 baseline(`-benchmem` 拿到 `ns/op` 和 `allocs/op`)。② 用 `pprof` 定位「时间/内存花在哪」。③ 只改一个地方。④ 重跑 `benchmark`,用 `benchstat` 对比。如果没变好就回滚——不要留着「看起来更优雅但不更快」的改动。',
                  '为什么必须用 `benchmark` 而不是 `time.Now()`? 因为:① 单次测量受调度、GC、缓存影响极大;② `testing.B` 会自动决定迭代次数并给出统计;③ 它会跑多轮取稳定值;④ `-benchmem` 能给出分配次数,这是比耗时更稳定的指标。',
                  '还有一个纪律:优化前先确认「这是不是瓶颈」。如果服务 99% 的时间在等数据库,那么优化 JSON 序列化毫无意义。先用全局视角的工具(`pprof` 的 CPU profile、`trace`、或者链路追踪)找到占比最大的那一段,再钻进去。「先粗后细」是唯一可行的顺序。',
                ],
              },
              {
                kind: 'diagram',
                title: '七种 profile 各回答什么问题',
                diagram: {
                  type: 'matrix',
                  head: ['profile', '回答的问题', '默认采样方式', '典型用途'],
                  cols: ['回答的问题', '默认采样方式', '典型用途'],
                  rows: [
                    ['`cpu`', 'CPU 时间花在哪些函数上', '100Hz 采样(每 10ms 一次)', '找 CPU 热点'],
                    ['`heap`', '当前存活对象占多少内存、谁分配的', '每 512KB 分配采样一次', '找内存占用与泄漏'],
                    ['`allocs`', '累计分配了多少(含已回收)', '同上,但统计累计', '找分配热点(GC 压力源头)'],
                    ['`goroutine`', '当前所有 goroutine 的栈', '全量快照', '找泄漏、找阻塞点'],
                    ['`block`', '阻塞在同步原语上的时间', '默认关闭,需 `SetBlockProfileRate`', '找锁/channel 等待'],
                    ['`mutex`', '锁竞争的时间与次数', '默认关闭,需 `SetMutexProfileFraction`', '找锁热点'],
                    ['`threadcreate`', 'OS 线程创建情况', '全量快照', '查「线程数暴涨」(cgo/阻塞 IO)'],
                  ],
                  caption: '注意 `heap` 与 `allocs` 的区别:`heap` 的 `inuse_space` 是「现在占用」,`allocs` 的 `alloc_space` 是「历史累计」。查泄漏看前者,查 GC 压力看后者。',
                },
              },
              {
                kind: 'concept',
                title: '火焰图怎么读:宽度是耗时,深度是调用栈',
                body: [
                  '火焰图的每一层是一个调用栈层级,横向宽度表示「该函数占了多少采样」(即耗时占比)。所以读图只有两个动作:找「最宽的那一层」,和「最宽的叶子节点」。',
                  '「宽而平」说明什么? 如果一个函数很宽,但它的子函数都很窄(或者没有子函数),说明时间就花在它自己身上——这是「自身耗时高」,通常是计算密集或者循环太多。这类是最好优化的:直接改它的算法或减少调用次数。',
                  '「窄而深」说明什么? 如果某个分支很窄但很深,说明耗时分散在很多小函数里——这通常是「调用次数太多」或者「框架开销」,优化手段是减少层级(比如去掉不必要的中间件)或者批量处理。',
                  '一个非常实用的技巧:看「有没有意外宽的函数」。比如你只改了一行业务代码,但火焰图里 `runtime.mallocgc` 占了 30%——这说明真正的瓶颈是分配,而不是业务逻辑。同理 `runtime.gcBgMarkWorker` 宽、`sync.(*Mutex).Lock` 宽、`syscall.Syscall` 宽,各自指向不同的问题(GC 压力、锁竞争、系统调用过多)。',
                  '火焰图也有盲区:它是采样的,采样周期内的短命函数可能采不到;而且它只反映CPU 时间,「阻塞等待」在 CPU profile 里根本看不出来——那种情况必须用 `block`/`mutex` profile 或 `go tool trace`。这是最常见的误用:「服务慢了,看 CPU 火焰图发现没热点」——因为瓶颈在等 IO,不在算。',
                ],
              },
              {
                kind: 'concept',
                title: 'CPU 100% 的排查命令链',
                body: [
                  '这是最经典的线上问题,流程是固定的五步。',
                  '第一步:确认是哪个进程。`top`(或 `docker stats`)看 CPU 占用最高的进程,记下 PID。同时看它是「用户态高(`us`)」还是「内核态高(`sy`)」还是「等待高(`wa`)」——`us` 高是计算,`sy` 高是系统调用,`wa` 高是 IO。三者指向完全不同的方向。',
                  '第二步:确认是哪个线程。`top -Hp <pid>`(或 `ps -T -p <pid>`)看线程级 CPU。Go 是 M:N 模型,所以「某个线程 100%」通常只是「某个 M 上跑着一个死循环的 G」,不代表那个 M 有问题。',
                  '第三步:抓 Go 的 CPU profile。如果开了 `net/http/pprof`,`curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.pprof` 然后 `go tool pprof -http=:8080 cpu.pprof`。没开 pprof 的话,用 `perf record -p <pid>` 或者 `gdb` 抓栈应急。',
                  '第四步:看火焰图找热点。最常见的三类热点:① 业务里的死循环或正则回溯;② `runtime.mallocgc` 或 `gcBgMarkWorker`(分配太多,GC 打满);③ `sync.(*Mutex).Lock` 或 `runtime.lock`(锁竞争或自旋)。',
                  '第五步:如果 pprof 抓不到(比如卡在系统调用),用 `go tool trace`。`trace` 能看「G 在哪个状态待了多久」,能区分「在跑」「在等锁」「在等网络」「在等 GC」——这是比 CPU profile 更细的视角。',
                  '还有一个快速止血手段:如果确认是「某个接口被刷」,先在网关层限流;如果是「GC 打满」,临时调大 `GOGC` 或设 `GOMEMLIMIT` 换时间。止血之后再慢慢定位——线上问题的第一目标永远是恢复,不是找到根因。',
                ],
              },
              {
                kind: 'code',
                title: '把 pprof 挂上:三行代码 + 一个端口',
                lang: 'go',
                code:
                  "package main\n\nimport (\n\t\"net/http\"\n\t_ \"net/http/pprof\" // 匿名导入即注册 handler\n\t\"runtime\"\n\t\"time\"\n)\n\nfunc main() {\n\t// 1) 起一个独立的 pprof 端口,不要放在业务端口上\n\tgo func() {\n\t\thttp.ListenAndServe(\"127.0.0.1:6060\", nil)\n\t}()\n\n\t// 2) 关键:开启 block / mutex profile(默认关闭)\n\truntime.SetBlockProfileRate(1)      // 1 = 全采样,生产建议 10000 降低开销\n\truntime.SetMutexProfileFraction(1)  // 1 = 全采样\n\n\t// 3) 业务代码\n\tfor {\n\t\ttime.Sleep(time.Second)\n\t}\n}\n\n// 采集:\n//   go tool pprof -http=:8081 http://127.0.0.1:6060/debug/pprof/profile?seconds=30  # CPU\n//   go tool pprof -http=:8081 http://127.0.0.1:6060/debug/pprof/heap                     # 内存\n//   go tool pprof -http=:8081 http://127.0.0.1:6060/debug/pprof/goroutine                # 协程\n//   go tool pprof -http=:8081 http://127.0.0.1:6060/debug/pprof/block                    # 阻塞\n//   go tool pprof -http=:8081 http://127.0.0.1:6060/debug/pprof/mutex                    # 锁竞争\n",
                caption: '`_ "net/http/pprof"` 这一行是全部魔法:它在 `init` 里把 handler 注册到 `DefaultServeMux`。所以千万别把 pprof 挂到业务端口 —— 那是安全漏洞(会暴露栈信息)。',
                notes: [
                  { line: '_ "net/http/pprof"', text: '匿名导入只为触发 `init`,不需要引用包名。注册的是 `/debug/pprof/*` 一组 handler。' },
                  { line: 'runtime.SetBlockProfileRate(1)', text: '`block` 与 `mutex` profile 默认完全不采样,不开就永远是空的——这是「为什么我的 block profile 没数据」的标准答案。' },
                  { line: 'http.ListenAndServe("127.0.0.1:6060", nil)', text: '绑 `127.0.0.1` 而不是 `0.0.0.0`,配合 `kubectl port-forward` 访问——不要对外暴露。' },
                ],
              },
              {
                kind: 'principle',
                title: 'benchmark 的五个坑:测出来的数字不可信',
                body: [
                  '写 `benchmark` 比写业务代码更容易出错,因为「错」不会报错,只会给你一个假数字。五个坑全部会让结果失真。',
                ],
                steps: [
                  {
                    title: '① 没重置计时器 —— 把准备时间算进去了',
                    detail:
                      '`b.N` 是由框架自动调整的,所以准备数据(构造大 slice、读文件)会被重复执行 `N` 次,或者被算进单次耗时。必须 `b.ResetTimer()` 在准备之后调用;如果准备很贵,用 `b.StopTimer()`/`b.StartTimer()` 包住。',
                  },
                  {
                    title: '② 结果被编译器优化掉 —— 测了个空循环',
                    detail:
                      '如果被测函数的返回值没被使用,编译器可能直接把整个调用删掉。解法是把结果赋给一个包级变量(`var Sink int`),或用 `runtime.KeepAlive` —— `Sink` 是标准技巧:`_ = Sink` 就能阻止优化。',
                  },
                  {
                    title: '③ 循环体太短 —— 测的是计时开销',
                    detail:
                      '如果单次操作只有几纳秒,那 `b.N` 循环本身的 `i++` 和计时开销占比就很大。解法是把「多次操作」放进一次迭代(`for i:=0;i<100;i++ { op() }`),再除以 100。或者用 `b.SetBytes` 报告吞吐。',
                  },
                  {
                    title: '④ 没固定 `GOMAXPROCS` 与 GC —— 环境在变',
                    detail:
                      '默认 `benchmark` 会用满所有核,而且 GC 可能在任意时刻触发。解法:用 `b.RunParallel` 测并发;固定 `GOMAXPROCS`(`runtime.GOMAXPROCS(1)`);需要时 `b.ReportAllocs()` 打开分配统计;对比时用 `benchstat` 而不是肉眼比。',
                  },
                  {
                    title: '⑤ 只看 `ns/op`,不看 `allocs/op`',
                    detail:
                      '`ns/op` 会随机器负载波动 ±20%,而 `allocs/op` 是结构性的、完全可复现。所以「优化是否生效」应该先看 `allocs/op` 有没有降。很多「耗时降了」其实是噪声,而「分配降了」是真的。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: 'p99 毛刺:七个原因,大部分不是「代码慢」',
                body: [
                  '平均值 10ms、p99 800ms 的服务,用户体验由后者决定。而毛刺的成因往往和「业务代码」无关,七个方向按概率排序如下。',
                  '① GC 的辅助标记(mark assist)。分配太快时,业务 goroutine 被强制拉去帮 GC 扫对象——表现为「偶发慢几十毫秒,而且和流量正相关」。看 `gctrace` 的 `assist` 占比。',
                  '② 锁竞争。平时无竞争,但流量峰值时排队——表现为「p50 正常、p99 飙升、CPU 不高」。看 `mutex` profile 和 `block` profile。',
                  '③ 连接池排队。`database/sql` 的 `WaitCount`/`WaitDuration`、HTTP 客户端的 `MaxConnsPerHost`——池子满了就排队,排队时间直接进 p99。',
                  '④ 调度抖动。goroutine 数量暴涨、或某个 G 长时间不让出(纯计算),会让其他 G 等待——表现为「CPU 高但吞吐不涨」。看 `schedtrace` 与 `goroutine` 数量。',
                  '⑤ `timer` 堆积。在循环里用 `time.After`,或者大量 `Ticker` 未 `Stop`——定时器堆变大,每次插入/删除更慢,而且内存涨。',
                  '⑥ 日志同步写。同步写文件/Stdout 在高并发下会阻塞(尤其是容器里 stdout 走管道)——表现为「偶发几十毫秒」,而且和日志量正相关。解法:异步日志 + 有界队列 + 丢弃策略。',
                  '⑦ 操作系统层面。缺页中断(内存刚扩容后第一次访问)、CPU 被限流(cgroup `cpu.cfs_quota` 用完被 throttle)、网络重传——这些在 Go 的 profile 里完全看不到,只能看容器指标(`container_cpu_cfs_throttled_seconds`)。',
                ],
              },
              {
                kind: 'diagram',
                title: '毛刺的五个方向与对应工具',
                diagram: {
                  type: 'matrix',
                  head: ['原因', '特征', '看什么', '解法'],
                  cols: ['特征', '看什么', '解法'],
                  rows: [
                    ['GC 辅助标记', '偶发几十 ms,与流量正相关', '`gctrace` 的 `assist` 占比', '减少分配 / 调大 `GOGC`'],
                    ['锁竞争', 'p50 正常、p99 飙升、CPU 不高', '`mutex` / `block` profile', '缩小临界区 / 分片 / 无锁化'],
                    ['连接池排队', '与并发数正相关', '`sql.DBStats.WaitDuration`', '调大池 / 减小单次耗时'],
                    ['调度抖动', 'CPU 高但吞吐不涨', '`schedtrace`、goroutine 数', '减少 goroutine / 拆分计算'],
                    ['cgroup CPU 限流', '周期性(每 100ms 一轮)', '`container_cpu_cfs_throttled`', '提高 limit 或降低突发'],
                  ],
                  caption: '最后一行的「周期性」是关键特征:如果毛刺非常规律(比如每 100ms 一次),优先怀疑 cgroup 限流,而不是 Go 代码。',
                },
              },
              {
                kind: 'concept',
                title: '减少分配的六个手段:Go 性能优化八成在这里',
                body: [
                  'Go 的性能问题,绝大多数最终都归到「分配太多」——因为分配直接推高 GC 压力,而 GC 会吃掉 CPU 并引入延迟。所以「减少分配」的收益是复合的。',
                  '手段一:预分配。`make([]T, 0, n)` 而不是反复 `append`;`strings.Builder` 配合 `Grow(n)`;`bytes.Buffer` 配合 `Grow`。这一条最容易做,收益也最直接。',
                  '手段二:`sync.Pool` 复用热点对象。适合「创建贵、用完即弃」的对象(`[]byte` 缓冲、`json.Encoder`、大结构体)。注意取出来必须 `Reset`。',
                  '手段三:避免不必要的装箱。`fmt.Sprintf`、`interface{}` 参数、`map[string]any` 都会装箱。热点路径改用 `strconv` + 字符串拼接,或用泛型避免接口。',
                  '手段四:用 `[]byte` 而不是 `string` 做中间表示。`string` 不可变,每次「修改」都要新建;处理协议/文本时全程用 `[]byte`,最后一次转 `string`。',
                  '手段五:减少逃逸。返回小结构体而不是指针、避免把局部变量存进接口、避免闭包捕获大对象。用 `-gcflags=-m` 检查。',
                  '手段六:复用请求级对象。每个请求创建 `Context`、`Buffer`、`Decoder` 是常见浪费;用池化或在 handler 外层复用。注意并发安全。',
                ],
              },
              {
                kind: 'compare',
                title: '`[]struct` 与 `[]*struct`:内存、GC、缓存三重差异',
                head: ['维度', '`[]T`(值切片)', '`[]*T`(指针切片)', '说明'],
                cols: ['`[]T`(值切片)', '`[]*T`(指针切片)', '说明'],
                rows: [
                  ['内存布局', '连续,一个 cache line 装多个', '指针连续,对象散落堆上', '遍历时前者缓存命中率高得多'],
                  ['GC 扫描', '扫一个 span,对象内联', '每个指针都要追一次', '百万级元素时 GC 压力差异巨大'],
                  ['分配次数', '1 次(整个数组)', '1 + N 次(每个元素)', '`allocs/op` 差 N 倍'],
                  ['扩容/搬迁', '`append` 会复制所有元素', '只复制指针(8 字节)', '大对象时指针切片扩容便宜'],
                  ['修改共享', '`range` 拿到的是副本,改不动', '`range` 拿到指针,改得动', '这是「为什么用指针切片」的常见理由'],
                  ['适用场景', '小对象、只读遍历、数量大', '大对象、需要原地修改、数量小', '判据是「对象大小 vs 复制成本」'],
                ],
                note: '经验值:元素 < 64 字节且只读遍历 → 用 `[]T`;元素很大或需要共享修改 → 用 `[]*T`。`[]T` 的性能优势在「百万级元素 + 频繁遍历」时非常明显。',
              },
              {
                kind: 'concept',
                title: '压测与容量规划:三个指标决定要几台机器',
                body: [
                  '压测的目标不是「跑出一个 QPS 数字」,而是回答三个问题:单实例能扛多少、瓶颈在哪、扩几台够。',
                  '指标一:吞吐(QPS)与延迟的曲线。必须做「阶梯加压」(并发从 1 到 N),画出 QPS-延迟曲线。关键拐点是「QPS 不再上升而延迟开始飙升」的那个点——那就是单实例的容量上限。只看一个并发下的 QPS 是没有意义的。',
                  '指标二:资源水位与瓶颈定位。压测时要同时看:CPU 利用率、内存(RSS 与 heap)、GC 占比、连接池等待、下游依赖的 RT。如果 CPU 到 70% 就上不去了,说明瓶颈在 CPU;如果 CPU 只有 30% 而 QPS 上不去,说明瓶颈在「等」——等下游、等锁、等连接池。',
                  '指标三:p99 与错误率。容量规划的判据不是「最大 QPS」,而是「p99 达标时的 QPS」。通常取「p99 < 目标值」的最大 QPS,再打 70% 折扣作为常规容量——剩下 30% 留给突发与故障转移。',
                  '最后是「容量 = 峰值 QPS / 单实例容量 × (1 + 冗余系数)」。冗余系数取决于「故障域」:同机房 3 副本可以取 1.5,跨机房要考虑「一个机房全挂」则至少 ×2。这些数字要写进容量文档,而不是每次拍脑袋。',
                ],
              },
              {
                kind: 'question',
                title: 'Q103 · 线上 Go 服务 CPU 突然 100%，你会怎么排查？',
                questionId: 'go-index-Q103',
                intent: 'CPU 100% 的完整排查链,要给出命令与判断依据。',
                points: [
                  '定位进程与类型:`top` 看哪个进程;区分 `us`(计算)/`sy`(系统调用)/`wa`(IO)——三者方向完全不同。',
                  '定位线程:`top -Hp <pid>`;但 Go 是 M:N,「线程 100%」通常只说明某个 M 上跑着死循环的 G,不代表那个 M 有问题。',
                  '抓 Go profile:`curl .../debug/pprof/profile?seconds=30` → `go tool pprof -http=:8080`;没开 pprof 时用 `perf record -p <pid>` 应急。',
                  '读火焰图三类热点:业务死循环/正则回溯、`runtime.mallocgc`+`gcBgMarkWorker`(分配太多)、`sync.(*Mutex).Lock`+`runtime.lock`(锁竞争/自旋)。',
                  '抓不到就用 `go tool trace`:它能区分「在跑 / 等锁 / 等网络 / 等 GC」,而 CPU profile 只覆盖「在跑」。',
                ],
                depth: '先止血再定位:确认是某个接口被刷就网关限流;是 GC 打满就临时调 `GOGC`/设 `GOMEMLIMIT` 换时间。线上问题的第一目标是恢复服务,不是找到根因——根因可以事后用 profile 慢慢查。',
              },
              {
                kind: 'question',
                title: 'Q105 · pprof 有哪几种 profile？各自看什么？',
                questionId: 'go-index-Q105',
                intent: '七种 profile 各自看什么,以及最容易被忽略的两个。',
                points: [
                  '`cpu`:CPU 时间分布(100Hz 采样),找计算热点;`heap`:当前存活对象(查泄漏);`allocs`:累计分配(查 GC 压力);`goroutine`:全量栈快照(查泄漏/阻塞)。',
                  '`block`:阻塞在同步原语上的时间;`mutex`:锁竞争;`threadcreate`:线程创建(查 cgo/阻塞 IO 导致的线程暴涨)。',
                  '最容易忽略的两个是 `block` 和 `mutex`——它们默认完全不采样,必须 `SetBlockProfileRate` / `SetMutexProfileFraction` 才开,否则永远是空的。',
                ],
                followup: '「`heap` 的 `inuse_space` 和 `alloc_space` 有什么区别?」 `inuse` 是「现在占着没释放的」,查泄漏用它;`alloc` 是「从进程启动到现在累计分配的」,查「谁分配最频繁」用它。看错会得出完全不同的结论。',
              },
              {
                kind: 'question',
                title: 'Q107 · 写 benchmark 有哪些坑？怎么保证测的是真实性能？',
                questionId: 'go-index-Q107',
                intent: '`benchmark` 的坑,要能说出「为什么结果不可信」。',
                points: [
                  '没 `ResetTimer`:准备数据的耗时被算进单次结果。',
                  '被编译器优化掉:返回值未使用 → 调用被删。解法:赋给包级 `Sink` 变量或用 `runtime.KeepAlive`。',
                  '循环体太短:测的是计时开销;解法是「一次迭代做多次操作再除」。',
                  '环境不固定:`GOMAXPROCS`、GC、CPU 频率都在变;对比必须用 `benchstat` 做统计检验,不能肉眼比。',
                  '只看 `ns/op` 不看 `allocs/op`:前者波动 ±20%,后者结构性可复现——优化是否生效先看分配。',
                ],
                depth: '还有一个隐蔽坑:「`benchmark` 与真实负载的分配模式不同」。比如压测时输入是固定的小 JSON,而线上是随机大 JSON——测出的分配次数完全不代表线上。所以 `benchmark` 只能用于「A 版本 vs B 版本」的对比,不能直接换算成线上容量。',
              },
              {
                kind: 'question',
                title: 'Q112 · 服务 p99 延迟有毛刺，可能是哪些原因？',
                questionId: 'go-index-Q112',
                intent: 'p99 毛刺的成因分类,重点是「怎么区分」。',
                points: [
                  '看规律性:周期性(每 100ms)= cgroup CPU 限流;与流量正相关 = GC 辅助标记或锁竞争;与下游 RT 相关 = 连接池或下游慢。',
                  '看资源:`p50` 正常 + `p99` 飙升 + CPU 不高 → 锁竞争或连接池排队;CPU 高 + 吞吐不涨 → 调度抖动或自旋。',
                  '七个方向:GC 辅助标记、锁竞争、连接池排队、调度抖动、`timer` 堆积、日志同步写、OS 层(缺页/cgroup 限流/网络重传)。',
                ],
                followup: '「为什么 Go 的 profile 看不到 cgroup 限流?」 因为那是内核层面把 CPU 时间片掐掉,Go 的采样看不到「被掐掉的时间」——它只看到「我的 goroutine 好像突然慢了」。必须看容器指标 `container_cpu_cfs_throttled_seconds_total`。',
              },
              {
                kind: 'question',
                title: 'Q114 · 如何减少高频路径上的内存分配？',
                questionId: 'go-index-Q114',
                intent: '如何减少高频路径上的内存分配——六个手段。',
                points: [
                  '预分配:`make([]T, 0, n)`、`Builder.Grow(n)`、`Buffer.Grow(n)`。',
                  '`sync.Pool` 复用:适合「创建贵、用完即弃」的对象;取出必须 `Reset`。',
                  '避免装箱:热点路径别用 `fmt.Sprintf`/`interface{}` 参数,改 `strconv` + 拼接或用泛型。',
                  '减逃逸:返回小结构体而非指针、别把局部变量塞进接口、别让闭包捕获大对象;用 `-gcflags=-m` 检查。',
                  '用 `[]byte` 做中间表示:避免 `string` 的反复新建;最后一次性转 `string`。',
                  '复用请求级对象:`Buffer`/`Decoder`/`Context` 池化或外层复用(注意并发安全)。',
                ],
                depth: '验证方式:`go test -bench . -benchmem` 看 `allocs/op` 是否下降;线上用 `pprof -alloc_space` 对比改动前后。注意「减少分配」有时会「增加代码复杂度」——只在确认是热点后才做,不要在冷路径上为了「零分配」把代码写丑。',
              },
              {
                kind: 'question',
                title: 'Q113 · []struct 和 []*struct 在性能上有什么区别？',
                questionId: 'go-index-Q113',
                intent: '`[]struct` 与 `[]*struct` 的性能差异,要说到缓存与 GC 两层。',
                points: [
                  '内存布局:`[]T` 连续,一个 cache line 装多个元素,遍历时预取友好;`[]*T` 指针连续但对象散落堆上,每次解引用都可能 cache miss。',
                  'GC 成本:`[]T` 扫一个 span,对象内联;`[]*T` 每个指针都要追一次,百万级元素时 GC 压力差一个量级。',
                  '分配次数:`[]T` 一次分配;`[]*T` 是 `1 + N` 次——`allocs/op` 差 N 倍。',
                  '选择判据:元素 < 64 字节且只读遍历 → `[]T`;元素很大或需原地共享修改 → `[]*T`。扩容成本相反:`[]T` 要复制所有元素,`[]*T` 只复制指针。',
                ],
                followup: '「`[]T` 里 `range` 拿不到地址改怎么办?」 用 `for i := range s { s[i].Field = x }`;不要用 `&s[i]` 长期保存,因为 `append` 扩容会让这些指针指向旧数组。',
              },
            ],
          },
        },
      ],
    },
  ],
}
