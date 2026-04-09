import { Buffer } from 'node:buffer'

/**
 * TTS 适配器占位：生成短 PCM WAV（正弦音），便于浏览器播放验证闭环。
 * 后续可替换为本地 TTS 服务。
 */
export function synthesizeMockWavBase64() {
  const sampleRate = 16000
  const durationSec = 0.55
  const freq = 523.25
  const numSamples = Math.floor(durationSec * sampleRate)
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.22
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
    buffer.writeInt16LE(int16, offset)
    offset += 2
  }

  return buffer.toString('base64')
}
