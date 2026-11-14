import SwiftUI

/// What a new player tells the team: the four things the roster shows, and
/// whether reminders may be texted. Only reached when the number is new to
/// the team; the captain reviews the result.
struct ProfileView: View {
    let context: JoinContext
    @Environment(Session.self) private var session
    @State private var name = ""
    @State private var position = RosterVocabulary.positions[0]
    @State private var playerClass = RosterVocabulary.classes[0]
    @State private var number = ""
    @State private var smsConsent = true
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var trimmedName: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        Form {
            Group {
                Section {
                    TextField("Full name", text: $name)
                        .textContentType(.name)
                        .textInputAutocapitalization(.words)
                    Picker("Position", selection: $position) {
                        ForEach(RosterVocabulary.positions, id: \.self) { Text($0) }
                    }
                    Picker("Class", selection: $playerClass) {
                        ForEach(RosterVocabulary.classes, id: \.self) { Text($0) }
                    }
                    TextField("Number (optional)", text: $number)
                        .keyboardType(.numberPad)
                        .onChange(of: number) { _, value in
                            let digits = String(value.filter(\.isNumber).prefix(3))
                            if digits != value { number = digits }
                        }
                } header: {
                    Text("About You")
                } footer: {
                    Text("This is what the roster shows. A captain will confirm you're on the team.")
                }

                Section {
                    Toggle("Text me reminders", isOn: $smsConsent)
                        .accentSwitch()
                } footer: {
                    Text("Captains can text reminders about practices and games. You can turn this off any time by replying STOP.")
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(AppTheme.notGoing)
                    }
                }

                Section {
                    JoinButton(title: "Join \(context.team.name)", isLoading: isSaving, isDisabled: trimmedName.isEmpty) {
                        Task { await save() }
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }
            .listRowBackground(AppTheme.surface)
        }
        .fixtureBackground()
        .navigationTitle("Your Profile")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(isSaving)
        .scrollDismissesKeyboard(.immediately)
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let profile = JoinProfile(
                name: trimmedName,
                position: position,
                playerClass: playerClass,
                number: Int(number),
                smsConsent: smsConsent
            )
            _ = try await session.join(code: context.code, profile: profile)
        } catch {
            errorMessage = Session.explain(error)
        }
    }
}
