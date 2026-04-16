#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SpotlightBridge, NSObject)
RCT_EXTERN_METHOD(indexReminders:(NSString *)json)
RCT_EXTERN_METHOD(removeReminder:(NSString *)reminderId)
RCT_EXTERN_METHOD(removeAll)
@end
