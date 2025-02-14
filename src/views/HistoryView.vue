<template>
  <div class="col-span-12 mb-sm-nolus-70p">
    <!-- Header -->
    <div class="table-header flex mt-[25px] flex-wrap items-center justify-between items-baseline px-4 lg:px-0">
      <div class="left">
        <h1 class="text-20 nls-font-700 text-primary m-0">
          {{ $t("message.history") }}
        </h1>
      </div>
    </div>
    <!-- History -->
    <div
      class="block background mt-6 shadow-box lg:rounded-xl overflow-hidden async-loader"
      :class="{ outline: hasOutline }"
    >
      <!-- Assets -->
      <div class="block p-4 lg:p-6">
        <HistoryTableHeader />
        <div
          class="block history-items-container"
          :class="{ 'animate-pulse': !initialLoad }"
        >
          <template v-if="initialLoad && !showSkeleton">
            <TransitionGroup
              name="fade-long"
              appear
            >
              <HistoryTableItem
                v-for="transaction of transactions"
                :key="transaction.id"
                :transaction="transaction"
              />
              <div
                v-if="transactions.length == 0"
                class="h-[180px]"
              >
                <div class="flex nls-12 text-dark-grey justify-center items-center flex-col h-full">
                  <img
                    src="/src/assets/icons/empty_history.svg"
                    class="inline-block m-4"
                    height="32"
                    width="32"
                  >
                  {{ $t("message.no-results") }}
                </div>
              </div>
            </TransitionGroup>
          </template>
          <template v-else>
            <div
              v-for="index in 10"
              :key="index"
              class="md:h-[53px] h-[82px] flex md:flex-row flex-col asset-partial nolus-box relative border-b border-standart py-3 px-4 items-stretch md:items-center justify-between"
            >
              <div class="flex flex-1 md:flex-[9]">
                <div class="flex max-w-[60%] md:flex-row flex-col justify-between">
                  <div class="w-[9rem] h-1.5 bg-grey rounded-full"></div>
                  <div class="w-[15rem] h-1.5 bg-grey rounded-full md:ml-10"></div>

                </div>
              </div>
              <div class="flex flex-1 md:flex-[3] justify-between items-center">
                <div class="h-1.5 bg-grey rounded-full w-24 md:flex"></div>
                <div class="h-1.5 bg-grey rounded-full w-24 md:flex"></div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
    <div class="my-4 flex justify-center">
      <button
        v-if="visible"
        class="btn btn-secondary btn-medium-secondary mx-auto"
        :class="{ 'js-loading': loading }"
        @click="load"
      >
        {{ $t("message.load-more") }}
      </button>
    </div>
  </div>
  <Modal
    v-if="showErrorDialog"
    @close-modal="showErrorDialog = false"
    route="alert"
  >
    <ErrorDialog
      :title="$t('message.error-connecting')"
      :message="errorMessage"
      :try-button="onClickTryAgain"
    />
  </Modal>
</template>

<script setup lang="ts">
import type { Coin } from "@cosmjs/proto-signing";

import HistoryTableHeader from "@/components/HistoryComponents/HistoryTableHeader.vue";
import HistoryTableItem from "@/components/HistoryComponents/HistoryTableItem.vue";
import Modal from "@/components/modals/templates/Modal.vue";
import ErrorDialog from "@/components/modals/ErrorDialog.vue";

import { WalletActionTypes } from "@/stores/wallet/action-types";
import { onMounted, onUnmounted, ref } from "vue";
import { useWalletStore } from "@/stores/wallet";
import { computed } from "vue";

export interface ITransaction {
  id: string;
  height: number;
  msgs: any[];
  memo: string;
  blockDate: Date | null;
  fee: Coin[] | null;
  log: string | null;
  type: 'sender' | 'receiver'
}

const showErrorDialog = ref(false);
const errorMessage = ref("");
const transactions = ref([] as ITransaction[] | any[]);
const wallet = useWalletStore();

const senderPerPage = 10;
let senderPage = 1;
let senderTotal = 0;

// const recipientPerPage = 0;
// let recipientPage = 0;
// let recipientTotal = 0;

const loading = ref(false);
const loaded = ref(false);
const initialLoad = ref(false);
const showSkeleton = ref(true);
let timeout: NodeJS.Timeout;

onMounted(() => {
  getTransactions();
  timeout = setTimeout(() => {
    showSkeleton.value = false;
  }, 400);
});

onUnmounted(() => {
  if (timeout) {
    clearTimeout(timeout);
  }
})

const hasOutline = computed(() => {
  if (window.innerWidth > 576) {
    return true;
  }
  return transactions.value.length > 0;
});

const visible = computed(() => {
  return initialLoad.value && !loaded.value;
});

async function getTransactions() {
  try {
    const res = await wallet[WalletActionTypes.SEARCH_TX]({
      sender_per_page: senderPerPage,
      sender_page: senderPage
    });

    senderPage++;

    senderTotal = res.sender_total as number;

    transactions.value = res.data as ITransaction[];

    const loadedSender = (senderPage - 1) * senderPerPage >= senderTotal;

    if (loadedSender) {
      loaded.value = true;
    }

    initialLoad.value = true;
  } catch (e: Error | any) {
    showErrorDialog.value = true;
    errorMessage.value = e?.message;
  }
};

async function load() {
  try {
    loading.value = true;
    const loadSender = (senderPage - 1) * senderPerPage <= senderTotal;

    const res = await wallet[WalletActionTypes.SEARCH_TX]({
      sender_per_page: senderPerPage,
      sender_page: senderPage,
      load_sender: loadSender
    });

    transactions.value = [...transactions.value, ...res.data];

    if (loadSender) {
      senderPage++;
    }

    const loadedSender = (senderPage - 1) * senderPerPage <= senderTotal;

    if (!loadedSender) {
      loaded.value = true;
    }

    senderTotal = res.sender_total as number;
  } catch (e: Error | any) {
    showErrorDialog.value = true;
    errorMessage.value = e?.message;
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 500);
  }
};

async function onClickTryAgain() {
  await getTransactions();
};

</script>
