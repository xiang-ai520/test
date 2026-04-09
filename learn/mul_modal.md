# 多模态大模型入门详细教程

> 适合新手阅读，包含大量比喻和原理示例

---

## 目录

1. [什么是多模态？](#1-什么是多模态)
2. [CLIP：让图像和文字"说同一种语言"](#2-clip让图像和文字说同一种语言)
3. [VAE：把信息压缩再还原的魔法箱](#3-vae把信息压缩再还原的魔法箱)
4. [UNet：带"抄近路"的图像处理网络](#4-unet带抄近路的图像处理网络)
5. [DiT：用 Transformer 做扩散模型](#5-dit用-transformer-做扩散模型)
6. [时序建模：理解"时间顺序"的大脑](#6-时序建模理解时间顺序的大脑)
7. [把它们组合起来：Stable Diffusion 全流程](#7-把它们组合起来stable-diffusion-全流程)
8. [多模态大模型的现代架构（GPT-4V / LLaVA）](#8-多模态大模型的现代架构gpt-4v--llava)
9. [动手实践：代码示例](#9-动手实践代码示例)
10. [总结与学习路线](#10-总结与学习路线)

---

## 1. 什么是多模态？

### 1.1 概念解释

**单模态**：只处理一种类型的数据，比如纯文本（ChatGPT 最初版本）、纯图像（ResNet）。

**多模态**：同时理解或生成多种类型数据，比如：
- 图像 + 文字（看图说话、文字生图）
- 视频 + 音频 + 文字（视频理解）
- 语音 + 文字（语音识别）

### 1.2 比喻

> **把人类感官想象成模态**
>
> 人类有视觉、听觉、触觉、嗅觉……每种感官收集不同类型的信息，但大脑能把它们融合成一个统一的理解。
>
> 多模态模型就像一个有多种感官的 AI 大脑，能同时"看"和"读"，然后做出综合判断。

### 1.3 为什么需要多模态？

| 任务 | 单模态的限制 | 多模态的解决 |
|------|------------|------------|
| "这张图里写的什么字？" | 纯语言模型不能看图 | 图像+文字联合理解 |
| "帮我画一只猫" | 纯语言模型不能生图 | 文字→图像生成 |
| "这段视频讲了什么？" | 单一模态无法处理 | 视频帧+音频+字幕联合 |

---

## 2. CLIP：让图像和文字"说同一种语言"

### 2.1 核心问题

图像是像素矩阵（数字组成的网格），文字是 token 序列（词语）。它们天生是"外星人和地球人"——语言完全不同，怎么让它们相互理解？

### 2.2 CLIP 的核心思想：对比学习

**CLIP**（Contrastive Language–Image Pre-training）由 OpenAI 于 2021 年提出。

**核心思路**：把图像和文字都映射到**同一个向量空间**，让语义相似的图文对在空间中靠近，语义不同的远离。

### 2.3 比喻

> **想象一个世界地图**
>
> - 在这张地图上，"北京"和"天安门广场"的图片很近
> - "北京"和"一只猫"的图片很远
> - 文字描述"故宫的红墙"和故宫的照片，在地图上的位置几乎重叠
>
> CLIP 训练的过程，就是让模型学会**画这张地图**。

### 2.4 架构图解

```
输入图像 ──→ 图像编码器 (Vision Transformer / ResNet)
                │
                ▼
            图像向量 [512维]
                │
                │  ← 计算余弦相似度 →
                │
            文字向量 [512维]
                ▲
                │
文字描述 ──→ 文字编码器 (Transformer)
```

### 2.5 训练方式

CLIP 使用了 **4亿个** 图像-文字对进行训练。

训练目标：对于一个 batch 的 N 个图文对：
- N 个匹配的对（正样本）相似度尽可能高 ↑
- N×(N-1) 个不匹配的对（负样本）相似度尽可能低 ↓

```python
# 伪代码示意
# 假设 batch 中有 4 对图文
images = ["猫图", "狗图", "花图", "车图"]
texts  = ["一只猫", "一条狗", "一朵花", "一辆车"]

# 相似度矩阵 4×4
similarity_matrix = [
    [高,  低,  低,  低],   # 猫图 vs 所有文字
    [低,  高,  低,  低],   # 狗图 vs 所有文字
    [低,  低,  高,  低],   # 花图 vs 所有文字
    [低,  低,  低,  高],   # 车图 vs 所有文字
]
# 训练目标：对角线上的值尽可能高，其余尽可能低
```

### 2.6 CLIP 的应用

1. **零样本图像分类**：不需要额外训练，直接用文字描述分类
2. **文字生图的文字编码**：Stable Diffusion 用 CLIP 把文字变成向量
3. **图文检索**：输入文字找相关图片（或反过来）

### 2.7 代码示例（使用 Hugging Face）

```python
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch

# 加载模型
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

# 准备数据
image = Image.open("cat.jpg")
texts = ["一只猫", "一条狗", "一朵花"]

# 处理输入
inputs = processor(
    text=texts,
    images=image,
    return_tensors="pt",
    padding=True
)

# 获取相似度
with torch.no_grad():
    outputs = model(**inputs)
    logits_per_image = outputs.logits_per_image  # 图像对每个文字的相似度
    probs = logits_per_image.softmax(dim=1)       # 转成概率

print(f"猫的概率: {probs[0][0]:.2%}")  # 输出: 猫的概率: 96.3%
```

---

## 3. VAE：把信息压缩再还原的魔法箱

### 3.1 核心问题

一张 512×512 的图像有 **786,432 个像素**。直接在像素空间做生成，计算量极大。能不能先"压缩"再处理？

### 3.2 VAE 是什么

**VAE**（Variational Autoencoder，变分自编码器）是一种能把数据压缩到低维"潜在空间"（Latent Space），再还原回原始空间的神经网络。

### 3.3 比喻

> **把 VAE 想象成一个高效的快递压缩机**
>
> - **编码器（Encoder）**：快递员把你的大箱子（原始图像）压缩成一个小方块（潜在向量），同时确保重要信息都保留着
> - **潜在空间（Latent Space）**：存放小方块的仓库，每个方块对应一种"图像的本质特征"
> - **解码器（Decoder）**：目的地的快递员把小方块还原成原始大箱子
>
> 关键魔法：仓库里的方块是**连续的**——两个相邻方块解压出来的图像也是相似的！这让我们可以在仓库里"漫步"来生成新图像。

### 3.4 普通 AE vs VAE 的区别

| 特性 | 普通自编码器 (AE) | 变分自编码器 (VAE) |
|------|----------------|-----------------|
| 潜在空间 | 离散的点 | 连续的分布 |
| 能生成新样本？ | 不行（插值会出怪图）| 可以（空间连续） |
| 核心机制 | 直接编码为向量 | 编码为均值+方差，然后采样 |

### 3.5 VAE 的数学直觉

```
原始图像 x
    │
    ▼
编码器: x → μ (均值) 和 σ (标准差)
    │
    ▼
采样: z = μ + σ × ε  (ε 是随机噪声)
    │           ↑
    │     这一步让空间变得连续和可生成
    ▼
解码器: z → 重建的图像 x'
    │
    ▼
损失 = 重建误差 + KL散度（让分布接近标准正态分布）
```

**KL 散度的作用**：强迫潜在空间的分布接近标准正态分布 N(0,1)，这样我们就可以从 N(0,1) 中随机采样来生成新图像。

### 3.6 在扩散模型中的角色

Stable Diffusion 使用的是**LDM（Latent Diffusion Model）**，核心就是 VAE：

```
原始图像 [512×512×3]
    │ 编码器（压缩 8 倍）
    ▼
潜在向量 [64×64×4]    ← 扩散过程在这里发生（计算量小 64 倍！）
    │ 解码器（还原）
    ▼
生成图像 [512×512×3]
```

### 3.7 代码示例

```python
from diffusers import AutoencoderKL
import torch
from PIL import Image
import numpy as np

# 加载 VAE（来自 Stable Diffusion）
vae = AutoencoderKL.from_pretrained("stabilityai/sd-vae-ft-mse")
vae.eval()

# 将图像编码到潜在空间
def encode_image(image_path):
    img = Image.open(image_path).resize((512, 512))
    img_tensor = torch.tensor(np.array(img)).float() / 127.5 - 1  # 归一化到 [-1, 1]
    img_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)  # [1, 3, 512, 512]

    with torch.no_grad():
        latent = vae.encode(img_tensor).latent_dist.sample()
        latent = latent * 0.18215  # 缩放因子

    print(f"原始尺寸: {img_tensor.shape}")   # [1, 3, 512, 512]
    print(f"潜在尺寸: {latent.shape}")       # [1, 4, 64, 64]  压缩了！
    return latent

# 从潜在空间解码回图像
def decode_latent(latent):
    with torch.no_grad():
        latent = latent / 0.18215
        image = vae.decode(latent).sample

    image = (image / 2 + 0.5).clamp(0, 1)  # 反归一化
    image = image.squeeze(0).permute(1, 2, 0).numpy()
    return Image.fromarray((image * 255).astype(np.uint8))
```

---

## 4. UNet：带"抄近路"的图像处理网络

### 4.1 背景

UNet 最初是为**医学图像分割**设计的（2015年），后来成为扩散模型的核心去噪网络。

### 4.2 核心架构

UNet 的名字来自其形状像字母 **"U"**：

```
输入图像 [512×512]
    │
    ├── 下采样 ──→ [256×256]  ──────────────────────────┐ skip
    │                │                                   │
    │            下采样 ──→ [128×128]  ──────────────┐  │ skip
    │                          │                     │  │
    │                      下采样 ──→ [64×64]  ──┐  │  │ skip
    │                                    │        │  │  │
    │                               瓶颈层         │  │  │
    │                              [32×32]         │  │  │
    │                                    │        │  │  │
    │                      上采样 ←── [64×64]  ←──┘  │  │
    │                          │     (拼接 skip)     │  │
    │            上采样 ←── [128×128]  ←─────────────┘  │
    │                │     (拼接 skip)                   │
    └── 上采样 ←── [256×256]  ←────────────────────────┘
             │     (拼接 skip)
             ▼
        输出图像 [512×512]
```

### 4.3 比喻

> **把 UNet 想象成一个"翻译团队"**
>
> - **下采样部分（左侧）**：先生阅读原文，理解整体大意，但会丢失细节（缩小图像）
> - **瓶颈部分（底部）**：高度压缩，理解最深层的语义
> - **上采样部分（右侧）**：翻译成目标语言，逐渐恢复细节
> - **Skip Connection（横向连接）**：先生直接把原文章节笔记传给对应的翻译者，防止细节丢失！
>
> 没有 skip connection 的话，最终输出会"遗忘"低层次的细节（比如边缘、纹理）。

### 4.4 Skip Connection 的作用

```python
# 下采样阶段：保存特征图
features = []
x = input_image

for down_block in down_blocks:
    x = down_block(x)
    features.append(x)  # 保存每层的特征图

# 上采样阶段：与保存的特征图拼接
for up_block, skip_feat in zip(up_blocks, reversed(features)):
    x = up_block(x)
    x = torch.cat([x, skip_feat], dim=1)  # 拼接！这就是 skip connection
```

### 4.5 在扩散模型中的角色

扩散模型的 UNet 有一个额外的输入：**时间步 t**（表示当前是第几步去噪）和**文字条件**。

```python
# 扩散模型的 UNet 签名
def forward(
    self,
    noisy_latent,    # 含噪声的潜在向量
    timestep,        # 当前时间步（模型需要知道噪声有多大）
    text_embeddings  # 来自 CLIP 的文字条件
):
    # 时间步嵌入（让模型知道现在是第几步）
    t_emb = self.time_embedding(timestep)

    # 在 UNet 的每个 attention 层都注入文字条件
    # Cross-Attention: 图像特征 attend 到文字向量
    ...
```

---

## 5. DiT：用 Transformer 做扩散模型

### 5.1 背景

UNet 是专为图像设计的卷积网络，而 **DiT**（Diffusion Transformer，2022年）的想法是：**能不能把 UNet 换成 Transformer？**

答案是肯定的，而且效果更好、扩展性更强。Sora、Stable Diffusion 3、FLUX 都用了 DiT。

### 5.2 核心思路

将图像分割成 **patch（小块）**，像处理文字 token 一样处理图像块：

```
原始潜在向量 [64×64×4]
    │
    │  Patchify（切成小块，每块 2×2）
    ▼
序列 [1024 个 patch，每个是 16 维向量]
    │
    │  加入位置编码 + 时间步嵌入 + 文字条件
    ▼
Transformer Blocks × N
    │  每个 block 包含：
    │  - Self-Attention（patch 之间互相关注）
    │  - Cross-Attention（关注文字条件）
    │  - FFN（前馈网络）
    ▼
序列 [1024 个 patch]
    │
    │  Unpatchify（拼回图像形状）
    ▼
预测的噪声 [64×64×4]
```

### 5.3 比喻

> **把 DiT 想象成一个班级讨论**
>
> - 把图像切成 1024 个小块，每个小块是一个"学生"
> - Self-Attention：学生们互相讨论，每个学生都能看到所有其他学生的笔记
> - Cross-Attention：老师（文字描述）在旁边给提示，学生根据老师的提示调整自己的理解
> - 最终每个学生输出修正后的答案（去噪结果）
>
> 相比 UNet（卷积），Transformer 让每个 patch 都能直接"看到"所有其他 patch，**全局感受野更强**。

### 5.4 DiT vs UNet 对比

| 特性 | UNet | DiT |
|------|------|-----|
| 基础算子 | 卷积 | 自注意力 |
| 感受野 | 局部（逐步扩大）| 全局（每层都全局）|
| 扩展性 | 较弱 | 很强（扩参数效果明显）|
| 计算效率 | 较高 | 较低（但并行度更好）|
| 代表模型 | SD 1.x/2.x | SD3、FLUX、Sora |

### 5.5 关键技术：adaLN（自适应层归一化）

DiT 使用 adaLN-Zero 来注入时间步和文字条件：

```python
# 普通 LayerNorm
x = LayerNorm(x)

# adaLN：根据条件动态调整归一化的缩放和偏移
scale, shift = MLP(condition).chunk(2, dim=-1)  # 从条件生成 scale 和 shift
x = LayerNorm(x) * (1 + scale) + shift
```

这比 Cross-Attention 更高效，是 DiT 的核心创新之一。

---

## 6. 时序建模：理解"时间顺序"的大脑

### 6.1 什么是时序建模

视频、音频、文字都是**有时间顺序的序列数据**。时序建模就是让模型理解"前后关系"。

### 6.2 主要方法

#### 6.2.1 RNN / LSTM（老方法，了解即可）

```
时间步:  t=1    t=2    t=3    t=4
         ↓      ↓      ↓      ↓
输入:   x₁ → x₂ → x₃ → x₄
         ↓      ↓      ↓      ↓
隐状态: h₁ → h₂ → h₃ → h₄  （信息逐步传递）
```

**比喻**：像读书，读完第一句话的理解会影响读第二句话。

**缺点**：长序列中早期信息容易"遗忘"，且无法并行计算。

#### 6.2.2 Transformer（现代主流）

```python
# Transformer 的自注意力：每个位置都能直接看到所有其他位置
# 序列: [猫, 咪, 在, 树, 上]
# "树"这个词可以直接 attend 到"猫"，不需要经过中间步骤

attention_score = softmax(Q @ K.T / sqrt(d_k)) @ V
#                  ↑ 每个词对其他词的重要性权重
```

**比喻**：像开会，每个人都可以直接向任何其他人提问，不需要通过中间人传话。

#### 6.2.3 视频中的时序建模

视频 = 图像序列，需要同时建模**空间**（每帧内部）和**时间**（帧与帧之间）。

**方法一：3D 卷积**
```python
# 2D 卷积：只处理空间 [H, W]
# 3D 卷积：同时处理时间和空间 [T, H, W]
conv3d = nn.Conv3d(in_channels, out_channels, kernel_size=(3, 3, 3))
```

**方法二：时空分离注意力（更高效）**
```
空间注意力：每帧内的 patch 互相 attend
    +
时间注意力：相同位置、不同帧的 patch 互相 attend
```

```python
# 视频 Transformer 中的时空分离
B, T, H, W, C = video_features.shape  # B=批次, T=帧数, H=高, W=宽, C=通道

# 空间注意力（在每帧内部）
x = x.reshape(B*T, H*W, C)  # 把每帧展开成序列
x = spatial_attention(x)

# 时间注意力（跨帧）
x = x.reshape(B, T, H*W, C).permute(0, 2, 1, 3).reshape(B*H*W, T, C)
x = temporal_attention(x)
```

**方法三：因果注意力（用于视频生成）**

生成视频时，当前帧只能看到**过去**的帧（不能看未来）：

```
帧:   f₁  f₂  f₃  f₄  f₅
      ↓
注意力掩码（下三角矩阵）:
f₁ 只能看 [f₁]
f₂ 只能看 [f₁, f₂]
f₃ 只能看 [f₁, f₂, f₃]
...以此类推
```

### 6.3 位置编码：告诉模型"先后顺序"

Transformer 本身不知道顺序，需要**位置编码**：

```python
# 正弦位置编码（原始 Transformer）
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

# RoPE（旋转位置编码，现代主流）
# 在 Q、K 上应用旋转矩阵，让相对位置信息融入注意力计算
```

**比喻**：如果把 Transformer 比作一场会议，位置编码就是给每个人戴上写有座位号的胸牌，这样即使打乱顺序，也能知道谁坐在谁旁边。

---

## 7. 把它们组合起来：Stable Diffusion 全流程

### 7.1 文字生图的完整流程

```
用户输入: "一只可爱的橘猫在草地上玩耍"
    │
    ▼
① CLIP 文字编码器
    "一只可爱的橘猫..." → 文字向量 [77, 768]
    │
    ▼
② 随机采样初始噪声
    从 N(0,1) 采样 → 纯噪声潜在向量 [1, 4, 64, 64]
    │
    ▼
③ 扩散去噪循环（重复 20~50 次）
    for t in [1000, 980, 960, ..., 20]:
        噪声预测 = UNet/DiT(含噪潜在向量, 时间步t, 文字向量)
        更新潜在向量（减去预测的噪声）
    │
    ▼
④ VAE 解码器
    干净的潜在向量 [1, 4, 64, 64] → 最终图像 [1, 3, 512, 512]
    │
    ▼
输出: 橘猫图像 🐱
```

### 7.2 扩散过程的直觉

**正向扩散（训练时）**：逐步给图像加噪声，直到变成纯噪声。

**反向扩散（推理时）**：从纯噪声出发，逐步去噪，还原图像。

```
训练阶段：
清晰图像 → 加一点噪声 → 加更多噪声 → ... → 纯噪声
  x₀          x₁              x₂                 x_T

推理阶段（反向）：
纯噪声 → 去一点噪声 → 去更多噪声 → ... → 清晰图像
  x_T       x_{T-1}          x_{T-2}              x₀
```

**模型学什么**：在每个时间步 t，给定含噪声的图像 xₜ 和时间步 t，预测噪声 ε 是什么（然后减去它）。

### 7.3 Classifier-Free Guidance（CFG）

这是让文字条件更强的关键技术：

```python
# 同时运行两次 UNet：有条件 和 无条件
noise_pred_text = unet(noisy_latent, t, text_embeddings)     # 有文字条件
noise_pred_uncond = unet(noisy_latent, t, empty_embeddings)  # 无条件

# 加权组合（guidance_scale 越大，越遵守文字描述）
noise_pred = noise_pred_uncond + guidance_scale * (noise_pred_text - noise_pred_uncond)
#            ↑ 无条件基础          ↑ 文字"方向"加强
```

**比喻**：
- 无条件预测：AI 自由发挥
- 有条件预测：AI 按照你的要求创作
- CFG = "在自由发挥的基础上，更强地朝你要求的方向走"

---

## 8. 多模态大模型的现代架构（GPT-4V / LLaVA）

### 8.1 理解图像的大模型（VLM）

与扩散模型（生成图像）不同，**VLM（视觉语言模型）** 的目标是**理解**图像并用文字描述。

### 8.2 LLaVA 架构（简洁高效）

```
输入图像
    │
    ▼
① 视觉编码器（CLIP ViT）
    图像 → 视觉 token [256, 1024]
    │
    ▼
② 投影层（MLP/Linear）
    视觉 token → 语言模型可理解的向量 [256, 4096]
    │
    ▼
③ 与文字 token 拼接
    ["请描述这张图", <图像token×256>, "答："] → 输入序列
    │
    ▼
④ LLM（LLaMA/Vicuna 等）
    → 输出文字描述
```

### 8.3 关键技术：视觉 token 的处理

**问题**：一张图像会产生几百个 token（256个），这会消耗大量 LLM 的上下文窗口。

**解决方案**：

| 方法 | 思路 | 代表模型 |
|------|------|---------|
| 直接拼接 | 简单有效 | LLaVA-1.5 |
| Resampler | 用 cross-attention 压缩到固定数量（如32个）| Flamingo、Qwen-VL |
| 动态分辨率 | 根据图像内容决定用多少 token | InternVL、LLaVA-NeXT |

### 8.4 训练流程（LLaVA 为例）

**第一阶段：对齐预训练**
- 冻结视觉编码器和 LLM
- 只训练投影层
- 数据：图文对（让视觉空间对齐到语言空间）

**第二阶段：指令微调**
- 冻结视觉编码器
- 训练投影层 + LLM
- 数据：视觉问答数据集

```python
# 简化的 LLaVA forward 示意
class LLaVA(nn.Module):
    def __init__(self):
        self.vision_encoder = CLIPVisionModel(...)   # 冻结
        self.projector = nn.Linear(1024, 4096)       # 可训练
        self.llm = LlamaModel(...)                   # 可训练（阶段2）

    def forward(self, image, input_ids):
        # 1. 提取视觉特征
        visual_feats = self.vision_encoder(image)     # [B, 256, 1024]
        visual_feats = self.projector(visual_feats)   # [B, 256, 4096]

        # 2. 获取文字嵌入
        text_embeds = self.llm.embed_tokens(input_ids)  # [B, L, 4096]

        # 3. 在 <image_token> 位置插入视觉特征
        # （找到 input_ids 中 <image_token> 的位置，替换成视觉特征）
        combined = insert_image_features(text_embeds, visual_feats)

        # 4. 过 LLM
        output = self.llm(inputs_embeds=combined)
        return output
```

---

## 9. 动手实践：代码示例

### 9.1 用 Stable Diffusion 生成图像（完整示例）

```python
# 安装: pip install diffusers transformers accelerate
from diffusers import StableDiffusionPipeline
import torch

# 加载模型（自动下载）
pipe = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16
).to("cuda")

# 生成图像
image = pipe(
    prompt="a cute orange cat playing in a meadow, high quality, 4k",
    negative_prompt="blurry, ugly, low quality",
    num_inference_steps=30,    # 去噪步数
    guidance_scale=7.5,        # CFG 强度
    height=512,
    width=512,
).images[0]

image.save("cat.png")
```

### 9.2 手写简化版扩散模型（帮助理解原理）

```python
import torch
import torch.nn as nn
import numpy as np

class SimpleDiffusion:
    def __init__(self, T=1000):
        self.T = T
        # 噪声调度：从小到大的噪声强度
        self.betas = torch.linspace(1e-4, 0.02, T)
        self.alphas = 1 - self.betas
        self.alphas_cumprod = torch.cumprod(self.alphas, dim=0)

    def add_noise(self, x0, t):
        """正向过程：给干净图像加噪声"""
        noise = torch.randn_like(x0)

        # 公式：x_t = sqrt(ā_t) * x0 + sqrt(1-ā_t) * ε
        sqrt_alpha = self.alphas_cumprod[t].sqrt().view(-1, 1, 1, 1)
        sqrt_one_minus_alpha = (1 - self.alphas_cumprod[t]).sqrt().view(-1, 1, 1, 1)

        x_noisy = sqrt_alpha * x0 + sqrt_one_minus_alpha * noise
        return x_noisy, noise  # 返回含噪图像和噪声（训练时需要预测这个噪声）

    @torch.no_grad()
    def denoise_step(self, model, x_t, t):
        """反向过程的单步去噪"""
        # 模型预测噪声
        predicted_noise = model(x_t, t)

        beta_t = self.betas[t]
        alpha_t = self.alphas[t]
        alpha_cumprod_t = self.alphas_cumprod[t]

        # 计算均值
        mean = (1 / alpha_t.sqrt()) * (
            x_t - beta_t / (1 - alpha_cumprod_t).sqrt() * predicted_noise
        )

        # 加少量噪声（t>0 时）
        if t > 0:
            noise = torch.randn_like(x_t)
            x_prev = mean + beta_t.sqrt() * noise
        else:
            x_prev = mean

        return x_prev

    @torch.no_grad()
    def sample(self, model, shape):
        """从纯噪声开始生成图像"""
        x = torch.randn(shape)  # 从纯噪声开始

        for t in reversed(range(self.T)):
            x = self.denoise_step(model, x, t)

        return x

# 训练循环
def train_step(diffusion, model, optimizer, x0):
    batch_size = x0.shape[0]

    # 随机采样时间步
    t = torch.randint(0, diffusion.T, (batch_size,))

    # 正向加噪
    x_noisy, noise = diffusion.add_noise(x0, t)

    # 模型预测噪声
    predicted_noise = model(x_noisy, t)

    # 简单的 MSE 损失
    loss = nn.MSELoss()(predicted_noise, noise)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    return loss.item()
```

### 9.3 用 LLaVA 理解图像

```python
# pip install transformers
from transformers import LlavaNextProcessor, LlavaNextForConditionalGeneration
from PIL import Image
import torch

# 加载模型
processor = LlavaNextProcessor.from_pretrained("llava-hf/llava-v1.6-mistral-7b-hf")
model = LlavaNextForConditionalGeneration.from_pretrained(
    "llava-hf/llava-v1.6-mistral-7b-hf",
    torch_dtype=torch.float16,
    device_map="auto"
)

# 准备输入
image = Image.open("cat.jpg")
conversation = [
    {
        "role": "user",
        "content": [
            {"type": "image"},
            {"type": "text", "text": "这张图片里有什么？请详细描述。"},
        ],
    },
]

# 处理并生成
prompt = processor.apply_chat_template(conversation, add_generation_prompt=True)
inputs = processor(images=image, text=prompt, return_tensors="pt").to("cuda")

output = model.generate(**inputs, max_new_tokens=500)
print(processor.decode(output[0], skip_special_tokens=True))
```

---

## 10. 总结与学习路线

### 10.1 各组件总结

| 组件 | 功能 | 比喻 | 关键论文 |
|------|------|------|---------|
| CLIP | 对齐图像和文字的语义空间 | 世界地图，让图文找到共同坐标 | Learning Transferable Visual Models (2021) |
| VAE | 压缩图像到潜在空间 | 快递压缩机，保留本质、节省空间 | Auto-Encoding Variational Bayes (2013) |
| UNet | 扩散去噪网络（卷积版） | 带抄近路的翻译团队 | U-Net (2015) |
| DiT | 扩散去噪网络（Transformer版）| 全员互相讨论的班级 | Scalable Diffusion Models with Transformers (2022) |
| 时序建模 | 理解序列的时间关系 | 既能读单句又能记全文的大脑 | Attention is All You Need (2017) |

### 10.2 推荐学习路线

```
第一阶段（基础）
    ├── 深度学习基础：反向传播、卷积神经网络
    ├── Transformer 原理：Self-Attention、位置编码
    └── PyTorch 基本操作

第二阶段（核心组件）
    ├── 理解 CLIP：对比学习原理
    ├── 理解 VAE：变分推断基础
    └── 理解 UNet：下采样/上采样/跳跃连接

第三阶段（扩散模型）
    ├── DDPM：去噪扩散概率模型
    ├── DDIM：加速采样
    ├── Latent Diffusion（Stable Diffusion）
    └── CFG 和 ControlNet

第四阶段（多模态理解）
    ├── VLM 架构：LLaVA、Qwen-VL
    ├── 指令微调与对齐
    └── 视频理解（VideoLLaMA 等）

第五阶段（前沿）
    ├── DiT 和 FLUX
    ├── 视频生成（Sora 原理）
    └── 统一多模态模型（Any-to-Any）
```

### 10.3 推荐资源

**论文（按难度排序）**
1. CLIP: [Learning Transferable Visual Models From Natural Language Supervision](https://arxiv.org/abs/2103.00020)
2. DDPM: [Denoising Diffusion Probabilistic Models](https://arxiv.org/abs/2006.11239)
3. LDM/Stable Diffusion: [High-Resolution Image Synthesis with Latent Diffusion Models](https://arxiv.org/abs/2112.10752)
4. DiT: [Scalable Diffusion Models with Transformers](https://arxiv.org/abs/2212.09748)
5. LLaVA: [Visual Instruction Tuning](https://arxiv.org/abs/2304.08485)

**实践工具**
- [Hugging Face Diffusers](https://github.com/huggingface/diffusers)：扩散模型库
- [Hugging Face Transformers](https://github.com/huggingface/transformers)：通用模型库
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI)：可视化调试 SD 工作流

### 10.4 常见问题解答

**Q：CLIP 的图像向量维度为什么是 512 或 768？**
A：这是超参数，维度越大表达能力越强，但计算量也越大。ViT-B/32 输出 512 维，ViT-L/14 输出 768 维。

**Q：扩散模型为什么要在潜在空间而不是像素空间做？**
A：像素空间是 3×512×512 ≈ 78 万维度，在此运行 UNet 计算量极大。VAE 压缩到 4×64×64 ≈ 1.6 万维度，计算量减少约 **48 倍**，同时 VAE 已经帮助去除了像素级的冗余信息。

**Q：DiT 相比 UNet 最大的优势是什么？**
A：**可扩展性**。增大 DiT 的参数量（深度/宽度），性能会持续提升（遵循 Scaling Law）。而 UNet 的扩展性较差，增大参数收益递减更快。

**Q：视频生成和图像生成最大的区别是什么？**
A：视频需要额外保证**时间一致性**——相邻帧要连贯，不能跳变。这通过时间注意力机制来实现，让模型在生成每帧时都能参考其他帧的信息。

---

*本教程涵盖了多模态大模型的核心组件和原理。建议在阅读理论的同时，动手运行代码示例加深理解。多模态领域发展极快，保持关注 arXiv 和各大实验室的最新论文是保持前沿认知的最佳方式。*
