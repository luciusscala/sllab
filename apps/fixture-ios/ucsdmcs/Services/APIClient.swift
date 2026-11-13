import Foundation

/// The SLLAB platform API (`apps/api`): the parts of the app that need a
/// server rather than Supabase alone, such as SMS reminders. Routes are
/// versioned (`v1/...`), so a build in the field keeps working when the API
/// moves on.
enum APIClient {
    /// Called directly, with no redirect in between: URLSession drops the
    /// `Authorization` header on a cross-host redirect.
    static let baseURL = URL(string: "https://api.sllab.io")!

    /// Carries the server's own `{ "error": "..." }` message to the UI.
    struct ServerError: LocalizedError {
        let errorDescription: String?
    }

    static func post<Response: Decodable>(
        _ path: String,
        body: some Encodable,
        token: String? = nil
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        guard (200..<300).contains(status) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
            throw ServerError(errorDescription: message ?? "Server error (\(status)).")
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }

    private struct ErrorBody: Decodable {
        let error: String
    }
}
