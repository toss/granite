import XCTest
import GraniteVideo

#if GRANITE_VIDEO_DEFAULT_PROVIDER
final class DefaultProviderTests: XCTestCase {
    func testDefaultProviderExposesProgressControlToObjectiveC() {
        let provider = AVPlayerProvider()
        XCTAssertTrue(provider.responds(to: #selector(GraniteVideoProvidable.setProgressUpdateInterval(_:))))
        provider.setProgressUpdateInterval(125)
        provider.setProgressUpdateInterval(0)
        provider.unload()
    }
}
#endif
