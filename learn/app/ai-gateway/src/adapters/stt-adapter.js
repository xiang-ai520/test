/**
 * STT 适配器占位。后续可替换为 Whisper 等实现。
 * @param {number} base64Length
 * @param {string} mimeType
 */
export function transcribeMock(base64Length, mimeType) {
  const approxBytes = Math.floor((base64Length * 3) / 4)
  const approxKb = Math.max(1, Math.round(approxBytes / 1024))
  return `（mock STT）收到 ${mimeType || 'audio'}，约 ${approxKb} KB。占位转写：你好，这是本地语音链路的测试。`
}
