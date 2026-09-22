import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import commonEs from './es-CL/common.json'
import onboardingEs from './es-CL/onboarding.json'
import dashboardEs from './es-CL/dashboard.json'
import cleanupEs from './es-CL/cleanup.json'
import disclaimersEs from './es-CL/disclaimers.json'

import commonEn from './en/common.json'
import onboardingEn from './en/onboarding.json'
import dashboardEn from './en/dashboard.json'
import cleanupEn from './en/cleanup.json'
import disclaimersEn from './en/disclaimers.json'

export const SUPPORTED_LOCALES = ['es-CL', 'en'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

void i18n.use(initReactI18next).init({
  resources: {
    'es-CL': {
      common: commonEs,
      onboarding: onboardingEs,
      dashboard: dashboardEs,
      cleanup: cleanupEs,
      disclaimers: disclaimersEs
    },
    en: {
      common: commonEn,
      onboarding: onboardingEn,
      dashboard: dashboardEn,
      cleanup: cleanupEn,
      disclaimers: disclaimersEn
    }
  },
  lng: 'es-CL',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false }
})

export default i18n
