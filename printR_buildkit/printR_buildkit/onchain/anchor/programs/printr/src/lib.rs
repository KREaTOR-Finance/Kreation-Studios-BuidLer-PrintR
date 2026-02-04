use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::Token;

// Switchboard Solana Randomness Service (SRS)
use solana_randomness_service::{
    program::SolanaRandomnessService,
    ID as SolanaRandomnessServiceID,
};

declare_id!("Pr1ntr1111111111111111111111111111111111111");

/**
 * PrintR — Program-Enforced Randomness Settlement (Solana + Switchboard SRS)
 *
 * Flow:
 * 1) Client calls `request_round` which:
 *    - creates Round PDA (Pending)
 *    - CPI calls Switchboard SRS `simple_randomness_v1`
 *    - provides a callback instruction to `settle_round`
 * 2) Switchboard oracle fulfills and invokes callback in a relayed transaction.
 *    Randomness bytes are appended to the end of the callback ix data.
 * 3) `settle_round` derives outcome deterministically and writes results on-chain.
 *
 * This is "program-enforced": UI cannot decide outcomes.
 */

#[program]
pub mod printr {
    use super::*;

    pub fn init_player(ctx: Context<InitPlayer>) -> Result<()> {
        let player = &mut ctx.accounts.player_profile;
        player.authority = ctx.accounts.authority.key();
        player.points = 0;
        player.streak = 0;
        player.total_rounds = 0;
        player.bump = ctx.bumps.player_profile;
        Ok(())
    }

    pub fn request_round(
        ctx: Context<RequestRound>,
        round_id: [u8; 16],
        tier: RiskTier,
        direction: Direction,
        bytes: u32, // recommended: 32
        priority_fee_microlamports: u64,
    ) -> Result<()> {
        // --- Create/initialize Round PDA ---
        let round = &mut ctx.accounts.round;
        round.round_id = round_id;
        round.player = ctx.accounts.authority.key();
        round.tier = tier;
        round.direction = direction;
        round.status = RoundStatus::Pending;
        round.requested_at = Clock::get()?.unix_timestamp;
        round.fulfilled_at = 0;
        round.points_delta = 0;
        round.streak_delta = 0;
        round.randomness = [0u8; 32];
        round.sb_request = ctx.accounts.randomness_request.key();
        round.bump = ctx.bumps.round;

        // Update player meta
        let player = &mut ctx.accounts.player_profile;
        player.total_rounds = player.total_rounds.saturating_add(1);

        // --- Build callback to our `settle_round` instruction ---
        // SRS will append randomness bytes to the end of this instruction's data.
        let callback_accounts = vec![
            AccountMeta::new(ctx.accounts.player_profile.key(), false),
            AccountMeta::new(ctx.accounts.round.key(), false),
            AccountMeta::new_readonly(ctx.accounts.randomness_state.key(), false),
            AccountMeta::new_readonly(ctx.accounts.randomness_request.key(), false),
            AccountMeta::new_readonly(SolanaRandomnessServiceID, false),
        ];

        let callback_ix = Instruction {
            program_id: ID,
            accounts: callback_accounts,
            data: anchor_discriminator("settle_round").to_vec(), // oracle appends randomness bytes
        };

        // --- CPI request to Switchboard SRS ---
        solana_randomness_service::cpi::simple_randomness_v1(
            CpiContext::new(
                ctx.accounts.randomness_service.to_account_info(),
                solana_randomness_service::cpi::accounts::SimpleRandomnessV1Request {
                    request: ctx.accounts.randomness_request.to_account_info(),
                    escrow: ctx.accounts.randomness_escrow.to_account_info(),
                    state: ctx.accounts.randomness_state.to_account_info(),
                    mint: ctx.accounts.randomness_mint.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
                },
            ),
            bytes,
            callback_ix,
            solana_randomness_service::TransactionOptions {
                compute_unit_price_micro_lamports: Some(priority_fee_microlamports),
                ..Default::default()
            },
        )?;

        Ok(())
    }

    /// Callback target. SRS invokes this and appends randomness bytes to ix data.
    pub fn settle_round(ctx: Context<SettleRound>, result: Vec<u8>) -> Result<()> {
        let round = &mut ctx.accounts.round;
        require!(round.status == RoundStatus::Pending, PrintRErr::AlreadySettled);

        // Validate request key matches what we recorded on request
        require_keys_eq!(ctx.accounts.randomness_request.key(), round.sb_request, PrintRErr::BadRequestKey);

        // Validate SRS program id passed through
        require_keys_eq!(ctx.accounts.randomness_service_program.key(), SolanaRandomnessServiceID, PrintRErr::BadRandomnessService);

        // Parse randomness bytes (use first 32)
        require!(result.len() >= 32, PrintRErr::NotEnoughRandomness);
        let mut randomness = [0u8; 32];
        randomness.copy_from_slice(&result[..32]);

        // Store receipt
        round.randomness = randomness;
        round.fulfilled_at = Clock::get()?.unix_timestamp;

        // Deterministic mapping
        let u = derive_u16(&round.round_id, &round.player, round.tier, round.direction, &randomness);
        let threshold = win_threshold(round.tier);
        let win = u < threshold;

        let (points_delta, streak_delta) = if win { (win_points(round.tier), 1i16) } else { (0u32, -1i16) };

        round.points_delta = points_delta;
        round.streak_delta = streak_delta;
        round.status = if win { RoundStatus::Win } else { RoundStatus::Miss };

        // Apply to player profile
        let player = &mut ctx.accounts.player_profile;
        player.points = player.points.saturating_add(points_delta);
        if win { player.streak = player.streak.saturating_add(1); } else { player.streak = player.streak.saturating_sub(1); }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitPlayer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + PlayerProfile::SPACE,
        seeds = [b"player", authority.key().as_ref()],
        bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round_id: [u8; 16])]
pub struct RequestRound<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", authority.key().as_ref()],
        bump = player_profile.bump
    )]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(
        init,
        payer = authority,
        space = 8 + Round::SPACE,
        seeds = [b"round", authority.key().as_ref(), &round_id],
        bump
    )]
    pub round: Account<'info, Round>,

    /// CHECK: Created/managed by SRS CPI.
    #[account(mut)]
    pub randomness_request: UncheckedAccount<'info>,

    /// CHECK: Created/managed by SRS CPI.
    #[account(mut)]
    pub randomness_escrow: UncheckedAccount<'info>,

    /// CHECK: SRS state PDA (seed: [b"STATE"] under SRS program).
    pub randomness_state: UncheckedAccount<'info>,

    /// CHECK: Mint used by SRS for escrow wrapping.
    pub randomness_mint: UncheckedAccount<'info>,

    /// Switchboard Solana Randomness Service program.
    #[account(address = SolanaRandomnessServiceID)]
    pub randomness_service: Program<'info, SolanaRandomnessService>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct SettleRound<'info> {
    #[account(mut)]
    pub player_profile: Account<'info, PlayerProfile>,

    #[account(mut)]
    pub round: Account<'info, Round>,

    /// CHECK: Read-only; used for additional validation & indexing.
    pub randomness_state: UncheckedAccount<'info>,

    /// CHECK: Read-only; used for additional validation.
    pub randomness_request: UncheckedAccount<'info>,

    /// CHECK: Pass-through for ID verification.
    #[account(address = SolanaRandomnessServiceID)]
    pub randomness_service_program: UncheckedAccount<'info>,
}

#[account]
pub struct PlayerProfile {
    pub authority: Pubkey,
    pub points: u32,
    pub streak: u16,
    pub total_rounds: u32,
    pub bump: u8,
}
impl PlayerProfile {
    pub const SPACE: usize = 32 + 4 + 2 + 4 + 1;
}

#[account]
pub struct Round {
    pub round_id: [u8; 16],
    pub player: Pubkey,
    pub tier: RiskTier,
    pub direction: Direction,
    pub status: RoundStatus,
    pub requested_at: i64,
    pub fulfilled_at: i64,
    pub points_delta: u32,
    pub streak_delta: i16,
    pub randomness: [u8; 32],
    pub sb_request: Pubkey,
    pub bump: u8,
}
impl Round {
    pub const SPACE: usize = 16 + 32 + 1 + 1 + 1 + 8 + 8 + 4 + 2 + 32 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Direction { Up, Down }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RiskTier { Safe, Bold, Legend }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum RoundStatus { Pending, Win, Miss }

#[error_code]
pub enum PrintRErr {
    #[msg("Round already settled")]
    AlreadySettled,
    #[msg("Not enough randomness bytes")]
    NotEnoughRandomness,
    #[msg("Bad request key")]
    BadRequestKey,
    #[msg("Bad randomness service program")]
    BadRandomnessService,
}

fn derive_u16(round_id: &[u8; 16], player: &Pubkey, tier: RiskTier, direction: Direction, randomness: &[u8; 32]) -> u16 {
    use anchor_lang::solana_program::hash::hashv;
    let tier_b: u8 = match tier { RiskTier::Safe => 1, RiskTier::Bold => 2, RiskTier::Legend => 3 };
    let dir_b: u8 = match direction { Direction::Up => 1, Direction::Down => 2 };

    let h = hashv(&[
        b"printr",
        round_id,
        player.as_ref(),
        &[tier_b],
        &[dir_b],
        randomness
    ]);

    let bytes = h.to_bytes();
    let v = u16::from_le_bytes([bytes[0], bytes[1]]) as u32;
    ((v * 10_000) / 65_536) as u16
}

fn win_threshold(tier: RiskTier) -> u16 {
    match tier {
        RiskTier::Safe => 5800,
        RiskTier::Bold => 4800,
        RiskTier::Legend => 3800,
    }
}

fn win_points(tier: RiskTier) -> u32 {
    match tier {
        RiskTier::Safe => 250,
        RiskTier::Bold => 450,
        RiskTier::Legend => 800,
    }
}

/// Anchor discriminator helper: first 8 bytes of sha256("global:<name>")
fn anchor_discriminator(name: &str) -> [u8; 8] {
    use anchor_lang::solana_program::hash::hash;
    let preimage = format!("global:{}", name);
    let h = hash(preimage.as_bytes()).to_bytes();
    [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]]
}
