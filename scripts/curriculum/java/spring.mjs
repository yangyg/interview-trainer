/**
 * Java · Spring 全家桶
 * java-05(94) = 94 题 / 4 阶段 / 10 课时
 */
export default {
  id: 'java-spring',
  language: 'java',
  title: 'Spring 全家桶',
  subtitle: '从 IoC 容器到事务与 MyBatis，按「框架替你做了什么」来理解',
  level: 'advanced',
  order: 3,
  prerequisites: ['java-lang-collections'],
  outcomes: [
    '说清 Bean 从定义到销毁的完整生命周期，以及各扩展点的执行时机',
    '解释三级缓存如何解决循环依赖，并说出它解决不了的两种情况',
    '从代理机制出发讲清 AOP 的织入时机，以及事务失效的典型原因',
    '说明 Spring Boot 自动配置的触发链路与自定义 starter 的写法',
    '把 MyBatis 的一级二级缓存、插件拦截、与 Spring 的整合方式讲明白',
  ],
  stages: [
    {
      id: 'ioc',
      title: 'A · 容器与 Bean',
      goal: '理解 IoC 容器如何管理对象的创建、注入与销毁',
      summary:
        'Spring 的第一层能力是「你不用再 new」。但面试要的不是这句话，而是 Bean 从定义到可用经过哪些扩展点、依赖注入有几种方式、作用域如何影响实例数量。这一阶段把容器启动流程与 Bean 生命周期拆开讲，后面讲 AOP 与事务时才有落点。',
      lessons: [
        {
          id: 'spring-overview',
          title: 'Spring 总览与模块划分',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['一、Spring 总览'] }],
          content: {
            intro:
              '这一节先把 Spring 的全貌立起来，避免后面陷入细节时失去方向。核心只有两件事：IoC 容器负责对象生命周期与依赖装配，AOP 负责把横切逻辑从业务代码里抽出来。围绕这两件事长出了 spring-core、beans、context、aop、tx、web 等模块，以及后来的 Spring Boot 与 Spring Cloud。理解模块之间的依赖方向、以及 BeanFactory 与 ApplicationContext 的分层，你就能判断某个功能该去哪个模块找答案，也能回答「Spring 启动时到底做了什么」。',
            outline: [
              'IoC 与 AOP 是内核，其余模块都是围绕它们的能力扩展',
              'BeanFactory 是最底层容器（懒加载），ApplicationContext 是其超集（预初始化 + 企业级能力）',
              'refresh() 的十二步是容器启动的主线，BeanFactoryPostProcessor 与 BeanPostProcessor 是两大扩展点',
              'Spring Boot 解决的是「配置与启动」，Spring Cloud 解决的是分布式治理',
            ],
            pitfalls: [
              '把 Spring Boot 当成新框架，实际上它是 Spring 的自动配置与内嵌容器封装',
              '把 FactoryBean 与 BeanFactory 混为一谈，两者职责完全不同（一个是容器，一个是「生产对象的 Bean」）',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：Spring 只做两件事',
                body: [
                  'Spring 被讲得很复杂，但它最初要解决的只有两个痛点：**对象谁来创建**（把 `new` 的权力交给容器）、**横切逻辑怎么不污染业务代码**（把事务、日志、安全从方法体里抽出去）。前者是 IoC，后者是 AOP。所有模块、所有注解、所有扩展点，都是这两件事的延伸。',
                  '理解顺序建议这样：先记住「**容器 = 一张 BeanDefinition 图纸表 + 一个单例缓存 Map + 一串扩展点**」这个结构，再理解「AOP 是在 Bean 生命周期的某个时机把它替换成代理」。这两点打通之后，「为什么事务会失效」「为什么循环依赖要三级缓存」这类问题的答案就是同一个：**你拿到的对象是不是原始对象**。',
                ],
                points: [
                  '**IoC 容器**：`BeanDefinition`（图纸）→ `BeanFactory`（工厂）→ 单例缓存（`singletonObjects`）→ 扩展点（`BeanPostProcessor`）',
                  '**AOP**：在 Bean 初始化后（`postProcessAfterInitialization`）判断是否需要代理，需要则返回代理对象',
                  '**模块依赖方向**：core ← beans ← context ← aop / tx / web，越往上越「企业级」',
                  '**Boot 与 Cloud**：Boot 是「装配与启动」的封装，Cloud 是「分布式治理」的组合，都不改内核',
                ],
              },
              {
                kind: 'question',
                title: '简单介绍一下 Spring / Spring 家族？有哪些核心模块？',
                questionId: 'java-05-Q1',
                intent:
                  '这题考「有没有一张地图」。先说定位（IoC + AOP 容器），再按六个分组报模块，最后说清依赖方向，比按字母背模块名强得多。',
                points: [
                  '**一句话定位**：轻量级的 **IoC + AOP 容器框架**，核心使命是解耦——把对象创建与依赖管理交给容器，把横切逻辑（事务、日志、安全）从业务代码抽离',
                  '**核心容器**：`spring-core`（工具与 IoC 基础）、`spring-beans`（BeanDefinition 与 BeanFactory）、`spring-context`（ApplicationContext、事件、国际化）、`spring-expression`（SpEL）',
                  '**AOP**：`spring-aop`（代理与通知）、`spring-aspects`（集成 AspectJ 注解）',
                  '**数据访问**：`spring-jdbc`、`spring-tx`（事务抽象）、`spring-orm`（整合 MyBatis / Hibernate）、`spring-oxm`、`spring-jms`',
                  '**Web**：`spring-web`（基础，如 `HttpMessageConverter`）、`spring-webmvc`（MVC 框架）、`spring-webflux`（Spring 5 起的响应式栈）',
                  '**家族成员**：Spring Boot（脚手架 + 自动装配 + 内嵌容器）、Spring Cloud（微服务治理）、Spring Data（数据访问统一抽象）、Spring Security（认证授权）、Spring Batch / Integration',
                  '**依赖方向**：`core → beans → context → aop / tx / web`。所以 `spring-web` 依赖 `spring-context`，而 `spring-context` 不可能反过来依赖 `spring-web`',
                ],
                depth:
                  '为什么模块划分值得记？因为它决定了「某个功能该去哪找」。比如：`@Transactional` 的实现在 `spring-tx` 而不是 `spring-context`；`HttpMessageConverter` 在 `spring-web` 而不是 `spring-webmvc`（所以 WebFlux 也能用）；`BeanPostProcessor` 在 `spring-beans`（所以哪怕不用 ApplicationContext、只用 BeanFactory 也能用扩展点）。**知道「这个类属于哪个 jar」，就能推出「它能不能用、依赖谁」**——这在排查 `NoSuchMethodError`、`ClassNotFoundException` 这类依赖冲突时非常实用。',
                followup:
                  '「Spring 5 的 WebFlux 和 Spring MVC 是什么关系」——是**两套并列的 Web 栈**，共用 `spring-web` 的基础抽象（`HttpMessageConverter`、`WebClient` 底层），但 MVC 是「一请求一线程」的阻塞模型，WebFlux 是「事件循环 + 响应式」的非阻塞模型。两者可以共存（同一个应用里不同路径走不同栈），但**不建议混用**，因为阻塞代码会拖死事件循环线程。',
              },
              {
                kind: 'diagram',
                title: '模块的依赖方向：越往上越「企业级」',
                body: [
                  '把模块按依赖方向摞起来，就能一眼看出「谁能用谁」。注意 AOP 与 tx / web 都在 context 之上，这说明它们都建立在「容器能管理 Bean」这个前提上。',
                ],
                diagram: {
                  type: 'layers',
                  items: [
                    { label: 'spring-core', note: '工具类、资源加载、IoC 最底层（`Resource`、`ClassUtils`）', tone: 'muted' },
                    { label: 'spring-beans', note: '`BeanDefinition`、`BeanFactory`、`BeanPostProcessor`', tone: 'muted' },
                    { label: 'spring-expression', note: 'SpEL 表达式引擎（`@Value` 的求值基础）', tone: 'muted' },
                    { label: 'spring-context', note: '`ApplicationContext`、事件、国际化、`@ComponentScan`', tone: 'primary' },
                    { label: 'spring-aop / spring-tx', note: '代理与通知、事务抽象（都依赖「Bean 可被代理」）', tone: 'primary' },
                    { label: 'spring-web / spring-webmvc', note: 'Web 基础抽象与 MVC 实现', tone: 'good' },
                    { label: 'spring-boot / spring-cloud', note: '自动装配与启动、分布式治理（在 Framework 之上）', tone: 'good' },
                  ],
                  caption:
                    '两个实用推论：① **`spring-beans` 里就有 `BeanPostProcessor`**，所以哪怕你手动 `new DefaultListableBeanFactory()` 也能用扩展点，不一定需要 ApplicationContext；② **`spring-web` 在 `webmvc` 之下**，所以 `HttpMessageConverter`、`RestTemplate` 这类类不属于 MVC 专用，WebFlux 也能用。判断「这个类属于哪层」是排查依赖冲突的起点。',
                },
              },
              {
                kind: 'question',
                title: '什么是 IoC？它有什么好处？',
                questionId: 'java-05-Q2',
                intent:
                  '不要只答「控制反转」四个字。要说清「反转的是什么控制权」，以及「Spring 用什么数据结构实现它」。',
                points: [
                  '**定义**：IoC（Inversion of Control）是一种设计思想——把**对象的创建、依赖组装、生命周期管理**的控制权，从程序代码反转给容器',
                  '**反转的是什么**：传统写法 `A` 需要 `B` 就 `new B()`，控制权在 `A`；用 IoC 后 `A` 只声明「我需要一个 `B`」，由容器决定「给哪个实现、什么时候创建」',
                  '**好处一：解耦**。对象只依赖抽象（接口），替换实现不改代码，符合开闭原则',
                  '**好处二：便于测试**。测试时注入 Mock 实现，不需要启动整个环境',
                  '**好处三：统一生命周期**。容器集中管理创建、初始化、销毁，还能顺手施加 AOP 增强（事务就是这么来的）',
                  '**好处四：减少样板代码**。不用手写工厂、单例、查找逻辑（`ServiceLocator` 那一套）',
                  '**实现层面**：Spring 用「**一堆 Map 存单例** + **BeanDefinition 描述怎么创建**」实现。`DefaultSingletonBeanRegistry.singletonObjects` 就是那个核心 Map',
                ],
                depth:
                  '「反转」这个词容易让人误解成「依赖方向反转」。其实 IoC 反转的是**控制权的归属**，**依赖倒置原则（DIP）** 才是反转依赖方向（高层与低层都依赖抽象）。三者的关系是：**DIP 是设计原则，IoC 是达成它的手段，DI 是 IoC 的具体实现方式**。面试里把这三层分清，比反复说「控制反转」有说服力得多——因为很多人答完 IoC 被追问「那 DIP 呢」就卡住了。',
                followup:
                  '「IoC 有什么缺点」——三个真实代价：① **运行时才暴露装配错误**（写错了 `@Qualifier` 要到启动才报，编译器帮不上）；② **跳转不直观**（IDE 里点不进「谁调用了这个方法」，因为调用方是容器的反射）；③ **启动变慢**（大量 Bean 预实例化 + 反射 + 代理生成）。所以「小工具用 IoC」往往是过度设计——**IoC 的收益与「对象图复杂度」成正比**。',
              },
              {
                kind: 'question',
                title: 'DI 和 IoC 是什么关系？',
                questionId: 'java-05-Q3',
                intent:
                  '一句话答清：**IoC 是思想，DI 是实现方式之一**。再补上「依赖查找」这个另一种实现，就完整了。',
                points: [
                  '**IoC 是思想 / 设计原则**：控制权交给容器，这是方向性的约定',
                  '**DI 是 IoC 最主流的实现方式**：容器在创建 Bean 时，把依赖**注入**进去（构造器注入、Setter 注入、字段注入）',
                  '**另一种实现：依赖查找（Dependency Lookup）**：对象自己主动向容器要依赖（如 `beanFactory.getBean("x")`、JNDI 的 `lookup`）。Spring 支持但**不推荐**，因为它让代码依赖容器 API',
                  '**第三种：依赖拖拽（Contextualized Dependency Lookup）**：容器把依赖「推」给一组实现了特定接口的对象，多见于老框架',
                  '**一句话总结**：IoC 说的是「**谁来控制**」，DI 说的是「**怎么把依赖给进来**」',
                  '**DIP（依赖倒置原则）** 是让 IoC 能落地的设计原则：高层模块与低层模块都依赖抽象，抽象不依赖细节',
                ],
                depth:
                  '为什么 Spring 主推 DI 而不是依赖查找？因为依赖查找**把容器 API 写进了业务代码**——`applicationContext.getBean(Foo.class)` 让这个类从此离不开 Spring，单元测试必须造一个容器。而 DI 的 Bean 只是一个普通类（`Foo` 的字段被注入），测试时可以直接 `new Foo(mockBar)`。**这是「框架侵入性」的核心差别**：DI 是「容器来找你」，查找是「你去找容器」。前者业务代码干净，后者方便但污染。',
                followup:
                  '「字段注入（`@Autowired` 直接标在字段上）算不算好的 DI」——能用但不推荐。它有三个问题：**无法声明 `final`**（对象可变，破坏不可变性）、**无法脱离容器测试**（必须反射注入或起容器）、**容易掩盖循环依赖**（构造器注入会直接报错，字段注入靠反射能绕过，于是问题被推迟到运行时）。Spring 官方从 4.3 起就明确推荐构造器注入，单构造器时连 `@Autowired` 都可以省略。',
              },
              {
                kind: 'compare',
                title: 'IoC、DI、DIP：三个容易混的概念',
                head: ['维度', 'DIP（依赖倒置原则）', 'IoC（控制反转）', 'DI（依赖注入）'],
                rows: [
                  ['层级', '设计原则', '设计思想 / 模式', '具体实现技术'],
                  ['一句话', '高层与低层都依赖抽象', '控制权从代码交给容器', '容器把依赖传进来'],
                  ['反转的是什么', '**依赖的方向**（都指向抽象）', '**控制权的归属**（谁来创建）', '不反转，只是「传递方式」'],
                  ['谁提出', 'Robert C. Martin（SOLID 的 D）', 'Martin Fowler 总结的术语', 'Martin Fowler 命名'],
                  ['Spring 中的体现', '面向接口编程（`UserService` 接口）', '`ApplicationContext` 管理 Bean', '`@Autowired` / 构造器注入'],
                  ['反例', '直接 `new MySQLDao()`', '自己 `new` 一切、自己管单例', '在方法里 `new` 依赖'],
                ],
                caption:
                  '最容易混的是「反转的是什么」这一行：**DIP 反转依赖的方向**（原本高层依赖低层，现在都依赖抽象）、**IoC 反转控制权**（原本自己创建，现在容器创建）、**DI 不反转任何东西**，它只是「把依赖送进去」的动作。面试里被问「IoC 和 DI 的区别」，答这一行就够；被追问「那 DIP 呢」，能接上第三列就是加分。',
              },
              {
                kind: 'question',
                title: 'Spring 框架中用到了哪些设计模式？',
                questionId: 'java-05-Q4',
                intent:
                  '不要背名单。挑 4~5 个**能说出具体类名**的讲，比列 10 个更有说服力。',
                points: [
                  '**工厂模式**：`BeanFactory` / `ApplicationContext` 创建与管理 Bean；`FactoryBean` 是「生产对象」的特殊工厂',
                  '**单例模式**：容器级单例（`singleton` 作用域），缓存就是 `DefaultSingletonBeanRegistry.singletonObjects` 那个 `ConcurrentHashMap`',
                  '**代理模式**：AOP 的 JDK 动态代理与 CGLIB；`@Transactional` / `@Async` / `@Cacheable` 全靠它',
                  '**模板方法**：`JdbcTemplate`、`RestTemplate`、`RedisTemplate`——把「获取连接、执行、释放」的骨架定死，只留回调给用户',
                  '**观察者模式**：`ApplicationEvent` + `ApplicationListener`，事件发布与监听',
                  '**适配器模式**：`HandlerAdapter`（适配不同类型的 Handler）、`AdvisorAdapter`（适配不同类型的通知）',
                  '**策略模式**：`Resource` 的不同实现（`ClassPathResource` / `FileSystemResource`）、`InstantiationStrategy`（反射 vs CGLIB 实例化）',
                  '**责任链模式**：MVC 的 `HandlerInterceptor` 链、AOP 的 `ReflectiveMethodInvocation`（逐个通知推进，`proceed()` 就是链式调用）',
                  '**装饰器模式**：`BeanWrapper` 包装 Bean、MyBatis 的 `CachingExecutor` 装饰 `Executor`',
                ],
                depth:
                  '「责任链」这一条最能体现深度：AOP 的拦截器链不是「数组遍历调用」，而是**每个拦截器持有一个 `MethodInvocation`（其实是它自己），调 `proceed()` 就推进到下一个**。所以拦截器的「前置」代码在 `proceed()` 之前、「后置」在之后，形成嵌套结构（像洋葱）。这也解释了「为什么 `@Around` 能改变返回值」——它可以在 `proceed()` 之后改。**能把 `ReflectiveMethodInvocation.proceed()` 说出来，基本可以确认你读过源码。**',
                followup:
                  '「为什么说 Spring 是「模式大杂烩」」——因为它要解决的是「通用容器」问题，必须对「创建方式、资源类型、处理器类型」都保持开放，于是每种变化点都对应一个模式。反过来，**这些模式不是为了炫技而用，而是「扩展点」的实现手段**：`BeanPostProcessor` 是策略、`HandlerAdapter` 是适配器、`HandlerInterceptor` 是责任链——**理解了扩展点，模式自然就记住了**。',
              },
              {
                kind: 'diagram',
                title: '八个设计模式在 Spring 里的具体落点',
                body: [
                  '这张表的价值是「模式 → 类名」的映射。面试时说出类名，比说「Spring 用了工厂模式」可信得多。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['模式', 'Spring 中的落点', '解决的问题'],
                  cols: ['Spring 中的落点', '解决的问题'],
                  rows: [
                    ['工厂', '`BeanFactory` / `FactoryBean`', '对象的创建与装配'],
                    ['单例', '`singletonObjects` 缓存', '全局唯一实例'],
                    ['代理', 'JDK Proxy / CGLIB', '无侵入地加横切逻辑'],
                    ['模板方法', '`JdbcTemplate` / `RedisTemplate`', '固定流程 + 可变回调'],
                    ['观察者', '`ApplicationEvent` / `ApplicationListener`', '解耦事件发布与处理'],
                    ['适配器', '`HandlerAdapter` / `AdvisorAdapter`', '统一多种实现形态'],
                    ['策略', '`Resource` / `InstantiationStrategy`', '运行期选择算法'],
                    ['责任链', '`HandlerInterceptor` / `MethodInvocation`', '多个处理器依次生效'],
                  ],
                  caption:
                    '注意「代理」与「责任链」是 AOP 的两块基石：**代理**负责「让调用经过拦截器」，**责任链**负责「多个拦截器怎么排」。理解了这两个，`@Transactional`、`@Cacheable`、`@Async` 都只是「往链上插一个拦截器」而已——它们的差异只在「拦截器做了什么」。',
                },
              },
              {
                kind: 'question',
                title: 'BeanFactory 和 ApplicationContext 有什么区别？',
                questionId: 'java-05-Q5',
                intent:
                  '两个关键差异：**加载时机**（懒加载 vs 预实例化）与**能力范围**（裸容器 vs 企业级）。',
                points: [
                  '**定位差异**：`BeanFactory` 是最底层的容器接口（核心方法 `getBean()`）；`ApplicationContext` 是它的**子接口**，属于企业级容器',
                  '**加载时机**：`BeanFactory` **懒加载**（`getBean` 时才创建）；`ApplicationContext` 在 `refresh()` 时**预实例化**所有非懒加载单例',
                  '**为什么默认预实例化**：**早失败早暴露**。配置错、依赖缺失、循环依赖（构造器注入那种）都会在启动时报错，而不是等到第一次请求',
                  '**扩展能力**：`ApplicationContext` 集成了 `MessageSource`（国际化）、`ApplicationEventPublisher`（事件）、`ResourceLoader`（资源）、`Environment`（配置）、**自动注册 `BeanPostProcessor` 与 `BeanFactoryPostProcessor`**',
                  '**`BeanFactory` 没有的**：上述企业级能力一个都没有，`BeanPostProcessor` 也要手动 `addBeanPostProcessor`',
                  '**常用实现**：`DefaultListableBeanFactory`（最底层的完整实现）；`AnnotationConfigApplicationContext`（注解驱动）；Boot 里是 `AnnotationConfigServletWebServerApplicationContext`',
                  '**一句话**：`BeanFactory` 是「发动机」，`ApplicationContext` 是「整车」——发动机能跑，整车才有空调、音响、仪表盘',
                ],
                depth:
                  '「预实例化」这个设计为什么重要？因为它把「配置错误」从**运行期**提前到了**启动期**。想象一个 `@Autowired` 的依赖在容器里找不到：懒加载容器要等第一次 `getBean` 才报 `NoSuchBeanDefinitionException`——那时可能已经是线上第一个请求了；预实例化则在启动时就失败，CI/CD 阶段就能发现。**这也解释了为什么 Spring Boot 启动慢**：它不是「无缘无故慢」，而是在**替你把所有 Bean 都造一遍、把依赖图全部验证一遍**。这个成本换来的是「启动成功 ≈ 依赖没问题」的确定性。',
                followup:
                  '「怎么用 BeanFactory 手动搭一个最小容器」——三步：`DefaultListableBeanFactory factory = new DefaultListableBeanFactory();` → 注册 `BeanDefinition`（可用 `AnnotatedBeanDefinitionReader` 或手写 `RootBeanDefinition`）→ `factory.getBean(Foo.class)`。这样跑起来没有事件、没有 AOP 自动代理、没有 `@Autowired` 处理（除非手动加 `AutowiredAnnotationBeanPostProcessor`）。**手搭一次，就能深刻理解 ApplicationContext 到底多做了哪些事。**',
              },
              {
                kind: 'compare',
                title: 'BeanFactory 与 ApplicationContext 逐项对照',
                head: ['维度', 'BeanFactory', 'ApplicationContext'],
                rows: [
                  ['层级', '最底层容器接口', 'BeanFactory 的子接口（超集）'],
                  ['核心方法', '`getBean()` / `getBeanProvider()`', '继承全部 + 大量企业级 API'],
                  ['Bean 创建时机', '**懒加载**，首次 `getBean` 时', '`refresh()` 时**预实例化**非懒加载单例'],
                  ['BeanPostProcessor', '需手动 `addBeanPostProcessor`', '**自动**发现并注册'],
                  ['国际化', '不支持', '`MessageSource`'],
                  ['事件机制', '不支持', '`ApplicationEventPublisher`'],
                  ['资源加载', '不支持', '`ResourceLoader`（`classpath:` / `file:`）'],
                  ['环境抽象', '不支持', '`Environment`（profile + properties）'],
                  ['典型实现', '`DefaultListableBeanFactory`', '`AnnotationConfigApplicationContext`'],
                ],
                caption:
                  '第四行是实际开发中最容易感知的差异：**用裸 `BeanFactory` 时 `@Autowired` 不生效**——因为处理它的 `AutowiredAnnotationBeanPostProcessor` 根本没被注册。这也是「为什么自己搭最小容器时要手动加一堆 PostProcessor」的原因。反过来说，`ApplicationContext` 的「自动注册」是通过 `refresh()` 里的 `registerBeanPostProcessors()` 实现的。',
              },
              {
                kind: 'question',
                title: 'FactoryBean 是什么？它和 BeanFactory 有什么区别？',
                questionId: 'java-05-Q6',
                intent:
                  '名字像、职责完全不同。要能说出三个方法、两个 `getBean` 的差别，以及框架里的真实用例。',
                points: [
                  '**`BeanFactory`**：IoC 容器本身，负责生产和管理**所有** Bean（`getBean` 是它的方法）',
                  '**`FactoryBean`**：一个**特殊的 Bean**——它自己是「生产对象的工厂」，实现 `getObject()` / `getObjectType()` / `isSingleton()` 三个方法',
                  '**关键语义**：容器里注册的「产品」是 `getObject()` 的返回值，而**不是** `FactoryBean` 实例本身',
                  '**两种取法**：`getBean("myFactoryBean")` 拿到**产品**；`getBean("&myFactoryBean")` 拿到 **FactoryBean 本身**（`&` 前缀）',
                  '**用途**：封装**复杂对象的创建过程**（需要一堆初始化逻辑、需要访问容器、需要动态代理）',
                  '**框架里的真实用例**：MyBatis 的 `SqlSessionFactoryBean`（建 `SqlSessionFactory`）、`MapperFactoryBean`（把 Mapper 接口变成可注入的代理）、OpenFeign 的 `FeignClientFactoryBean`、Spring 自己的 `ProxyFactoryBean`',
                  '**判断依据**：如果一个 Bean 的创建过程「不像 new 一个对象那么简单」，而是「要做一堆装配」，就该用 `FactoryBean`',
                ],
                depth:
                  '`FactoryBean` 的真正价值在「**把「创建逻辑」也变成一个可管理的 Bean**」。对比一下：用 `@Bean` 方法也能创建复杂对象，但 `@Bean` 是「配置类里的一个方法」——它无法被注入、无法被 AOP 增强、无法被其他 Bean 依赖「创建器」本身。而 `FactoryBean` 是一个货真价实的 Bean：它可以被注入、可以有属性、可以感知容器（实现 `ApplicationContextAware`）。**MyBatis 的 `MapperFactoryBean` 正是靠这一点，才能「拿到 SqlSessionTemplate + Mapper 接口，动态生成代理」**——这件事用 `@Bean` 很难优雅地做到。',
                followup:
                  '「`getBean("&x")` 的 `&` 是怎么处理的」——`AbstractBeanFactory.getBean` 里会先判断 `name.startsWith("&")`，若是则 `beanName = name.substring(1)` 且 `isFactoryDereference = true`，最后从 `factoryBeanInstanceCache` 取 FactoryBean 实例本身而不是 `getObject()` 的产物。这个 `&` 是 Spring 里少见的「特殊字符约定」，容易在排查时被忽略——**看到 `&` 就知道「要的是工厂不是产品」**。',
              },
              {
                kind: 'diagram',
                title: 'FactoryBean 的两次取值：产品还是工厂',
                body: [
                  '同一个 beanName，加不加 `&` 决定你拿到的是「产品」还是「工厂」。这张图把两条路径分开画。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '容器里注册了 `mapperFactoryBean`', note: '类型是 `MapperFactoryBean`（实现了 `FactoryBean`）' },
                    { label: 'getBean("mapperFactoryBean")', note: '→ 走 `getObject()`，返回 **Mapper 代理对象**（产品）' },
                    { label: 'getBean("&mapperFactoryBean")', note: '→ 跳过 `getObject()`，返回 **FactoryBean 本身**' },
                    { label: '为什么需要后者', note: '调试、拿 `getObjectType()`、或在容器外部手动触发创建' },
                  ],
                  caption:
                    '注意第 2 步的产物：**Mapper 接口的代理对象**。这就解释了「为什么 `@Autowired UserMapper mapper` 能直接注入一个接口」——接口本身不能实例化，容器里放的是 `MapperFactoryBean` 生产出来的 JDK 动态代理。**MyBatis 与 Spring 的整合，本质就是「用 FactoryBean 把接口变成 Bean」**。理解了这一句，MyBatis 那一课的很多问题都能提前打通。',
                },
              },
              {
                kind: 'question',
                title: '怎么理解 Bean？Spring 容器和 Web 容器有什么区别？',
                questionId: 'java-05-Q7',
                intent:
                  '考「边界感」。关键是说清「两者是嵌套关系」而不是「替代关系」。',
                points: [
                  '**Bean 是什么**：由 Spring 容器**实例化、组装、管理**的对象。本质还是普通 Java 对象，区别只在「生老病死由容器接管」',
                  '**Web 容器是什么**：Tomcat / Jetty / Undertow，管理 **Servlet、Filter、Listener** 等 Web 组件的生命周期，负责 HTTP 连接的接收与响应',
                  '**Spring 容器管什么**：业务 Bean（Service、Repository、Controller）、事务、AOP 代理',
                  '**关系是嵌套，不是替代**：Web 容器启动 → 通过 `ContextLoaderListener`（传统 SSM）或 Boot 的内嵌方式 → 拉起 Spring 容器',
                  '**Boot 的变化**：把 Tomcat 变成**内嵌**的（`SpringApplication` 启动时创建 `ServletWebServerApplicationContext`，内部 `new Tomcat()`），所以「jar 直接跑」——但**仍然是 Web 容器在跑，只是它被 Spring 管起来了**',
                  '**为什么这个区分重要**：端口、连接数、线程池属于 Web 容器；Bean 作用域、事务、代理属于 Spring 容器。排查「请求超时」与「事务不生效」要去完全不同的地方',
                ],
                depth:
                  '「谁先启动」这件事在传统 SSM 与 Boot 里正好相反。传统方式：**Web 容器先起**（`web.xml` 里配 `ContextLoaderListener`），再由它加载 `applicationContext.xml`——所以「Web 容器是宿主，Spring 是客人」。Boot 方式：**Spring 先起**（`main` 方法），在 `refresh()` 的 `onRefresh()` 阶段**创建并启动**内嵌 Tomcat——「Spring 是宿主，Web 容器是它创建的一个组件」。这个顺序反转带来两个可观测差异：① Boot 里能用 Spring 的 profile / 条件装配决定「要不要起 Web 容器」（`WebApplicationType.NONE`）；② 传统方式下 Web 容器启动失败时，Spring 可能压根没初始化。',
                followup:
                  '「`DispatcherServlet` 属于谁」——它是个 **Servlet**，活在 Web 容器里，但它是由 **Spring 容器创建并注册**到 Web 容器的（Boot 里通过 `ServletRegistrationBean` 或 `DispatcherServletAutoConfiguration`）。所以它同时跨两个世界：**生命周期归 Web 容器（`init` / `destroy`），依赖注入归 Spring 容器**。这也是为什么 `DispatcherServlet` 里能 `@Autowired` 各种 Bean。',
              },
              {
                kind: 'question',
                title: '项目启动时，Spring 的 IoC 容器做了什么？',
                questionId: 'java-05-Q8',
                intent:
                  '`refresh()` 的十二步是这题的骨架。至少要能说出「解析配置 → 执行 BFPP → 注册 BPP → 预实例化」四段。',
                points: [
                  '**① 定位与解析配置**：处理 `@ComponentScan` / `@Import` / `@Bean` / XML，把类扫描成 **`BeanDefinition`**（图纸：类名、作用域、懒加载、依赖、初始化方法）注册进 `BeanDefinitionRegistry`',
                  '**② 执行 `BeanFactoryPostProcessor`（BFPP）**：典型是 `ConfigurationClassPostProcessor`（解析配置类，**这一步才会发现 `@Bean` 方法**）与 `PropertySourcesPlaceholderConfigurer`（占位符替换）',
                  '**③ 注册 `BeanPostProcessor`（BPP）**：`AutowiredAnnotationBeanPostProcessor`（处理 `@Autowired`）、`CommonAnnotationBeanPostProcessor`（`@Resource` / `@PostConstruct` / `@PreDestroy`）、`AnnotationAwareAspectJAutoProxyCreator`（**AOP 代理就是它做的**）',
                  '**④ 初始化基础设施**：`MessageSource`（国际化）、`ApplicationEventMulticaster`（事件广播器）、`LifecycleProcessor`',
                  '**⑤ 预实例化单例**：`finishBeanFactoryInitialization()` 遍历所有非懒加载单例的 `BeanDefinition`，逐个 `getBean()` 走完整生命周期',
                  '**⑥ 完成刷新**：`finishRefresh()` 启动 `Lifecycle` Bean（如内嵌 Tomcat 的启动在更早的 `onRefresh`）、发布 `ContextRefreshedEvent`',
                  '**关键顺序**：**BFPP 先于 BPP，BPP 先于普通 Bean**。因为 BPP 本身也是 Bean，而它要在「普通 Bean 创建时」生效，所以必须先就位',
                ],
                depth:
                  '为什么 BFPP 与 BPP 的时机不同？因为**它们操作的对象不同**：`BeanFactoryPostProcessor` 操作的是「**图纸**」（`BeanDefinition`），所以必须在「按图纸造对象」之前执行——`ConfigurationClassPostProcessor` 正是在这个阶段把 `@Bean` 方法解析成 `BeanDefinition`；而 `BeanPostProcessor` 操作的是「**对象**」，所以必须在「造对象」的流程里生效。**一个是改图纸，一个是改产品**。这个区分能解释很多「为什么这个扩展点在这里不生效」的困惑。',
                followup:
                  '「怎么验证这些时机」——写一个类同时实现 `BeanFactoryPostProcessor`、`BeanPostProcessor`、`InitializingBean`、`DisposableBean`，每个方法里打印一行。你会看到：`postProcessBeanFactory`（最早）→ `postProcessBeforeInitialization` / `afterPropertiesSet` / `postProcessAfterInitialization`（每个 Bean 各一次）→ `destroy`（容器关闭）。**打印一次胜过读十遍博客**，而且能顺手发现「BPP 自己被创建时也会走 BPP 流程」这个容易忽略的细节。',
              },
              {
                kind: 'diagram',
                title: 'refresh() 的主干：从解析配置到发布事件',
                body: [
                  '十二步不用全记，记住四个「分界点」就够了：图纸什么时候齐、BFPP 什么时候跑、BPP 什么时候就位、单例什么时候造。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① prepareRefresh：准备环境、校验必需属性', note: '记录启动时间、初始化 `Environment`' },
                    { label: '② obtainFreshBeanFactory：创建/刷新 BeanFactory', note: '得到 `DefaultListableBeanFactory`' },
                    { label: '③ invokeBeanFactoryPostProcessors', note: '**解析配置类 → BeanDefinition 全部就位**' },
                    { label: '④ registerBeanPostProcessors', note: '**BPP 就位（AOP 代理器在这一步注册）**' },
                    { label: '⑤ initMessageSource / initApplicationEventMulticaster', note: '国际化与事件基础设施' },
                    { label: '⑥ onRefresh：创建 Web 容器（Boot）', note: '内嵌 Tomcat 在这一步启动' },
                    { label: '⑦ finishBeanFactoryInitialization', note: '**预实例化所有非懒加载单例**' },
                    { label: '⑧ finishRefresh：启动 Lifecycle、发布 ContextRefreshedEvent', note: '容器就绪' },
                  ],
                  caption:
                    '四个分界点：**③ 之后图纸齐了**（此时能看到所有 `BeanDefinition`）、**④ 之后 BPP 齐了**（此时才有 AOP、`@Autowired` 的处理能力）、**⑦ 之后单例都造好了**（启动完成的主体）、**⑧ 之后事件发出**（`ApplicationRunner` / `CommandLineRunner` 在这之后）。排查「某个 Bean 为什么没生效」时，先定位它在哪一步该出现——**大多数「没生效」都是「它在 ③ 之前就该存在，但没有」**。',
                },
              },
              {
                kind: 'question',
                title: 'Spring Boot 和 Spring 的区别与关系？Spring MVC 和 Spring Boot 呢？',
                questionId: 'java-05-Q9',
                intent:
                  '核心是「Boot 不是替代，是封装」。四个增强点要能各举一例，最后一句「MVC 是模块、Boot 是脚手架」收尾。',
                points: [
                  '**Spring 是基础框架**：提供 IoC / AOP / 事务 / MVC 等能力，但需要大量配置（XML 或 JavaConfig）、手工管理依赖版本',
                  '**Boot 不是替代，是增强**，四个点：① **起步依赖（starter）** 解决依赖版本冲突；② **自动装配**消灭大量配置；③ **内嵌容器**让 jar 直接跑；④ **生产级特性**（Actuator 的健康检查、指标）',
                  '**Spring MVC 是 Spring 的一个 Web 模块**（`spring-webmvc`），实现「请求 → 处理器 → 响应」的链路',
                  '**Boot 与 MVC 的关系**：Boot 把「Spring + MVC + 内嵌容器」打包成开箱即用的脚手架。所以「Boot 项目里也能只用 WebFlux」「MVC 也能不用 Boot 手动配」——**两者是正交的**',
                  '**一句话**：Spring 是**能力**，Spring MVC 是**Web 能力的具体实现**，Spring Boot 是**把这些能力快速组装起来的脚手架**',
                  '**常见误解**：以为 Boot 是「新的 IoC 容器」——它用的是完全一样的 `ApplicationContext`，只是换了启动方式与装配方式',
                ],
                depth:
                  '「Boot 让配置变简单」这件事，本质是把「**约定优于配置**」落到了依赖与装配两个层面。依赖层面：`spring-boot-starter-web` 里已经声明好「Spring MVC + Jackson + 内嵌 Tomcat + 校验」的兼容版本组合，你不需要再纠结版本。装配层面：`@EnableAutoConfiguration` 会读取所有 jar 里的 `AutoConfiguration.imports` 清单，用 `@Conditional` 筛选出「当前 classpath 下该生效的配置类」。**所以「引了依赖就有默认配置」不是魔法，而是「有人在 jar 里写好了配置类，且它的生效条件被满足了」**。',
                followup:
                  '「Spring Cloud 与 Boot 的关系」——Cloud 依赖 Boot（它用 Boot 的自动装配来「一键开启」注册中心客户端、配置中心客户端、网关等）。但 Cloud 解决的是**分布式治理**（服务发现、配置、网关、熔断、链路追踪），属于**应用层组合**，不改 IoC 内核。所以「Cloud 组件坏了」时，排查方向通常是网络、注册中心状态、超时配置，而不是 Spring 容器本身。',
              },
              {
                kind: 'principle',
                title: '抓住三个问题，Spring 全课都能串起来',
                body: [
                  'Spring 的知识点极多，但它们都在回答同样三个问题。把这三个问题记住，后面每一课都只是给它们加细节。',
                ],
                steps: [
                  {
                    title: '① 「这个对象是谁造的」——IoC 侧',
                    detail:
                      '回答这条链上的所有问题：`BeanDefinition` 哪来的（扫描 / `@Bean` / XML）、什么时候造（懒加载 / 预实例化）、依赖怎么给（构造器 / setter / 字段）、造完谁管（单例缓存 / 作用域）。**「Bean 生命周期」「循环依赖」「作用域」都属于这一条。**',
                  },
                  {
                    title: '② 「我拿到的还是原来的对象吗」——AOP 侧',
                    detail:
                      'Bean 在 `postProcessAfterInitialization` 里可能被替换成代理。于是「事务为什么失效」（自调用拿到的是 `this`）、「`@Async` 为什么不生效」（同类调用）、「注入的是代理还是原对象」（循环依赖三级缓存）全都归到这一条。**这是 Spring 里最值钱的一个提问方式。**',
                  },
                  {
                    title: '③ 「这些配置是谁给我的」——装配侧',
                    detail:
                      '`@ComponentScan` 扫到了什么、`@Import` 导入了什么、`@Conditional` 判断了什么、`AutoConfiguration.imports` 里列了什么。**Boot 的「自动配置」「starter」「覆盖默认值」都属于这一条。**',
                  },
                  {
                    title: '④ 推论：几乎所有「Spring 玄学」都能归因',
                    detail:
                      '「注解不生效」→ ②（代理没生成或没经过代理）；「Bean 找不到」→ ③（没被扫描到 / 条件不满足）；「启动报循环依赖」→ ①（构造器注入无法提前暴露）；「改了配置没起效」→ ③（条件装配的优先级没搞清）。**先归类，再查证，比漫无目的地搜异常栈高效得多。**',
                  },
                ],
                takeaway:
                  '一句话：**Spring 的所有「魔法」都可以还原成「一个 Map + 一张图纸表 + 一串扩展点 + 一层代理」**。容器不是黑盒，它做的每件事都有明确的时机与数据结构。所以学 Spring 的正确姿势不是「记注解」，而是「记时机」——**「这件事发生在 refresh 的哪一步」，比「这个注解什么意思」重要十倍**。',
              },
            ],
          },
        },
        {
          id: 'ioc-bean',
          title: 'IoC、依赖注入与 Bean 生命周期',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['二、IoC 与 Bean'] }],
          content: {
            intro:
              'Bean 生命周期是 Spring 面试的必考题，也是最容易背成流水账的一题。正确的记法是抓住四条主线：实例化、属性填充、初始化、销毁；每一段前后都有对应扩展点——`BeanPostProcessor` 在初始化前后各拦一次，Aware 接口注入容器自身能力，`@PostConstruct` 与 `init-method` 在初始化阶段按序执行。抓住这条主线，再多的扩展点也能挂上去。本节还会讲清四种注入方式的取舍、六种作用域的语义、`@Configuration` 为什么必须被 CGLIB 增强——这些都与「生命周期在哪个时刻发生什么」直接相关。',
            outline: [
              '四阶段主干：实例化 → 属性填充 → 初始化（Aware → BPP 前置 → init → BPP 后置）→ 销毁',
              '初始化三方法的顺序固定：`@PostConstruct` > `afterPropertiesSet` > `init-method`',
              'BFPP 改「图纸」，BPP 改「成品」；`@Configuration` 靠 CGLIB 增强保证 `@Bean` 单例语义',
              '单例 Bean 只保证「创建」线程安全，不保证「使用」线程安全，无状态设计才是正解',
            ],
            pitfalls: [
              '把 `init-method` 与 `afterPropertiesSet` 的顺序说反，实际是 `@PostConstruct` → `afterPropertiesSet` → `init-method`',
              '用字段注入并声称它更好，忽略无法 `final`、掩盖循环依赖、无法脱离容器测试这三个问题',
            ],
            sections: [
              {
                kind: 'concept',
                title: '本课地图：一张生命周期图撑起整节课',
                body: [
                  '本课 12 道题，看起来分散（作用域、注入方式、`@Autowired` 原理、初始化顺序、`@Bean` 与 `@Component`、Aware、`@Value`），但它们全是同一张图的注脚：**一个 Bean 从「图纸」变成「可用的单例」，中间要经过哪些步骤、每步能挂什么钩子**。',
                  '把这张图记牢，剩下的都是「把某个注解放到图上对应的位置」。比如：`@Autowired` 在「属性填充」；`@PostConstruct` 在「初始化」；`BeanPostProcessor` 横跨「初始化」的前后；AOP 代理生成在「初始化后」；`@Configuration` 的 CGLIB 增强发生在「BeanDefinition 阶段」。**先有图，再有注解**，这是本节唯一的学习方法。',
                ],
                points: [
                  '**图纸阶段**：`BeanDefinition` 注册 → `BeanFactoryPostProcessor` 修改图纸（占位符替换、配置类解析）',
                  '**生产阶段**：实例化（反射 / 工厂方法）→ 属性填充（`@Autowired`）→ Aware 回调 → 初始化（三方法按序）→ **BPP 后置（AOP 代理在这里生成）**',
                  '**使用与销毁**：单例进缓存，`prototype` 不归容器管；销毁时 `@PreDestroy` → `destroy()` → `destroy-method`',
                  '**两条铁律**：BPP 对**每个 Bean**都生效；BFPP 只在**容器启动时**跑一次',
                ],
              },
              {
                kind: 'question',
                title: '说一下 Spring Bean 的生命周期（完整流程）',
                questionId: 'java-05-Q10',
                intent:
                  '这题的分水岭是「能不能把扩展点插到正确位置」。四阶段是骨架，Aware 与 BPP 的位置是细节。',
                points: [
                  '**① 实例化（Instantiation）**：容器按 `BeanDefinition` 通过**反射调用构造器**（或工厂方法）创建「原始对象」。此时字段全是默认值，依赖还是 null',
                  '**② 属性填充（Populate）**：注入 `@Autowired` / `@Resource` / `@Value` 依赖，由 `AutowiredAnnotationBeanPostProcessor.postProcessProperties` 完成',
                  '**③ Aware 回调**：`BeanNameAware` → `BeanClassLoaderAware` → `BeanFactoryAware`（由 `invokeAwareMethods` 直接调用）；`ApplicationContextAware` / `EnvironmentAware` 由 `ApplicationContextAwareProcessor`（一个 BPP）在前置阶段触发',
                  '**④ 初始化前**：`BeanPostProcessor.postProcessBeforeInitialization`（`@PostConstruct` 就是在这一步被 `CommonAnnotationBeanPostProcessor` 调用的）',
                  '**⑤ 初始化**：`InitializingBean.afterPropertiesSet()` → `init-method`（或 `@Bean(initMethod=...)`）',
                  '**⑥ 初始化后**：`BeanPostProcessor.postProcessAfterInitialization`——**AOP 代理在这里生成**（`AbstractAutoProxyCreator`），返回的可能是代理对象而不是原对象',
                  '**⑦ 使用**：单例进 `singletonObjects` 缓存；`prototype` 交给调用方，容器不再持有',
                  '**⑧ 销毁**：容器关闭时 `@PreDestroy` → `DisposableBean.destroy()` → `destroy-method`；仅对单例有效',
                ],
                depth:
                  '第 ⑥ 步是整个生命周期最「危险」的一步：**它可以把对象换掉**。`postProcessAfterInitialization` 的返回值会替代原对象进入缓存，于是「容器里的 Bean ≠ 你 new 出来的对象」。这解释了三件事：① 「为什么 `@Transactional` 生效」——因为注入到别处的已经是代理；② 「为什么自调用不生效」——因为 `this` 是原始对象，不是代理；③ 「为什么循环依赖需要三级缓存」——因为要在「属性填充」时就拿到「可能已被代理」的早期引用。**一句话：Spring 的很多「玄学」都源于「对象在初始化后被替换了」。**',
                followup:
                  '「`prototype` 的销毁回调为什么不执行」——因为容器**不持有** `prototype` 实例（每次 `getBean` 都新建，容器不知道你什么时候不用了），所以无法在关闭时统一销毁。若 `prototype` Bean 里有资源需要释放，必须由调用方自己负责（手动调 `destroy`、或用 `try-with-resources` 包装）。**这也是「优先用单例」的一条现实理由**：单例的生命周期由容器兜底，`prototype` 全靠自觉。',
              },
              {
                kind: 'diagram',
                title: '生命周期的八个节点与它们的钩子',
                body: [
                  '这张流程图把「阶段」与「钩子」叠在一起看。注意 ④ 与 ⑥ 是同一个接口的两次回调——这是 BPP 的设计核心。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 实例化：反射调构造器', note: '`InstantiationAwareBeanPostProcessor` 可在此短路返回代理' },
                    { label: '② 属性填充：注入依赖', note: '`postProcessProperties` → 处理 `@Autowired` / `@Value`' },
                    { label: '③ Aware 回调：注入容器能力', note: '`BeanNameAware` → `BeanFactoryAware` → `ApplicationContextAware`' },
                    { label: '④ BPP 前置：`postProcessBeforeInitialization`', note: '`@PostConstruct` 在这一步执行' },
                    { label: '⑤ 初始化：`afterPropertiesSet` → `init-method`', note: '顺序固定，不可颠倒' },
                    { label: '⑥ BPP 后置：`postProcessAfterInitialization`', note: '**AOP 代理在此生成，返回值可能替换原对象**' },
                    { label: '⑦ 使用：单例进缓存 / prototype 交出去', note: '此后 Bean 就绪' },
                    { label: '⑧ 销毁：`@PreDestroy` → `destroy()` → `destroy-method`', note: '仅单例有效' },
                  ],
                  caption:
                    '记住 ④ 与 ⑥ 的关系：**同一个 `BeanPostProcessor` 接口的两个方法，把「初始化」夹在中间**。所以任何「在 Bean 初始化前后要做的事」都可以塞进 BPP——`@PostConstruct`、`@Autowired`（在 ② 的 `postProcessProperties`）、AOP 代理，全都是 BPP 家族的实现。**理解「BPP 是万能挂钩」，就不需要死记每个功能由谁实现。**',
                },
              },
              {
                kind: 'diagram',
                title: '扩展点的执行时机对照',
                body: [
                  '面试常问「这个扩展点什么时候执行」。这张表按「作用于什么」分类，比按时间线列更容易记。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['扩展点', '作用对象', '执行时机', '典型实现'],
                  cols: ['作用对象', '执行时机', '典型实现'],
                  rows: [
                    ['`BeanFactoryPostProcessor`', '`BeanDefinition`（图纸）', '所有 Bean 实例化**之前**', '`ConfigurationClassPostProcessor`'],
                    ['`BeanDefinitionRegistryPostProcessor`', '注册表本身', 'BFPP 中**最优先**', '`ConfigurationClassPostProcessor`'],
                    ['`InstantiationAwareBeanPostProcessor`', '实例化前后 + 属性填充', '② 之前 / ② 中', '`AutowiredAnnotationBeanPostProcessor`'],
                    ['`BeanPostProcessor`', 'Bean 实例', '④ 与 ⑥（初始化前后）', '`CommonAnnotationBeanPostProcessor`'],
                    ['`Aware` 系列', 'Bean 本身', '③（属性填充后）', '`ApplicationContextAwareProcessor`'],
                    ['`InitializingBean`', 'Bean 本身', '⑤ 的第一步', '业务代码实现'],
                    ['`SmartInitializingSingleton`', 'Bean 本身', '**所有单例创建完之后**', '需要「全体就绪」的逻辑'],
                  ],
                  caption:
                    '最后一行值得单独记：`SmartInitializingSingleton` 在**所有单例都创建完成之后**才回调，是「我需要等其他 Bean 都就绪」的正确钩子（比 `ContextRefreshedEvent` 更早、且不受子容器影响）。很多人想「启动时预热缓存」，用 `@PostConstruct` 会踩坑——那时别的 Bean 可能还没造好；**用 `SmartInitializingSingleton` 才安全**。',
                },
              },
              {
                kind: 'question',
                title: 'Bean 有哪些作用域？',
                questionId: 'java-05-Q11',
                intent:
                  '六个作用域要能说清「生命周期归属」。最值钱的追问是「单例注入 prototype 会怎样」。',
                points: [
                  '**`singleton`（默认）**：每个容器一个实例，存于 `singletonObjects`。**创建时机**取决于是否懒加载',
                  '**`prototype`**：每次 `getBean` 都新建，容器**不管理销毁**（不调销毁回调）',
                  '**`request`**：每个 HTTP 请求一个实例（需 Web 环境，靠 `RequestContextHolder` 实现）',
                  '**`session`**：每个 HTTP 会话一个实例',
                  '**`application`**：整个 `ServletContext` 一个实例（注意不是「应用」级，是 ServletContext 级）',
                  '**`websocket`**：每个 WebSocket 会话一个实例',
                  '**指定方式**：`@Scope("prototype")` / `@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)`，或 XML 的 `scope` 属性',
                  '**致命细节：单例注入 prototype 会「退化」**。因为单例只初始化一次，注入动作也只发生一次，`prototype` 就被「锁」在单例里，永远用同一个实例',
                ],
                depth:
                  '「单例注入 prototype 退化成单例」是这题的高频追问，三种解法要能说清：① **`ObjectProvider<T>` / `ObjectFactory<T>`**——注入的是「提供者」，每次 `getObject()` 才真正去容器取新实例（推荐，Spring 4.3+ 支持直接注入 `ObjectProvider`）；② **`@Lookup` 方法**——在单例里声明一个抽象方法，让容器用 CGLIB 生成子类实现「每次调用返回新 Bean」；③ **`@Scope(value="prototype", proxyMode=ScopedProxyMode.TARGET_CLASS)`**——给 `prototype` Bean 生成一个代理，注入的是代理，每次方法调用时再去取真实实例。**三种解法的本质都是「延迟到使用时才去容器取」**。',
                followup:
                  '「`request` 作用域是怎么实现的」——核心是 `RequestContextHolder`，它用 `ThreadLocal` 持有当前请求的 `RequestAttributes`。所以「同一个请求内多次 `getBean` 拿到同一实例」的前提是**同一个线程**——如果你在 `@Async` 方法里访问 `request` 作用域的 Bean，会抛 `IllegalStateException: No thread-bound request found`，因为子线程没有那个 `ThreadLocal`。这是异步场景的经典坑。',
              },
              {
                kind: 'compare',
                title: '六种作用域的语义与代价',
                head: ['作用域', '实例数量', '销毁回调', '典型用途'],
                rows: [
                  ['`singleton`', '每容器 1 个', '**会执行**', '无状态 Service / 配置类 / 连接池'],
                  ['`prototype`', '每次 getBean 1 个', '**不执行**', '有状态的短生命周期对象'],
                  ['`request`', '每请求 1 个', '会执行（请求结束时）', '请求级上下文（用户、traceId）'],
                  ['`session`', '每会话 1 个', '会执行（会话失效时）', '登录用户信息、购物车'],
                  ['`application`', '每 ServletContext 1 个', '会执行', '全局配置、应用级缓存'],
                  ['`websocket`', '每连接 1 个', '会执行', 'WS 会话状态'],
                ],
                caption:
                  '第二、三列是全表的关键：**只有 `singleton` 是「容器完整托管」的**，`prototype` 连销毁都不管，其余四种是「作用域代理 + 容器托管」。所以「用 `prototype` 省内存」是个错觉——它只是把「何时创建」的决定权交出去了，**用完不管，反而更容易泄漏**。真正该用 `prototype` 的场景是「有状态且生命短」，而不是「为了性能」。',
              },
              {
                kind: 'question',
                title: '单例 Bean 是线程安全的吗？',
                questionId: 'java-05-Q12',
                intent:
                  '标准答案分两半：**只保证创建线程安全，不保证使用线程安全**。然后给出「无状态设计」这个正解。',
                points: [
                  '**不一定安全**。Spring 只保证「**创建过程**」线程安全（单例缓存用 `ConcurrentHashMap` + 双重检查），不保证「**使用过程**」线程安全',
                  '**为什么不安全**：单例意味着「所有请求共用同一个实例」。若 Bean 有**可变成员变量**（如把 `userInfo` 存进字段），并发请求会互相覆盖',
                  '**为什么实际很少出问题**：Controller / Service 大多是**无状态**的——数据都走方法参数与局部变量，局部变量在各线程的栈帧里天然隔离',
                  '**解法一（推荐）：无状态设计**。所有「随请求变化的数据」都当作方法参数传递，不放进字段',
                  '**解法二：用 `ThreadLocal`** 保存请求级数据。注意线程池复用线程，**必须在 `finally` 里 `remove()`**，否则既泄漏又串数据',
                  '**解法三：用并发工具**。需要共享可变状态时，用 `AtomicInteger`、`ConcurrentHashMap`、`LongAdder`，而不是裸字段',
                  '**解法四：改作用域**。`prototype` / `request` 可以做到「每请求一实例」，但有创建开销，且 `prototype` 注入单例还会退化（见上题）',
                ],
                depth:
                  '「Spring 只保证创建线程安全」这句话具体指什么？指「**同一个单例不会被创建两次**」。`DefaultSingletonBeanRegistry.getSingleton` 用的是「先查 `singletonObjects`（无锁快路径）→ 加锁 → 再查一次（双重检查）→ 创建并放入」的模式。所以并发 `getBean` 也只会造一个实例。但**创建完成之后**，这个实例被多个线程共享，Spring 完全不管——它没有、也无法知道你的字段该怎么同步。**这就是「框架能给你对象，但管不了你的对象是否可共享」**。',
                followup:
                  '「`@Controller` 里注入 `HttpServletRequest` 安全吗」——安全，但要注意机制：注入的其实是**作用域代理**（`request` 作用域的 `TARGET_CLASS` 代理），每次方法调用时才通过 `RequestContextHolder` 去当前线程取真实 request。所以它看起来像「单例里塞了请求对象」，实际是「每次访问时现取」。这也解释了为什么**不能在构造器里用 `HttpServletRequest`**——那时还没有请求上下文。',
              },
              {
                kind: 'question',
                title: 'Spring 有哪几种注入方式？为什么官方推荐构造器注入？',
                questionId: 'java-05-Q13',
                intent:
                  '三种方式 + 四条理由。能补上「单构造器可省略 `@Autowired`」「Spring Boot 2.6+ 默认禁止循环依赖」就是加分。',
                points: [
                  '**构造器注入**：依赖作为构造参数传入。字段可 `final`，对象一出生依赖就齐全',
                  '**Setter 注入**：通过 setter 方法注入，适合**可选依赖**（可以配置默认值）',
                  '**字段注入**：`@Autowired` 直接标在字段上，最简洁但问题最多',
                  '**理由一：依赖不可变**。`private final Foo foo` 保证对象状态一致，不会被后续误改',
                  '**理由二：不会出现「半初始化对象」**。构造器注入失败就创建失败，不会有「依赖为 null 的 Bean」在容器里存活',
                  '**理由三：单测友好**。直接 `new Service(mockRepo)`，不需要起容器、不需要反射',
                  '**理由四：提前暴露循环依赖**。字段注入靠反射能绕过循环依赖（注入 null 后再补），于是问题被推迟到运行时；构造器注入直接启动失败',
                  '**官方口径**：强制依赖用构造器，可选依赖用 Setter；**单构造器时 `@Autowired` 可以省略**（Spring 4.3+ 自动识别）',
                ],
                depth:
                  '「字段注入靠反射绕过循环依赖」值得深挖：字段注入的 Bean 在「实例化」时不需要依赖（构造器无参），所以可以先造出空壳、放进三级缓存、再填充属性。而构造器注入必须在「实例化」时就拿到依赖——此时对方还没造出来，于是**无法提前暴露**，只能报 `BeanCurrentlyInCreationException`。这正好接上下一课的「三级缓存为什么解决不了构造器循环依赖」。**Spring Boot 2.6 起默认 `spring.main.allow-circular-references=false`**，就是把这个「被字段注入掩盖的问题」重新暴露出来。',
                followup:
                  '「构造器注入的 Bean 很多依赖怎么办」——若构造器有 8 个参数，说明这个类**职责太多**，是设计问题而不是注入方式问题。这也是构造器注入的一个隐性好处：**它让「依赖过多」变得刺眼**（字段注入时你根本不会去数）。重构方向是拆分职责，而不是退回字段注入。',
              },
              {
                kind: 'diagram',
                title: '构造器注入 vs 字段注入：差别在「什么时候拿到依赖」',
                body: [
                  '两种方式的实质差别不是「写法」，而是「依赖到达的时刻」。这决定了能否 `final`、能否测试、能否暴露循环依赖。',
                ],
                diagram: {
                  type: 'split',
                  left: {
                    title: '✓ 构造器注入',
                    tone: 'good',
                    items: [
                      '依赖在「实例化」时到齐，对象一出生就完整',
                      '字段可声明 `final`，状态不可变',
                      '单测直接 `new Service(mockRepo)`，零容器',
                      '循环依赖**启动即失败**，问题暴露在最早期',
                      '单构造器时 `@Autowired` 可省略',
                      '依赖过多时「参数列表很长」，刺眼 → 促使人重构',
                    ],
                  },
                  right: {
                    title: '✗ 字段注入',
                    tone: 'bad',
                    items: [
                      '依赖在「属性填充」时才注入，中间存在「半初始化」窗口',
                      '字段不能 `final`，运行期可被改动',
                      '单测必须起容器或用反射注入',
                      '循环依赖被反射「绕过」，问题推迟到运行时',
                      '必须写 `@Autowired`，且无法标注可选性（除 `required=false`）',
                      '依赖藏在字段里，类变得「看起来很简单」→ 掩盖职责过多',
                    ],
                  },
                  caption:
                    '注意右边第四条的「绕过」是怎么发生的：字段注入的 Bean 是**无参构造**，容器可以先把空壳造出来、放进三级缓存，再去填充属性——于是 A、B 互相依赖也能「先各造一个空壳再互相塞」。这个过程看似解决了问题，实际是**把「设计上的循环」藏起来了**。Spring Boot 2.6 默认禁止循环依赖，正是要把这个隐藏问题重新变成启动错误。',
                },
              },
              {
                kind: 'question',
                title: '@Autowired 和 @Resource 的区别？',
                questionId: 'java-05-Q14',
                intent:
                  '四行对照：来源、匹配策略、可用位置、特殊属性。最后补「多个同类型 Bean 怎么办」。',
                points: [
                  '**来源不同**：`@Autowired` 是 **Spring** 提供的；`@Resource` 是 **JDK 标准**（JSR-250，`javax.annotation` / `jakarta.annotation`）',
                  '**匹配策略不同**：`@Autowired` 默认**按类型**（`byType`），多个候选时再按字段名兜底，可配 `@Qualifier` / `@Primary` 消歧；`@Resource` 默认**按名称**（`name` 属性 → 字段名），找不到再按类型',
                  '**可用位置不同**：`@Autowired` 可用于**构造器、方法、字段、参数**；`@Resource` 只能用于**字段与 setter 方法**，不能标在构造器上',
                  '**特殊属性**：`@Autowired(required=false)` 允许注入失败（留 null）；`@Resource` 没有 `required`',
                  '**多个同类型 Bean 的三种解法**：① `@Primary` 标首选；② `@Qualifier("beanName")` 指定名称；③ 让**字段名与 Bean 名一致**（`@Autowired` 的兜底策略）',
                  '**报错**：`NoUniqueBeanDefinitionException`（期望一个但找到多个）或 `NoSuchBeanDefinitionException`（一个都没找到）',
                  '**实战建议**：统一用构造器 + `@Autowired`（或省略），少用 `@Resource`；需要按名称时优先 `@Qualifier` 而不是依赖字段名',
                ],
                depth:
                  '「按名称兜底」这个行为容易被误解。`@Autowired` 在「类型匹配到多个候选」时，会拿**字段名/参数名**去和候选的 **beanName** 比对；若命中就选它，若都不命中才报错。所以「改字段名导致注入失败」是真实存在的故障——**这也是「依赖字段名兜底」不建议依赖的原因**：重构时改个变量名就炸。相比之下 `@Qualifier` 是显式的，改名不影响。**框架的「智能兜底」在重构友好性上往往是负资产。**',
                followup:
                  '「`@Resource` 是按名称，那 name 不写时怎么办」——`CommonAnnotationBeanPostProcessor` 会在 `name` 为空时用**字段名/方法名**作为 beanName 去查；查不到再退化为**按类型**匹配（此时若多个候选，同样报错）。所以它的实际策略是「**先名称、后类型**」，与 `@Autowired` 正好相反。这个顺序差异，在两个同类型 Bean 且字段名恰好等于其中一个 beanName 时，会导致两者注入**不同**的 Bean——这是很隐蔽的坑。',
              },
              {
                kind: 'question',
                title: '@Autowired 的实现原理是什么？',
                questionId: 'java-05-Q15',
                intent:
                  '必须落到 `AutowiredAnnotationBeanPostProcessor` 与 `InjectionMetadata`，并解释「为什么不能用 static」「为什么构造器里拿不到字段依赖」。',
                points: [
                  '**处理者**：`AutowiredAnnotationBeanPostProcessor`（一个 `InstantiationAwareBeanPostProcessor`），在 `refresh()` 的 `registerBeanPostProcessors` 阶段被注册',
                  '**第一步：扫描元数据**。容器为每个 Bean 类型构建 `InjectionMetadata`——找出所有 `@Autowired` 的**构造器、字段、方法**，并缓存（按 Class 缓存，避免重复反射）',
                  '**第二步：选构造器**。若只有一个构造器或只有一个带 `@Autowired`，就用它；若有多个带 `@Autowired`，`required=true` 的只能有一个',
                  '**第三步：属性填充时注入**。在 `populateBean` 阶段回调 `postProcessProperties`，通过反射把依赖写进字段（`field.set`）或调用 setter',
                  '**第四步：解析依赖**。走 `DefaultListableBeanFactory.resolveDependency`——按类型找候选，多个时按 `@Qualifier` / `@Primary` / 字段名消歧',
                  '**为什么不能用于 `static` 字段**：`static` 属于**类**而不属于实例，而 BPP 处理的是「实例的字段」。对一个 `static` 字段做 `field.set(beanInstance, value)` 虽然语法可行，但语义上不属于这个 Bean——Spring 直接忽略（不报错但注入不生效）',
                  '**为什么构造器里拿不到字段注入的依赖**：构造器执行时还在「实例化」阶段，属性填充（②）尚未开始，字段当然是 null',
                ],
                depth:
                  '`InjectionMetadata` 的设计值得注意：它按 **Class** 缓存（`injectionMetadataCache`），而不是按实例。因为「一个类有哪些 `@Autowired` 字段」是类级别的信息，同一个类的所有实例共享。这带来一个可观测结论：**`@Autowired` 字段的反射查找只发生一次**（首次创建该类实例时），之后都走缓存——所以字段注入的性能开销没有想象中那么大。**但它省下的性能，远不足以抵消它在可测试性与循环依赖上的代价。**',
                followup:
                  '「怎样在静态方法里用容器里的 Bean」——标准做法是实现 `ApplicationContextAware`，把 `ApplicationContext` 存到一个静态字段里，然后 `ctx.getBean(...)`。这本质是「依赖查找」，属于「不得已才用」的手段（工具类、遗留代码桥接）。更好的做法是把静态方法改成实例方法，让调用方注入依赖——**「静态持有容器」是 Spring 反模式里最常见的一个**。',
              },
              {
                kind: 'question',
                title: '@PostConstruct、afterPropertiesSet、init-method 的执行顺序？销毁呢？',
                questionId: 'java-05-Q16',
                intent:
                  '顺序是硬知识：初始化 `@PostConstruct` → `afterPropertiesSet` → `init-method`；销毁 `@PreDestroy` → `destroy` → `destroy-method`。',
                points: [
                  '**初始化顺序（固定）**：`@PostConstruct` > `InitializingBean.afterPropertiesSet()` > `init-method`',
                  '**销毁顺序（固定）**：`@PreDestroy` > `DisposableBean.destroy()` > `destroy-method`',
                  '**为什么是这个顺序**：`@PostConstruct` 由 `CommonAnnotationBeanPostProcessor` 在 `postProcessBeforeInitialization` 里反射调用（最早）；`afterPropertiesSet` 是 `invokeInitMethods` 的第一步（容器内置逻辑）；`init-method` 是第二步（用户配置）——**「标准注解 → 框架接口 → 自定义配置」的由内到外顺序**',
                  '**三者可以同时存在**，都会按序执行，互不排斥',
                  '**实战建议**：业务代码统一用 `@PostConstruct` / `@PreDestroy`（JSR 标准，与容器耦合低，换框架也能用）；`InitializingBean` 只出现在框架开发里',
                  '**注意 `prototype`**：初始化会执行，但**销毁不会**（容器不持有实例）',
                  '**注意异常**：`@PostConstruct` 抛异常 → Bean 创建失败 → `BeanCreationException`，容器启动失败（单例场景）',
                ],
                depth:
                  '为什么 `@PostConstruct` 在 `afterPropertiesSet` 之前？因为前者是「**BPP 的前置回调**」，后者是「**初始化方法本身**」——BPP 包在初始化方法外面，所以必然更早。理解这一层，就不用死记顺序：**BPP 前置 → 初始化方法（`afterPropertiesSet` 然后 `init-method`）→ BPP 后置**。同理销毁时，`@PreDestroy` 也是由 `CommonAnnotationBeanPostProcessor` 处理的（在 `DestructionAwareBeanPostProcessor` 回调里），所以早于 `destroy()`。**记住「BPP 永远在最外层」，顺序自然就出来了。**',
                followup:
                  '「`@Bean(initMethod="x")` 和 `@PostConstruct` 谁先」——`@PostConstruct` 先。因为 `initMethod` 对应的是 `init-method` 那一档（最后），而 `@PostConstruct` 是 BPP 前置。**三种方式并存时，`@PostConstruct` 永远第一个跑**。这也意味着：若初始化逻辑依赖「所有注入都完成」，`@PostConstruct` 是安全的（属性填充已经结束）；但若依赖「其他 Bean 也已就绪」，就要用 `SmartInitializingSingleton`。',
              },
              {
                kind: 'question',
                title: 'BeanPostProcessor 和 BeanFactoryPostProcessor 有什么区别？',
                questionId: 'java-05-Q17',
                intent:
                  '一句话就能答完：**BFPP 改图纸，BPP 改成品**。再补上「子接口 `InstantiationAwareBeanPostProcessor` 多做了哪些事」。',
                points: [
                  '**`BeanFactoryPostProcessor`（BFPP）**：作用于 **`BeanDefinition`（图纸）**，在所有 Bean **实例化之前**执行，可修改元信息（作用域、属性值、是否懒加载）',
                  '**BFPP 的典型实现**：`ConfigurationClassPostProcessor`（解析 `@Configuration` / `@Bean`）、`PropertySourcesPlaceholderConfigurer`（替换 `${}` 占位符）、`CustomEditorConfigurer`',
                  '**`BeanPostProcessor`（BPP）**：作用于 **Bean 实例**，在**每个 Bean 的初始化前后**各回调一次',
                  '**BPP 的典型实现**：`AutowiredAnnotationBeanPostProcessor`（`@Autowired`）、`CommonAnnotationBeanPostProcessor`（`@Resource` / `@PostConstruct`）、`AnnotationAwareAspectJAutoProxyCreator`（**AOP 代理**）',
                  '**子接口 `InstantiationAwareBeanPostProcessor`** 额外提供三个钩子：`postProcessBeforeInstantiation`（实例化前可**短路返回代理**）、`postProcessAfterInstantiation`（实例化后是否继续填充）、`postProcessProperties`（属性填充，`@Autowired` 就在这里）',
                  '**执行次数**：BFPP **只跑一次**（容器启动时）；BPP 对**每个 Bean** 都跑',
                  '**顺序约束**：BFPP 先于 BPP；BPP 本身也是 Bean，但会在「普通 Bean 之前」被创建（`registerBeanPostProcessors` 阶段提前实例化）',
                ],
                depth:
                  '「BPP 自己也会被 BPP 处理吗」——会有例外。容器在 `registerBeanPostProcessors` 阶段创建 BPP 实例时，**只应用「已注册的」BPP**，而当前正在注册的这个还不算。所以「BPP 处理自己」是不成立的自举。这个细节解释了「为什么在 BPP 里注入的依赖可能不全」——因为那时其他 BPP 可能还没就位。**写 BPP 时的纪律是：不要在 BPP 里依赖「其他 BPP 已经生效」这件事**，否则会得到难以复现的启动问题。',
                followup:
                  '「`postProcessBeforeInstantiation` 短路返回对象意味着什么」——意味着**跳过整个后续流程**（属性填充、初始化都不做），直接用你返回的对象。这是 `ProxyFactoryBean` 与某些 AOP 场景的实现方式。但代价很大：**返回的对象不经过 `@Autowired` 处理**，所以「短路代理」通常只用于「目标对象完全由自己构造」的场景。**这也是为什么 AOP 默认在 `postProcessAfterInitialization` 做代理，而不是在实例化前。**',
              },
              {
                kind: 'compare',
                title: 'BFPP 与 BPP 的分工',
                head: ['维度', 'BeanFactoryPostProcessor', 'BeanPostProcessor'],
                rows: [
                  ['作用对象', '`BeanDefinition`（图纸）', 'Bean 实例（成品）'],
                  ['执行时机', '所有 Bean 实例化**之前**', '**每个** Bean 初始化前后'],
                  ['执行次数', '**一次**', '每 Bean **两次**（前置 + 后置）'],
                  ['能否替换对象', '不能（只改元信息）', '**能**（返回值替代原对象）'],
                  ['典型实现', '`ConfigurationClassPostProcessor`', '`AutowiredAnnotationBeanPostProcessor`'],
                  ['能改作用域吗', '**能**（改 BeanDefinition）', '不能'],
                  ['能加 AOP 吗', '不能', '**能**（`postProcessAfterInitialization`）'],
                ],
                caption:
                  '第四、六行是核心差异：**只有 BPP 能「替换对象」，也只有 BFPP 能「改作用域」**。所以「我想把某个 Bean 改成 `prototype`」要去 BFPP（或更早的 `BeanDefinitionRegistryPostProcessor`）；「我想给某个 Bean 加一层代理」要去 BPP。**选错扩展点，是「扩展点不生效」的最常见原因。**',
              },
              {
                kind: 'question',
                title: '@Component 和 @Bean 的区别？@Configuration 和 @Component 有什么区别？',
                questionId: 'java-05-Q18',
                intent:
                  '两问合一。第二问的答案是「CGLIB 增强」，能说出 `lite` 模式与 `full` 模式的差别就是满分。',
                points: [
                  '**`@Component`**：标在**类**上，靠组件扫描（`@ComponentScan`）注册。**创建过程由 Spring 全权接管**（反射调构造器 + 属性填充），适用于自己的业务类',
                  '**`@Bean`**：标在**方法**上，方法返回值作为 Bean。**创建过程由你控制**，适用于第三方库的类（改不了源码，如 `ObjectMapper`、`DataSource`、`SqlSessionFactory`）',
                  '**`@Configuration` 与 `@Component` 的关键差异**：`@Configuration` 类会被 **CGLIB 增强**，类内 `@Bean` 方法互相调用会被拦截，**返回容器中的同一个实例**（保证单例语义）',
                  '**`@Component` 里的 `@Bean` 是 `lite` 模式**：方法调用就是普通 Java 调用，直接 `new` 一个新产品，**单例被破坏**',
                  '**判断规则**：`@Bean` 方法之间有依赖（一个方法调另一个），**必须**用 `@Configuration`；互不调用则 `@Component` 也行',
                  '**`@Configuration` 的开关**：`@Configuration(proxyBeanMethods=false)` 可关闭 CGLIB 增强（`lite` 模式），启动更快，适合「`@Bean` 之间无调用」的场景——**Boot 内部大量使用这个优化**',
                ],
                depth:
                  '为什么需要 CGLIB 增强？因为 Java 的方法调用是「静态绑定到 `this`」的：在 `@Configuration` 类里写 `@Bean A a() { return new A(b()); }`，若不增强，`b()` 就是普通方法调用，每次都 `new` 一个新的 `B`——与「`B` 是单例」的语义冲突。CGLIB 生成子类并重写 `b()`，让它先去容器查「有没有 `B`」，有就返回缓存的那个。**这就是「`@Configuration` 的类不能是 `final`」的原因**（CGLIB 靠继承）。',
                followup:
                  '「`@Configuration` 类被增强后，`this` 是什么」——是 CGLIB 子类实例，不是你写的那个类的实例。所以「在 `@Configuration` 里用 `this.xxx()`」与「直接 `xxx()`」在增强后行为一致（都被拦截），但**如果你把配置类注入到别处再调用，也会被拦截**——这正是「保证单例」的效果。反过来，`proxyBeanMethods=false` 时 `this` 就是原对象，调用不再拦截，性能更好但要自己保证不重复创建。',
              },
              {
                kind: 'diagram',
                title: '@Configuration 的 full 与 lite 模式',
                body: [
                  '同一个 `@Bean` 方法，在两种模式下调用结果完全不同。这张图是本课最容易被追问的细节。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '`@Configuration`（full 模式，默认）', note: '类被 CGLIB 增强，`@Bean` 方法被重写' },
                    { label: '配置类里调 `b()`', note: '→ 拦截器先查容器：有 `B` 就返回缓存实例' },
                    { label: '结果：`a` 与 `b` 里的依赖是同一实例', note: '**单例语义成立**' },
                    { label: '`@Component` 或 `proxyBeanMethods=false`（lite 模式）', note: '无 CGLIB，普通方法调用' },
                    { label: '配置类里调 `b()`', note: '→ 每次 `new B()`，产生多个实例' },
                    { label: '结果：单例被破坏', note: '但启动更快（省掉 CGLIB 生成与代理开销）' },
                  ],
                  caption:
                    '这张图解释了两条实践纪律：① **`@Bean` 方法之间不要互相调用**——要么用方法参数注入（`@Bean A a(B b)`，Spring 会自动装配），要么确保是 `@Configuration`。用方法参数是更好的写法，**它不依赖 CGLIB，也不怕 `proxyBeanMethods=false`**。② **配置类不要写成 `final`**，否则 CGLIB 无法继承，启动报错。',
                },
              },
              {
                kind: 'question',
                title: 'Aware 接口有什么用？常见的有哪些？',
                questionId: 'java-05-Q19',
                intent:
                  '本质是「让 Bean 反向拿到容器能力」。要能说出「由谁在什么时候回调」，以及「为什么业务代码慎用」。',
                points: [
                  '**作用**：让 Bean 在**初始化阶段**拿到容器内部的资源对象（容器把自己「感知」给 Bean）',
                  '**常见 Aware**：`BeanNameAware`（自己的 beanName）、`BeanFactoryAware`（`BeanFactory`）、`ApplicationContextAware`（容器）、`EnvironmentAware`（配置与环境）、`ApplicationEventPublisherAware`（事件发布器）、`ResourceLoaderAware`（资源加载）、`EmbeddedValueResolverAware`（占位符解析）',
                  '**回调时机**：`BeanNameAware` / `BeanClassLoaderAware` / `BeanFactoryAware` 由 `invokeAwareMethods` 在**属性填充后**直接调用；`ApplicationContextAware` 等由 `ApplicationContextAwareProcessor`（一个 BPP）在 **`postProcessBeforeInitialization`** 阶段调用',
                  '**典型用途**：工具类静态持有 `ApplicationContext`（按需 `getBean`）、需要读 `Environment` 的组件、需要发布事件的组件',
                  '**代价**：Aware 让代码与 Spring **强耦合**（直接依赖 `ApplicationContext` 类型），且「拿到容器」往往意味着想要「依赖查找」——这与 IoC 的初衷相悖',
                  '**纪律**：业务代码优先用「注入具体依赖」而不是「注入容器再查找」；Aware 主要出现在**框架/基础设施代码**里',
                ],
                depth:
                  '「Aware 回调为什么有两个不同的触发点」？因为 `BeanNameAware` / `BeanFactoryAware` 属于 `spring-beans` 层（`AbstractAutowireCapableBeanFactory.invokeAwareMethods` 硬编码调用），而 `ApplicationContextAware` 属于 `spring-context` 层——`spring-beans` 不能依赖 `spring-context`（模块依赖方向决定），所以只能由 context 层提供一个 BPP（`ApplicationContextAwareProcessor`）来实现。**这个细节正好印证了上一课讲的「模块依赖方向」——知道谁在哪一层，就能推出「这个能力由谁实现」。**',
                followup:
                  '「`ApplicationContextAware` 拿到的是哪个容器」——当前这个 Bean 所属的容器。若存在父子容器（传统 SSM 里 Spring MVC 容器是 Spring 容器的子容器），拿到的可能是子容器，而子容器里看不到父容器的 Bean（反向可以）。这也是「`@Transactional` 在 Controller 层不生效」的历史原因之一——事务管理器 Bean 在父容器，子容器的代理找不到它。Boot 默认只有一个容器，所以这个问题基本消失。',
              },
              {
                kind: 'question',
                title: 'Spring 容器中单例 Bean 和普通 new 出来的对象有什么区别？',
                questionId: 'java-05-Q20',
                intent:
                  '核心是「归属」：生命周期归属容器、能力来自容器。最实用的一句是「自己 new 的 Service 里 `@Autowired` 全是 null」。',
                points: [
                  '**生命周期归属**：Bean 由容器创建、注入、初始化、销毁；`new` 出来的对象完全不归容器管',
                  '**能力归属**：Bean 能享受依赖注入、AOP 增强（事务 / 缓存 / 异步）、事件监听、`@Value` 配置绑定；`new` 出来的对象**这些全都没有**',
                  '**最典型的事故**：`new UserService()` 之后调它的方法，里面的 `@Autowired UserMapper` 是 **null**，`@Transactional` **不生效**——因为它压根不是容器里的那个代理对象',
                  '**本质原因**：所有「容器能力」都建立在「对象由容器创建、并经过 BPP 处理」这个前提上。绕过容器创建，就等于绕过了所有增强',
                  '**反过来也成立**：Bean 可以持有普通对象；普通对象也可以被手动注册进容器（`registerSingleton`）——但那样同样不会经过 BPP 处理',
                  '**常见误用**：`new` 一个 `@Service` 来做单测、`new` 一个带 `@Transactional` 的类来复用逻辑、在静态工具类里 `new` 依赖',
                ],
                depth:
                  '「怎么在 `new` 出来的对象里用容器能力」——正确做法不是「让 new 出来的对象变强」，而是**把它也交给容器**：① 把工具类声明成 `@Component`；② 若必须在非容器环境用（如 `main` 里的临时脚本），手动 `ctx.getBean()` 拿依赖再 `setter` 进去；③ 用 `@Configurable` + AspectJ 的编译期织入（让 `new` 出来的对象也能被注入，但需要额外配置，且只适合特殊场景）。**绝大多数情况下，正确答案是 ①——不要 new 一个有依赖的类。**',
                followup:
                  '「`@Async` 在 `new` 出来的对象里为什么也不生效」——同理，`@Async` 靠 `AsyncAnnotationBeanPostProcessor` 生成代理。`new` 的对象没经过它，自然是同步执行。**这三件事（`@Autowired` 为 null、`@Transactional` 不回滚、`@Async` 不同步）是同一个根因的三个表现**，面试里能一起说出来，比单独背三个「失效原因」有价值。',
              },
              {
                kind: 'question',
                title: '@Value 和 @ConfigurationProperties 有什么区别？',
                questionId: 'java-05-Q21',
                intent:
                  '四行对照：粒度、松散绑定、校验、类型安全。最后给出「少量用 Value，一批用 ConfigurationProperties」的结论。',
                points: [
                  '**`@Value`**：**逐个字段**注入，支持 **SpEL**（`#{...}`）与占位符（`${...}`），适合**少量单个配置**',
                  '**`@ConfigurationProperties`**：把**一组前缀**绑定到配置类的字段上，适合**批量配置**（如连接池、第三方 SDK 参数）',
                  '**松散绑定**：`@ConfigurationProperties` 支持 `my-name` / `myName` / `MY_NAME` / `my.name` 多种写法映射到 `myName` 字段；`@Value` **只认精确的 key**',
                  '**校验**：`@ConfigurationProperties` 可配 `@Validated` + JSR-303（`@NotNull`、`@Min`），启动时校验；`@Value` 不支持',
                  '**IDE 支持**：`@ConfigurationProperties` 配合 `spring-boot-configuration-processor` 能生成元数据，IDE 里有**自动补全与文档提示**；`@Value` 没有',
                  '**类型安全**：`@ConfigurationProperties` 支持复杂类型（`List`、`Map`、嵌套对象）；`@Value` 只能绑简单类型与数组（复杂类型要写 SpEL）',
                  '**注册方式**：`@ConfigurationProperties` 需配合 `@EnableConfigurationProperties(Xxx.class)` 或 `@Component` + `@ConfigurationProperties`；`@Value` 直接可用',
                ],
                depth:
                  '「松散绑定」的实际价值比想象中大：它让「环境变量的命名约束」不再痛苦。Linux 环境变量不允许 `.` 和 `-`，所以 `spring.datasource.url` 要写成 `SPRING_DATASOURCE_URL`——`@ConfigurationProperties` 能自动做这个映射，`@Value("${spring.datasource.url}")` 则会在容器环境里拿不到值（除非改写 key）。**这是「Boot 应用容器化」时最常见的一类配置故障**：本地跑得好，上了 K8s 全部 `null`。',
                followup:
                  '「配置刷新（Nacos / Spring Cloud Config）对两者有什么影响」——`@ConfigurationProperties` 天然支持**批量刷新**（`@RefreshScope` 或配置中心的 `ConfigurationPropertiesRebinder` 会重新绑定整个对象）；`@Value` 的刷新需要 Bean 重新创建（`@RefreshScope` 代理），且字段是 `final` 时无解。所以「需要动态刷新的配置」优先用 `@ConfigurationProperties`——**这也是它在大规模微服务里几乎完全取代 `@Value` 的原因**。',
              },
              {
                kind: 'principle',
                title: '把 Bean 这一课压成四个判断',
                body: [
                  '12 道题的信息量不小，但它们都可以还原为对同一张生命周期图的四次提问。下面四条是「遇到新问题时的判断入口」。',
                ],
                steps: [
                  {
                    title: '① 「这个对象什么时候被创建、被谁创建」',
                    detail:
                      '作用域（`singleton` 预实例化 / `prototype` 每次新建）、懒加载（`@Lazy`）、`FactoryBean` 都会改变答案。**判断依据：看 `BeanDefinition` 的 `scope` 与 `lazyInit` 两个字段**，其他都是它们的组合。',
                  },
                  {
                    title: '② 「这个依赖什么时候被注入」',
                    detail:
                      '构造器注入在「实例化」，字段/setter 在「属性填充」。于是「为什么构造器里 `@Autowired` 字段是 null」「为什么字段注入能绕过循环依赖」都有确定答案——**不是框架的怪癖，是时机决定的**。',
                  },
                  {
                    title: '③ 「我拿到的是原对象还是代理」',
                    detail:
                      'AOP 代理在 `postProcessAfterInitialization` 生成。所以「注入到别处的」是代理，「`this` 调用的」是原对象。**所有「注解不生效」的问题，先问这一句。**',
                  },
                  {
                    title: '④ 「这个钩子在哪一步生效」',
                    detail:
                      'BFPP 改图纸（最早）、BPP 改成品（每个 Bean 两次）、Aware 注入容器能力（属性填充后）、`@PostConstruct` 在 BPP 前置、`SmartInitializingSingleton` 在全部单例之后。**选错钩子是「扩展点不生效」的头号原因。**',
                  },
                ],
                takeaway:
                  '一句话：**Spring 的「魔法」全部可以还原为「时机」**。同一个注解在不同时机做不同的事，同一个接口在不同阶段被调用不同次。所以学 Bean 生命周期不是背八股，而是建立一个「时间轴」——**当你能把任何注解、任何扩展点、任何异常都定位到轴上某个位置时，这一课就真的掌握了**。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'aop-tx',
      title: 'B · 循环依赖、AOP 与事务',
      goal: '掌握代理机制与声明式事务的真实边界',
      summary:
        '这一阶段是 Spring 最容易「一知半解」的部分。循环依赖的三级缓存、AOP 的两种代理、事务的传播行为与失效场景，本质都指向同一个问题：你拿到的到底是不是原始对象。想清楚代理何时生成，很多看似玄学的问题就有确定答案。',
      lessons: [
        {
          id: 'circular-deps',
          title: '循环依赖与三级缓存',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['三、循环依赖'] }],
          content: {
            intro:
              '循环依赖这道题真正的难点不是「三级缓存」这四个字，而是「每一级各自解决了什么问题」。一级放成品，二级放早期引用，三级放对象工厂——很多人能背出这三句话，却答不上来「把三级去掉行不行」「为什么不能只用二级」。本课用一条推演主线把三级缓存「逼」出来：先看没有机制时会发生什么，再看提前暴露为什么可行，最后看第三级为什么不可省略。顺带说清构造器注入、`prototype` 作用域、`@Lazy` 与 Spring Boot 2.6 之后默认禁止循环依赖这四种例外。',
            outline: [
              '三种循环形态：自依赖、两两互依、多重成环；Spring 只解决「单例 + 字段/Setter 注入」这一种',
              '三级缓存的语义：`singletonObjects` 成品、`earlySingletonObjects` 早期引用、`singletonFactories` 工厂',
              '第三级不可省的理由：代理决策必须延迟到「真的有人来要」时才做，否则所有 Bean 都要提前代理',
              '构造器注入与 `prototype` 无解的原因：前者「连对象都没有」，后者「没有缓存这个场所」',
              'Spring Boot 2.6+ 默认 `allow-circular-references=false`，正解是重构，应急手段是 `@Lazy`',
            ],
            pitfalls: [
              '把二级与三级的职责说反：二级存的是「已经取出来的早期引用」，三级存的是「还没调用的工厂」',
              '认为三级缓存能解决所有循环依赖，忽略构造器注入、`prototype`、`@Async` 代理这几种情况',
              '把 `@Lazy` 当成「延迟初始化 Bean」讲，实际上它延迟的是「注入点的解析」而非「Bean 的创建」',
            ],
            sections: [
              {
                kind: 'concept',
                title: '三种循环形态：先认清楚敌人',
                body: [
                  '循环依赖指的是「Bean 之间的依赖关系成环」：造 A 需要 B，造 B 又需要 A。按环的长度可以分成三类，它们的表现完全不同。',
                  '**自依赖**是最短的一种：A 的某个字段是 A 自己。这种在字段注入下能被三级缓存解决（A 实例化后暴露工厂，填充时从二级缓存拿到自己的早期引用），但语义上基本等于「写错了」——面试里提到它能体现你读过源码里 `isSelfReference` 那段判断。',
                  '**两两互依**是教科书场景，A↔B，也是三级缓存最典型的用例。**多重成环**（A→B→C→A）本质上与两两互依没有区别，因为解决机制只关心「能不能拿到早期引用」，不关心环有多长——递归过程中每个 Bean 都会走同一条路径。',
                ],
                points: [
                  '**自依赖**：`A` 的字段类型是 `A`。字段注入可解，但通常是设计错误',
                  '**两两互依**：`A` 需要 `B`、`B` 需要 `A`。三级缓存的标准考场',
                  '**多重成环**：`A`→`B`→`C`→`A`。机制相同，只是递归更深，日志更长',
                  '**是否可解只看两个条件**：作用域是 `singleton`，且依赖在「实例化之后」才需要（字段 / Setter）',
                ],
              },
              {
                kind: 'diagram',
                title: '如果什么都不做，创建流程会撞上什么',
                body: [
                  '假设容器没有任何循环依赖处理机制，只按「造 A 就先造 A 的依赖」这条朴素规则递归，看看会发生什么。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: 'getBean("a")', note: '容器开始创建 A' },
                    { label: '解析 A 的依赖 → 发现需要 B', note: '递归调用 `getBean("b")`' },
                    { label: '创建 B，解析 B 的依赖 → 发现需要 A', note: '递归调用 `getBean("a")`' },
                    { label: 'A 正在创建中，却又被要求创建 A', note: '没有「半成品」可用 → 只能再递归一次' },
                    { label: '无限递归 → StackOverflowError', note: '所以必须有一条「检测并中断」的规则' },
                  ],
                  caption:
                    '注意第 4 步：**问题不是「依赖成环」本身，而是「环上没有任何一个对象是完整的」**。如果容器能在某一刻交出「一个还没填完属性、但地址已经存在」的对象，递归就能被打断——这正是「提前暴露」的思想来源。后面所有的机制（三级缓存、`@Lazy`、`ObjectProvider`）都是在回答同一个问题：**怎么在对象没造完的时候，先给一个「够用的替身」**。',
                },
              },
              {
                kind: 'why',
                title: '为什么 Spring 非要解决它，而不是直接报错',
                body: [
                  '严格说，「依赖成环」在设计上是需要警惕的信号——两个类互相持有，往往意味着职责边界不清。但 Spring 选择了「尽量解决」而不是「一律拒绝」，原因很现实：**在企业级代码里，循环依赖经常是「合理的耦合」**。典型例子是「用户服务需要审计服务记录操作，审计服务又需要用户服务解析操作人」——拆开当然更优雅，但代价是要引入第三个协调者，很多团队不会为一个日志需求去重构。',
                  '更技术性的理由是：**Spring 的注入模型允许「先创建、后填充」**。既然对象可以先 `new` 出来再塞字段，那「半成品」在物理上是存在的，也就有了被复用的可能。这个可能性只要不利用就是浪费，所以 Spring 把它做成了默认行为。',
                ],
                without:
                  '如果 Spring 不做这件事：所有存在循环依赖的项目在升级或重构时都会**直接起不来**，而这类结构在存量系统里极其普遍。所以 Spring 的选择是「默认解决 + 给一个开关关掉」。到 Spring Boot 2.6，官方判断「这个宽容已经纵容了太多坏设计」，才把开关默认翻转成 `false`——注意它没有删除能力，只是改了默认值。',
              },
              {
                kind: 'analogy',
                title: '两个部门互相等对方盖章',
                text:
                  '市场部要报销，规定是「财务部先盖章，市场部再盖章」；财务部也有规定「市场部先盖章，财务部再盖章」。两个部门面对面坐着，谁都不肯先动笔，这就是**死锁式的循环依赖**——对应构造器注入，因为「盖章」是办事的**前提条件**。\n\n三级缓存的做法相当于给每个部门发一张**「临时受理单」**：只要你的申请材料交进来了（实例化完成），哪怕章还没盖全，也先给你一张写着「正在办理」的单子。对方看到这张单子就认可「这事有人在办」，于是愿意先动笔。等两边的正式章都盖完了，临时单作废。**关键在于：临时单必须在「交材料」之后、「盖章」之前发出去**——发早了没材料可依据，发晚了对方已经卡死了。',
                mapping: [
                  { real: '两个部门各自的盖章规定', tech: '构造器注入：依赖是「创建的前提」' },
                  { real: '面对面僵住，谁都不动', tech: '无限递归 / `BeanCurrentlyInCreationException`' },
                  { real: '材料交进来（表填好了）', tech: '`createBeanInstance` 完成实例化，对象地址已存在' },
                  { real: '「正在办理」的临时受理单', tech: '`singletonFactories` 里暴露的 `ObjectFactory`' },
                  { real: '临时单换成正式的「已受理」回执', tech: '工厂被调用，结果放进 `earlySingletonObjects`（二级）' },
                  { real: '正式章盖完，临时单作废', tech: '`addSingleton` 放入一级缓存，清理二、三级' },
                  { real: '临时单不能当正式文件对外用', tech: '早期引用**属性未填充、未初始化**，只能用于「先存着」' },
                ],
              },
              {
                kind: 'concept',
                title: '三级缓存：三个 Map 各管一段',
                body: [
                  '三级缓存不是一个「缓存」，而是 `DefaultSingletonBeanRegistry` 里的三个字段。它们的类型不同，这本身就是最重要的一条信息：**前两个存对象，第三个存「能产出对象的函数」**。',
                  '**一级 `singletonObjects`**：`Map<String, Object>`，存完整成品。所有正常的 `getBean` 都先查它，命中就直接返回，这是性能最高的一条路径。',
                  '**二级 `earlySingletonObjects`**：`Map<String, Object>`，存「早期引用」——对象已经实例化，但属性还没填、初始化还没跑。它的作用不是「加速」，而是**保证「同一个 Bean 的早期引用只被解析一次」**：同一个 Bean 可能被多个地方同时要早期引用，如果每次都调三级工厂，就会生成多个代理对象，最终「容器里的 A」和「别人手里的 A」不是同一个对象，这会引发极难排查的问题（比如 `@Transactional` 在哪一个上生效）。',
                  '**三级 `singletonFactories`**：`Map<String, ObjectFactory<?>>`，存的是 lambda——`() -> getEarlyBeanReference(beanName, mbd, bean)`。它是「延迟决策」的载体：**存进去的时候不产生任何对象，只有被调用时才决定「要不要代理、怎么代理」**。第三级的全部价值都在这个「延迟」上。',
                ],
                points: [
                  '**一级 `singletonObjects`**：`Map<String, Object>`，成品缓存，`getBean` 的第一站',
                  '**二级 `earlySingletonObjects`**：`Map<String, Object>`，早期引用，保证「同一 Bean 只解析一次」',
                  '**三级 `singletonFactories`**：`Map<String, ObjectFactory<?>>`，存 lambda，负责「延迟决定是否代理」',
                  '**辅助标记 `singletonsCurrentlyInCreation`**：`Set<String>`，记录「正在创建中」的 Bean，是检测环的依据',
                  '**关系是「升级」不是「并存」**：三级被调用 → 结果放二级、三级移除；成品入一级 → 二级移除',
                ],
              },
              {
                kind: 'diagram',
                title: '三个 Map 的结构与数据形态',
                body: [
                  '把三个字段画在一起，注意它们的「值」的类型差别——这是理解第三级的关键。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '一级缓存',
                      note: 'singletonObjects',
                      slots: [
                        { label: '类型', value: 'Map<String, Object>', tone: 'good' },
                        { label: '存什么', value: '完整成品 Bean', tone: 'good' },
                        { label: '何时放入', value: '初始化完成后', tone: 'good' },
                        { label: '典型内容', value: 'userService → 完整对象', tone: 'good' },
                      ],
                    },
                    {
                      name: '二级缓存',
                      note: 'earlySingletonObjects',
                      slots: [
                        { label: '类型', value: 'Map<String, Object>', tone: 'primary' },
                        { label: '存什么', value: '早期引用（或代理）', tone: 'primary' },
                        { label: '何时放入', value: '三级工厂被调用后', tone: 'primary' },
                        { label: '作用', value: '去重，同一 Bean 只解析一次', tone: 'primary' },
                      ],
                    },
                    {
                      name: '三级缓存',
                      note: 'singletonFactories',
                      slots: [
                        { label: '类型', value: 'Map<String, ObjectFactory<?>>', tone: 'warn' },
                        { label: '存什么', value: 'lambda，不是对象', tone: 'warn' },
                        { label: '何时放入', value: '实例化后、填充前', tone: 'warn' },
                        { label: '作用', value: '延迟到「被要」时才决策', tone: 'warn' },
                      ],
                    },
                  ],
                  caption:
                    '盯着第三级的类型看：**`Map<String, ObjectFactory<?>>` 存的是函数**。如果第三级存的也是对象，那它和二级就没有区别了——两级就够。所以「需要第三级」这个结论，等价于「需要把「产出早期引用」这个动作推迟」。**为什么必须推迟？因为产出早期引用可能要生成 AOP 代理，而代理是个有代价、且需要判断的决定**。下一节就讲这一层。',
                },
              },
              {
                kind: 'principle',
                title: '提前暴露：为什么「半成品」可以给别人用',
                body: [
                  '三级缓存的合法性建立在一个事实上：**Java 对象的引用在构造器返回的那一刻就已经确定且不再变化**。属性填充、初始化方法、AOP 代理都不改变「这个地址上的对象」——它们只是往对象里塞字段、调方法，或者在容器层面「换一个对象存进缓存」。',
                  '所以从 `createBeanInstance` 返回之后，到 `populateBean` 之前，存在一个短暂的窗口：**对象存在、地址确定，但内容不完整**。在这个窗口里把引用交出去，接收方拿到的就是一个「能存着但不能用」的东西——只要它不在这个时刻调用方法，就不会出问题。而依赖注入恰好满足这个条件：注入只是「把引用赋给字段」，不调用。',
                ],
                steps: [
                  {
                    title: '① 打标记：进入创建流程',
                    detail:
                      '`getSingleton(beanName, singletonFactory)` 里先调 `beforeSingletonCreation(beanName)`，把名字加进 `singletonsCurrentlyInCreation`。这个 Set 是后面检测「环」的唯一依据——**它记的不是「创建过」，而是「正在创建中」**。',
                  },
                  {
                    title: '② 实例化：拿到原始对象',
                    detail:
                      '`createBeanInstance` 通过反射调构造器（或工厂方法）得到裸对象，字段全是默认值。**注意这一步已经要求「所有构造器参数就绪」**——这也是构造器注入无解的根源。',
                  },
                  {
                    title: '③ 暴露工厂：把 lambda 放进三级缓存',
                    detail:
                      '`addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean))`。这里只是**注册了一个函数**，没有生成任何代理、没有调用任何 BPP。这个时机极其关键：它在 `populateBean` 之前。',
                  },
                  {
                    title: '④ 填充属性：环在这里被撞上',
                    detail:
                      '`populateBean` 处理 `@Autowired` 时，发现需要 B，于是 `getBean("b")`；B 同样走 ①②③，然后在填充时又要 A。此时 `getSingleton("a", true)` 会发现一级没有、而 `a` 正在创建中，于是查二级、再查三级。',
                  },
                  {
                    title: '⑤ 调用工厂：此刻才决定要不要代理',
                    detail:
                      '三级里的 lambda 被调用 → `getEarlyBeanReference` 遍历所有 `SmartInstantiationAwareBeanPostProcessor`，其中 `AbstractAutoProxyCreator` 会判断「这个 Bean 是否需要 AOP」。需要就**当场生成代理并返回代理**，不需要就返回原始对象。结果放进二级缓存，三级移除。',
                  },
                  {
                    title: '⑥ 归一：成品进一级，清理二三级',
                    detail:
                      'A、B 各自完成初始化后，`addSingleton` 把成品放进 `singletonObjects`，同时 `earlySingletonObjects.remove(beanName)`、`singletonFactories.remove(beanName)`。**所以一个 Bean 创建完成后，只剩一级缓存里有它**——如果你在运行时看到二级缓存非空，说明有 Bean 还卡在创建流程里。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: 'A 与 B 互依：完整时序',
                body: [
                  '把上面六步压到一条时间线上。注意「暴露工厂」发生在「填充属性」之前，这个顺序是整个机制成立的前提。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['容器', 'A', 'B', '三级缓存'],
                  messages: [
                    { from: '容器', to: 'A', text: 'getBean("a") → 标记创建中，反射实例化' },
                    { from: 'A', to: '三级缓存', text: 'addSingletonFactory(a, () -> 早期引用)' },
                    { from: 'A', to: '容器', text: '填充属性：需要 b，触发 getBean("b")' },
                    { from: '容器', to: 'B', text: '实例化 B，同样先暴露工厂' },
                    { from: 'B', to: '容器', text: '填充属性：需要 a，触发 getBean("a")' },
                    { from: '容器', to: '三级缓存', text: '一级 miss、a 正在创建中 → 查二级、再查三级' },
                    { from: '三级缓存', to: 'B', text: '调工厂得早期引用 → 放入二级、移出三级', reply: true },
                    { from: 'B', to: '容器', text: 'B 初始化完成，放入一级缓存' },
                    { from: '容器', to: 'A', text: 'A 拿到成品 b，完成填充与初始化，放入一级', reply: true },
                  ],
                  caption:
                    '第 5、6 步是全图核心：**B 在填充属性时反向请求 A，此时 A 只完成了「实例化」**。如果没有第 2 步提前暴露的工厂，第 6 步就只能看见「A 正在创建中」这个标记，然后抛 `BeanCurrentlyInCreationException`——这也正是构造器注入会走到的结局。另外注意第 7 步：B 拿到的可能是**代理**而不是原始 A，所以「B 里持有的 A」和「容器里的 A」是同一个对象这件事，是靠第 6 步的二级缓存去重来保证的。',
                },
              },
              {
                kind: 'diagram',
                title: '三级缓存的职责对照',
                body: [
                  '三个字段容易被记混，用一张表把「存什么、何时放、为什么存在」钉死。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['级别', '字段 / 类型', '存的内容', '放入时机', '存在的理由'],
                  cols: ['字段 / 类型', '存的内容', '放入时机', '存在的理由'],
                  rows: [
                    ['一级', '`singletonObjects`\n`Map<String,Object>`', '完整成品（代理或原对象）', '初始化完成后', '正常获取的快路径'],
                    ['二级', '`earlySingletonObjects`\n`Map<String,Object>`', '早期引用（可能已代理）', '三级工厂被调用后', '保证同一 Bean 只解析一次'],
                    ['三级', '`singletonFactories`\n`Map<String,ObjectFactory>`', 'lambda（尚未执行）', '实例化后、填充前', '把「是否代理」的决策延迟'],
                  ],
                  caption:
                    '第三行「放入时机」是全表的枢纽：**必须是「实例化后、填充前」**。放早了对象还不存在，放晚了循环依赖已经撞上。而「存在的理由」一列显示，三级缓存解决的不是「对象有没有」，而是「**决策什么时候做**」——这是它最容易被忽略、也最容易考到的一点。',
                },
              },
              {
                kind: 'principle',
                title: '为什么必须有第三级：把「代理决策」推迟',
                body: [
                  '这是本课唯一真正需要动脑的推理。假设我们只有两级缓存（一级成品、二级早期引用），能不能work？关键在于：**二级缓存里存的是「对象」，那这个对象是什么时候产出的**？',
                  '只有两级时，唯一能产出「早期引用」的时机就是 `addSingletonFactory` 那一刻——也就是实例化之后、填充之前。可此时**容器还不知道这个 Bean 最终要不要被 AOP 代理**：代理的判断依赖 `AbstractAutoProxyCreator.postProcessAfterInitialization`，而这一步要等初始化完成；更实际的是，判断需要读取 Bean 的注解、advisor 匹配、甚至其他 Bean 的状态。所以只有两级的话，只有两条路可走。',
                  '**路一：在那个时刻就无条件生成代理**。代价是「所有单例 Bean 都要提前走一遍代理判断」，哪怕项目里一个循环依赖都没有。这会改变生命周期语义——正常流程里代理在初始化后生成，代理对象拿到的是「已完成初始化」的真实对象；提前生成意味着代理包着一个**还没初始化**的对象，一旦有人提前调用了方法（比如 `@PostConstruct` 里间接调用），行为就变了。',
                  '**路二：在那个时刻不生成，直接暴露原始对象**。那循环依赖时注入的就是原始对象，而容器里最终存的是代理。于是「别人手里的 A」和「容器里的 A」不是同一个东西——`@Transactional`、`@Async` 全部失效，且没有任何报错。这是最坏的一种 bug。',
                  '第三级缓存正是为了跳出这个二选一：**存一个函数，把「要不要代理」这个问题推迟到「真的有人来要」的那一刻**。没有循环依赖 → 函数永远不会被调用 → 零成本、语义完全不变；有循环依赖 → 恰好在那时决策，且决策结果通过二级缓存去重，保证全局唯一。**所以「第三级不能省」的准确表述是：不能省掉那份「延迟」。**',
                ],
                steps: [
                  {
                    title: '只有两级时的死结',
                    detail:
                      '要么在实例化后就无条件代理（成本 + 语义变化），要么暴露原始对象（代理失效）。二者都不可接受，因为「是否代理」此刻无法判断。',
                  },
                  {
                    title: '第三级引入的能力：存函数而非对象',
                    detail:
                      '`() -> getEarlyBeanReference(...)` 把「产出早期引用」这个动作变成可延迟的值。存进去时零代价，调用时才有代价。',
                  },
                  {
                    title: '延迟带来的收益一：无循环依赖时零开销',
                    detail:
                      '绝大多数 Bean 没有循环依赖，它们的工厂永远不会被调用。所以正常 Bean 的代理仍然在 `postProcessAfterInitialization` 生成，语义不变。',
                  },
                  {
                    title: '延迟带来的收益二：决策点拥有完整信息',
                    detail:
                      '工厂被调用时，A 已经实例化、`BeanDefinition` 可读、`@Transactional` 等注解已可解析，`AbstractAutoProxyCreator` 能做出与正常流程一致的判断。',
                  },
                  {
                    title: '二级缓存承担的另一个职责：去重',
                    detail:
                      '如果多个 Bean 同时要 A 的早期引用，每次都调工厂就会生成多个代理。二级缓存把「第一次的结果」存下来，后续直接命中——**保证「早期引用」全局唯一**。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: '三类解决不了的情况：为什么它们无解',
                body: [
                  '面试里「三级缓存能解决所有循环依赖吗」是一道必答「不能」的题。不能的原因可以归到一句：**三级缓存的前提是「对象已经实例化出来了」，凡是不满足这个前提的，它都无能为力。**',
                  '**第一类：构造器注入。** 依赖是构造器的参数，意味着「要实例化就必须先有依赖」。造 A 要先造 B，造 B 要先造 A，递归发生在 `createBeanInstance` 内部——此时 A **连对象都不存在**，没有任何东西可以提前暴露。所以必定抛 `BeanCurrentlyInCreationException`，且异常信息会明确提示「Requested bean is currently in creation: Is there an unresolvable circular reference?」。',
                  '**第二类：`prototype` 作用域。** 三级缓存服务于单例，因为「提前暴露」需要一个「全局的存放地点」，而 `prototype` 每次 `getBean` 都新建，容器不持有、也没有地方缓存。源码里 `AbstractBeanFactory.doGetBean` 用 `prototypesCurrentlyInCreation`（一个 `ThreadLocal<Set<String>>`）检测，一旦同线程内重复创建同一个 `prototype` 就直接抛异常——注意它是 `ThreadLocal`，所以跨线程的 `prototype` 循环依赖连检测都检测不到。',
                  '**第三类：`@Async` / 自定义 BPP 造成的「代理后置」。** 这类更隐蔽：`@Async` 的代理不是由 `AbstractAutoProxyCreator` 在 `getEarlyBeanReference` 阶段生成的（`AsyncAnnotationBeanPostProcessor` 不实现 `SmartInstantiationAwareBeanPostProcessor` 的提前引用逻辑），所以循环依赖时 B 拿到的是**原始对象**，`@Async` 静默失效。**这是「三级缓存解决了循环依赖，但没解决代理语义」的经典案例**——能说出这一点，说明你不是背的。',
                ],
                points: [
                  '**构造器注入**：依赖是创建前提，`createBeanInstance` 阶段就递归，无对象可暴露 → 直接抛异常',
                  '**`prototype`**：无缓存场所；`prototypesCurrentlyInCreation` 是 `ThreadLocal`，同线程检测、跨线程失灵',
                  '**`@Async` 等非 `SmartInstantiationAwareBeanPostProcessor` 代理**：能创建成功，但注入的是原始对象，注解静默失效',
                  '**判断口诀**：先问「作用域是不是 singleton」，再问「依赖是不是在实例化之后才需要」',
                ],
              },
              {
                kind: 'compare',
                title: '三种注入方式与循环依赖的关系',
                head: ['注入方式', '依赖到达的时刻', '环形依赖能否解决', '根本原因'],
                rows: [
                  ['构造器注入', '**实例化时**（`createBeanInstance`）', '**不能**，启动即失败', '依赖是创建的前提，此时对象尚未存在，无早期引用可暴露'],
                  ['Setter 注入', '实例化之后（`populateBean`）', '**能**', '对象已存在，可通过三级缓存提前暴露引用'],
                  ['字段注入', '实例化之后（`populateBean`）', '**能**', '与 Setter 同理，靠反射写字段，时机相同'],
                ],
                caption:
                  '第二列是唯一的分界线：**依赖是「创建的前提」还是「创建之后再补」**。前者必然死锁，后者才有「半成品」这个中间态可用。这也解释了官方为什么一边推荐构造器注入、一边承认它会暴露循环依赖问题——**在构造器注入下，循环依赖从「运行时隐患」变成了「启动期报错」，这其实是好事**。',
              },
              {
                kind: 'concept',
                title: '绕过手段：@Lazy 与 ObjectProvider 的原理',
                body: [
                  '既然构造器注入的循环依赖无解，工程上怎么办？两种不改结构的绕过手段，本质都是**把「实例化期依赖」变成「调用期依赖」**。',
                  '**`@Lazy`**：加在注入点（字段、参数、方法）上时，Spring 不会真的去 `getBean` 目标对象，而是注入一个**延迟解析代理**。`ContextAnnotationAutowireCandidateResolver.buildLazyResolutionProxy` 用 CGLIB（目标有接口时也可用 JDK 代理）生成一个子类，代理内部持有 `BeanFactory` 与 `beanName`，**第一次调用方法时才 `getBean(beanName)` 并委派**。所以创建 A 时「并不真的需要 B」，环被打断。注意它延迟的是「注入点的解析」，不是「Bean 的创建时机」——Bean 仍然是启动时创建的单例（除非配合 `@Lazy` 标在 `@Component` 上，那才是延迟初始化）。',
                  '**`ObjectProvider<T>`**：注入的是一个「提供者」，容器只把它自己的 `BeanFactory` 塞进去，`getObject()` 时才真正取。相比 `@Lazy`，它的延迟是**显式**的（你自己在代码里调），可读性更好，也能用于「可选依赖」（`getIfAvailable`）与「多实例」（`stream()`）。',
                  '两者都适用于构造器参数——这正是它们比三级缓存强的地方：**三级缓存要求「对象已实例化」，而延迟代理根本不要求「现在就有对象」**。代价是：依赖关系被藏进了运行时，编译期与启动期都发现不了问题，所以官方口径始终是「优先重构，延迟手段只作应急」。',
                ],
                points: [
                  '**`@Lazy` 注入点**：注入的是延迟解析代理，首次调用方法才 `getBean`；底层 `buildLazyResolutionProxy`',
                  '**`@Lazy` 标在类上**：那才是「延迟初始化」语义（`BeanDefinition.lazyInit = true`），两者不要混',
                  '**`ObjectProvider`**：容器注入提供者，`getObject()` 显式取值；支持可选依赖与多实例遍历',
                  '**共同本质**：把「A 创建时必须解析 B」改成「用 B 的时候才解析 B」，环从「创建期」挪到「调用期」',
                ],
              },
              {
                kind: 'concept',
                title: 'Spring Boot 2.6 之后：默认禁止，怎么应对',
                body: [
                  'Spring Boot 2.6 把 `spring.main.allow-circular-references` 的默认值改成了 `false`。机制很直接：启动时把 `false` 传给 `AbstractAutowireCapableBeanFactory.setAllowCircularReferences`，于是 `doCreateBean` 里那个判断——`mbd.isSingleton() && this.allowCircularReferences && isSingletonCurrentlyInCreation(beanName)`——直接为假，**三级缓存的工厂根本不会被注册**。结果就是：哪怕是字段注入的循环依赖，也会在启动时失败。',
                  '官方的意图是「让坏设计在启动期暴露」。所以正确的应对顺序是：**① 重构**（抽出第三个 Bean 承担共同依赖、或者把双向依赖改成单向 + 事件）；**② `@Lazy` 或 `ObjectProvider`**（应急，不改变结构但把问题藏进运行时）；**③ 显式开启开关**（`allow-circular-references=true`，只作为升级过渡，需在文档里标注技术债）；**④ `@PostConstruct` 里手动 `applicationContext.getBean()`**（等价于延迟获取，但更难测，不推荐）。',
                  '面试里如果被问「你们怎么处理」，回答应该有层次：**先说默认行为变了，再说机制是「不注册工厂」，最后给出「重构优先 + 应急手段」的判断**。只说「加个配置就好了」会被认为不懂官方为什么改。',
                ],
                points: [
                  '**默认值变更**：`spring.main.allow-circular-references=false`（Boot 2.6 起）',
                  '**生效机制**：`allowCircularReferences` 为 `false` → `doCreateBean` 不调 `addSingletonFactory` → 无早期引用可暴露',
                  '**推荐顺序**：重构（抽中介 / 改事件）> `@Lazy` / `ObjectProvider` > 显式开开关 > 手动 `getBean`',
                  '**开开关的代价**：把「启动期能发现的问题」重新变成「运行期隐患」，属于技术债而非解法',
                ],
              },
              {
                kind: 'question',
                title: '什么是循环依赖？Spring 能解决哪些情况？',
                questionId: 'java-05-Q22',
                intent:
                  '这题是开场题，考的是「分类能力」。上来就讲三级缓存是失分的——先要把「能解决」与「不能解决」的边界划清楚。',
                points: [
                  '**定义**：Bean 之间的依赖成环——造 A 需要 B，造 B 需要 A。递归创建时如果没有中间态可用，就会无限递归或抛异常',
                  '**三种形态**：自依赖（`A` 依赖 `A`）、两两互依（`A`↔`B`）、多重成环（`A`→`B`→`C`→`A`）。机制相同，只是递归深度不同',
                  '**能解决的前提有两个**：① 作用域是 `singleton`（只有单例才有「缓存」这个场所）；② 依赖在**实例化之后**才需要（字段注入 / Setter 注入）',
                  '**能解决的情况**：单例 + 字段/Setter 注入，包括自依赖与多重成环',
                  '**不能解决的情况**：构造器注入（依赖是创建前提）、`prototype` 作用域（无缓存场所）、以及 `@Async` 等「非提前引用类」BPP 生成的代理（能创建成功但代理静默失效）',
                  '**解决机制**：不是「检测到环就特殊处理」，而是**无条件地「提前暴露早期引用」**——每个单例 Bean 在实例化后都会注册工厂，环只是「恰好用上了它」',
                  '**一句话收口**：Spring 解决的是「**单例 + 后置依赖**」这一种；其余三种要么启动失败，要么静默出错',
                ],
                depth:
                  '有一个常被忽略的细节能显著加分：**Spring 并没有「先检测环再决定要不要暴露」**。`addSingletonFactory` 是无条件执行的（只要 `allowCircularReferences` 为 `true` 且是单例），检测环的逻辑只存在于 `getSingleton` 的查询路径上。也就是说「暴露」是常态，「用上」才是特例。理解这一点，就能解释「为什么没有循环依赖的项目也有三级缓存的开销」（其实几乎为零，只是放了个 lambda）、以及「为什么关掉开关就全线失效」（不是检测变严了，而是根本不暴露了）。',
                followup:
                  '「如果 A 依赖 B，B 依赖 C，C 依赖 A，会失败吗」——不会，只要都是单例 + 字段注入。递归过程是 `A` 实例化 → 暴露 `A` → 要 `B` → `B` 实例化 → 暴露 `B` → 要 `C` → `C` 实例化 → 暴露 `C` → 要 `A` → 从三级拿到 `A` 的早期引用 → `C` 完成 → `B` 完成 → `A` 完成。**环的长度不影响可解性，只影响日志里 `singletonsCurrentlyInCreation` 的内容长度**。',
              },
              {
                kind: 'question',
                title: '讲一下三级缓存解决循环依赖的完整流程',
                questionId: 'java-05-Q23',
                intent:
                  '最核心的一题。要能按「打标记 → 实例化 → 暴露工厂 → 填充撞环 → 调工厂 → 归一」六步讲，且说清每步用的是哪个 Map。',
                points: [
                  '**① 打标记**：`getSingleton(beanName, factory)` 先 `beforeSingletonCreation`，把 `a` 加入 `singletonsCurrentlyInCreation`',
                  '**② 实例化**：`createBeanInstance` 反射调构造器，得到裸对象（字段全默认值）',
                  '**③ 暴露工厂**：判断 `mbd.isSingleton() && allowCircularReferences && isSingletonCurrentlyInCreation` 为真，调 `addSingletonFactory(a, () -> getEarlyBeanReference(a, mbd, bean))`，**此时只是注册 lambda**',
                  '**④ 填充撞环**：`populateBean` 处理 `@Autowired B` → `getBean("b")`；`b` 走 ①②③ 后要 `a` → `getSingleton("a", true)`',
                  '**⑤ 三级命中**：一级 miss，但 `a` 在 `singletonsCurrentlyInCreation` 里 → 查二级 miss → 查三级命中 → **调 lambda** → `getEarlyBeanReference` 遍历 `SmartInstantiationAwareBeanPostProcessor`（`AbstractAutoProxyCreator` 在此决定是否代理）→ 结果 `put` 进二级、`remove` 三级',
                  '**⑥ 归一**：`b` 初始化完成后 `addSingleton("b", b)` 进一级、清理二三级；`a` 拿到 `b` 继续填充与初始化，最后同样入一级',
                  '**关键顺序**：`addSingletonFactory` **必须在 `populateBean` 之前**——放晚了环已经撞上；也必须**在 `createBeanInstance` 之后**——放早了对象还不存在',
                  '**一句话**：**每个单例在「实例化后、填充前」无条件暴露一个工厂；环上的 Bean 靠调用别人的工厂拿到早期引用，从而打断递归**',
                ],
                depth:
                  '`getSingleton(String, boolean allowEarlyReference)` 的四层嵌套查询顺序值得背下来：**一级 → 判断是否正在创建 → 二级 → 加锁后重查一级、重查二级 → 三级**。加锁后重查是标准的双重检查，因为 `singletonObjects` 是 `ConcurrentHashMap`，而「取三级 → 调工厂 → 放二级 → 删三级」这四步必须原子——否则两个线程可能同时调工厂，生成两个不同的代理对象。另外 `allowEarlyReference` 参数只在「正常 `getBean`」路径为 `true`，某些内部调用（如 `getBeanNamesForType` 的类型探测）会传 `false`，避免为了探测类型而触发代理生成。**这个设计细节说明 Spring 自己也很清楚：提前引用是有副作用的操作，能不做就不做**。',
                followup:
                  '「`getEarlyBeanReference` 做了什么」——它遍历所有 `SmartInstantiationAwareBeanPostProcessor`，对每个调用 `getEarlyBeanReference(beanName, mbd, bean)`。默认实现直接返回原对象；`AbstractAutoProxyCreator` 覆写了它：若有 `earlyProxyReferences` 缓存则复用，否则调用 `wrapIfNecessary` 生成代理并记入缓存。**注意这个缓存是必要的**——否则同一个 Bean 可能既在「早期引用」时被代理一次，又在 `postProcessAfterInitialization` 时被代理第二次（代理套代理）。实际代码里 `postProcessAfterInitialization` 会检查 `earlyProxyReferences`，若已代理过就直接返回原对象，避免双重代理。',
              },
              {
                kind: 'question',
                title: '为什么需要三级缓存？二级缓存不够吗？',
                questionId: 'java-05-Q24',
                intent:
                  '区分度最高的一题。答「为了 AOP」只有一半分，要说出「**为了让代理决策延迟**」才是完整答案。',
                points: [
                  '**先说清楚二级是什么**：`earlySingletonObjects` 存「已经解析出来的早期引用」，是**对象**；三级 `singletonFactories` 存**函数**',
                  '**只有两级时必须立刻决策**：在 `addSingletonFactory` 时刻（实例化后、填充前）就要产出「早期引用成品」，而此时**容器还不知道这个 Bean 要不要被 AOP 代理**',
                  '**路径一：无条件提前代理**——所有单例都要走一遍代理判断，且代理包着未初始化的对象，`@PostConstruct` 里间接调用会行为异常；语义被改变',
                  '**路径二：直接暴露原始对象**——循环依赖时注入原始对象，容器里最终存代理 → 「别人手里的 A ≠ 容器里的 A」，`@Transactional` / `@Async` 静默失效',
                  '**第三级的解法**：存 lambda，把决策**推迟到「真的有人来要」**那一刻。没有循环依赖 → 工厂永不调用 → 零成本、语义不变',
                  '**二级还有第二个职责：去重**。多个 Bean 同时要 A 的早期引用时，若每次都调工厂会生成多个代理；二级缓存保证「同一 Bean 的早期引用只解析一次」',
                  '**一句话**：**二级解决「存哪儿」，三级解决「什么时候算」**；三级不可省的准确含义是「不能省掉那份延迟」',
                ],
                depth:
                  '再深一层：为什么「代理决策」不能提前？因为 `AbstractAutoProxyCreator.wrapIfNecessary` 依赖 `getAdvicesAndAdvisorsForBean`，而 advisor 的匹配要读注解、要解析 `@Pointcut` 表达式、`@Transactional` 还要读 `TransactionAttributeSource`——这些在「实例化刚完成」时**技术上是可以做的**（`BeanDefinition` 已可读），但有两个实质问题：**一是成本**，每个 Bean 都要做，绝大多数根本不需要代理；**二是正确性**，正常流程下代理在 `postProcessAfterInitialization` 生成，此时 Bean 已经「可用了」，任何提前的代理都会改变「什么时候第一次看到完整 Bean」这个语义。所以 Spring 选择的不是「提前做」，而是「做得刚刚好晚」——这就是 lambda 的价值：**把「做」的时机交给需求方**。',
                followup:
                  '「那能不能用 `ObjectFactory` 直接把原始对象放二级，等后面再替换成代理」——不行，因为引用已经分发出去，无法「替换别人手里的引用」。一旦 B 的字段已经指向原始 A，后面再生成代理也无法改变 B 的字段（除非再走一次属性填充，那就是另一套机制了）。**这正是「必须延迟决策」而不能「先给再换」的根本原因**：Java 里对象引用一旦赋值就不可远程改写。',
              },
              {
                kind: 'question',
                title: '为什么构造器注入解决不了循环依赖？怎么绕过？',
                questionId: 'java-05-Q25',
                intent:
                  '考「时机」这一条主线。要说清「递归发生在 `createBeanInstance` 内部」，所以连对象都没有，三级缓存无从下手。',
                points: [
                  '**根本原因**：构造器参数是「创建的前提」。要 `new A(b)` 必须先有 `b`；要造 `b` 又必须先有 `a`——递归发生在 `createBeanInstance` 内部',
                  '**此时 A 连对象都不存在**，`addSingletonFactory` 还没执行（它在实例化之后），所以**没有任何东西可以提前暴露**',
                  '**报错**：`BeanCurrentlyInCreationException`，信息形如 `Requested bean is currently in creation: Is an unresolvable circular reference?`',
                  '**为什么这其实是好事**：构造器注入把循环依赖从「运行时隐患」变成「启动期报错」，问题暴露在最早期',
                  '**绕过一：`@Lazy` 加在构造器参数上**——注入的是延迟解析代理，创建 A 时不真的解析 B，环被打断',
                  '**绕过二：`ObjectProvider<B>` 作为参数**——注入提供者，`getObject()` 时才取真实对象，语义显式',
                  '**正解**：重构。循环依赖通常意味着「两个类互相承担了对方的部分职责」，抽第三个 Bean 或改成事件驱动才是根除',
                ],
                depth:
                  '一个容易答错的细节点：**构造器注入的循环依赖，报错不是从 `createBeanInstance` 抛出的**，而是更早——`doGetBean` → `getSingleton(beanName, singletonFactory)` → `beforeSingletonCreation`。因为 A 在开始创建时就已经进了 `singletonsCurrentlyInCreation`，所以当递归回到 `getBean("a")` 时，`getSingleton` 一眼看到「a 正在创建中」且一级缓存没有，直接抛异常。换句话说：**Spring 甚至没来得及走到「实例化 A」那一步就已经失败了**。这个细节能说清，说明你是真读过 `DefaultSingletonBeanRegistry` 而不是背流程图。',
                followup:
                  '「一个构造器注入、一个字段注入，混合场景能解决吗」——要看环的方向。若 `A` 用构造器依赖 `B`、`B` 用字段依赖 `A`：创建 A 必须先创建 B，创建 B 时字段注入发现需要 A，而 A 还没实例化（连工厂都没注册）→ **失败**。反之若 `A` 字段依赖 `B`、`B` 构造器依赖 `A`：创建 A 先实例化并暴露工厂，填充时要 B → 创建 B 时构造器要 A → `getSingleton("a")` 走三级缓存拿到早期引用 → **成功**。所以准确说法是「**环上每一段都必须是后置依赖**」，只要有一段是构造器依赖就解不了。',
              },
              {
                kind: 'question',
                title: '@Lazy 解决循环依赖的原理是什么？',
                questionId: 'java-05-Q26',
                intent:
                  '考代理与延迟。关键区分：「延迟解析注入点」不是「延迟初始化 Bean」，混了会被追问死。',
                points: [
                  '**注入点上的 `@Lazy`**：不注入真实对象，注入**延迟解析代理**——由 `ContextAnnotationAutowireCandidateResolver.buildLazyResolutionProxy` 生成（有接口时 JDK 代理，否则 CGLIB）',
                  '**代理内部结构**：持有 `BeanFactory` 与目标 `beanName`，**第一次调用方法时**才 `getBean(beanName)` 并委派给真实对象',
                  '**为什么能打破环**：创建 A 时只需要「一个代理对象」，不需要真的解析 B，于是「A 需要 B、B 需要 A」在同一时刻不再同时成立',
                  '**与「延迟初始化」的区别**：`@Lazy` 标在 `@Component` 类上才是 `lazyInit=true`（启动不创建、首次用时才创建）；标在注入点上是「延迟解析」，Bean 本身仍按时创建',
                  '**优势**：可用于构造器参数——这是三级缓存做不到的（三级缓存要求对象已实例化）',
                  '**代价**：依赖关系藏进运行时，启动期与编译期都发现不了；代理调用有一次间接跳转；`final` 类无法 CGLIB 代理',
                  '**官方口径**：`@Lazy` 是应急手段，不是解法。循环依赖应优先重构',
                ],
                depth:
                  '`buildLazyResolutionProxy` 的实现值得知道一个细节：它生成的是一个**只对「方式」做拦截的代理**，`toString`、`equals`、`hashCode` 会被特殊处理（避免为了打日志就触发 `getBean`）。另外代理的 `InvocationHandler` 里会缓存已解析的目标实例（`resolveBean` 后放进字段），所以不是「每次调用都 `getBean`」——只有第一次是。还有一点常被问到：**`@Lazy` 代理与 AOP 代理会叠两层**，如果目标 Bean 本身还需要事务代理，那么调用链是「延迟代理 → 事务代理 → 真实对象」，此时 `@Transactional` 依然有效（因为事务代理在最内层正常生成）。但如果是 `@Async`，`@Lazy` 反而会掩盖问题——因为异步代理可能根本没生成，而你看到的「能用」只是延迟代理在工作。',
                followup:
                  '「`@Lazy` 会不会让单例变成多例」——不会。延迟代理每次 `getBean` 拿到的仍是容器里的同一个单例（一级缓存命中），所以「延迟」与「多实例」无关。真正会造成多实例的是 `@Scope("prototype")` 或 `proxyMode = TARGET_CLASS` 配置错误。这一点在面试里问得很细，因为它能区分「理解代理」和「背注解」。',
              },
              {
                kind: 'question',
                title: 'Spring Boot 2.6+ 默认禁止循环依赖了，怎么办？',
                questionId: 'java-05-Q27',
                intent:
                  '考版本意识与工程判断。要知道「默认值变了」「机制是不暴露工厂」「正解是重构」三层。',
                points: [
                  '**变更内容**：Spring Boot 2.6 起 `spring.main.allow-circular-references` 默认 `false`',
                  '**生效机制**：`false` 传给 `AbstractAutowireCapableBeanFactory.setAllowCircularReferences`，于是 `doCreateBean` 里的 `earlySingletonExposure` 判断为假，**`addSingletonFactory` 不再调用** → 没有任何早期引用可暴露',
                  '**表现**：字段注入的循环依赖也会启动失败，异常为 `BeanCurrentlyInCreationException` 或 `BeanCurrentlyInCreationException: Error creating bean ... Requested bean is currently in creation`',
                  '**应对顺序 ①**：重构。抽第三个 Bean 承担共同依赖（如 `UserAuditCoordinator`），或把「双向调用」改成「单向依赖 + `ApplicationEvent` 事件」',
                  '**应对顺序 ②**：`@Lazy`（注入点）或 `ObjectProvider`。不改变结构，但把问题移到运行时',
                  '**应对顺序 ③**：显式 `spring.main.allow-circular-references=true`。只作为升级过渡，需要标注技术债',
                  '**不推荐**：`@PostConstruct` 里 `applicationContext.getBean()` 手动取。本质也是延迟获取，但破坏依赖声明、难测试、易在 Bean 未就绪时失败',
                ],
                depth:
                  '官方为什么在这时候改默认值？因为 **Spring Boot 的定位变了**：2.x 早期追求「让存量项目能跑起来」，所以保留了大量宽容行为；到 2.6 之后官方开始系统性地「把隐患变成启动错误」（同期还把 `spring.mvc.pathmatch.matching-strategy` 默认改成 `PATH_PATTERN_PARSER`、禁止了 `@RequestMapping` 无前缀匹配等）。这是一条清晰的演进线：**宁可启动失败，也不要运行时静默出错**。面试里能点出「这是 Boot 整体策略的一部分，不是孤立变更」，会显得你对生态有整体认知。另外注意：`allow-circular-references=false` **只影响「通过三级缓存自动解决」这条路径**，用 `@Lazy` 或 `ObjectProvider` 显式延迟的仍然可用——因为那些根本不走三级缓存。',
                followup:
                  '「为什么很多老项目升级到 2.6 之后突然起不来」——因为它们长期依赖「字段注入 + 三级缓存」这个组合，而这个组合恰好是官方最不推荐的两件事的叠加。**这也是一个反向的启示：如果一个项目升级 Boot 后大面积报循环依赖，说明它的依赖结构已经积累了大量问题，此时「加开关」只是把债延后**。比较务实的做法是：先用开关保证升级完成，再按模块逐步消除（每次消除后把开关关掉验证），最后彻底删除配置。',
              },
            ],
          },
        },
        {
          id: 'aop',
          title: 'AOP 与代理机制',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['四、AOP'] }],
          content: {
            intro:
              'AOP 的知识点看起来零散（术语、代理方式、通知顺序、失效场景），但它们全部挂在一条主线上：**调用方拿到的不是原始对象，而是一个代理；代理在方法调用前后插入拦截器链**。理解了这条链怎么组装、怎么递归执行，通知顺序、`@Order` 排序、自调用失效、JDK 与 CGLIB 的取舍就都能自己推出来，不用背。本课还会讲清一个面试高频追问：Spring Boot 2.0 之后为什么默认改成 CGLIB，以及 Spring AOP 与 AspectJ 的能力边界到底差在哪。',
            outline: [
              '五个术语一次性对齐：切面、连接点、切点、通知、织入；连接点是「所有可能」，切点是「实际选中」',
              '一次代理调用的真实链路：拦截器链 + `ReflectiveMethodInvocation` 的递归，返回值沿栈反向展开',
              '通知顺序的固定规则：`@Around` 包裹最外层，`@After` 永远最后；切面排序看 `@Order` / `Ordered`',
              'JDK 与 CGLIB：接口 vs 继承，Spring Boot 2.0+ 默认 `proxyTargetClass=true` 一律 CGLIB',
              '失效七场景的根因只有一个：**调用没有经过代理**，或者**代理无法覆写**',
            ],
            pitfalls: [
              '把「连接点」与「切点」说成同一个东西：连接点是方法执行这个「时机」，切点是「哪些方法」被选中',
              '认为 `@Around` 不调用 `proceed()` 只影响目标方法执行，实际上它会让所有内层通知都不执行',
              '把 Spring AOP 等同于 AspectJ：前者是运行时代理、只支持方法级；后者是编译/加载期织入、支持字段与构造器',
            ],
            sections: [
              {
                kind: 'concept',
                title: '一条主线：AOP 就是「用代理把你的代码包起来」',
                body: [
                  '先看一个现实问题：日志、事务、权限、监控、缓存——这些逻辑**每个业务方法都要有，但和业务本身无关**。如果直接写进方法里，`UserService` 会被日志语句淹没，而且换个日志框架要改一百个文件。这类逻辑叫「横切关注点」：它横着切过所有纵切的业务模块。',
                  'AOP 的做法是把它抽出来，单独写在一个类里（切面），然后**在方法被调用时插进去**。而「插进去」在 Java 里只有一种不需要改源码的实现方式：**让调用方拿到的对象不是原始对象，而是一个代理**。调用方无感，代理在转发给真实对象的前后执行额外逻辑。',
                  '所以整节课的每个问题都可以还原成这句：**代理是怎么生成的、代理怎么知道要插哪些逻辑、插进去之后顺序是什么、什么情况下代理没起作用**。理解了这条主线，下面所有术语都只是给它起名字。',
                ],
                points: [
                  '**横切关注点**：日志、事务、权限、缓存、监控、幂等——与业务无关但遍布所有方法',
                  '**AOP 的实现手段**：动态代理（运行期生成），而不是修改字节码（那是 AspectJ 的路子）',
                  '**调用方的视角**：`@Autowired UserService` 注入的是代理，`getClass()` 往往不是 `UserService`',
                  '**容器做了什么**：在 `postProcessAfterInitialization` 阶段把原始对象换成代理（这就是「Bean 生命周期第 ⑥ 步」）',
                ],
              },
              {
                kind: 'analogy',
                title: '公司前台：访客登记、门禁、录像',
                text:
                  '你（业务类）在自己的工位上干活，来的访客（调用）本该直接找你。但公司加了一层**前台**（代理）：所有访客必须先去前台登记（`@Before`）、刷卡（权限）、然后由前台带到你的工位（`proceed()`）。等你见完客人（目标方法返回），前台还要记一笔「会面时长」（`@AfterReturning`）；如果客人闹事（抛异常），前台负责拦住并记录（`@AfterThrowing`）；不管怎样，访客离开时都要签退（`@After`）。\n\n关键在于：**访客以为自己在找你，其实一开始接触的是前台**。如果某个访客翻墙直接进了你的工位（自调用 / 自己 `new` 的对象），前台就完全不知道这件事——登记、录像、门禁全部失效。这就是 AOP 失效的本质。',
                mapping: [
                  { real: '访客要办的具体事', tech: '业务方法（目标方法 / target）' },
                  { real: '公司里所有「可能有人来访」的时刻', tech: '连接点（JoinPoint）：可被拦截的时机' },
                  { real: '前台桌上的登记册：只登记某几类访客', tech: '切点（Pointcut）：实际选中哪些方法' },
                  { real: '登记、刷卡、记录时长这些动作', tech: '通知（Advice）：`@Before` / `@After` 等' },
                  { real: '前台这个人（连同登记册和规矩）', tech: '切面（Aspect）= 切点 + 通知' },
                  { real: '把前台摆到门口这个动作', tech: '织入（Weaving）：生成并替换为代理' },
                  { real: '访客翻墙直接进工位', tech: '自调用（`this`）/ 对象不是 Spring Bean → 失效' },
                ],
              },
              {
                kind: 'diagram',
                title: '一次方法调用，实际走了几层',
                body: [
                  '把「代理 + 拦截器链」画成一条走线。注意最后一步：返回值不是直接回去，而是要沿链反向穿过每一个通知。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '调用方：`userService.query(1)`', note: '字段里存的是代理对象的引用' },
                    { label: '代理拦截：`invoke(proxy, method, args)`', note: 'JDK 走 `InvocationHandler`，CGLIB 走 `MethodInterceptor`' },
                    { label: '组装拦截器链', note: '按 `@Order` 排序所有匹配该方法的 Advisor → `List<MethodInterceptor>`' },
                    { label: '链首：`ReflectiveMethodInvocation.proceed()`', note: '维护 `currentInterceptorIndex`，逐个调用' },
                    { label: '中间：每个通知的 `invoke(mi)`', note: '在通知内部再调 `mi.proceed()` → 递归进入下一个' },
                    { label: '链尾：`invokeJoinpoint()`', note: '反射调用目标对象的真实方法' },
                    { label: '返回：沿调用栈反向展开', note: '`@AfterReturning` / `@After` 在这条反向路径上执行' },
                  ],
                  caption:
                    '第 4、5 步是全课最需要理解的地方：**拦截器链不是「循环遍历」，而是「递归调用」**。每个通知的 `invoke` 里都会调用 `mi.proceed()`，`proceed()` 再把索引 +1 调下一个。所以「目标方法」在调用栈的最深处，**所有前置逻辑是「进入时」执行，所有后置逻辑是「出栈时」执行**。这也解释了为什么 `@Around` 里 `proceed()` 前后的代码分别相当于 `@Before` 与 `@After`——它就是同一段递归的两个方向。',
                },
              },
              {
                kind: 'principle',
                title: '拦截器链的递归：为什么顺序不是「遍历」出来的',
                body: [
                  '很多人把通知顺序理解成「一个列表，从前往后执行」。按这个理解，`@AfterReturning` 应该在目标方法之后才执行——那它怎么保证「之后」？遍历的话只能靠「把它排到最后一个」，但如果链上有 `@Around` 呢？`@Around` 的后半段又该排到哪？',
                  '真实实现是递归，索引机制如下：`proceed()` 每次都把 `currentInterceptorIndex` 加一，然后调用 `interceptors.get(index).invoke(this)`。而每个通知的实现（如 `MethodBeforeAdviceInterceptor`）内部都会调 `mi.proceed()`。于是「链的执行」变成了「调用栈的展开」：**进入时一层层向下，穿出时一层层向上**。目标方法在栈底，所有「方法执行后」的逻辑天然在「出栈」时执行，顺序自动正确。',
                ],
                steps: [
                  {
                    title: '① 取链：这个方法的「专属通知列表」',
                    detail:
                      '`getInterceptorsAndDynamicInterceptionAdvice(method, targetClass)` 会缓存结果（`MethodInterceptor` 数组按方法缓存），所以「同一个方法第二次调用」不会重复匹配切点。缓存 key 是方法与目标类，这解释了「改了切点表达式为什么必须重启」。',
                  },
                  {
                    title: '② 空链快路径',
                    detail:
                      '如果链为空，`invoke` 直接 `method.invoke(target, args)` 反射调用——不构造 `ReflectiveMethodInvocation`。**所以「没有切面匹配」的方法几乎零开销**，这也是 Spring AOP 敢默认在所有 Bean 上做代理判断的底气。',
                  },
                  {
                    title: '③ 建调用对象',
                    detail:
                      '`new ReflectiveMethodInvocation(proxy, target, method, args, targetClass, chain)`。注意它同时持有 `proxy` 与 `target`——前者用于「自引用」（如某些场景需要传代理），后者才是真实调用对象。',
                  },
                  {
                    title: '④ proceed：索引自增 + 调用',
                    detail:
                      '`currentInterceptorIndex` 从 -1 开始，每次 `proceed()` 加一。`index == interceptors.size()` 时说明到链尾，执行 `invokeJoinpoint()`。这个「用索引判断到头」的写法，比「用子列表递归」高效得多（避免了列表复制）。',
                  },
                  {
                    title: '⑤ 通知内部再 proceed：递归形成',
                    detail:
                      '例如 `MethodBeforeAdviceInterceptor.invoke`：先 `before(method, args, target)`，**再 `return mi.proceed()`**。所以「前置通知」在进入时执行完就把控制权交下去，自己等待返回。',
                  },
                  {
                    title: '⑥ 出栈：后置逻辑依次执行',
                    detail:
                      '目标方法返回后，`proceed()` 逐层返回。`AspectJAfterAdvice` 用 `finally` 调 `after()`；`AfterReturningAdviceInterceptor` 在 `proceed()` 返回后处理返回值；`AspectJAfterThrowingAdvice` 用 `try-catch` 捕获异常。**这就是「顺序」的真正来源：不是排序，是栈。**',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '同一方法上多种通知的执行时序',
                body: [
                  '把这套递归画成时序图。注意 `@After` 的位置：它在 `finally` 里，所以正常返回和抛异常都会执行。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['调用方', '代理', '切面逻辑', '目标方法'],
                  messages: [
                    { from: '调用方', to: '代理', text: 'query(1)' },
                    { from: '代理', to: '切面逻辑', text: '`@Before` 执行（进入时）' },
                    { from: '代理', to: '目标方法', text: '`proceed()` 递归到链尾 → 反射调用' },
                    { from: '目标方法', to: '代理', text: '返回 result（或抛出异常）', reply: true },
                    { from: '代理', to: '切面逻辑', text: '`@AfterReturning` 执行（可读返回值）' },
                    { from: '代理', to: '切面逻辑', text: '`@After` 执行（`finally`，无论成败）' },
                    { from: '代理', to: '调用方', text: '返回 result', reply: true },
                  ],
                  caption:
                    '`@Around` 不在图上单独画，因为它**横跨整个流程**：它 `proceed()` 之前的代码等价于 `@Before`，`proceed()` 之后的代码等价于 `@AfterReturning`。所以完整顺序是：**`@Around` 前半 → `@Before` → 目标方法 → `@AfterReturning` / `@AfterThrowing` → `@After` → `@Around` 后半**。还有一个细节：`@Around` 如果没有调用 `proceed()`，**所有内层通知（包括 `@Before`）都不会执行**，目标方法也不会——这是「熔断 / 缓存命中直接返回」的实现方式，也是最容易误用的地方。',
                },
              },
              {
                kind: 'diagram',
                title: '五种通知的能力边界',
                body: [
                  '五种通知的差别不只是「什么时候执行」，还有「能做什么」。这张表按能力排序。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['通知', '注解', '执行时机', '能阻止目标方法吗', '能改返回值吗'],
                  cols: ['注解', '执行时机', '能阻止目标方法吗', '能改返回值吗'],
                  rows: [
                    ['前置', '`@Before`', '目标方法之前', '不能（只能抛异常中断）', '不能'],
                    ['后置返回', '`@AfterReturning`', '正常返回之后', '不能', '不能（可读，改不到）'],
                    ['后置异常', '`@AfterThrowing`', '抛出异常之后', '不能（可吞但无法返回正常值）', '不能'],
                    ['后置最终', '`@After`', '`finally`，最后执行', '不能', '不能'],
                    ['环绕', '`@Around`', '包裹全程', '**能**（不调 `proceed()`）', '**能**（直接 return 别的）'],
                  ],
                  caption:
                    '最后一行是唯一具备「控制权」的通知：`@Around` 拿到的是 `ProceedingJoinPoint`，可以选择「不往下走」或「换一个返回值」。这就是为什么「缓存」必须用 `@Around` 实现——命中缓存时要跳过目标方法；「重试」也必须用它——失败了要再 `proceed()` 一次（**注意 `@Around` 里可以多次调 `proceed()`，这是实现重试的标准手法**）。其余四种通知只能「观察」，不能「控制」。',
                },
              },
              {
                kind: 'concept',
                title: '多个切面谁先谁后：@Order 与三个接口',
                body: [
                  '同一个方法被多个切面匹配时，顺序由「排序值」决定：**值越小，优先级越高，越外层**。也就是说优先级高的切面，它的 `@Before` 更早执行、`@After` 更晚执行——因为它在栈的更外层。',
                  '排序有三种声明方式，优先级从高到低是：**实现 `PriorityOrdered` 接口 > 实现 `Ordered` 接口 > 只有 `@Order` 注解**（`@Order` 的值会被 `AnnotationAwareOrderComparator` 读出来，但它排在「显式实现接口」之后）。都没声明时，顺序是**未定义的**（实际按 Bean 名称或注册顺序，不要依赖）。',
                  '还有一个容易被问的细节：**同一个 `@Aspect` 类内部的多个通知，顺序是固定的**，不受 `@Order` 影响——因为它们是同一个 Advisor 里的不同 advice，按 `@Around` → `@Before` → `@After` → `@AfterReturning` → `@AfterThrowing` 的固定次序排列。`@Order` 只解决「切面之间」的顺序。',
                ],
                points: [
                  '**值小 = 优先级高 = 更外层**：高优先级的 `@Before` 先执行，`@After` 后执行',
                  '**三种声明方式**：`PriorityOrdered`（最先）→ `Ordered`（其次）→ `@Order` 注解（最后）',
                  '**同切面内部固定**：`@Around` 前半 → `@Before` → 目标 → `@AfterReturning`/`@AfterThrowing` → `@After` → `@Around` 后半',
                  '**都没声明则无序**：不要依赖注册顺序，显式写 `@Order` 才可靠',
                  '**典型用法**：事务切面应该在最内层（贴近目标方法），日志/监控在最外层（能看到全貌，包括事务提交耗时）',
                ],
              },
              {
                kind: 'compare',
                title: 'JDK 动态代理 vs CGLIB',
                head: ['维度', 'JDK 动态代理', 'CGLIB'],
                rows: [
                  ['实现方式', '`Proxy.newProxyInstance` + `InvocationHandler`', '生成子类字节码 + `MethodInterceptor`'],
                  ['前提要求', '目标**必须实现接口**（否则无法代理）', '目标**不能是 `final` 类或 `final` 方法**'],
                  ['代理与目标的关系', '**兄弟**：都实现同一接口', '**父子**：代理是目标的子类'],
                  ['注入时的类型', '**必须用接口类型**注入（用实现类会 `ClassCastException`）', '可用实现类类型（因为是子类）'],
                  ['创建开销', '**小**（复用接口元信息）', '**大**（要生成并加载字节码，首次慢）'],
                  ['调用开销', 'JDK 8+ 后通过 `@CallerSensitive` 优化，**与 CGLIB 接近**', '直接方法调用（非反射），理论最快'],
                  ['能被增强的方法', '接口中声明的方法', '所有**非 `final`、非 `private`** 的实例方法'],
                  ['Spring 默认', '有接口时（Spring Framework 传统默认）', '无接口时；**Spring Boot 2.0+ 一律 CGLIB**'],
                ],
                caption:
                  '倒数第二行解释了 AOP 最经典的两个坑：**用 JDK 代理时，把 Bean 注入成实现类类型会抛 `ClassCastException`**（因为容器里放的是 `$Proxy0`，它只实现了接口，不是 `UserServiceImpl` 的子类）；**用 CGLIB 时，`final` 方法不会被增强**（子类无法覆写）。这两条合起来就是一句实用建议：**面向接口编程 + 别在需要增强的方法上加 `final`**。',
              },
              {
                kind: 'principle',
                title: 'Spring 怎么选代理，以及它和 AspectJ 的边界',
                body: [
                  '选择规则由 `AbstractAutoProxyCreator` 里的 `proxyTargetClass` 决定，逻辑非常直白：`proxyTargetClass = true` 时强制 CGLIB；为 `false` 时看「目标类是否实现了接口」——有接口用 JDK，没接口退化为 CGLIB。',
                  '历史上 Spring Framework 默认 `false`（面向接口编程的教条），但 **Spring Boot 2.0 起把 `spring.aop.proxy-target-class` 默认改为 `true`**，也就是一律 CGLIB。原因很务实：① 大量项目在 Controller/Service 上直接注入实现类，JDK 代理会炸；② CGLIB 早已成熟，且 JDK 8 之后性能差距小；③ 减少「为什么我的 Bean 注入报 `ClassCastException`」这类问题。若想回到旧行为，显式设 `spring.aop.proxy-target-class=false`。',
                  '至于 **Spring AOP 与 AspectJ 的边界**，一句话概括：**Spring AOP 是「基于代理的简化版 AOP」，AspectJ 是「完整的 AOP 语言」**。能力差异的根源在于织入时机。',
                ],
                steps: [
                  {
                    title: '① Spring AOP 的织入时机：运行期、基于代理',
                    detail:
                      '在 Bean 初始化完成后生成代理对象替换原对象。所以它只能拦截「**通过代理进来的方法调用**」，且只支持方法级连接点（不能拦截字段访问、构造器、`static` 初始化）。',
                  },
                  {
                    title: '② AspectJ 的织入时机：编译期或加载期',
                    detail:
                      '编译期织入（CTW）用 `ajc` 编译器直接改字节码；加载期织入（LTW）用 `javaagent` 在类加载时改。因为改的是字节码本身，所以能拦截字段读写、构造器调用、`static` 块，且**没有自调用失效问题**。',
                  },
                  {
                    title: '③ 语法的关系：Spring AOP 借用了 AspectJ 的注解',
                    detail:
                      '`@Aspect` / `@Pointcut` / `@Before` 这些注解来自 `aspectjweaver` 包，但**执行引擎是 Spring 自己的代理链**，不是 AspectJ 的织入器。所以「写法像 AspectJ」不等于「能力等于 AspectJ」——这是面试里最容易露怯的一点。',
                  },
                  {
                    title: '④ 性能与复杂度',
                    detail:
                      'Spring AOP 每次调用要穿过拦截器链（有反射与栈开销），但只对「被切中的方法」有成本；AspectJ 织入后基本等同原生代码，性能更好，代价是构建链变更（要引入 `ajc` 或 agent）、调试更难。',
                  },
                  {
                    title: '⑤ 选型建议',
                    detail:
                      '普通业务（事务、日志、权限、监控）用 Spring AOP 足够，无需额外依赖；只有在「必须拦截字段访问 / 构造器 / 私有方法」或「性能极度敏感」时才考虑 AspectJ。**注意 `@Transactional` 用的是 Spring AOP**，所以它天然有自调用失效问题——这不是 bug，是设计边界。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: 'AOP 失效的七种场景：根因只有一条',
                body: [
                  'AOP 失效的所有场景，都可以归到两句：**「调用没经过代理」** 或 **「代理无法覆写/拦截」**。按这个分类记，比死背七条清单牢靠得多。',
                  '**第一类：调用没经过代理。** ① **自调用**——同一个类里 `this.method()` 直接调用，`this` 是原始对象，不是代理，切面完全不知道；② **对象不是 Spring Bean**——自己 `new` 出来的、或者从别处反序列化出来的对象，容器没给它生成代理；③ **跨类调用但拿到的是原始引用**——比如通过 `ApplicationContext.getBean()` 拿到的确实是代理，但如果某处把 `target` 直接传出去了（少见但可能），也会绕过。',
                  '**第二类：代理无法拦截。** ④ **`private` / `protected` 方法**——JDK 代理只认接口方法，CGLIB 也无法覆写 `private`；⑤ **`final` 类或 `final` 方法**——CGLIB 靠继承，`final` 直接封死；⑥ **`static` 方法**——静态方法属于类不属于实例，代理机制不适用；⑦ **切点表达式没匹配上**——这是最冤的一种，代码完全正确但表达式写错了包名，表现为「静默不生效」。',
                  '还有两个高频特例值得单独记：`@Transactional` 加在**非 `public` 方法**上时，某些版本的解析器会直接跳过（`AbstractFallbackTransactionAttributeSource` 的判断）；`@Async` 与 `@Cacheable` 的自调用失效原理与 `@Transactional` 完全一样，因为它们都是 AOP 实现的。',
                ],
                points: [
                  '**自调用**：`this.method()` 绕过代理，最经典也最常见',
                  '**非 Spring Bean**：`new` 出来的对象没有代理',
                  '**`private` / `protected`**：JDK 代理只支持接口方法，CGLIB 也不能覆写 `private`',
                  '**`final` 类 / 方法**：CGLIB 继承机制被封死',
                  '**`static` 方法**：不属于实例，代理机制不适用',
                  '**切点写错**：包名、返回值、参数签名任一处不匹配就静默失效',
                  '**注入类型错误**：JDK 代理时把 Bean 注入成实现类 → `ClassCastException`（不是失效但同样致命）',
                ],
              },
              {
                kind: 'diagram',
                title: '自调用为什么必然失效',
                body: [
                  '把「自调用」与「代理调用」并排画出来。核心差别只有一句：**`this` 指向原始对象，而字段里注入的引用指向代理**。',
                ],
                diagram: {
                  type: 'split',
                  left: {
                    title: '✗ 自调用：this.query()',
                    tone: 'bad',
                    items: [
                      '`this` 是**原始对象**（`UserServiceImpl` 实例本身）',
                      '方法调用是**直接调用**，不经过任何拦截器',
                      '切面、事务、缓存、日志**全部失效**，且**不报任何错**',
                      '表现：`@Transactional` 内部调自己另一个方法，后者不回滚',
                      '唯一「修好」的错觉来源：外层方法自己有事务，被内层「搭便车」',
                    ],
                  },
                  right: {
                    title: '✓ 代理调用：proxy.query()',
                    tone: 'good',
                    items: [
                      '注入自己：`@Autowired UserService self;`（或 `@Lazy` 避免循环依赖）',
                      '或 `AopContext.currentProxy()` + `@EnableAspectJAutoProxy(exposeProxy = true)`',
                      '或把方法拆到另一个 Bean，通过注入调用',
                      '调用经过代理 → 拦截器链正常执行',
                      '代价：注入自己会引入循环依赖，需配合 `@Lazy`',
                    ],
                  },
                  caption:
                    '右侧第三种做法（**拆到另一个类**）是最推荐的：它不引入代理技巧，而是把「需要独立增强的逻辑」放到独立 Bean 里——**这本来就是更好的设计**。前两种是技术手段，第三种是结构改进。另外注意 `AopContext.currentProxy()` 依赖 `ThreadLocal` 存代理引用，所以**在异步线程里会拿不到**（`IllegalStateException: Cannot find current proxy`），这是它在 `@Async` 场景下的坑。',
                },
              },
              {
                kind: 'question',
                title: '什么是 AOP？核心术语有哪些？',
                questionId: 'java-05-Q28',
                intent:
                  '开场题。要求「一句话讲清本质 + 五个术语各自对应什么」，最忌讳只念定义不讲关系。',
                points: [
                  '**本质**：把「横切关注点」（日志、事务、权限、监控）从业务代码里抽出来，通过**动态代理**在方法调用前后插入执行',
                  '**切面（Aspect）**：切点 + 通知的组合体，通常是一个 `@Aspect` 类',
                  '**连接点（JoinPoint）**：程序执行中可以插入逻辑的「时机」，Spring AOP 里**只有方法执行**这一种',
                  '**切点（Pointcut）**：用来**筛选**连接点的表达式，如 `execution(* com.x.service.*.*(..))`',
                  '**通知（Advice）**：切面在切点上执行的具体动作，分 `@Before` / `@After` / `@AfterReturning` / `@AfterThrowing` / `@Around`',
                  '**织入（Weaving）**：把切面接进目标对象的过程。Spring 在**运行期**通过生成代理完成',
                  '**一句话区分连接点与切点**：连接点是「所有可能的位置」，切点是「我实际要插的那几个」',
                ],
                depth:
                  '面试官常追问「Spring AOP 的连接点为什么只有方法执行」。答案是实现机制决定的：**Spring AOP 基于代理，代理只能拦截方法调用**——你没法通过一个代理对象拦截「字段被读」或「构造器被调」，因为那些操作不经过代理的方法表。而 AspectJ 改的是字节码本身，所以它能在字段访问、构造器、`static` 初始化处插入代码，连接点类型丰富得多。**所以「能力差异」不是 Spring 偷懒，而是「代理」这条路的天花板**。能这样回答，说明你理解的是机制而不是名词。',
                followup:
                  '「切点表达式 `execution(* com.x.service.*.*(..))` 里的 `*` 分别是什么意思」——第一个 `*` 是返回值类型任意，`com.x.service.*` 是包下任意类（不含子包），第二个 `*` 是方法名任意，`(..)` 是参数任意个任意类型。若想含子包要用 `com.x.service..*`（两个点）。**这个细节是「为什么我的切面没生效」的头号原因**，值得单独记。',
              },
              {
                kind: 'question',
                title: 'Spring AOP 和 AspectJ 有什么区别？',
                questionId: 'java-05-Q29',
                intent:
                  '考边界认知。核心差别是「织入时机」，衍生出「连接点类型」与「自调用是否失效」两个可观测差异。',
                points: [
                  '**织入时机**：Spring AOP 是**运行期**（生成代理替换原对象）；AspectJ 是**编译期（CTW，`ajc` 编译器）或加载期（LTW，`javaagent`）**',
                  '**实现基础**：Spring AOP 是动态代理（JDK / CGLIB）；AspectJ 是字节码改写',
                  '**连接点能力**：Spring AOP **只有方法执行**；AspectJ 支持字段读写、构造器、`static` 初始化、异常处理等',
                  '**自调用**：Spring AOP **会失效**（`this` 不是代理）；AspectJ **不受影响**（字节码已改，没有代理这层）',
                  '**性能**：AspectJ 织入后接近原生调用；Spring AOP 每次调用穿过拦截器链（有栈与反射开销）',
                  '**依赖与门槛**：Spring AOP 零额外依赖；AspectJ 要引入 `aspectjweaver`，CTW 还要换编译器、LTW 要配 agent',
                  '**语法关系**：Spring AOP **借用**了 AspectJ 的注解（`@Aspect` / `@Pointcut`），但执行引擎完全不同——「写法像」不代表「能力等于」',
                ],
                depth:
                  '一个高频追问：「既然 `@Aspect` 注解来自 `aspectjweaver`，为什么说两者能力不同」——因为注解只是「元数据的载体」。Spring 用 `ReflectiveAspectJAdvisorFactory` 解析这些注解，生成自己的 `Advisor` / `MethodInterceptor` 链；AspectJ 则用 `ajc` 把通知逻辑**真正编译进**目标类的字节码里。同一个 `@Before`，在前者是一段拦截器代码，在后者是插入方法体开头的一段指令。**这个区别直接决定了「自调用是否失效」**：拦截器要靠代理才能触发，字节码改写不需要。',
                followup:
                  '「什么场景必须用 AspectJ」——需要拦截「字段访问」或「构造器调用」时（如审计某个实体的属性变更、统计对象创建耗时），Spring AOP 做不到；或者对性能极度敏感、且切面覆盖大量调用点。反之，如果只是事务、日志、权限这些「方法级」需求，Spring AOP 完全够用，**没必要为了「更强大」而引入构建复杂度**。',
              },
              {
                kind: 'question',
                title: 'JDK 动态代理和 CGLIB 有什么区别？Spring 怎么选？',
                questionId: 'java-05-Q30',
                intent:
                  '必须说清「接口 vs 继承」这条根，以及由它衍生的三个可观测差异：注入类型、final、性能。',
                points: [
                  '**JDK 动态代理**：`Proxy.newProxyInstance` 生成实现同一接口的类，逻辑写在 `InvocationHandler.invoke` 里。**要求目标实现接口**',
                  '**CGLIB**：用 ASM 生成目标类的**子类**，覆写方法，逻辑写在 `MethodInterceptor.intercept` 里。**要求目标不能是 `final` 类/方法**',
                  '**关系差异**：JDK 是「兄弟」（同一接口的两个实现）；CGLIB 是「父子」（代理继承目标）',
                  '**注入类型的坑**：JDK 代理时容器里放的是 `$Proxy0`，**只能按接口注入**；按实现类注入会 `ClassCastException`',
                  '**`final` 的坑**：CGLIB 靠继承，`final` 方法无法覆写 → 不被增强，且**不报错**',
                  '**性能**：CGLIB 创建慢（要生成字节码）、调用快（直接调用）；JDK 创建快，JDK 8+ 之后调用性能已接近（`@CallerSensitive` 优化，不再纯反射）',
                  '**Spring 怎么选**：`proxyTargetClass=false`（Framework 传统默认）→ 有接口用 JDK、无接口用 CGLIB；`proxyTargetClass=true` → **一律 CGLIB**；**Spring Boot 2.0+ 默认 `true`**',
                ],
                depth:
                  '为什么 Spring Boot 2.0 把默认改成 CGLIB？三个现实理由：① **注入类型问题太常见**——大量代码写 `@Autowired UserServiceImpl` 而不是接口，JDK 代理会直接崩，改成 CGLIB 后「怎么写都能跑」；② **JDK 8 之后性能差距消失**，JDK 代理不再有明显劣势；③ **CGLIB 已内置**（Spring 5 起把 CGLIB 重新打包进 `spring-core`，不再是第三方依赖，也没有 `IllegalAccessError` 那些老问题）。另一面要知道代价：CGLIB 生成子类，所以**目标类的构造器会被调用两次**（一次是原始 Bean，一次是代理子类实例化）——如果构造器里有副作用（如注册监听器），会执行两遍。这是「一律 CGLIB」的隐性成本，面试里能提出来很加分。',
                followup:
                  '「`@Transactional` 加在 `final` 方法上会怎样」——不会生效，而且**没有任何报错**。因为 Spring Boot 2.0+ 用 CGLIB，`final` 方法无法被覆写，代理里根本没有这个方法的重写版本，调用会直接走到父类的原始实现。这个坑在「工具类方法加 final 图个安全」的代码里特别容易踩。',
              },
              {
                kind: 'question',
                title: '同一个切面里，各种通知的执行顺序是怎样的？',
                questionId: 'java-05-Q31',
                intent:
                  '考「栈」这个模型。答成「按注解列表顺序遍历」就错了，要说出 `proceed()` 递归与出栈展开。',
                points: [
                  '**完整顺序**：`@Around` 前半 → `@Before` → **目标方法** → `@AfterReturning`（或 `@AfterThrowing`）→ `@After` → `@Around` 后半',
                  '**为什么是这个顺序**：拦截器链是**递归**而非遍历——每个通知内部调 `mi.proceed()`，目标方法在调用栈最深处，后置逻辑在出栈时执行',
                  '**`@After` 永远最后**：它用 `finally` 实现，正常返回与抛异常都会执行',
                  '**`@AfterReturning` 与 `@AfterThrowing` 互斥**：按目标方法「正常返回」还是「抛异常」二选一',
                  '**`@Around` 的特殊性**：它是唯一「包裹全程」的通知；不调 `proceed()` 则**所有内层通知都不执行**',
                  '**`@Around` 可多次 `proceed()`**：这是实现「重试」的标准手法（注意幂等性）',
                  '**异常传播**：若 `@Before` 抛异常，目标方法与后续通知都不执行；若 `@AfterThrowing` 里没再抛，异常被吞掉',
                ],
                depth:
                  '一个容易答错的细节：**`@AfterReturning` 能不能修改返回值**？不能——它在 `proceed()` 返回**之后**执行，但返回值已经由内层向上传递，`AfterReturningAdviceInterceptor` 只把 `returnValue` 传给通知方法当作参数（`returning = "ret"`），通知方法的返回值被忽略。**要改返回值只能用 `@Around`，且必须 `return 新值`**。同理，`@Before` 也改不了参数——除非用 `@Around` 里的 `ProceedingJoinPoint.proceed(newArgs)` 显式传新参数数组，这是「参数校验/脱敏」场景的标准做法。',
                followup:
                  '「两个 `@Around` 叠加时谁在外面」——`@Order` 值小的在外层。假设 A（order=1）、B（order=2）：执行顺序是 `A 前半 → B 前半 → 目标 → B 后半 → A 后半`。**注意这是「洋葱模型」**：越外层越早进入、越晚退出。所以如果 A 是「日志」、B 是「事务」，日志会记到事务提交之后的完整耗时——这正是「日志切面应该 order 更小」的原因。',
              },
              {
                kind: 'question',
                title: '多个切面的执行顺序怎么控制？',
                questionId: 'java-05-Q32',
                intent:
                  '考排序机制。要能说出三种声明方式的优先级，以及「同切面内部顺序固定」这一点。',
                points: [
                  '**三种方式**：`@Order(n)` 注解、实现 `Ordered` 接口、实现 `PriorityOrdered` 接口',
                  '**优先级顺序**：`PriorityOrdered` > `Ordered` > 仅 `@Order` 注解；**值越小越优先**',
                  '**优先级高的表现**：`@Before` 更早执行、`@After` 更晚执行——因为它在栈的**更外层**（洋葱模型）',
                  '**同切面内部顺序固定**：不受 `@Order` 影响，按 `@Around` → `@Before` → 目标 → `@AfterReturning`/`@AfterThrowing` → `@After` → `@Around` 后半',
                  '**都没声明时无序**：实际按 Bean 名称/注册顺序，**不要依赖**，必须显式声明',
                  '**典型排布**：日志/监控（最外层，看到全貌）→ 权限（进业务前拦截）→ 事务（最贴近目标方法）',
                  '**注意**：`@Order` 也影响「多个 `@Bean` 同类型」的注入顺序与 `ApplicationListener` 的执行顺序，语义是通用的',
                ],
                depth:
                  '为什么事务切面要放最内层？因为事务的边界应该「恰好包住业务逻辑」：如果事务在外面、日志在里面，那日志记录的异常可能发生在事务回滚之前，看到的就不是最终状态；如果权限在外面、事务在里面，那「无权限」的请求根本不会开启事务（更省资源）。**排序不是格式问题，而是语义问题**——这也是面试里区分「知道 `@Order`」和「会用 `@Order`」的地方。',
                followup:
                  '「`@Order` 和 `Ordered` 同时存在时听谁的」——`AnnotationAwareOrderComparator` 的取值逻辑是：先看是否实现 `Ordered`/`PriorityOrdered`（有就取 `getOrder()`），没有再读 `@Order` 注解。所以**接口实现优先于注解**。实践中统一用一种即可，混用只会增加排查成本。另外要注意 `PriorityOrdered` 只对「Bean 后处理器」这类「基础设施」有意义，普通业务切面用 `@Order` 就够。',
              },
              {
                kind: 'question',
                title: 'AOP 在哪些情况下会失效？为什么？',
                questionId: 'java-05-Q33',
                intent:
                  '这题看「有没有抽象出根因」。逐条背七个场景是及格的，能归成「调用没经过代理」+「代理无法拦截」两类才是好的。',
                points: [
                  '**根因一：调用没经过代理。** ① 自调用 `this.method()`（`this` 是原始对象）；② 对象不是 Spring Bean（`new` 出来的）；③ 通过 `target` 直接调用',
                  '**根因二：代理无法拦截。** ④ `private` / `protected` 方法（JDK 只认接口，CGLIB 不能覆写 `private`）；⑤ `final` 类 / `final` 方法（CGLIB 继承被封死）；⑥ `static` 方法（不属于实例）',
                  '**根因三：切点没匹配上。** ⑦ 表达式写错包名（少写 `..` 不含子包）、返回值/参数签名不匹配 → **静默不生效**',
                  '**特例一**：`@Transactional` 加在非 `public` 方法上，事务属性解析阶段就可能被跳过',
                  '**特例二**：`@Async` / `@Cacheable` 的自调用失效与 `@Transactional` **完全同理**，因为它们都是 AOP 实现',
                  '**自调用的三种解法**：注入自身（`@Lazy` 防循环依赖）、`AopContext.currentProxy()`（需 `exposeProxy=true`）、**拆到另一个 Bean（最推荐）**',
                  '**排查顺序**：先确认「Bean 是不是代理」（`AopUtils.isAopProxy(bean)` / 打印 `getClass()`），再看切点是否命中，最后看调用路径是否经过代理',
                ],
                depth:
                  '`AopContext.currentProxy()` 的实现细节值得知道：它依赖 `ThreadLocal`（`AopContext` 里的 `currentProxy`），由 `JdkDynamicAopProxy` / `CglibAopProxy` 在进入拦截器链时 `setCurrentProxy`，退出时清理。所以**在 `@Async` 方法内部调用 `currentProxy()` 会抛 `IllegalStateException`**——因为异步线程是新的，`ThreadLocal` 里没有值。同理，`parallelStream` 里也不行。这个坑非常隐蔽，且症状是「偶发异常」，排查成本极高。',
                followup:
                  '「`@Transactional` 自调用为什么有时候「看起来生效了」」——因为外层方法自己开了事务，内层方法虽然没走代理，但它运行在同一个事务上下文里（`TransactionSynchronizationManager` 的 `ThreadLocal` 还持有连接）。一旦内层方法声明了 `REQUIRES_NEW` 或不同的传播行为，就会暴露问题：**它根本没有开新事务**。所以「看起来生效」是一种危险的假象，判断标准永远是「有没有经过代理」，而不是「有没有报错」。',
              },
              {
                kind: 'question',
                title: 'AOP 有哪些典型应用场景？',
                questionId: 'java-05-Q34',
                intent:
                  '开放题，但要有层次：说清「框架内置的」与「业务自己写的」两类，并各举一个实现要点。',
                points: [
                  '**声明式事务**：`@Transactional`，由 `TransactionInterceptor` 实现，本质是 `@Around`（开始事务 → `proceed()` → 提交/回滚）',
                  '**缓存**：`@Cacheable` / `@CacheEvict`，`CacheInterceptor` 实现，必须用 `@Around`——命中缓存要跳过目标方法',
                  '**异步**：`@Async`，`AsyncExecutionInterceptor` 把调用丢给线程池，立即返回 `Future`',
                  '**日志与耗时监控**：`@Around` 记录入参、返回值、耗时；注意不要在日志里打印敏感字段（脱敏应在切面里做）',
                  '**权限校验**：`@Before` 检查 `SecurityContext`，无权限直接抛异常中断',
                  '**重试 / 幂等 / 限流**：`@Around` 里多次 `proceed()`（重试，需幂等）、或用 `Redisson`/`Sentinel` 做限流',
                  '**数据源切换 / 多租户**：`@Before` 往 `ThreadLocal` 写数据源标识，`AbstractRoutingDataSource` 据此选库（**必须在 finally 里清理，否则线程复用会串库**）',
                ],
                depth:
                  '一个「反直觉但很重要」的认知：**框架的很多「注解魔法」本质都是 AOP，所以它们的失效场景完全一致**。`@Transactional`、`@Async`、`@Cacheable`、`@Retryable`、`@Validated`（方法级校验）全都靠代理，所以全都有自调用失效问题。**记住这一个规律，就不用一个个去背「这个注解有什么坑」**。反过来说，如果一个注解不依赖代理（如 `@Value`、`@ConfigurationProperties`、`@Scheduled` 的部分实现），它就不会有这类问题——判断依据是「它需要拦截方法调用吗」。',
                followup:
                  '「自己写切面要注意什么」——四条：① **切点尽量精确**，别用 `execution(* com.x..*.*(..))` 把 Controller、Mapper 全切了（性能与误伤）；② **抛异常要谨慎**，切面里抛的异常会中断业务，最好只记日志不打断；③ **注意 `ThreadLocal` 清理**（多租户、traceId 场景）；④ **别在切面里做重活**（远程调用、大对象序列化），因为它会成倍放大耗时。',
              },
              {
                kind: 'question',
                title: '写一个接口耗时统计的切面（实践题）',
                questionId: 'java-05-Q35',
                intent:
                  '手写题。要看是否用对 `@Around`、是否处理异常分支、是否知道「慢方法告警」这类工程细节。',
                points: [
                  '**必须用 `@Around`**：只有它能同时拿到「开始前」与「结束后」，且能覆盖异常路径',
                  '**`try-finally` 是必需的**：目标方法抛异常时也要记录耗时，否则「最慢的那次」恰好漏掉',
                  '**用 `System.nanoTime()` 而不是 `currentTimeMillis()`**：前者单调递增，不受系统时钟回拨影响',
                  '**取方法签名用 `ProceedingJoinPoint`**：`pjp.getSignature().toShortString()` 或 `getTarget().getClass()` + `getSignature().getName()`',
                  '**必须 `return pjp.proceed()`**：不返回就等于丢弃目标方法的返回值，业务会拿到 `null`',
                  '**异常要原样抛出**：切面里 `catch` 后必须 `throw e`，否则业务异常被吞',
                  '**工程细节**：超阈值才打日志（避免刷屏）、用 `WARN` 级别、带上参数摘要与 `traceId`',
                ],
                depth:
                  '一个进阶点：**统计耗时时要注意「代理嵌套」**。如果日志切面在事务切面外层（`@Order` 更小），那统计到的耗时包含事务提交时间；如果在内层，则不包含。**没有对错，但必须知道自己在测什么**。面试里如果主动提这一点，说明你不仅会写代码，还理解度量口径。另一个细节：高并发下 `System.out` 与同步日志会成为瓶颈，应该用异步 Appender 且做采样（如只记录 P99 以上的慢调用）。',
                followup:
                  '「怎么统计某个注解标记的所有方法」——把切点从 `execution` 改成 `@annotation`：`@Around("@annotation(com.x.Monitor)")`，并在通知方法里接收注解实例（`Monitor monitor`）读取注解上的配置（如阈值、是否打印参数）。**这比在切面里硬编码更灵活**，也是「注解驱动」的标准写法。若想同时支持「注解」与「包路径」两种方式，可以用 `@Pointcut("execution(...) || @annotation(...)")` 组合。',
              },
            ],
          },
        },
        {
          id: 'transactions',
          title: '声明式事务：传播、隔离与失效',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['五、事务'] }],
          content: {
            intro:
              '事务是 Spring 里「用起来最简单、出错最难查」的一块。`@Transactional` 一行注解就能工作，但失效的方式有十几种，而且大多**不报错**——数据就是没回滚，或者部分提交了。本课先把底层那条主线讲透：**事务不是注解的魔法，而是一个连接被绑定到 `ThreadLocal` 上**。抓住这条主线，七种传播行为的差别、`REQUIRES_NEW` 与 `NESTED` 的分野、自调用为什么失效、新线程为什么保不住事务，全都能自己推出来。最后给出失效清单的排查顺序与工程上「大事务」的治理手段。',
            outline: [
              '事务的本质：`TransactionSynchronizationManager` 用 `ThreadLocal` 把「数据源 → 连接」绑到当前线程',
              '声明式事务的链路：切点匹配 → `TransactionInterceptor` → `getTransaction` → 目标方法 → 提交/回滚',
              '七种传播行为的分野只有两条：**要不要新建**、**要不要挂起外层**',
              '`REQUIRES_NEW` 是新连接新事务，`NESTED` 是同连接加保存点——回滚范围完全不同',
              '失效的根因永远是两个：**调用没经过代理**，或**异常没到达事务管理器**',
            ],
            pitfalls: [
              '把 `NESTED` 当成「独立的子事务」：它共用外层连接，外层回滚时内层一起回滚',
              '认为配了 `@Transactional` 就一定回滚：受检异常默认**不回滚**，异常被 `catch` 吞掉也**不回滚**',
              '在事务方法里开新线程做写操作，以为还在同一个事务里——`ThreadLocal` 不会传递到子线程',
            ],
            sections: [
              {
                kind: 'concept',
                title: '事务的本质：一个连接，绑在一个线程上',
                body: [
                  '先抛开 Spring，数据库事务在 JDBC 层面只有三件事：**同一个 `Connection`**、`setAutoCommit(false)`、最后 `commit()` 或 `rollback()`。所谓「事务」，就是「一串操作共用一条连接，且这条连接手动提交」。',
                  'Spring 要解决的问题是：**怎么让 `UserDao.insert()`、`OrderDao.insert()` 这两次独立的方法调用，用的是同一条 `Connection`**？毕竟每次调 `dataSource.getConnection()` 都会拿到新连接。答案是把连接**绑到线程上**。',
                  '`TransactionSynchronizationManager` 里有一个 `ThreadLocal<Map<Object, Object>> resources`，key 是 `DataSource`，value 是 `ConnectionHolder`（连接 + 引用计数）。`DataSourceUtils.getConnection(dataSource)` 的逻辑是：先看当前线程有没有绑定的连接，有就复用（引用计数 +1），没有才真正从池里取并绑定。**所以「同一事务」在物理上就是「同一线程 + 同一连接」**。这一句能推出后面所有结论：跨线程不共享事务、异步不共享事务、`REQUIRES_NEW` 必须挂起外层（否则两条连接会抢同一个 ThreadLocal 槽位）。',
                ],
                points: [
                  '**三层抽象**：`PlatformTransactionManager`（管理器）、`TransactionDefinition`（传播/隔离/超时/只读）、`TransactionStatus`（当前事务状态）',
                  '**`DataSourceTransactionManager`**：最常用，本质是「拿连接、关自动提交、执行、提交或回滚、还连接」',
                  '**绑定位置**：`TransactionSynchronizationManager.resources` → `ThreadLocal` → `Map<DataSource, ConnectionHolder>`',
                  '**嵌套调用的关键**：`ConnectionHolder` 带引用计数，内层 `getConnection` 只是 +1，不会真的开新连接',
                  '**推论**：事务范围 = 线程范围。换线程就换事务，这不是缺陷，是机制决定的',
                ],
              },
              {
                kind: 'diagram',
                title: '@Transactional 从注解到 commit 的完整链路',
                body: [
                  '把一次「带事务的方法调用」拆成六段。注意第 ② 段和第 ⑥ 段：它们才是「事务」真正发生的地方，`@Transactional` 只是让这两段被自动插入。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 启动期：注册基础设施', note: '`@EnableTransactionManagement` → `InfrastructureAdvisorAutoProxyCreator` + `BeanFactoryTransactionAttributeSourceAdvisor`' },
                    { label: '② 解析注解：生成事务属性', note: '`AnnotationTransactionAttributeSource` 把 `@Transactional` 读成 `TransactionAttribute`（传播、隔离、`rollbackFor`）' },
                    { label: '③ 生成代理：Bean 被包一层', note: '`postProcessAfterInitialization` 阶段生成 JDK / CGLIB 代理（与 AOP 同一套机制）' },
                    { label: '④ 调用进入：`TransactionInterceptor.invoke`', note: '按「类级 → 方法级」优先级取事务属性' },
                    { label: '⑤ 开启事务：`getTransaction(txAttr)`', note: '按传播行为决定「新建 / 加入 / 挂起」→ 绑定连接到 `ThreadLocal`' },
                    { label: '⑥ 执行与收尾：提交或回滚', note: '正常返回 → `commitTransactionAfterReturning`；抛异常 → `rollbackOn` 判断后回滚' },
                  ],
                  caption:
                    '第 ⑥ 段的判断是失效问题的高发区：`completeTransactionAfterThrowing` 会先问 `txInfo.transactionAttribute.rollbackOn(ex)`——**只有它返回 `true` 才回滚**。默认实现是「`RuntimeException` 或 `Error` 才回滚」，所以一个受检异常（比如 `IOException`）抛出来，事务会**正常提交**。另一条路径是「异常被业务代码 `catch` 掉了」——此时拦截器看到的是「方法正常返回」，直接走 commit 分支。**这两条是「数据没回滚」的头号原因，比自调用更常见**。',
                },
              },
              {
                kind: 'concept',
                title: '七种传播行为：只有两个问题要回答',
                body: [
                  '传播行为（Propagation）解决的问题是：**当一个「已经处在事务中」的线程，调用另一个「也声明了事务」的方法时，后者该怎么办**。七种配置看起来多，其实每个都在回答两个问题：**要不要新建事务**、**要不要挂起外层事务**。',
                  '按答案分组就非常清晰。**加入型**：`REQUIRED`（有则加入、无则新建，默认值）、`SUPPORTS`（有则加入、无则以非事务执行）、`MANDATORY`（有则加入、无则抛异常）——这三个都**不新建**、**不挂起**。**独立型**：`REQUIRES_NEW`（总是新建，挂起外层）、`NOT_SUPPORTED`（以非事务执行，挂起外层）、`NEVER`（以非事务执行，有事务则抛异常）——这三个都**要挂起**。**特殊型**：`NESTED`（有则建保存点，无则等同 `REQUIRED`）。',
                  '「挂起」这个动作值得单独理解：`AbstractPlatformTransactionManager.suspend()` 会把当前线程绑定的 `ConnectionHolder` **从 `ThreadLocal` 里摘下来**，存进 `SuspendedResourcesHolder`，等内层结束后再 `resume()` 挂回去。**为什么要摘**？因为 `ThreadLocal` 里一个 `DataSource` 只有一个槽位，如果外层连接还在，内层 `getConnection` 就会直接复用它——那样就不是新事务了。所以「独立事务」的前提是「先把外层的连接藏起来」。',
                ],
                points: [
                  '**`REQUIRED`（默认）**：有则加入，无则新建。95% 的场景用它',
                  '**`SUPPORTS`**：有则加入，无则以非事务执行。适合「有没有事务都能跑」的查询',
                  '**`MANDATORY`**：有则加入，无则**抛异常**。用于「强制要求调用方开事务」的内部方法',
                  '**`REQUIRES_NEW`**：**总是新建独立事务，挂起外层**。适合「日志、审计」这类「外层失败也要留下记录」',
                  '**`NOT_SUPPORTED`**：以非事务执行，挂起外层。适合「耗时长的只读操作，别占着事务」',
                  '**`NEVER`**：以非事务执行，若当前有事务则**抛异常**。用于「绝对不能在事务里跑」的操作',
                  '**`NESTED`**：有则建**保存点**（同一连接），无则等同 `REQUIRED`。适合「子步骤失败可容忍，外层仍要继续」',
                ],
              },
              {
                kind: 'diagram',
                title: '七种传播行为全景',
                body: [
                  '按「是否新建 / 是否挂起 / 外层回滚时内层如何」三个维度排一张表，这是面试时最稳的记法。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['传播行为', '当前有事务时', '是否挂起外层', '外层回滚时内层', '典型用途'],
                  cols: ['当前有事务时', '是否挂起外层', '外层回滚时内层', '典型用途'],
                  rows: [
                    ['`REQUIRED`', '**加入**同一个事务', '否', '一起回滚', '默认；绝大多数业务'],
                    ['`SUPPORTS`', '加入；无事务则以非事务跑', '否', '一起回滚', '兼容性查询'],
                    ['`MANDATORY`', '加入；无事务则**抛异常**', '否', '一起回滚', '强制要求上层开事务'],
                    ['`REQUIRES_NEW`', '**新建**独立事务', '**是**', '内层已提交的不受影响', '审计日志、独立流水'],
                    ['`NOT_SUPPORTED`', '**挂起事务**，非事务执行', '**是**', '内层无事务，不受影响', '长耗时只读、批量查询'],
                    ['`NEVER`', '有事务则**抛异常**', '—', '抛异常，不执行', '禁止事务包裹的操作'],
                    ['`NESTED`', '同一连接建**保存点**', '否', '内层先回滚到保存点，外层再回滚', '子步骤可容忍失败'],
                  ],
                  caption:
                    '倒数第二列（「外层回滚时内层」）是区分 `REQUIRES_NEW` 与 `NESTED` 的唯一标准：**前者内层已提交的数据会保留，后者全都会被外层回滚掉**。第四列（是否挂起）则解释了「为什么 `REQUIRES_NEW` 一定要挂起」——不挂起就没有独立连接可用。注意 `NESTED` 的「是否挂起」是「否」：它复用外层连接，只是打个保存点。',
                },
              },
              {
                kind: 'diagram',
                title: 'REQUIRES_NEW 的挂起与恢复',
                body: [
                  '这张时序图把「挂起」画出来。看清第 4、7 步：外层的连接被摘下又挂回——这是「独立事务」能成立的唯一办法。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['调用方', '拦截器', '外层事务', '内层事务'],
                  messages: [
                    { from: '调用方', to: '拦截器', text: '调用外层方法（无事务）' },
                    { from: '拦截器', to: '外层事务', text: '`REQUIRED` → 新建，绑定 Connection#1 到 ThreadLocal' },
                    { from: '外层事务', to: '拦截器', text: '调用内层方法（`REQUIRES_NEW`）' },
                    { from: '拦截器', to: '外层事务', text: '`suspend()`：把 Connection#1 从 ThreadLocal 摘下' },
                    { from: '拦截器', to: '内层事务', text: '新取 Connection#2，`setAutoCommit(false)`' },
                    { from: '内层事务', to: '拦截器', text: '内层提交 → 数据已落库（不可撤回）', reply: true },
                    { from: '拦截器', to: '外层事务', text: '`resume()`：把 Connection#1 挂回 ThreadLocal' },
                    { from: '外层事务', to: '调用方', text: '外层抛异常 → Connection#1 回滚', reply: true },
                  ],
                  caption:
                    '第 6 步是整个机制的核心：**内层提交后，外层再怎么回滚都撤不回来**——因为它用的是另一条连接、另一个事务。这正是「审计日志必须用 `REQUIRES_NEW`」的原因。若把内层改成 `NESTED`：第 4、5 步都不会发生（不挂起、不新建连接），而是在 Connection#1 上 `setSavepoint()`；内层失败时 `rollback(savepoint)`，外层捕获后仍可继续提交。**代价是 `NESTED` 依赖驱动支持保存点**（JDBC 3.0+，主流 MySQL/PostgreSQL 都支持，但某些连接池配置下会失效）。',
                },
              },
              {
                kind: 'diagram',
                title: '隔离级别：Spring 的五个选项与数据库的四个',
                body: [
                  'Spring 把隔离级别做成枚举 `Isolation`，共五个值——比数据库多出的那一个是 `DEFAULT`。这一节要讲清「为什么要多这一个」以及「配了到底谁生效」。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['隔离级别', '脏读', '不可重复读', '幻读', '说明'],
                  cols: ['脏读', '不可重复读', '幻读', '说明'],
                  rows: [
                    ['`DEFAULT`', '看数据库', '看数据库', '看数据库', '**Spring 特有**：不设置，用数据库默认值'],
                    ['`READ_UNCOMMITTED`', '**可能**', '可能', '可能', '几乎不用，连脏读都不防'],
                    ['`READ_COMMITTED`', '不可能', '**可能**', '可能', 'Oracle / PostgreSQL 默认'],
                    ['`REPEATABLE_READ`', '不可能', '不可能', '**可能**（InnoDB 靠间隙锁大部分防住）', '**MySQL InnoDB 默认**'],
                    ['`SERIALIZABLE`', '不可能', '不可能', '不可能', '串行化，性能代价最大'],
                  ],
                  caption:
                    '两个必须说清的点：**① `DEFAULT` 不是「某个级别」，而是「不下发 `SET TRANSACTION ISOLATION LEVEL`」**——所以最终生效的是数据库的默认值，而这在不同库上完全不同（MySQL 是 `REPEATABLE_READ`，Oracle 是 `READ_COMMITTED`）。这解释了「同一个 Spring 配置，换库后行为变了」。**② Spring 只负责把级别传给 JDBC**，真正的隔离靠数据库实现；如果存储引擎不支持事务（如 MyISAM），配什么都没用。',
                },
              },
              {
                kind: 'principle',
                title: '回滚规则：为什么受检异常默认不回滚',
                body: [
                  '`@Transactional` 的默认回滚规则是：**`RuntimeException` 及其子类、`Error` → 回滚；受检异常（`Exception` 的非运行时子类）→ 不回滚**。这个默认值经常被当成「Spring 的坑」，但它有明确的历史来源。',
                  '这套约定继承自 **EJB 的事务规范**：受检异常被视为「**可预期的业务结果**」——比如「余额不足」「用户名已存在」，这类情况调用方应该捕获并处理，业务上并不认为这次操作「失败到需要撤销」，所以不回滚；而运行时异常被视为「**程序错误**」（空指针、数组越界、SQL 语法错），属于不可预期的故障，必须整体撤销。Spring 沿用了这套语义。',
                  '实践上的结论很简单：**几乎总是应该显式写 `@Transactional(rollbackFor = Exception.class)`**。因为现代 Java 代码里大量用受检异常表达「失败」，而且很少有人真的去区分「可预期 / 不可预期」。另外要注意 `noRollbackFor` 的存在——有些异常你确实希望「记下但不回滚」（如「重复提交」），可以显式排除。',
                ],
                steps: [
                  {
                    title: '① 默认规则：只回滚「非受检」',
                    detail:
                      '判定入口是 `TransactionAttribute.rollbackOn(ex)`。`DefaultTransactionAttribute` 的实现只判断 `RuntimeException` 与 `Error`——即 `instanceof RuntimeException || instanceof Error`。受检异常（`Exception` 的非运行时子类）一律返回 `false`，于是 `TransactionInterceptor` 走 `commitTransactionAfterReturning`。',
                  },
                  {
                    title: '② 为什么这么设计：继承 EJB 的语义',
                    detail:
                      'EJB 事务规范把受检异常定义为「**可预期的业务结果**」（余额不足、用户名已存在），调用方应当捕获并处理，业务上不认为需要撤销；把运行时异常定义为「**程序错误**」（空指针、数组越界、SQL 语法错），属于不可预期故障，必须整体撤销。Spring 原样沿用了这套约定。',
                  },
                  {
                    title: '③ 实践结论：显式写 rollbackFor',
                    detail:
                      '现代 Java 代码大量用受检异常表达「失败」，且很少有人真去区分「可预期 / 不可预期」。所以规范是 `@Transactional(rollbackFor = Exception.class)` 一网打尽，再用 `noRollbackFor` 排除个别（如「重复提交」）。别依赖默认值。',
                  },
                  {
                    title: '④ 更隐蔽的坑：异常被吞掉',
                    detail:
                      '如果业务代码 `try-catch` 后没有重新抛出，拦截器看到的是「方法正常返回」，直接走 commit 分支——**此时配什么 `rollbackFor` 都无效**。这是「数据没回滚」的头号原因，比自调用更常见。',
                  },
                  {
                    title: '⑤ 不想抛异常时怎么主动回滚',
                    detail:
                      '用 `TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`，然后正常返回。事务会回滚，上层仍能拿到返回值——适合「校验不通过要回滚，但要返回友好提示」的场景。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '自调用失效的三种解法',
                body: [
                  '自调用是事务失效里最常见的一种。三种解法各有取舍，按「推荐度」从左到右排。',
                ],
                diagram: {
                  type: 'split',
                  left: {
                    title: '✓ 推荐：拆到另一个 Bean',
                    tone: 'good',
                    items: [
                      '把需要独立事务的方法移到新的 `XxxTxService`',
                      '通过注入调用 → **天然经过代理**，无技巧',
                      '顺带改善设计：事务边界变清晰',
                      '缺点：类变多，需要团队接受这个拆分',
                      '这是唯一「既解决问题又改善结构」的方案',
                    ],
                  },
                  right: {
                    title: '△ 应急：注入自身 / AopContext',
                    tone: 'warn',
                    items: [
                      '`@Autowired @Lazy private XxxService self;` → `self.method()`',
                      '`@EnableAspectJAutoProxy(exposeProxy = true)` + `AopContext.currentProxy()`',
                      '注入自身会引入循环依赖，必须配 `@Lazy`',
                      '`currentProxy()` 依赖 `ThreadLocal`，**异步线程里拿不到**',
                      '`TransactionTemplate` 编程式：最稳，但代码变长',
                    ],
                  },
                  caption:
                    '左侧之所以「推荐」，不是因为技术上更高级，而是因为**它把「需要独立事务」这件事显式化了**。自调用的本质问题是「我把两个不同事务语义的操作写在了一个类里」——注入自身只是绕过限制，职责边界仍然混乱。另外补充第四种方案：直接用 `TransactionTemplate` 包住内层逻辑，**它完全不依赖代理**，所以在异步线程、非 Spring 管理对象里也能用，是「兜底」的最佳选择。',
                },
              },
              {
                kind: 'concept',
                title: '工程边界：大事务、异步线程与只读事务',
                body: [
                  '**大事务**指「持续时间长」或「涉及数据量大」的事务。危害是连锁的：连接被长时间占用（连接池耗尽，整个服务开始排队）、行锁/间隙锁持有时间长（并发下降、死锁概率上升）、undo log 持续膨胀（回滚段压力）、主从延迟（大事务在从库重放慢）、回滚成本极高（几分钟的写入要全部撤销）。',
                  '**治理手段**按性价比排序：① **把 RPC / HTTP 调用移出事务**（最有效，往往是耗时主因）；② **拆批提交**（每 500 条一个事务，用 `TransactionTemplate` 在循环里控制）；③ **`readOnly = true`**（让驱动与 ORM 跳过脏检查、某些库可路由到从库）；④ **缩短锁范围**（先查询再按主键更新，避免大范围 `update ... where`）；⑤ **非核心逻辑用 `REQUIRES_NEW` 或异步**。',
                  '**异步线程与事务**是另一个高频坑：`@Async` 方法、`new Thread`、线程池提交的任务，**都拿不到调用方的事务**。因为事务上下文在 `ThreadLocal` 里，而 `ThreadLocal` 不跨线程传递。所以「主线程事务回滚了，子线程写的日志还在」是必然结果。正确做法是用 `TransactionSynchronizationManager.registerSynchronization(...)` 的 `afterCommit` 回调——**只有主事务真正提交成功之后**才去发消息、发通知、写异步日志。这个模式是「本地消息表 / 事务消息」的手写版本。',
                ],
                points: [
                  '**大事务五宗罪**：连接占用、锁持有久、undo 膨胀、主从延迟、回滚昂贵',
                  '**首要治理**：把网络调用（RPC / HTTP / 缓存）移出事务边界',
                  '**分批提交**：`TransactionTemplate` 在循环里控制，每批一个事务',
                  '**`readOnly = true`**：不是「禁止写」，而是「给驱动/ORM 一个优化提示」',
                  '**异步不共享事务**：`ThreadLocal` 不跨线程；用 `afterCommit` 回调保证「提交后再执行」',
                  '**`@Async` + `REQUIRES_NEW` 也不等于「子事务」**：两者完全独立，没有原子性',
                ],
              },
              {
                kind: 'question',
                title: '说说 Spring 事务的实现原理（声明式 @Transactional 是怎么工作的）',
                questionId: 'java-05-Q36',
                intent:
                  '核心题。要能串起「AOP 代理 → 拦截器 → 事务管理器 → ThreadLocal 连接」，缺任何一环都不完整。',
                points: [
                  '**本质**：`@Transactional` 是**基于 AOP 的声明式事务**——它没有创造新机制，只是把「开启/提交/回滚」这三段代码用拦截器自动插入',
                  '**启动期**：`@EnableTransactionManagement` 注册 `InfrastructureAdvisorAutoProxyCreator`（一个 BPP）与 `BeanFactoryTransactionAttributeSourceAdvisor`',
                  '**属性解析**：`AnnotationTransactionAttributeSource` 把 `@Transactional` 解析成 `TransactionAttribute`（传播、隔离、超时、`readOnly`、`rollbackFor`）',
                  '**代理生成**：在 `postProcessAfterInitialization` 阶段，若 Bean 的方法匹配事务切点，就生成 JDK / CGLIB 代理',
                  '**调用拦截**：`TransactionInterceptor.invoke` → `createTransactionIfNecessary` → `tm.getTransaction(txAttr)`',
                  '**事务管理器**：`DataSourceTransactionManager.doBegin` 取连接、`setAutoCommit(false)`、把 `ConnectionHolder` 绑到 `ThreadLocal`',
                  '**收尾**：正常返回 → `commitTransactionAfterReturning`；抛异常 → `rollbackOn(ex)` 判定 → `rollback` 或仍然 `commit`',
                  '**一句话**：**`@Transactional` = 事务切点 + `TransactionInterceptor` + `PlatformTransactionManager` + `ThreadLocal` 绑定**',
                ],
                depth:
                  '「为什么事务能跨多个 DAO 生效」这个问题能检验是否真懂：`UserDao` 与 `OrderDao` 是两个 Bean，各自动 `getConnection`，但它们最终都调 `DataSourceUtils.getConnection(dataSource)`——这个方法先查 `TransactionSynchronizationManager.getResource(dataSource)`，发现当前线程已绑定连接就直接返回，**引用计数 +1**。所以「同一事务」不是因为「DAO 之间传了连接」，而是因为「它们共享同一个线程，而线程上绑了连接」。理解这一点，紧接着就能推出「跨线程必然失效」——`ThreadLocal` 不跟着线程池任务走。',
                followup:
                  '「`@Transactional` 和 `synchronized` 能一起用吗」——可以但极少有意义，而且有坑：`synchronized` 锁的是方法体，事务的 `commit` 发生在**方法返回之后**（由拦截器执行），所以「锁已释放、事务还没提交」这个窗口里，其他线程能读到旧数据并基于它做判断。正确做法是用数据库锁（`select ... for update`）或乐观锁，而不是 JVM 锁。',
              },
              {
                kind: 'question',
                title: 'Spring 事务的 7 种传播行为？常用的有哪些？',
                questionId: 'java-05-Q37',
                intent:
                  '考分类能力。逐条背七个定义是及格，能按「是否新建 / 是否挂起」分组才是好的。',
                points: [
                  '**`REQUIRED`（默认）**：有则加入，无则新建。最常用，95% 的业务方法都用它',
                  '**`SUPPORTS`**：有则加入，无则以非事务执行。适合「有事务更好、没有也能跑」的查询',
                  '**`MANDATORY`**：有则加入，无则抛 `IllegalTransactionStateException`。强制上层开事务',
                  '**`REQUIRES_NEW`**：总是新建独立事务，**挂起外层**。用于审计日志、独立流水',
                  '**`NOT_SUPPORTED`**：以非事务执行，**挂起外层**。用于长耗时只读、避免占用连接',
                  '**`NEVER`**：以非事务执行，若当前有事务则抛异常。用于「绝对不能在事务里执行」的操作',
                  '**`NESTED`**：有事务则建**保存点**（同一连接），无则等同 `REQUIRED`。用于「子步骤可容忍失败」',
                  '**分组记忆**：不新建不挂起（`REQUIRED`/`SUPPORTS`/`MANDATORY`）、要挂起（`REQUIRES_NEW`/`NOT_SUPPORTED`/`NEVER`）、特殊情况（`NESTED`）',
                ],
                depth:
                  '「挂起」的实现在 `AbstractPlatformTransactionManager.suspend()`：它调 `doSuspend(transaction)`，`DataSourceTransactionManager` 的实现是——把 `ConnectionHolder` 的引用计数清零、从 `TransactionSynchronizationManager` 解绑、同时清掉 `synchronizedWithTransaction` 标记、清理 `TransactionSynchronization` 列表（存进 `SuspendedResourcesHolder` 以便恢复）。**注意它还清掉了同步回调列表**，所以「外层注册的 `afterCommit` 不会在内层的提交时被误触发」——这是一个很容易忽略但很关键的正确性细节。',
                followup:
                  '「`REQUIRED` 下内层抛异常，外层 `catch` 住了，能提交吗」——**不能正常提交，会抛 `UnexpectedRollbackException`**。因为内层与外层是同一个事务，内层抛异常时已把事务标记为 `rollbackOnly`；外层 `catch` 后想提交，`commit` 时发现标记就直接抛异常。这是「以为能吞掉异常继续提交」的经典翻车点——**单个物理事务只能有一个最终结局**。',
              },
              {
                kind: 'question',
                title: 'REQUIRES_NEW 和 NESTED 有什么区别？',
                questionId: 'java-05-Q38',
                intent:
                  '必须落到「连接」这个物理层面。说「一个是新事务、一个是子事务」太虚，要说清连接与保存点。',
                points: [
                  '**连接不同**：`REQUIRES_NEW` **新取一条连接**（外层连接被 `suspend` 挂起）；`NESTED` **共用外层连接**',
                  '**提交独立**：`REQUIRES_NEW` 是**真提交**，一旦提交不可撤回；`NESTED` 只是释放保存点，**最终提交权在外层**',
                  '**回滚范围**：`REQUIRES_NEW` 内层失败只回滚内层，外层可以继续；`NESTED` 内层失败回滚到保存点，外层也仍可继续',
                  '**外层回滚时**：`REQUIRES_NEW` 内层**已提交的数据保留**；`NESTED` 内层**跟着一起回滚**',
                  '**依赖条件**：`REQUIRES_NEW` 需要连接池有可用连接（**嵌套多层可能耗尽连接**）；`NESTED` 需要驱动支持保存点（JDBC 3.0+）',
                  '**异常处理**：`NESTED` 内层抛异常后，外层必须 `catch` 住才能继续，否则异常一路传到外层拦截器 → 整体回滚',
                  '**选型**：「外层失败也要留下记录」→ `REQUIRES_NEW`；「子步骤失败可容忍、外层继续」→ `NESTED`',
                ],
                depth:
                  '一个实战级细节：`REQUIRES_NEW` 最容易出的问题是「**连接池耗尽**」。假设连接池 10 条，一个请求进来开了 1 个事务，方法里循环调用 10 次 `REQUIRES_NEW` 的服务——同一时刻需要 10+1 条连接，如果并发几个这样的请求，连接池立刻打满，所有请求开始等待，**表现为「接口卡死但 CPU 不高」**。而 `NESTED` 全程只用 1 条连接，不会有这个问题。所以「性能更好的子事务」应该优先考虑 `NESTED`，只有在「必须真独立」时才用 `REQUIRES_NEW`。',
                followup:
                  '「`NESTED` 内层回滚后，外层继续执行并提交，内层的修改会怎样」——内层的修改被 `rollback to savepoint` 撤销了，外层的修改正常提交。**但如果内层做了 DDL**（`create table` 之类），MySQL 会隐式提交，保存点失效，此时 `NESTED` 的语义会被破坏。这是「事务里不要做 DDL」的又一条理由。',
              },
              {
                kind: 'question',
                title: 'Spring 事务的隔离级别有哪些？和数据库的关系？',
                questionId: 'java-05-Q39',
                intent:
                  '考「Spring 只是传递者」这个认知。`DEFAULT` 的含义与「换库行为变了」是加分点。',
                points: [
                  '**Spring 五个值**：`DEFAULT`、`READ_UNCOMMITTED`、`READ_COMMITTED`、`REPEATABLE_READ`、`SERIALIZABLE`',
                  '**`DEFAULT` 的含义**：不下发 `SET TRANSACTION ISOLATION LEVEL`，**用数据库的默认值**——不是某个固定级别',
                  '**典型默认值**：MySQL InnoDB 是 `REPEATABLE_READ`；Oracle / PostgreSQL 是 `READ_COMMITTED`',
                  '**三种读问题的对照**：脏读（读到未提交）、不可重复读（同一行两次读不同）、幻读（同一范围两次读行数不同）',
                  '**Spring 的角色**：只是把隔离级别通过 JDBC 传给数据库，**真正的隔离由数据库实现**',
                  '**失效场景**：存储引擎不支持事务（MyISAM）、连接池或中间件强制改写、某些只读路由',
                  '**实践建议**：绝大多数场景用 `DEFAULT`；确实需要「读已提交」时才显式配 `READ_COMMITTED`',
                ],
                depth:
                  '一个高频追问：**「MySQL 的 `REPEATABLE_READ` 到底能不能防幻读」**——快照读（普通 `select`）靠 MVCC 能防住；当前读（`select ... for update`、`update`、`delete`）靠**间隙锁（Gap Lock）+ Next-Key Lock** 防住。所以「InnoDB 在 RR 下基本没有幻读」，但它不是 SQL 标准里的严格 RR（标准 RR 允许幻读）。这也解释了「为什么同样配 `REPEATABLE_READ`，MySQL 和别的库表现不同」——**隔离级别的实现在各库之间并不统一**。面试里能点出「MVCC 管快照读、间隙锁管当前读」，就是满分答案。',
                followup:
                  '「隔离级别能通过 `@Transactional` 精确控制吗」——只能「声明」，不能保证「生效」。因为最终 SQL 是数据库执行的，如果数据库不支持该级别（如某些库不支持 `READ_UNCOMMITTED`），JDBC 驱动会降级或忽略。要验证是否真的生效，得查数据库侧（MySQL 用 `select @@transaction_isolation` 看会话级别，或开 general log 看是否下发了 `SET TRANSACTION`）。',
              },
              {
                kind: 'question',
                title: '@Transactional 在哪些情况下会失效？（高频清单）',
                questionId: 'java-05-Q40',
                intent:
                  '清单题，但要有归类。按「没走代理」「没触发回滚」两大类组织，比罗列十条更好记。',
                points: [
                  '**① 自调用**：同类内 `this.method()`，`this` 是原始对象，不经过代理（最常见）',
                  '**② 非 `public` 方法**：Spring 5.x 及之前只支持 `public`；Spring 6.0 起放宽到 `protected` / 包可见，**`private` 仍不支持**',
                  '**③ `final` 方法 / `final` 类**：CGLIB 靠继承，`final` 无法覆写（Boot 2.0+ 默认 CGLIB，所以这条很现实）',
                  '**④ 类不是 Spring Bean**：`new` 出来的对象没有代理，注解形同注释',
                  '**⑤ 异常被 `catch` 吞掉**：拦截器看到「正常返回」→ **直接提交**，配 `rollbackFor` 也没用',
                  '**⑥ 异常类型不匹配**：受检异常默认不回滚（`IOException` 抛出去，事务提交）',
                  '**⑦ 存储引擎不支持事务**：MySQL 的 MyISAM 表，配什么都没用',
                  '**⑧ 多数据源未指定事务管理器**：`@Transactional(transactionManager = "orderTxManager")`，否则用错管理器',
                  '**⑨ 异步 / 新线程里执行**：事务上下文在 `ThreadLocal`，不跨线程',
                  '**⑩ 传播行为配置不当**：`NOT_SUPPORTED` / `NEVER` 会主动让方法不在事务里跑',
                ],
                depth:
                  '排查顺序建议固定下来，这样面试时能给出「方法论」而不只是清单：**第一步看「Bean 是不是代理」**（`AopUtils.isAopProxy(bean)` 或打印 `bean.getClass()`，出现 `$Proxy` / `$$EnhancerBySpringCGLIB` 才是代理）；**第二步看「方法签名是否符合」**（`public`、非 `final`、非 `static`）；**第三步看「调用路径是否经过代理」**（断点打在拦截器里，看有没有进来）；**第四步看「异常是否到达拦截器」**（有没有被吞、类型是否匹配 `rollbackOn`）。这四步能覆盖 95% 的现场问题，比背十条清单有用得多。',
                followup:
                  '「`@Transactional` 加在接口上生效吗」——**取决于代理方式**。JDK 代理时，注解在接口方法上能被读到（因为 `AnnotationTransactionAttributeSource` 会查接口），可以生效；CGLIB 代理时注解在实现类上才可靠。**官方推荐写在实现类（或实现方法）上**，因为「接口上的注解在 CGLIB 模式下可能被忽略」，而且接口不应耦合事务这类实现细节。',
              },
              {
                kind: 'question',
                title: '自调用导致事务失效，怎么解决？（配代码）',
                questionId: 'java-05-Q41',
                intent:
                  '要有可落地的代码。至少给出「拆 Bean」与「注入自身」两种，并能说清各自代价。',
                points: [
                  '**根因**：`this` 指向原始对象，不是代理，拦截器链根本没进入',
                  '**方案一（推荐）：拆到另一个 Bean**——把需要独立事务的方法移到 `XxxTxService`，通过注入调用，天然走代理',
                  '**方案二：注入自身**——`@Autowired @Lazy private XxxService self;` 然后 `self.method()`；`@Lazy` 用于避免循环依赖报错',
                  '**方案三：`AopContext.currentProxy()`**——需 `@EnableAspectJAutoProxy(exposeProxy = true)`；依赖 `ThreadLocal`，**异步线程里失效**',
                  '**方案四：`TransactionTemplate`**——编程式，**完全不依赖代理**，异步线程/非 Spring 对象里也能用，是最稳的兜底',
                  '**代码要点**：无论哪种方案，**内层方法必须真的声明了 `@Transactional`**（或由 `TransactionTemplate` 显式开启）',
                  '**副作用提醒**：`@Around` 型切面（如日志、监控）同样会因自调用失效，所以修好事务后可能「顺手修好了别的」',
                ],
                depth:
                  '代码上最容易写错的是「注入自身」的写法：若直接 `@Autowired private XxxService self;`，在**构造器注入 + 无 `@Lazy`** 的情况下会触发循环依赖（自己依赖自己），Spring Boot 2.6+ 默认禁止时直接启动失败。所以必须 `@Lazy`（注入延迟代理），或者改成字段注入（字段注入虽不推荐，但循环依赖场景下反而「能用」——这也侧面印证了字段注入掩盖问题）。另一个细节：`self.method()` 走的是代理，所以**代理上的 `@Order`、其他切面也会一起生效**，如果原本只想让事务生效，可能会意外触发日志切面。',
                followup:
                  '「`AopContext.currentProxy()` 为什么会抛 `Cannot find current proxy`」——因为 `exposeProxy` 没开（默认 `false`），或当前线程不是「从代理进入」的线程。开了之后，`JdkDynamicAopProxy.invoke` 会 `AopContext.setCurrentProxy(proxy)`，`finally` 里清理。所以：**必须在代理调用链内部使用**，且异步线程里必然拿不到。',
              },
              {
                kind: 'question',
                title: '声明式事务和编程式事务怎么选？',
                questionId: 'java-05-Q42',
                intent:
                  '考取舍判断。要能说出「声明式的三个局限」和「编程式的适用场景」，而不是「声明式更好」。',
                points: [
                  '**声明式**：`@Transactional`，AOP 实现。优点：零侵入、声明清晰、统一管理；缺点：粒度只能是**方法级**、自调用失效、无法在方法内控制提交时机',
                  '**编程式**：`TransactionTemplate`（推荐）或直接 `PlatformTransactionManager`。优点：粒度精确、可多次提交、不依赖代理；缺点：代码侵入、样板代码多',
                  '**选声明式的场景**：标准 CRUD、服务层方法边界与事务边界重合、团队约定统一',
                  '**选编程式的场景**：循环内**分批提交**、需要在方法中途决定是否提交、**异步线程**里要事务、非 Spring 管理的对象',
                  '**`TransactionTemplate` 的用法要点**：`execute(status -> { ...; return x; })`，**异常自动回滚**，返回 `null` 也不会回滚（只有异常才回滚）',
                  '**混合使用**：主体用声明式，个别「分批 / 特殊控制」的方法内用 `TransactionTemplate`，这是最常见的工程实践',
                  '**注意**：`TransactionTemplate` 默认传播行为也是 `REQUIRED`，如果所在方法已有事务，它会**加入**而非新建——需要独立事务时要显式改传播行为',
                ],
                depth:
                  '为什么 `TransactionTemplate` 在异步线程里能工作？因为它的实现是「直接调 `transactionManager.getTransaction()`」，完全不依赖「当前线程有没有代理」——它自己就是那个「开启事务的人」。这也是「`@Async` 方法里想有事务，必须用编程式」的原因：`@Async` 的执行线程上没有外层事务上下文，声明式依然能创建新事务（因为拦截器就在那个线程上执行），所以**准确说法是「`@Async` 里声明式可用，但无法与调用方共享事务」**——这一点很容易说错，值得区分清楚。',
                followup:
                  '「`TransactionTemplate` 里返回 `null` 会回滚吗」——不会。它只根据「有没有抛出异常」决定回滚，返回值不影响。想主动回滚要 `status.setRollbackOnly()`，或者抛一个异常。这个细节在「校验不通过要回滚但要返回友好结果」的场景里很实用：`setRollbackOnly()` 后正常返回，事务回滚，上层拿到返回值。',
              },
              {
                kind: 'question',
                title: '什么是大事务？有什么问题？怎么优化？',
                questionId: 'java-05-Q43',
                intent:
                  '要有「危害链条」和「优化优先级」。只说「事务太长不好」是空的，要说清坏了什么。',
                points: [
                  '**定义**：事务持续时间长（含 RPC / 循环 / 大批量 SQL）或涉及数据量大（几万行写入）',
                  '**危害一：连接被长期占用** → 连接池耗尽 → 其他请求排队 → **表现为「接口变慢但 CPU 不高」**',
                  '**危害二：锁持有时间长** → 行锁/间隙锁阻塞并发、死锁概率上升',
                  '**危害三：undo log 膨胀** → 回滚段压力、可能撑爆表空间；回滚本身也极慢',
                  '**危害四：主从延迟** → 大事务在从库重放耗时长，读写分离场景读到旧数据',
                  '**优化一（最有效）：把网络调用移出事务**——RPC / HTTP / 远程缓存都不该在事务里',
                  '**优化二：分批提交**——用 `TransactionTemplate` 每 N 条一个事务；注意「部分成功」的业务可接受性',
                  '**优化三：缩小锁范围**——先查询再按主键更新、加 `limit`、避免全表 `update`',
                  '**优化四：非核心逻辑异步化**——`afterCommit` 回调发消息、写日志用 `REQUIRES_NEW` 或异步',
                  '**优化五：只读场景加 `readOnly = true`**，让 ORM 跳过脏检查，必要时走从库',
                ],
                depth:
                  '一个常被忽略的「隐性大事务」：**`for` 循环里逐条 `insert` 十万行**。这不仅是「事务大」，还是「网络往返多」——每次 `insert` 一次 RTT，十万次就是十万次往返。正确做法是 `batch`（JDBC `addBatch` / MyBatis `foreach` 批量插入，或 `rewriteBatchedStatements=true`），把网络开销从「次数」降为「批次」，再用分批事务控制每批规模（一般 500~1000 条）。**注意批量插入本身也可能撑爆 `max_allowed_packet`**，需要配合调参。',
                followup:
                  '「分批提交后，中间失败怎么办」——这已经不是「事务」能解决的问题了，而是「补偿/幂等」问题。常见做法：① 每批记录「已处理偏移量」，失败后从断点续跑；② 每批操作设计成**幂等**（用唯一键 `insert ignore` 或 `on duplicate key update`）；③ 极端场景用「本地消息表 + 定时补偿」。**面试里能说到「分批提交把原子性换成了最终一致性」，就是理解到位了**。',
              },
              {
                kind: 'question',
                title: 'rollbackFor 相关的细节：默认回滚规则是什么？为什么受检异常默认不回滚？',
                questionId: 'java-05-Q44',
                intent:
                  '考「默认值 + 历史来源 + 实践建议」。能说出 EJB 沿革是加分项。',
                points: [
                  '**默认规则**：`RuntimeException` 及其子类、`Error` → **回滚**；受检异常（`Exception` 的非运行时子类）→ **不回滚**',
                  '**判定入口**：`DefaultTransactionAttribute.rollbackOn(ex)`，`TransactionInterceptor` 用它决定 commit 还是 rollback',
                  '**历史来源**：继承 EJB 事务规范——受检异常代表「可预期的业务结果」，调用方应处理，不该撤销；运行时异常代表「程序错误」，必须撤销',
                  '**实践建议**：几乎总是显式写 `@Transactional(rollbackFor = Exception.class)`，不要依赖默认',
                  '**`noRollbackFor`**：显式排除某些异常（如「重复提交」这类「失败但不算错误」的情况）',
                  '**更隐蔽的坑**：异常被 `catch` 吞掉 → 拦截器看到正常返回 → **提交**，此时 `rollbackFor` 完全无效',
                  '**另一种主动回滚**：`TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()`（不想抛异常时用）',
                ],
                depth:
                  '一个精度很高的追问：**「回滚了，但为什么异常还是被吞了」**——因为 `@Transactional` 只负责「事务边界」，不负责「异常传播」。如果内层 `try-catch` 后没有重新抛出，拦截器根本不知道有异常，自然提交；如果内层抛了但外层 `catch` 了，且传播行为是 `REQUIRED`，那外层拿着 `rollbackOnly` 标记去 commit 会抛 `UnexpectedRollbackException`——**这个异常往往在「业务看似成功」之后才出现**，极难排查。所以规范是：**要么不 catch，要么 catch 后 `throw`，要么 `setRollbackOnly()`**。',
                followup:
                  '「`rollbackFor` 能配多个类吗」——可以，`@Transactional(rollbackFor = {IOException.class, SQLException.class})`。但更常见的是「配 `Exception.class` 一网打尽」+ 用 `noRollbackFor` 排除个别。另外注意：`rollbackForClassName` 用字符串形式（老版本或不方便引类时用），但拼错类名不会报错，只会在运行时静默失效——**这也是一个隐蔽的坑**。',
              },
              {
                kind: 'question',
                title: '事务方法里起了新线程操作数据库，事务还能保证吗？',
                questionId: 'java-05-Q45',
                intent:
                  '考「ThreadLocal 不跨线程」这条主线。答对不难，难在给出正确的替代方案。',
                points: [
                  '**不能保证**。事务上下文在 `TransactionSynchronizationManager` 的 `ThreadLocal` 里，**不跨线程传递**',
                  '**新线程的实际行为**：`DataSourceUtils.getConnection` 在子线程查不到绑定 → 从池里**新取一条连接** → 独立自动提交',
                  '**后果**：主线程回滚了，子线程写的已经落库；反之主线程提交了，子线程可能还没开始写，中间宕机就丢了',
                  '**`@Async` 同理**：它只是「用线程池执行」，本质还是换线程，一样不共享事务',
                  '**错误方案**：`@Async` + `REQUIRES_NEW` —— 两个完全独立的事务，**没有任何原子性**',
                  '**正确方案一**：`TransactionSynchronizationManager.registerSynchronization(...)` 的 `afterCommit()`，**主事务提交成功后**再异步执行',
                  '**正确方案二**：用「本地消息表」——在同一事务里写业务表和消息表，再由独立线程扫描发送，保证最终一致',
                  '**正确方案三**：用 MQ 事务消息（RocketMQ）或 CDC（Canal），把「写库」与「发消息」解耦',
                ],
                depth:
                  '`afterCommit` 的实现原理值得知道：`TransactionSynchronizationManager` 维护一个 `ThreadLocal<List<TransactionSynchronization>> synchronizations`，`AbstractPlatformTransactionManager.commit` 在真正提交后会调 `triggerAfterCommit()`——**此时事务已提交、连接可能已归还**。所以 `afterCommit` 里**不能再做数据库写操作**（需要新开事务或直接用编程式），只适合「发消息、发通知、写日志到别的存储」。另外它是在**原线程同步执行**的，若要做耗时操作，应在回调里再提交给线程池。',
                followup:
                  '「用 `InheritableThreadLocal` 能把事务传过去吗」——技术上可以改造，但**极其危险且没人这么做**：事务的「原子性」依赖「一个连接被一个线程独占」，跨线程共用连接会有并发写同一条连接的问题（JDBC 连接不是线程安全的），轻则数据错乱，重则连接状态崩溃。**所以「跨线程事务」不是「想不到」，而是「物理上不该做」**——要跨线程保证一致性，只能用分布式事务或最终一致方案。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'web',
      title: 'C · MVC 与 Spring Boot',
      goal: '掌握请求处理链路与自动配置机制',
      summary:
        '从收到一个 HTTP 请求到返回 JSON，Spring MVC 要经过 DispatcherServlet、处理器映射、参数解析、返回值处理等一连串组件。而 Spring Boot 的自动配置决定了这些组件如何被装配。这一阶段把「请求怎么走」和「配置从哪来」两条线讲清。',
      lessons: [
        {
          id: 'spring-mvc',
          title: 'Spring MVC：请求的一生',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['六、Spring MVC'] }],
          content: {
            intro:
              'Spring MVC 的面试题几乎都能挂到同一张图上：**一个 HTTP 请求从进 Tomcat 到写出响应，经过了哪些组件**。三个关键节点是 `DispatcherServlet` 拿到「handler + 拦截器链」、`HandlerAdapter` 负责「怎么调用」、返回值处理器负责「怎么变成响应」。抓住「映射与适配为什么要分开」，各组件职责、参数解析、`@Controller` 与 `@RestController` 的差别就都清楚了。本课还会讲透三个高频对比：Filter 与 Interceptor 的位置差异、三条参数绑定路径、请求与响应两端的 `HttpMessageConverter` 选择逻辑。',
            outline: [
              '`DispatcherServlet.doDispatch` 的八个步骤：拿 handler → 找 adapter → preHandle → 调用 → postHandle → 异常解析 → 渲染 → afterCompletion',
              '「映射」与「适配」必须分开：handler 有三种形态，调用方式各不相同',
              'Filter 在 `DispatcherServlet` 之前（Servlet 规范），Interceptor 在它之后（Spring MVC）',
              '`@RequestBody` 走 `HttpMessageConverter`，`@RequestParam` 走 `getParameter`——两条完全不同的取值路径',
              '`preHandle` 返回 `false` 会中断链，且**不渲染响应**，必须自己写输出',
            ],
            pitfalls: [
              '把 `postHandle` 说成「一定执行」：`preHandle` 返回 `false` 或抛异常时，`postHandle` 不会执行',
              '认为 `@RestController` 是独立注解：它是 `@Controller` + `@ResponseBody` 的组合注解',
              '在 Filter 里抛异常却指望 `@ControllerAdvice` 捕获：Filter 在 `DispatcherServlet` 之外，异常进不了 Spring MVC 的解析链',
            ],
            sections: [
              {
                kind: 'concept',
                title: '为什么需要「映射」和「适配」两个组件',
                body: [
                  '先想一个设计问题：一个请求进来，Spring 怎么知道该调哪个方法？直觉答案是「查一个表：URL → 方法」。但现实里「能被调用的东西」有三种完全不同的形态：**`@RequestMapping` 标注的方法**（靠反射调用，要解析参数、处理返回值）、**实现了 `Controller` 接口的类**（调 `handleRequest`，签名固定）、**`HttpRequestHandler` 实现类**（自己写 `response`，无返回值）。',
                  '如果让 `DispatcherServlet` 直接处理这三种形态，它内部就会长出一堆 `if-else`，而且每加一种新形态都要改它。所以 Spring 拆成两个角色：**`HandlerMapping` 只负责「找出谁来处理」**，**`HandlerAdapter` 只负责「怎么调用它」**。前者输出一个 `HandlerExecutionChain`（handler + 拦截器），后者提供统一的 `handle(request, response, handler)` 接口。`DispatcherServlet` 只跟这两个接口打交道，永远不知道具体是哪种 handler。',
                  '这个拆分带来一个很实用的能力：**新增一种 handler 类型，只需要加一个 `HandlerMapping` + 一个 `HandlerAdapter`，`DispatcherServlet` 一行都不用改**。这就是「映射」与「适配」分开的全部理由——也是「为什么面试官爱问这两个组件的区别」的原因：它考的是你能不能看出「职责单一」在这里解决的是什么问题。',
                ],
                points: [
                  '**`HandlerMapping`**：请求 → `HandlerExecutionChain`（handler + 匹配的拦截器列表）。常用 `RequestMappingHandlerMapping`',
                  '**`HandlerAdapter`**：判断「我能不能调这个 handler」+ 真正执行。常用 `RequestMappingHandlerAdapter`',
                  '**为什么分开**：handler 有多种形态，调用方式各异；拆开后新增类型无需改核心调度器',
                  '**`HandlerExecutionChain`**：不只装 handler，还装了「该请求命中的拦截器」——所以拦截器是**跟着 handler 走的**，不是全局固定的',
                  '**九大组件**：`HandlerMapping`、`HandlerAdapter`、`HandlerExceptionResolver`、`ViewResolver`、`LocaleResolver`、`ThemeResolver`、`MultipartResolver`、`FlashMapManager`、`RequestToViewNameTranslator`',
                ],
              },
              {
                kind: 'diagram',
                title: 'doDispatch：一次请求的八个步骤',
                body: [
                  '把 `DispatcherServlet.doDispatch` 的主体逻辑画成一条线。注意第 3、5、8 步是三个不同的扩展点，执行顺序与方向都不同。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① `getHandler(request)`', note: '遍历所有 HandlerMapping，返回 `HandlerExecutionChain`（handler + 拦截器）' },
                    { label: '② `getHandlerAdapter(handler)`', note: '遍历所有 Adapter，找到 `supports(handler)` 为真的那个' },
                    { label: '③ `applyPreHandle`', note: '拦截器 `preHandle` **正序**执行；任一返回 `false` 则跳到第 ⑧ 步' },
                    { label: '④ `adapter.handle(...)`', note: '内部完成：参数解析 → 反射调用 → 返回值处理（`@ResponseBody` 在这里写响应）' },
                    { label: '⑤ `applyPostHandle`', note: '拦截器 `postHandle` **逆序**执行；**只有正常返回才会走到这里**' },
                    { label: '⑥ `processDispatchResult`', note: '若有异常 → 交给 `HandlerExceptionResolver` 链处理' },
                    { label: '⑦ `render(mv)`', note: '`ViewResolver` 把逻辑视图名解析成 `View` → `view.render` 写响应；`@ResponseBody` 时 `mv` 为 `null`，跳过此步' },
                    { label: '⑧ `triggerAfterCompletion`', note: '拦截器 `afterCompletion` **逆序**执行；**无论成功、失败、还是 preHandle 返回 false 都会执行**' },
                  ],
                  caption:
                    '第 ③ 与第 ⑤ 步的方向相反，这是最容易记错的一点：**`preHandle` 正序（外层先进），`postHandle` 与 `afterCompletion` 逆序（内层先出）**。这个设计与 AOP 的拦截器链完全同构——本质是「栈」。另外注意第 ④ 步：`@ResponseBody` 的响应**在 `adapter.handle` 内部就写完了**，所以第 ⑦ 步的渲染会被跳过（`mv == null`）。这也解释了「为什么返回 `ResponseEntity` 时不会去找视图」。',
                },
              },
              {
                kind: 'diagram',
                title: '一次典型请求的时序',
                body: [
                  '把八个步骤压成时序图，重点看「拦截器三个方法」分别插在什么位置。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['客户端', '调度器', '适配器', 'Controller'],
                  messages: [
                    { from: '客户端', to: '调度器', text: 'GET /users/1' },
                    { from: '调度器', to: '调度器', text: '`getHandler` + `getHandlerAdapter`' },
                    { from: '调度器', to: '适配器', text: '`preHandle` 正序（鉴权、日志）' },
                    { from: '调度器', to: '适配器', text: '`handle(...)`' },
                    { from: '适配器', to: 'Controller', text: '参数解析完成，反射调用方法' },
                    { from: 'Controller', to: '适配器', text: '返回对象（`@ResponseBody`）', reply: true },
                    { from: '适配器', to: '客户端', text: '`HttpMessageConverter` 序列化为 JSON 写入响应', reply: true },
                    { from: '调度器', to: '适配器', text: '`postHandle` 逆序 → `afterCompletion` 逆序' },
                  ],
                  caption:
                    '第 3 步的标签写的是 `preHandle`，但它实际由 `HandlerExecutionChain.applyPreHandle` 逐个调用——**拦截器不是独立组件，而是挂在 handler 的执行链上**。这就是「为什么拦截器能拿到 `HandlerMethod`」（参数里有 `Object handler`）而 Filter 拿不到。第 7 步说明了「响应在 `handle` 内部就已写出」，所以后面的 `postHandle` 已经**改不了响应体**了——想改响应只能在 `ResponseBodyAdvice` 或 Filter 里包装 `HttpServletResponse`。',
                },
              },
              {
                kind: 'diagram',
                title: '常用组件与实现类对照',
                body: [
                  '面试时说得出类名，比说「Spring 有拦截器机制」可信得多。这张表把三类组件与它们的默认实现钉在一起。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['组件', '职责', '常用实现', '关键配置'],
                  cols: ['职责', '常用实现', '关键配置'],
                  rows: [
                    ['`HandlerMapping`', '请求 → handler + 拦截器链', '`RequestMappingHandlerMapping`', '`@RequestMapping` 的 URL/method/headers'],
                    ['`HandlerAdapter`', '判断能否调用 + 执行', '`RequestMappingHandlerAdapter`', '参数解析器、返回值处理器列表'],
                    ['`HandlerExceptionResolver`', '异常 → 响应', '`ExceptionHandlerExceptionResolver`', '`@ExceptionHandler` / `@ControllerAdvice`'],
                    ['`ViewResolver`', '逻辑视图名 → `View`', '`InternalResourceViewResolver`、`ContentNegotiatingViewResolver`', '`prefix` / `suffix`'],
                    ['`HttpMessageConverter`', '请求体 ↔ 对象', '`MappingJackson2HttpMessageConverter`', '`Content-Type` / `Accept`'],
                    ['`HandlerMethodArgumentResolver`', '参数 → 方法入参', '`RequestParamMethodArgumentResolver` 等 26+ 个', '由注解决定用哪个'],
                  ],
                  caption:
                    '第二行与第六行是「最常被问到但最容易被忽略」的一对：**`HandlerAdapter` 本身几乎不做事**，真正干活的是它内部持有的参数解析器与返回值处理器列表。所以「`@RequestParam` 是怎么取到值的」这个问题的答案不在 `HandlerAdapter` 里，而在 `RequestParamMethodArgumentResolver` 里。记住这个分层，顺着问下去就不会卡住。',
                },
              },
              {
                kind: 'diagram',
                title: 'Filter 与 Interceptor：两道关卡的物理位置',
                body: [
                  '这两个东西最容易被混为一谈，但它们的「位置」完全不同——位置决定了它们能做什么。',
                ],
                diagram: {
                  type: 'layers',
                  items: [
                    { label: 'Servlet 容器（Tomcat）', note: '解析 HTTP、管理 `ServletContext`', tone: 'muted' },
                    { label: 'Filter 链', note: 'Servlet 规范；在 `DispatcherServlet` **之前**；拿不到 handler', tone: 'warn' },
                    { label: '`DispatcherServlet`', note: 'Spring MVC 入口；从这里开始才有「handler」这个概念', tone: 'primary' },
                    { label: 'Interceptor 链', note: 'Spring MVC 组件；在 handler **之前/之后**；能拿到 `HandlerMethod`', tone: 'good' },
                    { label: 'Controller 方法', note: '业务代码', tone: 'good' },
                  ],
                  caption:
                    '**关键分界线是 `DispatcherServlet`**：Filter 在它外面，所以「不知道这次请求最终会调哪个方法」；Interceptor 在它里面，所以能拿到 `HandlerMethod`（可以读方法上的注解，实现「方法级权限」「防重复提交」这类细粒度逻辑）。这也解释了「为什么 Filter 里抛异常 `@ControllerAdvice` 抓不到」——异常发生在 `DispatcherServlet` 之外，Spring MVC 的解析链根本没机会介入。',
                },
              },
              {
                kind: 'principle',
                title: '参数绑定的三条路：Query、URI、Body',
                body: [
                  '`@RequestParam`、`@PathVariable`、`@RequestBody` 的区别不是「随便选一个」，而是**它们读的是 HTTP 请求里完全不同的三个部分**。',
                  '**`@PathVariable`** 读的是 **URI 模板**：`@GetMapping("/users/{id}")` 里的 `{id}`，由 `RequestMappingHandlerMapping` 在匹配 URL 时就把值提取出来了，存在 `HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE` 里。所以它要求 URL 必须匹配模板，值一定存在。',
                  '**`@RequestParam`** 读的是 **query string 或 form body**：底层就是 `request.getParameter(name)`。对 `application/x-www-form-urlencoded` 的 POST，Servlet 容器会把 body 解析成 parameter，所以 `@RequestParam` 也能取到（**这与 `@RequestBody` 冲突**——因为 `getParameter` 已经把 body 读完了，`@RequestBody` 再读就是空）。',
                  '**`@RequestBody`** 读的是 **原始请求体**：由 `HttpMessageConverter` 从 `InputStream` 反序列化。所以它只能有一个（body 只能读一次），且必须配 `Content-Type`（否则 415）。**这是三条路里唯一「依赖 `Content-Type`」的一条**，也是「为什么表单和 JSON 不能混用两个注解」的根源。',
                ],
                steps: [
                  {
                    title: '① `@PathVariable`：读 URI 模板',
                    detail:
                      '`@GetMapping("/users/{id}")` 里的 `{id}`，由 `RequestMappingHandlerMapping` 在匹配 URL 时就把值提取出来，存在 `HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE` 里。所以它要求 URL 必须匹配模板，值一定存在，且**完全不受 `Content-Type` 影响**。',
                  },
                  {
                    title: '② `@RequestParam`：读 query string 或 form body',
                    detail:
                      '底层就是 `request.getParameter(name)`。对 `application/x-www-form-urlencoded` 的 POST，Servlet 容器会把 body 解析成 parameter，所以 `@RequestParam` 也能取到。但它只认这两处——**JSON body 不会被解析成 parameter**。',
                  },
                  {
                    title: '③ `@RequestBody`：读原始请求体',
                    detail:
                      '由 `HttpMessageConverter` 从 `InputStream` 反序列化。因此它**只能有一个**（body 只能读一次），且**必须配 `Content-Type`**（否则 415）。这是三条路里唯一依赖 `Content-Type` 的一条。',
                  },
                  {
                    title: '④ 冲突点：两者不能同时用于表单',
                    detail:
                      '表单提交时，`@RequestParam` 背后的 `getParameter` 已经把 body 读完了，`@RequestBody` 再去读就是空串。**这正是「前端传 JSON、后端用 `@RequestParam` 收到 `null`」的根因**——两条路径读的根本不是同一块数据。',
                  },
                  {
                    title: '⑤ 其余两个常用注解',
                    detail:
                      '`@ModelAttribute` 把多个参数绑成一个对象（表单场景的推荐写法），支持 `user.name` 这样的嵌套属性；`@RequestHeader` / `@CookieValue` 分别读 header 与 cookie，底层是 `getHeader` / `getCookies`。',
                  },
                ],
              },
              {
                kind: 'concept',
                title: 'HttpMessageConverter：谁决定用 Jackson 还是 String',
                body: [
                  '`@ResponseBody` 只是「标记」，真正把对象变成 JSON 的是 `HttpMessageConverter`。它的接口只有四个方法：`canRead(clazz, mediaType)`、`read(...)`、`canWrite(clazz, mediaType)`、`write(...)`。',
                  '**读（请求 → 对象）时的选择逻辑**：`RequestResponseBodyMethodProcessor.readWithMessageConverters` 里，先取 `Content-Type`，然后**按注册顺序遍历**所有 converter，找第一个 `canRead(参数类型, contentType)` 为真的。所以顺序很重要——`MappingJackson2HttpMessageConverter` 能处理 `application/json`，`StringHttpMessageConverter` 能处理 `text/plain`，`ByteArrayHttpMessageConverter` 能处理一切（`canRead` 对 `byte[]` 恒真），所以它排在后面。',
                  '**写（对象 → 响应）时的选择逻辑**：先看 `Accept` 头（可能多个，按 `q` 权重排序），再遍历 converter 找 `canWrite(返回类型, mediaType)`。**如果 `Accept` 没写或为 `*/*`，就用第一个能写的**——这解释了「不传 `Accept` 时为什么默认返回 JSON」（Jackson 的 converter 注册在前面）。',
                  '三个高频故障可以据此直接定位：**415**（`Content-Type` 不被任何 converter 支持）、**406**（`Accept` 与所有 `canWrite` 都不匹配）、**日期变时间戳**（Jackson 没注册 `JavaTimeModule`，或者用了 `Date` 而非 `LocalDateTime`）。',
                ],
                points: [
                  '**四个方法**：`canRead` / `read` / `canWrite` / `write`——判断与执行分离',
                  '**读看 `Content-Type`**，**写看 `Accept`**；`Accept` 缺省时取第一个能写的',
                  '**常用实现**：`MappingJackson2HttpMessageConverter`（JSON）、`StringHttpMessageConverter`（文本）、`FormHttpMessageConverter`（表单）、`ByteArrayHttpMessageConverter`（二进制）',
                  '**415** = `Content-Type` 无匹配；**406** = `Accept` 无匹配',
                  '**扩展方式**：`WebMvcConfigurer.extendMessageConverters` 或直接注册 `HttpMessageConverter` Bean',
                  '**注意**：`@ResponseBody` + `String` 返回值默认走 `StringHttpMessageConverter`（`text/plain`），不是 JSON——想返回 JSON 字符串要显式设 `produces`',
                ],
              },
              {
                kind: 'concept',
                title: '统一异常处理与跨域：两个「必须全局做」的事',
                body: [
                  '**异常处理**有三层机制，按优先级从高到低：① `@ExceptionHandler`（同一个 Controller 内，最精确）；② `@ControllerAdvice` + `@ExceptionHandler`（全局，可按包/注解限定范围）；③ `HandlerExceptionResolver` 链（`ExceptionHandlerExceptionResolver` → `ResponseStatusExceptionResolver` → `DefaultHandlerExceptionResolver`）。所以「全局兜底」的标准写法是 `@RestControllerAdvice` 加一个 `@ExceptionHandler(Exception.class)`。',
                  '两个必须知道的边界：**一是 Filter 里抛的异常进不了 `@ControllerAdvice`**（不在 `DispatcherServlet` 内），要么在 Filter 内自己 `try-catch` 写响应，要么交给 `ErrorController`（`/error` 端点）；**二是 `@ExceptionHandler` 的匹配是「最精确优先」**，如果同时有 `@ExceptionHandler(RuntimeException.class)` 和 `@ExceptionHandler(NullPointerException.class)`，NPE 会走后者。',
                  '**跨域**的本质是浏览器的同源策略（协议 + 域名 + 端口三者全同）。服务端能做的只是「告诉浏览器我允许」，共五种方案：`@CrossOrigin`（单接口/单类）、`WebMvcConfigurer.addCorsMappings`（全局）、`CorsFilter`（**Filter 层，能覆盖 Filter 阶段的跨域**）、Nginx 反代（同源化，最彻底）、网关统一处理（微服务场景）。一个高频坑：`allowCredentials(true)` 时 `allowedOrigins` **不能写 `*`**，必须用 `allowedOriginPatterns` 或具体域名。',
                ],
                points: [
                  '**三层异常机制**：`@ExceptionHandler`（类内）> `@ControllerAdvice`（全局）> `HandlerExceptionResolver` 链',
                  '**`@RestControllerAdvice`** = `@ControllerAdvice` + `@ResponseBody`（返回对象自动序列化）',
                  '**匹配规则**：最精确的异常类型优先；`@ExceptionHandler` 里可以声明 `HttpServletRequest` 等参数',
                  '**Filter 的异常抓不到**：不在 `DispatcherServlet` 内 → 用 `ErrorController` 或在 Filter 内处理',
                  '**跨域五方案**：`@CrossOrigin` / `addCorsMappings` / `CorsFilter` / Nginx / 网关',
                  '**凭证坑**：`allowCredentials(true)` + `allowedOrigins("*")` 会被浏览器拒绝，必须用具体域名或 `allowedOriginPatterns`',
                  '**预检请求**：非简单请求会先发 `OPTIONS`，需确保 `OPTIONS` 不被鉴权拦截（否则预检失败）',
                ],
              },
              {
                kind: 'diagram',
                title: 'preHandle 返回 false 之后，谁还执行',
                body: [
                  '这是拦截器最细的一题。把三种结局（正常、返回 `false`、抛异常）分开看，`postHandle` 与 `afterCompletion` 的表现完全不同。',
                ],
                diagram: {
                  type: 'split',
                  left: {
                    title: 'preHandle 返回 false',
                    tone: 'warn',
                    items: [
                      '**当前**拦截器之后的所有拦截器 `preHandle` 不执行',
                      '**Controller 方法不执行**',
                      '**`postHandle` 不执行**（一个都不会）',
                      '**`afterCompletion` 会执行**——但只对「已成功执行过 `preHandle` 的拦截器」，且**逆序**',
                      '**不渲染视图**：`DispatcherServlet` 直接返回，响应体是你自己写的内容',
                      '所以返回 `false` **必须自己写响应**，否则前端拿到空 200',
                    ],
                  },
                  right: {
                    title: 'preHandle 抛异常',
                    tone: 'bad',
                    items: [
                      '**同一层**的后续拦截器不再执行',
                      '**Controller 与 `postHandle` 都不执行**',
                      '异常交给 `HandlerExceptionResolver` 处理',
                      '**`afterCompletion` 仍会执行**（对已成功的拦截器，逆序），异常也会传进去',
                      '与返回 `false` 的差别：异常会走全局异常处理，`false` 不会',
                      '**实践建议**：需要「拒绝并返回统一错误格式」时，抛业务异常比返回 `false` 更好',
                    ],
                  },
                  caption:
                    '记住一句话就能覆盖全部：**`afterCompletion` 是「清理」语义，所以只要 `preHandle` 成功过就必须执行**——它对应 `ThreadLocal` 清理、MDC 清理、计时结束这类操作，漏掉就会污染后续请求（尤其在线程池复用线程的场景）。而 `postHandle` 是「成功路径上的后处理」，只在正常返回时执行。这也解释了为什么「耗时统计」应该放在 `afterCompletion` 而不是 `postHandle` 里——否则异常请求的耗时全丢。',
                },
              },
              {
                kind: 'question',
                title: '说一下 Spring MVC 的请求处理流程（DispatcherServlet 工作流程）',
                questionId: 'java-05-Q46',
                intent:
                  '最核心的一题。要求按 `doDispatch` 的步骤讲，并说清三个扩展点（preHandle / postHandle / afterCompletion）的位置与方向。',
                points: [
                  '**① `getHandler`**：遍历 `HandlerMapping`（`RequestMappingHandlerMapping` 优先），返回 `HandlerExecutionChain`（handler + 命中的拦截器）',
                  '**② `getHandlerAdapter`**：遍历 `HandlerAdapter`，找 `supports(handler)` 为真的那个（`@RequestMapping` 方法用 `RequestMappingHandlerAdapter`）',
                  '**③ `applyPreHandle`**：拦截器 `preHandle` **正序**；任一返回 `false` → 跳 `triggerAfterCompletion` 并返回',
                  '**④ `adapter.handle`**：参数解析（`HandlerMethodArgumentResolver`）→ 反射调用 → 返回值处理（`HandlerMethodReturnValueHandler`）；`@ResponseBody` 在此写响应',
                  '**⑤ `applyPostHandle`**：`postHandle` **逆序**；仅在正常返回时执行',
                  '**⑥ `processDispatchResult`**：有异常 → `HandlerExceptionResolver` 链；否则渲染视图',
                  '**⑦ `render`**：`ViewResolver` 解析逻辑视图名 → `View.render`；`@ResponseBody` 时 `mv` 为 `null` 直接跳过',
                  '**⑧ `triggerAfterCompletion`**：`afterCompletion` **逆序**，无论成功失败都执行（对已过 `preHandle` 的拦截器）',
                ],
                depth:
                  '面试官最爱追问「`@ResponseBody` 时视图渲染去哪了」——答案是**根本没有视图**。`RequestResponseBodyMethodProcessor.handleReturnValue` 会把返回值交给 `HttpMessageConverter` 直接写进 `response`，然后把 `mavContainer.setRequestHandled(true)`。`DispatcherServlet` 判断 `mv != null` 才 `render`，所以这条路径上 `ViewResolver` 完全不参与。**这也是「为什么 `@RestController` 配 `ViewResolver` 没意义」的原因**——两条路径互斥。',
                followup:
                  '「`HandlerExecutionChain` 里的拦截器是怎么算出来的」——由 `HandlerMapping` 在返回 handler 时一并装配：`AbstractHandlerMapping.getHandlerExecutionChain` 会取出所有注册的 `HandlerInterceptor`，按 `includePatterns` / `excludePatterns` 过滤，再排序（`Ordered` / `@Order`）。**所以「拦截器是按路径配置的」，不是全局无差别生效**——`addPathPatterns` / `excludePathPatterns` 就是在这个阶段作用的。',
              },
              {
                kind: 'question',
                title: 'HandlerMapping 和 HandlerAdapter 分别是干什么的？',
                questionId: 'java-05-Q47',
                intent:
                  '考「为什么拆分」。答「一个找、一个调」只是表面，要说清 handler 有多种形态这个根因。',
                points: [
                  '**`HandlerMapping`**：输入 `request`，输出 `HandlerExecutionChain`。**只负责找，不负责调**',
                  '**`HandlerAdapter`**：先 `supports(handler)` 判断能否处理，再 `handle(...)` 执行。**只负责调，不负责找**',
                  '**拆分的根因**：handler 有三种形态——`@RequestMapping` 方法、`Controller` 接口实现、`HttpRequestHandler`，调用方式完全不同',
                  '**拆分的收益**：新增 handler 类型只需加一对 Mapping + Adapter，`DispatcherServlet` 不用改',
                  '**`HandlerExecutionChain` 的额外价值**：顺带装配「该请求命中的拦截器」，所以拦截器是**按路径**配置的',
                  '**常见实现配对**：`RequestMappingHandlerMapping` ↔ `RequestMappingHandlerAdapter`、`BeanNameUrlHandlerMapping` ↔ `SimpleControllerHandlerAdapter`',
                  '**一个实践推论**：`@RequestMapping` 的匹配规则（URL 模板、method、`consumes`/`produces`）全在 Mapping 里，而参数解析、返回值处理全在 Adapter 里',
                ],
                depth:
                  '一个进阶问法：「`RequestMappingHandlerAdapter` 怎么知道用哪个参数解析器」——它持有一个 `HandlerMethodArgumentResolverComposite`，里面按顺序放了 26+ 个解析器（`RequestParamMethodArgumentResolver`、`PathVariableMethodArgumentResolver`、`RequestResponseBodyMethodProcessor` 等）。调用 `getMethodArgumentValues` 时**按顺序问每个解析器 `supportsParameter(parameter)`**，第一个返回 `true` 的负责解析。**所以「同一个参数上写两个注解」时，谁生效取决于解析器顺序**——这是「注解叠加」类问题的通用解释。',
                followup:
                  '「能不能自定义一个 HandlerMapping」——可以，实现 `HandlerMapping` 接口并注册成 Bean（或通过 `WebMvcRegistrations`）。典型场景是「自定义注解路由」「多版本 API（`/v1/`、`/v2/` 走不同处理器）」。注意自定义的 Mapping 要设 `order`，否则可能抢在 `RequestMappingHandlerMapping` 前面或后面，导致匹配不符合预期。',
              },
              {
                kind: 'question',
                title: '@Controller 和 @RestController 的区别？',
                questionId: 'java-05-Q48',
                intent:
                  '基础题，但要答出「组合注解 + 两条响应路径」这层，而不是只背「一个加 @ResponseBody」。',
                points: [
                  '**定义关系**：`@RestController` = `@Controller` + `@ResponseBody`（Spring 4.0 引入的组合注解）',
                  '**`@Controller`**：返回值默认视为**逻辑视图名**，交给 `ViewResolver` 找模板（JSP / Thymeleaf / FreeMarker）',
                  '**`@RestController`**：返回值交给 `HttpMessageConverter` 序列化后写入响应体，**不经过 ViewResolver**',
                  '**方法级差异**：`@Controller` 类里可以给某个方法单独加 `@ResponseBody`，实现「页面和接口混写」',
                  '**路径冲突**：两者本身不冲突，但同一路径不能既返回视图又返回 JSON',
                  '**实践结论**：纯后端 API 用 `@RestController`；需要服务端渲染页面时用 `@Controller`；**现代前后端分离项目基本只用前者**',
                  '**一个坑**：`@RestController` 返回 `String` 时是**纯文本**（`StringHttpMessageConverter`），不是 JSON 字符串',
                ],
                depth:
                  '「返回 `String` 为什么不是 JSON」这个追问很能区分水平：`@ResponseBody` 的返回值处理走 `RequestResponseBodyMethodProcessor`，它按「返回值类型 + `Accept`」选 converter。`String` 类型会优先匹配 `StringHttpMessageConverter`（它 `canWrite(String.class, ...)` 恒真），所以结果是 `text/plain`，前端拿到 `"hello"` 而不是 `"\"hello\""`。**想返回 JSON 字符串要么返回对象，要么显式 `produces = MediaType.APPLICATION_JSON_VALUE`**。',
                followup:
                  '「`@Controller` 上能加 `@ResponseBody` 吗」——能，效果等价于 `@RestController`（类级 `@ResponseBody` 对该类所有方法生效）。但更常见的写法是反过来：用 `@RestController`，个别方法需要视图时返回 `ModelAndView`（此时 `@ResponseBody` 就不适用了，因为返回值不是「数据」而是「视图描述」——实际上 `ModelAndView` 会被特殊处理，绕过 converter）。',
              },
              {
                kind: 'question',
                title: '拦截器（Interceptor）和过滤器（Filter）的区别？',
                questionId: 'java-05-Q49',
                intent:
                  '必须落到「位置」这个物理差异，并由它推出「能拿到 handler 与否」「异常能否被全局处理」两个可观测区别。',
                points: [
                  '**规范不同**：Filter 是 **Servlet 规范**（`javax.servlet.Filter`）；Interceptor 是 **Spring MVC 组件**（`HandlerInterceptor`）',
                  '**位置不同**：Filter 在 `DispatcherServlet` **之前**；Interceptor 在 `DispatcherServlet` **之后**、handler **之前/之后**',
                  '**能拿到什么**：Filter 只有 `ServletRequest`；Interceptor 能拿到 `Object handler`（可转成 `HandlerMethod` 读方法注解）',
                  '**执行次数**：Filter 一次；Interceptor 有三个方法，`preHandle` 可多次参与不同阶段',
                  '**依赖注入**：Filter 若是 `@Component` 也能注入 Bean，但要注意「注册了两次」的坑（`@Component` + `FilterRegistrationBean`）',
                  '**异常处理**：Filter 抛异常**进不了** `@ControllerAdvice`；Interceptor 抛异常可以',
                  '**典型用途**：Filter 做编码、CORS、XSS 过滤、全链路 traceId；Interceptor 做方法级权限、登录校验、防重复提交、耗时统计',
                ],
                depth:
                  '「`@Component` 标注的 Filter 为什么会执行两次」这是一个高频实战坑：Spring Boot 会把 `Filter` 类型的 Bean **自动注册**到 Servlet 容器，如果你又用 `FilterRegistrationBean` 显式注册一次，就会有两个实例。表现是「日志打印两次」「鉴权执行两次」。**解法**：要么不用 `@Component`，只用 `FilterRegistrationBean`；要么在 Bean 上排除自动注册（Spring Boot 的 `FilterRegistrationBean` 会自动去重，但手写 `ServletContext.addFilter` 不会）。',
                followup:
                  '「拦截器能拿到请求体吗」——**不能直接拿**。因为请求体是流，读一次就没了，而 `HandlerAdapter` 后面还要读。想拿只能包装 `HttpServletRequestWrapper` 缓存 body（在 Filter 里做），然后拦截器从 wrapper 取。**这也是「日志切面打印请求体」需要在 Filter 层做的原因**。',
              },
              {
                kind: 'question',
                title: 'Spring MVC 怎么做统一异常处理？',
                questionId: 'java-05-Q50',
                intent:
                  '要能说出三层机制与优先级，并且知道 Filter 异常这个边界。',
                points: [
                  '**第一层：`@ExceptionHandler`**——同一个 Controller 内，最精确，适合「这个接口特有的异常」',
                  '**第二层：`@ControllerAdvice` + `@ExceptionHandler`**——全局；可用 `basePackages` / `annotations` 限定范围',
                  '**第三层：`HandlerExceptionResolver` 链**——`ExceptionHandlerExceptionResolver`（处理 `@ExceptionHandler`）→ `ResponseStatusExceptionResolver`（`@ResponseStatus`）→ `DefaultHandlerExceptionResolver`（Spring 内置异常）',
                  '**`@RestControllerAdvice`** = `@ControllerAdvice` + `@ResponseBody`，返回对象自动序列化（推荐）',
                  '**匹配规则**：异常类型「最精确优先」；也可按 `@ExceptionHandler` 方法参数（如 `HttpServletRequest`）注入上下文',
                  '**边界一**：Filter 里抛的异常**进不了** `@ControllerAdvice`——用 `ErrorController` 或在 Filter 内 `try-catch`',
                  '**边界二**：`@ExceptionHandler` 无法处理「404 无匹配 handler」的情况（那是 `DefaultHandlerExceptionResolver` / `ErrorController` 的职责）',
                  '**规范做法**：定义业务异常基类（含 code / message），全局处理器按类型映射到统一响应体（`code` / `message` / `traceId`）',
                ],
                depth:
                  '一个容易忽略的一致性细节：`@RestControllerAdvice` 里返回的对象同样走 `HttpMessageConverter`，所以**如果你在异常处理器里返回 `ResponseEntity<Result>`，状态码与 body 都能精确控制**；如果只返回 `Result` 对象，状态码恒为 200（业务错误码在 body 里）——这两种风格各有拥趸，但**必须在项目内统一**，否则前端要写两套判断逻辑。',
                followup:
                  '「`@ExceptionHandler` 里再抛异常会怎样」——会继续沿 `HandlerExceptionResolver` 链往下走（下一个 resolver 处理），如果都不处理就交给容器（`/error`）。**所以不要在异常处理器里抛异常**，很难调试。另一个细节：`@ExceptionHandler` 方法里如果要回滚事务，必须在 Controller 层之外（Service 层）已经抛出，因为事务边界在 Service——Controller 层捕获时事务早已结束。',
              },
              {
                kind: 'question',
                title: '什么是跨域？Spring Boot 中有哪几种解决方案？',
                questionId: 'java-05-Q51',
                intent:
                  '要先说清「这是浏览器行为，不是服务端限制」，再列方案，最后说清 `allowCredentials` 那个坑。',
                points: [
                  '**本质**：浏览器的**同源策略**（协议 + 域名 + 端口三者全同）；不同源时浏览器会拦截响应，**请求其实已经到达服务端**',
                  '**简单请求**：`GET` / `POST`（`Content-Type` 为三种之一）直接发，靠响应头 `Access-Control-Allow-Origin` 判断',
                  '**预检请求**：其他情况先发 `OPTIONS`，服务端要正确响应 `Access-Control-Allow-Methods` / `-Headers`',
                  '**方案一：`@CrossOrigin`**——单方法或单类，最细粒度，适合调试',
                  '**方案二：`WebMvcConfigurer.addCorsMappings`**——全局，最常用',
                  '**方案三：`CorsFilter`**——Filter 层，能覆盖 Filter 阶段的跨域（`addCorsMappings` 覆盖不到）',
                  '**方案四：Nginx 反代 / 同源部署**——把前端与接口放同一域名，**最彻底**，无浏览器限制',
                  '**方案五：网关统一处理**——微服务场景在 Gateway / 网关层配 CORS',
                  '**必须知道的坑**：`allowCredentials(true)` 时 `allowedOrigins` **不能为 `*`**，要用具体域名或 `allowedOriginPatterns`',
                ],
                depth:
                  '「为什么 `allowCredentials(true)` 不能配 `*`」——因为带凭证的请求（Cookie、`Authorization`）若允许任意源，等于「任何网站都能以你的身份调接口」，这是严重的安全漏洞。所以 CORS 规范明确禁止这个组合，Spring 会直接抛 `IllegalArgumentException`。**替代方案是 `allowedOriginPatterns` + 动态校验 `Origin` 头**（白名单），而不是无条件放开。',
                followup:
                  '「跨域配置生效了但还是报错」的排查顺序：① 看预检 `OPTIONS` 是否返回 200（常被鉴权拦截器拦住）；② 看响应头有没有 `Access-Control-Allow-Origin`（可能被 Filter 覆盖或网关剥离）；③ 看 `allowCredentials` 与 `Origin` 是否匹配；④ 若用了 Spring Security，需要在 `http.cors()` 里启用——**Security 的 Filter 在 CORS 之前，会先拦下预检请求**。',
              },
              {
                kind: 'question',
                title: '@RequestParam、@PathVariable、@RequestBody 的区别？',
                questionId: 'java-05-Q52',
                intent:
                  '考「数据在 HTTP 请求的哪个部位」。说清三条取值路径，并点出「表单场景下 RequestParam 与 RequestBody 冲突」。',
                points: [
                  '**`@PathVariable`**：URI 模板变量（`/users/{id}`）；由 `HandlerMapping` 匹配 URL 时提取；值一定存在',
                  '**`@RequestParam`**：query string 或 form body；底层 `request.getParameter`；可设 `required = false` / `defaultValue`',
                  '**`@RequestBody`**：原始请求体；由 `HttpMessageConverter` 反序列化；**一个方法只能有一个**',
                  '**关键差异：依赖 `Content-Type` 吗**——`@RequestBody` 必须匹配（否则 415）；`@PathVariable` 完全无关；`@RequestParam` 对 form 类型依赖',
                  '**冲突场景**：`application/x-www-form-urlencoded` 时容器已把 body 解析成 parameter，`@RequestBody` 再读就是空',
                  '**`@ModelAttribute`**：把多个参数绑成一个对象（表单场景的推荐写法），支持 `user.name` 这样的嵌套属性',
                  '**选择建议**：RESTful 资源标识用 `@PathVariable`，过滤/分页用 `@RequestParam`，复杂对象用 `@RequestBody`',
                ],
                depth:
                  '一个高频追问：「`@RequestParam` 能取到 JSON body 里的字段吗」——**不能**。`getParameter` 只认 query string 和 `application/x-www-form-urlencoded` 的 body，JSON body 不会被解析成 parameter（Servlet 容器不解析 JSON）。所以「前端用 `axios.post` 传 JSON，后端用 `@RequestParam` 收」必然拿到 `null`——这是联调时最常见的低级错误，且双方都觉得自己没错。',
                followup:
                  '「`@RequestBody` 能配多个对象吗」——不能，body 只能读一次。若需要「一个请求体拆成两个对象」，要么定义一个新的 DTO 合并字段，要么用 `@RequestBody Map<String, Object>` 自己拆（不推荐，丢失类型安全）。另外 `@RequestBody` 与 `@RequestParam` 同时存在是合法的（一个读 body、一个读 query），只是表单场景下会冲突。',
              },
              {
                kind: 'question',
                title: 'Spring Boot 中 HTTP 消息转换（HttpMessageConverter）是怎么工作的？',
                questionId: 'java-05-Q53',
                intent:
                  '考「converter 选择逻辑」。读看 `Content-Type`、写看 `Accept` 这条是核心，415/406 的归因是加分。',
                points: [
                  '**接口四方法**：`canRead(clazz, mediaType)` / `read(...)` / `canWrite(clazz, mediaType)` / `write(...)`',
                  '**读（请求 → 对象）**：取 `Content-Type` → **按注册顺序**遍历 → 第一个 `canRead` 为真的执行 `read`',
                  '**写（对象 → 响应）**：取 `Accept`（按 `q` 权重排序）→ 遍历找 `canWrite` → 执行 `write`；`Accept` 缺省时取第一个能写的',
                  '**常用实现**：`MappingJackson2HttpMessageConverter`（JSON）、`StringHttpMessageConverter`（`text/plain`）、`FormHttpMessageConverter`、`ByteArrayHttpMessageConverter`（`byte[]`，恒真，排最后）',
                  '**415** = `Content-Type` 无任何 converter 支持；**406** = `Accept` 与所有 `canWrite` 都不匹配',
                  '**注册顺序决定默认行为**：Jackson 排在前面，所以「不传 `Accept`」时默认返回 JSON',
                  '**扩展方式**：`WebMvcConfigurer.extendMessageConverters`（可调整顺序）或注册 `HttpMessageConverter` Bean',
                  '**典型问题**：`LocalDateTime` 变数组/时间戳 → 缺 `JavaTimeModule` 或未配 `@JsonFormat`',
                ],
                depth:
                  '一个能体现深度的问题：「为什么 `byte[]` 返回值不会走 Jackson」——因为 `ByteArrayHttpMessageConverter` 的 `canWrite` 对 `byte[]` 恒真且 `supports` 所有 media type，而它在默认列表里排在 Jackson **之前**（`WebMvcConfigurationSupport.addDefaultHttpMessageConverters` 的顺序是 ByteArray → String → Resource → ... → Jackson）。所以「返回 `byte[]` 就是原始字节」，这既是「文件下载」的实现基础，也是「返回 `byte[]` 被当成 JSON 失败」的原因。',
                followup:
                  '「怎么让某个接口强制返回 JSON 不管 `Accept`」——用 `produces = MediaType.APPLICATION_JSON_VALUE`，它会写进 `RequestMapping` 的 `produces` 条件，从而限制可选的 media type（也会参与请求匹配）。另一种方式是给方法加 `@ResponseBody` 并返回对象，同时前端不传奇怪的 `Accept`。**注意 `produces` 也会影响请求匹配**，写错会导致 404 而不是 406。',
              },
              {
                kind: 'question',
                title: '拦截器 preHandle 返回 false 会怎样？三个方法的执行时机和例外情况？',
                questionId: 'java-05-Q54',
                intent:
                  '最细的一题。要能画出「三种结局下三方法各自执行与否」，并知道「返回 false 不渲染响应」这个坑。',
                points: [
                  '**正常流程**：`preHandle`（正序，返回 `true`）→ Controller → `postHandle`（逆序）→ 视图渲染 → `afterCompletion`（逆序）',
                  '**`preHandle` 返回 `false`**：当前拦截器之后的 `preHandle` 不执行、Controller 不执行、**`postHandle` 全部不执行**',
                  '**但 `afterCompletion` 会执行**——**只对「已成功执行过 `preHandle` 的拦截器」，且逆序**',
                  '**响应不会渲染**：`DispatcherServlet` 直接返回，**不写任何内容**——所以返回 `false` 必须自己 `response.getWriter().write(...)`',
                  '**`preHandle` 抛异常**：与返回 `false` 类似，但异常会进 `HandlerExceptionResolver`（可被 `@ControllerAdvice` 捕获）',
                  '**`postHandle` 抛异常**：Controller 已执行完，异常同样交给解析器；此时 `afterCompletion` 仍执行',
                  '**`afterCompletion` 抛异常**：会被记录但不影响已写出的响应（此时 `response` 可能已提交）',
                  '**记忆口诀**：`afterCompletion` 是「清理」语义——**只要 `preHandle` 成功过就必须执行**，所以耗时统计、`ThreadLocal` 清理放这里最安全',
                ],
                depth:
                  '「为什么 `postHandle` 在 `preHandle` 返回 `false` 时不执行」——因为 `postHandle` 的语义是「Controller 执行之后的后处理」。`DispatcherServlet` 的代码是 `if (!mappedHandler.applyPreHandle(...)) return;`，一旦返回 `false` 就直接 `return`，`applyPostHandle` 那行根本不会被执行到。而 `afterCompletion` 是在 `triggerAfterCompletion` 里统一调用的（在 `finally` 或 catch 分支中），所以能保证执行。**这个不对称正是「清理逻辑必须放 `afterCompletion`」的原因**。',
                followup:
                  '「多个拦截器时，`preHandle` 返回 `false` 会回滚前面拦截器的效果吗」——不会自动回滚，但会调用前面已成功拦截器的 `afterCompletion`，这就是「让它们自己清理」的机制。所以**在 `preHandle` 里申请的资源（`ThreadLocal`、连接、锁）必须在 `afterCompletion` 里释放**，否则会泄漏。这是「拦截器 + 线程池」组合下最隐蔽的 bug 来源。',
              },
            ],
          },
        },
        {
          id: 'spring-boot',
          title: 'Spring Boot：自动配置的真相',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['七、Spring Boot'] }],
          content: {
            intro:
              'Spring Boot 的 11 道面试题，答案几乎都指向同一个机制：**条件装配**。所谓「约定大于配置」，不是「不用配」，而是「别人替你把默认值配好了，并且允许你在任意一层覆盖它」。看清这一点，`@SpringBootApplication` 为什么是三个注解、`spring.factories` 为什么会演进成 `AutoConfiguration.imports`、Starter 为什么「什么都不用写」、配置文件优先级为什么那样排，全都变成同一件事的不同侧面。本课会沿着「一个 Bean 从被写进清单，到最终进入容器」这条链路走一遍，并在每个环节标出可以干预的扩展点。',
            outline: [
              '`SpringApplication.run` 的两段：**准备阶段**（造对象、推事件、备环境）与**刷新阶段**（复用 Spring 的 `refresh()`）',
              '`@SpringBootApplication` = `@SpringBootConfiguration` + `@EnableAutoConfiguration` + `@ComponentScan`，三者各管一件事',
              '自动配置不是「扫描所有 jar」，而是**读清单 + 逐条过滤 + 排序 + 注册**四步',
              '条件注解的真正价值是**「让默认值可退让」**：你配了，我就不生效',
              '内嵌 Tomcat 的本质是**把 Servlet 容器做成一个 Bean**，由 Spring 控制它的生老病死',
            ],
            pitfalls: [
              '把自动配置说成「扫描 classpath 下所有配置类」：实际只读 `META-INF/spring/...AutoConfiguration.imports` 这一个（或两个）清单文件',
              '认为 `@ConditionalOnMissingBean` 是「判断有没有同名 Bean」：它按**类型**判断，且**只在自动配置里可靠**（普通配置类的解析顺序不保证）',
              '以为 `application.properties` 一定优先级最高：命令行参数、`SPRING_APPLICATION_JSON`、环境变量都排在它前面',
            ],
            sections: [
              {
                kind: 'concept',
                title: '「约定大于配置」到底约定了什么',
                body: [
                  '先从反面问：不用 Spring Boot 写一个 Web 服务，要做哪些事？加 `spring-webmvc` 依赖、写 `web.xml` 或用 `AbstractAnnotationConfigDispatcherServletInitializer` 注册 `DispatcherServlet`、配 `ViewResolver`、装一个外置 Tomcat、把 war 扔进去。这里面**没有一件是业务逻辑**，全是「让一个 Web 应用能跑起来」的仪式。Spring Boot 做的事，就是把这些仪式**固化成一套默认值**，并且保证这套默认值随时可以被你的代码顶掉。',
                  '所以「约定大于配置」的准确含义有三层：第一层是**有默认值**——你不写，它也有；第二层是**默认值可覆盖**——你写了，它让位；第三层是**默认值有前提**——只有「条件成立」时默认值才生效（你没自己定义 `DataSource`、classpath 里确实有 HikariCP）。这三层缺一不可。如果只有前两层，那就是「一份写死的模板」；加上第三层，它才成为「一套会自我退让的默认值」。',
                  '而「可退让」这个能力，在代码层面就是 `@Conditional` 系列注解。所以本课的主线不是背注解，而是理解：**Spring Boot 里几乎每一个 `@Bean` 方法，都在说「如果你没自己配，那就用我这个」**。',
                ],
                points: [
                  '**约定**：依赖版本（BOM 统一管理）、目录结构、配置键名、默认端口 8080、默认日志格式',
                  '**配置**：`application.properties` / `yaml` / 环境变量 / 命令行参数，任意一层都能覆盖上层的约定',
                  '**为什么能「大于」**：因为约定的默认值**带条件**，条件不成立就自动退让',
                  '**代价**：出问题时「看不见的东西太多」——这正是 Actuator、`--debug`、条件评估报告存在的原因',
                  '**一句话总结**：Spring Boot 不是「不需要配置」，而是「把配置从必填改成选填，并给了你一个覆盖顺序」',
                ],
              },
              {
                kind: 'diagram',
                title: 'SpringApplication.run 做了什么',
                body: [
                  '`run` 可以粗略切成两段：**准备**（造应用对象、推启动事件、备环境、造容器）与**刷新**（调用 `AbstractApplicationContext.refresh()`）。第二段其实和传统 Spring 完全一样——这也是「Spring Boot 只是 Spring 的一层壳」的由来。十二个步骤里，真正属于 Spring Boot 独创的是第 3、4、10、12 步。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① `new SpringApplication(...)`', note: '推断应用类型（Servlet / Reactive / None）；加载 `ApplicationContextInitializer` 与 `ApplicationListener`（从 `spring.factories` 读）' },
                    { label: '② `run(args)` → 造 `StopWatch`', note: '开始计时，用于打印「Started in x.xxx seconds」' },
                    { label: '③ `DefaultApplicationArguments`', note: '把 `main` 的 `String[] args` 封装成 `--key=value` 形式的属性源' },
                    { label: '④ 准备 `Environment`', note: '**关键一步**：创建 `Environment`、加载 `application.yml`、把命令行参数塞成最高优先级的 PropertySource' },
                    { label: '⑤ `printBanner`', note: '打印 banner（`spring.main.banner-mode=off` 可关）' },
                    { label: '⑥ `createApplicationContext`', note: '按应用类型反射创建 `AnnotationConfigServletWebServerApplicationContext`' },
                    { label: '⑦ `prepareContext`', note: '把主类注册成 BeanDefinition（**唯一的「配置类」入口**）、执行所有 `Initializer`、推 `contextPrepared` 事件' },
                    { label: '⑧ `refreshContext`', note: '调用 Spring 的 `refresh()` 十二步——自动配置在这里发生（见下一节）' },
                    { label: '⑨ `afterRefresh`', note: '空实现，留给子类扩展' },
                    { label: '⑩ `stopWatch.stop` + 打印启动耗时', note: '日志里那句 `Started XxxApplication in 1.234 seconds`' },
                    { label: '⑪ `callRunners`', note: '按 `@Order` 依次执行 `ApplicationRunner` 与 `CommandLineRunner`' },
                    { label: '⑫ 推 `ApplicationReadyEvent`', note: '此时 Web 容器已监听端口，服务真正可用' },
                  ],
                  caption:
                    '最容易记错的是第 ④ 与第 ⑧ 的先后：**环境在容器创建之前就准备好了**。这解释了两件事：一是 `EnvironmentPostProcessor` 能在任何 Bean 创建前改配置；二是 `@Value` 能在 `BeanFactoryPostProcessor` 里正常读到值。另外注意第 ⑦ 步「把主类注册成 BeanDefinition」——**主类是唯一的入口**，`@ComponentScan` 的扫描起点就是它所在的包，所以「为什么 Bean 必须放在主类同包或子包下」的答案在这里。',
                },
              },
              {
                kind: 'diagram',
                title: '@SpringBootApplication 拆开是三层',
                body: [
                  '这个「组合注解」被拆开考的概率极高。三层各有明确分工，不是简单的「打包」。',
                ],
                diagram: {
                  type: 'layers',
                  items: [
                    { label: '`@SpringBootConfiguration`', note: '本质是 `@Configuration`（`proxyBeanMethods = true`），标记「这是配置类」；Spring Boot 测试用它来定位主类', tone: 'primary' },
                    { label: '`@EnableAutoConfiguration`', note: '核心。通过 `@Import(AutoConfigurationImportSelector.class)` 把清单里的自动配置类「导入」进来', tone: 'primary' },
                    { label: '`@ComponentScan`', note: '默认扫描**主类所在包及其子包**，排除 `TypeExcludeFilter` 与 `AutoConfigurationExcludeFilter`', tone: 'warn' },
                  ],
                  caption:
                    '三层里最容易忽略的是 `@ComponentScan` 上的 `excludeFilters`：它会排除掉「既是 `@Configuration` 又是自动配置类」的类，防止同一个配置被扫描和导入两次。**这就是「为什么自动配置类不要放在会被扫描到的包下」的原因**——虽然 Spring Boot 自己会兜底，但自定义 starter 时若不注意，会出现「配置生效两次」的诡异现象。另外 `@SpringBootConfiguration` 的存在意义是「语义化标记」：测试时可以断言「这个类确实是 Boot 应用的入口」。',
                },
              },
              {
                kind: 'principle',
                title: '自动装配的四段链路：读清单 → 过滤 → 排序 → 注册',
                body: [
                  '`@EnableAutoConfiguration` 背后是 `AutoConfigurationImportSelector`。它做的事可以拆成四段，每一段都有对应的追问点。',
                ],
                steps: [
                  {
                    title: '① 读清单：从哪拿到候选配置类',
                    detail:
                      'Spring Boot 2.7 之前读 `META-INF/spring.factories` 里的 `org.springframework.boot.autoconfigure.EnableAutoConfiguration` 键；2.7 起改为读 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`（每行一个全限定名）。**为什么要改**：`spring.factories` 是一个大杂烩文件，一个 jar 里所有扩展点都挤在里面，无法按需加载、无法做条件过滤、也无法在 IDE 里跳转。新格式一个文件只放一件事，且行内就是一个类名，编译期即可校验。',
                  },
                  {
                    title: '② 过滤：条件不成立就丢弃',
                    detail:
                      '拿到上千个候选类（Spring Boot 自身的 jar 里就有 140+ 个），先做**去重**，再用 `AutoConfigurationMetadata` 做一次「快速排除」——这一步只看 `@ConditionalOnClass` 等少数能在元数据里预判的条件，避免加载 Class 对象。之后才真正加载类、评估所有 `@Conditional`。**这就是为什么「引了依赖就有配置、没引就没有」**：`@ConditionalOnClass(Xxx.class)` 在类不存在时直接判否。',
                  },
                  {
                    title: '③ 排序：谁先谁后是有规则的',
                    detail:
                      '过滤后的类要按 `@AutoConfigureOrder`、`@AutoConfigureBefore`、`@AutoConfigureAfter` 排序。**为什么顺序重要**：`@ConditionalOnMissingBean` 是「按已注册的 BeanDefinition 判断」的，如果 A 依赖「B 没注册」这个前提，B 必须先被处理。**这里的顺序只影响自动配置类之间**，你自己的 `@Configuration` 永远先于自动配置被解析——这就是「你的 Bean 能覆盖默认 Bean」的根本机制。',
                  },
                  {
                    title: '④ 注册：变成 BeanDefinition',
                    detail:
                      '排序后通过 `@Import` 的 `DeferredImportSelector` 机制，在所有用户配置类解析**之后**批量注册成 `BeanDefinition`。`Deferred`（延迟）这个词是关键：它让自动配置晚于用户配置执行，从而实现「用户优先」。**这也解释了「为什么自动配置里的 `@ConditionalOnMissingBean` 能看到你的 Bean」**。',
                  },
                ],
              },
              {
                kind: 'diagram',
                title: '条件注解家族：一张图记全',
                body: [
                  '条件注解不用逐个背，按「判断依据」分类，一共四支。',
                ],
                diagram: {
                  type: 'tree',
                  root: {
                    label: '@Conditional',
                    note: '唯一原语，其余全是它的派生组合注解',
                    children: [
                      {
                        label: '按 Class 判断',
                        note: 'classpath 里有没有这个类',
                        tone: 'primary',
                        children: [
                          { label: '@ConditionalOnClass', note: '**自动配置的总开关**：依赖没引，整段配置不生效' },
                          { label: '@ConditionalOnMissingClass', note: '反向：没这个类才生效' },
                        ],
                      },
                      {
                        label: '按 Bean 判断',
                        note: '容器里有没有这个 Bean',
                        tone: 'primary',
                        children: [
                          { label: '@ConditionalOnBean', note: '按**类型**找；受解析顺序影响，只在自动配置里可靠' },
                          { label: '@ConditionalOnMissingBean', note: '**覆盖默认值的核心**：用户没定义我才登场' },
                          { label: '@ConditionalOnSingleCandidate', note: '有且仅有一个（或有 `@Primary`）才生效' },
                        ],
                      },
                      {
                        label: '按配置项判断',
                        note: '属性是否存在 / 取什么值',
                        tone: 'warn',
                        children: [
                          { label: '@ConditionalOnProperty', note: '`havingValue` / `matchIfMissing` 两个参数最常考' },
                          { label: '@ConditionalOnResource', note: '某个资源文件是否存在' },
                        ],
                      },
                      {
                        label: '按运行环境判断',
                        note: 'Web 类型、表达式、平台',
                        tone: 'muted',
                        children: [
                          { label: '@ConditionalOnWebApplication', note: '`type = SERVLET / REACTIVE`' },
                          { label: '@ConditionalOnExpression', note: 'SpEL 表达式，灵活但不推荐滥用（难调试）' },
                          { label: '@ConditionalOnJava', note: 'JDK 版本区间' },
                        ],
                      },
                    ],
                  },
                  caption:
                    '记忆抓手：`OnClass` 管「**有没有这个依赖**」（最外层开关），`OnMissingBean` 管「**用户有没有自己配**」（最内层退让），`OnProperty` 管「**功能开不开**」（最常见的手动开关）。面试若被问「怎么写一个只有开了某个开关才生效的配置」，答案就是 `@ConditionalOnProperty(name = "x.enabled", havingValue = "true", matchIfMissing = false)`——其中 `matchIfMissing` 决定「不写这个配置时默认开还是关」，这是最容易被追问的一个参数。',
                },
              },
              {
                kind: 'diagram',
                title: '内嵌 Tomcat 是什么时候启动的',
                body: [
                  '「内嵌 Tomcat 怎么启动」的答案是反直觉的：**不是 Spring Boot 去启动 Tomcat，而是 Tomcat 被当成一个 Bean 创建出来，创建过程中顺便把端口监听开了**。调用链的起点是 `refresh()` 的 `onRefresh()`。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['应用上下文', 'WebServerFactory', 'Tomcat 容器', 'DispatcherServlet'],
                  messages: [
                    { from: '应用上下文', to: 'WebServerFactory', text: '`onRefresh()` → `createWebServer()`' },
                    { from: 'WebServerFactory', to: 'Tomcat 容器', text: '`getWebServer(...)`：new `Tomcat`、设端口、设 `Context`' },
                    { from: 'Tomcat 容器', to: 'Tomcat 容器', text: '把 `DispatcherServlet` 注册为唯一的 Servlet（映射 `/`）' },
                    { from: 'Tomcat 容器', to: 'Tomcat 容器', text: '`tomcat.start()`：**这一行开始监听端口**' },
                    { from: 'Tomcat 容器', to: '应用上下文', text: '返回 `WebServer`，交给 `finishRefresh()` 启动', reply: true },
                    { from: '应用上下文', to: 'DispatcherServlet', text: '`onApplicationEvent(ContextRefreshedEvent)`：initStrategies 初始化九大组件' },
                    { from: '应用上下文', to: '应用上下文', text: '`finishRefresh()` → 推 `ServletWebServerInitializedEvent`' },
                  ],
                  caption:
                    '两个顺序细节值得记：**第一，端口在 `onRefresh` 阶段就已监听**，此时 `refresh()` 还没走完，所以「容器起来了但 Bean 还在创建」这个时间窗内，请求进来可能拿到 404 或 503——这是「优雅启动」需要 `ReadinessCheck` 的原因。**第二，`DispatcherServlet` 的九大组件是在 `ContextRefreshedEvent` 才初始化的**（`initStrategies`），比 Tomcat 启动晚一拍，所以 `Tomcat` 起来时它还是个空壳。这也是「为什么 `@PostConstruct` 里拿不到 `HandlerMapping`」的原因。',
                },
              },
              {
                kind: 'diagram',
                title: '配置源的优先级：从高到低',
                body: [
                  '「配置文件加载优先级」这题按「谁覆盖谁」记，从高到低四层。同一份配置，排在前面的赢。',
                ],
                diagram: {
                  type: 'memory',
                  regions: [
                    {
                      name: '最高：外部动态',
                      slots: [
                        { label: '命令行参数', value: '`--server.port=9090`' },
                        { label: 'SPRING_APPLICATION_JSON', value: '环境变量里的 JSON' },
                        { label: 'ServletConfig / Context 参数', value: '外置容器时用' },
                        { label: 'JNDI', value: '`java:comp/env`' },
                      ],
                    },
                    {
                      name: '次高：系统与测试',
                      slots: [
                        { label: 'System.getProperties()', value: '`-Dkey=value`' },
                        { label: 'OS 环境变量', value: '`SERVER_PORT=9090`' },
                        { label: '`@TestPropertySource`', value: '仅测试生效' },
                        { label: '`@SpringBootTest(properties)`', value: '仅测试生效' },
                      ],
                    },
                    {
                      name: '配置中心',
                      slots: [
                        { label: 'Nacos / Apollo', value: '经 `PropertySourceLocator` 注入' },
                        { label: '`SPRING_CONFIG_ADDITIONAL_LOCATION`', value: '追加配置文件位置' },
                      ],
                    },
                    {
                      name: '最低：本地文件',
                      slots: [
                        { label: 'jar 外 `./config/`', value: '优先级高于 jar 内' },
                        { label: 'jar 外当前目录', value: '`./application.yml`' },
                        { label: 'jar 内 `classpath:/config/`', value: '打包进去的' },
                        { label: 'jar 内 `classpath:/`', value: '最常见的那个' },
                      ],
                    },
                  ],
                  caption:
                    '两个实用结论：**「jar 外覆盖 jar 内」**让你改配置不用重新打包；**「命令行参数最高」**让 `java -jar app.jar --server.port=9090` 能临时改端口。同一位置下 `.properties` 与 `.yml` 同时存在时，**`.properties` 优先**（`PropertiesPropertySourceLoader` 排在 `YamlPropertySourceLoader` 之前）。另外 `profile` 专属文件（`application-prod.yml`）**永远覆盖**通用文件（`application.yml`），这是 Java 里唯一「按文件名后缀」而非文件名生效的特殊规则。',
                },
              },
              {
                kind: 'diagram',
                title: 'Spring Boot 2.x → 3.x 的破坏性变化',
                body: [
                  'Boot 3 / Spring 6 是一组「必须知道」的版本分界线。下面按「变没变、影响到哪」列表。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['变化点', '2.x', '3.x / Spring 6', '面试怎么说'],
                  cols: ['2.x', '3.x / Spring 6', '面试怎么说'],
                  rows: [
                    ['JDK 基线', 'JDK 8+', '**JDK 17+**', '「3.x 强制 17，因为用了 record、密封类、switch 模式匹配」'],
                    ['命名空间', '`javax.*`', '**`jakarta.*`**', '「Servlet API 从 `javax.servlet` 迁到 `jakarta.servlet`，这是最痛的升级点」'],
                    ['配置清单', '`spring.factories`', '`AutoConfiguration.imports`', '「大杂烩拆成按用途分文件，IDE 能跳转、能校验」'],
                    ['GraalVM', '实验性', '**正式支持原生镜像**', '「AOT + native image：启动毫秒级、内存几十 M，代价是构建慢、反射要注册」'],
                    ['可观测性', 'Micrometer', '**Micrometer Observation + OTLP**', '「`Observation` API 统一 metrics / tracing / logging 三件套」'],
                    ['HTTP 接口', '`@RequestMapping`', '`@HttpExchange`（声明式客户端）', '「类似 Feign，但内置、无额外依赖」'],
                    ['Security', '`WebSecurityConfigurerAdapter`', '**`SecurityFilterChain` Bean**', '「适配器基类被废弃，改成声明 Bean」'],
                    ['Spring Native', '独立项目', '并入核心（AOT）', '「`@AotHints` 换成 `RuntimeHints`」'],
                  ],
                  caption:
                    '若被问「升级 3.x 最麻烦的是什么」，答三件：**`javax` → `jakarta` 的全量替换**（含第三方库必须同步升级）、**`WebSecurityConfigurerAdapter` 的改法**、**JDK 17 的语言与 `--illegal-access` 行为变化**。这三件事和「业务代码」无关，但会吃掉升级 80% 的工时——这个回答比背新特性更显经验。',
                },
              },
              {
                kind: 'code',
                title: '一个最小可用的自动配置：从清单到生效',
                body: [
                  '把前面讲的四段链路落地成一个能跑的最小样例：一个属性类、一个自动配置类、一份清单文件。重点看三处条件注解写在哪里——**类上放「有没有依赖」，方法上放「用户有没有自己配」**。这个分工不是风格问题，写反了就会出「整段配置莫名不生效」的故障。',
                ],
                lang: 'java',
                code:
                  '// ① 自动配置类：全部逻辑都藏在条件里\n@AutoConfiguration                              // = @Configuration(proxyBeanMethods = false) + 参与排序\n@ConditionalOnClass(SmsClient.class)           // 依赖没引 → 整段不生效\n@ConditionalOnProperty(name = "sms.enabled", havingValue = "true", matchIfMissing = true)\n@EnableConfigurationProperties(SmsProperties.class)\npublic class SmsAutoConfiguration {\n\n    @Bean\n    @ConditionalOnMissingBean                        // 用户自己定义了 SmsClient → 我这个不生效\n    public SmsClient smsClient(SmsProperties props) {\n        return new SmsClient(props.getEndpoint(), props.getAccessKey());\n    }\n}\n\n// ② 属性类：前缀 + 默认值\n@ConfigurationProperties(prefix = "sms")\npublic class SmsProperties {\n    private String endpoint = "https://sms.example.com";\n    private String accessKey;\n    private int timeoutMillis = 3000;\n    // getter / setter 省略\n}\n\n// ③ 清单文件：src/main/resources/META-INF/spring/\n//    org.springframework.boot.autoconfigure.AutoConfiguration.imports\n//    内容只有一行（多个就多行）：\n//    com.example.sms.SmsAutoConfiguration',
                caption:
                  '这三段加起来就是一个完整的 Starter。注意三个「不写就错」的细节：**`@ConditionalOnMissingBean` 必须写在 `@Bean` 方法上而不是类上**（写在类上会让整段配置在「用户定义了任意一个 Bean」时失效）；**属性类必须能被 `@EnableConfigurationProperties` 或 `@ConfigurationPropertiesScan` 找到**，否则注入进来的是个空对象；**`.imports` 文件的路径少一层目录都不行**（必须是 `META-INF/spring/`，不是 `META-INF/`）。',
                notes: [
                  { line: '@AutoConfiguration', text: 'Boot 2.7 新增的语义化注解，等价于 `@Configuration(proxyBeanMethods = false)` 并打上「自动配置」标记。**用 `proxyBeanMethods = false` 是因为自动配置类里的 `@Bean` 方法之间不该互相调用**——省掉 CGLIB 代理，启动更快。' },
                  { line: '@ConditionalOnProperty(name = "sms.enabled", havingValue = "true", matchIfMissing = true)', text: '`matchIfMissing = true` 表示「用户没写这个配置时默认开启」，适合「默认就该有」的能力；若默认关闭则写 `false`。**这个参数最容易被追问**。' },
                  { line: '@ConditionalOnMissingBean', text: '按**返回类型**判断容器里有没有同类 Bean。它之所以在自动配置里可靠，是因为自动配置在所有用户配置**之后**才被处理（`DeferredImportSelector`）。在普通 `@Configuration` 里用它，结果取决于扫描顺序，不可依赖。' },
                ],
              },
              {
                kind: 'question',
                title: 'Spring Boot 的核心特性有哪些？「约定大于配置」怎么理解？',
                questionId: 'java-05-Q55',
                intent:
                  '开场题。答「四个特性 + 一句话本质」即可，重点在于把「约定」和「可覆盖」两层都说出来。',
                points: [
                  '**四个特性**：起步依赖（Starter）、自动配置、内嵌容器、生产就绪（Actuator）',
                  '**约定大于配置的本质**：提供**带条件的默认值**，你不写它有，你写了它让位',
                  '**三层含义**：有默认值 → 默认值可覆盖 → 默认值有前提（条件成立才生效）',
                  '**收益**：从「配置驱动」变为「依赖驱动」——加了 `spring-boot-starter-web` 就自动有 MVC + Jackson + Tomcat',
                  '**代价**：隐式行为多，排查靠 `--debug`、`ConditionEvaluationReport`、Actuator',
                  '**不是银弹**：复杂定制仍需手写 `@Configuration`，Boot 只是把「80% 的常规配置」变成零',
                ],
                depth:
                  '一个能拉开差距的说法：「Spring Boot 的真正创新不是自动配置，而是**把自动配置做成了可退让的**」。早期各种「脚手架」也能生成一堆配置，问题是生成之后就是死代码，想改要删。Spring Boot 用 `@ConditionalOnMissingBean` 把「是否生效」的决策权交给用户——**你只要定义一个同类型 Bean，默认实现就自动消失**，不需要删任何代码。这个「零成本覆盖」才是它取代各类脚手架的原因。',
                followup:
                  '「自动配置和 Starter 是什么关系」——Starter 是**分发单位**（一个 pom + 一份清单），自动配置是**实现**（清单指向的类）。所以「自定义 Starter」的完整动作是：写自动配置类 → 写 `.imports` 清单 → 打成 jar。三者缺一不可，缺清单则配置永不被读，缺自动配置类则清单指向空。',
              },
              {
                kind: 'question',
                title: '@SpringBootApplication 由哪些注解组成？各自的作用？',
                questionId: 'java-05-Q56',
                intent:
                  '送分题，但要答出「三个注解各管一件事」，而不是「它包含三个注解」这种同义反复。',
                points: [
                  '**`@SpringBootConfiguration`**：本质是 `@Configuration`，标记「这是 Boot 应用的主配置类」，测试时用它定位入口',
                  '**`@EnableAutoConfiguration`**：通过 `@Import(AutoConfigurationImportSelector.class)` 触发自动配置的整套流程',
                  '**`@ComponentScan`**：从主类所在包开始扫描 `@Component` 系注解；带两个 `excludeFilters`',
                  '**`@ComponentScan` 的默认值**：`basePackages` 为空 → 取**主类所在包**；这就是「Bean 必须在主类同包或子包下」的由来',
                  '**`excludeFilters` 的两个过滤器**：`TypeExcludeFilter`（允许外部扩展排除规则）、`AutoConfigurationExcludeFilter`（排除自动配置类，防重复注册）',
                  '**别名属性**：`exclude` / `excludeName` 用于排除自动配置，`scanBasePackages` 用于改扫描范围',
                ],
                depth:
                  '追问「能不能只要其中两个」——可以。如果不用自动配置，只写 `@Configuration` + `@ComponentScan` 就是一个纯 Spring 应用；如果只想用自动配置不要包扫描（比如纯库项目、或者你完全靠手动 `@Import` 装配），可以只写 `@EnableAutoConfiguration`。**Spring Boot 里没有魔法，三个注解可以任意拆开用**——这个回答能证明你不是把 `@SpringBootApplication` 当成一个黑盒。',
                followup:
                  '「`@SpringBootApplication` 能放在多个类上吗」——技术上可以，但**`@SpringBootConfiguration` 只允许一个**（`@SpringBootTest` 找不到多个会报错）。而且多个入口会导致 `@ComponentScan` 起点不同、Bean 定义重复。正确做法是：只在一个类上用它，其他模块用 `@Configuration` + `@Import` 或 `@ComponentScan(basePackages = "com.example")` 显式声明。',
              },
              {
                kind: 'question',
                title: '详细说下 Spring Boot 自动装配原理（含 spring.factories → AutoConfiguration.imports 的演变）',
                questionId: 'java-05-Q57',
                intent:
                  '本课的核心题。四段链路必须完整说清，尤其「为什么用 Deferred」和「清单为什么改格式」。',
                points: [
                  '**入口**：`@EnableAutoConfiguration` → `@Import(AutoConfigurationImportSelector.class)`',
                  '**第一段 读清单**：`ImportCandidates.load()` 读 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`（2.7 前是 `spring.factories`）',
                  '**第二段 过滤**：先按元数据快速排除（`OnClass` 类条件），再加载类评估全部 `@Conditional`',
                  '**第三段 排序**：`@AutoConfigureOrder` / `Before` / `After`，保证「后置条件」的配置类在其依赖之后处理',
                  '**第四段 注册**：`DeferredImportSelector` 保证在所有用户配置类解析**之后**批量注册，从而「用户优先」',
                  '**关键机制**：`@ConditionalOnMissingBean` 之所以可靠，正是靠第四段的「延迟」',
                  '**清单为什么改**：`spring.factories` 是一个文件装所有扩展点，无法按需加载、无法条件过滤、IDE 不可跳转；新格式一文件一用途、纯类名列表',
                  '**两点补充**：`AutoConfigurationPackages` 记录主类包名（供自动配置知道该扫哪里）；`ConditionEvaluationReport` 是 `--debug` 输出的那张表',
                ],
                depth:
                  '最能体现深度的追问是「为什么一定要 `DeferredImportSelector`」。因为普通 `@Import` 在本配置类被解析时立即执行，而此时用户自己的 `@Configuration` 可能还没解析完——`@ConditionalOnMissingBean` 就会误判「用户没定义」从而注册默认 Bean，随后用户 Bean 进来时要么冲突、要么默认 Bean 抢占。`DeferredImportSelector` 把执行时机推到「所有配置类解析完毕、注册 BeanDefinition 之前」，这个时间窗刚好让「用户已声明、但尚未实例化」的状态可见。**一句话：延迟导入是「可覆盖」的实现基础**。',
                followup:
                  '「怎么看到底哪些自动配置生效了」——三种方式：启动参数 `--debug`（输出 `ConditionEvaluationReport`，分 Positive / Negative 两张表）、`/actuator/conditions` 端点（需暴露）、`ConditionEvaluationReport.get(beanFactory)` 编程获取。生产排查「某个 Bean 为什么没生效」时，`Negative matches` 表会直接告诉你卡在哪个条件上——比读代码快得多。',
              },
              {
                kind: 'question',
                title: '什么是条件注解？@Conditional 家族有哪些？',
                questionId: 'java-05-Q58',
                intent:
                  '按「判断依据」四分类回答，比列举更清晰。要能说出 `@ConditionalOnMissingBean` 的使用限制。',
                points: [
                  '**底层原语**：`@Conditional(Condition[])`，`Condition` 接口只有一个 `matches(context, metadata)` 方法',
                  '**为什么需要**：「条件装配」是一切可退让默认值的实现手段',
                  '**四类**：按 Class（`OnClass` / `OnMissingClass`）、按 Bean（`OnBean` / `OnMissingBean` / `OnSingleCandidate`）、按配置（`OnProperty` / `OnResource`）、按环境（`OnWebApplication` / `OnExpression` / `OnJava`）',
                  '**`@ConditionalOnProperty` 的两个关键参数**：`havingValue`（比较值）、`matchIfMissing`（缺省时是否成立）',
                  '**`@ConditionalOnMissingBean` 的两条限制**：按**类型**判断（不是名字）、只在自动配置里可靠（普通配置类解析顺序不保证）',
                  '**编写自定义条件**：实现 `Condition`，返回值直接决定生效与否；可注册为 `@Component`（Boot 3 起不再自动支持，需显式注册）',
                  '**调试**：`--debug` 的条件评估报告列出每个条件的判定结果与原因',
                ],
                depth:
                  '一个常被忽略的细节：`@Conditional` 的判断发生在**解析 BeanDefinition 阶段**，不是实例化阶段。所以 `@ConditionalOnBean` 只能看到「已经注册的 BeanDefinition」，看不到「正在创建中」或「稍后才注册」的 Bean——这正是它在普通 `@Configuration` 里不可靠的物理原因（不是「顺序不好」，而是「那一刻信息不全」）。理解了这一点，「为什么官方文档反复强调它只能用在自动配置类上」就不再是死记的规矩。',
                followup:
                  '「`@ConditionalOnProperty` 和 `@Profile` 有什么区别」——`@Profile` 只看 `spring.profiles.active` 这个特定属性，语义是「环境」；`@ConditionalOnProperty` 可以看任意属性、任意值，语义是「开关」。所以「prod 环境才启用」用 `@Profile("prod")` 更贴切，「有个 `sms.enabled` 开关」用 `@ConditionalOnProperty`。注意 `@Profile` 也是 `@Conditional` 的派生（`ProfileCondition`），本质同源。',
              },
              {
                kind: 'question',
                title: 'Starter 的原理？如何自定义一个 Starter？',
                questionId: 'java-05-Q59',
                intent:
                  '考「Starter 只是分发形态」这一点。能把三个组成部分说全（依赖 + 自动配置类 + 清单）就过关。',
                points: [
                  '**本质**：Starter 不是代码，是**一个 pom + 一份清单 + 一组自动配置类**的打包约定',
                  '**命名约定**：官方 `spring-boot-starter-xxx`，第三方 `xxx-spring-boot-starter`',
                  '**两种 Starter**：`starter`（依赖聚合，如 `spring-boot-starter-web`）+ `autoconfigure`（实现，如 `spring-boot-autoconfigure`）；小项目可合一',
                  '**三步实现**：① 写 `@AutoConfiguration` 类 + 条件注解 ② 写 `.imports` 清单 ③ pom 里引 `spring-boot-starter` 与 `spring-boot-configuration-processor`',
                  '**必加的两个**：`@EnableConfigurationProperties(XxxProperties.class)`（属性绑定）+ `@ConditionalOnMissingBean`（可退让）',
                  '**避免的两个坑**：自动配置类**不要**放在会被 `@ComponentScan` 扫到的包下；`.imports` 路径必须是 `META-INF/spring/`',
                  '**不要做的事**：Starter 里不要写 `@ComponentScan`（会污染用户包扫描），也不要用 `@Component` 标注自己的 Bean（改为 `@Bean` 方法）',
                ],
                depth:
                  '问「Starter 里为什么必须用 `@Bean` 而不是 `@Component`」——因为 `@Component` 依赖包扫描，而 Starter 的包名和用户项目的包名毫无关系，扫不到。`@Bean` 方法写在自动配置类里，由 `@Import` 主动加载，与包结构无关。这一条是「写 Starter 最常犯的错」，也是很多自定义 Starter「本地测试好好的、引到别的项目就失效」的原因。',
                followup:
                  '「怎么让 IDE 有配置项提示」——引 `spring-boot-configuration-processor`（`optional` 依赖），它会在编译期扫描 `@ConfigurationProperties` 类，生成 `META-INF/spring-configuration-metadata.json`，IDE 据此补全 `application.yml` 里的键名与注释（注释来自字段的 Javadoc）。这是「一个 Starter 显得专业」的细节，成本极低。',
              },
              {
                kind: 'question',
                title: 'Spring Boot 的启动流程（SpringApplication.run 做了什么）？',
                questionId: 'java-05-Q60',
                intent:
                  '能把「准备 → 环境 → 上下文 → 刷新 → Runner」五段说清即可，重点在「环境早于容器」。',
                points: [
                  '**构造阶段**：推断应用类型（Servlet / Reactive / None）、加载 `ApplicationContextInitializer` 与 `ApplicationListener`',
                  '**准备阶段**：造 `DefaultApplicationArguments` → 准备 `Environment`（加载配置文件）→ 打印 banner',
                  '**上下文阶段**：按类型反射创建 `ApplicationContext` → `prepareContext`（注册主类 BeanDefinition、执行 Initializer、推事件）',
                  '**刷新阶段**：`refreshContext` → `AbstractApplicationContext.refresh()` 十二步（自动配置在此发生、内嵌容器在 `onRefresh` 启动）',
                  '**收尾阶段**：`afterRefresh`（空）→ 打印耗时 → `callRunners` 执行 `ApplicationRunner` / `CommandLineRunner` → 推 `ApplicationReadyEvent`',
                  '**六个可用扩展点**：`ApplicationContextInitializer`、`EnvironmentPostProcessor`、`ApplicationListener`（各阶段事件）、`BeanFactoryPostProcessor`、`ApplicationRunner`、`CommandLineRunner`',
                  '**关键顺序**：`Environment` 就绪 **早于** Bean 创建；内嵌容器**启动于** `onRefresh`，早于 `refresh` 完成',
                ],
                depth:
                  '追问「`ApplicationRunner` 和 `CommandLineRunner` 的区别」——前者入参是 `ApplicationArguments`（已解析成 option / non-option，支持 `getOptionValues("name")`），后者是原始 `String[]`。**功能上推荐前者**，因为不用自己解析 `--key=value`。两者都按 `@Order` 排序执行，且都在 `ApplicationReadyEvent` **之前**——所以「服务已启动」的判定点应该是 `ApplicationReadyEvent`，而不是 Runner 执行完，更不是 `main` 方法返回。',
                followup:
                  '「启动慢怎么排查」——三层：① 加 `--debug` 看自动配置的条件评估耗时；② 用 `ApplicationStartup`（`BufferingApplicationStartup`）记录每个步骤的起止时间，配合 `/actuator/startup` 端点可视化；③ 关注「`BeanFactoryPostProcessor` 数量」与「`@ComponentScan` 范围」——前者多则解析慢，后者宽则扫描慢。**最常见的元凶是「扫描了过大的包」和「某个 Bean 的 `@PostConstruct` 里有阻塞调用」**。',
              },
              {
                kind: 'question',
                title: '内嵌 Tomcat 是怎么启动的？和外置 Tomcat 有什么区别？',
                questionId: 'java-05-Q61',
                intent:
                  '核心在「容器是被 Spring 创建出来的一个 Bean」这个视角转换，以及两条启动链的差异。',
                points: [
                  '**触发点**：`refresh()` 的 `onRefresh()` → `ServletWebServerApplicationContext.createWebServer()`',
                  '**创建**：`TomcatServletWebServerFactory.getWebServer()` 手动 new `Tomcat`、设端口、设 `Context`、注册 `DispatcherServlet`（映射 `/`）',
                  '**启动**：`TomcatWebServer` 构造时调用 `tomcat.start()`，**端口在此刻监听**',
                  '**外置的启动链**：容器（Tomcat）启动 → 扫描 `WEB-INF/lib` → 用 SPI 找 `ServletContainerInitializer` → `SpringServletContainerInitializer` → `WebApplicationInitializer` → 手动 `new AnnotationConfigWebApplicationContext` + `refresh()`',
                  '**控制权相反**：外置是「容器控制应用」，内嵌是「应用控制容器」',
                  '**内嵌的优势**：一个可执行 jar 即可运行（无需装 Tomcat）、版本由依赖决定（不会「测试环境 Tomcat 8、生产 Tomcat 7」）、便于容器化',
                  '**内嵌的代价**：调 Tomcat 本身（连接器、线程池、`server.xml` 级配置）要靠 `WebServerFactoryCustomizer` 或 `TomcatConnectorCustomizer`，不如改 `server.xml` 直观',
                ],
                depth:
                  '一个能显功底的细节：**内嵌 Tomcat 不支持 `web.xml` 与 `WEB-INF` 目录约定**（虽然可通过 `TomcatServletWebServerFactory` 手动挂载 docBase）。所以「为什么 Spring Boot 项目里放 `web.xml` 不生效」的答案是：根本没走「扫描 `WEB-INF`」的代码路径。同理，「静态资源为什么放在 `src/main/resources/static`」也是因为内嵌容器注册的是 Spring 的 `ResourceHttpRequestHandler`，而不是 Tomcat 的 DefaultServlet 目录浏览。',
                followup:
                  '「怎么换 Jetty 或 Undertow」——排除 `spring-boot-starter-tomcat`，引 `spring-boot-starter-jetty` 或 `spring-boot-starter-undertow` 即可。**能一行切换，正是「容器被抽象成 `WebServerFactory`」的直接收益**。注意不同容器的 `server.*` 参数不完全一致（如 Undertow 的 `server.undertow.*`），且 Tomcat 的 `maxThreads` 与 Undertow 的 `io-threads` / `worker-threads` 语义并不同构，迁容器要重新压测。',
              },
              {
                kind: 'question',
                title: 'Spring Boot 配置文件的加载优先级？',
                questionId: 'java-05-Q62',
                intent:
                  '按「外部 > 内部、命令行 > 文件」这条主轴回答，两个实用结论必须有。',
                points: [
                  '**总原则**：后加载的覆盖先加载的，但 Spring 用的是「优先级高的排前面」——同名键取优先级最高的那个 PropertySource',
                  '**从高到低（要点）**：命令行参数 → `SPRING_APPLICATION_JSON` → 环境变量 → `application-{profile}.yml`（外部）→ `application.yml`（外部）→ `application-{profile}.yml`（内部）→ `application.yml`（内部）',
                  '**位置顺序（由高到低）**：`file:./config/` → `file:./` → `classpath:/config/` → `classpath:/`',
                  '**profile 覆盖**：`application-{profile}` **永远**覆盖 `application`，不论位置',
                  '**格式顺序**：同一位置下 `.properties` 优先于 `.yml`',
                  '**两个实用结论**：jar 外覆盖 jar 内（改配置不用重打包）；命令行最高（临时改端口）',
                  '**自定义位置**：`spring.config.location`（替换默认位置）、`spring.config.additional-location`（追加）',
                ],
                depth:
                  '「环境变量怎么映射到配置键」是个高频细节：`server.max-http-header-size` 对应 `SERVER_MAXHTTPHEADER_SIZE`。规则是**把 `.` 和 `-` 都转成 `_` 并大写**，但正因为「`.` 与 `-` 都变 `_`」，`server.max-http-header-size` 和 `server.max.http.header.size` 会撞成同一个环境变量名——所以官方建议**不要依赖环境变量表达有歧义的键**。K8s 里用 `SPRING_APPLICATION_JSON` 或挂载配置文件更稳。',
                followup:
                  '「配置中心的值和本地文件冲突时谁赢」——取决于 `PropertySource` 的插入位置。Nacos / Apollo 这类实现通常在 `EnvironmentPostProcessor` 阶段把自己的 `PropertySource` **插入到 `application.yml` 之前**（`addFirst`），因此优先级高于本地文件；但也意味着命令行参数仍然能覆盖它。这个「插入位置」正是「为什么配置中心能覆盖本地，却又被命令行覆盖」的答案。',
              },
              {
                kind: 'question',
                title: 'Spring Boot Actuator 是什么？生产上怎么用？',
                questionId: 'java-05-Q63',
                intent:
                  '考「有没有真的上过生产」。端点是次要的，暴露面控制和健康检查分组才是重点。',
                points: [
                  '**是什么**：一组开箱即用的运维端点（`/actuator/**`），提供健康检查、指标、配置、日志级别、线程栈等',
                  '**常用端点**：`health`（探活）、`info`、`metrics`（Micrometer）、`prometheus`（拉取格式）、`env`、`loggers`（**运行时改日志级别**）、`threaddump`、`heapdump`、`mappings`、`conditions`、`shutdown`',
                  '**默认只暴露 `health`**：`management.endpoints.web.exposure.include=*` 是**绝对不能在生产盲开**的（`heapdump` / `env` 会泄露密钥）',
                  '**健康检查分组**：`management.endpoint.health.group.readiness.include=readinessState,db`，配合 K8s 的 liveness / readiness 探针',
                  '**`readinessState` 与 `livenessState`**：前者在 `ApplicationReadyEvent` 后变 `UP`（用于「能否接流量」），后者用于「是否要重启」',
                  '**安全**：独立端口（`management.server.port`）+ 内网访问 + Spring Security 保护；**必须做的三件事**：改暴露列表、隔离端口、加认证',
                  '**指标接入**：Micrometer → Prometheus 拉取 → Grafana 展示；自带 JVM、HTTP、连接池、缓存指标',
                ],
                depth:
                  '一个实战细节：**`/actuator/health` 默认会聚合所有 `HealthIndicator`，其中 `db` 检查会真的执行 `SELECT 1`**。如果数据库连接池被打满或网络抖动，健康检查会变 `DOWN`，K8s 就会重启 Pod——形成「数据库抖一下，全部实例连环重启」的雪崩。所以**生产上一定要把外部依赖从 `liveness` 里摘出去**，只留在 `readiness`（这样才能「摘流量但不重启」）。这个坑在面试里说出来，比背端点列表有价值得多。',
                followup:
                  '「怎么在不重启的情况下改日志级别」——`POST /actuator/loggers/com.example`，body `{"configuredLevel":"DEBUG"}`。原理是 `LoggersEndpoint` 直接操作 `LoggingSystem` 的运行时配置，**不持久化**（重启即恢复），所以适合临时排障。若要持久化，用 `logging.level.xxx` 配置或配置中心的动态刷新。同类还有一个 `POST /actuator/refresh`（配合 `@RefreshScope`），但那是 Spring Cloud 的端点，不是 Actuator 自带。',
              },
              {
                kind: 'question',
                title: 'Spring Boot 3.x / Spring 6 有哪些重要变化？',
                questionId: 'java-05-Q64',
                intent:
                  '按「JDK 基线 / jakarta / 原生镜像 / 可观测性」四条主线回答，重点讲清升级代价。',
                points: [
                  '**JDK 17 起**：用了 record、密封类、文本块、switch 模式匹配；JDK 21 是当前推荐的 LTS',
                  '**`javax` → `jakarta`**：Servlet、JPA、Validation、Mail 全部换命名空间，**第三方库必须同步升级**（这是最大工作量）',
                  '**AOT + 原生镜像正式支持**：`GraalVM Native Image` 启动毫秒级、内存几十 MB；代价是构建慢、反射 / 动态代理需 `RuntimeHints` 注册、部分库不兼容',
                  '**`AutoConfiguration.imports`**：替代 `spring.factories` 作为自动配置清单（2.7 引入，3.0 起 `spring.factories` 不再读取）',
                  '**Micrometer Observation**：`Observation` API 统一 metrics / tracing / logging，`@Observed` 一个注解三件套齐活',
                  '**HTTP Interface**：`@HttpExchange` 声明式 HTTP 客户端，内置、无需 Feign',
                  '**Security 改法**：`WebSecurityConfigurerAdapter` 废弃 → 声明 `SecurityFilterChain` Bean',
                  '**Problem Details（RFC 7807）**：`ProblemDetail` 作为标准错误响应体，`application/problem+json`',
                ],
                depth:
                  '被问「原生镜像为什么不能开箱即用」——因为 GraalVM 的封闭世界假设（closed-world assumption）在**构建期**就把所有可达代码编译成机器码，运行时不存在 `Class.forName` 的能力。而 Spring 大量依赖反射（`@Autowired` 字段注入、`@ConfigurationProperties` 绑定、Jackson 序列化、代理生成），这些「运行期才知道的类」必须在构建期通过 `RuntimeHints` 或 AOT 生成的元数据提前声明。Spring Boot 3 的 AOT 引擎会自动扫描并生成大部分 hints，但**你自己的反射代码（尤其 `Class.forName` 拼类名）必须手写 `@RegisterReflectionForBinding` 或 `RuntimeHintsRegistrar`**，否则只在 native 下运行时才炸。',
                followup:
                  '「从 2.7 升 3.x 的实操顺序」——① 先升到 2.7（最后支持 `spring.factories` 的版本），把废弃 API 全清掉；② 用 `spring-boot-properties-migrator` 扫出失效的配置键；③ 全量 `javax` → `jakarta` 替换（IDE 批量 + 编译报错驱动）；④ 逐个升级第三方依赖（MyBatis-Plus、ShardingSphere 这类对 jakarta 敏感的库要查版本矩阵）；⑤ 改 Security 配置；⑥ 最后再评估是否上 native。**跳过第 ① 步直接升 3.0 是升级失败最常见的原因**。',
              },
              {
                kind: 'question',
                title: '如何排除某个自动配置？如何优雅停机？',
                questionId: 'java-05-Q65',
                intent:
                  '两个实操题捆在一起。排除要说出三种方式，优雅停机要说出「四件事的先后」。',
                points: [
                  '**排除方式一**：`@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)`（类型安全，推荐）',
                  '**排除方式二**：`spring.autoconfigure.exclude=com.xxx.XxxAutoConfiguration`（配置文件，适合按环境切换）',
                  '**排除方式三**：通过条件让配置不生效（如不引依赖、或 `@ConditionalOnProperty` 关掉）——**这才是「设计层面」的排除**',
                  '**优雅停机开关**：`server.shutdown=graceful`（Boot 2.3+），默认是 `immediate`',
                  '**宽限期**：`spring.lifecycle.timeout-per-shutdown-phase=30s`，超时则强制关闭',
                  '**优雅停机的四步**：① 停止接收新请求（容器停止 accept）② 等在途请求完成 ③ 关闭线程池 / 连接池 ④ 执行 `@PreDestroy` 与 `DisposableBean.destroy`',
                  '**配合 K8s 的关键**：先 `readiness` 探针失败摘流量，**等一个 `preStop` sleep**，再让进程收到 SIGTERM——否则「摘流量」与「进程退出」同时发生，仍有请求被打断',
                ],
                depth:
                  '「优雅停机为什么还需要 `preStop` sleep」——K8s 的「从 Endpoints 移除」和「向容器发 SIGTERM」是**并行**发生的，不是串行。移除 Endpoints 要经过 kube-proxy / Ingress 各层刷新，通常需要几百毫秒到几秒；而 SIGTERM 立刻到达，应用马上开始「停止接收新请求」。这中间的窗口期内，流量仍会按旧规则打进来，撞上正在关闭的实例 → 502。所以标准做法是 `preStop: exec: sleep 5`，先让流量摘干净，再触发关停。**这个细节是「背过优雅停机」和「真的配过」的分界线**。',
                followup:
                  '「异步任务和 MQ 消费者怎么优雅停机」——`server.shutdown=graceful` **只管 HTTP 请求**，不管线程池与 MQ 消费。要自己实现 `SmartLifecycle`（`stop()` 里先 `shutdown()` 线程池、`awaitTermination`，再 `stop()` 消费者），并保证 `getPhase()` 比 Web 容器小（后停先启）。Spring 的 `ThreadPoolTaskExecutor` 提供 `setWaitForTasksToCompleteOnShutdown(true)` + `setAwaitTerminationSeconds(n)`，是两个必须显式打开的开关。',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'integration',
      title: 'D · 微服务与持久层整合',
      goal: '掌握 Cloud 组件职责与 MyBatis 的工作机制',
      summary:
        '最后一阶段把 Spring 从单体带到分布式：注册中心、配置中心、网关、熔断各管什么，以及 MyBatis 如何把接口方法变成 SQL 执行。MyBatis 部分题量最大，重点在缓存、插件与结果映射三块。',
      lessons: [
        {
          id: 'spring-cloud',
          title: 'Spring Cloud：分布式治理的四件事',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['八、Spring Cloud 微服务（概要级）'] }],
          content: {
            intro:
              'Spring Cloud 常被问成一串组件名，但真正的答法是先讲「单机变分布式之后，多出了哪些原来不存在的问题」。一共四类：**我不再知道别人在哪**（服务发现）、**改一个配置要重启几十个实例**（配置中心）、**流量从哪进来、怎么分**（网关与负载均衡）、**一个下游挂了会不会拖死我**（熔断降级）。每个组件都是在回答其中一类问题，而 Nacos 之所以流行，正是因为它一口气吃下了前两类。本课按这四条线走，重点讲三张图：一次 Feign 调用到底穿了哪些环节、熔断器的三态怎么切换、网关的过滤器链为什么分「前置」和「后置」。',
            outline: [
              '四类问题 → 四类组件：发现（Nacos/Eureka）、配置（Nacos Config）、入口（Gateway）、容错（Sentinel/Resilience4j）',
              'OpenFeign 只是「声明式 HTTP 客户端」，负载均衡、熔断都是外挂在它上面的',
              '注册中心的选型本质是 **CAP 取舍**：Eureka 选 AP、ZK 选 CP、Nacos 可切',
              '熔断、降级、限流是**三个不同维度**：熔断看失败率、降级看有无兜底、限流看入口速率',
              'Gateway 基于 WebFlux 非阻塞，`pre` 与 `post` 两类过滤器靠「责任链 + 拦截器」组合成一条链',
            ],
            pitfalls: [
              '把网关和负载均衡混为一谈：网关在**入口**做南北向流量，负载均衡在**调用方**做东西向流量',
              '认为「熔断 = 降级」：熔断是**触发条件**（失败率超阈值就断开），降级是**兜底动作**（返回默认值）。熔断后通常执行降级，但降级不一定要熔断',
              '以为 Nacos 的配置刷新是「推」到客户端：客户端靠**长轮询**（30s 挂起 + 变更立即返回）拿到变化，本质仍是拉',
            ],
            sections: [
              {
                kind: 'concept',
                title: '先看清问题，再记组件名',
                body: [
                  '单体应用里，调用一个方法就是 `a.b()`——地址写死在字节码里，失败就是一个异常。拆成微服务之后，同一个调用变成一次跨进程的网络请求，于是凭空长出四个新问题。',
                  '**第一，地址不再是常量**。服务实例会扩容、缩容、漂移、宕机，IP 随时变化，写死在配置里必然失效。解法是引入一个「所有人都来登记、所有人来查询」的中介——**注册中心**。**第二，配置散落**。几十个实例、每个环境一套配置，改一个开关要重启全部。解法是**配置中心**，并支持运行时刷新。**第三，流量需要收口**。外部请求不该直接打到几百个实例上，需要统一入口做路由、鉴权、限流、灰度——**网关**；服务之间的调用也要分摊压力——**客户端负载均衡**。**第四，故障会传染**。A 调 B，B 变慢，A 的线程全被占满，A 也挂，进而拖垮 C——**熔断、降级、隔离**。',
                  '记住这个因果链的价值在于：面试官问「为什么要用注册中心」，你不要答「为了服务发现」（同义反复），而要答「因为实例地址是动态的，写死会失效」。同理「为什么要熔断」不是「为了防止雪崩」（口号），而是「因为调用方的线程池是有限资源，慢调用会把它占满，进而让一个下游故障升级为全站故障」。',
                ],
                points: [
                  '**服务发现**：解决「地址是动态的」，涉及注册、续约、拉取、剔除四个动作',
                  '**配置中心**：解决「配置分散且需重启」，涉及集中存储、环境隔离、动态刷新、变更审计',
                  '**网关**：解决「流量需要统一收口」，做路由、鉴权、限流、灰度、协议转换',
                  '**负载均衡**：解决「多实例如何分摊」，分**服务端**（Nginx/LB）与**客户端**（Ribbon/LoadBalancer）两类',
                  '**容错**：解决「故障会传染」，手段有超时、重试、熔断、隔离（线程池/信号量）、降级',
                  '**调用**：把上面这些串起来的「胶水」，即 OpenFeign / RestTemplate / WebClient',
                ],
              },
              {
                kind: 'diagram',
                title: '组件分层：谁在哪个位置',
                body: [
                  '把组件按「请求进来的路径」分层，能一眼看出职责边界。从上到下：入口 → 调用 → 治理 → 基础。',
                ],
                diagram: {
                  type: 'layers',
                  items: [
                    { label: '① 入口层：Spring Cloud Gateway', note: '南北向流量：路由、鉴权、限流、灰度、日志。基于 WebFlux，非阻塞', tone: 'primary' },
                    { label: '② 调用层：OpenFeign + LoadBalancer', note: '东西向流量：声明式接口 → 拼 URL → 选实例 → 发 HTTP', tone: 'primary' },
                    { label: '③ 容错层：Sentinel / Resilience4j', note: '挂在调用层外面：超时、重试、熔断、舱壁隔离、降级兜底', tone: 'warn' },
                    { label: '④ 治理层：Nacos / Consul', note: '注册中心 + 配置中心。服务目录与配置的「唯一真相源」', tone: 'warn' },
                    { label: '⑤ 观测层：Micrometer + Sleuth / OTel', note: '链路追踪、指标、日志关联。靠 `traceId` 把跨服务调用串起来', tone: 'muted' },
                  ],
                  caption:
                    '这张图最实用的地方是回答「某某功能该放哪」。**鉴权放网关**（一次校验，所有下游都省），**限流两层都要**（网关挡住外部洪峰，服务内挡住上游的重试风暴），**熔断只能放调用方**（只有调用方知道自己被拖慢了）。另外注意第 ② 层的关键事实：**OpenFeign 本身不做负载均衡**，它只负责「把接口方法翻译成 HTTP 请求」，选实例是 `LoadBalancer` 干的，两者通过 `Client` 接口解耦。这就是「为什么换个负载均衡器不用改 Feign 代码」的原因。',
                },
              },
              {
                kind: 'diagram',
                title: '服务注册与发现：一次完整时序',
                body: [
                  '注册中心的核心不是「存地址」，而是四个动作的配合：**注册、续约、拉取、剔除**。前三者由客户端主动发起，第四者由服务端定时判定。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['服务实例', '注册中心', '调用方'],
                  messages: [
                    { from: '服务实例', to: '注册中心', text: '启动后 `register(ip, port, metadata)`' },
                    { from: '注册中心', to: '注册中心', text: '写入临时节点 / 内存表，标记 `healthy`' },
                    { from: '服务实例', to: '注册中心', text: '每 5s 心跳续约（HTTP 或 UDP）' },
                    { from: '调用方', to: '注册中心', text: '`subscribe(serviceName)`，拿全量列表' },
                    { from: '注册中心', to: '调用方', text: '返回实例列表 + 变更推送（UDP / 长连接）', reply: true },
                    { from: '调用方', to: '调用方', text: '写入**本地缓存**，此后调用不再问注册中心' },
                    { from: '注册中心', to: '注册中心', text: '超过 15s 未续约 → 标记不健康；超过 30s → 剔除' },
                    { from: '注册中心', to: '调用方', text: '推送变更，调用方刷新本地缓存', reply: true },
                  ],
                  caption:
                    '两个关键设计值得说：**第一，调用方有本地缓存**——所以注册中心短时不可用，已有调用仍能继续（这是「注册中心挂了会不会全站挂」的标准答案：不会，但新实例上不了线、下线的实例摘不掉）。**第二，「剔除」是延迟的**——Eureka 默认 30s 心跳、90s 剔除，意味着「服务已死但列表里还在」的窗口可达 90 秒。所以**调用方必须有超时与重试**，不能指望注册中心的实时性。Nacos 把心跳和剔除都调到秒级（默认 15s / 30s），窗口短得多，这也是它推广快的原因之一。',
                },
              },
              {
                kind: 'diagram',
                title: '注册中心选型：一张 CAP 表',
                body: [
                  '选型题的标准答法是先摆 CAP，再说「业务能不能容忍脏读」。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['组件', 'CAP 取舍', '一致性模型', '健康检查', '一句话结论'],
                  cols: ['CAP 取舍', '一致性模型', '健康检查', '一句话结论'],
                  rows: [
                    ['Eureka', '**AP**', '最终一致（客户端缓存 + 定期拉取）', '客户端心跳', '注册中心挂了不影响调用，但可能读到已死实例'],
                    ['Zookeeper', '**CP**', '强一致（ZAB，写过半才返回）', '会话 + 临时节点', '选举期间**整个注册中心不可用**，微服务场景代价太大'],
                    ['Consul', '**CP**（可调）', 'Raft', 'Agent 主动健康检查（HTTP/TCP/Script）', '健康检查最强，跨数据中心好，但写性能受 Raft 限制'],
                    ['Nacos', '**AP / CP 可切**', 'Distro（AP）或 Raft（CP）', '客户端心跳 + 服务端主动探测', '**注册 + 配置一体**，临时实例走 AP、持久实例走 CP'],
                    ['Etcd', '**CP**', 'Raft', '租约（lease）', 'K8s 生态标配，服务发现不是它的主职'],
                  ],
                  caption:
                    '面试里最容易被追问的是「ZK 为什么不适合做注册中心」。答案不是「ZK 性能差」，而是**它的 CP 语义在「选举」时会把整个注册中心变成不可用**——微服务场景下，注册中心短暂不可用可以忍（有本地缓存），但**新实例上不了线、配置读不到**会迅速放大成故障。而 Eureka 的 AP 选择恰好对应「注册中心是『目录』不是『账本』」这个定位：目录旧一点没关系，读不到才要命。**若被问「你们选了什么、为什么」，说 Nacos 就多说一句「一体方案省了一套组件的运维」**，这是工程理由，比 CAP 更有说服力。',
                },
              },
              {
                kind: 'diagram',
                title: '一次 Feign 调用穿过哪些环节',
                body: [
                  '「OpenFeign 原理」这题的核心是：**它没有魔法，只是把「接口 → HTTP 请求」这件事在启动时准备好，运行时分五步执行**。把这张图记住，等于记住了整条调用链。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① 启动期：扫描 `@FeignClient`', note: '`FeignClientsRegistrar` 为每个接口生成 `FeignClientFactoryBean` 的 BeanDefinition，并注入 `@EnableFeignClients` 所在包的扫描结果' },
                    { label: '② 启动期：生成 JDK 动态代理', note: '`FeignClientFactoryBean.getObject()` → `Feign.Builder.target()`，用 `Proxy.newProxyInstance` 给接口造代理对象，注册进容器' },
                    { label: '③ 运行期：代理拦截方法调用', note: '`ReflectiveFeign$FeignInvocationHandler.invoke()` → 按方法找到对应的 `MethodHandler`（启动时就建好了映射表）' },
                    { label: '④ 运行期：拼装 `RequestTemplate`', note: '`Contract` 已把注解解析成元数据；此处填参数、编码 body、加 header（含 `traceId`）' },
                    { label: '⑤ 运行期：选择实例并发送', note: '`LoadBalancerClient` 按服务名从本地缓存选一个实例 → 重写 URL → `Client`（默认 `HttpURLConnection`，可换 OkHttp/Apache）发请求' },
                    { label: '⑥ 运行期：解码响应', note: '`Decoder`（`ResponseEntityDecoder` + `HttpMessageConverter`）把响应体反序列化成返回类型；非 2xx 走 `ErrorDecoder` 抛异常' },
                    { label: '⑦ 横切：熔断 / 重试 / 日志', note: '都通过「装饰 `Client`」实现，所以对业务代码完全透明——这是 Feign 最优雅的设计' },
                  ],
                  caption:
                    '第 ⑦ 步是「为什么 Feign 能随便加能力」的答案：**熔断、重试、日志、指标全部是 `Client` 的装饰器**（`Feign.Builder.client(new CircuitBreakerClient(new RetryClient(...)))`），业务接口一行都不用改。这也解释了「Feign 加 Sentinel 支持为什么只要引一个 starter」——它只是把 Sentinel 的 `Client` 装饰器注册进 `Feign.Builder`。另外注意第 ② 步的时间点：**代理对象在启动时就创建好并放进容器**，所以注入 `XxxFeignClient` 拿到的是个现成的代理，不是运行期才生成。',
                },
              },
              {
                kind: 'diagram',
                title: '负载均衡策略：一张树看清',
                body: [
                  '「负载均衡有哪些策略」按「服务端 / 客户端」先分家，再列策略。',
                ],
                diagram: {
                  type: 'tree',
                  root: {
                    label: '负载均衡',
                    note: '按「谁来做决策」分两大类',
                    children: [
                      {
                        label: '服务端（集中式）',
                        note: 'Nginx / F5 / LVS，调用方只知道 VIP',
                        tone: 'warn',
                        children: [
                          { label: '轮询 / 加权轮询', note: 'Nginx 默认；实现简单，不看实例负载' },
                          { label: '最少连接', note: '按当前连接数选，适合长连接' },
                          { label: 'IP Hash', note: '同一 IP 固定到同一实例，天然会话保持（但有倾斜）' },
                        ],
                      },
                      {
                        label: '客户端（进程内）',
                        note: 'Spring Cloud LoadBalancer，调用方拿到全量列表自己选',
                        tone: 'primary',
                        children: [
                          {
                            label: '基础策略',
                            note: '无状态，不看实例健康度细节',
                            children: [
                              { label: 'RoundRobin（默认）', note: '轮询；Spring Cloud 2020 后取代 Ribbon 成为默认' },
                              { label: 'Random', note: '随机；实例数多时天然均匀' },
                            ],
                          },
                          {
                            label: '加权策略',
                            note: '需配合 Nacos 元数据 / 自定义权重',
                            children: [
                              { label: 'WeightedResponseTime', note: '按平均响应时间反比加权，慢的少给流量' },
                              { label: 'Nacos 权重', note: '按实例权重选，常用于灰度与同机房优先' },
                            ],
                          },
                          {
                            label: '粘性策略',
                            note: '需要「同一用户打到同一实例」时用',
                            tone: 'warn',
                            children: [
                              { label: '一致性哈希', note: '按参数（如 userId）哈希，扩缩容时迁移量小' },
                              { label: '同集群优先', note: '`spring.cloud.loadbalancer.zone`，优先同可用区，降跨区延迟' },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  caption:
                    '两个高频追问：**「默认策略是什么」**——Spring Cloud 2020.0 之后是 `RoundRobinLoadBalancer`（Ribbon 已移除）；**「怎么自定义」**——注册一个 `ReactorLoadBalancer<ServiceInstance>` Bean，或用 `@LoadBalancerClient(name = "svc", configuration = XxxConfig.class)` 按服务指定。**「怎么实现灰度」**是第三个常见追问：思路不是改负载均衡策略，而是**在实例元数据里打标（如 `version=v2`），再用自定义 `ServiceInstanceListSupplier` 先过滤再交给均衡器**——过滤在前、均衡在后，这两个动作不能混在一起。',
                },
              },
              {
                kind: 'diagram',
                title: '熔断器的三个状态',
                body: [
                  '「熔断」被问得最多，但很多人说不清「什么时候恢复」。答案全在这个三态机里。',
                ],
                diagram: {
                  type: 'state',
                  states: [
                    { label: 'CLOSED（闭合）', note: '正常放行，统计失败率；滑动窗口内失败率超阈值 → 转 OPEN' },
                    { label: 'OPEN（断开）', note: '**直接拒绝，不发起真实调用**；计时到 `waitDurationInOpenState` → 转 HALF_OPEN' },
                    { label: 'HALF_OPEN（半开）', note: '放行少量探测请求；全部成功 → 转 CLOSED；有失败 → 回到 OPEN' },
                  ],
                  transitions: [
                    'CLOSED → OPEN：滑动窗口内失败率 / 慢调用比例超阈值',
                    'OPEN → HALF_OPEN：等待时间到，放少量探测流量',
                  ],
                  caption:
                    '「半开为什么只放少量请求」——因为此时下游可能还没恢复，全量放进去会立刻把它再打死，回到 OPEN 的代价又得等一个完整窗口。**少量探测是「低成本试探」**。另一个关键点：**OPEN 状态是「不发起真实调用」**，所以熔断的价值不只是「防止雪崩」，还包括「让故障下游有机会喘息」——这一点在很多回答里被漏掉，但它才是熔断与「单纯超时重试」的本质区别。Resilience4j 默认用**滑动窗口**（COUNT_BASED 或 TIME_BASED）统计，Sentinel 用**滑动时间窗 + 令牌桶**做流控，两套模型的参数不可直接换算。',
                },
              },
              {
                kind: 'diagram',
                title: 'Gateway 的请求处理流程',
                body: [
                  'Gateway 的核心就一句话：**`RoutePredicateHandlerMapping` 找到路由 → `FilteringWebHandler` 执行过滤器链 → 转发**。但细节里有三个考点。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① `RoutePredicateHandlerMapping` 匹配', note: '遍历所有 `Route`，用 `Predicate` 判断（Path / Method / Header / Weight 等），命中则返回 `FilteringWebHandler`' },
                    { label: '② 组装过滤器链', note: '把「全局过滤器 `GlobalFilter`」与「路由专属 `GatewayFilter`」合并，按 `Ordered` 排序' },
                    { label: '③ `pre` 阶段正序执行', note: '鉴权、限流、日志、改写路径——**在转发之前**。任一过滤器不调用 `chain.filter()` 即中断' },
                    { label: '④ `NettyRoutingFilter` 转发', note: '真正发起下游请求（WebFlux 非阻塞）；响应写回时**回调开始回溯**' },
                    { label: '⑤ `post` 阶段逆序执行', note: '`chain.filter().then(...)` 里的逻辑——**在拿到响应之后**，用于加响应头、统计耗时' },
                    { label: '⑥ 异常处理', note: '`ErrorWebExceptionHandler` 兜底；注意**响应已提交后再抛异常无法改状态码**' },
                  ],
                  caption:
                    '三个考点：**第一，`pre` 与 `post` 在同一个过滤器里**——`chain.filter(exchange).then(Mono.fromRunnable(...))`，`.then` 之后的才是 post，位置由代码结构而非注解决定。**第二，GlobalFilter 与 GatewayFilter 的区别只是「作用范围」**（全局 vs 单路由），执行机制完全一样。**第三，Gateway 基于 WebFlux，不能引入 `spring-boot-starter-web`**——两者都试图接管 Servlet 容器，同时存在会直接启动失败（Spring Boot 会明确报「Spring MVC found on classpath, which is incompatible with Spring Cloud Gateway」）。这个错误在实际项目里非常常见。',
                },
              },
              {
                kind: 'principle',
                title: '配置中心：动态刷新是怎么做到的',
                body: [
                  '「配置中心解决了什么问题」好答，「改了配置怎么生效」才是真考题。核心结论：**客户端拉，不是服务端推**——所谓「推送」是长轮询营造出来的实时感。',
                ],
                steps: [
                  {
                    title: '① 存储：配置按「namespace + group + dataId」三级定位',
                    detail:
                      'Nacos 用 `namespace`（环境隔离，如 dev / prod）→ `group`（业务分组）→ `dataId`（具体文件，如 `order-service.yaml`）三级寻址。**为什么要三级**：`namespace` 解决环境隔离（不同环境互不可见，避免误读），`group` 解决同环境内多套配置（如灰度组），`dataId` 落到具体应用。少了任何一级都会出现「测试环境读到生产配置」这类事故。',
                  },
                  {
                    title: '② 拉取：启动时全量拉，之后监听变更',
                    detail:
                      '启动阶段通过 `PropertySourceLocator` 把远程配置插入 `Environment`（**位置在本地配置文件之前**，所以远程覆盖本地）。之后由 `NacosContextRefresher` 为每个 `dataId` 注册一个 `Listener`，进入监听循环。',
                  },
                  {
                    title: '③ 长轮询：30 秒挂起 + 变更立即返回',
                    detail:
                      '客户端发一个「带 `Long-Pulling-Timeout: 30000` 头」的请求，服务端**不立刻返回**，而是把它挂起（`hold`）。若 30 秒内有配置变更，立刻返回新数据；若无，则返回 304，客户端再发一次。**这叫长轮询（long polling），本质是「拉」，但延迟接近「推」**。为什么不直接做推送：需要维护长连接、要处理断线重连、要保证消息不丢，成本远高于长轮询。',
                  },
                  {
                    title: '④ 刷新：`@RefreshScope` 重建 Bean',
                    detail:
                      '收到变更后发布 `EnvironmentChangeEvent`。**普通 Bean 不会重建**（`@Value` 注入的值已经烤进去了），只有标了 `@RefreshScope` 的 Bean 会被销毁并延迟重建——下次调用时重新走一遍依赖注入，从而拿到新值。**这就是「为什么改了配置没生效」的头号原因：Bean 没加 `@RefreshScope`**。',
                  },
                  {
                    title: '⑤ 更稳的做法：`@ConfigurationProperties`',
                    detail:
                      '`@ConfigurationProperties` 配合 `@EnableConfigurationProperties` 时，Spring Cloud 提供了 `ConfigurationPropertiesRebinder`，能在配置变更后重新绑定。相比 `@RefreshScope`（销毁重建，会丢失 Bean 内部状态），它更轻。**推荐组合**：`@ConfigurationProperties` + `@RefreshScope`（或直接靠 rebinder），并对「刷新时机」保持敬畏——正在处理的请求可能读到「一半旧一半新」的配置。',
                  },
                ],
              },
              {
                kind: 'question',
                title: '微服务常用的 Spring Cloud 组件有哪些？',
                questionId: 'java-05-Q66',
                intent:
                  '不要罗列名词，要按「解决什么问题」分组。分组正确，后面每道题都能自然延伸。',
                points: [
                  '**服务发现**：Nacos Discovery / Eureka / Consul——注册、续约、拉取、剔除',
                  '**配置中心**：Nacos Config / Spring Cloud Config / Apollo——集中管理 + 动态刷新',
                  '**服务调用**：OpenFeign（声明式）、RestTemplate、WebClient（响应式）',
                  '**负载均衡**：Spring Cloud LoadBalancer（Ribbon 已移除）——客户端侧选实例',
                  '**网关**：Spring Cloud Gateway（WebFlux）、Zuul（已淘汰）——路由、鉴权、限流',
                  '**容错**：Sentinel / Resilience4j / Hystrix（停更）——熔断、降级、隔离、限流',
                  '**链路追踪**：Micrometer Tracing + Zipkin / SkyWalking——`traceId` 串联',
                  '**消息与流**：Spring Cloud Stream（屏蔽 Kafka / RabbitMQ 差异）、Bus（配置变更广播）',
                ],
                depth:
                  '能加到分的一句：**「Spring Cloud 的版本是按字母顺序的地名（Hoxton、2020.0、2021.0…），2020 之后改用日期版本，且必须与 Spring Boot 版本严格对应」**。选错版本会出现「Bean 找不到」「自动配置不生效」这类完全查不到根因的问题——官方有一张兼容性矩阵表，是上线前必查项。这个细节说明你真的搭过、而不是只背过组件名。',
                followup:
                  '「Spring Cloud Alibaba 和 Spring Cloud 是什么关系」——前者是后者的一套**实现**（Nacos 实现 Discovery 与 Config、Sentinel 实现 CircuitBreaker、Seata 实现分布式事务），它们通过 Spring Cloud 的**抽象接口**（`DiscoveryClient`、`PropertySourceLocator`、`CircuitBreakerFactory`）接入。所以「换注册中心不改业务代码」能成立，靠的是这层抽象——这也是 Spring Cloud 真正的价值：**它不是框架，是一组标准接口 + 默认实现**。',
              },
              {
                kind: 'question',
                title: 'Eureka 和 Nacos 的对比？',
                questionId: 'java-05-Q67',
                intent:
                  '按「一致性模型 / 健康检查 / 功能范围 / 运维成本」四维对比，结论落在「Nacos 一体方案省事」。',
                points: [
                  '**一致性**：Eureka 只有 AP（纯最终一致）；Nacos 支持 AP（Distro，临时实例）与 CP（Raft，持久实例）切换',
                  '**健康检查**：Eureka 只靠客户端心跳（默认 30s 心跳 / 90s 剔除）；Nacos 有心跳 + 服务端主动探测（TCP / HTTP / MySQL），且剔除更快（15s / 30s）',
                  '**功能范围**：Eureka 只做注册中心；Nacos 注册 + 配置一体，还带控制台、命名空间、权重、元数据',
                  '**推送机制**：Eureka 客户端定时全量拉取（30s）+ 增量；Nacos 支持 UDP 推送 + 长轮询，变更秒级感知',
                  '**生态与维护**：Eureka 2.x 停止开发（1.x 仍在维护），Netflix 已转闭源；Nacos 由阿里持续投入，国内社区活跃',
                  '**选型结论**：新项目优先 Nacos（一体、活跃、控制台好用）；已有 Eureka 且稳定，没有强理由不必迁移',
                ],
                depth:
                  '一个真实差异值得说：**Eureka 的「自我保护机制」**——当 15 分钟内续约失败比例低于 85%，Eureka 会**停止剔除任何实例**，因为它怀疑是「自己网络出问题」而不是「大量服务同时挂了」。这个设计的出发点是「宁可保留脏数据，也不要误删健康实例」，是 AP 思想的极致体现。代价是：真的大面积宕机时，列表里会长期留着一堆死实例，调用方必须靠超时和重试兜底。Nacos 没有这个机制（它分临时/持久实例来区分语义），所以运维心智负担不同。',
                followup:
                  '「Nacos 的 AP 和 CP 怎么切」——通过实例类型区分：**临时实例（ephemeral=true，默认）走 Distro 协议（AP）**，靠心跳保活，客户端断了就摘除；**持久实例（ephemeral=false）走 Raft（CP）**，不靠心跳，需主动注销。所以「切 CP」不是全局开关，而是「用哪种实例」。这个细节说明 Nacos 的设计不是「二选一」，而是「按注册语义分别选择」——比 Eureka 的单一模型更贴合实际需求。',
              },
              {
                kind: 'question',
                title: '注册中心的 CAP 与选型：Zookeeper、Eureka、Nacos 怎么选？',
                questionId: 'java-05-Q68',
                intent:
                  '必须说清「注册中心是目录不是账本」，这是 AP 选择背后的业务判断，而不是 CAP 背书的复述。',
                points: [
                  '**CAP 提醒**：P（分区容忍）在分布式系统里必须选，所以实际是 **C 与 A 的二选一**',
                  '**ZK = CP**：ZAB 协议，写需过半确认；**选举期间（约 30s~）整个集群不可写**，注册中心变砖',
                  '**Eureka = AP**：节点间异步复制，任意节点可读写；代价是可能读到过期数据',
                  '**Nacos = AP / CP 可选**：临时实例 Distro（AP）、持久实例 Raft（CP）',
                  '**为什么注册中心应该选 AP**：它是「目录」不是「账本」。**读到旧地址最多是一次失败调用（有超时重试兜底），读不到地址则是服务不可用**——两者代价不对称',
                  '**反例**：若场景是「配置必须强一致」（如金额、开关的原子性），那配置中心部分应选 CP；所以「注册选 AP、配置选 CP」是更精确的说法',
                ],
                depth:
                  '进阶回答：**「CAP 在实际系统里不是非黑即白」**——Eureka 的自保护机制、Nacos 的 Distro 异步复制、Consul 的 Raft + 本地读，都存在「短暂不一致窗口」。所以真正该问的不是「你是 CP 还是 AP」，而是**「不一致窗口有多长、窗口内的读会返回什么、业务能否容忍」**。面试里能把 CAP 从「三选二的口号」落到「窗口期与业务代价」，就是明显高于平均线的回答。',
                followup:
                  '「注册中心集群怎么部署」——通常 3 或 5 节点（奇数，过半可用）。Eureka 是**对等（peer-to-peer）**结构，节点间互相注册，没有主从；Nacos 1.x 是 Distro + Raft 混合，2.x 引入 gRPC 长连接后性能大幅提升。**注意：注册中心本身不能用「注册中心」来发现彼此**，地址必须写死在配置文件里——这是「引导依赖」的经典问题，和「配置中心不能自己给自己配配置」是同一类循环依赖。',
              },
              {
                kind: 'question',
                title: '负载均衡怎么做？常见策略有哪些？',
                questionId: 'java-05-Q69',
                intent:
                  '先分「服务端 / 客户端」，再说策略，最后说默认值与自定义方式。别只报策略名。',
                points: [
                  '**两大类**：服务端（Nginx / F5 / LVS，调用方只知道 VIP）与客户端（Spring Cloud LoadBalancer，调用方持有全量列表）',
                  '**默认策略**：Spring Cloud 2020.0 起为 `RoundRobinLoadBalancer`；Ribbon 已从 Spring Cloud 移除',
                  '**常用策略**：轮询、随机、加权（响应时间 / 实例权重）、最少连接、一致性哈希、同 zone 优先',
                  '**客户端负载均衡的前提**：调用方必须拿到实例列表——列表来自注册中心的**本地缓存**',
                  '**自定义方式**：注册 `ReactorLoadBalancer<ServiceInstance>` Bean；或用 `@LoadBalancerClient(name, configuration)` 按服务指定',
                  '**灰度的正确做法**：先用 `ServiceInstanceListSupplier` **按元数据过滤**，再交给均衡器——过滤在前，均衡在后',
                  '**与服务发现的配合**：列表刷新的延迟（秒级）会导致「刚下线的实例仍被选中」，所以重试必须幂等',
                ],
                depth:
                  '「客户端负载均衡比服务端好在哪」——三个具体点：**少一跳网络**（不用经过中间代理，延迟更低）、**能感知业务元数据**（可以按 `version`、`zone`、`weight` 选实例，服务端 LB 看不到这些）、**故障转移更快**（进程内直接换实例，不用等代理健康检查）。代价是**每个调用方都要维护列表与算法**，语言、版本不统一时容易行为不一致——这也是为什么「多语言栈常用服务端 LB，纯 Java 栈常用客户端 LB」的实际原因。',
                followup:
                  '「轮询为什么可能不安全」——若某实例已经变慢但还没被剔除（心跳仍在），轮询会把等量流量继续打给它，形成「慢实例越积越多」的雪崩前兆。所以生产上常见的组合是**轮询 + 熔断 + 慢调用比例检测**：熔断器先把它隔离，负载均衡器自然就选不到它。另外「权重」不等于「能力」——权重是静态配置，响应时间是动态观测，两者结合（如 Nacos 权重 × 响应时间加权）才准确。',
              },
              {
                kind: 'question',
                title: 'OpenFeign 的原理是什么？',
                questionId: 'java-05-Q70',
                intent:
                  '必须讲清「启动期建代理、运行期拼请求」，以及「横切能力靠装饰 Client」这两层。',
                points: [
                  '**启动期一**：`@EnableFeignClients` → `FeignClientsRegistrar` 扫描 `@FeignClient` 接口，注册 `FeignClientFactoryBean` 的 BeanDefinition',
                  '**启动期二**：`FeignClientFactoryBean.getObject()` 调 `Feign.Builder.target()`，用 **JDK 动态代理**生成实现，注册进容器',
                  '**启动期三**：`Contract` 解析接口注解（`@GetMapping`、`@RequestParam`），生成「方法 → `RequestTemplate`」的映射表',
                  '**运行期一**：代理的 `InvocationHandler.invoke()` 按方法找到 `MethodHandler`（`SynchronousMethodHandler`）',
                  '**运行期二**：填参数 → 编码 body → 加 header → 交给 `Client`；`LoadBalancerClient` 按服务名选实例并重写 URL',
                  '**运行期三**：`Decoder` 反序列化响应；非 2xx 由 `ErrorDecoder` 转异常（默认抛 `FeignException`）',
                  '**横切能力**：熔断、重试、日志、指标全是 `Client` 的**装饰器**，业务接口零改动',
                ],
                depth:
                  '两个能拉开差距的点：**第一，Feign 默认的 `Client` 是 `HttpURLConnection`**，没有连接池，性能很差——生产必须换成 `OkHttp` 或 `Apache HttpClient`（引 `feign-okhttp` 并配 `spring.cloud.openfeign.okhttp.enabled=true`）。**第二，`Contract` 是可插拔的**：默认 `SpringMvcContract` 只认 Spring MVC 注解，若要用 JAX-RS 注解（`@GET`、`@Path`），换 `JAXRSContract` 即可。这说明 Feign 的设计是「接口描述语言（注解）→ 请求模板」的一次性翻译，运行期不再解析注解——**所以改注解必须重启，热更新无效**。',
                followup:
                  '「Feign 和 RestTemplate 怎么选」——Feign 是**声明式**（写接口，像调本地方法），RestTemplate 是**编程式**（手写 URL 与参数）。项目里服务间调用多时 Feign 可读性更好，且天然集成负载均衡与熔断。**但 Feign 有个坑：不支持文件上传的多部分表单直接绑定**（需要额外配置 `Encoder` 或用 `@RequestPart`），传文件场景常退回 `RestTemplate` 或 `WebClient`。',
              },
              {
                kind: 'question',
                title: '熔断、降级、限流的区别？Hystrix 和 Sentinel 怎么选？',
                questionId: 'java-05-Q71',
                intent:
                  '三个概念必须分清维度，这是本题的核心。选型上 Hystrix 已停更是硬信息。',
                points: [
                  '**熔断**：**触发机制**。失败率 / 慢调用比例超阈值 → 断开，不再发起真实调用；三态 CLOSED → OPEN → HALF_OPEN',
                  '**降级**：**兜底动作**。主逻辑不可用时返回默认值、缓存值、简化结果。熔断后通常执行降级，但降级不等于熔断',
                  '**限流**：**入口控制**。按 QPS / 并发数 / 热点参数限流，超出则拒绝或排队。QPS 限流常用令牌桶 / 漏桶 / 滑动窗口',
                  '**三者关系**：限流是「事前防御」（不让你进来）、熔断是「事中止损」（不让你继续拖）、降级是「事后兜底」（给你个次优结果）',
                  '**Hystrix**：Netflix 出品，**2018 年停止开发**，线程池隔离是它的标志性设计（每依赖一个线程池），但线程切换开销大',
                  '**Sentinel**：阿里出品，**流量控制 + 熔断降级 + 系统自适应保护**三合一，有实时控制台，规则可持久化到 Nacos',
                  '**Resilience4j**：轻量函数式，基于 `Vavr`，无额外线程（信号量隔离为主），Spring Boot 3 的默认选择',
                  '**选型结论**：国内新项目 → Sentinel（控制台好用、规则动态）；云原生 / 追求轻量 → Resilience4j；Hystrix 不要再选',
                ],
                depth:
                  '「线程池隔离和信号量隔离怎么选」是经典追问：**线程池隔离**（Hystrix 默认）为每个依赖分配独立线程池，能彻底隔离（一个依赖卡死不影响其他），还能做超时中断；代价是线程切换开销（约几十微秒）+ 线程数膨胀。**信号量隔离**（Sentinel / Resilience4j 默认）只计数不换线程，开销极小，但**无法中断阻塞中的调用**——只能等它自己超时。结论：**高延迟、不可靠的下游用线程池隔离；内部低延迟服务用信号量隔离**。Sentinel 之所以默认信号量，是因为它主打「高吞吐下的低开销」。',
                followup:
                  '「熔断的阈值怎么定」——不能拍脑袋。做法是：先观测正常时的 P99 延迟与错误率，**慢调用阈值取 P99 的 1.5~2 倍**，失败率阈值取「正常错误率 + 10%~20%」；再结合窗口大小（Sentinel 默认 1s 统计窗口，至少 5 个请求才判断，避免小样本误判）。**关键是要配「最小请求数」**——否则窗口内只有 2 个请求、错 1 个就是 50%，会误熔断。这个参数在实际配置里最容易被漏掉。',
              },
              {
                kind: 'question',
                title: 'Spring Cloud Gateway 的核心概念和工作流程？',
                questionId: 'java-05-Q72',
                intent:
                  '三个核心概念（Route / Predicate / Filter）+ 六步流程，加上「不能与 MVC 共存」这个实战坑。',
                points: [
                  '**三个概念**：`Route`（id + uri + predicates + filters）、`Predicate`（匹配条件）、`Filter`（前置/后置处理）',
                  '**流程一**：`RoutePredicateHandlerMapping` 遍历路由，用 `Predicate` 匹配 → 得到 `Route`',
                  '**流程二**：`FilteringWebHandler` 把 `GlobalFilter` + 路由 `GatewayFilter` 合并，按 `Ordered` 排序',
                  '**流程三**：`pre` 阶段正序执行（鉴权、限流、改路径）；不调 `chain.filter()` 即中断',
                  '**流程四**：`NettyRoutingFilter` 发起下游请求（WebFlux 非阻塞）',
                  '**流程五**：`post` 阶段逆序执行（`chain.filter().then(...)` 内的逻辑）',
                  '**常用断言**：`Path`、`Method`、`Header`、`Query`、`Weight`（灰度分流）、`After/Before/Between`（时间窗口）',
                  '**实战坑一**：基于 WebFlux，**不能引 `spring-boot-starter-web`**，否则启动直接失败',
                  '**实战坑二**：Gateway 里不能用阻塞代码（JDBC、`Thread.sleep`），会堵死 EventLoop',
                ],
                depth:
                  '「Gateway 和 Zuul 1.x 的本质差异」——Zuul 1.x 是**阻塞式**（一个请求一个线程，靠线程池扛并发），Gateway 是**非阻塞**（Netty EventLoop + Reactor，少量线程扛高并发）。所以在高并发下 Gateway 的线程数与内存占用低一个数量级。**但代价是「不能写阻塞代码」**——这也是「网关里调用数据库查鉴权信息」这种写法致命的根本原因：每个请求占住一个 EventLoop 线程，几个慢查询就能打满整个网关。正确做法是查本地缓存或用异步客户端。',
                followup:
                  '「网关怎么做鉴权」——放在 `GlobalFilter`（或 `WebFilter`）的 `pre` 阶段，校验通过后**把用户信息写进请求头**（如 `X-User-Id`）再转发，下游直接读头，不再重复解析 token。**关键安全点：必须在下游入口处剥离外部传入的同名头**（用 `RemoveRequestHeader` 或服务内的 Filter），否则外部可以直接伪造 `X-User-Id` 绕过鉴权——这是网关方案最常见的漏洞。',
              },
              {
                kind: 'question',
                title: '配置中心解决了什么问题？Nacos 动态刷新的大致原理？',
                questionId: 'java-05-Q73',
                intent:
                  '前半答「多环境 + 免重启 + 审计」，后半必须说「长轮询 + `@RefreshScope`」。',
                points: [
                  '**解决的四件事**：配置集中（不再散落在各机器）、环境隔离（namespace）、动态生效（免重启）、变更审计（谁改了什么）',
                  '**寻址模型**：`namespace`（环境）→ `group`（分组）→ `dataId`（文件）',
                  '**加载时机**：`PropertySourceLocator` 在 `Environment` 准备阶段把远程配置插入，**位置早于本地文件**（所以远程覆盖本地）',
                  '**监听机制**：客户端长轮询——请求挂起 30s，有变更立即返回，无变更返回 304 再发；本质是「拉」，延迟接近「推」',
                  '**刷新链路**：变更 → `EnvironmentChangeEvent` → `@RefreshScope` 的 Bean 被销毁并在下次访问时重建',
                  '**为什么没生效**：Bean 缺 `@RefreshScope`（`@Value` 已注入旧值）；或配置项在 `@ConfigurationProperties` 但未开 rebind',
                  '**更稳的写法**：`@ConfigurationProperties` + `@RefreshScope`，比裸 `@Value` 可控',
                  '**注意**：刷新是「就地生效」，正在执行的请求可能读到一半旧一半新的配置',
                ],
                depth:
                  '「为什么用长轮询而不用 WebSocket 推送」——三个理由：**实现成本**（长轮询就是普通 HTTP，穿过任何代理与防火墙）、**可靠性**（无需维护连接状态、断线自动重连）、**服务端压力**（挂起的连接只是内存中的等待队列，不是真线程，Nacos 用 Servlet 3 的 async 或 Netty 承载）。**真正的代价是「延迟上限」**——最坏情况是「变更发生在 30s 窗口刚结束时」，需要等下一轮，所以 Nacos 的实际生效延迟在「毫秒级 ~ 30 秒」之间浮动。这个「延迟不确定」是面试里很少人提到但很真实的工程特性。',
                followup:
                  '「配置中心挂了应用还能启动吗」——能，但要看实现。Nacos 客户端有**本地快照**（默认 `~/nacos/config`），拉不到远程时用快照；快照也没有则可配 `spring.cloud.nacos.config.import-check.enabled=false` 允许「无配置启动」（但那样默认值可能不对）。**生产上的标准做法是：关键配置保留本地兜底 + 快照目录持久化**，别把「配置中心可用」当成「应用能启动」的唯一前提——这和「注册中心挂了不影响已有调用」是同一种「去单点」思路。',
              },
            ],
          },
        },
        {
          id: 'mybatis',
          title: 'MyBatis：从一条 SQL 到结果集',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['九、MyBatis'] }],
          content: {
            intro:
              'MyBatis 的 15 道题，几乎都能挂在「一条 SQL 从被调用到返回对象」这条时间轴上。轴上有五个关键站点：**Mapper 接口为什么不需要实现类**（动态代理）、**SQL 怎么从注解 / XML 变成字符串**（`SqlSource` 与动态 SQL）、**参数怎么安全地填进去**（`#{}` 与 `PreparedStatement`）、**谁来执行**（`Executor` → `StatementHandler` → JDBC）、**结果怎么变成对象**（`ResultSetHandler` 与反射）。把这条轴走通，缓存、延迟加载、插件、分页、批量、N+1 全都是「某个站点上的附加装置」，而不是零散的知识点。',
            outline: [
              'Mapper 接口没有实现类：启动时 `MapperProxyFactory` 用 JDK 动态代理造实现，方法调用的语义是「找到对应的 `MappedStatement` 并执行」',
              '`#{}` 走 `PreparedStatement` 占位符（预编译、防注入）；`${}` 是**字符串拼接**，只该用于表名、列名这类无法参数化的位置',
              '四大对象 `Executor` / `StatementHandler` / `ParameterHandler` / `ResultSetHandler` 是插件的**唯一四个拦截点**',
              '一级缓存是 `SqlSession` 级的 `PerpetualCache`（一个 HashMap）；与 Spring 集成后「失效」是因为**每次调用都可能拿到新的 SqlSession**',
              '`resultMap` 的嵌套查询 + `fetchType="lazy"` 才是延迟加载；它的实现是**动态代理 + 触发式加载**，不是「查询时少查几列」',
            ],
            pitfalls: [
              '认为「`${}` 只要不来自用户输入就安全」：任何动态拼接都会让数据库无法复用执行计划，且埋下注入隐患',
              '把一级缓存说成「默认关闭」：它是默认开启的，只是 Spring 环境下**同一事务内**才有效',
              '以为「用了 `@Transactional` 二级缓存就一定一致」：二级缓存是 `namespace` 级、跨 `SqlSession`，事务提交前写入的脏数据仍可能被别的会话读到（取决于 `cache` 配置与 `flushCache`）',
            ],
            sections: [
              {
                kind: 'concept',
                title: '「半自动」到底半在哪',
                body: [
                  'ORM 框架按「SQL 由谁写」分成两派。**全自动**（Hibernate / JPA）由框架根据实体映射生成 SQL，开发者只操作对象，代价是「复杂查询写不出来」或「写出来性能很差」。**半自动**（MyBatis）把 SQL 交还给开发者，框架只负责「参数映射」与「结果映射」这两件机械活。',
                  '所以「半自动」准确的含义是：**SQL 手工编写（half），映射自动完成（auto）**。这让它同时具备两个优势：复杂查询可以精调到每一条索引；而样板代码（`setXxx` / `rs.getXxx`）全部消失。代价是 SQL 与 Java 代码分离（XML 或注解），重构时 IDE 帮不上忙，字段改名要手工同步——这也是 MyBatis-Plus 想解决的问题（用代码生成与 Wrapper 减少手写 SQL）。',
                  '对比 Hibernate：全自动的优势在「领域模型复杂、CRUD 为主」的场景，一级/二级缓存与脏检查很省心；半自动的优势在「查询复杂、性能敏感、DBA 要 review SQL」的场景。国内互联网公司多选 MyBatis，不是因为 Hibernate 不好，而是因为**慢查询治理需要看到真实 SQL**——这条工程理由比技术优劣更有说服力。',
                ],
                points: [
                  '**半自动 = 手工 SQL + 自动映射**：`#{}` 填参、`resultMap` 转对象，中间不生成 SQL',
                  '**全自动（JPA）**：由映射元数据生成 SQL，对象即查询；代价是复杂查询要靠 JPQL / 原生 SQL 兜底',
                  '**MyBatis 的优势**：SQL 可控可优化、复杂查询自然、DBA 可 review、与遗留库表结构兼容好',
                  '**MyBatis 的劣势**：SQL 与代码分离（重构不友好）、无脏检查（要显式 update）、跨数据库方言需手写',
                  '**选型口径**：CRUD 密集、模型稳定 → JPA；查询复杂、性能敏感、SQL 需审计 → MyBatis',
                ],
              },
              {
                kind: 'diagram',
                title: '一条 SQL 的完整执行链',
                body: [
                  '这是本课的主轴图。九个环节，每一环都对应一个可考的点：第 ②③ 环是「Mapper 为什么不需要实现类」，第 ④⑤ 环是 `#{}` 与 `${}` 的分界，第 ⑥ 环是插件的拦截点，第 ⑧ 环是「结果映射」。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① `SqlSessionFactoryBuilder` 解析配置', note: '读 `mybatis-config.xml` + 所有 Mapper XML → 生成 `Configuration`（一个巨大的「元数据中心」）' },
                    { label: '② `Configuration` 中的 `MappedStatement`', note: '**每个 `<select>`/`<insert>` 对应一个 `MappedStatement`**，存 id（`namespace.method`）、`SqlSource`、`resultMap`、超时、`flushCache` 等' },
                    { label: '③ 调用 Mapper 方法 → 动态代理', note: '`MapperProxy.invoke()` 用「接口全名 + 方法名」拼出 statement id，找到 `MappedStatement`，交给 `SqlSession` 执行' },
                    { label: '④ `SqlSource.getBoundSql(param)`', note: '动态 SQL（`<if>` / `<foreach>`）在此求值 → 得到最终 SQL 字符串 + `ParameterMapping` 列表；**可能有多个候选 SQL（`<choose>`）**' },
                    { label: '⑤ `ParameterHandler.setParameters`', note: '`#{}` → `PreparedStatement.setXxx(index, value)`；`${}` 已在第 ④ 步直接拼进 SQL 字符串' },
                    { label: '⑥ `Executor` → `StatementHandler`', note: '`Executor` 管缓存与事务（`BaseExecutor` 有一级缓存、`CachingExecutor` 管二级缓存）；`StatementHandler` 管 JDBC 细节' },
                    { label: '⑦ 执行 JDBC 并拿 `ResultSet`', note: '`PreparedStatement.execute()`；`StatementHandler` 分 `Simple` / `Reuse`（复用 PS）/ `Callable`（存储过程）三种' },
                    { label: '⑧ `ResultSetHandler` 映射结果', note: '按 `ResultMap` 逐行解析 → 反射 `newInstance` + `setField`；嵌套映射在此递归或触发子查询' },
                    { label: '⑨ 返回并写入缓存', note: '一级缓存（`SqlSession` 级）必写；二级缓存（`namespace` 级）在**事务提交后**才写入' },
                  ],
                  caption:
                    '记住两个「反直觉」：**第一，`${}` 不是「另一种传参方式」**——它在第 ④ 步就已经被拼成字符串了，所以到第 ⑤ 步根本没有它的影子。这也解释了「为什么 `${}` 无法防止注入」：注入发生时，SQL 结构已经定死了。**第二，一级缓存写在 `Executor` 而不是 `SqlSession`**——`SqlSession` 只是门面，真正的持有者是 `BaseExecutor` 里的 `localCache`，所以「关闭一级缓存」要改 `Executor` 的 `localCacheScope`，不是关 `SqlSession`。',
                },
              },
              {
                kind: 'diagram',
                title: '四大对象与插件拦截点',
                body: [
                  '「MyBatis 插件原理」这题的答案就是这张图：只能拦四个对象，每个对象只能拦指定的方法。',
                ],
                diagram: {
                  type: 'layers',
                  items: [
                    { label: '`Executor`', note: '可拦 `update` / `query` / `flushStatements` / `commit` / `rollback`。**分页、读写分离、SQL 审计最常拦这里**', tone: 'primary' },
                    { label: '`StatementHandler`', note: '可拦 `prepare` / `parameterize` / `batch` / `update` / `query`。**改 SQL（如分页拼 `limit`）最常拦这里**', tone: 'primary' },
                    { label: '`ParameterHandler`', note: '可拦 `getParameterObject` / `setParameters`。用于**特殊类型转换**（如加密字段）', tone: 'warn' },
                    { label: '`ResultSetHandler`', note: '可拦 `handleResultSets` / `handleOutputParameters`。用于**结果集脱敏、驼峰转换增强**', tone: 'warn' },
                  ],
                  caption:
                    '关键机制：**插件通过「层层包装」实现**——`InterceptorChain.pluginAll()` 对每个对象依次调用 `Plugin.wrap()`，生成 JDK 动态代理，所以「多个插件」会形成一条链，执行顺序由 `@Intercepts` 的注册顺序决定（`configuration.addInterceptor` 的顺序）。**这就是「分页插件和另一个改 SQL 的插件为什么可能冲突」的原因**：两者都在 `StatementHandler.prepare` 上包裹，谁在外层谁先看到原始 SQL。另一个易错点：**拦截 `Executor.query` 时拿到的参数是 `MappedStatement` + 参数对象 + `RowBounds`**，不是最终 SQL——想在插件里改 SQL，得拦 `StatementHandler.prepare` 并操作 `BoundSql`。',
                },
              },
              {
                kind: 'diagram',
                title: '两级缓存：命中顺序与失效时机',
                body: [
                  '缓存题的混乱源于「谁的生命周期」没说清。一张时序图看清：查询先问二级、再问一级、最后才走库。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['Mapper 代理', '二级缓存', '一级缓存', '数据库'],
                  messages: [
                    { from: 'Mapper 代理', to: '二级缓存', text: '`query`：查 `namespace` 级 `Cache`' },
                    { from: '二级缓存', to: 'Mapper 代理', text: '命中 → 直接返回（**不到一级缓存**）', reply: true },
                    { from: 'Mapper 代理', to: '一级缓存', text: '未命中 → 查 `SqlSession` 级 `localCache`' },
                    { from: '一级缓存', to: 'Mapper 代理', text: '命中 → 返回', reply: true },
                    { from: 'Mapper 代理', to: '数据库', text: '都未命中 → `PreparedStatement` 执行' },
                    { from: '数据库', to: 'Mapper 代理', text: '返回 `ResultSet`，映射成对象', reply: true },
                    { from: 'Mapper 代理', to: '一级缓存', text: '写入 `localCache`（**一定写**）' },
                    { from: 'Mapper 代理', to: '二级缓存', text: '**事务提交后**才写入 `TransactionalCache` → 真正进 `Cache`' },
                    { from: 'Mapper 代理', to: '一级缓存', text: '同会话内任何 `update`/`insert`/`delete` → **清空整个一级缓存**' },
                  ],
                  caption:
                    '三个必记结论：**第一，顺序是「二级 → 一级 → 库」**（`CachingExecutor` 在外层），所以命中二级缓存时一级缓存不会被动过。**第二，一级缓存是「会话级」**——它清空的条件是「同一个 `SqlSession` 内执行了写操作」或「手动 `clearCache()`」或「会话关闭」，所以 Spring 环境下**只有同一事务内**才有效（无事务时每次 Mapper 调用后 `SqlSession` 就关了）。**第三，二级缓存写入时机在「事务提交后」**，用 `TransactionalCacheManager` 暂存——这是为了防止「事务回滚了但缓存已写」的脏数据。但**读**仍可能在提交前读到别的会话写入的旧值，所以跨会话一致性依然不保证。',
                },
              },
              {
                kind: 'principle',
                title: '动态 SQL 的底层：组合模式 + OGNL',
                body: [
                  '「动态 SQL 的底层原理」是区分「会用」和「懂」的一题。答案两个关键词：**`SqlNode` 组合模式**与 **OGNL 表达式**。',
                ],
                steps: [
                  {
                    title: '① 解析期：每个标签变成一棵 `SqlNode` 树',
                    detail:
                      '`XMLScriptBuilder.parseDynamicTags()` 遍历 XML 节点，按标签名造出对应的 `SqlNode`：`<if>` → `IfSqlNode`、`<where>` → `WhereSqlNode`（`TrimSqlNode` 子类）、`<foreach>` → `ForEachSqlNode`、`<choose>` → `ChooseSqlNode`（内含 `IfSqlNode` 列表 + `OtherwiseSqlNode`）、纯文本 → `StaticTextSqlNode`。嵌套结构自然形成**组合模式**的树，根节点是 `MixedSqlNode`。',
                  },
                  {
                    title: '② 求值期：`apply(DynamicContext)` 递归拼接',
                    detail:
                      '执行时调用根节点的 `apply(context)`，每个节点把「要不要拼、拼什么」的决策做完，把结果追加到 `DynamicContext` 的 `StringBuilder` 里。**注意这是「一次性求值」**：一次调用生成一条 SQL 字符串，不会被复用（除非命中 `SqlSource` 的缓存）。',
                  },
                  {
                    title: '③ 条件判断：OGNL 直接读参数对象',
                    detail:
                      '`<if test="status != null and status != \'\'">` 里的表达式由 `ExpressionEvaluator` 用 **OGNL** 求值，根对象就是参数 Map / 参数对象。所以 `test` 里可以直接写 `user.age > 18`、`list.size() > 0`、`@java.lang.Math@max(1,2)`（静态方法调用）。**这就是「`test` 里能用什么」的完整答案：OGNL 支持的一切**。',
                  },
                  {
                    title: '④ `<where>` 与 `<set>` 的真实身份',
                    detail:
                      '它们不是「特殊处理」，而是 `TrimSqlNode` 的预设实例：`<where>` 等价于「前缀加 `WHERE`，且**自动去掉开头多余的 `AND` / `OR`**」；`<set>` 等价于「前缀加 `SET`，且去掉结尾多余的逗号」。理解这一点，就能解释「为什么 `<where>` 里第一个条件不用写 `AND`」以及「为什么 `<set>` 里最后一个字段后面可以留逗号」。',
                  },
                  {
                    title: '⑤ `<foreach>` 的三个必填属性',
                    detail:
                      '`collection`（要遍历的集合）、`item`（元素变量名）、`separator`（分隔符），可选 `open` / `close` / `index`。**`collection` 的取值是最大的坑**：参数只有一个 `List` 时写 `list`，只有一个数组时写 `array`，多个参数时必须写 `@Param` 指定的名字或 `param1`。写错会报 `Parameter \'xxx\' not found`——这是 MyBatis 最高频的报错之一。',
                  },
                ],
              },
              {
                kind: 'question',
                title: 'MyBatis 是什么？为什么说它是「半自动」ORM？和 Hibernate/JPA 怎么选？',
                questionId: 'java-05-Q74',
                intent:
                  '「半自动」要给出准确定义（手工 SQL + 自动映射），选型要给工程理由而非技术口号。',
                points: [
                  '**半自动的定义**：SQL **手写**（half），参数与结果**映射自动**（auto）；框架不生成 SQL',
                  '**对比 JPA**：JPA 由映射元数据生成 SQL，对象即查询；MyBatis 则「你先写 SQL，我负责填参和转对象」',
                  '**MyBatis 优势**：SQL 完全可控（能加 hint、能调索引）、复杂查询自然、DBA 可 review、兼容遗留库表',
                  '**MyBatis 劣势**：SQL 与代码分离（重构不友好）、无脏检查（要显式 update）、方言差异要手写',
                  '**JPA 优势**：领域模型驱动、自动脏检查、一级/二级缓存省心、跨库方言自动处理',
                  '**JPA 劣势**：复杂查询易生成低效 SQL（N+1、笛卡尔积）、性能调优要懂它的 SQL 生成规则',
                  '**选型口径**：CRUD 密集 + 模型稳定 → JPA；查询复杂 + 性能敏感 + SQL 需审计 → MyBatis',
                ],
                depth:
                  '一个能显示经验的补充：**「国内选 MyBatis 的主要理由不是技术优劣，而是慢查询治理」**。线上出慢查询时，MyBatis 的 SQL 就在 XML 里，`EXPLAIN` 一下就能定位；JPA 生成的 SQL 要开 `show-sql` 才能看到，且改起来受框架约束（要么写原生 SQL 破功，要么调优框架参数）。**当团队有专职 DBA、要求「所有上线 SQL 必须 review」时，MyBatis 几乎是唯一选择**——这是流程约束倒逼的技术选型，比「哪个性能好」更真实。',
                followup:
                  '「MyBatis 能自动生成 SQL 吗」——能，但方式不同：`MyBatis-Plus` 的 `BaseMapper` 提供单表 CRUD、`QueryWrapper` 提供条件构造，本质是「用代码拼 SQL」，而不是 JPA 那种「按实体元数据推导」。区别在于 **JPQL 是查询语言（可跨库）**，MP 的 Wrapper 最终仍是拼原生 SQL（依赖方言）。所以 MP 的「自动」是便利性的自动，不是语义抽象层的自动。',
              },
              {
                kind: 'question',
                title: 'MyBatis 执行一条 SQL 的完整流程？',
                questionId: 'java-05-Q75',
                intent:
                  '按主轴九环回答。必须能说出 `MappedStatement` 与 `BoundSql` 这两个中间产物分别在哪一步产生。',
                points: [
                  '**初始化**：`SqlSessionFactoryBuilder` 解析配置与 Mapper XML → 生成 `Configuration`（含所有 `MappedStatement`）',
                  '**`MappedStatement`**：每个 SQL 语句一个，含 id、`SqlSource`、`ResultMap`、超时、`flushCache`、`statementType`',
                  '**代理入口**：`MapperProxy.invoke()` 拼出 `namespace.method` 找到 `MappedStatement`，调 `SqlSession` 对应方法',
                  '**`SqlSource.getBoundSql()`**：求值动态 SQL → 得到 **`BoundSql`**（最终 SQL 字符串 + `ParameterMapping` + 参数对象）',
                  '**`Executor.query`**：先查二级缓存（`CachingExecutor`）→ 一级缓存（`BaseExecutor.localCache`）→ 未命中才 `doQuery`',
                  '**`StatementHandler`**：`prepare` 创建 `PreparedStatement`、`parameterize` 调 `ParameterHandler` 填参',
                  '**执行**：`PreparedStatement.execute()` 拿 `ResultSet`',
                  '**`ResultSetHandler`**：按 `ResultMap` 逐行 `newInstance` + 反射设值（含嵌套映射与延迟加载钩子）',
                  '**收尾**：写入一级缓存；若在事务内且开了二级缓存，提交时写入二级缓存',
                ],
                depth:
                  '最容易答漏的是 **`BoundSql` 这个中间产物**——它才是「真正要执行的 SQL」。`MappedStatement` 是**静态**的（启动时确定，全局共享），`BoundSql` 是**动态**的（每次调用重新生成，含具体参数值）。二者关系可以类比为「类与实例」。**面试里提到 `BoundSql` 这个词，立刻就与「只背过流程」的候选人区分开了**——因为你想在插件里改 SQL，就必须知道去改 `BoundSql.sql`，而不是改 `MappedStatement` 里的 `SqlSource`。',
                followup:
                  '「为什么 `MappedStatement` 要缓存」——它包含解析后的 XML 结构（`SqlNode` 树）与 `ResultMap`，解析成本高（XML 解析 + 反射元数据构建）。所以它启动时一次性构建，之后只读共享。**这也解释了「为什么改了 XML 必须重启」**：`MappedStatement` 已固化在 `Configuration` 里，运行时不会重读文件（虽然 `Configuration` 有 `addMappedStatement` 可用于热加载，但没有内置实现）。',
              },
              {
                kind: 'question',
                title: '#{} 和 ${} 的区别？怎么防 SQL 注入？',
                questionId: 'java-05-Q76',
                intent:
                  '核心是「预编译占位符 vs 字符串拼接」，防注入的机制必须从「占位符不可被解析为语法」讲起。',
                points: [
                  '**`#{}`**：编译成 `?` 占位符，走 `PreparedStatement.setXxx()`，参数值不参与 SQL 解析',
                  '**`${}`**：**直接字符串替换**进 SQL，在 `SqlSource.getBoundSql()` 阶段就完成，等价于文本拼接',
                  '**防注入的原理**：`?` 处的值在数据库解析 SQL 时**已是数据不是语法**，所以 `\' OR 1=1 --` 只会被当作一个字符串值',
                  '**`${}` 的合法用途**：表名、列名、`ORDER BY` 字段、`LIMIT` 关键字位置——这些**无法参数化**（数据库不接受把标识符当参数）',
                  '**`${}` 的正确用法**：必须以**白名单**校验（如 `switch` 判断允许的排序字段），不能直接接收前端值',
                  '**`#{}` 的附加能力**：`javaType` / `jdbcType` / `typeHandler`，可控制 null 处理与类型转换（`jdbcType=VARCHAR` 解决 Oracle `null` 类型推断问题）',
                  '**性能提示**：`#{}` 能复用执行计划（SQL 文本固定），`${}` 每次都是新 SQL，无法复用',
                ],
                depth:
                  '「`ORDER BY #{col}` 会怎样」——不会报错，但会变成 `ORDER BY \'name\'`（一个字符串常量），排序**完全不生效**，且这个错误极其隐蔽（不报错、结果也「看着正常」）。这是「为什么排序必须用 `${}`」的直接原因，也是「为什么必须白名单」的原因。**正确写法**是用 `${}` 但前置白名单：`<if test="@com.x.Valid@isSortField(sortBy)">ORDER BY ${sortBy}</if>`，或在 Service 层就把非法值替换成默认字段。',
                followup:
                  '「`LIKE` 怎么传参」——不能用 `\'%${keyword}%\'`，正确写法是 `CONCAT(\'%\', #{keyword}, \'%\')` 或 `#{%\'%\'}` 这种写法（取决于数据库）。**注意 `LIKE \'%xxx%\'` 前导通配符会让索引失效**，这是性能问题不是安全问题，但两者常在同一道题里被追问。若必须模糊查询，考虑全文索引、`LIKE \'xxx%\'`（可用索引）或搜索引擎。',
              },
              {
                kind: 'question',
                title: 'Mapper 接口没有实现类，为什么能执行 SQL？（动态代理原理）',
                questionId: 'java-05-Q77',
                intent:
                  '要说出「启动期注册代理工厂 + 运行期 `MapperProxy` 拼 statement id」这两段，而不能只说「用了动态代理」。',
                points: [
                  '**启动期一**：`@MapperScan` 或 `MapperScannerConfigurer` 扫描接口，用 `ClassPathMapperScanner` 把每个接口注册成 `MapperFactoryBean` 的 BeanDefinition',
                  '**启动期二**：`MapperFactoryBean.getObject()` → `sqlSession.getMapper(iface)` → `MapperRegistry.getMapper()` → `MapperProxyFactory.newInstance()`',
                  '**代理的生成**：`Proxy.newProxyInstance(iface.getClassLoader(), new Class[]{iface}, mapperProxy)`，`MapperProxy` 实现 `InvocationHandler`',
                  '**运行期一**：`MapperProxy.invoke()` 判断是否 `Object` 的方法（`toString` 等直接放行）或 `default` 方法（走 `invokeDefaultMethod`）',
                  '**运行期二**：普通方法 → 从 `methodCache` 取 `MapperMethod`（首次调用时创建），执行 `mapperMethod.execute(sqlSession, args)`',
                  '**statement id 的拼法**：`接口全限定名 + "." + 方法名`（如 `com.x.UserMapper.selectById`），必须与 XML 的 `namespace.id` 完全一致',
                  '**参数处理**：单参数直接传；多参数未加 `@Param` 时会被包成 `ParamMap`（`param1`、`param2`、`arg0`…）',
                  '**为什么必须用接口**：JDK 动态代理只能代理接口，不能代理类——所以 Mapper 必须是接口，不能是抽象类',
                ],
                depth:
                  '两个能拉开的细节：**第一，`MapperMethod` 有缓存**（`Map<Method, MapperMethod>`，`ConcurrentHashMap`），所以「注解解析」只做一次；但**每个 `SqlSession` 有独立的 `MapperProxy`**（`MapperProxyFactory` 按 sqlSession 造），所以别指望跨会话复用代理对象。**第二，为什么 Spring 没有被循环依赖问题搞死**：`MapperFactoryBean` 的 `getObject()` 返回的是代理，代理的 `InvocationHandler` 里持有的是 `sqlSessionTemplate` 而不是某个具体 `SqlSession`——所以「注入 Mapper 时 SqlSession 还没开」不是问题，等到真正调用时才从 `SqlSessionTemplate` 拿当前线程绑定的会话。',
                followup:
                  '「Mapper 能继承吗」——可以，MyBatis 支持接口继承（`<mapper namespace>` 指向父接口时，子接口会继承父接口的方法映射），但**父子接口的 namespace 不能重复**，且实际项目里很少用。更常见的问题是：**两个 Mapper 定义了同名方法但不同 namespace**，这完全合法（statement id 不同），但若在 XML 里手写 `namespace` 写错，会报 `Invalid bound statement (not found)`——这是 MyBatis 第二高频的报错，90% 的原因是「XML 没被扫描到」或「namespace / id 拼错」。',
              },
              {
                kind: 'question',
                title: 'Mapper 接口里的方法可以重载吗？为什么？',
                questionId: 'java-05-Q78',
                intent:
                  '答案是不能。理由必须落到「statement id 只用方法名，不含参数类型」这一点上。',
                points: [
                  '**结论：不能重载**（严格说：语法上允许，但运行会失败或行为不可预期）',
                  '**根本原因**：MyBatis 用 `接口全名 + "." + 方法名` 作为 statement id，**不含参数类型**，所以两个同名方法会映射到同一个 `MappedStatement`',
                  '**具体报错**：`Mapper method \'xxx\' is ambiguous` 或 `Invalid bound statement`（取决于版本与是否用注解）',
                  '**为什么这样设计**：XML 的 `<select id="xxx">` 只有一个 id，无法表达「同名的两个不同签名」；注解方式也只有一个 `@Select`',
                  '**推论一**：`default` 方法可以「重载」——它是接口自身实现，不走代理（`MapperProxy` 会特判 `method.isDefault()`）',
                  '**推论二**：想实现「同名不同参」，改为不同方法名（`selectById` / `selectByIds`），或用 `@Param` 区分参数',
                  '**JDK 代理的额外限制**：`Proxy` 只能代理接口；且 `Object` 的 `equals` / `hashCode` / `toString` 会被特判放行',
                ],
                depth:
                  '一个容易忽略的补充：**`MapperProxy` 的 `methodCache` 以 `Method` 对象为 key**（含参数类型），所以「同名不同参」在**代理层面**是能区分的——真正不可行的是**映射层面**：`MappedStatement` 的 id 唯一，两个方法必然指向同一条 SQL，参数映射就对不上。**所以「不能重载」不是 Java 的限制，是 MyBatis 的 id 设计决定的**。这句话能把答案从「背结论」提升到「讲清边界」。',
                followup:
                  '「那 Kotlin 里的默认参数、Java 里的可变参数呢」——可变参数（`String...`）会被当成数组处理，单个方法没问题；但**不能与「数组参数」的同名方法共存**（同样撞 id）。Kotlin 的默认参数会在编译期生成 `$default` 方法，可能意外与手写方法撞名，实际项目里建议显式避免。这类问题在「多语言混编」的项目里偶发出现，排查时往往想不到是 id 冲突。',
              },
              {
                kind: 'question',
                title: 'MyBatis 的一级缓存是什么？为什么和 Spring 集成后「感觉失效」？',
                questionId: 'java-05-Q79',
                intent:
                  '核心是「会话级」+「Spring 下会话随事务走」。这个「感觉失效」的现象解释清楚，说明你真的踩过。',
                points: [
                  '**是什么**：`SqlSession` 级的 `PerpetualCache`，本质是一个 `HashMap`（key 由 statement id + SQL + 参数 + `RowBounds` 算出）',
                  '**默认开启**，作用域 `localCacheScope` 可为 `SESSION`（默认）或 `STATEMENT`（只在本语句内有效）',
                  '**失效条件**：同一会话内执行了 `insert` / `update` / `delete`（**清空整个缓存**）、手动 `clearCache()`、会话关闭、`flushCache=true` 的查询',
                  '**Spring 下的真相**：`SqlSessionTemplate` 依赖 `SqlSessionUtils` 获取会话——**有事务时**绑定到 `ThreadLocal`（同一事务内复用，缓存有效）；**无事务时**每次调用新建并立即关闭（缓存等于没有）',
                  '**「感觉失效」的三种典型场景**：① Mapper 调用不在同一事务里 ② 中间夹了一次写操作 ③ 用了不同的 `SqlSession`（如手动 `openSession`）',
                  '**为什么这么设计**：一级缓存要保证「同一会话看到一致视图」，而 Spring 的会话边界是**事务**，不是「Service 方法」',
                  '**实践建议**：不要依赖一级缓存做业务优化；需要跨请求缓存时用二级缓存或外部缓存（Redis）',
                ],
                depth:
                  '「怎么让一级缓存生效」——把多个查询放进同一个 `@Transactional` 方法里，且**中间不能有写操作**。但这恰恰暴露了一级缓存的尴尬定位：**事务内通常要写，写了就清空；事务外又没有会话**。所以它在生产里的实际命中率很低，官方文档也明确提示「不要依赖它」。**真正有价值的场景是「嵌套查询中的重复子查询」**：一个 `resultMap` 里多个字段引用同一张关联表，同一次映射过程中会重复查同一条语句，这时一级缓存能省掉重复的数据库往返——这是它设计上的原始动机。',
                followup:
                  '「一级缓存会导致脏读吗」——**会**，而且这是它最危险的地方。同一事务内，若另一个事务改了数据并提交，本事务再查同一语句会拿到**缓存里的旧值**（因为一级缓存不感知其他会话的提交）。这就是 `localCacheScope=STATEMENT` 存在的原因——把它设成 `STATEMENT` 后，每条语句执行完就清缓存，牺牲命中率换一致性。**分布式场景下这个坑更隐蔽**：多实例部署时，A 实例改了数据，B 实例的事务内缓存仍是旧值。',
              },
              {
                kind: 'question',
                title: '二级缓存是什么？为什么生产要谨慎使用？',
                questionId: 'java-05-Q80',
                intent:
                  '必须讲清「namespace 级、跨会话、提交后写入」三个特征，以及「多表关联时的失效盲区」这个致命缺陷。',
                points: [
                  '**是什么**：`namespace` 级的缓存（`CachingExecutor` 管理），跨 `SqlSession` 共享，可跨线程',
                  '**开启方式**：XML 里加 `<cache/>`（或 `@CacheNamespace`），并让实体实现 `Serializable`（默认用序列化做深拷贝）；全局开关 `cacheEnabled` 默认 true 但**单条语句仍需 `<cache/>`**',
                  '**写入时机**：查询结果先进 `TransactionalCache`（暂存），**事务提交时**才真正写入；回滚则丢弃',
                  '**失效条件**：同 namespace 的任意写操作（`flushCache` 默认对 update 为 true）→ 清空整个 namespace 缓存',
                  '**致命缺陷一**：**跨 namespace 的写不会清缓存**。A 表在 `UserMapper` 里缓存了，`OrderMapper` 里也 `join` 了 A 表并写了它 → `UserMapper` 的缓存不会失效，读到旧数据',
                  '**致命缺陷二**：多实例部署时，各实例的本地缓存**互不感知**，A 实例更新后 B 实例仍是旧值',
                  '**致命缺陷三**：默认 `EvictionPolicy` 是 `LRU`，容量 1024，无 TTL——**缓存永不自然过期**，只靠写操作清空',
                  '**生产建议**：单机 + 只读为主的字典表可以用；有跨表写、多实例、要求强一致 → 直接上 Redis 并在业务层控制失效',
                ],
                depth:
                  '「为什么默认配置下二级缓存基本不可用」——三个默认值叠加起来就是灾难：① `flushCache` 只在**同 namespace 的写操作**时触发，跨 namespace 的写不触发；② 无 TTL，数据可能永久陈旧；③ 本地缓存，多实例不一致。**所以「开了二级缓存但读到旧数据」几乎必然发生，只是时间早晚**。若一定要用，至少要做到：所有涉及该表的写操作都落在同一 namespace（即不要用 `join` 别的表再写）、配 `@CacheNamespace(implementation = RedisCache.class)` 做集中式缓存、并给缓存加过期策略。',
                followup:
                  '「二级缓存和 Redis 缓存的区别」——二级缓存是**框架内置 + 进程内**（默认），Redis 是**外部 + 集中式**。前者零成本但只适合单机、一致性靠「清整个 namespace」很粗暴；后者能跨实例、可设 TTL、可精细化 key，但要自己处理「缓存与数据库的一致性」（延迟双删、订阅 binlog 等）。**实践中「二级缓存」几乎总是被 Redis 取代**，真正保留它的场景是「单机部署 + 只读字典表 + 追求零网络开销」。',
              },
              {
                kind: 'question',
                title: '延迟加载是什么？原理是什么？',
                questionId: 'java-05-Q81',
                intent:
                  '必须说清「动态代理 + 触发式加载」，并区分「全局开关 / 局部 fetchType」与「N+1 的关系」。',
                points: [
                  '**是什么**：关联对象**先不查**，等到真正访问它的属性时才发起子查询（按需加载）',
                  '**配置**：全局 `lazyLoadingEnabled=true`、`aggressiveLazyLoading=false`（3.4.1 后默认 false，即「访问哪个属性才加载哪个」）',
                  '**局部覆盖**：`<association fetchType="lazy|eager">`、`<collection fetchType="...">`',
                  '**触发条件**：**只有 `association` / `collection` 的嵌套查询（`select` 属性）才支持延迟**；嵌套结果映射（`resultMap` 内联）不支持',
                  '**原理**：`ResultSetHandler` 为待加载的关联对象生成**动态代理**（`JavassistProxyFactory` 或 `CglibProxyFactory`），代理对象里存 `ResultLoader`；访问代理的属性时触发 `load()` 执行子查询并替换真实对象',
                  '**坑一**：**必须先调用过主对象的 getter**——若直接用 `equals` / `hashCode` / `toString`，代理可能提前触发全部加载（取决于 `aggressiveLazyLoading`）',
                  '**坑二**：延迟加载在**会话关闭后失效**（`SqlSession` 已关，子查询无法执行）→ 报 `ExecutorException: statement not found`',
                  '**与 N+1 的关系**：延迟加载常常**制造 N+1**——循环里访问每个对象的关联属性，就是 N 次子查询',
                ],
                depth:
                  '两个进阶点：**第一，代理工厂可换**（`configuration.setProxyFactory(new CglibProxyFactory())`），默认是 Javassist——因为 CGLIB 对 final 类 / 方法有限制，而字段注入的实体通常无参构造 + setter，两者都能用。**第二，为什么「会话关闭后失效」在 Spring 里特别容易踩**：Spring 的 `SqlSession` 生命周期跟事务走，Service 方法返回后会话关闭，Controller / 视图层再去访问关联属性就炸。解决方式是「在 Service 层就把需要的数据取完」（`fetchType="eager"` 或显式调 getter），而不是「开 `OpenSessionInView`」——后者会让会话占着数据库连接直到响应完成，是**性能反模式**。',
                followup:
                  '「延迟加载该开还是该关」——**默认建议关闭**。理由是：延迟加载把「SQL 的执行时机」变得不可预测（可能在视图层、可能在序列化时），排查慢查询时很难定位；而且线上一次「遍历 + 访问关联」就是标准 N+1。推荐做法是**显式查询**：需要关联数据时用 `join` 一次查完（嵌套结果映射），或在 Service 里批量查（`IN` 查询）再在内存里拼装——这样 SQL 条数是确定的、可 review 的。',
              },
              {
                kind: 'question',
                title: '动态 SQL 有哪些标签？底层原理是什么？',
                questionId: 'java-05-Q82',
                intent:
                  '标签要分类说（条件 / 循环 / 复用 / 修剪），原理必须落到 `SqlNode` 组合模式 + OGNL。',
                points: [
                  '**条件类**：`<if test="...">`、`<choose>` + `<when>` + `<otherwise>`（相当于 switch）',
                  '**修剪类**：`<where>`（加 `WHERE` + 去前导 `AND`/`OR`）、`<set>`（加 `SET` + 去尾部逗号）、`<trim prefix/suffix/prefixOverrides/suffixOverrides>`（前两者的通用形式）',
                  '**循环类**：`<foreach collection item index separator open close>` —— `collection` 是最易错属性（`list` / `array` / `@Param` 名）',
                  '**复用类**：`<sql id="...">` 定义片段 + `<include refid="...">` 引用，`<include>` 内可嵌套 `<property>` 做变量替换',
                  '**绑定类**：`<bind name="x" value="...">` 把 OGNL 结果存进上下文，供后续引用（常用于 `LIKE` 拼 `%`）',
                  '**底层一**：解析期由 `XMLScriptBuilder` 把每个标签变成 `SqlNode`（`IfSqlNode` / `ForEachSqlNode` / `TrimSqlNode` / `ChooseSqlNode` / `StaticTextSqlNode`），嵌套成**组合模式的树**，根是 `MixedSqlNode`',
                  '**底层二**：执行期调用 `apply(DynamicContext)` **递归**拼接，每个节点自行决定「拼不拼、拼什么」，结果追加到 `StringBuilder`',
                  '**底层三**：条件判断由 `ExpressionEvaluator` 用 **OGNL** 求值，根对象是参数 Map，所以 `test` 里能写属性访问、比较、方法调用、静态方法',
                ],
                depth:
                  '一个能显功底的观察：**`<where>` 与 `<set>` 不是「特殊标签」，而是 `TrimSqlNode` 的两个预设实例**（源码里 `WhereSqlNode` / `SetSqlNode` 都继承 `TrimSqlNode`，只是构造参数不同）。这解释了两件事：一是「`<where>` 里第一个条件不用写 `AND`」（`prefixOverrides` 会去掉开头的 `AND | OR`）；二是「`<trim>` 才是通用形式，`<where>` 只是它的语法糖」。**能把「标签」还原成「节点 + 参数」的人，才算真读过源码**。',
                followup:
                  '「`<if>` 的 `test` 里能写什么」——OGNL 表达式所能表达的一切：属性访问（`user.name`）、比较（`age > 18`）、逻辑（`a and b`）、集合操作（`list.size() > 0`、`list.isEmpty()`）、静态方法（`@java.lang.Math@max(1, 2)`）、甚至 `@com.x.Constants@STATUS_ACTIVE`。**注意 `test` 里不能用 `#{}`**——那是参数占位符，只在 SQL 正文里有效；`test` 里直接写属性名即可。',
              },
              {
                kind: 'question',
                title: '批量插入有哪几种方式？有什么注意点？',
                questionId: 'java-05-Q83',
                intent:
                  '三种方式（循环 / `foreach` 拼多值 / 真批量）必须能对比出优劣，且要说出 JDBC 参数上限与事务边界。',
                points: [
                  '**方式一：循环单条 insert**——最简单，但**每条一次网络往返**，1 万条约几秒到几十秒；只在数据量小时可用',
                  '**方式二：`<foreach>` 拼多值 `INSERT INTO t (a,b) VALUES (?,?),(?,?)...`**——一次往返，性能好；**但 SQL 长度与参数数有上限**（MySQL `max_allowed_packet` 默认 4MB；`PreparedStatement` 参数数过多会 OOM 或报错）',
                  '**方式三：`ExecutorType.BATCH` 真批量**——复用同一个 `PreparedStatement`，`addBatch` + `executeBatch`；**一次往返提交多行**，且能返回影响行数数组',
                  '**方式三的写法**：`sqlSessionFactory.openSession(ExecutorType.BATCH)` 或 `SqlSessionTemplate(ExecutorType.BATCH)`；Spring 下可配 `mybatis.configuration.default-executor-type=batch`（全局，谨慎）',
                  '**注意一：分批**——方式二按 500~1000 条一批切开，避免 SQL 过长；方式三也要定期 `flushStatements`',
                  '**注意二：事务边界**——批量必须在**同一事务**内，否则每条独立提交，性能退化且无法回滚',
                  '**注意三：主键回填**——方式二用 `useGeneratedKeys="true" keyProperty="id"` 只能回填**第一个**自增 id（MySQL 多值插入的行为），后续 id 需靠 `LAST_INSERT_ID()` 计算；方式三 `BATCH` 下 `getGeneratedKeys` 部分驱动不可靠',
                  '**注意四：`rewriteBatchedStatements=true`**——MySQL 驱动的关键参数，它把多条 `addBatch` 改写成一条多值 SQL，否则「批量」仍是一条条发（这个参数不开，方式三的性能优势几乎消失）',
                ],
                depth:
                  '最能体现踩坑经验的是 **`rewriteBatchedStatements=true`**：MySQL Connector/J 在默认配置下，即使你用了 `addBatch`，驱动仍然逐条发送（只是省了往返的一部分），真正想「合并成一条 `INSERT ... VALUES (...),(...)`」必须显式开启这个参数（且只对 `INSERT`/`UPDATE` 生效，要求 SQL 为 `INSERT INTO ... VALUES` 形式，不能带 `ON DUPLICATE KEY` 之外的复杂语法）。**这个参数是「批量插入性能差 10 倍」的头号原因，也是面试里区分「配过」和「背过」的分水岭**。',
                followup:
                  '「一万条数据怎么插最快」——标准答法：**分批（每批 500~1000）+ `foreach` 多值插入 + 单事务 + `rewriteBatchedStatements=true`**，实测可达每秒数万行。若数据量更大（百万级），应该考虑「先落文件再用 `LOAD DATA INFILE`」或「走中间表 + `INSERT INTO ... SELECT`」，而不是继续优化 JDBC——**换手段比调参数更有效**，这个判断力比记住参数更有价值。',
              },
              {
                kind: 'question',
                title: 'PageHelper 分页插件的原理？逻辑分页和物理分页的区别？',
                questionId: 'java-05-Q84',
                intent:
                  '必须讲清「ThreadLocal + 拦截 Executor.query + 改写 SQL」，以及「count 查询的自动生成」。',
                points: [
                  '**用法**：`PageHelper.startPage(pageNum, pageSize)` 紧跟第一条查询，返回 `PageInfo` 包装',
                  '**原理一**：`startPage` 把分页参数存进 **`ThreadLocal`**（`Page` 对象），**不改变后续调用方式**',
                  '**原理二**：拦截 `Executor.query`，从 `ThreadLocal` 取出 `Page`，用 `Dialect`（MySQL / Oracle / PG 各自实现）**改写 `BoundSql`**——MySQL 拼 `LIMIT ?, ?`',
                  '**原理三**：同时**自动生成 count 语句**（把原 SQL 包成 `SELECT count(0) FROM (...)` 或智能优化掉 `ORDER BY`），执行后填进 `Page.total`',
                  '**原理四**：**`finally` 里 `clearPage()`**——这是「分页参数为什么会串到下一个查询」的原因（异步 / 线程池复用时尤其危险）',
                  '**物理分页**：数据库层 `LIMIT` / `ROWNUM` / `OFFSET FETCH`，只传回需要的行；**PageHelper 是物理分页**',
                  '**逻辑分页**：`RowBounds` / 全量查回内存再 `subList`；数据量大时内存与网络开销爆炸',
                  '**深分页问题**：`LIMIT 1000000, 20` 要扫描前 100 万行；优化用「延迟关联」（先用覆盖索引查 id 再 join）或「游标分页」（`WHERE id > lastId LIMIT 20`）',
                ],
                depth:
                  '两个进阶点：**第一，`startPage` 之后必须紧跟查询**，中间插入任何别的查询（包括同一个 Mapper 的其他方法）都会让分页参数被「用掉」或「串号」——这是 PageHelper 最经典的坑，根因就是 `ThreadLocal` 的作用域是线程而不是「接下来这一次调用」。**第二，count 查询可以被优化掉**：`PageHelper` 提供 `PageHelper.startPage(n, s, false)`（不查 count），适合「前端只需要知道有没有下一页」的场景；也可以用 `pageSize + 1` 的「多取一条」技巧判断 `hasNext`，比 count 快得多。',
                followup:
                  '「MyBatis-Plus 的分页和 PageHelper 有什么区别」——MP 用**显式传参**（`IPage<T>` 作为方法参数）而不是 `ThreadLocal`，所以没有「串号」问题，也不需要「紧跟查询」的约束；代价是 Mapper 方法签名要带 `IPage`，且**必须注册 `PaginationInnerInterceptor`**（不注册分页不生效，返回全量数据——这是 MP 常见的坑）。选型上：新项目用 MP 的分页更安全，老项目已用 PageHelper 且无并发问题可不动。',
              },
              {
                kind: 'question',
                title: 'MyBatis 插件（Interceptor）的原理？',
                questionId: 'java-05-Q85',
                intent:
                  '四大对象 + 四个拦截点 + 「层层包装成链」是核心，「多个插件的顺序」是加分。',
                points: [
                  '**能拦的只有四个对象**：`Executor`（管缓存与事务）、`StatementHandler`（管 JDBC）、`ParameterHandler`（管填参）、`ResultSetHandler`（管结果映射）',
                  '**声明方式**：实现 `Interceptor` 接口，标 `@Intercepts(@Signature(type=..., method=..., args=...))`，注册进 `Configuration`',
                  '**实现机制**：`InterceptorChain.pluginAll()` 对目标对象逐个 `Plugin.wrap()`，**生成 JDK 动态代理**（因为四个对象都是接口）',
                  '**链的形成**：多个插件会套成「代理的代理」，`plugin()` 里调 `invocation.proceed()` 才会进入下一层——**不调就是中断**',
                  '**顺序**：按 `addInterceptor` 的注册顺序，**先注册的在外层**（先被调用）',
                  '**典型用途**：分页（拦 `Executor.query` / `StatementHandler.prepare`）、读写分离（拦 `Executor`，切换 `DataSource`）、SQL 审计与耗时（拦 `Executor`）、字段加解密（拦 `ParameterHandler` / `ResultSetHandler`）',
                  '**一个关键限制**：**不能拦「自己写的」Bean，也不能拦 `SqlSession` 的方法**——只对这四个对象生效',
                  '**`@Signature` 的 `args` 必须精确匹配方法签名**，写错会导致插件不生效（且不报错，静默失败）',
                ],
                depth:
                  '「为什么插件容易出问题」——因为它是**AOP 的暴力版**：没有优先级语义、没有拓扑排序、文档极少。两个真实冲突场景：① 分页插件与「改 SQL 的插件」都拦 `StatementHandler.prepare`，谁在外层决定谁先看到 SQL，写分页的插件如果拿不到带 `LIMIT` 的 SQL 就会算错总数；② 读写分离插件拦 `Executor.query` 切数据源，但如果外层还有个缓存插件提前返回，数据源根本不会被切换。**理解「外层先执行、`proceed` 后才内层」这个模型，才能预判冲突**。',
                followup:
                  '「怎么写一个 SQL 耗时监控插件」——拦 `Executor.query`（或 `StatementHandler` 的 `query`），`proceed` 前后取时间差，从 `MappedStatement.getId()` 拿语句 id 打点。**注意要排除 count 语句与租户无关的查询**，否则指标噪音很大；且**别在插件里做同步 IO**（写日志文件、远程上报），会把所有查询拖慢——用异步队列或直接交给 Micrometer。',
              },
              {
                kind: 'question',
                title: 'MyBatis-Plus 和 MyBatis 是什么关系？提供了哪些能力？',
                questionId: 'java-05-Q86',
                intent:
                  '关系是「增强不是替代」。能力分四类说，且必须点出两个最常见的坑（拦截器未注册、逻辑删除失效）。',
                points: [
                  '**关系**：MP 是 MyBatis 的**增强工具**，只做增强不做改变——引了 MP 仍可写原生 XML，`SqlSession` 与 `Configuration` 完全复用',
                  '**CRUD 增强**：`BaseMapper<T>` 提供 `insert` / `selectById` / `updateById` / `deleteById` / `selectList`，无需写 SQL',
                  '**条件构造**：`QueryWrapper`（字符串列名）/ `LambdaQueryWrapper`（方法引用，编译期安全）/ `UpdateWrapper`',
                  '**分页**：`IPage` + `PaginationInnerInterceptor`（**必须注册，否则不生效**）',
                  '**代码生成**：`AutoGenerator` / `mybatis-plus-generator` 从表结构生成 Entity / Mapper / Service / Controller',
                  '**逻辑删除**：`@TableLogic` + `logic-delete-field`，自动把 `delete` 改写成 `update set deleted=1`，查询自动加 `deleted=0`',
                  '**自动填充**：`MetaObjectHandler` + `@TableField(fill = INSERT / INSERT_UPDATE)`，自动填 `createTime` / `updateTime` / `createBy`',
                  '**乐观锁**：`@Version` + `OptimisticLockerInnerInterceptor`（同样要注册）',
                  '**防全表更新**：`BlockAttackInnerInterceptor`（阻止不带 `where` 的 update / delete）',
                  '**两个常见坑**：① 拦截器忘了注册（分页、乐观锁静默失效，返回全量数据）② `LambdaQueryWrapper` 的字段为 `null` 时**默认不参与条件**（要 `eq(condition, ...)` 或 `isNull`）',
                ],
                depth:
                  '一个值得点出的取舍：**「用 Wrapper 还是写 XML」没有标准答案，但边界要清晰**。单表 CRUD、简单条件查询用 Wrapper（省代码、字段改名编译期报错）；多表 join、复杂聚合、需要 hint 或调优的 SQL 写在 XML 里（可读、可 review、可控）。**反模式是「用 Wrapper 硬拼多表 join」**——`inSql` / `apply` 拼出来的 SQL 藏在 Java 代码里，DBA review 不到，出慢查询时极难定位。这是「用 MP 之后 SQL 质量下降」的根本原因。',
                followup:
                  '「MP 和 JPA 的定位差在哪」——MP 是「在 MyBatis 上加便利层」，本质仍是拼 SQL（依赖方言）；JPA 是「对象即查询」，有 JPQL 这一层跨库抽象。所以 MP 的优势是「贴近原生、可控」，JPA 的优势是「模型驱动、跨库」。**如果团队已经熟悉 SQL 且需要精细控制，MP 是更自然的选择**；如果要跨多种数据库（如产品化交付），JPA 的方言抽象价值更大。',
              },
              {
                kind: 'question',
                title: '什么是 N+1 查询问题？怎么避免？',
                questionId: 'java-05-Q87',
                intent:
                  '定义要精确（1 次主查询 + N 次子查询），解法要分「join / 批量 IN / 延迟加载的取舍」三层。',
                points: [
                  '**定义**：查 1 次主表拿到 N 条记录，再为每条记录各查 1 次关联表 → 共 **N+1 次**数据库往返',
                  '**典型来源**：① `resultMap` 里用 `<association select="...">` 嵌套查询 ② 业务代码里循环调 Mapper ③ ORM 的延迟加载被触发',
                  '**危害**：N 大时往返次数爆炸（1000 条 → 1001 次），每次都有网络 + 解析开销；且常伴随全表扫描',
                  '**解法一：join 一次查完**——用 `resultMap` 的**嵌套结果映射**（`<collection>` 内联 `resultMap`），或直接用 join 查平表再在代码里分组',
                  '**解法二：批量 `IN` 查询**——先查主表拿 id 列表，再 `SELECT * FROM 关联表 WHERE 主表id IN (...)`，最后在内存里按 id 分组（**最推荐**，SQL 条数固定为 2）',
                  '**解法三：关掉延迟加载**——把 `fetchType` 设为 `eager` 或直接不用 `<association select>`，让问题在开发期暴露而非线上',
                  '**解法四：`<collection>` 配 `columnPrefix`**——一次 join 查多表，用列名前缀区分，避免 `resultMap` 冲突',
                  '**注意**：join 也有代价——一对多 join 会产生笛卡尔积行数放大（1 主 N 子 → N 行），数据量大时网络传输与内存占用上升，此时**批量 IN 优于 join**',
                ],
                depth:
                  '「join 和批量 IN 怎么选」——判断依据是**关联的基数与数据量**。一对多且子表行数多时，join 的行数放大可能比 N 次查询更糟（比如 1000 个订单 × 平均 50 个明细 = 5 万行），此时批量 IN（2 条 SQL，5 万行也是 5 万行但少了 1000 次往返）更优。**关键指标是「往返次数」与「传输行数」的乘积**，两者要一起算。这个分析方式比背「用 join 解决 N+1」更接近真实决策。',
                followup:
                  '「怎么在测试阶段发现 N+1」——三种手段：① 开 `mybatis.configuration.log-impl` 或 p6spy 打印真实 SQL，数一数条数；② 用 `@Transactional` 包住测试方法，看是否有大量重复的相同语句；③ 上 APM（SkyWalking / Arthas `watch`）统计单请求的 SQL 次数。**最有效的工程手段是「给测试环境加 SQL 条数断言」**——单接口 SQL 数超过阈值就告警，把 N+1 挡在合并前。',
              },
              {
                kind: 'question',
                title: '为什么 Mapper 调用成功了，数据却没有提交？（MyBatis 与 Spring 的事务协同）',
                questionId: 'java-05-Q88',
                intent:
                  '核心是「SqlSession 的生命周期由 Spring 的事务管理器托管」，以及「自动提交被关掉」这个默认行为。',
                points: [
                  '**根本原因**：MyBatis 的 `SqlSession` 在 Spring 管理下**不自动提交**（`autocommit=false`），提交动作交给 `SpringManagedTransaction`',
                  '**有 `@Transactional` 时**：`DataSourceTransactionManager` 在方法开始时开连接并设 `autocommit=false`，`SqlSession` 绑定到该连接；方法正常返回 → `commit`，抛异常 → `rollback`',
                  '**没有 `@Transactional` 时**：`SqlSessionTemplate` 每次调用后 `close()`，而 `close()` **不会提交**未提交的事务 → **数据丢失**（取决于连接池归还时的行为，多数是回滚）',
                  '**为什么「本地测着好的、线上不同」**：本地可能开了 `mybatis.configuration.auto-mapping` 之类无关配置，或测试代码在 `@Transactional` 的测试基类里（回滚了但断言在回滚前）',
                  '**其他常见原因**：① 异常被 `try-catch` 吞掉（拦截器看不到异常 → 提交）② 异常类型是受检异常（默认不回滚）③ 自调用（`this.method()` 不走代理）④ 多数据源用了错的事务管理器',
                  '**验证方式**：开 `logging.level.org.springframework.jdbc=DEBUG` 看是否有 `Committing JDBC transaction`；或直接查库确认',
                  '**规范建议**：「写操作必须在 `@Transactional` 方法内」，且用 `rollbackFor = Exception.class`；Service 层统一加，Controller 不加',
                ],
                depth:
                  '一个容易混淆的点：**MyBatis 自己也有事务（`SqlSession.commit()`），但在 Spring 环境下它被「代理掉」了**。`SqlSessionTemplate` 里的 `SqlSessionInterceptor` 会在 `finally` 中调 `closeSqlSession`，而 `SpringManagedTransaction` 的 `commit()` 是空实现——真正的提交由 `DataSourceTransactionManager` 在事务边界执行。**所以「手动 `sqlSession.commit()`」在 Spring 里是无效甚至有害的**（可能提前提交导致事务语义破坏）。理解「谁拥有事务」是这道题的核心。',
                followup:
                  '「`@Transactional` 加在 Mapper 上有效吗」——技术上有效（Mapper 是代理对象，能被 AOP 拦截），但**语义上是错的**：事务边界应该在 Service（业务用例）而不是单个 SQL。加在 Mapper 上会导致「每个方法一个独立事务」，跨方法的一致性完全丢失。**判断规则：事务边界 = 业务不变量边界**，一个业务操作里的多条 SQL 必须共享同一个事务。',
              },
            ],
          },
        },
        {
          id: 'spring-misc',
          title: 'Spring 的扩展点与横切能力',
          kind: 'concept',
          sources: [{ topic: 'java-05', chapters: ['十、其他高频'] }],
          content: {
            intro:
              '最后一课收口在两件事上：**Spring 留了哪些口子给你改它**（扩展点），以及**它自带的横切能力怎么用对**（事件、`@Async`、定时任务）。这两件事的共同点是「用对了极其顺手，用错了故障极其隐蔽」——异步任务丢了、定时任务重复执行、事件监听器阻塞主流程，都是线上真实事故。本课会把 `refresh()` 的整条链路当成一张「扩展点地图」来走，再把事件、异步、定时放在这张图上定位，最后用一张表收口 Spring 5 与 Spring 6 的版本差异，并给出一条「连环追问」的答题主线，供面试前过一遍。',
            outline: [
              '扩展点分三层：**容器级**（`BeanFactoryPostProcessor` / `BeanPostProcessor`）、**Bean 级**（`Aware` / 生命周期回调）、**框架级**（`InitializingBean` / `DisposableBean` / `ApplicationListener`）',
              '事件机制是**同步**的（默认在发布者线程执行），要异步必须配 `@Async` 或自定义 `ApplicationEventMulticaster`',
              '`@Async` 的本质是**动态代理 + 线程池**，两大致命陷阱是「自调用失效」与「用了默认的 `SimpleAsyncTaskExecutor`（无界）」',
              '`@Scheduled` 默认**单线程**，多个任务会互相阻塞；集群下会**重复执行**，必须加分布式锁或换调度平台',
              'Spring 6 的主线是 **AOT / 原生镜像 / `@HttpExchange` / `ProblemDetail`**，与 Boot 3 的 `jakarta` 迁移同步发生',
            ],
            pitfalls: [
              '以为事件监听是异步的：默认**同步**，监听器里慢一步，发布者的方法就慢一步',
              '认为 `@Async` 加在 `private` / 同类方法调用上有效：都不走代理，注解形同虚设',
              '把 `@Scheduled(fixedRate)` 当成「上一次执行完再等 n 毫秒」：`fixedRate` 是**按固定频率**（可能并发），`fixedDelay` 才是「上次结束后再等」',
            ],
            sections: [
              {
                kind: 'concept',
                title: '把 refresh() 当一张扩展点地图',
                body: [
                  'Spring 的扩展点之所以让人记不住，是因为它们散落在各处文档里。但只要你记住 `AbstractApplicationContext.refresh()` 的十二步，每个扩展点就都有了「坐标」——它在第几步被调用，就决定了它能看到什么、能改什么。',
                  '沿着 `refresh()` 走：`prepareRefresh` 之后是 **`invokeBeanFactoryPostProcessors`**（此处调用所有 `BeanFactoryPostProcessor`，**此时 Bean 还没实例化**，只能改 `BeanDefinition`）；然后是 `registerBeanPostProcessors`（注册 `BeanPostProcessor`，但**它们的 `postProcessBeforeInitialization` 要等 Bean 实例化时才被执行**）；接着 `finishBeanFactoryInitialization`（**真正的实例化大发生在这里**）；最后 `finishRefresh` 发布 `ContextRefreshedEvent`。',
                  '所以判断一个扩展点「能不能拿到别的 Bean」，规则极其简单：**在 `finishBeanFactoryInitialization` 之前执行的，不要注入 Bean**（会触发提前初始化，甚至循环依赖报错）；**之后的，随便用**。`BeanFactoryPostProcessor` 只能用 `BeanDefinition`，`BeanPostProcessor` 处理的是「正在创建的 Bean」不能注入别的 Bean（会 `BeanCurrentlyInCreationException`），`ApplicationListener<ContextRefreshedEvent>` 在最后执行，什么都能拿——这条规则能解释 80% 的「扩展点里注入 Bean 报错」问题。',
                ],
                points: [
                  '**容器级 · 改定义**：`BeanFactoryPostProcessor`——在 Bean 实例化前修改 `BeanDefinition`（`@Configuration` 的 CGLIB 增强就靠它）',
                  '**容器级 · 改实例**：`BeanPostProcessor`——每个 Bean 初始化前后各回调一次（AOP 代理在这里生成）',
                  '**Bean 级 · 拿容器**：各类 `Aware`（`BeanFactoryAware` / `ApplicationContextAware` / `BeanNameAware`）',
                  '**Bean 级 · 生命周期**：`@PostConstruct` → `InitializingBean.afterPropertiesSet` → 自定义 `init-method`；销毁侧对称',
                  '**框架级 · 事件**：`ApplicationListener` / `@EventListener`——`ContextRefreshedEvent` 之后才算「全都就绪」',
                  '**框架级 · 后置处理**：`SmartInitializingSingleton`——**所有单例创建完之后**才回调，是「初始化收尾」的最佳位置',
                  '**判断口诀**：越早执行的口子，能看到的东西越少；「注入 Bean」这件事，只在 `SmartInitializingSingleton` 之后才安全',
                ],
              },
              {
                kind: 'diagram',
                title: '扩展点分类：一棵树记全',
                body: [
                  '按「改什么」分三支：改定义、改实例、参与生命周期。每一支里再按执行时机排序。',
                ],
                diagram: {
                  type: 'tree',
                  root: {
                    label: 'Spring 扩展点',
                    note: '按「你能改什么」分类，比按字母表背有效',
                    children: [
                      {
                        label: '① 改 BeanDefinition',
                        note: '**Bean 还没造出来**，只能改「图纸」',
                        tone: 'primary',
                        children: [
                          { label: 'BeanFactoryPostProcessor', note: '最常用：`ConfigurationClassPostProcessor` 就是它，负责解析 `@Configuration`' },
                          { label: 'BeanDefinitionRegistryPostProcessor', note: '它的子接口，能**注册新定义**（如 `@MapperScan` 就是这么干的）' },
                        ],
                      },
                      {
                        label: '② 改 Bean 实例',
                        note: '**Bean 正在造**，能包装、能替换',
                        tone: 'primary',
                        children: [
                          { label: 'BeanPostProcessor', note: '`postProcessBeforeInitialization` / `AfterInitialization`，AOP 代理在 After 阶段生成' },
                          { label: 'InstantiationAwareBeanPostProcessor', note: '更早：能干预**实例化本身**（如 `@Autowired` 的注入就靠它的子接口）' },
                          { label: 'DestructionAwareBeanPostProcessor', note: '销毁前回调，`@PreDestroy` 靠它' },
                        ],
                      },
                      {
                        label: '③ 参与生命周期',
                        note: '**Bean 已经是自己的了**，能拿容器、能收事件',
                        tone: 'warn',
                        children: [
                          { label: 'Aware 系列', note: '`BeanNameAware` → `BeanFactoryAware` → `ApplicationContextAware`，按此顺序回调' },
                          { label: 'InitializingBean / @PostConstruct', note: '属性注入完成后执行；`@PostConstruct` 更早（由 `CommonAnnotationBeanPostProcessor` 处理）' },
                          { label: 'SmartInitializingSingleton', note: '**所有单例创建完毕后**回调，此处可安全使用任意 Bean' },
                          { label: 'ApplicationListener', note: '收 `ContextRefreshedEvent` / `ApplicationReadyEvent` 等' },
                        ],
                      },
                    ],
                  },
                  caption:
                    '三条实用推论：**第一，`@Autowired` 为什么能工作**——它由 `AutowiredAnnotationBeanPostProcessor`（一个 `BeanPostProcessor`）在「实例化后、初始化前」完成注入，所以「构造器注入」和「字段注入」的时机不同（前者由容器在实例化时解析，后者靠后置处理器回填）。**第二，AOP 代理为什么在 `BeanPostProcessor` 里生成**——因为只有在那里才能「把原始对象换成代理对象」再交给容器。**第三，`@PostConstruct` 里为什么不能依赖「所有 Bean 就绪」**——它执行在单个 Bean 的初始化阶段，此时别的 Bean 可能还没开始创建。要「全部就绪后做事」，用 `SmartInitializingSingleton` 或监听 `ContextRefreshedEvent`。',
                },
              },
              {
                kind: 'diagram',
                title: '事件机制：一次发布的完整路径',
                body: [
                  '「Spring 事件机制」这题的答案很短：**`ApplicationEventPublisher.publishEvent()` → `ApplicationEventMulticaster` → 遍历 `ApplicationListener` 同步调用**。但细节里有三个考点。',
                ],
                diagram: {
                  type: 'sequence',
                  actors: ['发布者', '事件广播器', '监听器 A', '监听器 B'],
                  messages: [
                    { from: '发布者', to: '事件广播器', text: '`publishEvent(new OrderCreatedEvent(order))`' },
                    { from: '事件广播器', to: '事件广播器', text: '若是 `ApplicationEvent` 且无 `source`，包装 `PayloadApplicationEvent`' },
                    { from: '事件广播器', to: '事件广播器', text: '按事件类型 + `@Order` 排序，筛出匹配的监听器' },
                    { from: '事件广播器', to: '监听器 A', text: '**同步**调用 `onApplicationEvent(event)`' },
                    { from: '监听器 A', to: '事件广播器', text: '返回（若抛异常 → 中断后续监听器，且异常回传发布者）', reply: true },
                    { from: '事件广播器', to: '监听器 B', text: '同步调用（此时发布者线程仍在阻塞）' },
                    { from: '事件广播器', to: '发布者', text: '全部执行完才返回', reply: true },
                  ],
                  caption:
                    '三个必记结论：**第一，默认同步**——监听器慢，发布者就被拖慢；监听器抛异常，异常会传播到发布者的 `publishEvent` 调用处（除非监听器自己 `try-catch`）。**第二，异步要显式配**：给监听方法加 `@Async` 并开启 `@EnableAsync`，或自定义 `ApplicationEventMulticaster`（`SimpleApplicationEventMulticaster` 设 `taskExecutor`）。**第三，`@TransactionalEventListener` 是事务场景的正解**——它能把监听时机推迟到「事务提交后」（`AFTER_COMMIT`），避免「事件发了但事务回滚」的不一致。这个注解在实际项目里价值极高，但知道的人不多。',
                },
              },
              {
                kind: 'analogy',
                title: '事件机制像公司公告板',
                text:
                  '发布事件就像**在公告板上贴一张通知**，广播器是**行政**，监听器是**关心这件事的部门**。你把通知交给行政（`publishEvent`），行政按「谁订阅了这个主题」挨个打电话通知。**注意：行政是一个一个打的**——第一个部门问得久，后面的都得等，你这个「贴通知的人」也得站在旁边等所有电话打完才能走（**同步**）。如果某个部门接电话时吵起来（抛异常），行政会立刻停下来把冲突报给你，后面的部门就不通知了。',
                mapping: [
                  { real: '公告板上的一张通知', tech: '`ApplicationEvent`（或任意 POJO 事件）' },
                  { real: '行政负责挨个通知', tech: '`ApplicationEventMulticaster`（默认 `SimpleApplicationEventMulticaster`）' },
                  { real: '订阅了该主题的部门', tech: '`ApplicationListener<E>` / `@EventListener`' },
                  { real: '一个一个打电话，要等', tech: '**默认同步执行**，在发布者线程内' },
                  { real: '某个部门吵架，行政停下来上报', tech: '监听器抛异常会中断后续监听器并传播给发布者' },
                  { real: '改成发邮件，不等人回', tech: '`@Async` + `@EnableAsync`，或给广播器配 `TaskExecutor`' },
                  { real: '等财务确认到账再通知仓库发货', tech: '`@TransactionalEventListener(phase = AFTER_COMMIT)`' },
                ],
                limit:
                  '类比的边界在「顺序与事务」。现实中行政可以并发打电话，而 Spring 默认**严格顺序**（按 `@Order`），并发要靠异步；现实中「通知发出去了就发出去了」，而 Spring 的事件**没有持久化**——进程崩溃时未处理的事件直接丢失。所以需要「可靠投递」时不该用 Spring 事件，而应使用消息队列（本地消息表 / 事务消息）。这个区别很重要：**Spring 事件是「进程内解耦」，不是「可靠消息」**。',
              },
              {
                kind: 'principle',
                title: '@Async 的两个致命陷阱',
                body: [
                  '`@Async` 看起来只是「加个注解就异步」，但它踩坑率高得惊人。原因都在「它是代理实现的」这一点上。',
                ],
                steps: [
                  {
                    title: '① 原理：代理 + 线程池，两件事缺一不可',
                    detail:
                      '`@EnableAsync` 引入 `AsyncAnnotationBeanPostProcessor`，它为标了 `@Async` 的 Bean 生成代理；调用时代理把 `Runnable` 提交给 `TaskExecutor` 并**立即返回**（返回值包装成 `Future` / `CompletableFuture`）。所以「异步」不是注解的魔法，是「代理拦截 + 线程池执行」的组合。',
                  },
                  {
                    title: '② 陷阱一：自调用必然失效',
                    detail:
                      '同一个类里 `this.asyncMethod()` 走的是 `this`，不是代理对象，注解完全不被触发——方法**同步执行**，而且不报错。这就是「@Async 没生效」最常见的原因。解法三种：把方法拆到另一个 Bean；注入自己的代理（`@Lazy` 注入自己）；用 `AopContext.currentProxy()`（需开 `exposeProxy`）。同类问题也存在于 `@Transactional`、`@Cacheable`——**一切基于代理的注解都有这个限制**。',
                  },
                  {
                    title: '③ 陷阱二：默认线程池是无界的',
                    detail:
                      '没配 `TaskExecutor` 时，Spring 用 `SimpleAsyncTaskExecutor`——**它根本不池化，每个任务新建一个线程，且没有上限**。高并发下会疯狂创建线程直到 OOM。所以生产必须自定义 `ThreadPoolTaskExecutor`（核心数、队列、拒绝策略、线程名），并命名为 `applicationTaskExecutor` 或通过 `@Async("myPool")` 指定。**这个坑的可怕之处在于「开发环境完全正常」**。',
                  },
                  {
                    title: '④ 三个次要点：异常、返回值、上下文',
                    detail:
                      '**异常**：`void` 返回值时异常会被 `AsyncUncaughtExceptionHandler` 吞掉（默认只打日志），调用方毫无感知——必须自定义 handler 或改用 `CompletableFuture` 并 `.exceptionally`。**返回值**：只能返回 `void` / `Future` / `CompletableFuture`，返回其他类型会拿到 `null`。**上下文**：`ThreadLocal`（含 `RequestContextHolder`、`SecurityContext`、MDC 的 `traceId`）**不会传到异步线程**，需要手动传递或用 `TaskDecorator`。',
                  },
                  {
                    title: '⑤ 关闭时的正确姿势',
                    detail:
                      '`ThreadPoolTaskExecutor` 默认**不等任务执行完**就关闭，停机时异步任务直接丢失。必须显式设 `setWaitForTasksToCompleteOnShutdown(true)` + `setAwaitTerminationSeconds(30)`。这一条和「优雅停机」是同一个问题的两面——很多团队配了 `server.shutdown=graceful`，却忘了线程池也要优雅关闭。',
                  },
                ],
              },
              {
                kind: 'code',
                title: '一个生产可用的 @Async 配置',
                body: [
                  '把上面五个坑一次填完。注意线程名前缀、拒绝策略、异常处理器、优雅关闭四处。',
                ],
                lang: 'java',
                code:
                  '@Configuration\n@EnableAsync\npublic class AsyncConfig implements AsyncConfigurer {\n\n    @Bean("bizExecutor")\n    public ThreadPoolTaskExecutor bizExecutor() {\n        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();\n        ex.setCorePoolSize(8);\n        ex.setMaxPoolSize(16);\n        ex.setQueueCapacity(500);\n        ex.setKeepAliveSeconds(60);\n        ex.setThreadNamePrefix("biz-async-");          // ① 线程名：排查问题的第一手线索\n        ex.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy()); // ② 背压\n        ex.setWaitForTasksToCompleteOnShutdown(true);   // ③ 停机不丢任务\n        ex.setAwaitTerminationSeconds(30);\n        // ④ 传递 MDC / traceId 到异步线程\n        ex.setTaskDecorator(runnable -> {\n            Map<String, String> ctx = MDC.getCopyOfContextMap();\n            return () -> {\n                if (ctx != null) MDC.setContextMap(ctx);\n                try { runnable.run(); } finally { MDC.clear(); }\n            };\n        });\n        ex.initialize();\n        return ex;\n    }\n\n    @Override\n    public Executor getAsyncExecutor() { return bizExecutor(); }\n\n    @Override\n    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {\n        // ⑤ void 方法的异常在这里收口，默认实现只打日志、容易被忽略\n        return (ex, method, params) ->\n                log.error("async failed: {}", method.getName(), ex);\n    }\n}\n\n// 使用：显式指定线程池，不要依赖默认\n@Async("bizExecutor")\npublic CompletableFuture<Order> loadOrder(Long id) {\n    return CompletableFuture.completedFuture(orderMapper.selectById(id));\n}',
                caption:
                  '五处细节各有对应的事故：① 没有线程名前缀，出问题时 `pool-3-thread-7` 完全无法定位；② 用 `AbortPolicy` 会在队列满时直接丢任务（抛异常）而调用方往往没 catch；③ 不设优雅关闭，发布时正在跑的任务全部丢失；④ 不传 MDC，异步链路的日志没有 `traceId`，链路追踪断在异步边界；⑤ `void` 方法的异常默认只打一行日志，业务方永远不知道失败。**再加一条：`@Async` 方法必须 `public`，且同类调用无效**——注解不会报错，只会静默失效。',
                notes: [
                  { line: 'ex.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());', text: '拒绝策略选 `CallerRuns` 可以让「提交任务的线程自己执行」，天然形成背压。若业务不能接受「异步变同步」，改用 `DiscardOldestPolicy` 前必须确认丢弃的任务可重跑。' },
                  { line: 'ex.setTaskDecorator(runnable -> { ... MDC ... });', text: '`TaskDecorator` 是唯一官方支持的「跨线程传上下文」入口。比手动在每个 `@Async` 方法开头设置 MDC 可靠得多——后者很容易漏。' },
                  { line: '@Async("bizExecutor")', text: '显式指定池名。不指定时会找唯一的 `TaskExecutor` Bean，找到了就用、找不到就退回 `SimpleAsyncTaskExecutor`（**无界建线程**）——所以「没写池名」是线上 OOM 的常见起点。' },
                ],
              },
              {
                kind: 'diagram',
                title: '定时任务的三代方案',
                body: [
                  '「Spring 定时任务怎么做、有什么局限」——按演进讲最清楚：从 JDK 自带，到 Spring 注解，再到分布式调度平台。',
                ],
                diagram: {
                  type: 'flow',
                  direction: 'v',
                  items: [
                    { label: '① `java.util.Timer`', note: '单线程；一个任务抛异常会导致**整个 Timer 线程死亡**，后续任务全不执行。已不推荐' },
                    { label: '② `ScheduledExecutorService`', note: '线程池 + 异常隔离（单任务异常不影响其他）；`scheduleAtFixedRate` / `scheduleWithFixedDelay` 两种语义' },
                    { label: '③ `@Scheduled` + `@EnableScheduling`', note: 'Spring 封装，底层是 `ScheduledAnnotationBeanPostProcessor` + 默认**单线程**的 `TaskScheduler`' },
                    { label: '④ `@Scheduled` + 自定义 `TaskScheduler`', note: '设 `poolSize > 1` 让多任务并行；但**同一任务不会并发**（`fixedRate` 也是串行触发）' },
                    { label: '⑤ Quartz / XXL-JOB / Elastic-Job', note: '分布式调度：任务持久化、失败重试、分片、**集群防重**、可视化运维' },
                  ],
                  caption:
                    '`@Scheduled` 的三个必说局限：**第一，默认单线程**（`ThreadPoolTaskScheduler` 的 `poolSize=1`），一个慢任务会阻塞所有其他定时任务——这是「明明配了 5 个任务，只有 1 个按时跑」的原因。**第二，集群下重复执行**——每个实例都会跑同一个 `@Scheduled`，必须靠分布式锁（Redis / 数据库）或改用 XXL-JOB 这类平台。**第三，无运维界面、无失败重试、无执行记录**——出了问题是「任务到底跑没跑」都查不到，只能翻日志。所以结论是：**单机、非关键、轻量任务用 `@Scheduled`；集群或有运维要求的，一律上调度平台**。另外注意 `fixedRate` 与 `fixedDelay` 的区别：前者按「固定频率」（上次开始 + n），任务耗时超过间隔时会排队堆积；后者是「上次结束后再等 n」——**长任务必须用 `fixedDelay`**。',
                },
              },
              {
                kind: 'diagram',
                title: 'Spring 5 → 6 版本对照',
                body: [
                  '「Spring 5 / 6 各有哪些新特性」按「版本主线 + 面试可说的点」列表。Spring 6 与 Boot 3 是同一波变化。',
                ],
                diagram: {
                  type: 'matrix',
                  head: ['能力', 'Spring 5（5.3）', 'Spring 6（6.x）', '面试可说的点'],
                  cols: ['Spring 5（5.3）', 'Spring 6（6.x）', '面试可说的点'],
                  rows: [
                    ['JDK 基线', 'JDK 8+', '**JDK 17+**', '「6 用了 record、密封类、模式匹配」'],
                    ['Web 栈', 'Spring MVC + WebFlux', '同上 + **`@HttpExchange` 声明式客户端**', '「内置 HTTP Interface，替代 Feign 的轻量方案」'],
                    ['响应式', 'Reactor 3.3+', 'Reactor 3.5+ / **虚拟线程支持**', '「JDK 21 虚拟线程 + Boot 3.2 一行开关」'],
                    ['AOT / Native', 'Spring Native（独立项目）', '**AOT 引擎内置**', '「`RuntimeHints` 替代 `@AotHints`，构建期确定反射」'],
                    ['可观测性', 'Micrometer', '**Micrometer Observation**', '「`@Observed` 一个注解同时出 metrics / trace / log」'],
                    ['错误响应', '自定义', '**`ProblemDetail`（RFC 7807）**', '「`application/problem+json` 标准化错误体」'],
                    ['Security', '`WebSecurityConfigurerAdapter`', '**`SecurityFilterChain` Bean**', '「适配器基类废弃，改声明式」'],
                    ['命名空间', '`javax.*`', '**`jakarta.*`**', '「Servlet / JPA / Validation 全量替换」'],
                    ['声明式校验', 'Bean Validation 2.0', '**Bean Validation 3.0（jakarta）**', '「`@Valid` 位置语义更严格」'],
                  ],
                  caption:
                    '若被问「Spring 6 最值得提的新能力」，选 **AOT**（它改变了框架的启动模型，从「运行期反射」转向「构建期确定」）和 **HTTP Interface**（`@HttpExchange` 把「声明式 HTTP 客户端」变成框架内建能力）。若被问「升级的最大障碍」，答案永远是 **`javax` → `jakarta` 的全量迁移 + 第三方库版本矩阵**——这件事没有任何技巧，只能逐个升级。另注意：**Spring 6 不等于 Spring Boot 3**，但两者通常同步升级，因为 Boot 3 就是基于 Spring 6 的。',
                },
              },
              {
                kind: 'question',
                title: 'Spring 的事件机制是怎样的？',
                questionId: 'java-05-Q89',
                intent:
                  '默认同步这一点必须说清。能补上 `@TransactionalEventListener` 就是加分。',
                points: [
                  '**三要素**：事件（`ApplicationEvent` 或任意 POJO）、发布者（`ApplicationEventPublisher`）、监听器（`ApplicationListener` / `@EventListener`）',
                  '**发布**：`publishEvent(event)` → `ApplicationEventMulticaster.multicastEvent()`',
                  '**广播**：`SimpleApplicationEventMulticaster` 遍历匹配的监听器，按 `@Order` 排序',
                  '**默认同步**：在**发布者线程**内依次调用 —— 监听器慢则发布者慢，监听器抛异常则异常传播回发布者并中断后续监听器',
                  '**异步化两种方式**：监听方法加 `@Async` + `@EnableAsync`；或给广播器配 `taskExecutor`',
                  '**事务感知**：`@TransactionalEventListener(phase = AFTER_COMMIT / BEFORE_COMMIT / AFTER_ROLLBACK / AFTER_COMPLETION)`',
                  '**内置事件**：`ContextRefreshedEvent`、`ContextClosedEvent`、`ApplicationReadyEvent`、`ApplicationFailedEvent`',
                  '**与 MQ 的本质区别**：Spring 事件是**进程内**、无持久化、无重试；MQ 是跨进程、可持久化、可重投',
                ],
                depth:
                  '「为什么需要事件机制」的标准答案是**解耦**：下单成功后要做「发短信、加积分、写日志、通知库存」，如果都写在 `OrderService` 里，它会变成一个「什么都依赖」的上帝类；改成发布 `OrderCreatedEvent`，`OrderService` 只依赖事件本身，新增业务只需加一个监听器。**但要立刻补充边界**：这种解耦的代价是「调用链变得不可见」——排查问题时看不到「谁处理了这个事件」，所以要靠日志与链路追踪。**这个「解耦 vs 可观测性」的权衡，是回答里最能体现工程判断的部分**。',
                followup:
                  '「`@EventListener` 和实现 `ApplicationListener` 有什么区别」——前者是注解 + 方法，方法签名自由（参数就是事件类型，可返回一个新事件实现「级联发布」），且**支持条件过滤**（`condition = "#event.type == \'PAID\'"`，用 SpEL）；后者是实现接口，一个类只能监听一种事件（泛型擦除后靠 `ResolvableType` 推断）。**新代码一律用 `@EventListener`**，它更灵活。另外 `@TransactionalEventListener` 只能用于注解形式，接口形式拿不到事务阶段语义。',
              },
              {
                kind: 'question',
                title: '@Async 的原理和注意事项？默认线程池是什么？',
                questionId: 'java-05-Q90',
                intent:
                  '「默认是 `SimpleAsyncTaskExecutor` 且无界」这个细节是本题的核心分水岭，必须说。',
                points: [
                  '**原理**：`@EnableAsync` → `AsyncAnnotationBeanPostProcessor` 生成代理 → 调用时把任务提交给 `TaskExecutor` 并立即返回',
                  '**默认线程池**：`SimpleAsyncTaskExecutor`——**不池化、不用线程复用、没有上限**，每个任务新建线程；高并发下 OOM',
                  '**陷阱一：自调用失效**——`this.method()` 不走代理，注解静默无效（`@Transactional` 同理）',
                  '**陷阱二：方法必须 `public`**（代理拦截要求），`private` / `final` 也不行',
                  '**陷阱三：异常被吞**——`void` 返回时异常交给 `AsyncUncaughtExceptionHandler`（默认只打日志）；要可靠处理必须用 `CompletableFuture` 并显式处理',
                  '**陷阱四：上下文丢失**——`ThreadLocal`（`RequestContextHolder`、`SecurityContext`、MDC 的 `traceId`）不会传递，需 `TaskDecorator` 或手动透传',
                  '**陷阱五：停机丢任务**——需 `setWaitForTasksToCompleteOnShutdown(true)` + `setAwaitTerminationSeconds(n)`',
                  '**正确配置**：自定义 `ThreadPoolTaskExecutor`（核心/最大/队列/拒绝策略/线程名前缀），用 `@Async("poolName")` 显式指定',
                ],
                depth:
                  '「为什么默认用 `SimpleAsyncTaskExecutor` 这么危险的设计」——历史原因：Spring 无法在框架层替用户决定合理的线程池参数（CPU 密集还是 IO 密集？能容忍多少队列？），所以给了一个「能跑但不可用于生产」的默认实现。**这个设计的隐含契约是「你必须自己配」**，而文档里这句话不明显，导致大量项目直接上线。类似的「默认不安全」还有 `RestTemplate` 无连接池、`SimpleClientHttpRequestFactory` 无超时——**Spring 的默认值常常是「能跑通」而不是「能上生产」**，这是使用它时的重要心智。',
                followup:
                  '「`@Async` 返回 `void` 和返回 `CompletableFuture` 有什么区别」——`void` 时调用方完全不知道执行结果，异常也被吞；`CompletableFuture` 时调用方可以 `.thenApply` / `.exceptionally` / `.get(timeout)`，能拿到结果、能感知失败、能设超时。**规范建议：能用 `CompletableFuture` 就别用 `void`**。另外注意返回 `Future`（非 `CompletableFuture`）时，Spring 用的是 `AsyncResult`，`get()` 会阻塞——别在 Web 线程里直接 `.get()`，那样等于同步。',
              },
              {
                kind: 'question',
                title: 'Spring 定时任务怎么做？有什么局限？',
                questionId: 'java-05-Q91',
                intent:
                  '三个局限（单线程 / 集群重复 / 无运维）必须全说，`fixedRate` 与 `fixedDelay` 的区别是常见追问。',
                points: [
                  '**用法**：`@EnableScheduling` + `@Scheduled(fixedRate / fixedDelay / cron)`；cron 支持 6 位（秒 分 时 日 月 周）',
                  '**局限一：默认单线程**——`ThreadPoolTaskScheduler` 的 `poolSize=1`，慢任务阻塞所有其他任务；需自定义 `TaskScheduler` 提高并发',
                  '**局限二：集群重复执行**——每个实例都跑，必须加分布式锁（Redis `SETNX` + 过期）或改用调度平台',
                  '**局限三：无运维能力**——无执行记录、无失败重试、无手动触发、无告警，出问题只能翻日志',
                  '**`fixedRate` vs `fixedDelay`**：前者「上次**开始** + n」按固定频率（长任务会堆积），后者「上次**结束** + n」（长任务不影响间隔）',
                  '**cron 的坑**：`0 0 2 * * ?` 在集群下每个实例都执行一次；`cron` 不支持「上次未完成则跳过」，长任务会重叠（除非开 `@DisallowConcurrentExecution`，但那是 Quartz 的）',
                  '**线程池问题**：`@Scheduled` 方法内的异步调用（`@Async` / 线程池）与调度线程是两回事，别混在一起排查',
                  '**替代方案**：Quartz（可持久化、集群）、XXL-JOB（可视化、分片、失败重试）、Elastic-Job、K8s CronJob',
                ],
                depth:
                  '「`@Scheduled` 在集群里加 Redis 锁就够了吗」——不够，还有三个细节：**① 锁要设过期时间**，否则实例崩溃后锁永不释放，任务永久停摆；**② 锁的粒度要覆盖整个任务执行期**——常见错误是「拿到锁后立刻释放」，等于没锁；**③ 要考虑「执行时间超过间隔」**，下一轮抢锁时上一轮还没结束，需要「看门狗续期」（Redisson 的 `RLock` 支持）或「先查执行状态」。**所以「自己加锁」只能应付低频、短时的任务；一旦有这些要求，调度平台的复杂度是有必要的**。',
                followup:
                  '「K8s CronJob 和 `@Scheduled` 怎么选」——CronJob 的优势是「不依赖应用常驻」（应用可以是纯粹的按需启动）、有执行历史与重试策略、天然单实例（靠 K8s 调度）；劣势是要为每个任务准备镜像与启动开销、无法访问应用内存状态。**实践中的常见组合**：应用内的轻量任务用 `@Scheduled` + 单实例部署（或分布式锁），重型批处理用 CronJob 或 XXL-JOB 分片执行。',
              },
              {
                kind: 'question',
                title: 'Spring 5 / Spring 6 各有哪些新特性？',
                questionId: 'java-05-Q92',
                intent:
                  '按版本主线说，每题挑 2-3 个「能展开讲」的点，别背清单。',
                points: [
                  '**Spring 5（基线 JDK 8）**：响应式 WebFlux、`@Nullable` 与 Kotlin 支持、函数式 Bean 注册、`PathPattern` 路由、`WebClient`',
                  '**Spring 5.3**：`PathPatternParser` 默认、`@HttpExchange` 雏形、GraalVM 实验支持',
                  '**Spring 6（基线 JDK 17）**：`jakarta.*` 命名空间、AOT 引擎内置、`@HttpExchange` 正式、`ProblemDetail`、Micrometer Observation',
                  '**响应式增强**：`WebClient`、`R2DBC`、`Reactor Netty`；`@Controller` 也能返回 `Flux` / `Mono`',
                  '**虚拟线程**：Spring 6.1 / Boot 3.2 起 `spring.threads.virtual.enabled=true` 一行开启（JDK 21）',
                  '**AOT 的意义**：把「运行期反射」变成「构建期确定」，是原生镜像的前提；代价是需注册 `RuntimeHints`',
                  '**HTTP Interface**：`@HttpExchange` + `HttpServiceProxyFactory`，接口即客户端，无需 Feign',
                  '**回答策略**：挑 2 个能讲透的（AOT、`@HttpExchange`），其余一句带过，比罗列 8 条更显深度',
                ],
                depth:
                  '「Spring 6 的 AOT 到底改变了什么」——传统模式下，`@ComponentScan`、`@Conditional`、代理生成、参数名推断全靠**运行期反射**，所以启动慢（秒级）、内存高（元数据）。AOT 把这一切**前移到构建期**：生成「Bean 注册代码 + 代理类 + 反射 hints」，运行时直接执行生成的代码，不再扫描与推断。**收益**：启动快一个数量级、可编译成原生镜像；**代价**：构建变慢、`Class.forName` 这类动态代码必须显式注册 hints、profile 相关的条件在构建期就得确定（`@Profile` 与 AOT 有微妙冲突）。**这个「用构建期成本换运行期性能」的权衡，是 Spring 6 最值得讲的设计变化**。',
                followup:
                  '「现在该不该上 Spring 6 / Boot 3」——判断三个条件：① 能否接受 JDK 17+（存量系统可能被中间件、旧 SDK 卡住）；② 关键第三方库是否已支持 `jakarta`（MyBatis-Plus、ShardingSphere、各类公司内部 starter）；③ 是否需要原生镜像（若不需要，AOT 的收益主要是启动速度，可以先不做 native）。**只要有一条不满足，就建议先升到 2.7 + Spring 5.3 把废弃 API 清完，等条件成熟再跨版本**——这是风险最低的路径。',
              },
              {
                kind: 'question',
                title: 'Spring 常见「连环追问」答题链路（面试前过一遍）',
                questionId: 'java-05-Q93',
                intent:
                  '这题是「总纲」，答的是「你的知识是怎么串起来的」。给出两三条主线，展示结构化。',
                points: [
                  '**链路一（Bean 的一生）**：`BeanDefinition` 从哪来（`@ComponentScan` / `@Bean` / 自动配置）→ 实例化（构造器）→ 属性注入（`@Autowired`）→ `Aware` 回调 → `BeanPostProcessor` 前置 → `@PostConstruct` → `InitializingBean` → `BeanPostProcessor` 后置（**AOP 代理在此生成**）→ 使用 → `@PreDestroy` → `DisposableBean`',
                  '**链路二（请求的一生）**：Filter → `DispatcherServlet` → `HandlerMapping` → `HandlerAdapter` → 参数解析 → Controller → 返回值处理 → `HttpMessageConverter` → 响应',
                  '**链路三（SQL 的一生）**：Mapper 代理 → `MappedStatement` → `BoundSql`（动态 SQL 求值）→ `Executor`（查缓存）→ `StatementHandler` → `ParameterHandler` → JDBC → `ResultSetHandler` → 缓存回写',
                  '**链路四（事务的一生）**：`@Transactional` → AOP 代理 → `TransactionInterceptor` → `PlatformTransactionManager` → 取连接 + 设 `autocommit=false` → 业务执行 → 提交/回滚 → 释放连接',
                  '**追问套路**：面试官通常沿一条链路往深处问（如「代理在哪生成」→「为什么要 `BeanPostProcessor`」→「AOP 和循环依赖怎么共存」），**答的时候主动抛出「下一环的钩子」**',
                  '**反问准备**：项目里用过的版本、遇到的真实故障（如循环依赖、事务失效、自动配置冲突），比背概念更有说服力',
                ],
                depth:
                  '这条链路的价值在「迁移能力」：四条链路其实共享同一套机制——**代理（AOP）+ 后置处理器（扩展）+ 模板方法（骨架）+ 责任链（多组件）**。所以你被问到任何「Spring 里 X 是怎么实现的」，都可以先归到这四种模式之一，再展开细节。**这个「模式识别」的能力，是「背了很多题」和「真的理解了框架」的分界线**——面试官顺着你给的钩子往下问，你能一直答到源码层面，就是最高评价。',
                followup:
                  '「怎么准备这类连环追问」——最有效的方式不是刷题，而是**自己画一遍四条链路**（不看资料），画完对照源码补齐断点。第二有效的是**读三个类的源码**：`AbstractApplicationContext.refresh()`、`DispatcherServlet.doDispatch()`、`ConfigurationClassParser`（自动配置的解析入口）。**读源码的收益不在于记住细节，而在于建立「框架会怎么想」的直觉**——有了直觉，没背过的题也能推出来。',
              },
              {
                kind: 'question',
                title: 'Spring 有哪些值得提的扩展点？（收尾开放题）',
                questionId: 'java-05-Q94',
                intent:
                  '开放题，考的是「有没有真的用扩展点做过事」。答三个「用过且有场景」的，胜过罗列十个。',
                points: [
                  '**改 BeanDefinition**：`BeanFactoryPostProcessor` / `BeanDefinitionRegistryPostProcessor`——动态注册 Bean（`@MapperScan` 的原理）',
                  '**改 Bean 实例**：`BeanPostProcessor`——自定义注解的通用处理（如「给标了 `@Encrypted` 的字段生成代理」），AOP 代理也在此生成',
                  '**拿容器**：`ApplicationContextAware`——需要主动 `getBean` 的场景（如工厂模式里按名称取实现）',
                  '**初始化时机**：`SmartInitializingSingleton`（所有单例就绪后）、`ApplicationRunner` / `CommandLineRunner`（容器启动完成后）',
                  '**生命周期**：`@PostConstruct` / `InitializingBean` / `@PreDestroy` / `DisposableBean`——资源申请与释放',
                  '**框架级**：`HandlerInterceptor`（MVC）、`HandlerMethodArgumentResolver`（自定义参数解析，如 `@CurrentUser`）、`HttpMessageConverter`（自定义序列化）',
                  '**配置级**：`EnvironmentPostProcessor`（在容器创建前改配置）、`PropertySourceLocator`（接入配置中心）、`WebServerFactoryCustomizer`（改内嵌容器参数）',
                  '**AOP 级**：自定义 `@Aspect`、`Advisor`（比切面更底层，能控制代理创建）、`BeanPostProcessor` + `ProxyFactory`（手写代理）',
                ],
                depth:
                  '答题策略很重要：**先说「我按执行时机分三类」，然后每类只挑一个自己真用过的展开**（讲清「为什么需要它」+「不用它会怎样」）。例如 `HandlerMethodArgumentResolver`：「我们用它实现了 `@CurrentUser`——不然每个 Controller 方法都要写 `request.getAttribute("userId")` 再强转，20 个接口重复 20 次」。**有场景、有对比、有收益陈述的回答，比「Spring 有 20 个扩展点」强十倍**——面试官要判断的是「你写过框架层代码吗」，不是「你背过文档吗」。',
                followup:
                  '「有没有扩展点踩过坑」——两个真实且高价值的例子：① `BeanPostProcessor` 里注入了别的 Bean，导致该 Bean 提前初始化，绕过了后续的 `BeanPostProcessor`（表现为「某个 Bean 的 AOP 失效」）；② `ApplicationContextAware` 在静态工具类里保存了上下文，单元测试与多容器场景下拿到的是「上一个上下文」。**这两个坑的共同点是「扩展点的执行时机与你以为的不同」**——所以用扩展点前先问一句「此刻容器里有什么」，比记住接口名重要。',
              },
            ],
          },
        },
      ],
    },
  ],
}
