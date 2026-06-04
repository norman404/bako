import type { ResultAsync } from "neverthrow";

import type { DeliveryPerson } from "@/modules/delivery/domain/delivery-person";
import type { DeliveryPersonError } from "@/modules/delivery/domain/errors";
import type { DeliveryPersonRepository } from "@/modules/delivery/domain/ports";

export function listDeliveryPersons(
  repository: DeliveryPersonRepository,
): ResultAsync<DeliveryPerson[], DeliveryPersonError> {
  return repository.list();
}
