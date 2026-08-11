import type { ResultAsync } from "neverthrow";

import type { DeliveryPerson, DeliveryPersonCut } from "./delivery-person";
import type { DeliveryPersonError } from "./errors";

export interface DeliveryPersonCreateInput {
  name: string;
  color: string;
  phone?: string | null;
}

export interface DeliveryPersonRepository {
  list(): ResultAsync<DeliveryPerson[], DeliveryPersonError>;
  findById(id: string): ResultAsync<DeliveryPerson, DeliveryPersonError>;
  create(input: DeliveryPersonCreateInput): ResultAsync<DeliveryPerson, DeliveryPersonError>;
  update(id: string, input: DeliveryPersonCreateInput): ResultAsync<DeliveryPerson, DeliveryPersonError>;
  archive(id: string): ResultAsync<void, DeliveryPersonError>;
  getTodayCut(): ResultAsync<DeliveryPersonCut, DeliveryPersonError>;
}
