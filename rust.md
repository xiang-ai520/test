# Rust 新手详细入门教程

> 适合：**完全没学过 Rust**，或者只会一点编程基础的人
> 目标：看完后你能理解 Rust 的核心思想，并写出简单的小程序
> 风格：**尽量通俗，不绕概念，先讲“人话”，再讲代码**

---

# 目录

1. [Rust 是什么？为什么值得学？](#1-rust-是什么为什么值得学)
2. [安装 Rust 和开发环境](#2-安装-rust-和开发环境)
3. [第一个 Rust 程序](#3-第一个-rust-程序)
4. [Rust 基础语法](#4-rust-基础语法)
5. [Rust 最核心：所有权 Ownership](#5-rust-最核心所有权-ownership)
6. [借用 Borrowing 和引用 Reference](#6-借用-borrowing-和引用-reference)
7. [切片 Slice：字符串和数组的一部分](#7-切片-slice字符串和数组的一部分)
8. [结构体 Struct](#8-结构体-struct)
9. [枚举 Enum](#9-枚举-enum)
10. [模式匹配 match](#10-模式匹配-match)
11. [Option 和 Result：Rust 的空值与错误处理](#11-option-和-resultrust-的空值与错误处理)
12. [常用集合：Vec、String、HashMap](#12-常用集合vecstringhashmap)
13. [循环器 Iterator 与闭包 Closure](#13-循环器-iterator-与闭包-closure)
14. [模块 Module 与包 Cargo](#14-模块-module-与包-cargo)
15. [Trait 和泛型 Generic](#15-trait-和泛型-generic)
16. [生命周期 Lifetime：先理解，不用怕](#16-生命周期-lifetime先理解不用怕)
17. [测试、格式化、检查](#17-测试格式化检查)
18. [适合新手的练手项目](#18-适合新手的练手项目)
19. [Rust 学习路线建议](#19-rust-学习路线建议)
20. [新手最常见的坑](#20-新手最常见的坑)

---

# 1. Rust 是什么？为什么值得学？

Rust 是一门系统编程语言，特点是：

- **速度快**：性能接近 C / C++
- **内存安全**：很多常见 bug 编译时就能发现
- **并发安全**：多线程更不容易出错
- **工程体验好**：自带包管理器 `cargo`，非常好用

---

## Rust 最吸引人的地方

很多语言会出现这些问题：

- 空指针
- 野指针
- 内存泄漏
- 多线程数据竞争
- 改一处，另一处偷偷炸了

Rust 的目标就是：

> **在不依赖垃圾回收 GC 的前提下，保证内存安全。**

这也是 Rust 最难、但最值钱的地方。

---

## Rust 适合做什么？

Rust 常用于：

- 后端服务
- 命令行工具
- WebAssembly
- 游戏底层
- 操作系统 / 嵌入式
- 高性能网络程序

---

## 新手要有的心理预期

Rust 的学习曲线前期比 Python、JavaScript 陡一些，原因主要是：

- 语法不算难
- **难的是“所有权 / 借用”**
- 一开始会被编译器“教育”
- 但熬过前期后，会越来越顺

一句话总结：

> Rust 不是“最好上手”的语言，但它是“越学越香”的语言。

---

# 2. 安装 Rust 和开发环境

Rust 官方推荐使用 **rustup** 安装。

---

## Windows / macOS / Linux 安装

进入 Rust 官网下载安装器即可。安装后，你会得到：

- `rustc`：Rust 编译器
- `cargo`：包管理器 + 构建工具
- `rustup`：Rust 工具链管理器

---

## 检查是否安装成功

```bash
rustc --version
cargo --version
```

如果能看到版本号，说明安装成功。

---

## 推荐编辑器

最推荐：

- **VS Code**
- 安装扩展：**rust-analyzer**

它能提供：

- 自动补全
- 跳转定义
- 类型提示
- 错误提示
- 重构支持

---

# 3. 第一个 Rust 程序

---

## 创建项目

```bash
cargo new hello_rust
cd hello_rust
cargo run
```

`cargo new hello_rust` 会帮你生成一个 Rust 项目。

目录大概长这样：

```text
hello_rust/
├── Cargo.toml
└── src/
    └── main.rs
```

---

## `main.rs`

```rust
fn main() {
    println!("Hello, Rust!");
}
```

运行：

```bash
cargo run
```

---

## 这段代码怎么理解？

```rust
fn main() {
    println!("Hello, Rust!");
}
```

- `fn`：定义函数
- `main`：程序入口
- `println!`：打印到终端
- `!`：说明 `println!` 是一个**宏**，不是普通函数

你可以先把宏理解成：

> “比函数更灵活的一种东西，先会用就行。”

---

## 常用 cargo 命令

```bash
cargo run
```

编译并运行

```bash
cargo build
```

只编译，不运行

```bash
cargo build --release
```

编译优化版本，速度更快

```bash
cargo check
```

只检查代码，不真正生成可执行文件
这个命令非常快，写代码时很常用

---

# 4. Rust 基础语法

---

## 4.1 变量

```rust
fn main() {
    let x = 5;
    println!("{}", x);
}
```

Rust 默认变量是**不可变**的。

如果想让变量可变：

```rust
fn main() {
    let mut x = 5;
    x = 10;
    println!("{}", x);
}
```

---

## 4.2 常量

```rust
const MAX_POINTS: u32 = 100;
```

特点：

- 必须标注类型
- 一般用大写命名
- 不可修改

---

## 4.3 遮蔽 shadowing

```rust
fn main() {
    let x = 5;
    let x = x + 1;
    let x = x * 2;

    println!("{}", x); // 12
}
```

这不是“修改原变量”，而是“重新定义了一个同名变量”。

它和 `mut` 的区别：

- `mut`：改的是同一个变量
- `let x = ...`：重新创建一个新变量

---

## 4.4 基本类型

---

### 整数

```rust
let a: i32 = 10;
let b: u32 = 20;
```

- `i32`：有符号整数
- `u32`：无符号整数

常见类型：

- `i8`, `i16`, `i32`, `i64`, `i128`
- `u8`, `u16`, `u32`, `u64`, `u128`
- `isize`, `usize`

---

### 浮点数

```rust
let x = 3.14;
let y: f32 = 2.5;
```

默认是 `f64`

---

### 布尔值

```rust
let is_ok = true;
let is_done = false;
```

---

### 字符

```rust
let c = 'a';
let heart = '❤';
```

Rust 的 `char` 是单引号，且支持 Unicode。

---

### 元组

```rust
let tup = (500, 6.4, 'a');
let (x, y, z) = tup;

println!("{}", x);
```

也可以通过索引访问：

```rust
println!("{}", tup.0);
```

---

### 数组

```rust
let arr = [1, 2, 3, 4, 5];
println!("{}", arr[0]);
```

数组长度固定。

如果你需要可变长度，一般用 `Vec<T>`。

---

## 4.5 函数

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

注意最后一行：

```rust
a + b
```

没有分号，表示这是一个**表达式**，它的值会作为返回值。

如果你写成：

```rust
a + b;
```

那就不是返回值了。

---

## 4.6 语句 vs 表达式

这是 Rust 很重要的思维方式。

---

### 语句

做一件事，不返回值

```rust
let x = 5;
```

---

### 表达式

会产生一个值

```rust
let y = {
    let x = 3;
    x + 1
};

println!("{}", y); // 4
}
```

代码块 `{}` 在 Rust 中也可以是表达式。

---

## 4.7 条件判断

```rust
fn main() {
    let age = 18;

    if age >= 18 {
        println!("成年");
    } else {
        println!("未成年");
    }
}
```

---

### `if` 也能返回值

```rust
fn main() {
    let condition = true;

    let number = if condition { 5 } else { 6 };

    println!("{}", number);
}
```

---

## 4.8 循环

---

### `loop`

无限循环，手动退出

```rust
fn main() {
    let mut count = 0;

    loop {
        count += 1;
        if count == 3 {
            break;
        }
    }
}
```

---

### `while`

```rust
fn main() {
    let mut n = 3;

    while n > 0 {
        println!("{}", n);
        n -= 1;
    }
}
```

---

### `for`

```rust
fn main() {
    for i in 1..4 {
        println!("{}", i);
    }
}
```

`1..4` 表示 `1, 2, 3`

如果想包含 4：

```rust
for i in 1..=4 {
    println!("{}", i);
}
```

---

# 5. Rust 最核心：所有权 Ownership

如果你学 Rust，只记住一句话：

> **Rust 用“所有权”来管理内存。**

---

## 5.1 为什么要有所有权？

在很多语言里，内存管理要么靠程序员手动控制，要么靠 GC 自动回收。

Rust 走第三条路：

> 编译时通过规则管理谁拥有数据，什么时候释放。

这样既快，又安全。

---

## 5.2 所有权规则

Rust 的核心规则很简单：

1. 每个值都有一个**所有者**
2. 同一时刻，一个值只能有**一个所有者**
3. 当所有者离开作用域，值会被自动释放

---

## 5.3 例子：作用域结束自动释放

```rust
fn main() {
    {
        let s = String::from("hello");
        println!("{}", s);
    } // 这里 s 离开作用域，被释放
}
```

---

## 5.4 `String` 和 `&str` 的区别

这对新手非常重要。

---

### `&str`

字符串切片，通常是“借来的字符串”

```rust
let s = "hello";
```

这个字符串通常写死在程序里。

---

### `String`

可增长、可修改、在堆上分配的字符串

```rust
let s = String::from("hello");
```

---

## 5.5 移动 move

看这段代码：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;

    println!("{}", s2);
}
```

这段没问题。

但如果你写：

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;

    println!("{}", s1);
}
```

就会报错。

---

## 为什么报错？

因为：

```rust
let s2 = s1;
```

对于 `String` 这种堆数据，Rust 默认不是“复制”，而是**转移所有权**。

可以理解成：

- `s1` 原来是这块数据的主人
- `s2 = s1` 后，主人变成 `s2`
- `s1` 不再有效

这叫 **move**

---

## 5.6 为什么不用默认深拷贝？

如果每次赋值都复制整块内存：

- 性能开销大
- 很多情况下根本没必要

所以 Rust 默认选择“移动”。

---

## 5.7 如果我就是想复制呢？

用 `clone()`

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1.clone();

    println!("{}", s1);
    println!("{}", s2);
}
```

这里会进行深拷贝。

---

## 5.8 `Copy` 类型

像整数这种简单类型，会直接复制，不会 move：

```rust
fn main() {
    let x = 5;
    let y = x;

    println!("{}", x); // 没问题
    println!("{}", y);
}
```

因为 `i32` 这类类型实现了 `Copy`

常见 `Copy` 类型：

- 整数
- 浮点数
- 布尔值
- 字符
- 由 `Copy` 类型组成的元组

---

## 5.9 函数传参也会发生所有权转移

```rust
fn main() {
    let s = String::from("hello");
    take_ownership(s);

    // println!("{}", s); // 报错
}

fn take_ownership(str: String) {
    println!("{}", str);
}
```

`str: String` 获取了所有权，所以原来的 `s` 就不能再用了。

---

## 5.10 返回值也会转移所有权

```rust
fn main() {
    let s = give_string();
    println!("{}", s);
}

fn give_string() -> String {
    String::from("hello")
}
```

函数把所有权交给调用者。

---

## 5.11 一句话理解所有权

你可以把它想成：

> 一个值像一把钥匙，谁拿着钥匙，谁就对这块数据负责。
> Rust 不允许两个人同时都说“这钥匙归我”。

---

# 6. 借用 Borrowing 和引用 Reference

如果每次传参都把所有权拿走，会很麻烦。

所以 Rust 提供了**借用**。

---

## 6.1 不可变借用

```rust
fn main() {
    let s = String::from("hello");
    print_str(&s);

    println!("{}", s); // 还能继续用
}

fn print_str(s: &String) {
    println!("{}", s);
}
```

这里 `&s` 表示：

> “我不拿走这个值，我只是借来看一下。”

---

## 6.2 借用的核心意义

- 不拿走所有权
- 用完还回去
- 原变量还能继续用

---

## 6.3 可变借用

```rust
fn main() {
    let mut s = String::from("hello");
    change(&mut s);

    println!("{}", s);
}

fn change(s: &mut String) {
    s.push_str(", world");
}
```

这里表示借用时允许修改。

---

## 6.4 借用规则

Rust 借用规则非常关键：

### 规则 1：可以有多个不可变引用

```rust
let r1 = &s;
let r2 = &s;
```

可以，因为大家都只是读，不改。

---

### 规则 2：可变引用同一时刻只能有一个

```rust
let r1 = &mut s;
```

这时不能再有别的引用。

---

### 为什么？

因为 Rust 要防止：

- 一边读一边改
- 两处同时改
- 数据竞争

---

## 6.5 经典错误：同时可变和不可变借用

```rust
let mut s = String::from("hello");

let r1 = &s;
let r2 = &mut s; // 报错
```

原因：

- `r1` 正在读
- `r2` 想改
- Rust 不允许这种冲突

---

## 6.6 更推荐的参数写法：`&str`

很多时候你不必写 `&String`

更通用的写法是：

```rust
fn print_str(s: &str) {
    println!("{}", s);
}
```

因为：

- `&String` 可以转成 `&str`
- 字符串字面量本来就是 `&str`

这样函数更灵活。

---

# 7. 切片 Slice：字符串和数组的一部分

切片本质上是：

> “借用某个连续区域的一部分”

---

## 7.1 字符串切片

```rust
fn main() {
    let s = String::from("hello world");

    let hello = &s[0..5];
    let world = &s[6..11];

    println!("{}", hello);
    println!("{}", world);
}
```

也可以简写：

```rust
let hello = &s[..5];
let world = &s[6..];
let all = &s[..];
```

---

## 7.2 `String` 和 `&str` 的关系

- `String`：拥有字符串
- `&str`：借用字符串的一部分或全部

---

## 7.3 数组切片

```rust
fn main() {
    let arr = [1, 2, 3, 4, 5];
    let part = &arr[1..4];

    println!("{:?}", part);
}
```

---

# 8. 结构体 Struct

结构体就是：

> “把相关的数据打包成一个整体”

---

## 8.1 定义结构体

```rust
struct User {
    username: String,
    age: u32,
    active: bool,
}
```

---

## 8.2 创建结构体实例

```rust
fn main() {
    let user = User {
        username: String::from("alice"),
        age: 20,
        active: true,
    };

    println!("{}", user.username);
}
```

---

## 8.3 可变结构体

```rust
fn main() {
    let mut user = User {
        username: String::from("alice"),
        age: 20,
        active: true,
    };

    user.age = 21;
}
```

---

## 8.4 定义方法 `impl`

```rust
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }
}
```

使用：

```rust
fn main() {
    let rect = Rectangle {
        width: 30,
        height: 50,
    };

    println!("面积: {}", rect.area());
}
```

---

## 8.5 `self` 是什么？

- `&self`：不可变借用
- `&mut self`：可变借用
- `self`：拿走所有权

你可以理解成“这个实例自己”。

---

# 9. 枚举 Enum

枚举表示：

> “一个值可能是几种情况中的一种”

---

## 9.1 简单枚举

```rust
enum Direction {
    Up,
    Down,
    Left,
    Right,
}
```

---

## 9.2 带数据的枚举

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}
```

这个很强大，因为不同分支可以带不同类型的数据。

---

## 9.3 为什么 Rust 的枚举很重要？

在很多语言里，枚举只是几个固定数字。
但 Rust 的枚举更像“带类型的数据分支”。

这使它非常适合表达：

- 可能成功 / 失败
- 有值 / 没值
- 多种命令类型
- 网络消息类型

---

# 10. 模式匹配 match

`match` 是 Rust 的超级常用武器。

---

## 10.1 基本写法

```rust
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

fn main() {
    let dir = Direction::Left;

    match dir {
        Direction::Up => println!("上"),
        Direction::Down => println!("下"),
        Direction::Left => println!("左"),
        Direction::Right => println!("右"),
    }
}
```

---

## 10.2 `match` 必须覆盖所有情况

这点非常重要。

Rust 会强制你把所有分支写全，这样能避免漏处理某种情况。

---

## 10.3 带数据的匹配

```rust
enum Message {
    Quit,
    Move { x: i32, y: i32 },
    Write(String),
}

fn main() {
    let msg = Message::Write(String::from("hello"));

    match msg {
        Message::Quit => println!("退出"),
        Message::Move { x, y } => println!("移动到 ({}, {})", x, y),
        Message::Write(text) => println!("文本: {}", text),
    }
}
```

---

## 10.4 `if let`

如果你只关心一种情况，可以写得更简洁：

```rust
let some_number = Some(5);

if let Some(x) = some_number {
    println!("{}", x);
}
```

---

# 11. Option 和 Result：Rust 的空值与错误处理

Rust 没有传统意义上的 `null`。

这是 Rust 很安全的一个原因。

---

## 11.1 `Option<T>`

表示“可能有值，也可能没有值”。

定义大致像这样：

```rust
enum Option<T> {
    Some(T),
    None,
}
```

---

## 11.2 为什么不用 `null`？

因为 `null` 很危险。
程序员经常忘记判断，结果运行时崩掉。

Rust 逼你明确处理：

- 有值：`Some`
- 没值：`None`

---

## 11.3 示例

```rust
fn main() {
    let x = Some(5);
    let y: Option<i32> = None;

    match x {
        Some(n) => println!("有值: {}", n),
        None => println!("没值"),
    }

    match y {
        Some(n) => println!("有值: {}", n),
        None => println!("没值"),
    }
}
```

---

## 11.4 `Result<T, E>`

表示“成功或失败”

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

---

## 11.5 示例

```rust
fn divide(a: f64, b: f64) -> Result<f64, String> {
    if b == 0.0 {
        Err(String::from("除数不能为 0"))
    } else {
        Ok(a / b)
    }
}

fn main() {
    let result = divide(10.0, 2.0);

    match result {
        Ok(value) => println!("结果: {}", value),
        Err(err) => println!("错误: {}", err),
    }
}
```

---

## 11.6 `?` 操作符

这是 Rust 处理错误最常用的写法。

```rust
use std::fs;

fn read_file() -> Result<String, std::io::Error> {
    let content = fs::read_to_string("hello.txt")?;
    Ok(content)
}
```

意思是：

- 如果成功，就拿到值继续执行
- 如果失败，就立刻返回错误

你可以理解成：

> “帮我自动做错误传递。”

---

## 11.7 `unwrap()` 和 `expect()`

```rust
let x = Some(5).unwrap();
```

如果是 `None`，程序会直接 panic。

---

### 新手建议

- 学习阶段可以少量用
- 正式代码不要乱用
- 更推荐 `match`、`if let`、`?`

---

# 12. 常用集合：Vec、String、HashMap

---

## 12.1 `Vec<T>`：动态数组

```rust
fn main() {
    let mut nums = Vec::new();

    nums.push(1);
    nums.push(2);
    nums.push(3);

    println!("{:?}", nums);
}
```

也可以直接初始化：

```rust
let nums = vec![1, 2, 3];
```

---

## 12.2 访问元素

```rust
let nums = vec![10, 20, 30];

let a = nums[0];
println!("{}", a);
```

但这种方式如果越界会 panic。

更安全的是：

```rust
match nums.get(1) {
    Some(value) => println!("{}", value),
    None => println!("没有这个元素"),
}
```

---

## 12.3 遍历 Vec

```rust
let nums = vec![1, 2, 3];

for n in &nums {
    println!("{}", n);
}
```

---

## 12.4 修改 Vec 中元素

```rust
let mut nums = vec![1, 2, 3];

for n in &mut nums {
    *n += 10;
}

println!("{:?}", nums);
```

`*n` 表示解引用，取到真正的值。

---

## 12.5 `String`

```rust
fn main() {
    let mut s = String::from("hello");
    s.push_str(" world");
    println!("{}", s);
}
```

---

## 12.6 `HashMap`

```rust
use std::collections::HashMap;

fn main() {
    let mut scores = HashMap::new();

    scores.insert(String::from("Alice"), 95);
    scores.insert(String::from("Bob"), 88);

    match scores.get("Alice") {
        Some(score) => println!("Alice: {}", score),
        None => println!("没找到"),
    }
}
```

---

# 13. 循环器 Iterator 与闭包 Closure

这部分是 Rust 很常用的“现代写法”。

---

## 13.1 什么是迭代器？

你可以理解成：

> “一种按顺序处理集合元素的方式”

---

## 13.2 最简单例子

```rust
let nums = vec![1, 2, 3];

for n in nums.iter() {
    println!("{}", n);
}
```

---

## 13.3 `map`

```rust
fn main() {
    let nums = vec![1, 2, 3];

    let doubled: Vec<i32> = nums.iter().map(|x| x * 2).collect();

    println!("{:?}", doubled);
}
```

解释：

- `iter()`：按引用遍历
- `map(...)`：把每个元素变一下
- `collect()`：收集成新集合

---

## 13.4 `filter`

```rust
fn main() {
    let nums = vec![1, 2, 3, 4, 5];

    let even: Vec<&i32> = nums.iter().filter(|x| **x % 2 == 0).collect();

    println!("{:?}", even);
}
```

---

## 13.5 闭包是什么？

闭包可以先理解成“简写函数”。

```rust
let add = |a, b| a + b;
println!("{}", add(2, 3));
```

---

## 13.6 `iter` / `into_iter` / `iter_mut` 区别

这是初学者很容易混的点。

---

### `iter()`

借用元素，不拿走所有权

```rust
for x in nums.iter() {}
```

---

### `iter_mut()`

可变借用元素

```rust
for x in nums.iter_mut() {}
```

---

### `into_iter()`

拿走集合所有权

```rust
for x in nums.into_iter() {}
```

之后 `nums` 不能再用了。

---

# 14. 模块 Module 与包 Cargo

Rust 项目组织代码主要靠：

- crate
- module
- package

新手先掌握最常用的就够了。

---

## 14.1 一个项目就是一个 package

Cargo 项目中最重要的是 `Cargo.toml`

例如：

```toml
[package]
name = "hello_rust"
version = "0.1.0"
edition = "2024"

[dependencies]
```

---

## 14.2 模块的简单写法

假设目录是：

```text
src/
├── main.rs
└── math.rs
```

`math.rs`：

```rust
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

`main.rs`：

```rust
mod math;

fn main() {
    let result = math::add(2, 3);
    println!("{}", result);
}
```

---

## 14.3 `pub` 是什么？

默认情况下，模块内的内容是私有的。

如果想让外部使用，要加 `pub`

```rust
pub fn add(...) -> ...
```

---

## 14.4 `use`

用于简化路径：

```rust
use std::collections::HashMap;
```

这样后面就不用写完整路径了。

---

# 15. Trait 和泛型 Generic

---

## 15.1 泛型是什么？

泛型就是：

> “先不指定具体类型，写一个通用模板”

比如：

```rust
fn largest<T: PartialOrd + Copy>(list: &[T]) -> T {
    let mut largest = list[0];

    for &item in list {
        if item > largest {
            largest = item;
        }
    }

    largest
}
```

这个函数可以处理很多类型，只要它们支持比较和复制。

---

## 15.2 Trait 是什么？

你可以把 Trait 理解成：

> “一种能力约定”
> “谁实现了这个 Trait，谁就会这些方法”

---

## 15.3 示例

```rust
trait Summary {
    fn summarize(&self) -> String;
}

struct Article {
    title: String,
}

impl Summary for Article {
    fn summarize(&self) -> String {
        format!("文章标题: {}", self.title)
    }
}
```

使用：

```rust
fn main() {
    let article = Article {
        title: String::from("Rust 入门"),
    };

    println!("{}", article.summarize());
}
```

---

## 15.4 Trait 有点像接口，但不完全一样

可以先简单理解为“接口”，这样足够入门。

---

## 15.5 Trait 约束

```rust
fn print_summary<T: Summary>(item: &T) {
    println!("{}", item.summarize());
}
```

表示参数 `item` 必须实现 `Summary`

---

# 16. 生命周期 Lifetime：先理解，不用怕

很多新手一看到生命周期就头大。

其实先抓住一句话就行：

> 生命周期不是让数据活更久，
> 而是告诉编译器“引用之间谁至少活到什么时候”。

---

## 16.1 为什么会有生命周期？

因为 Rust 要确保：

- 引用不会指向已经被释放的数据
- 不会出现悬垂引用

---

## 16.2 错误示例

```rust
fn main() {
    let r;

    {
        let x = 5;
        r = &x;
    }

    // println!("{}", r); // 报错
}
```

因为 `x` 已经没了，`r` 不能再指向它。

---

## 16.3 典型生命周期函数

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

你可以这样理解：

- `x` 和 `y` 都至少活 `'a`
- 返回值也至少活 `'a`
- 返回值不会比输入活得更久

---

## 16.4 新手建议

- 刚开始别死磕
- 先多写代码
- 大多数情况下编译器会自动推断
- 等你熟悉引用后，再回头看生命周期会轻松很多

---

# 17. 测试、格式化、检查

Rust 的工程工具非常好用。

---

## 17.1 格式化代码

```bash
cargo fmt
```

自动整理代码格式。

---

## 17.2 静态检查

```bash
cargo clippy
```

它会像一个“挑毛病很厉害的老师”，帮你发现代码问题。

---

## 17.3 运行测试

```bash
cargo test
```

---

## 17.4 写测试

```rust
fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 3), 5);
    }
}
```

---

# 18. 适合新手的练手项目

下面这些项目非常适合巩固 Rust。

---

## 1. 猜数字游戏

练习内容：

- 输入输出
- 随机数
- `match`
- 错误处理

---

## 2. 命令行 ToDo

练习内容：

- `Vec`
- `String`
- 文件读写
- 模块拆分

---

## 3. 学生成绩管理系统

练习内容：

- `struct`
- `HashMap`
- 枚举
- 方法 `impl`

---

## 4. 简单计算器

练习内容：

- 字符串解析
- `match`
- 错误处理

---

## 5. 通讯录

练习内容：

- 增删改查
- 模块设计
- 持久化存储

---

# 19. Rust 学习路线建议

---

## 第一阶段：先能写出来

你先把这些学会：

- 变量
- 函数
- if / loop / for
- `String`
- `Vec`
- `struct`
- `enum`
- `match`
- `Option`
- `Result`

这个阶段目标是：

> **能看懂基础 Rust 代码，能写小程序**

---

## 第二阶段：重点攻克所有权

集中练：

- move
- borrow
- `&T`
- `&mut T`
- `String` vs `&str`
- 切片
- 编译器报错阅读能力

这个阶段目标是：

> **看见借用报错不再慌**

---

## 第三阶段：工程化能力

学习：

- `cargo`
- 模块拆分
- 测试
- `clippy`
- `fmt`
- 第三方库使用

这个阶段目标是：

> **能写一个完整的小项目**

---

## 第四阶段：进阶

再继续学：

- 泛型
- trait
- 生命周期
- 智能指针（`Box`、`Rc`、`RefCell`）
- 并发
- async / await

---

# 20. 新手最常见的坑

---

## 坑 1：以为赋值就是复制

```rust
let s1 = String::from("hi");
let s2 = s1;
```

这里通常是 move，不是复制。

解决思路：

- 想保留两个值，用 `clone()`
- 只想看一下，用引用 `&`

---

## 坑 2：`String` 和 `&str` 分不清

记忆方式：

- `String`：拥有所有权
- `&str`：借来的字符串视图

---

## 坑 3：可变借用和不可变借用冲突

```rust
let r1 = &s;
let r2 = &mut s;
```

Rust 不允许一边读一边改。

---

## 坑 4：乱用 `unwrap()`

`unwrap()` 很省事，但出问题会直接 panic。

建议：

- 学习阶段可以用
- 正式代码多用 `match`、`if let`、`?`

---

## 坑 5：看到生命周期就放弃

其实大部分时候：

- 先写正常代码
- 看编译器提示
- 再逐步理解

不要一开始就陷进去。

---

# 一份非常实用的 Rust 学习顺序

如果你现在刚开始，可以按这个顺序来：

```text
1. 安装 Rust，学会 cargo run / cargo check
2. 变量、函数、if、for
3. String、Vec、HashMap
4. struct、enum、match
5. Option、Result、错误处理
6. 所有权、借用、引用、切片
7. 模块、测试、clippy、fmt
8. trait、泛型、生命周期
9. 小项目练手
10. 并发 / async / Web 开发
```

---

# 给新手的学习建议

1. **不要只看不写**
   - 每学一个知识点，自己敲一遍

2. **被编译器报错很正常**
   - Rust 编译器不是在刁难你
   - 它是在提前帮你抓 bug

3. **所有权要反复练**
   - 这是 Rust 的灵魂
   - 不要想着一次看懂

4. **先学常用，再学高级**
   - 先别急着碰 async、宏、unsafe

5. **一定要做项目**
   - 不做项目，知识点很容易散

---

# 最后总结

Rust 入门最重要的，不是把所有语法背下来，而是理解这几个核心：

- **Rust 默认安全**
- **用所有权管理内存**
- **借用让你不用拿走所有权**
- **`Option` / `Result` 强迫你处理空值和错误**
- **Cargo 让工程开发很舒服**

如果你把下面这些真正弄懂：

- `String` 和 `&str`
- move / borrow / reference
- `struct` / `enum` / `match`
- `Option` / `Result`

那你就已经正式入门 Rust 了。

---

# 推荐你的下一步

如果你愿意，我可以继续直接给你配套整理下面任意一种内容：

1. **Rust 30 天学习计划**
2. **Rust 新手练习题 30 道**
3. **Rust 所有权专项教程**
4. **Rust 常用语法速查表**
5. **用 Rust 做一个小项目的完整实战教程**

如果你想要，我下一条可以继续用 **Markdown** 给你。
