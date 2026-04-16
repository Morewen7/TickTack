import Foundation
import CoreSpotlight
import MobileCoreServices

struct SpotlightReminder: Decodable {
  let id: String
  let title: String
  let note: String?
  let priority: String?
}

@objc(SpotlightBridge)
class SpotlightBridge: NSObject {

  @objc
  func indexReminders(_ json: String) {
    guard
      let data = json.data(using: .utf8),
      let reminders = try? JSONDecoder().decode([SpotlightReminder].self, from: data)
    else { return }

    let items = reminders.map { r -> CSSearchableItem in
      let attrs = CSSearchableItemAttributeSet(contentType: .text)
      attrs.title = r.title
      attrs.contentDescription = r.note ?? ""
      attrs.keywords = ["напоминание", "задача", r.priority ?? ""].filter { !$0.isEmpty }
      return CSSearchableItem(
        uniqueIdentifier: "ticktack.\(r.id)",
        domainIdentifier: "com.misha.TickTack",
        attributeSet: attrs
      )
    }

    CSSearchableIndex.default().indexSearchableItems(items) { _ in }
  }

  @objc
  func removeReminder(_ reminderId: String) {
    CSSearchableIndex.default().deleteSearchableItems(
      withIdentifiers: ["ticktack.\(reminderId)"]
    ) { _ in }
  }

  @objc
  func removeAll() {
    CSSearchableIndex.default().deleteSearchableItems(
      withDomainIdentifiers: ["com.misha.TickTack"]
    ) { _ in }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }
}
