//
//  GraniteNaverMapView.mm
//  GraniteNaverMap
//

#import <UIKit/UIKit.h>
#import <NMapsMap/NMapsMap.h>

#import <React/RCTViewComponentView.h>
#import <React/RCTConversions.h>
#import <React/RCTFabricComponentsPlugins.h>
#import <React/RCTComponentViewFactory.h>

#import <react/renderer/components/GraniteNaverMapViewSpec/ComponentDescriptors.h>
#import <react/renderer/components/GraniteNaverMapViewSpec/EventEmitters.h>
#import <react/renderer/components/GraniteNaverMapViewSpec/Props.h>
#import <react/renderer/components/GraniteNaverMapViewSpec/RCTComponentViewHelpers.h>

// Import Swift module - the header is generated during build
#if __has_include(<GraniteNaverMap/GraniteNaverMap-Swift.h>)
#import <GraniteNaverMap/GraniteNaverMap-Swift.h>
#elif __has_include(<granite_naver_map/granite_naver_map-Swift.h>)
#import <granite_naver_map/granite_naver_map-Swift.h>
#else
#import "GraniteNaverMap-Swift.h"
#endif

using namespace facebook::react;

// Define GraniteNaverMapView inheriting from RCTViewComponentView here in .mm file
// The header declares it as UIView to avoid exposing C++ headers to Swift module
@interface GraniteNaverMapView : RCTViewComponentView <RCTGraniteNaverMapViewViewProtocol, RNNaverMapViewDelegate>
@end

@implementation GraniteNaverMapView {
    RNNaverMapViewImpl *_mapView;
    NSMutableDictionary<NSString *, id> *_markers;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<GraniteNaverMapViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    if (self = [super initWithFrame:frame]) {
        static const auto defaultProps = std::make_shared<const GraniteNaverMapViewProps>();
        _props = defaultProps;

        _mapView = [[RNNaverMapViewImpl alloc] initWithFrame:self.bounds];
        _mapView.eventDelegate = self;
        _markers = [NSMutableDictionary new];

        self.contentView = _mapView;
    }
    return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
    const auto &oldViewProps = *std::static_pointer_cast<GraniteNaverMapViewProps const>(_props);
    const auto &newViewProps = *std::static_pointer_cast<GraniteNaverMapViewProps const>(props);

    // center
    if (oldViewProps.center.latitude != newViewProps.center.latitude ||
        oldViewProps.center.longitude != newViewProps.center.longitude ||
        oldViewProps.center.zoom != newViewProps.center.zoom ||
        oldViewProps.center.tilt != newViewProps.center.tilt ||
        oldViewProps.center.bearing != newViewProps.center.bearing) {
        [_mapView setCenterWithLatitude:newViewProps.center.latitude
                              longitude:newViewProps.center.longitude
                                   zoom:newViewProps.center.zoom
                                   tilt:newViewProps.center.tilt
                                bearing:newViewProps.center.bearing];
    }

    // showsMyLocationButton
    if (oldViewProps.showsMyLocationButton != newViewProps.showsMyLocationButton) {
        _mapView.showsMyLocationButton = newViewProps.showsMyLocationButton;
    }

    // compass
    if (oldViewProps.compass != newViewProps.compass) {
        _mapView.compass = newViewProps.compass;
    }

    // scaleBar
    if (oldViewProps.scaleBar != newViewProps.scaleBar) {
        _mapView.scaleBar = newViewProps.scaleBar;
    }

    // zoomControl
    if (oldViewProps.zoomControl != newViewProps.zoomControl) {
        _mapView.zoomControl = newViewProps.zoomControl;
    }

    // mapType
    if (oldViewProps.mapType != newViewProps.mapType) {
        [_mapView setMapType:newViewProps.mapType];
    }

    // minZoomLevel
    if (oldViewProps.minZoomLevel != newViewProps.minZoomLevel) {
        _mapView.minZoomLevel = newViewProps.minZoomLevel;
    }

    // maxZoomLevel
    if (oldViewProps.maxZoomLevel != newViewProps.maxZoomLevel) {
        _mapView.maxZoomLevel = newViewProps.maxZoomLevel;
    }

    // buildingHeight
    if (oldViewProps.buildingHeight != newViewProps.buildingHeight) {
        _mapView.buildingHeight = newViewProps.buildingHeight;
    }

    // nightMode
    if (oldViewProps.nightMode != newViewProps.nightMode) {
        _mapView.nightMode = newViewProps.nightMode;
    }

    // mapPadding
    if (oldViewProps.mapPadding.top != newViewProps.mapPadding.top ||
        oldViewProps.mapPadding.left != newViewProps.mapPadding.left ||
        oldViewProps.mapPadding.bottom != newViewProps.mapPadding.bottom ||
        oldViewProps.mapPadding.right != newViewProps.mapPadding.right) {
        UIEdgeInsets padding = UIEdgeInsetsMake(
            newViewProps.mapPadding.top,
            newViewProps.mapPadding.left,
            newViewProps.mapPadding.bottom,
            newViewProps.mapPadding.right
        );
        _mapView.mapPadding = padding;
    }

    // locationTrackingMode
    if (oldViewProps.locationTrackingMode != newViewProps.locationTrackingMode) {
        _mapView.locationTrackingMode = newViewProps.locationTrackingMode;
    }

    // scrollGesturesEnabled
    if (oldViewProps.scrollGesturesEnabled != newViewProps.scrollGesturesEnabled) {
        _mapView.scrollGesturesEnabled = newViewProps.scrollGesturesEnabled;
    }

    // zoomGesturesEnabled
    if (oldViewProps.zoomGesturesEnabled != newViewProps.zoomGesturesEnabled) {
        _mapView.zoomGesturesEnabled = newViewProps.zoomGesturesEnabled;
    }

    // tiltGesturesEnabled
    if (oldViewProps.tiltGesturesEnabled != newViewProps.tiltGesturesEnabled) {
        _mapView.tiltGesturesEnabled = newViewProps.tiltGesturesEnabled;
    }

    // rotateGesturesEnabled
    if (oldViewProps.rotateGesturesEnabled != newViewProps.rotateGesturesEnabled) {
        _mapView.rotateGesturesEnabled = newViewProps.rotateGesturesEnabled;
    }

    // stopGesturesEnabled
    if (oldViewProps.stopGesturesEnabled != newViewProps.stopGesturesEnabled) {
        _mapView.stopGesturesEnabled = newViewProps.stopGesturesEnabled;
    }

    [super updateProps:props oldProps:oldProps];
}

#pragma mark - RCTGraniteNaverMapViewViewProtocol

- (void)animateToCoordinate:(double)latitude longitude:(double)longitude
{
    [_mapView animateToCoordinateWithLatitude:latitude longitude:longitude];
}

- (void)animateToTwoCoordinates:(double)lat1 lng1:(double)lng1 lat2:(double)lat2 lng2:(double)lng2
{
    [_mapView animateToTwoCoordinatesWithLat1:lat1 lng1:lng1 lat2:lat2 lng2:lng2];
}

- (void)animateToRegion:(double)latitude longitude:(double)longitude latitudeDelta:(double)latitudeDelta longitudeDelta:(double)longitudeDelta
{
    [_mapView animateToRegionWithLatitude:latitude longitude:longitude latitudeDelta:latitudeDelta longitudeDelta:longitudeDelta];
}

- (void)setLayerGroupEnabled:(NSString *)group enabled:(BOOL)enabled
{
    [_mapView setLayerGroupEnabledWithGroup:group enabled:enabled];
}

- (void)addMarker:(NSString *)identifier latitude:(double)latitude longitude:(double)longitude width:(NSInteger)width height:(NSInteger)height zIndex:(NSInteger)zIndex rotation:(float)rotation flat:(BOOL)flat alpha:(float)alpha pinColor:(NSInteger)pinColor image:(NSString *)image
{
    [_mapView addMarkerWithIdentifier:identifier latitude:latitude longitude:longitude width:width height:height zIndex:zIndex rotation:rotation flat:flat alpha:alpha pinColor:pinColor image:image];
}

- (void)updateMarker:(NSString *)identifier latitude:(double)latitude longitude:(double)longitude width:(NSInteger)width height:(NSInteger)height zIndex:(NSInteger)zIndex rotation:(float)rotation flat:(BOOL)flat alpha:(float)alpha pinColor:(NSInteger)pinColor image:(NSString *)image
{
    [_mapView updateMarkerWithIdentifier:identifier latitude:latitude longitude:longitude width:width height:height zIndex:zIndex rotation:rotation flat:flat alpha:alpha pinColor:pinColor image:image];
}

- (void)removeMarker:(NSString *)identifier
{
    [_mapView removeMarkerWithIdentifier:identifier];
}

#pragma mark - Polyline Commands

- (void)addPolyline:(NSString *)identifier coordsJson:(NSString *)coordsJson strokeWidth:(float)strokeWidth strokeColor:(NSInteger)strokeColor zIndex:(NSInteger)zIndex lineCap:(NSInteger)lineCap lineJoin:(NSInteger)lineJoin patternJson:(NSString *)patternJson
{
    [_mapView addPolylineWithIdentifier:identifier coordsJson:coordsJson strokeWidth:strokeWidth strokeColor:strokeColor zIndex:zIndex lineCap:lineCap lineJoin:lineJoin patternJson:patternJson];
}

- (void)updatePolyline:(NSString *)identifier coordsJson:(NSString *)coordsJson strokeWidth:(float)strokeWidth strokeColor:(NSInteger)strokeColor zIndex:(NSInteger)zIndex lineCap:(NSInteger)lineCap lineJoin:(NSInteger)lineJoin patternJson:(NSString *)patternJson
{
    [_mapView updatePolylineWithIdentifier:identifier coordsJson:coordsJson strokeWidth:strokeWidth strokeColor:strokeColor zIndex:zIndex lineCap:lineCap lineJoin:lineJoin patternJson:patternJson];
}

- (void)removePolyline:(NSString *)identifier
{
    [_mapView removePolylineWithIdentifier:identifier];
}

#pragma mark - Polygon Commands

- (void)addPolygon:(NSString *)identifier coordsJson:(NSString *)coordsJson holesJson:(NSString *)holesJson fillColor:(NSInteger)fillColor strokeColor:(NSInteger)strokeColor strokeWidth:(float)strokeWidth zIndex:(NSInteger)zIndex
{
    [_mapView addPolygonWithIdentifier:identifier coordsJson:coordsJson holesJson:holesJson fillColor:fillColor strokeColor:strokeColor strokeWidth:strokeWidth zIndex:zIndex];
}

- (void)updatePolygon:(NSString *)identifier coordsJson:(NSString *)coordsJson holesJson:(NSString *)holesJson fillColor:(NSInteger)fillColor strokeColor:(NSInteger)strokeColor strokeWidth:(float)strokeWidth zIndex:(NSInteger)zIndex
{
    [_mapView updatePolygonWithIdentifier:identifier coordsJson:coordsJson holesJson:holesJson fillColor:fillColor strokeColor:strokeColor strokeWidth:strokeWidth zIndex:zIndex];
}

- (void)removePolygon:(NSString *)identifier
{
    [_mapView removePolygonWithIdentifier:identifier];
}

#pragma mark - Circle Commands

- (void)addCircle:(NSString *)identifier latitude:(double)latitude longitude:(double)longitude radius:(double)radius fillColor:(NSInteger)fillColor strokeColor:(NSInteger)strokeColor strokeWidth:(float)strokeWidth zIndex:(NSInteger)zIndex
{
    [_mapView addCircleWithIdentifier:identifier latitude:latitude longitude:longitude radius:radius fillColor:fillColor strokeColor:strokeColor strokeWidth:strokeWidth zIndex:zIndex];
}

- (void)updateCircle:(NSString *)identifier latitude:(double)latitude longitude:(double)longitude radius:(double)radius fillColor:(NSInteger)fillColor strokeColor:(NSInteger)strokeColor strokeWidth:(float)strokeWidth zIndex:(NSInteger)zIndex
{
    [_mapView updateCircleWithIdentifier:identifier latitude:latitude longitude:longitude radius:radius fillColor:fillColor strokeColor:strokeColor strokeWidth:strokeWidth zIndex:zIndex];
}

- (void)removeCircle:(NSString *)identifier
{
    [_mapView removeCircleWithIdentifier:identifier];
}

#pragma mark - Path Commands

- (void)addPath:(NSString *)identifier coordsJson:(NSString *)coordsJson width:(float)width outlineWidth:(float)outlineWidth color:(NSInteger)color outlineColor:(NSInteger)outlineColor passedColor:(NSInteger)passedColor passedOutlineColor:(NSInteger)passedOutlineColor patternImage:(NSString *)patternImage patternInterval:(NSInteger)patternInterval progress:(float)progress zIndex:(NSInteger)zIndex
{
    [_mapView addPathWithIdentifier:identifier coordsJson:coordsJson width:width outlineWidth:outlineWidth color:color outlineColor:outlineColor passedColor:passedColor passedOutlineColor:passedOutlineColor patternImage:patternImage patternInterval:patternInterval progress:progress zIndex:zIndex];
}

- (void)updatePath:(NSString *)identifier coordsJson:(NSString *)coordsJson width:(float)width outlineWidth:(float)outlineWidth color:(NSInteger)color outlineColor:(NSInteger)outlineColor passedColor:(NSInteger)passedColor passedOutlineColor:(NSInteger)passedOutlineColor patternImage:(NSString *)patternImage patternInterval:(NSInteger)patternInterval progress:(float)progress zIndex:(NSInteger)zIndex
{
    [_mapView updatePathWithIdentifier:identifier coordsJson:coordsJson width:width outlineWidth:outlineWidth color:color outlineColor:outlineColor passedColor:passedColor passedOutlineColor:passedOutlineColor patternImage:patternImage patternInterval:patternInterval progress:progress zIndex:zIndex];
}

- (void)removePath:(NSString *)identifier
{
    [_mapView removePathWithIdentifier:identifier];
}

#pragma mark - ArrowheadPath Commands

- (void)addArrowheadPath:(NSString *)identifier coordsJson:(NSString *)coordsJson width:(float)width outlineWidth:(float)outlineWidth color:(NSInteger)color outlineColor:(NSInteger)outlineColor headSizeRatio:(float)headSizeRatio zIndex:(NSInteger)zIndex
{
    [_mapView addArrowheadPathWithIdentifier:identifier coordsJson:coordsJson width:width outlineWidth:outlineWidth color:color outlineColor:outlineColor headSizeRatio:headSizeRatio zIndex:zIndex];
}

- (void)updateArrowheadPath:(NSString *)identifier coordsJson:(NSString *)coordsJson width:(float)width outlineWidth:(float)outlineWidth color:(NSInteger)color outlineColor:(NSInteger)outlineColor headSizeRatio:(float)headSizeRatio zIndex:(NSInteger)zIndex
{
    [_mapView updateArrowheadPathWithIdentifier:identifier coordsJson:coordsJson width:width outlineWidth:outlineWidth color:color outlineColor:outlineColor headSizeRatio:headSizeRatio zIndex:zIndex];
}

- (void)removeArrowheadPath:(NSString *)identifier
{
    [_mapView removeArrowheadPathWithIdentifier:identifier];
}

#pragma mark - GroundOverlay Commands

- (void)addGroundOverlay:(NSString *)identifier southWestLat:(double)southWestLat southWestLng:(double)southWestLng northEastLat:(double)northEastLat northEastLng:(double)northEastLng image:(NSString *)image alpha:(float)alpha zIndex:(NSInteger)zIndex
{
    [_mapView addGroundOverlayWithIdentifier:identifier southWestLat:southWestLat southWestLng:southWestLng northEastLat:northEastLat northEastLng:northEastLng image:image alpha:alpha zIndex:zIndex];
}

- (void)updateGroundOverlay:(NSString *)identifier southWestLat:(double)southWestLat southWestLng:(double)southWestLng northEastLat:(double)northEastLat northEastLng:(double)northEastLng image:(NSString *)image alpha:(float)alpha zIndex:(NSInteger)zIndex
{
    [_mapView updateGroundOverlayWithIdentifier:identifier southWestLat:southWestLat southWestLng:southWestLng northEastLat:northEastLat northEastLng:northEastLng image:image alpha:alpha zIndex:zIndex];
}

- (void)removeGroundOverlay:(NSString *)identifier
{
    [_mapView removeGroundOverlayWithIdentifier:identifier];
}

#pragma mark - InfoWindow Commands

- (void)addInfoWindow:(NSString *)identifier latitude:(double)latitude longitude:(double)longitude text:(NSString *)text alpha:(float)alpha zIndex:(NSInteger)zIndex offsetX:(NSInteger)offsetX offsetY:(NSInteger)offsetY
{
    [_mapView addInfoWindowWithIdentifier:identifier latitude:latitude longitude:longitude text:text alpha:alpha zIndex:zIndex offsetX:offsetX offsetY:offsetY];
}

- (void)updateInfoWindow:(NSString *)identifier latitude:(double)latitude longitude:(double)longitude text:(NSString *)text alpha:(float)alpha zIndex:(NSInteger)zIndex offsetX:(NSInteger)offsetX offsetY:(NSInteger)offsetY
{
    [_mapView updateInfoWindowWithIdentifier:identifier latitude:latitude longitude:longitude text:text alpha:alpha zIndex:zIndex offsetX:offsetX offsetY:offsetY];
}

- (void)removeInfoWindow:(NSString *)identifier
{
    [_mapView removeInfoWindowWithIdentifier:identifier];
}

- (void)handleCommand:(const NSString *)commandName args:(const NSArray *)args
{
    RCTGraniteNaverMapViewHandleCommand(self, commandName, args);
}

#pragma mark - RNNaverMapViewDelegate

- (void)mapViewDidInitialize
{
    if (_eventEmitter) {
        std::dynamic_pointer_cast<const GraniteNaverMapViewEventEmitter>(_eventEmitter)->onInitialized({});
    }
}

- (void)mapViewDidChangeCameraWithLatitude:(double)latitude longitude:(double)longitude zoom:(double)zoom
{
    if (_eventEmitter) {
        GraniteNaverMapViewEventEmitter::OnCameraChange event = {
            .latitude = latitude,
            .longitude = longitude,
            .zoom = zoom
        };
        std::dynamic_pointer_cast<const GraniteNaverMapViewEventEmitter>(_eventEmitter)->onCameraChange(event);
    }
}

- (void)mapViewDidTouchWithReason:(NSInteger)reason animated:(BOOL)animated
{
    if (_eventEmitter) {
        GraniteNaverMapViewEventEmitter::OnTouch event = {
            .reason = static_cast<int>(reason),
            .animated = animated
        };
        std::dynamic_pointer_cast<const GraniteNaverMapViewEventEmitter>(_eventEmitter)->onTouch(event);
    }
}

- (void)mapViewDidClickWithX:(double)x y:(double)y latitude:(double)latitude longitude:(double)longitude
{
    if (_eventEmitter) {
        GraniteNaverMapViewEventEmitter::OnMapClick event = {
            .x = x,
            .y = y,
            .latitude = latitude,
            .longitude = longitude
        };
        std::dynamic_pointer_cast<const GraniteNaverMapViewEventEmitter>(_eventEmitter)->onMapClick(event);
    }
}

- (void)mapViewDidClickMarkerWithId:(NSString *)markerId
{
    if (_eventEmitter) {
        GraniteNaverMapViewEventEmitter::OnMarkerClick event = {
            .id = std::string([markerId UTF8String])
        };
        std::dynamic_pointer_cast<const GraniteNaverMapViewEventEmitter>(_eventEmitter)->onMarkerClick(event);
    }
}

@end

Class<RCTComponentViewProtocol> GraniteNaverMapViewCls(void)
{
    return GraniteNaverMapView.class;
}
