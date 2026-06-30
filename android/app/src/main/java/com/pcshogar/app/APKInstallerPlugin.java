package com.pcshogar.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "APKInstaller")
public class APKInstallerPlugin extends Plugin {
    private static final String TAG = "APKInstallerPlugin";

    @PluginMethod
    public void downloadAndInstall(final PluginCall call) {
        final String downloadUrl = call.getString("url");
        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        // Start thread for background download
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Context context = getContext();
                    URL url = new URL(downloadUrl);
                    HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    connection.connect();

                    // Expect HTTP 200 OK or similar
                    int responseCode = connection.getResponseCode();
                    if (responseCode != HttpURLConnection.HTTP_OK) {
                        Log.e(TAG, "Server returned HTTP " + responseCode);
                        call.reject("Server returned HTTP " + responseCode);
                        return;
                    }

                    int fileLength = connection.getContentLength();

                    // Create file in Cache Directory
                    File cacheDir = context.getCacheDir();
                    File apkFile = new File(cacheDir, "update.apk");
                    if (apkFile.exists()) {
                        apkFile.delete();
                    }

                    InputStream input = new BufferedInputStream(url.openStream(), 8192);
                    OutputStream output = new FileOutputStream(apkFile);

                    byte[] data = new byte[4096];
                    long total = 0;
                    int count;
                    int lastProgress = -1;

                    while ((count = input.read(data)) != -1) {
                        total += count;
                        if (fileLength > 0) {
                            int progress = (int) (total * 100 / fileLength);
                            if (progress != lastProgress) {
                                lastProgress = progress;
                                JSObject progressObj = new JSObject();
                                progressObj.put("progress", progress);
                                notifyListeners("downloadProgress", progressObj);
                            }
                        }
                        output.write(data, 0, count);
                    }

                    output.flush();
                    output.close();
                    input.close();

                    // Download complete. Trigger installer.
                    installApk(context, apkFile, call);

                } catch (Exception e) {
                    Log.e(TAG, "Error downloading APK: " + e.getMessage(), e);
                    JSObject errorObj = new JSObject();
                    errorObj.put("error", e.getMessage());
                    notifyListeners("downloadError", errorObj);
                    call.reject("Download failed: " + e.getMessage());
                }
            }
        }).start();
    }

    private void installApk(Context context, File apkFile, PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            Uri apkUri;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                String authority = context.getPackageName() + ".fileprovider";
                apkUri = FileProvider.getUriForFile(context, authority, apkFile);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error launching installer: " + e.getMessage(), e);
            call.reject("Failed to launch installer: " + e.getMessage());
        }
    }
}
