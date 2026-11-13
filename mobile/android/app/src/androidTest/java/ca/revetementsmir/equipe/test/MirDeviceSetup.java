package ca.revetementsmir.equipe.test;
import android.app.KeyguardManager;
import android.content.Context;
import android.os.SystemClock;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.UiDevice;
import org.junit.Before;
import static org.junit.Assert.*;
/** Unlocked, interactive emulator prerequisite. No app data or permission is reset. */
public abstract class MirDeviceSetup {
 @Before public void prepareInteractiveDevice()throws Exception{
  UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());device.wakeUp();
  device.executeShellCommand("wm dismiss-keyguard");
  device.executeShellCommand("settings put secure show_ime_with_hard_keyboard 1");
  KeyguardManager keyguard=(KeyguardManager)InstrumentationRegistry.getInstrumentation().getTargetContext().getSystemService(Context.KEYGUARD_SERVICE);
  long end=SystemClock.uptimeMillis()+5000;while(keyguard.isKeyguardLocked()&&SystemClock.uptimeMillis()<end)SystemClock.sleep(100);
  assertFalse("Déverrouillage de l’émulateur requis avant toute interaction",keyguard.isKeyguardLocked());assertTrue("Écran de l’émulateur allumé",device.isScreenOn());
 }
}
