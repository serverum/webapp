<template>
  <ConfirmComponent v-if="showConfirmScreen"
                    :selectedCurrency="state.selectedCurrency"
                    :receiverAddress="state.receiverAddress"
                    :password="state.password"
                    :amount="state.amount"
                    :txType="$t(`message.${TxType.SUPPLY}`) + ':'"
                    :txHash="state.txHash"
                    :step="step"
                    :fee="state.fee"
                    :onSendClick="onSupplyClick"
                    :onBackClick="onConfirmBackClick"
                    :onOkClick="onClickOkBtn"
                    @passwordUpdate="(value) => (state.password = value)" />
  <SupplyFormComponent v-else
                       v-model="state"
                       class="overflow-auto custom-scroll" />
  <Modal v-if="errorDialog.showDialog"
         @close-modal="errorDialog.showDialog = false"
         route="alert">
    <ErrorDialog title="Error connecting"
                 :message="errorDialog.errorMessage"
                 :try-button="closeModal" />
  </Modal>
</template>

<script lang="ts" setup>
import type { SupplyFormComponentProps } from "@/types/component/SupplyFormComponentProps";

import ConfirmComponent from "@/components/modals/templates/ConfirmComponent.vue";
import SupplyFormComponent from "@/components/SupplyComponents/SupplyFormComponent.vue";
import ErrorDialog from "@/components/modals/ErrorDialog.vue";
import Modal from "@/components/modals/templates/Modal.vue";

import { CONFIRM_STEP } from "@/types/ConfirmStep";
import { TxType } from "@/types/TxType";
import { CurrencyUtils, NolusClient, NolusWallet } from "@nolus/nolusjs";
import { Lpp } from "@nolus/nolusjs/build/contracts";
import { useWalletStore } from "@/stores/wallet";
import { computed, inject, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { coin } from "@cosmjs/amino";

import {
  getMicroAmount,
  validateAmount,
  walletOperation,
} from "@/components/utils";

import {
  DEFAULT_APR,
  NATIVE_ASSET,
  GAS_FEES,
  SNACKBAR,
  ErrorCodes,
} from "@/config/env";
import { useApplicationStore } from "@/stores/application";
import { Int } from "@keplr-wallet/unit";
import { useAdminStore } from "@/stores/admin";
import { onBeforeMount } from "vue";

const i18n = useI18n();
const walletStore = useWalletStore();
const app = useApplicationStore();
const admin = useAdminStore();

const props = defineProps({
  selectedAsset: {
    type: String,
  },
});

const snackbarVisible = inject("snackbarVisible", () => false);
const loadLPNCurrency = inject("loadLPNCurrency", () => false);

onBeforeMount(() => {
  if (!props.selectedAsset) {
    state.value.selectedAsset = app.lpn![0].ibcData as string
  }
});

onMounted(() => {
  Promise.all([checkSupply()]).catch((e) => console.error(e));
});

const checkSupply = async () => {
  const asset = walletStore.currencies[state.value.selectedAsset!];
  const [_currency, protocol] = asset.ticker.split('@');
  const cosmWasmClient = await NolusClient.getInstance().getCosmWasmClient();
  const lpp = new Lpp(
    cosmWasmClient,
    admin.contracts[protocol].lpp
  );
  const data = await lpp.getDepositCapacity();
  state.value.loading = false;

  if (data == null) {
    state.value.supply = true;
    state.value.maxSupply = new Int(-1);
    return false;
  }

  if (Number(data?.amount) == 0) {
    state.value.supply = false;
  } else {
    state.value.maxSupply = new Int(data?.amount ?? 0);
  }
}

const balances = computed(() => {
  const b = walletStore.balances;
  const lpns = (app.lpn ?? []).map((item) => item.key);

  return b.filter((item) => {
    const currency = walletStore.currencies[item.balance.denom];
    return lpns.includes(currency.ticker);
  });
});

const selectedCurrency = computed(
  () => {
    const item = balances.value.find((item) => {
      const c = props.selectedAsset ?? app.lpn![0].ibcData;
      return item.balance.denom == c;
    });
    return item;
  }
);

const showConfirmScreen = ref(false);
const state = ref({
  currentBalance: balances.value,
  selectedCurrency: selectedCurrency.value,
  amount: "",
  password: "",
  amountErrorMsg: "",
  currentAPR: `${DEFAULT_APR}%`,
  receiverAddress: '',
  txHash: "",
  fee: coin(GAS_FEES.lender_deposit, NATIVE_ASSET.denom),
  supply: true,
  loading: true,
  maxSupply: new Int(0),
  selectedAsset: props.selectedAsset,
  onNextClick: () => onNextClick(),
} as SupplyFormComponentProps);

const step = ref(CONFIRM_STEP.CONFIRM);
const errorDialog = ref({
  showDialog: false,
  errorMessage: "",
});

const closeModal = inject("onModalClose", () => () => { });
const showSnackbar = inject(
  "showSnackbar",
  (type: string, transaction: string) => { }
);

const validateSupply = () => {

  if (state.value.maxSupply.isNegative()) {
    return "";
  }

  const { coinMinimalDenom, coinDecimals, ticker } = walletStore.getCurrencyInfo(state.value.selectedCurrency.balance.denom);

  const amount = CurrencyUtils.convertDenomToMinimalDenom(
    state.value.amount,
    coinMinimalDenom,
    coinDecimals
  );

  if (amount.amount.gt(state.value.maxSupply)) {
    const max = CurrencyUtils.convertMinimalDenomToDenom(
      state.value.maxSupply,
      coinMinimalDenom,
      ticker,
      coinDecimals
    );
    return i18n.t('message.supply-limit-error', { amount: max })
  }

  return "";
}


function onNextClick() {
  const currency = walletStore.currencies[state.value.selectedCurrency.balance.denom];
  const [_currency, protocol] = currency.ticker.split('@');
  state.value.receiverAddress = admin.contracts[protocol].lpp;

  validateInputs();

  if (!state.value.amountErrorMsg) {
    showConfirmScreen.value = true;
  }
}

function onConfirmBackClick() {
  showConfirmScreen.value = false;
}

function onClickOkBtn() {
  closeModal();
}

function validateInputs() {
  state.value.amountErrorMsg = "";

  const err = validateAmount(
    state.value.amount,
    state.value.selectedCurrency.balance.denom,
    Number(state.value.selectedCurrency.balance.amount)
  );
  if (err.length > 0) {
    state.value.amountErrorMsg = err;
  }

  const verr = validateSupply();

  if (verr.length > 0) {
    state.value.amountErrorMsg = verr;
  }
}

async function onSupplyClick() {
  try {
    await walletOperation(transferAmount, state.value.password);
  } catch (error: Error | any) {
    step.value = CONFIRM_STEP.ERROR;
  }
}

async function transferAmount() {
  const wallet = walletStore.wallet as NolusWallet;
  if (wallet && state.value.amountErrorMsg === "") {

    step.value = CONFIRM_STEP.PENDING;

    try {
      const microAmount = getMicroAmount(
        state.value.selectedCurrency.balance.denom,
        state.value.amount
      );

      const currency = walletStore.currencies[state.value.selectedCurrency.balance.denom];
      const [_currency, protocol] = currency.ticker.split('@');

      const cosmWasmClient = await NolusClient.getInstance().getCosmWasmClient();
      const lppClient = new Lpp(
        cosmWasmClient,
        admin.contracts[protocol].lpp
      );

      const { txHash, txBytes, usedFee } = await lppClient.simulateDepositTx(
        wallet,
        [
          {
            denom: microAmount.coinMinimalDenom,
            amount: microAmount.mAmount.amount.toString(),
          },
        ]
      );

      state.value.txHash = txHash;

      if (usedFee?.amount?.[0]) {
        state.value.fee = usedFee.amount[0];
      }

      const tx = await walletStore.wallet?.broadcastTx(txBytes as Uint8Array);
      const isSuccessful = tx?.code === 0;
      step.value = isSuccessful ? CONFIRM_STEP.SUCCESS : CONFIRM_STEP.ERROR;
      loadLPNCurrency();
      if (snackbarVisible()) {
        showSnackbar(isSuccessful ? SNACKBAR.Success : SNACKBAR.Error, txHash);
      }
    } catch (error: Error | any) {
      switch (error.code) {
        case (ErrorCodes.GasError): {
          step.value = CONFIRM_STEP.GasError;
          break;
        }
        default: {
          step.value = CONFIRM_STEP.ERROR;
          break;
        }
      }
    }
  }
}

onUnmounted(() => {
  if (CONFIRM_STEP.PENDING == step.value) {
    showSnackbar(SNACKBAR.Queued, state.value.txHash);
  }
});

watch(
  () => [...state.value.amount],
  (currentValue, oldValue) => {
    validateInputs();
  }
);

watch(
  () => [...state.value.selectedCurrency?.balance.denom.toString() ?? []],
  (currentValue, oldValue) => {
    validateInputs();
  }
);
</script>
