//
//  ucsdmcsApp.swift
//  ucsdmcs
//
//  Created by Lucius Scala on 9/9/26.
//

import SwiftUI

@main
struct ucsdmcsApp: App {
    @State private var session = Session()
    @State private var dataService = DataService()
    @State private var deepLinkManager = DeepLinkManager()
    @State private var updateChecker = UpdateChecker()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(session)
                .environment(dataService)
                .environment(deepLinkManager)
                .environment(updateChecker)
                .tint(AppTheme.buttonBlue)
                .preferredColorScheme(.dark)
                .task { await session.start() }
                .onOpenURL { url in
                    deepLinkManager.handle(url: url)
                }
        }
    }
}
