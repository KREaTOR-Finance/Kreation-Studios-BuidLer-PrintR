/**
 * PlayerRef middleware (Trust-first MVP)
 * - Requires x-printr-player header: "tg:<telegram_user_id>"
 * - Optional x-printr-wallet header: "<solana_pubkey>"
 */
export function requirePlayerRef(req, res, next) {
    const playerRef = req.header("x-printr-player");
    if (!playerRef)
        return res.status(401).json({ error: "MISSING_PLAYER_REF" });
    req.playerRef = playerRef;
    req.wallet = req.header("x-printr-wallet") ?? null;
    next();
}
export function getPlayerRef(req) {
    return req.playerRef;
}
