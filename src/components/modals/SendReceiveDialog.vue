<template>
  <DialogHeader
    :headerList="[$t('message.receive'), $t('message.send')]"
    :routes="routes"
    :active-tab="activeTab()"
  >
    <template #tab-1>
      <ReceiveMainComponent :dialogSelectedCurrency="props.dialogSelectedCurrency" />
    </template>
    <template #tab-2>
      <SendMainComponent :dialogSelectedCurrency="props.dialogSelectedCurrency" />
    </template>

  </DialogHeader>
</template>

<script lang="ts" setup>
import SendMainComponent from "@/components/SendComponents/SendMainComponent.vue";
import ReceiveMainComponent from "@/components/ReceiveComponents/ReceiveMainComponent.vue";
import DialogHeader from "./templates/DialogHeader.vue";

const routes = ['receive', 'send'];

const props = defineProps({
  route: {
    type: String,
  },
  dialogSelectedCurrency: {
    type: String,
    default: ''
  }
})

const activeTab = () => {
  const index = routes.indexOf(props.route as string);

  if(index < 0){
    return 1;
  }

  return index+1;
}

</script>
