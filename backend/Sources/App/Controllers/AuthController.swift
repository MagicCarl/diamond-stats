import Vapor

/// Proxies authentication requests to Supabase Auth API.
/// The frontend uses Supabase JS client directly for auth,
/// but this controller provides server-side endpoints for
/// environments where direct Supabase access isn't ideal.
struct AuthController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.post("signup", use: signup)
        routes.post("login", use: login)

        // Protected - requires valid JWT
        let protected = routes.grouped(SupabaseJWTAuthenticator())
        protected.get("me", use: me)
    }

    // MARK: - Signup

    struct SignupRequest: Content {
        let email: String
        let password: String
    }

    func signup(req: Request) async throws -> Response {
        let input = try req.content.decode(SignupRequest.self)

        guard let supabaseURL = Environment.get("SUPABASE_URL"),
              let supabaseKey = Environment.get("SUPABASE_ANON_KEY") else {
            throw Abort(.internalServerError, reason: "Supabase not configured")
        }

        let response = try await req.client.post(URI(string: "\(supabaseURL)/auth/v1/signup")) { clientReq in
            clientReq.headers.add(name: .contentType, value: "application/json")
            clientReq.headers.add(name: "apikey", value: supabaseKey)
            try clientReq.content.encode(input)
        }

        // Forward Supabase response
        var headers = HTTPHeaders()
        headers.add(name: .contentType, value: "application/json")
        return Response(
            status: response.status,
            headers: headers,
            body: response.body.map { .init(buffer: $0) } ?? .empty
        )
    }

    // MARK: - Login

    struct LoginRequest: Content {
        let email: String
        let password: String
    }

    func login(req: Request) async throws -> Response {
        let input = try req.content.decode(LoginRequest.self)

        guard let supabaseURL = Environment.get("SUPABASE_URL"),
              let supabaseKey = Environment.get("SUPABASE_ANON_KEY") else {
            throw Abort(.internalServerError, reason: "Supabase not configured")
        }

        let body: [String: String] = [
            "email": input.email,
            "password": input.password
        ]

        let response = try await req.client.post(
            URI(string: "\(supabaseURL)/auth/v1/token?grant_type=password")
        ) { clientReq in
            clientReq.headers.add(name: .contentType, value: "application/json")
            clientReq.headers.add(name: "apikey", value: supabaseKey)
            try clientReq.content.encode(body)
        }

        var headers = HTTPHeaders()
        headers.add(name: .contentType, value: "application/json")
        return Response(
            status: response.status,
            headers: headers,
            body: response.body.map { .init(buffer: $0) } ?? .empty
        )
    }

    // MARK: - Me

    struct MeResponse: Content {
        let id: UUID
        let email: String?
        let organizations: [OrganizationDTO]
    }

    struct OrganizationDTO: Content {
        let id: UUID
        let name: String
        let teamCount: Int
    }

    func me(req: Request) async throws -> MeResponse {
        let user = try req.authenticatedUser

        let orgs = try await Organization.query(on: req.db)
            .filter(\.$ownerID == user.id)
            .with(\.$teams)
            .all()

        return MeResponse(
            id: user.id,
            email: user.email,
            organizations: orgs.map { org in
                OrganizationDTO(
                    id: org.id!,
                    name: org.name,
                    teamCount: org.teams.count
                )
            }
        )
    }
}
