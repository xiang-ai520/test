# DeepSeek 从 0 到 1 通俗详细教程

> 适合人群：完全没有大模型基础，或者只懂一点 Python / 深度学习概念的初学者  
> 教程目标：看完后，你能明白 DeepSeek 的核心思想，知道模型为什么这样设计，并能自己做一个“教学版 DeepSeek”  
> 阅读方式：先理解整体，再动手写最小代码，最后再补工业级实现

---

# 目录

1. [先说结论：DeepSeek 到底是什么](#1-先说结论deepseek-到底是什么)
2. [你需要先建立的 3 个基础认知](#2-你需要先建立的-3-个基础认知)
3. [DeepSeek 的整体构建流程](#3-deepseek-的整体构建流程)
4. [第一部分：模型搭建](#4-第一部分模型搭建)
5. [第二部分：预训练流程](#5-第二部分预训练流程)
6. [第三部分：后训练流程](#6-第三部分后训练流程)
7. [DeepSeek-R1 为什么会突然这么强](#7-deepseek-r1-为什么会突然这么强)
8. [你可以自己复现的教学版路线](#8-你可以自己复现的教学版路线)
9. [常见问题](#9-常见问题)
10. [推荐阅读顺序](#10-推荐阅读顺序)

---

# 1. 先说结论：DeepSeek 到底是什么

如果用一句最简单的话解释：

**DeepSeek 不是某一个单独的“神秘模型”，而是一整套大模型技术路线。**

这套路线主要包括：

- 一个强大的语言模型底座
- 稀疏专家网络 `MoE`
- 更省显存、更适合长上下文的注意力思路 `MLA`
- 大规模高质量预训练
- 精心设计的后训练流程，比如 `SFT`、`RL`、`GRPO`

你可以把 DeepSeek 理解成一家公司逐步升级模型的过程：

- 先做基础模型
- 再做更高效的结构
- 再做更强的数据
- 再做更聪明的训练方法
- 最后得到像 `DeepSeek-V3`、`DeepSeek-R1` 这样的模型

所以如果你要学 DeepSeek，不要一上来就盯着“671B 参数”或者“R1 推理能力”。  
**真正该学的是它背后的构建逻辑。**

---

# 2. 你需要先建立的 3 个基础认知

## 2.1 大模型本质上在干什么

大语言模型最根本的任务其实很朴素：

**根据前面的文字，预测下一个 token。**

例如：

```text
今天天气很 -> 好
我喜欢吃 -> 苹果
牛顿第二定律是 -> F=ma
```

模型训练了足够多的数据之后，就会慢慢学会：

- 语法
- 常识
- 知识
- 推理模式
- 回答风格

所以你可以把大模型先理解成一个“超级强的自动续写器”。

## 2.2 为什么它看起来会“思考”

因为它在海量数据里学到了很多模式，比如：

- 遇到数学题先列条件
- 遇到代码题先分析需求
- 遇到写作题先列结构

后面再通过 `SFT` 和 `RL` 强化这些行为，它就会越来越像“会思考”。

注意：

**模型不是像人一样先天会思考，而是在训练中学到了思考的样子和习惯。**

## 2.3 DeepSeek 真正厉害的地方

DeepSeek 的亮点不只是“模型大”，而是它在几个方向都做得很强：

- 结构效率高
- 训练流程成熟
- 后训练特别强
- 在数学、代码、推理任务上投入很深

尤其是 `DeepSeek-R1`，让很多人意识到：

**推理能力不一定只能靠人工一步步教，也可以通过强化学习慢慢长出来。**

---

# 3. DeepSeek 的整体构建流程

你可以把它拆成三大块：

1. 模型搭建
2. 预训练
3. 后训练

把这三部分放到一起，流程大致是这样：

```text
原始文本数据
    ->
分词器 tokenizer
    ->
基础模型搭建（Transformer）
    ->
加入 DeepSeek 风格结构（RoPE / RMSNorm / SwiGLU / MoE / MLA）
    ->
预训练（Next Token Prediction）
    ->
得到 Base Model
    ->
SFT 指令微调
    ->
RL / GRPO 强化学习
    ->
得到更会推理、更会回答问题的模型
```

下面我们按这个顺序讲。

---

# 4. 第一部分：模型搭建

这一部分是整个教程最关键的地方。

## 4.1 不要一上来就复刻工业版

工业版 DeepSeek 有这些特点：

- 海量参数
- 多机多卡训练
- 非常复杂的并行优化
- 特殊精度训练，比如 `FP8`
- 非常复杂的路由和负载均衡

这对初学者来说门槛太高。

正确方式是：

**先搭一个“教学版 DeepSeek”，把核心思想跑通。**

教学版和工业版的关系像这样：

- 教学版：你自己能看懂、能写出来、能训练起来
- 工业版：公司级大规模工程实现

先学会自行车，再去看赛车。

## 4.2 模型底座：Decoder-Only Transformer

DeepSeek 的底座依然是 Transformer 体系。

更准确地说，是：

**Decoder-Only Transformer**

这类模型的特点是：

- 输入一串 token
- 每个位置只能看前面的 token
- 任务是预测下一个 token

像 GPT、LLaMA、DeepSeek 都属于这个家族。

你可以把一个大模型理解成“很多层相同结构堆起来”：

```text
输入 token
  ->
Embedding
  ->
Block 1
  ->
Block 2
  ->
Block 3
  ->
...
  ->
Block N
  ->
输出下一个 token 的概率
```

每个 Block 里最核心有两个东西：

- Attention：决定“看哪里”
- FFN：决定“怎么加工信息”

## 4.3 一个 Block 里到底发生了什么

你可以先把 Block 想成一个“信息处理工位”：

### 第一步：注意力层

当前 token 会看前面的 token，判断：

- 哪些词重要
- 应该重点参考谁
- 当前信息应该如何融合上下文

比如句子：

```text
小明把书放在桌子上，然后他走了。
```

当模型看到“他”的时候，注意力会更关注“小明”。

### 第二步：前馈层 FFN

注意力负责“聚合信息”，FFN 负责“加工信息”。

可以把它理解为：

- Attention：收集材料
- FFN：消化和再加工

这两步反复堆叠很多层后，模型就有了越来越强的表达能力。

## 4.4 DeepSeek 常见基础配置

如果你去看现代开源大模型，会发现很多配置已经比较统一了，DeepSeek 也不例外。

常见组合是：

- `RMSNorm`
- `RoPE`
- `SwiGLU`
- `Causal Self-Attention`

下面逐个解释。

## 4.5 RMSNorm 是什么

它是一种归一化方法。

初学者可以先这样理解：

训练大模型时，数值很容易变得不稳定。  
归一化层的作用，就是让每层输出别太飘。

`RMSNorm` 和传统 `LayerNorm` 相比：

- 更简洁
- 计算更省
- 在大模型里很常见

它不需要你先死记公式，先记住作用就行：

**让训练更稳。**

最小实现：

```python
import torch
import torch.nn as nn

class RMSNorm(nn.Module):
    def __init__(self, dim, eps=1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(dim))
        self.eps = eps

    def forward(self, x):
        rms = x.pow(2).mean(dim=-1, keepdim=True)
        x = x * torch.rsqrt(rms + self.eps)
        return x * self.weight
```

## 4.6 RoPE 是什么

`RoPE = Rotary Position Embedding`

它的作用是：

**让模型知道 token 的顺序。**

因为模型输入的是 token 向量，本身并不知道“谁在前、谁在后”。

例如：

- `我喜欢你`
- `你喜欢我`

词都差不多，但顺序不一样，意思也不一样。

RoPE 的好处是：

- 位置编码自然融入注意力
- 对长上下文更友好
- 现代大模型里很常见

初学时你只要记住：

**RoPE 是一种把位置信息加进注意力的方法。**

教学版代码：

```python
import torch

def rotate_half(x):
    x1 = x[..., : x.shape[-1] // 2]
    x2 = x[..., x.shape[-1] // 2 :]
    return torch.cat([-x2, x1], dim=-1)

def apply_rope(x, cos, sin):
    return x * cos + rotate_half(x) * sin

def build_rope_cache(seq_len, head_dim, device):
    theta = 1.0 / (10000 ** (torch.arange(0, head_dim, 2, device=device).float() / head_dim))
    pos = torch.arange(seq_len, device=device).float()
    freqs = torch.outer(pos, theta)
    emb = torch.cat([freqs, freqs], dim=-1)
    cos = emb.cos()[None, None, :, :]
    sin = emb.sin()[None, None, :, :]
    return cos, sin
```

## 4.7 SwiGLU 是什么

`SwiGLU` 是 FFN 的一种改法。

你先不用纠结名字，直接把它理解成：

**比传统 MLP 更适合现代大模型的一种前馈层。**

它常常比普通两层 MLP 更强一些。

教学版实现：

```python
import torch.nn.functional as F

class SwiGLU(nn.Module):
    def __init__(self, dim, hidden_dim):
        super().__init__()
        self.w1 = nn.Linear(dim, hidden_dim, bias=False)
        self.w2 = nn.Linear(dim, hidden_dim, bias=False)
        self.out = nn.Linear(hidden_dim, dim, bias=False)

    def forward(self, x):
        return self.out(F.silu(self.w1(x)) * self.w2(x))
```

## 4.8 先做一个最小版 Attention

下面这份代码不是工业级，但非常适合学习。

```python
import math
import torch
import torch.nn as nn
import torch.nn.functional as F

class CausalSelfAttention(nn.Module):
    def __init__(self, dim, n_heads):
        super().__init__()
        self.n_heads = n_heads
        self.head_dim = dim // n_heads
        self.q_proj = nn.Linear(dim, dim, bias=False)
        self.k_proj = nn.Linear(dim, dim, bias=False)
        self.v_proj = nn.Linear(dim, dim, bias=False)
        self.o_proj = nn.Linear(dim, dim, bias=False)

    def forward(self, x):
        B, T, C = x.shape
        q = self.q_proj(x).view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        k = self.k_proj(x).view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        v = self.v_proj(x).view(B, T, self.n_heads, self.head_dim).transpose(1, 2)

        cos, sin = build_rope_cache(T, self.head_dim, x.device)
        q = apply_rope(q, cos, sin)
        k = apply_rope(k, cos, sin)

        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        mask = torch.triu(torch.ones(T, T, device=x.device), diagonal=1).bool()
        scores = scores.masked_fill(mask, float("-inf"))
        probs = F.softmax(scores, dim=-1)

        out = probs @ v
        out = out.transpose(1, 2).contiguous().view(B, T, C)
        return self.o_proj(out)
```

它做了什么：

- 先把输入映射成 `Q K V`
- 用 `Q` 和 `K` 算谁该关注谁
- 用 softmax 算注意力权重
- 用权重去聚合 `V`
- 最终得到上下文增强后的表示

## 4.9 组装一个最小 Block

```python
class DecoderBlock(nn.Module):
    def __init__(self, dim, n_heads, hidden_dim):
        super().__init__()
        self.norm1 = RMSNorm(dim)
        self.attn = CausalSelfAttention(dim, n_heads)
        self.norm2 = RMSNorm(dim)
        self.ffn = SwiGLU(dim, hidden_dim)

    def forward(self, x):
        x = x + self.attn(self.norm1(x))
        x = x + self.ffn(self.norm2(x))
        return x
```

这里的 `x = x + ...` 叫残差连接。

你可以把残差连接理解成：

**新信息学得再好，也别把原来的信息一下子全冲掉。**

这能帮助深层网络更稳定地训练。

## 4.10 组装成一个最小语言模型

```python
class TinyLM(nn.Module):
    def __init__(self, vocab_size, dim=256, n_heads=8, hidden_dim=768, n_layers=6):
        super().__init__()
        self.tok_emb = nn.Embedding(vocab_size, dim)
        self.blocks = nn.ModuleList([
            DecoderBlock(dim, n_heads, hidden_dim) for _ in range(n_layers)
        ])
        self.norm = RMSNorm(dim)
        self.lm_head = nn.Linear(dim, vocab_size, bias=False)

    def forward(self, input_ids, labels=None):
        x = self.tok_emb(input_ids)
        for block in self.blocks:
            x = block(x)
        x = self.norm(x)
        logits = self.lm_head(x)

        loss = None
        if labels is not None:
            loss = F.cross_entropy(
                logits[:, :-1].reshape(-1, logits.size(-1)),
                labels[:, 1:].reshape(-1)
            )
        return {"logits": logits, "loss": loss}
```

到这里，你已经做出了一个“小型 GPT 风格模型”。

这一步非常重要，因为：

**DeepSeek 再复杂，也是从这个骨架一路长出来的。**

## 4.11 DeepSeek 的第一个关键点：MoE

### 4.11.1 MoE 是为了解决什么问题

如果模型所有参数每次都参与计算，会很贵。

你自然会想到一个问题：

**能不能模型很大，但每次只激活其中一部分？**

这就是 `MoE = Mixture of Experts` 的核心思想。

它的思路像这样：

- 不再只有一个 FFN
- 而是有很多个 expert
- 每个 token 只去找少数几个 expert 处理

像学校分班：

- 所有老师都很厉害
- 但每个学生不需要每节课都找全部老师
- 当前这个学生只需要找最适合的 1 个或 2 个老师

这样就能实现：

- 总参数很多
- 但每次计算量相对没那么大

### 4.11.2 最小版 MoE 怎么写

```python
class Expert(nn.Module):
    def __init__(self, dim, hidden_dim):
        super().__init__()
        self.ffn = SwiGLU(dim, hidden_dim)

    def forward(self, x):
        return self.ffn(x)

class MoEFFN(nn.Module):
    def __init__(self, dim, hidden_dim, n_experts=8, top_k=2):
        super().__init__()
        self.n_experts = n_experts
        self.top_k = top_k
        self.router = nn.Linear(dim, n_experts, bias=False)
        self.experts = nn.ModuleList([Expert(dim, hidden_dim) for _ in range(n_experts)])

    def forward(self, x):
        B, T, C = x.shape
        scores = self.router(x)
        topk_scores, topk_idx = torch.topk(scores, self.top_k, dim=-1)
        gates = F.softmax(topk_scores, dim=-1)

        out = torch.zeros_like(x)
        for k in range(self.top_k):
            idx = topk_idx[..., k]
            gate = gates[..., k].unsqueeze(-1)
            for e in range(self.n_experts):
                mask = (idx == e)
                if mask.any():
                    expert_in = x[mask]
                    expert_out = self.experts[e](expert_in)
                    out[mask] += gate[mask] * expert_out
        return out
```

### 4.11.3 MoE 最大的问题是什么

负载不均衡。

也就是：

- 有些 expert 特别忙
- 有些 expert 几乎没人用

这会导致：

- 训练不稳定
- 资源浪费
- 某些 expert 学不到东西

所以工业级 MoE 都非常重视：

- 路由设计
- 负载均衡
- expert 并行

DeepSeek-V3 的一个亮点，就是做了更好的负载均衡策略。

## 4.12 DeepSeek 的第二个关键点：MLA

### 4.12.1 MLA 是为了解决什么问题

`MLA = Multi-head Latent Attention`

它最直观解决的问题是：

**长上下文推理时，KV Cache 太占显存。**

为什么会占显存？

因为模型在生成第 1000 个 token 时，前 999 个 token 的 `K / V` 通常都要保留着。  
上下文越长，缓存越大。

所以问题来了：

**有没有办法把这些历史信息压缩存起来？**

MLA 就是在这个方向上的一个很重要设计。

### 4.12.2 小白版理解

先不要追求和官方论文完全一致，你先抓住核心思想：

- 普通注意力：把大量 K/V 都原样存着
- MLA：先压缩成更小的 latent 表示，再在需要时恢复

这就像：

- 不是把整本书每页都摊在桌上
- 而是先做成笔记
- 用的时候再根据笔记还原关键内容

### 4.12.3 教学版“近似 MLA”

```python
class ToyMLA(nn.Module):
    def __init__(self, dim, n_heads, latent_dim=64):
        super().__init__()
        self.n_heads = n_heads
        self.head_dim = dim // n_heads
        self.q_proj = nn.Linear(dim, dim, bias=False)
        self.kv_down = nn.Linear(dim, latent_dim, bias=False)
        self.k_up = nn.Linear(latent_dim, dim, bias=False)
        self.v_up = nn.Linear(latent_dim, dim, bias=False)
        self.o_proj = nn.Linear(dim, dim, bias=False)

    def forward(self, x):
        B, T, C = x.shape
        q = self.q_proj(x)
        latent = self.kv_down(x)
        k = self.k_up(latent)
        v = self.v_up(latent)

        q = q.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)

        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        mask = torch.triu(torch.ones(T, T, device=x.device), diagonal=1).bool()
        scores = scores.masked_fill(mask, float("-inf"))
        probs = F.softmax(scores, dim=-1)
        out = probs @ v
        out = out.transpose(1, 2).contiguous().view(B, T, C)
        return self.o_proj(out)
```

再次强调：

这不是官方 MLA 的完整工业实现。  
它的作用是帮助你理解：

**DeepSeek 在长上下文问题上，重点在“压缩历史信息，减少推理开销”。**

## 4.13 这一部分你学完后应该达到什么水平

如果你真的理解了这一部分，你应该能回答这几个问题：

- 为什么 DeepSeek 还是 Transformer 家族
- Attention 和 FFN 分别负责什么
- 为什么现代模型喜欢 `RMSNorm + RoPE + SwiGLU`
- 为什么要用 `MoE`
- `MLA` 为什么重要

如果这些问题你已经能自己讲出来，说明模型部分已经入门了。

---

# 5. 第二部分：预训练流程

模型结构搭好后，接下来就是预训练。

## 5.1 预训练到底在干什么

一句话：

**拿海量原始文本，让模型学会预测下一个 token。**

预训练后的模型一般叫：

- `Base Model`
- 基础模型

它通常具备：

- 语言能力
- 知识记忆
- 一定的推理潜力

但它未必特别会听指令，也未必很会聊天。

## 5.2 预训练的数据从哪来

常见来源：

- 网页文本
- 书籍
- 维基百科
- 技术文档
- 代码仓库
- 论文
- 问答数据

像 DeepSeekMath 这种领域模型，还会专门针对数学网页做数据挖掘。

对初学者来说，先记住一句最重要的话：

**数据质量经常比数据数量更重要。**

如果数据很脏，模型就容易学歪。

## 5.3 预训练的完整流程

通常是这样：

1. 收集原始语料
2. 清洗
3. 去重
4. 过滤低质量内容
5. 训练 tokenizer
6. 把文本转成 token
7. 按固定长度打包
8. 喂给模型做 next-token prediction
9. 定期保存 checkpoint
10. 评估 loss 和下游能力

## 5.4 tokenizer 为什么这么重要

Tokenizer 就是把文字切成模型能处理的最小单位。

比如：

```text
DeepSeek 很强
```

可能被切成：

```text
["Deep", "Seek", " 很", "强"]
```

或者：

```text
["DeepSeek", " 很", "强"]
```

不同切法会影响：

- 训练效率
- 序列长度
- 模型对中英文、代码、数学公式的处理效果

所以 tokenizer 不是小事，它会直接影响模型体验。

## 5.5 预训练目标函数

它的目标很简单：

```text
给定前面的 token，预测下一个 token
```

损失函数通常就是交叉熵。

简化理解：

- 预测对了，loss 下降
- 预测错了，loss 上升

训练越久，模型越擅长接着往下写。

## 5.6 最小预训练数据集代码

```python
from torch.utils.data import Dataset
import torch

class TokenDataset(Dataset):
    def __init__(self, token_ids, seq_len):
        self.token_ids = token_ids
        self.seq_len = seq_len

    def __len__(self):
        return len(self.token_ids) - self.seq_len

    def __getitem__(self, idx):
        x = torch.tensor(self.token_ids[idx:idx + self.seq_len], dtype=torch.long)
        y = x.clone()
        return x, y
```

这里的意思是：

- 从长长的 token 序列里切一段出来
- 让模型看前面的 token
- 去预测后面的 token

## 5.7 最小预训练循环

```python
import torch
from torch.optim import AdamW
from torch.utils.data import DataLoader

model = TinyLM(vocab_size=32000).cuda()
optimizer = AdamW(model.parameters(), lr=3e-4, weight_decay=0.1)

train_dataset = TokenDataset(token_ids, seq_len=256)
loader = DataLoader(train_dataset, batch_size=8, shuffle=True)

for epoch in range(3):
    model.train()
    for input_ids, labels in loader:
        input_ids = input_ids.cuda()
        labels = labels.cuda()

        out = model(input_ids, labels=labels)
        loss = out["loss"]

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        print("loss =", loss.item())
```

这就是最小版预训练。

虽然很简陋，但思路和大模型本质上是一样的。

## 5.8 工业级预训练还要关心什么

真正训练大模型时，还要关心很多工程问题：

- 学习率 warmup
- cosine decay
- mixed precision
- gradient clipping
- checkpoint 恢复
- 数据并行 / 张量并行 / 流水线并行
- token packing
- 吞吐优化
- 显存优化
- 日志与监控

但小白阶段先不要全吃下去。  
你应该先把“最小版能跑通”放在第一位。

## 5.9 预训练完成后你得到了什么

你得到了一个 `Base Model`。

它通常表现为：

- 能续写
- 懂很多知识
- 有一定理解能力
- 但不一定特别会按要求回答
- 也不一定非常安全或稳定

这时就要进入下一步：后训练。

---

# 6. 第三部分：后训练流程

后训练是很多人最容易忽视、但又极其关键的一部分。

简单说：

**预训练决定模型“知道什么”，后训练决定模型“怎么表现出来”。**

后训练通常包括：

- `SFT` 指令微调
- 偏好优化
- 强化学习 `RL`

## 6.1 SFT 是什么

`SFT = Supervised Fine-Tuning`

它的作用是：

**让模型学会按人类期望的方式回答问题。**

例如你准备很多样本：

- 用户：解释牛顿第二定律
- 助手：牛顿第二定律表示力等于质量乘加速度，即 `F=ma`

模型学多了之后，就会越来越像一个“会按格式回答的助手”。

## 6.2 为什么 Base Model 不够

Base Model 可能知道很多内容，但它不一定会这样表现：

- 结构清晰
- 先回答重点
- 不胡乱跑题
- 按聊天格式输出

它可能只是继续补全文本。

SFT 的意义就是：

**把“会续写”变成“会回答”。**

## 6.3 最小 SFT 数据长什么样

比如：

```python
sample = {
    "instruction": "解释什么是递归",
    "output": "递归就是函数在定义中调用自己，通常要配合终止条件使用。"
}
```

可以拼成：

```python
text = f"<user>\n{sample['instruction']}\n<assistant>\n{sample['output']}"
```

然后把这段文本送去训练。

更好的做法是：

- 对用户部分和系统提示部分不计算 loss
- 只对助手回答部分计算 loss

这样模型会更专注学习“怎么答”。

## 6.4 SFT 的本质

你可以把 SFT 理解成“老师带着做题”。

老师给出：

- 题目
- 标准风格
- 参考答案

模型学久了，就会慢慢模仿这种回答风格。

## 6.5 RL 是什么

`RL = Reinforcement Learning`

它和 SFT 最大的区别是：

- SFT：直接告诉模型标准答案
- RL：模型自己尝试，按结果好坏给奖励

比如一道数学题：

- 模型答对了，奖励高
- 模型答错了，奖励低

训练久了，模型就会更倾向于生成高奖励答案。

## 6.6 为什么 RL 对推理模型特别重要

因为很多推理任务并不只是“背答案”。

比如：

- 数学题
- 代码题
- 逻辑题

这些任务里，模型需要形成一种习惯：

- 先分析
- 再尝试
- 再检查
- 再修正

而 RL 很适合强化这种行为模式。

## 6.7 GRPO 是什么

`GRPO` 是 DeepSeekMath 中提出的一种强化学习方法。

你可以先把它粗略理解成：

**一次针对同一个问题采样多条回答，让它们在组内比较，谁更好就奖励谁。**

它和普通“只看单条样本”的思路相比，更像小组竞赛。

### 小白版流程

1. 给模型一个问题
2. 让模型一次生成多条答案
3. 用规则给这些答案打分
4. 在这一组答案里比较谁更好
5. 鼓励高分答案对应的生成方式

这种方法特别适合：

- 数学
- 代码
- 有明确可验证结果的任务

## 6.8 一个极简版奖励函数

```python
def reward_fn(problem, pred_answer, gold_answer):
    pred_answer = pred_answer.strip()
    gold_answer = gold_answer.strip()
    return 1.0 if pred_answer == gold_answer else 0.0
```

这非常简单，但已经足够帮助你理解 RL 的基本思想。

更复杂的奖励还可以考虑：

- 格式对不对
- 单元测试是否通过
- 最终数值对不对
- 是否出现非法输出

## 6.9 极简版“组内比较”示意

```python
import numpy as np

rewards = [0.0, 1.0, 0.0, 1.0]
mean_r = np.mean(rewards)
std_r = np.std(rewards) + 1e-6
advantages = [(r - mean_r) / std_r for r in rewards]
print(advantages)
```

意思是：

- 高于组内平均分的答案，鼓励
- 低于平均分的答案，抑制

这就是组相对优化的直觉来源。

## 6.10 DeepSeek-R1 的一个重要启发

很多人以前觉得：

“推理能力一定要靠大量人工标注思维链来教。”

DeepSeek-R1 告诉大家：

**不一定。**

只要奖励机制设计得好，模型也可能通过 RL 自己长出：

- 反思
- 回看
- 自我验证
- 更长的推理链

当然，纯 RL 也会有副作用，比如：

- 可读性差
- 语言混杂
- 重复

所以完整的 R1 流程不是只有 RL，而是把 SFT 和 RL 结合起来。

---

# 7. DeepSeek-R1 为什么会突然这么强

这部分非常值得单独讲。

## 7.1 不要以为只是“模型更大了”

R1 强，不只是因为参数大。

更关键的是：

**后训练流程发生了变化。**

## 7.2 你可以把 R1 的思路理解成两步

### 第一步：先让模型学会一些基础表达

也就是：

- 冷启动数据
- SFT
- 基础回答格式

让模型至少“像个人在回答问题”。

### 第二步：再用 RL 强化推理行为

通过奖励机制鼓励它：

- 算对
- 推得更稳
- 会检查答案
- 在复杂任务上更耐心

这一步会慢慢把“会答题”推向“会推理”。

## 7.3 为什么数学和代码特别适合 RL

因为这类题目容易验证。

比如数学题：

- 最终答案是 `42`
- 模型输出是不是 `42`，很容易判断

比如代码题：

- 运行测试
- 测试通过就是好
- 测试失败就是差

这类可验证任务，天生适合奖励建模。

## 7.4 R1 给初学者最大的启发

如果你是初学者，R1 这条路线真正值得你学的，不是直接复刻它的规模，而是理解这件事：

**模型能力 = 底座能力 + 数据质量 + 后训练方法**

不要以为“换个结构”就能突然变强。  
很多时候真正拉开差距的是训练方法。

---

# 8. 你可以自己复现的教学版路线

下面这条路线很适合小白。

## 8.1 第一阶段：先补最低限度基础

你需要会这些东西：

- Python 基础
- PyTorch 张量和模块
- 反向传播是什么
- 交叉熵 loss 是什么

如果这些不会，建议先补 1 到 2 周。

## 8.2 第二阶段：手写一个最小 GPT

目标：

- 能自己实现 `Embedding`
- 能自己实现 `Attention`
- 能自己实现 `FFN`
- 能自己训练一个小模型

这一步成功后，你已经超过很多“只会调 API”的初学者了。

## 8.3 第三阶段：把模型升级成现代风格

把这些替换进去：

- `LayerNorm -> RMSNorm`
- 普通位置编码 -> `RoPE`
- 普通 FFN -> `SwiGLU`

这一步的目标是：

**让你写出来的模型开始接近现代开源大模型骨架。**

## 8.4 第四阶段：加入 MoE

目标：

- 理解路由器 `router`
- 理解 `top-k expert`
- 理解为什么会负载不均衡

只要你能自己写出最小版路由逻辑，就已经算真正入门了。

## 8.5 第五阶段：理解 MLA 的动机

目标不是完整复刻论文，而是理解：

- 为什么上下文长了 KV cache 会爆
- 为什么要压缩历史信息
- 为什么推理成本也是大模型设计的重要部分

## 8.6 第六阶段：做一个小规模预训练

你可以准备一个很小的数据集，比如：

- 中文百科片段
- 技术博客
- Python 教程
- 一点点代码数据

目标不是训练出神模型，而是亲手走通：

- 数据清洗
- token 化
- 训练循环
- loss 下降

## 8.7 第七阶段：做一个小规模 SFT

你可以自己准备几百到几千条问答数据：

- 定义解释
- 编程问答
- 常识问答
- 数学题简答

目标是让模型从“续写文本”变成“会回答问题”。

## 8.8 第八阶段：做一个小规模 RL

建议先从最简单的可验证任务开始：

- 加减乘除
- 一元一次方程
- 简单 Python 函数题

奖励函数先写最简单的：

- 对就是 1
- 错就是 0

先跑通，再谈复杂奖励。

## 8.9 一条很实用的学习原则

对于初学者，最好的顺序永远是：

**先做出最小能跑版本，再逐步逼近 DeepSeek。**

不要一开始就试图同时解决：

- 分布式训练
- 多机多卡
- 千亿参数
- 复杂 RL
- 高级路由优化

那样很容易直接劝退。

---

# 9. 常见问题

## 9.1 我是小白，真的能学会吗

可以，但不要按“工业级”目标起步。

你真正的第一目标应该是：

**看懂一个最小版模型，自己能写出来，并训练成功。**

这是最关键的一步。

## 9.2 我一定要很多卡吗

不需要。

学习阶段你可以：

- 用小模型
- 用小数据
- 甚至先在 CPU 上验证逻辑

等原理彻底通了，再考虑更大的训练。

## 9.3 为什么很多人看论文还是不会做

因为论文讲的是：

- 方法
- 结论
- 指标

但初学者真正缺的是：

- 先做什么
- 后做什么
- 每一步为什么有必要
- 代码该怎么下手

所以学习一定要“论文 + 教学实现 + 自己改代码”结合。

## 9.4 DeepSeek 最值得学的是哪部分

如果你时间有限，我建议优先学：

1. Transformer 骨架
2. MoE
3. 预训练流程
4. SFT
5. RL / GRPO

`MLA` 也重要，但它更偏优化和工程。

对于小白来说，先把上面 5 件事吃透，收益最大。

---

# 10. 推荐阅读顺序

如果你准备继续深入，建议按这个顺序看资料：

1. 先看 Transformer 基础
2. 再看 LLaMA 风格现代骨架：`RMSNorm + RoPE + SwiGLU`
3. 再看 MoE 基础
4. 再看 DeepSeekMoE
5. 再看 DeepSeek-V2，重点理解 `MLA`
6. 再看 DeepSeekMath，重点理解 `GRPO`
7. 最后看 DeepSeek-V3 和 DeepSeek-R1

官方资料建议：

- DeepSeekMoE: https://github.com/deepseek-ai/DeepSeek-MoE
- DeepSeek-V2: https://arxiv.org/abs/2405.04434
- DeepSeekMath: https://arxiv.org/abs/2402.03300
- DeepSeek-V3: https://github.com/deepseek-ai/DeepSeek-V3
- DeepSeek-R1: https://github.com/deepseek-ai/DeepSeek-R1

---

# 最后总结

如果把 DeepSeek 的核心浓缩成几句话，那就是：

- 底座仍然是 Transformer
- 用 `MoE` 解决“大容量但不想每次都全算”的问题
- 用 `MLA` 解决长上下文推理时 KV cache 太贵的问题
- 用高质量预训练把知识和语言能力打牢
- 用 `SFT + RL` 把模型变成真正会回答、会推理的系统

你要做的不是一口气复刻工业版 DeepSeek，而是沿着下面这条路线稳步推进：

```text
最小 Transformer
  ->
现代骨架（RMSNorm / RoPE / SwiGLU）
  ->
MoE
  ->
理解 MLA
  ->
预训练
  ->
SFT
  ->
RL / GRPO
```

只要你按这个顺序走，DeepSeek 这套技术体系就会越来越清晰。

如果后面你愿意继续，我还可以在这份教程基础上继续帮你写两种配套文档：

- `deepseek_code.md`：从零实现教学版 DeepSeek 的完整代码教程
- `deepseek_30days.md`：适合小白的 30 天学习计划
