package com.yta.pcshogar;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Properties;
import java.util.Scanner;

import jcifs.CIFSContext;
import jcifs.config.PropertyConfiguration;
import jcifs.context.BaseContext;
import jcifs.smb.NtlmPasswordAuthenticator;
import jcifs.smb.SmbFile;
import jcifs.smb.SmbFileInputStream;
import jcifs.smb.SmbFileOutputStream;

@CapacitorPlugin(name = "SmbPlugin")
public class SmbPlugin extends Plugin {

    private static final String TAG = "SmbPlugin";
    private CIFSContext baseContext;

    @Override
    public void load() {
        super.load();
        initContext();
    }

    private void initContext() {
        if (baseContext != null)
            return;
        try {
            Properties prop = new Properties();
            prop.setProperty("jcifs.smb.client.minVersion", "SMB202");
            prop.setProperty("jcifs.smb.client.maxVersion", "SMB311");
            prop.setProperty("jcifs.smb.client.ipcSigningEnforced", "false");
            prop.setProperty("jcifs.smb.client.useSMB2Negotiation", "true");
            prop.setProperty("jcifs.smb.client.responseTimeout", "60000");
            prop.setProperty("jcifs.smb.client.connTimeout", "60000");
            prop.setProperty("jcifs.smb.client.sessionTimeout", "60000");

            // Critical for some servers to find the path
            prop.setProperty("jcifs.smb.client.dfs.disabled", "true");
            prop.setProperty("jcifs.smb.client.resolveOrder", "BCAST,DNS,LMHOSTS");
            prop.setProperty("jcifs.smb.client.useExtendedSecurity", "true");

            PropertyConfiguration config = new PropertyConfiguration(prop);
            baseContext = new BaseContext(config);
            Log.d(TAG, "SMB Context initialized with DFS disabled and BCAST resolution.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to init SMB context", e);
        }
    }

    private CIFSContext getContext(String username, String password, String domain) throws Exception {
        if (baseContext == null) {
            initContext();
            if (baseContext == null) {
                throw new Exception("SMB base context is null");
            }
        }

        String authDomain = (domain == null || domain.isEmpty()) ? null : domain;
        if (username != null && !username.isEmpty()) {
            NtlmPasswordAuthenticator auth = new NtlmPasswordAuthenticator(authDomain, username, password);
            return baseContext.withCredentials(auth);
        }
        return baseContext.withGuestCrendentials();
    }

    private String normalizePath(String path) {
        if (path == null)
            return null;
        String normalized = path.trim().replace("\\", "/");

        // Remove existing prefixes
        if (normalized.startsWith("smb://")) {
            normalized = normalized.substring(6);
        } else if (normalized.startsWith("smb:")) {
            normalized = normalized.substring(4);
        }

        // Remove leading slashes
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }

        // Ensure we have at least host and split
        int firstSlash = normalized.indexOf("/");
        if (firstSlash == -1) {
            // It's just a host
            return "smb://" + normalized + "/";
        }

        String host = normalized.substring(0, firstSlash);
        String rest = normalized.substring(firstSlash).replaceAll("/{2,}", "/");

        String result = "smb://" + host + rest;
        Log.d(TAG, "Normalized path: " + path + " -> " + result);
        return result;
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String share = normalizePath(call.getString("share"));
        String username = call.getString("username", "");
        String password = call.getString("password", "");
        String domain = call.getString("domain", "");

        if (share == null) {
            call.reject("Share URL is required");
            return;
        }

        if (!share.endsWith("/")) {
            share += "/";
        }

        try {
            CIFSContext context = getContext(username, password, domain);
            SmbFile file = new SmbFile(share, context);

            boolean accessible = false;
            try {
                // Some servers need to check directory or list even if exists() is false for
                // root
                if (file.isDirectory() || (file.list() != null)) {
                    accessible = true;
                }
            } catch (Exception e) {
                Log.w(TAG, "Strict accessibility check failed for " + share + ": " + e.getMessage());
                // Panic check: can we at least get type?
                try {
                    file.getType();
                    accessible = true;
                } catch (Exception e2) {
                }
            }

            if (accessible) {
                call.resolve();
            } else {
                call.reject("Access denied to " + share + ". Verify credentials.");
            }
        } catch (Exception e) {
            call.reject("Connection failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void list(PluginCall call) {
        String path = normalizePath(call.getString("path"));
        String username = call.getString("username", "");
        String password = call.getString("password", "");
        String domain = call.getString("domain", "");

        if (path == null) {
            call.reject("Path is required");
            return;
        }

        try {
            CIFSContext context = getContext(username, password, domain);
            SmbFile file = new SmbFile(path, context);

            SmbFile[] files = file.listFiles();
            List<JSObject> fileList = new ArrayList<>();

            if (files != null) {
                for (SmbFile f : files) {
                    JSObject obj = new JSObject();
                    String name = f.getName();
                    if (name.endsWith("/"))
                        name = name.substring(0, name.length() - 1);
                    obj.put("name", name);
                    obj.put("path", f.getCanonicalPath());
                    obj.put("isDirectory", f.isDirectory());
                    obj.put("size", f.length());
                    obj.put("lastModified", f.lastModified());
                    fileList.add(obj);
                }
            }

            JSObject ret = new JSObject();
            com.getcapacitor.JSArray jsArray = new com.getcapacitor.JSArray();
            for (JSObject j : fileList) {
                jsArray.put(j);
            }
            ret.put("files", jsArray);
            call.resolve(ret);

        } catch (Exception e) {
            call.reject("List failed (" + path + "): " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        String path = normalizePath(call.getString("path"));
        String username = call.getString("username", "");
        String password = call.getString("password", "");
        String domain = call.getString("domain", "");

        if (path == null) {
            call.reject("Path is required");
            return;
        }

        try {
            CIFSContext context = getContext(username, password, domain);
            SmbFile file = new SmbFile(path, context);

            try {
                if (!file.exists()) {
                    JSObject ret = new JSObject();
                    ret.put("content", "");
                    call.resolve(ret);
                    return;
                }
            } catch (Exception e) {
                if (e.getMessage() != null && e.getMessage().contains("find the path")) {
                    JSObject ret = new JSObject();
                    ret.put("content", "");
                    call.resolve(ret);
                    return;
                }
                throw e;
            }

            try (InputStream in = new SmbFileInputStream(file)) {
                Scanner s = new Scanner(in).useDelimiter("\\A");
                String result = s.hasNext() ? s.next() : "";
                JSObject ret = new JSObject();
                ret.put("content", result);
                call.resolve(ret);
            }

        } catch (Exception e) {
            call.reject("Read failed (" + path + "): " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void writeFile(PluginCall call) {
        String path = normalizePath(call.getString("path"));
        String content = call.getString("content");
        String username = call.getString("username", "");
        String password = call.getString("password", "");
        String domain = call.getString("domain", "");

        if (path == null || content == null) {
            call.reject("Path and content are required");
            return;
        }

        try {
            CIFSContext context = getContext(username, password, domain);
            SmbFile file = new SmbFile(path, context);

            // Using SmbFileOutputStream with append=false to truncate.
            try (OutputStream out = new SmbFileOutputStream(file, false)) {
                out.write(content.getBytes("UTF-8"));
            }

            call.resolve();

        } catch (Exception e) {
            String msg = e.getMessage();
            Log.e(TAG, "Write failed to " + path + ": " + msg);
            call.reject("Write failed [" + path + "]: " + msg, e);
        }
    }
}
