import type { AssetBalance } from "@/stores/wallet/state";
import type { Coin } from "@cosmjs/amino";

export interface WithdrawFormComponentProps {
  currentDepositBalance: AssetBalance;
  amountErrorMsg: string;
  receiverAddress: string;
  currentBalance: AssetBalance[];
  selectedCurrency: AssetBalance;
  amount: string;
  password: string;
  txHash: string;
  fee: Coin;
  selectedAsset: string;
  onNextClick: () => void;
}
