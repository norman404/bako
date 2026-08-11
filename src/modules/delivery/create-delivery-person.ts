import type { ResultAsync } from "neverthrow";

import type { DeliveryPerson } from "./delivery-person";
import type { DeliveryPersonError } from "./errors";
import type { DeliveryPersonCreateInput, DeliveryPersonRepository } from "./ports";

export function createDeliveryPerson(
  repository: DeliveryPersonRepository,
  input: DeliveryPersonCreateInput,
): ResultAsync<DeliveryPerson, DeliveryPersonError> {
  return repository.create(input);
}
