/** An error crossing a messaging boundary. `name` is a DOMException name or `TypeError`. */
export interface ClassifierSerializedError {
  name: string;
  message: string;
}
