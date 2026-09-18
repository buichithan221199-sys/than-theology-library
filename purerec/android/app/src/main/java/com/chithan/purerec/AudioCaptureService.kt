package com.chithan.purerec

import android.app.*
import android.content.*
import android.content.pm.ServiceInfo
import android.media.*
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.*
import android.provider.MediaStore
import androidx.core.app.NotificationCompat
import java.io.*
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

class AudioCaptureService : Service() {
    companion object {
        const val ACTION_START = "com.chithan.purerec.START"
        const val ACTION_PAUSE = "com.chithan.purerec.PAUSE"
        const val ACTION_RESUME = "com.chithan.purerec.RESUME"
        const val ACTION_SAVE = "com.chithan.purerec.SAVE"
        const val ACTION_FINALIZE = "com.chithan.purerec.FINALIZE"
        const val ACTION_EVENT = "com.chithan.purerec.EVENT"
        const val EXTRA_RESULT_CODE = "resultCode"
        const val EXTRA_RESULT_DATA = "resultData"
        const val EXTRA_APPEND = "append"
        const val EXTRA_FILENAME = "fileName"
        const val EXTRA_FORMAT = "format"
        const val EXTRA_SHARE_MODE = "shareMode"
    }

    private var projection: MediaProjection? = null
    private var recorder: AudioRecord? = null
    private var writer: FileOutputStream? = null
    private var worker: Thread? = null
    private val running = AtomicBoolean(false)
    private val paused = AtomicBoolean(false)
    private val intentionalStop = AtomicBoolean(false)
    private val prefs by lazy { getSharedPreferences("purerec", MODE_PRIVATE) }
    private val pcmFile by lazy { File(filesDir, "draft.pcm") }

    override fun onBind(intent: Intent?) = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when(intent?.action) {
            ACTION_START -> startCapture(intent)
            ACTION_PAUSE -> { paused.set(true); emit("paused", "{\"durationMs\":${WavUtil.durationMs(pcmFile)}}") }
            ACTION_RESUME -> { paused.set(false); emit("recording") }
            ACTION_SAVE -> saveAndStop()
            ACTION_FINALIZE -> finalizeAndStop(intent.getStringExtra(EXTRA_FILENAME) ?: "PureRec_Recording", intent.getStringExtra(EXTRA_FORMAT) ?: "wav", intent.getStringExtra(EXTRA_SHARE_MODE) ?: "device")
        }
        return START_NOT_STICKY
    }

    private fun startCapture(intent: Intent) {
        if (running.get()) return
        val resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
        val resultData: Intent = (if (Build.VERSION.SDK_INT >= 33) {
            intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(EXTRA_RESULT_DATA)
        }) ?: return

        intentionalStop.set(false)
        if (Build.VERSION.SDK_INT >= 29) startForeground(42, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION)
        else startForeground(42, notification())
        val mp = getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projection = mp.getMediaProjection(resultCode, resultData)
        projection?.registerCallback(object: MediaProjection.Callback(){
            override fun onStop() { if (!intentionalStop.get()) { stopCaptureEngine(false); emit("error", "{\"message\":\"Quyền capture đã bị hệ thống dừng.\"}") } }
        }, Handler(Looper.getMainLooper()))

        val config = AudioPlaybackCaptureConfiguration.Builder(projection!!)
            .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(AudioAttributes.USAGE_GAME)
            .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
            .build()
        val format = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(WavUtil.SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_IN_STEREO)
            .build()
        val minBuffer = AudioRecord.getMinBufferSize(WavUtil.SAMPLE_RATE, AudioFormat.CHANNEL_IN_STEREO, AudioFormat.ENCODING_PCM_16BIT)
        recorder = AudioRecord.Builder()
            .setAudioFormat(format)
            .setBufferSizeInBytes(maxOf(minBuffer * 4, 64 * 1024))
            .setAudioPlaybackCaptureConfig(config)
            .build()

        val append = intent.getBooleanExtra(EXTRA_APPEND, false)
        if (!append && pcmFile.exists()) pcmFile.delete()
        writer = FileOutputStream(pcmFile, append)
        paused.set(false); running.set(true)
        recorder?.startRecording()
        worker = thread(name="PureRecCapture") {
            val buffer = ByteArray(32 * 1024)
            try {
                while(running.get()) {
                    val n = recorder?.read(buffer, 0, buffer.size) ?: break
                    if (n > 0 && !paused.get()) writer?.write(buffer, 0, n)
                }
            } catch (_: Throwable) {
            } finally {
                try { writer?.flush() } catch(_:Throwable){}
            }
        }
        emit("recording")
    }

    private fun saveAndStop() {
        stopCaptureEngine()
        val d = WavUtil.durationMs(pcmFile)
        prefs.edit().putBoolean("draftExists", pcmFile.exists() && pcmFile.length()>0).putLong("durationMs", d).apply()
        emit("saved", "{\"durationMs\":$d}")
        stopSelf()
    }

    private fun finalizeAndStop(requestedName: String, requestedFormat: String, shareMode: String) {
        stopCaptureEngine()
        if (!pcmFile.exists() || pcmFile.length()==0L) { emit("error", "{\"message\":\"Không có audio để xuất.\"}"); stopSelf(); return }
        try {
            val safe = requestedName.replace(Regex("[\\\\/:*?\"<>|]+"), "_").ifBlank { "PureRec_Recording" }
            val values = ContentValues().apply {
                put(MediaStore.Audio.Media.DISPLAY_NAME, "$safe.wav")
                put(MediaStore.Audio.Media.MIME_TYPE, "audio/wav")
                if (Build.VERSION.SDK_INT >= 29) put(MediaStore.Audio.Media.RELATIVE_PATH, "Music/PureRec")
            }
            val uri = contentResolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values) ?: error("Cannot create output")
            contentResolver.openOutputStream(uri)?.use { WavUtil.writeWave(pcmFile, it) } ?: error("Cannot open output")
            pcmFile.delete(); prefs.edit().clear().apply()
            emit("exported", "{\"uri\":\"${uri}\",\"actualFormat\":\"wav\",\"requestedFormat\":\"$requestedFormat\",\"shareMode\":\"$shareMode\"}")
        } catch (e: Throwable) {
            emit("error", "{\"message\":${jsonString("Xuất file thất bại: ${e.message ?: e.javaClass.simpleName}")}}")
        }
        stopSelf()
    }

    private fun stopCaptureEngine(stopProjection: Boolean = true) {
        if (!running.getAndSet(false)) return
        intentionalStop.set(true)
        try { recorder?.stop() } catch(_:Throwable){}
        try { worker?.join(1200) } catch(_:Throwable){}
        try { writer?.flush(); writer?.close() } catch(_:Throwable){}
        try { recorder?.release() } catch(_:Throwable){}
        recorder=null; writer=null; worker=null
        if (stopProjection) try { projection?.stop() } catch(_:Throwable){}
        projection=null
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun emit(type:String, payload:String="{}") {
        sendBroadcast(Intent(ACTION_EVENT).setPackage(packageName).putExtra("type",type).putExtra("payload",payload))
    }

    private fun createChannel(){
        if(Build.VERSION.SDK_INT>=26){
            val nm=getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(NotificationChannel("recording","PureRec Recording",NotificationManager.IMPORTANCE_LOW))
        }
    }
    private fun notification(): Notification = NotificationCompat.Builder(this,"recording")
        .setSmallIcon(android.R.drawable.presence_audio_online)
        .setContentTitle(getString(R.string.notification_title))
        .setContentText(getString(R.string.notification_text))
        .setOngoing(true).build()

    private fun jsonString(s:String):String = "\"" + s.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n") + "\""

    override fun onDestroy(){ stopCaptureEngine(); super.onDestroy() }
}