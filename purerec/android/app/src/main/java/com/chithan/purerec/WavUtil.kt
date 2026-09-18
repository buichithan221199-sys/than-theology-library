package com.chithan.purerec

import java.io.*

object WavUtil {
    const val SAMPLE_RATE = 48_000
    const val CHANNELS = 2
    const val BITS = 16
    const val BYTES_PER_SECOND = SAMPLE_RATE * CHANNELS * (BITS / 8)

    fun durationMs(pcm: File): Long = if (pcm.exists()) pcm.length() * 1000L / BYTES_PER_SECOND else 0L

    fun writeWave(pcm: File, out: OutputStream) {
        val dataSize = pcm.length()
        val byteRate = BYTES_PER_SECOND
        val header = ByteArray(44)
        fun putAscii(offset: Int, text: String) = text.toByteArray(Charsets.US_ASCII).copyInto(header, offset)
        fun putLe16(offset: Int, v: Int) { header[offset]=(v and 0xff).toByte(); header[offset+1]=((v shr 8) and 0xff).toByte() }
        fun putLe32(offset: Int, v: Long) {
            header[offset]=(v and 0xff).toByte(); header[offset+1]=((v shr 8) and 0xff).toByte()
            header[offset+2]=((v shr 16) and 0xff).toByte(); header[offset+3]=((v shr 24) and 0xff).toByte()
        }
        putAscii(0,"RIFF"); putLe32(4,36 + dataSize); putAscii(8,"WAVE"); putAscii(12,"fmt ")
        putLe32(16,16); putLe16(20,1); putLe16(22,CHANNELS); putLe32(24,SAMPLE_RATE.toLong())
        putLe32(28,byteRate.toLong()); putLe16(32,CHANNELS * BITS / 8); putLe16(34,BITS)
        putAscii(36,"data"); putLe32(40,dataSize)
        out.write(header)
        FileInputStream(pcm).use { input -> input.copyTo(out, 64 * 1024) }
    }

    fun writeWaveFile(pcm: File, wav: File) {
        FileOutputStream(wav, false).use { writeWave(pcm, it) }
    }
}