//
//  RCTConvert+NMFMapView.m
//  react-native-toss-naver-map
//

#import <NMapsMap/NMFCameraUpdate.h>
#import <NMapsMap/NMFCameraPosition.h>
#import <NMapsMap/NMFOverlay.h>

#import "RCTConvert+NMFMapView.h"

@implementation RCTConvert (NMFMapView)

+ (NMFCameraUpdate *)NMFCameraUpdate:(id)json
{
    json = [self NSDictionary:json];
    return [NMFCameraUpdate cameraUpdateWithScrollTo:NMGLatLngMake([self double:json[@"latitude"]], [self double:json[@"longitude"]])
                                              zoomTo:[self double:json[@"zoom"]]];
}

+ (NMFCameraUpdate *)NMFCameraUpdateWith:(id)json
{
    NMGLatLng *position = NMGLatLngMake([self double:json[@"latitude"]], [self double:json[@"longitude"]]);
    double zoom = [self double:json[@"zoom"]];
    double tilt = [self double:json[@"tilt"]];
    double bearing = [self double:json[@"bearing"]];

    NMFCameraPosition *cameraPosition = [NMFCameraPosition cameraPosition:position zoom:zoom tilt:tilt heading:bearing];
    NMFCameraUpdate *cameraUpdate = [NMFCameraUpdate cameraUpdateWithPosition:cameraPosition];
    cameraUpdate.animation = NMFCameraUpdateAnimationEaseIn;
    return cameraUpdate;
}

+ (NMGLatLng *)NMGLatLng:(id)json
{
    json = [self NSDictionary:json];
    return NMGLatLngMake([self double:json[@"latitude"]], [self double:json[@"longitude"]]);
}

+ (NMGLatLngBounds *)NMGLatLngBounds:(id)json
{
    json = [self NSDictionary:json];
    double lat = [self double:json[@"latitude"]];
    double latDelta = [self double:json[@"latitudeDelta"]];
    double lng = [self double:json[@"longitude"]];
    double lngDelta = [self double:json[@"longitudeDelta"]];
    return NMGLatLngBoundsMake(lat - latDelta / 2, lng - lngDelta / 2,  // southwest
                               lat + latDelta / 2, lng + lngDelta / 2); // northeast
}

+ (NMFAlignType *)NMFAlignType:(id)json
{
    json = [self NSNumber:json];
    if ([json isEqual:@(0)]) return NMFAlignType.center;
    if ([json isEqual:@(1)]) return NMFAlignType.left;
    if ([json isEqual:@(2)]) return NMFAlignType.right;
    if ([json isEqual:@(3)]) return NMFAlignType.top;
    if ([json isEqual:@(4)]) return NMFAlignType.bottom;
    if ([json isEqual:@(5)]) return NMFAlignType.topLeft;
    if ([json isEqual:@(6)]) return NMFAlignType.topRight;
    if ([json isEqual:@(7)]) return NMFAlignType.bottomRight;
    if ([json isEqual:@(8)]) return NMFAlignType.bottomLeft;

    return NMFAlignType.bottom;
}

@end
