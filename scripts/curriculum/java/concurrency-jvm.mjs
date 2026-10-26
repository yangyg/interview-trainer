/**
 * Java · 并发编程与 JVM
 * java-03(80) + java-04(72) = 152 题 / 6 阶段 / 19 课时
 */
export default {
  id: 'java-concurrency-jvm',
  language: 'java',
  title: '并发编程与 JVM',
  subtitle: '从线程内存模型到 GC 调优，把「看不见的运行时」讲清楚',
  level: 'advanced',
  order: 2,
  prerequisites: ['java-lang-collections'],
  outcomes: [
    '用 JMM 的 happens-before 解释可见性与有序性，而不是只背 volatile 两个作用',
    '说清 synchronized、AQS、CAS 各自的适用边界与代价',
    '能根据任务类型选择线程池参数，并解释为什么不能随便用无界队列',
    '画出 JVM 运行时数据区，说明对象从分配到回收的完整生命周期',
    '面对一次 GC 频繁或内存溢出的线上问题，给出有条理的排查路径',
  ],
  stages: [
    {
      id: 'thread-model',
      title: 'A · 线程与内存模型',
      goal: '先建立并发的基本单位与可见性规则',
      summary:
        '并发的所有诡异现象，根源都在两件事：线程是独立调度的，以及 CPU 与编译器会重排序。这一阶段先把线程的生命周期、状态迁移讲清，再引入 JMM 与 happens-before，让你能解释「为什么这段代码单线程对、多线程错」。',
      lessons: [
        {
          id: 'thread-basics',
          title: '线程生命周期与状态迁移',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['线程基础'] }],
          content: {
            intro:
              '线程是并发的最小单位，但很多人只记得六个状态名，说不清状态之间怎么迁。这一节把 `NEW`、`RUNNABLE`、`BLOCKED`、`WAITING`、`TIMED_WAITING`、`TERMINATED` 放进真实调用里：`start` 之后为什么不一定马上跑、`sleep` 与 `wait` 释放锁的区别在哪、`interrupt` 到底改变了什么、为什么 `stop` 被废弃。把状态图和 API 一一对应起来，后面讲锁与线程池时就不会混——因为线程池的各种「卡住」现象，本质都是线程停在某个状态上不走了。',
            sections: [
              {
                kind: 'concept',
                title: '进程分资源，线程分 CPU',
                body: [
                  '**进程是资源分配的基本单位，线程是 CPU 调度的基本单位。** 这句话是后面一切讨论的地基。一个进程拥有独立的虚拟地址空间、文件描述符表、信号处理表；同一个进程内的多个线程**共享**这些资源，但各自拥有独立的**程序计数器、虚拟机栈、本地方法栈**。',
                  '这个划分直接决定了「什么会出问题」：共享堆 → 多个线程可能同时改同一个对象 → 需要同步；共享静态变量与常量池 → 全局状态天然是并发风险点；而栈是私有的 → 局部变量天然线程安全（前提是不逃逸出去）。很多人背「局部变量线程安全」，却说不出理由，理由就是这一条。',
                  '还有一个常被忽略的共享物：**文件句柄**。`FileDescriptor` 在进程级共享，所以两个线程同时读写同一个 `FileOutputStream`，写入内容可能交错。同样共享的还有进程的工作目录、环境变量、`System.out` 这个 `PrintStream`——所以 `System.out.println` 内部加了锁，但多行输出仍然可能交错。',
                ],
                term: {
                  name: '线程私有 vs 进程共享',
                  def: '每个线程私有的只有三样：程序计数器（下一条指令地址）、虚拟机栈（栈帧、局部变量表）、本地方法栈。其余（堆、方法区/元空间、静态变量、常量池、文件句柄表）全进程共享。',
                },
                points: [
                  '进程 = 资源分配单位；线程 = CPU 调度单位',
                  '线程私有：PC、虚拟机栈、本地方法栈（+ `ThreadLocalMap`，本质挂在 Thread 对象上）',
                  '线程共享：堆、元空间、静态变量、常量池、文件句柄表',
                  '局部变量之所以线程安全，是因为它在私有栈上；一旦被其他线程引用（逃逸），安全性立刻消失',
                ],
              },
              {
                kind: 'diagram',
                title: '一个进程里，哪些内存是共享的',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '进程级（共享）',
                      note: '所有线程都看得到',
                      slots: [
                        { label: '堆', value: '对象实例', tone: 'warn' },
                        { label: '元空间', value: '类元数据', tone: 'warn' },
                        { label: '静态变量', value: 'static 字段', tone: 'warn' },
                        { label: '常量池', value: 'String 常量', tone: 'warn' },
                        { label: 'fd 表', value: '文件句柄', tone: 'warn' },
                      ],
                    },
                    {
                      name: '线程级（私有）',
                      note: '每个线程一份',
                      slots: [
                        { label: 'PC', value: '下一条指令地址', tone: 'primary' },
                        { label: '虚拟机栈', value: '栈帧 / 局部变量', tone: 'primary' },
                        { label: '本地方法栈', value: 'native 帧', tone: 'primary' },
                        { label: 'ThreadLocalMap', value: '挂在 Thread 上', tone: 'primary' },
                      ],
                    },
                  ],
                  caption:
                    '图上标 `warn` 的全是**并发风险点**：堆上的对象、静态字段、常量池引用、共享的文件句柄。判空一个「变量是否线程安全」，第一步就是问「它存在哪个区域」——存在左侧就要考虑同步，存在右侧基本不用。',
                },
              },
              {
                kind: 'question',
                title: '进程和线程的区别是什么？线程之间共享哪些资源？',
                questionId: 'java-03-Q1',
                intent:
                  '开场题，考的是能不能把「资源分配 / CPU 调度」这条主线说清，而不是罗列「进程重、线程轻」这种模糊描述。',
                points: [
                  '进程是**资源分配**的基本单位，拥有独立地址空间；线程是 **CPU 调度**的基本单位，是进程内的一条执行流',
                  '**共享**：堆（对象实例）、方法区/元空间（类元数据）、静态变量、常量池、文件句柄表、进程工作目录',
                  '**私有**：程序计数器、虚拟机栈、本地方法栈（`ThreadLocal` 的数据也存在各自的 Thread 对象里）',
                  '代价对比：创建/切换线程比进程便宜得多（不用切换地址空间、不用刷新 TLB），但一个线程崩溃可能拖垮整个进程',
                  '通信方式：线程靠共享内存（+ 同步机制），进程靠管道、信号、Socket、共享内存等 IPC',
                ],
                depth:
                  '被追问「线程切换到底省了什么」：进程切换要换页表基址寄存器（CR3），导致 TLB 大面积失效，之后一段时间的访存都要重新走页表；线程切换仍在同一地址空间内，TLB 基本保留。这是「线程轻」的硬件级原因，能说出来就明显超出背概念的水平。',
                followup: '「一个进程最多能开多少线程」——受限于三样：线程栈大小（默认 1MB，`-Xss` 可调）、系统线程数上限（Linux 的 `kernel.threads-max`、`pid_max`）、以及内存总量。所以「开一百万线程」在传统线程模型下必然 OOM，这正是虚拟线程要解决的问题。',
              },
              {
                kind: 'question',
                title: '创建线程的方式有哪几种？',
                questionId: 'java-03-Q2',
                intent:
                  '一定要答成「本质只有一种：new Thread().start()」，其余都是包装。能点出这一点，就说明理解了 Runnable 只是「任务」而不是「线程」。',
                points: [
                  '**本质只有一种**：构造 `Thread`（或其子类）并调用 `start()`，由 JVM 创建操作系统线程',
                  '① 继承 `Thread`，重写 `run()`——简单但占用了唯一的继承位，不推荐',
                  '② 实现 `Runnable`，传给 `Thread` 构造器——**任务与线程解耦**，推荐',
                  '③ 实现 `Callable<T>` + `FutureTask`，再交给 `Thread`——能拿返回值、能抛受检异常',
                  '④ 交给线程池 `ExecutorService.submit(...)`——生产环境的**唯一正确做法**，复用线程、可控队列与拒绝策略',
                  '⑤ `CompletableFuture.supplyAsync(...)`：本质仍是线程池（默认 `ForkJoinPool.commonPool()`）',
                ],
                depth:
                  '为什么生产环境不 `new Thread()`：每次 `new` 都要向操作系统申请一个内核线程（约 1MB 栈 + 内核结构），创建与销毁成本高；且无法限制总数，突发流量会直接把机器打挂。线程池把「线程生命周期」与「任务生命周期」解耦，这才是复用的价值——不是为了「少写几行代码」。',
              },
              {
                kind: 'code',
                title: '三种创建方式：从「能跑」到「该这么写」',
                lang: 'java',
                code:
                  '// ① 继承 Thread（不推荐：占用继承位，任务与线程耦合）\nclass MyThread extends Thread {\n    @Override public void run() { System.out.println("run in " + getName()); }\n}\nnew MyThread().start();\n\n// ② 实现 Runnable（任务与线程解耦）\nRunnable task = () -> System.out.println("run in " + Thread.currentThread().getName());\nnew Thread(task, "worker-1").start();\n\n// ③ Callable + FutureTask（要返回值 / 要抛异常）\nCallable<Integer> calc = () -> {\n    Thread.sleep(100);\n    return 42;\n};\nFutureTask<Integer> ft = new FutureTask<>(calc);\nnew Thread(ft).start();\nSystem.out.println(ft.get());        // 阻塞直到拿到 42\n\n// ④ 生产环境：线程池（唯一推荐）\nExecutorService pool = new ThreadPoolExecutor(\n        4, 8, 60L, TimeUnit.SECONDS,\n        new ArrayBlockingQueue<>(200),\n        new ThreadFactory() {\n            private final AtomicInteger n = new AtomicInteger();\n            public Thread newThread(Runnable r) {\n                Thread t = new Thread(r, "biz-" + n.incrementAndGet());\n                t.setUncaughtExceptionHandler((th, e) -> log.error("worker died", e));\n                return t;\n            }\n        },\n        new ThreadPoolExecutor.CallerRunsPolicy());\nFuture<Integer> f = pool.submit(calc);',
                caption:
                  '四种方式的递进关系是「任务与线程的耦合度」：①任务就是线程本身；②任务独立出来；③任务还能返回值；④任务交给一个**池**，线程生命周期完全由池管理。面试问「有几种」，答「本质一种 + 四种写法」，比数数更有说服力。',
                notes: [
                  { line: 'ft.get();', text: '`FutureTask.get()` 会阻塞当前线程，并可能抛 `ExecutionException`（包装任务里的异常）或 `InterruptedException`。' },
                  { line: 'new ThreadFactory() { ... }', text: '自定义 `ThreadFactory` 是生产环境的必做项：给线程起可读的名字、设置 `UncaughtExceptionHandler`，否则线上出问题只能看到一堆 `pool-1-thread-7`。' },
                  { line: 'new ThreadPoolExecutor.CallerRunsPolicy()', text: '拒绝策略选 `CallerRuns` 意味着「队列满时让提交任务的线程自己跑」，天然形成背压，比默认的 `AbortPolicy` 更适合削峰。' },
                ],
              },
              {
                kind: 'question',
                title: 'start() 和 run() 有什么区别？直接调用 run() 会怎样？',
                questionId: 'java-03-Q3',
                intent:
                  '极高频的送分题，但要答到「`start` 有 `start0` 这个 native 方法、且只能调用一次」这一层，才算看过源码。',
                points: [
                  '`start()` 会做三件事：把线程加入线程组、状态从 `NEW` 改为 `RUNNABLE`、调用 native 方法 `start0()` 让操作系统创建真正的线程',
                  '`run()` 只是普通方法调用，**在当前线程的栈上同步执行**，不会创建任何新线程',
                  '直接调 `run()`：看到的是「串行执行」，`Thread.currentThread().getName()` 返回的是调用者线程名而不是新线程名',
                  '`start()` **只能调用一次**，第二次抛 `IllegalThreadStateException`（因为状态已不是 `NEW`）',
                  '`run()` 可以随便调用多次——它就是普通方法',
                  '`start0()` 执行失败（如 `OutOfMemoryError: unable to create native thread`）时，线程状态会回滚，但 `started` 标志已置位，所以之后再 `start()` 也抛异常',
                ],
                depth:
                  '为什么设计成「`start` 只能一次」：JVM 层面一个 `Thread` 对象与一个 OS 线程是**一对一绑定**的，线程一旦跑完就无法「复活」——OS 线程不可重启。Java 用 `threadStatus` 字段（volatile int）表达这个约束，这比允许重复启动再抛奇怪的错误要清晰得多。',
                followup: '「`Thread` 对象能被 GC 吗」——线程运行期间，JVM 持有对它的引用（`Thread` 是 GC Root 之一，活跃线程本身就是根），所以不会被回收。线程终止后，它作为根的角色消失，才可能被回收。',
              },
              {
                kind: 'principle',
                title: 'start() 背后：从 Java 对象到一个 OS 线程',
                body: [
                  '`start()` 表面上只有几行 Java 代码，实际触发了一条跨语言的链路。理解这条链路，才能解释「为什么线程创建会失败」「为什么栈大小要提前定」。',
                ],
                steps: [
                  {
                    title: '① 状态检查与 CAS',
                    detail:
                      '`start()` 先检查 `threadStatus == 0`（即 `NEW`），再用 CAS 改成 `RUNNABLE`。所以并发调两次 `start()` 也只有一次能成功，另一次抛 `IllegalThreadStateException`。',
                  },
                  {
                    title: '② 加入线程组，登记到 JVM',
                    detail:
                      '`group.add(this)` 把线程加入 `ThreadGroup`（便于统一管理和 `uncaughtException` 传播），然后 `start0()`。',
                  },
                  {
                    title: '③ native：`pthread_create` / `CreateThread`',
                    detail:
                      '`start0()` 是 native 方法，最终调用操作系统的线程创建 API。此时会**按 `-Xss` 分配线程栈**（默认 1MB），并注册 JVM 的 `JavaThread` 结构。这一步是最容易失败的地方——内存不足时报 `OutOfMemoryError: unable to create native thread`。',
                  },
                  {
                    title: '④ 新线程从 `thread_entry` 进入，回调 `run()`',
                    detail:
                      'OS 线程启动后执行 JVM 内部的 `thread_entry`，它完成 JNI 环境准备，再反射调用你写的 `run()`。**所以 `run()` 是在新线程的栈上执行的**，与 `start()` 的调用者不是同一个栈。',
                  },
                  {
                    title: '⑤ 结束：`exit()` 清理并 `notifyAll`',
                    detail:
                      '`run()` 正常返回或抛异常未被捕获，都会走到 `Thread.exit()`：清理 `ThreadLocal`（这也是为什么线程池里必须手动 `remove`）、置状态为 `TERMINATED`、最后 `notifyAll()` 唤醒所有 `join` 在该线程上的等待者。',
                  },
                ],
                takeaway:
                  '一句话收口：**`start()` 是「申请一个 OS 线程并在其栈上执行 `run()`」，`run()` 只是「一段普通方法」。** 两者的差别是「有没有新栈」，不是「有没有新对象」。',
              },
              {
                kind: 'diagram',
                title: '六个状态：谁把线程推进去，谁把它放出来',
                diagram: {
                  type: 'tree',
                  root: {
                    label: 'Thread.State 六态',
                    note: '`Thread.getState()` 可查',
                    children: [
                      {
                        label: 'NEW',
                        note: '进入：new Thread() ｜ 出去：start()',
                        tone: 'primary',
                      },
                      {
                        label: 'RUNNABLE',
                        note: '进入：start() 成功 ｜ 出去：等锁 / 等待 / 结束',
                        tone: 'primary',
                        children: [
                          { label: '就绪 ↔ 运行中', note: '两者都算 RUNNABLE，由 OS 调度切换，Java 层看不到区分' },
                        ],
                      },
                      {
                        label: 'BLOCKED',
                        note: '等 monitor 锁（synchronized 抢不到）｜ 出去：拿到锁',
                        tone: 'warn',
                      },
                      {
                        label: 'WAITING',
                        note: 'wait() / join() / park() 无超时 ｜ 出去：notify / 目标线程结束 / unpark',
                        tone: 'warn',
                      },
                      {
                        label: 'TIMED_WAITING',
                        note: 'sleep(n) / wait(n) / join(n) / parkNanos ｜ 出去：超时或唤醒',
                        tone: 'warn',
                      },
                      {
                        label: 'TERMINATED',
                        note: '进入：run() 返回或抛异常 ｜ 不可逆',
                        tone: 'bad',
                      },
                    ],
                  },
                  caption:
                    '记住「三个等待态的区别」就抓住了全部：**`BLOCKED` 是等锁**（被动，抢到就继续）、**`WAITING` 是等信号**（被动，必须有人 `notify`）、**`TIMED_WAITING` 是等时间**（主动，超时自己回来）。面试问「线程卡住了」，第一件事就是 `jstack` 看它停在哪个状态——停在 `BLOCKED` 说明锁竞争严重，停在 `WAITING` 说明有通知没发出。',
                },
              },
              {
                kind: 'question',
                title: 'Java 线程有哪几种状态？如何流转？',
                questionId: 'java-03-Q4',
                intent:
                  '记忆题，但要注意两个坑：`RUNNABLE` 包含「就绪 + 运行中」，以及 `BLOCKED` 只对应 `synchronized` 抢锁失败（JUC 的锁是 `WAITING`）。',
                points: [
                  '六态：`NEW`、`RUNNABLE`、`BLOCKED`、`WAITING`、`TIMED_WAITING`、`TERMINATED`',
                  '`RUNNABLE` **同时包含就绪与运行中**，因为 JVM 不区分「可运行」和「正在跑」，交给 OS 调度',
                  '`BLOCKED` 专指「等 `synchronized` 的 monitor 锁」；`ReentrantLock` 抢不到锁进的是 `WAITING`（`LockSupport.park`）',
                  '`WAITING`：`wait()`、`join()`、`LockSupport.park()`；`TIMED_WAITING`：`sleep(n)`、`wait(n)`、`join(n)`、`parkNanos`',
                  '典型流转：`NEW` --start--> `RUNNABLE` --抢锁失败--> `BLOCKED` --拿到锁--> `RUNNABLE`',
                  '`RUNNABLE` --wait()--> `WAITING` --notify()--> `BLOCKED`（注意：不是直接回 `RUNNABLE`，要先重新抢锁）',
                ],
                depth:
                  '最后那条最容易答错：**`notify()` 之后线程不是立刻恢复运行，而是从「等待队列」挪到「同步队列」，状态变成 `BLOCKED`，还要再抢一次锁**。所以 `wait` 醒来后必须放在 `while` 循环里重新检查条件（`while (!condition) wait();`），否则会因「条件又被别人改回去」而出现虚假唤醒问题。',
                followup: '「怎么看线程状态」——代码里 `thread.getState()`；线上用 `jstack <pid>` 或 `jcmd <pid> Thread.print`，输出里会直接标 `java.lang.Thread.State: BLOCKED (on object monitor)` 并给出「waiting to lock <0x...>」和「locked <0x...>」的持有者，是排查死锁的第一手材料。',
              },
              {
                kind: 'question',
                title: 'sleep()、wait()、join()、yield() 的区别？为什么 wait 定义在 Object 而不是 Thread？',
                questionId: 'java-03-Q5',
                intent:
                  '高频对比题，核心是「是否释放锁」这一列。第二问是设计题，答「锁属于对象」就对了。',
                points: [
                  '`sleep(n)`：`Thread` 的静态方法，**不释放锁**，进入 `TIMED_WAITING`，到时自动醒；不响应中断以外的唤醒',
                  '`wait()` / `wait(n)`：`Object` 的方法，**释放锁**并进入等待队列，必须由 `notify`/`notifyAll`（或超时）唤醒；**必须在 `synchronized` 块内调用**，否则 `IllegalMonitorStateException`',
                  '`join()`：`Thread` 的方法，本质是 `while (isAlive()) wait(0)`，让当前线程等待目标线程结束（会释放目标线程对象的锁）',
                  '`yield()`：`Thread` 的静态方法，提示调度器「可以让出 CPU」，状态仍是 `RUNNABLE`，**不释放锁**、不保证生效',
                  '为什么 `wait` 在 `Object`：`wait/notify` 操作的**是对象的 monitor 锁**，而锁属于对象（每个对象都能当锁），不属于线程。若放在 `Thread` 里，任何对象都无法作为同步目标',
                ],
                depth:
                  '「`sleep` 不释放锁」的危险后果：如果在一个 `synchronized` 方法里 `Thread.sleep(10_000)`，这 10 秒内**所有其他线程都进不来**，等于把锁当成了睡眠舱。很多「接口突然变慢、线程全卡住」的线上故障，根因就是某处 `synchronized` 里调了带 `sleep` 或 `RPC` 的慢操作——临界区里绝不该有阻塞调用。',
                followup: '「`wait(0)` 和 `wait()` 一样吗」——一样，`0` 表示无限等待（不是「等 0 毫秒」）。`join()` 内部就是 `wait(0)` 的循环。',
              },
              {
                kind: 'compare',
                title: '四个「让线程停一下」的方法，一张表分清',
                head: ['方法', '所属', '是否释放锁', '进入状态', '谁来唤醒'],
                rows: [
                  ['`sleep(n)`', '`Thread`（静态）', '**不释放**', '`TIMED_WAITING`', '时间到（或中断）'],
                  ['`wait()`', '`Object`', '**释放**', '`WAITING`', '`notify` / `notifyAll` / 中断'],
                  ['`wait(n)`', '`Object`', '**释放**', '`TIMED_WAITING`', '通知或超时'],
                  ['`join()`', '`Thread`', '释放**目标线程对象**的锁', '`WAITING`', '目标线程终止'],
                  ['`yield()`', '`Thread`（静态）', '**不释放**', '仍是 `RUNNABLE`', '不需要唤醒，只是让出一次'],
                  ['`park()`', '`LockSupport`（静态）', '**不释放**（除非锁已释放）', '`WAITING`', '`unpark(thread)` / 中断'],
                ],
                note:
                  '把「是否释放锁」和「进入哪个状态」两列背下来，这一组题就全解决了。特别注意 `park` 与 `wait` 的差别：`park` 不需要在 `synchronized` 里、以**线程**为等待对象、且**允许先 `unpark` 后 `park`**（有许可计数），这是 AQS 用它替代 `wait/notify` 的原因。',
              },
              {
                kind: 'analogy',
                title: 'sleep 和 wait：抱着打印机发呆 vs 放下打印机去休息室',
                text:
                  '公司只有**一台打印机**，用之前要在前台刷卡登记（这就是 `synchronized`，打印机是那个「锁对象」）。`sleep(10)` 就像你打印到一半，**抱着打印机发呆十秒**——别人想用？不行，机器还在你手上。`wait()` 则像你**把打印机放回原位、去休息室等通知**——别人可以立刻过来用，等前台喊「打印机空了」，你再回来重新刷卡排队。',
                mapping: [
                  { real: '公司唯一的一台打印机', tech: '对象锁（monitor）' },
                  { real: '前台刷卡登记才有权用', tech: '必须进入 synchronized 块才能 wait/notify' },
                  { real: '抱着机器发呆十秒', tech: 'Thread.sleep()：让出 CPU 但**持有锁**' },
                  { real: '放下机器去休息室等', tech: 'Object.wait()：**释放锁**，进入等待队列' },
                  { real: '前台喊「机器空了」', tech: 'notify() / notifyAll()：从等待队列挪到同步队列' },
                  { real: '回来还得重新刷卡排队', tech: '被唤醒后状态是 BLOCKED，要重新抢锁' },
                  { real: '只等五分钟就自己回来', tech: 'wait(timeout) / sleep(n) → TIMED_WAITING' },
                ],
                limit:
                  '类比到「多个锁」就不成立了：现实里你可以同时抱着好几台打印机，而 Java 线程持有多把锁时会带来**死锁**风险（A 抱打印机等扫描仪，B 抱扫描仪等打印机）。另外现实中的「喊一声」所有人都能听见，而 `notify()` 只随机叫醒**一个**等待者——这也是为什么多数场景该用 `notifyAll()`。',
              },
              {
                kind: 'question',
                title: '线程中断 interrupt 的正确姿势是什么？interrupted() 与 isInterrupted() 有什么区别？',
                questionId: 'java-03-Q6',
                intent:
                  '这题最能筛出「真写过并发代码」的人。核心是「中断是协作式的、只是一个标志」，以及「catch 到 InterruptedException 后要不要恢复标志」这个细节。',
                points: [
                  '`interrupt()` 只是把目标线程的**中断标志置为 true**，不会强制终止任何东西——是否响应完全看目标线程自己检查',
                  '`isInterrupted()`：实例方法，**只查询**，不清除标志',
                  '`interrupted()`：**静态**方法，查询并**清除**标志（容易误用成 `t.interrupted()`，那清的还是当前线程的标志）',
                  '阻塞中的线程（`sleep`/`wait`/`join`/`park`/`take`）被中断时会抛 `InterruptedException`，并且**JVM 会先把标志清掉**再抛',
                  '因此 catch 到 `InterruptedException` 后，如果自己不能处理，必须**恢复中断**：`Thread.currentThread().interrupt()`，否则上层永远收不到中断信号',
                  '标准写法：循环条件 `while (!Thread.currentThread().isInterrupted())`，配合可中断的阻塞调用',
                ],
                depth:
                  '为什么 `InterruptedException` 抛出前要清标志：因为异常本身就是「中断已发生」的传达方式，若标志还留着，上层的 `while (!isInterrupted())` 会立刻再次退出，造成重复处理。所以 JDK 约定「谁消费异常，谁负责恢复标志」。这也是为什么在 lambda 或流里包一层 `catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new RuntimeException(e); }` 是**正确**的，而不是多此一举。',
                followup: '「不可中断的阻塞怎么办」——`synchronized` 抢锁、`InputStream.read` 等传统 IO、`Lock.lock()`（不带 interruptibly）都不响应中断。对策：改用 `lockInterruptibly()`、`InterruptibleChannel`、或设置 socket 超时。这也是虚拟线程要重写 IO 栈的原因之一。',
              },
              {
                kind: 'code',
                title: '中断的三种写法：错、凑合、正确',
                lang: 'java',
                code:
                  '// ✗ 错：吞掉中断，上层永远不知道要停\nvoid bad() {\n    try {\n        Thread.sleep(1000);\n    } catch (InterruptedException e) {\n        log.warn("interrupted", e);   // 只打日志，没恢复标志\n    }\n}\n\n// △ 凑合：恢复标志但因受检异常无法直接抛，包成 RuntimeException\nvoid ok() {\n    try {\n        Thread.sleep(1000);\n    } catch (InterruptedException e) {\n        Thread.currentThread().interrupt();          // 恢复标志\n        throw new RuntimeException("interrupted", e);\n    }\n}\n\n// ✓ 正确：可中断的任务循环\nvoid worker() {\n    while (!Thread.currentThread().isInterrupted()) { // ① 循环条件看标志\n        try {\n            Task t = queue.take();                    // ② 用可中断的阻塞方法\n            t.run();\n        } catch (InterruptedException e) {\n            Thread.currentThread().interrupt();       // ③ 恢复标志后跳出\n            break;\n        }\n    }\n    // ④ 清理资源（注意：这里不要再做可能被中断的阻塞操作）\n}\n\n// 外部发起停止\nThread t = new Thread(this::worker, "worker");\nt.start();\n// ... 需要停止时\nt.interrupt();',
                caption:
                  '三段的差别只在「有没有把中断信号传下去」。第一段是线上最常见的 bug：日志里看到一堆 `InterruptedException`，但线程池 `shutdownNow()` 后任务还在跑，因为信号被吞了。第三段的 `break` 之前恢复标志，是为了让**外层**（比如线程池的 `runWorker`）也能看到这个信号。',
                notes: [
                  { line: 'while (!Thread.currentThread().isInterrupted())', text: '用 `isInterrupted()` 而不是 `interrupted()`——后者会清标志，导致下一轮条件变成 true 而继续循环。' },
                  { line: 'queue.take();', text: '`BlockingQueue.take()` 是可中断的；`put()` 也是。线程池 `shutdownNow()` 正是靠中断来「踢醒」卡在 `take()` 上的工作线程。' },
                  { line: 'Thread.currentThread().interrupt();', text: '恢复标志后再 `break`，两层循环都能感知；如果直接 `return`，外层就丢了信号。' },
                ],
              },
              {
                kind: 'question',
                title: '守护线程（Daemon Thread）是什么？有什么注意点？',
                questionId: 'java-03-Q7',
                intent:
                  '小知识点，但有一个反直觉的坑：`finally` 不一定执行。答出这一点就是加分项。',
                points: [
                  '守护线程是「后台服务型」线程，**不阻止 JVM 退出**：当所有非守护线程结束，JVM 直接退出，不管守护线程跑到哪',
                  '设置方式：`t.setDaemon(true)`，**必须在 `start()` 之前**调用，否则抛 `IllegalThreadStateException`',
                  '守护线程里创建的子线程**默认也是守护线程**（继承父线程的 daemon 属性）',
                  '典型用途：GC 线程、JIT 编译线程、心跳/监控、日志刷盘（部分框架）',
                  '**关键坑**：JVM 退出时不会等待守护线程，也不会执行它的 `finally` 块——所以绝不能在守护线程里做「必须完成的收尾」（如写盘、提交事务）',
                  '`main` 线程是非守护线程；JVM 启动时的 `DestroyJavaVM` 线程负责在所有非守护线程结束后关闭虚拟机',
                ],
                depth:
                  '「守护线程的 `finally` 不执行」的原因：JVM 退出走的是 `Runtime.halt()` 语义，直接终止所有线程，不做栈展开，自然没有 `finally`。对比之下，`System.exit()` 会执行已注册的 shutdown hook，但**也不会**等普通线程的 `finally`。要保证收尾，正确做法是注册 `Runtime.getRuntime().addShutdownHook(...)`，或把收尾逻辑放在非守护线程里。',
                followup: '「线程池里的线程是守护线程吗」——默认**不是**（`DefaultThreadFactory` 创建的是非守护线程），这也是为什么忘记 `shutdown()` 会导致 JVM 无法退出。想让它不阻止退出，需要自定义 `ThreadFactory` 里 `setDaemon(true)`。',
              },
              {
                kind: 'question',
                title: '为什么不推荐使用 Thread.stop()、suspend()、resume()？',
                questionId: 'java-03-Q8',
                intent:
                  '考「为什么废弃」，核心论据是「异步终止会破坏对象的不变式」。要能举出具体后果，而不是只说「不安全」。',
                points: [
                  '`stop()` 会**立刻**抛 `ThreadDeath` 强行终止线程，不会走正常的 `finally`（虽然 `ThreadDeath` 是 Error，理论上能被 catch，但极难正确处理）',
                  '危害：线程可能停在「已改了一半数据」的中间态，把**加锁保护的临界区**直接撕裂——锁会被释放，但被保护的数据结构已损坏',
                  '`suspend()` 更糟：线程**挂起时仍持有锁**，其他线程全部阻塞，极易死锁；而且无法得知它停在什么地方',
                  '`resume()` 与 `suspend()` 必须配对使用，漏一次就永久挂起；两者配合无法与 `wait/notify` 协调',
                  '替代方案：`interrupt()` + 标志位（协作式），或 `Future.cancel(true)`（本质也是 `interrupt`）',
                  '`Thread.stop()` 在 JDK 1.2 就标记 deprecated，JDK 20 起 `stop()` 直接抛 `UnsupportedOperationException`',
                ],
                depth:
                  '「把对象改到一半被中断」的具体例子：`HashMap.put` 正在扩容（`resize` 已把部分节点挪到新表、`table` 引用还没换），此时被 `stop` → 之后所有线程访问这个 `HashMap` 都可能死循环（JDK 8 之前）或丢数据。**锁只能保证「不并发」，无法保证「操作是原子的」**——一旦允许在任意指令处终止线程，原子性就被破坏了。这就是 `stop` 的根本问题。',
              },
              {
                kind: 'diagram',
                title: '终止线程：协作式 vs 强制式',
                diagram: {
                  type: 'split',
                  left: {
                    title: '✗ stop() / suspend()：异步强制',
                    tone: 'bad',
                    items: [
                      '在任意指令处终止，线程无法做准备',
                      '临界区被撕裂：锁释放了，数据却改了一半',
                      'suspend 挂起时仍持锁 → 必然死锁',
                      'finally 不可靠，资源可能泄漏',
                      '没有「优雅退出点」，无法保存进度',
                      '已废弃（JDK 20 起 stop 直接抛异常）',
                    ],
                  },
                  right: {
                    title: '✓ interrupt() + 标志位：协作式',
                    tone: 'good',
                    items: [
                      '只置标志，由目标线程在安全点自行退出',
                      '临界区一定执行完，不变式不被破坏',
                      '阻塞方法抛 InterruptedException，可及时响应',
                      'finally 保证执行，可释放资源',
                      '可以「收到信号 → 保存进度 → 再退出」',
                      '代价：需要线程配合，不响应中断的阻塞要靠超时',
                    ],
                  },
                  caption:
                    '本质区别是**谁来决定退出时机**：强制式由外部决定（危险），协作式由线程自己决定（安全）。这不是 Java 的特例——所有现代运行时（Go 的 context、.NET 的 CancellationToken）都采用协作式取消，因为「任意点终止」在工程上无法做对。',
                },
              },
              {
                kind: 'question',
                title: '并发和并行的区别？单核 CPU 支持多线程吗？多线程一定快吗？',
                questionId: 'java-03-Q9',
                intent:
                  '概念 + 性能两道小题串在一起。第三问是重点，要能说出「多线程有成本」的具体三项。',
                points: [
                  '**并发（concurrency）**：多个任务在**同一时间段**内交替推进，是「结构」——可以发生在单核上',
                  '**并行（parallelism）**：多个任务在**同一时刻**同时执行，是「执行」——必须有多个核心（或指令级并行）',
                  '单核**支持**多线程：靠时间片轮转，操作系统每几毫秒切换一次，宏观上「像同时跑」，本质是并发而非并行',
                  '多线程**不一定快**：上下文切换成本、缓存失效与伪共享、锁竞争、调试与内存开销，都可能让总耗时变长',
                  '收益条件：任务能真正并行（CPU 密集且可切分）**或**存在阻塞（IO 等待时可切走），且共享数据少',
                  '经验值：CPU 密集型线程数 ≈ 核数 + 1；IO 密集型 ≈ 核数 × (1 + 平均等待时间 / 平均计算时间)',
                ],
                depth:
                  '「上下文切换到底贵在哪」：一次切换约 1-10 微秒，代价包括保存/恢复寄存器、切换内核栈、**新线程的工作集不在 CPU 缓存里**（一上来全是 cache miss）。所以线程数远超核数时，可能出现「CPU 利用率 100% 但吞吐下降」——时间都花在切换和补缓存上了。判断依据是 `vmstat` 的 `cs`（context switch）列与 `sy`（系统态占比）。',
                followup: '「那为什么 IO 密集可以多开线程」——因为阻塞时线程不在 CPU 上，切换发生得「有价值」（把 CPU 让给了别人）。但线程数仍然不能无限加：每个线程 1MB 栈 + 内核结构。这正是 NIO 与虚拟线程的动机——用少量线程 + 事件驱动（或极轻量线程）来承载海量并发。',
              },
              {
                kind: 'diagram',
                title: '多线程为什么不总是更快：四层成本',
                diagram: {
                  type: 'layers',
                  items: [
                    { label: '① 上下文切换', note: '保存/恢复寄存器、换内核栈，约 1-10 μs/次', tone: 'primary' },
                    { label: '② 缓存失效', note: '新线程热数据不在 L1/L2，一上来全是 cache miss', tone: 'primary' },
                    { label: '③ 伪共享', note: '两个线程改同一缓存行的不同变量，互相把对方的行标记为无效', tone: 'warn' },
                    { label: '④ 锁竞争与内存屏障', note: '锁让并行变串行，屏障禁止指令重排、抑制流水线', tone: 'warn' },
                    { label: '⑤ 内存与 GC 压力', note: '每线程 1MB 栈 + 任务对象，GC 扫描与回收成本上升', tone: 'muted' },
                  ],
                  caption:
                    '从上到下「越往下越隐蔽」。上下文切换还能用 `vmstat` 看到，伪共享则完全无感——只能靠 `padding`（如 Disruptor 的 `Sequence` 补 7 个 long）或 `@Contended` 注解解决。判断「该不该加线程」的实用顺序是：**先看有没有阻塞（有则加线程有效），再看共享数据多不多（多则收益递减），最后看 CPU 是否已打满（打满则加线程只会更慢）**。',
                },
              },
              {
                kind: 'principle',
                title: '把状态图当 API 索引来记',
                body: [
                  '六个状态不必死背，它们其实是**「哪个 API 把线程放进了哪个等待队列」的分类结果**。反过来用，看到 API 就知道状态，看到状态就知道该找谁唤醒。',
                ],
                steps: [
                  {
                    title: '想「等锁」→ 找 `synchronized` → `BLOCKED`',
                    detail:
                      '只有 `synchronized` 抢 monitor 失败会进 `BLOCKED`。所以 `jstack` 里看到 `BLOCKED` 且带 `waiting to lock <0x...>`，答案一定是某处 `synchronized` 临界区太长或有阻塞调用。',
                  },
                  {
                    title: '想「等信号」→ 找 `wait`/`join`/`park` → `WAITING`',
                    detail:
                      '这类等待**没有超时**，只能靠别人叫醒。`jstack` 里大量线程停在 `WAITING (on object monitor)` 或 `parking to wait for`，说明有通知没发出、或生产者停了但消费者还在等。',
                  },
                  {
                    title: '想「等时间」→ 找 `sleep`/`wait(n)`/`parkNanos` → `TIMED_WAITING`',
                    detail:
                      '带超时的等待会自己回来，所以它是「安全」的——至少不会永久卡死。这也是为什么所有「防御性」的等待都应该带超时。',
                  },
                  {
                    title: '想「不等待」→ `yield` 仍是 `RUNNABLE`',
                    detail:
                      '`yield` 只是给调度器一个提示，不改状态、不释放锁、不保证生效。它几乎不该出现在业务代码里——绝大多数「用 yield 优化性能」的想法都是错的（反而增加了切换）。',
                  },
                ],
                takeaway:
                  '**「等锁 BLOCKED、等信号 WAITING、等时间 TIMED_WAITING」**——这三句话 + 它们对应的 API 家族，就是线程状态这一节的全部。后面讲线程池、AQS 时，你会发现所有「卡住」的问题都能用这套语言描述。',
              },
            ],
            outline: [
              '进程分资源、线程分 CPU；线程私有 PC + 虚拟机栈 + 本地方法栈，其余共享',
              '创建线程本质只有一种：new Thread().start()；直接调 run() 只是当前线程的普通方法调用',
              '六态：RUNNABLE 含就绪与运行中；BLOCKED 只对应 synchronized；wait 唤醒后先回到 BLOCKED',
              'sleep 不释放锁、wait 释放锁；wait 在 Object 是因为锁属于对象，且必须放在 while 循环里',
              'interrupt 是协作式的、只置标志；守护线程不阻止 JVM 退出且 finally 不保证执行',
            ],
            pitfalls: [
              '说 RUNNABLE 只表示「正在运行」：它同时包含就绪，JVM 不区分运行中和可运行',
              '认为 notify() 后线程立刻恢复：它只是从等待队列挪到同步队列，状态变 BLOCKED，要重新抢锁',
              'catch 到 InterruptedException 只打日志不恢复标志：中断信号被吞，线程池 shutdownNow 后任务还在跑',
            ],
          },
        },
        {
          id: 'jmm',
          title: 'JMM 与 happens-before',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['内存模型'] }],
          content: {
            intro:
              'JMM 是并发的地基，也是最容易被答成玄学的一块。它其实不是「内存」，而是一套**规则**：规定了多线程读写共享变量时，一个操作的结果**何时**对另一个线程可见。happens-before 是这套规则的表达方式，`volatile`、`synchronized`、`final` 都是在为它提供保证。这一节用「重排序 + 主内存/工作内存」两个模型解释现象，再用 happens-before 规则给出答案——目标是让你看到任何一段并发代码，都能判断它「有没有数据竞争」，而不是凭感觉说「加个 volatile 应该就行了」。',
            sections: [
              {
                kind: 'concept',
                title: 'JMM 是「规则」，不是「内存布局」',
                body: [
                  '最容易踩的第一个坑是把 JMM 当成 JVM 内存结构（堆、栈、方法区）。**两者毫无关系**：JVM 内存结构讲的是「运行时的数据放在哪」，JMM 讲的是「多个线程读写的**可见性**与**有序性**规则」。JMM 是一份规范（JSR-133），JVM 内存结构是这份规范的实现基础之一。',
                  'JMM 的核心抽象是：每个线程有一份**工作内存**（可以理解为 CPU 缓存 + 寄存器的抽象，不真实存在于 JVM 堆里），共享变量放在**主内存**。线程不能直接改主内存，必须「读到工作内存 → 改 → 写回主内存」三步。于是就有了经典问题：**A 改了值并写回主内存，B 工作内存里的副本什么时候失效？**',
                  '答案是：**没有规定什么时候**，只规定「满足 happens-before 时必须可见」。这就是为什么 JMM 需要 happens-before 这套规则——它不去规定缓存何时同步（那样会绑死硬件实现），而是规定「在什么条件下你必须让我看到最新值」。实现层靠内存屏障 + 缓存一致性协议来兑现这个承诺。',
                  '理解这个抽象还能解释一个常见困惑：「工作内存不存在，那它是什么？」——它是对**寄存器、写缓冲区（store buffer）、CPU cache、编译器优化后留在寄存器里的值**这一堆东西的统一抽象。所以「从工作内存读」可能是读寄存器（根本还没落内存），这也是为什么没有 `volatile` 的循环可能永远读到旧值。',
                ],
                term: {
                  name: 'JMM（Java Memory Model）',
                  def: 'Java 语言规范的一部分（JSR-133，JDK 5 定稿）。它定义了多线程程序中共享变量的可见性与有序性规则，核心工具是 happens-before；它不规定缓存如何同步，只规定「哪些情况下必须可见」。',
                },
                points: [
                  'JMM ≠ JVM 内存结构：前者是并发规则，后者是运行时数据分区',
                  '抽象模型：主内存（共享）+ 工作内存（每线程私有副本，是寄存器/缓存的抽象）',
                  'JMM 只承诺「满足 happens-before 时可见」，不承诺「修改后立刻全局可见」',
                  '落地手段：内存屏障（禁止重排）+ 缓存一致性协议（MESI，保证缓存不打架）',
                ],
              },
              {
                kind: 'diagram',
                title: '主内存与工作内存：为什么一个线程看不到另一个线程的修改',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '线程 A 的工作内存',
                      note: '寄存器 / store buffer / L1',
                      slots: [
                        { label: 'flag', value: 'false（旧副本）', tone: 'warn' },
                        { label: 'a', value: '0（旧副本）', tone: 'warn' },
                      ],
                    },
                    {
                      name: '主内存（堆）',
                      note: '所有线程共享',
                      slots: [
                        { label: 'flag', value: 'true（已更新）', tone: 'primary' },
                        { label: 'a', value: '42（已更新）', tone: 'primary' },
                      ],
                    },
                    {
                      name: '线程 B 的工作内存',
                      note: '寄存器 / store buffer / L1',
                      slots: [
                        { label: 'flag', value: 'true', tone: 'primary' },
                        { label: 'a', value: '42', tone: 'primary' },
                      ],
                    },
                  ],
                  caption:
                    '经典 `while (!flag) {}` 死循环就发生在这里：线程 B 已经把 `flag=true` 写回主内存，但线程 A 的工作内存里还是 `false`，而 JIT 又把 `flag` 提到了寄存器里（循环里没人改它，编译器认为可以只读一次），于是 A 永远出不来。**加 `volatile` 就是告诉编译器「每次都要重新从主内存读」**，本质是插入了 LoadLoad + LoadStore 屏障并禁用了这种提升。',
                },
              },
              {
                kind: 'question',
                title: 'JMM 是什么？主内存和工作内存是什么关系？',
                questionId: 'java-03-Q10',
                intent:
                  '先确认你没把它和 JVM 内存结构搞混。回答要分三层：是什么（规范）、抽象是什么（主内存 + 工作内存）、承诺是什么（happens-before 决定可见性）。',
                points: [
                  'JMM 是 **Java 语言规范**定义的并发内存模型，管的是可见性与有序性，不是运行时数据分区',
                  '抽象模型：所有变量存**主内存**；每个线程有私有**工作内存**，保存它用到的变量副本',
                  '线程对变量的操作必须在工作内存中进行，不能直接读写主内存（八种原子操作：`read/load/use/assign/store/write/lock/unlock`）',
                  '关键：**工作内存何时同步回主内存、何时从主内存刷新，JMM 不作时限承诺**，只承诺 happens-before 条件下的可见性',
                  '工作内存不是真实内存区域，是对寄存器、store buffer、CPU 缓存、编译器优化结果的统一抽象',
                  '落地保证：`volatile` / `synchronized` / `final` 通过插入内存屏障来实现 JMM 的承诺',
                ],
                depth:
                  '经典八种原子操作（`read`、`load`、`use`、`assign`、`store`、`write`、`lock`、`unlock`）现在很少被追问，但它能解释两个规则：① `read` 与 `load` 必须成对、`store` 与 `write` 必须成对（不允许「读了不加载」）；② 一个变量被 `lock` 后，其他线程的 `read/load` 会清空工作内存副本——这正是 `synchronized` 保证可见性的机制。',
                followup: '「既然工作内存不存在，`volatile` 到底做了什么」——它在字节码层面加 `ACC_VOLATILE` 标志，JIT 编译时在该变量的读写前后插入内存屏障（x86 上写操作会变成 `lock addl`，即 `mfence` 的等价物），并禁止把它缓存在寄存器里。',
              },
              {
                kind: 'question',
                title: '并发编程三大特性是什么？分别如何保证？',
                questionId: 'java-03-Q11',
                intent:
                  '框架题。关键是每一列都能给出具体手段，而不是只报三个名词。特别注意：**volatile 不保证原子性**，这是最常被扣分的地方。',
                points: [
                  '**原子性**：一个或多个操作要么全做、要么全不做。保证手段：`synchronized`、`Lock`、`Atomic*` 类（CAS）、`java.util.concurrent` 容器；**`volatile` 不保证原子性**',
                  '**可见性**：一个线程改了共享变量，其他线程能立刻看到。手段：`volatile`、`synchronized`（`unlock` 前刷回主内存）、`final`（构造完成后正确发布）',
                  '**有序性**：禁止指令重排序。手段：`volatile`（禁止特定重排）、`synchronized`（临界区内串行）、happens-before 规则',
                  '`i++` 是「读-改-写」三步，天然不原子；加 `volatile` 只能保证读到最新值，仍会丢更新',
                  '`long` / `double` 的非 `volatile` 写**不保证原子性**（可能读到半个值），这是 JLS 明确允许的例外（64 位拆分写）',
                  '一段代码的线程安全，往往需要三者同时满足，缺一不可',
                ],
                depth:
                  '为什么 `synchronized` 能同时保证三者：进入临界区前 `lock`（清空工作内存副本 → 后续 `read` 必然拿最新 → 可见性），临界区内串行（→ 原子性），且 `monitorenter`/`monitorexit` 隐含内存屏障（→ 有序性）。所以「一把锁解决问题」不是因为它万能，而是因为它**一次性覆盖了三个特性**。反过来说，`volatile` 只覆盖后两个，这就是为什么「用 volatile 修 i++」永远修不好。',
                followup: '「`final` 怎么保证可见性」——JSR-133 给 `final` 字段加了特殊规则：**构造器中对 `final` 字段的写，不能被重排序到构造器之外**（会插 StoreStore 屏障）。所以只要对象引用没有在构造过程中逃逸，任何线程看到这个对象时，`final` 字段一定已正确初始化。这是 String 为什么敢把 `value` 声明为 `final` 的底层依据。',
              },
              {
                kind: 'compare',
                title: '三大特性 × 保证手段：谁管哪一条',
                head: ['手段', '原子性', '可见性', '有序性', '代价 / 边界'],
                rows: [
                  ['`volatile`', '**✗ 不保证**', '✓', '✓（禁止特定重排）', '最轻，但只作用于单个变量读写'],
                  ['`synchronized`', '✓', '✓', '✓', '互斥串行，阻塞式，不可中断'],
                  ['`ReentrantLock`', '✓', '✓', '✓', '可中断、可超时、可公平；需手动 `unlock`'],
                  ['`Atomic*`（CAS）', '✓（单变量）', '✓（`get` 有 volatile 语义）', '✓', '无锁自旋；ABA、只能保证单变量'],
                  ['`final`', '—', '✓（正确发布前提下）', '✓（禁止构造器内写外泄）', '只保证初始化安全'],
                  ['`ThreadLocal`', '✓（各用各的）', '✓（不共享）', '✓', '不是同步手段，是「避免共享」'],
                  ['不可变对象', '✓', '✓', '✓', '最彻底的方案，但有创建成本'],
                ],
                note:
                  '这张表最该记住的是**第一行第三列**：`volatile` 在原子性那格是空的。面试里 90% 的「volatile 能不能保证 i++ 安全」都在考这一格。',
              },
              {
                kind: 'question',
                title: '缓存一致性问题是怎么来的？MESI 协议是什么？',
                questionId: 'java-03-Q15',
                intent:
                  '这题是「JMM 为什么要存在」的硬件级解释。答出「多核各自有缓存 + 写回策略 → 数据可能不一致」这条因果链，再讲 MESI 四态，就完整了。',
                points: [
                  '根源：CPU 与内存速度差 2-3 个数量级，所以每个核有多级缓存；缓存以**缓存行**（64 字节）为单位加载整块数据',
                  '问题：核 A 改了 `x`，只写进自己的 L1（写回策略 write-back），核 B 的 L1 里 `x` 还是旧值 → 两个核看到不同的内存',
                  'MESI 是**缓存行状态机**，给每个缓存行标四种状态之一，靠总线嗅探（snooping）互相通知',
                  '**M（Modified）**：只有本核有，且已修改（脏），必须负责写回；**E（Exclusive）**：只有本核有，干净；**S（Shared）**：多核都有，干净；**I（Invalid）**：本核副本作废',
                  '关键转换：本地写命中 `S` → 先发 Invalidate 让其他核置 `I`，自己升 `M`；他核读命中 `M` → 先把脏行写回内存，双方转 `S`',
                  'MESI 保证的是**缓存一致**（最终能看到同一份数据），但**不保证操作原子性**——`i++` 仍是「读-改-写」，中间可能被插入别的核的写',
                ],
                depth:
                  '「MESI 保证了缓存一致，为什么还需要 `volatile`」——这是最尖锐的追问。答案：MESI 只保证「缓存行内容最终一致」，但**不保证可见的时机**，也不禁止**编译器与 CPU 的重排序**。store buffer 会让写操作延迟生效（本核读自己的写，别的核读不到）；JIT 还能把变量提到寄存器里根本不发内存访问。`volatile` 通过屏障强制刷 store buffer、禁止重排，把「最终一致」收紧为「happens-before 一致」。',
                followup: '「伪共享是什么」——两个线程分别改**同一缓存行内的不同变量**，由于 MESI 以行为单位，两者会不断把对方的行置 `I`，导致缓存行在核间来回弹跳（cache line ping-pong）。解决：填充（padding）到 64 字节以上，或用 `@sun.misc.Contended` / JDK 8 的 `@Contended`。Disruptor 的 `Sequence` 就是这么干的。',
              },
              {
                kind: 'diagram',
                title: 'MESI 四态：谁能写、谁该失效',
                diagram: {
                  type: 'matrix',
                  cols: ['本地读', '本地写', '他核读', '他核写'],
                  rows: [
                    ['`M` 已修改（脏，独占）', '命中，直接用', '命中，仍是 M', '先写回内存，双方转 `S`', '写回内存，本核转 `I`'],
                    ['`E` 独占（干净）', '命中 → `E`', '直接升 `M`（无需通知他人）', '双方转 `S`', '本核转 `I`'],
                    ['`S` 共享（干净）', '命中 → `S`', '发 Invalidate，升 `M`', '命中 → `S`', '本核转 `I`'],
                    ['`I` 无效', '从内存/他核取 → `S` 或 `E`', '先取再写（RFO）→ `M`', '从内存/他核取', '从内存/他核取'],
                  ],
                  caption:
                    '读这张表只需要抓两个「升权」动作：**`E → M` 不需要通知任何人**（独占，别人没有副本），**`S → M` 必须先发 Invalidate 广播**（要让人家作废）。这就是「第一次写一个变量」比「后续写」贵的原因——第一次要抢独占权。理解这一点，也就能理解为什么「多线程写同一个变量」的性能远低于「各写各的」。',
                },
              },
              {
                kind: 'question',
                title: '指令重排序有哪几种？如何禁止？',
                questionId: 'java-03-Q13',
                intent:
                  '必须是**三种**（编译器、指令级并行、内存系统），少一种就露怯。后半问要能说出「内存屏障」并区分四种屏障。',
                points: [
                  '**编译器重排序**：javac / JIT 在不改变单线程语义的前提下调整指令顺序（最常见，也最容易被忽略）',
                  '**指令级并行重排序**：CPU 乱序执行、投机执行，只要数据不依赖就并行发（现代 CPU 的常态）',
                  '**内存系统重排序**：store buffer / invalidate queue 让写操作「看起来」延迟生效，不同核看到的顺序不同',
                  '单线程之所以看不出问题，是因为前两种都遵守 **as-if-serial** 语义；而内存系统重排靠**缓存一致性**兜底',
                  '禁止手段：**内存屏障（Memory Barrier / Fence）**，分四种：`LoadLoad`、`StoreStore`、`LoadStore`、`StoreLoad`',
                  'Java 层不直接写屏障：用 `volatile`（JIT 自动插）、`synchronized`（monitor 进出隐含）、`final`（构造器末尾插 StoreStore）、`Unsafe`/`VarHandle` 的 `fullFence` 等',
                ],
                depth:
                  '`StoreLoad` 是**最贵**的一种（x86 上用 `mfence` 或 `lock` 前缀指令，要等 store buffer 排空），而 `LoadLoad` / `StoreStore` / `LoadStore` 在 x86 上因为 TSO 模型**基本是空操作**。这解释了一个经典现象：`volatile` 写在 x86 上只多一条 `lock addl $0x0, (%rsp)`，读几乎没有额外成本——所以「volatile 很贵」的说法在 x86 上并不准确，贵的是**它禁止的优化**（比如循环里的寄存器提升）。',
                followup: '「DCL 单例为什么必须给 instance 加 volatile」——`instance = new Singleton()` 不是原子操作，分为「分配内存 → 初始化对象 → 把引用赋给 instance」三步，其中第 2、3 步可能被重排。若先赋值后初始化，另一个线程在第一次判空时看到非 null 就直接用了，拿到一个**半初始化对象**。`volatile` 禁止这个重排（通过 StoreStore 屏障）。',
              },
              {
                kind: 'question',
                title: '什么是 as-if-serial 语义？',
                questionId: 'java-03-Q14',
                intent:
                  '概念题，但要能说清「它只保证单线程，不保证多线程」，以及「它和数据依赖的关系」。答出「重排序不能改变有数据依赖的操作顺序」就到位了。',
                points: [
                  '定义：**不管怎么重排序，单线程程序的执行结果不能改变**。编译器和 CPU 必须遵守这个约束',
                  '实现方式：只对**没有数据依赖**的操作重排；有 `RAW`/`WAR`/`WAW` 依赖的一律保序',
                  '它让程序员可以「假装」程序是顺序执行的，从而不必关心底层重排——这是单线程编程模型成立的基础',
                  '**它不保证多线程**：`as-if-serial` 只管单个线程内部，跨线程的可见性与顺序要靠 happens-before',
                  '经典反例：`a = 1; b = 2;` 与 `x = b; y = a;` 两个线程各自内部可以任意重排，于是可能读到 `x=2, y=0`',
                  '所以「单线程跑一万次都对」不能推出「多线程安全」——测试通过不代表没有重排问题',
                ],
                depth:
                  '`as-if-serial` 与 happens-before 的关系常被问混：`as-if-serial` 是**单线程内**的约束（保证你不能观察到重排），happens-before 是**跨线程**的约束（保证 A 的写对 B 可见）。前者不给后者任何保证——这就是为什么单线程下完全「正确」的代码，在多线程下会出诡异结果。两者一起，才构成完整的 JMM。',
                followup: '「`as-if-serial` 会不会导致我的代码被优化到出错」——不会，因为它本身就是为了保证「不改变单线程语义」。真正会导致问题的是**数据竞争**：两个线程无同步地访问同一变量且至少一个是写。有竞争时，任何结果都被允许（JMM 明确允许出现「因果不可解释」的值），所以并发正确性必须靠同步手段建立 happens-before。',
              },
              {
                kind: 'diagram',
                title: '四种内存屏障：管的是「谁不能越过谁」',
                diagram: {
                  type: 'layers',
                  items: [
                    { label: 'LoadLoad', note: '禁止「读1 与 读2」交换顺序；保证先读到前面的写', tone: 'primary' },
                    { label: 'StoreStore', note: '禁止「写1 与 写2」交换；保证前面的写先刷出去', tone: 'primary' },
                    { label: 'LoadStore', note: '禁止「读 与 后写的写」交换', tone: 'muted' },
                    { label: 'StoreLoad', note: '禁止「写 与 后写的读」交换 —— **最强、最贵**，x86 上是 mfence', tone: 'warn' },
                  ],
                  caption:
                    '`volatile` 的插入策略是：**写前 StoreStore、写后 StoreLoad；读后 LoadLoad + LoadStore**。合起来就是「volatile 写之前的所有操作，不能被挪到写之后；volatile 读之后的所有操作，不能被挪到读之前」，也就是一次 `volatile` 访问相当于半个屏障墙。`synchronized` 更彻底——`monitorexit` 时几乎是全屏障。',
                },
              },
              {
                kind: 'question',
                title: 'happens-before 原则是什么？有哪些常用规则？',
                questionId: 'java-03-Q12',
                intent:
                  'JMM 的核心考点。必须说清「它不是时间上的先后，而是可见性保证」，并列出主要规则。八条全背没必要，六条能说清就够。',
                points: [
                  '定义：若 A happens-before B，则 **A 的结果对 B 可见**，且 A 在 B 之前（就可见性意义而言）',
                  '**重要澄清**：happens-before **不表示时间上的先后**。两个操作没有这个关系时，也可能实际有先后，只是**不保证可见**',
                  '① **程序次序**：同一线程内，前面的操作 hb 后面的操作',
                  '② **监视器锁**：对同一个锁的 `unlock` hb 后续的 `lock`',
                  '③ **volatile**：对同一 `volatile` 变量的写 hb 后续的读',
                  '④ **线程启动**：`Thread.start()` hb 该线程内的任何操作',
                  '⑤ **线程终止**：线程内的所有操作 hb 其他线程从 `join()` 成功返回',
                  '⑥ **传递性**：A hb B，B hb C ⇒ A hb C（这条最有用，可以把多个规则串起来推导）',
                  '另有：`interrupt()` hb 被中断线程检测到中断；对象构造结束 hb `finalize()` 开始；`final` 字段的写 hb 引用被其他线程看到',
                ],
                depth:
                  '为什么说「happens-before 不等于时间先后」：JMM 允许编译器与 CPU 重排，只要不破坏 happens-before。所以「A 在源码里写在 B 前面」不一定 A 先执行；反之「A 先执行」也不代表 B 能看到 A 的结果。**happens-before 是一条「可见性承诺」，不是一条「时间线」**。理解这一点，才不会被「既然没 hb 关系那肯定有问题吗」这种追问绕进去——答案是「可能有、可能没有，取决于硬件与编译器，程序行为未定义（数据竞争）」。',
                followup: '「`synchronized` 的可见性靠哪条」——靠第②条（unlock hb 后续 lock）加**传递性**：A 在 `synchronized` 块里写 `x`，退出时 `unlock`；B 随后进入同一锁的 `synchronized` 块，`lock` 后读 `x`，于是 A 的写对 B 可见。注意这里没说「刷主内存」，那是实现方式，规范层只讲 hb。',
              },
              {
                kind: 'diagram',
                title: 'happens-before 的六条主线',
                diagram: {
                  type: 'tree',
                  root: {
                    label: 'happens-before',
                    note: '可见性承诺，不是时间线',
                    children: [
                      {
                        label: '线程内',
                        note: '天然的先后',
                        tone: 'primary',
                        children: [
                          { label: '程序次序规则', note: '同一线程：前 hb 后' },
                          { label: '传递性', note: 'A hb B, B hb C ⇒ A hb C（把其他规则串起来）' },
                        ],
                      },
                      {
                        label: '线程间',
                        note: '靠同步动作建立',
                        tone: 'primary',
                        children: [
                          { label: '监视器锁', note: '同一锁的 unlock hb 后续 lock' },
                          { label: 'volatile', note: '同一变量的写 hb 后续读' },
                          { label: 'start', note: 'start() hb 该线程内所有操作' },
                          { label: 'join', note: '线程内所有操作 hb join() 返回' },
                          { label: 'interrupt', note: 'interrupt() hb 目标线程检测到中断' },
                        ],
                      },
                      {
                        label: '对象生命周期',
                        note: '发布与回收',
                        tone: 'warn',
                        children: [
                          { label: 'final', note: 'final 字段的写 hb 引用被看到（前提：构造中不逃逸）' },
                          { label: 'finalize', note: '构造结束 hb finalize() 开始' },
                        ],
                      },
                    ],
                  },
                  caption:
                    '实际分析代码时，只做一件事：**找同步动作，串成链，看首尾之间有没有 hb 关系**。有 → 安全；没有 → 存在数据竞争（结果未定义）。这条方法论比背八条规则更实用——因为绝大多数真实代码只需要用到「程序次序 + volatile/锁 + 传递性」这三条。',
                },
              },
              {
                kind: 'analogy',
                title: 'happens-before 像接力赛的交接区',
                text:
                  '4×100 米接力有一条规则：只有**接力棒交到下一棒手里**那一刻之后，下一棒跑出的成绩才算数。裁判完全不管你俩在交接区里是怎么跑的——谁先迈哪只脚、跑得多快多慢，都无所谓（这就是重排序）。但**棒一旦交出去**，你之前跑的那些距离就全部计入总成绩，而且下一棒必须从交接点起跑，不能凭空提前（这就是可见性保证）。',
                mapping: [
                  { real: '你跑的这一段', tech: '线程 A 的所有写操作' },
                  { real: '把棒交到下一棒手里', tech: '建立 happens-before 的同步动作（unlock / volatile 写 / start / join）' },
                  { real: '下一棒接住棒', tech: '线程 B 读到 A 写的值' },
                  { real: '交接区里怎么跑都行', tech: '不破坏单线程语义的重排序是允许的（as-if-serial）' },
                  { real: '棒没交，下一棒不算开始', tech: '没有 hb 关系 ⇒ 不保证可见，属于数据竞争' },
                  { real: '可以连交三棒', tech: '传递性：A hb B, B hb C ⇒ A hb C' },
                ],
                limit:
                  '类比到「多线程」就不完全成立：接力赛是严格的一棒接一棒（全序），而 happens-before 只是一个**偏序**——线程 A 和线程 C 之间可能完全没有 hb 关系，两者并行跑也不影响各自与 B 的关系。另外接力赛是「必须交接」，而 happens-before 是「若存在关系则保证可见」；不存在关系时程序并不报错，只是**结果未定义**——后者恰恰更难排查。',
              },
              {
                kind: 'code',
                title: '用 happens-before 推导：双重检查锁为什么必须加 volatile',
                lang: 'java',
                code:
                  '// ✗ 有问题的 DCL（JDK 5 之前被认为"没问题"，其实是错的）\nclass Singleton {\n    private static Singleton instance;          // 少了 volatile\n\n    static Singleton get() {\n        if (instance == null) {                 // ① 第一次检查（无锁）\n            synchronized (Singleton.class) {\n                if (instance == null) {         // ② 第二次检查\n                    instance = new Singleton(); // ③ 这行不是原子操作！\n                }\n            }\n        }\n        return instance;\n    }\n}\n\n// ③ 实际被拆成三步（JIT 可重排 2 和 3）：\n//   memory = allocate();      // 1. 分配内存\n//   ctorSingleton(memory);    // 2. 初始化对象\n//   instance = memory;        // 3. 引用赋值\n// 若 2、3 重排 → 线程 B 在 ① 看到非 null，直接返回一个「半初始化」对象\n\n// ✓ 正确写法\nclass Singleton2 {\n    private static volatile Singleton2 instance;  // volatile 禁止 2/3 重排\n\n    static Singleton2 get() {\n        Singleton2 local = instance;              // 局部变量：减少 volatile 读次数\n        if (local == null) {\n            synchronized (Singleton2.class) {\n                local = instance;\n                if (local == null) {\n                    instance = local = new Singleton2();\n                }\n            }\n        }\n        return local;\n    }\n}\n\n// ✓ 更省事的两种替代\n// 1) 静态内部类（靠类加载的线程安全 + final）\nclass Holder { static final Singleton3 INSTANCE = new Singleton3(); }\n// 2) 枚举（天然防反射、防序列化破坏）\nenum Singleton4 { INSTANCE; }',
                caption:
                  '`volatile` 在这里做的两件事：**① 禁止「初始化」与「引用赋值」重排**（写前的 StoreStore 屏障），从根上消灭半初始化对象；**② 保证引用赋值对其他线程立即可见**。注意 `local` 变量那个技巧（Doug Lea 的写法）——`volatile` 读比普通读贵，先读进局部变量能让「已经初始化好」的常见路径只做一次 `volatile` 读。',
                notes: [
                  { line: 'instance = new Singleton();', text: '三步：分配 + 初始化 + 赋值。JLS 不保证前两步对第三步的执行顺序必须严格，所以没有 `volatile` 就可能「先赋值后初始化」。' },
                  { line: 'private static volatile Singleton2 instance;', text: '`volatile` 修的是「重排序」，不是「原子性」——这里恰好只需要它修重排序，所以够用。' },
                  { line: 'enum Singleton4 { INSTANCE; }', text: '《Effective Java》推荐写法：由 JVM 保证枚举实例的唯一性与线程安全，且反序列化不会生成新实例，天然防反射攻击。' },
                ],
              },
              {
                kind: 'principle',
                title: 'volatile 是怎么用屏障兑现 happens-before 的',
                body: [
                  '`volatile` 在字节码里只是一个 `ACC_VOLATILE` 标志位，真正的活儿是 JIT 在编译时插屏障。理解插入位置，就能解释它的全部行为边界。',
                ],
                steps: [
                  {
                    title: '① volatile 写：前插 StoreStore，后插 StoreLoad',
                    detail:
                      '`StoreStore` 保证「写 volatile 之前的所有普通写」都先刷出去；`StoreLoad` 保证「写 volatile」不被后面的读越过。合起来：**volatile 写之前的一切对之后读它的人可见**。',
                  },
                  {
                    title: '② volatile 读：后插 LoadLoad 和 LoadStore',
                    detail:
                      '`LoadLoad` 保证「读到 volatile 之后的所有读」不会被提前；`LoadStore` 保证后面的写也不会被提前。合起来：**volatile 读之后的一切，都在读到它之后发生**。',
                  },
                  {
                    title: '③ 合起来就是「一次 volatile 读写 = 半堵屏障墙」',
                    detail:
                      '写方把所有修改推到墙的左边，读方把后续操作放在墙的右边。于是「写 volatile → 读 volatile」这条链路，把墙两边的东西串成了 happens-before，不需要真的同步整个内存。',
                  },
                  {
                    title: '④ 但它不保证原子性：`i++` 仍是三步',
                    detail:
                      '`i++` 展开为「读 i → 加一 → 写 i」，`volatile` 只保证每一步读到的都是最新值，两个线程仍可能都读到 0 然后都写 1。要原子必须用 `AtomicInteger`（CAS 循环）或加锁。',
                  },
                  {
                    title: '⑤ 它的真实成本是「禁止优化」，不是「刷内存」',
                    detail:
                      '在 x86 上，volatile 写的额外指令只有一条 `lock addl`；真正贵的是**它让 JIT 不能把变量缓存在寄存器、不能消除冗余读、不能重排周边指令**。所以「volatile 比锁慢」在低竞争下并不成立，在高竞争下才因为缓存行弹跳而变慢。',
                  },
                ],
                takeaway:
                  '一句话：**`volatile` = 可见性 + 有序性，不含原子性；它的实现是四种屏障的组合，代价主要来自「禁止优化」。** 需要原子性时，单变量用 `Atomic*`，多变量用锁。',
              },
              {
                kind: 'principle',
                title: '遇到任何 JMM 问题，用这三步回答',
                body: [
                  'JMM 的题之所以显得玄，是因为多数人记住了名词但没有分析框架。其实所有这类题都可以用同一个三步法回答，而且每一步都有明确依据。',
                ],
                steps: [
                  {
                    title: '第一步：找出所有「共享且可变」的变量',
                    detail:
                      '只被一个线程访问，或声明为 `final`/不可变的，直接排除。剩下的才是候选的数据竞争点。这一步能砍掉 80% 的代码。',
                  },
                  {
                    title: '第二步：找出它们之间的同步动作，串成 hb 链',
                    detail:
                      '同步动作只有几种：`synchronized` 的进出、`volatile` 读写、`start`/`join`、`Lock` 的 `lock`/`unlock`、`CountDownLatch` 的 `await`/`countDown`、`Future.get`。找到写方与读方之间的链，判断有没有 hb 关系。',
                  },
                  {
                    title: '第三步：没有 hb 关系 → 数据竞争 → 说出具体后果',
                    detail:
                      '后果要具体：可能死循环（可见性）、可能读到半初始化对象（重排序）、可能丢更新（原子性）。说出后果，比说「线程不安全」有说服力得多——因为不同后果对应不同修法。',
                  },
                ],
                takeaway:
                  '**共享 → 找同步 → 判 hb → 说后果 → 给修法。** 这五步走完，任何 JMM 题都不会答成玄学。如果面试官追问「为什么」，答案永远是「因为屏障」或「因为 happens-before 的某一条规则」。',
              },
            ],
            outline: [
              'JMM 是并发规则（可见性 + 有序性），与 JVM 内存结构无关；抽象为主内存 + 每线程工作内存',
              '三大特性：原子性（锁 / CAS）、可见性（volatile / 锁 / final）、有序性（volatile / 锁 / hb）',
              'volatile 不保证原子性，i++ 仍会丢更新；重排序三层靠四种内存屏障禁止，StoreLoad 最强最贵',
              'as-if-serial 只管单线程语义；跨线程靠 happens-before，二者不是一回事',
              'happens-before 是可见性承诺而非时间线；程序次序、锁、volatile、start/join、传递性',
            ],
            pitfalls: [
              '把 volatile 当成轻量锁去保证 i++ 的原子性：它只有可见性与有序性',
              '把 happens-before 理解成「时间上先发生」：它是偏序的可见性承诺',
              'DCL 单例不给 instance 加 volatile：可能发布半初始化对象，这是真实存在过的 bug',
            ],
          },
        },
      ],
    },
    {
      id: 'locks',
      title: 'B · 锁与同步原语',
      goal: '掌握互斥、可见性与无锁三类原语的实现与取舍',
      summary:
        '这一阶段回答「怎么保证同一时刻只有一个线程进入临界区」。synchronized 是 JVM 内建方案，volatile 与 CAS 是无锁方案，AQS 是 JUC 的骨架。理解它们的实现差异，才能在「用哪个」这类题上给出有依据的答案。',
      lessons: [
        {
          id: 'synchronized',
          title: 'synchronized 与锁升级',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['synchronized'] }],
          content: {
            intro:
              '`synchronized` 是最古老也最容易被低估的同步手段。JDK 6 之后它经历了偏向锁、轻量级锁、重量级锁的升级路径，性能已不再是短板——但仍然有人在面试里说「synchronized 比 ReentrantLock 慢一个数量级」，这是 JDK 5 时代的过时结论。这一节讲清 monitor 的结构、对象头 Mark Word 怎么在四种形态间复用、锁升级的触发条件、以及锁消除与锁粗化两种编译期优化，最后给出「什么时候它确实比 ReentrantLock 更合适」的判据。',
            sections: [
              {
                kind: 'concept',
                title: 'synchronized 保证的是什么',
                body: [
                  '`synchronized` 一次性覆盖了并发三大特性：**互斥**（同一时刻只有一个线程进入临界区 → 原子性）、**可见性**（`unlock` 前把修改刷回主内存，`lock` 时清空工作内存副本）、**有序性**（`monitorenter`/`monitorexit` 隐含内存屏障，禁止临界区内外的重排）。所以它是「一把锁解决所有问题」的典型代表。',
                  '它的语义单元是 **monitor（监视器）**，而 monitor 挂在**对象**上——每个 Java 对象都能当锁，是因为每个对象头里都预留了「锁状态」的存储位（Mark Word）。这就是为什么 `wait/notify` 定义在 `Object` 而不是 `Thread`：它们排队等的不是「线程」，而是「某个对象上的等待队列」。',
                  '可重入的实现靠 **owner + 计数器**：monitor 里记录「当前持有者线程」和一个 `recursions` 计数。同一线程再次 `monitorenter` 时，只把计数加一，不阻塞；退出时计数减一，减到 0 才真正释放。这解释了为什么「同一线程内调用自己的 synchronized 方法」不会死锁——但**换一个对象**就会。',
                  '最后一个基础事实：`synchronized` 是**非公平**的，且**不可中断**。抢不到锁的线程会进入 monitor 的 `EntryList` 阻塞等待，既不能 `tryLock` 超时，也不能被 `interrupt` 打断（只能等它自己拿到锁）。这两个限制正是 `ReentrantLock` 存在的理由。',
                ],
                term: {
                  name: 'monitor（内置锁 / 管程）',
                  def: '每个对象关联的一个同步结构，包含 owner（持有线程）、recursions（重入计数）、EntryList（等锁队列）、WaitSet（调用 wait 后的等待集合）。它是 JVM 实现 synchronized 的语义载体，对应 HotSpot 的 ObjectMonitor。',
                },
                points: [
                  '同时保证互斥、可见性、有序性——这是它相对 `volatile` 的最大优势',
                  '语义单元是对象上的 monitor，所以任何对象都能当锁',
                  '可重入靠 owner + recursions 计数，退到 0 才真正释放',
                  '非公平、不可中断、不支持超时——这是 `ReentrantLock` 的立足点',
                  '异常退出时 `monitorexit` 会自动执行（编译器生成了异常表），所以不会「锁泄漏」',
                ],
              },
              {
                kind: 'diagram',
                title: '三种用法，锁的到底是哪个对象',
                diagram: {
                  type: 'matrix',
                  cols: ['锁对象', '等效写法', '作用范围'],
                  rows: [
                    ['实例方法 `synchronized void f()`', '`this`（当前实例）', '`synchronized (this) { ... }`', '同一实例的所有 synchronized 实例方法互斥'],
                    ['静态方法 `static synchronized void f()`', '`类名.class`（Class 对象）', '`synchronized (Xxx.class) { ... }`', '**全类互斥**，所有实例共享这一把锁'],
                    ['代码块 `synchronized (obj)`', '`obj` 本身', '—', '最灵活，可只锁必要的一段，也支持任意对象'],
                  ],
                  caption:
                    '最关键的差别在第二行：**静态方法锁的是 Class 对象，与实例方法锁的 `this` 是两把完全不同的锁**——所以「一个静态 synchronized 方法 + 一个实例 synchronized 方法」可以同时被两个线程执行，很多人以为它们会互斥，这是经典误区。反过来说，如果真想「整个类只允许一个线程进」，就该锁 `Xxx.class`。',
                  note: '补充：`synchronized` 也能修饰构造器？不能。锁 `this` 在构造器里没有意义（对象还没发布出去）。',
                },
              },
              {
                kind: 'question',
                title: 'synchronized 有哪三种用法？锁静态方法和锁实例方法有什么区别？',
                questionId: 'java-03-Q16',
                intent:
                  '基础题，但「静态方法与实例方法不是同一把锁」这一点是主要区分点。答准这一点，说明你对「锁对象」有实感。',
                points: [
                  '① 修饰**实例方法**：锁 `this`，等效于 `synchronized (this) { 整个方法体 }`',
                  '② 修饰**静态方法**：锁 `Class` 对象（`Xxx.class`），是**全类唯一**的一把锁',
                  '③ 修饰**代码块**：锁括号里的对象，最灵活，可以把锁的范围缩到最小',
                  '静态方法与实例方法**互不互斥**：锁对象不同（Class vs this）',
                  '同一个类的两个不同实例的实例方法**也互不互斥**：`this` 不同',
                  '所以「锁住整个类」的正确写法是 `synchronized (Xxx.class)`，或者给静态方法加 `synchronized`',
                ],
                depth:
                  '延伸追问：「两个线程分别调 `a.f()` 和 `b.f()`（`f` 是同步实例方法，`a`、`b` 是同类两个实例）会不会互斥」——**不会**，锁对象分别是 `a` 和 `b`。要互斥必须锁同一个对象。这类题判断方法只有一个：**先确定锁对象是哪个引用，再判断两个线程是不是同一个引用**。',
                followup: '「用 `String` 常量或包装类当锁有什么问题」——`"abc"` 是常量池里的同一个对象，`Integer.valueOf(1)` 在 -128~127 会走缓存，于是**毫无关系的两处代码可能共用同一把锁**，产生意外的阻塞甚至死锁。同理，`Integer` 这类「值不可变但引用可共享」的对象都不适合当锁。规范做法：用专门的 `private final Object lock = new Object();`。',
              },
              {
                kind: 'principle',
                title: 'ObjectMonitor：一把锁内部到底有哪几个队列',
                body: [
                  'HotSpot 用 C++ 的 `ObjectMonitor` 实现 monitor。它不只是一个「标志位」，而是包含三个队列和两个计数的完整结构——理解它，`wait/notify` 与锁升级就都不需要死记了。',
                ],
                steps: [
                  {
                    title: '① `_owner`：当前持有锁的线程',
                    detail:
                      '同一时刻只有一个线程能成为 owner。抢不到锁的线程去 `_EntryList` 排队；owner 释放时从 `_EntryList` 里挑一个（**非公平**，不保证 FIFO）唤醒并让它 CAS 抢锁。',
                  },
                  {
                    title: '② `_recursions` + `_count`：重入与计数',
                    detail:
                      '`_recursions` 记录同一线程重入了几次，`monitorexit` 时递减，减到 0 才真正释放 owner。`_count` 是「包括重入在内的总持有次数」，用于监控与偏向撤销判断。',
                  },
                  {
                    title: '③ `_EntryList`：等锁队列（对应 BLOCKED）',
                    detail:
                      '被 `synchronized` 阻塞的线程在这里。处于这个队列的线程状态是 `BLOCKED`，`jstack` 里显示 `waiting to lock <0x...>`。',
                  },
                  {
                    title: '④ `_WaitSet`：调用 `wait()` 后的等待集合（对应 WAITING）',
                    detail:
                      '调用 `wait()` 时线程**释放锁**并进入 `_WaitSet`，状态为 `WAITING`。`notify()` 把它从 `_WaitSet` 移到 `_EntryList`（**所以状态变 BLOCKED，要重新抢锁**）；`notifyAll()` 移动全部。',
                  },
                  {
                    title: '⑤ `monitorenter` / `monitorexit`：字节码层面的进出',
                    detail:
                      '同步代码块编译成这两条指令；同步方法则用方法访问标志 `ACC_SYNCHRONIZED` 隐式实现。编译器会生成**两条 `monitorexit`**（正常路径一条、异常路径一条，登记在异常表里），所以抛异常也不会漏释放。',
                  },
                ],
                takeaway:
                  '**三个队列（owner / EntryList / WaitSet）+ 两个计数（recursions / count）** 就是这个结构。`BLOCKED` 在 `EntryList`、`WAITING` 在 `WaitSet`——线程状态与 monitor 队列一一对应，这也是上一节「状态即 API 索引」的又一次验证。',
              },
              {
                kind: 'diagram',
                title: 'Mark Word：64 位里怎么塞下四种锁状态',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'Mark Word 无锁态',
                      note: '64 bit，按位复用',
                      slots: [
                        { label: 'unused', value: '25 bit', tone: 'muted' },
                        { label: 'hashCode', value: '31 bit', tone: 'primary' },
                        { label: '分代年龄', value: '4 bit', tone: 'primary' },
                        { label: 'biased', value: '1 bit = 0', tone: 'primary' },
                        { label: '锁标志', value: '2 bit = 01', tone: 'warn' },
                      ],
                    },
                    {
                      name: '偏向锁态',
                      note: '同一块位，换成线程 ID',
                      slots: [
                        { label: 'ThreadID', value: '54 bit', tone: 'primary' },
                        { label: 'epoch', value: '2 bit', tone: 'muted' },
                        { label: 'unused', value: '1 bit', tone: 'muted' },
                        { label: '分代年龄', value: '4 bit', tone: 'primary' },
                        { label: 'biased', value: '1 bit = 1', tone: 'warn' },
                        { label: '锁标志', value: '2 bit = 01', tone: 'warn' },
                      ],
                    },
                    {
                      name: '轻量级 / 重量级',
                      note: '存指针',
                      slots: [
                        { label: '轻量级', value: '指向栈上 Lock Record，锁标志 00', tone: 'warn' },
                        { label: '重量级', value: '指向 ObjectMonitor，锁标志 10', tone: 'bad' },
                        { label: 'GC 标记', value: '锁标志 11', tone: 'muted' },
                      ],
                    },
                  ],
                  caption:
                    '同一块 64 bit 空间在不同状态下被**复用**：无锁时存 `hashCode` + 分代年龄，偏向时存 `ThreadID`，轻量级/重量级时存指针。这就是「`hashCode()` 一旦算过就不能再进入偏向锁」的原因——位被占用了，必须升级到轻量级（并把 hash 挪到 Lock Record 里）。面试里能说出这个冲突，说明真的看过 Mark Word。',
                },
              },
              {
                kind: 'question',
                title: 'synchronized 的底层实现原理？',
                questionId: 'java-03-Q17',
                intent:
                  '要分三层答：字节码层（monitorenter/exit）、对象层（Mark Word + monitor）、JVM 层（锁升级）。只答一层会很单薄。',
                points: [
                  '**字节码层**：同步代码块编译为 `monitorenter` … `monitorexit`（两条 exit，异常路径也有一条）；同步方法用 `ACC_SYNCHRONIZED` 访问标志',
                  '**对象层**：锁状态记在对象头 Mark Word 的 2 bit 锁标志位 + 1 bit 偏向位里；重量级锁时 Mark Word 指向 `ObjectMonitor`',
                  '**JVM 层**：`monitorenter` 先尝试轻量级（CAS 换 Mark Word 指向栈上 Lock Record），失败则膨胀为重量级（向 OS 申请 mutex）',
                  '**重入**：`ObjectMonitor` 的 `_recursions` 计数，同线程再进只加计数',
                  '**可见性**：`monitorexit` 隐含释放屏障（刷回主内存），`monitorenter` 隐含获取屏障（清空本地副本）',
                  '**异常安全**：编译器把 `monitorexit` 放进异常表（`Exception table` 的 `any` 分支），保证异常时也释放',
                ],
                depth:
                  'jvm 层面的关键细节：轻量级锁的「Lock Record」在**线程栈帧**里（`BasicObjectLock`），Mark Word 存的是指向它的指针。所以轻量级锁的「加锁」本质是一次 **CAS 交换**（Mark Word ↔ 指向 Lock Record 的指针），解锁是反向 CAS 换回来。整个过程**没有任何系统调用**，这才是它比重量级快的原因——重量级要走 `park/unpark`，涉及内核态切换。',
                followup: '「能不能反编译看看」——`javap -v` 输出里能看到 `monitorenter`/`monitorexit`；加 `-XX:+PrintFlagsFinal` 可查 `UseBiasedLocking`；`-XX:+UnlockDiagnosticVMOptions -XX:+PrintAssembly` 可看 JIT 后真正的机器码（会看到 `lock cmpxchg`）。',
              },
              {
                kind: 'question',
                title: '说一说 synchronized 的锁升级过程（偏向锁→轻量级锁→重量级锁）',
                questionId: 'java-03-Q18',
                intent:
                  '核心考点。要说清「每种锁解决什么问题」「什么条件触发升级」「升级是单向的」。另外要知道**偏向锁在 JDK 15 已默认关闭**，这是加分项。',
                points: [
                  '**无锁**：Mark Word 锁标志 `01`、偏向位 `0`',
                  '**偏向锁**：第一个线程 CAS 把自己的 ThreadID 写进 Mark Word。之后同一线程进入**只需比对 ThreadID**，连 CAS 都不用 → 适合「始终只有一个线程访问」的场景',
                  '**偏向撤销**：第二个线程来竞争时，需在**安全点**撤销偏向（把 Mark Word 恢复为无锁或直接升级）。撤销成本较高，所以「总有两个线程交替」时偏向锁是**负优化**',
                  '**轻量级锁**：多线程交替（无真正同时竞争）时，各线程在自己的栈帧 Lock Record 里保存 Mark Word 副本，用 CAS 让 Mark Word 指向自己的 Lock Record。失败则**自旋**重试',
                  '**重量级锁**：自旋失败或竞争激烈时膨胀，Mark Word 指向 `ObjectMonitor`，抢不到的线程进 `EntryList` 阻塞（`park`），涉及用户态/内核态切换',
                  '**升级单向不可逆**：一旦膨胀为重量级，就不会退回轻量级或偏向（避免反复膨胀/收缩的开销）',
                  '**JDK 15（JEP 374）起偏向锁默认禁用并标记废弃**：撤销成本高、维护复杂，现代应用里收益不明显',
                ],
                depth:
                  '为什么「升级不可逆」：降级需要全局安全点（stop-the-world 级别的操作）来判断「现在确实没有竞争了」，成本远高于一直用重量级锁。JVM 的取舍是：**宁可保守地停留在较高等级，也不冒险降级**。这也说明锁升级的设计目标不是「让单次加锁最快」，而是「让绝大多数真实场景（低竞争）避开系统调用」。',
                followup: '「偏向锁为什么被废弃」——三个理由：① 撤销需要 STW 安全点，对延迟敏感应用是灾难；② 现代应用普遍用线程池，线程复用导致「偏向」几乎总被撤销（同一把锁被不同工作线程访问）；③ 代码复杂度高，维护成本大于收益。JEP 374 之后 `-XX:+UseBiasedLocking` 默认 false。',
              },
              {
                kind: 'diagram',
                title: '锁升级：单向四级台阶',
                diagram: {
                  type: 'state',
                  states: [
                    { label: '无锁', note: '锁标志 01，偏向位 0', tone: 'muted' },
                    { label: '偏向锁', note: 'Mark Word 存 ThreadID，同线程零开销', tone: 'primary' },
                    { label: '轻量级锁', note: 'CAS 到栈上 Lock Record + 自旋', tone: 'primary' },
                    { label: '重量级锁', note: 'ObjectMonitor，EntryList 阻塞', tone: 'warn' },
                  ],
                  transitions: [
                    '第一个线程 CAS 写入自己的 ThreadID',
                    '第二个线程竞争 → 安全点撤销偏向',
                    '自旋失败 / 竞争加剧 → 膨胀',
                  ],
                  caption:
                    '四个台阶对应四种竞争强度：**没人抢（无锁）→ 一直同一个人抢（偏向）→ 交替着抢但不重叠（轻量级，CAS 就够）→ 真的同时抢（重量级，必须阻塞）**。注意台阶只上不下——这是 JVM 为了避开降级所需的全局安全点而做的保守取舍。',
                },
              },
              {
                kind: 'question',
                title: '什么是锁消除和锁粗化？',
                questionId: 'java-03-Q19',
                intent:
                  '两个 JIT 优化，考的是「synchronized 的开销可以被编译器干掉」这一认知。要能举出触发条件。',
                points: [
                  '**锁消除（Lock Elision）**：JIT 通过**逃逸分析**发现锁对象不会逃逸出当前线程，就干脆把 `synchronized` 删掉',
                  '典型场景：方法内 `new Object()` 后同步它；或 `StringBuffer`/`StringBuilder` 的局���使用（`StringBuffer` 方法全是 `synchronized`，但局部变量不逃逸 → 锁被消除）',
                  '条件：`-XX:+DoEscapeAnalysis`（默认开）+ `-XX:+EliminateLocks`（默认开），且对象确实不逃逸',
                  '**锁粗化（Lock Coarsening）**：把**连续多次**对同一对象的加解锁合并成一次，避免反复进出',
                  '典型场景：循环体内 `synchronized`（每次迭代都加解锁），JIT 会把锁提到循环外；或连续调用多个同步方法',
                  '两者方向相反：消除是「把不必要的锁删掉」，粗化是「把太碎的锁合并」',
                ],
                depth:
                  '锁消除依赖逃逸分析，而逃逸分析的结果**可能被破坏**：只要对象被赋给字段、被放入集合、被返回、被传给未知方法（可能保存引用），就算逃逸。所以「`StringBuffer` 一定比 `StringBuilder` 慢」在 JIT 之后**经常不成立**——前提是 `StringBuffer` 是局部变量。这也说明微基准测试必须用 JMH 而不是手写 `System.currentTimeMillis()`：手写测试里对象很容易因为打印而逃逸。',
                followup: '「锁粗化会不会把临界区变得太大」——理论上会（合并后临界区变长，可能增加竞争）。但 JIT 只在「同一对象、紧邻、中间没有可能抛异常或其他同步」时才合并，实际收益远大于风险。要验证可用 `-XX:+PrintCompilation` 与 `-XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining` 观察优化。',
              },
              {
                kind: 'code',
                title: '锁消除与锁粗化：两段能被 JIT 改写的代码',
                lang: 'java',
                code:
                  '// 锁消除：buffer 是局部变量，不逃逸 → synchronized 被删掉\npublic String concat(String a, String b) {\n    StringBuffer sb = new StringBuffer();   // 注意：StringBuffer 方法全是 synchronized\n    sb.append(a).append(b);\n    return sb.toString();                   // 只有 return 出去的是 String，sb 本身不逃逸\n}\n\n// 锁粗化：循环内反复加同一把锁 → 合并到循环外\npublic void addAll(List<String> items) {\n    for (String s : items) {\n        synchronized (lock) {               // JIT 会把锁提到循环外\n            result.add(s);\n        }\n    }\n}\n// 等价于（JIT 视角）\n// synchronized (lock) { for (String s : items) result.add(s); }\n\n// 反面案例：跑出手写基准测试的错误结论\npublic long badBenchmark() {\n    long t0 = System.nanoTime();\n    for (int i = 0; i < 1_000_000; i++) {\n        StringBuffer sb = new StringBuffer();\n        sb.append(i);\n        System.out.println(sb.toString());   // ① I/O 占了 99% 时间\n    }\n    long t1 = System.nanoTime();              // ② 没有预热，JIT 还没编译\n    return t1 - t0;                          // ③ 结论：StringBuffer 比 StringBuilder 慢 3 倍？\n}',
                caption:
                  '第二段值得注意：**JIT 对「锁粗化」的处理，实际上是在替你写更粗的临界区**。所以「把 `synchronized` 写在循环里」不一定是性能问题——只要锁对象是同一个且中间无其他同步，JIT 会合并。真正需要避免的是「在循环里锁不同对象」或「临界区内做 IO/RPC」。',
                notes: [
                  { line: 'StringBuffer sb = new StringBuffer();', text: '`StringBuffer` 的每个方法都用 `synchronized` 修饰。局部使用且不逃逸时，JIT 会消除这些锁；一旦 `sb` 被返回或存入字段，锁就无法消除。' },
                  { line: 'synchronized (lock) { result.add(s); }', text: '锁对象固定为同一个 `lock`，且循环体里没有其他同步动作 → 满足锁粗化条件。若每次锁的对象不同（如 `items.get(i)`），则无法合并。' },
                  { line: 'System.out.println(...);', text: '`PrintStream` 内部有锁且是同步 IO，会彻底淹没测量目标。基准测试必须用 JMH，或至少把结果先累加、循环后再输出。' },
                ],
              },
              {
                kind: 'question',
                title: 'synchronized 和 ReentrantLock 的区别？',
                questionId: 'java-03-Q20',
                intent:
                  '对比题，重点不是罗列功能，而是说清「ReentrantLock 多出来的能力在哪、代价是什么、什么时候值得用」。',
                points: [
                  '**实现层**：`synchronized` 是 JVM 关键字（monitor + 字节码）；`ReentrantLock` 是 JDK 类（AQS + CAS + `LockSupport`）',
                  '**释放**：`synchronized` 自动释放（含异常路径）；`ReentrantLock` 必须 `finally` 里手动 `unlock()`，否则锁泄漏',
                  '**可中断**：`lockInterruptibly()` 可响应中断；`synchronized` 抢锁不可中断',
                  '**超时**：`tryLock(timeout, unit)`；`synchronized` 没有超时能力',
                  '**公平性**：`new ReentrantLock(true)` 可公平；`synchronized` 只有非公平',
                  '**条件变量**：`ReentrantLock` 可 `newCondition()` 建多个条件队列（精确唤醒）；`synchronized` 只有一个 `WaitSet`，只能 `notifyAll` 或随机 `notify`',
                  '**性能**：JDK 6 之后低竞争下 `synchronized` 更好（有锁升级，无需额外对象）；高竞争下两者接近，`ReentrantLock` 的自旋与队列实现略优',
                ],
                depth:
                  '「多个条件队列」是最有说服力的差异，也是最容易被忽略的：生产者消费者用 `synchronized` 时，「队列满」和「队列空」共用一个 `WaitSet`，生产者 `notify` 可能叫醒另一个生产者（无效唤醒），只能用 `notifyAll` 导致惊群。`ReentrantLock` 可以建 `notFull` 和 `notEmpty` 两个 `Condition`，`notFull.signal()` 精确唤醒生产者——这是 `ArrayBlockingQueue` 的实现方式。',
                followup: '「那到底该用哪个」——默认用 `synchronized`（简单、不可能忘记解锁、有锁升级）；需要**可中断、超时、公平、多条件队列**任一项时用 `ReentrantLock`。JDK 自己的选择也是这个逻辑：`ConcurrentHashMap` 用 `synchronized` 锁桶（简单够用），`ArrayBlockingQueue` 用 `ReentrantLock`（需要两个 Condition）。',
              },
              {
                kind: 'compare',
                title: 'synchronized vs ReentrantLock：一张表定取舍',
                head: ['维度', 'synchronized', 'ReentrantLock'],
                rows: [
                  ['实现层次', 'JVM 关键字，monitor + 字节码', 'JDK 类，AQS + CAS'],
                  ['释放方式', '自动（含异常路径）', '手动 `finally { unlock(); }`'],
                  ['可中断', '✗ 抢锁不可中断', '✓ `lockInterruptibly()`'],
                  ['超时', '✗', '✓ `tryLock(time, unit)`'],
                  ['公平锁', '✗ 仅非公平', '✓ 可构造公平锁'],
                  ['条件队列', '1 个 `WaitSet`（只能 notifyAll）', '可多个 `Condition`，精确唤醒'],
                  ['读写分离', '✗', '✓ `ReentrantReadWriteLock`'],
                  ['低竞争性能', '更好（有锁升级 / 偏向）', '需额外对象，略差'],
                  ['用错后果', '最多死锁，不会漏解锁', '忘记 unlock → 锁泄漏，线程永久阻塞'],
                  ['推荐场景', '绝大多数场景的默认选择', '需要中断 / 超时 / 公平 / 多条件'],
                ],
                note:
                  '最后两行是实践中最该记住的：**`synchronized` 的失败模式更「安全」**（最坏是死锁，一眼能看出来），而 `ReentrantLock` 忘记 `unlock` 会导致「锁泄漏 + 线程池逐渐被占满」，排查起来非常痛苦。所以「不确定就用 `synchronized`」是合理的工程建议。',
              },
              {
                kind: 'question',
                title: 'synchronized 和 ReentrantLock 的可重入是怎么实现的？',
                questionId: 'java-03-Q21',
                intent:
                  '考实现细节。两者的机制完全不同：一个靠 monitor 的计数，一个靠 AQS 的 state + 持有线程。要能分别说清。',
                points: [
                  '**synchronized**：`ObjectMonitor` 里 `_owner` 记录持有线程、`_recursions` 记录重入次数。同线程再次 `monitorenter` 只把 `_recursions++`，不阻塞；`monitorexit` 递减，减到 0 才真正释放',
                  '**ReentrantLock**：AQS 的 `state` 就是重入次数。`tryAcquire` 里若 `state == 0` 则 CAS 抢锁并 `setExclusiveOwnerThread(current)`；若 `current == getExclusiveOwnerThread()` 则 `state + 1`',
                  '`ReentrantLock` 释放：`tryRelease` 里 `state - 1`，减到 0 时 `setExclusiveOwnerThread(null)` 并返回 true 才真正唤醒后继',
                  '两者都要求**加锁与解锁次数必须配对**，多 unlock 一次会抛异常（`IllegalMonitorStateException` / `IllegalMonitorStateException`）',
                  '可重入的价值：避免「自己等自己」的死锁。典型场景是递归方法、以及 synchronized 方法内部调用另一个 synchronized 方法',
                  '可重入的代价：**必须真的能重入**，所以锁实现不能简单用「一个 boolean 标志」',
                ],
                depth:
                  '为什么不能只用一个 boolean 表示「被占用」：如果 A 线程已经持有锁，它再进一次时会看到「已占用」而等待自己——永久死锁。所以任何可重入锁都必须记录「持有者是谁 + 重入了几次」。**这也是自研锁最常见的 bug**：只写了 `AtomicBoolean locked`，一旦有嵌套调用就死锁。',
                followup: '「可重入会带来什么风险」——它掩盖了「锁的粒度设计不当」。比如一个 synchronized 方法调用了另一个 synchronized 方法，表面看是重入没问题，但如果两个方法的锁是**不同对象**，就会死锁；如果锁范围过大，还会让临界区远超预期。所以「能重入」是安全网，不是设计目标。',
              },
              {
                kind: 'analogy',
                title: 'monitor 像一间只有一把钥匙的会议室',
                text:
                  '公司有一间只有一把钥匙的**会议室**，门口挂着一块牌子（就是 Mark Word 里的锁标志）。`王工` 拿走了钥匙，牌子上写「占用（王工）」。之后**王工自己**又要进来讨论（重入）——他本来就有钥匙，直接进，不用排队，牌子上的计数从 1 变成 2。别的同事来了，只能在门口**排队等**（`EntryList`，状态 `BLOCKED`）。而如果有人进了会议室发现「投影仪还没送到」，他会**把钥匙交回前台、去休息室等通知**（`wait()` → 释放锁、进 `WaitSet`），等投影仪到了前台喊一声（`notify`），他再回来**重新排队拿钥匙**。',
                mapping: [
                  { real: '会议室', tech: '被 synchronized 的对象（monitor）' },
                  { real: '门口的牌子', tech: '对象头 Mark Word 的锁标志位' },
                  { real: '拿走钥匙的人', tech: '`ObjectMonitor._owner`' },
                  { real: '王工自己再进来，不用排队', tech: '可重入：`_recursions++`' },
                  { real: '门口排队的同事', tech: '`_EntryList`，状态 `BLOCKED`' },
                  { real: '交回钥匙去休息室等通知', tech: '`wait()`：释放锁，进 `WaitSet`，状态 `WAITING`' },
                  { real: '前台喊一声「投影仪到了」', tech: '`notify()`：从 `WaitSet` 移到 `EntryList`' },
                  { real: '被喊的人回来还要重新排队拿钥匙', tech: '唤醒后状态变 `BLOCKED`，要重新抢锁' },
                ],
                limit:
                  '类比到「多个锁」会失效：现实中你可以同时拿着 A、B 两间会议室的钥匙，Java 线程持有多把锁就构成**死锁**风险（你拿 A 等 B，他拿 B 等 A）。另外现实中的「喊一声」所有人都能听见，而 `notify()` 只随机叫醒**一个**——这也是为什么多数场景该用 `notifyAll()`：宁可惊群，也不要「叫错人导致没人干活」。',
              },
              {
                kind: 'principle',
                title: '什么时候它确实比 ReentrantLock 更合适',
                body: [
                  '这一节最后落到实处：绝大多数「用哪个」的答案都是 `synchronized`。但要有依据，而不是「大家都这么说」。',
                ],
                steps: [
                  {
                    title: '① 默认 `synchronized`：不会漏解锁',
                    detail:
                      '它的释放由编译器生成的 `monitorexit` 保证（包括异常路径），代码里不可能「忘记解锁」。而 `ReentrantLock` 一旦 `finally` 写漏，就是锁泄漏 + 线程池逐步被占满的慢性事故。',
                  },
                  {
                    title: '② 低竞争下它更快：锁升级是专门为此设计的',
                    detail:
                      '无竞争时偏向锁只需比对 ThreadID，轻量级锁只需一次 CAS——都没有系统调用。`ReentrantLock` 至少要 new 一个对象并走 AQS 的 CAS 循环，低竞争下反而更重。',
                  },
                  {
                    title: '③ 需要「等不到就走」时，必须换 `ReentrantLock`',
                    detail:
                      '`tryLock(timeout)` 是 `synchronized` 给不了的能力。这在「避免请求线程被慢操作拖死」的场景（如缓存击穿、下游超时保护）是刚需——它把「无限等待」变成「可控超时」。',
                  },
                  {
                    title: '④ 需要「精确唤醒」时，必须换 `ReentrantLock`',
                    detail:
                      '一个 monitor 只有一个 `WaitSet`，生产者消费者共用时只能 `notifyAll`。多个 `Condition` 能分别唤醒「等非空」和「等不满」的线程，这是 `ArrayBlockingQueue` 的选择。',
                  },
                  {
                    title: '⑤ 说到底，先问「我需不需要那四个额外能力」',
                    detail:
                      '可中断 / 超时 / 公平 / 多条件队列——四个都不需要，就用 `synchronized`。需要一个，就用 `ReentrantLock`。这是唯一需要的决策依据。',
                  },
                ],
                takeaway:
                  '一句话收口：**`synchronized` 是「安全默认值」，`ReentrantLock` 是「需要特定能力时的专用工具」。** 面试里说「我默认用 synchronized，只有在需要 tryLock 超时或 Condition 精确唤醒时才换 ReentrantLock」，比列十行对比表更有说服力。',
              },
            ],
            outline: [
              '三种用法：修饰实例方法锁 this、静态方法锁 Class、代码块锁指定对象；静态与实例不是同一把锁',
              'monitor 结构：owner + recursions + EntryList（BLOCKED）+ WaitSet（WAITING）',
              '底层：monitorenter/exit（两条，异常路径也有）+ Mark Word 锁标志 + ObjectMonitor',
              '锁升级单向：无锁 → 偏向（存 ThreadID）→ 轻量级（CAS 到栈 Lock Record）→ 重量级',
              '锁消除靠逃逸分析删锁，锁粗化把循环内的同一把锁合并到循环外；可重入靠 owner + 计数',
            ],
            pitfalls: [
              '以为静态 synchronized 方法和实例 synchronized 方法互斥：锁对象不同（Class vs this）',
              '用字符串常量或 Integer 当锁：常量池/缓存会导致无关代码共用同一把锁',
              'ReentrantLock 的 unlock 不写在 finally 里：抛异常后锁泄漏，线程池被逐步占满',
            ],
          },
        },
        {
          id: 'volatile-cas',
          title: 'volatile、CAS 与原子类',
          kind: 'concept',
          sources: [
            { topic: 'java-03', chapters: ['volatile'] },
            { topic: 'java-03', chapters: ['CAS'] },
          ],
          content: {
            intro:
              '`volatile` 与 CAS 是一对搭档：前者解决**可见性与有序性**，后者解决**原子性**，合起来就是无锁编程的全部基础。这一节把 volatile 的两层语义、`i++` 为什么修不好、CAS 的三大缺陷（ABA、自旋开销、只能单变量）、以及 `LongAdder` 为什么比 `AtomicLong` 快讲透。有一条主线要一直抓住：**「无锁」不是「无开销」**——CAS 失败要自旋，高竞争下自旋空转会烧掉大量 CPU，反而比加锁更慢。所以「无锁一定比锁快」是这一节最需要被纠正的误解。',
            sections: [
              {
                kind: 'concept',
                title: 'volatile 的两层语义，一句话说清',
                body: [
                  '`volatile` 的语义只有两条，但每条都有具体机制：**① 可见性**——对 `volatile` 变量的写，会立刻刷新到主内存，读会强制从主内存重新加载（不走寄存器缓存）；**② 有序性**——禁止 `volatile` 读写与周边指令的特定重排，通过插入四种内存屏障实现。',
                  '它**不提供**什么：不保证原子性（`i++` 仍会丢更新）、不保证互斥（两个线程可以同时读同一个 `volatile` 变量）、不保证「引用指向的对象内部字段」可见（只保证引用本身）。这三条边界是面试的主要火力点。',
                  '最典型的正确用法是**状态标志位**：一个线程写 `volatile boolean stopped = true`，另一个线程循环 `while (!stopped)`。这里只有「单次读写」，没有复合操作，恰好落在 volatile 的能力范围内。反过来，只要出现「读-改-写」，就必须换 `Atomic*` 或加锁。',
                  '一个容易被忽略的成本：`volatile` 禁止的优化里包括**寄存器提升（hoisting）**。没有 `volatile` 时，JIT 可以把循环里的变量读一次放进寄存器（因为单线程看不出差别）；有 `volatile` 就必须每次重读主内存。所以 `volatile` 在紧循环里的开销，主要来自「每次都要发内存访问」而不是屏障指令本身。',
                ],
                term: {
                  name: 'volatile 的可见性保证',
                  def: '写 volatile 变量时，JIT 在该写之前插入 StoreStore 屏障（保证之前的写都刷出去）、之后插入 StoreLoad 屏障；读 volatile 变量时，在其后插入 LoadLoad 与 LoadStore 屏障。合起来实现「写 volatile 之前的一切，对读它之后的一切可见」。',
                },
                points: [
                  '两层语义：可见性（强制走主内存）+ 有序性（禁止特定重排）',
                  '不保证原子性、不保证互斥、不覆盖「引用所指对象的内部字段」',
                  '最合适的用法：状态标志位、一次性安全发布、DCL 的引用',
                  '真实开销来自「禁止寄存器提升 → 每次都要访存」，而不只是屏障指令',
                ],
              },
              {
                kind: 'diagram',
                title: 'volatile 能做与不能做',
                diagram: {
                  type: 'split',
                  left: {
                    title: '✓ 它能做的',
                    tone: 'good',
                    items: [
                      '一个线程写、另一个线程读，读方立刻看到新值',
                      '禁止「写 volatile 前」与「读 volatile 后」的重排',
                      '终止 while 死循环（可见性 + 禁止寄存器提升）',
                      '安全发布：写好对象后把 volatile 引用置上',
                      'DCL 单例：禁止「初始化」与「引用赋值」重排',
                      '开销极小：x86 上写只多一条 lock 前缀指令',
                    ],
                  },
                  right: {
                    title: '✗ 它做不到的',
                    tone: 'bad',
                    items: [
                      '`i++` / `count += 1` 的原子性（读-改-写三步）',
                      '互斥：两个线程可以同时读同一个变量',
                      '保护「引用所指对象」的内部字段可见性',
                      '替代锁：涉及多个变量的一致性约束',
                      '保证 long/double 的复合操作（只能保证单次读写原子）',
                      '性能优化：它反而**禁止**了一批 JIT 优化',
                    ],
                  },
                  caption:
                    '判断标准只有一条：**这个操作是不是「单次读」或「单次写」？** 是 → `volatile` 够用；不是（读-改-写、多变量一致）→ 必须 `Atomic*` 或锁。「用 `volatile` 修 `i++`」是最高频的错误答案。',
                },
              },
              {
                kind: 'question',
                title: 'volatile 的作用（两层语义）是什么？',
                questionId: 'java-03-Q22',
                intent:
                  '必须完整说出「可见性 + 有序性」两层，并明确「不保证原子性」。只答「保证可见性」会被追问到卡住。',
                points: [
                  '**可见性**：写 volatile 变量会立刻刷回主内存并让其他核的缓存行失效；读会强制从主内存重新加载',
                  '**有序性**：禁止 volatile 写与之前、volatile 读与之后的操作重排（写前 StoreStore、写后 StoreLoad、读后 LoadLoad + LoadStore）',
                  '实现层：字节码加 `ACC_VOLATILE` 标志；JIT 编译时插入内存屏障；x86 上写变成 `lock addl`（等价 mfence）',
                  '**不保证原子性**：`i++` 三步仍可能交错；`volatile` 只让每一步读到最新值',
                  '**不保证互斥**：多个线程可以同时读同一个变量',
                  '一句话定义：`volatile` 是「轻量级的同步机制」，保证可见性与有序性，但不保证原子性',
                ],
                depth:
                  '追问「`volatile` 会不会刷整个缓存」——不会。现代实现是**按缓存行失效（invalidate）**而非「回写全部」，且 x86 的 `lock` 前缀会锁总线或锁缓存行，只影响被操作的地址。所以 `volatile` 的开销与「访问的缓存行数」相关，而不是与内存总量相关。',
                followup: '「`volatile` 修饰数组会怎样」——只保证**数组引用**的可见性，不保证**数组元素**的可见性。`volatile int[] arr` 中 `arr[0] = 1` 不是 volatile 写，别的线程可能看不到。要对元素做可见性保证，得用 `AtomicIntegerArray`。',
              },
              {
                kind: 'question',
                title: 'volatile 为什么不能保证原子性？怎么解决？',
                questionId: 'java-03-Q23',
                intent:
                  '要能画出 `i++` 的三步并说明「哪一步出了问题」，然后给出三种解决方式及各自适用场景。',
                points: [
                  '`i++` 是三步：**读** `i` → **加一** → **写** `i`。`volatile` 只保证「读到的都是最新值」，三步之间仍可被插入',
                  '具体交错：T1 读 0，T2 读 0，T1 写 1，T2 写 1 → 两次自增只加了一次（丢更新）',
                  '解法一：`AtomicInteger.incrementAndGet()`（CAS 循环，单变量最优）',
                  '解法二：`synchronized` / `Lock`（需要多个变量一起保持一致性时）',
                  '解法三：`LongAdder`（高并发累加，牺牲「读的精确性」换吞吐）',
                  '**不能**的解法：继续加 `volatile`、把 `i++` 拆成多行（没用，拆完仍不是原子）、用 `volatile` 加 `synchronized` 混写（浪费）',
                ],
                depth:
                  '「既然 `volatile` 让每次都读到最新值，为什么还会丢更新」——关键在于「读到最新」和「写得对」之间有时间窗。T1 读到 0 之后、写回之前，T2 也可能读到 0；两者都基于「旧值」计算，最后都写 1。**原子性要求的是「读-改-写不可分割」，`volatile` 只解决了「读得新」这一半。**',
                followup: '「`AtomicInteger` 是不是绝对安全」——单次操作安全，但**复合操作**（如 `if (count.get() < limit) count.incrementAndGet();`）仍然不是原子的，仍需要额外同步或改用 `compareAndSet` 循环。这就是「线程安全的组件组合起来不一定线程安全」的典型例子。',
              },
              {
                kind: 'code',
                title: 'i++ 的三种修法，以及 volatile 的正确用法',
                lang: 'java',
                code:
                  '// ✗ 错：volatile 修不好 i++\nclass BadCounter {\n    volatile int count;\n    void inc() { count++; }        // 三步操作，仍会丢更新\n}\n\n// ✓ 修法一：AtomicInteger（单变量最优）\nclass AtomicCounter {\n    private final AtomicInteger count = new AtomicInteger();\n    void inc() { count.incrementAndGet(); }\n    int get()  { return count.get(); }\n}\n\n// ✓ 修法二：synchronized（需要多变量一起保持一致时）\nclass SyncCounter {\n    private int a, b;              // 两个变量必须一起变，只能用锁\n    synchronized void inc() { a++; b++; }\n    synchronized int[] get() { return new int[]{a, b}; }\n}\n\n// ✓ 修法三：LongAdder（超高并发累加，读不要求绝对精确）\nclass AdderCounter {\n    private final LongAdder count = new LongAdder();\n    void inc() { count.increment(); }\n    long get() { return count.sum(); }   // sum() 是「准快照」，并发下可能偏小\n}\n\n// ◆ volatile 的正确用法：状态标志位（单次读写）\nclass Worker implements Runnable {\n    private volatile boolean stopped;          // 只有「写一次 / 读多次」，没有复合操作\n\n    public void run() {\n        while (!stopped) {                     // 没有 volatile 时，JIT 可能提到寄存器 → 死循环\n            doWorkChunk();\n        }\n    }\n    void shutdown() { stopped = true; }\n}',
                caption:
                  '最后一组才是 `volatile` 的「家」。判断能不能用 `volatile`，只需问一句：**这个变量是不是「一个线程写、其他线程只读」或「单次读写」？** 是 → 用它；只要出现「基于旧值算新值」，就必须换成原子类或锁。',
                notes: [
                  { line: 'count++', text: '字节码是 `getfield / iconst_1 / iadd / putfield` 四条，且没有 `monitorenter`——中间完全可能被切走。' },
                  { line: 'count.incrementAndGet();', text: '内部是 `do { v = get(); } while (!compareAndSet(v, v + 1));` 的自旋，失败就重读重试，因此不会丢更新。' },
                  { line: 'count.sum();', text: '`LongAdder.sum()` 遍历所有 Cell 累加，**不是原子快照**；并发累加时可能读到「部分更新」，所以只适合统计报表，不适合做序列号。' },
                  { line: 'private volatile boolean stopped;', text: '这是 `volatile` 的经典用法：无复合操作、只需要可见性。没有它，JIT 会把 `stopped` 提升到寄存器，`while` 变成死循环。' },
                ],
              },
              {
                kind: 'question',
                title: '双重校验锁（DCL）单例为什么必须加 volatile？写出实现。',
                questionId: 'java-03-Q24',
                intent:
                  '经典题。要说清「对象创建不是原子操作」与「2/3 步重排导致半初始化对象」，并写出正确实现。注意本课已在 JMM 一节推导过，这里要能**当场写出来**。',
                points: [
                  '`instance = new Singleton()` 三步：分配内存 → 初始化对象 → 把引用赋给 `instance`',
                  '第 2、3 步可能被重排 → 别的线程在第一次判空时看到非 null，拿到一个**半初始化对象**',
                  '`volatile` 通过写前的 StoreStore 屏障禁止这个重排，从根上消灭该问题',
                  '为什么要「双重」校验：第一次检查避免「已初始化后还要抢锁」（绝大多数调用走这条快路径）；第二次检查防止「两个线程同时通过第一次检查」',
                  '更优的两种替代：**静态内部类**（靠类初始化的线程安全）、**枚举**（防反射、防序列化破坏）',
                  '注意：`volatile` 只解决重排，不解决「if 判断 + new」的竞态——后者靠 `synchronized`',
                ],
                depth:
                  '为什么第一次检查不能省：`synchronized` 是重量级操作，如果每次 `get()` 都要抢锁，单例反而成了性能瓶颈。第一次检查让「已初始化」的路径完全无锁。为什么第二次检查也不能省：A、B 同时通过第一次检查后，A 拿到锁创建了实例，B 随后拿到锁时若不再检查就会**重复创建**（覆盖掉 A 的实例，破坏单例）。两次检查各解决一个不同的问题，缺一不可。',
                followup: '「枚举为什么能防反射」——`Constructor.newInstance` 对枚举类型有硬编码检查，直接抛 `IllegalArgumentException: Cannot reflectively create enum objects`。这也是《Effective Java》推荐枚举单例的原因：它同时解决了线程安全、反射攻击、反序列化生成新实例三个问题。',
              },
              {
                kind: 'question',
                title: 'volatile 和 synchronized 的区别？',
                questionId: 'java-03-Q25',
                intent:
                  '对比题，关键是「原子性」这一列和「是否阻塞」这一列。要能一句话总结「volatile 是轻量级同步，synchronized 是完整同步」。',
                points: [
                  '**原子性**：`volatile` ✗；`synchronized` ✓（互斥）',
                  '**可见性**：两者都有，但机制不同——`volatile` 靠屏障，`synchronized` 靠 `monitor` 进出时刷主内存/清副本',
                  '**阻塞**：`volatile` 不阻塞（非阻塞同步）；`synchronized` 抢不到锁会 `BLOCKED` 阻塞',
                  '**粒度**：`volatile` 只作用于一个变量；`synchronized` 可保护一段代码或多个变量',
                  '**编译器优化**：`volatile` 只禁止特定重排；`synchronized` 的临界区仍可内部重排（只保证进出是屏障）',
                  '**性能**：低竞争下 `volatile` 明显更轻；高竞争下 `synchronized` 靠锁升级与阻塞反而更稳（不会空转烧 CPU）',
                ],
                depth:
                  '一个反直觉的点：**`synchronized` 并不禁止临界区内的重排序**。临界区内部依然可以任意重排（只要符合 as-if-serial），只有「进出临界区」这个边界是屏障。所以「synchronized 保证了有序性」的准确含义是「跨临界区的顺序被保证」，而不是「临界区内串行执行」。',
              },
              {
                kind: 'compare',
                title: 'volatile vs synchronized：五列定取舍',
                head: ['维度', 'volatile', 'synchronized'],
                rows: [
                  ['原子性', '✗ 不保证', '✓ 互斥保证'],
                  ['可见性', '✓（屏障刷主内存）', '✓（monitor 进出）'],
                  ['有序性', '✓ 禁止特定重排', '✓ 只保证临界区边界'],
                  ['阻塞', '不阻塞', '抢不到锁 → `BLOCKED`'],
                  ['作用范围', '单个变量', '一整段代码 / 多个变量'],
                  ['重入', '无此概念', '可重入（`_recursions`）'],
                  ['性能', '极轻；但禁止 JIT 优化', '低竞争有锁升级；高竞争靠阻塞避免空转'],
                  ['典型用途', '状态标志、安全发布、DCL 引用', '复合操作、多变量一致性、临界区'],
                ],
                note:
                  '最后一行「性能」值得咀嚼：在**高竞争**下，`volatile` 的 CAS 类用法会失败重试、空转烧 CPU，而 `synchronized` 会把抢不到的线程挂起。所以「无锁一定快」是错的——**低竞争无锁快，高竞争锁更稳**。这也是 `LongAdder` 存在的理由（见本节后半）。',
              },
              {
                kind: 'question',
                title: 'volatile 能保证线程安全吗？修饰对象引用代表内部字段安全吗？',
                questionId: 'java-03-Q26',
                intent:
                  '两个陷阱连问。第一问答案是否定的（要看有没有复合操作），第二问更是否定（只保证引用可见，不保证对象内部字段）。',
                points: [
                  '**不能一概而论**：`volatile` 只保证可见性与有序性。若共享状态只有「单次读/写」，它够用；一旦有复合操作或多个字段的约束，就不够',
                  '`volatile` 修饰对象引用：只保证**引用本身**的可见性与「不被重排」，**不保证对象内部字段**的可见性',
                  '原因：屏障只作用在「引用这个 4/8 字节的值」上，对象内部字段是另外的内存位置，各写各的',
                  '典型反例：`volatile Map<K,V> map`，`map.put(k, v)` 不是 volatile 写，其他线程可能看不到这个 entry',
                  '正确做法：状态不可变（`volatile` 指向不可变对象，整体替换）、或用 `ConcurrentHashMap`、或加锁',
                  '「整体替换」是推荐手法：`volatile Config config; void update(Config c){ config = c; }`——引用切换是原子的，且新对象构造完成后才发布',
                ],
                depth:
                  '为什么「不可变对象 + volatile 引用」是安全发布的黄金组合：`final` 字段保证「构造器中对 final 的写不会外泄」，`volatile` 保证「引用赋值对其他线程立即可见」。两者叠加，读线程看到引用时对象一定已完整初始化。这就是 `Collections.unmodifiableXxx`、`record`、以及各种 `Snapshot` 配置类的设计依据。',
                followup: '「那 `volatile` 数组呢」——同样只保证引用。要对元素做原子性/可见性保证，用 `AtomicIntegerArray` / `AtomicReferenceArray`（内部对每个元素做 volatile 读写）。',
              },
              {
                kind: 'concept',
                title: 'CAS：三个值 + 一次 CPU 指令',
                body: [
                  'CAS（Compare-And-Swap）的语义只有一句话：**「如果内存位置 V 的当前值等于期望值 A，就把它改成新值 B，返回成功；否则什么都不做，返回失败。」** 它是无锁编程的唯一原语，也是 `Atomic*`、AQS、`ConcurrentHashMap` 的共同基础。',
                  '关键点：**「比较」和「交换」是一个不可分割的硬件动作**，由 CPU 的 `cmpxchg` 指令（x86）或 `LL/SC`（ARM）保证。所以它不是「先读再比再写」的三步软件逻辑——那三步之间可以被插入，就失去了原子性。这也是为什么 CAS 必须由硬件支持，纯软件无法实现。',
                  'Java 里的入口是 `sun.misc.Unsafe.compareAndSwapInt` 等一组方法，JDK 9 之后推荐 `VarHandle`（标准 API，无需反射拿 Unsafe）。`AtomicInteger` 内部就是「`Unsafe` + 一个 `volatile int value`」再包一层自旋循环。',
                  'CAS 的三个缺陷必须记全：**① ABA**（值绕回原样，看不出中间变过）；**② 自旋开销**（高竞争下不停失败重试，白烧 CPU）；**③ 只能保证单个变量**（多变量无法用一个 CAS 原子更新）。这三条各有对应的解法，也是「什么时候该用锁」的判断依据。',
                ],
                term: {
                  name: 'CAS（Compare-And-Swap）',
                  def: '一种原子指令：比较内存值与期望值，相等则写入新值。返回是否成功。它把「检查」与「修改」合并成一个不可分割的硬件操作，是无锁算法的基础。',
                },
                points: [
                  '三要素：内存地址 V、期望值 A、新值 B',
                  '「比较 + 交换」由 CPU 指令原子完成（`cmpxchg` / `LL-SC`），不是软件三步',
                  'Java 入口：`Unsafe.compareAndSwapXxx` → JDK 9 起推荐 `VarHandle`',
                  '三大缺陷：ABA、自旋开销、只能单变量',
                  '`Atomic*` 类 = `volatile` 字段 + CAS 自旋 + 内存屏障',
                ],
              },
              {
                kind: 'question',
                title: 'CAS 是什么？在 Java 中如何实现？',
                questionId: 'java-03-Q27',
                intent:
                  '要说清语义、硬件基础、以及 Java 层的三个入口（Unsafe / Atomic 类 / VarHandle）。只答「比较并交换」太单薄。',
                points: [
                  '语义：`if (V == A) { V = B; return true; } else return false;`，整个过程原子',
                  '硬件基础：CPU 的 `cmpxchg`（x86，配合 `lock` 前缀）或 `LL/SC`（ARM）。**没有硬件支持就实现不了**',
                  'Java 第一层入口：`sun.misc.Unsafe` 的 `compareAndSwapInt` / `compareAndSwapObject` 等（需反射拿实例，JDK 9+ 受限）',
                  'Java 第二层：`AtomicInteger` / `AtomicReference` 等原子类（封装好自旋与屏障，**业务代码应该用这层**）',
                  'Java 第三层：JDK 9 起的 `VarHandle`（标准 API，支持普通字段的原子/volatile 访问，替代 Unsafe）',
                  '典型用法：`do { old = get(); } while (!compareAndSet(old, newValue(old)));` —— 失败就重读重试',
                ],
                depth:
                  '为什么 CAS 循环必须「重读」而不是「重试同一个旧值」：因为失败说明值已被别人改过，用原来的期望值再试永远不会成功（除非值恰好又被改回来，那就是 ABA）。所以标准写法是 `old = get()` 放在循环体内。这个细节在手写 CAS 代码时最容易错。',
              },
              {
                kind: 'code',
                title: '手写一个 CAS 自旋：从 Unsafe 到 AtomicInteger',
                lang: 'java',
                code:
                  '// 第一层：直接用 Unsafe（了解原理，业务代码不要这么写）\nclass UnsafeCounter {\n    private static final Unsafe U;\n    private static final long OFFSET;      // value 字段在对象内的偏移量\n    private volatile int value;\n\n    static {\n        try {\n            Field f = Unsafe.class.getDeclaredField("theUnsafe");\n            f.setAccessible(true);\n            U = (Unsafe) f.get(null);\n            OFFSET = U.objectFieldOffset(UnsafeCounter.class.getDeclaredField("value"));\n        } catch (Exception e) {\n            throw new Error(e);\n        }\n    }\n\n    int incrementAndGet() {\n        int old;\n        do {\n            old = value;                              // ① 每次循环都重读\n        } while (!U.compareAndSwapInt(this, OFFSET, old, old + 1));  // ② 失败就再来\n        return old + 1;\n    }\n}\n\n// 第二层：AtomicInteger（内部就是上面那套，只是封装好了）\nclass AtomicCounter {\n    private final AtomicInteger v = new AtomicInteger();\n    int inc() { return v.incrementAndGet(); }\n}\n\n// 第三层：VarHandle（JDK 9+，标准 API，无需 Unsafe）\nclass VarHandleCounter {\n    private volatile int value;\n    private static final VarHandle VH;\n    static {\n        try {\n            VH = MethodHandles.lookup()\n                    .findVarHandle(VarHandleCounter.class, "value", int.class);\n        } catch (ReflectiveOperationException e) {\n            throw new Error(e);\n        }\n    }\n    int incrementAndGet() {\n        int old;\n        do {\n            old = (int) VH.getVolatile(this);\n        } while (!VH.compareAndSet(this, old, old + 1));\n        return old + 1;\n    }\n}',
                caption:
                  '三层的递进关系就是「封装程度」：Unsafe 要自己算字段偏移（`objectFieldOffset`）、反射拿实例，且 JDK 9+ 会警告；`AtomicInteger` 一行搞定；`VarHandle` 是官方推荐的标准替代。**手写这题的价值**是让你明白：`AtomicInteger` 并没有什么魔法，就是「volatile 字段 + 字段偏移 + CAS 循环」。',
                notes: [
                  { line: 'old = value;', text: '必须在循环体内重读。写在循环外会导致「期望值永远是旧的」，一旦失败就无限失败。' },
                  { line: 'U.compareAndSwapInt(this, OFFSET, old, old + 1)', text: '四个参数：目标对象、字段偏移、期望值、新值。返回 boolean。' },
                  { line: 'VH.compareAndSet(this, old, old + 1)', text: '`VarHandle` 的签名更友好（无偏移量），且提供 `getVolatile` / `compareAndExchange` 等更细粒度的内存语义选择。' },
                ],
              },
              {
                kind: 'question',
                title: 'CAS 存在哪些问题？如何解决？',
                questionId: 'java-03-Q28',
                intent:
                  '必须说全三个（ABA、自旋开销、单变量），每个都要给出解法。ABA 是必答项。',
                points: [
                  '**① ABA 问题**：值从 A→B→A，CAS 检查时看到还是 A 就成功，但中间状态被忽略了（如链表节点被摘除又重新挂上）',
                  'ABA 解法：加版本号 → `AtomicStampedReference`（`int` 戳）或 `AtomicMarkedReference`（`boolean` 标记）',
                  '**② 自旋开销**：高竞争下大量 CAS 失败，循环空转烧 CPU；还可能引发「总线风暴」（大量 `lock` 前缀争抢缓存行）',
                  '自旋解法：限制自旋次数（AQS 里 `tryAcquire` 失败就入队阻塞）、或用 `LongAdder` 分散热点、或直接改用锁',
                  '**③ 只能保证单个变量**：无法用一次 CAS 原子更新「两个字段」',
                  '单变量解法：把多字段打包成一个不可变对象，用 `AtomicReference` 整体替换（CAS 引用）；或直接加锁',
                ],
                depth:
                  'ABA 在什么场景才真的有害：如果只是「计数」，ABA 完全无害（A→B→A 之后再加一，结果一样）。真正有害的是**依赖「中间没人动过」这一假设**的场景——典型是链表/栈的 `pop`：T1 读到栈顶 A（`A.next = B`），T2 把 A、B 都弹出又重新压入 A，T1 的 CAS 成功，但此时 `A.next` 已经是 null，于是栈结构被破坏。**判断标准：如果业务不关心中间状态，ABA 可以忽略。**',
                followup: '「`AtomicStampedReference` 有什么缺点」——它把「值 + 版本」打包成一个 `Pair` 对象，**每次 CAS 都要创建新对象**，GC 压力大，且版本号会回绕（int 溢出）。所以高并发下它也没那么理想，很多场景改用「避免依赖中间状态」的设计（如 `ConcurrentLinkedQueue` 用「逻辑删除 + 哨兵节点」绕开 ABA）。',
              },
              {
                kind: 'diagram',
                title: 'ABA 是怎么骗过 CAS 的',
                diagram: {
                  type: 'sequence',
                  actors: ['线程 T1', '内存中的栈', '线程 T2'],
                  messages: [
                    { from: '线程 T1', to: '内存中的栈', text: '读栈顶 = A（准备 pop A）' },
                    { from: '内存中的栈', to: '线程 T1', text: 'A（A.next = B）', reply: true },
                    { from: '线程 T2', to: '内存中的栈', text: 'pop A、pop B' },
                    { from: '线程 T2', to: '内存中的栈', text: '再把 A push 回去（此时 A.next = null）' },
                    { from: '线程 T1', to: '内存中的栈', text: 'CAS(栈顶, A, B) —— 栈顶确实是 A，成功！' },
                    { from: '内存中的栈', to: '线程 T1', text: '栈变成「B，而 A.next 已是 null」→ 结构损坏', reply: true },
                  ],
                  caption:
                    'ABA 的本质是「**CAS 只校验值，不校验历史**」。T1 的假设是「栈顶还是 A，说明没人动过」，但 T2 动过又还原了。修法就是给「值」附上「历史」——版本号。注意图中 `A.next` 从 `B` 变成 `null` 是关键：值没变，但**关联的结构变了**，这才是真正被破坏的东西。',
                },
              },
              {
                kind: 'question',
                title: 'AtomicInteger 的实现原理？incrementAndGet 为什么是线程安全的？',
                questionId: 'java-03-Q29',
                intent:
                  '要能落到源码：`volatile int value` + `Unsafe` + 自旋 CAS。答「用了 CAS」不够，要说清 volatile 字段的作用。',
                points: [
                  '核心字段：`private volatile int value;` —— `volatile` 保证读可见与禁止重排',
                  '`incrementAndGet()` 的实现：`return U.getAndAddInt(this, VALUE, 1) + 1;`（JDK 8）',
                  '`getAndAddInt` 是自旋：`do { v = getIntVolatile(o, offset); } while (!compareAndSwapInt(o, offset, v, v + delta)); return v;`',
                  '线程安全来自两点：**volatile 读保证拿到最新值** + **CAS 保证「比较并写入」原子**',
                  '失败重试：CAS 失败说明被别人改过，重新读最新值再试，所以不会丢更新',
                  '`getAndIncrement` 与 `incrementAndGet` 只差「返回旧值还是新值」；`lazySet` 是「最终可见」的弱化写（省一个屏障）',
                ],
                depth:
                  '为什么必须有 `volatile`：如果 `value` 是普通字段，`getIntVolatile` 读到的可能是寄存器里的旧值，CAS 会一直失败（期望值永远过期）；而且即使 CAS 成功，其他线程也可能永远看不到新值。**volatile 提供「读最新 + 写可见」，CAS 提供「原子」，两者缺一不可**——这就是「无锁 = volatile + CAS」的由来。',
              },
              {
                kind: 'question',
                title: 'LongAdder 为什么比 AtomicLong 快？sum() 是精确值吗？',
                questionId: 'java-03-Q30',
                intent:
                  '性能设计题。核心是「分散热点」：把对一个变量的竞争，分散到多个 Cell 上。第二问要明确回答「不是精确值」。',
                points: [
                  '`AtomicLong` 的问题：所有线程 CAS 同一个 `volatile long value`，高并发下大量失败重试 + 同一缓存行反复失效（热点）',
                  '`LongAdder` 的思路：维护一个 `Cell[]` 数组，每个线程通过 `Thread.hashCode` 的探针（probe）映射到**不同的 Cell**，各加各的',
                  '只有在需要总数时（`sum()`）才把 base + 所有 Cell 累加，把「写竞争」换成了「读汇总」',
                  '扩容：Cell 数量随竞争增长（最多到 CPU 核数量级），像 `ConcurrentHashMap` 的分段思想',
                  '`sum()` **不是精确值**：遍历 Cell 的过程中其他线程可能正在累加，得到的是「准快照」，并发下通常偏小',
                  '适合「高频写、低频读汇总」的统计场景（QPS 计数、指标采集）；不适合做序列号、余额等要求精确的场合',
                  '`LongAdder` 还有 `sumThenReset()`，以及针对低延迟的 `LongAccumulator`（自定义聚合函数）',
                ],
                depth:
                  '「为什么 Cell 要填充（padding）」——`Cell` 继承自 `Striped64` 的内部类，用 `@Contended` 注解（或手动补 7 个 long）把每个 Cell 撑到独立的缓存行（64 字节）。否则多个 Cell 落在同一缓存行上，一个线程写会让其他核的整行失效，竞争又回来了——这就是**伪共享**。JDK 8 里 `@Contended` 需要 `-XX:-RestrictContended` 才生效。',
                followup: '「什么时候 `LongAdder` 反而不如 `AtomicLong`」——**低竞争**时。`LongAdder` 要维护 Cell 数组、要算 probe、`sum()` 要遍历，固定开销更大。单线程或低竞争下 `AtomicLong` 更简单更快。选型判据：先问「写并发高不高」，再问「读要不要精确」。',
              },
              {
                kind: 'diagram',
                title: '热点分散：一个变量 vs 多个 Cell',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'AtomicLong',
                      note: '所有线程打同一格',
                      slots: [
                        { label: 'value', value: 'long（volatile）', tone: 'bad' },
                        { label: '线程 1..N', value: '全部 CAS 这一格', tone: 'bad' },
                      ],
                    },
                    {
                      name: 'LongAdder',
                      note: '按 probe 分散到 Cell',
                      slots: [
                        { label: 'base', value: '无竞争时的快路径', tone: 'muted' },
                        { label: 'Cell[0]', value: '线程 3 的累加', tone: 'primary' },
                        { label: 'Cell[1]', value: '线程 7 的累加', tone: 'primary' },
                        { label: 'Cell[2]', value: '线程 11 的累加', tone: 'primary' },
                        { label: '…padding', value: '每格独占一个缓存行', tone: 'warn' },
                      ],
                    },
                  ],
                  caption:
                    '对比一眼就看懂：左边是「N 个线程抢一个缓存行」，右边是「N 个线程各占一行」。`sum()` 时才把 `base + Cell[0] + Cell[1] + …` 加起来。**代价**是「读不精确 + 内存占用更大 + 低竞争时固定开销更高**」——这是一个典型的「用一致性换吞吐」的取舍。',
                },
              },
              {
                kind: 'question',
                title: '乐观锁和悲观锁的区别？乐观锁在数据库中怎么实现？',
                questionId: 'java-03-Q31',
                intent:
                  '概念 + 落地两问。重点是「乐观锁不是一种锁」这个澄清，以及数据库版本号/时间戳的具体写法。',
                points: [
                  '**悲观锁**：假设一定有并发冲突，操作前先加锁 → `synchronized`、`ReentrantLock`、DB 的 `SELECT ... FOR UPDATE`',
                  '**乐观锁**：假设冲突很少，先操作，提交时用 CAS 校验「期间没被改过」→ `Atomic*`、DB 的版本号',
                  '澄清：**乐观锁不是一种锁实现**，它是一种「无锁 + 冲突检测 + 重试」的策略',
                  '数据库实现一（版本号）：`UPDATE t SET stock = stock - 1, version = version + 1 WHERE id = ? AND version = ?;` 判断影响行数是否为 1',
                  '数据库实现二（时间戳）：与版本号同理，用 `update_time` 做校验',
                  '数据库实现三（条件更新）：`UPDATE t SET stock = stock - 1 WHERE id = ? AND stock >= 1;` —— 用业务条件代替版本号，最简洁',
                  '选型：读多写少 → 乐观锁；写多冲突频繁 → 悲观锁（乐观锁会大量失败重试）',
                ],
                depth:
                  '「`stock >= 1` 这种写法算不算乐观锁」——严格讲它是「乐观锁思想的条件更新」，不需要额外版本字段，也天然幂等安全。但它只能防「超卖」，防不了「ABA 式的业务覆盖」（比如两个管理员同时改价格）。所以**业务条件校验 + 版本号**往往要一起用：前者防超卖，后者防覆盖。',
                followup: '「乐观锁重试几次合适」——必须有上限（如 3 次），否则高冲突下会变成无限重试的活锁。超过上限就该降级为「加锁」或「排队」，这也说明**乐观锁不适合写热点**。',
              },
              {
                kind: 'analogy',
                title: 'CAS 像抢车位：看一眼空着就直接停进去',
                text:
                  '停车场里有一个空位，但**没有管理员**（没有锁）。你要停进去，流程是：**看一眼**——空着；**立刻倒车进去**——如果这期间没人抢，成功；如果被人抢先了，你只能**退出来、再看一眼别的空位**（重试）。这就是 CAS：**「检查」和「占用」是一个动作**，靠的是你亲眼确认 + 车已经在动。悲观锁则像**先去岗亭领一张停车凭证**，领到了才能停，领不到就排队等——稳妥，但要跑一趟岗亭。',
                mapping: [
                  { real: '那个空车位', tech: '内存位置 V' },
                  { real: '你看到「空着」', tech: '期望值 A' },
                  { real: '把车停进去', tech: '新值 B' },
                  { real: '「看一眼 + 倒进去」一气呵成', tech: 'CAS 的原子性（CPU 指令）' },
                  { real: '发现被抢，退出来重找', tech: 'CAS 失败 → 自旋重试' },
                  { real: '先去岗亭领凭证', tech: '悲观锁：抢锁后再操作' },
                  { real: '车位被人停了又开走，你以为没人来过', tech: 'ABA 问题' },
                  { real: '加个「停车时间戳」', tech: '版本号（`AtomicStampedReference`）' },
                ],
                limit:
                  '类比到「多车位一起占用」就失效了：你想同时占两个相邻车位（多变量原子更新），CAS 做不到——因为它只能校验**一个**地址的值。这正是 CAS 的第三大缺陷，解法是把两个车位「打包成一个大车位」（封装成不可变对象用 `AtomicReference` 整体替换），或者干脆请个管理员（加锁）。',
              },
              {
                kind: 'principle',
                title: '无锁编程的三条铁律',
                body: [
                  '这一节把 volatile 与 CAS 讲完了，最后收成三条可以直接用在代码里的判断规则。无锁代码之所以难写，是因为它把「正确性」押在了很少的几条约束上，一旦破一条就全错。',
                ],
                steps: [
                  {
                    title: '① 共享变量必须 volatile（或由 VarHandle 做 volatile 访问）',
                    detail:
                      '没有 volatile，读可能来自寄存器（看不到别人的写），写可能延迟生效（别人看不到你的写）。CAS 循环也会因为「期望值永远过期」而无限失败。这是最常见的手写无锁 bug。',
                  },
                  {
                    title: '② 复合操作必须用 CAS 循环包住，且循环内重读',
                    detail:
                      '「读-改-写」三步必须整体重试。写法固定为 `do { old = get(); next = f(old); } while (!compareAndSet(old, next));`——把 `old = get()` 写在循环体内是硬要求。若 `f(old)` 有副作用（如发消息），重试会导致重复执行，此时应改用锁或做幂等。',
                  },
                  {
                    title: '③ 先问「冲突频率」，再决定用不用无锁',
                    detail:
                      '低冲突：无锁明显更优（无系统调用、无阻塞）。高冲突：CAS 大量失败、空转烧 CPU、缓存行弹跳，性能可能远低于 `synchronized`。判断依据是「同一变量的并发写线程数」——超过核数就该考虑 `LongAdder` 或直接加锁。',
                  },
                  {
                    title: '④ 记住无锁解决不了「多变量一致性」',
                    detail:
                      '这是 CAS 的天花板。要么把多变量打包成不可变对象整体替换（读方看到的总是一致快照），要么老实加锁。任何「用多个 CAS 分别更新多个字段」的方案都不是原子的——中间状态会被别人看到。',
                  },
                ],
                takeaway:
                  '一句话收口：**「无锁」是「用重试换阻塞」，不是「免费的性能」。** 判断能不能用，只需三问：共享变量 volatile 了吗？操作能不能写成 CAS 循环？冲突率高不高？三问都过，再用无锁；有一个不过，就用锁——锁不是失败，是更稳的选择。',
              },
            ],
            outline: [
              'volatile 两层语义：可见性（强制访存）+ 有序性（四种屏障），不保证原子性也不保证互斥',
              'i++ 三步读-改-写，volatile 修不好；用 AtomicInteger / 锁 / LongAdder',
              '修饰对象引用只保证引用可见，不保证内部字段；安全发布用「不可变对象 + volatile 引用」',
              'CAS 三要素（V/A/B）由 CPU 指令保证原子；三大缺陷：ABA、自旋开销、只能单变量',
              'AtomicInteger = volatile 字段 + 字段偏移 + CAS 自旋；LongAdder 用 Cell 分散热点，sum 不精确',
            ],
            pitfalls: [
              '用 volatile 修饰计数器去修 i++：三步仍会交错，必须换原子类或锁',
              '认为 volatile 修饰 Map 引用就线程安全：put 不是 volatile 写，内部字段不可见',
              '高竞争场景仍用 AtomicLong：CAS 大量失败空转，应换 LongAdder 或直接加锁',
            ],
          },
        },
        {
          id: 'aqs',
          title: 'AQS 与显式锁',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['AQS'] }],
          content: {
            intro:
              'AQS 是 JUC 里最值得读的一段源码：一个 `volatile` 的 `state` 加一个 CLH 变体的双向等待队列，就撑起了 `ReentrantLock`、`Semaphore`、`CountDownLatch`、`ReentrantReadWriteLock` 一整套工具。它有 2000 多行，但真正的骨架不超过 200 行——剩下的都是条件队列、超时、中断这些分支。这一节讲清独占与共享两种模式、模板方法的钩子在哪、公平与非公平的差别为什么只体现在「一行 `hasQueuedPredecessors()`」上。读懂它，整个 JUC 就从「一堆要背的类」变成「一套可推导的设计」。',
            sections: [
              {
                kind: 'concept',
                title: 'AQS 的三件套：一个 state、一个队列、一组钩子',
                body: [
                  'AQS（`AbstractQueuedSynchronizer`）的全部设计可以一句话概括：**用一个 `volatile int state` 表示同步状态，用一条双向队列管理抢不到状态的线程，把一个「要不要放行」的判断留给子类实现。** 它自己不做业务判断，只负责「排队、阻塞、唤醒」这套通用流程。',
                  '`state` 的语义由子类定义——这是 AQS 最精妙的地方：`ReentrantLock` 里它是**重入次数**（0 表示空闲）；`Semaphore` 里它是**剩余许可数**；`CountDownLatch` 里它是**还需倒数的计数**；`ReentrantReadWriteLock` 里它被拆成**高 16 位读计数 + 低 16 位写计数**。同一个字段，四种含义，全靠子类解释。',
                  '队列是 **CLH 变体**：原版 CLH 是单向的、只用于自旋；AQS 改成**双向链表 + 显式 `park` 阻塞**，因为 Java 线程阻塞代价高，不能像自旋锁那样靠循环等待。`head` 是哨兵节点（不代表任何等待线程），`tail` 指向最后一个等待者。',
                  '钩子（模板方法）只有四个核心：`tryAcquire` / `tryRelease`（独占）、`tryAcquireShared` / `tryReleaseShared`（共享）。它们**默认抛 `UnsupportedOperationException`**，子类按需实现其中一对——这保证了「你不可能只实现一半就用错模式」。',
                ],
                term: {
                  name: 'AQS（AbstractQueuedSynchronizer）',
                  def: 'JUC 的同步器骨架。维护 volatile int state + 双向 CLH 等待队列，把 tryAcquire/tryRelease（独占）或 tryAcquireShared/tryReleaseShared（共享）留给子类实现，自身负责排队、阻塞（LockSupport.park）、唤醒与中断处理。',
                },
                points: [
                  '`state`：`volatile int`，语义由子类定义（重入次数 / 许可数 / 计数 / 读写拆分）',
                  '队列：双向 CLH 变体，`head` 是哨兵，抢不到就入队并 `park`',
                  '四个钩子：独占一对（`tryAcquire`/`tryRelease`）+ 共享一对（`tryAcquireShared`/`tryReleaseShared`）',
                  '默认抛 `UnsupportedOperationException`，强制子类明确选择模式',
                  '`Condition` 是**另一条**单向队列，与同步队列配合实现「释放锁后等待」',
                ],
              },
              {
                kind: 'diagram',
                title: 'AQS 内部结构：一个状态位 + 两条队列',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '同步状态',
                      note: '语义由子类定义',
                      slots: [
                        { label: 'state', value: 'volatile int', tone: 'primary' },
                        { label: 'ReentrantLock', value: '重入次数', tone: 'muted' },
                        { label: 'Semaphore', value: '剩余许可', tone: 'muted' },
                        { label: 'RWLock', value: '高16位读 + 低16位写', tone: 'muted' },
                      ],
                    },
                    {
                      name: '同步队列（双向 CLH）',
                      note: '抢不到 state 的线程',
                      slots: [
                        { label: 'head', value: '哨兵节点（不等待）', tone: 'warn' },
                        { label: 'node1', value: 'Thread-A（park）', tone: 'primary' },
                        { label: 'node2', value: 'Thread-B（park）', tone: 'primary' },
                        { label: 'tail', value: '指向 node2', tone: 'warn' },
                      ],
                    },
                    {
                      name: '条件队列（单向）',
                      note: 'await 后在这里',
                      slots: [
                        { label: 'firstWaiter', value: 'Thread-C（await）', tone: 'primary' },
                        { label: 'lastWaiter', value: '…', tone: 'muted' },
                      ],
                    },
                  ],
                  caption:
                    '两条队列必须分清：**同步队列**里是「想拿锁但拿不到」的线程（`BLOCKED` 语义，AQS 里其实是 `WAITING`）；**条件队列**里是「主动调用 `await()` 让出锁」的线程。`signal()` 做的事就是「把节点从条件队列搬到同步队列」——这也解释了为什么 `await` 醒来后要重新竞争锁。',
                },
              },
              {
                kind: 'question',
                title: 'AQS 的核心原理是什么？',
                questionId: 'java-03-Q32',
                intent:
                  '这道题必须答出「state + 队列 + 模板方法」三件套，并说清「公平/非公平只差在入队前的判断」。只答「抽象队列同步器」等于没答。',
                points: [
                  '核心：`volatile int state` 表示同步状态 + 双向 CLH 队列管理等待线程 + 模板方法留给子类',
                  '`acquire` 流程：先 `tryAcquire`（子类实现）→ 失败则 `addWaiter` 入队 → `acquireQueued` 中自旋 + `park` 阻塞',
                  '`release` 流程：`tryRelease` 成功 → 唤醒 `head.next` 那个线程（`unpark`）',
                  '唤醒由**前驱节点**负责：每个节点在 `park` 前会检查「前驱是不是 head」，被唤醒后重新尝试获取',
                  '`state` 的语义完全由子类定义，这是 AQS 能复用于锁、信号量、计数器、读写锁的根本',
                  '中断与超时：`acquireInterruptibly` / `tryAcquireNanos` 是在同一流程上加分支，不是另一套实现',
                ],
                depth:
                  '为什么 `head` 是哨兵而不是第一个等待节点：如果 `head` 就是等待线程，那么「释放时唤醒 `head`」就要区分「自己是不是还在等待」；用哨兵可以让逻辑统一为「唤醒 `head.next`」，且 `head` 永远代表「已获得锁、正在执行的节点」。这是链表实现里非常常见的技巧（`ConcurrentLinkedQueue` 也用哨兵）。',
                followup: '「AQS 的队列为什么不用 `synchronized` 保护」——入队出队全靠 **CAS**（`compareAndSetTail`、`compareAndSetHead`）保证原子性，且 `head`/`tail` 都是 `volatile`。用锁保护队列会造成「为了抢锁先抢锁」的递归问题——这就是它必须无锁的原因。',
              },
              {
                kind: 'principle',
                title: 'acquire 走完的六步',
                body: [
                  '把 `acquire(1)` 展开，就是 AQS 独占模式的全貌。共享模式只是在「判断成功」和「唤醒后继」两处不同，骨架完全一致。',
                ],
                steps: [
                  {
                    title: '① `tryAcquire(arg)`：先问子类「能不能给」',
                    detail:
                      '`ReentrantLock` 的实现是：`state == 0` 则 CAS 抢锁并记录持有线程；若当前线程已是持有者则 `state + 1`（重入）。成功返回 true，`acquire` 直接结束——**无竞争时全程不碰队列**。',
                  },
                  {
                    title: '② `addWaiter(Node.EXCLUSIVE)`：抢不到就入队',
                    detail:
                      '用 CAS 把新节点挂到 `tail` 后面（`compareAndSetTail`）。若队列还没初始化，先 CAS 建一个哨兵 `head`。注意：**入队本身也是无锁的**。',
                  },
                  {
                    title: '③ `acquireQueued(node, arg)`：在队列里自旋',
                    detail:
                      '循环里做两件事：如果「前驱是 `head`」就再试一次 `tryAcquire`（此时很可能成功，因为前驱刚释放）；否则把前驱的 `waitStatus` 改成 `SIGNAL` 并 `park` 自己。',
                  },
                  {
                    title: '④ `park` 与 `unpark`：真正的阻塞',
                    detail:
                      '`LockSupport.park()` 让线程进入 `WAITING`。唤醒发生在 `release` 里：`unparkSuccessor(head)` 找到 `head.next` 并 `unpark` 它。**注意是「前驱唤醒后继」，不是「释放者直接抢」**。',
                  },
                  {
                    title: '⑤ 被唤醒后重新竞争',
                    detail:
                      '`park` 返回后循环继续，再判一次「前驱是不是 `head`」。是则 `tryAcquire`——这一步保证了「唤醒后大概率能拿到锁」；若被插队（非公平）则继续 `park`。',
                  },
                  {
                    title: '⑥ 成功后成为新 `head`',
                    detail:
                      '`setHead(node)` 把当前节点设为 `head` 并清空其 `thread` 字段（变成哨兵），原 `head` 被 GC。这一步也解释了「为什么 `head` 永远是持有锁的节点」。',
                  },
                ],
                takeaway:
                  '**「先试一次 → 失败入队 → 前驱是 head 就再试 → 否则 park → 被唤醒再试 → 成功当 head」**，六步就是全部。所有看起来复杂的代码（超时、中断、共享传播）都是在这六步上加分支，不是另一条路。',
              },
              {
                kind: 'diagram',
                title: 'acquire 的四段主干',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: 'tryAcquire', note: '子类实现：CAS 改 state。成功即返回，不碰队列' },
                    { label: 'addWaiter', note: 'CAS 挂到 tail，必要时先建哨兵 head' },
                    { label: 'acquireQueued', note: '自旋：前驱是 head 就再试；否则置 SIGNAL + park' },
                    { label: 'setHead', note: '成功后自己成为新 head（哨兵），原 head 被回收' },
                  ],
                  caption:
                    '四段里只有第一段是子类写的，后三段是 AQS 固化的。这也回答了「AQS 到底抽象了什么」——**它抽象的不是「怎么判断能否获取」，而是「获取失败后怎么排队和唤醒」**。判断逻辑永远在子类的 `tryAcquire` 里。',
                },
              },
              {
                kind: 'question',
                title: 'ReentrantLock 公平锁和非公平锁的实现区别？',
                questionId: 'java-03-Q33',
                intent:
                  '经典对比题。核心答案只有一句：公平锁在 `tryAcquire` 里多一次 `hasQueuedPredecessors()` 检查。但要说清「为什么非公平吞吐更高」。',
                points: [
                  '唯一代码差别：公平锁的 `tryAcquire` 在 CAS 前多判 `!hasQueuedPredecessors()`（队列里没有更早的等待者才允许抢）',
                  '非公平锁**不检查队列**，直接 CAS 抢——`state == 0` 就抢，抢到就走',
                  '非公平的两个「插队点」：① 新线程直接 `tryAcquire`（可能抢在队首之前）；② 被唤醒后重新竞争（可能被新来的线程抢走）',
                  '为什么非公平吞吐更高：**避免「唤醒延迟」造成的空窗**——A 释放锁 → `unpark(B)` → 但 B 从 `WAITING` 恢复要几微秒，这期间锁是空闲的；非公平让「正好在跑的 C」立刻拿走，CPU 不空转',
                  '代价：非公平可能让队列里的线程长时间饥饿（理论上无界，实际上很少）',
                  '公平锁也**不是严格 FIFO**：`tryAcquire` 成功后仍需 CAS，只是「排队更久的人优先」',
                ],
                depth:
                  '「为什么非公平更快」的准确表述：这是在**减少上下文切换**而不是「抢占更高效」。公平锁每次释放都必然唤醒一个阻塞线程（涉及内核调度），而非公平锁经常被「正在运行的线程」直接接手，完全省掉一次 `park/unpark`。所以非公平的收益 = 「省下的线程唤醒次数 × 单次唤醒成本」。这也是为什么 `synchronized` 干脆只做非公平——绝大多数场景并不需要严格 FIFO。',
                followup: '「什么时候必须用公平锁」——「不能让任何请求饿死」的场景，例如按到达顺序处理的任务调度、需要可预测延迟的服务。但要注意公平锁的吞吐通常低一个量级，所以默认都该用非公平。',
              },
              {
                kind: 'code',
                title: '公平与非公平：差别只有三行',
                lang: 'java',
                code:
                  '// 非公平锁的 tryAcquire（NonfairSync）\nfinal boolean nonfairTryAcquire(int acquires) {\n    final Thread current = Thread.currentThread();\n    int c = getState();\n    if (c == 0) {\n        if (compareAndSetState(0, acquires)) {     // ← 直接抢，不看队列\n            setExclusiveOwnerThread(current);\n            return true;\n        }\n    } else if (current == getExclusiveOwnerThread()) {\n        setState(c + acquires);                    // 重入\n        return true;\n    }\n    return false;\n}\n\n// 公平锁的 tryAcquire（FairSync）\nprotected final boolean tryAcquire(int acquires) {\n    final Thread current = Thread.currentThread();\n    int c = getState();\n    if (c == 0) {\n        if (!hasQueuedPredecessors() &&             // ← 就多这一行！\n            compareAndSetState(0, acquires)) {\n            setExclusiveOwnerThread(current);\n            return true;\n        }\n    } else if (current == getExclusiveOwnerThread()) {\n        setState(c + acquires);\n        return true;\n    }\n    return false;\n}\n\n// hasQueuedPredecessors 的实现（就是判断「有没有人在我前面排队」）\npublic final boolean hasQueuedPredecessors() {\n    Node h = head, s = h.next, t = tail;\n    if (h != t && s != null && s.thread != Thread.currentThread())\n        return true;      // 队列非空，且队首不是我\n    return false;\n}',
                caption:
                  '两段代码并排看，差别就是 `!hasQueuedPredecessors() &&` 这一行。这一行让「有排队者时新线程不许抢」，从而实现近似 FIFO。**注意 `s.thread != Thread.currentThread()`**：如果队首就是自己（重入场景），不算「有人在前」。',
                notes: [
                  { line: 'if (!hasQueuedPredecessors() &&', text: '公平的代价就在这里：即使 `state == 0`，只要队列里有人在等，也必须放弃这次机会去排队。' },
                  { line: 'compareAndSetState(0, acquires)', text: '公平锁里这次 CAS 通常不会失败（因为只有符合条件的人才会走到这里），但仍然需要——它承担「原子写 state」的职责。' },
                  { line: 's.thread != Thread.currentThread()', text: '防止「自己排队自己又插队」导致的误判；也让重入路径不受公平性影响。' },
                ],
              },
              {
                kind: 'question',
                title: '独占锁和共享锁的区别？AQS 两种模式怎么体现？',
                questionId: 'java-03-Q34',
                intent:
                  '要能说出「钩子方法不同」「state 语义不同」「唤醒传播方式不同」三点。第三点是关键。',
                points: [
                  '**独占（Exclusive）**：同一时刻只有一个线程能持有 → `ReentrantLock`、`ReentrantReadWriteLock.WriteLock`',
                  '**共享（Shared）**：多个线程可同时持有 → `Semaphore`、`CountDownLatch`、`ReadLock`',
                  '钩子不同：独占实现 `tryAcquire` / `tryRelease`（返回 boolean）；共享实现 `tryAcquireShared` / `tryReleaseShared`（返回 `int`）',
                  '`tryAcquireShared` 的返回值是**三态**：负数=失败、0=成功但后继也无法成功、正数=成功且后继可能也成功',
                  '唤醒传播不同：独占只唤醒 `head.next` 一个；共享在成功后可能**连续唤醒多个后继**（`doReleaseShared` 循环 + `PROPAGATE` 状态）',
                  '节点标记不同：`Node.EXCLUSIVE` vs `Node.SHARED`，共享节点被唤醒后会把「成功」继续向后传播',
                ],
                depth:
                  '`PROPAGATE` 这个 `waitStatus` 是 AQS 里最难懂的一处：它解决的是「共享模式下唤醒丢失」的竞态——当 `releaseShared` 与 `acquireShared` 并发时，可能出现「A 释放了、B 也释放了，但 C 没被唤醒」。`PROPAGATE` 让「释放」这件事被多传播一轮，保证不丢。这个 bug 在 JDK 6 修过（Doug Lea 的 `doReleaseShared`），面试里能提到 `PROPAGATE` 基本就是读源码的水平了。',
                followup: '「`Semaphore(1)` 和非公平 `ReentrantLock` 像吗」——很像（都只放一个线程），但有本质差别：`Semaphore` 不记录持有者，所以**任何线程都能 `release`**（甚至没 `acquire` 过也行），而 `ReentrantLock` 只能由持有者释放。这个差别导致 `Semaphore` 不能用于「互斥 + 可重入」，但可以用于「跨线程的信号传递」。',
              },
              {
                kind: 'diagram',
                title: '两种模式的对照',
                diagram: {
                  type: 'matrix',
                  cols: ['共享模式的对应物', '返回值语义', '唤醒方式'],
                  rows: [
                    ['`tryAcquire`', '`tryAcquireShared`', '`int`：负=失败，0=成功但无余量，正=成功有余量', '独占：只唤醒 `head.next`'],
                    ['`tryRelease`', '`tryReleaseShared`', '`boolean`', '共享：`doReleaseShared` 循环传播'],
                    ['`state` = 重入次数', '`state` = 许可 / 计数', '由子类解释', '共享需处理 `PROPAGATE` 防唤醒丢失'],
                    ['`Node.EXCLUSIVE`', '`Node.SHARED`', '区分节点类型', '被唤醒后继续向后传播'],
                  ],
                  caption:
                    '阅读顺序：把「独占」那一列当成基准，共享列是它的「多值版本」。最值得注意的是 `tryAcquireShared` 返回 `int` 而不是 `boolean`——**它需要表达「我成功了，后面的人能不能也成功」**，这是传播唤醒的依据，也是独占模式不需要的东西。',
                  note: '典型实现：`Semaphore` 的 `tryAcquireShared` 返回 `remaining`（剩余许可），`CountDownLatch` 返回 `state == 0 ? 1 : -1`。',
                },
              },
              {
                kind: 'question',
                title: 'LockSupport 的 park/unpark 和 wait/notify 有什么区别？',
                questionId: 'java-03-Q38',
                intent:
                  '这题是理解 AQS 的前置知识。核心差别是「以线程为对象」「不需要监视器」「允许先 unpark」。',
                points: [
                  '**对象不同**：`wait/notify` 以**对象监视器**为操作单元（必须持有锁）；`park/unpark` 以**线程**为操作单元',
                  '**是否需要锁**：`wait/notify` 必须在 `synchronized` 块内（否则 `IllegalMonitorStateException`）；`park/unpark` 不需要任何锁',
                  '**顺序**：`wait` 必须在 `notify` **之前**调用，否则丢失信号；`park/unpark` **允许先 `unpark` 再 `park`**（许可计数，最多累积 1 个）',
                  '**唤醒精确性**：`notify` 随机唤醒一个同监视器上的等待者；`unpark(t)` 精确唤醒指定线程',
                  '**虚假唤醒**：`wait` 有虚假唤醒问题（必须 `while` 循环）；`park` 也可能「无故返回」，所以 AQS 里也是循环判断',
                  '**中断**：两者都响应中断，`park` 返回后需自己检查 `Thread.interrupted()`；`wait` 直接抛 `InterruptedException`',
                ],
                depth:
                  '「许可（permit）机制」是关键设计：`unpark` 会给线程发一个许可（最多存 1 个），`park` 会消耗许可。所以「先 `unpark` 后 `park`」不会阻塞——这解决了 `wait/notify` 的经典「信号丢失」问题。AQS 正是靠这个特性把「入队」与「唤醒」解耦：入队前被别人 `unpark` 也没关系，许可会留着。',
              },
              {
                kind: 'compare',
                title: 'park/unpark vs wait/notify',
                head: ['维度', '`LockSupport.park/unpark`', '`Object.wait/notify`'],
                rows: [
                  ['操作单元', '线程（`Thread`）', '对象监视器（`Object`）'],
                  ['是否必须持锁', '不需要', '**必须**在 `synchronized` 内'],
                  ['先唤醒后等待', '**支持**（许可计数）', '不支持，信号丢失'],
                  ['唤醒精度', '精确指定线程', '`notify` 随机一个，`notifyAll` 全部'],
                  ['释放锁', '不涉及锁', '`wait` 释放锁'],
                  ['虚假唤醒', '可能（需循环）', '可能（需循环）'],
                  ['中断响应', '`park` 返回，需自查标志', '抛 `InterruptedException`'],
                  ['典型使用者', 'AQS、`LockSupport` 家族', '`synchronized` + 内置条件队列'],
                ],
                note:
                  '「允许先 `unpark` 后 `park`」这一行，是 AQS 能安全工作的基础之一——它让「唤醒」这个动作不必与「等待」严格配对，大幅简化了并发时序的推理。',
              },
              {
                kind: 'question',
                title: 'Condition 的作用和原理？与 wait/notify 相比好在哪？',
                questionId: 'java-03-Q35',
                intent:
                  '核心卖点是「一个锁可以有多个条件队列 → 精确唤醒」。原理层面要说出「条件队列 + 转移到同步队列」这个动作。',
                points: [
                  '作用：在 `Lock` 之上提供「等待/通知」，一个 `Lock` 可以 `newCondition()` 出**多个**条件队列',
                  '原理：`await()` 做三件事——把当前线程包成节点加入**条件队列**、**完全释放锁**（记住重入次数）、`park` 自己',
                  '`signal()` 做一件事：把条件队列的**队首节点搬到同步队列**（`transferForSignal`），**并不立即唤醒**——被搬的线程仍要竞争锁',
                  '`signalAll()` 搬全部。所以「被 signal 后并不等于立刻能跑」，只是「有资格去抢锁了」',
                  '相比 `wait/notify` 的优势一：**多条件队列**，生产者消费者可分别 `notFull.signal()` / `notEmpty.signal()`，避免无效唤醒',
                  '优势二：`await` 支持超时（`awaitNanos`）与不可中断（`awaitUninterruptibly`）；优势三：`Condition` 是接口，可实现自定义语义',
                  '约束：与 `wait` 一样，`await/signal` 必须在持有对应锁时调用，否则 `IllegalMonitorStateException`',
                ],
                depth:
                  '「为什么被 `signal` 的线程不直接恢复运行」——因为它还要重新持有锁。`signal` 只是「从休息室叫回候诊区」，真正进门还得排队拿钥匙。这也是为什么 `await` 醒来后必须**重新检查条件**（`while (!condition) await();`）：在它排队等锁的这段时间里，条件可能又被别人改回去了。',
                followup: '「`ArrayBlockingQueue` 怎么用它」——用 `notEmpty` 和 `notFull` 两个条件：`take()` 时 `while (count == 0) notEmpty.await();`，`enqueue` 后 `notEmpty.signal()`；`put()` 时 `while (count == items.length) notFull.await();`，`dequeue` 后 `notFull.signal()`。这就实现了「精确唤醒对端」，比 `notifyAll` 少一半无效唤醒。',
              },
              {
                kind: 'diagram',
                title: 'await 与 signal：两条队列之间的搬迁',
                diagram: {
                  type: 'sequence',
                  actors: ['业务线程', 'Condition', '条件队列', '同步队列'],
                  messages: [
                    { from: '业务线程', to: 'Condition', text: 'await()（前提：已持有锁）' },
                    { from: 'Condition', to: '条件队列', text: '① 包装成 Node 加入队尾' },
                    { from: 'Condition', to: '业务线程', text: '② 完全释放锁（保存重入次数）', reply: true },
                    { from: '业务线程', to: '业务线程', text: '③ park 自己，进入 WAITING' },
                    { from: '业务线程', to: 'Condition', text: '（另一线程）signal()' },
                    { from: 'Condition', to: '同步队列', text: '④ transferForSignal：队首节点搬过去' },
                    { from: '同步队列', to: '业务线程', text: '⑤ 重新竞争锁，拿到后 await 才返回', reply: true },
                  ],
                  caption:
                    '关键在 ④ 与 ⑤ 之间：`signal` **只搬家，不唤醒执行**。被搬的线程从「条件队列」到了「同步队列」，状态从 `WAITING` 变成「要抢锁」——也就是说，`signal` 之后它还得跟新来的线程一起竞争。**这就是为什么 `await` 必须写在 `while` 循环里。**',
                },
              },
              {
                kind: 'question',
                title: 'ReentrantReadWriteLock 了解吗？持读锁还能再拿写锁吗？',
                questionId: 'java-03-Q36',
                intent:
                  '两个考点：一是「读写锁的价值与适用条件」，二是「锁升级不支持、锁降级支持」这个反直觉结论。第二问是主要区分点。',
                points: [
                  '价值：读读**共享**、读写**互斥**、写写**互斥**——适合「读多写少」，把读的并发度提上来',
                  '`state` 一拆为二：**高 16 位是读锁持有数**，**低 16 位是写锁重入数**（所以最多 65535 个读锁）',
                  '**持读锁不能再拿写锁（锁升级不支持）**——两个读线程都试图升级会**互相等待对方释放读锁 → 死锁**，所以直接禁止',
                  '**持写锁可以再拿读锁（锁降级支持）**：写锁持有者可以获取读锁，再释放写锁，从而「平滑」地交出写权限同时保留读权限',
                  '锁降级的典型用途：写完后还要读一遍结果（如缓存更新后返回新值），避免「释放写锁→别人改了→你读到别人的值」',
                  '注意：读写锁的「读」也不一定能并发——`FairSync` 下若队列里有等待的写线程，新读请求会被阻塞（防写饥饿）',
                  '非公平模式下写锁可以「插队」，所以读多写少时仍可能出现写饥饿；JDK 8 用 `StampedLock` 缓解了这个问题',
                ],
                depth:
                  '「锁降级为什么是安全的」：因为它不涉及「等待别人释放」——写锁持有者本来就独占，它再拿读锁不会与任何人冲突；之后释放写锁，别人想拿写锁仍要等它释放读锁。整个过程是「单向让权」，不会形成环。而锁升级是「两个持有者互相等待」，必然成环 → 死锁。**判断是否死锁的标准永远是「等待关系有没有环」。**',
                followup: '「读锁里能修改共享变量吗」——不能。读锁是共享的，多个线程同时持有，任何写操作都会破坏互斥假设。这个错误很常见：以为「我拿了锁就能改」，忽略了读锁本质是「只读契约」。',
              },
              {
                kind: 'diagram',
                title: '一个 int 塞下两把锁',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'AQS state（32 bit）',
                      note: '高低位各管一把',
                      slots: [
                        { label: '高 16 位', value: '读锁持有数（含重入）', tone: 'primary' },
                        { label: '低 16 位', value: '写锁重入数', tone: 'warn' },
                      ],
                    },
                    {
                      name: '位运算',
                      note: 'SHARED_SHIFT = 16',
                      slots: [
                        { label: '取读计数', value: 'c >>> 16', tone: 'muted' },
                        { label: '取写计数', value: 'c & 0xFFFF', tone: 'muted' },
                        { label: '读 +1', value: 'c + (1 << 16)', tone: 'muted' },
                        { label: '最大值', value: '读 65535 / 写 65535', tone: 'bad' },
                      ],
                    },
                  ],
                  caption:
                    '这个设计很值得学：**用位运算在一个 `int` 里塞两个计数**，既省内存又保证「读 state 一次就拿到两把锁的状态」（原子快照）。代价是各自只能到 65535——这也是「读写锁不能无限重入」的原因。',
                },
              },
              {
                kind: 'question',
                title: 'StampedLock 是什么？为什么性能更好？',
                questionId: 'java-03-Q37',
                intent:
                  'JDK 8 的新东西，考「三种模式 + 乐观读」。要强调「乐观读不加锁、需要校验」，以及「不可重入、不支持 Condition」这两个限制。',
                points: [
                  'JDK 8 引入，不是 `Lock` 的实现（不实现 `Lock`/`ReadWriteLock` 接口），提供三种模式：**写锁、悲观读锁、乐观读**',
                  '核心创新是**乐观读**：`tryOptimisticRead()` 只返回一个 stamp（版本号），**不加任何锁**；读完后用 `validate(stamp)` 校验「期间有没有人写过」',
                  '性能更好的原因：乐观读完全无 CAS、无 volatile 写、不修改 state，纯读路径几乎零开销；适合「读极多、写极少」',
                  '写锁与悲观读锁本身也比 `ReentrantReadWriteLock` 快（内部用类似 CLH 的队列 + 更少的 CAS）',
                  '**限制一：不可重入**——同一线程重复获取会死锁',
                  '**限制二：不支持 `Condition`**，也不支持中断（`readLockInterruptibly` 之外）',
                  '**限制三：乐观读不是锁**——校验失败必须退回悲观读重试，且被读的数据必须用 `volatile` 或保证不撕裂',
                ],
                depth:
                  '「乐观读为什么能保证一致性」：`validate(stamp)` 校验的是「stamp 有没有变」，而 stamp 在**任何写操作开始与结束时都会变**（奇偶位表示是否正在写）。所以「读前后 stamp 一致」意味着「这期间没有写完成过」。但注意：它**不阻止正在进行的写**——读的过程中可能有写者在改，所以读到的值可能是「撕裂的」，因此必须靠 `validate` 重试来兜底。这就是「乐观」的含义：先赌没人写，赌输了重来。',
                followup: '「什么时候不该用 StampedLock」——需要重入、需要 `Condition`、或者读操作本身很慢（乐观读失败率高，反而更慢）。JDK 官方注释明确说它是「内部工具类风格的 API」，用错了很难排查。',
              },
              {
                kind: 'analogy',
                title: 'AQS 像银行的排号机 + 唯一柜台',
                text:
                  '银行只有一个柜台（`state`），门口有一台**排号机**（同步队列）。你进来先看柜台空不空（`tryAcquire`）：空着就直接办（`state` 改成 1）；有人就**取号排队**（`addWaiter`），然后在等候区**坐着等叫号**（`park`）。柜台里的人办完事，会**叫下一位**（`release` → `unpark(head.next)`）。被叫到的人走到柜台前，**还要再确认一次柜台真的空着**（被唤醒后重新 `tryAcquire`）——因为可能有人插队（非公平锁）。',
                mapping: [
                  { real: '唯一的柜台', tech: '`state`（独占模式下 0 = 空闲）' },
                  { real: '柜台正在服务的人', tech: '`exclusiveOwnerThread`' },
                  { real: '排号机取的号', tech: 'CLH 队列节点（`Node`）' },
                  { real: '等候区坐着等叫号', tech: '`LockSupport.park()`，状态 `WAITING`' },
                  { real: '办完叫下一位', tech: '`release` → `unparkSuccessor(head)`' },
                  { real: '被叫到还要确认柜台空着', tech: '被唤醒后重新 `tryAcquire`' },
                  { real: 'VIP 客户直接走到柜台（不看队伍）', tech: '非公平锁不检查 `hasQueuedPredecessors()`' },
                  { real: '同一个人回头再办一件事', tech: '可重入：`state + 1`' },
                ],
                limit:
                  '类比到「共享模式」就不成立了：银行柜台永远只服务一个人（独占），而 `Semaphore`、`CountDownLatch` 是「一次能服务多个」或「攒够人数才开门」。要类比的话，共享模式更像「**有 N 个座位的餐厅**」（`state` = 剩余座位）或「**凑够 10 人发车的小巴**」（`CountDownLatch`）。',
              },
              {
                kind: 'principle',
                title: '读懂 AQS 的三把钥匙',
                body: [
                  'AQS 源码 2000 多行，但只要能抓住三个「它到底在解决什么问题」，剩下都是细节。这三把钥匙也能直接用来回答任何 AQS 相关追问。',
                ],
                steps: [
                  {
                    title: '第一把：`state` 是「可被原子修改的一个整数」，语义由子类定义',
                    detail:
                      '看到任何 AQS 子类，第一件事就是问「它的 `state` 代表什么」。`ReentrantLock` = 重入次数，`Semaphore` = 许可，`CountDownLatch` = 剩余计数，`RWLock` = 高低位拆分。理解了这个，`tryAcquire` 的代码就自然能读懂。',
                  },
                  {
                    title: '第二把：队列只解决「排队 + 阻塞 + 唤醒」，不管业务判断',
                    detail:
                      'AQS 从不说「你能不能拿锁」，它只说「拿不到就排队等着，有人释放我就叫你」。业务判断全在 `tryAcquire`。所以 AQS 可以被复用到锁、信号量、计数器、栅栏——因为它们共享「排队」这个需求，只在「什么算成功」上不同。',
                  },
                  {
                    title: '第三把：公平与非公平只差「入队前是否检查队列」',
                    detail:
                      '一行 `hasQueuedPredecessors()` 决定了公平性。它带来的是「严格程度 vs 吞吐」的取舍：公平必然多一次线程唤醒（贵），非公平允许插队所以更快但有饥饿风险。这也解释了为什么 `synchronized` 干脆只做非公平。',
                  },
                ],
                takeaway:
                  '一句话收口：**AQS = 一个可原子改的整数（state）+ 一条排队链表 + 两个钩子（tryAcquire/tryRelease）。** 面试被问 AQS，先讲这三件，再挑一个子类（`ReentrantLock` 最好）展开 `acquire` 流程，最后补一句公平性的差别——这个结构足够撑满五分钟。',
              },
            ],
            outline: [
              'AQS = volatile int state + 双向 CLH 队列 + 四个钩子（独占/共享各一对）',
              'acquire 六步：tryAcquire → addWaiter → acquireQueued 自旋 → park → 被唤醒重试 → setHead',
              '公平与非公平只差 hasQueuedPredecessors；共享模式靠 PROPAGATE 防止唤醒丢失',
              'Condition 是另一条条件队列，signal 只是把节点搬到同步队列，仍要重新抢锁',
              '读写锁 state 高低 16 位拆分；支持锁降级（写→读），不支持锁升级（读→写会死锁）',
            ],
            pitfalls: [
              '把 AQS 说成「抽象队列同步器」就结束：必须讲出 state 语义 + 队列作用 + 模板方法',
              '以为 signal 后线程立刻恢复：它只是从条件队列搬到同步队列，还要重新竞争锁',
              '读写锁里持读锁去申请写锁：两个读线程互相等待，直接死锁',
            ],
          },
        },
      ],
    },
    {
      id: 'executors',
      title: 'C · 线程池与并发工具',
      goal: '把「怎么管理线程」和「怎么协调线程」两件事落地',
      summary:
        '线程池是工程里最容易配错也最容易出事故的组件：无界队列掩盖了过载，核心线程数与任务类型不匹配导致吞吐上不去。这一阶段先讲线程池的七参数与执行流程，再讲 ThreadLocal 与 JUC 工具类，最后收在死锁与并发设计题上。',
      lessons: [
        {
          id: 'threadpool',
          title: '线程池七参数与执行流程',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['线程池'] }],
          content: {
            intro:
              '线程池几乎必问，而且必追问参数。真正要掌握的不是七个参数的名字，而是**任务提交后的判定顺序**：核心线程未满就新建 → 否则入队 → 入队失败才扩到最大线程 → 再满才走拒绝策略。理解这个顺序，你就能解释「为什么用了无界队列，`maximumPoolSize` 等于失效」，也就能回答线上 OOM 到底是怎么来的。这一节还会讲清 `execute` 与 `submit` 的异常差异（这是最容易踩的坑：任务抛异常但日志里什么都没有）、`shutdown` 与 `shutdownNow` 的取舍、以及线程复用的真实机制。最后给出一套可以照着算的参数估算方法，而不是背「N+1」这一句。',
            sections: [
              {
                kind: 'concept',
                title: '线程池解决的三件事',
                body: [
                  '**① 复用线程，摊薄创建成本。** 每 `new Thread()` 都要向操作系统申请内核线程（约 1MB 栈 + 内核结构），创建与销毁都有系统调用开销。线程池把「线程生命周期」与「任务生命周期」解耦，一个线程可以执行成千上万个任务。',
                  '**② 限制并发数，保护下游。** 没有池的代码在突发流量下会无限创建线程，直到 `OutOfMemoryError: unable to create native thread`。线程池用「核心数 + 队列 + 最大值」三个闸门，把并发压在一个可控范围里——**这才是线程池最重要的价值**，而不是「省资源」。',
                  '**③ 统一管理生命周期与可观测性。** 池化之后才有地方统计「活跃线程数、队列长度、完成任务数」，才能做优雅关闭、拒绝策略、异常上报。裸线程这些都没有。',
                  '一个常见误解要纠正：**线程池不是越大越好**。线程数超过 CPU 核数后，增加线程只会增加上下文切换与内存占用；除非这些线程大量处于阻塞（IO 等待），否则吞吐不会提升。所以「线程池参数」本质是在「吞吐」与「稳定性」之间找平衡点。',
                ],
                term: {
                  name: '线程池（ThreadPoolExecutor）',
                  def: '把预先创建或按需创建的线程集中管理，通过一个工作队列接收任务，用核心线程数 / 最大线程数 / 拒绝策略控制并发规模。线程执行完任务后不销毁，而是循环从队列取下一个任务，从而复用。',
                },
                points: [
                  '复用线程：把创建销毁成本摊到多个任务上',
                  '限制并发：三个闸门（核心数 / 队列 / 最大值）保护系统与下游',
                  '统一管理：可观测、可优雅关闭、可定制拒绝与异常处理',
                  '不是越大越好：超过核数后增加的是切换成本，除非线程大量阻塞',
                ],
              },
              {
                kind: 'question',
                title: '为什么要用线程池？',
                questionId: 'java-03-Q39',
                intent:
                  '开场题。不要只答「减少创建销毁开销」，那只是三分之一。要把「限流保护」和「可管理」这两条说出来，层次立刻不同。',
                points: [
                  '**复用线程**：避免频繁创建/销毁的系统调用与内存分配（每线程约 1MB 栈）',
                  '**控制并发数**：用队列 + 最大线程数形成背压，避免线程数无限膨胀导致 OOM 或压垮下游',
                  '**统一管理**：提供拒绝策略、优雅关闭、活跃数/队列长度等监控指标',
                  '**提升响应速度**：任务到达时线程已就绪，无需等待创建（对短任务尤其明显）',
                  '**可定制**：线程工厂（命名、异常处理器）、`beforeExecute`/`afterExecute` 钩子（埋点、上下文传递）',
                  '对比裸线程：`new Thread()` 无法限制总数、无法复用、无法统一关闭与观测',
                ],
                depth:
                  '加分点：说清「线程池的收益随任务特征变化」。任务是**短小且大量**时，创建成本占比高，池化收益最大；任务是**长耗时且数量少**时，池化收益有限（复用次数少），此时更该关心的是「并发上限」而不是「复用」。这个视角能把「为什么要用」提升到「什么场景才值得用」。',
                followup: '「虚拟线程出来了还需要线程池吗」——需要，但角色变了。虚拟线程让「创建成本」几乎归零，所以「复用」这一条不再重要；但「**限制并发**」仍然必须（否则会打爆下游），只是这时用 `Semaphore` 做限流比用线程池更自然。JDK 21 的 `Executors.newVirtualThreadPerTaskExecutor()` 就是「每任务一个虚拟线程」，不再池化。',
              },
              {
                kind: 'question',
                title: '线程池有哪七个参数？各是什么含义？',
                questionId: 'java-03-Q40',
                intent:
                  '必背题，但只背名字会被追问。每个参数都要能说清「不设对会怎样」。',
                points: [
                  '`corePoolSize`：核心线程数，**即使空闲也不会被回收**（除非开 `allowCoreThreadTimeOut`）',
                  '`maximumPoolSize`：线程总数上限，只有**队列满了**才会扩到它',
                  '`keepAliveTime` + `unit`：非核心线程空闲存活时间，超时销毁',
                  '`workQueue`：工作队列。**选什么队列决定了整个池的行为**（有界=背压，无界=OOM 风险）',
                  '`threadFactory`：创建线程的工厂。**必须自定义**——起可读的名字、设 `UncaughtExceptionHandler`、决定是否守护线程',
                  '`handler`（拒绝策略）：队列满且线程达上限时的兜底。默认 `AbortPolicy`（抛异常）',
                  '内部还有第 8 个隐含参数：`ctl`（`AtomicInteger`），高 3 位存运行状态、低 29 位存线程数',
                ],
                depth:
                  '「`maximumPoolSize` 什么时候才生效」是最常见的追问：**只有队列满了才会创建超过 `corePoolSize` 的线程**。所以如果用了无界队列（`LinkedBlockingQueue` 不传容量），`maximumPoolSize` 永远不生效，池里最多只有 `corePoolSize` 个线程，任务全部堆在队列里——这就是 `newFixedThreadPool` 会 OOM 的完整链条。',
                followup: '「`keepAliveTime` 对核心线程有效吗」——默认无效。`allowCoreThreadTimeOut(true)` 后核心线程也会因空闲被回收（此时 `keepAliveTime` 对它们生效）。这个开关在「流量有明显波峰波谷」的场景有用，但会让「冷启动」多一次创建开销。',
              },
              {
                kind: 'diagram',
                title: '线程池内部：一个 ctl、一个队列、一组 worker',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'ctl（AtomicInteger）',
                      note: '高 3 位 + 低 29 位',
                      slots: [
                        { label: '高 3 位', value: '运行状态（5 种）', tone: 'warn' },
                        { label: '低 29 位', value: 'workerCount（最多 5 亿）', tone: 'primary' },
                      ],
                    },
                    {
                      name: 'workQueue',
                      note: '决定池的行为',
                      slots: [
                        { label: '类型', value: 'BlockingQueue<Runnable>', tone: 'primary' },
                        { label: '有界', value: 'ArrayBlockingQueue → 有背压', tone: 'muted' },
                        { label: '无界', value: 'LinkedBlockingQueue → OOM 风险', tone: 'bad' },
                      ],
                    },
                    {
                      name: 'workers（HashSet）',
                      note: '每个 worker 一个线程',
                      slots: [
                        { label: 'worker', value: 'Thread + 首个 task', tone: 'primary' },
                        { label: '循环', value: 'runWorker 里 getTask()', tone: 'primary' },
                      ],
                    },
                    {
                      name: 'handler',
                      note: '兜底',
                      slots: [
                        { label: '拒绝策略', value: '默认 AbortPolicy', tone: 'warn' },
                      ],
                    },
                  ],
                  caption:
                    '把 `ctl` 用一个 `AtomicInteger` 同时表达「状态」和「线程数」是很有意思的设计：**一次 CAS 就能同时安全地修改两者**，避免两个字段的一致性问题。五种状态是 `RUNNING`（接任务且处理队列）、`SHUTDOWN`（不接新任务，但处理完队列）、`STOP`（不接也不处理，中断进行中的）、`TIDYING`（全部终止，准备跑 `terminated()`）、`TERMINATED`（`terminated()` 执行完）。',
                },
              },
              {
                kind: 'question',
                title: '线程池处理任务的执行流程（submit 一个任务后发生了什么）？',
                questionId: 'java-03-Q41',
                intent:
                  '本节最核心的一题。必须按顺序说清四步判断，并解释「为什么是这个顺序」。',
                points: [
                  '① `workerCount < corePoolSize` → 直接 `addWorker(command, true)` 新建核心线程执行',
                  '② 否则 `workQueue.offer(command)` 入队。**入队成功**后再做一次复查：若池已 `SHUTDOWN` 则移除该任务并拒绝；若 `workerCount == 0` 则补一个线程',
                  '③ 入队**失败**（队列满）→ `addWorker(command, false)` 尝试扩到 `maximumPoolSize`',
                  '④ 扩容也失败 → 执行 `reject(command)` 走拒绝策略',
                  '顺序的含义：**先扩容到核心数 → 再排队 → 再扩容到最大数 → 才拒绝**。所以「队列」在「最大线程数」之前，这是与直觉相反的地方',
                  '由此推论：**无界队列会让 `maximumPoolSize` 完全失效**（永远走不到第 ③ 步）',
                  '`addWorker` 内部会再检查一次状态与线程数（CAS 递增 `ctl`），所以并发提交也不会超限',
                ],
                depth:
                  '为什么「先排队再扩容」而不是「先扩容再排队」：这是 Doug Lea 的取舍——**创建线程比入队贵得多**。绝大多数任务都能很快执行完，让它们在队列里等一小会儿，比立刻新建线程更划算。只有当队列都满了（说明任务确实堆积），才值得付出创建线程的成本。理解这个取舍，就能解释为什么「突发流量下线程数上不去、延迟飙升」——因为队列还没满。',
                followup: '「为什么要入队后再复查一次 `workerCount == 0`」——因为存在竞态：线程池可能刚把最后一个 worker 回收（`STOP` 状态或 `allowCoreThreadTimeOut`），此时任务已入队但没人处理。补一个线程（`addWorker(null, false)`）能保证队列不饿死。',
              },
              {
                kind: 'diagram',
                title: 'execute 的四道闸门',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① workerCount < corePoolSize', note: '新建核心线程执行 —— 不碰队列' },
                    { label: '② workQueue.offer 成功', note: '入队等待；复查状态，必要时补建线程' },
                    { label: '③ addWorker(cmd, false)', note: '队列满 → 扩到 maximumPoolSize' },
                    { label: '④ reject(command)', note: '扩容失败 → 拒绝策略兜底' },
                  ],
                  caption:
                    '四道闸门自上而下依次尝试，**任何一步成功就结束**。记忆抓手：**「核心 → 队列 → 最大 → 拒绝」**。这个顺序也解释了两个经典现象：无界队列让第三步永远不触发（池卡在核心数）；有界队列 + 小最大值会让第四步频繁触发（大量拒绝）。',
                },
              },
              {
                kind: 'code',
                title: 'execute 源码：四道闸门就这么几十行',
                lang: 'java',
                code:
                  'public void execute(Runnable command) {\n    if (command == null) throw new NullPointerException();\n    int c = ctl.get();\n\n    // ① 未达核心数：直接建核心线程\n    if (workerCountOf(c) < corePoolSize) {\n        if (addWorker(command, true)) return;\n        c = ctl.get();                       // addWorker 失败（如池已关闭），重读状态\n    }\n\n    // ② 池仍在 RUNNING：尝试入队\n    if (isRunning(c) && workQueue.offer(command)) {\n        int recheck = ctl.get();\n        if (!isRunning(recheck) && remove(command))\n            reject(command);                 // 入队后池被关闭 → 移除并拒绝\n        else if (workerCountOf(recheck) == 0)\n            addWorker(null, false);          // 队列有任务但没线程 → 补一个\n    }\n    // ③ 入队失败（队列满）：扩到最大线程数\n    else if (!addWorker(command, false))\n        // ④ 扩容也失败：拒绝\n        reject(command);\n}\n\n// addWorker 里的关键一段（保证不超限）\nprivate boolean addWorker(Runnable firstTask, boolean core) {\n    retry:\n    for (;;) {\n        int c = ctl.get();\n        int wc = workerCountOf(c);\n        // 核心线程看 corePoolSize，非核心看 maximumPoolSize\n        if (wc >= CAPACITY ||\n            wc >= (core ? corePoolSize : maximumPoolSize))\n            return false;\n        if (compareAndIncrementWorkerCount(c))   // CAS 递增线程数\n            break retry;\n        // CAS 失败 → 重读 ctl 继续（可能状态变了或数满了）\n    }\n    // ... 创建 Worker、启动线程\n}',
                caption:
                  '`addWorker` 的 `core` 参数决定用哪个上限做检查——**这就是「核心线程」与「非核心线程」在代码上的唯一区别**（除了 `getTask` 里的超时策略）。注意 `addWorker` 是用 CAS 递增 `workerCount` 的，所以并发提交时不会突破上限。',
                notes: [
                  { line: 'if (isRunning(c) && workQueue.offer(command))', text: '`offer` 而非 `put`——线程池绝不阻塞提交线程，队列满就返回 false，走下一步。这是「不给调用方添阻塞」的设计取舍。' },
                  { line: 'else if (workerCountOf(recheck) == 0) addWorker(null, false);', text: '`core=false` 表示建的是「非核心」线程（受 `keepAliveTime` 管理）；`firstTask=null` 表示它只从队列取任务。' },
                  { line: 'wc >= (core ? corePoolSize : maximumPoolSize)', text: '核心线程数检查用 `corePoolSize`，非核心用 `maximumPoolSize`。**这一行就是「最大线程数只在核心满了之后才生效」的实现**。' },
                ],
              },
              {
                kind: 'question',
                title: '线程池有哪几种拒绝策略？想尽量不丢任务用哪个？',
                questionId: 'java-03-Q42',
                intent:
                  '四种策略必须说全，并给出「不丢任务」的正确答案。注意「不丢任务」和「不阻塞」是矛盾的，能指出这一点就是加分。',
                points: [
                  '`AbortPolicy`（**默认**）：抛 `RejectedExecutionException`，让调用方感知失败',
                  '`CallerRunsPolicy`：**由提交任务的线程自己执行**。天然形成背压（提交方被拖慢），代价是可能阻塞调用方',
                  '`DiscardPolicy`：**静默丢弃**，什么都不做。最危险——任务凭空消失且无任何日志',
                  '`DiscardOldestPolicy`：丢弃队列中**最老**的任务，再重新提交当前任务。会静默丢数据',
                  '「尽量不丢」→ `CallerRunsPolicy`（任务仍会被执行，只是改由调用线程跑）；它也是唯一自带限流效果的策略',
                  '自定义策略：实现 `RejectedExecutionHandler`，常见做法是「落库/落 MQ 稍后重试」或「降级返回兜底值」',
                ],
                depth:
                  '为什么说「不丢任务」没有完美答案：`CallerRunsPolicy` 只是把任务转移给调用线程，如果调用线程是 Tomcat 的工作线程，那它就被占用——**问题从「任务丢失」变成了「请求线程被拖住」**。真正的做法是「有界队列 + 拒绝时落盘/入 MQ + 告警」，让丢失变成「延迟处理」。面试里能说清这个 trade-off，比背四个名字有价值得多。',
                followup: '「`DiscardOldestPolicy` 什么场景能用」——只适合「任务有时效性、旧任务已无意义」的场合，比如实时行情推送、监控采样。用在订单、支付这类场景就是事故。',
              },
              {
                kind: 'compare',
                title: '四种拒绝策略：丢不丢、谁执行、会不会阻塞',
                head: ['策略', '行为', '任务会不会执行', '是否阻塞调用方', '风险'],
                rows: [
                  ['`AbortPolicy`（默认）', '抛 `RejectedExecutionException`', '不会', '不阻塞', '调用方必须 catch，否则任务丢失且异常向上抛'],
                  ['`CallerRunsPolicy`', '提交线程自己执行', '**会**', '**会阻塞**', '拖慢调用方；Tomcat 线程被占用会影响吞吐'],
                  ['`DiscardPolicy`', '静默丢弃', '不会', '不阻塞', '**无任何日志**，最难排查'],
                  ['`DiscardOldestPolicy`', '丢队首，再提交', '当前任务会，旧任务不会', '不阻塞', '静默丢旧数据'],
                  ['自定义（落库/MQ）', '持久化后异步重试', '会（延迟）', '视实现', '复杂度高，需保证幂等'],
                ],
                note:
                  '生产环境推荐组合：**有界队列 + `CallerRunsPolicy` 或自定义落库策略 + 队列长度与拒绝次数监控告警**。默认的 `AbortPolicy` 在「提交方是 Web 线程」时会导致 500，必须显式处理。',
              },
              {
                kind: 'question',
                title: '为什么不推荐用 Executors 快捷方法创建线程池？',
                questionId: 'java-03-Q43',
                intent:
                  '阿里规约里的经典题。要说清三个工厂方法各自的坑，并给出「应该怎么写」。',
                points: [
                  '`newFixedThreadPool` / `newSingleThreadExecutor`：用**无界** `LinkedBlockingQueue`（默认 `Integer.MAX_VALUE`）→ 任务无限堆积 → **OOM: Java heap space**',
                  '`newCachedThreadPool`：`SynchronousQueue` + `maximumPoolSize = Integer.MAX_VALUE` → 来多少任务就建多少线程 → **OOM: unable to create native thread**',
                  '`newScheduledThreadPool`：`DelayedWorkQueue` 也是无界的 → 同样有堆积 OOM 风险',
                  '共同问题：**全部隐藏了关键参数**，使用者不知道自己用的是有界还是无界、拒绝策略是什么',
                  '正确做法：手动 `new ThreadPoolExecutor(...)`，显式指定**有界队列**、**有意义的线程名**、**明确的拒绝策略**',
                  '补充：无界队列还有一个隐患——**队列里的任务会持有对象引用，阻止 GC**，即使任务早已失去意义',
                ],
                depth:
                  '「为什么无界队列会导致 OOM 而不是拒绝」——因为 `maximumPoolSize` 的检查在入队失败之后（见上一题的第三步）。无界队列永远 `offer` 成功，所以永远走不到扩容与拒绝，池里只有 `corePoolSize` 个线程在慢慢消费，队列无限增长直到堆被打满。**这条链条要能一口气讲完**，它把「七参数」「执行流程」「拒绝策略」三块串起来了。',
                followup: '「`LinkedBlockingQueue` 不传容量真的是无界吗」——是的，默认 `Integer.MAX_VALUE`（约 21 亿），实际等价于无界。但严格说它是「有界但界极大」，所以 `size()` 返回 `int` 也不会溢出。这个细节能体现你读过源码。',
              },
              {
                kind: 'diagram',
                title: '三个工厂方法，三种 OOM 方式',
                diagram: {
                  type: 'matrix',
                  cols: ['队列', '最大线程数', 'OOM 形态'],
                  rows: [
                    ['`newFixedThreadPool(n)`', '`LinkedBlockingQueue`（无界）', '= n（永久）', '堆内存：任务无限堆积'],
                    ['`newSingleThreadExecutor()`', '`LinkedBlockingQueue`（无界）', '= 1', '堆内存：同上，且串行更慢'],
                    ['`newCachedThreadPool()`', '`SynchronousQueue`（容量 0）', '`Integer.MAX_VALUE`', '本机线程数：每任务一线程'],
                    ['`newScheduledThreadPool(n)`', '`DelayedWorkQueue`（无界）', '`Integer.MAX_VALUE`', '堆内存：延时任务堆积'],
                  ],
                  caption:
                    '注意第三行的 OOM 形态完全不同：`CachedThreadPool` 不是堆被打满，而是**创建不出更多 OS 线程**（`unable to create native thread`）。两种 OOM 的排查方向也不同——前者看堆 dump 里的队列，后者看线程数与 `-Xss`。',
                  note: '结论：四个工厂方法**没有一个适合生产**。它们的定位是「示例与测试」，官方文档也是这么暗示的（`Executors` 的注释强调「需要更灵活配置时请直接用 `ThreadPoolExecutor`」）。',
                },
              },
              {
                kind: 'question',
                title: '线程池线程数设置多少合适？CPU 密集型和 IO 密集型怎么算？',
                questionId: 'java-03-Q44',
                intent:
                  '公式要背，但更重要的是说清「公式只是起点，最终看压测」。只报 N+1 会被认为没实践。',
                points: [
                  '**CPU 密集型**：`N + 1`（N = 核数）。多出的 1 个用于「偶发的缺页中断或其他原因导致的暂停」时顶上',
                  '**IO 密集型**：`N × (1 + 平均等待时间 / 平均计算时间)`。因为线程阻塞时不占 CPU，可以多开',
                  '例：8 核、任务 90% 时间在等 RPC、10% 在算 → `8 × (1 + 0.9/0.1) = 80`',
                  '**理论公式只是起点**：真实值取决于下游承受能力、内存上限、GC 压力',
                  '工程做法：**先按公式设初值 → 压测 → 看三个指标调**：CPU 利用率、队列长度、任务平均等待时间',
                  '判断标准：CPU 打满且队列短 → 合适；CPU 未满但队列持续增长 → 线程太少或下游变慢；CPU 打满且队列长 → 该扩容机器而不是加线程',
                  '别忘了内存约束：每线程 1MB 栈，1000 线程就是 1GB 栈空间（`-Xss` 可调小）',
                ],
                depth:
                  '「线程数超过核数为什么还能提升吞吐」的准确解释：线程在**阻塞**时不占 CPU。8 核跑 80 个「90% 时间在等 IO」的线程，任意时刻平均只有 8 个在算，其余 72 个都在等——CPU 利用率刚好饱和。反过来，如果任务是纯计算（无阻塞），80 个线程只会让每个任务都变慢（切换成本），总吞吐不变甚至下降。**所以「线程数」本质是在匹配「阻塞比例」，不是匹配「任务数量」。**',
                followup: '「怎么知道任务的阻塞比例」——用 APM 或 `async-profiler` 看火焰图里「wall time vs cpu time」的比例；简单办法是在任务里埋点统计「总耗时」与「纯计算耗时」。**这个数据比任何公式都准**。',
              },
              {
                kind: 'question',
                title: 'execute 和 submit 有什么区别？任务抛异常会怎样？',
                questionId: 'java-03-Q45',
                intent:
                  '最容易踩坑的一题。核心是「submit 会把异常吞进 Future」，这一点很多工作多年的人也不知道。',
                points: [
                  '`execute(Runnable)`：无返回值，异常**直接抛出**到线程的 `UncaughtExceptionHandler`（默认打到 `System.err`）',
                  '`submit(...)`：返回 `Future`，异常被**封装进 `Future`**。不调用 `get()` 就**永远看不到异常**',
                  '`submit` 可接受 `Runnable` 与 `Callable`；`execute` 只接受 `Runnable`',
                  '`submit` 内部把任务包成 `FutureTask`，其 `run()` 里用 `try/catch` 捕获所有异常存进 `outcome`，所以异常不会向外传播',
                  '`Future.get()` 抛出的是 `ExecutionException`（原始异常在 `getCause()` 里）；`get()` 前的异常则是 `InterruptedException` / `TimeoutException`',
                  '因此用 `submit` 必须：要么 `get()`（阻塞）、要么在任务内部 `try/catch` 兜底、要么重写 `afterExecute` 检查异常',
                ],
                depth:
                  '「为什么说这是线上事故的常见来源」——因为代码看起来完全正常：`pool.submit(() -> doSomething())`，任务抛了 NPE，但日志里什么都没有，监控也显示「任务已提交」。只有队列长度或在业务指标异常时才被发现。**这是「静默失败」的典型案例**，也是为什么推荐在 `ThreadFactory` 里设 `UncaughtExceptionHandler` **并在任务内部 try/catch**——因为 `UncaughtExceptionHandler` 对 `submit` 提交的任务**也不生效**（异常被 `FutureTask` 吃掉了）。',
                followup: '「那 `UncaughtExceptionHandler` 什么情况下生效」——只对 `execute` 提交的任务、以及线程内未被捕获的 `Error`。所以它不能替代任务内的 `try/catch`。正确姿势：任务体第一层就 `try { ... } catch (Throwable t) { log.error(...) }`。',
              },
              {
                kind: 'code',
                title: '异常去哪了：三种提交方式的对比',
                lang: 'java',
                code:
                  'ThreadPoolExecutor pool = new ThreadPoolExecutor(\n        2, 2, 0L, TimeUnit.MILLISECONDS,\n        new ArrayBlockingQueue<>(10),\n        r -> {\n            Thread t = new Thread(r, "biz-" + COUNTER.incrementAndGet());\n            t.setUncaughtExceptionHandler((th, e) -> log.error("uncaught in {}", th.getName(), e));\n            return t;\n        },\n        new ThreadPoolExecutor.CallerRunsPolicy());\n\n// ① execute：异常会走到 UncaughtExceptionHandler（能被看到）\npool.execute(() -> { throw new RuntimeException("boom-A"); });\n\n// ② submit 但不 get：异常被 FutureTask 吞掉，日志里【什么都没有】\npool.submit(() -> { throw new RuntimeException("boom-B"); });\n\n// ③ submit + get：异常以 ExecutionException 形式抛出\nFuture<?> f = pool.submit(() -> { throw new RuntimeException("boom-C"); });\ntry {\n    f.get();\n} catch (ExecutionException e) {\n    log.error("task failed", e.getCause());   // 原始异常在 getCause()\n} catch (InterruptedException e) {\n    Thread.currentThread().interrupt();\n}\n\n// ④ 推荐：任务内部自己兜底（对 execute / submit 都有效）\npool.submit(() -> {\n    try {\n        riskyWork();\n    } catch (Throwable t) {                   // 用 Throwable，别漏掉 Error\n        log.error("riskyWork failed", t);\n    }\n});\n\n// ⑤ 兜底加强版：重写 afterExecute 统一检查\nclass TracedPool extends ThreadPoolExecutor {\n    @Override protected void afterExecute(Runnable r, Throwable t) {\n        if (t == null && r instanceof Future<?> f && f.isDone()) {\n            try { f.get(); } catch (ExecutionException e) { t = e.getCause(); }\n            catch (Exception ignore) { }\n        }\n        if (t != null) log.error("task error", t);\n    }\n}',
                caption:
                  '② 那一行是本节的「反面教材之王」：代码完全编译通过、运行无报错、日志一片安静，但业务已经错了。**结论：`submit` 只在你要用返回值（或要等结果）时使用；否则用 `execute`，或者在任务内自己 `try/catch`。** ⑤ 的写法是框架级兜底，适合统一治理。',
                notes: [
                  { line: 't.setUncaughtExceptionHandler(...)', text: '只对 `execute` 提交的任务生效。`submit` 的任务异常被 `FutureTask` 捕获，不会外泄到 handler。' },
                  { line: 'f.get();', text: '阻塞等待，且必须处理三个异常：`InterruptedException`、`ExecutionException`、`TimeoutException`（带超时的 get）。' },
                  { line: '} catch (Throwable t) {', text: '用 `Throwable` 而非 `Exception`——否则 `OutOfMemoryError`、`NoClassDefFoundError` 会被漏掉。' },
                ],
              },
              {
                kind: 'question',
                title: 'shutdown() 和 shutdownNow() 的区别？如何优雅关闭线程池？',
                questionId: 'java-03-Q46',
                intent:
                  '两个方法要说清「状态变到哪、队列怎么办、进行中的任务怎么办」三件事。后半问要给出可落地的四步流程。',
                points: [
                  '`shutdown()`：状态 → `SHUTDOWN`。**不接新任务**，但**会执行完队列里已有的任务**；不中断正在执行的',
                  '`shutdownNow()`：状态 → `STOP`。**不接新任务、不执行队列**，中断正在执行的线程，并**返回队列中未执行的任务列表**',
                  '`shutdownNow` 的「中断」是协作式的：任务若不响应中断（或忽略 `InterruptedException`），仍会跑完',
                  '`isShutdown()`：是否已调过关闭；`isTerminated()`：是否**全部**线程已结束',
                  '`awaitTermination(timeout, unit)`：等待进入 `TERMINATED`，返回是否超时',
                  '优雅关闭四步：`shutdown()` → `awaitTermination(30s)` → 超时则 `shutdownNow()` → 再 `awaitTermination` 兜底',
                  '关闭前应先停掉「任务来源」（如注销 MQ 消费者、关掉接收请求的端口），否则一边关一边还在提交',
                ],
                depth:
                  '为什么 `shutdownNow` 要返回任务列表：那些任务**从未执行过**，调用方可以落库、重投、或记录告警。很多人忽略这个返回值，导致「关闭时丢了一批任务却不知道」。这是「优雅停机」与「丢数据」的分界线。',
                followup: '「Spring 里怎么优雅停机」——`server.shutdown=graceful`（Spring Boot 2.3+）会先停 Web 容器再销毁 Bean；线程池作为 Bean 加 `@PreDestroy` 调 `shutdown()` + `awaitTermination`。配合 K8s 的 `preStop` 与 `terminationGracePeriodSeconds`，才能做到「滚动发布不丢请求」。',
              },
              {
                kind: 'question',
                title: '线程池是如何实现线程复用的？核心线程会被回收吗？',
                questionId: 'java-03-Q47',
                intent:
                  '考源码理解。核心是「`runWorker` 的 while 循环 + `getTask`」，以及「核心线程默认不回收」这个默认行为。',
                points: [
                  '复用机制：`Worker` 继承 `AQS` 并实现 `Runnable`，其 `run()` 调 `runWorker(this)`',
                  '`runWorker` 的核心是一个循环：先执行 `firstTask`，然后 `while (task != null || (task = getTask()) != null) { task.run(); }`',
                  '`getTask()` 从队列取任务：`allowCoreThreadTimeOut || wc > corePoolSize` 时用 `poll(keepAliveTime)`（会超时返回 null），否则用 `take()`（永久阻塞）',
                  '`getTask()` 返回 null 时循环退出，`processWorkerExit` 移除 worker —— **这就是「线程销毁」的唯一路径**',
                  '**核心线程默认不回收**（`take()` 永久阻塞），除非 `allowCoreThreadTimeOut(true)`',
                  '线程不会因为「执行任务抛异常」而销毁——`runWorker` 里 `catch` 后继续循环；只有 `getTask` 返回 null 或线程被中断才退出',
                  '`Worker` 继承 `AQS` 是为了「用不可重入的独占锁标记线程是否在运行」，防止 `shutdown` 时误中断正在跑任务的线程',
                ],
                depth:
                  '「为什么 `Worker` 要继承 `AQS`」这个细节很少有人答对：它用一个 `state` 为 0/1/-1 的不可重入锁表示「worker 是否持有执行权」。`shutdown` 时 `tryLock` 成功才 `interrupt`——**保证不中断正在执行任务的线程**，只中断空闲等待的。这是「`shutdown` 不中断进行中任务」的实现基础。',
                followup: '「线程池里的线程会因为空闲太久被杀掉吗」——非核心线程会（`poll` 超时返回 null → 退出）。核心线程默认不会。这就是「池的线程数会在 `corePoolSize` 和 `maximumPoolSize` 之间浮动」的机制来源。',
              },
              {
                kind: 'question',
                title: '如何动态修改线程池参数？美团/开源界的方案是什么？',
                questionId: 'java-03-Q48',
                intent:
                  '工程实践题。要知道 JDK 本身提供了 setter，但「动态生效」有坑，以及社区方案的思路。',
                points: [
                  'JDK 原生支持：`setCorePoolSize(int)`、`setMaximumPoolSize(int)`、`setKeepAliveTime(...)`、`setRejectedExecutionHandler(...)`',
                  '`setCorePoolSize` 的逻辑：调大则**立即创建新线程**（`addWorker`）；调小则**下次 `getTask` 时**多余的 worker 会因超时或 `wc > corePoolSize` 而退出',
                  '`setMaximumPoolSize` 只影响「能否继续扩容」，不会立刻销毁多余线程',
                  '**注意**：`workQueue` 和 `threadFactory` **没有 setter**，运行时无法替换——这是硬限制',
                  '美团思路（《Java 线程池实现原理及其在美团业务中的实践》）：自定义 `ThreadPoolExecutor`，暴露参数修改能力，配合配置中心（如 MTConfig / Apollo）推送变更',
  '美团还提出「**动态调参 + 实时监控**」闭环：监控队列长度、活跃线程数、拒绝次数，超阈值自动告警或调参',
                  'Hippo4j、DynamicTp 等开源方案在此基础上增加了「参数模板、依赖隔离、灰度发布」能力',
                  '动态调参的前提是**有监控**：没有指标就不知道往哪个方向调，盲目调参可能让问题更糟',
                ],
                depth:
                  '为什么「队列容量」不能动态改：因为 `BlockingQueue` 的容量是构造时固定的（`ArrayBlockingQueue` 的 `capacity` 是 `final`）。社区方案的解法是「自定义一个可调容量的 `ResizableCapacityLinkedBlockingQueue`」——用 `LinkedBlockingQueue` 的 `capacity` 字段（非 final，通过反射或子类暴露）。这也是 Hippo4j 的一个核心改造点。',
                followup: '「动态调参会有什么风险」——`setCorePoolSize` 调大时会**立刻创建线程**，若一次性调到很大可能引发瞬时资源冲击；调小则线程退出是渐进的。另外调参不会影响**已经在队列里的任务**，它们仍按原逻辑处理。所以调参要有节奏（分批、观察），而不是直接改到目标值。',
              },
              {
                kind: 'question',
                title: 'corePoolSize 能设为 0 吗？不同阻塞队列对线程池行为有什么影响？',
                questionId: 'java-03-Q49',
                intent:
                  '两个陷阱题。第一问答案是「能，但行为反直觉」；第二问是本节的总收束，把队列与四道闸门串起来。',
                points: [
                  '**能设为 0**。此时第一步（`wc < corePoolSize`）永不成立，任务直接入队；入队后复查发现 `workerCount == 0`，才补建一个线程',
                  '所以 `core = 0` 的行为是「**至少 1 个线程**，且任务先进队列再建线程」——比「先建线程」多一次入队延迟',
                  '真正的问题：`core = 0` 时无法「预热」，且 `maximumPoolSize` 要等队列满了才生效，突发流量下延迟更高',
                  '**`SynchronousQueue`（容量 0）**：`offer` 永远失败（没有等待的消费者时）→ 直接走第 ③ 步扩容 → 适合「来多少任务就建多少线程」（`CachedThreadPool`）',
                  '**`ArrayBlockingQueue(n)`（有界）**：可预期，队列满即扩容、再满即拒绝 → **生产推荐**',
                  '**`LinkedBlockingQueue()`（无界）**：`offer` 永成功 → `maximumPoolSize` 失效、拒绝策略永不触发 → 堆积到 OOM',
                  '**`PriorityBlockingQueue`（无界 + 优先级）**：同上，但出队按优先级；注意「低优先级任务可能饿死」',
                  '**`DelayQueue`（无界 + 延时）**：任务到期才可出队；`take` 会阻塞到最早任务到期',
                ],
                depth:
                  '一张表把「队列选型」与「四道闸门」连起来：**队列容量 = 第 ② 步到第 ③ 步之间的缓冲区大小**。容量 0 意味着没有缓冲（立刻扩容），容量无穷意味着永远不扩容。所以「选队列」等价于「选池的弹性策略」——这是比背「有界好、无界坏」更本质的理解。',
                followup: '「`core = 0` 且用 `SynchronousQueue` 会怎样」——这正是 `newCachedThreadPool` 的配置（`core=0, max=MAX_VALUE`）。每个任务都直接尝试交给等待的线程，没有等待者就立刻新建线程。**这就是它「弹性无限」的原因，也是它 OOM 的原因。**',
              },
              {
                kind: 'question',
                title: '生产环境怎么对线程池做监控？不同业务如何隔离？',
                questionId: 'java-03-Q50',
                intent:
                  '工程收口题。要能给出具体指标、具体手段、以及隔离的三种维度。',
                points: [
                  '**核心指标**：`getActiveCount()`（活跃线程）、`getQueue().size()`（队列积压）、`getCompletedTaskCount()`（完成数）、`getPoolSize()`（当前线程数）、`getLargestPoolSize()`（历史峰值）',
                  '**必须加的两个指标**：**队列剩余容量**（`queue.remainingCapacity()`，比纯 size 更能反映「还有多久打满」）与**拒绝次数**（拒绝策略里累加计数器）',
                  '**采集方式**：定时任务（如 `ScheduledExecutorService` 每 10s）打点到 Micrometer / Prometheus；或用 `ThreadPoolExecutor` 的 `beforeExecute`/`afterExecute` 钩子统计任务耗时',
                  '**告警线**：队列使用率 > 80%、活跃线程数长期等于 `maximumPoolSize`、拒绝次数 > 0（任何一次拒绝都该告警）',
                  '**隔离维度一：按业务分池**——订单、支付、通知各自独立池，避免「通知慢拖垮下单」',
                  '**隔离维度二：按依赖分池**——同一业务内，访问不同下游的调用分开池，防止单个下游故障占满全部线程',
                  '**隔离维度三：快慢分离**——快速任务与慢速任务分开池，避免慢任务占满后快任务也排队',
                  '**额外手段**：`Semaphore` 做「信号量隔离」（比线程池更轻量，适合只限流不隔离线程的场景）、`Hystrix`/`Sentinel` 做熔断降级',
                ],
                depth:
                  '「为什么线程池隔离是必须的」——因为它防的是**故障放大**：一个下游变慢 → 线程被长时间占用 → 线程池满 → 队列堆积 → 上游请求超时 → 调用方重试 → 雪崩。分池后，故障被限制在单个池内。这也是「舱壁模式（Bulkhead）」的核心思想：船体分舱，一舱进水不会沉船。',
                followup: '「监控发现队列持续增长，先做什么」——先看**是不是下游变慢**（对比下游 RT 与错误率），再看**是不是流量真的涨了**（对比 QPS），最后才考虑调参（加线程/加队列）。**加队列只是延后问题**，队列再大也会满；根因往往在「下游 RT 上升」或「有慢任务混进来」。',
              },
              {
                kind: 'principle',
                title: '把线程池收成一张「参数 — 行为」的因果图',
                body: [
                  '线程池的题之所以容易答散，是因为它有一堆参数和一堆现象。把「参数改动 → 行为变化」这条因果链记住，任何追问都能顺着推下去。',
                ],
                steps: [
                  {
                    title: '队列容量决定「弹性区间」',
                    detail:
                      '容量 0（`SynchronousQueue`）→ 立刻扩容，弹性最大；容量 n → 缓冲区 n 个任务；容量无穷 → 永不扩容，`maximumPoolSize` 失效。**这是最容易出错的一个参数**，也是「为什么不推荐 `Executors`」的根因。',
                  },
                  {
                    title: '`corePoolSize` 决定「常驻线程」，`maximumPoolSize` 决定「上限」',
                    detail:
                      '两者之间是「弹性区」，靠 `keepAliveTime` 回收。核心线程默认不回收，所以 `corePoolSize` 实际是「池的基线成本」——设太大会白占内存，设太小会让突发流量全靠新建线程。',
                  },
                  {
                    title: '拒绝策略决定「满了之后」',
                    detail:
                      '满了意味着「队列满 + 线程达上限」。此时的选择只有四种：抛异常（让调用方感知）、调用方自己跑（背压）、丢弃（数据丢失）、落库重试（延迟处理）。**没有「不丢也不阻塞」的选项**——这是资源有限的必然。',
                  },
                  {
                    title: '线程工厂决定「可观测性」',
                    detail:
                      '默认线程名 `pool-N-thread-M` 在 `jstack` 里毫无信息量。自定义命名（带业务前缀）、设 `UncaughtExceptionHandler`、决定是否守护线程——这三件事在排查线上问题时价值极高。',
                  },
                  {
                    title: '监控与隔离决定「能不能发现和限制问题」',
                    detail:
                      '没有监控，参数调错也不知道；没有隔离，一个业务的故障会传染所有业务。这两条是「从能用到可用」的分界线，也是面试里区分「写过 demo」和「上过生产」的关键。',
                  },
                ],
                takeaway:
                  '一句话收口：**线程池 = 一个队列 + 一组线程 + 三道闸门（核心数 / 队列容量 / 最大值）+ 一个兜底策略。** 所有「为什么会 OOM」「为什么拒绝策略不触发」「为什么线程数上不去」的问题，都能从「任务走的是哪道闸门」推出来。',
              },
            ],
            outline: [
              '七参数 + ctl（高 3 位状态 / 低 29 位线程数）；队列容量决定池的弹性区间',
              '执行顺序：核心线程 → 入队 → 扩到最大 → 拒绝；无界队列会让最大线程数失效',
              'Executors 四个工厂方法都不适合生产：无界队列堆 OOM，CachedThreadPool 线程爆炸',
              'CPU 密集 N+1，IO 密集 N×(1+W/C)；最终以压测与 CPU/队列指标为准',
              'submit 会把异常吞进 Future，不 get 就看不到；shutdown 跑完队列，shutdownNow 中断并返回任务',
            ],
            pitfalls: [
              '用 Executors.newFixedThreadPool：无界队列导致 maximumPoolSize 失效并最终 OOM',
              '用 submit 提交任务却不 get、不 try/catch：任务抛异常但日志里什么都没有',
              '只设核心线程数不管队列容量：队列无界等于没有背压，有界但过小会导致大量拒绝',
            ],
          },
        },
        {
          id: 'threadlocal',
          title: 'ThreadLocal 与内存泄漏',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['ThreadLocal'] }],
          content: {
            intro:
              'ThreadLocal 用起来简单，泄漏起来很隐蔽。它最容易答错的一点是**数据存在哪**：不是存在 `ThreadLocal` 实例里，而是存在 `Thread` 对象自己的 `threadLocals` 字段里——`ThreadLocal` 只是一个「钥匙」。它的 `Entry` 里 **key 是弱引用、value 是强引用**，这个不对称正是泄漏的根源。讲清这条引用链，「用完必须 `remove`」就不再是死记的规约。这一节还会讲清 `InheritableThreadLocal` 为什么在线程池里失效，以及 TTL 是怎么补上这个缺口的。',
            sections: [
              {
                kind: 'concept',
                title: '数据不在 ThreadLocal 里，在 Thread 里',
                body: [
                  '`ThreadLocal` 的源码里最重要的不是那个 `T value` 字段（它根本没有），而是一个方法：`get()` 里调 `getMap(Thread.currentThread())`，返回的是**当前线程的 `threadLocals` 字段**。也就是说：**每个线程持有一个 `ThreadLocalMap`，`ThreadLocal` 对象只是这张表里的 key。**',
                  '这个设计决定了三件事。第一，**天然线程隔离**：A 线程和 B 线程各有自己的 map，同一个 `ThreadLocal` 在两个线程里能存不同的值，不需要任何同步。第二，**生命周期绑在线程上**：线程不死，map 就不死——这正是线程池场景下泄漏的前提。第三，**所以必须 `remove`**：线程池里的线程是长期存活的，不清理就等于把数据永久挂在线程上。',
                  '为什么不让 `ThreadLocal` 自己持有一个 `Map<Thread, Object>`（这是 JDK 1.1 的早期设计）？因为那样每个线程的访问都要抢同一个 map 的锁，`ThreadLocal` 反而变成并发热点。改成「数据放在 Thread 里」之后，**每个线程访问自己的 map，零竞争**——这才是它快的根本原因，而不是「因为没加锁」这么简单。',
                  '还有一个常被忽略的细节：`ThreadLocal` 的 `hashCode` 是 `nextHashCode()` 生成的**自增序列**（`AtomicInteger` 从 0 开始，每次加 `0x61c88647`），不是 `Object.hashCode()`。用这个「黄金分割数」做步长，是为了让 key 在 2 的幂大小的表里分布更均匀——这也是它敢用「开放地址法」而不是链表的前提。',
                ],
                term: {
                  name: 'ThreadLocalMap',
                  def: 'Thread 的一个私有字段（`threadLocals`），类型是 ThreadLocal 的静态内部类。它用「开放地址法（线性探测）」解决冲突，初始容量 16、阈值 2/3，key 是弱引用的 ThreadLocal，value 是强引用的值。',
                },
                points: [
                  '数据存在 `Thread.threadLocals` 里，`ThreadLocal` 只是 key（钥匙）',
                  '天然线程隔离：每个线程访问自己的 map，**零竞争**（这是它快的根本原因）',
                  '生命周期绑在线程上：线程不死 map 就不死 → 线程池场景必须手动 `remove`',
                  '`ThreadLocalMap` 用开放地址法（线性探测），没有链表，key 的 hash 是自增黄金分割序列',
                ],
              },
              {
                kind: 'diagram',
                title: '四方关系：Thread、ThreadLocal、ThreadLocalMap、Entry',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'Thread 对象',
                      note: '数据的真正宿主',
                      slots: [
                        { label: 'threadLocals', value: 'ThreadLocalMap 引用', ref: 'ThreadLocalMap', tone: 'primary' },
                        { label: 'inheritableThreadLocals', value: '另一张 map', tone: 'muted' },
                      ],
                    },
                    {
                      name: 'ThreadLocalMap',
                      note: '内部类，每个线程一个',
                      slots: [
                        { label: 'table[]', value: 'Entry 数组（容量 2^n）', ref: 'Entry', tone: 'primary' },
                        { label: 'size', value: '已用槽位数', tone: 'muted' },
                        { label: 'threshold', value: '扩容阈值 = len * 2/3', tone: 'muted' },
                      ],
                    },
                    {
                      name: 'Entry',
                      note: '引用强度不对称的关键',
                      slots: [
                        { label: 'key', value: 'WeakReference<ThreadLocal>', tone: 'warn' },
                        { label: 'value', value: '强引用（业务对象）', tone: 'bad' },
                      ],
                    },
                  ],
                  caption:
                    '把这张图刻在脑子里，泄漏问题就自己浮出来了：**key 是虚线（弱引用），value 是实线（强引用）**。当外部对 `ThreadLocal` 的强引用消失，key 被 GC 回收，但 `Entry` 对象本身还挂在 `table[]` 里，它的 `value` 强引用着业务对象——于是「key 为 null 但 value 还在」的 `stale entry` 就形成了。',
                },
              },
              {
                kind: 'question',
                title: 'ThreadLocal 的实现原理？',
                questionId: 'java-03-Q51',
                intent:
                  '第一句就要说「数据存在 Thread 里」，这是最重要的区分点。然后要讲清 `ThreadLocalMap` 的结构与「为什么用它而不是 HashMap」。',
                points: [
                  '每个 `Thread` 有一个 `threadLocals` 字段，类型是 `ThreadLocalMap`',
                  '`ThreadLocal.get()`：取当前线程的 map，以 `this`（ThreadLocal 对象）为 key 查 Entry，拿到 value',
                  '`set(v)`：同样定位 Entry，存在就覆盖 value，不存在就新建 Entry',
                  '`ThreadLocalMap` 是**自定义的哈希表**：`Entry[] table` 数组 + **开放地址法（线性探测）**，没有链表',
                  '为什么不用 `HashMap`：① 只需存几十个 key，红黑树/链表是浪费；② 要支持「弱引用 key + 自动清理 stale entry」，`HashMap` 做不到',
                  '`ThreadLocal` 的 hash 是 `nextHashCode()` 自增（步长 `0x61c88647`），不是 `Object.hashCode()`',
                  '初始容量 16、阈值 2/3，超过则 `resize` 并 `rehash`（同时清理 stale entry）',
                ],
                depth:
                  '「为什么 key 要用弱引用」——这是为了让「`ThreadLocal` 对象本身可以被回收」。如果 key 是强引用，那么只要线程活着，`ThreadLocal` 对象就永远不能被 GC（被 map 强引用着），即使业务代码早就把它置为 null。用弱引用，`ThreadLocal` 对象可以被回收，只是留下一个 key 为 null 的坑位——再由清理机制除掉。**这是「两害相权」：宁可留一个可清理的残骸，也不要让对象永不可回收。**',
                followup: '「`ThreadLocalMap` 的线性探测怎么处理冲突」——`i = (i + 1) & (len - 1)` 往后找空位；查找时如果遇到 key 为 null 的槽会顺手 `expungeStaleEntry`（清理并重排后面的元素），遇到真正相等的 key 就返回值。这也是为什么它的性能对「表里有多少 stale entry」敏感。',
              },
              {
                kind: 'principle',
                title: '开放地址法：没有链表怎么解决冲突',
                body: [
                  '`ThreadLocalMap` 是 JDK 里少数用「开放地址法」的哈希表（另一个是 `IdentityHashMap`）。理解它的探测与清理，才能解释「为什么泄漏不会无限增长」以及「为什么极端情况下 `get` 会变慢」。',
                ],
                steps: [
                  {
                    title: '① 定位：`i = key.threadLocalHashCode & (len - 1)`',
                    detail:
                      '和 `HashMap` 一样的取模优化（容量是 2 的幂）。区别在于冲突时的处理：`HashMap` 挂链表，这里往后挪一格。',
                  },
                  {
                    title: '② 探测：`i = (i + 1) & (len - 1)`，直到遇到空槽或相等的 key',
                    detail:
                      '查找时三种情况：**命中**（key 相等）→ 返回；**key 为 null**（stale）→ 触发清理并继续找；**空槽**（null entry）→ 说明不存在，停止。所以「空槽」是探测结束的哨兵，这也是为什么删除不能简单置 null（会截断探测链，需要 `expungeStaleEntry` 重排）。',
                  },
                  {
                    title: '③ 清理一：`expungeStaleEntry(i)`（探测式清理）',
                    detail:
                      '从下标 `i` 开始向后扫描，把 key 为 null 的 Entry 的 `value` 置 null（**这一步才是真正断开强引用**），并把后面「本该在前面」的元素往前挪。它在 `get`/`set`/`remove` 时被触发。',
                  },
                  {
                    title: '④ 清理二：`cleanSomeSlots(i, n)`（启发式清理）',
                    detail:
                      '`set` 时以 `log2(n)` 的节奏抽样扫描，避免每次都全表扫（那是 O(n)）。这个「启发式」是性能与清理彻底性的折中——**代价是可能留下少量 stale entry**。',
                  },
                  {
                    title: '⑤ 兜底：`rehash()` 全表清理',
                    detail:
                      '当 `size >= threshold` 时调 `rehash()`，它会先全表 `expungeStaleEntry`，若清理后 size 仍超过阈值的 3/4 才真正扩容。所以「大量 stale entry」时会先清理而非扩容。',
                  },
                ],
                takeaway:
                  '**「线性探测 + 惰性清理」** 就是它的全部机制。这也回答了一个常见疑问：「泄漏会不会无限增长」——不会，因为 `set/get` 会顺手清；但如果一个线程只 `set` 一次再不碰，那这个 stale entry 就会一直留着，直到线程死亡。**这就是线程池场景下最坏的情况。**',
              },
              {
                kind: 'question',
                title: 'ThreadLocal 为什么会内存泄漏？key 已经是弱引用了，为什么还不够？',
                questionId: 'java-03-Q52',
                intent:
                  '本节最核心的一题。必须画出完整引用链，说清「弱引用只解决了 key，没解决 value」，然后给出正确做法。',
                points: [
                  '引用链：`Thread`（强）→ `threadLocals`（强）→ `Entry[]`（强）→ `Entry`（强）→ **`value`（强）**',
                  '`Entry` 继承 `WeakReference<ThreadLocal>`，所以 **key 是弱引用，value 是强引用**',
                  '当外部对 `ThreadLocal` 的强引用消失（如方法结束、置 null），key 可被 GC 回收 → `Entry` 变成「key 为 null、value 还在」',
                  '此时 `Entry` 仍被 `table[]` 强引用 → `value` 不可回收 → **泄漏**',
                  '弱引用**只保证 key 能被回收**，不保证 value 能被回收——这是关键的一句',
                  '`ThreadLocalMap` 的惰性清理（`expungeStaleEntry`）是**兜底**，不是保证：只在 `get/set/remove` 时触发，且 `cleanSomeSlots` 是抽样的',
                  '**线程池是重灾区**：`Thread` 长期存活 → map 长期存活 → 一直没被访问的 stale entry 永久滞留 → 累积到 OOM',
                  '正确做法：`try { ... } finally { threadLocal.remove(); }`——必须写在 `finally` 里',
                ],
                depth:
                  '「为什么不用强引用 key」的反向思考：如果 key 是强引用，`Entry` 会一直强引用 `ThreadLocal` 对象，导致 `ThreadLocal` 本身无法被回收（哪怕业务代码已经不用了）。两害相权，JDK 选了「弱引用 key + 惰性清理」——**它把「对象永不可回收」换成了「可能残留 value」**，前者是无法修复的，后者至少有 `remove` 兜底。这是一个很值得体会的设计取舍。',
                followup: '「`remove()` 做了什么」——调用 `ThreadLocalMap.remove(key)`：找到槽位，调 `clear()` 把 key 置 null，清空 value，再 `expungeStaleEntry` 清理并重排。**所以 `remove` 是唯一能保证「立即、彻底」断开引用链的手段**，`get/set` 的清理都是概率性的。',
              },
              {
                kind: 'diagram',
                title: '泄漏的完整链条：为什么弱引用救不了 value',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: 'Thread 存活（线程池里的核心线程）', note: '栈上的 ThreadLocal 引用已消失' },
                    { label: 'threadLocals → table[] 仍被强引用', note: 'map 本身活着，Entry 活着' },
                    { label: 'Entry.key 被 GC 回收 → null', note: '弱引用生效，key 消失了' },
                    { label: 'Entry.value 仍被 Entry 强引用', note: '**这一步就是泄漏**：value 拿不回来，也回收不了' },
                    { label: '只能等 get/set/remove 触发清理', note: '若该 key 再也不被访问，就永久滞留' },
                  ],
                  caption:
                    '注意第 4 步的措辞：**value「拿不回来」也「回收不了」**。拿不回来是因为 key 没了，你无法用 `ThreadLocal` 再去索引它；回收不了是因为 `Entry` 还强引用着它。这是一个真正的「黑洞」——除非有清理机制介入，否则这块内存既不可用也不可回收。',
                },
              },
              {
                kind: 'code',
                title: 'remove 的正确姿势，以及三种「以为清了其实没清」',
                lang: 'java',
                code:
                  'private static final ThreadLocal<UserContext> CTX = new ThreadLocal<>();\n\n// ✗ 错：异常时不清理（泄漏 + 脏数据）\nvoid badHandle(Request req) {\n    CTX.set(loadUser(req));\n    doBusiness();                 // 这里抛异常 → 下面的 remove 永远不执行\n    CTX.remove();\n}\n\n// ✓ 正确：finally 兜底\nvoid goodHandle(Request req) {\n    try {\n        CTX.set(loadUser(req));\n        doBusiness();\n    } finally {\n        CTX.remove();             // 无论正常/异常都清理\n    }\n}\n\n// ✗ 以为清了其实没清之一：只 set(null)\nvoid stillLeaks() {\n    CTX.set(null);                // Entry 还在，只是 value 变成 null；若 value 是对象则引用已断，但槽位仍在\n    // 注意：set(null) 断开的是 value 引用，不是删除 Entry；规范做法仍是 remove()\n}\n\n// ✗ 之二：用 ThreadLocal.withInitial 就以为不用清\nprivate static final ThreadLocal<List<String>> BUF =\n        ThreadLocal.withInitial(ArrayList::new);   // 初始值一样要清理\n\n// ✗ 之三：清理了 A 却漏了 B\nprivate static final ThreadLocal<String> TRACE = new ThreadLocal<>();\nvoid partial() {\n    try {\n        CTX.set(u); TRACE.set(tid);\n        work();\n    } finally {\n        CTX.remove();             // 漏了 TRACE.remove()\n    }\n}\n\n// ◆ 更稳的写法：把「成组的 ThreadLocal」封进一个上下文对象，只存一个 key\nfinal class Ctx {\n    final UserContext user;\n    final String traceId;\n    Ctx(UserContext u, String t) { user = u; traceId = t; }\n}\nprivate static final ThreadLocal<Ctx> CTX2 = new ThreadLocal<>();\n// 清理只需一次 CTX2.remove()，不可能漏',
                caption:
                  '最后那个「封成一个上下文对象」的写法值得学：**把 N 个 ThreadLocal 合并成 1 个**，既减少了 map 里的槽位（减少哈希冲突），也让 `remove` 不可能漏。缺点是这个对象不可变（每次改要整体替换），但上下文本该如此。',
                notes: [
                  { line: 'CTX.remove();  // 无论正常/异常都清理', text: '必须在 `finally`，且必须是 `remove()` 而不是 `set(null)`。' },
                  { line: 'CTX.set(null);', text: '它只是把 value 置 null，Entry 与 key 都还在。虽然断开了对象引用（不泄漏对象），但留下了 stale 槽位，`size` 也不会减少。' },
                  { line: 'ThreadLocal.withInitial(ArrayList::new)', text: '`withInitial` 只是「get 时若为 null 就调 supplier」，与「自动清理」毫无关系，照样要 `remove`。' },
                ],
              },
              {
                kind: 'question',
                title: 'ThreadLocal + 线程池 除了内存泄漏还有什么风险？',
                questionId: 'java-03-Q53',
                intent:
                  '这题考工程直觉。除了泄漏，更危险的是「脏数据」——上一个请求的上下文被下一个请求读到，这是真实的越权事故来源。',
                points: [
                  '**脏数据（最危险）**：线程复用导致上一个任务的 ThreadLocal 值残留，下一个任务读到别人的用户身份/租户 ID → 数据越权',
                  '**状态污染**：残留的 `SimpleDateFormat`、`Random`、计数器等会让下一个任务行为异常',
                  '**泄漏累积**：长期存活线程上不断 `set` 新的 `ThreadLocal`，每个都留一个 stale entry，最终 OOM',
                  '**难以复现**：本地单线程测试永远正常，只有线上高并发 + 线程复用才偶发，排查成本极高',
                  '**框架层的隐式依赖**：很多框架（Spring 的 `RequestContextHolder`、MyBatis 的 `SqlSession`、日志 MDC）都用 ThreadLocal，一处不清理会影响整条链路',
                  '对策：① 统一在 `finally` 里 `remove`；② 用拦截器/过滤器/AOP 统一管理上下文生命周期；③ 优先用框架提供的上下文（如 `RequestContextHolder`），别自己造',
                ],
                depth:
                  '「脏数据为什么比泄漏更危险」——泄漏最终会以 OOM 的形式暴露（有告警、有堆栈），而脏数据**不会报错**，只会让业务算错：A 用户看到了 B 用户的数据、A 租户的请求写进了 B 租户的库。这类问题往往在数据审计或客诉时才被发现，已经产生了实质损失。**所以「ThreadLocal 用完必须清」的第一理由是正确性，第二才是内存。**',
                followup: '「Spring 的 `RequestContextHolder` 怎么处理的」——`FrameworkServlet` 在 `processRequest` 的 `finally` 里调 `RequestContextHolder.resetRequestAttributes()`。这就是「框架帮你清了」的例子。如果你自己再往里塞东西，仍要自己清。',
              },
              {
                kind: 'code',
                title: '线程池里的脏数据：一段能稳定复现的代码',
                lang: 'java',
                code:
                  'private static final ThreadLocal<String> USER = new ThreadLocal<>();\n\n// 模拟两个请求，共用一个只有 1 个线程的池\npublic static void main(String[] args) throws Exception {\n    ExecutorService pool = Executors.newFixedThreadPool(1);   // 故意只用 1 个线程\n\n    // 请求 1：用户 A —— 忘了 remove\n    pool.submit(() -> {\n        USER.set("user-A");\n        System.out.println("req1 sees: " + USER.get());   // user-A\n        // 缺少 USER.remove()\n    }).get();\n\n    // 请求 2：用户 B —— 还没 set，先读一下（比如打了条日志）\n    pool.submit(() -> {\n        System.out.println("req2 sees: " + USER.get());   // ← 输出 user-A ！越权预演\n        USER.set("user-B");\n        System.out.println("req2 after set: " + USER.get());\n    }).get();\n\n    pool.shutdown();\n}\n\n// 输出：\n// req1 sees: user-A\n// req2 sees: user-A     ← 脏数据：B 读到了 A 的身份\n// req2 after set: user-B\n\n// ✓ 修法：提交任务时统一包装（框架里就是拦截器/AOP 做的事）\nstatic Runnable wrap(Runnable task, String user) {\n    return () -> {\n        try {\n            USER.set(user);\n            task.run();\n        } finally {\n            USER.remove();          // 任务结束必清\n        }\n    };\n}',
                caption:
                  '这段代码的重点是 `req2 sees: user-A` 这一行——**它在单线程本地测试里永远复现不出来**（因为没有线程复用），只有在池化 + 复用的情况下才会出现。这也是为什么「ThreadLocal 泄漏/脏数据」的线上排查特别痛苦：问题不在出错的请求里，而在**上一个**请求里。',
                notes: [
                  { line: 'Executors.newFixedThreadPool(1)', text: '故意只留 1 个线程，让两个任务必然跑在同一个线程上，从而必然复用同一张 `threadLocals`。' },
                  { line: 'System.out.println("req2 sees: " + USER.get());', text: '这一行是关键：req2 还没 `set` 就读到了 req1 的值。真实代码里对应「日志打出了错误的用户」「鉴权用错了身份」。' },
                  { line: '} finally { USER.remove(); }', text: '统一包装是框架层的标准做法（Spring 拦截器、Servlet Filter、gRPC Interceptor 都在干这件事）。' },
                ],
              },
              {
                kind: 'question',
                title: '怎么跨线程传递 ThreadLocal 的值？InheritableThreadLocal 和 TransmittableThreadLocal 的区别？',
                questionId: 'java-03-Q54',
                intent:
                  '进阶题。核心是「ITL 只在创建线程时拷贝一次，线程池复用时不生效」，而 TTL 用「快照 + 回放」解决了这一点。',
                points: [
                  '`InheritableThreadLocal`：重写 `childValue`，在 `Thread` **构造时**（`Thread.init`）从父线程的 `inheritableThreadLocals` **浅拷贝**给子线程',
                  '所以它只在「`new Thread()` 那一刻」传递，**线程创建之后父线程再改，子线程看不到**',
                  '**线程池里必然失效**：池里的线程是启动时就创建好的，任务提交时并不会新建线程，所以「拷贝」根本不会发生',
                  '`TransmittableThreadLocal`（阿里开源 TTL）：不改线程，而是**装饰任务**——`TtlRunnable.get(task)` 在包装时捕获调用线程的快照，在 `run` 前回放到执行线程，`run` 后恢复执行线程原本的值',
                  'TTL 的三个时机：**提交时捕获（capture）→ 执行前回放（replay）→ 执行后恢复（restore）**',
                  'TTL 需要配合 `TtlExecutors.getTtlExecutorService(pool)` 或 Java Agent 才能自动生效（否则每个任务都要手动 `TtlRunnable.get`）',
                  'JDK 21 的结构化并发（`StructuredTaskScope`）在作用域内天然继承作用域值（`ScopedValue`），是另一条路',
                ],
                depth:
                  '「为什么 ITL 用浅拷贝而不是深拷贝」——因为深拷贝无法通用（不知道该拷多深），且开销不可控。浅拷贝意味着子线程和父线程**共享同一个 value 对象**，所以如果 value 是可变的（如 `List`），父子线程会互相改到对方——这是一个隐藏陷阱。TTL 也是浅拷贝（捕获的是引用快照，不是对象的深拷贝）。',
                followup: '「TTL 有什么坑」——① 必须包装任务，漏了就失效（用 Agent 可自动包装，但有版本兼容风险）；② 线程池里的「预热线程」如果先跑了未包装的任务，仍可能有残留；③ 快照是引用，value 可变时父子线程会互相影响；④ 它只解决「传递」，不解决「清理」——仍需 `remove`。',
              },
              {
                kind: 'diagram',
                title: '三种传递方式：拷贝时机完全不同',
                diagram: {
                  type: 'matrix',
                  cols: ['传递时机', '线程池里有效吗', '典型问题'],
                  rows: [
                    ['`ThreadLocal`', '不传递，各线程独立', '—', '跨线程取不到值'],
                    ['`InheritableThreadLocal`', '`new Thread()` 构造时浅拷贝一次', '**无效**（池里不新建线程）', '父线程后续修改子线程看不到'],
                    ['`TransmittableThreadLocal`', '任务提交时捕获、执行前回放、执行后恢复', '**有效**（需包装任务/Agent）', '忘包装则失效；快照是引用非深拷贝'],
                    ['`ScopedValue`（JDK 21 预览）', '作用域内自动继承', '有效（配合结构化并发）', '不可变、只读，作用域结束即失效'],
                  ],
                  caption:
                    '一句话区分：**ITL 是「创建线程时拷贝」，TTL 是「提交任务时快照 + 执行时回放」**。前者绑定线程创建，后者绑定任务边界——而线程池恰恰是「线程复用、任务频繁」的模型，所以只有后者能用。',
                  note: '记忆抓手：`ThreadLocal` 不传递；`InheritableThreadLocal` 传一次（建线程时）；`TTL` 每次任务都传（提交时快照）。',
                },
              },
              {
                kind: 'question',
                title: 'ThreadLocal 有哪些典型应用场景？',
                questionId: 'java-03-Q55',
                intent:
                  '场景题，考「什么时候该用它」。要能说出「避免参数层层传递」与「非线程安全对象的线程封闭」这两类，并给出具体例子。',
                points: [
                  '**上下文传递**：登录用户、租户 ID、traceId、语言/时区——避免在每个方法签名上加参数',
                  '**线程封闭**：`SimpleDateFormat`（非线程安全）、`Random`、`StringBuilder` 等，每个线程一个实例避免加锁',
                  '**事务/连接管理**：Spring 的 `TransactionSynchronizationManager`、MyBatis 的 `SqlSession` 都靠 ThreadLocal 在同一个线程内共享连接',
                  '**框架层隐式上下文**：`RequestContextHolder`（请求属性）、`LocaleContextHolder`（国际化）、日志的 MDC（traceId 进日志）',
                  '**性能优化**：复用创建成本高的对象（如 `MessageDigest`、序列化器），避免每次 new',
                  '反例：**不要用它传「业务参数」**——它让依赖变隐式，方法签名看不出依赖，测试也难写；也不要用来做「线程间通信」（它天生隔离）',
                ],
                depth:
                  '「为什么 `SimpleDateFormat` 要用 ThreadLocal 而不是加锁」——因为加锁会让格式化变成串行（它是 CPU 密集型），而 `ThreadLocal` 让每个线程有独立实例，完全并行。但更好的做法是直接用 `DateTimeFormatter`（不可变、线程安全），从根上不需要 ThreadLocal。**「能用不可变对象解决，就不要用 ThreadLocal」** 是一个重要判断。',
                followup: '「ThreadLocal 会不会影响 GC」——会。它的 value 被 map 强引用，所以 value 引用的对象（及其整个对象图）在线程存活期间都不被回收。这在「缓存大对象到 ThreadLocal」时特别危险，务必 `remove`。',
              },
              {
                kind: 'analogy',
                title: 'ThreadLocal 像每个人自己的抽屉',
                text:
                  '办公室有一排**带锁的抽屉柜**，每个员工（线程）分到**一格专属抽屉**（`threadLocals`）。抽屉的钥匙牌上写着「工位号」（这就是 `ThreadLocal` 对象当 key）。你把私人物品（value）放进自己的抽屉，别人打开自己的抽屉永远看不到你的东西——**这就是天然线程隔离，不需要任何上锁**。',
                mapping: [
                  { real: '每个员工的专属抽屉', tech: '`Thread.threadLocals`（每个线程一个 map）' },
                  { real: '抽屉上的钥匙牌（工位号）', tech: '`ThreadLocal` 对象作为 key' },
                  { real: '你放进去的私人物品', tech: 'value（业务对象）' },
                  { real: '各人开自己的抽屉，互不干扰', tech: '天然线程隔离，零竞争' },
                  { real: '钥匙牌丢了（人离职但抽屉还在）', tech: 'key 被 GC 回收 → stale entry' },
                  { real: '抽屉里的东西还在，但没人能打开', tech: 'value 仍被 Entry 强引用 → 泄漏' },
                  { real: '新员工用了这个旧抽屉，发现了上一个人的东西', tech: '线程池复用 → 脏数据' },
                  { real: '离职前清空抽屉', tech: '`finally { threadLocal.remove(); }`' },
                ],
                limit:
                  '类比到「跨线程传递」就不成立了：现实中你可以把东西交给同事（跨线程传值），而 `ThreadLocal` 严格隔离，**不会也不能**传给别的线程——要传必须换工具（`InheritableThreadLocal` 在「招新人」时拷贝一次，TTL 在「每次派活」时快照）。另外「抽屉」类比容易让人以为 value 是「每个线程各存一份拷贝」，实际上多个线程若共享同一个 `ThreadLocal` 对象，各自存的是**不同 value**，但 value 指向的对象可能是同一个（浅拷贝陷阱）。',
              },
              {
                kind: 'principle',
                title: 'ThreadLocal 的三句话',
                body: [
                  '这一节内容不多，但每条都容易被问倒。最后收成三句话，任何 ThreadLocal 的追问都能从这里展开。',
                ],
                steps: [
                  {
                    title: '第一句：数据在 Thread 里，ThreadLocal 只是钥匙',
                    detail:
                      '这句话能解释「为什么天然线程隔离」（各开各的抽屉）、「为什么线程池会泄漏」（抽屉跟着线程活着）、「为什么不用加锁」（零竞争）。它是所有结论的源头。',
                  },
                  {
                    title: '第二句：key 弱引用、value 强引用，所以弱引用救不了 value',
                    detail:
                      '弱引用只保证「`ThreadLocal` 对象能被回收」，不保证「value 能被回收」。key 一没，value 就成了「拿不回来也回收不了」的黑洞。这是内存泄漏的完整因果，也是「必须 `remove`」的唯一理由。',
                  },
                  {
                    title: '第三句：线程池场景必须 remove，且要放在 finally',
                    detail:
                      '「必须」是因为线程长期存活，「finally」是因为异常路径同样要清。而且这里的第一动机不是省内存，是**防脏数据**——读到上一个请求的身份是真实的数据越权风险。',
                  },
                  {
                    title: '延伸：跨线程传递要换工具',
                    detail:
                      '`ThreadLocal` 严格隔离；`InheritableThreadLocal` 只在 `new Thread()` 时拷贝一次（线程池失效）；`TTL` 用「提交快照 + 执行回放」解决线程池场景。判断依据是「传递发生在什么时候」——建线程时还是每次提交任务时。',
                  },
                ],
                takeaway:
                  '一句话收口：**`ThreadLocal` = 以线程为作用域的变量，靠「数据放在 Thread 里」实现零竞争的隔离，代价是生命周期绑在线程上。** 记住这句，加上「key 弱 value 强」，就够回答 90% 的追问。',
              },
            ],
            outline: [
              '数据存在 Thread.threadLocals 里，ThreadLocal 只是 key；天然隔离、零竞争',
              'ThreadLocalMap 用开放地址法（线性探测），没有链表，惰性清理 stale entry',
              'Entry 的 key 是弱引用、value 是强引用：弱引用只保证 key 可回收，value 仍泄漏',
              '线程池场景风险第一是脏数据（越权），第二才是泄漏；必须 finally 里 remove',
              'ITL 只在 new Thread 时拷贝一次；TTL 用「提交快照 + 执行回放」解决线程池传递',
            ],
            pitfalls: [
              '说数据存在 ThreadLocal 实例里：实际在 Thread 的 threadLocals 字段中',
              '以为 key 是弱引用就不会泄漏：value 是强引用，key 回收后 value 仍被 Entry 持有',
              '在线程池里指望 InheritableThreadLocal 传递上下文：池里不新建线程，拷贝不发生',
            ],
          },
        },
        {
          id: 'juc-tools',
          title: 'JUC 工具类与并发容器',
          kind: 'concept',
          sources: [
            { topic: 'java-03', chapters: ['JUC 并发工具类'] },
            { topic: 'java-03', chapters: ['并发容器'] },
          ],
          content: {
            intro:
              '`CountDownLatch`、`CyclicBarrier`、`Semaphore` 三个工具经常被混着问，区别其实在语义：一个**等别人到齐**、一个**等彼此到齐**、一个**控制同时进入的数量**。它们大多建在 AQS 的共享模式上，所以理解了 AQS，这一节只是「换一种 `state` 语义」。后半节转向并发容器：`ConcurrentHashMap` 1.8 的 `put` 流程、`CopyOnWriteArrayList` 的写时复制、`BlockingQueue` 的实现选择。两块放一起讲，是因为它们常常组合出现——「用 `CountDownLatch` 等 3 个线程跑完再汇总」本身就离不开线程池。',
            sections: [
              {
                kind: 'concept',
                title: '三个工具，三种「等待」',
                body: [
                  '**`CountDownLatch` 等的是「别人做完事」**：一个或多个线程在 `await()` 上等，其他线程每完成一件事就 `countDown()`。计数到 0，所有等待者一起放行。注意方向：**等待者不干活，干活者不等待**。典型场景是「主线程等 N 个子任务初始化完成」。',
                  '**`CyclicBarrier` 等的是「彼此到齐」**：N 个线程各自跑到 `await()`，最后一个到达的线程会执行一个可选的回调（`barrierCommand`），然后**所有线程一起继续**。它的特点是**可以循环使用**（`reset()` 或自动进入下一代），适合「分阶段计算，每阶段结束要同步一次」。',
                  '**`Semaphore` 管的不是「等」，而是「同时能有多少个」**：`acquire()` 拿许可、`release()` 还许可。许可为 0 时 `acquire` 阻塞。它是**限流器**，不是屏障——拿到许可的线程之间不需要彼此等待，各自跑各自的。',
                  '一个常被问的差别：`CountDownLatch` 的计数**只能减不能加、到 0 就不能重置**（所以叫「一次性」）；`CyclicBarrier` 会自动进入下一代（计数重置），所以叫「循环栅栏」。这个「能不能复用」是最容易记混的一点。',
                ],
                term: {
                  name: '屏障（Barrier）vs 闩锁（Latch）',
                  def: 'Latch 是「等到计数归零就永久打开」，一次性；Barrier 是「等到 N 方到齐就打开，然后重置进入下一代」，可循环。前者的等待者与倒计数者是两组线程，后者是同一组线程互相等待。',
                },
                points: [
                  '`CountDownLatch`：等别人做完（等待者与执行者分离），一次性',
                  '`CyclicBarrier`：等彼此到齐（同一组线程互相等），可循环，最后到达者执行回调',
                  '`Semaphore`：控制并发数量（不是屏障），`acquire`/`release` 许可',
                  '三者都可设置超时（`await(timeout)` / `tryAcquire(timeout)`），生产环境应总是设超时',
                ],
              },
              {
                kind: 'question',
                title: 'CountDownLatch、CyclicBarrier、Semaphore 的区别？',
                questionId: 'java-03-Q56',
                intent:
                  '高频对比题。要按「等谁 / 能不能复用 / 底层是什么」三个维度说清，别只背场景。',
                points: [
                  '**`CountDownLatch`**：等**其他线程**完成任务。`await()` 阻塞，`countDown()` 减计数，到 0 全部放行。**一次性**，不可重置',
                  '**`CyclicBarrier`**：等**彼此**到齐。N 个线程各自 `await()`，最后一个到达者执行 `barrierCommand`，然后全部继续。**可循环**',
                  '**`Semaphore`**：控制**同时访问的数量**。`acquire()` 拿许可（可多个），`release()` 归还；不是屏障，许可持有者之间不互相等待',
                  '**底层**：`CountDownLatch` / `Semaphore` 基于 AQS **共享模式**（`state` = 计数 / 许可数）；`CyclicBarrier` 基于 `ReentrantLock` + `Condition`（`state` 概念不适用）',
                  '**异常处理**：`CyclicBarrier` 有一个线程被中断或超时，栅栏会 `broken`，其他线程抛 `BrokenBarrierException`；`CountDownLatch` 没有「破损」概念',
                  '**典型场景**：`CountDownLatch` = 主线程等子任务初始化完；`CyclicBarrier` = 分阶段计算每阶段同步；`Semaphore` = 接口限流 / 连接池',
                ],
                depth:
                  '「为什么 `CountDownLatch` 不能重置」——因为它的 `state` 一旦减到 0，AQS 的共享模式会让**所有** `acquireShared` 立即成功（`state == 0` 直接返回成功）。要「重置」就得把 `state` 加回去，但那些已经在 `await` 上被唤醒的线程无法「重新等待」——语义上做不到。所以 JDK 干脆不给重置，需要循环就用 `CyclicBarrier` 或 `Phaser`。',
                followup: '「`Semaphore` 能当锁用吗」——`new Semaphore(1)` 确实能实现互斥，但它**不记录持有者**，所以任何线程都能 `release`（甚至没 `acquire` 过），也就不能重入。要「互斥 + 可重入」必须用 `ReentrantLock`。',
              },
              {
                kind: 'diagram',
                title: '三者的语义差别：一张表定清',
                diagram: {
                  type: 'matrix',
                  cols: ['在等什么', '能否复用', '底层实现'],
                  rows: [
                    ['`CountDownLatch`', '等别人把计数减到 0', '**不能**（一次性）', 'AQS 共享模式，`state` = 计数'],
                    ['`CyclicBarrier`', '等彼此都到齐（N 方）', '**能**（自动进入下一代）', '`ReentrantLock` + `Condition` + `parties`'],
                    ['`Semaphore`', '等有可用许可（限流）', '能（许可可反复借还）', 'AQS 共享模式，`state` = 许可数'],
                    ['`Phaser`', '等某个阶段的所有参与者', '能，且可动态增减参与者', '内部用 `state` 拆成 phase + parties'],
                    ['`Exchanger`', '等另一个线程来交换数据', '能（一次交换一轮）', '`Slot` / `Node` + CAS + `park`'],
                  ],
                  caption:
                    '读表的顺序是「在等什么」——这一列决定了其他所有列。特别注意 `CyclicBarrier` 是唯一**不用 AQS** 的：因为它需要「最后一个到达者执行回调 + 全部一起放行 + 重置」这套复杂语义，用 `ReentrantLock` + `Condition` 表达更直接。',
                },
              },
              {
                kind: 'analogy',
                title: '等快递、集合发车、停车场车位',
                text:
                  '**`CountDownLatch` 像等快递**：你（主线程）在家等，5 个包裹（子任务）陆续到，每到一个划掉一个（`countDown`），**5 个全到才出门**。包裹不会因为你等就变快，你也只需等这一次——明天再等就得重新下单（不能重置）。**`CyclicBarrier` 像旅行团集合发车**：10 个人（10 个线程）各自逛，导游说「都到齐了才发车」，**最后一个上车的人负责关门**（`barrierCommand`），然后车开往下一站（下一代）。到下一站又要重新集合。**`Semaphore` 像停车场车位**：只有 5 个车位，**第 6 辆车只能在门口等**（`acquire` 阻塞），有车走了（`release`）才能进。车位上的车之间不需要互相等，各停各的。',
                mapping: [
                  { real: '你在家等 5 个包裹', tech: '`await()` 阻塞的主线程' },
                  { real: '每到一个包裹划掉一个', tech: '`countDown()` 减 `state`' },
                  { real: '全到才出门，且只等这一次', tech: '一次性，不能重置' },
                  { real: '旅行团 10 人集合发车', tech: '`CyclicBarrier(10)`' },
                  { real: '最后一个上车的人关门', tech: '`barrierCommand`（最后到达者执行）' },
                  { real: '到下一站重新集合', tech: '自动进入下一代（可循环）' },
                  { real: '只有 5 个车位', tech: '`new Semaphore(5)`' },
                  { real: '第 6 辆车在门口等', tech: '`acquire()` 阻塞' },
                  { real: '有车走了才能进', tech: '`release()` 归还许可' },
                ],
                limit:
                  '类比到「失败场景」就不成立了：现实中「一个包裹丢了」你还可以继续等别的，而 `CountDownLatch` 的 `countDown` 若因异常漏调，`await` 会**永久挂住**（所以必须写在 `finally` 里）；旅行团里「有人走丢了」，现实中导游可以决定发车，而 `CyclicBarrier` 一旦某个线程中断/超时，栅栏就**broken**，所有等待者抛 `BrokenBarrierException`——没有「部分人继续走」的选项。',
              },
              {
                kind: 'question',
                title: 'CountDownLatch 和 Semaphore 的底层原理？',
                questionId: 'java-03-Q57',
                intent:
                  '落到 AQS 共享模式。要能说清「state 代表什么」「哪个方法对应 acquireShared / releaseShared」。',
                points: [
                  '`CountDownLatch`：内部 `Sync extends AbstractQueuedSynchronizer`，`state` = 剩余计数',
                  '`countDown()` → `releaseShared(1)` → `tryReleaseShared` 用 CAS 把 `state - 1`，减到 0 返回 true → 唤醒所有等待者',
                  '`await()` → `acquireSharedInterruptibly(1)` → `tryAcquireShared` 返回 `state == 0 ? 1 : -1`，**只有一个线程能拿到 state 时全部放行**',
                  '关键：`tryAcquireShared` 返回正数表示「成功且后继也能成功」——这就实现了「计数归零后所有等待者一起放行」的广播效果',
                  '`Semaphore`：`state` = 剩余许可数。`acquire()` → `tryAcquireShared(-1)` CAS 减；`release()` → `tryReleaseShared` CAS 加',
                  '`Semaphore` 支持一次拿多个许可（`acquire(n)`），也支持公平/非公平（构造器第二参数）',
                  '`CountDownLatch` 没有公平性选项，因为它的 `state` 只减不加，不存在「插队」问题',
                ],
                depth:
                  '`CountDownLatch.tryAcquireShared` 返回 `1` 而不是 `0` 的用意：返回 `0` 表示「我成功了，但后继不一定能成功」，AQS 就不会继续向后传播唤醒；返回 `1` 表示「我成功了，后继也可能成功」，AQS 会**继续唤醒下一个**。这就是「一次 `countDown` 让所有 `await` 者同时醒来」的实现机制——**靠传播，而不是靠遍历唤醒**。',
                followup: '「`CountDownLatch.await` 能被中断吗」——`await()` 可以（抛 `InterruptedException`），`awaitUninterruptibly()` 不行。所以「既想等又不想被中断」用后者，但要注意它可能永久阻塞。',
              },
              {
                kind: 'code',
                title: '三个工具的典型写法',
                lang: 'java',
                code:
                  '// ① CountDownLatch：主线程等 3 个服务初始化完成\nCountDownLatch latch = new CountDownLatch(3);\nfor (String svc : List.of("db", "cache", "mq")) {\n    pool.execute(() -> {\n        try {\n            init(svc);\n        } catch (Exception e) {\n            log.error("init failed: " + svc, e);\n        } finally {\n            latch.countDown();          // ← 必须 finally，否则异常会导致永久挂住\n        }\n    });\n}\nlatch.await(30, TimeUnit.SECONDS);    // 生产环境必带超时\nSystem.out.println("all ready, q=" + latch.getCount());   // 0\n\n// ② CyclicBarrier：分两阶段计算，每阶段同步一次\nCyclicBarrier barrier = new CyclicBarrier(3, () ->\n        System.out.println("--- 全部到齐，本阶段结束 ---"));\nfor (int i = 0; i < 3; i++) {\n    final int id = i;\n    pool.execute(() -> {\n        try {\n            phaseOne(id);\n            barrier.await();             // 等其他人做完 phaseOne\n            phaseTwo(id);                // 此时所有线程都完成了 phaseOne\n            barrier.await();             // 等其他人做完 phaseTwo\n        } catch (BrokenBarrierException | InterruptedException e) {\n            Thread.currentThread().interrupt();\n        }\n    });\n}\n\n// ③ Semaphore：限制同时访问下游的并发数\nSemaphore permits = new Semaphore(5);   // 最多 5 个并发\nfor (int i = 0; i < 100; i++) {\n    pool.execute(() -> {\n        boolean ok = false;\n        try {\n            if (!permits.tryAcquire(1, TimeUnit.SECONDS)) {   // 带超时，别无限等\n                log.warn("限流拒绝");\n                return;\n            }\n            ok = true;\n            callDownstream();\n        } catch (InterruptedException e) {\n            Thread.currentThread().interrupt();\n        } finally {\n            if (ok) permits.release();       // ← 只有真正拿到许可才还\n        }\n    });\n}',
                caption:
                  '三段代码里最重要的都是 `finally`：`countDown` 漏调会导致永久挂住，`release` 漏调会导致许可泄漏（最终没人能拿到）。**「许可泄漏」比「计数少减」更隐蔽**——它表现为「限流器逐渐变严格，最后完全卡死」，而日志里什么都没有。',
                notes: [
                  { line: 'latch.countDown();  // 必须 finally', text: '如果 `init(svc)` 抛异常且没 `finally`，`await` 会永远等下去。这是 `CountDownLatch` 最常见的事故形态。' },
                  { line: 'barrier.await();', text: '抛 `InterruptedException` 与 `BrokenBarrierException`。后者表示「栅栏被别的线程打破了」，此时整轮计算作废，不能重试当前阶段。' },
                  { line: 'if (ok) permits.release();', text: '只在 `tryAcquire` 成功后才 `release`。若在 `finally` 里无条件 `release`，超时没拿到的分支会「凭空多还一个许可」，限流就失效了。' },
                ],
              },
              {
                kind: 'question',
                title: 'Exchanger 和 Phaser 了解吗？',
                questionId: 'java-03-Q58',
                intent:
                  '两个冷门但容易问到的类。答出「两两交换」和「可重用的多阶段栅栏」就够了，能补充限制更好。',
                points: [
                  '**`Exchanger<V>`**：两个线程在 `exchange(v)` 处**交换数据**，双方都到达才一起返回对方的值。适合「生产者与消费者成对交换缓冲区」、遗传算法、流水线',
                  '`Exchanger` 的 `exchange` 只支持**两方**；三方以上同时到达的行为是「随机两两配对」，语义上不保证谁和谁配',
                  '实现：内部 `Slot` / `Node` + CAS + `park/unpark`，不用 AQS',
                  '**`Phaser`**：可重用的**多阶段栅栏**，支持**动态注册/注销参与者**（`register` / `arriveAndDeregister`）',
                  '`Phaser` 可以看作「`CountDownLatch` + `CyclicBarrier` 的超集」：既能等（`arriveAndAwaitAdvance`）、又能分阶段（phase 递增）、还能增减参与者',
                  '`Phaser` 的关键方法：`arrive()`（到达但不等待）、`arriveAndAwaitAdvance()`（到达并等全到）、`arriveAndDeregister()`（到达并退出）',
                  '`Phaser` 的 `state` 被拆成「phase（高 32 位）+ parties（低 16 位）+ unarrived（次 16 位）」——又是一个「一个 long 塞多个字段」的设计',
                ],
                depth:
                  '「`Phaser` 的典型用途」——分阶段且**参与者数量会变**的并行计算。比如「第一阶段 10 个任务，第二阶段只需要其中 3 个继续」：`CyclicBarrier` 必须固定 parties，做不到；`Phaser` 用 `arriveAndDeregister()` 让 7 个线程退出，剩 3 个继续下一阶段。这是它不可替代的场景。',
                followup: '「`Exchanger` 会不会死锁」——会。如果只有一方调 `exchange`，它会一直等（或超时抛 `TimeoutException`）。且 `Exchanger` 是**可重用**的，但每次交换要求双方「同时到达同一个配对点」，所以任务负载不均时容易长时间等待。',
              },
              {
                kind: 'question',
                title: '场景题：3 个线程并发执行、1 个线程等它们全部完成后汇总，怎么做？',
                questionId: 'java-03-Q59',
                intent:
                  '场景题，考「能给出几种方案并说清取舍」。只答 `CountDownLatch` 不够，要能说出 `CompletableFuture` / `invokeAll` 两种更现代的写法。',
                points: [
                  '**方案一：`CountDownLatch`** —— `new CountDownLatch(3)`，3 个子线程 `finally` 里 `countDown`，主线程 `await(超时)` 后汇总。最直观，兼容 JDK 5+',
                  '**方案二：`CompletableFuture.allOf`** —— `allOf(f1, f2, f3).join()`，天然支持「取每个结果」「异常传播」，**推荐用于新代码**',
                  '**方案三：`ExecutorService.invokeAll(tasks)`** —— 一次提交一组 `Callable`，返回 `List<Future>`，`invokeAll` 本身就会等全部完成',
                  '**方案四：`CyclicBarrier`** —— 用 4 方栅栏（3 个子任务 + 1 个汇总），但注意栅栏里「汇总」会和子任务**同时被放行**，不是「汇总等它们」，语义不自然，**不推荐**',
                  '**方案五：`Phaser`** —— 3 个任务 `arriveAndAwaitAdvance`，汇总线程 `register` 后也在同一 phase 等待；适合阶段更多的场景',
                  '关键细节：所有方案都必须**处理超时**与**异常**——某个子任务挂了不能导致汇总永远等下去',
                ],
                depth:
                  '为什么「`CyclicBarrier` 不适合这个场景」值得说清楚：`CyclicBarrier` 的语义是「所有参与者互相等，然后一起走」，它**没有「等待者」这个角色**——第 4 个线程（汇总）也会被当作参与者，它到达后如果另外 3 个还没到，它也在等；3 个到了之后，**4 个一起放行**，此时汇总线程跑的同时子任务可能还在跑自己的后续代码。要「严格等子任务完全结束」，用 `CountDownLatch` 或 `allOf` 才是对的。',
                followup: '「如果 3 个任务里有 1 个失败怎么办」——`CountDownLatch` 方案需要自己在子线程里捕获异常并记录（否则 `countDown` 可能漏调）；`CompletableFuture.allOf` 在 `join` 时抛 `CompletionException`，但**只会抛出其中一个**异常，要看全部需要逐个 `handle`。这是 `allOf` 的一个常见坑。',
              },
              {
                kind: 'code',
                title: '同一个场景，两种现代写法',
                lang: 'java',
                code:
                  '// ◆ 方案二：CompletableFuture.allOf（推荐）\npublic Report aggregate() {\n    CompletableFuture<PartA> fa = CompletableFuture.supplyAsync(this::loadA, pool);\n    CompletableFuture<PartB> fb = CompletableFuture.supplyAsync(this::loadB, pool);\n    CompletableFuture<PartC> fc = CompletableFuture.supplyAsync(this::loadC, pool);\n\n    CompletableFuture<Void> all = CompletableFuture.allOf(fa, fb, fc);\n    return all.thenApply(v -> new Report(\n                    fa.join(), fb.join(), fc.join()))   // allOf 完成后 join 不会阻塞\n              .orTimeout(3, TimeUnit.SECONDS)               // 整体超时\n              .exceptionally(e -> Report.fallback(e))       // 任一失败则降级\n              .join();\n}\n\n// ◆ 方案三：invokeAll（一次提交一批，天然等全部完成）\npublic Report aggregate2() throws InterruptedException {\n    List<Callable<Object>> tasks = List.of(\n            this::loadA, this::loadB, this::loadC);\n    List<Future<Object>> futures = pool.invokeAll(tasks, 3, TimeUnit.SECONDS);\n    // invokeAll 返回时所有任务都已结束（或被取消）\n    Object[] parts = new Object[3];\n    for (int i = 0; i < futures.size(); i++) {\n        Future<Object> f = futures.get(i);\n        parts[i] = f.isCancelled() ? null : f.get();   // 超时会被 cancel\n    }\n    return new Report(parts[0], parts[1], parts[2]);\n}\n\n// ◆ 方案一：CountDownLatch（最朴素，兼容性最好）\npublic Report aggregate3() throws InterruptedException {\n    CountDownLatch latch = new CountDownLatch(3);\n    AtomicReference<PartA> a = new AtomicReference<>();\n    pool.execute(() -> { try { a.set(loadA()); } finally { latch.countDown(); } });\n    pool.execute(() -> { try { /* loadB */ } finally { latch.countDown(); } });\n    pool.execute(() -> { try { /* loadC */ } finally { latch.countDown(); } });\n    if (!latch.await(3, TimeUnit.SECONDS)) {\n        log.warn("timeout, use partial result");\n    }\n    return new Report(a.get(), null, null);\n}',
                caption:
                  '三种写法的取舍：`allOf` 最表达力强（能组合、能链式降级），但异常处理要小心；`invokeAll` 最省事（一次调用搞定「提交 + 等待 + 超时取消」），但不支持不同返回类型（都是 `Future<Object>`）；`CountDownLatch` 最底层，需要自己管理结果容器（`AtomicReference` 之类）。**新代码优先 `allOf`。**',
                notes: [
                  { line: 'fa.join(), fb.join(), fc.join()', text: '在 `allOf` 的 `thenApply` 里 `join` 不会阻塞——因为 `allOf` 保证三个都已完成。这是写法上的关键便利。' },
                  { line: '.orTimeout(3, TimeUnit.SECONDS)', text: 'JDK 9+ 的方法，超时后以 `TimeoutException` 完成。JDK 8 需自己用 `ScheduledExecutorService` 实现。' },
                  { line: 'pool.invokeAll(tasks, 3, TimeUnit.SECONDS)', text: '超时的任务会被 `cancel(true)`（尝试中断），所以返回的 `Future` 可能 `isCancelled()` 为 true。' },
                ],
              },
              {
                kind: 'concept',
                title: '并发容器：三条线，各自的「无锁」策略',
                body: [
                  '`java.util.concurrent` 里的容器不是「给老容器加锁」，而是**换一种数据结构**来避免锁。按用途分三条线：`Map`（`ConcurrentHashMap` / `ConcurrentSkipListMap`）、`List`/`Set`（`CopyOnWriteArrayList` / `CopyOnWriteArraySet`）、`Queue`（`BlockingQueue` 家族 / `ConcurrentLinkedQueue`）。',
                  '它们的「并发策略」只有四种，认清策略就认清了容器：**① 细粒度锁**（`ConcurrentHashMap` 锁单个桶）、**② 写时复制**（`CopyOnWrite*` 写时复制整个数组）、**③ 无锁 CAS**（`ConcurrentLinkedQueue`、`ConcurrentSkipListMap` 的插入）、**④ 阻塞队列**（`BlockingQueue` 用锁 + Condition 实现生产者消费者）。',
                  '一个反直觉的结论：**并发容器只保证「单个操作」的原子性，不保证「组合操作」**。`if (!map.containsKey(k)) map.put(k, v)` 仍然有竞态，必须用 `putIfAbsent` / `computeIfAbsent`。这是「用并发容器却依然线程不安全」的最主要原因。',
                  '另外要注意：并发容器的**迭代器都是弱一致**的（`weakly consistent`），不抛 `ConcurrentModificationException`，但也不保证看到全部修改。所以「遍历时统计元素个数」这类操作得到的是近似值。',
                ],
                term: {
                  name: '弱一致性迭代器',
                  def: '遍历过程中不抛 ConcurrentModificationException，能反映「遍历开始后发生的部分修改」，但不保证看到全部，也不保证是某一时刻的快照。ConcurrentHashMap、ConcurrentLinkedQueue 都是这种语义。',
                },
                points: [
                  '四种并发策略：细粒度锁（CHM）、写时复制（COW）、无锁 CAS（CLQ）、阻塞队列（BQ）',
                  '并发容器只保证单操作原子，**组合操作仍需** `putIfAbsent` / `computeIfAbsent` / `merge`',
                  '迭代器弱一致：不抛 CME，但也不保证看到全部修改',
                  '`BlockingQueue` 是「并发 + 阻塞 + 通信」三合一，生产者消费者的标准答案',
                ],
              },
              {
                kind: 'question',
                title: 'ConcurrentHashMap 在 JDK 8 中是如何保证线程安全的？put 流程说一下',
                questionId: 'java-03-Q60',
                intent:
                  '本节最核心的一题。必须能按步骤讲完 `put`，并强调「空桶用 CAS、非空桶用 synchronized 锁桶首」。',
                points: [
                  '① 计算 `spread(h)`：`(h ^ (h >>> 16)) & HASH_BITS`，高位参与运算并清掉符号位（负数 hash 保留特殊用途：`MOVED = -1`、`TREEBIN = -2`）',
                  '② `table` 为 null → `initTable()`：用 CAS 把 `sizeCtl` 从负数（表示「正在初始化」）改成容量值，**只有一个线程能初始化**，其余 `yield` 自旋等待',
                  '③ 定位桶 `i = (n - 1) & hash`，**桶为空 → 直接 `casTabAt` 插入**（无锁，第一步 CAS）',
                  '④ 桶首节点 `hash == MOVED(-1)` → 说明正在**扩容**，当前线程去**帮忙迁移**（`helpTransfer`）',
                  '⑤ 否则 `synchronized (f)` **锁住桶首节点**，在链表/红黑树里查找：key 存在则覆盖 value，不存在则尾插（链表）或插入红黑树',
                  '⑥ `addCount(1, binCount)`：更新计数（`baseCount` + `CounterCell[]`，类似 `LongAdder`），并检查是否需要扩容（`sizeCtl` 阈值）',
                  '⑦ 链表长度 ≥ 8 且 table 容量 ≥ 64 → `treeifyBin` 转红黑树；容量 < 64 时优先扩容（因为小表转树不划算）',
                ],
                depth:
                  '「为什么 1.8 用 `synchronized` 而不是 `ReentrantLock`」——三个理由：① 锁粒度已经是「单个桶」，竞争极低，`synchronized` 的锁升级在低竞争下开销更小；② 少一个对象（`ReentrantLock` 要额外分配），内存更省；③ `synchronized` 不会忘记解锁，代码更简洁。**这是「JDK 6 之后 synchronized 已优化」的直接体现**，也是面试里很好的加分点。',
                followup: '「`sizeCtl` 有几种取值」——`0`：默认（还未初始化）；`-1`：正在初始化；`-N`：正在扩容，有 `N-1` 个线程在帮忙；正数：扩容阈值（容量 × 0.75）。这个「一个字段表达多种状态」和线程池的 `ctl` 是同一套思路。',
              },
              {
                kind: 'question',
                title: '为什么 JDK 8 要放弃分段锁？size() 是怎么实现的？',
                questionId: 'java-03-Q61',
                intent:
                  '两个点：分段锁的缺陷（并发度固定 + 内存浪费），以及 `size()` 从「两次遍历」变成「CounterCell 求和」。',
                points: [
                  'JDK 7 是 **Segment 数组 + HashEntry 数组**，每个 Segment 继承 `ReentrantLock`，锁粒度是「一个 Segment」（默认 16 个，即并发度 16）',
                  '缺陷一：**并发度固定**——初始 16 个 Segment 就无法再增加，高并发下仍然会争同一个 Segment',
                  '缺陷二：**内存浪费**——即使表很小，也要分配 16 个 Segment（每个都是 `ReentrantLock` 对象）',
                  '缺陷三：**锁粒度粗**——一个 Segment 管若干个桶，改一个桶就锁住一片',
                  'JDK 8 改为「**Node 数组 + 链表 + 红黑树**」，锁粒度细到**单个桶首节点**，并发度 ≈ 桶数量（可随扩容增长）',
                  '`size()` 在 JDK 7 是「先无锁试算两次（累加各 Segment 的 `count`），不一致则全部加锁再算」——最坏要锁全表',
                  '`size()` 在 JDK 8 改为 **`baseCount` + `CounterCell[]` 分片累加**（借鉴 `LongAdder`）：`sumCount()` 遍历所有 Cell 求和，**不加锁**',
                  '代价：`size()` 是**近似值**（并发累加时可能偏小），这是「用精确性换吞吐」的取舍',
                ],
                depth:
                  '为什么 `baseCount` 要加 `CounterCell[]`：如果所有线程都 CAS 同一个 `baseCount`，高并发下会大量失败重试（热点）。用 Cell 数组 + 线程 probe 分散后，每个线程打不同的 Cell，最后求和——这就是 `LongAdder` 的做法，`ConcurrentHashMap` 直接内联了一份（`Striped64` 的简化版，没有继承）。',
                followup: '「为什么 1.7 的 `size()` 要「试两次再全锁」」——因为它想让「无竞争时的调用」完全无锁。做法是「先累加两次，若两次结果相同就认为没有并发修改，直接返回」；不同则说明有人在改，必须加锁。这是一个很实用的「乐观 + 校验」技巧。',
              },
              {
                kind: 'diagram',
                title: 'CHM 两代结构：从「锁一段」到「锁一桶」',
                diagram: {
                  type: 'split',
                  left: {
                    title: 'JDK 7：Segment 分段锁',
                    tone: 'warn',
                    items: [
                      'Segment[16] 数组，每个继承 ReentrantLock',
                      '每个 Segment 内含一个 HashEntry 数组',
                      '并发度 = Segment 数量（默认 16，固定）',
                      '锁粒度：一个 Segment（管若干桶）',
                      'size()：两次无锁试算，不一致则锁全表',
                      '内存：表很小也要 16 个 Lock 对象',
                    ],
                  },
                  right: {
                    title: 'JDK 8：桶级锁 + CAS',
                    tone: 'good',
                    items: [
                      'Node[] 数组 + 链表 + 红黑树（同 HashMap）',
                      '空桶：CAS 插入（无锁）',
                      '非空桶：synchronized 锁桶首节点',
                      '并发度 ≈ 桶数量，随扩容增长',
                      'size()：baseCount + CounterCell[] 分片求和',
                      '扩容：多线程协同迁移（helpTransfer）',
                    ],
                  },
                  caption:
                    '两代的核心差别是**锁的粒度从「一段」变成「一个桶」**，同时把「无竞争路径」做到了完全无锁（CAS）。注意右边第 6 条：JDK 8 的扩容是**协作式**的——发现 `MOVED` 就帮忙迁移，把「扩容」这个原本要 STW 的操作拆成了多个线程并行做。',
                },
              },
              {
                kind: 'question',
                title: 'CopyOnWriteArrayList 的原理？有什么优缺点？',
                questionId: 'java-03-Q62',
                intent:
                  '核心是「写时复制整个数组 + 读完全无锁」。优缺点都要说，尤其是「内存翻倍」与「迭代器看不到新元素」。',
                points: [
                  '写操作（`add`/`set`/`remove`）：**加 `ReentrantLock`** → 复制出一个新数组（长度 ±1）→ 在新数组上修改 → 把 `volatile array` 指向新数组',
                  '读操作（`get`/`iterator`）：**完全无锁**，直接读 `array` 引用（`volatile` 保证可见性）',
                  '优点一：**读性能极高**，且读之间无任何同步',
                  '优点二：**读写不互斥**——读线程永远能读到一个完整一致的数组（要么旧数组要么新数组）',
                  '优点三：**迭代器不会抛 CME**，因为它遍历的是创建时的那份数组快照',
                  '缺点一：**内存开销**——每次写都要复制整个数组，瞬时内存翻倍；数组很大时很痛',
                  '缺点二：**写性能差**——O(n) 复制，且写写互斥',
                  '缺点三：**数据最终一致但非实时**——迭代器看不到遍历开始后的修改',
                  '缺点四：`iterator().remove()` 抛 `UnsupportedOperationException`，必须用 `list.remove()`',
                  '适用：**读极多、写极少**（监听器列表、黑白名单、配置快照）；不适用：写频繁或数组很大',
                ],
                depth:
                  '为什么它「读不需要 volatile 读的代价」——因为 `array` 字段本身是 `volatile`，读它会走 volatile 语义（禁止重排、保证可见），但没有锁、没有 CAS、没有缓存行争抢。所以它的读成本 ≈ 一次普通数组访问 + 一次 volatile 读，比 `synchronized` 快得多。这也是「读多写少」场景的最佳解。',
                followup: '「`CopyOnWriteArraySet` 怎么实现的」——内部就是一个 `CopyOnWriteArrayList`，`add` 前先 `contains` 判断（`addIfAbsent`），O(n) 查找。所以元素多时性能很差，它只适合「元素少且读多」的集合。',
              },
              {
                kind: 'question',
                title: 'ArrayBlockingQueue 和 LinkedBlockingQueue 的区别？',
                questionId: 'java-03-Q63',
                intent:
                  '在并发课里的重点不是「数组 vs 链表」，而是「一把锁 vs 两把锁」带来的吞吐差异，以及「必须指定容量 vs 默认无界」的稳定性差异。',
                points: [
                  '**结构**：`ArrayBlockingQueue` 用定长数组 + `putIndex`/`takeIndex` 循环；`LinkedBlockingQueue` 用链表 + 按需 `new Node`',
                  '**锁**：前者**一把锁**（`ReentrantLock`）管入队出队，互斥；后者**两把锁**（`putLock` / `takeLock`），入队与出队可并行',
                  '**计数**：前者 `int count`（同一把锁保护）；后者 `AtomicInteger count`（两把锁都要读写它）',
                  '**容量**：前者**必须指定**；后者构造器可不传，默认 `Integer.MAX_VALUE`（≈ 无界，易堆积 OOM）',
                  '**内存**：前者预先分配整个数组（空时也占满）；后者按元素分配 Node（含 `next` 引用，单元素开销更大）',
                  '**吞吐**：高并发生产消费场景下 `LinkedBlockingQueue` 更高（两把锁分离了入队与出队的竞争）',
                  '**选型**：要稳定可预测 → `ArrayBlockingQueue`；要吞吐且能明确容量 → `LinkedBlockingQueue` 但**必须传容量**',
                ],
                depth:
                  '为什么 `LinkedBlockingQueue` 能用两把锁：队首与队尾是**不同节点**，一个线程改 `head.next`、另一个改 `tail.next`，只要计数用 `AtomicInteger` 协调，就不会互相干扰。而循环数组的 `putIndex`/`takeIndex` 在「满/空」判定上相互依赖（判断满要看对方位置），难以拆锁。**这是「数据结构决定并发粒度」的经典案例**——在集合课程里我们从「缓存局部性」角度比过，这里从「锁粒度」角度再看一次，两个视角合起来才是完整的。',
              },
              {
                kind: 'question',
                title: 'BlockingQueue 的常用方法分几类？',
                questionId: 'java-03-Q64',
                intent:
                  '考 API 设计的「四象限」：抛异常 / 返回特殊值 / 阻塞 / 超时。能画出这张表就说明真用过。',
                points: [
                  '按「失败时怎么办」分四类，每类对应三个操作（插入 / 移除 / 检查）',
                  '**抛异常**：`add(e)` / `remove()` / `element()`',
                  '**返回特殊值**：`offer(e)` → false / `poll()` → null / `peek()` → null',
                  '**阻塞**：`put(e)` / `take()`（无超时，可能永久阻塞）',
                  '**超时**：`offer(e, t, unit)` / `poll(t, unit)`（返回 false / null 表示超时）',
                  '为什么没有「阻塞版的检查」：`peek` 不会因为队列空而失败——它返回 null 就是「空」的答案，没有等的必要',
                  '`BlockingQueue` 不允许 `null` 元素（`null` 被用作 `poll` 的「空」返回值，无法区分）',
                  '`LinkedBlockingDeque` 在此之上补齐十二个双端方法（`putFirst`/`takeLast` 等）',
                ],
                depth:
                  '「`put` 和 `offer(t)` 该用哪个」——`put` 会无限阻塞，一旦消费者挂了，生产者线程就永久卡住（线程池里就是线程泄漏）。**生产环境应该优先用 `offer(e, t, unit)`**：超时就返回 false，让你有机会降级、告警或丢弃。这和「所有等待都该带超时」是同一条工程原则。',
              },
              {
                kind: 'diagram',
                title: 'BlockingQueue 的四象限',
                diagram: {
                  type: 'matrix',
                  cols: ['插入', '移除', '检查'],
                  rows: [
                    ['**抛异常**', '`add(e)` → `IllegalStateException`', '`remove()` → `NoSuchElementException`', '`element()` → 同上'],
                    ['**返回特殊值**', '`offer(e)` → `false`', '`poll()` → `null`', '`peek()` → `null`'],
                    ['**阻塞（无超时）**', '`put(e)`', '`take()`', '—（无意义）'],
                    ['**阻塞（带超时）**', '`offer(e, t, unit)`', '`poll(t, unit)`', '—（无意义）'],
                  ],
                  caption:
                    '记忆方式：**横着看是「同一个操作的不同失败策略」，竖着看是「失败策略的四种强度」**。生产代码里最常用的是右下区域（`offer(e,t,u)` / `poll(t,u)`）——**带超时的阻塞**是唯一既不会丢任务、又不会永久卡死的选择。',
                  note: '注意「检查」列只有两行：`peek` 本身就是「看一眼，没有就返回 null」，不存在「阻塞等待有元素再 peek」的需求。',
                },
              },
              {
                kind: 'principle',
                title: '工具与容器的选型三问',
                body: [
                  '这一节东西多，但选型其实只有三个问题。答完这三问，用哪个类就定了。',
                ],
                steps: [
                  {
                    title: '第一问：我是「等」还是「限」？',
                    detail:
                      '等 → 屏障类（`CountDownLatch` 等别人、`CyclicBarrier` 等彼此、`Phaser` 等某阶段）。限 → 许可类（`Semaphore`）。这一问把工具类分成两半，后面就不会混。',
                  },
                  {
                    title: '第二问：读多还是写多？',
                    detail:
                      '读远多于写（且数组不大）→ `CopyOnWriteArrayList`（读无锁）；读写均衡 → `ConcurrentHashMap`（细粒度锁）；写多且要顺序 → 普通容器 + 外部锁，或用 `ConcurrentLinkedQueue`。这一问决定用哪种并发策略（写时复制 / 细粒度锁 / CAS）。',
                  },
                  {
                    title: '第三问：要不要「阻塞 + 通信」？',
                    detail:
                      '要「生产慢了我等、消费慢了我等」→ `BlockingQueue`，并按「有无界 + 几把锁」选具体实现。不要阻塞（只是多线程共享）→ 上面的 `Map`/`List` 就够了。这一问决定要不要引入「阻塞语义」。',
                  },
                  {
                    title: '别忘了所有场景都适用的两条铁律',
                    detail:
                      '① **组合操作要换原子 API**——`putIfAbsent` / `computeIfAbsent` / `merge`，不要「先查再写」；② **所有等待都要带超时**——`await(t)` / `tryAcquire(t)` / `offer(e,t,u)`，因为「永久阻塞」在生产环境等于「线程泄漏」。',
                  },
                ],
                takeaway:
                  '一句话收口：**工具类解决「线程之间怎么协调」，并发容器解决「数据怎么安全共享」。** 前者的选型看「等谁」，后者的选型看「读写比 + 要不要阻塞」。两条线都记住「带超时」和「组合操作用原子 API」，就不会出大错。',
              },
            ],
            outline: [
              'CountDownLatch 等别人（一次性）、CyclicBarrier 等彼此（可循环）、Semaphore 控数量',
              'CHM 1.8 空桶 CAS、非空桶 synchronized 锁桶首；扩容多线程协作；size 用 CounterCell 分片求和',
              'CHM 1.7 分段锁并发度固定且内存浪费；1.8 锁粒度细到单桶，并发度随扩容增长',
              'COW 写时复制整个数组，读完全无锁；内存翻倍、写昂贵、迭代器看不到新元素',
              'BlockingQueue 四象限：抛异常 / 返回特殊值 / 阻塞 / 带超时；生产优先用带超时的 offer',
            ],
            pitfalls: [
              '把 CountDownLatch 与 CyclicBarrier 的等待对象说反：前者等别人做完，后者等彼此到齐',
              '用并发容器做「先检查再写入」：并发容器只保证单操作原子，组合操作仍要 putIfAbsent',
              '在线程池里用无界 LinkedBlockingQueue：掩盖任务堆积，最终 OOM',
            ],
          },
        },
        {
          id: 'concurrency-design',
          title: '死锁、手写题与并发设计',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['并发设计问题'] }],
          content: {
            intro:
              '这一节是并发部分的手写与场景区：死锁的四个必要条件与排查手段、线程安全的手段全景、单例的五种写法、生产者消费者、两个线程交替打印。手写题的关键不是背代码，而是**先说清用什么原语、为什么不用另一种**——比如交替打印用 `wait/notify` 还是 `Lock` + `Condition`，取舍点在于「是否需要超时」与「是否只有一个条件队列」；生产者消费者用 `wait/notify` 还是 `BlockingQueue`，取舍点在于「要不要自己处理虚假唤醒和队列边界」。本节按题型逐一拆解，每题都给可复述的思路骨架和可直接默写的代码。',
            sections: [
              {
                kind: 'concept',
                title: '手写题的三步答题法',
                body: [
                  '面试手写并发题，**先讲思路再写代码**比直接写更得分。三步：**① 选原语**（说清为什么用它）、**② 画数据流**（谁写谁读、临界区在哪）、**③ 补边界**（中断、超时、异常、虚假唤醒）。',
                  '**选原语的判断顺序**：需要「互斥 + 条件等待」→ `synchronized` + `wait/notify`（或 `ReentrantLock` + `Condition`）；只需要「原子增减」→ `Atomic*`；需要「限流」→ `Semaphore`；需要「等 N 个任务」→ `CountDownLatch`；需要「传递任务」→ `BlockingQueue`。**能用现成容器就别自己写锁**——`BlockingQueue` 就是生产者消费者的标准答案，自己用 `wait/notify` 写只是为了证明你懂原理。',
                  '**边界三问**：等待能不能被中断？能不能超时？条件唤醒后需不需要重新检查？前两个决定你用哪个 API（`await` vs `awaitUninterruptibly`、`wait` vs `wait(t)`），第三个决定你是不是写了 `while` 而不是 `if`——**用 `if` 判条件是并发手写题最常见的失分点**。',
                  '最后一个容易被忽略的点：**临界区里不要做慢操作**。手写题里如果临界区包含 sleep、IO、日志打印，面试官会立刻追问「这样会不会拖住其他线程」。正确做法是把慢操作移到锁外，只在锁内做状态判断与修改。',
                ],
                term: {
                  name: '条件等待的规范写法',
                  def: '用 while 而不是 if 包裹 wait/await：`while (!condition) lock.wait();`。因为被唤醒不代表条件成立（可能有虚假唤醒，也可能条件被别人又改回去），必须重新检查。这是并发手写题的第一条铁律。',
                },
                points: [
                  '先讲原语选择与理由，再写代码；说清为什么不用另一种',
                  '边界三问：能否中断、能否超时、唤醒后要不要重新检查条件',
                  '`while` 判条件，绝不用 `if`；`wait/await` 必须成对出现在锁内',
                  '临界区内不做慢操作（sleep / IO / RPC），只做状态判断与修改',
                ],
              },
              {
                kind: 'question',
                title: '死锁产生的四个必要条件？如何破坏？',
                questionId: 'java-03-Q65',
                intent:
                  '必背题。四个条件要能按「互斥 / 持有并等待 / 不可剥夺 / 循环等待」顺序说出，并对应给出破坏手段。',
                points: [
                  '**互斥**：资源同一时刻只能被一个线程占用。破坏：把资源改成可共享（如用 `ReadWriteLock`、`CopyOnWrite`、无锁结构）——**通常最难破坏**',
                  '**持有并等待**：持有至少一个资源，同时在等另一个。破坏：**一次性申请全部资源**（要么全拿到，要么一个都不拿）',
                  '**不可剥夺**：资源只能由持有者主动释放。破坏：**允许抢占**（申请不到时释放已持有的，稍后重试）——`tryLock(timeout)` 就是这个思路',
                  '**循环等待**：存在一个「A 等 B、B 等 A」的环。破坏：**给资源定全序，所有线程按同一顺序申请**（最实用）',
                  '工程上最常用的两条：**统一加锁顺序**（破坏循环等待）+ **`tryLock` 带超时**（破坏不可剥夺）',
                  '补充：死锁不只发生在「锁」上——线程池「任务 A 等任务 B 的结果，而 B 在队列里排队等不到线程」也是死锁（资源是「线程」），这是**线程池饥饿死锁**',
                ],
                depth:
                  '「为什么破坏任一条件就够了」——因为四个条件是「必要条件」的合取：`互斥 ∧ 持有并等待 ∧ 不可剥夺 ∧ 循环等待` 同时成立才可能死锁。破坏任何一个，合取式为假。但要注意「可能死锁」与「一定死锁」的区别：四个条件满足只是**可能**，实际发生还需要特定的时序。所以「测试跑一万次没死锁」不代表安全。',
                followup: '「数据库的死锁怎么处理」——数据库通常**不预防**，而是「检测 + 回滚」：用等待图（wait-for graph）检测环，发现环就选一个「代价最小」的事务回滚。因为数据库层面统一加锁顺序不现实（SQL 由应用决定），回滚重试反而是成本最低的方案。**这是一个「预防 vs 检测」的重要对比**。',
              },
              {
                kind: 'diagram',
                title: '四个条件，四种破坏手段',
                diagram: {
                  type: 'matrix',
                  cols: ['怎么破坏', '代价 / 限制', '实用度'],
                  rows: [
                    ['**互斥**', '改共享（读写锁、COW、无锁结构、不可变）', '很多资源本质上无法共享', '★★（最难）'],
                    ['**持有并等待**', '一次性申请全部资源 / 全局锁', '降低并发度，可能浪费资源', '★★'],
                    ['**不可剥夺**', '`tryLock(timeout)` 失败就释放重试', '需要支持回滚与重试，逻辑变复杂', '★★★★'],
                    ['**循环等待**', '给锁定全序，所有线程按同一顺序申请', '需要全局约定，跨模块时难保证', '★★★★★（最实用）'],
                  ],
                  caption:
                    '实际项目中「统一加锁顺序」是性价比最高的手段——它只需要一条团队约定（比如「先锁账户表再锁订单表」），不需要改任何并发原语。其次是 `tryLock` 超时，它把「永久死锁」变成了「偶发失败可重试」。',
                  note: '注意：破坏「互斥」往往意味着换数据结构（用 `ConcurrentHashMap` 代替 `synchronized (map)`），这其实是「从根上消除锁」，效果最好但适用范围最窄。',
                },
              },
              {
                kind: 'question',
                title: '如何排查死锁？手写一个死锁示例。',
                questionId: 'java-03-Q66',
                intent:
                  '两问：排查手段要能说出 `jstack` 的关键输出；手写要能写出「两个线程、两把锁、相反顺序」这个最小复现。',
                points: [
                  '**排查工具**：`jstack <pid>`（或 `jcmd <pid> Thread.print`）→ 输出里会直接给出 `Found one Java-level deadlock` 与等待环',
                  '关键输出：`"Thread-1" ... BLOCKED (on object monitor)` + `waiting to lock <0x000000076ab...>` + `locked <0x000000076ac...>`',
                  '`jstack` 会推断出环路：`Thread-1 等待 0xac（被 Thread-2 持有）` / `Thread-2 等待 0xab（被 Thread-1 持有）`',
                  '其他手段：`jconsole` / `jvisualvm` 的「检测死锁」按钮；`ThreadMXBean.findDeadlockedThreads()`（可编程检测）；`arthas` 的 `thread -b`（直接找阻塞其他线程的线程）',
                  '**最小复现**：两把锁 `A`、`B`，线程 1 先锁 A 再锁 B，线程 2 先锁 B 再锁 A，各自中间 `sleep` 一下让交错必然发生',
                  '`thread -b` 是最快的线上手段：它直接告诉你「哪个线程阻塞了 N 个其他线程」，不需要自己看等待图',
                  '预防优于排查：加锁顺序约定 + `tryLock` 超时 + 代码评审时重点看「嵌套锁」',
                ],
                depth:
                  '为什么死锁示例里要加 `sleep`：不加的话，两个线程可能「一个跑完另一个才开始」，永远复现不出来。`sleep` 的作用是把「持有一把锁」的时间窗口拉长，让另一个线程有机会拿到另一把锁。**这也说明死锁的偶发性**——线上死锁往往在 QPS 上来之后才出现，因为只有高并发才有足够的交错概率。',
                followup: '「`jstack` 抓不到死锁怎么办」——可能不是 `synchronized` 死锁，而是：① `ReentrantLock` 死锁（`jstack` 也能看到 `parking to wait for`，但不一定推断出环）；② 线程池饥饿（线程都在等队列里的任务，没有环但确实僵死）；③ 数据库/连接池耗尽（JVM 层看不到）。所以「没抓到死锁」不等于「没有僵死」。',
              },
              {
                kind: 'code',
                title: '最小死锁复现 + jstack 的关键输出',
                lang: 'java',
                code:
                  'public class DeadlockDemo {\n    private static final Object LOCK_A = new Object();\n    private static final Object LOCK_B = new Object();\n\n    public static void main(String[] args) {\n        Thread t1 = new Thread(() -> {\n            synchronized (LOCK_A) {\n                System.out.println("T1 got A");\n                sleep(100);                       // ① 拉长持有窗口\n                synchronized (LOCK_B) {\n                    System.out.println("T1 got B");\n                }\n            }\n        }, "T1");\n\n        Thread t2 = new Thread(() -> {\n            synchronized (LOCK_B) {               // ② 顺序相反\n                System.out.println("T2 got B");\n                sleep(100);\n                synchronized (LOCK_A) {\n                    System.out.println("T2 got A");\n                }\n            }\n        }, "T2");\n\n        t1.start();\n        t2.start();\n    }\n\n    static void sleep(long ms) {\n        try { Thread.sleep(ms); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }\n    }\n}\n\n/*  jstack 输出（关键部分）：\n\nFound one Java-level deadlock:\n=============================\n"T2":\n  waiting to lock monitor 0x00007f8b4c006e00 (object 0x000000076ab6a8f8, a java.lang.Object),\n  which is held by "T1"\n"T1":\n  waiting to lock monitor 0x00007f8b4c005f00 (object 0x000000076ab6a8e8, a java.lang.Object),\n  which is held by "T2"\n\nJava stack information for the threads listed above:\n===================================================\n"T2":\n        at DeadlockDemo.lambda$main$1(DeadlockDemo.java:24)\n        - waiting to lock <0x000000076ab6a8f8> (a java.lang.Object)\n        - locked <0x000000076ab6a8e8> (a java.lang.Object)\n"T1":\n        at DeadlockDemo.lambda$main$0(DeadlockDemo.java:14)\n        - waiting to lock <0x000000076ab6a8f8> (a java.lang.Object)   ← 注意两者的地址正好互换\n        - locked <0x000000076ab6a8e8> (a java.lang.Object)\n*/\n\n// ✓ 修法一：统一加锁顺序（最简单）\n// 两个线程都先锁 A 再锁 B —— 循环等待被破坏\n\n// ✓ 修法二：tryLock 带超时（需要回滚逻辑）\n// boolean gotA = lockA.tryLock(1, TimeUnit.SECONDS);\n// boolean gotB = lockB.tryLock(1, TimeUnit.SECONDS);\n// if (!(gotA && gotB)) { if (gotA) lockA.unlock(); if (gotB) lockB.unlock(); retry(); }\n\n// ✓ 修法三：合并成一把锁（破坏「持有并等待」）\n// 用同一个 lock 保护 A 和 B，虽然降低并发度但彻底消除死锁',
                caption:
                  '`jstack` 的两段信息是关键：**第一段直接告诉你「谁等谁、被谁持有」**（不用自己分析），**第二段给出代码行号**。注意 `waiting to lock` 与 `locked` 的地址在 T1/T2 里正好互换——这就是「环」的证据。',
                notes: [
                  { line: 'sleep(100);', text: '拉长「持有一把锁等另一把」的窗口，让死锁必然发生。去掉它可能一万次都不复现。' },
                  { line: 'synchronized (LOCK_B) {  // 顺序相反', text: '这就是「循环等待」的成因：两个线程以相反顺序申请资源。统一顺序即可消除。' },
                  { line: 'Found one Java-level deadlock:', text: 'JVM 的 `ThreadMXBean` 会自动检测 `synchronized` 与 `ReentrantLock` 的等待环并打印这段。但**线程池饥饿不会有这个段**。' },
                ],
              },
              {
                kind: 'question',
                title: '保证线程安全的手段有哪些？',
                questionId: 'java-03-Q67',
                intent:
                  '框架题。要能按「从最彻底到最轻量」的顺序组织，而不是罗列名词。',
                points: [
                  '**① 不可变**：`final` 字段 + 不提供 setter + 防御性拷贝。最彻底，连同步都不需要（天然线程安全）',
                  '**② 无共享**：把状态限制在单线程内（局部变量、`ThreadLocal`、栈封闭）。不共享就没有竞争',
                  '**③ 互斥同步**：`synchronized`、`ReentrantLock`、`StampedLock`。最通用，代价是串行与阻塞',
                  '**④ 非阻塞同步**：`Atomic*`、`LongAdder`、CAS 自旋。低竞争更优，但只适合单变量',
                  '**⑤ 并发容器**：`ConcurrentHashMap`、`CopyOnWriteArrayList`、`BlockingQueue`。把「同步」封装在容器里',
                  '**⑥ 消息传递**：用 `BlockingQueue` / `Actor` 模型让线程只通过消息通信，不共享可变状态',
                  '**⑦ 同步工具**：`CountDownLatch` / `Semaphore` / `CyclicBarrier` 协调而非互斥',
                ],
                depth:
                  '「优先级为什么是这个顺序」——因为它对应「消除竞争的成本从高到低」：不可变与无共享是**从设计上消除**竞争（没有竞态就没有同步），互斥是**用串行压制**竞争，CAS 是**用重试绕过**竞争。工程上应该**先想能不能不共享或不可变**，实在不行才加锁。绝大多数「并发 bug」的根因是「本来可以不共享却共享了」。',
                followup: '「不可变对象真的完全安全吗」——不完全。① 对象内部的**可变引用**（如 `final List` 但 list 内容可变）仍不安全，需要 `Collections.unmodifiableList` + 防御性拷贝；② 若引用在构造过程中**逃逸**（`this` 泄漏到其他线程），仍可能发布半初始化对象（需要 `final` 字段 + 不逃逸，或 `volatile`）。所以「不可变」要求的是**深不可变 + 正确发布**。',
              },
              {
                kind: 'diagram',
                title: '线程安全的七种手段：从「消除竞争」到「协调竞争」',
                diagram: {
                  type: 'tree',
                  root: {
                    label: '线程安全手段',
                    note: '按「是否产生竞争」分层',
                    children: [
                      {
                        label: '不产生竞争',
                        note: '最彻底，无需同步',
                        tone: 'primary',
                        children: [
                          { label: '不可变对象', note: '`final` + 无 setter + 深拷贝' },
                          { label: '栈封闭 / 局部变量', note: '不逃逸就天然安全' },
                          { label: 'ThreadLocal', note: '每线程一份，零竞争' },
                        ],
                      },
                      {
                        label: '压制竞争',
                        note: '串行化临界区',
                        tone: 'warn',
                        children: [
                          { label: 'synchronized', note: 'JVM 内建，有锁升级' },
                          { label: 'ReentrantLock / StampedLock', note: '可中断、超时、公平、读写分离' },
                        ],
                      },
                      {
                        label: '绕过竞争',
                        note: '无锁重试',
                        tone: 'warn',
                        children: [
                          { label: 'Atomic* / CAS', note: '单变量原子操作' },
                          { label: 'LongAdder', note: '高并发累加' },
                        ],
                      },
                      {
                        label: '封装与协调',
                        note: '把同步交给容器/工具',
                        tone: 'primary',
                        children: [
                          { label: '并发容器', note: 'CHM / COW / BlockingQueue' },
                          { label: '同步工具', note: 'Latch / Semaphore / Barrier' },
                          { label: '消息传递', note: '队列通信，不共享状态' },
                        ],
                      },
                    ],
                  },
                  caption:
                    '这张树的读法是**从上往下退化**：最上面是「不需要同步」，最下面是「用容器替你同步」。面试回答「如何保证线程安全」时按这个顺序说，会显得有层次——**先问能不能不共享，再问能不能不可变，最后才谈加锁**。只说「加 synchronized」会被认为视野窄。',
                },
              },
              {
                kind: 'question',
                title: '写出线程安全的单例（至少两种写法）。',
                questionId: 'java-03-Q68',
                intent:
                  '基础手写题。要能写出至少四种，并说清各自的取舍。**枚举是标准答案**。',
                points: [
                  '**① 饿汉式**：`private static final INSTANCE = new X()`。靠类初始化保证线程安全（JVM 保证 `<clinit>` 只执行一次），简单但会提前初始化',
                  '**② 静态内部类**：`Holder` 类里放 `INSTANCE`。**既延迟加载又线程安全**，且无锁——最推荐的「非枚举」写法',
                  '**③ 双重检查锁（DCL）**：`volatile` 修饰实例 + 两次判空 + `synchronized`。复杂且容易写错，**不推荐**',
                  '**④ 枚举**：`enum Singleton { INSTANCE; }`。**《Effective Java》推荐**：天然线程安全、防反射攻击、防反序列化生成新实例',
                  '⑤ 懒汉式（方法加 `synchronized`）：线程安全但**每次调用都抢锁**，性能差，只作为反面教材',
                  '取舍：饿汉/内部类简单但「不能传参初始化」；DCL 能传参但易错；枚举最安全但不能继承、不能延迟加载',
                ],
                depth:
                  '「为什么枚举能防反射」——`Constructor.newInstance` 里有硬编码检查：若 `clazz.isEnum()` 且不是「正在被 JVM 反序列化」，直接抛 `IllegalArgumentException: Cannot reflectively create enum objects`。这是 JDK 层的保护，无法通过 `setAccessible(true)` 绕过。而普通类（包括 DCL）都能被 `setAccessible(true)` 破坏。',
                followup: '「单例怎么传参数」——静态内部类和饿汉式都做不到（`INSTANCE` 是静态 final，构造时无参）。需要传参时只能用 DCL 或在 `Holder` 里做静态初始化块（从配置文件读）。这时可以退化为「单例 + 初始化方法」：`Singleton.init(config)` 只在第一次调用时生效（用 `AtomicBoolean` 保证只执行一次）。',
              },
              {
                kind: 'code',
                title: '单例的五种写法：从「能用」到「该用」',
                lang: 'java',
                code:
                  '// ① 饿汉式：靠类初始化保证线程安全（JVM 保证 clinit 只跑一次）\nclass Eager {\n    private static final Eager INSTANCE = new Eager();\n    private Eager() {}\n    static Eager get() { return INSTANCE; }\n}\n\n// ② 静态内部类：延迟加载 + 线程安全 + 无锁（推荐）\nclass Holder {\n    private Holder() {}\n    private static class H { static final Holder INSTANCE = new Holder(); }\n    static Holder get() { return H.INSTANCE; }\n}\n\n// ③ 双重检查锁：必须 volatile，否则可能发布半初始化对象\nclass Dcl {\n    private static volatile Dcl instance;      // volatile 不能省\n    private Dcl() {}\n    static Dcl get() {\n        Dcl local = instance;\n        if (local == null) {\n            synchronized (Dcl.class) {\n                local = instance;\n                if (local == null) instance = local = new Dcl();\n            }\n        }\n        return local;\n    }\n}\n\n// ④ 枚举：《Effective Java》推荐，防反射、防反序列化破坏\nenum EnumSingleton {\n    INSTANCE;\n    void doWork() { }\n}\n\n// ⑤ 反面教材：每个调用都抢锁\nclass BadLazy {\n    private static BadLazy instance;\n    private BadLazy() {}\n    static synchronized BadLazy get() { return instance == null ? (instance = new BadLazy()) : instance; }\n}\n\n// 补充：需要传参时——静态初始化块 + 一次性开关\nclass ConfigSingleton {\n    private static final AtomicBoolean INITED = new AtomicBoolean();\n    private static volatile ConfigSingleton instance;\n    private ConfigSingleton(Config c) { /* ... */ }\n    static void init(Config c) {\n        if (!INITED.compareAndSet(false, true)) throw new IllegalStateException("already inited");\n        instance = new ConfigSingleton(c);\n    }\n    static ConfigSingleton get() {\n        if (instance == null) throw new IllegalStateException("not inited");\n        return instance;\n    }\n}',
                caption:
                  '选型建议：**能用枚举就用枚举**（`EnumSingleton.INSTANCE`）；需要延迟加载又不能改类型 → 静态内部类；需要传参 → 静态初始化块 + `AtomicBoolean`。**DCL 只在「必须延迟加载 + 必须传参 + 不能用枚举」时才值得写**，而且一定要记得 `volatile`。',
                notes: [
                  { line: 'private static final Eager INSTANCE = new Eager();', text: '「饿汉」不是缺点——如果单例一定会被用到，提前初始化反而避免了首次访问的延迟抖动。' },
                  { line: 'private static volatile Dcl instance;', text: '`volatile` 禁止「初始化」与「引用赋值」重排，防止其他线程看到半初始化对象。少了它是真 bug。' },
                  { line: 'enum EnumSingleton { INSTANCE; }', text: '枚举的构造器天然私有、实例由 JVM 保证唯一、反序列化返回同一实例、反射创建被禁止——四个问题一次解决。' },
                ],
              },
              {
                kind: 'question',
                title: '手写生产者消费者模型（多种实现）。',
                questionId: 'java-03-Q69',
                intent:
                  '最经典的手写题。要说清至少三种实现，并强调「`while` 而不是 `if`」与「`notifyAll` 而不是 `notify`」两个要点。',
                points: [
                  '**实现一：`BlockingQueue`（生产首选）** —— 一行 `queue.put(x)` / `queue.take()` 就够，虚假唤醒、边界、阻塞全由容器处理',
                  '**实现二：`synchronized` + `wait/notifyAll`** —— 自定义有界缓冲，`while (count == capacity) wait();`，入队后 `notifyAll()`',
                  '**实现三：`ReentrantLock` + 两个 `Condition`** —— `notFull` / `notEmpty` 精确唤醒，避免无效唤醒（`ArrayBlockingQueue` 就是这么做的）',
                  '**实现四：`Semaphore` 双信号量** —— `empty = new Semaphore(capacity)`、`full = new Semaphore(0)`，天然表达「空位数」与「产品数」',
                  '**关键点一**：判断条件用 `while` 而不是 `if`（防虚假唤醒 + 防条件被改回去）',
                  '**关键点二**：`wait/notify` 版本必须用 `notifyAll`（用 `notify` 可能叫醒同类线程造成「信号丢失」，最终全部僵死）',
                  '**关键点三**：`wait` 必须在 `synchronized` 块内，且 `try/finally` 里保证 `unlock`',
                ],
                depth:
                  '「为什么 `notify` 会导致僵死」——假设队列空，两个消费者 C1、C2 都在 `wait`。生产者放入一个元素并 `notify()`，随机叫醒 C1。C1 消费后队列又空。此时生产者再放入一个元素并 `notify()`，这次**可能叫醒的还是 C1**（也可能叫醒 C2）——如果叫醒的是 C1 而 C1 恰好又先抢到锁，C2 就永远等不到通知。**`notify` 只保证「叫醒一个」，不保证「叫醒对的那个」。** 这就是为什么单条件队列时只能用 `notifyAll`。',
                followup: '「`Condition` 版本好在哪」——两个条件队列让「生产者只唤醒消费者、消费者只唤醒生产者」，既没有无效唤醒（不用 `notifyAll` 惊群），也不会僵死。这是「精确唤醒」的价值，也是 `ArrayBlockingQueue` 的选择。',
              },
              {
                kind: 'handwrite',
                title: '手写有界阻塞队列：ReentrantLock + 双 Condition',
                lang: 'java',
                prompt:
                  '面试官：「不用 `BlockingQueue`，手写一个有界阻塞队列，`put` 满了要等、`take` 空了要等，要求线程安全，且不能出现信号丢失。」这题是生产者消费者的核心版本，评分点在「两个 Condition」「while 判条件」「finally 解锁」三处。',
                signature:
                  'class BoundedQueue<T> {\n    BoundedQueue(int capacity);\n    void put(T item) throws InterruptedException;   // 满则阻塞\n    T take() throws InterruptedException;           // 空则阻塞\n    int size();\n}',
                plan: [
                  {
                    title: '先定数据结构与两把「条件」',
                    detail:
                      '用数组存环形缓冲（`head`/`tail`/`count`）。`ReentrantLock` 一把锁 + 两个 `Condition`：`notFull`（生产者等它）、`notEmpty`（消费者等它）。两个条件分开，才能「精确唤醒对端」。',
                  },
                  {
                    title: '`put`：满了就 await notFull',
                    detail:
                      '`while (count == capacity) notFull.await();` → 放入 → `count++` → `notEmpty.signal()`。注意三件事：用 `while` 不用 `if`；`signal` 只叫醒一个消费者（因为只放入一个）；解锁必须在 `finally`。',
                  },
                  {
                    title: '`take`：空了就 await notEmpty',
                    detail:
                      '`while (count == 0) notEmpty.await();` → 取出 → `count--` → `notFull.signal()`。两个方法结构完全对称，是这道题「好背」的原因。',
                  },
                  {
                    title: '补边界：`put(null)` 该不该允许',
                    detail:
                      '`BlockingQueue` 不允许 null（`null` 被用作 `poll` 的空返回值）。手写时也应 `Objects.requireNonNull(item)`，与 JDK 语义一致——这是「细节加分项」。',
                  },
                ],
                skeleton:
                  'class BoundedQueue<T> {\n    private final Object[] items;\n    private int head, tail, count;\n    private final ReentrantLock lock = new ReentrantLock();\n    private final Condition notFull = lock.newCondition();\n    private final Condition notEmpty = lock.newCondition();\n\n    BoundedQueue(int capacity) {\n        items = new Object[capacity];\n    }\n\n    void put(T item) throws InterruptedException {\n        Objects.requireNonNull(item);\n        lock.lock();\n        try {\n            // TODO: 1) while 满 → notFull.await()\n            //       2) 放入 tail，tail 环形前进，count++\n            //       3) notEmpty.signal()\n        } finally {\n            lock.unlock();\n        }\n    }\n\n    T take() throws InterruptedException {\n        lock.lock();\n        try {\n            // TODO: 1) while 空 → notEmpty.await()\n            //       2) 取出 head，head 环形前进，count--\n            //       3) notFull.signal()\n            return null;\n        } finally {\n            lock.unlock();\n        }\n    }\n\n    int size() {\n        lock.lock();\n        try { return count; } finally { lock.unlock(); }\n    }\n}',
                solution:
                  'class BoundedQueue<T> {\n    private final Object[] items;\n    private int head, tail, count;\n    private final ReentrantLock lock = new ReentrantLock();\n    private final Condition notFull = lock.newCondition();\n    private final Condition notEmpty = lock.newCondition();\n\n    BoundedQueue(int capacity) {\n        if (capacity <= 0) throw new IllegalArgumentException();\n        items = new Object[capacity];\n    }\n\n    void put(T item) throws InterruptedException {\n        Objects.requireNonNull(item);\n        lock.lockInterruptibly();              // 可中断，避免永久阻塞\n        try {\n            while (count == items.length) {    // while 而非 if\n                notFull.await();               // 满：等「不满」这个条件\n            }\n            items[tail] = item;\n            tail = (tail + 1) % items.length;  // 环形前进\n            count++;\n            notEmpty.signal();                 // 精确唤醒一个消费者\n        } finally {\n            lock.unlock();\n        }\n    }\n\n    @SuppressWarnings("unchecked")\n    T take() throws InterruptedException {\n        lock.lockInterruptibly();\n        try {\n            while (count == 0) {\n                notEmpty.await();              // 空：等「不空」这个条件\n            }\n            T item = (T) items[head];\n            items[head] = null;                // 帮助 GC\n            head = (head + 1) % items.length;\n            count--;\n            notFull.signal();                  // 精确唤醒一个生产者\n            return item;\n        } finally {\n            lock.unlock();\n        }\n    }\n\n    int size() {\n        lock.lock();\n        try { return count; } finally { lock.unlock(); }\n    }\n}',
                complexity:
                  '`put` / `take` 均为 O(1)（只有数组读写与取模）· 空间 O(capacity) · 锁竞争程度取决于容量与快慢速匹配度。',
                traps: [
                  '用 `if` 判断条件：被唤醒后条件可能已不成立（虚假唤醒或别人先抢走），必须 `while` 重新检查',
                  '只用一个 `Condition`：那就只能 `signalAll()`，否则会叫醒同类线程造成信号丢失、最终僵死',
                  '`unlock()` 不写 `finally`：`await()` 抛 `InterruptedException` 时锁不会释放，直接死锁',
                  '`signal()` 之后误以为对方立刻执行：它只是把对方从条件队列搬到同步队列，仍要竞争锁',
                  '遗忘 `tail`/`head` 的取模：数组越界或元素覆盖',
                ],
              },
              {
                kind: 'question',
                title: '手写：两个线程交替打印 1~100。',
                questionId: 'java-03-Q70',
                intent:
                  '高频手写题。要能给出三种以上写法，并说清各自的取舍（`wait/notify` / `Condition` / `Semaphore` / CAS）。',
                points: [
                  '**写法一：`synchronized` + `wait/notifyAll`** —— 共享一个 `count` 与 `turn` 标志，各自 `while (turn != me) wait();`，打印后改 `turn` 并 `notifyAll()`',
                  '**写法二：`ReentrantLock` + 两个 `Condition`** —— `condA` / `condB` 互相 `signal`，无需 `notifyAll`，无惊群',
                  '**写法三：`Semaphore` 双许可** —— `s1 = new Semaphore(1)`、`s2 = new Semaphore(0)`，A 先 `acquire(s1)` 打印后 `release(s2)`，B 反之',
                  '**写法四：`AtomicInteger` + CAS** —— 每个线程 `do { cur = get(); } while (!cas(cur, cur+1))`，谁 CAS 成功谁打印（但**无法保证「交替」**，只保证不重复）',
                  '**关键点一**：`while` 判自己的轮次，不用 `if`',
                  '**关键点二**：`wait` 版本必须 `notifyAll`（只有一个条件变量时，`notify` 可能叫醒同类）',
                  '**关键点三**：循环终止条件要放在锁内判断，否则可能多打一个数',
                ],
                depth:
                  '「`Semaphore` 版本为什么最简洁」——因为它把「谁该跑」编码进了「谁能拿到许可」：A 持 `s1`，打印完把 `s2` 的许可给出；B 拿到 `s2` 才能跑，跑完把 `s1` 还回去。**不需要 `turn` 变量、不需要 `notifyAll`、不需要 `while` 轮次判断**（`acquire` 本身就是等待）。这是「用同步工具表达约束」的典型例子——比用锁 + 条件变量更声明式。',
                followup: '「如果要求交替打印 A、B、C 三个线程呢」——`Semaphore` 版本只需三个信号量串成一个环（`s1→s2→s3→s1`）；`wait/notify` 版本要维护 `turn ∈ {0,1,2}` 并在 `while` 里比较。**线程数增加时，`Semaphore` 方案的可扩展性明显更好。**',
              },
              {
                kind: 'handwrite',
                title: '手写交替打印：Semaphore 版与 Condition 版',
                lang: 'java',
                prompt:
                  '面试官：「两个线程交替打印 1~100，A 打奇数、B 打偶数，要求严格交替且不丢不重。」说完思路后现场写一种即可，但要能答出「还有哪几种写法、区别在哪」。',
                signature:
                  'class AlternatingPrinter {\n    void print();   // 启动两个线程，交替打印 1..100\n}',
                plan: [
                  {
                    title: '方案选择：优先 `Semaphore`',
                    detail:
                      '两个信号量 `odd = new Semaphore(1)`、`even = new Semaphore(0)`。A 先拿 `odd`，打完释放 `even`；B 拿 `even`，打完释放 `odd`。**等待由 `acquire` 表达，不需要 `turn` 变量与 `while` 轮次判断**。',
                  },
                  {
                    title: '共享计数器要安全',
                    detail:
                      '`count` 只在一个线程持许可时被读写，所以理论上用普通 `int` 就够（靠信号量的内存屏障保证可见性）。但为了「即使写错也不出错」，可以用 `AtomicInteger` 更稳。',
                  },
                  {
                    title: '终止条件放在打印后判断',
                    detail:
                      '打印完发现已到 100 就 `return`，此时**必须把自己手上的许可也释放**（或让对端感知结束），否则另一个线程会永久 `acquire` 阻塞。这是本题最容易漏的边界。',
                  },
                  {
                    title: '备选：`Condition` 版',
                    detail:
                      '一把 `ReentrantLock` + 两个 `Condition`（`oddCond`/`evenCond`），用 `turn` 变量表示轮到谁。`while (turn != 0) oddCond.await();` 打印后改 `turn` 并 `signal` 对方。比 `synchronized` 版少了 `notifyAll` 的惊群。',
                  },
                ],
                skeleton:
                  'class AlternatingPrinter {\n    private final Semaphore odd = new Semaphore(1);    // A 先跑\n    private final Semaphore even = new Semaphore(0);   // B 等 A\n    private int count = 1;\n\n    void print() {\n        Thread a = new Thread(() -> {\n            while (true) {\n                // TODO: acquire(odd) → 若 count > 100 则释放并 return\n                //       打印 count，count++\n                //       释放 even\n            }\n        }, "A-odd");\n\n        Thread b = new Thread(() -> {\n            while (true) {\n                // TODO: acquire(even) → 若 count > 100 则释放并 return\n                //       打印 count，count++\n                //       释放 odd\n            }\n        }, "B-even");\n\n        a.start();\n        b.start();\n    }\n}',
                solution:
                  'class AlternatingPrinter {\n    private final Semaphore odd = new Semaphore(1);\n    private final Semaphore even = new Semaphore(0);\n    private int count = 1;                 // 只在持许可时被访问，故无需原子类\n\n    void print() {\n        Thread a = new Thread(() -> {\n            try {\n                while (true) {\n                    odd.acquire();\n                    if (count > 100) { even.release(); return; }  // 交棒后退出\n                    System.out.println(Thread.currentThread().getName() + ": " + count);\n                    count++;\n                    even.release();\n                }\n            } catch (InterruptedException e) {\n                Thread.currentThread().interrupt();\n            }\n        }, "A-odd");\n\n        Thread b = new Thread(() -> {\n            try {\n                while (true) {\n                    even.acquire();\n                    if (count > 100) { odd.release(); return; }\n                    System.out.println(Thread.currentThread().getName() + ": " + count);\n                    count++;\n                    odd.release();\n                }\n            } catch (InterruptedException e) {\n                Thread.currentThread().interrupt();\n            }\n        }, "B-even");\n\n        a.start();\n        b.start();\n    }\n}\n\n// ◆ 备选实现：ReentrantLock + 双 Condition\nclass ConditionPrinter {\n    private final ReentrantLock lock = new ReentrantLock();\n    private final Condition oddCond = lock.newCondition();\n    private final Condition evenCond = lock.newCondition();\n    private int count = 1;\n    private int turn;                       // 0 = A, 1 = B\n\n    void print() {\n        new Thread(() -> run(0, oddCond, evenCond), "A-odd").start();\n        new Thread(() -> run(1, evenCond, oddCond), "B-even").start();\n    }\n\n    private void run(int me, Condition mine, Condition other) {\n        lock.lock();\n        try {\n            while (count <= 100) {\n                while (turn != me && count <= 100) mine.await();   // while 判轮次\n                if (count > 100) break;\n                System.out.println(Thread.currentThread().getName() + ": " + count);\n                count++;\n                turn = 1 - me;\n                other.signal();                                    // 精确唤醒对方\n            }\n            other.signal();                                        // 收尾唤醒，避免对方永久等待\n        } catch (InterruptedException e) {\n            Thread.currentThread().interrupt();\n        } finally {\n            lock.unlock();\n        }\n    }\n}',
                complexity:
                  'O(n) 次打印，每次只有一次信号量获取/释放（或一次锁进出）· 无额外空间 · 严格交替（无忙等、无惊群）。',
                traps: [
                  '打印完发现到 100 就直接 `return`，忘了释放对端的许可/信号 → 另一个线程永久阻塞',
                  '`synchronized` 版本用 `notify()` 而不是 `notifyAll()` → 可能叫醒同类线程，导致互相等待僵死',
                  '`while` 写成 `if` 判轮次 → 虚假唤醒后会打乱顺序或重复打印',
                  '把 `count++` 放在锁外（`synchronized` 版本）→ 两个线程可能读到同一个值',
                  '用 `AtomicInteger` + CAS 声称「交替打印」：CAS 只保证不重复，**不保证交替顺序**（同一线程可能连续拿两次）',
                ],
              },
              {
                kind: 'analogy',
                title: '死锁像两辆车在窄路相遇',
                text:
                  '一条**只能过一辆车**的窄路（互斥），A 车从东头开进来、B 车从西头开进来（各自占住一段 = 持有并等待），路中间相遇后谁都**不能把车倒出去**（不可剥夺），于是 **A 等 B 退、B 等 A 退**（循环等待），两车永远僵住。要解开只有四种办法：**把路拓宽**（破坏互斥）、**规定必须一次占完整条路才准进**（破坏持有并等待）、**允许叫拖车强行挪走一辆**（破坏不可剥夺）、**规定车头一律朝东，只能从东往西走**（破坏循环等待，等价于「统一加锁顺序」）。',
                mapping: [
                  { real: '只能过一辆车的窄路', tech: '互斥资源（锁）' },
                  { real: 'A 车占住东段，等西段空出来', tech: '持有一把锁，等另一把' },
                  { real: '谁也不肯/不能倒车', tech: '不可剥夺：只能持有者主动释放' },
                  { real: 'A 等 B、B 等 A', tech: '循环等待' },
                  { real: '叫拖车强行挪走一辆', tech: '`tryLock(timeout)` 失败就释放重试' },
                  { real: '规定所有车只能从东往西走', tech: '统一加锁顺序（最实用）' },
                  { real: '两车僵在路口，后面的车全堵住', tech: '死锁的「雪崩」效应：占满线程池' },
                ],
                limit:
                  '类比到「线程池饥饿」就不成立了：窄路相撞的双方**互相**等着对方，是一个明确的环；而「任务 A 在线程池里等任务 B 的结果，B 还在队列里排队」**没有环**——A 等的是「一个还没开始的任务」，B 等的是「一个空闲线程」。这类僵死在 `jstack` 里**不会**被识别为 deadlock（没有等待环），只能靠「线程数打满 + 队列堆积」的现象判断。**这是死锁排查里最容易被漏掉的一类。**',
              },
              {
                kind: 'principle',
                title: '并发题的四条得分线',
                body: [
                  '这一节把并发部分的手写与场景题收尾。回顾所有题目，得分点其实高度重复——面试官看的是这四条。',
                ],
                steps: [
                  {
                    title: '第一线：原语选得对，且说得清为什么',
                    detail:
                      '需要「互斥 + 条件等待」→ 锁 + 条件变量；只需原子计数 → `Atomic*`；只需限流 → `Semaphore`；只需传递任务 → `BlockingQueue`。**能说出「为什么不用另一种」，比写对代码更值钱。**',
                  },
                  {
                    title: '第二线：`while` 判条件，绝不用 `if`',
                    detail:
                      '虚假唤醒、条件被改回去、同类线程抢走——三种情况都要求「醒来后重新检查」。这是并发手写题的第一条铁律，也是最常见的失分点。',
                  },
                  {
                    title: '第三线：边界齐全（中断 / 超时 / 异常 / 终止）',
                    detail:
                      '所有等待都要能被中断（`lockInterruptibly` / `await`），所有阻塞都该有超时版本，`unlock` 必须在 `finally`，循环终止后要「交棒」防止对端永久等待。**手写题的难度几乎全在边界上。**',
                  },
                  {
                    title: '第四线：知道这是「玩具」，生产要用现成的',
                    detail:
                      '手写生产者消费者是为了证明你懂原理，但生产环境应该用 `BlockingQueue`；手写单例是为了证明你懂 JMM，但生产环境该用枚举或框架的 DI 容器。**能说出「生产里我会怎么做」，是区分「背过题」和「上过线」的关键一句。**',
                  },
                ],
                takeaway:
                  '一句话收口：**并发手写题考的不是「能不能写出来」，而是「知不知道哪里会错、生产上该怎么避免」。** 原语选对 + `while` 判条件 + 边界齐全 + 承认「生产用现成的」，四条都做到，这一节就没有失分点。',
              },
            ],
            outline: [
              '死锁四条件：互斥、持有并等待、不可剥夺、循环等待；最实用的是统一加锁顺序与 tryLock 超时',
              '排查：jstack 会直接给出 deadlock 环；arthas 的 thread -b 最快；线程池饥饿没有环，需看线程数',
              '线程安全七手段：不可变 / 无共享 → 互斥 → CAS → 并发容器；优先「消除竞争」而非「压制竞争」',
              '单例首选枚举（防反射防序列化），次选静态内部类；DCL 必须 volatile，且只在必须传参时用',
              '生产者消费者与交替打印：while 判条件、Condition 精确唤醒、交棒后别忘了叫醒对端',
            ],
            pitfalls: [
              'DCL 单例忘写 volatile：可能发布半初始化对象，这是真实存在过的 bug',
              '条件等待用 if：虚假唤醒或条件被改回去后会打出错误结果',
              '手写交替打印收尾时直接 return 不交棒：另一个线程永久阻塞，程序挂死',
            ],
          },
        },
      ],
    },
    {
      id: 'async',
      title: 'D · 异步与虚拟线程',
      goal: '掌握编排异步任务与现代 Java 的并发新方案',
      summary:
        'JDK 8 的 CompletableFuture 解决了回调地狱，JDK 21 的虚拟线程则试图把「一个请求一个线程」重新变成可行方案。这一阶段讲清异步编排的常用组合，以及虚拟线程的适用边界——尤其是 pinning 这个绕不开的坑。',
      lessons: [
        {
          id: 'completable-future',
          title: 'CompletableFuture 编排',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['CompletableFuture'] }],
          content: {
            intro:
              '`CompletableFuture` 的价值在于把多个异步调用**编排成有依赖关系的流水线**，而不是「一个 Future 配一个 get」。要掌握的是三组方法的区别：`thenApply` 与 `thenCompose` 一个是「转换」一个是「扁平化」，`thenCombine` 做并行聚合，`exceptionally` 与 `handle` 决定异常如何被消费。还有一个线上很容易踩的坑：**默认线程池是 `ForkJoinPool.commonPool()`**，把阻塞的 IO 任务丢进去会拖垮整个 JVM 共享的那几个线程——这一节会把「为什么必须自定义线程池」讲清。',
            sections: [
              {
                kind: 'concept',
                title: 'Future 差在哪：为什么需要 CompletableFuture',
                body: [
                  '`Future` 只有五个方法：`get()`、`get(timeout)`、`cancel()`、`isDone()`、`isCancelled()`。它表达的是「**一个还没算完的结果**」，但缺三样东西：**① 无法组合**——两个 Future 没法「都完成后一起处理」；**② 只能阻塞取结果**——`get()` 是阻塞的，`isDone()` 轮询又浪费 CPU；**③ 没有异常处理**——异常被包进 `ExecutionException`，只能 `get` 时才知道。',
                  '`CompletableFuture` 补齐了这三样：**组合**（`thenApply` / `thenCombine` / `allOf`）、**回调**（完成时自动触发后续动作，不用阻塞等）、**异常处理**（`exceptionally` / `handle` / `whenComplete`）。它的本质是「**一个可以被手动完成、且支持链式注册回调的 Future**」。',
                  '一个关键的设计细节：`CompletableFuture` 实现了 `Future` 与 `CompletionStage` 两个接口。`Future` 提供「取结果」的老语义，`CompletionStage` 提供「链式编排」的新语义。所以它向下兼容，可以在任何要 `Future` 的地方直接用。',
                  '还有一个容易被忽略的事实：**`CompletableFuture` 的链式调用默认不是「新起线程」**。`thenApply` 里的函数会在「**完成上一个阶段的那个线程**」上执行（除非加 `Async` 后缀）。这一点决定了它的线程模型，也是很多「为什么我的回调阻塞了别的任务」问题的根源。',
                ],
                term: {
                  name: 'CompletionStage',
                  def: 'JDK 8 引入的接口，描述「异步计算的一个阶段」以及「这个阶段完成后可以触发什么」。CompletableFuture 是它最重要的实现。链式方法（thenApply 等）都定义在这个接口上。',
                },
                points: [
                  '`Future` 三缺：不能组合、只能阻塞取、无异常处理',
                  '`CompletableFuture` 三补：链式组合、完成回调、异常分支',
                  '实现了 `Future` + `CompletionStage`，向下兼容',
                  '链式默认**不新起线程**：在「完成上一阶段的线程」上执行（除非加 `Async`）',
                ],
              },
              {
                kind: 'question',
                title: 'CompletableFuture 和 Future 的区别？',
                questionId: 'java-03-Q71',
                intent:
                  '对比题。要按「能否组合 / 是否阻塞 / 异常处理」三条说，并点出「回调在哪个线程执行」这个进阶认知。',
                points: [
                  '**组合能力**：`Future` 不能组合两个结果；`CF` 有 `thenApply` / `thenCompose` / `thenCombine` / `allOf` / `anyOf`',
                  '**取值方式**：`Future.get()` 只能阻塞（或轮询 `isDone`）；`CF` 可以注册回调（`thenAccept` 等），完成时自动触发',
                  '**异常处理**：`Future` 的异常只能通过 `ExecutionException` 感知；`CF` 有 `exceptionally` / `handle` / `whenComplete` 三个明确入口',
                  '**手动完成**：`CF` 有 `complete(v)` / `completeExceptionally(e)`，可以自己控制何时完成（`Future` 不行）',
                  '**线程模型**：`CF` 的链式方法默认在「完成上一阶段的线程」上执行；加 `Async` 后缀才提交到线程池',
                  '**可选的执行器**：`*Async(..., executor)` 可以指定线程池，`Future` 只能靠创建它的那个池',
                ],
                depth:
                  '最容易被追问的一点：「`thenApply` 到底在哪个线程跑？」——如果上游 `CF` 已经被完成（`completedFuture`），它就在**调用 `thenApply` 的线程**上跑；如果上游是在线程池里异步完成的，它就在**那个池的线程**上跑；只有 `thenApplyAsync` 才会提交到线程池。**这个差别决定了「你的回调会不会阻塞业务线程」。**',
                followup: '「`CF` 能替代 `Future` 吗」——功能上是超集，但要注意：① `CF` 的回调链会持有对象引用，长链可能内存占用更高；② `CF` 的异常处理更复杂（容易「静默吞掉」）；③ 老代码里 `Future` 的语义更简单明确。所以「新代码用 `CF`」是合理的，但不必为了用而用。',
              },
              {
                kind: 'diagram',
                title: 'Future 与 CompletableFuture：能力对照',
                diagram: {
                  type: 'split',
                  left: {
                    title: 'Future（JDK 5）',
                    tone: 'warn',
                    items: [
                      '只能 get() / get(timeout) 阻塞取',
                      '无法组合两个结果',
                      '异常包在 ExecutionException 里',
                      '只能靠轮询 isDone() 判断',
                      '不能手动完成',
                      '没有回调机制',
                    ],
                  },
                  right: {
                    title: 'CompletableFuture（JDK 8）',
                    tone: 'good',
                    items: [
                      'thenApply / thenAccept / thenRun 链式接续',
                      'thenCombine / allOf / anyOf 组合',
                      'exceptionally / handle / whenComplete',
                      '完成时自动触发回调（无需轮询）',
                      'complete() / completeExceptionally() 手动完成',
                      'join() 不抛受检异常（get 抛）',
                    ],
                  },
                  caption:
                    '一句话概括右边：**`CF` 把「等结果」变成了「登记回调」**。左边是「命令式 + 阻塞」，右边是「声明式 + 事件驱动」。这也是为什么 `CF` 的代码看起来像「流水线定义」，而不是「调用顺序」。',
                },
              },
              {
                kind: 'concept',
                title: '接续方法的分类：三个维度定清 20 多个方法',
                body: [
                  '`CompletionStage` 有 40 多个方法，看着吓人，其实是三个维度的笛卡尔积：**「接什么」（有参/无参）、「返回什么」（有值/无值）、「在哪个线程」（同步/Async）**。理清这三个维度，就只需要记 6 个核心方法。',
                  '**按「对结果做什么」分三类**：`thenApply`（`Function`，转换值）、`thenAccept`（`Consumer`，消费值但无返回）、`thenRun`（`Runnable`，不关心值只做动作）。这三者是「同一件事的三种返回形态」。',
                  '**按「上游返回什么」分两类**：上游返回普通值时用 `thenApply`；上游返回 `CompletionStage` 时用 `thenCompose`（否则会得到嵌套的 `CF<CF<T>>`）。这就是「map vs flatMap」的区别，和 `Optional`、`Stream` 完全一致。',
                  '**按「是否换线程」分两种**：不带 `Async` 的在「完成上一阶段的线程」上跑；带 `Async` 的提交到线程池（无参版本用 `commonPool`，带 `executor` 参数的用指定池）。**这个选择直接影响「会不会阻塞关键线程」，必须显式决定而不是默认。**',
                ],
                term: {
                  name: 'thenApply vs thenCompose',
                  def: 'thenApply 接收 Function<T,R>，把 T 变成 R；若你的映射函数本身返回 CompletionStage<R>，用 thenApply 会得到 CompletableFuture<CompletableFuture<R>>。thenCompose 接收 Function<T, CompletionStage<R>>，会把结果拍平，等价于 Stream 的 flatMap。',
                },
                points: [
                  '`thenApply`（有返回值）/ `thenAccept`（无返回值）/ `thenRun`（不接收值）',
                  '上游返回 `CF` 时用 `thenCompose` 拍平，否则会嵌套两层',
                  '`thenCombine` 合并两个**独立** `CF` 的结果；`allOf` 等全部；`anyOf` 取第一个',
                  '`Async` 后缀决定是否换线程；不加以「完成上一阶段的线程」为准',
                ],
              },
              {
                kind: 'diagram',
                title: 'then* 方法全景：只要记六个',
                diagram: {
                  type: 'matrix',
                  cols: ['需要上游的值吗', '有返回值吗', '典型用途'],
                  rows: [
                    ['`thenApply(fn)`', '**要**（`Function`）', '**有**（`R`）', '转换：`User -> UserDTO`'],
                    ['`thenAccept(consumer)`', '**要**（`Consumer`）', '无（`Void`）', '消费：写库、打日志'],
                    ['`thenRun(action)`', '不要（`Runnable`）', '无（`Void`）', '收尾：通知、计数'],
                    ['`thenCompose(fn)`', '**要**（`Function<T, CompletionStage<R>>`）', '**有**（`R`，已拍平）', '串行依赖：拿 A 的 id 再查 B'],
                    ['`thenCombine(other, fn)`', '要两个 `CF`', '**有**', '并行聚合：两个独立接口的结果合并'],
                    ['`allOf` / `anyOf`', '要（多个）', '`Void` / 第一个完成者', '批量等待 / 竞速'],
                  ],
                  caption:
                    '这张表最该记的是第三行与第四行：**`thenRun` 拿不到上游结果**（很多人误以为能拿到），**`thenCompose` 是为了拍平嵌套**（不是「异步版的 thenApply」）。加上 `Async` 后缀就是「换线程」版本，方法名与参数完全一样。',
                  note: '助记：`Apply` = 返回值；`Accept` = 消费值无返回；`Run` = 既不给值也不返回；`Compose` = 拍平；`Combine` = 合并。',
                },
              },
              {
                kind: 'question',
                title: 'thenApply 和 thenCompose 的区别？',
                questionId: 'java-03-Q72',
                intent:
                  '必须说清「嵌套」这个后果。最佳回答方式是举一个「查订单 → 用订单号查物流」的例子，对比两种写法的返回类型。',
                points: [
                  '`thenApply(Function<T, R>)`：把结果 `T` 映射成 `R`；若 `fn` 返回 `CF<R>`，你得到的是 **`CF<CF<R>>`**（双层嵌套）',
                  '`thenCompose(Function<T, CompletionStage<R>>)`：把结果 `T` 映射成 `CF<R>` 并**拍平**，得到 `CF<R>`',
                  '类比：`thenApply` = `Stream.map`，`thenCompose` = `Stream.flatMap`；也等价于 `Optional.map` vs `flatMap`',
                  '判据：**你的函数返回「普通值」还是「另一个异步计算」**——前者用 `Apply`，后者用 `Compose`',
                  '`thenCompose` 是**串行依赖**：第二个调用需要第一个的结果（查订单 → 拿订单号查物流）',
                  '`thenCombine` 是**并行聚合**：两个调用互不依赖，各自发起后合并结果',
                ],
                depth:
                  '「嵌套了会怎样」——`CF<CF<R>>` 的 `join()` 返回的是内层 `CF`，你还得再 `join()` 一次，而且**内层的异步计算在外层 `join` 时可能还没开始**（如果它是 `supplyAsync`）。也就是说嵌套不只是「多写一次 `join`」，而是**破坏了「join 能等到最终结果」的语义**。这是必须用 `thenCompose` 的根本原因。',
                followup: '「`thenApplyAsync` 和 `thenCompose` 哪个是异步的」——两者都可能是异步的，取决于你是否加 `Async` 后缀。`Async` 管的是「在哪个线程执行」，`Compose` 管的是「返回类型是否拍平」，**两个维度正交**，不要混。',
              },
              {
                kind: 'code',
                title: '一个例子看清嵌套与拍平',
                lang: 'java',
                code:
                  '// 场景：先查订单，再用订单号查物流\nCompletableFuture<Order> orderF = CompletableFuture.supplyAsync(() -> queryOrder(1L), pool);\n\n// ✗ 错：thenApply 返回 CF → 得到 CF<CF<Logistics>>\nCompletableFuture<CompletableFuture<Logistics>> nested =\n        orderF.thenApply(order -> queryLogisticsAsync(order.getNo()));\n\n// 嵌套的后果：要 join 两次，且内层可能还没开始\n// Logistics l = nested.join().join();\n\n// ✓ 对：thenCompose 拍平 → CF<Logistics>\nCompletableFuture<Logistics> flat =\n        orderF.thenCompose(order -> queryLogisticsAsync(order.getNo()));\n// Logistics l = flat.join();\n\n// ✓ 并行聚合：两个互不依赖的调用\nCompletableFuture<Price> priceF = CompletableFuture.supplyAsync(() -> queryPrice(1L), pool);\nCompletableFuture<Stock> stockF = CompletableFuture.supplyAsync(() -> queryStock(1L), pool);\n\nCompletableFuture<Detail> detailF =\n        priceF.thenCombine(stockF, (price, stock) -> new Detail(price, stock));\n// 注意：这里两个查询是「同时发起」的，总耗时 ≈ max(两者)，而不是相加\n\n// ✓ 串行 vs 并行的耗时差异\n// 串行：orderF.thenCompose(o -> logisticsF(o)).thenCompose(l -> priceF(l))\n//       总耗时 = 三者之和\n// 并行：allOf(orderF, priceF, stockF) 后再合并\n//       总耗时 = 三者最大值\n\n// ◆ 完整链条：查订单 → 并行查价格与库存 → 组装\nCompletableFuture<Detail> chain =\n        CompletableFuture.supplyAsync(() -> queryOrder(1L), pool)\n            .thenCompose(order -> {\n                CompletableFuture<Price> p = CompletableFuture.supplyAsync(() -> queryPrice(order), pool);\n                CompletableFuture<Stock> s = CompletableFuture.supplyAsync(() -> queryStock(order), pool);\n                return p.thenCombine(s, (price, stock) -> new Detail(order, price, stock));\n            });',
                caption:
                  '最后那段「串行里嵌套并行」的写法是 `CF` 最有价值的地方：**外层串行依赖用 `thenCompose`，内层并行用 `thenCombine`**。这样总耗时 ≈ `查订单 + max(查价格, 查库存)`，而不用写成三层回调。',
                notes: [
                  { line: 'orderF.thenApply(order -> queryLogisticsAsync(...))', text: '`queryLogisticsAsync` 返回 `CF<Logistics>`，所以 `thenApply` 把它当普通值，结果就是嵌套的 `CF<CF<...>>`。' },
                  { line: 'orderF.thenCompose(order -> queryLogisticsAsync(...))', text: '`thenCompose` 认得「返回的是 `CompletionStage`」，自动拍平。这就是 `flatMap` 的语义。' },
                  { line: 'p.thenCombine(s, (price, stock) -> ...)', text: '`thenCombine` 要求两个 `CF` 都已发起。**顺序很重要**：先 `supplyAsync` 起两个，再 `thenCombine`，才是并行。' },
                ],
              },
              {
                kind: 'question',
                title: 'CompletableFuture 的异常处理：exceptionally、handle、whenComplete 有什么区别？',
                questionId: 'java-03-Q73',
                intent:
                  '三个方法的差异要精确：能改结果吗？能改异常吗？什么情况下执行？这一题答模糊就等于没答。',
                points: [
                  '`exceptionally(Function<Throwable, T>)`：**只在异常时执行**，返回一个兜底值 `T`，异常被「吞掉」；正常时直接透传结果',
                  '`handle(BiFunction<T, Throwable, R>)`：**无论成功失败都执行**，可以同时看到结果和异常，返回新值 `R`（可改结果，也可吞异常）',
                  '`whenComplete(BiConsumer<T, Throwable>)`：**无论成败都执行**，但**不能改结果也不能吞异常**，只能观察（打日志、埋点）',
                  '`whenComplete` 想让异常继续传播就什么都不做；想吞掉需在 `handle` / `exceptionally` 里处理',
                  '`join()` 抛 `CompletionException`（非受检），`get()` 抛 `ExecutionException`（受检）；原始异常都在 `getCause()`',
                  '如果异常一直没被处理，最终会在 `join`/`get` 时暴露——但**如果你从不 `join`，它就永远静默**（线上事故常见来源）',
                ],
                depth:
                  '「三个方法的选择口诀」——**只想记日志 → `whenComplete`**（不改语义）；**要降级返回兜底值 → `exceptionally`**（最常用）；**要「成功失败统一出口」→ `handle`**（比如统一包装成 `Result<T>`）。`handle` 是唯一能「既处理异常又拿到正常值」的，也正因如此它最容易写错（忘了 `t != null` 判断）。',
                followup: '「`whenComplete` 里抛异常会怎样」——它会**替换**原来的异常（如果原来没异常，则是新异常）。这是很隐蔽的坑：日志代码里如果 `e.getMessage()` 触发 NPE，会把原始异常吞掉换成 NPE。所以 `whenComplete` 里要 `try/catch` 包住。',
              },
              {
                kind: 'diagram',
                title: '三个异常方法：谁能改结果、谁能吞异常',
                diagram: {
                  type: 'matrix',
                  cols: ['何时执行', '能改结果吗', '能吞异常吗'],
                  rows: [
                    ['`exceptionally`', '**仅异常时**', '能（返回兜底值 `T`）', '**能**（异常被替换成正常结果）'],
                    ['`handle`', '**总是**（成功也执行）', '**能**（返回 `R`）', '**能**（返回正常值即吞掉）'],
                    ['`whenComplete`', '**总是**', '**不能**（返回原结果）', '**不能**（原异常继续传播）'],
                    ['`join` / `get`', '取值时', '不能', '不能（此处才暴露异常）'],
                  ],
                  caption:
                    '记住 `whenComplete` 那一行两个「不能」——**它是纯观察者**。很多人以为 `whenComplete` 能处理异常，结果异常照样从 `join` 抛出来。另外注意 `exceptionally` 在成功时**完全不执行**，所以它不能用于埋点。',
                  note: '补充：`exceptionally` 只接收 `Throwable`，看不到正常结果；`handle` 两个都接收。若你的逻辑需要「成功和失败都走同一段代码」，只有 `handle` 能做到。',
                },
              },
              {
                kind: 'question',
                title: '为什么 CompletableFuture 要自定义线程池？allOf 怎么用？',
                questionId: 'java-03-Q74',
                intent:
                  '两个重点：`commonPool` 的坑（阻塞任务拖垮全 JVM），以及 `allOf` 的「结果收集」与「异常只抛一个」两个陷阱。',
                points: [
                  '默认 `supplyAsync` / `thenApplyAsync` 用 `ForkJoinPool.commonPool()`，**并行度 = CPU 核数 - 1**，且**全 JVM 共享**',
                  '`commonPool` 的线程是**非守护**的、为「短小 CPU 密集任务」设计；塞进阻塞 IO 会占满所有线程 → 影响**所有**未指定池的 `CF`（包括第三方库）',
                  '所以：**IO 密集或阻塞任务必须传自定义线程池**（`supplyAsync(supplier, myPool)`）',
                  '`allOf(cfs...)` 返回 `CF<Void>`，**拿不到各个结果**——必须自己从原 `cf` 里 `join()` 收集',
                  '`allOf` 的异常：任一失败则整体失败，但 `join` 时**只抛出其中一个**异常；要看全部需逐个 `handle` 收集',
                  '`allOf` 是「全部完成」，`anyOf` 是「任一完成」（返回第一个完成的结果，其余仍在跑）',
                  '`allOf` 不负责超时，要超时得在整体上加 `orTimeout`（JDK 9+）或自己用 `ScheduledExecutorService`',
                ],
                depth:
                  '`commonPool` 到底有多危险：它的并行度只有 `核数 - 1`（4 核机器就是 3）。如果某个框架用 `commonPool` 跑了 3 个阻塞 10 秒的任务，**这 10 秒内全 JVM 所有用 `commonPool` 的 `CF` 全部排队**。而且它无法通过 JVM 参数有效隔离（`-Djava.util.concurrent.ForkJoinPool.common.parallelism` 只是调大小，仍是共享的）。**结论：任何可能阻塞的异步任务，都必须显式传池。**',
                followup: '「`allOf` 里某个任务超时了怎么办」——`allOf` 本身没有超时机制，所以常见的做法是：① 每个子任务自己加 `.orTimeout(t, unit)`；② 整体加 `.orTimeout`（但它只是让**整体**失败，子任务仍在跑，可能泄漏）；③ 用 `ScheduledExecutorService` 在超时后 `cancel` 各个 `CF`（注意 `CF.cancel` 不一定能中断底层任务）。**这一点要能说清，因为它涉及「超时了但任务还在跑」的资源泄漏。**',
              },
              {
                kind: 'code',
                title: 'allOf 的两个坑：结果要自己收，异常只抛一个',
                lang: 'java',
                code:
                  '// ✗ 坑一：allOf 返回 CF<Void>，拿不到结果\nCompletableFuture<Void> all = CompletableFuture.allOf(f1, f2, f3);\nall.join();\n// f1.join(); f2.join(); f3.join();   ← 必须自己再取一次\n\n// ✓ 正确写法：先 allOf 等全部，再逐个 join（此时 join 不会阻塞）\nList<CompletableFuture<User>> futures = ids.stream()\n        .map(id -> CompletableFuture.supplyAsync(() -> load(id), bizPool))\n        .toList();\n\nCompletableFuture<Void> all = CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));\nList<User> users = all.thenApply(v ->\n        futures.stream().map(CompletableFuture::join).toList())   // 已完成，join 不阻塞\n    .join();\n\n// ✗ 坑二：一个失败只抛一个异常，其他失败看不到\n// 若 f1 抛 A、f2 抛 B，all.join() 只会抛其中一个\n\n// ✓ 收集全部异常与结果（不因单个失败中断）\nList<CompletableFuture<Result<User>>> wrapped = ids.stream()\n        .map(id -> CompletableFuture.supplyAsync(() -> load(id), bizPool)\n                .handle((u, e) -> e == null ? Result.ok(u) : Result.fail(id, e)))\n        .toList();\n\nList<Result<User>> results = CompletableFuture\n        .allOf(wrapped.toArray(new CompletableFuture[0]))\n        .thenApply(v -> wrapped.stream().map(CompletableFuture::join).toList())\n        .orTimeout(3, TimeUnit.SECONDS)      // 整体超时（JDK 9+）\n        .exceptionally(e -> List.of(Result.fail(-1L, e)))\n        .join();\n\n// 结果：每个 id 都有 ok 或 fail，一个失败不影响其他的\nlong okCount = results.stream().filter(Result::isOk).count();\n\n// ◆ 关键：自定义线程池（绝不能用 commonPool 跑 IO）\nExecutorService bizPool = new ThreadPoolExecutor(\n        8, 32, 60L, TimeUnit.SECONDS,\n        new ArrayBlockingQueue<>(500),\n        r -> { Thread t = new Thread(r, "cf-" + N.incrementAndGet()); return t; },\n        new ThreadPoolExecutor.CallerRunsPolicy());',
                caption:
                  '第二段的 `handle` 包装是关键技巧：**把「可能失败的任务」变成「一定成功的 Result」**，这样 `allOf` 就永远不会因单个失败而整体失败，你能拿到「成功的部分结果」。这在「批量查详情，个别失败不该让整页报错」的场景里是标准做法。',
                notes: [
                  { line: 'all.thenApply(v -> futures.stream().map(CompletableFuture::join).toList())', text: '在 `allOf` 的回调里 `join` 不会阻塞（全部已完成）。这是「收集结果」的标准写法。' },
                  { line: '.handle((u, e) -> e == null ? Result.ok(u) : Result.fail(id, e))', text: '把异常转成数据。这样后面的 `allOf` 看到的是「全部成功」，你需要自己检查 `Result` 的成败。' },
                  { line: '.orTimeout(3, TimeUnit.SECONDS)', text: 'JDK 9+ 才有。注意它只让整体以 `TimeoutException` 完成，**不会中断**子任务——子任务仍在池里跑，可能造成资源浪费。' },
                ],
              },
              {
                kind: 'analogy',
                title: 'CompletableFuture 像流水线，thenApply 是工位、thenCompose 是换线',
                text:
                  '把一条**装配流水线**想成 `CF` 链：每个工位（`thenApply`）接收上游来的零件，加工一下再传给下一个工位。但有些零件需要**送去另一条专门的产线**（另一个异步调用），加工完再送回来——如果你把它直接塞给当前工位，你会得到一个「贴着别的产线标签的箱子」（`CF<CF<T>>`），得再拆一层（`thenCompose` 就是「送去并等它回来」的规范动作）。**`thenCombine` 则是「两条产线并行跑，最后在同一个工位合装」。**',
                mapping: [
                  { real: '整条流水线', tech: '`CompletableFuture` 链' },
                  { real: '一个加工工位', tech: '`thenApply`（转换值）' },
                  { real: '只贴标签不出货的工位', tech: '`thenAccept`（消费无返回）' },
                  { real: '不碰零件只做清场的动作', tech: '`thenRun`（不接收值）' },
                  { real: '送去另一条产线加工再送回来', tech: '`thenCompose`（拍平嵌套）' },
                  { real: '两条产线并行，最后合装', tech: '`thenCombine`（并行聚合）' },
                  { real: '所有产线都停工才下班', tech: '`allOf`' },
                  { real: '哪条先出货就先发哪条', tech: '`anyOf`' },
                  { real: '质检不合格就贴「返工」标签', tech: '`exceptionally` / `handle`' },
                ],
                limit:
                  '类比到「线程」就不成立了：现实中的工位是**固定的人**在干活，而 `CF` 的接续方法默认**不指定谁干**——它在「完成上一阶段的那个线程」上执行。这意味着「同一个流水线」的不同工位可能由不同线程执行，甚至可能是「提交任务的那个业务线程」。要指定工位（线程池），必须显式用 `thenApplyAsync(..., pool)`。**这个差别正是线上「回调阻塞了业务线程」问题的根源。**',
              },
              {
                kind: 'handwrite',
                title: '手写：三个接口并行 + 汇总 + 超时降级',
                lang: 'java',
                prompt:
                  '面试官：「有三个互不依赖的下游接口，要求并行调用、总耗时不超过 3 秒、任何一个失败都不能让整页报错（用兜底值），最后汇总返回。用 `CompletableFuture` 写。」这题考的是「`allOf` + `handle` + `orTimeout` + 自定义线程池」四件套的实战组合。',
                signature:
                  'class Aggregator {\n    Aggregator(ExecutorService bizPool);\n    PageData aggregate(long userId);\n}',
                plan: [
                  {
                    title: '第一步：三个任务各自「包装成一定成功」',
                    detail:
                      '每个下游调用都用 `.handle((v, e) -> e == null ? v : fallback())` 包一层。这样单个失败会被转成兜底值，`allOf` 永远不会因一个失败而整体失败——这是「部分成功也要返回」的关键。',
                  },
                  {
                    title: '第二步：`allOf` 等全部，再逐个 `join` 收集',
                    detail:
                      '`allOf` 返回 `CF<Void>` 拿不到结果，必须在它的回调里 `futures.stream().map(CF::join)` 收集。此时全部已完成，`join` 不会阻塞。',
                  },
                  {
                    title: '第三步：整体超时 + 最终兜底',
                    detail:
                      '整体加 `.orTimeout(3, SECONDS).exceptionally(e -> 全兜底 PageData)`。注意 `orTimeout` 只让整体快速失败，**不会中断**还在跑的子任务——所以子任务本身也要有超时（或依赖下游客户端的超时配置）。',
                  },
                  {
                    title: '第四步：显式指定线程池',
                    detail:
                      '所有 `supplyAsync` 都必须传 `bizPool`，绝不能用默认 `commonPool`——否则三个阻塞调用会占满全 JVM 共享的少数几个线程，把别的业务一起拖死。',
                  },
                ],
                skeleton:
                  'class Aggregator {\n    private final ExecutorService pool;\n\n    Aggregator(ExecutorService bizPool) { this.pool = bizPool; }\n\n    PageData aggregate(long userId) {\n        // TODO: 1) 三个 supplyAsync 并发发起（都传 pool）\n        //       2) 每个都 .handle 包成「不失败」\n        //       3) allOf 等全部，再逐个 join 收集\n        //       4) .orTimeout(3s).exceptionally(整体兜底)\n        return null;\n    }\n\n    private Profile loadProfile(long uid) { /* 下游调用 */ return null; }\n    private List<Order> loadOrders(long uid) { return List.of(); }\n    private List<Coupon> loadCoupons(long uid) { return List.of(); }\n}',
                solution:
                  'class Aggregator {\n    private final ExecutorService pool;\n\n    Aggregator(ExecutorService bizPool) { this.pool = bizPool; }\n\n    PageData aggregate(long userId) {\n        // ① 三个任务并行发起，各自「包装成一定成功」\n        CompletableFuture<Profile> profileF =\n                CompletableFuture.supplyAsync(() -> loadProfile(userId), pool)\n                        .handle((v, e) -> {\n                            if (e != null) log.warn("profile failed", e);\n                            return e == null ? v : Profile.empty();     // 兜底\n                        });\n\n        CompletableFuture<List<Order>> ordersF =\n                CompletableFuture.supplyAsync(() -> loadOrders(userId), pool)\n                        .handle((v, e) -> e == null ? v : List.<Order>of());\n\n        CompletableFuture<List<Coupon>> couponsF =\n                CompletableFuture.supplyAsync(() -> loadCoupons(userId), pool)\n                        .handle((v, e) -> e == null ? v : List.<Coupon>of());\n\n        // ② allOf 等全部，再逐个 join 收集\n        CompletableFuture<PageData> all = CompletableFuture\n                .allOf(profileF, ordersF, couponsF)\n                .thenApply(v -> new PageData(\n                        profileF.join(),      // 已完成，不会阻塞\n                        ordersF.join(),\n                        couponsF.join()));\n\n        // ③ 整体超时 + 最终兜底\n        return all.orTimeout(3, TimeUnit.SECONDS)               // JDK 9+\n                  .exceptionally(e -> {\n                      log.error("aggregate timeout/failed, uid={}", userId, e);\n                      return PageData.empty();                   // 整页降级\n                  })\n                  .join();\n    }\n\n    private Profile loadProfile(long uid) { return null; }\n    private List<Order> loadOrders(long uid) { return List.of(); }\n    private List<Coupon> loadCoupons(long uid) { return List.of(); }\n}',
                complexity:
                  '总耗时 ≈ `max(三个下游的 RT)`（并行）+ 少量编排开销，而不是三者之和 · 最坏情况被 `orTimeout` 限制在 3 秒 · 线程占用：3 个池线程（峰值），比「串行 3 次」的 1 个线程占用高，但总体 RT 低得多。',
                traps: [
                  '不传 `pool`，用默认 `commonPool`：阻塞任务占满全 JVM 共享线程，影响所有其他异步任务',
                  '`allOf` 后忘记再 `join` 收集：拿到的是 `Void`，没有结果',
                  '只加整体 `orTimeout` 而不配下游超时：整体快速失败了，但子任务还在跑，线程被长时间占用',
                  '在 `handle` 里重新抛出异常：等于没兜底，`allOf` 仍然整体失败',
                  '`thenApply` 里返回 `CF` 而不用 `thenCompose`：得到嵌套 `CF`，`join` 拿不到最终值',
                ],
              },
              {
                kind: 'principle',
                title: 'CompletableFuture 的四条实践规则',
                body: [
                  '`CF` 的 API 面很大，但线上真正会出问题的只有四个点。记住这四条，比背 40 个方法有用。',
                ],
                steps: [
                  {
                    title: '① 所有可能阻塞的任务，必须传自定义线程池',
                    detail:
                      '`commonPool` 的并行度是 `核数 - 1` 且全 JVM 共享，专为「短小 CPU 密集」设计。IO 密集或阻塞任务塞进去会占满它，影响包括第三方库在内的所有 `CF`。这一条是「必须」而不是「建议」。',
                  },
                  {
                    title: '② 每个 `CF` 都要有「出口」：`join` 或 `exceptionally`',
                    detail:
                      '`CF` 的异常是**静默的**——如果你从不 `join`，也从不 `handle`，任务失败了不会有任何日志。所以要么在链尾 `join` 取值，要么每个链尾都挂 `exceptionally` 兜底 + 打日志。',
                  },
                  {
                    title: '③ 用 `handle` 把「可能失败」转成「一定成功」',
                    detail:
                      '批量调用时，如果希望「部分成功也返回」，就在每个子任务上 `.handle(...)` 包装成 `Result<T>`。这样 `allOf` 不会整体失败，你能拿到成功的部分——这是「降级」的标准实现方式。',
                  },
                  {
                    title: '④ 串行用 `thenCompose`、并行用 `thenCombine`、批量用 `allOf`',
                    detail:
                      '三个方法对应三种依赖关系，选错了会写成「串行执行」导致 RT 相加。判据：**后者依赖前者的结果 → 串行（`thenCompose`）；两者互不依赖 → 并行（`thenCombine` / `allOf`）**。',
                  },
                ],
                takeaway:
                  '一句话收口：**`CF` 把「阻塞取值」变成「声明式编排」，代价是「线程模型变隐式」与「异常变静默」。** 所以用它的关键不是记 API，而是盯住两件事：**任务在哪个池跑**、**失败有没有出口**。这两件事管住了，`CF` 就只是一个表达力更强的工具。',
              },
            ],
            outline: [
              'Future 三缺（不能组合 / 只能阻塞取 / 无异常处理），CF 三补（组合 / 回调 / 异常分支）',
              'thenApply 转换值、thenAccept 消费无返回、thenRun 不接收值；带 Async 才换线程',
              'thenCompose 拍平嵌套（等价 flatMap），thenCombine 并行聚合，allOf 批量等待',
              'exceptionally 仅异常时执行且吞异常；handle 总是执行且可改结果；whenComplete 只观察',
              '默认 commonPool 并行度仅核数-1 且全 JVM 共享；allOf 返回 Void 要自己 join 收集',
            ],
            pitfalls: [
              '把阻塞 IO 丢进 commonPool：拖垮全 JVM 共享的并行度，连带影响第三方库',
              '用 thenApply 接一个返回 CF 的函数：得到嵌套 CF，join 拿不到最终值',
              'allOf 后直接 join 就以为拿到结果：它返回 CF<Void>，必须自己逐项 join 收集',
            ],
          },
        },
        {
          id: 'virtual-threads',
          title: '虚拟线程与结构化并发',
          kind: 'concept',
          sources: [{ topic: 'java-03', chapters: ['虚拟线程'] }],
          content: {
            intro:
              '虚拟线程是 JDK 21（JEP 444）最重要的变化：**由 JVM 而非操作系统调度**，遇到阻塞 IO 时自动「卸载」让出载体线程，让「一个请求一个线程」的写法重新具备高吞吐。但它不是银弹——`synchronized` 块内阻塞会导致 **pinning（载体线程被钉住）**，本地方法调用同样如此，吞吐可能不升反降。这一节讲清它的调度模型、栈存在哪、挂起恢复的代价，以及适用与不适用的边界；最后给一份「现有线程池该不该迁移到虚拟线程」的判断清单——以及为什么「虚拟线程不需要池化」这句话只在限流这个意义上才成立。',
            sections: [
              {
                kind: 'concept',
                title: '虚拟线程：把「线程」从内核手里抢回来',
                body: [
                  '传统 Java 线程是**平台线程**：一个 `Thread` 对象对应一个**操作系统线程**（1:1）。OS 线程的创建成本约 1MB 栈 + 内核结构，所以「一万并发」在传统模型下就是 10GB 栈空间——这是「线程池 + NIO」这套复杂架构存在的根本原因。',
                  '虚拟线程把映射关系改成 **M:N**：M 个虚拟线程跑在 N 个**载体线程（carrier thread）**上，N ≈ CPU 核数。当你调用阻塞 API（`Socket.read`、`Thread.sleep`、`BlockingQueue.take` 等）时，JVM 会把虚拟线程的**栈帧复制到堆**（`StackChunk`），然后把载体线程让出来给别人用；IO 就绪后再把栈帧**复制回**载体线程继续跑。',
                  '关键点在于：**「阻塞」这个概念被重新定义了**。对虚拟线程来说，`read()` 不再是「占着 OS 线程干等」，而是「把栈存到堆里，等人叫我」。所以「一万个虚拟线程同时等 IO」的实际成本只是「一万个几百字节的栈对象」——这才是它能承载百万级并发的原理。',
                  '一个必须纠正的误解：**虚拟线程不是「更快的线程」，而是「更便宜的线程」**。单个虚拟线程的执行速度与平台线程**完全一样**（都是跑在载体线程上）。它带来的是「用更少资源承载更多并发」，而不是「单个任务更快」。这决定了它只对 **IO 密集型** 有收益——CPU 密集任务本来就不需要「更多线程」。',
                ],
                term: {
                  name: '载体线程（Carrier Thread）',
                  def: '真正执行虚拟线程的平台线程。虚拟线程运行时「挂载」到某个载体线程上，阻塞时「卸载」让出载体线程。默认载体池是 `ForkJoinPool`，并行度等于 CPU 核数，可通过 `jdk.virtualThreadScheduler.parallelism` 调整。',
                },
                points: [
                  '平台线程 1:1 对应 OS 线程（栈约 1MB）；虚拟线程 M:N 复用载体线程',
                  '阻塞时把栈帧复制到堆（`StackChunk`），让出载体线程；恢复时复制回来',
                  '虚拟线程是「更便宜的线程」，不是「更快的线程」——单价执行速度不变',
                  '只对 IO 密集有收益；CPU 密集任务本来就不需要更多线程',
                ],
              },
              {
                kind: 'diagram',
                title: '平台线程与虚拟线程：栈在哪、谁在调度',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '平台线程（1:1）',
                      note: 'OS 直接调度',
                      slots: [
                        { label: 'Thread 对象', value: '→ OS 线程', tone: 'warn' },
                        { label: '栈', value: '1MB，固定，内核/用户栈', tone: 'bad' },
                        { label: '调度者', value: '操作系统', tone: 'muted' },
                        { label: '上下文切换', value: '用户态 ↔ 内核态', tone: 'muted' },
                        { label: '一万个', value: '≈ 10GB 栈', tone: 'bad' },
                      ],
                    },
                    {
                      name: '虚拟线程（M:N）',
                      note: 'JVM 调度',
                      slots: [
                        { label: 'VirtualThread', value: '→ Continuation', tone: 'primary' },
                        { label: '栈', value: '堆上的 StackChunk，按需增长', tone: 'primary' },
                        { label: '载体', value: 'ForkJoinPool，并行度 = 核数', tone: 'primary' },
                        { label: '挂起', value: '栈复制到堆 + 让出载体', tone: 'primary' },
                        { label: '一百万个', value: '≈ 几百 MB 堆', tone: 'good' },
                      ],
                    },
                  ],
                  caption:
                    '最值得记住的一行是「栈在堆上」。这带来三个推论：① 虚拟线程的栈**可以按需增长**（初始只有几百字节，不像平台线程固定 1MB）；② 栈是**堆对象**，所以会被 GC 扫描（这是虚拟线程的一个隐藏成本）；③ 「把栈复制到堆再复制回来」就是挂起/恢复的开销——**它比线程上下文切换便宜得多，但绝不是零**。',
                },
              },
              {
                kind: 'question',
                title: '虚拟线程和平台线程有什么区别？',
                questionId: 'java-03-Q75',
                intent:
                  '基础对比题。核心是「谁调度」「栈在哪」「成本差几个数量级」三点，别只说「更轻量」。',
                points: [
                  '**调度者**：平台线程由 OS 调度（1:1）；虚拟线程由 **JVM** 调度，挂载到载体线程（M:N）',
                  '**栈的位置**：平台线程栈是固定的 1MB（`-Xss` 可调）；虚拟线程栈在**堆**上，按需增长，初始几百字节',
                  '**数量级**：平台线程通常几千个就到极限（内存 + 调度开销）；虚拟线程可以到**百万级**',
                  '**阻塞语义**：平台线程阻塞时占着 OS 线程干等；虚拟线程阻塞时**卸载**，让出载体线程',
                  '**创建成本**：平台线程要系统调用；虚拟线程只是在堆上 new 一个对象',
                  '**默认属性**：虚拟线程**永远是守护线程**（不能 `setDaemon(false)`），且**不支持** `ThreadGroup` 的一些老 API',
                  '**调度公平性**：虚拟线程**没有优先级**（`setPriority` 无效），由 JVM 的 FIFO 调度',
                ],
                depth:
                  '「为什么虚拟线程永远是守护线程」——因为它存在的前提就是「不阻止 JVM 退出」。若允许非守护虚拟线程，JVM 退出时就要等它们全部结束，而它们可能有上百万个、其中一些在等永不返回的 IO——那 JVM 就永远退不出了。所以 JDK 直接规定：**虚拟线程一律是守护线程**。',
                followup: '「虚拟线程相比传统线程有什么限制」——① 不能设优先级；② 不能设守护属性；③ `ThreadGroup` 相关 API 行为受限；④ 在 `synchronized` 里阻塞会 pinning（JDK 24 前）；⑤ 大量 `ThreadLocal` 会撑爆堆（每虚拟线程一份）。',
              },
              {
                kind: 'question',
                title: '虚拟线程的底层原理？（调度、栈存放、挂起恢复）',
                questionId: 'java-03-Q76',
                intent:
                  '进阶题。要说清三个构件：`Continuation`、载体线程池、`StackChunk`。能提到 `Continuation.yield/resume` 就很到位。',
                points: [
                  '**调度**：`ForkJoinPool`（默认并行度 = 核数，可用 `jdk.virtualThreadScheduler.parallelism` 调整）作为载体线程池；虚拟线程是一个**任务**，被提交到载体池执行',
                  '**栈**：虚拟线程的栈是堆上的 `StackChunk` 对象链，**按需增长**；运行时才被复制到载体线程的栈上',
                  '**挂起**：底层是 `Continuation.yield()`——JVM 把当前栈帧**复制到堆**，保存续点（continuation），然后从载体线程的栈上弹出',
                  '**恢复**：`Continuation.run()` 把堆上的栈帧**复制回**载体线程的栈，从续点继续执行',
                  '**关键**：恢复后**可能挂到另一个载体线程**（不是原来那个），所以虚拟线程不能依赖「线程本地假设」（如 `Thread.currentThread()` 在挂起前后返回值不变，但载体线程变了）',
                  '**阻塞点如何识别**：JDK 把阻塞 API 改为「可感知虚拟线程」的实现——`Socket`、`Selector`、`Thread.sleep`、`park`、`BlockingQueue` 等内部会调 `VirtualThread.park()`，触发卸载',
                  '**JDK 21 的局限**：`synchronized`、`Object.wait`、native 方法/jni 内的阻塞**无法卸载**（会 pinning）；JDK 24（JEP 491）解决了 `synchronized` 的 pinning',
                ],
                depth:
                  '为什么「恢复后可能挂到另一个载体线程」很重要：它意味着**任何依赖「载体线程本地状态」的代码都会出问题**。典型的有：① 依赖 `ThreadLocal` 存「当前请求」——虚拟线程的 `ThreadLocal` 是每虚拟线程一份，语义上正确但内存开销大；② 某些 native 库把状态存在线程局部存储（TLS）里，虚拟线程切换载体后状态就丢了。这也是「虚拟线程不保证载体亲和性」这个说法的由来。',
                followup: '「虚拟线程的栈会 OOM 吗」——会。因为它存在堆上，如果大量虚拟线程的栈都很深（长调用链 + 递归），`StackChunk` 会占大量堆。所以虚拟线程不是「无限并发」——并发数仍受堆大小约束。经验值：一个简单的虚拟线程约占几百字节到几 KB。',
              },
              {
                kind: 'diagram',
                title: '一次阻塞：挂载 → 卸载 → 恢复',
                diagram: {
                  type: 'sequence',
                  actors: ['虚拟线程 VT', '载体线程 C1', 'ForkJoinPool', 'IO 事件'],
                  messages: [
                    { from: 'ForkJoinPool', to: '载体线程 C1', text: '调度 VT 到 C1 上运行' },
                    { from: '虚拟线程 VT', to: '载体线程 C1', text: '执行 run()，走到 socket.read()' },
                    { from: '载体线程 C1', to: '虚拟线程 VT', text: '检测到可卸载阻塞点', reply: true },
                    { from: '虚拟线程 VT', to: '虚拟线程 VT', text: 'Continuation.yield：栈帧复制到堆' },
                    { from: '载体线程 C1', to: 'ForkJoinPool', text: '载体空出来了，去跑别的虚拟线程', reply: true },
                    { from: 'IO 事件', to: 'ForkJoinPool', text: '数据就绪，把 VT 重新入队' },
                    { from: 'ForkJoinPool', to: '载体线程 C1', text: '可能调度到 C2（不保证同一载体）' },
                    { from: '载体线程 C1', to: '虚拟线程 VT', text: 'Continuation.run：栈帧复制回栈，从续点继续' },
                  ],
                  caption:
                    '注意第 5 步：**载体线程立刻被复用了**——这是虚拟线程的全部价值。一个载体线程可以在 1 秒内服务上万个虚拟线程的「等待间隙」。也注意第 7 步：恢复时**可能换载体**，所以「靠载体线程本地变量传递状态」的代码会出错。',
                },
              },
              {
                kind: 'question',
                title: '什么是 Pinning（钉住）问题？怎么排查和解决？',
                questionId: 'java-03-Q77',
                intent:
                  '虚拟线程最重要的坑。要说清「什么会导致 pinning」「后果是什么」「怎么发现」「怎么修」。',
                points: [
                  '定义：虚拟线程在**无法卸载**的情况下阻塞，导致**载体线程被占住**——此时虚拟线程「钉」在了载体上',
                  '两个主要原因：① 在 **`synchronized` 块内**阻塞（JDK 21/22；JDK 24 的 JEP 491 已修复）；② 调用 **native 方法 / JNI**，native 代码里阻塞时 JVM 无法接管',
                  '后果：载体线程被占，其他虚拟线程无法被调度；如果所有载体都被钉住，**整个调度器饿死**（吞吐从「百万并发」掉到「核数个并发」）',
                  '`synchronized` 会 pinning 的原因：monitor 的持有者是**载体线程**，若虚拟线程带着锁卸载，锁的语义就乱了——所以 JVM 选择「不卸载」',
                  '`ReentrantLock` **不会** pinning：它的持有者记录在 `AbstractOwnableSynchronizer` 里，是基于虚拟线程的，可以安全卸载',
                  '排查：`-Djdk.tracePinnedThreads=full`（JDK 21）启动参数，会在 pinning 时打印栈；或用 JFR 的 `jdk.VirtualThreadPinned` 事件',
                  '解决：把 `synchronized` 换成 `ReentrantLock`；把 native 调用移到虚拟线程之外；升级到 JDK 24+',
                ],
                depth:
                  '「为什么 `ReentrantLock` 可以而 `synchronized` 不行」——因为两者的锁持有者语义不同。`synchronized` 的 monitor 与**载体线程**绑定（对象头 Mark Word 记录的是 OS 线程），虚拟线程卸载后载体线程可能去跑别的虚拟线程，锁的归属就乱了。`ReentrantLock` 的 `exclusiveOwnerThread` 记录的是**虚拟线程对象**，卸载后归属仍然正确——所以它天然支持卸载。这是「实现细节决定能力边界」的典型例子。',
                followup: '「JDK 24 真的完全解决了吗」——JEP 491（JDK 24）重新实现了 `synchronized` 在虚拟线程上的语义，消除了 pinning。但 **native 方法的 pinning 仍在**（JVM 无法感知 native 代码里的阻塞）。所以「升级 JDK 24 就万事大吉」是错的，native 调用仍需注意。',
              },
              {
                kind: 'diagram',
                title: '哪些操作会钉住载体线程',
                diagram: {
                  type: 'split',
                  left: {
                    title: '✗ 会 pinning（JDK 21）',
                    tone: 'bad',
                    items: [
                      '`synchronized` 块内阻塞（JDK 24 前）',
                      '`Object.wait()`',
                      'native 方法 / JNI 内的阻塞',
                      '`Socket` 的传统实现（部分场景）',
                      '文件 IO（部分场景无法卸载）',
                      '深入 native 的 JDBC 驱动（老版本）',
                    ],
                  },
                  right: {
                    title: '✓ 不会 pinning',
                    tone: 'good',
                    items: [
                      '`ReentrantLock` 的 `lock()` / `Condition.await()`',
                      '`Thread.sleep()`',
                      '`LockSupport.park()`',
                      '`BlockingQueue` 的 `put` / `take`',
                      'NIO 的 `SocketChannel` / `Selector`',
                      '`CompletableFuture.join()`（内部 park）',
                    ],
                  },
                  caption:
                    '判断标准只有一条：**这个阻塞点 JVM 能不能接管**。能接管（JDK 内部改写成 `VirtualThread.park()`）就不会 pinning；不能接管（依赖 OS 线程状态或 native 栈）就会。所以「老 JDBC 驱动配虚拟线程吞吐上不去」不是虚拟线程的问题，而是驱动里用了 `synchronized` 或 native 锁。',
                },
              },
              {
                kind: 'code',
                title: 'pinning 的复现、排查与修法',
                lang: 'java',
                code:
                  '// ✗ 会 pinning：synchronized 里做阻塞 IO\nclass BadService {\n    private final Object lock = new Object();\n\n    String fetch(String url) {\n        synchronized (lock) {                 // ← monitor 绑在载体线程上\n            return httpGet(url);              // 阻塞 → 载体线程被钉住\n        }\n    }\n}\n\n// ✓ 修法：换成 ReentrantLock（持有者是虚拟线程，可安全卸载）\nclass GoodService {\n    private final ReentrantLock lock = new ReentrantLock();\n\n    String fetch(String url) {\n        lock.lock();\n        try {\n            return httpGet(url);              // 阻塞时虚拟线程正常卸载\n        } finally {\n            lock.unlock();\n        }\n    }\n}\n\n// ◆ 启动参数：打印 pinning 的栈（JDK 21）\n// java -Djdk.tracePinnedThreads=full -cp ... Main\n//\n// 输出示例：\n// Thread[#28,ForkJoinPool-1-worker-1,5,CarrierThreads]\n//     jdk.internal.vm.Continuation.run(Continuation.java:248) <== monitors:1\n//     java.lang.Thread.run(Thread.java:1583) <== monitors:1\n//     at BadService.fetch(BadService.java:8) <== monitors:1\n//                                                  ↑ 这里就是线索\n\n// ◆ JFR 事件（生产环境更实用）\n// jcmd <pid> JFR.start name=vt settings=profile duration=60s filename=vt.jfr\n// 然后看 jdk.VirtualThreadPinned 事件的堆栈\n\n// ◆ 压测对比：一句话说明后果\n// 10000 个虚拟线程 + 核数个载体，若是 BadService：\n//   每个 sync 块阻塞 100ms → 载体全被钉住 → 实际并发只剩「载体数」\n//   总耗时 ≈ 10000 / 核数 × 100ms（8 核 = 125 秒）\n// 换成 GoodService（ReentrantLock）：\n//   载体不断被让出 → 总耗时 ≈ 100ms × 少量批次（约 1 秒内）',
                caption:
                  '注释里那段「压测对比」是这道题最该说的话：**pinning 不是「性能略降」，而是「并发度从万级掉到核数级」**——量级差异。所以「用了虚拟线程吞吐没提升」时，第一个要查的就是 `-Djdk.tracePinnedThreads=full`。',
                notes: [
                  { line: 'synchronized (lock) {', text: 'monitor 的持有者记在对象头里（与 OS 线程绑定），虚拟线程卸载后归属会乱，所以 JVM 选择「不卸载」——这就是 pinning 的根因。' },
                  { line: '<== monitors:1', text: '`-Djdk.tracePinnedThreads` 输出里的这个标记就是「因为持有 1 个 monitor 而 pinning」，配合下面一行就是具体的代码位置。' },
                  { line: 'jdk.VirtualThreadPinned', text: 'JFR 事件，生产环境开启无侵入，且能统计「pinning 时长」——比只看次数更有价值。' },
                ],
              },
              {
                kind: 'question',
                title: '虚拟线程适合什么场景？不适合什么场景？怎么创建？',
                questionId: 'java-03-Q78',
                intent:
                  '判断题。核心是「IO 密集有收益、CPU 密集无收益」，以及「不要池化」。创建方式要能说出三种。',
                points: [
                  '**适合**：IO 密集型——HTTP 客户端调用、数据库查询、消息消费、文件/网络读写；尤其是「一个请求要串行调 3 个下游」这种「阻塞叠加」场景',
                  '**不适合**：CPU 密集型——本来就不需要更多线程，虚拟线程只会增加调度开销',
                  '**不适合**：有大量 `synchronized` 阻塞（JDK 24 前）、依赖 native/JNI 阻塞（老 JDBC 驱动、老 HTTP 客户端）的场景',
                  '**不适合**：需要 `ThreadLocal` 存大对象的场景——每个虚拟线程一份，百万虚拟线程会撑爆堆',
                  '创建方式一：`Thread.ofVirtual().name("vt-", 0).start(runnable)`',
                  '创建方式二：`Executors.newVirtualThreadPerTaskExecutor()`（**每任务一个虚拟线程**，不池化）',
                  '创建方式三：`Thread.startVirtualThread(runnable)`（最简单，适合一次性任务）',
                  '**不要**用 `ThreadPoolExecutor` 去「池化虚拟线程」——池化是为了复用昂贵的资源，而虚拟线程很便宜，池化反而限制了并发度',
                ],
                depth:
                  '「为什么不能池化虚拟线程」——这是最容易被误解的一点。池化的价值是「复用昂贵的创建成本」，而虚拟线程的创建成本几乎为零（一次对象分配）。更重要的是，**池化会破坏虚拟线程的核心优势**：池的大小成了并发上限，那你就又回到「线程池大小 = 并发度」的老模型，百万并发的意义消失了。**虚拟线程的正确用法是「每任务一个」，用 `Semaphore` 做限流。**',
                followup: '「虚拟线程会影响现有代码吗」——大部分不影响（它实现了 `Thread` 接口），但要注意：① 依赖 `ThreadLocal` 做缓存的代码会内存膨胀；② 用 `synchronized` 包阻塞的代码会 pinning；③ 依赖「线程名有业务含义」的监控会失效（虚拟线程名默认是空的）；④ 线程池相关的 `ThreadPoolExecutor` 配置不再适用。',
              },
              {
                kind: 'question',
                title: '虚拟线程还需要线程池吗？',
                questionId: 'java-03-Q79',
                intent:
                  '辨析题。答案是「不需要池化，但需要限流」——能分清这两件事就赢了。',
                points: [
                  '**不需要「池」**：池化的目的是复用昂贵的线程，虚拟线程很便宜，复用没有意义',
                  '**但需要「限流」**：无限制地创建虚拟线程会打爆下游（数据库连接数、下游 QPS 上限），必须显式限制',
                  '限流的正确工具是 **`Semaphore`**（或下游连接池自身的大小），而不是「限制线程池大小」',
                  '`Executors.newVirtualThreadPerTaskExecutor()` 名字里有 Executor 但不是池——它**每次 `submit` 都创建一个新的虚拟线程**',
                  '载体线程池是 JVM 内部管理的（`ForkJoinPool`），**业务代码不应该也不需要对它做配置**',
                  '如果必须复用「某种昂贵资源」（如数据库连接），池化的是**那个资源**，不是虚拟线程',
                  '结论一句话：**「虚拟线程不要池化，但并发要限流」**',
                ],
                depth:
                  '「用 `Semaphore` 限流的具体写法」——`Semaphore permits = new Semaphore(200);`，每个任务 `permits.acquire()` 后再干活、`finally` 里 `release()`。注意**不要把 `acquire` 放在虚拟线程内部**（那样虚拟线程已经创建了，只是被阻塞，虽然便宜但仍占堆）；更好的做法是在「提交前」`acquire`，这样连虚拟线程都不用创建。',
                followup: '「那 `newVirtualThreadPerTaskExecutor` 提交百万任务会怎样」——会创建百万个虚拟线程对象，每个几百字节到几 KB，加上任务对象本身，堆可能撑不住。所以「不限流」是虚拟线程最大的误用方式——**它把「线程不够」的问题换成了「内存不够」的问题**，而不是消灭了问题。',
              },
              {
                kind: 'question',
                title: '场景题：两个线程各对共享变量加 50 次，结果为什么常常小于 100？怎么修？',
                questionId: 'java-03-Q80',
                intent:
                  '这题表面在问虚拟线程，实际是**经典的 `i++` 竞态**。要先指出「这与虚拟线程无关」，再给修法——能点破这一点就是满分。',
                points: [
                  '**根因与虚拟线程无关**：`i++` 是「读 → 加一 → 写」三步，两个线程交错执行会丢更新（与平台线程完全一样）',
                  '典型交错：T1 读 0、T2 读 0、T1 写 1、T2 写 1 → 两次自增只加了 1',
                  '**虚拟线程会放大这个问题**：因为线程更多、切换更频繁，交错概率更高，「小于 100」更常见、偏差更大',
                  '修法一：`AtomicInteger.incrementAndGet()`（CAS，单变量最优）',
                  '修法二：`synchronized` / `ReentrantLock`（多变量一致性时）',
                  '修法三：`LongAdder`（高并发累加，读不精确）',
                  '**错误修法**：给 `int i` 加 `volatile`——只保证可见性，不保证原子性，仍会丢更新',
                  '虚拟线程场景的额外注意：**不要用 `synchronized` 包 `i++`**（虽然不阻塞所以不会 pinning，但仍是「为了一个计数器抢锁」的过度设计）',
                ],
                depth:
                  '这道题的价值在于「考你會不會被题干带偏」。题干说「虚拟线程」是想看你会不会说「因为虚拟线程调度所以…」——正确回答是「**这是与线程实现无关的经典竞态**，虚拟线程只是让交错更频繁、更容易观察到」。面试官问这类题，通常是想确认你「能不能分辨「本质问题」与「环境因素」」。',
                followup: '「如果要求 100 次后打印结果，怎么保证看到最终值」——用 `CountDownLatch(2)` 等两个线程都结束再读（`join` 也行）。注意：**即使加了 `join`，如果自增本身不是原子的，结果仍然小于 100**——`join` 只保证「读的时候所有写已完成」，不保证「写与写不冲突」。',
              },
              {
                kind: 'code',
                title: '虚拟线程版的竞态与三种修法',
                lang: 'java',
                code:
                  '// ✗ 错：与线程实现无关的经典竞态\nstatic int count = 0;                        // 普通 int\n\npublic static void main(String[] args) throws Exception {\n    Thread t1 = Thread.ofVirtual().start(() -> { for (int i = 0; i < 50; i++) count++; });\n    Thread t2 = Thread.ofVirtual().start(() -> { for (int i = 0; i < 50; i++) count++; });\n    t1.join(); t2.join();\n    System.out.println(count);               // 常见输出 87、94、98……很少是 100\n}\n\n// ✗ 错上加错：volatile 也修不好\nstatic volatile int badCount = 0;            // 只保证可见性，不保证三步原子\n\n// ✓ 修法一：AtomicInteger（单变量最优）\nstatic final AtomicInteger atomicCount = new AtomicInteger();\n// atomicCount.incrementAndGet();\n\n// ✓ 修法二：ReentrantLock（多变量要一起变时；虚拟线程下不会 pinning）\nstatic final ReentrantLock LOCK = new ReentrantLock();\nstatic int lockedCount = 0;\nstatic void incLocked() {\n    LOCK.lock();\n    try { lockedCount++; } finally { LOCK.unlock(); }\n}\n\n// ✓ 修法三：LongAdder（超高并发累加，读不精确）\nstatic final LongAdder adder = new LongAdder();\n// adder.increment();  … long total = adder.sum();\n\n// ◆ 正确的完整写法 + 限流（虚拟线程不要池化，但必须限流）\npublic class VirtualThreadDemo {\n    public static void main(String[] args) throws Exception {\n        AtomicInteger cnt = new AtomicInteger();\n        Semaphore permits = new Semaphore(200);       // 限流：最多 200 个同时打下游\n\n        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {\n            for (int i = 0; i < 10_000; i++) {\n                permits.acquire();                    // 在提交前限流（连虚拟线程都不创建）\n                pool.submit(() -> {\n                    try {\n                        cnt.incrementAndGet();        // 原子自增\n                        callDownstream();             // 阻塞 IO，虚拟线程正常卸载\n                    } finally {\n                        permits.release();\n                    }\n                });\n            }\n        }                                             // close() 会等所有任务结束\n        System.out.println("done, count = " + cnt.get());   // 10000\n    }\n}',
                caption:
                  '最后那段代码体现了虚拟线程的三条正确用法：**① `newVirtualThreadPerTaskExecutor`（不池化）**、**② `Semaphore` 限流（在提交前）**、**③ `try-with-resources` 自动 `close` 并等待全部完成**。这三条加上「避免 `synchronized` 包阻塞」，就是虚拟线程的完整实践要点。',
                notes: [
                  { line: 'static int count = 0;', text: '普通 `int` 的 `++` 编译成四条字节码，中间可以被切走。这是竞态，与虚拟线程无关。' },
                  { line: 'permits.acquire();  // 提交前限流', text: '在 `submit` 之前 `acquire`，这样「超限的请求连虚拟线程都不创建」，比在任务内 `acquire` 更省资源。' },
                  { line: 'try (ExecutorService pool = ...)', text: 'JDK 19+ `ExecutorService` 实现了 `AutoCloseable`，`close()` 等价于 `shutdown()` + `awaitTermination()`（无限等）。' },
                ],
              },
              {
                kind: 'analogy',
                title: '虚拟线程像剧院的「角色」与「演员」',
                text:
                  '一个剧院只有 **8 个演员**（载体线程 = CPU 核数），但要演一出台词里有 **一万个角色**（虚拟线程）的戏。演员穿上某个角色的服装上台（**挂载**），说到「等他回信」这句台词时，**脱下服装回后台**（**卸载**，栈存到仓库里），换下一个角色的服装上台。等「信」到了，随便哪个空着的演员都能穿回那身服装**从刚才那句台词继续念**（**恢复，可能换演员**）。',
                mapping: [
                  { real: '剧院的 8 个演员', tech: '载体线程（ForkJoinPool，并行度 = 核数）' },
                  { real: '戏里的一万个角色', tech: '虚拟线程' },
                  { real: '穿上服装上台', tech: '挂载（mount）到载体线程' },
                  { real: '说到「等他回信」就下台', tech: '遇到可卸载阻塞点，`Continuation.yield`' },
                  { real: '服装收进后台仓库', tech: '栈帧复制到堆（`StackChunk`）' },
                  { real: '等信期间演员去演别的角色', tech: '载体线程被其他虚拟线程复用' },
                  { real: '信到了，随便哪个空演员穿回服装继续', tech: '恢复（可能换载体线程）' },
                  { real: '某个角色把唯一一把道具锁带走下台了', tech: '**pinning**：`synchronized` 阻塞导致载体被占' },
                ],
                limit:
                  '类比到「pinning」就不成立了：现实中演员可以拿着道具下台（大不了下一个角色等着），而虚拟线程在 `synchronized` 块里阻塞时，**JVM 不允许它带走 monitor**——因为 monitor 的归属记在「演员」（载体线程）身上，角色（虚拟线程）换了演员锁就乱了。所以 JVM 的选择是「**干脆不让它下台**」，让这个演员一直站着等——这就是 pinning 导致载体被浪费的本质。',
              },
              {
                kind: 'principle',
                title: '该不该迁移到虚拟线程：五个判断',
                body: [
                  '虚拟线程是「架构级」变化，不是「加个参数」。迁移前按这五条判断，能避免「改了之后吞吐没变甚至更差」的尴尬。',
                ],
                steps: [
                  {
                    title: '① 任务是不是 IO 密集？',
                    detail:
                      '是 → 有收益；不是（CPU 密集）→ **没有收益**，别迁。判据：任务的「等待时间 / 计算时间」比例，比例越高收益越大。可以用 APM 或火焰图看 wall time 与 cpu time 的差。',
                  },
                  {
                    title: '② 有没有大量 `synchronized` 包阻塞？',
                    detail:
                      '有 → 先换成 `ReentrantLock`，或升级到 JDK 24+（JEP 491 已修复）。否则会 pinning，吞吐可能反而下降。用 `-Djdk.tracePinnedThreads=full` 或 JFR 的 `jdk.VirtualThreadPinned` 先摸底。',
                  },
                  {
                    title: '③ 依赖的第三方库有没有 native 阻塞？',
                    detail:
                      '老版本 JDBC 驱动、老 HTTP 客户端、某些加解密库会在 native 里阻塞或持 `synchronized`。这些**无法通过升级 JDK 解决**，只能升级库或把调用移出虚拟线程。',
                  },
                  {
                    title: '④ `ThreadLocal` 用得重不重？',
                    detail:
                      '每个虚拟线程一份 `ThreadLocalMap`，百万虚拟线程会显著增加堆占用。若代码里用 `ThreadLocal` 缓存大对象，迁移前要评估内存。',
                  },
                  {
                    title: '⑤ 现有「线程池大小」是不是被当作限流手段？',
                    detail:
                      '如果是，迁移后**必须换成 `Semaphore`**——否则失去限流，虚拟线程会把下游打爆。这是最容易被忽略的一条：**池化消失了，但限流需求还在**。',
                  },
                ],
                takeaway:
                  '一句话收口：**虚拟线程把「线程数量」这个约束几乎取消了，但「下游容量」「CPU 核数」「内存」这三个约束还在。** 所以迁移的核心不是「换 API」，而是把「用线程数限流」换成「用信号量限流」，并把 `synchronized` 包阻塞的写法改掉。',
              },
            ],
            outline: [
              '虚拟线程由 JVM 调度（M:N 挂到载体线程），栈在堆上按需增长，是「更便宜」而非「更快」',
              '挂起 = Continuation.yield 把栈复制到堆并让出载体；恢复可能挂到另一个载体线程',
              'pinning：synchronized 内阻塞或 native 阻塞会钉住载体；改用 ReentrantLock，JDK 24 已修 synchronized',
              '只适合 IO 密集；CPU 密集无收益；大量 ThreadLocal 会撑爆堆',
              '不要池化虚拟线程，用 newVirtualThreadPerTaskExecutor；限流改用 Semaphore',
            ],
            pitfalls: [
              '把虚拟线程用于 CPU 密集任务：单价执行速度不变，只多出调度开销',
              '在 synchronized 里做阻塞调用导致 pinning：载体全被钉住，并发从万级掉到核数级',
              '用 ThreadPoolExecutor 池化虚拟线程：池大小变成并发上限，百万并发意义消失',
            ],
          },
        },
      ],
    },
    {
      id: 'jvm-memory',
      title: 'E · JVM 内存与垃圾回收',
      goal: '掌握内存布局、对象生命周期与 GC 的工作机制',
      summary:
        'JVM 部分的面试从来不是背名词，而是让你从「一个对象 new 出来」讲到「它被回收」。这一阶段按区域 → 对象 → 回收算法 → 收集器 → 分配策略的顺序推进，每一环都能对应到具体的故障现象。',
      lessons: [
        {
          id: 'jvm-memory',
          title: '运行时数据区',
          kind: 'concept',
          sources: [
            { topic: 'java-04', chapters: ['JVM 概览'] },
            { topic: 'java-04', chapters: ['运行时内存区域'] },
          ],
          content: {
            intro:
              '这一节要能**徒手画出运行时数据区**，并标注三件事：哪些线程私有、哪些共享、各自会抛什么错。规范里的五大区加上规范外却真实存在的直接内存与 Code Cache，构成一张「从 new 到 OOM」的完整地图。面试官常从这里切入，一路问到「堆没满为什么进程占 4G」。本节按「看全景 → 拆栈帧 → 追常量池 → 对错误码」四步推进，最后把所有 OOM 收敛成一张归因表。',
            outline: [
              '线程私有三块：PC、虚拟机栈、本地方法栈；共享两块：堆、方法区',
              '栈帧五件套：局部变量表、操作数栈、动态链接、返回地址、附加信息',
              'JDK 7 字符串常量池移入堆；JDK 8 永久代被元空间取代，改用本地内存',
              '直接内存与 Code Cache 不在规范内，不受 -Xmx 管，却计入进程 RSS',
              '七种 OOM 加 StackOverflowError 一一对应到区域，是排查的索引表',
            ],
            pitfalls: [
              '把方法区说成永久代：方法区是规范里的抽象概念，永久代只是 JDK 7 的实现',
              '认为字符串常量池在方法区：JDK 7 起它已在堆里，与元空间无关',
              '把 StackOverflowError 归为 OOM：它是 Error 但不是 OutOfMemoryError，成因是栈深度',
            ],
            sections: [
              {
                kind: 'question',
                title: 'JVM、JRE、JDK：三层嵌套，各管一段',
                questionId: 'java-04-Q1',
                intent:
                  '送分题，但三层关系要说准。最常见的错是「JRE 不包含 JVM」和「JDK 就是编译器」——这两句一出，后面的深度题就没人愿意听了。',
                points: [
                  '**JVM 是一份规范**，不是一个程序。《Java 虚拟机规范》定义了 class 文件格式、指令集、运行时数据区和错误类型；任何能读 class 文件并按规范执行的实现，都算 JVM',
                  '**JRE** = JVM + 核心类库（`java.*` / `javax.*`）+ 支撑文件。它是「**跑**一个 Java 程序的最小集合」',
                  '**JDK** = JRE + 开发工具（`javac`、`jar`、`javadoc`、`jdb`、`jmap`、`jstack`）。它是「**写**一个 Java 程序的最小集合」',
                  '嵌套关系：**JDK ⊃ JRE ⊃ JVM**。JDK 9 模块化后取消了独立的 `jre/` 目录，逻辑三层仍成立，可用 `jlink` 自己裁一个只含所需模块的运行时镜像',
                  '**JVM 存在的第一价值**：`javac` 把源码编成**平台无关的字节码**，平台差异被关进 JVM 内部——这才是「一次编写到处运行」的真实机制',
                  '**另外两层价值**：内存与 GC 托管（无需手动 free）、运行时安全（字节码校验、数组越界检查、类访问控制）',
                ],
                depth:
                  '「一次编译到处运行」今天要打个补丁：**字节码平台无关，但 JVM 平台相关**——准确说法是「一次编译，到处有对应 JVM 就能跑」。更常被追问的是：既然 JIT 最终也要生成机器码，为什么不直接静态编译？答案是**延迟决策**：只有运行时才知道真实 CPU 型号、真实分支走向、真实类型分布。`if (obj instanceof HashMap)` 这样的判断，静态编译期只能保守处理，JIT 却能观测到「99% 都是这一个类」而直接内联——这是 Java 长期性能逼近 C 的关键。',
                followup:
                  '「常见的 JVM 实现有哪些」——**HotSpot**（OpenJDK / Oracle JDK 默认，C1+C2 分层编译）、**GraalVM**（可 AOT 编成原生镜像，启动毫秒级但峰值优化弱于 C2）、**OpenJ9**（IBM 系，内存占用低，适合容器）、**ART**（Android，寄存器架构）。注意 **Oracle JDK 与 OpenJDK 的差别在许可证与少量商业特性，不在 VM 本体**。',
              },
              {
                kind: 'concept',
                title: '五大区与两种所有权：谁私有、谁共享',
                body: [
                  '《JVM 规范》把运行时数据区分成五块，划分依据只有一条：**生命周期归谁**。线程私有的区域随线程生、随线程死；线程共享的区域随 JVM 启动而生、随 JVM 退出而亡。',
                  '**线程私有**三块：程序计数器（PC）、虚拟机栈、本地方法栈。它们必须私有，因为它们记录的都是「**这个线程执行到哪了**」——PC 存当前字节码行号，栈存当前调用链。若共享，两个线程的调用链会互相覆盖，程序立刻崩溃。',
                  '**线程共享**两块：堆与方法区。堆存对象实例，方法区存类元信息、运行时常量池、静态变量。共享才合理——一个类的元信息全进程只需要一份，一万个实例共用。',
                  '规范之外还有几块真实内存：**直接内存**（`ByteBuffer.allocateDirect` 向 OS 申请的）、**Code Cache**（JIT 编出的机器码）、**GC 辅助结构**（卡表、记忆集、标记位图）、**线程栈总量**（线程数 × `-Xss`）。它们不在规范里，却全部计入进程 RSS——这正是「堆没满但进程占 4G」的答案所在。',
                ],
                term: {
                  name: '运行时数据区（Runtime Data Area）',
                  def: 'JVM 在执行 Java 程序过程中把它所管理的内存划分为若干区域。规范只规定**行为**（什么时候创建、什么时候销毁、会抛什么错误），不规定**实现**——比如「方法区」在 HotSpot 7 是永久代、在 HotSpot 8+ 是元空间、在 OpenJ9 又是另一套。面试里问「方法区在哪个区域」时，先分清问的是规范概念还是 HotSpot 实现。',
                },
                points: [
                  '私有：PC、虚拟机栈、本地方法栈——记录「本线程执行到哪」',
                  '共享：堆（对象实例）、方法区（类元信息 / 常量 / 静态变量）',
                  '规范外：直接内存、Code Cache、GC 辅助结构、线程栈总量——都进 RSS，都不受 `-Xmx` 管',
                  '判断口诀：**每个线程都得有一份自己的 → 私有；一个类 / 一个对象只有一份 → 共享**',
                ],
              },
              {
                kind: 'diagram',
                title: '运行时数据区全景：三块私有、两块共享、三块编外',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '线程私有（每线程一份）',
                      note: '随线程生灭',
                      slots: [
                        { label: '程序计数器', value: '行号；唯一不抛 OOM', tone: 'primary' },
                        { label: '虚拟机栈', value: '栈帧链；`-Xss` 定大小', tone: 'primary' },
                        { label: '本地方法栈', value: 'native 栈帧；HotSpot 合并', tone: 'primary' },
                      ],
                    },
                    {
                      name: '线程共享（进程一份）',
                      note: '随 JVM 生灭',
                      slots: [
                        { label: '堆', value: '对象实例；`-Xmx` 上限', tone: 'warn' },
                        { label: '方法区（元空间）', value: '类元信息', tone: 'warn' },
                        { label: '运行时常量池', value: '符号引用 + 字面量', tone: 'warn' },
                        { label: '字符串常量池', value: '**在堆里**（JDK 7 起）', tone: 'good' },
                      ],
                    },
                    {
                      name: '规范之外（本地内存）',
                      note: '不受 -Xmx 约束',
                      slots: [
                        { label: '直接内存', value: '`MaxDirectMemorySize`', tone: 'bad' },
                        { label: 'Code Cache', value: '`ReservedCodeCacheSize`', tone: 'muted' },
                        { label: '线程栈总量', value: '线程数 × 1MB', tone: 'bad' },
                      ],
                    },
                  ],
                  caption:
                    '特别注意第二区域里的「字符串常量池」：它的**逻辑归属**是方法区的运行时常量池，但**物理位置**从 JDK 7 起就在堆中。这是本课最高频的错答点。图上还给每块区域标了对应的启动参数——「参数管哪块区域」比背参数名有用得多：`-Xss` 管栈、`-Xmx` 管堆、`MaxDirectMemorySize` 管堆外，三者互不影响。',
                },
              },
              {
                kind: 'question',
                title: 'JVM 运行时数据区包括哪些部分？哪些是线程私有的？',
                questionId: 'java-04-Q5',
                intent:
                  '本课的主干题。答的时候按「私有 / 共享」两组报菜名，再补一句「规范外还有直接内存」，立刻比只背五块的候选人多一层。',
                points: [
                  '**线程私有①程序计数器**：当前线程执行的字节码行号指示器。分支、循环、跳转、异常处理、线程恢复都靠它',
                  '**线程私有②虚拟机栈**：每个方法调用创建一个栈帧（局部变量表 + 操作数栈 + 动态链接 + 返回地址）。方法调用即入栈，返回即出栈',
                  '**线程私有③本地方法栈**：为 native 方法服务。HotSpot 直接把它和虚拟机栈合并实现，所以 `-Xss` 同时管两者',
                  '**线程共享④堆**：几乎所有对象实例和数组都在这里分配，是 GC 主战场。分新生代（Eden + 2×Survivor）与老年代',
                  '**线程共享⑤方法区**：类元信息、运行时常量池、字段与方法描述、静态变量、JIT 编译后的代码（部分实现放 Code Cache）。JDK 8 起由**元空间**实现，位于本地内存',
                  '**规范外⑥直接内存**：`NIO` 的 `DirectByteBuffer` 从这里分配，不属于运行时数据区，但会被频繁问到',
                ],
                depth:
                  '「为什么 PC 是唯一不会 OOM 的区域」——因为它存的是一个**行号**（int 宽度），大小在编译期就固定了，不需要动态扩展。这也是一个漂亮的推理链：**能否 OOM 取决于「这块区域会不会按需增长」**。堆和栈会（栈是深度增长、堆是对象增长），PC 不会，所以规范明确写出「此区域不会抛 OutOfMemoryError」。答出这个因果，比背结论强得多。',
                followup:
                  '「JVM 内存结构和 JMM 有什么区别」——这题几乎必跟在后面。一句话分清：**JVM 内存结构是「东西放在哪」（物理划分：堆、栈、方法区）；JMM 是「多线程读写共享变量时的规则」（抽象模型：主内存 + 每个线程的工作内存，配 happens-before 与 8 种原子操作）**。JMM 里的「主内存」并不等于堆、「工作内存」也不等于栈——它是逻辑概念，落到硬件上对应 CPU 缓存与寄存器。',
              },
              {
                kind: 'question',
                title: '程序计数器：为什么它必须是线程私有的？',
                questionId: 'java-04-Q6',
                intent:
                  '小题，但答得准能加分。核心就一句：它是「断点续跑」的凭证。',
                points: [
                  '**作用**：记录当前线程正在执行的字节码指令地址。字节码解释器工作时就是靠改变这个值来选取下一条指令',
                  '**为什么私有**：CPU 核数少于线程数，线程会被随时切换。切走时把 PC 存进私有区，切回来再恢复——**PC 就是每个线程各自的「暂停键」**',
                  '**若共享会怎样**：线程 A 执行到第 10 行被切走，线程 B 跑了一段把 PC 改成第 50 行，A 回来接着从第 50 行跑——逻辑彻底错乱',
                  '**唯一不会 OOM 的区域**：它只存一个行号，大小编译期即定，不随执行增长',
                  '**native 方法时 PC 的值**：规范定义为 `undefined`。因为 native 方法由 C/汇编执行，没有字节码行号可记',
                  '**分支/循环/异常/线程恢复**都依赖它——这五件事恰好是「执行流被打断后要能接上」的场合',
                ],
                depth:
                  '一个容易被追问的细节：既然 native 方法执行时 PC 是 undefined，那 native 方法返回后怎么知道回到哪？答案在**栈帧的返回地址**里，不在 PC 里。PC 只在**解释执行字节码**时有意义，一旦进入 native 或编译后的机器码，控制流由 CPU 的指令指针（x86 的 RIP）接管。所以「PC 记录行号」这个说法严格讲只对解释器成立——这也是为什么 JIT 编译后的代码在 `jstack` 里看到的栈帧信息会略少。',
                followup:
                  '「为什么用 PC 而不是直接用 CPU 的指令指针」——因为 JVM 是**栈式虚拟机**，字节码不是机器指令，CPU 不认识。PC 指向的是「方法区里 Code 属性的字节码数组下标」，是 JVM 自己的抽象。这也是「JVM 不是物理机器」的最好例证。',
              },
              {
                kind: 'diagram',
                title: '一个栈帧的内部：五件套与 Slot 分配',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '栈帧五件套',
                      note: '每调用一个方法压入一个',
                      slots: [
                        { label: '局部变量表', value: '`this`、参数、局部变量', tone: 'primary' },
                        { label: '操作数栈', value: '临时工作区，深度编译期定', tone: 'primary' },
                        { label: '动态链接', value: '指向常量池的符号引用', tone: 'warn' },
                        { label: '方法返回地址', value: '恢复上层 PC', tone: 'warn' },
                        { label: '附加信息', value: '调试信息、栈帧数据', tone: 'muted' },
                      ],
                    },
                    {
                      name: '实例方法的局部变量表',
                      note: '按声明顺序占 Slot',
                      slots: [
                        { label: 'slot 0', value: '`this`（静态方法无）', tone: 'good' },
                        { label: 'slot 1', value: '第 1 个参数 `a`', tone: 'primary' },
                        { label: 'slot 2', value: '第 2 个参数 `b`', tone: 'primary' },
                        { label: 'slot 3-4', value: '`long`/`double` 占 2 格', tone: 'warn' },
                      ],
                    },
                  ],
                  caption:
                    '两个结论值得记住：① **栈帧大小在编译期就确定**——局部变量表容量、操作数栈最大深度都写在 class 文件的 `Code` 属性里。所以「栈深度」是可预测的，`-Xss` 越小越容易 `StackOverflowError`。② **Slot 会复用**——离开作用域的局部变量，其 Slot 会被后面的变量占用，这就是为什么断点调试时看不到已出作用域的变量（它的槽已经被别人占了），也是为什么「把大对象声明在循环外」有时反而不利于 GC（引用一直有效）。',
                },
              },
              {
                kind: 'question',
                title: '一个方法从调用到返回，栈帧发生了什么？',
                questionId: 'java-04-Q7',
                intent:
                  '要能按「入栈 → 执行 → 出栈」讲出一条时间线，并把「局部变量表 / 操作数栈 / 返回地址」各自的角色点出来。',
                points: [
                  '**调用前**：`invokevirtual` 等指令先在**调用者的操作数栈**上准备好 `this` 与实参',
                  '**入栈**：JVM 为被调方法分配新栈帧，把实参从调用者操作数栈**弹出并写入**新栈帧的局部变量表（`this` 占 slot 0）',
                  '**执行**：字节码在操作数栈上做运算——`iload_1` 把 slot 1 压栈、`iadd` 弹出两个相加再压回，栈式虚拟机的名字由此而来',
                  '**正常返回**：`return` 指令把返回值压到**调用者栈帧的操作数栈**顶，然后当前栈帧出栈，PC 恢复到返回地址',
                  '**异常返回**：没有返回值，异常对象沿栈帧链向上抛；每层查异常表，无人处理则栈帧出栈直到线程终止',
                  '**栈溢出**：递归过深时新栈帧无法分配 → `StackOverflowError`（注意不是 OOM）',
                ],
                depth:
                  '「为什么 Java 的方法调用比 C 慢」这个老问题，答案就在这条链路里：一次调用要做参数搬运、栈帧分配、动态链接解析。但 HotSpot 用两个手段把它抹平了——**方法内联**（把热点小方法的字节码直接贴进调用者，栈帧根本不创建）与**标量替换**（逃逸分析后把对象拆成局部变量，连堆分配都省了）。所以「Java 慢」在今天只对**未被 JIT 编译的冷代码**成立。',
                followup:
                  '「栈帧会不会很大」——会。局部变量表容量 = 参数 + 局部变量（`long`/`double` 双 Slot），加上操作数栈深度，一个复杂方法几百字节很正常。这也是「递归改成循环」之外的另一条经验：**方法里别声明太多局部变量**，它会直接增大栈帧、降低最大递归深度。',
              },
              {
                kind: 'question',
                title: '堆是如何分区的？Eden、Survivor、Old 的比例是多少？',
                questionId: 'java-04-Q8',
                intent:
                  '基础题，但比例要说对：`8:1:1` 是**新生代内部**的划分，`1:2` 才是新生代与老年代。混着答是典型扣分点。',
                points: [
                  '**两分**：堆 = 新生代（Young）+ 老年代（Old）。默认 `-XX:NewRatio=2`，即新生代 : 老年代 = **1 : 2**',
                  '**新生代三分**：Eden + Survivor0 + Survivor1。默认 `-XX:SurvivorRatio=8`，即 **Eden : 单个 Survivor = 8 : 1**，所以整体是 **8:1:1**',
                  '**为什么要两块 Survivor**：复制算法需要一个**空的目标区**。GC 时把 Eden + 在用 Survivor 的存活对象复制到另一块 Survivor，然后整体清空 Eden 与原 Survivor——这样天然无碎片',
                  '**为什么 Eden 这么大**：绝大多数对象朝生夕死（弱分代假说），让它们死在 Eden 里最省事——只需清空，不用复制',
                  '**为什么老年代这么大**：老年代存活率高，复制算法在那里等于搬整座山，只能用标记清除/整理，成本高。给它大空间是为了**降低 Full GC 频率**',
                  '**JDK 8 默认是 Parallel Scavenge + Parallel Old**；G1 起堆被切成等大 Region，不再有物理连续的新生代/老年代，但**逻辑分代仍然保留**',
                ],
                depth:
                  '8:1:1 这个比例藏着一个精妙的算术：新生代容量为 `S`，则 Eden 是 `0.8S`，两块 Survivor 各 `0.1S`。一次 Minor GC 后，存活对象要全部塞进**一块** Survivor（容量 `0.1S`）。所以这个设计隐含了一个**赌注——存活率不超过 10%**。真实业务中若存活率超过 10%，就会触发**空间分配担保**：检查老年代剩余空间是否够，不够则直接 Full GC。这也解释了一个经典现象：**把新生代调大反而 Full GC 更多**——因为绝对存活量变大了，更容易突破 10% 这个隐含阈值。',
                followup:
                  '「Survivor 会不会太小」——会，且症状很隐蔽：存活对象塞不进 Survivor，就靠**分配担保**提前晋升老年代，造成「短命对象污染老年代」，进而频繁 Full GC。排查特征是 `jstat -gcutil` 里 `S0/S1` 一直是 100% 而 `O`（老年代）持续上涨。这也是为什么很多团队会把 `-XX:SurvivorRatio` 从 8 调到 4 或更小。',
              },
              {
                kind: 'analogy',
                title: 'JVM 内存像一栋写字楼：工位、会议室、档案室',
                text:
                  '把 JVM 想成一栋写字楼。**虚拟机栈**是每个员工自己的**工位**——私有，别人不能用；桌上堆着正在处理的文件（栈帧），处理完一层收走一层。**堆**是**公共会议室**——所有部门共用，谁都能预订，但面积固定（`-Xmx`），订满了就得有人被清出去（GC）。**方法区**是**档案室**——全公司只有一份组织架构图与规章制度（类元信息），谁都能查但只有一份。**直接内存**是**楼外的临时仓库**——不占楼内面积，但要跟物业单独申请（`MaxDirectMemorySize`），而且**楼里楼外都算「你公司的占地」，物业费（RSS）一起算**。',
                mapping: [
                  { real: '每个员工自己的工位', tech: '虚拟机栈：线程私有，随线程生灭' },
                  { real: '桌上待处理的文件摞', tech: '栈帧链：方法调用入栈、返回出栈' },
                  { real: '公共会议室，面积固定', tech: '堆：共享、`-Xmx` 上限、GC 主战场' },
                  { real: '会议室里长期占座的部门', tech: '老年代：熬过多次 GC 的长寿对象' },
                  { real: '全公司唯一的档案室', tech: '方法区 / 元空间：类元信息只有一份' },
                  { real: '楼外的临时仓库', tech: '直接内存：不受 `-Xmx` 管，但计入 RSS' },
                  { real: '物业按总占地收费', tech: '容器按 RSS 判定 OOMKilled，看不到 Java 异常' },
                  { real: '保洁定期清空无人认领的文件', tech: '可达性分析 + 回收：不可达才清' },
                ],
                limit:
                  '这个类比有一处会骗人：真实写字楼的会议室**不会自动清理**，而堆会——GC 的存在是 JVM 与「手动 malloc/free」最本质的差别。另外「工位」并不像工位那么贵：平台线程的栈默认 1MB，一万个线程就是 10GB，这也是虚拟线程要出现的理由。',
              },
              {
                kind: 'question',
                title: '方法区、永久代、元空间是什么关系？为什么 JDK 8 要换掉永久代？',
                questionId: 'java-04-Q9',
                intent:
                  '高频题。三层关系要一句话说清：**方法区是规范概念，永久代与元空间是两个实现**。',
                points: [
                  '**方法区**：《JVM 规范》里的**抽象概念**，规定「存类元信息、常量、静态变量」，但不说存在哪、怎么实现',
                  '**永久代（PermGen）**：HotSpot 在 **JDK 7 及之前**的实现，位于**堆内**，受 `-XX:MaxPermSize` 限制，必须启动时指定',
                  '**元空间（Metaspace）**：HotSpot 在 **JDK 8 起**的实现，位于**本地内存**，默认只受物理内存限制，可用 `-XX:MaxMetaspaceSize` 限制',
                  '**换掉原因①大小难调**：永久代容量启动即定，动态代理、Groovy 脚本、JSP 容器大量生成类时极易 `PermGen space` OOM',
                  '**换掉原因②与堆解耦**：永久代挤在堆里，Full GC 要捎带扫描它，且 GC 管理复杂、性能差；元空间独立在本地内存，互不干扰',
                  '**换掉原因③为融合铺路**：JRockit 本来就没有永久代，合并 HotSpot 时移除它是官方给出的直接动因',
                  '**顺带的时间线**：字符串常量池在 **JDK 7** 就已移到堆（早于永久代被移除），JDK 8 时永久代里只剩类元信息，静态变量也随之迁入堆',
                ],
                depth:
                  '这道题最容易被追问「那 JDK 8 之后 `-XX:PermSize` 还有用吗」——完全失效，JVM 会直接警告 `ignoring option PermSize; support was removed in 8.0`。更值得说的是**元空间为什么不会再轻易 OOM**：因为它按需向 OS 申请，且支持**类卸载**（条件是类的所有实例被回收 + 对应 ClassLoader 被回收 + Class 对象无引用）。所以元空间泄漏的典型场景不是「类太多」，而是「**ClassLoader 泄漏**」——比如热部署时旧 ClassLoader 被一个静态变量意外持有，它加载的所有类都无法卸载，元空间只涨不落。',
                followup:
                  '「元空间能无限大吗」——不能。它受三层约束：① `-XX:MaxMetaspaceSize`（默认 unlimited）；② 容器 cgroup 的内存 limit；③ 物理内存与 swap。生产环境**建议显式设置** `MaxMetaspaceSize`（如 256m–512m），否则一旦类泄漏，进程会先被 OS OOMKilled，而不是抛出可读的 Java 异常——一个可读异常远比一次静默被杀的排查成本低。',
              },
              {
                kind: 'question',
                title: '元空间还会 OOM 吗？MetaspaceSize 和 MaxMetaspaceSize 有什么区别？',
                questionId: 'java-04-Q10',
                intent:
                  '承接上一题的追问链。要答出「会 OOM」+「两个参数一个是水位线一个是硬上限」。',
                points: [
                  '**会 OOM**：报 `java.lang.OutOfMemoryError: Metaspace`。默认无上限只意味着「不设人为上限」，不代表「用不完」',
                  '**`-XX:MetaspaceSize`**：**首次**触发元空间 GC 的**水位线**（默认约 21MB）。注意它不是初始大小，而是「涨到这里就先做一次 GC 探探」',
                  '**`-XX:MaxMetaspaceSize`**：**硬上限**，超过直接抛 OOM（默认 unlimited）',
                  '**为什么需要水位线**：元空间扩容要付出 GC 代价。设一个低水位，让 JVM 在早期就做一次 GC 清掉无用类，避免一路猛涨到很晚才 GC、一次停顿特别长',
                  '**常见成因**：CGLIB / Javassist 动态生成类无缓存、反射 `Proxy` 滥用、Groovy / JSP 脚本热加载、`ClassLoader` 泄漏导致类无法卸载',
                  '**排查手段**：`jstat -gc` 看 `MC`（容量）/ `MU`（已用）、`jcmd <pid> GC.metaspace` 看明细、`-XX:+TraceClassLoading` 定位谁在造类',
                ],
                depth:
                  '一个反直觉的点：**把 `MetaspaceSize` 设小反而更慢**。因为它只是水位线，每涨到水位就触发一次元空间 GC，频繁 GC 会拖慢启动。所以正确做法是：**`MetaspaceSize` 设成接近稳态值的量**（用 `jstat` 观测到的 `MU` 峰值，留 20% 余量），`MaxMetaspaceSize` 设成它的 1.5–2 倍作为兜底。这也解释了为什么很多团队「照抄网上的 `-XX:MetaspaceSize=512m`」后启动反而变快——他们其实把水位抬到了稳态之上，前期根本没触发 GC。',
                followup:
                  '「元空间和 Code Cache 是一回事吗」——不是。元空间存**类元数据**，Code Cache 存 **JIT 编出的机器码**。两者都在本地内存，都容易在「动态生成大量类」的场景同时膨胀，但报错不同：元空间溢出报 `Metaspace`，Code Cache 满了则**静默退化**——JIT 停止编译，程序悄悄变慢，只在 GC 日志里留一行 `CodeCache is full`。',
              },
              {
                kind: 'question',
                title: '字符串常量池在哪个区域？它的位置发生过什么变化？',
                questionId: 'java-04-Q11',
                intent:
                  '「位置变迁」题。三个时间点必须记牢：JDK 6 在永久代、JDK 7 搬到堆、JDK 8 永久代没了但它已在堆里。',
                points: [
                  '**JDK 6 及之前**：字符串常量池在**永久代**（方法区的实现）里。大量 `intern()` 会撑爆 PermGen',
                  '**JDK 7**：字符串常量池**移到堆中**。这是关键一步，比永久代被移除还早一年',
                  '**JDK 8 及之后**：永久代被元空间取代，但字符串常量池**已经在堆里**，与元空间无关',
                  '**为什么搬到堆**：① 永久代空间小且回收频率极低（只在 Full GC 处理），而字符串常量是最易膨胀的数据；② 堆里回收更及时，未引用的字面量可以被 Minor GC 带走',
                  '**内存含义**：`String s = new String("abc")` 中，`"abc"` 字面量在**堆的字符串常量池**里，`new` 出来的对象也在**堆**里——两者可能紧挨着，但一个是池内共享、一个是独立对象',
                  '**`intern()` 的作用**：若池中已有等值字符串则返回池内引用，否则放入池并返回。它是「用 CPU 换内存」的典型手段，适合大量重复字符串（如枚举值、状态码）',
                ],
                depth:
                  '「JDK 7 搬到堆里」带来的一个直接后果是 `intern()` 的语义变便宜了：在 JDK 6，`intern()` 要把字符串**复制**到永久代；在 JDK 7+，池里只存**堆中对象的引用**，不需要复制内容。这使得 `intern()` 从「重量级操作」变成「一次哈希查找」。但它仍有代价——池是一个 `StringTable`（默认桶数 `-XX:StringTableSize=60013`），大量 `intern()` 会引发哈希冲突，反而变慢。这也解释了为什么「JDK 8 里用 `intern()` 优化内存」有时会让 Young GC 变长：字符串常量池本身成了 GC 要扫描的对象。',
                followup:
                  '「`new String("abc")` 创建了几个对象」——**一个或两个**。若池中已有 `"abc"`，只创建堆里那一个 `String` 对象；若没有，则先创建池内字面量对象，再创建堆对象，共两个。严格讲还要考虑**字节码里 `ldc` 引用的解析时机**，但面试层面答「一个或两个，取决于池中是否已存在」就够。',
              },
              {
                kind: 'question',
                title: '运行时常量池和字符串常量池有什么区别？',
                questionId: 'java-04-Q12',
                intent:
                  '最容易混淆的一对概念。记住：**一个属于 class 文件、一个属于 String 类**，不是同一层的东西。',
                points: [
                  '**运行时常量池（Runtime Constant Pool）**：**每个类一份**，是 class 文件里 `constant_pool` 的运行时表示。存符号引用（类名、字段名、方法名）与字面量（数字、字符串字面量）',
                  '**字符串常量池（String Pool）**：**全 JVM 一份**，是一个 `StringTable`（哈希表），专门缓存字符串字面量与 `intern()` 结果，用于复用',
                  '**层级关系**：字符串常量池在**逻辑上**是运行时常量池的一部分（字面量那一类），但**物理上**自 JDK 7 起独立在堆中',
                  '**动态性**：运行时常量池比 class 文件常量池更强——它支持**运行时新增**（`String.intern()` 就是把新字符串加进池里）',
                  '**位置**：运行时常量池在方法区（JDK 8+ 即元空间）；字符串常量池在堆',
                  '**溢出表现**：运行时常量池溢出报 `Metaspace`（或旧版 `PermGen space`）；字符串常量池因为内容在堆里，表现为普通 `Java heap space`',
                ],
                depth:
                  '一个能镇场的细节：**运行时常量池的「符号引用」在解析后会变成「直接引用」**。class 文件里 `invokevirtual #12` 的 `#12` 是一个符号（字符串 `"java/lang/Object.toString"`），第一次解析时才换成方法在内存中的实际地址，并把这个位置标记为「已解析」。这就是为什么「类加载的解析阶段可以推迟到初始化之后」——动态绑定（`invokedynamic`、虚方法）本来就要在运行时才确定目标。',
                followup:
                  '「`String s = "a" + "b"` 编译期发生什么」——**常量折叠**。两个都是编译期常量，`javac` 直接把它算成 `"ab"` 写进 class 文件的常量池，运行时只是 `ldc` 取一个已存在的池内引用，不创建任何 `StringBuilder`。但若有一边是变量（`"a" + x`），就变成 `StringBuilder.append` 或 JDK 9+ 的 `invokedynamic makeConcatWithConstants`。',
              },
              {
                kind: 'question',
                title: '直接内存是什么？为什么 NIO 要用它？会 OOM 吗？',
                questionId: 'java-04-Q13',
                intent:
                  '堆外内存题。三个要点：不属于运行时数据区、省一次拷贝、有自己的 OOM 信息。',
                points: [
                  '**是什么**：通过 `ByteBuffer.allocateDirect()` 向**操作系统本地内存**申请的连续空间，**不属于** JVM 运行时数据区',
                  '**为什么 NIO 用**：堆内 Buffer 做 IO 时，数据要「内核缓冲区 → 堆内数组」拷贝一次；直接内存可以直接作为 DMA 目标，省掉这次拷贝（配合 `FileChannel.transferTo` 就是零拷贝）',
                  '**大小限制**：`-XX:MaxDirectMemorySize`，默认**等于 `-Xmx`**',
                  '**会 OOM**：报 `java.lang.OutOfMemoryError: Direct buffer memory`，发生在**堆还很空**的时候——这是最迷惑人的地方',
                  '**回收机制**：`DirectByteBuffer` 挂一个 `Cleaner`（基于**虚引用**），对象被回收时才 `free` 掉本地内存。所以「回收本地内存」依赖 GC 先回收那个 Java 对象',
                  '**经典坑**：开了 `-XX:+DisableExplicitGC` 后 `System.gc()` 失效 → `Cleaner` 得不到触发 → 堆外内存只增不减 → 堆外 OOM，而堆看起来毫无异常',
                ],
                depth:
                  '为什么「堆外内存要靠 GC 来释放」这件事如此危险？因为 GC 的触发条件是**堆压力**，而堆外内存的增长**不增加堆压力**。极端场景：程序不断分配 `DirectByteBuffer` 但每个对象都很快不可达，堆里毫无压力，GC 一直不跑，本地内存一路涨到 `MaxDirectMemorySize`。Netty 因此**自己实现了引用计数**（`ReferenceCountUtil.release`）而不依赖 `Cleaner`——这是「不能把资源释放交给 GC」的教科书案例。同一个道理也适用于文件句柄、数据库连接、锁。',
                followup:
                  '「怎么排查堆外内存泄漏」——① `-XX:NativeMemoryTracking=summary` + `jcmd <pid> VM.native_memory summary`，看 `Other` / `Internal` 段的增长；② 通过 `BufferPoolMXBean`（JMX）读 `direct` 池的 `memoryUsed`；③ `pmap -x <pid>` 对比进程实际映射（注意 NMT **不覆盖**第三方 native 库，也不等于 RSS）；④ Netty 场景开 `-Dio.netty.leakDetection.level=paranoid` 直接定位未释放的 `ByteBuf`。',
              },
              {
                kind: 'diagram',
                title: 'OOM 归因表：一句「内存溢出」对应八种病',
                diagram: {
                  type: 'matrix',
                  cols: ['触发条件', '典型错误信息', '首查工具'],
                  rows: [
                    ['堆', '对象持续增长 / 泄漏 / -Xmx 太小', 'OutOfMemoryError: Java heap space', 'jmap -histo、堆 dump + MAT'],
                    ['堆（GC 空转）', 'GC 耗时超 98% 却回收不到 2%', 'GC overhead limit exceeded', 'GC 日志、jstat -gcutil'],
                    ['元空间', '动态生成类过多 / ClassLoader 泄漏', 'OutOfMemoryError: Metaspace', 'jstat -gc 的 MC/MU'],
                    ['直接内存', 'NIO / Netty 未释放、Cleaner 未触发', 'OutOfMemoryError: Direct buffer memory', 'NMT、BufferPoolMXBean'],
                    ['线程栈（深度）', '无限递归 / 栈帧过大 / -Xss 太小', 'StackOverflowError', '异常栈、-Xss'],
                    ['线程栈（数量）', '线程创建过多 / OS ulimit 限制', 'unable to create new native thread', 'jstack 线程数、ulimit -u'],
                    ['数组长度', '长度逼近 int 上限', 'Requested array size exceeds VM limit', '—（罕见，看到即查业务）'],
                    ['进程（非 Java）', '本地库泄漏 / glibc 碎片 / cgroup limit', '看不到 Java OOM，只有 OOMKilled', 'NMT、pmap、cgroup 指标'],
                  ],
                  caption:
                    '这张表的价值在于：**同一句「内存溢出」落在不同区域，是完全不同的病，修法互不通用**。堆 OOM 要查对象为什么活下来；元空间 OOM 要查谁在造类；直接内存 OOM 要查谁没 release；`unable to create new native thread` 要查线程池配置与 `ulimit`——这几种情况里，只有第一种能靠「调大 `-Xmx`」缓解，其余三种调堆完全无用甚至更糟（堆越大，留给本地内存的越少）。',
                },
              },
              {
                kind: 'question',
                title: 'JVM 中有哪些 OOM？分别在什么情况下发生？',
                questionId: 'java-04-Q14',
                intent:
                  '记忆题，但要有组织：按「区域」分组报，每组补一句「怎么造出来」。能顺带区分 `StackOverflowError` 就是满分答案。',
                points: [
                  '**`Java heap space`**：堆不足。对象太多 / 泄漏 / `-Xmx` 太小。造法：`while(true) list.add(new byte[1MB])`',
                  '**`GC overhead limit exceeded`**：GC 花超 98% 时间却只回收不到 2% 内存（默认开启）。本质仍是堆不足，但 JVM 提前认输避免「空转」',
                  '**`Metaspace`**：元空间不足。动态类生成过多、`MaxMetaspaceSize` 太小、ClassLoader 泄漏。造法：`while(true) Enhancer.create(...)`',
                  '**`Direct buffer memory`**：堆外超限。Netty/NIO 未释放、`DisableExplicitGC` 阻断 Cleaner。造法：循环 `allocateDirect` 且不释放',
                  '**`unable to create new native thread`**：线程数超 OS 限制。线程池无界、每请求一线程。注意此时**堆往往很空**',
                  '**`Requested array size exceeds VM limit`**：数组长度逼近 `int` 上限（约 2^31-1 减头部）。罕见',
                  '**`StackOverflowError`**：**不是 OOM**。栈深度超限（递归无出口、栈帧过大、`-Xss` 太小）。它同属 `Error`，但不是 `OutOfMemoryError`',
                  '**`Out of swap space?` / `OOMKilled`**：连本地内存都不够，OS 出手。容器里表现为退出码 137，日志里**没有任何 Java 异常**',
                ],
                depth:
                  '两个容易答错的细节。第一，`GC overhead limit exceeded` **不是独立的病**，它是 `Java heap space` 的「提前预告」——JVM 发现再怎么 GC 也救不回来，就提前抛错而不是硬撑到真没内存。可以通过 `-XX:-UseGCOverheadLimit` 关掉，但那是自欺欺人。第二，`unable to create new native thread` 的根因常在**操作系统**而非 JVM：Linux 的 `ulimit -u`（每用户进程/线程数）、`/proc/sys/kernel/threads-max`、以及每个线程 1MB 的栈空间。所以修法不是调 `-Xmx`，而是**减少线程数（用线程池）或调 `ulimit`**；而且在容器里，`-Xss` 设小一点能明显提高可创建线程数。',
                followup:
                  '「怎么快速区分这几种」——看**错误信息全称**。`OutOfMemoryError: <detail>` 里的 `<detail>` 就是区域标记，这是规范留给实现的诊断字段，一定要完整读。运维层面还有一个判据：**进程是否直接消失**。抛 Java 异常说明 JVM 还活着（有栈可打）；进程无声消失、`dmesg` 里有 `Out of memory: Killed process`，说明是被 OS 或 cgroup 杀的，此时该查 RSS 而不是堆。',
              },
              {
                kind: 'question',
                title: 'StackOverflowError 和 OutOfMemoryError 分别怎么产生？如何复现？',
                questionId: 'java-04-Q15',
                intent:
                  '两者的区别要说得干净：**一个是「栈太深」，一个是「内存不够」**，虽然都继承 `Error`，但触发机制完全不同。',
                points: [
                  '**`StackOverflowError`**：线程请求的栈深度超过 `-Xss` 允许的最大深度。**栈空间是固定的**，溢出的含义是「装不下更多栈帧」，不是「系统没内存」',
                  '**复现 SOE**：`void f() { f(); }` 无限递归；或 `-Xss256k` 后跑稍深的递归。注意它是**单个线程**的问题，不影响其他线程',
                  '**`OutOfMemoryError`**：某块区域**无法再申请到内存**。可以发生在堆、元空间、直接内存、线程数量等任一处',
                  '**复现堆 OOM**：`List<byte[]> l = new ArrayList<>(); while(true) l.add(new byte[1024*1024]);`（`-Xmx64m` 下很快）',
                  '**复现栈数量 OOM**：`while(true) new Thread(() -> { sleep(100000); }).start();` → `unable to create new native thread`',
                  '**关键区别**：SOE 是**深度**问题（改算法 / 调 `-Xss`）；OOM 是**总量**问题（改容量 / 找泄漏）。SOE 发生后 JVM 通常还能继续跑，OOM 后往往整个进程不可用',
                ],
                depth:
                  '一个值得讲的边界：**递归到底该算 SOE 还是 OOM**？答案取决于实现细节——HotSpot 的平台线程栈是**固定大小**（`-Xss`），所以递归深了是 SOE；但**虚拟线程的栈在堆上、按需增长**，递归深了会先耗尽堆，报 **`OutOfMemoryError: Java heap space`**。同一个 `f()` 递归，在两种线程模型下报不同的错——这个例子能一举证明「你理解的是机制而不是结论」。这也解释了为什么虚拟线程里 `StackOverflowError` 反而少见。',
                followup:
                  '「SOE 的栈信息怎么读」——Java 会打印**固定长度的重复帧**（默认 1024 帧，`-XX:MaxJavaStackTraceDepth` 控制），中间用 `...` 省略，形如 `at X.f(X.java:3)` 重复上千次。定位时直接看**重复帧的前后文**：真正的问题往往在「第一次出现这个帧的地方」——那就是递归的入口。',
              },
              {
                kind: 'question',
                title: '堆没满但进程 RSS 很高，可能是什么原因？',
                questionId: 'java-04-Q16',
                intent:
                  '区分「背过」与「做过」的分水岭题。核心是**把进程内存拆成一张加法表**，然后逐项排除。',
                points: [
                  '**先建公式**：进程内存 ≈ 堆 + 元空间 + 线程栈总量 + Code Cache + 直接内存 + GC 辅助结构 + JNI/本地库',
                  '**线程栈**：每个平台线程默认 1MB。500 个线程就是 500MB——在 `-Xmx2g` 的进程里这是最大的一块「隐形内存」',
                  '**直接内存**：Netty / NIO 用得多时涨得最快，且**不受 `-Xmx` 约束**（默认上限等于 `-Xmx`）',
                  '**Code Cache**：JIT 机器码。默认 `ReservedCodeCacheSize` 240MB，动态生成大量类时可能吃满',
                  '**`-Xms` 与 `-Xmx` 不一致 + 未开 `AlwaysPreTouch`**：堆是**虚拟预留、按需物理分配**，RSS 与 `-Xmx` 本来就不相等，这属于正常现象不是 bug',
                  '**glibc 内存碎片**：`malloc` 用 `brk`/`mmap` 分配后不归还 OS（`M_MMAP_THRESHOLD`、arena 机制），表现为 RSS 只涨不落，`free` 了也没用',
                  '**容器差异**：cgroup limit 低于 `-Xmx` 时会被 `OOMKilled`，退出码 137，**日志里没有任何 Java 异常**',
                ],
                depth:
                  '排查顺序应当是**从便宜到昂贵**：① `jcmd <pid> GC.heap_info` 确认堆实际使用量（比 `-Xmx` 差多少）；② `jcmd <pid> VM.native_memory summary` 看 JVM 自己的账本（需启动时加 `-XX:NativeMemoryTracking=summary`，开销约 5–10%）；③ `pmap -x <pid>` 看真实映射，减去 NMT 的账，**差值就是第三方本地库**；④ `jstack <pid> | grep -c "java.lang.Thread.State"` 数线程数；⑤ 容器里还要 `cat /sys/fs/cgroup/memory.current`。注意 **NMT 不等于 RSS**——它不覆盖 JNI、glibc 开销、以及线程栈的实际提交部分，所以「NMT 加起来只有 1G 而 RSS 是 3G」是完全可能的。',
                followup:
                  '「`-Xms` 和 `-Xmx` 该不该设成一样」——**生产环境建议设成一样**。原因有三：① 避免堆反复扩容缩容带来的抖动与 Full GC；② 让内存占用可预测（否则 RSS 随机波动，容器 limit 难定）；③ 配合 `-XX:+AlwaysPreTouch` 可以在启动时就把物理内存全部摸一遍，把延迟从「运行时逐页缺页中断」挪到「启动时一次性付出」。代价是启动变慢、且 RSS 一开始就等于 `-Xmx`。',
              },
              {
                kind: 'question',
                title: '谈谈你对内存泄漏和内存溢出的理解，各举个例子',
                questionId: 'java-04-Q17',
                intent:
                  '概念辨析题。一句话切开：**泄漏是「该释放的没释放」，溢出是「实在装不下了」**；泄漏是原因，溢出是结果之一。',
                points: [
                  '**内存泄漏**：对象已经不再被业务需要，但仍被 GC Roots 可达，因此无法回收。**内存泄漏不一定立刻溢出**，它只是让可用空间持续缩小',
                  '**内存溢出**：某区域确实申请不到内存，抛 `OutOfMemoryError`。它可能由泄漏引起，也可能是「正常但量太大」（如一次性加载 10GB 文件）',
                  '**Java 泄漏的典型形态**：长生命周期容器持有短生命周期对象——`static Map` 做缓存不清、`ThreadLocal` 用完不 `remove`、监听器注册后不注销',
                  '**线程池 + `ThreadLocal` 的坑**：线程被复用，`ThreadLocalMap` 的 `Entry` 的 key 是弱引用（会被回收变 `null`），但 value 是强引用——**key 没了 value 还在**，于是泄漏',
                  '**`ClassLoader` 泄漏**：热部署时旧 `ClassLoader` 被一个 `static` 字段意外持有，它加载的所有类连同元空间一起无法释放',
                  '**判断方法**：多次 Full GC 后老年代占用仍持续上涨（`jstat -gcutil` 看 `O` 列单调上升）→ 基本可判定泄漏；用 MAT 看支配树和「到 GC Roots 的最短路径」定位持有者',
                ],
                depth:
                  '为什么 Java 有 GC 还会泄漏？因为 GC 判断的是**可达性**，不是**有用性**。一个 `static List` 里塞满了早已过期的对象，它们全都「可达」，GC 无权回收——**这是逻辑问题，不是内存管理问题**。所以定位泄漏的正确问法不是「谁没 free」，而是「**谁还持有它，以及为什么它还该被持有**」。这也是 MAT 里最有用的一条功能：「Path to GC Roots → exclude weak/soft references」，它直接告诉你持有链。',
                followup:
                  '「内存泄漏一定会 OOM 吗」——不一定。如果泄漏速率低于进程重启周期，它可能永远不 OOM，但会持续推高 GC 频率与停顿（因为每次都要扫描那些垃圾对象），表现为**延迟抖动而非崩溃**。这类问题最容易被误判成「GC 参数没调好」，实际是代码里那个没清空的缓存。',
              },
              {
                kind: 'principle',
                title: '一张图记住整节课：区域 → 参数 → 错误',
                body: [
                  '运行时数据区这 17 道题，本质上都在回答同一个三元组：**这块内存在哪（区域）→ 谁能控制它（参数）→ 它崩了报什么（错误）**。把这三列对齐，就不需要死记任何结论。',
                ],
                steps: [
                  {
                    title: '① 按「归属」分区',
                    detail:
                      '私有（PC、虚拟机栈、本地方法栈）记录「执行到哪」，共享（堆、方法区）存放「大家共用的数据」。判据只有一条：每个线程都得有一份的，就是私有的。',
                  },
                  {
                    title: '② 给每个区域配参数',
                    detail:
                      '`-Xss` 管栈、`-Xmx` / `-Xms` 管堆、`-XX:MaxMetaspaceSize` 管元空间、`-XX:MaxDirectMemorySize` 管堆外、`ReservedCodeCacheSize` 管 JIT 机器码。参数名不必背——记住「一共就这五块地方要设上限」即可反推。',
                  },
                  {
                    title: '③ 给每个区域配错误',
                    detail:
                      '堆 → `Java heap space`；元空间 → `Metaspace`；堆外 → `Direct buffer memory`；栈深 → `StackOverflowError`；栈数 → `unable to create new native thread`；OS 层 → `OOMKilled` / 137。**错误信息里的 detail 就是区域标记**，读全它。',
                  },
                  {
                    title: '④ 记住三条跨区域的规律',
                    detail:
                      '堆越大，留给本地内存（元空间 + 直接内存 + 线程栈）的越少，容器里尤其明显；GC 只按可达性回收，所以堆外内存、文件句柄、连接都可能「泄漏」；字符串常量池在堆里、类元信息在元空间——**同一个「方法区」概念，物理上早已分裂成两处**。',
                  },
                ],
                takeaway:
                  '面试时若被问到任意一块区域，回答模板固定：**它在哪（私有/共享/本地内存）、存什么、谁管它（参数）、崩了报什么错、怎么排查**。五句话答完，比罗列名词有效得多——因为面试官真正想确认的是「你遇到 OOM 时知道往哪看」。',
              },
            ],
          },
        },
        {
          id: 'object-layout',
          title: '对象创建、布局与逃逸分析',
          kind: 'concept',
          sources: [{ topic: 'java-04', chapters: ['对象相关'] }],
          content: {
            intro:
              '一个 `new` 背后至少有五步：类加载检查、分配内存、零值初始化、设置对象头、执行 `<init>`。分配方式取决于堆是否规整（指针碰撞 / 空闲列表），并发安全靠 CAS 或 TLAB 兜住。再叠加逃逸分析带来的标量替换与锁消除，「对象在哪」其实并不固定。本节把这些细节串成一条链，最后用「`new Object()` 占几个字节」把对象布局与对齐规则一次说透。',
            outline: [
              '创建五步：类加载检查 → 分配内存 → 零值初始化 → 设置对象头 → 执行 init',
              '布局三件套：对象头（Mark Word + Klass 指针）、实例数据、对齐填充',
              '`new Object()` 是 16 字节：12 字节头 + 4 字节对齐填充',
              '逃逸分析：不逃逸 → 标量替换（不是真的「栈上分配」）+ 锁消除',
              'TLAB 让每个线程独占一小块 Eden，用「不共享」绕开指针碰撞的并发问题',
            ],
            pitfalls: [
              '把「标量替换」说成「栈上分配」：HotSpot 并未真正把对象放到栈上，而是拆成局部变量',
              '认为构造器先执行才赋零值：零值初始化在 `<init>` 之前，所以字段在构造器里总能读到默认值',
              '以为 `PretenureSizeThreshold` 对所有收集器有效：它只对 Serial / ParNew 生效，G1 用的是 Humongous Region',
            ],
            sections: [
              {
                kind: 'concept',
                title: '分配内存的两种方式：堆整不整齐，决定用哪一招',
                body: [
                  '分配的本质是「在堆里找一块够大的空闲区域划出来」。做法只有两种，取决于**堆是否规整**——即已用内存和空闲内存是否交错。',
                  '**指针碰撞（Bump the Pointer）**：堆绝对规整，已用全在一边、空闲全在另一边，中间只有一个分界指针。分配就是把指针往空闲侧挪动对象大小的距离。快得几乎免费——一条加法指令。',
                  '**空闲列表（Free List）**：堆不规整（因为用了标记清除这类会产生碎片的算法），JVM 维护一张记录空闲块的列表，分配时找一块够大的划出去并更新列表。慢，且要处理碎片。',
                  '所以「用哪种」不是 JVM 随便选的：**Serial / Parallel 用复制/整理算法，堆规整 → 指针碰撞；CMS 用标记清除，堆有碎片 → 空闲列表**。这条对应关系能解释很多现象，比如 CMS 下大对象分配为什么更容易失败。',
                  '还有一个绕不开的问题：**并发**。两个线程同时把指针往后挪，可能分到同一块内存。解法有两条——① CAS 重试（失败就重来）；② **TLAB**：给每个线程在 Eden 里预分一小块私有区域，各自在里面碰撞，天然无竞争。HotSpot 默认用后者。',
                ],
                term: {
                  name: '指针碰撞 / 空闲列表',
                  def: '两种内存分配实现。前者要求堆规整（有「分界指针」），一条指针加法即可完成分配；后者维护空闲块列表，需检索合适块并更新列表。选择哪一种是**收集器算法的结果**，不是可配置项：复制/标记整理 → 指针碰撞；标记清除 → 空闲列表。',
                },
                points: [
                  '堆规整（复制、标记整理）→ 指针碰撞，快到接近免费',
                  '堆有碎片（标记清除）→ 空闲列表，要检索 + 更新',
                  '并发安全两条路：CAS 重试（老方案）或 TLAB（HotSpot 默认）',
                  '`-XX:+UseTLAB` 默认开启，所以绝大多数分配走的是「线程私有缓冲」这条路',
                ],
              },
              {
                kind: 'diagram',
                title: '一次 new 的七个动作：从字节码到可用对象',
                diagram: {
                  type: 'sequence',
                  actors: ['字节码 new', '常量池', '分配器', '堆内存', '对象头', '构造器 <init>'],
                  messages: [
                    { from: '字节码 new', to: '常量池', text: '取 #N 处的类符号引用，检查是否已加载' },
                    { from: '常量池', to: '字节码 new', text: '未加载 → 触发类加载（加载/验证/准备/解析/初始化）', reply: true },
                    { from: '字节码 new', to: '分配器', text: '按类元信息算出实例大小，申请内存' },
                    { from: '分配器', to: '堆内存', text: 'TLAB 快路径：指针碰撞；失败走慢路径 → CAS 或新 TLAB' },
                    { from: '堆内存', to: '分配器', text: '返回一块已清零的内存（零值初始化）', reply: true },
                    { from: '分配器', to: '对象头', text: '写 Mark Word（哈希/GC 年龄/锁标志）+ Klass 指针' },
                    { from: '对象头', to: '构造器 <init>', text: 'invokespecial <init>：执行字段初始化与构造体' },
                    { from: '构造器 <init>', to: '字节码 new', text: '返回对象引用，压入操作数栈', reply: true },
                  ],
                  caption:
                    '注意第 5 步的「已清零」：这就是**零值初始化**，它保证了一个反直觉的事实——**字段在构造器执行之前就已经是 0 / false / null 了**。所以「父类构造器里调用被子类重写的方法，读到子类字段是 0」这个经典怪象才有解释。也注意最后一步：`new` 只是「造出对象」，真正让它可用的是 `<init>`；如果构造器抛异常，对象已经分配但引用不会返回，等于一个「半成品垃圾」。',
                },
              },
              {
                kind: 'question',
                title: 'HotSpot 中创建一个对象要经过哪些步骤？',
                questionId: 'java-04-Q18',
                intent:
                  '主干题。五步要按顺序报，并在「分配内存」这步补一句并发安全方案，在「零值初始化」这步补一句「为什么必须有」。',
                points: [
                  '**① 类加载检查**：`new` 指令带一个常量池索引，先查这个类符号引用是否已解析、类是否已加载/初始化。没有则先走类加载流程',
                  '**② 分配内存**：按类元信息算出实例所需大小，从堆里划一块。规整则指针碰撞，不规整则空闲列表；并发安全用 CAS 重试或 TLAB',
                  '**③ 零值初始化**：把分配到的内存**全部置零**（不含对象头）。这一步保证实例字段不赋初值也能用，是 Java「字段有默认值」的物理来源',
                  '**④ 设置对象头**：写入 Mark Word（哈希码、GC 分代年龄、锁状态标志）与类型指针（指向 Klass，标明「我是谁」）',
                  '**⑤ 执行 `<init>`**：调用构造方法，按代码执行字段显式初始化与构造体。这一步之后对象才真正「可用」',
                  '**补充**：若用 TLAB 分配，第 ② 步是在线程私有缓冲里做指针碰撞，只有 TLAB 不够时才进慢路径',
                ],
                depth:
                  '为什么第 ③ 步必须存在？如果跳过零值初始化，字段里就是上一轮遗留的随机数据——那不是「默认值」，而是**信息泄露**（可能读到别的对象的数据）。规范选择「一律置零」是安全与可预测性的取舍。反过来，这也给了 JIT 一个优化依据：既然编译器知道未赋值字段必为 0，就可以省掉冗余的判空。而对大数组，置零是真实开销（要写满内存），所以 `-XX:+AlwaysPreTouch` 会在启动时预先摸一遍，把这部分代价从运行时挪走。',
                followup:
                  '「对象头里的 hashCode 什么时候算」——**第一次调用 `hashCode()` 时才惰性计算**并写回 Mark Word。因为算哈希要时间，而多数对象从不被哈希。这也是 HotSpot 默认 `-XX:hashCode=5`（每次生成新值）的实现细节，以及为什么「对象头里没哈希」不代表 0。',
              },
              {
                kind: 'concept',
                title: '对象在内存里长什么样：三块拼图',
                body: [
                  '一个对象在堆里就是一段连续内存，由三部分组成：**对象头（Header）、实例数据（Instance Data）、对齐填充（Padding）**。',
                  '**对象头**分两块。第一块是 **Mark Word**（64 位 JVM 上 8 字节），它是个「复用字段」——同一块 64 bit 在不同状态下存不同东西：无锁时存 hashCode（31 bit）+ 分代年龄（4 bit）+ 偏向标志（1 bit）+ 锁标志（2 bit）；偏向锁时存线程 ID + epoch；轻量锁时存指向栈中 Lock Record 的指针；重量锁时存指向 ObjectMonitor 的指针。这就是上一阶段讲「锁升级」时那块内存。第二块是 **Klass Pointer**（类型指针），指向方法区里的类元信息，标明「我是哪个类的实例」。开启压缩指针（`-XX:+UseCompressedOops`，堆小于 32G 时默认开）是 4 字节，否则 8 字节。',
                  '**实例数据**是真正存字段值的地方，包含父类继承来的字段。HotSpot 的默认分配策略是 `long/double → int/float → short/char → byte/boolean → 引用`，**同宽度的放一起**——目的是让字段尽量不跨 CPU 缓存行（伪共享的缓解手段之一）。',
                  '**对齐填充**不是「有用数据」，只为满足「对象起始地址必须是 8 字节的整数倍」。所以 `new Object()` 明明只有 12 字节对象头，却要占 16 字节。数组对象额外多 4 字节**长度字段**（所以数组头是 16 字节，加 4 字节长度 = 20，再补 4 对齐）。',
                ],
                points: [
                  'Mark Word（8B，内容随锁状态变化）+ Klass 指针（4B 压缩 / 8B 不压缩）',
                  '数组对象多一个 4B 长度字段，所以数组头更大',
                  '实例数据按宽度排序，`long/double` 最前、引用最后，减少跨缓存行',
                  '对齐填充只服务一条规则：对象总大小必须是 **8 的倍数**',
                ],
              },
              {
                kind: 'diagram',
                title: '一个对象的 16 字节：Mark Word、Klass 指针、填充',
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '对象头 = 12 字节',
                      note: '压缩指针开启时',
                      slots: [
                        { label: 'Mark Word', value: '8B：hash / 年龄 / 锁标志', tone: 'primary' },
                        { label: 'Klass 指针', value: '4B → 方法区类元信息', tone: 'primary' },
                      ],
                    },
                    {
                      name: '实例数据 + 填充',
                      note: '`new Object()` 没有字段',
                      slots: [
                        { label: '实例数据', value: '0B（无字段）', tone: 'muted' },
                        { label: '对齐填充', value: '4B，凑满 8 的倍数', tone: 'warn' },
                      ],
                    },
                    {
                      name: '数组对象多一块',
                      note: '长度字段',
                      slots: [
                        { label: '数组长度', value: '4B，紧跟 Klass 之后', tone: 'warn' },
                        { label: '数组头合计', value: '16B（12 + 4）', tone: 'bad' },
                      ],
                    },
                  ],
                  caption:
                    '记住这条算式就够应付所有变体：**总大小 = 8（Mark）+ 4（Klass）+ 实例数据 + 填充，且结果为 8 的倍数**。两个推论：① 加一个 `int` 字段不一定增加大小（可能刚好填掉那 4 字节填充）；② 加一个 `long` 字段一定增加 8 字节（`long` 需要 8 字节对齐，布局会被重排）。测真实占用用 `-javaagent` 引入 JOL（`org.openjdk.jol`），`ClassLayout.parseInstance(o).toPrintable()` 会直接打印每个字段的偏移与填充。',
                },
              },
              {
                kind: 'question',
                title: '对象在内存中的布局是怎样的？',
                questionId: 'java-04-Q19',
                intent:
                  '标准三件套题。答完三块还要说出 Mark Word 是「复用」的、Klass 指针有什么用，才算过关。',
                points: [
                  '**对象头 · Mark Word**（8 字节）：无锁态存 `hashCode(31) + 分代年龄(4) + 偏向标志(1) + 锁标志(2)`；偏向/轻量/重量锁时改存线程 ID 或 monitor 指针',
                  '**对象头 · Klass Pointer**（4 或 8 字节）：指向方法区的类元信息，`getClass()` 就是靠它，也是类型检查（`instanceof`）的依据',
                  '**实例数据**：本类与父类的字段值，按「`long/double` → `int/float` → `short/char` → `byte/boolean` → 引用」排序，同宽聚集',
                  '**对齐填充**：可能不存在；只在总大小不是 8 的倍数时补齐。它没有任何语义，Hospot 要求对象起始地址 8 字节对齐是为了让字段落在同一缓存行内',
                  '**数组的特例**：Klass 指针后多 4 字节数组长度（`arraylength` 指令就靠它，而不是靠 Mark Word）',
                ],
                depth:
                  '为什么 Mark Word 要「复用」？因为 8 字节寸土寸金，而锁状态、GC 年龄、哈希码**不会同时用到**——一个对象在同一时刻只处于一种锁状态。这是典型的时间换空间：用状态标志位区分当前这 64 bit 的语义。代价是「读 Mark Word 必须先知道当前状态」，所以 C++ 层到处是 `is_neutral()` / `has_locker()` 这类分支。这也是为什么 `hashCode()` 一旦算过就不能再进入偏向锁（那 31 bit 被哈希占了），JVM 会撤销偏向——一个「调了 hashCode 就变慢」的真实原因。',
                followup:
                  '「怎么验证」——用 JOL 打印。`org.openjdk.jol.info.ClassLayout.parseInstance(obj).toPrintable()` 会输出每一段的偏移与大小，能直接看到 `(object header: mark)` 与 `(object header: class)` 的字节数、以及 `(loss due to the next object alignment)` 这一行填充。面试里说得出 JOL，基本等于「真测过」。',
              },
              {
                kind: 'question',
                title: '`new Object()` 占多少字节？为什么？',
                questionId: 'java-04-Q20',
                intent:
                  '看似简单，实则考对齐规则。答「12 或 16」都不完整，正确说法是 **16 字节**，并说明 12 + 4 填充。',
                points: [
                  '**结论：16 字节**（64 位 HotSpot，默认开启压缩指针）',
                  '**拆解**：Mark Word 8 字节 + Klass 指针 4 字节 = 12 字节对象头；`Object` 没有任何字段，实例数据 0 字节',
                  '**为什么不是 12**：对象总大小必须是 **8 的倍数**（对齐要求），12 补 4 字节填充 → 16',
                  '**如果关掉压缩指针**（`-XX:-UseCompressedOops` 且堆 ≥ 32G）：8 + 8 = 16，恰好整除，**不需要填充**，结果仍然是 16 字节',
                  '**如果对象头也压缩**（`-XX:+UseCompressedClassPointers` 已默认）：就是上面的 12+4 情形',
                ],
                depth:
                  '为什么必须 8 字节对齐？因为 64 位 CPU 一次内存事务读 8 字节；若对象起始地址不对齐，一个字段可能横跨两个缓存行，读取要两次总线事务，且写时会产生额外的行锁竞争。所以 JVM 宁可浪费几个字节也要对齐。反过来说，**压缩指针是「用对齐换空间」的胜利**：堆小于 32G 时，Klass 指针可以只存 4 字节（存的是「偏移量/8」，即 32 位能寻址 32G），一个对象省 4 字节；一亿个对象就是省 400MB。这也是「堆超过 32G 压缩指针失效、反而更慢」这个说法的由来——**32G 不是容量上限，是压缩指针的边界**。',
                followup:
                  '「那 `new int[0]` 占多少」——16 字节对象头（12 + 4 长度）+ 0 数据 + 0 填充 = 16 字节，与 `new Object()` 相同。而 `new int[1]` 是 16 + 4 = 20，补 4 字节 → 24 字节。这类题只要守住「头 + 数据 + 凑 8 倍数」三步就不会错。',
              },
              {
                kind: 'question',
                title: '对象访问定位有哪两种方式？HotSpot 用哪种？',
                questionId: 'java-04-Q21',
                intent:
                  '两种方式能说清「多一次间接」的差别即可，重点在「为什么 HotSpot 选直接指针」。',
                points: [
                  '**句柄访问**：堆里划一块句柄池，`reference` 指向句柄，句柄里有两个指针——一个指向实例数据，一个指向类型数据。GC 移动对象时只改句柄，`reference` 本身不用动',
                  '**直接指针**：`reference` 直接指向对象，对象头里的 Klass 指针负责找类型数据。**少一次寻址**，访问更快',
                  '**HotSpot 用直接指针**：因为「访问对象」是最高频操作，省一次间接寻址的收益远大于「GC 时要改引用」的成本',
                  '**句柄的代价**：每次读写字段都要多跳一次内存，CPU 缓存局部性也差（句柄池与对象不在一处）',
                  '**句柄的好处**：对象移动时引用稳定——这对「不移动对象的收集器」或某些 JNI 场景有价值，但主流场景收益不明显',
                ],
                depth:
                  '一个常见的误解是「HotSpot 用直接指针，所以 GC 移动对象时要遍历所有引用去改」。事实是：**能改的才改**。GC 通过**记忆集 + 卡表**知道哪些区域有跨代引用，通过 **OopMap** 知道栈上哪些位置是引用（所以能在安全点停顿、精确扫描），移动对象后只更新这些被记录的位置。这也是为什么「Stop-The-World 时必须到达安全点」——只有在安全点上，OopMap 才准确，引用才能安全地被批量修正。',
                followup:
                  '「为什么不用句柄」——除了性能，还有一个现实原因：句柄池本身要占堆空间且要维护，相当于给每个对象加一趟额外的内存管理。HotSpot 选择「对象自描述」（Klass 指针在对象头里），换取更紧凑的布局。JRockit / OpenJ9 的实现也各有取舍，但主流 JVM 都选了直接指针。',
              },
              {
                kind: 'compare',
                title: '句柄访问 vs 直接指针：一次间接换来的稳定性',
                head: ['维度', '句柄访问', '直接指针（HotSpot）'],
                rows: [
                  ['reference 指向', '句柄池中的句柄', '对象本身'],
                  ['字段访问路径', 'reference → 句柄 → 实例数据（两跳）', 'reference → 对象（一跳）'],
                  ['类型信息怎么找', '句柄里单独存一个类型指针', '对象头里的 Klass 指针'],
                  ['对象被移动时', '只改句柄内的指针，`reference` 不变', '要修正所有指向它的引用'],
                  ['额外内存开销', '需要维护句柄池', '无额外结构'],
                  ['访问性能', '多一次寻址，缓存局部性较差', '更快，主流选择'],
                  ['典型使用者', '早期 JVM、部分嵌入式实现', 'HotSpot / OpenJDK 全系'],
                ],
                caption:
                  '这张表的落点是最后一行：**规范从未规定用哪种，这是实现自由**。所以面试里正确的表述不是「Java 用句柄」，而是「规范允许两种，HotSpot 选了直接指针」。这类「规范 vs 实现」的区分在 JVM 章节反复出现（方法区 vs 永久代、字符串常量池的位置），答对了会显著提升可信度。',
              },
              {
                kind: 'question',
                title: '对象一定分配在堆上吗？逃逸分析、栈上分配、标量替换',
                questionId: 'java-04-Q22',
                intent:
                  '本题是本课的深度所在。必须说清三件事：逃逸的两种类型、HotSpot 其实做的是**标量替换**而非栈上分配、以及它依赖 JIT 热度。',
                points: [
                  '**不一定**：规范只说「对象通常在堆上分配」。JIT 可以通过**逃逸分析**判断对象不会逃出方法，从而省掉堆分配',
                  '**逃逸的两种**：**方法逃逸**（作为返回值、参数传给别的方法、赋给外部可见字段）；**线程逃逸**（赋给静态字段、被其他线程拿到）',
                  '**栈上分配（Stack Allocation）**：概念上把对象放在栈帧里，随方法返回自动销毁。**HotSpot 并未真正实现这一项**——它是「教科书说法」',
                  '**标量替换（Scalar Replacement）**：HotSpot 真正做的。若对象不逃逸且字段可拆，就把对象**拆成若干局部变量**（标量），直接放寄存器/栈上，对象本身根本不创建',
                  '**锁消除（Lock Elision）**：不逃逸对象的 `synchronized` 必然无竞争，JIT 直接把锁去掉——这就是「单线程下 `StringBuffer` 不比 `StringBuilder` 慢」的原因',
                  '**开关与前提**：`-XX:+DoEscapeAnalysis`（默认开）、`-XX:+EliminateAllocations`（默认开）；**只在 C2 编译后的代码里生效**，解释执行与 C1 阶段仍然老老实实分配',
                ],
                depth:
                  '「标量替换」的效果常常超出预期：`for (int i = 0; i < 1e8; i++) { Point p = new Point(i, i); sum += p.x; }` 在 JIT 之后**一个 `Point` 对象都不会创建**，循环退化成一堆整数加法——因为 `p` 从未逃出循环体，两个字段被替换成两个局部变量。这也是「Java 的 `new` 很便宜」的真正原因（TLAB 已经让分配接近指针碰撞，标量替换则让分配直接消失）。但要注意边界：对象一旦被放进集合、被返回、被赋值给静态字段，逃逸分析立刻失效，性能回到「真分配」。',
                followup:
                  '「怎么验证逃逸分析生效了」——开 `-XX:+PrintEliminateAllocations`（需 debug 版 JVM）或用 JMH 对比「对象逃逸」与「不逃逸」两个版本的吞吐；更实用的办法是看 GC 日志：若循环里大量 `new` 却不产生 GC，基本可以确定被标量替换了。反例：把对象塞进 `List` 再清空，GC 立刻出现——因为「塞进集合」就是方法逃逸。',
              },
              {
                kind: 'analogy',
                title: '对象分配像「领物料」：从公共仓库到个人工位抽屉',
                text:
                  '把 Eden 想成仓库，**TLAB 就是每个工人手边的抽屉**。要领一个小零件（小对象），直接从自己抽屉里拿——不用跟别人抢仓库大门，也不用登记（**无锁**）。抽屉空了（TLAB 用完），才去仓库申请一整格新的抽屉（**refill**）；仓库也紧张时，才走「跟仓管员排队登记」的慢路径（**CAS 或加锁**）。而**大件物料**（大对象）根本塞不进抽屉，只能直接去仓库单独占一块地方，甚至干脆存到「长期库房」（**老年代**），因为搬来搬去（在 Survivor 间复制）太费劲。',
                mapping: [
                  { real: '公共仓库', tech: 'Eden 区' },
                  { real: '每个工人手边的抽屉', tech: 'TLAB：线程私有的分配缓冲' },
                  { real: '从自己抽屉直接拿，不用登记', tech: 'TLAB 内指针碰撞，无需 CAS 或锁' },
                  { real: '抽屉空了，去仓库换一格', tech: 'TLAB 用尽 → refill，申请新 TLAB' },
                  { real: '跟仓管员排队登记', tech: 'TLAB 分配失败 → Eden 慢路径，CAS / 加锁' },
                  { real: '抽屉里剩的零头用不上', tech: 'TLAB 内部碎片，`TLABWasteTargetPercent` 控制上限（默认 1%）' },
                  { real: '大件物料直接占仓库一角', tech: '大对象直接在 Eden 分配，不进 TLAB' },
                  { real: '长期库房', tech: '老年代：大对象或长期存活对象' },
                ],
                limit:
                  '这个类比有处不成立：抽屉**不会自动清空**，而 TLAB 在 Minor GC 时会整体作废、重新划分——因为 TLAB 只是 Eden 的一段，GC 后 Eden 被清空，TLAB 自然也没了。另外「抽屉大小固定」也不准确：`-XX:+ResizeTLAB`（默认开）会根据线程的分配速率动态调整 TLAB 大小，分配猛的就给大一点。',
              },
              {
                kind: 'question',
                title: 'TLAB 是什么？为什么能提高分配效率？',
                questionId: 'java-04-Q23',
                intent:
                  '核心逻辑一句话：**把「并发共享」变成「线程私有」，用空间换掉同步开销**。',
                points: [
                  '**是什么**：Thread Local Allocation Buffer，Eden 区内为每个线程**预先划分**的一小块私有区域。线程的小对象优先在这里分配',
                  '**解决什么**：指针碰撞本身极快，但多线程同时挪指针需要同步（CAS 或锁）。TLAB 把「共享指针」变成「线程私有指针」，**同步开销直接归零**',
                  '**默认开启**：`-XX:+UseTLAB`（默认 true）。所以「Java 分配对象很快」在很大程度上要归功于它',
                  '**参数**：`-XX:TLABSize`（初始大小）、`-XX:+ResizeTLAB`（默认开，按分配速率动态调整）、`-XX:TLABWasteTargetPercent`（允许内部碎片占比，默认 1%）',
                  '**慢路径**：TLAB 剩余空间不够 → 先尝试 refill（申请新 TLAB），仍不行则退化到 Eden 共享区分配（此时才需要 CAS）',
                  '**代价**：每个线程都有独立 TLAB 会带来**内部碎片**（用不完的零头浪费）。线程多、对象小的场景碎片可观，这也是「线程数暴涨会浪费 Eden」的一个原因',
                ],
                depth:
                  'TLAB 的设计精髓是「**把问题消灭而不是解决**」：与其优化 CAS 让并发分配更快，不如让线程根本不需要共享。同一思路在 JVM 里到处出现——GC 的分区并行、JIT 的线程本地编译队列、`ThreadLocalRandom` 的 `probe` 分散。识别出这个模式，比记住 TLAB 的参数更有价值。反过来看，TLAB 也有失效场景：**大对象**（放不进 TLAB）与**TLAB 太小**（频繁 refill）。前者靠 `PretenureSizeThreshold` 或直接进 Eden 解决，后者靠 `ResizeTLAB` 自适应。',
                followup:
                  '「TLAB 里的对象什么时候进 Survivor」——TLAB 与「TLAB 里的对象」是两件事：TLAB 是**分配区**，GC 时它随 Eden 一起被扫描，其中的存活对象照常复制到 Survivor。TLAB 本身不是一个「对象存储容器」，它只是 Eden 的一段被划给某线程专用。所以 GC 之后所有 TLAB 都会重建，线程下次分配时重新申请。',
              },
              {
                kind: 'diagram',
                title: 'TLAB 分配的三个分支：快路径、refill、慢路径',
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 线程申请分配', note: '`new` 一个小对象，大小已知', tone: 'primary' },
                    { label: '② TLAB 剩余 ≥ 所需', note: '快路径：在自己的缓冲里挪指针，**无锁无 CAS**', tone: 'primary' },
                    { label: '③ 剩余不足 → refill', note: '丢弃当前 TLAB 尾部零头（内部碎片），申请一块新的', tone: 'warn' },
                    { label: '④ 对象大于 TLAB 的一半左右', note: '大对象不进 TLAB，直接在 Eden 共享区分配', tone: 'warn' },
                    { label: '⑤ Eden 也放不下', note: '触发 Minor GC；仍不行则分配担保进老年代', tone: 'bad' },
                  ],
                  caption:
                    '快路径占了绝大多数（通常 95% 以上），这就是「Java 分配对象几乎免费」的来源：一条指针加法 + 一次边界比较。第 ③ 步的「丢弃零头」是 TLAB 的唯一代价——它是**空间换时间**的典型：宁可浪费 Eden 里的一点碎片，也不让线程去做 CAS。`-XX:TLABWasteTargetPercent=1` 就是在给这个浪费设上限：若历史碎片率超过 1%，JVM 会调小 TLAB。',
                },
              },
              {
                kind: 'question',
                title: '大对象会直接分配在老年代吗？',
                questionId: 'java-04-Q24',
                intent:
                  '要答「会，但要看收集器」——这是区分「背过」与「调过」的地方：`PretenureSizeThreshold` 只对 Serial / ParNew 有效。',
                points: [
                  '**会**：`-XX:PretenureSizeThreshold=<字节>` 指定阈值，超过它的大对象**直接在老年代分配**，跳过 Eden 与 Survivor',
                  '**为什么**：大对象在 Survivor 之间复制成本极高（复制算法要整块搬运），且大对象往往生命周期较长，放新生代纯属浪费',
                  '**重要限制**：该参数**只对 Serial 与 ParNew 有效**。Parallel Scavenge 与 **G1 不认它**',
                  '**G1 的做法**：用 **Humongous Region**——对象超过 Region 大小的一半就算 humongous，直接占用一个或多个连续 Region，放在老年代逻辑区',
                  '**典型大对象**：长数组、大 `byte[]`（缓冲区）、大 `String`、一次性加载的大集合',
                  '**副作用**：短命的大对象若无法进入新生代，会直接污染老年代，导致频繁 Full GC——这是「大数组导致 GC 抖动」的经典成因',
                ],
                depth:
                  '「大对象」的判定标准其实有两套，混用会答错：**① `PretenureSizeThreshold`（按字节，用户指定，仅 Serial/ParNew）**；**② TLAB 分配阈值（对象大于 TLAB 剩余空间就去 Eden 共享区，这是「不进 TLAB」而不是「进老年代」）**。很多资料把两者混为一谈。真正的第三套是 **G1 的 humongous 判定（> Region/2）**。回答时把这三层分开，比笼统说「大对象直接进老年代」精确得多。',
                followup:
                  '「为什么 G1 里大对象更危险」——humongous 对象要占**连续的** Region，若堆碎片化找不到连续空间，就会触发 Full GC。而且它在老年代，回收成本高。所以 G1 场景下 `-XX:G1HeapRegionSize` 的调整（默认按堆大小自动推导 1–32MB）会直接影响「多大的对象算 humongous」，进而影响 GC 行为。',
              },
              {
                kind: 'principle',
                title: '把「一个对象的一生」串成一条主线',
                body: [
                  '这一课所有细节都能挂在一条时间线上：**分配 → 布局 → 访问 → 优化 → 晋升**。面试里被问到任何一个点，都可以主动把它挂回这条线，从而把单点问答变成体系化表述。',
                ],
                steps: [
                  {
                    title: '① 分配：在哪、怎么划',
                    detail:
                      'TLAB 快路径 → Eden 慢路径 → 大对象直接老年代。是否规整决定指针碰撞还是空闲列表；并发安全由 TLAB 与 CAS 兜住。',
                  },
                  {
                    title: '② 布局：划出来之后怎么摆',
                    detail:
                      'Mark Word（8B，随锁状态复用）+ Klass 指针（4B 压缩）+ 实例数据（按宽度排序）+ 8 字节对齐填充。`new Object()` = 12 + 4 = 16 字节。',
                  },
                  {
                    title: '③ 访问：怎么找到它',
                    detail:
                      '直接指针（HotSpot）一跳直达；句柄访问两跳但引用稳定。移动对象靠 OopMap + 记忆集精确修改，而不是全堆扫描。',
                  },
                  {
                    title: '④ 优化：能不能不分配',
                    detail:
                      '逃逸分析判定方法逃逸 / 线程逃逸；不逃逸则**标量替换**（拆成局部变量，对象消失）+ **锁消除**。前提是已被 C2 编译。',
                  },
                  {
                    title: '⑤ 晋升：什么时候换房间',
                    detail:
                      '熬过 `MaxTenuringThreshold` 次 Minor GC，或动态年龄判定（同龄对象总和超 Survivor 一半），或分配担保失败，就进老年代。',
                  },
                ],
                takeaway:
                  '最能体现深度的一句话：**「Java 里 `new` 的代价不是分配内存，而是让对象活下来。」** 分配本身已被 TLAB 与标量替换压到接近零；真正的成本在后续的 GC 扫描与复制。所以「少创建对象」这条老建议应当修正为——**少创建会活下来的对象**，短命对象在现代 JVM 上几乎免费。',
              },
            ],
          },
        },
        {
          id: 'gc-algorithms',
          title: 'GC 算法与可达性分析',
          kind: 'concept',
          sources: [{ topic: 'java-04', chapters: ['算法与判断'] }],
          content: {
            intro:
              'GC 要回答三个问题：哪些对象是垃圾、怎么把空间还回去、什么时候动手。现代 JVM 的答案分别是可达性分析、三种基本算法（标记清除 / 复制 / 标记整理）、以及按分代假设做的组合调度。这条链上每一环都有代价：可达性分析要求「引用关系在某一瞬间静止」，于是有了 STW 与安全点；复制算法要求「存活对象少」，于是有了分代；标记整理要求「移动后修正引用」，于是有了记忆集与 OopMap。本节沿「判断死亡 → 回收空间 → 决定时机」这条主线走完，并补上 `finalize` 自救与类卸载这两个高频追问点。',
            outline: [
              '可达性分析从 GC Roots 出发，不可达对象要经两次标记才真正回收',
              '四种引用强度决定了对象在「内存紧张」与「下一次 GC」时的不同命运',
              '三种基本算法各有碎片与效率取舍，分代收集是按存活率分配算法的结果',
              'STW 无法消除只能缩短，安全点与安全区域保证线程停在引用关系确定的位置',
            ],
            pitfalls: [
              '说 JVM 用引用计数判断存活，主流实现用的是可达性分析',
              '把 Minor GC 当成「只扫描新生代」，忘了它要处理老年代指向新生代的引用',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：GC 的三个决策点',
                body: [
                  '把 GC 想成一个**物业保洁公司**：它要先判断「哪些工位没人了」（判活），再决定「怎么把空位腾出来」（回收算法），最后决定「什么时候上门」（触发时机）。三个决策互相牵制——判活的方式决定了必须暂停多久，回收算法决定了碎片多少，触发时机决定了单次工作量。',
                  '本课按这个顺序讲：**判活**（可达性分析 + GC Roots + 四种引用 + `finalize` 自救 + 方法区回收）、**回收**（标记清除 / 复制 / 标记整理）、**时机**（分代假设 + STW 与安全点）。收集器的具体实现留到下一课，这里只打地基。',
                ],
                points: [
                  '**判活**：从 GC Roots 做图遍历，走不到的对象判死。这是唯一能处理循环引用的方案',
                  '**回收**：标记清除（简单但碎片）、复制（无碎片但费空间）、标记整理（无碎片但要移动）',
                  '**时机**：Eden 满就 Minor GC；老年代不够就 Full GC；分代假设让「大部分对象短命」这件事变成工程收益',
                  '**暂停**：判活和移动都必须在一个「引用关系冻结」的快照上做，这就是 STW 与安全点存在的原因',
                ],
              },
              {
                kind: 'question',
                title: '引用计数法和可达性分析法有什么区别？为什么 JVM 用后者？',
                questionId: 'java-04-Q25',
                intent:
                  '不能只答「计数解决不了循环引用」，还要说清可达性分析换来的代价——必须暂停。这是后面讲 STW 的伏笔。',
                points: [
                  '**引用计数**：每个对象维护一个计数器，被引用 +1、引用失效 -1，归零即可回收。判定是**局部的**，不需要遍历全堆',
                  '**致命缺陷**：循环引用。A 与 B 互相引用，外部引用已断开，但两者计数都是 1，永远回收不掉',
                  '**第二个缺陷**：增减计数发生在每次赋值上，属于高频操作；多线程下必须原子，开销进一步放大',
                  '**可达性分析**：从一组 GC Roots 出发沿引用链遍历，不可达的对象判死。判定是**全局的**，天然处理循环引用',
                  '**代价**：必须遍历整个可达图，且在遍历期间引用关系不能变——所以需要 STW（或并发标记 + 写屏障兜底）',
                  '**HotSpot 全部主流收集器都用可达性分析**；引用计数只在 Python、ObjC（ARC）、Swift 这类语言里作为主机制',
                ],
                depth:
                  '为什么引用计数在 Java 里彻底不可行？还有一个常被忽略的原因：**Java 允许对象内部持有指向任意对象的引用，而且引用可以被 JIT 优化掉**。标量替换之后，对象根本不存在了，它的「计数」该往哪记？反过来说，可达性分析天然适配「对象图」这个抽象——它只关心「从根能不能走到」，不关心「有多少条边走进来」。这也是为什么可达性分析可以精确到「只扫描 OopMap 标记的位置」，而引用计数必须在每次指针写入时插桩。',
                followup:
                  '「既然循环引用回收不掉，那 Python 怎么办」——Python 用引用计数 + 分代 GC 兜底：计数不为零但疑似成环的对象，定期用标记清除扫一遍。这也说明引用计数不是「错」，而是「不完整」：它适合即时回收（引用归零立刻释放，没有停顿），但不适合作为唯一手段。Java 选择了「延迟但完整」的路线，用 STW 换确定性。',
              },
              {
                kind: 'diagram',
                title: '同一张对象图，两种机制的判定结果完全不同',
                body: [
                  '假设有 A、B、C 三个对象：A 与 B 互相引用，C 单向引用 B，而外部没有任何变量指向它们。引用计数的视角是「谁指向我」，可达性分析的视角是「从根能不能走到我」。',
                ],
                diagram: {
                  type: 'split',
                  left: {
                    title: '✗ 引用计数：局部正确，全局失效',
                    tone: 'bad',
                    items: [
                      'A 的计数 = 1（来自 B），B 的计数 = 2（来自 A 和 C）',
                      '没有任何一个计数归零 → 三个对象全部「存活」',
                      '它们实际上已经从根不可达，属于纯垃圾',
                      '要修就得额外跑一遍环检测，等于又做了一次遍历',
                      '并发修改计数需要原子操作，写入路径变重',
                      'JIT 优化后对象可能被拆散，计数无处可记',
                    ],
                  },
                  right: {
                    title: '✓ 可达性分析：全局一次判定',
                    tone: 'good',
                    items: [
                      '从 GC Roots 出发做图遍历，标记所有能走到的对象',
                      'A、B、C 都不在标记集合里 → 三个一起判死',
                      '环的存在完全不影响结论，遍历不问「入度」',
                      '代价：必须遍历整个可达图，成本与存活对象数成正比',
                      '代价：遍历期间引用关系必须冻结 → STW',
                      '收益：可以只扫描 OopMap 标记的位置，精确且可并发化',
                    ],
                  },
                  caption:
                    '关键差别是**「入度」与「可达」的区别**：引用计数数的是入度，可达性分析问的是连通性。入度为零一定不可达，但入度不为零不代表可达——环就是反例。这也解释了为什么 Java 里 `a.b = b; b.a = a;` 之后即使把 `a`、`b` 都置 null，两个对象仍要等下一次 GC 才被回收。',
                },
              },
              {
                kind: 'question',
                title: '哪些对象可以作为 GC Roots？',
                questionId: 'java-04-Q26',
                intent:
                  '面试口诀「两栈两方法 + 一锁 + 其他」。但更值钱的是那句本质：**GC Roots 就是「当前正在被使用、不可能回收」的起点集合**。',
                points: [
                  '**虚拟机栈**：栈帧中局部变量表里引用的对象——正在执行的方法的局部变量、参数、`this`',
                  '**本地方法栈**：JNI（Native 方法）引用的对象，比如通过 JNI 传进 Java 层的句柄',
                  '**方法区静态变量**：类的 `static` 字段引用的对象，生命周期与类同长',
                  '**方法区常量**：常量池里的引用，例如字符串常量池中驻留的 `String` 实例',
                  '**被锁持有的对象**：`synchronized(obj)` 中正被 monitor 持有的对象，锁记录本身是根',
                  '**JVM 内部引用**：基本类型的 `Class` 对象、常驻异常对象（NPE / OOM）、系统类加载器',
                  '**其他**：JMXBean、JVMTI 回调、本地代码缓存、`Unsafe` 分配的静态注册等',
                ],
                depth:
                  '为什么「正在执行的方法的局部变量」能当根？因为方法栈帧是活的，局部变量表在栈上，随时可能被下一条字节码读取——它必须是合法的引用。这也是为什么「栈上引用」构成根集合的主体，而且**每个线程都有一份自己的根**：GC 开始时要让所有线程都停在安全点，然后逐个线程读它的 OopMap，把栈上/寄存器里的引用全部登记为根。反过来说，如果某个对象只在某个已经返回的方法的局部变量里出现过，它就不可能成为根——这就是「方法返回后对象立刻可回收」的原理。',
                followup:
                  '「ThreadLocal 的 value 算根吗」——算。`ThreadLocalMap` 的 `Entry` 被 `Thread` 对象强引用，而 `Thread` 是活着的线程对象，能从「线程表」走到，所以是根可达。这就是「`ThreadLocal` 不 `remove()` 会泄漏」的根因：不是 GC 找不到它，而是**它一直被当成活的**。',
              },
              {
                kind: 'diagram',
                title: 'GC Roots 的五类来源与它们的生命周期',
                body: [
                  '把根按「谁持有、活多久」排一下，就能看出根集合的稳定性差异：栈上的根随方法返回消失，方法区的根随类卸载消失，JVM 内部的根则几乎永久。',
                ],
                diagram: {
                  type: 'tree',
                  root: {
                    label: 'GC Roots',
                    note: '「正在被使用」的起点集合',
                    children: [
                      {
                        label: '线程栈（每个线程一份）',
                        note: '随方法返回而消失，最动态',
                        tone: 'primary',
                        children: [
                          { label: '局部变量表', note: '参数、`this`、局部变量' },
                          { label: '操作数栈 / 寄存器', note: '由 OopMap 精确标记' },
                          { label: 'JNI 局部 / 全局引用', note: '本地方法栈中的句柄' },
                        ],
                      },
                      {
                        label: '方法区',
                        note: '随类卸载而消失，较稳定',
                        tone: 'primary',
                        children: [
                          { label: '类的静态字段', note: '`static Object ref`' },
                          { label: '常量池引用', note: '字符串常量、符号引用解析结果' },
                        ],
                      },
                      {
                        label: '同步与 JVM 内部',
                        note: '几乎永久，最稳定',
                        tone: 'warn',
                        children: [
                          { label: '被 synchronized 持有的对象', note: 'monitor 的 owner 记录' },
                          { label: '基本类型 Class、常驻异常', note: 'NPE、OOM 等预分配实例' },
                          { label: '系统类加载器', note: 'bootstrap classloader 及其加载的类' },
                          { label: 'JMXBean / JVMTI / 本地缓存', note: '框架层注册的回调' },
                        ],
                      },
                    ],
                  },
                  caption:
                    '这张树有个实用读法：**从根到对象的路径就是「它为什么还活着」**。排查内存泄漏时，用 MAT 或 `jmap` 看 dominator tree，本质就是在找「哪条根路径不该存在」。最常见的是静态集合无限增长（根是静态字段）和线程池里的 `ThreadLocal`（根是线程对象）——两类都落在「方法区」和「同步与 JVM 内部」这两枝上。',
                },
              },
              {
                kind: 'question',
                title: '强引用、软引用、弱引用、虚引用的区别和用途？',
                questionId: 'java-04-Q27',
                intent:
                  '四种引用的差别只有一处：**「什么时候允许被回收」**。答完这张表，再补一句 `ThreadLocal` 的追问链，基本就满分了。',
                points: [
                  '**强引用**：`Object o = new Object()`，默认就是它。只要可达就绝不回收，宁可抛 OOM',
                  '**软引用** `SoftReference`：内存不足时（OOM 之前）回收。适合做内存敏感缓存，如本地图片缓存',
                  '**弱引用** `WeakReference`：只要发生 GC 就回收，不管内存够不够。`WeakHashMap` 的 key、`ThreadLocalMap` 的 key 都用它',
                  '**虚引用** `PhantomReference`：`get()` 永远返回 null，无法通过它访问对象。唯一用途是配合 `ReferenceQueue` 在对象被回收时收到通知',
                  '**软引用的现实**：`SoftReference` 的回收策略依赖 `-XX:SoftRefLRUPolicyMSPerMB`，行为不稳定，现代缓存更多用 Caffeine 的 `weakValues()` 或权重淘汰',
                  '**虚引用的实战**：`DirectByteBuffer` 靠虚引用 + `Cleaner` 释放堆外内存——堆内对象被回收时，才触发堆外内存的释放',
                ],
                depth:
                  '四种引用在 JVM 内部是同一条 `Reference` 继承链，差别体现在**引用对象本身被 GC 处理的方式**上：强引用是普通的 Oop，不参与特殊逻辑；软/弱/虚引用是特殊的 `Reference` 子类，GC 在标记阶段会额外判断「这个引用该不该清」。清理时把 `referent` 置 null，并把 `Reference` 对象本身塞进 `ReferenceQueue`（如果注册了）。所以「虚引用能感知回收」的机制不是「它指向对象」，而是「**它自己被放进队列这件事**」——这也是为什么 `get()` 必须是 null：它的语义是「回调凭证」，不是「访问通道」。',
                followup:
                  '连环追问：**`ThreadLocal` 为什么泄漏**。`ThreadLocalMap.Entry` 继承 `WeakReference<ThreadLocal>`，key 是弱引用。key 被回收后变成 null，但 value 仍被 `Entry` 强引用，而 `Entry` 被 `Thread` 的 `threadLocals` 强引用，`Thread` 又被根可达——于是 `key == null` 的脏 Entry 一直赖着。线程池里线程长期存活，泄漏会累积。所以规范做法是 `try { ... } finally { tl.remove(); }`，不能只靠弱引用。',
              },
              {
                kind: 'diagram',
                title: '四种引用的回收时机对照',
                body: [
                  '这四种引用不是「强度排序」这么简单，它们在「谁触发回收、回收后能做什么」两个维度上各有位置。软引用由内存压力触发，弱引用由 GC 次数触发，虚引用只提供通知。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['引用类型', '回收时机', '回收后能否访问', '典型落点'],
                  cols: ['回收时机', '回收后能否访问', '典型落点'],
                  rows: [
                    ['强引用', '永不主动回收', '可以', '普通对象、集合元素'],
                    ['软引用', '内存不足时', '可以（未回收前）', '本地缓存、图片池'],
                    ['弱引用', '每次 GC 都回收', '可以（未回收前）', '`WeakHashMap`、`ThreadLocalMap` 的 key'],
                    ['虚引用', '随时，`get()` 恒 null', '不能', '`Cleaner`、堆外内存释放'],
                  ],
                  caption:
                    '第三列是很多人忽略的：**软引用和弱引用在回收之前仍然可以 `get()` 到对象**，而虚引用永远不行。这决定了使用方式——软/弱引用是「缓存 + 可能失效」，虚引用是「回收回调凭证」。另外注意 `ReferenceQueue` 是所有引用共用的机制：注册了队列，回收时就会被 `enqueue`，你的清理线程从队列里 `poll()` 就能知道「谁死了」。',
                },
              },
              {
                kind: 'question',
                title: 'finalize() 方法能「自救」对象吗？为什么被废弃？',
                questionId: 'java-04-Q28',
                intent:
                  '这题的正确答法是「**知道机制、明确不用**」。前半段讲两次标记，后半段讲为什么它是灾难。',
                points: [
                  '**能自救，但只有一次机会**：对象不可达后，若覆盖了 `finalize()` 且从未执行过，会被放进 F-Queue，由低优先级 Finalizer 线程执行；在方法里把 `this` 挂到某个可达对象上（如静态字段），即可复活',
                  '**第二次必死**：`finalize()` 只会被调用一次，再次不可达时直接回收，没有第二次机会',
                  '**时间不确定**：Finalizer 线程是单线程、低优先级，可能长时间得不到调度，甚至程序结束都不执行',
                  '**性能灾难**：Finalizer 线程执行慢会拖住整个 F-Queue，对象回收被推迟，堆压力上升',
                  '**安全风险**：`finalize()` 里抛出的异常会被吞掉，对象状态可能被破坏；「复活」还可能造成意外的对象泄漏',
                  '**已被废弃**：JDK 9 起标记 `@Deprecated`，JDK 18 起标记 `forRemoval`。替代方案是 `Cleaner`（基于虚引用）或 `try-with-resources`',
                ],
                depth:
                  '为什么要设计「两次标记」这道缓刑？历史原因是给 C++ 背景的开发者一个「析构函数」的假象，允许在对象消失前做最后的资源清理——比如关闭文件句柄、释放 native 内存。但实践证明这个设计是错的：**它把「资源清理」这件必须确定的事，绑定到了「不确定何时发生」的 GC 上**。相比之下 `Cleaner` 虽然也基于虚引用、也不保证及时，但至少：不依赖继承（不改类结构）、可以被显式调用、异常不会静默吞掉、不会让对象复活。JDK 里的 `DirectByteBuffer`、`FileInputStream` 都是这么改过来的。',
                followup:
                  '「那 `finalize()` 里的对象在 F-Queue 期间算活着吗」——算。它已经是「不可达但未回收」，在 `finalize()` 执行完之前，GC 不会再回收它。这也是为什么大量覆盖 `finalize()` 的类会导致「对象堆积」：不是内存不够，而是回收速度被单线程的 Finalizer 卡住了。线上看到 `java.lang.ref.Finalizer` 占用大量内存，基本就是这个原因。',
              },
              {
                kind: 'principle',
                title: '两次标记：为什么「不可达」不等于「立即死」',
                body: [
                  '可达性分析的结论只是「不可达」，不是「可回收」。HotSpot 在中间插了一道可选的缓刑流程，理解它能解释很多「对象为什么还活着」的疑问。',
                ],
                steps: [
                  {
                    title: '① 第一次标记：可达性分析判不可达',
                    detail:
                      '遍历完成后，未被标记的对象进入「第一次标记」集合。此时只是**判定**，没有任何动作，对象内存完全没动。',
                  },
                  {
                    title: '② 筛选：有没有必要执行 finalize()',
                    detail:
                      '判断两件事：这个类**是否覆盖**了 `finalize()`，以及这个方法**是否已经执行过**。任一不满足，直接进入「可回收」，不排队。这解释了为什么「第二次不可达必死」——因为已经执行过了。',
                  },
                  {
                    title: '③ 入队 F-Queue 并异步执行',
                    detail:
                      '满足条件的对象被放进 `F-Queue`，由 JVM 自动创建的低优先级 `Finalizer` 线程逐个执行 `finalize()`。注意是**异步**——GC 线程不等它，所以「执行时机」完全不可控，甚至可能永远不执行。',
                  },
                  {
                    title: '④ 第二次标记：复活或回收',
                    detail:
                      '`finalize()` 执行完后，GC 对 F-Queue 中的对象再做一次小规模标记。若在方法里把 `this` 赋给了某个可达对象（如静态字段），它重新可达 → 移出回收集合，**复活成功**；否则进入回收。',
                  },
                ],
                takeaway:
                  '这四步的本质是「**把确定性的内存回收，挂到了一个不确定的回调上**」。这不是设计精巧，而是历史包袱：它让「对象什么时候被真正释放」变得不可预测，也让 GC 的停顿时间受业务代码（`finalize()` 里写了什么）影响。JDK 9 之后的新代码不该再碰它；看到老代码里有 `finalize()`，正确做法是换成 `Cleaner` 或 `AutoCloseable`。',
              },
              {
                kind: 'question',
                title: '方法区（类信息）会被回收吗？类卸载的条件是什么？',
                questionId: 'java-04-Q29',
                intent:
                  '很多人只答「会」就停了。要答出**两个层次**：常量池的废弃常量回收（容易）+ 类的卸载（极苛刻）。',
                points: [
                  '**会回收**，但收益远小于堆。方法区回收分两类：**废弃常量**和**无用的类**',
                  '**废弃常量**：常量池中没有任何引用指向的字面量或符号引用。例如字符串 `"abc"` 已无任何 `String` 对象引用它、某个类的符号引用已无代码使用，就可以清理',
                  '**类卸载三条件**（必须同时满足）：① 该类的**所有实例**都已被回收，堆中不存在任何实例；② 加载该类的 **`ClassLoader` 已被回收**；③ 对应的 **`Class` 对象**没有任何地方被引用（无法通过反射访问）',
                  '**为什么苛刻**：条件 ② 要求整个类加载器死掉，而类加载器通常被大量类引用，形成环状依赖，很难整体回收',
                  '**现实场景**：OSGi、热部署（Tomcat 的 `WEB-INF/lib` 重载）、动态代理 / 字节码生成框架（CGLIB、ByteBuddy）、脚本引擎反复编译',
                  '**几乎不可能卸载的**：由 bootstrap classloader 加载的核心类（`java.lang.String`、`java.util.List` 等），因为该加载器永远存活',
                ],
                depth:
                  '为什么 Metaspace 也会 OOM？因为类卸载条件太苛刻，动态生成类的场景（大量 CGLIB 代理、JSP 编译、Groovy 脚本、`LambdaMetafactory` 生成的隐藏类）会不断堆积 `Klass` 结构。`OutOfMemoryError: Metaspace` 的经典成因就是「类加载器泄漏」：某个 `ClassLoader` 被一个静态字段或线程上下文类加载器（TCCL）意外持有，导致它加载的所有类都无法卸载。排查手段是 `jcmd <pid> VM.metaspace` 看 `Klass` 数量，或用 `-XX:+TraceClassUnloading` 观察卸载日志。',
                followup:
                  '「字符串常量池在方法区吗」——**逻辑上属于方法区，物理上 JDK 7 起搬到了堆**。这个搬迁的意义是：字符串常量池里的对象也要参与 GC，放在堆里能被常规的 Minor GC 处理；而 JDK 7 之前放在永久代，只有 Full GC 才回收，容易撑爆永久代。注意这个变化**早于**永久代被 Metaspace 取代（JDK 8），两件事常被混淆。',
              },
              {
                kind: 'diagram',
                title: '类卸载的判定：三个条件缺一不可',
                body: [
                  '类卸载之所以罕见，是因为三个条件构成了「与」关系，任何一个不满足都不会卸载。按判定顺序画出来，能看清哪一环最容易卡住。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 堆中无该类的任何实例', note: '所有 `new` 出来的对象都已回收' },
                    { label: '② 该类的 ClassLoader 已被回收', note: '最容易卡住的一环：加载器常被静态引用或 TCCL 持有' },
                    { label: '③ Class 对象无任何引用', note: '不能通过反射、常量池、JNI 访问到它' },
                    { label: '✓ 卸载 Klass + 释放 Metaspace', note: '三个条件同时成立才发生' },
                  ],
                  caption:
                    '注意第 ② 步的连带效应：**一个类加载器死掉，它加载的所有类一起卸载**。所以热部署的粒度是「类加载器」而不是「单个类」。这也解释了为什么 Tomcat 重载应用要新建一个 `WebappClassLoader`——旧的那个连同它加载的上万个类一起被丢弃，才能真正释放 Metaspace。反过来说，只要有一个线程的 `contextClassLoader` 还指着旧加载器，整个旧世界都留着。',
                },
              },
              {
                kind: 'question',
                title: '标记-清除、复制、标记-整理三种 GC 算法的优缺点？',
                questionId: 'java-04-Q30',
                intent:
                  '三种算法要能一句话说清「代价在哪」：标记清除的代价是碎片、复制的代价是空间、标记整理的代价是移动。',
                points: [
                  '**标记-清除**：先标记存活对象，再统一清除未标记的。实现最简单，但① 标记与清除两趟都慢；② 产生**内存碎片**，大对象可能因找不到连续空间而提前触发下一次 GC',
                  '**复制**：内存分两块，把存活对象复制到另一块，然后整块清空。**无碎片**、分配可用指针碰撞（极快），代价是**内存利用率减半**',
                  '**复制算法的 Appel 式优化**：新生代按 8:1:1 分 Eden + 两块 Survivor，每次只用 Eden + 一块 Survivor，浪费降到 10%。前提是「存活对象不超过 10%」，否则要靠**分配担保**兜底',
                  '**标记-整理**：标记后把存活对象向一端移动，再清理边界外的内存。**无碎片、不浪费空间**，代价是移动对象要更新所有指向它的引用，且必须 STW',
                  '**选择逻辑一句话**：存活率低 → 复制（复制成本 ∝ 存活对象数）；存活率高 → 标记清除或标记整理（清除成本 ∝ 垃圾数）',
                  '**组合使用**：Serial / ParNew / Parallel 的新生代用复制，CMS 老年代用标记清除，Serial Old / Parallel Old / G1 老年代用标记整理',
                ],
                depth:
                  '「复制算法的成本与存活对象数成正比」这句话是理解分代的关键。若新生代 100MB、存活 90MB，复制算法要搬 90MB，还要保证 Survivor 装得下（装不下就得靠老年代担保）；而标记清除只需扫一遍、清 10MB。反过来，若老年代 1GB、存活 95%，复制要搬 950MB，几乎等于把整个堆翻一遍——完全不可接受。所以算法选择不是「哪个更先进」，而是**「成本模型和数据的存活分布是否匹配」**。这也是分代收集的理论根基。',
                followup:
                  '「标记-整理为什么慢」——不是慢在「标记」，而是慢在「移动」。移动一个对象要做三件事：拷贝内存、更新对象头里的转发指针、**修正所有指向它的引用**。第三步最贵，因为引用散落在栈、寄存器、堆各处，只能靠 OopMap 和记忆集来找。而且移动期间所有线程必须停住（否则别的线程可能正拿着旧地址读写）。这就是为什么 G1 用「Region 内复制」而不是全堆整理——把移动范围限制在一个 Region 内，停顿就可控。',
              },
              {
                kind: 'compare',
                title: '三种基本算法的取舍：碎片、空间、移动',
                head: ['维度', '标记-清除', '复制', '标记-整理'],
                rows: [
                  ['核心动作', '标记存活 → 直接清除', '存活对象搬到另一半', '标记 → 向一端压缩 → 清边界外'],
                  ['内存碎片', '**有**，会产生不连续空洞', '无，天然紧凑', '无，压缩后连续'],
                  ['空间开销', '无额外空间', '需一倍空间（优化后 10%）', '无额外空间'],
                  ['分配速度', '慢，需空闲链表查找', '快，指针碰撞', '快，指针碰撞'],
                  ['是否移动对象', '不移动', '移动', '移动'],
                  ['主要成本', '碎片导致提前 GC', '复制量 ∝ 存活对象数', '修正引用 + STW'],
                  ['适合的存活率', '任意（偏高时更划算）', '**低**（< 10% 最佳）', '**高**'],
                  ['典型使用者', 'CMS 老年代', '所有新生代收集器', 'Serial Old / Parallel Old / G1'],
                ],
                caption:
                  '表格最后两行是配套的：**「适合的存活率」决定了「典型使用者」**。CMS 之所以敢用标记清除，是因为老年代存活率高、清除的垃圾少，碎片问题靠 `Compact` 兜底（`CMSFullGCsBeforeCompaction`）；新生代之所以敢用复制，是因为 98% 的对象活不过第一次 GC。整套分代设计的巧妙之处，就在于**让每种算法只处理它最擅长的数据分布**。',
              },
              {
                kind: 'diagram',
                title: '复制算法的 8:1:1：把「浪费一半」压到 10%',
                body: [
                  '教科书里的复制算法要求两块等大内存，浪费 50%——这在堆里是不可接受的。HotSpot 的解法是 Appel 式回收：把新生代切成 Eden 和两块小 Survivor，比例 8:1:1。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'Eden（8）',
                      note: '新对象都在这，满了触发 Minor GC',
                      slots: [
                        { label: 'obj1', value: '新生', tone: 'primary' },
                        { label: 'obj2', value: '新生', tone: 'primary' },
                        { label: 'obj3', value: '新生', tone: 'primary' },
                        { label: 'obj4', value: '新生', tone: 'primary' },
                        { label: 'obj5', value: '新生', tone: 'primary' },
                        { label: 'garbage', value: '已死', tone: 'warn' },
                      ],
                    },
                    {
                      name: 'Survivor 0（1）',
                      note: '本次 GC 的「目标区」',
                      slots: [
                        { label: '空', value: '待接收', tone: 'muted' },
                      ],
                    },
                    {
                      name: 'Survivor 1（1）',
                      note: '上一次 GC 的「来源区」',
                      slots: [
                        { label: 's1-a', value: 'age=1', tone: 'muted' },
                        { label: 's1-b', value: 'age=2', tone: 'muted' },
                      ],
                    },
                  ],
                  caption:
                    '一次 Minor GC 的动作：把 Eden 里的存活对象（obj1–obj5）和 Survivor 1 里的对象（s1-a、s1-b）**全部复制到 Survivor 0**，年龄 +1，然后清空 Eden 和 Survivor 1。两块 Survivor 交替当「目标区」，所以叫「半区复制」。内存利用率 = Eden 8 + 一块 Survivor 1 = 9/10，只浪费 10%。代价是：**若存活对象超过 10%，Survivor 装不下**，只能通过分配担保直接晋升老年代——这就是「Survivor 溢出」和「过早晋升」的来源。',
                },
              },
              {
                kind: 'question',
                title: '什么是分代收集理论？为什么新生代用复制、老年代用标记-整理？',
                questionId: 'java-04-Q31',
                intent:
                  '分代不是「拍脑袋分区」，而是三条经验假说推出的必然结论。能背出三条假说，就能推出算法选择。',
                points: [
                  '**弱分代假说**：绝大多数对象都是朝生夕死的。实测新生代一次 Minor GC 后存活率通常低于 5%',
                  '**强分代假说**：熬过越多次 GC 的对象越难死亡。所以按「年龄」分层，让难死的对象少被扫描',
                  '**跨代引用假说**：跨代引用相对于同代引用是极少数。所以可以用**记忆集**记录跨代引用，避免 Minor GC 全堆扫描',
                  '**推论 1**：新生代存活率低 → 复制算法（成本 ∝ 存活对象数，且天然整理）',
                  '**推论 2**：老年代存活率高、对象大 → 复制不划算 → 标记清除（CMS）或标记整理（G1 / Parallel Old）',
                  '**推论 3**：老年代指向新生代的引用很少 → 只需扫描「脏卡」对应的少量老年代对象，作为 Minor GC 的额外根',
                ],
                depth:
                  '三条假说里最容易被忽略的是第三条——它是「Minor GC 为什么不用扫全堆」的全部依据。若没有跨代引用假说，Minor GC 就必须把整个老年代当根扫描一遍，那「只回收新生代」就失去了意义。有了它，HotSpot 用**卡表（Card Table）**：把老年代按 512 字节切成一张张卡，对象引用被写入时（由写屏障触发）把对应卡标记为 dirty；Minor GC 只扫描 dirty 卡里的对象。这让 Minor GC 的成本从「与整堆成正比」降到「与新生代 + 少量老年代成正比」。',
                followup:
                  '「分代假设什么时候失效」——三类场景：① **大缓存**：对象全都长期存活，新生代里几乎不产生垃圾，复制算法每轮都要搬大量对象；② **超大对象流**：`new byte[10MB]` 这类直接进老年代，Minor GC 帮不上忙，老年代很快满；③ **短命大对象**：既大又短命，复制成本与晋升成本双高。这也解释了为什么 G1 之后「分代」开始变模糊——ZGC 干脆不分代（JDK 21 又加回了分代 ZGC，因为实测分代能显著降低内存占用）。',
              },
              {
                kind: 'analogy',
                title: '分代像写字楼的工位周转',
                text:
                  '把堆想成一栋写字楼。**新生代是「临时工位区」**：每天来一批实习生（新对象），大部分人干一天就走（朝生夕死）。清场最快的办法不是逐个收拾桌子，而是**把还留着的人连同东西整体搬到隔壁空房间，然后把整间屋子清空**——这就是复制算法。**老年代是「正式员工区」**：这里的人很少走，空位也很少，逐间检查谁走了（标记清除）比整体搬迁（复制）便宜得多。而**跨代引用**就像「正式员工偶尔把钥匙交给实习生」——这种事很少，所以只需在公告板上记一笔（卡表），不用每天去正式员工区挨个问。',
                mapping: [
                  { real: '临时工位区', tech: '新生代（Eden + 两块 Survivor）' },
                  { real: '每天来一批实习生，大多干一天就走', tech: '弱分代假说：绝大多数对象朝生夕死' },
                  { real: '整体搬到隔壁空房间，再清空整间', tech: '复制算法 + 半区交替' },
                  { real: '正式员工区，人很少走', tech: '老年代，存活率高' },
                  { real: '逐间检查谁走了', tech: '标记清除 / 标记整理' },
                  { real: '钥匙交接记在公告板上', tech: '卡表：记录老年代 → 新生代的引用' },
                  { real: '干得久的实习生转正', tech: '晋升：年龄达阈值或动态年龄判定' },
                  { real: '会议室不够用，正式员工区临时腾地方', tech: '空间分配担保：Survivor 装不下就进老年代' },
                ],
                limit:
                  '两处不成立：① 写字楼的房间大小固定，而 **Survivor 的空间是按比例划分的**，Eden 与 Survivor 的比例可通过 `-XX:SurvivorRatio` 调整；② 「转正」在楼里是人事决定，而在 JVM 里是**自动判定**——年龄到 `MaxTenuringThreshold`（默认 15，Parallel 下实际常为 15）、或同龄对象总和超过 Survivor 一半（动态年龄判定），就会批量晋升。另外 G1 之后「区」的边界变成动态的 Region，不再是固定的 Eden / Old 两大块，这个类比的物理分界就不准确了。',
              },
              {
                kind: 'question',
                title: '什么是 STW？什么是安全点？GC 的哪些阶段会 STW？',
                questionId: 'java-04-Q32',
                intent:
                  '这题串起「为什么要停」「怎么停得住」「哪些阶段必须停」三个层次。加分点在 TTSP——「GC 日志停顿不长但应用卡」的根因。',
                points: [
                  '**STW（Stop The World）**：GC 时暂停所有用户线程，保证「对象引用关系」这个快照是一致的。任何收集器都无法完全消除，只能缩短',
                  '**为什么必须停**：标记阶段若用户线程同时改引用，会出现「标记过了但已不可达」或「没标记但已可达」的不一致；移动对象时更严重——别的线程可能正拿着旧地址读',
                  '**安全点（Safepoint）**：线程不能停在任意指令处（可能正在计算引用、栈状态不确定），必须停在「引用关系确定」的位置——方法调用、循环跳转、异常跳转处',
                  '**主动式中断**：GC 触发时 JVM 设一个全局标志位，各线程在执行到安全点检查点时轮询该标志，发现为真就自己挂起。**不是抢占**，所以叫「主动」',
                  '**安全区域（Safe Region）**：线程处于 `sleep` / `wait` / 阻塞 IO 时到不了安全点，就用安全区域兜底——进入这段代码时标记自己「在安全区内」，GC 不必等它；离开时必须先检查 GC 是否完成',
                  '**各收集器的 STW 阶段**：Serial / Parallel 几乎全程 STW；CMS 只有**初始标记**和**重新标记** STW；G1 的 Young GC / Mixed GC 的**转移（Evacuation）**阶段 STW；ZGC / Shenandoah 只极短 STW（枚举根、处理部分元数据）',
                ],
                depth:
                  '「为什么不能停在任意指令」——因为 JVM 需要知道**这一刻栈和寄存器里哪些位置是引用**。这个信息由 **OopMap** 提供，而 OopMap 只在特定位置（安全点）才被生成和记录：一个方法可能有几百条字节码，若每条都记录 OopMap，元数据会膨胀到不可接受。所以折中为「只在方法调用、循环回边、异常跳转处记录」——这些位置恰好也是引用关系最确定的时刻。代价是：**长循环里可能长时间到不了安全点**，这就是 TTSP（Time To Safepoint）问题。',
                followup:
                  '「TTSP 长会有什么现象」——GC 日志里 `Pause Young` 只有 20ms，但应用 RT 抖动到 500ms。原因是有个线程正在跑一个「可数循环」（`for (int i = 0; i < 1e9; i++)`），JVM 认为这种循环内部不需要安全点（`-XX:+UseCountedLoopSafepoints` 可以强制插入），于是它一直跑到循环结束才停。修法：开 `-XX:+UseCountedLoopSafepoints`，或把大循环拆小、在循环体里调用一个方法（方法调用本身就是安全点）。这类问题在「GC 明明很快但服务就是卡」的排查中最容易被忽略。',
              },
              {
                kind: 'diagram',
                title: '一次 STW 的协商过程：谁下令、谁执行、谁兜底',
                body: [
                  'STW 不是「JVM 强行掐停线程」，而是一次「广播 + 自检 + 报到」的协商。理解这个过程，才能解释为什么停顿时间不完全由 GC 算法决定。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['VM Thread', '业务线程 T1', '业务线程 T2（阻塞中）', '安全点标志'],
                  messages: [
                    { from: 'VM Thread', to: '安全点标志', text: '置位：请求进入 safepoint' },
                    { from: '业务线程 T1', to: '安全点标志', text: '执行到检查点，轮询标志', reply: false },
                    { from: '安全点标志', to: '业务线程 T1', text: 'true → 主动挂起，登记 OopMap', reply: true },
                    { from: '业务线程 T2（阻塞中）', to: '安全点标志', text: '在 sleep 里到不了安全点，标记自己处于安全区域' },
                    { from: 'VM Thread', to: '业务线程 T2（阻塞中）', text: '跳过等待，视为已报到' },
                    { from: 'VM Thread', to: 'VM Thread', text: '全部线程到齐 → 开始标记 / 转移' },
                    { from: 'VM Thread', to: '业务线程 T1', text: '工作完成，清除标志，恢复运行' },
                  ],
                  caption:
                    '图里有两处值得记住：① **T1 是「自己停」而不是「被停」**——它在轮询点看到标志后主动挂起，这样 JVM 才能确定它停在了一个有 OopMap 的位置；② **T2 走的是安全区域旁路**——它在 `sleep` / `wait` 中，栈上引用不会变化，所以不需要它配合，GC 直接把它当作「已冻结」。这也是为什么「大量线程阻塞在 IO 上」不会拖长 STW，而「一个线程在跑大循环」会。',
                },
              },
              {
                kind: 'principle',
                title: 'STW 的本质：为了拿到一张一致的快照',
                body: [
                  '很多人把 STW 理解成「GC 太慢所以卡」，其实顺序反了：**是「需要一致性」才必须停**，停多久是另一个问题。理解了这一点，就能判断哪些停顿是必要的、哪些是可以优化的。',
                ],
                steps: [
                  {
                    title: '① 不一致从哪来',
                    detail:
                      '标记阶段若用户线程并发修改引用：GC 刚标记完 A 的字段 `a.b`，用户线程把 `a.b` 改成指向 C，而 C 还没被扫描——C 就被漏标了；反过来，用户线程把 `a.b` 置 null，GC 稍后扫描到 B 并标记它，就产生了「浮动垃圾」。前者是正确性问题（活对象被回收），后者只是浪费（死对象多活一轮）。',
                  },
                  {
                    title: '② 两种应对策略',
                    detail:
                      '**停住（STW）**：最简单，一次性拿到快照，代价是停顿。**并发 + 屏障**：不停，但用**写屏障**（写前/写后记录）或**读屏障**（读时修正）把「漏标」补回来。CMS 与 G1 的并发标记用写屏障（增量更新 / SATB），ZGC 用读屏障。这就是后面三色标记那一课的主线。',
                  },
                  {
                    title: '③ 必须停的环节',
                    detail:
                      '**枚举根节点**（要读所有线程的栈与寄存器，必须停）、**初始标记**（标记 GC Roots 直接可达的对象）、**重新标记 / 最终标记**（处理并发期间的变更，必须停）、**对象转移**（移动对象并修正引用）。这四个环节在任何收集器里都至少有一次 STW，区别只是长短。',
                  },
                  {
                    title: '④ 能并发的环节',
                    detail:
                      '**并发标记**（遍历对象图，最耗时，G1 / CMS / ZGC 都做并发）、**并发清理**（不移动对象的清除可以并发）、**并发转移**（ZGC 的读屏障让它能在应用运行时搬对象）。所以「低延迟收集器」的本质是**把最耗时的部分挪到并发阶段**，而不是消灭 STW。',
                  },
                ],
                takeaway:
                  '一句话总结：**STW 的长度 = 必须在停顿中完成的工作量**。想缩短它，只有三条路——把工作挪到并发阶段（G1 / ZGC）、把一次大停顿拆成多次小停顿（G1 的 Region 化、增量更新）、把工作本身变少（更少的根、更小的转移集）。知道了这个公式，就能判断「调 `-XX:MaxGCPauseMillis`」到底在调什么：它是在告诉 G1「每轮只准回收价值最高的若干个 Region」，而不是真的能改变 GC 的物理成本。',
              },
            ],
          },
        },
        {
          id: 'gc-collectors',
          title: '垃圾收集器演进',
          kind: 'concept',
          sources: [{ topic: 'java-04', chapters: ['收集器'] }],
          content: {
            intro:
              '收集器的演进本质上是在「停顿时间」「吞吐量」「堆容量」三个目标之间反复取舍。Serial 单线程、简单高效；ParNew 为配合 CMS 而生；Parallel 追求吞吐；CMS 用并发标记换取低停顿，却败在碎片与并发失败；G1 用 Region 化把停顿变成可预测的量；ZGC 靠着色指针与读屏障把停顿压到与堆大小无关。这条演进线是回答「你们线上用什么、为什么」的基础，也是理解三色标记、记忆集、写屏障这些机制的现场。本节按代际顺序走一遍，最后给出选型方法。',
            outline: [
              'Serial / ParNew / Parallel / CMS / G1 / ZGC 六代方案的核心差异与搭配关系',
              '三色标记是并发标记的理论基础，漏标靠增量更新或 SATB 破坏其成立条件',
              'G1 把堆拆成 Region，按回收价值排序，用停顿预测模型兑现 MaxGCPauseMillis',
              'ZGC 用着色指针 + 读屏障实现并发转移，停顿与堆大小基本无关',
            ],
            pitfalls: [
              '把 G1 说成「分区之后就不会有 Full GC」，实际仍可能因转移失败退化',
              '混淆 GC 的写屏障（引用赋值时插桩）与 JMM 的内存屏障（禁止重排）',
              '记错搭配关系，例如以为 CMS 可以与 Parallel Scavenge 组合（只能配 Serial / ParNew）',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：一条「减少停顿」的演进线',
                body: [
                  '看待收集器，不要背名字，而是看它在解哪个约束。**吞吐量优先**的收集器允许长停顿，换取更少的总 GC 时间；**低延迟优先**的收集器宁可多花 CPU，也要把单次停顿压短。所有设计（分区、并发、屏障）都是为这两个目标服务的。',
                  '演进可以概括为三次跃迁：**第一次**是把「单线程」变成「多线程并行」（Serial → Parallel），只缩短了停顿的常数项；**第二次**是把「全堆一次性回收」变成「分片增量回收」（CMS → G1），把一次长停顿拆成多次短停顿；**第三次**是把「移动对象必须停」变成「移动对象也能并发」（ZGC / Shenandoah），用屏障把停顿从「与堆大小相关」变成「与根集合大小相关」。',
                  '本课按这三次跃迁顺序讲：先看六种收集器的全貌与搭配，再深入 CMS（并发标记的起点）、三色标记（理论内核）、G1（工程折中）、ZGC（并发转移），最后落到选型方法。',
                ],
                points: [
                  '**并行（Parallel）**：多条 GC 线程同时工作，但用户线程仍然停着。缩短的是「GC 干活的时间」',
                  '**并发（Concurrent）**：GC 线程与用户线程同时运行。缩短的是「用户线程停着的时间」，代价是要处理并发带来的一致性',
                  '**分区 / 分片**：把一次大回收拆成多次小回收，把长停顿摊平。这是 G1 的核心思想',
                  '**屏障**：并发的前提。写屏障记录「哪些引用变了」，读屏障负责「读到的引用是否还有效」',
                ],
              },
              {
                kind: 'question',
                title: '常见的垃圾收集器有哪些？它们如何搭配工作？',
                questionId: 'java-04-Q33',
                intent:
                  '这题考的是「配对关系」而不是清单。必须说清：新生代和老年代各自有哪些，哪些能组合，CMS 为什么只能配 Serial / ParNew。',
                points: [
                  '**新生代**：Serial（单线程复制）、ParNew（多线程复制）、Parallel Scavenge（多线程复制，吞吐优先）、G1（Region 化，新生代是老年代同一套机制的一部分）',
                  '**老年代**：Serial Old（单线程标记整理）、Parallel Old（多线程标记整理）、CMS（并发标记清除）、G1、ZGC',
                  '**JDK 8 的经典组合**：Serial + Serial Old（客户端/小堆）、ParNew + CMS（低停顿）、Parallel Scavenge + Parallel Old（吞吐优先，JDK 8 服务端默认）',
                  '**为什么 CMS 不能配 Parallel Scavenge**：两者都直接继承自 `Serial` 与 `Parallel` 的旧实现体系，Parallel Scavenge 的框架（`ParallelScavengeHeap`）不提供 CMS 所需的分代对象访问接口，于是 HotSpot 专门做了 ParNew 这个「能对接 CMS 的新生代」',
                  '**JDK 9 之后**：G1 成为默认，一路通吃新生代与老年代；CMS 在 JDK 9 被标记废弃，JDK 14 移除',
                  '**JDK 15+**：ZGC 转正（JDK 21 有分代版）、Shenandoah 在 OpenJDK 中可用。两者都是「不分代（或分代）、全堆并发」的现代方案',
                ],
                depth:
                  '一个容易忽略的历史细节：**Parallel Scavenge 与 CMS 的不兼容是工程事故而非理论限制**。Parallel Scavenge 为了实现「自适应大小策略」（`UseAdaptiveSizePolicy`），在堆布局上做了很多自己的假设，它的 `Space` 实现与 CMS 期望的接口对不上。当年为了赶在 JDK 5 支持 CMS，Sun 直接把 Serial 多线程化做出 ParNew，而不是改造 Parallel Scavenge。所以面试里说「CMS 只能配 Serial 或 ParNew」是准确的，但原因是实现耦合，不是算法冲突。',
                followup:
                  '「G1 需要搭配别的收集器吗」——不需要。G1 是「全堆收集器」，同时管理新生代与老年代，`-XX:+UseG1GC` 一开就接管整个堆。这也是它相对于「新生代 + 老年代两两配对」模式的结构性优势：**再也不用担心搭配错误**，也不用为跨代引用维护两套机制（G1 用统一的 RSet）。',
              },
              {
                kind: 'diagram',
                title: '六代收集器全景：代际、并发方式、算法与现状',
                body: [
                  '把收集器按「管哪一代」和「是否并发」两个轴摆开，就能看清演进路径：新生代一路从单线程走到并行，老年代则在「标记清除的并发」和「标记整理的并行」之间反复试探，直到 G1 把两者统一。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['收集器', '代际', '并行 / 并发', '算法', '目标', '现状'],
                  cols: ['代际', '并行 / 并发', '算法', '目标', '现状'],
                  rows: [
                    ['Serial', '新生代', '单线程，全程 STW', '复制', '简单高效', 'Client / 小堆'],
                    ['ParNew', '新生代', '多线程并行，STW', '复制', '配合 CMS', '随 CMS 移除'],
                    ['Parallel Scavenge', '新生代', '多线程并行，STW', '复制', '**吞吐量**', 'JDK 8 默认'],
                    ['Serial Old', '老年代', '单线程，全程 STW', '标记-整理', '简单 / 后备', 'CMS 失败兜底'],
                    ['Parallel Old', '老年代', '多线程并行，STW', '标记-整理', '**吞吐量**', 'JDK 8 常用'],
                    ['CMS', '老年代', '并发标记清除', '标记-清除', '**低停顿**', 'JDK 14 移除'],
                    ['G1', '全堆分区', '并行 + 并发', '整体整理 / 区间复制', '可预测停顿', '**JDK 9+ 默认**'],
                    ['ZGC', '全堆（可分代）', '几乎全并发', '并发复制（着色指针）', '亚毫秒停顿', 'JDK 15 转正'],
                    ['Shenandoah', '全堆', '几乎全并发', '并发复制（转发指针）', '低停顿', 'OpenJDK 12+'],
                  ],
                  caption:
                    '读表的两条线索：① **纵向看算法**——新生代清一色「复制」，老年代从「标记-整理」走向「标记-清除」再回到「整理」，最后在 G1 / ZGC 里变成「区间复制的整理」；② **横向看并发度**——CMS 是第一个把「标记」并发化的收集器，G1 把「回收」也部分并发化，ZGC 把「转移」并发化。**每一次并发化，都要用一个屏障机制来兜底**：CMS 用写屏障（增量更新），G1 用写屏障（SATB）+ RSet，ZGC 用读屏障。',
                },
              },
              {
                kind: 'question',
                title: 'Serial、ParNew、Parallel Scavenge 三者的区别是什么？',
                questionId: 'java-04-Q34',
                intent:
                  '三个都是新生代收集器，都用复制算法。差别只在「线程数」和「优化目标」，要能落到参数上。',
                points: [
                  '**Serial**：单线程，GC 时 STW。优势是**没有线程交互开销**，在单核或小堆（几十 MB）下反而比多线程快，且内存占用最小',
                  '**ParNew**：Serial 的多线程版，除了多线程没有任何额外设计。存在意义就是「**能和 CMS 搭配**」，是 CMS 唯一支持的新生代伙伴',
                  '**Parallel Scavenge**：也是多线程并行复制，但目标是**吞吐量 = 用户代码时间 / (用户代码时间 + GC 时间)**。它不追求单次停顿最短，而追求总 GC 时间占比最低',
                  '**Parallel 的两个目标参数**：`-XX:MaxGCPauseMillis`（最大停顿，调小会让新生代变小、GC 更频繁）、`-XX:GCTimeRatio`（吞吐比，默认 99，即 GC 时间不超过 1%）',
                  '**自适应调节**：`-XX:+UseAdaptiveSizePolicy`（默认开）会根据上面两个目标动态调整 Eden / Survivor 比例与晋升年龄，这是 Parallel 独有的能力',
                  '**选型口诀**：Serial 重简单（客户端 / 容器小堆），ParNew 重配合（配 CMS 降停顿），Parallel 重吞吐（后台批处理、离线计算）',
                ],
                depth:
                  '`MaxGCPauseMillis` 有一个反直觉的副作用：**把它调小，吞吐量往往下降**。因为 GC 想让每次停顿更短，就会把新生代调小（一次要复制的东西少），于是 Minor GC 变频繁，总 GC 时间上升；而对象在更小的 Eden 里更容易被「挤」到老年代，进一步加重老年代压力。这正是 Parallel 提供两个参数的原因——它是多目标优化，用户必须指定「更在乎哪个」。G1 的 `MaxGCPauseMillis` 也是同一个道理，只不过 G1 用「少回收几个 Region」而不是「缩小新生代」来兑现，代价是垃圾回收不及时。',
                followup:
                  '「Parallel Scavenge 能配 CMS 吗」——不能，前面讲过是框架不兼容。反过来 CMS 也不能配 Parallel Old。所以 JDK 8 里真正的低延迟组合只有 `ParNew + CMS`，而吞吐组合是 `Parallel Scavenge + Parallel Old`，两套框架互不相通。这也是 G1 出现的重要动机：**让用户不再需要理解这些搭配约束**。',
              },
              {
                kind: 'question',
                title: 'CMS 收集器的工作原理（四个阶段）？有哪些缺点？',
                questionId: 'java-04-Q35',
                intent:
                  '四阶段必须能画出「哪两段 STW、哪两段并发」。缺点要能落到三个具体故障：CPU 敏感、浮动垃圾、碎片。',
                points: [
                  '**① 初始标记（STW）**：只标记 GC Roots **直接关联**的对象，速度极快。注意它停顿时长只与根数量有关，与堆大小无关',
                  '**② 并发标记（不停）**：从初始标记的对象出发遍历整个引用链，最耗时，但与用户线程并发。期间引用会变，所以需要写屏障记录变化',
                  '**③ 重新标记（STW）**：修正并发标记期间的引用变动（CMS 用**增量更新**），停顿比初始标记长，但远短于并发标记',
                  '**④ 并发清除（不停）**：与用户线程并发清理垃圾。因为不移动对象，所以可以与用户线程同时跑',
                  '**缺点一：对 CPU 敏感**。默认回收线程数 = `(CPU 核数 + 3) / 4`，2 核机器上只有 1 条 GC 线程，并发阶段要吃满 50% 算力',
                  '**缺点二：浮动垃圾**。并发清除期间用户线程新产生的垃圾本轮收不掉；更要紧的是并发期间还要留空间给用户线程分配，不能等老年代满了才动手（`-XX:CMSInitiatingOccupancyFraction`，默认约 92%）',
                  '**缺点三：Concurrent Mode Failure**。若预留空间不够，CMS 来不及并发回收，就只能退化成 **Serial Old 单线程 Full GC**，停顿可能长达数秒',
                  '**缺点四：内存碎片**。标记-清除不移动对象，长期运行后大对象找不到连续空间，提前触发 Full GC。`-XX:+UseCMSCompactAtFullCollection`（默认开）在 Full GC 时整理，但停顿更长',
                ],
                depth:
                  '为什么 CMS 用「增量更新」而不是 SATB？因为它要解决的是「**黑对象新增了指向白对象的引用**」这个漏标条件。增量更新在写屏障里记录「被写入引用的黑对象」，重新标记时把这些黑对象当作根再扫一遍它们的出边——成本与「并发期间发生的引用写入次数」相关。CMS 选择它，是因为 CMS 不移动对象、且重新标记阶段可以承受一次较长的 STW。反过来 G1 选择 SATB（记录被**删除**的旧引用，按标记开始时的快照处理），因为 SATB 的重新标记成本与「被删除的引用数」相关，通常更小，且天然适合「标记完成后还要转移对象」的场景。**两种方案的选择，取决于「写入多还是删除多」以及「重新标记能停多久」**。',
                followup:
                  '「CMS 为什么被移除」——三个原因叠加：① 碎片问题无法根治，只能靠 Full GC 整理，而 Full GC 又很长；② 并发失败会退化成单线程 Full GC，最坏情况比 G1 差得多；③ 代码维护成本高（它与 `ConcurrentMarkSweepGeneration` 深度耦合，阻碍了新特性如统一 GC 接口、Region 化的推进）。JDK 9 标记废弃、JDK 14 正式移除（JEP 363）。今天还说「用 CMS」的场景，基本都是 JDK 8 的老系统。',
              },
              {
                kind: 'diagram',
                title: 'CMS 四阶段与用户线程的交错',
                body: [
                  'CMS 的价值全在「把最耗时的遍历放到并发阶段」。这张图把四条时间线与用户线程对齐，能直观看出两次 STW 有多短、并发阶段有多长。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['用户线程', 'CMS 线程', '写屏障', 'STW'],
                  messages: [
                    { from: 'STW', to: '用户线程', text: '① 初始标记：只扫 GC Roots 直接引用，极短' },
                    { from: 'CMS 线程', to: '写屏障', text: '② 并发标记开始：遍历引用链（最耗时）' },
                    { from: '用户线程', to: '写屏障', text: '并发期间改引用 → 屏障记录「黑对象被写入」', reply: false },
                    { from: 'STW', to: '用户线程', text: '③ 重新标记：以被记录的黑对象为根重扫，修正漏标' },
                    { from: 'CMS 线程', to: '用户线程', text: '④ 并发清除：直接清除垃圾对象，不移动（所以能并发）' },
                    { from: '用户线程', to: 'CMS 线程', text: '若此时老年代被填满 → Concurrent Mode Failure', reply: true },
                    { from: 'CMS 线程', to: 'STW', text: '退化为 Serial Old 单线程 Full GC（最坏情况）' },
                  ],
                  caption:
                    '注意第 ④ 步之后的那条分支：**并发清除期间用户线程仍在分配内存**，如果分配速度超过回收速度，老年代会被填满，CMS 只能停下并发、退化成单线程 Full GC。这就是「CMS 最怕大对象 + 高分配率」的原因。工程上的缓解手段是调低 `CMSInitiatingOccupancyFraction`（更早启动），代价是更频繁的 GC 与更多浮动垃圾。',
                },
              },
              {
                kind: 'question',
                title: '三色标记是什么？并发标记为什么会漏标 / 多标？如何解决？',
                questionId: 'java-04-Q36',
                intent:
                  '本课理论核心。必须说清「漏标的两个条件同时成立」以及「三种解法各自破坏哪个条件」。这是区分「背过」和「懂了」的分水岭。',
                points: [
                  '**三色抽象**：白色 = 未访问（可能是垃圾）；灰色 = 自己已标记、但成员引用还没扫完；黑色 = 自己和所有成员都扫完了',
                  '**标记过程**：初始时 GC Roots 直接引用置灰，然后不断从灰色队列取一个对象，把它引用的白色对象置灰，自己转黑，直到灰色队列空',
                  '**多标（浮动垃圾）**：标记过程中某对象的引用被删除，但它已被标黑，本轮收不掉。**可容忍**，下次再收',
                  '**漏标（致命）**：必须**同时**满足两个条件——① 一个**黑色**对象新增了指向**白色**对象的引用；② 该白色对象的所有「从灰色对象出发的入边」都被删除了',
                  '**解法一：增量更新（Incremental Update）**——破坏条件 ①。写屏障在「黑对象写入新引用」时记录下来，重新标记阶段以这些黑对象为根重扫。**CMS 采用**',
                  '**解法二：原始快照（SATB, Snapshot At The Beginning）**——破坏条件 ②。写屏障在「引用被删除」时把**旧值**记录下来，按标记开始那一刻的快照处理。**G1、Shenandoah 采用**',
                  '**解法三：读屏障 + 着色指针**——整体换思路，读引用时检查指针颜色，发现失效就地自愈。**ZGC 采用**',
                  '**必须区分**：GC 的「写屏障」是引用赋值前后插入的一段处理逻辑，与 JMM 的「内存屏障」（禁止指令重排）是两个完全不同的概念',
                ],
                depth:
                  '为什么漏标的两个条件必须同时成立？条件 ① 让白色对象「多了一条来自黑色区域的入边」，条件 ② 让它「失去了所有来自灰色区域的入边」。若只有 ①，白色对象仍能从灰色对象到达，后续遍历会把它标黑；若只有 ②，它本来就是不可达的，漏标也无所谓。两个同时成立，才出现「它实际可达，但遍历永远不会再访问到它」的局面——因为黑色对象**不会被重新扫描**（这正是三色标记的效率来源）。所以所有解法的本质都是：**要么让黑对象被重扫（增量更新），要么让那条被删的边看起来还在（SATB）**。理解了这句，就不用背表了。',
                followup:
                  '「为什么 CMS 用增量更新而 G1 用 SATB」——三点权衡：① **成本量级**：增量更新的重扫成本 ∝ 并发期间的引用写入次数，SATB 的重新标记成本 ∝ 被删除的引用数，后者通常更小；② **对象移动**：SATB 保证「标记开始时活着的对象本轮都当作活的」，这与 G1 后续要「转移 Region」天然契合；③ **停顿预算**：G1 的重新标记要做「最终标记 + 引用处理」，用 SATB 可以把它做得更短更可控。CMS 不做对象移动、且愿意在重新标记上多停一点，所以选了增量更新。',
              },
              {
                kind: 'diagram',
                title: '三色状态机：一个对象在标记过程中的三种身份',
                body: [
                  '三色不是三个「阶段」，而是一个对象在标记过程中的三种状态。所有并发标记的问题，都能还原成「某个对象被错误地留在了白色」。',
                ],
                diagram: {
                  type: 'state',
                  states: [
                    { label: '白色', note: '未访问，本轮可能被回收', tone: 'warn' },
                    { label: '灰色', note: '已入队，成员待扫描', tone: 'primary' },
                    { label: '黑色', note: '自己与成员都扫完，不再重扫', tone: 'good' },
                  ],
                  transitions: [
                    '白色 → 灰色：被灰色对象引用，或本身是 GC Root 直连',
                    '灰色 → 黑色：成员全部扫描完；黑色是终态、永不回退',
                  ],
                  caption:
                    '关键在第二条的「永不回退」：**黑色是终态**。标记算法靠「黑对象不再扫描」把复杂度压到 O(对象数 + 引用数)，但也因此对「黑色对象的出边在标记之后发生变化」完全无感。漏标的本质就是「一个本应被扫描的白对象，因为入边被删、且新增的入边来自黑对象，从此无人问津」。所以三种解法都在处理「黑对象出边变化」这件事，只是介入时机不同。',
                },
              },
              {
                kind: 'diagram',
                title: '三种解法：分别破坏漏标的哪个条件',
                body: [
                  '把「漏标 = 条件 ① 且 条件 ②」写成一个与门，就很容易记住每种解法在干什么——它们各自砍掉一条边，让与门不成立。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '漏标 = ① 黑指向白 且 ② 灰到白的入边被删', note: '两个条件同时成立才致命' },
                    { label: '增量更新：写屏障记录「黑→白」的写入', note: '破坏 ①，重新标记时以黑对象为根重扫（CMS）' },
                    { label: 'SATB：写屏障记录「被删除的旧引用」', note: '破坏 ②，按标记开始时的快照处理（G1 / Shenandoah）' },
                    { label: '读屏障 + 着色指针：读取时自愈', note: '不问条件，直接保证「读到的引用永远有效」（ZGC）' },
                  ],
                  caption:
                    '注意第三条与前两条不在一个层面：CMS 与 G1 是「**事后修补**」（并发标记可能出错，重新标记阶段补回来），ZGC 是「**事中保证**」（每次读引用都检查，出错立刻修）。这也是 ZGC 停顿能更短的原因——它不需要一个「较长的重新标记 STW」来收尾，代价是每次读取引用都要多走一小段代码，吞吐量略降。',
                },
              },
              {
                kind: 'question',
                title: 'G1 收集器的原理？Region、Humongous、停顿预测模型是什么？',
                questionId: 'java-04-Q37',
                intent:
                  'G1 是当前默认收集器，必须讲清「分代变成角色」「回收按价值排序」「停顿靠预测模型兑现」三件事。',
                points: [
                  '**Region 分区**：把堆划成大小相等的 Region（1~32MB，`-XX:G1HeapRegionSize`，通常是 2 的幂，约 2048 个）。每个 Region **动态**扮演 Eden / Survivor / Old / Humongous，分代成了「角色」而不是「物理连续空间」',
                  '**Humongous Region**：对象大小超过 Region 的一半（`G1HeapRegionSize / 2`）就算巨型对象，直接分配在**连续的若干个 Humongous Region**，逻辑上属于老年代。超过 Region 大小本身则跨多个连续 Region',
                  '**停顿预测模型**：用户设 `-XX:MaxGCPauseMillis`（默认 200ms）。G1 收集每个 Region 的「回收收益 / 耗时」统计，每次 GC 在预算内**优先回收价值最高的 Region**——「Garbage First」这个名字就来自这里',
                  '**算法**：整体看是**标记-整理**（Region 之间不产生碎片），局部看是**两个 Region 之间的复制**（存活对象复制到空 Region）。所以 G1 基本没有碎片问题',
                  '**RSet（Remembered Set）**：每个 Region 一份，记录「**其他 Region 指向本 Region**」的引用。回收某个 Region 时，把 RSet 当作额外的根，避免全堆扫描',
                  '**与 CMS 的关键差别**：CMS 是「物理分代 + 全堆标记清除」，G1 是「逻辑分代 + 分区增量回收」，因此 G1 能把一次长停顿拆成多次短停顿',
                ],
                depth:
                  'RSet 的成本是 G1 最容易被忽视的代价。每个 Region 的 RSet 用「**卡表 + 稀疏/细粒度位图**」三级结构实现：跨 Region 引用少时用稀疏表（点图），多了转细粒度位图（每 128 字节一个字），再多转粗粒度位图。总体 RSet 内存开销约占总堆的 **1%~20%**（跨 Region 引用多时接近上限）。这也解释了两个现象：① G1 的「额外内存」比 Parallel 高，小堆（< 4GB）下优势不明显；② 写屏障要为**每次引用写入**更新 RSet，写密集的应用在 G1 下吞吐会掉——这就是「G1 的写屏障成本 = 更新 RSet + SATB 队列」的含义。',
                followup:
                  '「Humongous 对象为什么容易出问题」——因为它要求**连续** Region。若堆碎片化（空闲 Region 不连续），即使总空闲空间够，也可能分配失败，触发**并发周期**甚至 Full GC。而且 Humongous 对象默认直接进老年代，短命的大数组（如一次性的 `byte[]` 缓冲）会污染老年代。调优方向：`-XX:G1HeapRegionSize` 调大（让大对象不超过一半，避免成为 Humongous）、或用对象池复用大缓冲区。线上看到 GC 日志里频繁 `Humongous` 相关回收，基本就是这个问题。',
              },
              {
                kind: 'diagram',
                title: 'G1 的堆布局：Region 是容器，分代是角色',
                body: [
                  '同样是「新生代 + 老年代」，G1 与前面所有收集器的根本差别在于：这些区域在物理上不再连续。一张图能看清 Region 如何轮流扮演角色。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'Eden Region',
                      note: '新对象分配在此，可多个',
                      slots: [
                        { label: 'R03', value: 'Eden', tone: 'primary' },
                        { label: 'R07', value: 'Eden', tone: 'primary' },
                        { label: 'R11', value: 'Eden', tone: 'primary' },
                      ],
                    },
                    {
                      name: 'Survivor / Old',
                      note: '角色可随 GC 变化',
                      slots: [
                        { label: 'R05', value: 'S', tone: 'good' },
                        { label: 'R09', value: 'Old', tone: 'muted' },
                        { label: 'R12', value: 'Old', tone: 'muted' },
                        { label: 'R14', value: 'Empty', tone: 'good' },
                      ],
                    },
                    {
                      name: 'Humongous 连续区',
                      note: '大对象占连续 Region',
                      slots: [
                        { label: 'R20–R23', value: 'H（跨 4 块）', tone: 'warn' },
                        { label: 'R30', value: 'H（1 块）', tone: 'warn' },
                      ],
                    },
                  ],
                  caption:
                    '三件事在这张图里能看出来：① **Eden 是散落的**（R03、R07、R11），不是一段连续空间，所以「Minor GC」在 G1 里改叫 **Young GC**，回收的是「所有 Eden Region + 当前 Survivor」；② **角色会变**——今天 R14 是空的，下次可能变成 Eden；③ **Humongous 必须连续**，所以它最容易受碎片影响。RSet 就是为「R09 里的对象引用了 R03 里的对象」这类跨 Region 引用服务的。',
                },
              },
              {
                kind: 'question',
                title: 'G1 的 Young GC、并发标记周期、Mixed GC 是什么关系？',
                questionId: 'java-04-Q38',
                intent:
                  '三者不是三种模式，而是一个循环：Young GC 常态跑 → 老年代占用到阈值触发并发标记 → 之后若干次 Mixed GC 顺带清老年代。',
                points: [
                  '**Young GC**：Eden Region 用满时触发，STW，把 Eden + Survivor 的存活对象复制到新的 Survivor 或 Old Region。频率随分配速率变化，是 G1 的常态',
                  '**并发标记周期**：当**老年代占用达到 IHOP**（`-XX:InitiatingHeapOccupancyPercent`，默认 45%）时，G1 **借一次 Young GC 的停顿**发起全局并发标记：初始标记（搭车 STW）→ 并发标记 → 最终标记（STW）→ 清理（统计各 Region 存活率）',
                  '**Mixed GC**：并发标记完成后，G1 在后续若干次 Young GC 中**捎带回收老年代 Region**——只选「垃圾占比超过 `-XX:G1HeapWastePercent`（默认 5%）」的 Region，且受停顿预算约束。所以 Mixed GC 回收的是「年轻代 + 部分老年代」',
                  '**递进关系**：Young GC（一直跑）→ 触发并发标记（老年代到 45%）→ 得到「哪些老年代 Region 值得收」→ Mixed GC 逐批清（可跨多次）→ 老年代降下来，回到纯 Young GC',
                  '**Mixed GC 不是 Full GC**：它是增量的、按 Region 选的、STW 但可控的。真正的 Full GC 是「转移失败后的兜底」，会退化成单线程（JDK 10 前）或并行整体整理',
                  '**退化路径**：若 Mixed GC 回收速度赶不上分配速度（Evacuation Failure，to-space 耗尽），触发 Full GC。这是 G1 调优里最需要避免的路径',
                ],
                depth:
                  'IHOP 的默认 45% 有个历史包袱：它是「**静态阈值**」，而现代应用的分配速率差异很大。JDK 10 引入了 **自适应 IHOP**（`-XX:-G1UseAdaptiveIHOP` 可关），G1 会根据「最近几次并发标记的实际耗时与老年代增长速度」预测何时该启动，而不是死守 45%。这也解释了为什么有些应用在 G1 下频繁 Full GC——它的分配速率太快，45% 时启动已经来不及，需要显式调低 `IHOP` 或调大堆。JDK 9 之后的自适应 IHOP 让这个问题大幅缓解，但「老年代增长突然加速」（如缓存预热、批量导入）仍会打穿预测。',
                followup:
                  '「Mixed GC 一次能清完老年代吗」——设计上一次 Mixed GC 会尝试清掉所有「垃圾占比超阈值」的 Region，但受 `MaxGCPauseMillis` 约束，只能清「预算内」的那部分，剩余的留到下一次。所以日志里能看到连续多次 `Pause Mixed`，每次清一批，直到候选集耗尽。若候选集一直清不完（回收速度跟不上），就会出现「连续 Mixed GC」，最终可能演化为 Full GC。',
              },
              {
                kind: 'diagram',
                title: 'G1 的回收循环：从 Young GC 到 Mixed GC 再回来',
                body: [
                  '把三个环节画成一个闭环，就能理解「为什么 G1 的停顿是可控的」——它不是每次都处理全堆，而是按预算分片处理，每一片都能独立估算成本。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: 'Young GC（常态）', note: 'Eden 满即触发，STW，复制存活对象' },
                    { label: '老年代占用 ≥ IHOP（默认 45%）', note: '借一次 Young GC 的停顿发起全局标记' },
                    { label: '并发标记周期', note: '初始标记(STW) → 并发标记 → 最终标记(STW) → 清理统计' },
                    { label: 'Mixed GC（若干次）', note: '年轻代 + 垃圾占比 > 5% 的老年代 Region，按预算分批清' },
                    { label: '回到纯 Young GC', note: '老年代降下来；若转移失败则退化为 Full GC（要避免）' },
                  ],
                  caption:
                    '这个循环里只有两处 STW 是「全局」的（初始标记与最终标记），其余停顿都是「按 Region 预算切分」的。这就是 G1 能把 `MaxGCPauseMillis` 当承诺的原因：**它从来不需要一次性处理整个堆**。反过来说，若堆太大、Region 太多、或者候选集一直清不完，这个承诺就会失效——这也是超大堆（几十 GB 以上）要转向 ZGC 的原因。',
                },
              },
              {
                kind: 'question',
                title: 'CMS 和 G1 有什么区别？什么场景选哪个？',
                questionId: 'java-04-Q39',
                intent:
                  '不要罗列，要抓「回收范围」「内存布局」「失败模式」三条主线。最后给出明确的选型结论。',
                points: [
                  '**回收范围**：CMS 只管老年代，必须搭配新生代收集器；G1 独立管理整个堆，一套机制通吃',
                  '**内存布局**：CMS 是传统连续分代（Eden / Survivor / Old 各是一段连续空间）；G1 是 Region 化，分代退化为角色',
                  '**算法**：CMS 用标记-清除（**有碎片**）；G1 整体标记-整理 + Region 间复制（**基本无碎片**）',
                  '**停顿控制**：CMS 追求「尽量短」但**不可预测**；G1 有停顿预测模型，可以把 `MaxGCPauseMillis` 当作目标来兑现',
                  '**失败模式**：CMS 的 `Concurrent Mode Failure` 退化成 **Serial Old 单线程 Full GC**（可能几秒）；G1 的 `Evacuation Failure` 退化成 Full GC（JDK 10 起并行，好一些）',
                  '**大对象**：CMS 因碎片导致大对象分配失败 → 提前 Full GC；G1 用 Humongous Region 专门管理（但碎片化时也会失败）',
                  '**现状与选型**：CMS 在 JDK 9 废弃、14 移除；**新项目直接用 G1**（JDK 9+ 默认）。堆 > 6GB 且对停顿有要求时 G1 优势明显；几十 GB 以上、延迟极敏感转 ZGC。CMS 只在维护 JDK 8 老系统时会遇到',
                ],
                depth:
                  '「G1 一定比 CMS 好吗」——不是。G1 在**小堆**（< 4GB）上往往不如 Parallel 或 CMS，因为 RSet 与写屏障的固定开销摊不掉，而且 Region 数量少时回收粒度太粗。G1 的真正优势区间是「**大堆 + 需要可预测停顿**」：堆越大，Region 越多，按价值挑选的收益越明显；而 CMS 的并发标记在超大堆上会因为「标记周期太长、期间用户线程改引用太多」而频繁并发失败。所以正确的说法是：**G1 在「大堆低延迟」这个象限里全面优于 CMS，在小堆高吞吐象限里未必**。',
                followup:
                  '「为什么 G1 还需要 Full GC」——因为它的所有回收都建立在「有足够的空 Region 做复制目标」这个前提上。若分配速率过高、或大量 Humongous 对象要求连续 Region，to-space 会被耗尽，复制无处可去，只能退化。所以 G1 调优的核心不是「消灭 Full GC」这种不现实的目标，而是**让复制永远有地方去**：堆留足余量、IHOP 调早、避免短命大对象。',
              },
              {
                kind: 'question',
                title: 'ZGC 的原理？着色指针和读屏障是怎么工作的？',
                questionId: 'java-04-Q40',
                intent:
                  '两个技术点必须讲透：着色指针「把状态存在指针里」，读屏障「读引用时顺手自愈」。这是「并发转移」能成立的全部原因。',
                points: [
                  '**目标**：停顿不超过 10ms（实测亚毫秒）且**不随堆大小增长**，支持 TB 级堆。JDK 11 实验性引入，JDK 15 转正（JEP 377）',
                  '**着色指针（Colored Pointer）**：64 位指针只用了 42 位寻址（4TB），高位空着。ZGC 把 GC 状态塞进 bit 42~45 四个标志位：`Marked0` / `Marked1` / `Remapped` / `Finalizable`',
                  '**为什么要两个 Marked 位**：标记不是一次性的，每次 GC 周期在这两个位之间切换，避免「上一轮标记」与「本轮标记」混淆——这样**不需要在周期开始时清空所有标记位**，省掉一次全堆扫描',
                  '**多重映射（Multi-Mapping）**：同一块物理内存映射到三个虚拟地址视图（Marked0 / Marked1 / Remapped），所以「改指针高位」不用改页表，成本极低。这是典型的空间换时间',
                  '**读屏障（Load Barrier）**：从堆里加载引用时插入一小段代码，检查指针颜色。若发现对象已被转移（指针还是旧视图），就**就地自愈**——把引用改成新地址再返回',
                  '**它让「并发转移」成立**：GC 线程搬走对象时，用户线程可能正拿着旧地址。读屏障保证「无论何时读，读到的地址都会被修正」，所以**移动对象不必停世界**',
                  '**代价**：每次读引用都要过屏障 → 吞吐量下降（约 5%~15%）；指针高位被占用 → 需要 64 位且不支持压缩指针',
                ],
                depth:
                  '着色指针最精妙的地方是「**状态跟着指针走，而不是跟着对象走**」。传统方案要把标记位存在对象头（Mark Word）或单独的位图里，读对象时必须先访问对象头——这就多了一次内存访问，而且「对象被搬走后对象头也变了」。ZGC 把状态编码在**引用本身**里：拿到一个引用，不用访问任何内存就知道「它是否已被标记、是否已被转移」。这带来一个反直觉的结论——**同一个对象可能同时存在两个「颜色不同」的引用**（一个旧的、一个自愈后的新的），它们指向同一块内存的不同虚拟视图映射。这正是它能「边搬边用」的原因。',
                followup:
                  '「读屏障为什么比写屏障便宜」——不是便宜，而是**触发频率的分布不同**。写屏障在每次引用赋值时触发，读屏障在每次从堆加载引用时触发。粗看读多写少，读屏障应该更贵；但关键在于：**ZGC 的读屏障只在「指针颜色不对」时才做实际工作**（快路径就是几条比较指令），而写屏障（如 G1 的 SATB）必须无条件入队。加上 ZGC 用「批量重映射」把大部分自愈工作延迟到后台，快路径极短。代价仍然存在：ZGC 的吞吐普遍低于 G1，这是「用 CPU 换停顿」的直接体现。',
              },
              {
                kind: 'diagram',
                title: '64 位指针的位布局：状态藏在高位里',
                body: [
                  '一张位图胜过大段文字。ZGC 的指针只用了低 42 位做地址，高 22 位里有 4 位被征用为 GC 状态——这就是「着色」的字面含义。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'bit 63 – 46',
                      note: '保留（18 位，未使用）',
                      slots: [
                        { label: '保留位', value: '暂未使用', tone: 'muted' },
                      ],
                    },
                    {
                      name: 'bit 45 – 42',
                      note: '四个颜色标志（核心）',
                      slots: [
                        { label: 'bit 45', value: 'Finalizable', tone: 'muted' },
                        { label: 'bit 44', value: 'Remapped', tone: 'primary' },
                        { label: 'bit 43', value: 'Marked1', tone: 'primary' },
                        { label: 'bit 42', value: 'Marked0', tone: 'primary' },
                      ],
                    },
                    {
                      name: 'bit 41 – 0',
                      note: '对象地址（4TB 寻址空间）',
                      slots: [
                        { label: 'address', value: '42 位 = 4TB', tone: 'good' },
                      ],
                    },
                  ],
                  caption:
                    '为什么只给地址 42 位？因为 64 位指针本来就浪费，硬件（x86-64）实际只用低 48 位。ZGC 借用其中 4 位，代价是**最大堆 4TB**（对绝大多数应用足够）。四个标志位里，`Marked0` / `Marked1` 交替表示「本轮标记过」，`Remapped` 表示「指针已指向最新地址」，`Finalizable` 用于 `finalize` / `Cleaner` 相关处理。读屏障要做的就是检查这三位，决定「直接用」还是「先自愈」。',
                },
              },
              {
                kind: 'question',
                title: 'JDK 21 的分代 ZGC 相比经典 ZGC 改了什么？',
                questionId: 'java-04-Q41',
                intent:
                  '这题考的是「为什么低延迟收集器也要分代」。答案不是「抄 G1」，而是「不分代会把 CPU 烧在重复扫描长寿对象上」。',
                points: [
                  '**经典 ZGC 的痛点**：不分代 → **每次 GC 都要标记整个堆**。堆里绝大多数是长命对象（缓存、连接池、类元数据），每次都重扫一遍，CPU 开销大，还会出现「标记风暴」（标记速度赶不上分配速度）',
                  '**分代 ZGC（JEP 439，JDK 21）**：拆成年轻代 + 老年代，两个并发收集器分别负责。大多数对象在年轻代就被回收，不再触发全堆标记',
                  '**代价一：要维护跨代引用**。于是必须有**写屏障 + 记忆集**——经典 ZGC「没有写屏障」的优势被牺牲掉了',
                  '**代价二：要引入读屏障之外的第二套机制**。分代 ZGC 同时使用读屏障（对象转移）与写屏障（跨代引用记录），机制更复杂',
                  '**收益**：官方数据显示，相同堆大小下 **CPU 开销显著下降、吞吐提升**，同时**保持亚毫秒停顿**；且**堆内存占用降低**（不用为「全堆标记」留那么多余量）',
                  '**开启方式**：JDK 21 需显式 `-XX:+UseZGC -XX:+ZGenerational`（JDK 23 起分代成为默认，非分代模式被废弃）',
                ],
                depth:
                  '分代 ZGC 的意义不只是「性能更好」，而是**打破了一个长期的架构取舍**。此前业界的共识是：要极低停顿就得放弃分代（因为分代需要记忆集与写屏障，这些都要在应用线程上执行，会拖慢吞吐）。ZGC 团队证明了「低延迟 + 分代」可以兼得，代价是更复杂的屏障协作——读屏障负责「对象转移的正确性」，写屏障负责「跨代引用的完整性」，两者并存但不重复。这也解释了一个现象：**JDK 21 之后，「ZGC 吞吐差」这个说法已经过时**，它只在非分代模式下成立。',
                followup:
                  '「那现在还该用 G1 吗」——该。分代 ZGC 的吞吐仍略低于 G1（屏障开销），且需要更多 CPU 核（并发线程）。选型逻辑是：**普通服务用 G1（默认、稳、调优资料多）；堆很大（> 32GB）或延迟要求苛刻（P99 < 10ms）用 ZGC**。另外 ZGC 不支持压缩指针（指针高位被征用），小堆下内存占用反而更高——所以「小堆上 ZGC 不比 G1 好」也是真的。',
              },
              {
                kind: 'question',
                title: 'Shenandoah 和 ZGC 有什么异同？',
                questionId: 'java-04-Q42',
                intent:
                  '加分题。核心差异就一个：**转发指针 vs 着色指针**。答出这个，再补「谁维护、有没有分代」即可。',
                points: [
                  '**相同点**：都是低停顿并发收集器，都能做到「停顿与堆大小基本无关」；都用**读屏障**实现并发转移；都在 OpenJDK 中提供',
                  '**核心差异：并发整理技术**。Shenandoah 用 **Brooks 转发指针**（每个对象多一个 8 字节字段，指向「自己或新地址」）；ZGC 用**着色指针**（状态存在指针高位，不占对象内存）',
                  '**内存开销**：转发指针让每个对象多 8 字节——小对象多的时候膨胀明显；着色指针不占对象额外空间，但占用指针高位（限 4TB 堆、不能压缩指针）',
                  '**访问路径**：Shenandoah 读对象要先读对象头里的转发指针（多一次间接）；ZGC 直接解引用，只在颜色不对时自愈',
                  '**生态**：ZGC 由 Oracle 维护，JDK 21 已有分代版；Shenandoah 由 Red Hat 主导，**不在 Oracle JDK 中提供**（只在 OpenJDK 及部分发行版），且**至今没有官方分代版**',
                  '**启用**：`-XX:+UseShenandoahGC`（需要发行版支持）；`-XX:+UseZGC`（JDK 15+ 全平台）',
                ],
                depth:
                  'Brooks 转发指针的原始设计更「重」：每次访问对象都要经过转发指针做一次间接跳转，即使没在 GC 也一样。Shenandoah 做了优化——用 **mark word 里的位**代替独立的转发字段（只在转移期间把对象头改造成转发指针），所以实际内存开销没有「每个对象 8 字节」那么夸张，但对象头布局更复杂、与偏向锁等特性冲突（这也是 Shenandoah 早期必须关闭偏向锁的原因之一）。**这类「对象头被征用」的代价，是所有低延迟收集器共同的难题**：状态总得存在某个地方，要么放指针里（ZGC），要么放对象头里（Shenandoah），要么放侧表里（增加一次查表）。',
                followup:
                  '「生产上怎么选」——看发行版：用 Oracle JDK 就只有 ZGC；用 OpenJDK / 阿里 Dragonwell / 腾讯 Kona 等，两者都可能有。技术上，**大堆 + 分代需求选 ZGC（JDK 21+）**；若发行版只提供 Shenandoah 且堆不算太大，Shenandoah 也够用。真正决定的因素往往是「运维团队熟悉哪个」——两者的调优参数与 GC 日志格式都不同，熟悉度比理论优势更影响线上稳定性。',
              },
              {
                kind: 'question',
                title: '如何为应用选择垃圾收集器？',
                questionId: 'java-04-Q43',
                intent:
                  '这题考的是工程判断，不是知识量。正确答法是「先定目标，再看约束，最后用数据验证」。',
                points: [
                  '**第一步：定目标**。吞吐优先（批处理、离线计算、大数据）→ Parallel 或 G1；延迟优先（在线交易、网关）→ G1 或 ZGC；两者都要 → G1 起步',
                  '**第二步：看堆大小**。< 4GB：Parallel / G1 都行，G1 的 RSet 开销摊不掉，Parallel 反而简单高效；4~8GB：G1 的甜点区；> 8GB 且要低延迟：G1 或 ZGC；几十 GB 以上：ZGC',
                  '**第三步：看 JDK 版本**。JDK 8：Parallel（默认）或 CMS（老系统）；JDK 9~14：G1 是默认，别乱换；JDK 15+：可上 ZGC；JDK 21+：分代 ZGC',
                  '**第四步：看数据，不看直觉**。先开 GC 日志（`-Xlog:gc*:file=gc.log:time,uptime,level,tags`），拿到分配速率、晋升速率、停顿分布，再决定要不要换',
                  '**第五步：一次只改一个变量**。换收集器、调堆大小、调 IHOP 分开做，每次压测对比，否则无法归因',
                  '**常见误判**：看到 Full GC 就换收集器。多数 Full GC 的根因是**内存泄漏或堆太小**，换收集器只是把问题推迟',
                ],
                depth:
                  '一个被反复验证的工程经验：**「GC 调优」的收益有 80% 来自「减少对象创建/晋升」而不是「换收集器或调参数」**。最常见的高收益动作是：① 找到晋升速率异常的类（用 `jmap -histo` 或 JFR 的 `ObjectAllocationSample`），看是不是短命大对象直接进了老年代；② 检查缓存是否有界（Caffeine 的 `maximumSize`、`expireAfter`）；③ 检查是否有 `ThreadLocal` 未 `remove`、静态集合无限增长。这些做完了，再谈 `MaxGCPauseMillis` 才有意义——否则就是在给漏水的桶换水龙头。',
                followup:
                  '「面试官问『你们线上用什么、为什么』怎么答」——给出「结论 + 约束 + 数据」三段式：**结论**：JDK 17 + G1，堆 8GB；**约束**：日均请求 X 万，P99 要求 < 200ms，堆里主要是会话与本地缓存（存活率高）；**数据**：Young GC 平均 15ms、每天 200 次，Mixed GC 平均 40ms、每天 3 次，无 Full GC。这样答完，对方基本不会再追问「为什么不用 ZGC」——因为你已经用数据证明了当前选择满足约束。',
              },
              {
                kind: 'principle',
                title: '把六代收集器压缩成一条演进逻辑',
                body: [
                  '收集器的名字与参数会忘，但演进逻辑不会。记住这条链，任何新收集器出现时你都能把它放到正确的位置上。',
                ],
                steps: [
                  {
                    title: '① 起点：并行化只缩短常数项',
                    detail:
                      'Serial → ParNew / Parallel，把「一条 GC 线程」变成多条，停顿时长按核数摊薄。但**停顿仍与堆大小成正比**——堆翻倍，标记与复制的工作量就翻倍。这条路的天花板很明显。',
                  },
                  {
                    title: '② 第一次突破：把标记并发化',
                    detail:
                      'CMS 把最耗时的「遍历引用链」挪到并发阶段，STW 只剩初始标记与重新标记两小段。代价是要处理并发一致性——于是有了**写屏障**与**三色标记的漏标问题**。这是整个 GC 理论的分水岭。',
                  },
                  {
                    title: '③ 第二次突破：把回收也分片',
                    detail:
                      'G1 把堆拆成 Region，每次只回收「性价比最高」的一批，用**停顿预测模型**把 `MaxGCPauseMillis` 变成可兑现的承诺。代价是 RSet 与写屏障成本，以及「转移失败后退化」的新失败模式。',
                  },
                  {
                    title: '④ 第三次突破：把转移也并发化',
                    detail:
                      'ZGC / Shenandoah 允许「对象在用户线程运行时被搬走」，靠**读屏障**保证引用永远有效。至此停顿只与「根集合大小」相关，与堆大小无关。代价是吞吐（屏障开销）与实现复杂度。',
                  },
                  {
                    title: '⑤ 收敛：低延迟也要分代',
                    detail:
                      '经典 ZGC 不分代，导致每次全堆标记，CPU 开销大。JDK 21 的分代 ZGC 把「分代」这门老技术请回来——证明**这不是回头路，而是补齐短板**。至此「低延迟」与「高吞吐」不再互斥。',
                  },
                ],
                takeaway:
                  '一句话：**每一代收集器都在解决上一代的「停顿瓶颈」，而每次解决都用一个新机制换取新代价**——并行化换线程开销，并发化换屏障与一致性难题，分区化换 RSet 内存，并发转移换吞吐。所以回答「选哪个收集器」时，正确的框架不是「哪个更先进」，而是「**我的瓶颈在哪，愿意付哪种代价**」。这也是为什么 JDK 8 上 Parallel 依然合理：如果瓶颈是吞吐而不是停顿，那屏障与 RSet 全是纯亏。',
              },
            ],
          },
        },
        {
          id: 'memory-allocation',
          title: '内存分配与回收策略',
          kind: 'concept',
          sources: [{ topic: 'java-04', chapters: ['内存分配与回收策略'] }],
          content: {
            intro:
              '对象优先在 Eden 分配、大对象直接进老年代、长期存活的对象晋升——这三条规则决定了绝大多数 GC 行为。再加上动态年龄判定与空间分配担保，就能解释「明明没多少存活对象却频繁 Full GC」这类线上疑问。这一节把规则与现象一一对应：先看分配的决策路径，再区分 Minor / Major / Full GC，然后追 Full GC 的六种触发原因，最后落到两个最容易被追问的机制——卡表（为什么 Young GC 不用扫全堆）与动态年龄判定（为什么会过早晋升）。',
            outline: [
              '分配路径：Eden → Survivor（年龄 +1）→ 达阈值或同龄超半 → 老年代',
              'Minor / Major / Full GC 的边界取决于收集器，「Major GC」并非规范术语',
              'Full GC 有六类触发原因，排查要先看日志里的触发原因字段而不是直接调堆',
              '卡表与 RSet 让 Minor GC 只扫脏卡，避免全堆扫描——这是分代能成立的前提',
            ],
            pitfalls: [
              '把「Major GC」当成标准术语，不同资料对它的定义并不一致',
              '看到 Full GC 就调堆大小，而多数 Full GC 的根因是泄漏或 Survivor 过小',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：从「分配」到「回收」的一条因果链',
                body: [
                  '很多人把「内存分配」和「垃圾回收」当成两件事，其实它们是同一条链的两端：**分配规则决定了对象在哪里、活多久；回收策略则是对分配结果的响应**。所以「为什么频繁 Full GC」这类问题，答案往往藏在分配侧——不是 GC 太慢，而是对象被过早塞进了老年代。',
                  '这条链有五个环节：**① 在哪分配**（Eden / TLAB / 大对象直进老年代）→ **② 什么时候被回收**（Eden 满触发 Minor GC）→ **③ 活下来去哪**（Survivor，年龄 +1）→ **④ 什么时候晋升**（阈值 / 动态年龄 / 担保）→ **⑤ 老年代满了怎么办**（Full GC）。本课按这个顺序讲，最后补上两个工程上最容易踩的细节：卡表与担保。',
                ],
                points: [
                  '**分配侧的四条规则**：优先 Eden、大对象直进老年代、长期存活晋升、动态年龄判定',
                  '**回收侧的三种名字**：Minor GC（新生代）、Major GC（老年代，术语不统一）、Full GC（整堆 + 方法区）',
                  '**两个兜底机制**：空间分配担保（Survivor 装不下）、卡表（避免全堆扫描）',
                  '**一条排查主线**：GC 日志的「触发原因」→ 对应哪条规则 → 再决定调什么，而不是先调堆',
                ],
              },
              {
                kind: 'question',
                title: '对象的内存分配规则是怎样的？',
                questionId: 'java-04-Q44',
                intent:
                  '四条规则必须能按顺序说清，并各配一个参数。答完规则后最好补一句「这些规则都基于分代假说」。',
                points: [
                  '**① 优先 Eden**：新对象在 Eden 分配（经 TLAB 或共享区），Eden 满触发 Minor GC。这是最常见路径',
                  '**② 大对象直接进老年代**：`-XX:PretenureSizeThreshold`（只对 Serial / ParNew 有效）指定阈值，超过则直接进老年代；G1 用 Humongous Region（超过 Region 一半）',
                  '**③ 长期存活晋升**：在 Survivor 中每熬过一次 Minor GC，年龄 +1；达到 `-XX:MaxTenuringThreshold`（默认 15，CMS 默认 6，G1 默认 15 但实际受动态年龄影响）就晋升老年代',
                  '**④ 动态年龄判定**：Survivor 中「年龄 ≤ n 的所有对象总大小」超过 Survivor 空间的一半，则年龄 ≥ n 的对象**直接晋升**，不必等到 15 岁',
                  '**⑤ 空间分配担保**：Minor GC 前检查老年代最大连续可用空间是否够接收新生代所有对象（或历次晋升平均值），不够则先 Full GC',
                  '**⑥ TLAB**：每个线程在 Eden 里有一块私有分配缓冲，小对象在 TLAB 内指针碰撞分配，无锁；TLAB 用完才走 Eden 的慢路径',
                ],
                depth:
                  '这五条规则不是并列的，而是**一条带优先级的判定链**：先看大小（大对象走 ②），再看 TLAB 有没有空间（有则 ⑥），Eden 满了触发 GC（①），GC 后看存活对象的年龄（③④），最后看 Survivor 装不装得下（⑤）。理解这个顺序，才能解释一些「奇怪」的现象——比如为什么一个 2MB 的数组明明是在方法里临时用的，却直接进了老年代（② 优先于 ⑥），为什么 `-XX:PretenureSizeThreshold` 在 G1 下不生效（G1 用 Humongous 机制替代了它）。',
                followup:
                  '「大对象为什么要直接进老年代」——因为它会在 Survivor 之间被反复复制。假设有一个 3MB 的数组，Eden 8MB：Minor GC 后它进 Survivor（1MB），装不下，于是走担保进老年代；若 Survivor 够大，它还得在 S0 / S1 之间来回搬几次才晋升。每次搬 3MB 是纯浪费，而它大概率是长期存活的（大数组往往复用）。所以「直接进老年代」是**用「可能污染老年代」换「避免反复复制」**——代价是短命大对象会加速老年代填满，这也是「不要频繁创建大数组」这条建议的由来。',
              },
              {
                kind: 'diagram',
                title: '一次对象分配的完整判定路径',
                body: [
                  '把五条规则画成一条判定链，就能看清「优先级」——先按大小分流，再看年龄，最后看空间。任何一次分配都只走其中一条路径。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 分配入口：new 一个对象', note: '先看大小，再看线程本地缓冲' },
                    { label: '② 大于阈值 → 直接进老年代', note: '`PretenureSizeThreshold` / G1 Humongous' },
                    { label: '③ 否则进 Eden 的 TLAB', note: '指针碰撞，无锁；TLAB 满则 refill' },
                    { label: '④ Eden 满 → Minor GC，存活进 Survivor', note: '年龄 +1，复制到另一块 Survivor' },
                    { label: '⑤ 年龄达阈值 / 同龄累积超半 → 晋升', note: '`MaxTenuringThreshold` 或动态年龄判定' },
                    { label: '⑥ Survivor 装不下 → 分配担保', note: '老年代接收；仍不够则先 Full GC' },
                  ],
                  caption:
                    '注意 ② 与 ③ 的顺序：**大小判定在 TLAB 之前**。这意味着大对象不享受 TLAB 的无锁分配，而且（在 G1 里）会占用连续的 Humongous Region。这也解释了一条实践经验：**把大数组改成小块、或复用缓冲区，往往比调任何 GC 参数都有效**——因为它同时绕开了「直接晋升」和「Humongous 碎片」两个问题。',
                },
              },
              {
                kind: 'question',
                title: 'Minor GC、Major GC、Full GC 有什么区别？',
                questionId: 'java-04-Q45',
                intent:
                  '这题的陷阱在「Major GC」——它不是规范术语。答出这一点，比背三个定义更能体现深度。',
                points: [
                  '**Minor GC / Young GC**：只回收新生代（Eden + Survivor）。触发频繁（Eden 满即触发）、速度快（复制算法 + 存活对象少）。**与老年代是否满无关**',
                  '**Major GC / Old GC**：只回收老年代。**这是非规范术语**——有的资料指「老年代回收」，有的指「整堆回收」，还有的把 CMS 的 Old GC 与 Full GC 混称。答题时应主动指出「这个叫法不统一，需结合收集器语境」',
                  '**Full GC**：回收整个堆 + 方法区（元空间），STW 时间最长，应尽量避免。它的判定标准是「是否回收了整堆」，而不是「是否由谁触发」',
                  '**CMS 的特殊性**：CMS 只做老年代回收（`CMS GC`），它的 Full GC 指的是「并发失败后退化成 Serial Old 的整堆收集」，两者完全不同',
                  '**G1 的特殊性**：`Young GC` 回收新生代 Region，`Mixed GC` 回收「新生代 + 部分老年代 Region」，**Mixed GC 不是 Full GC**；G1 的 Full GC 是退化后的整堆整理',
                  '**耗时量级**：Minor GC 通常毫秒级（与新生代大小、存活率相关）；Full GC 从几百毫秒到数秒（与整堆大小相关，且可能伴随压缩）',
                ],
                depth:
                  '为什么术语会混乱？因为**分代收集器的「代」本身就是实现细节**。规范（JLS / JVMS）里根本没有「新生代」「老年代」这些概念，它们是 HotSpot 的实现选择。于是「回收老年代」这件事，在 CMS 里叫 `CMS GC`、在 G1 里叫 `Mixed GC`、在 Parallel 里叫 `Full GC`（因为 Parallel Old 无法单独回收老年代，只能整堆做）。所以严谨的说法是：**先说收集器，再说回收范围**——「G1 的一次 Mixed GC 回收了 12 个 Region」比「发生了一次 Major GC」信息量大得多。',
                followup:
                  '「日志里怎么区分」——看收集器的具体名称：`Pause Young (Normal)` / `Pause Young (Concurrent Start)` / `Pause Mixed` / `Pause Full`（G1 的四种停顿），或 `GC (Allocation Failure)` / `Full GC (Ergonomics)`（Parallel）。现代统一日志（`-Xlog:gc`）会直接写出阶段名与原因，比笼统的「Major / Minor」可靠得多。这也是 JDK 9 统一日志框架的动机之一：**让术语混乱不再影响诊断**。',
              },
              {
                kind: 'diagram',
                title: '三种 GC 的边界：范围、触发与代价',
                body: [
                  '同一套堆，三种回收动作覆盖的范围不同。这张表按「范围」排序，能看清为什么 Full GC 的代价是数量级的差异。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['类型', '回收范围', '触发条件', '耗时量级', '是否规范术语'],
                  cols: ['回收范围', '触发条件', '耗时量级', '是否规范术语'],
                  rows: [
                    ['Minor GC', '新生代（Eden + Survivor）', 'Eden 满', '毫秒级', '俗称，通用'],
                    ['Major GC', '老年代', '老年代占用阈值', '十毫秒~百毫秒', '**非规范，定义不一**'],
                    ['Mixed GC（G1）', '新生代 + 部分老年代', '并发标记完成', '受预算约束', 'G1 专有'],
                    ['Full GC', '整堆 + 方法区', '担保失败 / 空间不足 / 显式调用', '百毫秒~数秒', '通用'],
                  ],
                  caption:
                    '看第三行：**Mixed GC 是 G1 独有的中间态**——它既不是 Minor 也不是 Full，而是「按价值挑一部分老年代 Region 顺带收」。这也是为什么 G1 的停顿能做得比 CMS 均匀：它把「一次大 Full GC」拆成了「多次 Mixed GC」。第四列提醒的是答题纪律：面试里遇到「Major GC」这个词，先说明语境再作答，比直接背定义更安全。',
                },
              },
              {
                kind: 'question',
                title: '什么情况下会触发 Full GC？',
                questionId: 'java-04-Q46',
                intent:
                  '六类原因要能穷举，但更重要的是最后一句：**先看日志里的触发原因，再决定调什么**。',
                points: [
                  '**① 老年代空间不足**：大对象直接分配失败、或晋升速率超过回收速率。日志特征 `Pause Full (Allocation Failure)`',
                  '**② 方法区 / 元空间不足**：动态生成类过多（CGLIB、Groovy、JSP）、类加载器泄漏。日志特征 `Metadata GC Threshold` / `Metaspace`',
                  '**③ 空间分配担保失败**：Minor GC 前老年代连续空间不够，或冒险后真的放不下（`Handle Promotion Failure`）',
                  '**④ 显式调用 `System.gc()`**：只是建议，但 HotSpot 默认会执行。日志特征 `System.gc()`',
                  '**⑤ CMS 并发失败**：`Concurrent Mode Failure`——并发回收赶不上分配，退化成 Serial Old 整堆收集',
                  '**⑥ G1 转移失败**：Evacuation Failure（to-space 耗尽）或 Humongous 分配失败，退化为 Full GC',
                  '**⑦ 兜底：`-XX:+DisableExplicitGC` 慎用**。它能屏蔽 `System.gc()`，但也会阻断 `DirectByteBuffer` 的 Cleaner 释放堆外内存——更稳的做法是 `-XX:+ExplicitGCInvokesConcurrent`，把它变成一次并发收集',
                ],
                depth:
                  '「晋升速率超过回收速率」是最隐蔽的一类，因为日志上看起来只是「老年代慢慢涨，然后 Full GC」，很容易被误判成「堆不够大」。真因往往是 **Survivor 太小**：当 Survivor 装不下 Minor GC 后的存活对象时，对象不做年龄累积就直接进老年代，于是晋升速率被人为放大。这类问题的正确调法是**调大新生代或 Survivor**（`-Xmn` / `-XX:SurvivorRatio`），而不是调大整堆。判断依据是 GC 日志里 `ParNew` 后的 `desired survivor size` 与实际晋升量之比——若实际晋升远大于期望，基本可以确诊。',
                followup:
                  '「Full GC 频率多少算正常」——没有绝对标准，但可以给一个诊断性判断：**若 Full GC 后老年代占用没有明显下降**，说明对象是「真活着的」，堆确实不够；**若 Full GC 后占用大幅下降**，说明有大量本该早死的对象活到了老年代，问题在分配侧（Survivor 太小 / 大对象 / 缓存未设上限）。这个二分法比任何阈值都实用，也是排查 Full GC 的第一步。',
              },
              {
                kind: 'diagram',
                title: 'Full GC 的六条触发路径',
                body: [
                  '六类原因可以按「发生在哪个区域」分组：堆内空间、元空间、担保机制、显式调用、收集器自身的失败模式。分类之后，排查就是「先看日志属于哪一类」。',
                ],
                diagram: {
                  type: 'tree',
                  root: {
                    label: 'Full GC 触发原因',
                    note: '先归类，再定位',
                    children: [
                      {
                        label: '堆内空间不足',
                        note: '日志：Allocation Failure',
                        tone: 'warn',
                        children: [
                          { label: '老年代晋升过快', note: 'Survivor 太小 / 对象太大' },
                          { label: '大对象直接分配失败', note: 'Pretenure / Humongous' },
                        ],
                      },
                      {
                        label: '元空间 / 方法区',
                        note: '日志：Metadata GC Threshold',
                        tone: 'warn',
                        children: [
                          { label: '动态生成类过多', note: 'CGLIB、Groovy、JSP' },
                          { label: 'ClassLoader 泄漏', note: '类无法卸载' },
                        ],
                      },
                      {
                        label: '担保与显式调用',
                        note: '机制性触发',
                        tone: 'primary',
                        children: [
                          { label: '空间分配担保失败', note: 'Handle Promotion Failure' },
                          { label: '`System.gc()`', note: '可用 ExplicitGCInvokesConcurrent 转并发' },
                        ],
                      },
                      {
                        label: '收集器失败模式',
                        note: '低延迟收集器的退路',
                        tone: 'bad',
                        children: [
                          { label: 'CMS 并发失败', note: 'Concurrent Mode Failure' },
                          { label: 'G1 转移失败', note: 'Evacuation Failure' },
                        ],
                      },
                    ],
                  },
                  caption:
                    '这张树的价值在「日志字段 → 分支」的映射：看到 `Allocation Failure` 就往第一枝查（堆内），看到 `Metadata GC Threshold` 就往第二枝查（元空间），看到 `System.gc()` 就往第三枝查（谁在显式调用，通常是 RMI 或 `DirectByteBuffer` 清理）。**不看原因就调堆，等于给所有分支开同一副药**——这也是很多「调完还是 Full GC」的根本原因。',
                },
              },
              {
                kind: 'question',
                title: '什么是动态年龄判断？为什么会造成「过早晋升」？',
                questionId: 'java-04-Q47',
                intent:
                  '这题的最佳答案带一个真实案例的数字。要讲清「判定规则」「为什么这么设计」「过小会怎样」三件事。',
                points: [
                  '**规则**：HotSpot 并不严格要求年龄达到 `MaxTenuringThreshold`（默认 15）。若 Survivor 中「年龄 ≤ n 的所有对象总大小」超过 Survivor 空间的一半，则年龄 ≥ n 的对象**直接晋升**',
                  '**为什么这么设计**：Survivor 只有新生代的 1/10（8:1:1），若大量对象都在里面熬年龄，很快会满。动态年龄是一种**自适应**机制——「反正装不下了，不如把老一辈整体挪走」',
                  '**判定是累积的**：从年龄 1 开始累加对象大小，一旦累计超过 `Survivor / 2`，就把「当前年龄及以上」的全部晋升。所以实际晋升年龄常常远小于 15',
                  '**过早晋升的后果**：大量本该在新生代就死掉的对象被塞进老年代 → 老年代涨得快 → Full GC 频繁。而且这些对象在新生代本来很便宜（复制成本低），进了老年代就要参与标记，成本翻倍',
                  '**根因通常是 Survivor 太小**：`-XX:SurvivorRatio` 默认 8（Eden : 单个 Survivor = 8 : 1），小堆下 Survivor 可能只有几十 MB，一两次 GC 就触发动态年龄',
                  '**调优方向**：先保证新生代足够大（`-Xmn` 或 `-Xmx` + `-XX:NewRatio`），再考虑调 `SurvivorRatio`；经验法则是「**老年代大小约为常驻对象（活跃数据）的 2~3 倍**」，再由总堆反推新生代',
                ],
                depth:
                  '动态年龄判定最反直觉的地方是：**它不是「保护」机制，而是「放弃」机制**。当 Survivor 已经装不下时，JVM 选择「把老一辈整体晋升」而不是「把它们也挤在 Survivor 里」——因为后者会导致 Survivor 溢出（更糟，直接触发担保甚至 Full GC）。所以它是「两害相权取其轻」。这也解释了为什么调大 Survivor 能缓解过早晋升：**给动态年龄判定留出更多余量，让它晚一点触发**。但注意不能只调 `SurvivorRatio`——若 Eden 太小，Minor GC 太频繁，对象年龄涨得飞快，动态年龄照样提前触发。',
                followup:
                  '「怎么确认是过早晋升」——两个观察点：① GC 日志里 Minor GC 后的晋升量（`[ParNew: 1234K->156K(13824K), 0.0123 secs]` 冒号后的差值）若持续接近 Survivor 容量，说明晋升过猛；② 用 `jstat -gc <pid> 1000` 看 `S0U`/`S1U` 是否长期接近满、`OU` 是否持续上涨。两者同时出现，基本可以确认是动态年龄提前触发。修法是调大新生代，而不是调 `MaxTenuringThreshold`——后者在高分配率下几乎无效。',
              },
              {
                kind: 'diagram',
                title: '动态年龄判定：累积到一半就整体晋升',
                body: [
                  '假设 Survivor 容量 1MB，里面有四个年龄层的对象。判定的动作是从年龄 1 开始累加，一旦总量超过 512KB，就把「该年龄及以上」全部晋升。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'Survivor（1MB）',
                      note: '按年龄分层统计',
                      slots: [
                        { label: 'age = 1', value: '120KB', tone: 'primary' },
                        { label: 'age = 2', value: '180KB', tone: 'primary' },
                        { label: 'age = 3', value: '260KB', tone: 'warn' },
                        { label: 'age = 4', value: '300KB', tone: 'warn' },
                      ],
                    },
                    {
                      name: '判定结果',
                      note: '阈值 = 1MB / 2 = 512KB',
                      slots: [
                        { label: '累计到 age 3', value: '560KB ≥ 512KB', tone: 'warn' },
                        { label: '动作', value: 'age ≥ 3 全部晋升', tone: 'primary' },
                        { label: '留下', value: 'age 1、2 共 300KB', tone: 'good' },
                      ],
                    },
                  ],
                  caption:
                    '算一遍就清楚了：120 + 180 = 300（不足 512），再加 260 = 560（超过）——于是「**年龄 ≥ 3 的对象全部晋升**」，而不是只晋升 age 3 那一层。注意 age 4 也被带走了，因为规则是「≥ 该年龄」。这也说明**一个热点对象会连带整层年轻对象一起进老年代**，这是过早晋升的放大器。',
                },
              },
              {
                kind: 'question',
                title: '什么是空间分配担保（Handle Promotion Failure）？',
                questionId: 'java-04-Q48',
                intent:
                  '这是一道「机制题」。要把判定步骤说清，并点出它的本质——**用统计概率换一次不必要的 Full GC**。',
                points: [
                  '**问题背景**：Minor GC 后存活对象要进 Survivor，但 Survivor 可能装不下（尤其大对象多、或动态年龄触发），此时需要**老年代来「担保」接收**',
                  '**JDK 6u24 之后的规则**：Minor GC 前先检查「老年代最大可用连续空间」是否 **> 新生代所有对象总大小**',
                  '**若大于**：Minor GC 是安全的（最坏情况把整个新生代都搬进老年代），直接执行',
                  '**若小于**：再检查是否允许担保失败（`-XX:-HandlePromotionFailure`，JDK 6u24 后该参数失效，默认允许）。允许则继续比较「老年代连续空间」与「**历次晋升到老年代对象的平均大小**」',
                  '**平均大小也够**：冒险执行 Minor GC。风险是「真的放不下」→ 发生 `Handle Promotion Failure` → 退化 Full GC',
                  '**不够或不允许**：先做一次 Full GC，腾出空间后再做 Minor GC',
                  '**本质**：用「**历次晋升的平均值**」做统计性预判——本质是**用概率换性能**。因为 Full GC 很贵，值得冒一次「小概率失败」的险',
                ],
                depth:
                  '为什么用「平均值」而不是「新生代总大小」？因为新生代总大小是**上界**（最坏情况全部存活），用它判定太保守——几乎每次都会触发 Full GC。而历次晋升的平均值接近真实情况（大多数 GC 后只有少量对象存活），于是「冒险」在统计上是划算的。这体现了 GC 设计里的一个普遍取向：**用启发式统计替代精确预测**。代价是偶发的 `Handle Promotion Failure`，但那属于「罕见但可容忍」的失败。JDK 6u24 之后 HotSpot 干脆取消了「不允许担保失败」的开关，因为实测证明冒险几乎总是划算的。',
                followup:
                  '「JDK 6u24 之后 `HandlePromotionFailure` 参数为什么失效了」——因为它默认永远允许。HotSpot 认为「先 Full GC 再 Minor GC」这种保守策略几乎从不划算：Full GC 的成本远高于「冒险失败后再 Full GC」的期望成本。所以这个参数被保留为「兼容性占位」，设不设都一样。面试里若被问「这个参数还起作用吗」，答「JDK 6u24 之后失效，默认总是允许冒险」是加分项。',
              },
              {
                kind: 'diagram',
                title: '担保判定的三步走',
                body: [
                  '担保判定是两个比较的串联：先比「上界」，再比「平均值」。第一次比较决定「是否绝对安全」，第二次决定「是否值得冒险」。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① Minor GC 前：查老年代最大连续可用空间', note: '注意是「连续」空间,不是总空闲' },
                    { label: '② 若 > 新生代总大小 → 直接 Minor GC', note: '最坏情况也装得下,绝对安全' },
                    { label: '③ 否则比较「历次晋升平均大小」', note: '统计性预判:概率上装得下就赌一把' },
                    { label: '④ 平均值够 → 冒险执行 Minor GC', note: '失败则 Handle Promotion Failure' },
                    { label: '⑤ 不够 → 先 Full GC,再 Minor GC', note: '最保守路径,代价最大' },
                  ],
                  caption:
                    '第 ① 步的「**连续**」两个字最容易被忽略：老的 CMS（标记-清除）即使总空闲很多，也可能因为没有**连续**空间而判定不安全——这是碎片导致提前 Full GC 的机制之一。换到 G1 / Parallel Old（标记-整理）后碎片问题缓解，这个判定就宽松得多。所以「同一份代码换个收集器 Full GC 变少」有时不是收集器更快，而是**担保判定更容易通过**。',
                },
              },
              {
                kind: 'question',
                title: '为什么 Young GC 不需要扫描整个老年代？卡表和 RSet 是什么？',
                questionId: 'java-04-Q49',
                intent:
                  '本课的机制核心。必须讲清「跨代引用」这个问题的由来，再讲两种解法（卡表 / RSet）的粒度差异。',
                points: [
                  '**问题**：老年代对象可能引用新生代对象（跨代引用）。若 Young GC 只扫新生代，这些被老年代引用的对象会被误判为垃圾',
                  '**朴素解法**：把整个老年代当作 GC Roots 扫一遍。但这样一来「只回收新生代」就失去了意义——成本仍然与整堆成正比',
                  '**卡表（Card Table）**：把老年代按 **512 字节**切成卡页，用一个字节数组标识每页是否「脏」（含跨代引用）。通过**写屏障**在「老年代字段被写入新生代引用」时把对应卡页标脏',
                  '**Young GC 时**：只扫描**脏卡**对应的老年代对象，把它们当作额外根。成本从「整堆」降到「脏卡数」',
                  '**RSet（Remembered Set，G1）**：每个 Region 一份，记录「**谁引用了我**」（point-into）。比卡表更细（精确到 Region），但维护成本更高（每次引用写入都要更新）',
                  '**为什么 G1 需要 RSet 而不是卡表**：卡表是「全局一张」，指向「老年代的某张卡」；而 G1 的 Region 是动态角色的，回收任意一个 Region 都需要知道「哪些其他 Region 指向它」——必须按 Region 组织',
                  '**三种屏障不要混**：GC **写屏障**（引用赋值钩子，用于卡表 / SATB）、JMM **内存屏障**（禁止指令重排）、ZGC **读屏障**（引用加载钩子）',
                ],
                depth:
                  '卡表的关键设计是「**宁可多扫，不可漏扫**」：一个卡页 512 字节，只要其中有一个字段被写入跨代引用，整页就标脏；GC 时把整页的对象都当作根扫描。这会产生「伪共享」（false sharing of cards）——同一页里其他不相关的对象也被扫了。为什么不精确到字段？因为**维护精确记录的成本高于多扫几个对象的成本**：写屏障只需要「改一个字节」，而精确记录需要「维护一张从字段到引用的映射表」。这个取舍在 G1 的 RSet 里被反转了——G1 需要更细的粒度（按 Region），于是接受了更高的维护成本。',
                followup:
                  '「RSet 占多少内存」——G1 官方给的区间是总堆的 **1%~20%**，实际常见 3%~5%。它用三级结构实现：跨 Region 引用少时用**稀疏表**（点图，每格存一个 card 索引），多了转**细粒度位图**（每 128 字节一个字），再多转**粗粒度位图**（每 2MB 一个字）。这也解释了「小堆上 G1 不如 Parallel」——固定开销摊不掉。排查 RSet 膨胀可以用 `-XX:+PrintAdaptiveSizePolicy` 或 JFR 的 `G1HeapRegionInformation`。',
              },
              {
                kind: 'diagram',
                title: '卡表：512 字节一页，脏页才扫',
                body: [
                  '把老年代切成卡页、再配一个字节数组，就是卡表的全部。Young GC 时只看数组里哪些位是 1，就跳过绝大多数老年代对象。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '老年代（按 512B 分卡）',
                      note: '只有部分卡含跨代引用',
                      slots: [
                        { label: 'card 0', value: '无跨代引用', tone: 'muted' },
                        { label: 'card 1', value: '无跨代引用', tone: 'muted' },
                        { label: 'card 2', value: '指向新生代', tone: 'warn' },
                        { label: 'card 3', value: '无跨代引用', tone: 'muted' },
                        { label: 'card 4', value: '指向新生代', tone: 'warn' },
                      ],
                    },
                    {
                      name: '卡表（字节数组）',
                      note: '1 = 脏页，需扫描',
                      slots: [
                        { label: '[0]', value: '0', tone: 'muted' },
                        { label: '[1]', value: '0', tone: 'muted' },
                        { label: '[2]', value: '1', tone: 'warn' },
                        { label: '[3]', value: '0', tone: 'muted' },
                        { label: '[4]', value: '1', tone: 'warn' },
                      ],
                    },
                  ],
                  caption:
                    'Young GC 时，JVM 只需遍历卡表找到值为 1 的项，再去对应卡页里找「指向新生代的引用」，把它们加入根集合。若老年代有 1GB（约 200 万张卡）、其中只有几十张脏卡，扫描量就从「1GB 的对象图」降到「几十个卡页」——这就是分代收集能成立的技术前提。写屏障负责在运行时把对应的卡「弄脏」，2025 年的 HotSpot 仍然用这个 512 字节的粒度。',
                },
              },
              {
                kind: 'analogy',
                title: '卡表像小区的「来访登记簿」',
                text:
                  '把新生代想成一栋刚交付的新楼，老年代是住了十年的老楼。物业（GC）要定期清点新楼里谁还住着，但新楼里的人和**老楼业主的访客**有关——如果只查新楼，会漏掉「老楼业主管着新楼某间房」这种情况。最笨的办法是每次清点都把整栋老楼走一遍，那还不如整片小区一起查。于是物业立了个规矩：**老楼每层楼贴一张登记页（卡页），只要有业主把钥匙给了新楼的人，就在登记页上打个勾**。清点新楼时只看哪几层打了勾，只查那几层——这就是卡表。',
                mapping: [
                  { real: '新楼', tech: '新生代' },
                  { real: '住了十年的老楼', tech: '老年代' },
                  { real: '每层楼一张登记页', tech: '卡页：512 字节一块' },
                  { real: '业主把钥匙给了新楼的人', tech: '老年代对象引用新生代对象（跨代引用）' },
                  { real: '在登记页上打勾', tech: '写屏障把对应卡标记为 dirty' },
                  { real: '清点时只看打了勾的楼层', tech: 'Young GC 只扫描脏卡' },
                  { real: '同一层里没涉及的住户也被查了', tech: '伪共享：整页对象都被当根，成本可接受' },
                  { real: '每层只记「有没有」，不记「是谁」', tech: '卡表只存 1 bit，不精确到字段' },
                ],
                limit:
                  '有一处不成立：登记簿是「业主主动上报」，而卡表是 **JVM 在字节码层面强制插桩**——`putfield` / `aastore` 指令执行时，写屏障无条件运行，应用代码无法绕过。这也是为什么「写密集」的应用在 G1 下吞吐会掉：每一次引用赋值都要过一次屏障。另外 G1 的 RSet 更像「**每户一本访客名册**」（按 Region 组织、记「谁引用了我」），而不是整栋一张登记页。',
              },
              {
                kind: 'question',
                title: 'GC 只会对堆进行回收吗？',
                questionId: 'java-04-Q50',
                intent:
                  '收尾题，考「知识边界」。答案要覆盖方法区、字符串常量池、直接内存三块，并明确哪些**不**归 GC 管。',
                points: [
                  '**不只是堆**。除了堆，GC 还会涉及三类区域',
                  '**方法区 / 元空间**：达到 `MetaspaceSize` 阈值或 Full GC 时，卸载废弃的类、清理废弃常量。但类卸载条件极苛刻（实例全无 + 类加载器死 + Class 对象无引用）',
                  '**字符串常量池（String Table）**：JDK 7 起字符串常量池移到堆，可参与常规 GC；JDK 8 起 `StringTable` 本身也支持清理。G1 的 `-XX:+UseStringDeduplication` 还能对 `String` 做去重（只去重底层 `byte[]`）',
                  '**直接内存（Direct Memory）**：**不归 GC 直接管理**，但靠 `DirectByteBuffer` 的虚引用 `Cleaner` 在对象被回收时触发释放。所以「堆内对象不回收 → 堆外内存不释放」是真实存在的耦合',
                  '**不在 GC 范围的**：线程栈（随线程结束释放）、Code Cache（由 JIT 的代码缓存管理机制回收）、JNI 本地内存（由 native 代码自己管）',
                  '**工程含义**：`-XX:+DisableExplicitGC` 会阻断 `System.gc()`，也连带阻断 `DirectByteBuffer` 的清理路径——大量堆外分配 + 禁用显式 GC，是 `OutOfMemoryError: Direct buffer memory` 的经典组合',
                ],
                depth:
                  '「直接内存不归 GC 管」这句话要精确理解：**内存本身不由 GC 分配/释放，但释放时机由 GC 决定**。`ByteBuffer.allocateDirect()` 会在堆里创建一个小的 `DirectByteBuffer` 对象，它持有一个 `long address` 指向堆外内存，并注册一个 `Cleaner`（基于 `PhantomReference`）。当这个堆内对象被回收时，`Cleaner` 才去 `Unsafe.freeMemory(address)`。所以：**若堆内对象一直活着（比如被缓存持有），堆外内存也永不释放**；**若显式 GC 被禁用且堆长期不 GC，堆外内存会堆积**。这是 JVM 里少见的「两块内存的生命周期强耦合」案例，也是 Netty 要自己做 `ByteBuf` 引用计数（而不是依赖 GC）的原因。',
                followup:
                  '「方法区回收值得关注吗」——在 Metaspace 时代值得，因为 `OutOfMemoryError: Metaspace` 是真实故障。触发点通常是「动态类生成 + 类加载器泄漏」：每次热部署或每次代理生成一个新 `ClassLoader`，旧的却没被回收。排查手段：`jcmd <pid> VM.metaspace` 看 `Klass` 数量增长，`-XX:+TraceClassUnloading`（需 debug 版）看卸载日志，或直接 `jmap -clstats <pid>` 看类加载器统计。若 `ClassLoader` 数量持续增长，就是泄漏。',
              },
              {
                kind: 'principle',
                title: '把规则和现象对应起来，才算真懂分配策略',
                body: [
                  '这一节的规则不难背，难的是「看到现象能反推规则」。下面五组对应，是线上排查最常用的路径。',
                ],
                steps: [
                  {
                    title: '① 老年代涨得快、Full GC 频繁',
                    detail:
                      '先看 Full GC 后老年代占用是否下降。**不下降** → 对象真活着，堆不够或泄漏；**大幅下降** → 过早晋升，查 Survivor 是否太小、是否有短命大对象。这一步能砍掉一半的无效调参。',
                  },
                  {
                    title: '② Minor GC 很频繁但每次很快',
                    detail:
                      '说明 Eden 太小（或分配速率高）。若每次 GC 后存活对象极少，那是健康的「高分配率」场景，调大新生代能显著减少 GC 次数；若存活对象接近 Survivor 容量，就要警惕动态年龄提前触发了。',
                  },
                  {
                    title: '③ 明明是临时对象却进了老年代',
                    detail:
                      '查两条：**大小**（超过 `PretenureSizeThreshold` 或 G1 的 Region 一半）与**年龄**（Survivor 装不下导致直接晋升）。前者调阈值或复用缓冲区，后者调大新生代。',
                  },
                  {
                    title: '④ Full GC 日志出现 Metadata GC Threshold',
                    detail:
                      '不是堆的问题，是元空间。查动态类生成（CGLIB / Groovy / JSP）与类加载器泄漏。调 `MaxMetaspaceSize` 只是把问题推迟，真正要治的是「为什么类一直在生成」。',
                  },
                  {
                    title: '⑤ 堆外内存持续上涨而堆很稳',
                    detail:
                      '不是 GC 的问题。查 `DirectByteBuffer` 的持有者（Netty 的 `PooledByteBufAllocator`、NIO 的 `MappedByteBuffer`），确认是否有 `Cleaner` 被持有链卡住；同时确认有没有 `DisableExplicitGC`。',
                  },
                ],
                takeaway:
                  '一句话：**「分配策略」的全部价值，就是把「GC 现象」翻译成「分配侧的具体动作」**。看到 Full GC 不是去调 `-Xmx`，而是问「这些对象为什么会活着进老年代」；看到 Metaspace OOM 不是去调 `MaxMetaspaceSize`，而是问「谁在一直生成类」。**参数只能调整阈值，改不了因果关系**——这是 GC 调优里最贵的一课。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'tuning',
      title: 'F · 类加载、调优与 JIT',
      goal: '把 JVM 知识用到排查与调参上',
      summary:
        '最后一阶段从「原理」转向「动作」：类什么时候被加载、双亲委派解决了什么、线上 CPU 飙高或内存溢出该按什么顺序查、JIT 的即时编译如何影响性能。这些内容是面试里区分「背过」与「做过」的关键。',
      lessons: [
        {
          id: 'classloading',
          title: '类加载机制与双亲委派',
          kind: 'concept',
          sources: [{ topic: 'java-04', chapters: ['类加载'] }],
          content: {
            intro:
              '一个 `.class` 文件变成能 `new` 的类，要经过加载、验证、准备、解析、初始化五个阶段。这条链上藏着几个高频考点：准备阶段给静态变量赋的是零值而不是初始值、`<clinit>()` 只执行一次且由 JVM 保证线程安全、六种主动引用才会触发初始化。而「谁来加载」这一侧则是双亲委派模型——它保证了核心类不被篡改，也解释了为什么同名类在不同加载器下是「两个类」。本节按「怎么加载 → 何时初始化 → 谁来加载 → 如何界定同一个类」四步推进。',
            outline: [
              '五个阶段中「准备赋零值、初始化才赋真值」是最常被追问的细节',
              '只有六种主动引用触发类初始化，编译期常量、数组定义、`.class` 都不触发',
              '双亲委派保证核心类唯一与安全，实现只有十几行（loadClass 里的三段）',
              '类的唯一性由「全限定名 + 类加载器实例」共同决定，这是隔离与热部署的基础',
            ],
            pitfalls: [
              '认为 `Class.forName` 与 `loadClass` 等价，前者默认触发初始化、后者不触发',
              '把双亲委派说成「JVM 强制规定」，它其实是 ClassLoader 的代码约定，可以被重写',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：类加载要回答的四个问题',
                body: [
                  '类加载这一块知识，归根到底在回答四个问题：**① 怎么把一个字节流变成可用的类**（五个阶段）；**② 什么时候才真正初始化它**（主动 vs 被动引用）；**③ 由谁来加载**（类加载器层次与双亲委派）；**④ 怎么算「同一个类」**（唯一性判定）。四个问题层层递进，最后一个问题才是所有工程实践（隔离、热部署、SPI）的理论基础。',
                  '理解顺序很重要：先有「阶段」，才知道「初始化」是一个可精确触发的点；有了「触发条件」，才理解「加载器」为什么要分层次；理解了「委派」，才明白「打破委派」为什么能实现隔离。反过来背结论，很容易把「双亲委派」背成一句口号，却答不出「Tomcat 为什么要打破它」。',
                ],
                points: [
                  '**阶段**：加载 → 验证 → 准备 → 解析 → 初始化 → 使用 → 卸载，其中「解析」可以延迟到初始化之后',
                  '**触发**：只有六种「主动引用」触发初始化，其余都是被动引用（不触发）',
                  '**委派**：`loadClass()` 里三段逻辑——已加载？→ 委派父加载器 → 自己 `findClass()`',
                  '**唯一性**：`(ClassLoader 实例, 全限定名)` 二元组，缺一不可',
                ],
              },
              {
                kind: 'question',
                title: '类加载的过程（从 class 文件到可用类）是怎样的？',
                questionId: 'java-04-Q51',
                intent:
                  '五个阶段必须按顺序说清，并且每阶段配一个「最容易被追问的点」——尤其准备阶段赋零值、解析可以延迟。',
                points: [
                  '**① 加载（Loading）**：通过全限定名获取二进制字节流（本地 class 文件 / JAR / 网络 / 动态生成），转成方法区的运行时数据结构，并在**堆中生成一个 `Class` 对象**作为访问入口',
                  '**② 验证（Verification）**：确保字节流安全合规。四类验证：文件格式（魔数 `0xCAFEBABE`、版本号）、元数据（父类是否合法、是否实现了抽象方法）、字节码（操作数栈不溢出、跳转指令不越界）、符号引用（引用是否存在、访问权限是否够）',
                  '**③ 准备（Preparation）**：为**静态变量分配内存并设零值**。`static int a = 1` 此时 a = 0；但 `static final int a = 1`（编译期常量，带 `ConstantValue` 属性）会**直接赋 1**',
                  '**④ 解析（Resolution）**：把常量池里的**符号引用**替换为**直接引用**（内存指针或偏移量）。**可以延迟到第一次使用时**（这也叫「晚期绑定」），所以它不是严格串行的第 4 步',
                  '**⑤ 初始化（Initialization）**：执行类构造器 `<clinit>()`，即「静态变量赋值 + static 代码块」按源码顺序合并。**JVM 保证这一步是线程安全的**（只有一个线程能执行，其余阻塞）',
                  '**⑥ 使用 / ⑦ 卸载**：使用即正常 `new`、调用静态方法；卸载要求极苛刻（实例全无 + 类加载器死 + Class 对象无引用）',
                ],
                depth:
                  '为什么「准备阶段赋零值」这件事这么重要？因为它解释了一类经典 bug：`static int count = 1;` 在准备阶段是 0，到初始化阶段才变 1——如果某个 `static` 块在「声明之前」访问了 `count`，看到的就是 0（更准确地说，未声明前的访问在 Java 语法上直接是编译错误，但通过方法间接访问就会读到 0）。这也解释了「单例的双重检查为什么需要 `volatile`」的另一层原因：`instance = new Singleton()` 不是原子的，分配内存、初始化、赋值引用三步之间，**引用先可见而对象字段还是零值**，另一个线程会拿到「半个对象」。',
                followup:
                  '「解析为什么可以延迟」——因为它支撑了 Java 的动态绑定。若解析必须在初始化前完成，那么「编译时不知道具体实现类」的场景（接口 + 运行时加载实现、反射、`invokedynamic`）就无法工作。延迟解析让 JVM 可以在第一次执行到该指令时才去查符号引用，此时实现类已经确定。代价是首次执行的额外开销（这也是 JIT 之后能优化的原因——解析结果会被缓存为直接引用）。',
              },
              {
                kind: 'diagram',
                title: '五个阶段的先后与「可延迟」的那一步',
                body: [
                  '顺序图里有一个例外：解析可以推迟。其余四步是严格串行的——不可能先初始化再验证。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 加载', note: '取字节流 → 方法区结构 + 堆中 Class 对象' },
                    { label: '② 验证', note: '文件格式 / 元数据 / 字节码 / 符号引用，四类' },
                    { label: '③ 准备', note: '静态变量分配内存 + 赋**零值**（final 常量例外）' },
                    { label: '④ 解析', note: '符号引用 → 直接引用；**可延迟到首次使用**' },
                    { label: '⑤ 初始化', note: '执行 `<clinit>()`：静态赋值 + static 块，线程安全' },
                  ],
                  caption:
                    '两个「反直觉点」值得记住：**③ 准备赋零值**（所以静态字段的「声明值」要到 ⑤ 才生效）、**④ 解析可延迟**（所以它不是严格的第 4 步）。面试里若能把这两点主动说出来，通常就不需要再回答「你怎么证明自己读过规范」这类追问了。',
                },
              },
              {
                kind: 'question',
                title: '`<clinit>()` 和 `<init>()` 有什么区别？',
                questionId: 'java-04-Q52',
                intent:
                  '核心差别只有两条：执行次数（一次 vs 每次）和线程安全（JVM 保证 vs 不保证）。第三层是「静态内部类单例为什么能靠它实现」。',
                points: [
                  '**`<clinit>()`**：类构造器，由编译器自动收集「静态变量赋值 + `static` 代码块」**按源码顺序**合并生成，在类初始化阶段执行，**只执行一次**',
                  '**`<init>()`**：实例构造器，收集「实例变量赋值 + 初始化块 + 构造方法体」，**每次 `new` 都执行一次**',
                  '**线程安全**：`<clinit>()` 由 JVM **加锁保证**——多线程同时触发初始化时，只有一个线程执行，其余阻塞等待。这是「静态内部类单例」的成立基础',
                  '**顺序性**：`static` 块按源码顺序执行，所以「先赋值后覆盖」的坑真实存在（`static { i = 5; }` 写在 `static int i = 1;` 之前，最终 i = 1）',
                  '**接口的差异**：接口没有静态代码块，所以接口的 `<clinit>()` **不要求先初始化父接口**；只有真正使用到父接口中定义的变量时才会初始化它',
                  '**非法前向引用**：`static` 块「只能访问定义在它之前的静态变量」，对之后的变量只能赋值不能读（这是 Java 语法的编译期限制）',
                ],
                depth:
                  '「JVM 保证 `<clinit>()` 线程安全」的机制是**类初始化锁**（`Class` 对象上的锁，HotSpot 用 `_init_lock` 实现），不是 `synchronized` 关键字。这带来两个可观测结论：① 若 `<clinit>()` 里有死循环或长时间阻塞，**其他线程会一直卡在类初始化上**，表现为「整个应用启动卡住」——这类故障排查时看线程栈会发现大量线程停在 `<clinit>` 或 `Class.forName`；② 若 `<clinit>()` 抛异常，该类会被标记为「初始化失败」（`NoClassDefFoundError`），后续任何使用都会直接失败，且**无法恢复**（同一个类加载器下）。',
                followup:
                  '「静态内部类单例为什么线程安全」——`Holder` 类的 `<clinit>()` 由 JVM 保证只执行一次，而 `INSTANCE` 的创建就写在 `Holder` 的静态字段初始化里。所以「第一次调用 `getInstance()` 时触发 `Holder` 初始化」这一步天然互斥。这比双重检查锁更简洁，且没有 `volatile` 的性能开销。前提是「类加载器只有一个」——若同一个类被两个加载器加载，会各自持有一份 `INSTANCE`，单例就失效了（这正好接上本课最后一题）。',
              },
              {
                kind: 'compare',
                title: '`<clinit>()` 与 `<init>()` 的逐项对照',
                head: ['维度', '`<clinit>()`', '`<init>()`'],
                rows: [
                  ['来源', '静态变量赋值 + `static` 块', '实例变量赋值 + 初始化块 + 构造方法体'],
                  ['执行时机', '类初始化阶段（首次主动引用）', '每次 `new` / `clone` / 反序列化'],
                  ['执行次数', '**一次**（每个类加载器一次）', '每次创建实例都执行'],
                  ['线程安全', '**JVM 保证**（类初始化锁）', '不保证，需自行同步'],
                  ['异常后果', '`ExceptionInInitializerError`，此后该类不可用', '构造失败，对象不产生，可重试'],
                  ['能否显式调用', '不能（编译器生成，Java 代码无法直接调）', '可以：`this(...)` / `super(...)`'],
                  ['接口的规则', '不要求先初始化父接口', '接口没有构造器'],
                ],
                caption:
                  '第三、四行是全部价值所在：**「只执行一次 + JVM 保证互斥」** 这两条组合起来，就是所有「延迟初始化单例」方案的底层支撑；而 `<init>()` 每次执行、不保证互斥，所以「构造器里做重活」永远需要自己加同步。最后一行的接口规则是冷知识，但在「接口里的常量会不会触发初始化」这类题上很有用。',
              },
              {
                kind: 'question',
                title: '哪些情况会触发类初始化？（主动引用 vs 被动引用）',
                questionId: 'java-04-Q53',
                intent:
                  '六种主动 + 五种被动，必须能各举一例。最容易错的是「通过子类访问父类静态字段」和「数组定义」。',
                points: [
                  '**主动引用一：四条字节码指令**。`new`（创建实例）、`getstatic` / `putstatic`（读写**非编译期常量**的静态字段）、`invokestatic`（调用静态方法）',
                  '**主动引用二：反射**。`Class.forName("com.Foo")` 默认触发初始化（`initialize=true`）；`Class.forName(name, false, loader)` 则不触发',
                  '**主动引用三：父类先行**。初始化子类时，若父类尚未初始化，**先初始化父类**（接口例外）',
                  '**主动引用四：主类**。虚拟机启动时，包含 `main()` 的那个类先被初始化',
                  '**主动引用五：MethodHandle / VarHandle**。JDK 7+ 通过句柄访问的类要被初始化',
                  '**主动引用六：default 方法**。若接口定义了 `default` 方法，实现类初始化会触发该接口初始化',
                  '**被动引用一：编译期常量**。`static final` 的基本类型/String 常量在编译期被**传播**到调用方的常量池，读取它不会触发定义类的初始化',
                  '**被动引用二：`.class`**。`Foo.class` 只触发加载与验证，不触发初始化',
                  '**被动引用三：`loadClass()`**。`ClassLoader.loadClass()` 不执行初始化，`Class.forName()` 默认执行——这是两者最关键的差别',
                  '**被动引用四：数组**。`Foo[] arr = new Foo[10]` 只创建数组对象（类型由 JVM 动态生成），不初始化 `Foo`',
                  '**被动引用五：子类访问父类静态字段**。只触发**父类**初始化，子类不初始化',
                ],
                depth:
                  '「编译期常量不触发初始化」这条最值得深挖，因为它解释了 `static final` 的一个副作用：**改常量值不会导致调用方重新编译**（值已被拷贝进调用方的常量池），所以「改了常量但线上行为没变」是真实事故。规避方式是用 `static final` 引用一个**非编译期常量**（如 `static final int X = new Random().nextInt()` 或 `static final String S = SomeClass.init()`），这样值不会被传播，读取时会触发初始化。另一个副作用是「常量池膨胀」——大量长字符串常量会被复制到每个使用它的类里。',
                followup:
                  '「数组为什么不算主动引用」——`new Foo[10]` 创建的是 `[LFoo;` 这个**数组类型**，它的类由 JVM 在运行期自动生成（不是 `Foo` 本身）。数组的创建只要求「`Foo` 已被加载」，不要求「已初始化」。所以打印 `arr.getClass()` 会得到 `class [Lcom.Foo;`，而 `Foo` 的 `static` 块不会执行。这是很好的「验证型」回答——能说出 `[L` 前缀，基本可以确认你不是背的。',
              },
              {
                kind: 'diagram',
                title: '主动引用 vs 被动引用：六种触发、五种不触发',
                body: [
                  '这组对照记反了，选择题就必错。左边六条都会让 `static` 块执行，右边五条都不会——分界线是「是否真正使用到类的静态结构」。',
                ],
                diagram: {
                  type: 'split',
                  left: {
                    title: '✓ 主动引用：会触发 `<clinit>()`',
                    tone: 'good',
                    items: [
                      '`new Foo()`、读写非编译期常量静态字段、调静态方法',
                      '`Class.forName("com.Foo")`（默认 initialize=true）',
                      '初始化子类时，父类若未初始化则先初始化父类',
                      '虚拟机启动时 `main()` 所在的类',
                      '`MethodHandle` / `VarHandle` 指向的类（JDK 7+）',
                      '接口有 `default` 方法时，实现类初始化会连带初始化接口',
                    ],
                  },
                  right: {
                    title: '✗ 被动引用：不触发初始化',
                    tone: 'bad',
                    items: [
                      '读取 `static final` 编译期常量（值已传播到调用方常量池）',
                      '`Foo.class`：只加载 + 验证，不初始化',
                      '`ClassLoader.loadClass("com.Foo")`：不执行初始化',
                      '`new Foo[10]`：只创建数组类型 `[LFoo;`',
                      '通过子类访问父类的静态字段：只初始化**父类**',
                      '（补充）反序列化、`clone` 走的是 `<init>`，与 `<clinit>` 无关',
                    ],
                  },
                  caption:
                    '右边第 5 条最容易答错：`Sub.FIELD`（FIELD 定义在 `Parent`）**只会初始化 `Parent`**，`Sub` 的 `static` 块不执行。这条规则的用处在于「验证类是否被初始化」的实验设计——想验证某个类的初始化时机，就在它的 `static` 块里打印一行日志，然后用上面这些写法逐一试探。',
                },
              },
              {
                kind: 'question',
                title: '类加载器有哪几种？JDK 8 和 JDK 9+ 有什么区别？',
                questionId: 'java-04-Q54',
                intent:
                  '三层结构要能说清「各自加载什么路径」，再补 JDK 9 的两处改名与动机。',
                points: [
                  '**JDK 8 三层**：Bootstrap（启动类加载器，C++ 实现，加载 `JAVA_HOME/lib` 下的核心类，Java 层 `getClassLoader()` 返回 **null**）→ Extension（扩展类加载器，加载 `lib/ext`）→ Application（应用类加载器，加载 `classpath`）',
                  '**JDK 9+ 三层**：Bootstrap → **Platform**（平台类加载器，取代 Extension，加载模块化后的平台类）→ Application',
                  '**为什么改名**：JDK 9 引入模块系统（JPMS），`lib/ext` 机制被废弃（`-Djava.ext.dirs` 失效），平台类改为由模块图定义——`Extension` 这个名字不再准确，故改为 `Platform`',
                  '**自定义类加载器**：继承 `ClassLoader`，重写 `findClass()`，位于委派链的末端（在 Application 之下）',
                  '**类加载器的双重职责**：除了加载类，还**参与类的唯一性判定**——`Class` 对象的相等性由「全限定名 + 加载器实例」共同决定',
                  '**怎么取当前类的加载器**：`getClass().getClassLoader()`；线程上下文加载器用 `Thread.currentThread().getContextClassLoader()`',
                ],
                depth:
                  '`Bootstrap` 为什么返回 null？因为它是 C++ 实现的，在 Java 堆里**没有对应的对象**。`getClassLoader()` 的契约是「返回加载该类的加载器，若由 bootstrap 加载则返回 null」——所以 `String.class.getClassLoader() == null` 是正常现象，不是 bug。这个 null 在双亲委派的代码里恰好被用作「委派到顶」的标志：`if (parent != null) parent.loadClass(...)` 否则走 `findBootstrapClassOrNull()`。**一个 null 同时表达「没有父加载器」和「由 bootstrap 加载」**，是 JDK 设计里少见的「用一个值表达两件事」的妥协。',
                followup:
                  '「JDK 9 的模块化对类加载有什么影响」——委派不再是严格的单向链，而是「按模块图委派」：一个类可能被委派到「加载了声明该包的模块的那个加载器」。此外 JDK 9 引入了 `BuiltinClassLoader` 作为中间抽象，`AppClassLoader` 与 `PlatformClassLoader` 都继承它。日常开发感知不到，但写自定义加载器、或用 OSGi 这类框架时会有差异——**它们依赖的 `loadClass` 内部实现变了**。',
              },
              {
                kind: 'diagram',
                title: '三层委派结构：JDK 8 与 JDK 9+ 的差别',
                body: [
                  '结构本身没变（三层 + 自定义），变的是中间层的名字与它加载的内容。这张分层图把「各层加载什么」标出来。',
                ],
                diagram: {
                  type: 'layers',
                  items: [
                    { label: 'Bootstrap（C++）', note: 'JDK 8: `JAVA_HOME/lib` ｜ JDK 9+: 模块图中的 `java.base` 等', tone: 'primary' },
                    { label: 'Platform / Extension', note: 'JDK 8 叫 Extension，加载 `lib/ext` ｜ JDK 9+ 叫 Platform', tone: 'primary' },
                    { label: 'Application', note: 'classpath（含 `-cp`、JAR、`CLASSPATH`）', tone: 'good' },
                    { label: '自定义加载器', note: '继承 `ClassLoader`，重写 `findClass()`', tone: 'muted' },
                  ],
                  caption:
                    '委派方向是**自下向上请求、自上向下加载**：Application 收到请求先问 Platform，Platform 再问 Bootstrap，Bootstrap 找不到才回头让下层自己找。这样设计的结果是「越核心的类越优先由越顶层的加载器加载」——所以你自己写一个 `java.lang.String` 永远不会生效，因为 Bootstrap 已经加载了正版。这正是「沙箱安全」的实现方式。',
                },
              },
              {
                kind: 'question',
                title: '什么是双亲委派模型？它的作用是什么？',
                questionId: 'java-04-Q55',
                intent:
                  '这题的标准答案分两半：**实现只有十几行**，**作用有三条**。能把 `loadClass` 的三段逻辑说出来，比背「作用」更值钱。',
                points: [
                  '**定义**：类加载器收到加载请求时，先委派给父加载器，逐层向上直到 Bootstrap；只有父加载器反馈「找不到」时，子加载器才尝试自己加载',
                  '**实现（`ClassLoader.loadClass`）三段**：① `findLoadedClass(name)` 查已加载 → ② `parent.loadClass(name)`（parent 为 null 则走 Bootstrap）→ ③ 都失败才 `findClass(name)`',
                  '**作用一：避免重复加载**。同一个类在整条委派链上只会被加载一次（配合「全限定名 + 加载器」的唯一性判定），不会出现「同一个类被不同层各加载一份」',
                  '**作用二：安全（沙箱）**。防止核心 API 被篡改——自定义 `java.lang.String` 会被委派到 Bootstrap，加载的是正版；恶意类无处遁形',
                  '**作用三：职责划分**。各层只管自己范围的类，层次清晰，便于排查「类冲突」问题',
                  '**注意：它不是规范强制**。JVM 规范只要求「通过全限定名加载类」，双亲委派是 `ClassLoader` 的**代码约定**，可以被重写——这就是「打破双亲委派」得以成立的前提',
                ],
                depth:
                  '「避免重复加载」这句话要精确：委派保证的是「**同一个加载器链上不会加载两次**」，而不是「全 JVM 只有一个」。若两个互不相干的加载器（比如 Tomcat 的两个 `WebappClassLoader`）都去加载 `com.Foo`，会得到两个不同的 `Class` 对象——这正是应用隔离的原理。「父加载器已加载的类，子加载器不会重复加载」这一条，在 `loadClass` 的第一段 `findLoadedClass` 里体现：**注意它查的是「自己」是否加载过，而不是父加载器**。父加载器的已加载类由 `parent.loadClass` 内部的第一段负责返回。',
                followup:
                  '「双亲委派能保证类一定唯一吗」——不能。反例有三：① 两个平级加载器各加载一份（Tomcat 多应用）；② 重写 `loadClass` 绕过委派（Tomcat 的 `WebappClassLoader` 就是先自己找）；③ 自定义加载器直接 `defineClass` 而不查 `findLoadedClass`。所以准确说法是：**双亲委派在「单一线程的委派链」内保证唯一，跨链不保证**——这也是「类的唯一性」要引入加载器维度的原因。',
              },
              {
                kind: 'diagram',
                title: '一次 loadClass 的委派往返',
                body: [
                  '委派是一条「向上问、向下给」的往返链路。注意每一层都先查「自己是否已加载」，所以重复请求很快就能短路返回。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['调用方', 'Application', 'Platform', 'Bootstrap'],
                  messages: [
                    { from: '调用方', to: 'Application', text: 'loadClass("java.lang.String")' },
                    { from: 'Application', to: 'Application', text: 'findLoadedClass：自己没加载过' },
                    { from: 'Application', to: 'Platform', text: 'parent.loadClass(...)：委派上去' },
                    { from: 'Platform', to: 'Bootstrap', text: 'parent.loadClass(...)：parent 为 null 走 Bootstrap' },
                    { from: 'Bootstrap', to: 'Platform', text: '已加载核心类，直接返回 Class', reply: true },
                    { from: 'Platform', to: 'Application', text: '透传返回', reply: true },
                    { from: 'Application', to: '调用方', text: '返回 Class（Application 全程没读字节码）', reply: true },
                  ],
                  caption:
                    '最后一条注释是关键：**Application 全程没读一个字节**。这就是「你自己写一个 `java.lang.String` 不生效」的机制——请求在到达 Application 的 `findClass` 之前就已经被满足并返回了。反过来，若 Bootstrap 与 Platform 都返回「找不到」，Application 才会调用自己的 `findClass` 去读 classpath。',
                },
              },
              {
                kind: 'question',
                title: '如何打破双亲委派模型？为什么 SPI、Tomcat 要打破？',
                questionId: 'java-04-Q56',
                intent:
                  '「怎么打破」有三种手段，「为什么打破」要能分别对应到 SPI 与 Tomcat 的具体约束。',
                points: [
                  '**手段一：重写 `loadClass()`**。不调 `parent.loadClass`，或「先自己找、找不到再委派」。Tomcat 的 `WebappClassLoader` 就是这种「反序委派」',
                  '**手段二：线程上下文类加载器（TCCL）**。用 `Thread.currentThread().getContextClassLoader()` 拿到的加载器去加载，从而「反向委托」给子加载器',
                  '**手段三：JDK 9 模块化的按模块委派**。委派目标由模块图决定，不再固定是父加载器',
                  '**SPI 为什么必须打破**：`DriverManager` 由 Bootstrap 加载，但它要实例化 `com.mysql.cj.jdbc.Driver`——这个类在应用 classpath 上，Bootstrap「看不见」。于是 JDK 用 TCCL（默认就是 Application 加载器）反向加载实现类',
                  '**Tomcat 为什么必须打破**：① 多个 Web 应用可能依赖同一个库的**不同版本**，必须隔离；② Tomcat 自身依赖的类不能与应用类冲突；③ JSP 热更新需要「丢弃旧加载器 + 新建加载器」来卸载类',
                  '**热部署 / OSGi**：每个模块/bundle 一个加载器，卸载加载器即「卸载类」。这也是「类卸载」在工程上唯一可行的路径',
                  '**代价**：打破委派后「类的唯一性」不再由委派链保证，容易出现 `ClassCastException`（同名不同加载器）、`LinkageError`（重复定义）、内存泄漏（加载器未释放）',
                ],
                depth:
                  'TCCL 的设计很值得玩味：它本质上是「**在单继承的加载器层次之外，额外挂一条可配置的旁路**」。`Thread.setContextClassLoader()` 让调用方可以指定「用哪个加载器去加载 SPI 实现」，从而把「父加载器无法看见子类」的单向限制打破。JDK 里所有 SPI 都走这条路：JDBC、JNDI、JAXP、ServiceLoader。**代价是 TCCL 成了一个隐式参数**——框架代码里到处 `Thread.currentThread().getContextClassLoader()`，一旦某个框架把 TCCL 改坏（或线程池复用线程时没恢复），就会出现「类加载不到的灵异问题」。这也是很多容器在提交任务前显式保存/恢复 TCCL 的原因。',
                followup:
                  '「Tomcat 的类加载顺序具体是什么」——`WebappClassLoader` 的顺序是：① 先查本地缓存 → ② 查 JDK 核心类（`javax.servlet` 等由容器提供，必须委派）→ ③ **自己加载** `WEB-INF/classes` 与 `WEB-INF/lib` → ④ 最后才委派给父加载器（Common 加载器）。注意第 ② 步的例外清单：`jakarta.*` / `javax.*` 这类规范 API 必须由容器加载，否则应用自带的 servlet-api 会与容器冲突。这个「反序 + 白名单」的设计，是「隔离」与「共享」的折中。',
              },
              {
                kind: 'diagram',
                title: '三种打破方式与它们各自的约束',
                body: [
                  '打破委派不是为了炫技，每种方式都是被一个具体约束逼出来的。这张树按「谁需要它」组织。',
                ],
                diagram: {
                  type: 'tree',
                  root: {
                    label: '打破双亲委派',
                    note: '本质：让「加载权」不再单向向上',
                    children: [
                      {
                        label: '重写 loadClass()',
                        note: '反序委派：先自己找',
                        tone: 'warn',
                        children: [
                          { label: 'Tomcat WebappClassLoader', note: '多应用隔离 + JSP 热更新' },
                          { label: '自定义「类优先」加载器', note: '补丁类覆盖、字节码增强' },
                        ],
                      },
                      {
                        label: '线程上下文类加载器',
                        note: 'TCCL：反向委托给子加载器',
                        tone: 'primary',
                        children: [
                          { label: 'JDBC / JNDI / JAXP', note: '父加载器看不见实现类' },
                          { label: 'ServiceLoader', note: 'SPI 的标准实现路径' },
                        ],
                      },
                      {
                        label: '模块化 / 容器化加载',
                        note: '按模块图或 bundle 委派',
                        tone: 'primary',
                        children: [
                          { label: 'JDK 9 JPMS', note: '委派目标由模块图决定' },
                          { label: 'OSGi', note: '每 bundle 一个加载器 + 版本隔离' },
                        ],
                      },
                    ],
                  },
                  caption:
                    '三条路径的共同点是「**改变了『谁能看见谁』的默认假设**」：默认假设是「父看得见、子看不见父之外的东西」；Tomcat 要让「子优先」，SPI 要让「父借用子的视野」，OSGi 要让「兄弟之间按需可见」。理解了这条，就不用记三种实现细节——**任何让「加载权」偏离单向链的做法，都算打破双亲委派**。',
                },
              },
              {
                kind: 'question',
                title: '自定义类加载器要重写 loadClass() 还是 findClass()？',
                questionId: 'java-04-Q57',
                intent:
                  '标准答案：**默认重写 `findClass()`**，因为它保留双亲委派；只有要打破时才重写 `loadClass()`。',
                points: [
                  '**默认选 `findClass()`**：`loadClass()` 已经实现了完整的委派逻辑（查缓存 → 委派父 → 调 `findClass`），JDK 明确建议不要改动它',
                  '**`findClass()` 里做什么**：按自定义位置读字节码（文件 / 网络 / 数据库 / 解密），拿到 `byte[]` 后调 `defineClass(name, bytes, 0, len)` 生成 `Class`',
                  '**什么时候才重写 `loadClass()`**：需要打破双亲委派时（Tomcat 的「先自己加载」、热部署的「强制重新加载」）。重写时要自己处理「已加载检查」与「委派顺序」',
                  '**`defineClass` 与 `resolveClass` 的分工**：`defineClass` 把 `byte[]` 转成 `Class` 对象（**不链接**）；`resolveClass` 触发链接（验证 + 准备 + 解析），**可以省略**（首次使用时自动链接）',
                  '**一个常见坑**：`defineClass` 的 `name` 参数必须与字节码里的类名一致，否则抛 `NoClassDefFoundError: wrong name`',
                  '**另一个坑**：同一个类名在同一个加载器里**不能 `defineClass` 两次**，会抛 `LinkageError: duplicate class definition`——热部署必须换新加载器',
                ],
                depth:
                  '为什么 `defineClass` 之后通常还要调 `resolveClass`？因为 `defineClass` 只完成「把字节流转成方法区结构 + 堆中 `Class` 对象」，**不做验证与链接**。若不立即 `resolveClass`，验证会延迟到第一次使用时，届时抛出的异常栈会指向「使用点」而不是「加载点」，排查困难。所以主流写法是「`defineClass` 后紧跟 `resolveClass`」，把错误暴露在加载阶段。JDK 的 `URLClassLoader` 内部就是这么做的。',
                followup:
                  '「为什么热部署一定要新加载器」——因为「类的身份」是 `(加载器, 全限定名)`。同一个加载器下重复 `defineClass` 会抛 `LinkageError`；而换一个新加载器，就得到一个新的 `Class` 对象，可以与旧的并存（旧的等所有实例与引用消失后被卸载）。这也是「热部署的内存泄漏」高发点：**旧加载器被某个静态字段、线程、TCCL 或 `ThreadLocal` 持有**，导致它加载的整个类世界都无法卸载。',
              },
              {
                kind: 'handwrite',
                title: '手写一个从指定目录加载 class 的类加载器',
                lang: 'java',
                prompt:
                  '面试官：「实现一个类加载器，能从指定目录读 `.class` 文件并加载，要求保留双亲委派；再说明如果要实现「同名类优先自己加载」该怎么改。」评分点在「重写 `findClass` 而非 `loadClass`」「`defineClass` + `resolveClass` 配合」「资源关闭」三处。',
                signature:
                  'class DirClassLoader extends ClassLoader {\n    DirClassLoader(Path root);                    // 从 root 目录读 .class\n    DirClassLoader(Path root, ClassLoader parent); // 指定父加载器\n    @Override protected Class<?> findClass(String name);\n}',
                plan: [
                  {
                    title: '只重写 findClass：保留委派',
                    detail:
                      '`loadClass()` 里的「查缓存 → 委派父 → 调 `findClass`」是标准逻辑，不要动。重写 `findClass` 的语义是「**只有当父加载器都找不到时，我才去我自己的目录里找**」——这正是双亲委派想要的行为。',
                  },
                  {
                    title: '类名 → 文件路径的映射',
                    detail:
                      '全限定名 `com.foo.Bar` 对应 `com/foo/Bar.class`。转换方式：`name.replace(\'.\', \'/\') + ".class"`。注意**内部类**的名字是 `com.foo.Bar$Inner`，其中 `$` 不需要替换。',
                  },
                  {
                    title: 'defineClass + resolveClass',
                    detail:
                      '`defineClass(name, bytes, 0, bytes.length)` 把字节数组转成 `Class`；紧接着 `resolveClass(clazz)` 触发链接，让验证错误在加载阶段暴露。注意 `name` 必须与字节码内的类名一致。',
                  },
                  {
                    title: '失败时的语义',
                    detail:
                      '找不到文件要抛 `ClassNotFoundException`（不是返回 null）——这是 `findClass` 的契约，`loadClass` 依赖它来判断「该不该继续往上/往下找」。',
                  },
                  {
                    title: '如果要打破委派',
                    detail:
                      '重写 `loadClass()`：先 `findLoadedClass` 查缓存 → 再自己 `findClass` → 失败才 `parent.loadClass`（顺序反过来）。同时要注意 `java.*` 这类核心包**必须仍然委派**，否则会抛 `SecurityException: Prohibited package name`。',
                  },
                ],
                skeleton:
                  'class DirClassLoader extends ClassLoader {\n    private final Path root;\n\n    DirClassLoader(Path root) { this.root = root; }\n    DirClassLoader(Path root, ClassLoader parent) { super(parent); this.root = root; }\n\n    @Override\n    protected Class<?> findClass(String name) throws ClassNotFoundException {\n        // TODO: 1) 全限定名 → 相对路径\n        //       2) 读字节（文件不存在则 ClassNotFoundException）\n        //       3) defineClass + resolveClass\n        //       4) 任何 IO 异常包成 ClassNotFoundException\n        return null;\n    }\n}',
                solution:
                  'class DirClassLoader extends ClassLoader {\n    private final Path root;\n\n    DirClassLoader(Path root) { this.root = root; }\n    DirClassLoader(Path root, ClassLoader parent) { super(parent); this.root = root; }\n\n    @Override\n    protected Class<?> findClass(String name) throws ClassNotFoundException {\n        Path file = root.resolve(name.replace(\'.\', \'/\') + ".class");\n        if (!Files.isRegularFile(file)) {\n            throw new ClassNotFoundException(name);   // 契约：明确抛，不返回 null\n        }\n        try (InputStream in = Files.newInputStream(file)) {\n            byte[] bytes = in.readAllBytes();\n            Class<?> clazz = defineClass(name, bytes, 0, bytes.length);\n            resolveClass(clazz);                      // 立刻链接，让验证错误在此暴露\n            return clazz;\n        } catch (IOException e) {\n            throw new ClassNotFoundException(name, e);\n        }\n    }\n}\n\n// 打破委派的反序版本（仅示意，java.* 必须仍委派）\nclass ChildFirstLoader extends ClassLoader {\n    @Override\n    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {\n        if (name.startsWith("java.")) {                // 核心包不能抢\n            return super.loadClass(name, resolve);\n        }\n        Class<?> c = findLoadedClass(name);\n        if (c == null) {\n            try {\n                c = findClass(name);                    // 先自己找\n            } catch (ClassNotFoundException ignored) {\n                c = super.loadClass(name, resolve);     // 再委派\n            }\n        }\n        if (resolve) resolveClass(c);\n        return c;\n    }\n}',
                complexity:
                  '加载一个类的成本 = 磁盘 IO（一次读文件）+ `defineClass`（解析字节码、分配方法区结构）+ `resolveClass`（验证 + 链接）。整体是 O(类文件大小)，且**每个类只发生一次**（之后走缓存）。',
                traps: [
                  '重写 `loadClass()` 却忘了先 `findLoadedClass`：同一个类被 `defineClass` 两次，抛 `LinkageError: duplicate class definition`',
                  '`defineClass` 的 name 与字节码内类名不一致：抛 `NoClassDefFoundError: wrong name`',
                  '`findClass` 找不到时返回 null 而不是抛异常：`loadClass` 的委派逻辑会误判为「父加载器已成功」',
                  '反序委派时没有对 `java.*` 开白名单：抛 `SecurityException: Prohibited package name: java.lang`',
                  '忘记 `resolveClass`：验证错误延迟到首次使用，异常栈指向业务代码，排查困难',
                  '读完流不关闭：Windows 下文件句柄泄漏，热部署时无法删除或替换 class 文件',
                ],
              },
              {
                kind: 'question',
                title: '两个全限定名相同的类一定是同一个类吗？',
                questionId: 'java-04-Q58',
                intent:
                  '收尾题，也是全课的理论落点：**类的身份 = 全限定名 + 加载器实例**。答出这句，前面所有隔离与热部署的机制都能串起来。',
                points: [
                  '**不一定**。JVM 中类的唯一性由 **(类加载器实例, 全限定名)** 共同决定，缺一不可',
                  '**后果一**：同一个类被两个不同的 `ClassLoader` 加载，会产生两个不相等的 `Class` 对象。`a.getClass() == b.getClass()` 为 false',
                  '**后果二**：`instanceof` 返回 false，`equals` 返回 false，强制转换抛 `ClassCastException`（错误信息通常是 `cannot be cast to com.Foo`，看起来「明明是同一个类」）',
                  '**后果三**：静态字段不共享。两个 `Class` 各有自己的静态区，所以「单例」在跨加载器时失效',
                  '**这正是隔离的实现方式**：Tomcat 给每个 Web 应用一个加载器，同名类各有一份，互不干扰；OSGi 让不同 bundle 用不同版本的同一个库',
                  '**这也是热部署的前提**：换新加载器 → 得到新 `Class` → 旧加载器连同它加载的所有类一起被卸载',
                ],
                depth:
                  '为什么 JVM 要这样设计？因为类加载器是「**命名空间**」的载体。若唯一性只看全限定名，那「同一 JVM 里加载同一个库的两个版本」就不可能实现——后加载的会覆盖先加载的。引入加载器维度后，每个加载器自成命名空间，冲突被限制在命名空间之内。代价是「跨界传递对象」时容易出问题：从加载器 A 的对象传给加载器 B 的代码，即使类名相同也会 `ClassCastException`。**所有「类加载器泄漏」的排查，本质都是在找「谁跨越了命名空间边界」**。',
                followup:
                  '「怎么排查 `ClassCastException: cannot be cast to X` 但明明类型对得上」——先打印两个对象的 `getClass().getClassLoader()`，若不同就是命名空间问题。这类故障的典型场景：SPI 实现被两个加载器各加载一次（如 Tomcat 里 `WEB-INF/lib` 与容器 `lib` 都有同一个驱动包）、`ThreadLocal` 缓存了旧加载器的对象、序列化框架用 TCCL 反序列化导致类来自另一个加载器。修法通常是「把该类收敛到同一个加载器」或「用序列化/反射做跨界传递」。',
              },
              {
                kind: 'diagram',
                title: '同一个类名，两个加载器，两个「类」',
                body: [
                  '这张图是本课所有结论的交汇点：同样叫 `com.Foo`，在两个加载器下是互不相识的两个类型，静态字段也各有一份。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: 'ClassLoader A',
                      note: '命名空间 A',
                      slots: [
                        { label: 'com.Foo', value: 'Class@A', tone: 'primary' },
                        { label: 'static COUNT', value: '1（A 的副本）', tone: 'primary' },
                        { label: 'getName()', value: 'com.Foo', tone: 'muted' },
                      ],
                    },
                    {
                      name: 'ClassLoader B',
                      note: '命名空间 B',
                      slots: [
                        { label: 'com.Foo', value: 'Class@B', tone: 'warn' },
                        { label: 'static COUNT', value: '999（B 的副本）', tone: 'warn' },
                        { label: 'getName()', value: 'com.Foo', tone: 'muted' },
                      ],
                    },
                    {
                      name: '跨界的判定',
                      note: 'A 的对象拿到 B 的代码里',
                      slots: [
                        { label: 'A == B ?', value: 'false', tone: 'warn' },
                        { label: 'instanceof', value: 'false', tone: 'warn' },
                        { label: '强转', value: 'ClassCastException', tone: 'bad' },
                      ],
                    },
                  ],
                  caption:
                    '注意第三块的三个结论是**连带**的：`Class` 对象不等 → `instanceof` 必为 false → 强转必失败。而 `getName()` 完全相同（都是 `com.Foo`），这就是错误信息看起来「莫名其妙」的原因。排查这类问题的第一动作永远是打印 `getClassLoader()`，而不是盯着类名。',
                },
              },
              {
                kind: 'principle',
                title: '把类加载压成一条因果链',
                body: [
                  '类加载的知识点很碎，但它们串起来只有一条主线：**「唯一性」由谁来定义，决定了「隔离」能做到什么程度**。',
                ],
                steps: [
                  {
                    title: '① 阶段决定「何时可用」',
                    detail:
                      '五个阶段里，**准备赋零值、初始化赋值、解析可延迟**这三点决定了「什么时候能读到正确的静态值」「什么时候会报链接错误」。所有「静态字段读到 0」「类初始化卡住」的问题都在这一层。',
                  },
                  {
                    title: '② 触发决定「何时发生」',
                    detail:
                      '六种主动引用是精确的触发开关。工程价值在于：**你可以通过「读常量」故意不触发初始化**（比如工具类只想取一个字符串常量，不想触发它的静态块去连数据库）。',
                  },
                  {
                    title: '③ 委派决定「谁来加载」',
                    detail:
                      '`loadClass` 的三段（查缓存 → 委派父 → `findClass`）是双亲委派的全部实现。它保证了核心类唯一与沙箱安全，但**只在单条委派链内有效**。',
                  },
                  {
                    title: '④ 唯一性决定「能隔离到什么程度」',
                    detail:
                      '`(加载器, 全限定名)` 二元组是隔离的物理基础。Tomcat 的多应用隔离、OSGi 的多版本共存、热部署的卸载，全是「换加载器 = 换命名空间」的推论。',
                  },
                  {
                    title: '⑤ 代价：命名空间边界上的摩擦',
                    detail:
                      '隔离不是免费的：跨界传对象会 `ClassCastException`、加载器没释放会内存泄漏、TCCL 被改坏会「类找不到」。**所有类加载器相关的线上问题，都是这三类摩擦的变体。**',
                  },
                ],
                takeaway:
                  '一句话：**「类」在 JVM 里不是一个名字，而是一个「名字 + 命名空间」的组合**。理解了这一层，双亲委派就不再是需要背的三条作用，而是「如何让同名类尽量落在同一个命名空间」的工程约定；打破委派也不是「破坏规则」，而是「显式地划出新的命名空间」。这条主线一旦打通，Tomcat 隔离、SPI、热部署、`ClassCastException` 排查就都成了同一件事的不同侧面。',
              },
            ],
          },
        },
        {
          id: 'jvm-tuning',
          title: '调优实战与故障排查',
          kind: 'concept',
          sources: [{ topic: 'java-04', chapters: ['调优实战'] }],
          content: {
            intro:
              '调优不是背参数，而是先定位问题类型：是内存泄漏、GC 参数不合理，还是线程阻塞。这一节给出一套可复用的排查顺序——先用监控确定现象，再用 `jstat` 看 GC 频率与停顿，用 `jmap` 导出堆看对象分布，用 `jstack` 看线程栈，最后才谈参数。四类高频故障（CPU 飙高、内存泄漏、频繁 Full GC、GC 日志分析）各配一条固定的操作路径，末尾给一个可以直接照着讲的调优案例模板。核心原则只有一条：**先取证，再归因，最后才动手**。',
            outline: [
              '参数分四类记：内存布局、收集器选择、诊断转储、日志输出',
              'CPU 飙高的四步是 top → top -Hp → printf 转十六进制 → jstack，先分清是业务线程还是 GC 线程',
              '内存泄漏用 dump + 支配树 + 到 GC Roots 的引用链三步定位，Shallow 与 Retained 要分清',
              '频繁 Full GC 必先看日志里的触发原因，六类原因对应六种完全不同的对策',
            ],
            pitfalls: [
              '一上来就调参数，不先确认是内存泄漏还是参数问题',
              '生产上随手执行 jmap -dump，忽略它会触发 Full GC 并造成长时间停顿',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：从「现象」到「根因」的三层漏斗',
                body: [
                  '线上问题的排查有个固定形状：**现象 → 证据 → 根因**。现象是「接口变慢」「CPU 90%」「Full GC 频繁」这类告警；证据是 `jstat` 的数字、`jstack` 的栈、堆快照里的对象分布；根因则是「Survivor 太小导致过早晋升」这种可以动手改的东西。跳过中间层直接猜根因，就是「调参玄学」的来源。',
                  '本课按四类现象组织：**① CPU 飙高**（线程维度）、**② 内存泄漏**（对象维度）、**③ Full GC 频繁**（GC 维度）、**④ 日志看不懂**（数据维度）。每一类都给出「取哪个证据、怎么读、结论怎么下」的固定路径。参数与工具放在最前面讲，因为它们是取证的手段——**没有工具，所有分析都是猜**。',
                ],
                points: [
                  '**取证工具链**：`jps` 找进程、`jstat` 看 GC、`jmap` 看堆、`jstack` 看线程、`jcmd` 一把梭',
                  '**判定顺序**：先分清「是 GC 导致的慢」还是「业务代码慢」，这一步能砍掉一半的误判',
                  '**核心指标**：GC 频率、单次停顿、Full GC 后老年代是否回落、晋升速率',
                  '**动手纪律**：一次只改一个参数，改完压测对比，否则无法归因',
                ],
              },
              {
                kind: 'question',
                title: '常用的 JVM 参数有哪些？',
                questionId: 'java-04-Q59',
                intent:
                  '不要报菜单式罗列。按「内存布局 / 收集器 / 诊断 / 日志」四类分组，每类点出 2~3 个必配项，比背 20 个参数有效。',
                points: [
                  '**内存布局**：`-Xms` / `-Xmx`（生产建议**设成相同**，避免堆动态扩缩引起震荡）、`-Xmn`（新生代）、`-Xss`（线程栈，默认 1MB）、`-XX:MetaspaceSize` / `MaxMetaspaceSize`',
                  '**比例与晋升**：`-XX:SurvivorRatio`（Eden : 单个 Survivor，默认 8）、`-XX:NewRatio`（老年代 : 新生代，默认 2）、`-XX:MaxTenuringThreshold`（默认 15）',
                  '**收集器选择**：`-XX:+UseG1GC` / `+UseZGC` / `+UseParallelGC`；配套 `-XX:MaxGCPauseMillis`（G1 默认 200ms）、`-XX:G1HeapRegionSize`、`-XX:InitiatingHeapOccupancyPercent`（默认 45）',
                  '**诊断转储**：`-XX:+HeapDumpOnOutOfMemoryError` + `-XX:HeapDumpPath=/data/dump`（**几乎必配**）、`-XX:+ExitOnOutOfMemoryError`（OOM 后直接退出，交给容器重启）',
                  '**日志**：JDK 8 用 `-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log`；JDK 9+ 统一为 `-Xlog:gc*:file=gc.log:time,uptime:filecount=5,filesize=10m`',
                  '**线程数**：`-XX:ParallelGCThreads`（并行 GC 线程）、`-XX:ConcGCThreads`（并发 GC 线程，通常取并行数的 1/4）',
                  '**参数前缀的差别**：`-X` 是非标准参数（各实现可能不同）、`-XX` 是高级/不稳定参数（不同版本可能消失，如 `CMSInitiatingOccupancyFraction` 在 JDK 14 后失效）',
                ],
                depth:
                  '`-Xms` 与 `-Xmx` 为什么要设成相同？因为若两者不等，堆会随压力**动态扩缩**：扩容要申请内存并向 OS 提交页（可能触发缺页中断），缩容后又要重新扩——表现在监控上就是「堆大小锯齿」。更隐蔽的代价是「**扩缩本身会触发 Full GC**」（G1 与 Parallel 在调整堆大小时需要一次全局停顿）。容器环境还要额外注意：JDK 8u191+ 与 JDK 10+ 支持 `-XX:MaxRAMPercentage`（按容器 limit 的百分比设堆），比写死 `-Xmx` 更适应弹性规格。',
                followup:
                  '「`-Xss` 设大有什么代价」——每个线程的栈是独立分配的，`-Xss` 越大，同样内存下能创建的线程越少。`-Xss` 默认 1MB，若设成 8MB，一个 512MB 的堆外空间只够 64 个线程。所以「加大 `-Xss` 解决 `StackOverflowError`」要谨慎：正确做法是先看是不是真的递归过深（改代码），而不是无脑加。反过来，若要创建上万个线程，应减小 `-Xss`（如 256KB）或用虚拟线程。',
              },
              {
                kind: 'diagram',
                title: '参数按用途分四类',
                body: [
                  '二十多个参数看着杂，其实只有四类用途。按类记，比按字母背强得多——排查时你要找的是「哪一类参数决定了这个现象」。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['类别', '核心参数', '决定什么', '配错的表现'],
                  cols: ['核心参数', '决定什么', '配错的表现'],
                  rows: [
                    ['内存布局', '`-Xms` `-Xmx` `-Xmn` `-Xss`', '堆大小与代际比例', '堆锯齿、频繁 GC、线程创建失败'],
                    ['收集器', '`UseG1GC` `MaxGCPauseMillis` `IHOP`', '停顿与吞吐的取舍', '停顿超标、Evacuation Failure'],
                    ['诊断转储', '`HeapDumpOnOutOfMemoryError`', '故障现场能否留存', '**OOM 后无现场，无法定位**'],
                    ['日志输出', '`Xlog:gc*` / `PrintGCDetails`', '分析的原始素材', '只能靠猜，无法归因'],
                  ],
                  caption:
                    '第三行是最容易被忽略、代价却最大的一类：**诊断参数不产生性能收益，只在出事时决定你「有没有现场」**。生产上「OOM 却拿不到堆快照」是最常见的遗憾，而配它只需要两个参数。这也是「保命参数」这个说法的由来——它与调优无关，与可观测性有关。',
                },
              },
              {
                kind: 'question',
                title: 'jps、jstat、jmap、jstack、jinfo、jcmd 分别是干什么的？',
                questionId: 'java-04-Q60',
                intent:
                  '六个工具要能说出「什么时候用它」。最后一句话（`jmap -dump` 会让应用停住）是实战分水岭。',
                points: [
                  '**`jps`**：列出 Java 进程（相当于 `ps` + 主类名）。`jps -lv` 还能看到 JVM 参数与主类全名',
                  '**`jstat`**：GC 统计。`jstat -gcutil <pid> 1000` 每秒输出各区使用率、GC 次数与耗时——**排查 GC 问题的第一命令**',
                  '**`jmap`**：堆信息。`-histo` 出对象直方图（哪个类占得多），`-dump:format=b,file=heap.hprof` 导出堆快照',
                  '**`jstack`**：线程快照。定位死锁（`Found one Java-level deadlock`）、CPU 飙高（按 nid 找栈）、线程池打满',
                  '**`jinfo`**：查看/动态修改部分参数。`-flags` 看全部参数，`-flag +PrintGC` 可在运行时打开（仅限 manageable 参数）',
                  '**`jcmd`**：综合诊断（JDK 7+，**官方推荐替代前几个**）。`VM.flags` / `GC.heap_info` / `Thread.print` / `GC.class_histogram` / `VM.native_memory`',
                  '**风险提示**：`jmap -dump` 与 `jmap -histo:live` 都会**触发一次 Full GC**（要拿一致快照），大堆上可能停顿数秒到数十秒。生产上应先摘流量，或优先用 `-XX:+HeapDumpOnOutOfMemoryError` 事前配置',
                ],
                depth:
                  '为什么 `jmap -dump` 要触发 Full GC？因为堆转储需要一个「所有对象都不再移动、引用关系静止」的一致视图——否则边 dump 边分配，得到的快照里可能有「指向已回收对象的引用」或「半个对象」。Full GC（尤其是带压缩的）恰好提供了这个静止点。JDK 的 `HeapDumper` 内部会调用 `VM_GC_HeapInspection`，它在 dump 前先做一次 `full_gc`。**这也是 `jcmd GC.heap_dump` 同样会停顿的原因**——换工具不改变机制。',
                followup:
                  '「容器里没有这些工具怎么办」——精简镜像（如 `openjdk:slim`、Alpine 版）常常不带 JDK 工具。三个办法：① 换成 JDK 而非 JRE 基础镜像；② 用 `jattach`（几十 KB 的静态二进制，可 attach 到容器内进程，然后调 `jcmd` 的功能）；③ 用 Arthas 的 `arthas-boot.jar` 直接 attach。K8s 环境下还要注意 `pid=1` 的进程与 `--pid=host` 的命名空间差异。',
              },
              {
                kind: 'question',
                title: 'Arthas 了解吗？说说常用命令。',
                questionId: 'java-04-Q61',
                intent:
                  '这题考「有没有真用过」。答出 attach 原理 + 三个最能体现价值的高级命令（`watch` / `trace` / `jad`）就够了。',
                points: [
                  '**是什么**：阿里开源的 Java 在线诊断工具，通过 **attach 机制**挂到运行中的 JVM 上，**无需重启、无需改代码**',
                  '**`dashboard`**：实时总览（线程、内存、GC），相当于「终端版监控大屏」',
                  '**`thread`**：`thread -n 3` 找 CPU 最高的 3 个线程；`thread <tid>` 看栈；`thread -b` 直接找阻塞其他线程的「元凶」；`thread --state BLOCKED` 找阻塞线程',
                  '**`jad <class>`**：**反编译线上代码**——用来确认「线上跑的到底是不是我以为的那版」。这是排查「代码明明改了但没生效」的利器',
                  '**`watch <class> <method> "{params, returnObj}"`**：观察方法入参/返回值，条件过滤（`-x 2` 展开层级），不改代码就能看运行时数据',
                  '**`trace <class> <method> "#cost > 100"`**：输出调用链路上每个节点的耗时，直接定位「哪个子调用慢」',
                  '**`tt`（Time Tunnel）**：记录每次调用的入参出参与返回值，事后回放重放——复现「偶发」问题的利器',
                  '**`profiler start/stop`**：集成 async-profiler，生成 CPU/内存火焰图；`heapdump` 导堆快照',
                ],
                depth:
                  'Arthas 的 attach 原理值得知道：它通过 `com.sun.tools.attach.VirtualMachine` 把一个小 agent jar **动态加载**到目标 JVM 里（`VirtualMachine.loadAgent`），然后在目标进程内起一个 telnet/HTTP 服务。这意味着两件事：**① 它有权限做几乎任何事**（改字节码、读私有字段），生产上要严格控制访问；**② 卸载不干净会留下 agent 类**（占 Metaspace，被 `ClassLoader` 持有）。所以「用完 `stop` 退出」不只是礼貌，而是避免污染目标进程。',
                followup:
                  '「Arthas 和 jstack 比好在哪」——`jstack` 只能给你「某一瞬间的线程栈」，CPU 飙高时你要手动把 TID 转成十六进制再去 grep；Arthas 的 `thread -n 3` 一步就给「最忙的三个线程 + 栈 + 占比」，还自带 `-b` 找阻塞源。更关键的是 `watch` / `trace` / `tt`——**它们能看到「方法被调用了什么参数、返回了什么」**，这是 `jstack` 完全做不到的维度。',
              },
              {
                kind: 'question',
                title: 'Java 进程 CPU 飙高，怎么排查？',
                questionId: 'java-04-Q62',
                intent:
                  '经典题，四步必须背得下来。真正拉开差距的是最后一句：**先分清是业务线程还是 GC 线程**。',
                points: [
                  '**① 找进程**：`top` 找到 CPU 最高的 Java 进程 PID',
                  '**② 找线程**：`top -Hp <pid>` 找到该进程内 CPU 最高的线程 TID',
                  '**③ 转十六进制**：`printf \'%x\\n\' <tid>`——`jstack` 里的 `nid` 是十六进制，这一步最容易忘',
                  '**④ 定位栈**：`jstack <pid> | grep -A 30 0x<nid>`（或 Arthas：`thread <tid>`），看到具体代码行',
                  '**关键判断一：是业务线程还是 GC 线程**。看到 `http-nio-xxx-exec` → 代码热点；看到 `GC task thread` / `G1 Young RemSet Sampling` → **是 GC 问题，去查 `jstat` 与 GC 日志，不要改代码**',
                  '**关键判断二：多采样几次**。单次 `jstack` 可能撞在偶然的热点上，连续 3~5 次（间隔 1 秒）都指向同一段代码，才算是稳定热点',
                  '**常见业务侧根因**：死循环（`while(true)` 无退出）、正则回溯爆炸（`(a+)+b` 这类）、频繁序列化/加密、日志同步阻塞、无限重试',
                  '**常见 GC 侧根因**：频繁 Full GC（CPU 全在 GC 线程上）、堆太小导致 GC 停不下来。此时「CPU 高」只是症状，真因在 GC',
                ],
                depth:
                  '为什么必须转十六进制？因为 `jstack` 输出里的 `nid=0x6a3c` 是**操作系统的原生线程 ID**（Linux 上是 `tid`），而 `top -Hp` 给的 TID 是十进制。这一步没有工具能省（除了 Arthas 内部帮你转）。另外注意：Java 线程的 `tid`（`Thread.getId()`）与 OS 的 `nid` 是**两套编号**，很多人会拿 `Thread.getId()` 去 grep `nid`，永远找不到——这是排查里最常见的弯路之一。',
                followup:
                  '「CPU 100% 但 jstack 里看不到忙的线程」有两种可能：① **GC 线程没被采样到**——`jstack` 默认会跳过部分 VM 内部线程，用 `jcmd <pid> Thread.print -l` 或直接看 `jstat`；② **JIT 编译线程**（`C2 CompilerThread`）在编译大方法，这是正常的启动期现象。还有一种极端情况是「native 代码在跑」（如 JNI、`Unsafe`），`jstack` 只能显示到 native 方法名，需要用 `perf` 或 async-profiler 的 native 采样模式。',
              },
              {
                kind: 'diagram',
                title: 'CPU 飙高的四步定位链',
                body: [
                  '四个命令串成一条链，每一步的输出都是下一步的输入。第三步（转十六进制）是最容易漏的一环。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① top：找 CPU 最高的 Java 进程', note: '得到 PID' },
                    { label: '② top -Hp <pid>：找进程内最忙的线程', note: '得到十进制 TID' },
                    { label: '③ printf \'%x\' <tid>：转十六进制', note: '对应 jstack 里的 nid' },
                    { label: '④ jstack <pid> | grep -A 30 0xTID', note: '拿到栈，定位到代码行' },
                    { label: '⑤ 判断线程类型：业务线程 or GC 线程', note: '**这一步决定往哪查**' },
                  ],
                  caption:
                    '第 ⑤ 步是整个链条的分岔口：**GC 线程忙 → 问题在堆/GC；业务线程忙 → 问题在代码**。跳过这一步直接去改代码，就是「GC 打满 CPU，却在业务代码里找了三天」的经典事故。一个实用技巧：连续采 3 次栈（间隔 1 秒），若 3 次都在同一方法，基本可以锁定。',
                },
              },
              {
                kind: 'question',
                title: '内存泄漏和内存溢出怎么排查？',
                questionId: 'java-04-Q63',
                intent:
                  '这是「jmap + MAT」的标准流程题。必须区分 Shallow Heap 与 Retained Heap，并能说出「到 GC Roots 的引用链」这个动作。',
                points: [
                  '**先分清楚**：**内存溢出（OOM）**是「要不到内存」的瞬间失败；**内存泄漏**是「该回收的没回收」的长期累积。泄漏最终会导致溢出，但溢出不一定由泄漏引起（也可能就是堆太小）',
                  '**第一步：确认现象**。`jstat -gcutil <pid> 1000` 看 `O`（老年代使用率）是否**持续上涨**，且 **Full GC 后不回落**——这是泄漏的强信号',
                  '**第二步：拿快照**。优先事前配置 `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump`；需手动则 `jmap -dump:format=b,file=heap.hprof <pid>`（**会触发 Full GC**，先摘流量）',
                  '**第三步：MAT 分析**。先看 `Leak Suspects`（自动嫌疑报告）→ 再看 **Dominator Tree（支配树）**按 **Retained Heap** 排序',
                  '**第四步：找引用链**。对可疑对象执行 `Path to GC Roots`（排除弱引用/软引用），看「谁在持有它」——这一步直接指向代码位置',
                  '**Shallow vs Retained**：**Shallow Heap** 是对象自身占用；**Retained Heap** 是「该对象被回收后能释放的总量」（含它独占支配的所有对象）。排查要看 **Retained**',
                  '**常见根因**：本地缓存无界增长（`HashMap` 当缓存用、没设上限）、`ThreadLocal` 未 `remove`、监听器/回调注册后未注销、连接/流未关闭、类加载器泄漏（热部署）',
                ],
                depth:
                  '支配树（Dominator Tree）的原理值得理解：若「从 GC Roots 到对象 X 的所有路径都必须经过对象 A」，则 A **支配** X。MAT 据此建树，于是「Retained Heap」有了精确定义——**A 的 Retained Heap = A 自身 + 它支配的所有对象**。这比「按类统计实例数」精准得多：一个 `HashMap` 自身只有几十字节（Shallow 小），但它支配着几百万个 `Entry`（Retained 巨大）。所以排查泄漏的第一动作永远是「按 Retained Heap 排序看支配树」，而不是看直方图里哪个类实例最多。',
                followup:
                  '「两次 dump 对比怎么做」——在泄漏发生前后各 dump 一次（或用 `jmap -histo` 拿两次直方图），对比同一类的实例数增长。MAT 支持「Compare Basket」：把两份快照放一起，看哪些类的实例增量最大。这个方法的优势是**能排除「本来就该有那么多」的对象**（如常量池、单例缓存），只看增量，信噪比高得多。',
              },
              {
                kind: 'diagram',
                title: '泄漏排查的三段路径：现象 → 快照 → 引用链',
                body: [
                  '这条路径的每一步都有明确的「判断标准」，不是凭感觉。最关键的是第一步——用「Full GC 后是否回落」把「泄漏」和「堆不够」区分开。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① jstat -gcutil：老年代持续上涨？', note: '看 O 列与 FGC 列' },
                    { label: '② Full GC 后老年代回落吗？', note: '**不回落 = 泄漏嫌疑；回落 = 堆不够或过早晋升**' },
                    { label: '③ 拿堆快照（事前配置或 jmap -dump）', note: '优先 HeapDumpOnOutOfMemoryError' },
                    { label: '④ MAT：按 Retained Heap 排序看支配树', note: '不是看实例数最多的类' },
                    { label: '⑤ Path to GC Roots：谁在持有它', note: '排除弱引用/软引用，直接指向代码' },
                  ],
                  caption:
                    '第 ② 步的判据非常实用：**Full GC 是一次「彻底清扫」，若清扫后仍占着，说明这些对象确实可达**。所以「不回落」= 真泄漏（或真的大缓存），「回落但很快又涨满」= 分配速率过高或晋升过快。两类问题的解法完全不同：前者要改代码释放引用，后者要调堆与新生代。',
                },
              },
              {
                kind: 'question',
                title: '频繁 Full GC 怎么排查？',
                questionId: 'java-04-Q64',
                intent:
                  '这题的核心不是「有哪些原因」，而是「怎么用日志定位到具体那一条」。答出「先看触发原因字段」就赢了一半。',
                points: [
                  '**第一步：看 GC 日志的触发原因**（这是唯一正确的起点）。`Allocation Failure` / `Metadata GC Threshold` / `System.gc()` / `Ergonomics` / `Promotion Failed` 各自对应完全不同的根因',
                  '**原因一：老年代涨得快**（真实存活对象多）。两次 dump 对比找增长对象；若确实是大缓存，考虑设上限或改本地缓存为集中缓存',
                  '**原因二：过早晋升**（对象不该进老年代却进了）。看 Young GC 后的晋升量是否接近 Survivor 容量；对策是**调大新生代**，经验值是「老年代 ≈ 活跃对象的 2~3 倍」再反推',
                  '**原因三：元空间触发**（`Metadata GC Threshold`）。动态类生成过多或类加载器泄漏；`jcmd <pid> GC.class_histogram` 看类数量，或 `VM.metaspace` 看 Klass 增长',
                  '**原因四：显式调用**（`System.gc()`）。查代码与框架（RMI 的定时 GC、NIO 的 `DirectByteBuffer` 清理）；对策是去掉调用点，或 `-XX:+ExplicitGCInvokesConcurrent` 把它变成并发收集',
                  '**原因五：堆震荡**（`Xms != Xmx`，堆反复扩缩）。对策：`-Xms` = `-Xmx`',
                  '**原因六：收集器自身的失败模式**（CMS 的 `Concurrent Mode Failure`、G1 的 `Evacuation Failure`）。前者调低 CMS 触发阈值、避免大对象；后者调 IHOP 或 Region 大小',
                  '**纪律**：**一次只改一个参数**，改完压测对比。同时改三个参数，出问题时无法归因',
                ],
                depth:
                  '为什么「过早晋升」是最常见的真因？因为它同时满足两个条件：**现象上像泄漏（老年代一直涨），但实际上对象都是短命的**。此时你若去加大整堆，只是把 Full GC 的间隔从 40 分钟拉到 60 分钟——治标不治本。正确的动作是「**把对象留在新生代里死掉**」：调大新生代 → Survivor 变大 → 动态年龄判定推迟 → 短命对象在 Survivor 里就被回收，压根不进老年代。判断依据是 GC 日志里「每次 Young GC 的晋升量 / Survivor 容量」这个比值，接近 1 就是过猛。',
                followup:
                  '「老年代该设多大」——一个可用的经验法则是「**老年代 ≈ 活跃对象（Full GC 后的占用）的 2~3 倍**，剩余给新生代」。理由是：老年代要能容纳「两次 Full GC 之间晋升的对象」，还要留出浮动垃圾的余量。若活跃对象是 1GB、堆是 4GB，则老年代 2~3GB、新生代 1~2GB 是合理区间；若算出来新生代只剩 200MB，说明堆太小，该扩容而不是继续调比例。',
              },
              {
                kind: 'diagram',
                title: 'Full GC 六类原因与各自的对策',
                body: [
                  '这张表把「日志里的触发原因」直接对到「该动什么」。排查时先查日志字符串，再来这里取对策——比凭经验猜快得多。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['触发原因', '日志特征', '根因', '对策'],
                  cols: ['日志特征', '根因', '对策'],
                  rows: [
                    ['老年代不足', '`Allocation Failure`', '真实存活对象多 / 缓存无界', 'dump 对比、缓存设上限'],
                    ['过早晋升', '晋升量接近 Survivor 容量', '新生代 / Survivor 太小', '**调大新生代**'],
                    ['元空间不足', '`Metadata GC Threshold`', '动态类生成 / 类加载器泄漏', '查类数量、修泄漏'],
                    ['显式调用', '`System.gc()`', 'RMI / NIO / 框架调用', '去调用点或转并发'],
                    ['堆震荡', '堆大小反复变化', '`Xms != Xmx`', '两者设为相同'],
                    ['收集器失败', '`Concurrent Mode Failure`', 'CMS 并发跟不上分配', '调早触发阈值、避免大对象'],
                  ],
                  caption:
                    '第二行「过早晋升」被标黑，因为它是**最容易被误判成第一行**的一类：现象都是「老年代一直涨」，但对策完全相反——第一行要加内存/清缓存，第二行要**调大新生代**。区分方法就是看晋升量与 Survivor 容量的比值。这也说明为什么「先看日志原因」不是形式主义：**同样的现象，原因不同，对策可能就是反向的**。',
                },
              },
              {
                kind: 'question',
                title: 'GC 日志怎么分析？JDK 8 和 JDK 9+ 有什么不同？',
                questionId: 'java-04-Q65',
                intent:
                  '两套参数体系要能分开说（**不能混用**）。更强的答法是「能当场口头还原一条日志」。',
                points: [
                  '**JDK 8 参数**：`-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log`（还有 `-XX:+PrintGCTimeStamps`、`-XX:+PrintHeapAtGC`）',
                  '**JDK 9+ 参数**：统一日志框架 `-Xlog:gc*:file=gc.log:time,uptime,level,tags:filecount=5,filesize=10m`（内置轮转，不再需要外部切割）',
                  '**两套不能混用**：JDK 9+ 上写 `-XX:+PrintGCDetails` 会告警并失效；反之亦然。迁移时要整段替换',
                  '**看什么（四件事）**：① **触发原因**；② **回收前后各代占用变化**（算晋升量）；③ **停顿时间**与频率（算分配速率 MB/s）；④ **Full GC 的频率与单次耗时**',
                  '**一条 Parallel 日志的读法**：`[GC (Allocation Failure) [PSYoungGen: 51200K->6144K(59392K)] 51200K->6200K(194560K), 0.0123 secs]` —— 括号里是「回收前→回收后(总容量)」，最后是停顿秒数。**冒号前后的差值就是这次晋升到老年代的对象量**',
                  '**G1 额外要看**：`Pause Young (Normal)` / `(Concurrent Start)` / `Pause Mixed` / `Pause Full` 四种停顿类型、`Evacuation Failure`、`Humongous` 分配、并发标记周期的起止',
                  '**工具**：gceasy.io（在线，自动出报告）、GCViewer（离线）、JFR + JMC（最完整，含分配采样）',
                ],
                depth:
                  '为什么能从日志算出「分配速率」？因为「两次 Young GC 之间的间隔」与「这段时间 Eden 被填满的量」共同给出了速率：若 Eden 是 512MB、每 5 秒一次 Young GC，则分配速率约 **100MB/s**。这个数字非常有用：它决定「GC 必须多快才能跟上」。若分配速率是 2GB/s，而老年代回收速率只有 500MB/s，那无论怎么调参都会 OOM——这时候该做的是**减少对象创建**（复用缓冲、避免装箱、去掉不必要的序列化），而不是调 GC。**「先算分配速率，再谈调优」是资深与初级的明显分界**。',
                followup:
                  '「日志里的 `real / user / sys` 是什么」——`real` 是墙钟时间（用户感知的停顿），`user` 是 CPU 时间（多线程时可能大于 real），`sys` 是内核时间。若 `real` 远小于 `user`，说明并行度利用得好（多核在同时干活）；若 `real` ≈ `user`，说明 GC 基本是单线程在跑（可能是堆小、或并行线程数被限制）。这个比值能反推「GC 是否真的并行起来了」，是很多人忽略的诊断信息。',
              },
              {
                kind: 'compare',
                title: 'JDK 8 与 JDK 9+ 的 GC 日志参数对照',
                head: ['用途', 'JDK 8（分散开关）', 'JDK 9+（统一日志）'],
                rows: [
                  ['日志总开关', '`-XX:+PrintGCDetails`', '`-Xlog:gc*`'],
                  ['输出到文件', '`-Xloggc:gc.log`', '`-Xlog:...:file=gc.log`'],
                  ['时间戳', '`-XX:+PrintGCDateStamps`', '`:time,uptime`（装饰器）'],
                  ['级别与标签', '不可控（全有全无）', '`:level,tags`，可按 tag 过滤'],
                  ['文件轮转', '需外部 logrotate', '`:filecount=5,filesize=10m` 内置'],
                  ['堆信息', '`-XX:+PrintHeapAtGC`', '`-Xlog:gc+heap=debug`'],
                  ['类加载/卸载', '`-XX:+TraceClassLoading`', '`-Xlog:class+load` / `class+unload`'],
                ],
                caption:
                  '统一日志框架（JEP 158，JDK 9）的真正价值是**「按 tag 与 level 精确取用」**——过去要开一个细节就得开一大堆，噪声大、开销也大；现在可以只要 `gc+heap` 或 `gc+safepoint`。迁移时的实用技巧：先用 `-Xlog:gc*:file=gc.log` 打全量，再按分析需要收窄 tag。**别在 JDK 9+ 上继续照抄 JDK 8 的参数**，它们不会生效，而且不一定有告警。',
              },
              {
                kind: 'question',
                title: '讲一个你经历过的 JVM 调优案例？',
                questionId: 'java-04-Q66',
                intent:
                  '开放题，考的是「叙事结构」。用 STAR + 数据讲，比罗列命令有效十倍。没有亲历也要能用参考案例讲得可信。',
                points: [
                  '**S（背景）**：接口 TP9999 超标（目标 200ms，实际偶发 1s+）；监控显示老年代 GC 约每 40 分钟一次，每次停顿 300~500ms',
                  '**T（任务）**：定位 GC 停顿的根因，把 TP9999 拉回目标线内，且不能靠「加机器 / 加堆」敷衍',
                  '**A（动作）**：保留现场（摘流量但**不重启**）→ 取 GC 日志与 `jstat` → 发现每次 Young GC 的晋升量接近 Survivor 容量（**过早晋升**）→ 算分配速率与活跃对象大小 → 调整 `-Xmn`（1.2G → 2.5G）、老年代设为活跃对象的约 3 倍、`-Xms`=`-Xmx` → 压测验证',
                  '**R（结果）**：Young GC 频率下降，老年代 GC 从 **40 分钟一次**变为 **7.5 小时一次**，TP9999 恢复达标，Full GC 归零',
                  '**复盘（加分）**：① 「先查根因再调参」——若一开始就加堆，只能把 40 分钟变 60 分钟；② 「一次只改一个变量」——同时改三个参数就说不清是谁起的作用；③ 「防火胜于救火」——把「晋升量 / Survivor 容量」做成监控指标，比事后排查便宜得多',
                  '**讲述纪律**：给具体数字（1.2G → 2.5G、40 分钟 → 7.5 小时），不说「调大了一点」「快了很多」；用「我做了什么判断」而不是「我们试了很多参数」',
                ],
                depth:
                  '为什么这个案例「听起来真」？因为它包含三个只有真做过才知道的细节：**① 摘流量不重启**（保现场）、**② 用「晋升量 / Survivor 容量」做判据**（而不是笼统说「老年代涨得快」）、**③ 用「活跃对象的 2~3 倍」反推老年代**（而不是拍脑袋给个 `-Xmx`）。面试官判断真假，靠的就是这类「方法论层面的细节」——参数名谁都会背，判断依据才是经验。',
                followup:
                  '「如果调完还是不行怎么办」——这题的延伸答法：① 检查是否「分配速率本身就超过 GC 处理能力」——那要减少对象创建，而不是继续调参；② 检查是否有「周期性任务在批量创建对象」（定时全量刷新缓存）；③ 考虑换收集器（ZGC 把停顿压到毫秒级）；④ 最后才是扩容。**这个「逐级升级」的顺序本身，就是资深工程师的体现**——很多人第一反应是扩容，而扩容往往是最贵且最不解决问题的。',
              },
              {
                kind: 'diagram',
                title: '案例前后对比：改的是新生代，收益在老年代',
                body: [
                  '这个案例最有教学价值的地方是「**改 A 得 B**」：调的是 `-Xmn`（新生代），改善的却是老年代 GC 频率。原因链条是「Survivor 变大 → 动态年龄推迟 → 晋升减少」。',
                ],
                diagram: {
                  type: 'split',
                  left: {
                    title: '✗ 调优前',
                    tone: 'bad',
                    items: [
                      '新生代 1.2G，Survivor 约 120MB',
                      '每次 Young GC 晋升量接近 Survivor 容量',
                      '动态年龄判定提前触发（如 age=2 就晋升）',
                      '老年代涨得快 → Old GC 每 40 分钟一次',
                      '每次停顿 300~500ms，TP9999 偶发 1s+',
                      '应急反应是「加堆」→ 只把间隔拉长到 60 分钟',
                    ],
                  },
                  right: {
                    title: '✓ 调优后',
                    tone: 'good',
                    items: [
                      '新生代 2.5G，Survivor 约 250MB',
                      '晋升量占 Survivor 比例大幅下降',
                      '短命对象在 Survivor 里就被回收，不进老年代',
                      '老年代 GC 从 40 分钟一次变为 **7.5 小时一次**',
                      '停顿次数骤减，TP9999 回到 200ms 内',
                      '`-Xms` = `-Xmx`，消除堆震荡；Full GC 归零',
                    ],
                  },
                  caption:
                    '注意左边的最后一条：**「加堆」这个直觉反应为什么无效**——因为它没有改变「晋升速率」，只是让老年代更大、能装更久。而晋升速率不变意味着「单位时间进老年代的对象量」不变，于是 GC 频率只是被「更大的容器」稀释了一点。真正有效的是右边第一行：**扩大新生代，让对象在年轻时就死掉**。这条因果链（新生代 → Survivor → 动态年龄 → 晋升率 → 老年代 GC 频率）值得完整记住。',
                },
              },
              {
                kind: 'principle',
                title: '调优方法论：取证、归因、单变量、验证',
                body: [
                  '把所有技巧抽掉，剩下四步。这四步在面试里比任何参数都值钱，因为它们决定了「你是在调试还是在掷骰子」。',
                ],
                steps: [
                  {
                    title: '① 取证：先保留现场，再动手',
                    detail:
                      '出问题时的第一反应不该是重启，而是**摘流量 + 拿证据**（GC 日志、`jstat` 序列、堆快照、线程栈）。重启会让所有证据消失——这是「事后复盘只能靠猜」的根本原因。容器环境尤其要注意：进程被 OOMKilled 后现场全无，所以 `HeapDumpOnOutOfMemoryError` 必须提前配。',
                  },
                  {
                    title: '② 归因：用「二分」砍掉一半可能性',
                    detail:
                      '两个最有效的二分：**「是 GC 问题还是业务问题」**（看 CPU 高的是不是 GC 线程）、**「Full GC 后老年代回落吗」**（回落 = 分配/晋升问题，不回落 = 真泄漏）。这两刀砍完，剩下的候选通常只有一两个。',
                  },
                  {
                    title: '③ 单变量：一次只改一个参数',
                    detail:
                      '同时改 `-Xmn`、`-Xmx`、收集器，结果变好了也说不清是谁的功劳——下次出问题你还是不会。**单变量是让经验可复用的唯一方法**。而且每次改完要**压测**，不能直接上生产（流量特征不同，结论可能反转）。',
                  },
                  {
                    title: '④ 验证：用指标说话，不用体感',
                    detail:
                      '看 TP99/TP999、GC 频率、单次停顿、Full GC 次数四个指标的前后对比。**「感觉快了」不是结论**。同时要有「回滚方案」——若指标没改善或恶化，能一键退回原参数。',
                  },
                  {
                    title: '⑤ 防火：把判据做成监控',
                    detail:
                      '最资深的一步：把「晋升量 / Survivor 容量」「Full GC 后老年代占用」「分配速率」这些**判据**做成监控曲线。这样下次不是「等用户投诉再排查」，而是「曲线一歪就知道要出事」。**这比任何一次成功的调优都值钱**。',
                  },
                ],
                takeaway:
                  '一句话：**调优的产出不是一组参数，而是一条可复现的因果链**。参数只是因果链末端的动作；真正可迁移的能力是「从现象走到根因」的那条路径。所以面试里被问「你调过什么参数」，好的回答是「我遇到过什么现象、用什么证据定位到哪个根因、改了什么、指标怎么变的」——**参数名只是这条叙事里的一个词**。',
              },
            ],
          },
        },
        {
          id: 'jit-other',
          title: 'JIT 编译与性能细节',
          kind: 'concept',
          sources: [
            { topic: 'java-04', chapters: ['JIT'] },
            { topic: 'java-04', chapters: ['十、其他'] },
          ],
          content: {
            intro:
              'JIT 是 Java 性能的核心机制，也是「跑一会儿才变快」这类现象的来源。它要回答三个问题：为什么既要有解释器又要有编译器（启动与峰值的权衡）、热点代码怎么被识别（计数器与分层编译）、编译后做了什么（内联、逃逸分析、标量替换、锁消除）。理解了这三层，你就能解释为什么基准测试必须预热、为什么某些写法会阻止内联、为什么会出现「性能抖动」（去优化）。本节最后补两个几乎必配的运维参数：OOM 自动转储与元空间大小。',
            outline: [
              '解释器负责启动快，JIT 负责峰值高，两者靠「分层编译」平滑过渡',
              '热点探测靠方法调用计数器与回边计数器，循环体走 OSR（栈上替换）',
              '方法内联是其他优化的前提——不内联，逃逸分析与锁消除都没有分析边界',
              '去优化让「激进优化」可撤销，代价是性能抖动与「跑着跑着变慢」',
            ],
            pitfalls: [
              '认为 JIT 一定让程序越来越快，忽略了预热期与去优化抖动',
              '用微基准测试时不预热，测到的其实是解释执行 + C1 的性能',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：Java 性能的三层结构',
                body: [
                  '「Java 比 C 慢吗」这个问题的答案取决于**在哪个时间点看**：刚启动时慢得多（解释执行），跑热之后可能只慢一点（JIT 优化），极端场景下甚至能超过朴素 C 代码（因为 JIT 能利用运行时信息做「C 编译器做不到」的优化，如去虚化）。这三层差异，正是本课的主线。',
                  '三层结构是：**① 执行层**——解释器逐条跑字节码，启动快但慢；**② 编译层**——热点代码被 C1 / C2 编译成本地机器码；**③ 优化层**——C2 做内联、逃逸分析、标量替换、锁消除等激进优化，并在假设失效时**去优化**回退。本课按这三层展开，最后落到两个运维参数，因为「性能」不只靠编译器，也靠「出问题时能不能拿到现场」。',
                ],
                points: [
                  '**执行层**：解释器 + 模板表，逐条翻译字节码，无编译开销，适合「只跑一次」的代码',
                  '**编译层**：C1（快编译、少优化）与 C2（慢编译、激进优化），分层编译让两者接力',
                  '**优化层**：内联是地基，逃逸分析、标量替换、锁消除都建立在「方法已被内联」之上',
                  '**回退层**：去优化（deoptimization）让激进优化可撤销——这是「性能抖动」的来源，也是 JIT 敢做激进假设的底气',
                ],
              },
              {
                kind: 'question',
                title: 'JVM 为什么既有解释器又有 JIT 编译器？',
                questionId: 'java-04-Q67',
                intent:
                  '核心是「启动 vs 峰值」的权衡。能补一句「去优化让两者可以互相回退」，就说明理解了协同机制。',
                points: [
                  '**解释器**：逐条解释字节码执行。**启动快**（无需编译）、**内存占用小**（不存机器码），但**执行慢**（每条指令都要查表 + 分发）',
                  '**JIT 编译器**：把**热点代码**编译成本地机器码并做深度优化。**执行快**，但编译本身要花时间和内存（编译线程占 CPU、机器码占 Code Cache）',
                  '**为什么要两个**：程序刚启动时，绝大多数代码只跑一两次——编译它们纯属浪费（编译时间比执行时间还长）。而程序跑热之后，少数代码占了 80% 以上的执行时间——不编译它们就是巨大浪费',
                  '**协同方式**：启动阶段解释执行，快速把功能跑起来；热点被识别后编译，性能逐步爬升；若编译时的乐观假设失效（如出现了新的实现类），**去优化**回退到解释执行，修正后再重新编译',
                  '**这就是「既要启动快又要峰值高」的答案**。纯解释（如早期的 Java）启动快但峰值低；纯 AOT 编译（如 GCJ）启动快峰值也不错，但失去运行时优化能力',
                  '**工程含义**：线上服务要**预热**——先压几波流量让热点代码编译完成，再放真实流量。否则「刚发布的那几分钟」总是最慢的',
                ],
                depth:
                  '「编译时间比执行时间还长」不是夸张。一个方法的 C2 编译可能要几十毫秒，若它只被执行一次（耗时几微秒），编译就是纯亏。所以 HotSpot 的判定阈值设得很保守（Server 模式默认 10000 次调用）。这也解释了一个常见现象：**单元测试里跑一遍的方法从来不会被 JIT 编译**——它们一直是解释执行的，所以「单元测试测出的耗时」与「线上耗时」完全不可比。同理，`main` 方法里跑一次的代码、启动时的配置解析，都该用解释器。',
                followup:
                  '「AOT（如 GraalVM Native Image）不是更好吗」——AOT 的收益是**启动极快、内存占用低**（适合 Serverless、CLI 工具），代价是**失去运行时 profile**：无法做「基于实际类型分布的虚方法内联」、无法做「基于实际逃逸情况的标量替换」。所以 AOT 的峰值性能通常低于 JIT（尤其对长期运行的服务）。这也是「两者并存」的现实：短生命周期用 AOT，长跑服务用 JIT。',
              },
              {
                kind: 'diagram',
                title: '一段代码的执行演进：解释 → C1 → C2 → 可能回退',
                body: [
                  '同一段代码在生命周期里会经历多个执行形态。理解这条演进路径，就能解释「为什么服务刚启动慢、跑一会儿快、偶尔又抖一下」。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 解释执行', note: '零编译开销，启动即跑，最慢' },
                    { label: '② 计数器累积，越过阈值', note: '方法调用计数器 / 回边计数器' },
                    { label: '③ C1 编译（第 1~3 层）', note: '快速出码，带 profiling 收集类型与分支信息' },
                    { label: '④ C2 编译（第 4 层）', note: '依据 profile 做激进优化：内联、去虚化、标量替换' },
                    { label: '⑤ 假设失效 → 去优化', note: '退回解释执行，重新收集 profile 再编译' },
                  ],
                  caption:
                    '第 ⑤ 步是很多人忽略的一环：**JIT 敢做激进优化，是因为它保留了「撤销」的能力**。比如「这个方法只有一个实现类，可以内联」——一旦运行期加载了第二个实现类，这个假设就崩了，JVM 必须把已编译的机器码作废、退回解释执行。这就是「服务跑了几小时后突然变慢」的一种成因（去优化抖动）。',
                },
              },
              {
                kind: 'question',
                title: '什么是热点代码？如何探测？什么是分层编译？',
                questionId: 'java-04-Q68',
                intent:
                  '三层：热点是什么（两类）、怎么探测（计数器 + OSR）、分层编译几层（5 层）。第二层最容易答漏「回边计数器」。',
                points: [
                  '**热点代码两类**：① 被**多次调用**的方法；② 被**多次执行**的循环体（长循环即便只调用一次，循环体也会热）',
                  '**探测方式：基于计数器**。`方法调用计数器`（Invocation Counter）+ `回边计数器`（Back Edge Counter，统计循环回跳次数）',
                  '**阈值**：`-XX:CompileThreshold`，Client 模式默认 1500、Server 模式默认 10000；分层编译下这个阈值被动态调整（不再是固定值）',
                  '**热度衰减**：计数器会周期性减半（半衰周期），所以「曾经的熱点」会退烧——这避免了「早期跑过一段热代码就永久占用编译资源」',
                  '**OSR（On-Stack Replacement，栈上替换）**：循环体编译不能等方法返回，必须**在执行中替换栈帧**，让循环立刻跑编译后的版本。所以 OSR 编译的入口是「循环回边」而不是方法入口',
                  '**分层编译 5 层**：0 = 解释执行；1 = C1（无 profiling）；2 = C1（基本计数 profiling）；3 = C1（完整 profiling）；4 = C2（完全优化）',
                  '**为什么需要第 2 层**：第 3 层（完整 profiling）开销大，若方法很快就热到能上 C2，先走第 2 层能少花点 profiling 成本；若方法一直停在 C1，则用第 3 层收集充分信息',
                ],
                depth:
                  '「方法调用计数器 + 回边计数器」为什么要分开？因为它们度量的是不同的东西：前者说「这个方法被反复进入」，后者说「这个方法内部有个循环在反复跑」。一个只被调用一次、但内部循环一亿次的方法（如 `main` 里的矩阵运算），方法调用计数器永远到不了阈值——只有回边计数器能识别它。这也解释了 OSR 的存在：**方法还没执行完，但循环体已经足够热了，必须就地替换**。OSR 编译出的机器码入口是「循环的那个位置」，所以它与普通编译产物是两份不同的代码。',
                followup:
                  '「怎么观察 JIT 有没有编译某个方法」——`-XX:+PrintCompilation` 会打印每次编译（`%` 表示 OSR、`made not entrant` 表示被去优化）。更精细的用 JFR 的 `Compilation` 事件，或 `-XX:+PrintInlining`（看内联决策与失败原因）。**排查「某方法为什么没被优化」时，`PrintInlining` 是最直接的证据**——它会告诉你「too big」「not hot enough」「no static binding」这类具体原因。',
              },
              {
                kind: 'diagram',
                title: '分层编译的五层：从解释到 C2',
                body: [
                  '五层不是「五个档次」，而是「两条编译路径 + 三种 profiling 深度」的组合。理解了这个结构，就不用死记层号。',
                ],
                diagram: {
                  type: 'layers',
                  items: [
                    { label: '第 0 层：解释执行', note: '没有编译产物，profile 由解释器收集', tone: 'muted' },
                    { label: '第 1 层：C1（无 profiling）', note: '最轻，适合「简单且确定不会更热」的方法', tone: 'primary' },
                    { label: '第 2 层：C1（基本计数 profiling）', note: '过渡层，为「很快就该上 C2」的方法省 profiling 成本', tone: 'primary' },
                    { label: '第 3 层：C1（完整 profiling）', note: '收集类型分布、分支频率——这是 C2 优化的原料', tone: 'warn' },
                    { label: '第 4 层：C2（完全优化）', note: '最慢编译、最强优化：内联、去虚化、标量替换、循环优化', tone: 'good' },
                  ],
                  caption:
                    '关键洞察：**C2 的所有激进优化都依赖 profile**（第 3 层的产物）。「这个方法 99% 的情况传进来的是 `ArrayList`」——于是 C2 生成「假设是 `ArrayList` 的快路径 + 一个类型检查」。若哪天来了 `LinkedList`，类型检查失败就触发**去优化**。所以「profile 的准确性」直接决定了「优化的激进程度」。这也是为什么「刚启动时跑的那点流量」不能代表真实分布——profile 采样不足，C2 会做出错误假设。',
                },
              },
              {
                kind: 'compare',
                title: 'C1 与 C2 的分工',
                head: ['维度', 'C1（Client 编译器）', 'C2（Server 编译器）'],
                rows: [
                  ['编译速度', '**快**（毫秒级）', '慢（可能几十毫秒）'],
                  ['优化强度', '基础优化（去虚化有限）', '**激进**（深度内联、标量替换、循环变换）'],
                  ['依赖 profile', '第 1 层不需要', '**强依赖**（类型分布、分支频率）'],
                  ['代码质量', '一般', '**高**（接近 C 编译器的优化水平）'],
                  ['去优化风险', '低', '**高**（假设多，可能被打破）'],
                  ['典型用途', '启动阶段快速出码', '峰值性能'],
                  ['触发阈值', '较低（早编译）', '较高（热到一定程度）'],
                ],
                caption:
                  '这张表解释了分层编译的设计动机：**先用 C1 把「慢得不能忍」的阶段撑过去，等 profile 足够了再让 C2 接手**。若只有 C2，那所有代码都要等「很热」才编译，启动期会很长；若只有 C1，峰值上不去。两者接力，才同时满足「启动可接受」与「峰值足够高」。',
              },
              {
                kind: 'question',
                title: '方法内联是什么？为什么说它是最重要的 JIT 优化？',
                questionId: 'java-04-Q69',
                intent:
                  '这题的关键不是「省了调用开销」，而是「**它是其他优化的前提**」。能把这条因果说清，就是高分答案。',
                points: [
                  '**定义**：把被调用方法的代码体**复制进调用方**，消除真实的调用（参数压栈、栈帧创建、返回跳转）',
                  '**为什么最重要：它是其他优化的地基**。不内联，逃逸分析就看不到「对象在方法内部有没有逃出去」——因为调用边界把分析切断了',
                  '**连锁效应**：内联 → 逃逸分析能看到完整生命周期 → 判定「不逃逸」→ **标量替换**（对象拆成局部变量，根本不创建）+ **锁消除**（无竞争的 `synchronized` 直接去掉）',
                  '**内联条件**：方法字节码体积小于阈值（热点方法有更宽松的 `-XX:FreqInlineSize`，默认 325 字节）；**虚方法**需要「只有一个实现类」或「profile 显示只有一个热点实现」（CHA + 去虚化）',
                  '**虚方法怎么内联**：用 **CHA（Class Hierarchy Analysis）** 检查「当前已加载的类里，这个方法是不是只有一个实现」；是则插一个**类型守卫**（guard），命中走内联代码，不命中走去优化',
                  '**内联失败的原因**（用 `-XX:+PrintInlining` 看）：方法太大（`too big`）、不够热（`not hot enough`）、有多个实现（`no static binding`）、递归、被 `@DontInline` 标记',
                  '**递归为什么不能内联**：无限展开。JIT 对递归只做有限深度（如 2~3 层）的展开',
                ],
                depth:
                  '为什么「内联扩大优化范围」这件事如此关键？因为**编译器只能在单个方法的范围内做数据流分析**。举个例子：`Point p = new Point(x, y); return p.x + p.y;`——若 `Point` 的构造与字段访问分在三个没被内联的方法里，编译器看到的是「创建了一个对象、调了两次方法、返回一个 int」，它无法证明「这个对象没逃出去」，只能真的分配。而内联之后，整个生命周期都在一个方法体内，逃逸分析一眼就能看出「`p` 从未离开本方法」，于是对象被拆成两个局部变量，**一次分配都不发生**。这就是「Java 的 `new` 很便宜」的真正原因。',
                followup:
                  '「写代码时要注意什么」——三条实用建议：① **别把热点路径拆成过多小方法又用反射调用**（反射打断内联，`Method.invoke` 无法内联目标）；② **避免在热点路径上用 `synchronized` 包大方法**（大方法内联不了，锁消除也失效）；③ **小心「多态滥用」**：同一调用点有 3 个以上实现时，内联会退化成「类型分派」，收益骤降——这也是「`instanceof` 判断 + 分支」有时比「多态」快的原因（虽然不该为了性能牺牲设计）。',
              },
              {
                kind: 'diagram',
                title: '内联的连锁效应：一次内联，三种优化生效',
                body: [
                  '这张链图解释了「为什么说内联是最重要的优化」——它不是省了几纳秒的调用开销，而是**打开了后面所有优化的门**。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '方法被内联到调用方', note: '调用边界消失，代码进入同一方法体' },
                    { label: '逃逸分析获得完整生命周期', note: '能判定对象「方法逃逸 / 线程逃逸 / 不逃逸」' },
                    { label: '不逃逸 → 标量替换', note: '对象拆成局部变量，**根本不分配**' },
                    { label: '不逃逸 → 锁消除', note: '无竞争的 `synchronized` 直接去掉' },
                    { label: '结果：分配消失 + 锁消失 + 缓存局部性提升', note: '这就是「Java 的 new 很便宜」的真相' },
                  ],
                  caption:
                    '注意第 2 步的措辞：**「获得完整生命周期」**。逃逸分析的能力边界就是「它能看到多少代码」。不内联时，对象被传进一个未知方法，只能保守假设「它逃了」；内联后假设可以收紧。这也解释了一个反直觉现象：**把一段代码「抽成方法」有时会变慢**——不是因为方法调用贵，而是因为抽出去之后内联失败，后续优化全部失效。当然，这不构成「不要抽方法」的理由，只说明「热点路径上的小方法要足够小」。',
                },
              },
              {
                kind: 'analogy',
                title: '内联像「把菜谱抄进自己的操作流程」',
                text:
                  '把 JIT 编译器想成一个**后厨总管**。一开始，每道菜都按「标准菜谱」（方法）做：要看一眼菜谱、准备一套新工具（栈帧）、做完收拾干净（返回）——这些「看菜谱」的动作在忙的时候是纯浪费。于是总管做了个决定：**把最常做的几道菜的步骤直接抄到主厨的操作流程里**（内联），以后不用再看菜谱。抄进来之后，另一个好处出现了：主厨能**一眼看到整道菜的全过程**，于是发现「这个碗根本不用拿，直接在锅里拌就行」（标量替换）、「这步不用锁柜子，反正就我一个人」（锁消除）。',
                mapping: [
                  { real: '标准菜谱', tech: '被调用的方法（字节码）' },
                  { real: '看食谱、备新工具、收拾', tech: '参数压栈、创建栈帧、返回跳转' },
                  { real: '把步骤抄进主厨的流程', tech: '方法内联：代码体复制进调用方' },
                  { real: '一眼看到整道菜全过程', tech: '编译器获得完整的数据流视图' },
                  { real: '「这个碗不用拿，直接锅里拌」', tech: '标量替换：对象拆成局部变量' },
                  { real: '「就我一个人，不用锁柜子」', tech: '锁消除：无竞争 synchronized 被去掉' },
                  { real: '菜谱太长抄不动', tech: '方法字节码超过 `FreqInlineSize` 阈值，内联失败' },
                  { real: '这道菜有两个师傅都会做，不知道抄谁的', tech: '多实现虚方法，无法静态绑定，内联退化' },
                ],
                limit:
                  '有一处不成立：**菜谱抄错了可以改回来，内联「抄错」要靠去优化**。JIT 内联时做了一个假设（「这个方法只有一个实现」），若运行期出现第二个实现，已编译的机器码就作废了——必须退回解释执行重新收集 profile。这个「撤销」动作（deoptimization）是有成本的，表现为性能抖动。所以类比里「抄进来就永久有效」是错的：**优化是有条件的，条件会失效**。',
              },
              {
                kind: 'question',
                title: '-XX:+HeapDumpOnOutOfMemoryError 的作用和注意事项？',
                questionId: 'java-04-Q70',
                intent:
                  '这题看着简单，但「注意事项」才是考点：磁盘、容器、与 `kill -3` 的区别。',
                points: [
                  '**作用**：发生 OOM 时**自动生成 `.hprof` 堆转储**，是线上排查的「保命参数」，几乎必配',
                  '**标准配法**：`-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump/`（务必指定目录，避免写满根分区）',
                  '**注意一：磁盘空间**。dump 文件可能**与堆一样大**（甚至稍大），容器环境要确认挂载卷容量。磁盘写满会让「已经 OOM 的服务」雪上加霜',
                  '**注意二：K8s / 容器**。进程 OOM 后往往**直接被 kill 并重启**，容器内文件随 Pod 消失——这是**事前配置是唯一拿到现场机会**的原因。要用 `hostPath` 或 PVC 挂载 dump 目录',
                  '**注意三：`kill -3` 不是堆转储**。`kill -3` 只打印**线程转储**（到 stdout / 日志），没有堆内容。要堆必须 dump',
                  '**注意四：手动 dump 的风险**。`jmap -dump` 会触发 Full GC 并可能停顿数秒，能用自动 dump 就别手动',
                  '**注意五：只 dump 一次**。默认在第一个 OOM 时 dump，之后不再重复（避免反复写满磁盘）。若想每次 OOM 都 dump，需要 `-XX:+HeapDumpOnOutOfMemoryError` 配 `-XX:HeapDumpGzipLevel` 之类的组合，但一般不建议',
                  '**配套参数**：`-XX:+ExitOnOutOfMemoryError`（OOM 后直接退出，交给编排系统重启，避免「半死不活」）',
                ],
                depth:
                  '为什么 dump 文件可能比堆还大？因为 `.hprof` 里不只存对象数据，还包含**类元信息、字段名、引用关系、线程栈**等。一个 4GB 的堆 dump 出来 4.5~5GB 是常见的。Gzip 压缩（`-XX:HeapDumpGzipLevel=1~9`，JDK 9+ 支持）能压到 1/3 左右，但压缩要 CPU 且耗时更长——对「已经 OOM」的进程来说，多花的这几十秒可能让探针判定为「僵死」而重启。**所以压缩与否要看「磁盘够不够」和「能容忍多长的恢复时间」**，没有统一答案。',
                followup:
                  '「OOM 了但没配这个参数怎么办」——只能靠**事中手段**：① 若进程还活着且响应，立刻 `jmap -dump`（但要接受 Full GC 停顿）；② 若进程已经死了，就只剩 GC 日志与监控指标可分析，能定位「哪一代满了」，但定位不到「哪个对象泄漏」。这也是为什么这个参数被称为「保命」——**它不是为了调优，是为了让下一次故障可分析**。',
              },
              {
                kind: 'question',
                title: 'Metaspace 大小一般怎么设置？',
                questionId: 'java-04-Q71',
                intent:
                  '两个参数各有分工：`MetaspaceSize` 管「何时触发 GC」，`MaxMetaspaceSize` 管「上限保护」。答错第一个的语义是最常见的失分点。',
                points: [
                  '**`-XX:MetaspaceSize`（注意不是 `Max`）**：这是「**首次触发 Metaspace 相关 GC 的高水位线**」，默认约 21MB。它不是初始大小（元空间初始是 0），也不是上限',
                  '**`-XX:MaxMetaspaceSize`**：上限，默认**无限制**（只受本地内存约束）。**容器环境必须设**，否则类泄漏会吃光本地内存导致 `OOMKilled`',
                  '**为什么要把 `MetaspaceSize` 调大**：默认 21MB 太小，启动期大量加载类会反复越过水位线 → 反复触发 Full GC（日志里 `Metadata GC Threshold`）。设成预估稳定值（如 256MB）可以避免这些「启动期的无效 GC」',
                  '**怎么定值**：上线后观察 `jstat -gcmetacapacity` 或 GC 日志里的元空间占用，取**稳定值的 1.3~1.5 倍**作为 `MetaspaceSize`，`MaxMetaspaceSize` 再留更大余量（如 2 倍）',
                  '**动态代理 / 脚本引擎多的应用**（CGLIB、Groovy、JSP、`LambdaMetafactory` 生成的隐藏类）要预留更多',
                  '**如果类数量持续增长不回落**：先怀疑**类加载器泄漏**（热部署、反射缓存、动态代理容器），别急着加参数——加参数只是把 OOM 推迟',
                ],
                depth:
                  '`MetaspaceSize` 这个名字是历史遗留的误导。它源于永久代时代的 `-XX:PermSize`（初始大小），但在 Metaspace 实现里它的语义变成了「**高水位线**（high watermark）」：当元空间使用量超过它时，触发一次 GC 尝试卸载类；GC 后若仍然超过，就**抬高这个水位线**（而不是立即 OOM）。所以它更像「触发 GC 的阈值」，而不是「初始容量」。真正决定「元空间能长到多大」的是 `MaxMetaspaceSize`。**面试里能指出这个名字的误导性，是很好的加分点**。',
                followup:
                  '「元空间 OOM 和堆 OOM 怎么区分」——看异常信息：`OutOfMemoryError: Metaspace` 是元空间，`OutOfMemoryError: Java heap space` 是堆。前者查「类为什么一直生成」（`jcmd <pid> GC.class_histogram`、`jcmd <pid> VM.metaspace`），后者查「对象为什么一直存活」（dump + 支配树）。两者排查路径完全不同，**混为一谈会导致「明明堆很空却一直 OOM」的困惑**。',
              },
              {
                kind: 'diagram',
                title: '元空间症状与对策对照',
                body: [
                  '元空间问题的麻烦之处在于「它的症状常常伪装成堆问题」。这张表按「你看到什么」组织，直接给对策。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['症状', '日志 / 指标特征', '根因', '对策'],
                  cols: ['日志 / 指标特征', '根因', '对策'],
                  rows: [
                    ['启动期反复 Full GC', '`Metadata GC Threshold` 频繁', '默认 21MB 水位线太低', '调大 `MetaspaceSize`'],
                    ['运行中元空间慢涨', '`jstat -gcmetacapacity` 的 MC 持续上涨', '动态类生成（代理 / 脚本）', '限制生成量或加缓存'],
                    ['元空间只涨不落', 'Klass 数量持续增长、卸载为 0', '**类加载器泄漏**', '修泄漏，别调参数'],
                    ['容器 OOMKilled', '无 Java 异常，容器直接重启', '无 `MaxMetaspaceSize` 上限', '显式设上限'],
                    ['`OutOfMemoryError: Metaspace`', '明确的异常信息', '类数量超过上限', '查泄漏 + 适度放宽'],
                  ],
                  caption:
                    '第三行「只涨不落」是诊断分水岭：**元空间能卸载类，若卸载量一直是 0，说明卸载条件（实例全无 + 加载器死 + Class 无引用）从未满足**。这时候加 `MaxMetaspaceSize` 只是把 OOM 从「今天」推迟到「下周」。判断手段是 `jcmd <pid> VM.metaspace` 看 `Klass` 数量、`-Xlog:class+unload` 看卸载日志。',
                },
              },
              {
                kind: 'question',
                title: 'JVM 面试常见的「连环追问」有哪些？',
                questionId: 'java-04-Q72',
                intent:
                  '收尾题，考的其实是「你的知识是不是一张网」。五条链能各说三层，就说明不是背的。',
                points: [
                  '**内存区域链**：内存结构 → 堆分代 → 为什么 8:1:1 → 对象一定在堆上吗 → 逃逸分析 → 栈上分配真的存在吗（HotSpot 用**标量替换**，不是栈上分配）→ TLAB 解决什么（并发分配的同步开销）',
                  '**GC 链**：如何判断死亡 → 为什么不用引用计数（循环引用）→ GC Roots 有哪些 → 四种引用 → `ThreadLocal` 泄漏（弱引用 + 强 value）→ CMS 四阶段 → 三色标记漏标 → 增量更新 vs SATB → **写屏障与内存屏障是一回事吗（不是）**',
                  '**收集器链**：项目用什么 → 为什么 G1 → Region 多大 → Young / Mixed / Full 的区别 → 什么时候 Evacuation Failure → 换 ZGC 的代价（吞吐损失、读屏障、不能压缩指针）',
                  '**类加载链**：五个阶段 → 准备阶段赋什么值（零值）→ `static final` 为什么特殊 → 双亲委派 → 怎么打破 → JDBC SPI 用了什么（TCCL）→ Tomcat 类隔离怎么做 → 同名类一定相等吗（不）',
                  '**实战链**：CPU 高怎么查 → 发现是 GC 线程怎么办 → Full GC 频繁怎么查 → dump 怎么拿 → MAT 怎么用 → 元空间 OOM 呢（换一条路径）',
                  '**准备策略**：每条链的**前两问是送分题，差距在第三问之后**。所以复习时不要停在「能说出定义」，要练「被追问三层还能答」',
                ],
                depth:
                  '为什么「连环追问」是有效的面试手段？因为**第一层考记忆、第三层考因果**。比如「G1 是什么」可以背；「为什么 G1 能把停顿变成可预测的」就需要理解 Region + 回收价值排序 + 停顿预测模型三者的关系；「那为什么超大堆还要换 ZGC」则需要理解「Region 数量多了之后，回收候选集的维护成本与 RSet 开销」这个约束。**能把第三层答出来的人，通常是真的在线上用过、踩过坑**——这也是面试官真正想筛的东西。',
                followup:
                  '「怎么准备这类链条」——最有效的方法是「**自己画一张图**」：把每个主题的核心机制画成因果链（如本课的「内联 → 逃逸分析 → 标量替换」），然后自问「如果这一步不成立会怎样」。**能回答「反例」才算真懂**。第二个方法是「讲给别人听」——口述时卡住的地方，就是你的知识缺口。',
              },
              {
                kind: 'principle',
                title: 'JIT 的三个反直觉结论',
                body: [
                  'JIT 这一块最容易被「想当然」误导。下面三条结论都与直觉相反，但都是可以在线上观察到的真实现象。',
                ],
                steps: [
                  {
                    title: '① 同一段代码，跑得越久越快——但有上限，也会倒退',
                    detail:
                      '直觉是「代码执行速度恒定」。实际是：解释 → C1 → C2，性能逐级爬升；到 C2 后达到峰值；若假设被打破则**去优化**，性能短暂回落到解释执行。所以「性能曲线」不是单调的，而是「阶梯上升 + 偶发回落」。这也解释了「压测时 QPS 越压越高」——不是负载均衡生效了，是 JIT 编译完了。',
                  },
                  {
                    title: '② 「抽成小方法」不一定更快，「写在一行」不一定更慢',
                    detail:
                      '直觉是「方法调用有开销，所以内联写法更快」。实际是：**只要小方法能被内联，两者生成的机器码完全相同**——JIT 之后「抽方法」是零成本的。反过来，若方法大到无法内联（超过 `FreqInlineSize`），或调用点是多态（3 个以上实现），抽方法就真的会慢。所以判断标准不是「方法调用贵不贵」，而是「**这个方法能不能被内联**」。',
                  },
                  {
                    title: '③ 微基准测试几乎总是错的',
                    detail:
                      '直觉是「跑个 `System.nanoTime()` 前后差值就是耗时」。实际有三重陷阱：**没预热**（测到的是解释执行）、**死代码消除**（C2 发现结果没用，直接把整段删掉，耗时接近 0）、**常量折叠**（编译期就算完了）。所以 Java 的基准测试必须用 **JMH**（它处理了预热、fork、黑洞、统计），手写 `nanoTime` 的结果基本不可信。',
                  },
                  {
                    title: '④ 推论：性能问题要先排除「没热起来」',
                    detail:
                      '线上「刚发布那几分钟慢」不是代码问题，是 JIT 还没编译。解法是**预热**（发布前压测、或灰度时先小流量跑一段）、或用 **AppCDS / AOT** 减少启动期解释执行。反过来，「跑了很久突然变慢」要怀疑去优化或 GC，而不是「代码退化」。**把「时间维度」纳入排查，是 JIT 这块最实用的收获。**',
                  },
                ],
                takeaway:
                  '一句话：**Java 的性能不是一个数字，而是一条随运行时间变化的曲线**。它由「解释 → C1 → C2 → 去优化」的迁移决定，也由 GC、内存布局、锁竞争共同影响。所以回答「Java 快不快」的正确姿势，是先问「在哪个阶段、什么负载、有没有预热」——**离开上下文的性能结论都是耍流氓**。这也是本课与上一课（调优实战）的接缝：调优的对象不是「代码」，而是「这条曲线在生产环境里的形状」。',
              },
            ],
          },
        },
      ],
    },
  ],
}
