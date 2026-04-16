import Foundation
import WidgetKit

@objc(AppGroupBridge)
class AppGroupBridge: NSObject {

  @objc
  func setWidgetData(_ json: String) {
    let defaults = UserDefaults(suiteName: "group.com.misha.TickTack")
    defaults?.set(json, forKey: "widget_data")
    defaults?.synchronize()
    // Обновляем виджет
    WidgetCenter.shared.reloadAllTimelines()
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
