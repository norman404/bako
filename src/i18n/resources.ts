import type { Resource } from 'i18next';

// es-MX
import esMxCommon from './locales/es-MX/common.json';
import esMxApp from './locales/es-MX/app.json';
import esMxAdmin from './locales/es-MX/admin.json';
import esMxSettings from './locales/es-MX/settings.json';
import esMxMenu from './locales/es-MX/menu.json';
import esMxCheckout from './locales/es-MX/checkout.json';
import esMxOrder from './locales/es-MX/order.json';
import esMxShift from './locales/es-MX/shift.json';
import esMxUpdater from './locales/es-MX/updater.json';
import esMxErrors from './locales/es-MX/errors.json';

// en-US
import enUsCommon from './locales/en-US/common.json';
import enUsApp from './locales/en-US/app.json';
import enUsAdmin from './locales/en-US/admin.json';
import enUsSettings from './locales/en-US/settings.json';
import enUsMenu from './locales/en-US/menu.json';
import enUsCheckout from './locales/en-US/checkout.json';
import enUsOrder from './locales/en-US/order.json';
import enUsShift from './locales/en-US/shift.json';
import enUsUpdater from './locales/en-US/updater.json';
import enUsErrors from './locales/en-US/errors.json';

export const resources: Resource = {
  'es-MX': {
    common: esMxCommon,
    app: esMxApp,
    admin: esMxAdmin,
    settings: esMxSettings,
    menu: esMxMenu,
    checkout: esMxCheckout,
    order: esMxOrder,
    shift: esMxShift,
    updater: esMxUpdater,
    errors: esMxErrors,
  },
  'en-US': {
    common: enUsCommon,
    app: enUsApp,
    admin: enUsAdmin,
    settings: enUsSettings,
    menu: enUsMenu,
    checkout: enUsCheckout,
    order: enUsOrder,
    shift: enUsShift,
    updater: enUsUpdater,
    errors: enUsErrors,
  }
};
