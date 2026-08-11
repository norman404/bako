import type { ResultAsync } from "neverthrow";

import type { DeliveryPersonCut } from "./delivery-person";
import type { DeliveryPersonError } from "./errors";
import type { DeliveryPersonRepository } from "./ports";

export function getTodayDeliveryCut(
  repository: DeliveryPersonRepository,
): ResultAsync<DeliveryPersonCut, DeliveryPersonError> {
  return repository.getTodayCut();
}
