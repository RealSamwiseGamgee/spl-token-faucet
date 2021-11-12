import * as anchor from "@project-serum/anchor";
import assert from "assert";
import { Faucet } from "../target/types/faucet";
import { Program } from "@project-serum/anchor";
import { TokenInstructions } from "@project-serum/serum";
import { createMint } from "@project-serum/common";

describe("faucet", () => {
  const provider = anchor.Provider.local();

  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.Faucet as Program<Faucet>;
  const tokenDecimals = 9;
  const dripVolume = new anchor.BN(10 ** tokenDecimals);

  let config: anchor.web3.Keypair;
  let tokenAuthority: anchor.web3.Keypair;
  let tokenMint: anchor.web3.Keypair;
  let nonce: number;

  before(async () => {
    config = anchor.web3.Keypair.generate();
    [tokenAuthority, nonce] = await anchor.web3.PublicKey.findProgramAddress(
      [config.publicKey.toBuffer()],
      program.programId
    );
    tokenMint = await createMint(provider, tokenAuthority, tokenDecimals);
  });

  describe("initialize", () => {
    it("success", async () => {
      console.log(TokenInstructions.TOKEN_PROGRAM_ID.toBase58());
      await program.rpc.initialize(nonce, dripVolume, {
        accounts: {
          config: config.publicKey,
          user: provider.wallet.publicKey,
          tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
          tokenMint: tokenMint,
          tokenAuthority: tokenAuthority,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [config],
      });

      const configAccount = await program.account.config.fetch(
        config.publicKey
      );
      assert.strictEqual(
        configAccount.tokenProgram.toBase58(),
        TokenInstructions.TOKEN_PROGRAM_ID.toBase58()
      );
    });
  });
});
