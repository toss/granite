//
//  PortalHostView.mm
//  Pods
//
//  Created by Kiryl Ziusko on 02/09/2025.
//

#import "PortalHostView.h"
#import "PortalRegistry.h"

#import <react/renderer/components/TeleportViewSpec/EventEmitters.h>
#import <react/renderer/components/TeleportViewSpec/Props.h>
#import <react/renderer/components/TeleportViewSpec/RCTComponentViewHelpers.h>
#import <react/renderer/components/TeleportViewSpec/RNTPortalHostViewComponentDescriptor.h>

#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

@interface PortalHostView () <RCTPortalHostViewViewProtocol>

@property (nonatomic, strong) NSString *registeredName;
@property (nonatomic, assign) BOOL isInBatch;
@property (nonatomic, assign) NSInteger batchBaseIndex;

@end

@implementation PortalHostView

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<PortalHostViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const PortalHostViewProps>();
    _props = defaultProps;
  }

  return self;
}

- (void)setName:(nullable NSString *)name
{
  if ([self.registeredName isEqualToString:name]) {
    return;
  }

  if (self.registeredName) {
    [[PortalRegistry sharedInstance] unregisterHost:self withName:self.registeredName];
  }
  self.registeredName = name;
  if (name) {
    [[PortalRegistry sharedInstance] registerHost:self withName:name];
  }
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];

  if (!self.registeredName) {
    return;
  }
  if (self.window) {
    [[PortalRegistry sharedInstance] registerHost:self withName:self.registeredName];
  } else {
    [[PortalRegistry sharedInstance] unregisterHost:self withName:self.registeredName];
  }
}

- (void)didAddSubview:(UIView *)subview
{
  [super didAddSubview:subview];
  if (self.onSubviewCountChanged) {
    self.onSubviewCountChanged();
  }
}

- (void)willRemoveSubview:(UIView *)subview
{
  [super willRemoveSubview:subview];
  if (!self.onSubviewCountChanged) {
    return;
  }
  // Notify on the next run loop so observers read the post-removal count.
  __weak PortalHostView *weakSelf = self;
  dispatch_async(dispatch_get_main_queue(), ^{
    PortalHostView *strongSelf = weakSelf;
    if (strongSelf && strongSelf.onSubviewCountChanged) {
      strongSelf.onSubviewCountChanged();
    }
  });
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<PortalHostViewProps const>(props);

  std::string nameStr = newViewProps.name;
  NSString *newName = nameStr.empty() ? nil : [NSString stringWithUTF8String:nameStr.c_str()];
  [self setName:newName];

  [super updateProps:props oldProps:oldProps];
}

- (void)layoutSubviews
{
  [super layoutSubviews];

  if (self.registeredName) {
    [[PortalRegistry sharedInstance] notifyHostLayoutChangedWithName:self.registeredName];
  }
}

- (NSInteger)nextInsertionIndexForChildAt:(NSInteger)childIndex
{
  if (!self.isInBatch) {
    self.isInBatch = YES;
    self.batchBaseIndex = (NSInteger)self.subviews.count;
    __weak PortalHostView *weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{
      weakSelf.isInBatch = NO;
    });
  }
  return MIN(self.batchBaseIndex + childIndex, (NSInteger)self.subviews.count);
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];

  self.isInBatch = NO;
  self.batchBaseIndex = 0;

  [self setName:nil];
}

- (void)dealloc
{
  if (self.registeredName) {
    [[PortalRegistry sharedInstance] unregisterHost:self withName:self.registeredName];
  }
}

Class<RCTComponentViewProtocol> PortalHostViewCls(void)
{
  return PortalHostView.class;
}

@end
