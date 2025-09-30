// in services.d.ts
export interface SwapParams {
    tokenMintX: PublicKey;
    tokenMintY: PublicKey;
    amount: bigint;
    otherAmountOffset: bigint;
    swapForY: boolean;
    isExactInput: boolean;
    pair: PublicKey;
    hook?: PublicKey;  // <-- make optional
    payer: PublicKey;
  }
  