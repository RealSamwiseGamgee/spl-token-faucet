import * as anchor from "@project-serum/anchor";
import assert from "assert";
import { Faucet } from "../target/types/faucet";
import { Program } from "@project-serum/anchor";
import { TokenInstructions } from "@project-serum/serum";
import {
  createMint,
  createTokenAccountInstrs,
  getMintInfo,
} from "@project-serum/common";

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
    console.log(
      "-- publicKey: %s, nonce: %d",
      config.publicKey.toBase58(),
      nonce
    );
    tokenMint = await createMint(provider, tokenAuthority, tokenDecimals);
  });

  describe("initialize", () => {
    it("success", async () => {
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

  describe("drip", () => {
    it("success", async () => {
      const receiver = anchor.web3.Keypair.generate();
      const receiverTokenAccount = anchor.web3.Keypair.generate();

      console.log("receiver: ", receiver.publicKey.toBase58());
      console.log(
        "receiverTokenAccount: ",
        receiverTokenAccount.publicKey.toBase58()
      );
      const mintInfo = await getMintInfo(provider, tokenMint);
      await program.rpc.drip({
        accounts: {
          config: config.publicKey,
          tokenProgram: TokenInstructions.TOKEN_PROGRAM_ID,
          tokenMint: tokenMint,
          tokenAuthority: mintInfo.mintAuthority,
          receiver: receiverTokenAccount.publicKey,
        },
        signers: [receiverTokenAccount],
        instructions: [
          ...(await createTokenAccountInstrs(
            provider,
            receiverTokenAccount.publicKey,
            tokenMint,
            receiver.publicKey
          )),
        ],
      });
    });
  });
});
