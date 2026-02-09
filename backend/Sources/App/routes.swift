import Vapor

func routes(_ app: Application) throws {
    // Health check
    app.get("health") { _ in ["status": "ok"] }

    // API routes (all require JWT auth)
    let api = app.grouped("api")

    // Auth proxy endpoints (forwards to Supabase)
    let authController = AuthController()
    try api.grouped("auth").register(collection: authController)

    // Protected routes
    let protected = api.grouped(SupabaseJWTAuthenticator())

    let teamController = TeamController()
    try protected.grouped("teams").register(collection: teamController)

    let gameController = GameController()
    try protected.grouped("games").register(collection: gameController)

    let statsController = StatsController()
    try protected.grouped("stats").register(collection: statsController)

    let syncController = SyncController()
    try protected.grouped("sync").register(collection: syncController)
}
