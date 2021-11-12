use anchor_lang::prelude::*;
use anchor_spl::token;

declare_id!("JDnDwBLCw8nnvbrhqT2eyngWGqAapRxBuJcCmMYTbbE2");

#[program]
pub mod faucet {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, nonce: u8, drip_volume: u64) -> ProgramResult {
        let config = &mut ctx.accounts.config;
        config.token_program = *ctx.accounts.token_program.key;
        config.token_mint = *ctx.accounts.token_mint.key;
        config.token_authority = *ctx.accounts.token_authority.key;
        config.nonce = nonce;
        config.drip_volume = drip_volume;
        Ok(())
    }

    pub fn drip(ctx: Context<Drip>) -> ProgramResult {
        let config = ctx.accounts.config.clone();

        let cpi_program = ctx.accounts.token_program.clone();
        let cpi_accounts = token::MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.receiver.to_account_info(),
            authority: ctx.accounts.token_authority.to_account_info(),
        };
        let seeds = &[config.to_account_info().key.as_ref(), &[config.nonce]];
        let signer_seeds = &[&seeds[..]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::mint_to(cpi_ctx, config.drip_volume)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 32 + 32 + 32 + 1 + 8)]
    pub config: Account<'info, Config>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account("token_program.key == &token::ID")]
    pub token_program: AccountInfo<'info>,

    pub token_mint: AccountInfo<'info>,

    pub token_authority: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Drip<'info> {
    #[account()]
    pub config: Account<'info, Config>,

    pub token_program: AccountInfo<'info>,
    pub token_mint: AccountInfo<'info>,
    pub token_authority: AccountInfo<'info>,

    #[account(mut)]
    pub receiver: AccountInfo<'info>,
}

#[account]
pub struct Config {
    token_program: Pubkey,
    token_mint: Pubkey,
    token_authority: Pubkey,
    nonce: u8,
    drip_volume: u64,
}
