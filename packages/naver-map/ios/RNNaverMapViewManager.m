//
//  RNNaverMapViewManager.m
//  react-native-toss-naver-map
//

#import <React/RCTBridge.h>
#import <React/RCTViewManager.h>
#import "RCTConvert+NMFMapView.h"

@interface RCT_EXTERN_MODULE(RNNaverMapViewManager, RCTViewManager)

RCT_CUSTOM_VIEW_PROPERTY(center, NMFCameraUpdateWith*, RNNaverMapViewManager)
{
    if (json == nil) return;
    [self performSelector: NSSelectorFromString(@"moveCamera:view:")
               withObject:[RCTConvert NMFCameraUpdateWith: json]
               withObject: view];
}

RCT_EXPORT_VIEW_PROPERTY(showsMyLocationButton, BOOL)
RCT_EXPORT_VIEW_PROPERTY(mapPadding, UIEdgeInsets)
RCT_EXPORT_VIEW_PROPERTY(mapType, int)
RCT_EXPORT_VIEW_PROPERTY(compass, BOOL)
RCT_EXPORT_VIEW_PROPERTY(scaleBar, BOOL)
RCT_EXPORT_VIEW_PROPERTY(zoomControl, BOOL)
RCT_EXPORT_VIEW_PROPERTY(buildingHeight, float)
RCT_EXPORT_VIEW_PROPERTY(nightMode, BOOL)
RCT_EXPORT_VIEW_PROPERTY(minZoomLevel, double)
RCT_EXPORT_VIEW_PROPERTY(maxZoomLevel, double)
RCT_EXPORT_VIEW_PROPERTY(scrollGesturesEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(zoomGesturesEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(tiltGesturesEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(rotateGesturesEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(stopGesturesEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(tilt, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onInitialized, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCameraChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTouch, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMapClick, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMarkerClick, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(locationTrackingMode, int)

RCT_EXTERN_METHOD(setLayerGroupEnabled:(nonnull NSNumber *)reactTag
                  withGroup:(NSString *)group
                  withEnabled:(BOOL)enabled)

RCT_EXTERN_METHOD(animateToCoordinate:(nonnull NSNumber *)reactTag
                  withCoord:(NMGLatLng *)coord)

RCT_EXTERN_METHOD(animateToTwoCoordinates:(nonnull NSNumber *)reactTag
                  withCoord1:(NMGLatLng *)coord1
                  withCoord2:(NMGLatLng *)coord2)

RCT_EXTERN_METHOD(animateToRegion:(nonnull NSNumber *)reactTag
                  withBounds:(NMGLatLngBounds *)bounds)

RCT_EXTERN_METHOD(addMarker:(nonnull NSNumber *)reactTag
                  identifier:(NSString *)identifier
                  markerData:(NSDictionary *)markerData)

RCT_EXTERN_METHOD(updateMarker:(nonnull NSNumber *)reactTag
                  identifier:(NSString *)identifier
                  markerData:(NSDictionary *)markerData)

RCT_EXTERN_METHOD(removeMarker:(nonnull NSNumber *)reactTag
                  identifier:(NSString *)identifier)

@end
