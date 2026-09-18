package com.chithan.purerec

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.media.MediaPlayer
import android.net.Uri
import android.media.projection.MediaProjectionManager
import android.os.*
import android.webkit.*
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.File

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var pendingAppend = false
    private val pcmFile by lazy { File(filesDir, "draft.pcm") }
    private val previewFile by lazy { File(cacheDir, "purerec_preview.wav") }
    private val prefs by lazy { getSharedPreferences("purerec", MODE_PRIVATE) }
    private var player: MediaPlayer? = null

    private val audioPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) launchProjectionPicker() else emit("error", JSONObject().put("message","PureRec cần quyền RECORD_AUDIO để Android cho phép playback capture."))
    }
    private val projectionPicker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val data=result.data
        if(result.resultCode==RESULT_OK && data!=null){
            val i=Intent(this,AudioCaptureService::class.java).setAction(AudioCaptureService.ACTION_START)
                .putExtra(AudioCaptureService.EXTRA_RESULT_CODE,result.resultCode)
                .putExtra(AudioCaptureService.EXTRA_RESULT_DATA,data)
                .putExtra(AudioCaptureService.EXTRA_APPEND,pendingAppend)
            ContextCompat.startForegroundService(this,i)
        } else emit("error",JSONObject().put("message","Bạn đã hủy quyền capture."))
    }

    private val eventReceiver = object: BroadcastReceiver(){
        override fun onReceive(context: Context?, intent: Intent?) {
            if(intent?.action!=AudioCaptureService.ACTION_EVENT) return
            val type=intent.getStringExtra("type")?:return
            val payload=try{JSONObject(intent.getStringExtra("payload")?:"{}")}catch(_:Throwable){JSONObject()}
            emit(type,payload)
            if(type=="exported" && payload.optString("shareMode")=="email") {
                val uri=payload.optString("uri")
                if(uri.isNotBlank()) shareToEmail(Uri.parse(uri))
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web=WebView(this)
        setContentView(web)
        web.setBackgroundColor(android.graphics.Color.rgb(7,11,20))
        web.settings.javaScriptEnabled=true
        web.settings.domStorageEnabled=true
        web.settings.mediaPlaybackRequiresUserGesture=false
        web.webViewClient=WebViewClient()
        web.addJavascriptInterface(Bridge(),"PureRecNative")
        web.loadUrl("file:///android_asset/web/index.html")
        ContextCompat.registerReceiver(this,eventReceiver,IntentFilter(AudioCaptureService.ACTION_EVENT),ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    inner class Bridge {
        @JavascriptInterface fun start(json:String){ runOnUiThread { requestCapture(false) } }
        @JavascriptInterface fun continueDraft(json:String){ runOnUiThread { requestCapture(true) } }
        @JavascriptInterface fun pause(json:String){ startService(Intent(this@MainActivity,AudioCaptureService::class.java).setAction(AudioCaptureService.ACTION_PAUSE)) }
        @JavascriptInterface fun resume(json:String){ startService(Intent(this@MainActivity,AudioCaptureService::class.java).setAction(AudioCaptureService.ACTION_RESUME)) }
        @JavascriptInterface fun saveDraft(json:String){ startService(Intent(this@MainActivity,AudioCaptureService::class.java).setAction(AudioCaptureService.ACTION_SAVE)) }
        @JavascriptInterface fun finalize(json:String){
            val o=try{JSONObject(json)}catch(_:Throwable){JSONObject()}
            val i=Intent(this@MainActivity,AudioCaptureService::class.java).setAction(AudioCaptureService.ACTION_FINALIZE)
                .putExtra(AudioCaptureService.EXTRA_FILENAME,o.optString("fileName","PureRec_Recording"))
                .putExtra(AudioCaptureService.EXTRA_FORMAT,o.optString("format","wav"))
                .putExtra(AudioCaptureService.EXTRA_SHARE_MODE,o.optString("shareMode","device"))
            startService(i)
        }
        @JavascriptInterface fun preview(json:String){ runOnUiThread { previewDraft() } }
        @JavascriptInterface fun playDraft(json:String){ runOnUiThread { previewDraft() } }
        @JavascriptInterface fun getDraftState(json:String){ runOnUiThread { sendDraftState() } }
        @JavascriptInterface fun deleteDraft(json:String){ runOnUiThread { pcmFile.delete(); prefs.edit().clear().apply(); sendDraftState() } }
    }

    private fun shareToEmail(uri: Uri){
        try {
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "audio/*"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "PureRec Recording")
                putExtra(Intent.EXTRA_TEXT, "Bản ghi âm từ PureRec")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(send, "Gửi bản ghi qua Email"))
        } catch(e: Throwable) {
            emit("error", JSONObject().put("message", "Không mở được ứng dụng Email: ${e.message}"))
        }
    }

    private fun requestCapture(append:Boolean){
        pendingAppend=append
        if(ContextCompat.checkSelfPermission(this,Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED){ audioPermission.launch(Manifest.permission.RECORD_AUDIO); return }
        launchProjectionPicker()
    }
    private fun launchProjectionPicker(){
        val mgr=getSystemService(MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        projectionPicker.launch(mgr.createScreenCaptureIntent())
    }

    private fun previewDraft(){
        startService(Intent(this,AudioCaptureService::class.java).setAction(AudioCaptureService.ACTION_PAUSE))
        if(!pcmFile.exists()||pcmFile.length()==0L){ emit("error",JSONObject().put("message","Chưa có audio để nghe lại.")); return }
        try{
            WavUtil.writeWaveFile(pcmFile,previewFile)
            player?.release(); player=MediaPlayer().apply{
                setDataSource(previewFile.absolutePath); prepare(); start()
            }
        }catch(e:Throwable){ emit("error",JSONObject().put("message","Không thể phát preview: ${e.message}")) }
    }

    private fun sendDraftState(){
        val exists=pcmFile.exists()&&pcmFile.length()>0
        emit("draftState",JSONObject().put("exists",exists).put("durationMs",WavUtil.durationMs(pcmFile)))
    }
    private fun emit(type:String,payload:JSONObject=JSONObject()){
        val event=JSONObject().put("type",type).put("payload",payload).toString()
        web.post{ web.evaluateJavascript("window.PureRecNativeEvent(${JSONObject.quote(event)})",null) }
    }

    override fun onDestroy(){
        try{unregisterReceiver(eventReceiver)}catch(_:Throwable){}
        player?.release(); super.onDestroy()
    }
}