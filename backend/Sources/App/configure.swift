import Vapor
import Fluent
import FluentPostgresDriver
import JWT

func configure(_ app: Application) async throws {
    // CORS - allow frontend origin
    let corsConfig = CORSMiddleware.Configuration(
        allowedOrigin: .any([
            Environment.get("FRONTEND_URL") ?? "http://localhost:3000",
            "https://*.vercel.app"
        ]),
        allowedMethods: [.GET, .POST, .PUT, .PATCH, .DELETE, .OPTIONS],
        allowedHeaders: [.accept, .authorization, .contentType, .origin],
        allowCredentials: true
    )
    app.middleware.use(CORSMiddleware(configuration: corsConfig))

    // Database - Supabase PostgreSQL
    if let dbURL = Environment.get("DATABASE_URL") {
        try app.databases.use(.postgres(url: dbURL), as: .psql)
    } else {
        app.databases.use(
            .postgres(configuration: SQLPostgresConfiguration(
                hostname: Environment.get("DB_HOST") ?? "localhost",
                port: Environment.get("DB_PORT").flatMap(Int.init) ?? 5432,
                username: Environment.get("DB_USER") ?? "postgres",
                password: Environment.get("DB_PASS") ?? "password",
                database: Environment.get("DB_NAME") ?? "diamond_stats",
                tls: .prefer(try .init(configuration: .clientDefault))
            )),
            as: .psql
        )
    }

    // JWT - Supabase JWT secret for token verification
    let jwtSecret = Environment.get("SUPABASE_JWT_SECRET") ?? "super-secret-jwt-token-with-at-least-32-characters-long"
    await app.jwt.keys.add(hmac: jwtSecret, digestAlgorithm: .sha256)

    // Migrations
    app.migrations.add(CreateOrganization())
    app.migrations.add(CreateTeam())
    app.migrations.add(CreateSeason())
    app.migrations.add(CreatePlayer())
    app.migrations.add(CreateGame())
    app.migrations.add(CreateLineupEntry())
    app.migrations.add(CreateAtBat())
    app.migrations.add(CreatePitchingAppearance())

    // Routes
    try routes(app)
}
