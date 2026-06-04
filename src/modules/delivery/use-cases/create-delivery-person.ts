import type { ResultAsync } from "neverthrow";

import type { DeliveryPerson } from "@/modules/delivery/domain/delivery-person";
import type { DeliveryPersonError } from "@/modules/delivery/domain/errors";
import type { DeliveryPersonCreateInput, DeliveryPersonRepository } from "@/modules/delivery/domain/ports";

export function createDeliveryPerson(
  repository: DeliveryPersonRepository,
  input: DeliveryPersonCreateInput,
): ResultAsync<DeliveryPerson, DeliveryPersonError> {
  return repository.create(input);
}
