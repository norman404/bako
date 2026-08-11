import type { ResultAsync } from "neverthrow";

import type { DeliveryPerson } from "./delivery-person";
import type { DeliveryPersonError } from "./errors";
import type { DeliveryPersonRepository } from "./ports";

export function listDeliveryPersons(
  repository: DeliveryPersonRepository,
): ResultAsync<DeliveryPerson[], DeliveryPersonError> {
  return repository.list();
}
