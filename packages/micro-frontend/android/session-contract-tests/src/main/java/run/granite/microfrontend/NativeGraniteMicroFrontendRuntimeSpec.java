package run.granite.microfrontend;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

/** Only the RN-generated superclass is substituted; production host/session code is compiled. */
public abstract class NativeGraniteMicroFrontendRuntimeSpec extends ReactContextBaseJavaModule {
  public static final String NAME = "GraniteMicroFrontendRuntime";

  protected NativeGraniteMicroFrontendRuntimeSpec(ReactApplicationContext context) {
    super(context);
  }

  @Override public String getName() { return NAME; }
  public abstract void evaluateScript(ReadableMap request, Promise promise);
  public abstract void startEventDelivery();
  protected void emitOnEvent(WritableMap event) {
    throw new UnsupportedOperationException("Use a recording runtime target in host contract tests");
  }
}
