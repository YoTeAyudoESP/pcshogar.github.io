package com.yta.pcshogar;

import com.getcapacitor.BridgeActivity;

import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmbPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
