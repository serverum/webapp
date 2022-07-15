import HomeView from '../views/HomeView.vue'
import ImportLedgerView from '@/views/ImportLedgerView.vue'
import ConnectingKeplr from '@/views/ConnectingKeplr.vue'
import ImportSeedView from '@/views/ImportSeedView.vue'
import SetPassword from '@/views/SetPassword.vue'
import SetWalletName from '@/views/SetWalletName.vue'
import DashboardView from '@/views/DashboardView.vue'
import StyleguideView from '@/views/StyleguideView.vue'
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import AuthView from '@/views/AuthView.vue'
import CreateAccountView from '@/views/CreateAccountView.vue'
import HistoryView from '@/views/HistoryView.vue'
import LeaseView from '@/views/LeaseView.vue'
import EarningsView from '@/views/EarningsView.vue'
import { WalletUtils } from '@/utils/WalletUtils'
import { RouteNames } from '@/router/RouterNames'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: RouteNames.DASHBOARD,
    component: DashboardView,
    meta: { requiresAuth: true }
  },
  {
    path: '/auth',
    name: '',
    component: AuthView,
    meta: { requiresAuth: false },
    children: [
      {
        path: '',
        name: RouteNames.AUTH,
        component: HomeView
      },
      {
        path: 'connecting-to-keplr',
        name: RouteNames.CONNECT_KEPLR,
        component: ConnectingKeplr
      },
      {
        path: 'import-ledger',
        name: RouteNames.IMPORT_LEDGER,
        component: ImportLedgerView
      },
      {
        path: 'import-seed',
        name: RouteNames.IMPORT_SEED,
        component: ImportSeedView
      },
      {
        path: 'set-password',
        name: RouteNames.SET_PASSWORD,
        component: SetPassword
      },
      {
        path: 'create-account',
        name: RouteNames.CREATE_ACCOUNT,
        component: CreateAccountView
      }
    ]
  },
  {
    path: '/styleguide',
    name: 'styleguide',
    component: StyleguideView
  },
  {
    path: '/set-wallet-name',
    name: RouteNames.SET_WALLET_NAME,
    component: SetWalletName
  },
  {
    path: '/history',
    name: RouteNames.HISTORY,
    component: HistoryView,
    meta: { requiresAuth: true }
  },
  {
    path: '/lease',
    name: RouteNames.LEASE,
    component: LeaseView,
    meta: { requiresAuth: true }
  },
  {
    path: '/earn',
    name: RouteNames.EARN,
    component: EarningsView,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!WalletUtils.isAuth()) {
      next({ name: RouteNames.AUTH })
    } else {
      next()
    }
  } else {
    if (to.name === 'auth' && WalletUtils.isAuth()) {
      next({ name: RouteNames.DASHBOARD })
    }
    next()
  }
})

export default router
