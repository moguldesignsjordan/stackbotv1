package com.stackbotglobal.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);

            // HIGH-PRIORITY orders channel
            NotificationChannel ordersChannel = new NotificationChannel(
                "orders",
                "Orders & Deliveries",
                NotificationManager.IMPORTANCE_HIGH // Heads-up + sound
            );
            ordersChannel.setDescription("New orders, delivery updates, and status changes");
            ordersChannel.enableVibration(true);
            ordersChannel.setVibrationPattern(new long[]{0, 500, 200, 500}); // Strong double-buzz
            ordersChannel.enableLights(true);
            
            // Use default alarm sound (louder than default notification)
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            ordersChannel.setSound(
                Uri.parse("android.resource://" + getPackageName() + "/raw/notification_sound"),
                audioAttributes
            );

            manager.createNotificationChannel(ordersChannel);

            // Default channel (keep for general notifications)
            NotificationChannel defaultChannel = new NotificationChannel(
                "default",
                "General",
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription("General notifications");
            defaultChannel.enableVibration(true);
            defaultChannel.setVibrationPattern(new long[]{0, 400, 200, 400});
            manager.createNotificationChannel(defaultChannel);
        }
    }
}
```

### Step B: Add a custom notification sound

Place a loud `.mp3` or `.wav` file at:
```
android/app/src/main/res/raw/notification_sound.mp3