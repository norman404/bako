import { Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";

interface CheckoutDeliveryHeaderProps {
  isSearchCustomerMode: boolean;
  isNewCustomerMode: boolean;
  onShowSearchCustomers: () => void;
  onStartNewCustomer: () => void;
}

function CheckoutDeliveryHeader({
  isSearchCustomerMode,
  isNewCustomerMode,
  onShowSearchCustomers,
  onStartNewCustomer,
}: CheckoutDeliveryHeaderProps) {
  const { t } = useTranslation('checkout');
  
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-base font-medium text-text">
        {t('delivery.headerText')}
      </h3>

      <div className="grid w-full gap-2 sm:grid-cols-2 lg:max-w-[320px]">
        <Button
          type="button"
          variant={isSearchCustomerMode ? "default" : "outline"}
          size="medium"
          onClick={onShowSearchCustomers}
          aria-pressed={isSearchCustomerMode}
          className="h-11 w-full justify-center px-4 text-2xs uppercase tracking-[0.18em]"
        >
          <Search className="h-4 w-4" />
          {t('delivery.searchButton')}
        </Button>
        <Button
          type="button"
          variant={isNewCustomerMode ? "default" : "outline"}
          size="medium"
          onClick={onStartNewCustomer}
          aria-pressed={isNewCustomerMode}
          className="h-11 w-full justify-center px-4 text-2xs uppercase tracking-[0.18em]"
        >
          <Plus className="h-4 w-4" />
          {t('delivery.newButton')}
        </Button>
      </div>
    </div>
  );
}

export { CheckoutDeliveryHeader };
