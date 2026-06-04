import type { ResultAsync } from "neverthrow";

import type { DeliveryPersonCut } from "@/modules/delivery/domain/delivery-person";
import type { DeliveryPersonError } from "@/modules/delivery/domain/errors";
import type { DeliveryPersonRepository } from "@/modules/delivery/domain/ports";

export function getTodayDeliveryCut(
  repository: DeliveryPersonRepository,
): ResultAsync<DeliveryPersonCut, DeliveryPersonError> {
  return repository.getTodayCut();
}
