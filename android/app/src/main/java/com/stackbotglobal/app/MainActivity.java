package com.stackbotglobal.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // ── Bump this version any time you change channel settings ──────────
    // Android locks channel config after creation. The ONLY way to apply
    // new settings on devices that already have the old channel is to
    // delete it and recreate with a new ID.  Incrementing this version
    // triggers that migration automatically on next app launch.
    private static final int CHANNEL_VERSION = 2;   // was 1 (implicit)

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        migrateNotificationChannels();
    }

    /**
     * Ensures notification channels always reflect the latest settings.
     *
     * On first run (or after CHANNEL_VERSION bump):
     *   1. Deletes old channels so the OS forgets user overrides
     *   2. Creates fresh channels with maximum loudness settings
     *   3. Persists the version so we don't repeat on every launch
     *
     * ROLLBACK: Revert CHANNEL_VERSION to 1 and redeploy. Users who
     * already got version 2 channels will keep them (no harm).
     */
    private void migrateNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        SharedPreferences prefs = getSharedPreferences("stackbot_channels", MODE_PRIVATE);
        int savedVersion = prefs.getInt("channel_version", 0);

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        if (savedVersion < CHANNEL_VERSION) {
            // ── Delete old channels so settings are unlocked ────────────
            tryDeleteChannel(manager, "orders");
            tryDeleteChannel(manager, "default");
            // Also clean up any legacy channel IDs if they existed
            tryDeleteChannel(manager, "stackbot_orders");
            tryDeleteChannel(manager, "stackbot_default");

            prefs.edit().putInt("channel_version", CHANNEL_VERSION).apply();
        }

        // ── Always ensure channels exist (idempotent after first create) ─
        createNotificationChannels(manager);
    }

    private void tryDeleteChannel(NotificationManager manager, String channelId) {
        try {
            manager.deleteNotificationChannel(channelId);
        } catch (Exception ignored) {
            // Channel may not exist — that's fine
        }
    }

    private void createNotificationChannels(NotificationManager manager) {
        AudioAttributes audioAttrs = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT) // Higher priority than USAGE_NOTIFICATION
                .build();

        // ═══════════════════════════════════════════════════════════════
        //  ORDERS CHANNEL — Maximum loudness for order/delivery alerts
        // ═══════════════════════════════════════════════════════════════
        NotificationChannel ordersChannel = new NotificationChannel(
                "orders",
                "Pedidos y Entregas / Orders & Deliveries",
                NotificationManager.IMPORTANCE_HIGH    // Heads-up banner + sound
        );
        ordersChannel.setDescription("Nuevos pedidos, actualizaciones de entrega, y cambios de estado");
        ordersChannel.enableVibration(true);
        ordersChannel.setVibrationPattern(new long[]{
                0,    // Start immediately
                600,  // Vibrate 600ms  (long buzz)
                200,  // Pause 200ms
                600,  // Vibrate 600ms  (long buzz)
                200,  // Pause 200ms
                400   // Vibrate 400ms  (short buzz — attention getter)
        });
        ordersChannel.enableLights(true);
        ordersChannel.setLightColor(0xFF00C853); // StackBot green
        ordersChannel.setBypassDnd(false);        // Respect DND, but show on lock screen
        ordersChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        ordersChannel.setShowBadge(true);
        ordersChannel.setSound(
                android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                audioAttrs
        );
        manager.createNotificationChannel(ordersChannel);

        // ═══════════════════════════════════════════════════════════════
        //  DEFAULT CHANNEL — General / broadcast notifications
        // ═══════════════════════════════════════════════════════════════
        NotificationChannel defaultChannel = new NotificationChannel(
                "default",
                "General / Notificaciones Generales",
                NotificationManager.IMPORTANCE_HIGH
        );
        defaultChannel.setDescription("Notificaciones generales, promociones, y anuncios del sistema");
        defaultChannel.enableVibration(true);
        defaultChannel.setVibrationPattern(new long[]{0, 400, 200, 400});
        defaultChannel.enableLights(true);
        defaultChannel.setLightColor(0xFF2196F3); // Blue
        defaultChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        defaultChannel.setShowBadge(true);
        defaultChannel.setSound(
                android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                audioAttrs
        );
        manager.createNotificationChannel(defaultChannel);
    }
}