import type { Resource } from 'i18next';

// es-MX
import esMxCommon from './locales/es-MX/common.json';
import esMxApp from './locales/es-MX/app.json';
import esMxSettings from './locales/es-MX/settings.json';
import esMxMenu from './locales/es-MX/menu.json';
import esMxCheckout from './locales/es-MX/checkout.json';
import esMxOrder from './locales/es-MX/order.json';
import esMxTurno from './locales/es-MX/turno.json';

// es-AR
import esArCommon from './locales/es-AR/common.json';
import esArApp from './locales/es-AR/app.json';
import esArSettings from './locales/es-AR/settings.json';
import esArMenu from './locales/es-AR/menu.json';
import esArCheckout from './locales/es-AR/checkout.json';
import esArOrder from './locales/es-AR/order.json';
import esArTurno from './locales/es-AR/turno.json';

// en-US
import enUsCommon from './locales/en-US/common.json';
import enUsApp from './locales/en-US/app.json';
import enUsSettings from './locales/en-US/settings.json';
import enUsMenu from './locales/en-US/menu.json';
import enUsCheckout from './locales/en-US/checkout.json';
import enUsOrder from './locales/en-US/order.json';
import enUsTurno from './locales/en-US/turno.json';

// es-ES
import esEsCommon from './locales/es-ES/common.json';
import esEsApp from './locales/es-ES/app.json';
import esEsSettings from './locales/es-ES/settings.json';
import esEsMenu from './locales/es-ES/menu.json';
import esEsCheckout from './locales/es-ES/checkout.json';
import esEsOrder from './locales/es-ES/order.json';
import esEsTurno from './locales/es-ES/turno.json';

// pt-BR
import ptBrCommon from './locales/pt-BR/common.json';
import ptBrApp from './locales/pt-BR/app.json';
import ptBrSettings from './locales/pt-BR/settings.json';
import ptBrMenu from './locales/pt-BR/menu.json';
import ptBrCheckout from './locales/pt-BR/checkout.json';
import ptBrOrder from './locales/pt-BR/order.json';
import ptBrTurno from './locales/pt-BR/turno.json';

export const resources: Resource = {
  'es-MX': {
    common: esMxCommon,
    app: esMxApp,
    settings: esMxSettings,
    menu: esMxMenu,
    checkout: esMxCheckout,
    order: esMxOrder,
    turno: esMxTurno,
  },
  'es-AR': {
    common: esArCommon,
    app: esArApp,
    settings: esArSettings,
    menu: esArMenu,
    checkout: esArCheckout,
    order: esArOrder,
    turno: esArTurno,
  },
  'en-US': {
    common: enUsCommon,
    app: enUsApp,
    settings: enUsSettings,
    menu: enUsMenu,
    checkout: enUsCheckout,
    order: enUsOrder,
    turno: enUsTurno,
  },
  'es-ES': {
    common: esEsCommon,
    app: esEsApp,
    settings: esEsSettings,
    menu: esEsMenu,
    checkout: esEsCheckout,
    order: esEsOrder,
    turno: esEsTurno,
  },
  'pt-BR': {
    common: ptBrCommon,
    app: ptBrApp,
    settings: ptBrSettings,
    menu: ptBrMenu,
    checkout: ptBrCheckout,
    order: ptBrOrder,
    turno: ptBrTurno,
  },
};
