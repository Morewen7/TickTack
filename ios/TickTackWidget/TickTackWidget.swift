import WidgetKit
import SwiftUI

// MARK: - Data Model

struct WidgetReminder: Codable, Identifiable {
  let id: String
  let title: String
  let priority: String
  let dueDate: String?
  let completed: Bool
}

struct WidgetData: Codable {
  let reminders: [WidgetReminder]
}

// MARK: - Data Loading

func loadReminders() -> [WidgetReminder] {
  guard
    let defaults = UserDefaults(suiteName: "group.com.misha.TickTack"),
    let json = defaults.string(forKey: "widget_data"),
    let data = json.data(using: .utf8),
    let widgetData = try? JSONDecoder().decode(WidgetData.self, from: data)
  else { return [] }

  let now = Date()
  let calendar = Calendar.current
  let formatter = ISO8601DateFormatter()

  return widgetData.reminders
    .filter { !$0.completed }
    .filter { r in
      guard let str = r.dueDate, let date = formatter.date(from: str) else {
        return true // без даты — показываем
      }
      return calendar.isDateInToday(date) || date < now
    }
    .prefix(5)
    .map { $0 }
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date(), reminders: [
      WidgetReminder(id: "1", title: "Позвонить маме", priority: "high", dueDate: nil, completed: false),
      WidgetReminder(id: "2", title: "Купить продукты", priority: "medium", dueDate: nil, completed: false),
    ])
  }

  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
    completion(SimpleEntry(date: Date(), reminders: loadReminders()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
    let entry = SimpleEntry(date: Date(), reminders: loadReminders())
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
    completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
  }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
  let reminders: [WidgetReminder]
}

// MARK: - Colors

func priorityColor(_ priority: String) -> Color {
  switch priority {
  case "high":   return Color(red: 1.0,  green: 0.36, blue: 0.36)
  case "medium": return Color(red: 0.96, green: 0.78, blue: 0.26)
  default:       return Color(red: 0.30, green: 0.85, blue: 0.48)
  }
}

// MARK: - Widget View

struct TickTackWidgetEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  var maxItems: Int { family == .systemSmall ? 3 : 5 }

  var body: some View {
    if entry.reminders.isEmpty {
      VStack(spacing: 6) {
        Text("✓")
          .font(.system(size: 28))
          .foregroundColor(.white.opacity(0.25))
        Text("Всё выполнено")
          .font(.system(size: 13, weight: .medium))
          .foregroundColor(.white.opacity(0.25))
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    } else {
      VStack(alignment: .leading, spacing: 0) {
          HStack {
            Text("TickTack")
              .font(.system(size: 11, weight: .bold))
              .foregroundColor(.white.opacity(0.3))
            Spacer()
            Text("\(entry.reminders.count)")
              .font(.system(size: 11, weight: .bold))
              .foregroundColor(Color(red: 0, green: 0.83, blue: 1))
          }
          .padding(.bottom, 8)

          let visible = Array(entry.reminders.prefix(maxItems))
          ForEach(Array(visible.enumerated()), id: \.element.id) { index, reminder in
            HStack(spacing: 8) {
              Circle()
                .fill(priorityColor(reminder.priority))
                .frame(width: 6, height: 6)
              Text(reminder.title)
                .font(.system(size: family == .systemSmall ? 13 : 14, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(1)
            }
            .padding(.vertical, 5)

            if index < visible.count - 1 {
              Rectangle()
                .fill(Color.white.opacity(0.07))
                .frame(height: 1)
            }
          }
          Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }
}

// MARK: - Widget Configuration

struct TickTackWidget: Widget {
  let kind: String = "TickTackWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      TickTackWidgetEntryView(entry: entry)
        .containerBackground(for: .widget) {
          Color(red: 0.067, green: 0.067, blue: 0.067)
        }
    }
    .configurationDisplayName("TickTack")
    .description("Задачи на сегодня")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
