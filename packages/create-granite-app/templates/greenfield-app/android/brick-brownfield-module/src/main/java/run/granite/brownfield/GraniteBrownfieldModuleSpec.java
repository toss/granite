package run.granite.brownfield;

import com.brickmodule.BrickModuleBase;
import java.util.Collections;
import java.util.Map;
import kotlin.Unit;
import kotlin.coroutines.Continuation;

public interface GraniteBrownfieldModuleSpec extends BrickModuleBase {
    String MODULE_NAME = "GraniteBrownfieldModule";

    String getSchemeUri();

    Object closeView(Continuation<? super Unit> continuation);

    @Override
    default Map<String, Object> getConstants() {
        return Collections.singletonMap("schemeUri", getSchemeUri());
    }
}
