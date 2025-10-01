import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";

export const sarosDLMM = new LiquidityBookServices({
  mode: MODE.DEVNET,
  options: {
    rpcUrl: process.env.PUBLIC_RPC_URL!,
    commitmentOrConfig: "confirmed",
  },
});
