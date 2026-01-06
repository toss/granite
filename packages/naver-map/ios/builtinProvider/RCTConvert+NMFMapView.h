//
//  RCTConvert+NMFMapView.h
//  react-native-toss-naver-map
//

#import <React/RCTConvert.h>
#import <NMapsMap/NMapsMap.h>

@interface RCTConvert (NMFMapView)

+ (NMFCameraUpdate *)NMFCameraUpdate:(id)json;
+ (NMFCameraUpdate *)NMFCameraUpdateWith:(id)json;
+ (NMGLatLng *)NMGLatLng:(id)json;
+ (NMGLatLngBounds *)NMGLatLngBounds:(id)json;
+ (NMFAlignType *)NMFAlignType:(id)json;

@end
