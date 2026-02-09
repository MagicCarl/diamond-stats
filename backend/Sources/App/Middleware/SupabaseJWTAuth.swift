import Vapor
import JWT

/// Supabase JWT payload structure
struct SupabaseJWTPayload: JWTPayload {
    var sub: SubjectClaim
    var exp: ExpirationClaim
    var aud: AudienceClaim
    var role: String
    var email: String?

    func verify(using algorithm: some JWTAlgorithm) throws {
        try exp.verifyNotExpired()
    }
}

/// Authenticated user attached to requests
struct AuthenticatedUser: Authenticatable {
    let id: UUID
    let email: String?
}

/// Middleware that verifies Supabase JWTs on incoming requests
struct SupabaseJWTAuthenticator: AsyncBearerAuthenticator {
    func authenticate(bearer: BearerAuthorization, for request: Request) async throws {
        let payload = try await request.jwt.verify(bearer.token, as: SupabaseJWTPayload.self)
        guard let userId = UUID(uuidString: payload.sub.value) else {
            throw Abort(.unauthorized, reason: "Invalid user ID in token")
        }
        request.auth.login(AuthenticatedUser(id: userId, email: payload.email))
    }
}

/// Helper to get authenticated user from request
extension Request {
    var authenticatedUser: AuthenticatedUser {
        get throws {
            guard let user = auth.get(AuthenticatedUser.self) else {
                throw Abort(.unauthorized)
            }
            return user
        }
    }
}
