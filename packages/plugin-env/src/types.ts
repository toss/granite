export interface SerializableObject {
  [key: string]: string | number | boolean | null | undefined | SerializableObject;
}
