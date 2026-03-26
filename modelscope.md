# Pydantic 与 ModelScope SDK 新手到熟练教程

本文面向 Python 初学者或刚接触 AI 工程的开发者，目标是两件事：

1. 学会用 `Pydantic` 做数据建模、校验、序列化。
2. 学会用 `ModelScope SDK` 下载模型、调用推理、管理仓库与常见工程流程。

我会尽量用通俗语言来讲，不默认你已经熟悉框架内部原理。

## 一、先说结论：这两个库分别解决什么问题

### 1. Pydantic 是做什么的

一句话理解：

`Pydantic = 帮你把“乱七八糟的输入数据”变成“结构清晰、类型可靠的 Python 对象”`

典型场景：

- 接口入参校验
- 配置文件读取
- JSON 数据解析
- 数据清洗
- 给 AI 请求参数做约束

比如用户传过来：

```python
{"name": "Tom", "age": "18", "email": "tom@example.com"}
```

你希望在代码里拿到的是：

- `name` 一定是字符串
- `age` 最终变成整数 `18`
- `email` 格式合法

这正是 Pydantic 擅长的事情。

### 2. ModelScope SDK 是做什么的

一句话理解：

`ModelScope SDK = 帮你从魔搭社区下载模型/数据集，并用统一接口进行推理、训练、管理仓库`

典型场景：

- 下载开源模型到本地
- 用 `pipeline` 快速跑推理
- 下载数据集
- 通过 Hub API 管理模型仓库
- 上传模型文件或训练产物

如果你把 Hugging Face 看成一个模型社区，那么 ModelScope 可以理解为阿里系生态里非常重要的模型社区和工具链之一。

## 二、学习路线建议

建议顺序不要反过来。

### 推荐顺序

1. 先学 Pydantic
2. 再学 ModelScope SDK
3. 最后把两者结合起来

原因很简单：

- Pydantic 负责“把输入参数管好”
- ModelScope 负责“真正去下载模型、调用推理”

现实工程里，二者经常一起用。

例如：

- 用 Pydantic 校验“模型名、revision、cache_dir、device”等参数
- 再把校验后的结果传给 ModelScope SDK

## 三、Pydantic 入门

## 3.1 安装

建议使用 Pydantic v2：

```bash
pip install pydantic
```

查看版本：

```bash
python -c "import pydantic; print(pydantic.__version__)"
```

## 3.2 你首先要理解的核心概念

Pydantic 最核心的类是 `BaseModel`。

你可以把它理解成：

“一个带类型检查、自动转换、错误提示、序列化能力的增强版数据类”

最简单的例子：

```python
from pydantic import BaseModel


class User(BaseModel):
    name: str
    age: int
    is_admin: bool = False


user = User(name="Alice", age="20")
print(user)
print(user.age, type(user.age))
```

输出重点：

- `age="20"` 会被自动转换成整数 `20`
- `is_admin` 没传时，会使用默认值 `False`

这说明 Pydantic 不只是“报错”，它还会“解析”和“转换”。

## 3.3 Pydantic 最常用的能力

### 1. 定义字段

```python
from pydantic import BaseModel


class Product(BaseModel):
    title: str
    price: float
    stock: int = 0
```

字段规则：

- 有类型注解的属性会成为字段
- 有默认值就是可选输入
- 没默认值就是必填

### 2. 自动类型转换

```python
from pydantic import BaseModel


class Order(BaseModel):
    order_id: int
    amount: float


order = Order(order_id="1001", amount="99.8")
print(order)
```

Pydantic 会尽量把字符串转成目标类型。

注意：

- 这叫“解析”比“纯验证”更准确
- 如果你不想自动转换，可以启用严格模式，后面会讲

### 3. 校验失败会抛出清晰错误

```python
from pydantic import BaseModel, ValidationError


class User(BaseModel):
    name: str
    age: int


try:
    User(name="Tom", age="abc")
except ValidationError as e:
    print(e)
```

你会看到非常清楚的报错：

- 哪个字段错了
- 期待什么类型
- 实际收到什么值

这对接口开发和数据清洗特别有用。

## 3.4 用 `Field` 给字段加约束

很多时候，只有类型还不够，你还需要范围、长度、描述信息。

```python
from pydantic import BaseModel, Field


class Student(BaseModel):
    name: str = Field(min_length=2, max_length=20, description="学生姓名")
    age: int = Field(ge=0, le=150, description="年龄")
    score: float = Field(ge=0, le=100, description="考试成绩")
```

常见参数：

- `default` 或直接写 `= ...`
- `description`
- `title`
- `examples`
- `ge` / `gt`：大于等于 / 大于
- `le` / `lt`：小于等于 / 小于
- `min_length` / `max_length`
- `json_schema_extra`

你可以把 `Field(...)` 理解成：

“在类型之外，再补充更细的业务规则”

## 3.5 常见类型示例

```python
from typing import Optional, List, Dict
from pydantic import BaseModel


class Blog(BaseModel):
    title: str
    tags: List[str]
    metadata: Dict[str, str]
    summary: Optional[str] = None
```

说明：

- `List[str]` 表示字符串列表
- `Dict[str, str]` 表示键值都是字符串的字典
- `Optional[str] = None` 表示这个字段可以为空

## 3.6 嵌套模型

这是 Pydantic 非常常见的用法。

```python
from pydantic import BaseModel


class Address(BaseModel):
    city: str
    zipcode: str


class User(BaseModel):
    name: str
    address: Address


data = {
    "name": "Alice",
    "address": {
        "city": "Shanghai",
        "zipcode": "200000"
    }
}

user = User(**data)
print(user)
print(user.address.city)
```

你会得到一个真正的 `Address` 对象，而不是原始字典。

这就是 Pydantic 很强的地方：

它能递归地把复杂结构转换成可靠对象。

## 3.7 列表里嵌套模型

```python
from pydantic import BaseModel


class Item(BaseModel):
    name: str
    price: float


class Cart(BaseModel):
    items: list[Item]


cart = Cart(items=[
    {"name": "Keyboard", "price": "199.0"},
    {"name": "Mouse", "price": 59}
])

print(cart)
```

这在接口返回值、订单数据、批量任务里非常常见。

## 四、Pydantic 进阶

## 4.1 `model_dump()` 和 `model_dump_json()`

创建模型后，常见需求是再把它转回字典或 JSON。

```python
from pydantic import BaseModel


class User(BaseModel):
    name: str
    age: int


user = User(name="Tom", age="18")

print(user.model_dump())
print(user.model_dump_json())
```

你可以这样理解：

- `model_dump()`：转 Python 字典
- `model_dump_json()`：转 JSON 字符串

这两个方法在写接口、保存日志、缓存数据时非常实用。

## 4.2 `model_validate()` 和 `model_validate_json()`

Pydantic v2 推荐用这些方法从原始数据创建模型。

```python
from pydantic import BaseModel


class User(BaseModel):
    name: str
    age: int


data = {"name": "Jerry", "age": "23"}
user = User.model_validate(data)
print(user)
```

如果原始数据是 JSON 字符串：

```python
from pydantic import BaseModel


class User(BaseModel):
    name: str
    age: int


json_str = '{"name": "Jerry", "age": "23"}'
user = User.model_validate_json(json_str)
print(user)
```

什么时候推荐这么写：

- 你明确是在“校验外部输入”
- 你希望代码语义更清楚
- 你要处理 JSON 文本

## 4.3 字段校验器 `field_validator`

当内置规则不够时，就要自定义校验。

```python
from pydantic import BaseModel, field_validator


class User(BaseModel):
    username: str

    @field_validator("username")
    @classmethod
    def username_must_not_contain_space(cls, value: str) -> str:
        if " " in value:
            raise ValueError("username 不能包含空格")
        return value
```

作用：

- 拦截字段值
- 自定义报错
- 做额外清洗

例如你还可以：

- 去掉首尾空格
- 转小写
- 检查手机号格式
- 检查文件后缀

## 4.4 模型级校验器 `model_validator`

当多个字段之间存在关系时，用模型级校验更合适。

```python
from pydantic import BaseModel, model_validator


class RegisterForm(BaseModel):
    password: str
    password_repeat: str

    @model_validator(mode="after")
    def check_passwords_match(self):
        if self.password != self.password_repeat:
            raise ValueError("两次密码不一致")
        return self
```

适合这种场景：

- 两次密码必须一致
- 开始时间必须早于结束时间
- `min_value` 不能大于 `max_value`

## 4.5 严格模式 `ConfigDict(strict=True)`

默认情况下，Pydantic 会尽量转换类型。

有些时候这很方便，但有些时候你不想让 `"123"` 自动变成 `123`。

```python
from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    model_config = ConfigDict(strict=True)

    age: int
```

这样再传：

```python
User(age="18")
```

就会报错。

严格模式适合：

- 金融数据
- 配置管理
- 高可靠接口
- 你不希望“隐式转换”掩盖脏数据的时候

## 4.6 计算字段 `computed_field`

有些字段不是输入来的，而是根据别的字段算出来的。

```python
from pydantic import BaseModel, computed_field


class Rectangle(BaseModel):
    width: float
    height: float

    @computed_field
    @property
    def area(self) -> float:
        return self.width * self.height


rect = Rectangle(width=3, height=4)
print(rect.model_dump())
```

输出里会包含 `area`。

这个特性很适合：

- 金额汇总
- 面积、体积、平均分
- 接口里补充派生字段

## 4.7 `TypeAdapter`

很多初学者只知道 `BaseModel`，但 `TypeAdapter` 也非常实用。

它适合这种情况：

- 你想校验 `list[int]`
- 你想校验 `list[User]`
- 你不想为了一个简单类型专门定义模型类

```python
from pydantic import TypeAdapter


adapter = TypeAdapter(list[int])
result = adapter.validate_python(["1", 2, "3"])
print(result)
```

输出会是：

```python
[1, 2, 3]
```

很适合做：

- 批量参数解析
- 简单配置解析
- 工具函数中的轻量校验

## 4.8 JSON Schema

Pydantic 可以自动生成 JSON Schema。

```python
from pydantic import BaseModel, Field


class User(BaseModel):
    name: str = Field(description="用户名")
    age: int = Field(ge=0, description="年龄")


print(User.model_json_schema())
```

这对下面这些场景很重要：

- 自动生成 API 文档
- 给前端约定数据结构
- 让大模型按 Schema 输出 JSON

## 五、Pydantic 最常见实战

## 5.1 读取配置

```python
from pydantic import BaseModel, Field


class AppConfig(BaseModel):
    app_name: str
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)


raw_config = {
    "app_name": "demo-service",
    "debug": "true",
    "port": "9000"
}

config = AppConfig.model_validate(raw_config)
print(config)
```

这样可以避免很多“配置读到了，但是类型全错”的问题。

## 5.2 校验接口入参

```python
from pydantic import BaseModel, Field, field_validator


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=6)

    @field_validator("username")
    @classmethod
    def no_space(cls, value: str) -> str:
        if " " in value:
            raise ValueError("用户名不能有空格")
        return value
```

## 5.3 清洗 AI 任务参数

这是后面和 ModelScope 结合时很有用的一步。

```python
from typing import Optional
from pydantic import BaseModel, Field


class InferenceConfig(BaseModel):
    model_id: str = Field(min_length=3, description="模型 ID")
    revision: str = "master"
    cache_dir: Optional[str] = None
    device: str = "cpu"
```

当你写模型推理脚本时，可以先把参数校验干净，再调用真正的 SDK。

## 六、Pydantic 常见坑

### 1. 不要把它只理解成“类型检查器”

Pydantic 更准确的定位是：

- 输入解析
- 数据转换
- 约束校验
- 序列化

### 2. 默认会做类型转换

这是优点，也是坑。

例如：

```python
age="18"
```

默认可能通过。

如果你的业务不允许这种宽松行为，请使用严格模式。

### 3. 字段顺序有时影响校验器可见数据

官方文档明确提到，字段验证时要注意字段定义顺序，因为你可能在校验一个字段时访问另一个尚未完成校验的字段。

### 4. `computed_field` 只负责序列化展示，不负责复杂业务状态管理

它适合“派生值”，不适合拿来做带副作用的逻辑。

## 七、ModelScope SDK 入门

## 7.1 它和 Pydantic 的关系

Pydantic 解决“数据入口管理”，ModelScope 解决“模型生态使用”。

你可以把它们理解成：

- Pydantic：管参数
- ModelScope：干活

## 7.2 安装

最基础安装：

```bash
pip install modelscope
```

官方仓库 README 还给出了按领域安装的方式，例如：

```bash
pip install modelscope[multi-modal]
pip install modelscope[nlp] -f https://modelscope.oss-cn-beijing.aliyuncs.com/releases/repo.html
pip install modelscope[cv] -f https://modelscope.oss-cn-beijing.aliyuncs.com/releases/repo.html
pip install modelscope[audio] -f https://modelscope.oss-cn-beijing.aliyuncs.com/releases/repo.html
```

如果你只是先学 SDK 基础，先装最小版本就够了。

## 7.3 版本说明

写这份教程时，我查阅了 ModelScope 官方 GitHub Releases 页面。页面显示的最新 release 是 `v1.33.0`，发布时间显示为 `12 月 10 日`，结合当前日期我推断是 `2025-12-10`。

该版本里和初学者较相关的更新包括：

- `snapshot_download` 新增 `DEFAULT_MAX_WORKERS` 相关并发控制
- Hub API 新增 `set_repo_visibility`
- `upload_folder` 默认忽略规则得到修复

这说明一个实践原则：

学习 ModelScope 时，最好留意版本差异，因为 Hub 和下载上传能力更新得比较快。

## 7.4 先掌握两个最核心的能力

如果你刚开始学，只要先掌握下面两个就够了：

1. `snapshot_download`
2. `pipeline`

原因：

- `snapshot_download` 负责“把模型下载到本地”
- `pipeline` 负责“直接跑起来”

这两个就是新手最重要的起点。

## 八、ModelScope 最常用能力 1：下载模型

## 8.1 `snapshot_download`

最常见的下载写法：

```python
from modelscope import snapshot_download


model_dir = snapshot_download("Qwen/Qwen2.5-0.5B-Instruct")
print(model_dir)
```

它会做什么：

- 连接 ModelScope Hub
- 下载对应模型仓库的文件
- 缓存到本地目录
- 返回本地路径

返回值通常是一个字符串路径，你后续可以把它交给别的库继续加载。

例如：

```python
from modelscope import snapshot_download

model_dir = snapshot_download("LLM-Research/Llama-3.3-70B-Instruct")
print(model_dir)
```

## 8.2 指定版本 `revision`

很多模型仓库不止一个版本。

```python
from modelscope import snapshot_download


model_dir = snapshot_download(
    "qwen/Qwen-VL-Chat",
    revision="v1.0.0"
)
```

什么时候要指定：

- 线上部署要求可复现
- 你不希望默认分支变化影响结果
- 教程或团队文档固定某个版本

建议：

- 实验阶段可以先不写
- 真正上线时最好明确 `revision`

## 8.3 指定缓存目录

```python
from modelscope import snapshot_download


model_dir = snapshot_download(
    "Qwen/Qwen2.5-0.5B-Instruct",
    cache_dir="./model_cache"
)
```

这很适合：

- 你想把模型放到特定磁盘
- 服务器磁盘规划明确
- 你不想使用默认缓存目录

## 8.4 常见下载问题

### 1. 下载慢

原因通常包括：

- 模型大
- 网络慢
- 文件很多

### 2. 下载失败后如何处理

实务里一般建议：

- 先重试
- 检查网络
- 检查权限
- 检查模型名是否正确
- 必要时固定 `revision`

### 3. 默认分支变化带来的不一致

这点在新版本 release note 里也体现出来了。ModelScope 最近调整过默认分支版本策略，所以更推荐你在关键项目里显式指定 `revision`。

## 九、ModelScope 最常用能力 2：快速推理

## 9.1 `pipeline`

官方 README 里给出了非常典型的例子：

```python
from modelscope.pipelines import pipeline


word_segmentation = pipeline(
    "word-segmentation",
    model="damo/nlp_structbert_word-segmentation_chinese-base"
)

result = word_segmentation("今天天气不错，适合出去游玩")
print(result)
```

你可以这样理解 `pipeline`：

“我不用关心底层模型怎么实例化、预处理怎么做、后处理怎么做，你先帮我跑通”

这非常适合新手。

## 9.2 图像任务示例

官方 README 还给了人像抠图示例：

```python
import cv2
from modelscope.pipelines import pipeline


portrait_matting = pipeline("portrait-matting")
result = portrait_matting(
    "https://modelscope.oss-cn-beijing.aliyuncs.com/test/images/image_matting.png"
)
cv2.imwrite("result.png", result["output_img"])
```

这个例子说明：

- `pipeline` 适用于不同任务
- 输入可以是文本、图片、音频等
- 输出一般是字典

## 9.3 新手如何选择任务

初学者建议按这个顺序试：

1. 文本任务
2. 图像任务
3. 多模态任务
4. 大模型生成任务

原因：

- 文本任务依赖更轻
- 图像任务可能要额外装库
- 多模态和大模型更容易遇到显存、依赖、版本问题

## 十、ModelScope 进阶：数据集与训练

## 10.1 `MsDataset`

官方 README 示例中展示了：

```python
from modelscope.msdatasets import MsDataset


train_dataset = MsDataset.load("chinese-poetry-collection", split="train")
```

你可以把它理解成：

“从 ModelScope 社区加载数据集”

适合：

- 微调任务
- 评测任务
- 数据预处理流水线

## 10.2 `Trainer`

README 里也给出了一个训练示例，核心思路是：

```python
from modelscope.metainfo import Trainers
from modelscope.msdatasets import MsDataset
from modelscope.trainers import build_trainer


train_dataset = MsDataset.load("chinese-poetry-collection", split="train").remap_columns({"text1": "src_txt"})
eval_dataset = MsDataset.load("chinese-poetry-collection", split="test").remap_columns({"text1": "src_txt"})

trainer = build_trainer(
    name=Trainers.gpt3_trainer,
    default_args={
        "model": "damo/nlp_gpt3_text-generation_1.3B",
        "train_dataset": train_dataset,
        "eval_dataset": eval_dataset,
        "max_epochs": 10,
        "work_dir": "./gpt3_poetry"
    }
)

trainer.train()
```

新手怎么理解这个流程：

1. 先把数据集准备好
2. 再指定模型
3. 再构建 trainer
4. 最后调用 `train()`

不过要注意：

- 训练对环境要求高很多
- 依赖和显存压力也明显更大

所以对于初学者，我建议先把推理与下载熟练了，再碰训练。

## 十一、ModelScope Hub 能力

除了推理，ModelScope 还包含 Hub 相关能力，这也是 SDK 很重要的一部分。

## 11.1 你什么时候需要 Hub API

当你要做这些事时，就不是只会 `pipeline` 就够了：

- 登录社区
- 查询仓库信息
- 上传模型文件
- 上传训练日志
- 设置仓库可见性

## 11.2 为什么要关注版本更新

根据我查到的官方 release note，近几个版本里，Hub 相关功能更新很频繁，比如：

- `set_repo_visibility`
- `upload_folder` 修复
- 定时自动上传
- `repo_info` 能力增强
- `list_datasets` 端点调整

所以如果你写的是正式工程，建议做两件事：

1. 固定 ModelScope 版本
2. 为 Hub 相关代码写一层自己的封装

这样以后升级更稳。

## 11.3 上传与仓库管理的理解方式

虽然不同版本 API 细节可能变化，但你可以先建立一个稳定心智模型：

- 下载模型：`snapshot_download`
- 查询仓库：Hub API
- 上传文件夹：`upload_folder`
- 管理可见性：Hub API 的 repo 管理接口

工程上不要把这些调用散落在各个脚本里，最好集中封装。

## 十二、Pydantic + ModelScope 联合实战

这一节最重要，因为真实项目通常是这样写的。

## 12.1 用 Pydantic 管理 ModelScope 推理参数

```python
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ModelScopeConfig(BaseModel):
    model_id: str = Field(min_length=3, description="模型仓库 ID")
    revision: str = Field(default="master", description="模型版本")
    cache_dir: Optional[str] = Field(default=None, description="缓存目录")
    task: str = Field(description="任务名")

    @field_validator("model_id")
    @classmethod
    def validate_model_id(cls, value: str) -> str:
        if "/" not in value:
            raise ValueError("model_id 应为 owner/name 形式，例如 Qwen/Qwen2.5-0.5B-Instruct")
        return value
```

这段代码的好处是：

- 模型名不规范会提前报错
- 参数结构更清晰
- 后续 CLI、接口、配置文件都能复用

## 12.2 把配置交给下载逻辑

```python
from modelscope import snapshot_download


def download_model(cfg: ModelScopeConfig) -> str:
    return snapshot_download(
        cfg.model_id,
        revision=cfg.revision,
        cache_dir=cfg.cache_dir
    )
```

## 12.3 再把配置交给推理逻辑

```python
from modelscope.pipelines import pipeline


def build_pipeline(cfg: ModelScopeConfig):
    return pipeline(cfg.task, model=cfg.model_id)
```

注意：

有些场景你会传 `model=cfg.model_id`

有些场景你会先下载拿到 `model_dir`，再传本地路径。

实际使用中，两种都很常见。

## 12.4 一个完整的小示例

```python
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from modelscope import snapshot_download
from modelscope.pipelines import pipeline


class InferenceJob(BaseModel):
    task: str
    model_id: str
    revision: str = "master"
    cache_dir: Optional[str] = None
    text: str = Field(min_length=1)

    @field_validator("model_id")
    @classmethod
    def check_model_id(cls, value: str) -> str:
        if "/" not in value:
            raise ValueError("model_id 必须包含 '/'")
        return value


job = InferenceJob(
    task="word-segmentation",
    model_id="damo/nlp_structbert_word-segmentation_chinese-base",
    text="今天天气不错，适合出去游玩"
)

model_dir = snapshot_download(
    job.model_id,
    revision=job.revision,
    cache_dir=job.cache_dir
)

pipe = pipeline(job.task, model=model_dir)
result = pipe(job.text)
print(result)
```

这个例子体现了一个很实用的工程模式：

- 先用 Pydantic 把参数守住
- 再调用 ModelScope 真正执行任务

## 十三、从入门到熟练的学习阶段划分

## 阶段 1：入门

你至少要掌握：

- `BaseModel`
- `Field`
- `model_dump`
- `model_validate`
- `field_validator`
- `snapshot_download`
- `pipeline`

如果这些你已经会了，已经能写很多简单脚本了。

## 阶段 2：熟练

你应该进一步掌握：

- 嵌套模型
- `model_validator`
- 严格模式
- `computed_field`
- `TypeAdapter`
- `MsDataset`
- `Trainer`
- Hub 相关基础概念

这时你已经能写：

- 中小型工具脚本
- 服务配置系统
- 基础 AI 推理服务
- 批量模型下载与调用任务

## 阶段 3：工程化

你要开始关注：

- 固定依赖版本
- 固定模型 `revision`
- 统一异常处理
- 下载缓存策略
- 配置文件管理
- 日志与重试
- 把 Hub 能力封装成独立模块

真正的“熟练”，不是记住更多 API，而是把这些 API 组织得稳定、可维护。

## 十四、新手最容易犯的错误

### Pydantic 部分

- 把它当成普通 dataclass，用了却不做输入校验
- 忽略默认类型转换带来的隐式行为
- 复杂字段关系还在字段级校验器里硬写
- 不会用 `model_dump()` 和 `model_validate()`

### ModelScope 部分

- 直接上大模型，结果卡在环境和显存
- 不固定 `revision`
- 模型下载、模型加载、推理逻辑写成一团
- 忽略版本差异
- 没有为 Hub 操作加异常处理

## 十五、给初学者的实战练习

建议你按这个顺序做。

### 练习 1：Pydantic 基础

写一个 `User` 模型，要求：

- `name` 长度 2 到 20
- `age` 在 0 到 120
- `email` 必填

然后测试三种输入：

- 正常输入
- `age="18"`
- `age="abc"`

目标：

- 理解自动转换和报错

### 练习 2：Pydantic 嵌套模型

写一个订单模型：

- `Order`
- `User`
- `Item`

要求：

- 一个订单里有多个商品
- 每个商品包含 `name` 和 `price`

目标：

- 理解嵌套解析

### 练习 3：ModelScope 下载模型

选一个体积较小的文本模型，尝试：

- 下载
- 打印本地路径
- 指定 `cache_dir`
- 指定 `revision`

目标：

- 熟悉 `snapshot_download`

### 练习 4：ModelScope `pipeline`

找一个文本任务，跑一次推理。

目标：

- 熟悉最短路径跑通 AI 推理

### 练习 5：二者结合

写一个脚本：

- Pydantic 负责读取和校验参数
- ModelScope 负责执行下载和推理

目标：

- 建立“参数层”和“执行层”分离的意识

## 十六、推荐项目结构

当你开始写正式项目时，可以参考下面这个结构：

```text
project/
├─ config.py
├─ schemas.py
├─ downloader.py
├─ inference.py
├─ main.py
└─ requirements.txt
```

职责建议：

- `schemas.py`：放 Pydantic 模型
- `config.py`：放配置加载逻辑
- `downloader.py`：封装 `snapshot_download`
- `inference.py`：封装 `pipeline`
- `main.py`：程序入口

这样代码会清楚很多。

## 十七、最后给你一个最小可用模板

```python
from typing import Optional
from pydantic import BaseModel, Field, ValidationError
from modelscope import snapshot_download
from modelscope.pipelines import pipeline


class JobConfig(BaseModel):
    task: str = Field(description="任务名")
    model_id: str = Field(description="模型 ID，例如 damo/nlp_structbert_word-segmentation_chinese-base")
    input_text: str = Field(min_length=1, description="输入文本")
    revision: str = "master"
    cache_dir: Optional[str] = None


def run_job(raw_data: dict):
    try:
        cfg = JobConfig.model_validate(raw_data)
    except ValidationError as e:
        print("参数错误：")
        print(e)
        return

    model_dir = snapshot_download(
        cfg.model_id,
        revision=cfg.revision,
        cache_dir=cfg.cache_dir
    )

    pipe = pipeline(cfg.task, model=model_dir)
    result = pipe(cfg.input_text)
    print(result)


if __name__ == "__main__":
    run_job({
        "task": "word-segmentation",
        "model_id": "damo/nlp_structbert_word-segmentation_chinese-base",
        "input_text": "今天天气不错，适合出去游玩"
    })
```

这个模板已经体现了比较合理的工程习惯：

- 输入先校验
- 下载与推理解耦
- 错误信息清楚

## 十八、总结

如果你只记住一句话，请记住这一句：

`Pydantic 负责把输入变干净，ModelScope 负责把模型能力跑起来。`

把这句话吃透，你就知道为什么它们经常一起出现。

### 你现在应该会的事情

- 能用 `BaseModel` 定义结构化数据
- 能用 `Field` 和验证器做业务校验
- 能把模型对象序列化和反序列化
- 能用 `snapshot_download` 下载模型
- 能用 `pipeline` 快速做推理
- 能把 Pydantic 和 ModelScope 组合成一个可维护脚本

### 下一步建议

如果你想继续深入，建议按这个顺序继续学：

1. 用 Pydantic 管理配置文件和命令行参数
2. 用 ModelScope 跑多个不同任务
3. 学习 `MsDataset`
4. 学习 `Trainer`
5. 学习 Hub 上传与仓库管理
6. 最后再做服务化部署

## 十九、参考资料

以下资料是写本文时重点参考的官方页面：

- Pydantic Models: https://docs.pydantic.dev/latest/concepts/models/
- Pydantic Validators: https://docs.pydantic.dev/latest/concepts/validators/
- Pydantic Fields: https://docs.pydantic.dev/latest/concepts/fields/
- Pydantic TypeAdapter: https://docs.pydantic.dev/latest/concepts/type_adapter/
- Pydantic JSON: https://docs.pydantic.dev/latest/concepts/json/
- Pydantic JSON Schema: https://docs.pydantic.dev/latest/concepts/json_schema/
- ModelScope GitHub README: https://github.com/modelscope/modelscope
- ModelScope Releases: https://github.com/modelscope/modelscope/releases

## 二十、附：学习时的现实建议

最后给一些很实际的建议。

### 对 Pydantic

- 不要只看，要自己敲例子
- 每学一个能力，就写一个最小脚本验证
- 尤其要练 `field_validator` 和嵌套模型

### 对 ModelScope

- 别一上来就拿大模型练手
- 先选轻量文本任务
- 先学会下载和推理，再碰训练
- 真正做项目时，固定依赖版本和模型版本

### 对组合使用

永远优先把“参数校验”写在“模型执行”前面。

这是从脚本走向工程最值得养成的习惯之一。
